import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Map as MapIcon,
  Palette,
  Plus,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import {
  ACHIEVEMENT_CATALOG,
  addDaysToDateKey,
  computeDuoStreakStatus,
  computeLeaderboard,
  getDateKeyInTimezone,
  getGreetingByHour,
  getLevelInfo,
} from '../lib/gamification';
import {
  Avatar,
  Button,
  Card,
  CircularProgress,
  EmptyState,
  ProgressBar,
} from '../components/ui/Primitives';
import type { TaskPriority } from '../types/studyduo';

const DIFFICULTY_META: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'Easy', color: 'text-[#1D855A]', bg: 'bg-[#E6F8F0]' },
  medium: { label: 'Medium', color: 'text-[#6B48DC]', bg: 'bg-[#F1EDFF]' },
  high: { label: 'Hard', color: 'text-[#B26B00]', bg: 'bg-[#FFF6DB]' },
};

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    activeGoal,
    goals,
    selectedGoalId,
    setSelectedGoalId,
    participants,
    phases,
    days,
    tasks,
    completions,
    dailyResults,
    xpTransactions,
    achievements,
    unreadNotificationCount,
    completeTask,
    nudgePartnerStreak,
    nudgedTodayGoalIds,
    setActivePage,
  } = useStudyDuo();

  const [floatingXpTaskId, setFloatingXpTaskId] = useState<string | null>(null);

  const tz = activeGoal?.timezone || currentUser?.timezone || 'UTC';
  const todayKey = getDateKeyInTimezone(new Date(), tz);
  const greeting = getGreetingByHour(new Date().getHours());
  const levelInfo = getLevelInfo(currentUser?.totalXp || 0);

  const isOwner = activeGoal?.ownerId === currentUser?.uid;

  // Determine today's active study day
  const activeDay = useMemo(() => {
    if (!days.length) return null;
    const byDate = days.find((d) => d.date === todayKey && (d.isPublished || isOwner));
    if (byDate) return byDate;
    const published = days.filter((d) => d.isPublished || isOwner).sort((a, b) => a.dayNumber - b.dayNumber);
    return published[published.length - 1] ?? null;
  }, [days, isOwner, todayKey]);

  const todaysQuests = useMemo(() => {
    if (!activeDay) return [];
    return tasks
      .filter((t) => t.dayId === activeDay.id && !t.isArchived && (t.isPublished || isOwner))
      .sort((a, b) => a.order - b.order);
  }, [activeDay, isOwner, tasks]);

  const myCompletedTaskIds = useMemo(() => {
    if (!currentUser) return new Set<string>();
    return new Set(completions.filter((c) => c.userId === currentUser.uid).map((c) => c.taskId));
  }, [completions, currentUser]);

  const completedTodayCount = todaysQuests.filter((t) => myCompletedTaskIds.has(t.id)).length;
  const dailyCompletionPct =
    todaysQuests.length > 0 ? Math.round((completedTodayCount / todaysQuests.length) * 100) : 0;

  // Last 7 days activity (for Streak Card + Weekly Activity Chart)
  const weeklyActivity = useMemo(() => {
    const restSet = new Set(activeGoal?.restDays || []);
    const myDateSet = new Set(
      completions.filter((c) => c.userId === currentUser?.uid).map((c) => c.dateKey)
    );

    return Array.from({ length: 7 }, (_, idx) => {
      const dateKey = addDaysToDateKey(todayKey, idx - 6);
      const [y, m, d] = dateKey.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const shortDay = dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).slice(0, 2);

      const dayXpFromTx = xpTransactions
        .filter((tx) => tx.userId === currentUser?.uid && tx.dateKey === dateKey)
        .reduce((acc, tx) => acc + tx.xpAmount, 0);
      const dayXpFromComp = completions
        .filter((c) => c.userId === currentUser?.uid && c.dateKey === dateKey)
        .reduce((acc, c) => acc + c.xpAwarded, 0);
      const xp = Math.max(dayXpFromTx, dayXpFromComp);
      const active = myDateSet.has(dateKey) || xp > 0;
      const isRest = restSet.has(dateKey);
      return {
        dateKey,
        shortDay,
        xp,
        active,
        isRest,
        isToday: dateKey === todayKey,
      };
    });
  }, [activeGoal?.restDays, completions, currentUser?.uid, todayKey, xpTransactions]);

  const maxWeeklyXp = Math.max(60, ...weeklyActivity.map((d) => d.xp));
  const weeklyTotalXp = weeklyActivity.reduce((acc, d) => acc + d.xp, 0);

  // Duo status & leaderboard comparison
  const partner = useMemo(
    () => participants.find((p) => p.uid !== currentUser?.uid) ?? null,
    [currentUser?.uid, participants]
  );
  const selfParticipant = useMemo(
    () => participants.find((p) => p.uid === currentUser?.uid) ?? null,
    [currentUser?.uid, participants]
  );

  const duoStreak = useMemo(() => {
    if (!activeGoal || !currentUser) return null;
    return computeDuoStreakStatus({
      participantIds: activeGoal.participantIds,
      currentUserId: currentUser.uid,
      partnerName: partner?.displayName,
      completions,
      restDays: activeGoal.restDays,
      timezone: tz,
      groupStreak: activeGoal.groupStreak,
    });
  }, [activeGoal, completions, currentUser, partner?.displayName, tz]);

  const overallLeaderboard = useMemo(() => {
    if (!activeGoal) return [];
    const totalXpMap: Record<string, number> = {};
    if (currentUser) totalXpMap[currentUser.uid] = currentUser.totalXp;
    return computeLeaderboard(
      participants,
      xpTransactions,
      activeGoal.id,
      todayKey,
      'overall',
      totalXpMap,
      dailyResults,
      completions
    );
  }, [activeGoal, completions, currentUser, dailyResults, participants, todayKey, xpTransactions]);

  const sharedGoalProgressPct = useMemo(() => {
    const publishedTasks = tasks.filter((t) => !t.isArchived && t.isPublished);
    if (publishedTasks.length === 0) return 0;
    const totalPossible = publishedTasks.length * Math.max(1, participants.length);
    const totalDone = completions.filter((c) => publishedTasks.some((t) => t.id === c.taskId)).length;
    return Math.min(100, Math.round((totalDone / totalPossible) * 100));
  }, [completions, participants.length, tasks]);

  // Roadmap milestones preview
  const upcomingMilestones = useMemo(() => {
    const visiblePhases = phases
      .filter((p) => p.isPublished || isOwner)
      .sort((a, b) => a.order - b.order);

    return visiblePhases.slice(0, 3).map((phase) => {
      const phaseTasks = tasks.filter(
        (t) =>
          !t.isArchived &&
          (t.isPublished || isOwner) &&
          t.dayNumber >= phase.startDay &&
          t.dayNumber <= phase.endDay
      );
      const done = phaseTasks.filter((t) => myCompletedTaskIds.has(t.id)).length;
      const pct = phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0;
      return { phase, done, total: phaseTasks.length, pct };
    });
  }, [isOwner, myCompletedTaskIds, phases, tasks]);

  const nextMilestone = upcomingMilestones.find((m) => m.pct < 100) ?? upcomingMilestones[0] ?? null;

  // Recent unlocked achievements
  const recentAchievements = useMemo(() => {
    return [...achievements]
      .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
      .slice(0, 3)
      .map((u) => ({
        unlock: u,
        def: ACHIEVEMENT_CATALOG.find((c) => c.key === u.achievementKey),
      }))
      .filter((item) => Boolean(item.def));
  }, [achievements]);

  const totalStudyMinutes = useMemo(
    () =>
      completions
        .filter((c) => c.userId === currentUser?.uid)
        .reduce((acc, c) => acc + (c.estimatedMinutes || 0), 0),
    [completions, currentUser?.uid]
  );

  const handleQuickComplete = async (task: (typeof todaysQuests)[number]) => {
    if (!activeGoal || myCompletedTaskIds.has(task.id)) return;
    setFloatingXpTaskId(task.id);
    await completeTask(activeGoal.id, task);
    setTimeout(() => {
      setFloatingXpTaskId((curr) => (curr === task.id ? null : curr));
    }, 900);
  };

  if (!currentUser) return null;

  const isRestToday = activeGoal?.restDays.includes(todayKey) || activeDay?.isRestDay;
  const alreadyNudged = activeGoal ? nudgedTodayGoalIds.includes(activeGoal.id) : false;

  return (
    <div className="space-y-5">
      {/* A. WELCOME HERO SECTION */}
      <Card padding="none" className="overflow-hidden border-[#E5DFFA]">
        <div className="sd-gradient-hero p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setActivePage('avatar')}
                className="relative group shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-[#7956E8]"
                title="Customize your avatar"
                aria-label="Customize your avatar"
              >
                <Avatar
                  initials={currentUser.avatarInitials}
                  color={currentUser.avatarColor}
                  avatarConfig={currentUser.avatarConfig}
                  seedKey={currentUser.uid}
                  size="lg"
                  animated
                />
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#7956E8] text-white shadow-sm ring-2 ring-white group-hover:scale-110 transition-transform">
                  <Palette className="h-3 w-3" />
                </span>
              </button>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#7956E8]">
                  {greeting} · Level {levelInfo.level} {levelInfo.title}
                </p>
                <h1 className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-[#25243A] truncate">
                  {currentUser.fullName}
                </h1>
                <p className="mt-0.5 text-xs text-[#77768C] truncate">
                  {activeGoal
                    ? `${activeGoal.title} · Day ${activeDay?.dayNumber ?? 1} of ${activeGoal.durationDays}`
                    : 'Ready to launch your next shared learning adventure'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {goals.length > 1 && (
                <select
                  aria-label="Switch active learning goal"
                  value={selectedGoalId || ''}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="rounded-xl border border-[#DFD8F8] bg-white px-3 py-2 text-xs font-semibold text-[#25243A] min-h-[40px] max-w-[180px]"
                >
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => setActivePage('notifications')}
                className="hidden lg:inline-flex relative h-10 w-10 items-center justify-center rounded-xl border border-[#E4DFF6] bg-white text-[#66647B] hover:border-[#CFC6F7] hover:text-[#25243A] cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7956E8] px-1 text-[10px] font-bold text-white tabular-nums">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              <Button size="sm" onClick={() => setActivePage(activeGoal ? 'checklist' : 'goals')}>
                {activeGoal ? 'Quest Center' : 'Create Goal'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* B, C, D — THREE CORE GAME PROGRESSION CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* B. XP PROGRESSION CARD */}
        <Card className="sd-card-hover flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#77768C]">XP Progression</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-[#25243A] tabular-nums">
                  {currentUser.totalXp.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-[#7956E8]">XP</span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F1EDFF] text-[#7956E8]">
              <Zap className="h-5 w-5 fill-[#7956E8]/15" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#25243A]">
                Lv.{levelInfo.level} {levelInfo.title}
              </span>
              <span className="font-semibold text-[#77768C] tabular-nums">
                {levelInfo.nextLevelMinXp
                  ? `${levelInfo.xpNeededForNext} XP to Lv.${levelInfo.level + 1}`
                  : 'Max Rank'}
              </span>
            </div>
            <ProgressBar percent={levelInfo.progressPercent} color="#7956E8" height="h-2.5" />
            <div className="flex items-center justify-between text-[11px] text-[#77768C]">
              <span className="tabular-nums">{levelInfo.progressPercent}% level progress</span>
              {levelInfo.xpNeededForNext > 0 && levelInfo.xpNeededForNext <= 60 ? (
                <span className="font-bold text-[#38B982] inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Level-up ready!
                </span>
              ) : (
                <span>+{weeklyTotalXp} XP this week</span>
              )}
            </div>
          </div>
        </Card>

        {/* C. DAILY QUEST PROGRESS CARD */}
        <Card className="sd-card-hover flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-semibold text-[#77768C]">Daily Quest Progress</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-[#25243A] tabular-nums">
                {completedTodayCount}/{todaysQuests.length}
              </span>
              <span className="text-xs font-semibold text-[#77768C]">quests</span>
            </div>
            <p className="text-xs leading-snug text-[#77768C]">
              {isRestToday
                ? 'Rest day active — recharge without losing your streak.'
                : todaysQuests.length === 0
                ? 'No published quests scheduled yet.'
                : completedTodayCount === todaysQuests.length
                ? 'All quests done! +30 XP Day Bonus unlocked.'
                : `${todaysQuests.length - completedTodayCount} quest${
                    todaysQuests.length - completedTodayCount === 1 ? '' : 's'
                  } left for +30 XP bonus.`}
            </p>
            <button
              type="button"
              onClick={() => setActivePage('checklist')}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#7956E8] hover:underline cursor-pointer"
            >
              Open quests <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <CircularProgress
            percent={dailyCompletionPct}
            size={84}
            strokeWidth={8}
            color={dailyCompletionPct === 100 ? '#38B982' : '#7956E8'}
          >
            <span className="text-base font-extrabold text-[#25243A] tabular-nums">
              {dailyCompletionPct}%
            </span>
          </CircularProgress>
        </Card>

        {/* D. STREAK CARD */}
        <Card className="sd-card-hover flex flex-col justify-between gap-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#77768C]">Study Streak</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-[#25243A] tabular-nums">
                  {currentUser.currentStreak}
                </span>
                <span className="text-xs font-bold text-[#D98806]">
                  {currentUser.currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <p className="text-[11px] text-[#77768C] mt-0.5 tabular-nums">
                Best: {currentUser.longestStreak}d {isRestToday ? '· Rest day freeze' : ''}
              </p>
            </div>
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.35 }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF6DB] text-[#E09100]"
            >
              <Flame className="h-5 w-5 fill-[#FFC857]" />
            </motion.div>
          </div>

          {/* 7-Day Activity Strip */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {weeklyActivity.map((day) => (
              <div key={day.dateKey} className="flex flex-col items-center gap-1">
                <div
                  title={`${day.dateKey}: ${
                    day.isRest ? 'Rest Day' : day.active ? `${day.xp} XP` : 'No activity'
                  }`}
                  className={`flex h-7 w-7 items-center justify-center rounded-xl text-[10px] font-bold transition-colors ${
                    day.active
                      ? 'bg-[#38B982] text-white shadow-[0_2px_6px_rgba(56,185,130,0.3)]'
                      : day.isRest
                      ? 'bg-[#E5F8FB] text-[#1D8597] border border-[#BEEAF2]'
                      : day.isToday
                      ? 'bg-[#F1EDFF] text-[#7956E8] border border-dashed border-[#A78BFA]'
                      : 'bg-[#F5F3FC] text-[#A2A0B5]'
                  }`}
                >
                  {day.active ? <Check className="h-3.5 w-3.5" /> : day.isRest ? 'R' : '·'}
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    day.isToday ? 'text-[#7956E8]' : 'text-[#8C8AA2]'
                  }`}
                >
                  {day.shortDay}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* NO ACTIVE GOAL EMPTY STATE */}
      {!activeGoal ? (
        <Card>
          <EmptyState
            icon={<Target className="h-6 w-6" />}
            title="Start your first StudyDuo goal"
            description="Create a learning roadmap or join your study partner with an invite code to unlock daily quests, shared streaks, and live leaderboards."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <Button onClick={() => setActivePage('goals')}>
                  <Plus className="h-4 w-4" /> Create Learning Goal
                </Button>
                <Button variant="secondary" onClick={() => setActivePage('groups')}>
                  <UserPlus className="h-4 w-4" /> Join with Invite Code
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          {/* E & F — TODAY'S QUESTS + DUO PROGRESS */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
            {/* F. TODAY'S QUESTS (7 cols) */}
            <Card className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-[#25243A]">Today&apos;s Quests</h2>
                  <p className="text-xs text-[#77768C]">
                    {activeDay
                      ? `Day ${activeDay.dayNumber} · ${activeDay.title}`
                      : 'Check off quests to earn XP and fuel your streak'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('checklist')}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#F4F1FE] px-3 py-1.5 text-xs font-bold text-[#7956E8] hover:bg-[#EAE3FF] transition-colors cursor-pointer"
                >
                  Full Quest Center <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {todaysQuests.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-5 w-5" />}
                  title="No quests queued for today"
                  description={
                    isOwner
                      ? 'Add tasks in the Quest Center or generate a roadmap with AI Coach.'
                      : 'Your goal owner has not published quests for today yet.'
                  }
                  action={
                    <Button size="sm" onClick={() => setActivePage('checklist')}>
                      Open Quest Center
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2.5">
                  {todaysQuests.map((task) => {
                    const done = myCompletedTaskIds.has(task.id);
                    const diff = DIFFICULTY_META[task.priority] ?? DIFFICULTY_META.medium;
                    return (
                      <div
                        key={task.id}
                        className={`relative flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
                          done
                            ? 'border-[#CBEFE0] bg-[#F5FCF8]'
                            : 'border-[#EAE7F8] bg-white hover:border-[#CFC6F7]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleQuickComplete(task)}
                          disabled={done}
                          aria-label={done ? `${task.title} completed` : `Complete ${task.title}`}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-all cursor-pointer ${
                            done
                              ? 'border-[#38B982] bg-[#38B982] text-white'
                              : 'border-[#D3CAF6] bg-[#FAF8FF] text-transparent hover:border-[#7956E8] hover:bg-[#F1EDFF]'
                          }`}
                        >
                          <Check className="h-4 w-4 stroke-[3]" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-bold leading-snug ${
                              done ? 'text-[#5A7569] line-through' : 'text-[#25243A]'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-[#77768C]">
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock className="h-3 w-3" />
                              {task.estimatedMinutes}m
                            </span>
                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${diff.bg} ${diff.color}`}>
                              {diff.label}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-extrabold tabular-nums ${
                              done
                                ? 'bg-[#E6F8F0] text-[#1F8B5D]'
                                : 'bg-[#FFF6DB] text-[#9A6808]'
                            }`}
                          >
                            <Zap className="h-3 w-3 fill-current" />+{task.xpReward}
                          </span>
                        </div>

                        {/* Floating +XP feedback */}
                        <AnimatePresence>
                          {floatingXpTaskId === task.id && (
                            <motion.span
                              initial={{ opacity: 0, y: 4, scale: 0.9 }}
                              animate={{ opacity: 1, y: -22, scale: 1.05 }}
                              exit={{ opacity: 0, y: -34 }}
                              transition={{ duration: 0.65, ease: 'easeOut' }}
                              className="pointer-events-none absolute right-4 top-1 rounded-full bg-[#7956E8] px-2.5 py-0.5 text-xs font-extrabold text-white shadow-md"
                            >
                              +{task.xpReward} XP!
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* E. DUO PROGRESS CARD (5 cols) */}
            <Card className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-[#25243A]">Duo Progress</h2>
                  <p className="text-xs text-[#77768C]">{activeGoal.groupName || 'StudyDuo Partner Hub'}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-xl bg-[#FFF6DB] px-2.5 py-1 text-xs font-extrabold text-[#9A6808] tabular-nums">
                  <Flame className="h-3.5 w-3.5 text-[#F59E0B] fill-[#FFC857]" />
                  {duoStreak?.duoStreak ?? activeGoal.groupStreak}d Duo
                </span>
              </div>

              {/* Side-by-side Player Avatars */}
              <div className="grid grid-cols-2 gap-3">
                {[selfParticipant, partner].map((member, idx) => {
                  if (!member) {
                    return (
                      <button
                        key="invite-slot"
                        type="button"
                        onClick={() => setActivePage('groups')}
                        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#CFC6F7] bg-[#FAF9FF] p-3.5 text-center hover:bg-[#F3EFFF] transition-colors cursor-pointer"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1EDFF] text-[#7956E8]">
                          <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#25243A]">Invite Partner</p>
                          <p className="text-[11px] text-[#77768C]">Start a Duo Flame</p>
                        </div>
                      </button>
                    );
                  }
                  const entry = overallLeaderboard.find((e) => e.uid === member.uid);
                  const xp = entry?.totalXp ?? member.goalXp;
                  const litToday =
                    idx === 0 ? duoStreak?.myStudiedToday : duoStreak?.partnerStudiedToday;
                  return (
                    <div
                      key={member.uid}
                      className="flex flex-col items-center rounded-2xl border border-[#EAE7F8] bg-[#FCFBFF] p-3.5 text-center"
                    >
                      <div className="relative">
                        <Avatar
                          initials={member.avatarInitials}
                          color={member.avatarColor}
                          avatarConfig={member.avatarConfig}
                          seedKey={member.uid}
                          size="md"
                        />
                        {litToday && (
                          <span
                            title="Studied today"
                            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#38B982] text-white ring-2 ring-white"
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="mt-2 max-w-full truncate text-xs font-bold text-[#25243A]">
                        {member.uid === currentUser.uid ? 'You' : member.displayName}
                      </p>
                      <p className="text-xs font-extrabold text-[#7956E8] tabular-nums">
                        {xp.toLocaleString()} XP
                      </p>
                      <p className="text-[10px] text-[#77768C] tabular-nums">
                        Lv.{getLevelInfo(xp).level} · {member.currentStreak}d streak
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Shared Goal Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#77768C]">Shared Goal Progress</span>
                  <span className="font-extrabold text-[#25243A] tabular-nums">
                    {sharedGoalProgressPct}%
                  </span>
                </div>
                <ProgressBar percent={sharedGoalProgressPct} color="#45C4D8" height="h-2.5" />
              </div>

              {/* Duo Flame Status & Friendly Nudge */}
              {duoStreak && (
                <div className="rounded-2xl border border-[#EAE7F8] bg-[#F8F7FF] p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#25243A]">{duoStreak.headline}</span>
                    {duoStreak.canNudgePartner && (
                      <button
                        type="button"
                        disabled={alreadyNudged}
                        onClick={() => nudgePartnerStreak(activeGoal.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#7956E8] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#6743D8] disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="h-3 w-3" />
                        {alreadyNudged ? 'Nudged' : 'Nudge'}
                      </button>
                    )}
                  </div>
                  <p className="text-[#77768C] leading-relaxed">{duoStreak.subtext}</p>
                </div>
              )}

              {/* Next Milestone Callout */}
              {nextMilestone && (
                <button
                  type="button"
                  onClick={() => setActivePage('goals')}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#EAE7F8] bg-white px-3.5 py-2.5 text-left hover:border-[#CFC6F7] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7956E8]">
                      Next Milestone
                    </p>
                    <p className="truncate text-xs font-bold text-[#25243A]">
                      {nextMilestone.phase.milestoneTitle || nextMilestone.phase.title}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-extrabold text-[#38B982] tabular-nums">
                    {nextMilestone.pct}%
                  </span>
                </button>
              )}
            </Card>
          </div>

          {/* ADDITIONAL SECTIONS: ROADMAP MILESTONES, WEEKLY ACTIVITY CHART & RECENT ACHIEVEMENTS */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Weekly Activity Chart & Study Statistics (5 cols) */}
            <Card className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-[#25243A]">Weekly Activity</h2>
                  <p className="text-xs text-[#77768C]">XP earned over the last 7 days</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('analytics')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#7956E8] hover:underline cursor-pointer"
                >
                  Analytics <TrendingUp className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Clean Animated Bar Chart */}
              <div className="flex items-end justify-between gap-2 h-32 pt-3 px-1">
                {weeklyActivity.map((day) => {
                  const pct = day.xp > 0 ? Math.max(14, Math.round((day.xp / maxWeeklyXp) * 100)) : 6;
                  return (
                    <div key={day.dateKey} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-bold text-[#77768C] tabular-nums">
                        {day.xp > 0 ? day.xp : ''}
                      </span>
                      <motion.div
                        initial={{ height: 6 }}
                        animate={{ height: `${pct}%` }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className={`w-full max-w-[30px] rounded-t-xl ${
                          day.isToday
                            ? 'sd-gradient-primary shadow-[0_4px_10px_rgba(121,86,232,0.28)]'
                            : day.xp > 0
                            ? 'bg-[#C4B2FB]'
                            : 'bg-[#F0ECF9]'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-semibold ${
                          day.isToday ? 'text-[#7956E8]' : 'text-[#8C8AA2]'
                        }`}
                      >
                        {day.shortDay}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Study Statistics Strip */}
              <div className="grid grid-cols-3 gap-2 border-t border-[#F1EEFA] pt-3.5 text-center">
                <div>
                  <p className="text-base font-extrabold text-[#25243A] tabular-nums">
                    {currentUser.completedTasksCount}
                  </p>
                  <p className="text-[11px] text-[#77768C]">Quests Done</p>
                </div>
                <div>
                  <p className="text-base font-extrabold text-[#25243A] tabular-nums">
                    {Math.round(totalStudyMinutes / 60 * 10) / 10}h
                  </p>
                  <p className="text-[11px] text-[#77768C]">Focus Time</p>
                </div>
                <div>
                  <p className="text-base font-extrabold text-[#25243A] tabular-nums">
                    {achievements.length}/{ACHIEVEMENT_CATALOG.length}
                  </p>
                  <p className="text-[11px] text-[#77768C]">Badges</p>
                </div>
              </div>
            </Card>

            {/* Upcoming Roadmap Milestones (4 cols) */}
            <Card className="lg:col-span-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-extrabold text-[#25243A]">Roadmap Milestones</h2>
                <button
                  type="button"
                  onClick={() => setActivePage('goals')}
                  className="text-xs font-bold text-[#7956E8] hover:underline cursor-pointer"
                >
                  View Map
                </button>
              </div>

              {upcomingMilestones.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DFD8F8] bg-[#FAF9FF] p-5 text-center text-xs text-[#77768C]">
                  <MapIcon className="mx-auto mb-2 h-5 w-5 text-[#A78BFA]" />
                  Add phases in Roadmap Adventure to track milestones.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMilestones.map(({ phase, done, total, pct }) => (
                    <div
                      key={phase.id}
                      className="rounded-2xl border border-[#EAE7F8] bg-[#FCFBFF] p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#25243A]">{phase.title}</p>
                          <p className="text-[11px] text-[#77768C]">
                            Days {phase.startDay}–{phase.endDay} · {done}/{total} quests
                          </p>
                        </div>
                        {pct === 100 ? (
                          <CheckCircle2 className="h-4 w-4 text-[#38B982] shrink-0" />
                        ) : (
                          <span className="text-xs font-extrabold text-[#7956E8] tabular-nums">
                            {pct}%
                          </span>
                        )}
                      </div>
                      <ProgressBar
                        percent={pct}
                        color={pct === 100 ? '#38B982' : '#7956E8'}
                        height="h-1.5"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Achievements (3 cols) */}
            <Card className="lg:col-span-3 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-extrabold text-[#25243A]">Recent Badges</h2>
                <button
                  type="button"
                  onClick={() => setActivePage('achievements')}
                  className="text-xs font-bold text-[#7956E8] hover:underline cursor-pointer"
                >
                  Gallery
                </button>
              </div>

              {recentAchievements.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DFD8F8] bg-[#FAF9FF] p-5 text-center text-xs text-[#77768C]">
                  <Award className="mx-auto mb-2 h-5 w-5 text-[#FFC857]" />
                  Complete your first quest to earn a collectible badge!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentAchievements.map(({ unlock, def }) => (
                    <button
                      key={unlock.id}
                      type="button"
                      onClick={() => setActivePage('achievements')}
                      className="flex w-full items-center gap-3 rounded-2xl border border-[#EAE7F8] bg-[#FCFBFF] p-2.5 text-left hover:border-[#CFC6F7] transition-colors cursor-pointer"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF6DB] text-[#D98806]">
                        <Crown className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#25243A]">{def!.title}</p>
                        <p className="truncate text-[11px] text-[#77768C]">
                          {new Date(unlock.unlockedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
