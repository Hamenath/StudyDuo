import React, { useMemo } from 'react';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  CheckSquare,
  Flame,
  Plus,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import {
  addDaysToDateKey,
  computeDailyResult,
  getDateKeyInTimezone,
  getGreetingByHour,
  getLevelInfo,
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
    xpTransactions,
    activity,
    unreadNotificationCount,
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

  const partner = useMemo(
    () => participants.find((p) => p.uid !== currentUser?.uid) || null,
    [currentUser?.uid, participants]
  );

  const dailyScore = useMemo(() => {
    if (!activeGoal || !currentUser) {
      return { myPoints: 0, partnerPoints: 0, leaderText: 'No points recorded today yet' };
    }
    const res = computeDailyResult(
      activeGoal.id,
      todayKey,
      activeGoal.participantIds,
      xpTransactions,
      false
    );
    const myPoints = res.scores[currentUser.uid] || 0;
    const partnerPoints = partner ? res.scores[partner.uid] || 0 : 0;
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
  }, [activeGoal, currentUser, partner, todayKey, xpTransactions]);

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

  return (
    <div className="space-y-6">
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
        <div className="rounded-2xl bg-white border border-[#E9EAF0] p-4 sm:p-5">
          <p className="text-xs font-medium text-[#66687A]">Current Level</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-[#242337] font-mono tabular-nums">
            Lvl {levelInfo.level}
          </p>
          <p className="mt-0.5 text-xs text-[#7956D8] font-medium truncate">{levelInfo.title}</p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E9EAF0] p-4 sm:p-5">
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

        <div className="rounded-2xl bg-white border border-[#E9EAF0] p-4 sm:p-5">
          <p className="text-xs font-medium text-[#66687A]">Current Streak</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-[#242337] font-mono tabular-nums">
            {currentUser?.currentStreak || 0}d
          </p>
          <p className="mt-0.5 text-xs text-[#38A879] font-medium">
            Best {currentUser?.longestStreak || 0} days
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E9EAF0] p-4 sm:p-5">
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
          {/* A. Today's Progress */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#242337]">Today’s Progress</h2>
                <p className="mt-0.5 text-xs text-[#66687A]">
                  {activeGoal && focusDay
                    ? `${activeGoal.title} · Day ${String(focusDay.dayNumber).padStart(2, '0')}`
                    : 'Create a goal and add tasks to start tracking today'}
                </p>
              </div>
              <span className="text-2xl font-bold text-[#7956D8] font-mono tabular-nums">
                {todayPercent}%
              </span>
            </div>

            <div className="mt-4 h-3 w-full rounded-full bg-[#F0EBFF] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#7956D8] transition-all duration-300"
                style={{ width: `${todayPercent}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#66687A] font-mono tabular-nums">
                <strong className="text-[#242337]">{completedTodayCount}</strong> of{' '}
                <strong className="text-[#242337]">{totalTodayCount}</strong> tasks completed
              </p>
              <button
                type="button"
                onClick={() => setActivePage('checklist')}
                className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-[#7956D8] hover:text-[#6643C7]"
              >
                Open Checklist
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
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
                      className={`rounded-2xl bg-white border p-5 transition-colors ${
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

          {/* E. Upcoming Tasks */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#242337]">Upcoming Tasks</h2>
              <button
                type="button"
                onClick={() => setActivePage('checklist')}
                className="text-xs font-semibold text-[#7956D8] hover:underline"
              >
                See all
              </button>
            </div>

            {upcomingTasks.length === 0 ? (
              <div className="py-6 text-center">
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
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setActivePage('checklist')}
                    className="w-full min-h-[56px] py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FC] -mx-2 px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#242337] truncate">{task.title}</p>
                      <p className="mt-0.5 text-xs text-[#66687A]">
                        Day {String(task.dayNumber).padStart(2, '0')} · {task.estimatedMinutes} min ·{' '}
                        <span className="font-mono text-[#7956D8] font-semibold">+{task.xpReward} XP</span>
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#88899B] shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Secondary Column */}
        <div className="lg:col-span-5 space-y-5">
          {/* C. Daily Competition */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#242337]">Daily Competition</h2>
                <p className="text-xs text-[#66687A] mt-0.5">{dailyScore.leaderText}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('leaderboard')}
                className="text-xs font-semibold text-[#7956D8] hover:underline"
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

          {/* D. Streak Card */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#242337]">Study Streaks</h2>
                <p className="mt-0.5 text-xs text-[#66687A]">
                  Duo streak: <strong className="text-[#242337] font-mono">{activeGoal?.groupStreak || 0} days</strong> together
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-[#FFF6E5] px-3 py-1.5 text-[#9A6A0A] font-mono text-sm font-bold tabular-nums">
                <Flame className="h-4 w-4 text-[#F3BD59]" />
                {currentUser?.currentStreak || 0}d
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2">
              {weeklyDays.map((day) => (
                <div key={day.dateKey} className="flex flex-col items-center gap-1.5">
                  <div
                    title={`${day.dateKey}${day.isRest ? ' (Planned rest day)' : ''}`}
                    className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-semibold transition-colors ${
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
                  <span className={`text-[11px] ${day.isToday ? 'font-bold text-[#7956D8]' : 'text-[#66687A]'}`}>
                    {day.dayLabel}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* G. Quick Actions */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-5 sm:p-6">
            <h2 className="text-base font-bold text-[#242337] mb-3.5">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setActivePage('goals')}
                className="min-h-[48px] flex items-center gap-2.5 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 py-2.5 text-left text-xs font-semibold text-[#242337] hover:bg-[#F0EBFF] hover:border-[#7956D8]/30 transition-colors"
              >
                <Plus className="h-4 w-4 text-[#7956D8] shrink-0" />
                Create Goal
              </button>
              <button
                type="button"
                onClick={() => setActivePage('checklist')}
                className="min-h-[48px] flex items-center gap-2.5 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 py-2.5 text-left text-xs font-semibold text-[#242337] hover:bg-[#F0EBFF] hover:border-[#7956D8]/30 transition-colors"
              >
                <CheckSquare className="h-4 w-4 text-[#38A879] shrink-0" />
                Today’s Checklist
              </button>
              <button
                type="button"
                onClick={() => setActivePage('leaderboard')}
                className="min-h-[48px] flex items-center gap-2.5 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 py-2.5 text-left text-xs font-semibold text-[#242337] hover:bg-[#F0EBFF] hover:border-[#7956D8]/30 transition-colors"
              >
                <Trophy className="h-4 w-4 text-[#F3BD59] shrink-0" />
                Leaderboard
              </button>
              <button
                type="button"
                onClick={() => setActivePage('ai')}
                className="min-h-[48px] flex items-center gap-2.5 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 py-2.5 text-left text-xs font-semibold text-[#242337] hover:bg-[#F0EBFF] hover:border-[#7956D8]/30 transition-colors"
              >
                <Sparkles className="h-4 w-4 text-[#7956D8] shrink-0" />
                Ask AI Coach
              </button>
            </div>
          </section>

          {/* F. Recent Activity */}
          <section className="rounded-2xl bg-white border border-[#E9EAF0] p-5 sm:p-6">
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
