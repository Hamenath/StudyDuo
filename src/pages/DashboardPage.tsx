import React, { useMemo } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Flame,
  Hourglass,
  Plus,
  Send,
  Snowflake,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import {
  addDaysToDateKey,
  computeDuoStreakStatus,
  getDateKeyInTimezone,
  getGreetingByHour,
  getLevelInfo,
  getSharedDailyScore,
} from '../lib/gamification';
import { Avatar, EmptyState } from '../components/ui/Primitives';

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    goals,
    activeGoal,
    setSelectedGoalId,
    setActivePage,
    participants,
    days,
    tasks,
    completions,
    dailyResults,
    xpTransactions,
    activity,
    unreadNotificationCount,
    completeTask,
    nudgePartnerStreak,
    nudgedTodayGoalIds,
  } = useStudyDuo();

  const greeting = getGreetingByHour(new Date().getHours());
  const firstName = currentUser?.fullName?.split(' ')[0] || 'Learner';
  const levelInfo = getLevelInfo(currentUser?.totalXp || 0);
  const tz = activeGoal?.timezone || currentUser?.timezone || 'UTC';
  const todayKey = getDateKeyInTimezone(new Date(), tz);

  // Latest active study day (today's date if matching, otherwise latest published day)
  const focusDay = useMemo(() => {
    if (days.length === 0) return null;
    return days.find((d) => d.date === todayKey) || days[days.length - 1];
  }, [days, todayKey]);

  const todayTasks = useMemo(() => {
    if (!focusDay) return [];
    return tasks.filter((t) => t.dayId === focusDay.id && !t.isArchived && t.isPublished);
  }, [focusDay, tasks]);

  const myCompletedTaskIds = useMemo(() => {
    if (!currentUser) return new Set<string>();
    return new Set(completions.filter((c) => c.userId === currentUser.uid).map((c) => c.taskId));
  }, [completions, currentUser]);

  const completedTodayCount = todayTasks.filter((t) => myCompletedTaskIds.has(t.id)).length;
  const totalTodayCount = todayTasks.length;
  const todayPercent = totalTodayCount > 0 ? Math.round((completedTodayCount / totalTodayCount) * 100) : 0;

  // Daily Goal Study Minutes & Remaining XP
  const dailyGoalMetrics = useMemo(() => {
    const targetMinutes = activeGoal?.dailyTargetMinutes || 45;
    const completedMinutes = todayTasks
      .filter((t) => myCompletedTaskIds.has(t.id))
      .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const remainingXp = todayTasks
      .filter((t) => !myCompletedTaskIds.has(t.id))
      .reduce((sum, t) => sum + t.xpReward, 0);
    const minutesPercent = Math.min(100, Math.round((completedMinutes / Math.max(1, targetMinutes)) * 100));
    return { targetMinutes, completedMinutes, remainingXp, minutesPercent };
  }, [activeGoal?.dailyTargetMinutes, myCompletedTaskIds, todayTasks]);

  const partner = useMemo(
    () => participants.find((p) => p.uid !== currentUser?.uid) || null,
    [currentUser?.uid, participants]
  );

  // Snapchat-style Duo Streak Maintenance status
  const duoStreakStatus = useMemo(() => {
    if (!currentUser) return null;
    return computeDuoStreakStatus({
      participantIds: activeGoal?.participantIds || [currentUser.uid],
      currentUserId: currentUser.uid,
      partnerName: partner?.displayName,
      completions,
      restDays: activeGoal?.restDays || [],
      timezone: tz,
      groupStreak: activeGoal?.groupStreak || 0,
    });
  }, [activeGoal, completions, currentUser, partner?.displayName, tz]);

  const alreadyNudgedToday = Boolean(activeGoal && nudgedTodayGoalIds.includes(activeGoal.id));

  // Shared Daily Competition score (uses dailyResults + completions + xpTransactions for live Firestore accuracy)
  const dailyScore = useMemo(() => {
    if (!activeGoal || !currentUser) {
      return { myPoints: 0, partnerPoints: 0, leaderText: 'No points recorded today yet' };
    }
    const myPoints = getSharedDailyScore({
      goalId: activeGoal.id,
      dateKey: todayKey,
      userId: currentUser.uid,
      dailyResults,
      completions,
      transactions: xpTransactions,
    });
    const partnerPoints = partner
      ? getSharedDailyScore({
          goalId: activeGoal.id,
          dateKey: todayKey,
          userId: partner.uid,
          dailyResults,
          completions,
          transactions: xpTransactions,
        })
      : 0;
    let leaderText = 'Complete a task to take the lead today';
    if (myPoints > 0 || partnerPoints > 0) {
      if (myPoints === partnerPoints) {
        leaderText = `Tied at ${myPoints} pts today`;
      } else if (myPoints > partnerPoints) {
        leaderText = `You lead by ${myPoints - partnerPoints} pts`;
      } else if (partner) {
        leaderText = `${partner.displayName.split(' ')[0]} leads by ${partnerPoints - myPoints} pts`;
      }
    }
    return { myPoints, partnerPoints, leaderText };
  }, [activeGoal, completions, currentUser, dailyResults, partner, todayKey, xpTransactions]);

  // Weekly 7-day activity dots
  const weeklyDays = useMemo(() => {
    const activeDates = new Set(
      completions.filter((c) => c.userId === currentUser?.uid).map((c) => c.dateKey)
    );
    const restSet = new Set(activeGoal?.restDays || []);
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }, (_, i) => {
      const dateKey = addDaysToDateKey(todayKey, i - 6);
      const [y, m, d] = dateKey.split('-').map(Number);
      const dayLabel = labels[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      return {
        dateKey,
        dayLabel,
        active: activeDates.has(dateKey),
        isRest: restSet.has(dateKey),
        isToday: dateKey === todayKey,
      };
    });
  }, [activeGoal?.restDays, completions, currentUser?.uid, todayKey]);

  const upcomingTasks = useMemo(
    () => todayTasks.filter((t) => !myCompletedTaskIds.has(t.id)).slice(0, 4),
    [myCompletedTaskIds, todayTasks]
  );

  const compTotal = Math.max(1, dailyScore.myPoints + dailyScore.partnerPoints);
  const mySharePct =
    dailyScore.myPoints + dailyScore.partnerPoints === 0
      ? 50
      : Math.round((dailyScore.myPoints / compTotal) * 100);

  // SVG Ring math (radius 34, circumference ~213.6)
  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - todayPercent / 100);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#242337]">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-[#66687A]">
            Ready to make today count?
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActivePage('notifications')}
            aria-label={`Open notifications (${unreadNotificationCount} unread)`}
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-[#E9EAF0] text-[#66687A] hover:text-[#242337] hover:bg-[#F8F9FC] transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#7956D8] px-1 text-[11px] font-bold text-white tabular-nums">
                {unreadNotificationCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActivePage('checklist')}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#7956D8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6643C7] transition-colors whitespace-nowrap"
          >
            <CheckSquare className="h-4 w-4" />
            Today’s Checklist
          </button>
        </div>
      </div>

      {/* Top 4-Stat Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-white border border-[#E9EAF0] p-3.5 sm:p-5">
          <p className="text-xs font-medium text-[#66687A]">Current Level</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-[#242337] font-mono tabular-nums">
            Lvl {levelInfo.level}
          </p>
          <p className="mt-0.5 text-xs text-[#7956D8] font-medium truncate">{levelInfo.title}</p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E9EAF0] p-3.5 sm:p-5">
          <p className="text-xs font-medium text-[#66687A]">Total XP</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-[#242337] font-mono tabular-nums">
            {(currentUser?.totalXp || 0).toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-[#66687A] truncate">
            {levelInfo.nextLevelMinXp
              ? `${levelInfo.xpNeededForNext} XP to Lvl ${levelInfo.level + 1}`
              : 'Max level reached'}
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E9EAF0] p-3.5 sm:p-5">
          <p className="text-xs font-medium text-[#66687A]">Current Streak</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-[#242337] font-mono tabular-nums flex items-center gap-1.5">
            <Flame className="h-5 w-5 text-[#E58A2B] fill-[#F3BD59] shrink-0" />
            {currentUser?.currentStreak || 0}d
          </p>
          <p className="mt-0.5 text-xs text-[#38A879] font-medium">
            Best {currentUser?.longestStreak || 0} days
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E9EAF0] p-3.5 sm:p-5">
          <p className="text-xs font-medium text-[#66687A]">Active Goals</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-[#242337] font-mono tabular-nums">
            {goals.filter((g) => g.status === 'active').length}
          </p>
          <p className="mt-0.5 text-xs text-[#66687A] truncate">
            {activeGoal ? `${activeGoal.participantIds.length}/${activeGoal.maxParticipants} duo active` : 'Start a study goal'}
          </p>
        </div>
      </div>

      {/* Main 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Primary Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* A. Daily Goal Widgets (Progress Ring + Study Time Target + XP Remaining) */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#242337]">Daily Goal</h2>
                <p className="mt-0.5 text-xs text-[#66687A] truncate">
                  {activeGoal && focusDay
                    ? `${activeGoal.title} · Day ${String(focusDay.dayNumber).padStart(2, '0')}`
                    : 'Create a goal and add tasks to start tracking today'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('checklist')}
                className="inline-flex min-h-[36px] items-center gap-1 text-xs sm:text-sm font-semibold text-[#7956D8] hover:text-[#6643C7] whitespace-nowrap shrink-0"
              >
                Checklist
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              {/* Circular Goal Progress Ring */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="relative h-20 w-20 shrink-0" aria-label={`Daily goal ${todayPercent}% complete`}>
                  <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r={ringRadius}
                      fill="none"
                      stroke="#F0EBFF"
                      strokeWidth="7"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r={ringRadius}
                      fill="none"
                      stroke={todayPercent === 100 ? '#38A879' : '#7956D8'}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringDashOffset}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-base font-bold text-[#242337] tabular-nums leading-none">
                      {todayPercent}%
                    </span>
                    <span className="text-[10px] text-[#66687A] mt-0.5 font-mono tabular-nums">
                      {completedTodayCount}/{totalTodayCount}
                    </span>
                  </div>
                </div>

                {/* Mobile quick label beside ring */}
                <div className="sm:hidden min-w-0">
                  <p className="text-sm font-semibold text-[#242337]">
                    {todayPercent === 100 && totalTodayCount > 0
                      ? 'Daily goal reached!'
                      : `${Math.max(0, totalTodayCount - completedTodayCount)} task${totalTodayCount - completedTodayCount === 1 ? '' : 's'} left`}
                  </p>
                  <p className="mt-0.5 text-xs text-[#66687A]">
                    {dailyGoalMetrics.remainingXp > 0
                      ? `+${dailyGoalMetrics.remainingXp} XP remaining today`
                      : 'All daily XP collected'}
                  </p>
                </div>
              </div>

              {/* Dual Daily Target Mini-Widgets */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <div className="rounded-xl bg-[#F8F9FC] border border-[#E9EAF0] p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#66687A] flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#7956D8]" />
                      Study Target
                    </span>
                    <span className="font-mono font-semibold text-[#242337] tabular-nums">
                      {dailyGoalMetrics.completedMinutes}/{dailyGoalMetrics.targetMinutes}m
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-[#E9EAF0] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#38A879] transition-all duration-300"
                      style={{ width: `${dailyGoalMetrics.minutesPercent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#66687A]">
                    {dailyGoalMetrics.completedMinutes >= dailyGoalMetrics.targetMinutes
                      ? 'Daily minute target hit!'
                      : `${dailyGoalMetrics.targetMinutes - dailyGoalMetrics.completedMinutes} min to daily target`}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F9FC] border border-[#E9EAF0] p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#66687A] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#7956D8]" />
                      Daily Bonus
                    </span>
                    <span className="font-mono font-semibold text-[#7956D8] tabular-nums">
                      {todayPercent === 100 && totalTodayCount > 0 ? '+30 XP ✓' : '+30 XP'}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-[#F0EBFF] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#7956D8] transition-all duration-300"
                      style={{ width: `${todayPercent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#66687A]">
                    {todayPercent === 100 && totalTodayCount > 0
                      ? 'Day completion bonus unlocked'
                      : `${dailyGoalMetrics.remainingXp} task XP + 30 bonus left`}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* E. Upcoming Tasks with 1-Tap Quick Complete */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h2 className="text-base font-bold text-[#242337]">Today’s Next Tasks</h2>
                <p className="text-xs text-[#66687A] mt-0.5">
                  Tap the check button to log progress right from your dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('checklist')}
                className="text-xs font-semibold text-[#7956D8] hover:underline shrink-0"
              >
                See all
              </button>
            </div>

            {upcomingTasks.length === 0 ? (
              <div className="py-5 text-center">
                <CheckCircle2 className="h-8 w-8 text-[#38A879] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#242337]">
                  {totalTodayCount > 0 ? 'All tasks for today completed!' : 'No upcoming tasks scheduled'}
                </p>
                <p className="mt-1 text-xs text-[#66687A]">
                  {totalTodayCount > 0
                    ? 'Great consistency — check the leaderboard or log a reflection in your journal.'
                    : 'Open your Daily Checklist to add learning tasks.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E9EAF0]">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="py-3 first:pt-1 last:pb-1 flex items-center gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => activeGoal && void completeTask(activeGoal.id, task)}
                      aria-label={`Complete "${task.title}"`}
                      className="min-h-[44px] min-w-[44px] -ml-1.5 flex items-center justify-center rounded-xl text-[#88899B] hover:text-[#38A879] hover:bg-[#E7F6EE]/70 transition-colors shrink-0"
                    >
                      <span className="h-6 w-6 rounded-lg border-2 border-[#D4D6E2] hover:border-[#38A879] flex items-center justify-center bg-white">
                        <Check className="h-3.5 w-3.5 opacity-0 hover:opacity-100 text-[#38A879]" />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePage('checklist')}
                      className="min-w-0 flex-1 text-left py-1 rounded-lg hover:bg-[#F8F9FC] px-1.5 -mx-1.5 transition-colors"
                    >
                      <p className="text-sm font-semibold text-[#242337] truncate">{task.title}</p>
                      <p className="mt-0.5 text-xs text-[#66687A]">
                        Day {String(task.dayNumber).padStart(2, '0')} · {task.estimatedMinutes} min ·{' '}
                        <span className="font-mono text-[#7956D8] font-semibold">+{task.xpReward} XP</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePage('checklist')}
                      aria-label={`Open details for ${task.title}`}
                      className="min-h-[40px] min-w-[36px] flex items-center justify-center rounded-lg text-[#88899B] hover:text-[#242337] shrink-0"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* B. Active Goals */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#242337]">Active Goals</h2>
              <button
                type="button"
                onClick={() => setActivePage('goals')}
                className="text-xs font-semibold text-[#7956D8] hover:underline"
              >
                Manage Goals
              </button>
            </div>

            {goals.length === 0 ? (
              <EmptyState
                icon={<Target className="h-6 w-6" />}
                title="No active study goals yet"
                description="Create your first learning roadmap or join your study partner with an invitation code."
                actionLabel="Create Study Goal"
                onAction={() => setActivePage('goals')}
              />
            ) : (
              <div className="space-y-3">
                {goals.map((goal) => {
                  const isCurrent = goal.id === activeGoal?.id;
                  const myPart = isCurrent
                    ? participants.find((p) => p.uid === currentUser?.uid)
                    : null;
                  const daysDone = myPart?.daysCompleted || 0;
                  const overallPct = Math.min(
                    100,
                    Math.round((daysDone / Math.max(1, goal.durationDays)) * 100)
                  );
                  return (
                    <div
                      key={goal.id}
                      className={`rounded-2xl bg-white border p-4 sm:p-5 transition-colors ${
                        isCurrent ? 'border-[#7956D8]/40' : 'border-[#E9EAF0]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-[#66687A]">
                            {goal.category} · {goal.difficulty} · {goal.durationDays} days
                          </p>
                          <h3 className="mt-1 text-base font-bold text-[#242337] leading-snug">
                            {goal.title}
                          </h3>
                        </div>
                        {isCurrent && partner ? (
                          <div className="flex items-center -space-x-2 shrink-0">
                            {currentUser && (
                              <Avatar
                                name={currentUser.fullName}
                                initials={currentUser.avatarInitials}
                                color={currentUser.avatarColor}
                                size="sm"
                                className="ring-2 ring-white"
                              />
                            )}
                            <Avatar
                              name={partner.displayName}
                              initials={partner.avatarInitials}
                              color={partner.avatarColor}
                              size="sm"
                              className="ring-2 ring-white"
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-[#66687A] mb-1.5 font-mono tabular-nums">
                          <span>
                            {daysDone} / {goal.durationDays} days completed
                          </span>
                          <span className="font-semibold text-[#242337]">{overallPct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#F8F9FC] border border-[#E9EAF0] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#38A879]"
                            style={{ width: `${Math.max(overallPct, daysDone > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#E9EAF0] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGoalId(goal.id);
                            setActivePage('goals');
                          }}
                          className="min-h-[40px] text-xs font-semibold text-[#66687A] hover:text-[#242337]"
                        >
                          View Roadmap
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGoalId(goal.id);
                            setActivePage('checklist');
                          }}
                          className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#F0EBFF] px-3.5 py-2 text-xs font-semibold text-[#7956D8] hover:bg-[#E4DAFF] transition-colors"
                        >
                          Today’s Checklist
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Secondary Column */}
        <div className="lg:col-span-5 space-y-5">
          {/* D. Snapchat-Style Duo Streak Maintenance Card */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#242337]">Duo Flame Streak</h2>
                  {duoStreakStatus?.state === 'rest_day' && (
                    <Snowflake className="h-4 w-4 text-[#7956D8] shrink-0" aria-label="Rest day freeze" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[#66687A]">
                  {duoStreakStatus?.headline || 'Study together daily to keep your flame lit'}
                </p>
              </div>
              <div
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-sm font-bold tabular-nums shrink-0 ${
                  duoStreakStatus?.state === 'safe'
                    ? 'bg-[#E7F6EE] text-[#1E6B4B]'
                    : duoStreakStatus?.state === 'waiting_on_you' || duoStreakStatus?.state === 'at_risk'
                    ? 'bg-[#FFF1EC] text-[#B44A22]'
                    : 'bg-[#FFF6E5] text-[#9A6A0A]'
                }`}
              >
                <Flame
                  className={`h-4 w-4 ${
                    duoStreakStatus?.state === 'safe'
                      ? 'text-[#38A879] fill-[#38A879]'
                      : 'text-[#E58A2B] fill-[#F3BD59]'
                  }`}
                />
                {duoStreakStatus?.duoStreak ?? (activeGoal?.groupStreak || 0)}d
              </div>
            </div>

            {/* Dual Partner Today Flame Status Strip */}
            {duoStreakStatus && (
              <div className="mt-4 rounded-xl bg-[#F8F9FC] border border-[#E9EAF0] p-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    className={`rounded-xl px-3 py-2 border flex items-center justify-between gap-2 ${
                      duoStreakStatus.myStudiedToday
                        ? 'bg-[#FFF6E5]/80 border-[#F3BD59]/45'
                        : 'bg-white border-[#E9EAF0]'
                    }`}
                  >
                    <span className="text-xs font-semibold text-[#242337] truncate">You</span>
                    {duoStreakStatus.myStudiedToday ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9A6A0A] shrink-0">
                        <Flame className="h-3.5 w-3.5 text-[#E58A2B] fill-[#F3BD59]" />
                        Lit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B44A22] font-mono tabular-nums shrink-0">
                        <Hourglass className="h-3 w-3" />
                        {duoStreakStatus.hoursUntilMidnight}h
                      </span>
                    )}
                  </div>

                  <div
                    className={`rounded-xl px-3 py-2 border flex items-center justify-between gap-2 ${
                      duoStreakStatus.partnerStudiedToday
                        ? 'bg-[#E7F6EE]/80 border-[#38A879]/40'
                        : 'bg-white border-[#E9EAF0]'
                    }`}
                  >
                    <span className="text-xs font-semibold text-[#242337] truncate">
                      {partner ? partner.displayName.split(' ')[0] : 'Partner'}
                    </span>
                    {!partner ? (
                      <span className="text-[11px] text-[#88899B] shrink-0">Invite</span>
                    ) : duoStreakStatus.partnerStudiedToday ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E6B4B] shrink-0">
                        <Flame className="h-3.5 w-3.5 text-[#38A879] fill-[#38A879]" />
                        Lit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#66687A] font-mono tabular-nums shrink-0">
                        <Hourglass className="h-3 w-3 text-[#E58A2B]" />
                        {duoStreakStatus.hoursUntilMidnight}h
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#66687A] leading-relaxed">
                  {duoStreakStatus.subtext}
                </p>

                {duoStreakStatus.canNudgePartner && activeGoal && (
                  <button
                    type="button"
                    disabled={alreadyNudgedToday}
                    onClick={() => void nudgePartnerStreak(activeGoal.id)}
                    className={`w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-colors ${
                      alreadyNudgedToday
                        ? 'bg-[#E7F6EE] text-[#1E6B4B] border border-[#38A879]/30 cursor-default'
                        : 'bg-[#7956D8] text-white hover:bg-[#6643C7]'
                    }`}
                  >
                    {alreadyNudgedToday ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Friendly Streak Nudge Sent Today
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Nudge {partner?.displayName.split(' ')[0] || 'Partner'} to Keep Duo Flame Alive
                      </>
                    )}
                  </button>
                )}

                {duoStreakStatus.state === 'waiting_on_you' && (
                  <button
                    type="button"
                    onClick={() => setActivePage('checklist')}
                    className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#E58A2B] px-3.5 text-xs font-semibold text-white hover:bg-[#D1781D] transition-colors"
                  >
                    <Flame className="h-3.5 w-3.5 fill-current" />
                    Complete 1 Task to Light Your Side
                  </button>
                )}
              </div>
            )}

            {/* 7-Day Personal Consistency Strip */}
            <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
              {weeklyDays.map((day) => (
                <div key={day.dateKey} className="flex flex-col items-center gap-1.5">
                  <div
                    title={`${day.dateKey}${day.isRest ? ' (Planned rest day)' : ''}`}
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center text-xs font-semibold transition-colors ${
                      day.active
                        ? 'bg-[#38A879] text-white'
                        : day.isRest
                        ? 'bg-[#FFF6E5] text-[#9A6A0A] border border-[#F3BD59]/50'
                        : day.isToday
                        ? 'bg-[#F0EBFF] text-[#7956D8] border border-[#7956D8]/30'
                        : 'bg-[#F8F9FC] text-[#88899B] border border-[#E9EAF0]'
                    }`}
                  >
                    {day.active ? <CheckCircle2 className="h-4 w-4" /> : day.isRest ? 'R' : '·'}
                  </div>
                  <span className={`text-[10px] sm:text-[11px] ${day.isToday ? 'font-bold text-[#7956D8]' : 'text-[#66687A]'}`}>
                    {day.dayLabel}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* C. Daily Competition */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#242337]">Daily Competition</h2>
                <p className="text-xs text-[#66687A] mt-0.5 truncate">{dailyScore.leaderText}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('leaderboard')}
                className="text-xs font-semibold text-[#7956D8] hover:underline shrink-0"
              >
                Leaderboard
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-[#F8F9FC] p-3.5 border border-[#E9EAF0]">
                <div className="flex items-center gap-2">
                  {currentUser && (
                    <Avatar
                      name={currentUser.fullName}
                      initials={currentUser.avatarInitials}
                      color={currentUser.avatarColor}
                      size="xs"
                    />
                  )}
                  <span className="text-xs font-semibold text-[#242337] truncate">You</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-[#7956D8] font-mono tabular-nums">
                  {dailyScore.myPoints} <span className="text-xs font-medium text-[#66687A]">pts</span>
                </p>
              </div>

              <div className="rounded-xl bg-[#F8F9FC] p-3.5 border border-[#E9EAF0]">
                <div className="flex items-center gap-2">
                  {partner ? (
                    <Avatar
                      name={partner.displayName}
                      initials={partner.avatarInitials}
                      color={partner.avatarColor}
                      size="xs"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-[#E9EAF0] flex items-center justify-center">
                      <Users className="h-3.5 w-3.5 text-[#88899B]" />
                    </div>
                  )}
                  <span className="text-xs font-semibold text-[#242337] truncate">
                    {partner ? partner.displayName.split(' ')[0] : 'Partner'}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-[#38A879] font-mono tabular-nums">
                  {dailyScore.partnerPoints} <span className="text-xs font-medium text-[#66687A]">pts</span>
                </p>
              </div>
            </div>

            {/* Visual Comparison Bar */}
            <div className="h-3 w-full rounded-full bg-[#E7F6EE] overflow-hidden flex">
              <div
                className="h-full bg-[#7956D8] transition-all duration-300"
                style={{ width: `${mySharePct}%` }}
              />
              <div
                className="h-full bg-[#38A879] transition-all duration-300"
                style={{ width: `${100 - mySharePct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#66687A] font-mono tabular-nums">
              <span>Your share {mySharePct}%</span>
              <span>{partner ? `${partner.displayName.split(' ')[0]} ${100 - mySharePct}%` : 'Invite a partner'}</span>
            </div>
          </section>

          {/* G. Quick Actions */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-4 sm:p-6">
            <h2 className="text-base font-bold text-[#242337] mb-3.5">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setActivePage('goals')}
                className="min-h-[48px] flex items-center gap-2 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 py-2.5 text-left text-xs font-semibold text-[#242337] hover:bg-[#F0EBFF] hover:border-[#7956D8]/30 transition-colors"
              >
                <Plus className="h-4 w-4 text-[#7956D8] shrink-0" />
                <span className="truncate">Create Goal</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePage('checklist')}
                className="min-h-[48px] flex items-center gap-2 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 py-2.5 text-left text-xs font-semibold text-[#242337] hover:bg-[#F0EBFF] hover:border-[#7956D8]/30 transition-colors"
              >
                <CheckSquare className="h-4 w-4 text-[#38A879] shrink-0" />
                <span className="truncate">Checklist</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePage('leaderboard')}
                className="min-h-[48px] flex items-center gap-2 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 py-2.5 text-left text-xs font-semibold text-[#242337] hover:bg-[#F0EBFF] hover:border-[#7956D8]/30 transition-colors"
              >
                <Trophy className="h-4 w-4 text-[#F3BD59] shrink-0" />
                <span className="truncate">Leaderboard</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePage('ai')}
                className="min-h-[48px] flex items-center gap-2 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 py-2.5 text-left text-xs font-semibold text-[#242337] hover:bg-[#F0EBFF] hover:border-[#7956D8]/30 transition-colors"
              >
                <Sparkles className="h-4 w-4 text-[#7956D8] shrink-0" />
                <span className="truncate">Ask AI Coach</span>
              </button>
            </div>
          </section>

          {/* F. Recent Activity */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-4 sm:p-6">
            <h2 className="text-base font-bold text-[#242337] mb-3">Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-[#66687A] py-4">
                No duo activity yet. Complete your first task to kick off the activity feed.
              </p>
            ) : (
              <div className="divide-y divide-[#E9EAF0]">
                {activity.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <p className="text-sm text-[#242337] leading-snug">
                      <span className="font-semibold">{item.actorName}</span>{' '}
                      <span className="text-[#66687A]">{item.message}</span>
                    </p>
                    {item.xpDelta ? (
                      <span className="font-mono text-xs font-semibold text-[#38A879] whitespace-nowrap shrink-0">
                        +{item.xpDelta} XP
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
