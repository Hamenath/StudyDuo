import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Plus,
  Send,
  Target,
  UserPlus,
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
  EmptyState,
  ProgressBar,
} from '../components/ui/Primitives';

const FRIENDLY_CHEERS = [
  'Nice work! 🎉',
  'One step closer! 🚀',
  "You're building a streak! 🔥",
];

function getQuestEmoji(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('loop') || lower.includes('while') || lower.includes('for')) return '🔁';
  if (lower.includes('string') || lower.includes('text') || lower.includes('write')) return '📝';
  if (lower.includes('challenge') || lower.includes('project') || lower.includes('cli') || lower.includes('build')) return '🚀';
  if (lower.includes('python') || lower.includes('code') || lower.includes('function') || lower.includes('api')) return '💻';
  if (lower.includes('quiz') || lower.includes('test') || lower.includes('practice')) return '🎯';
  if (lower.includes('data') || lower.includes('list') || lower.includes('dict')) return '📊';
  return '📘';
}

function getBadgeEmoji(key: string): string {
  if (key.includes('streak')) return '🔥';
  if (key === 'study_champion') return '👑';
  if (key === 'goal_completed') return '🏆';
  if (key === 'perfect_week') return '🌟';
  if (key.includes('tasks')) return '✅';
  return '🎖️';
}

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

  const [completedBanner, setCompletedBanner] = useState<{ taskId: string; xp: number; cheer: string } | null>(null);

  const tz = activeGoal?.timezone || currentUser?.timezone || 'UTC';
  const todayKey = getDateKeyInTimezone(new Date(), tz);
  const greeting = getGreetingByHour(new Date().getHours());
  const levelInfo = getLevelInfo(currentUser?.totalXp || 0);
  const isOwner = activeGoal?.ownerId === currentUser?.uid;

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
  const todaysStudyMinutes = useMemo(() => {
    if (!currentUser) return 0;
    const fromTodayCompletions = completions
      .filter((c) => c.userId === currentUser.uid && c.dateKey === todayKey)
      .reduce((sum, c) => sum + (c.estimatedMinutes || 0), 0);
    if (fromTodayCompletions > 0) return fromTodayCompletions;
    return todaysQuests
      .filter((t) => myCompletedTaskIds.has(t.id))
      .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  }, [completions, currentUser, myCompletedTaskIds, todayKey, todaysQuests]);

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
      return {
        dateKey,
        shortDay,
        xp,
        active: myDateSet.has(dateKey) || xp > 0,
        isRest: restSet.has(dateKey),
        isToday: dateKey === todayKey,
      };
    });
  }, [activeGoal?.restDays, completions, currentUser?.uid, todayKey, xpTransactions]);

  const maxWeeklyXp = Math.max(60, ...weeklyActivity.map((d) => d.xp));
  const weeklyTotalXp = weeklyActivity.reduce((acc, d) => acc + d.xp, 0);

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

  const handleQuickComplete = async (task: (typeof todaysQuests)[number], idx: number) => {
    if (!activeGoal || myCompletedTaskIds.has(task.id)) return;
    const cheer = FRIENDLY_CHEERS[idx % FRIENDLY_CHEERS.length];
    setCompletedBanner({ taskId: task.id, xp: task.xpReward, cheer });
    await completeTask(activeGoal.id, task);
    setTimeout(() => {
      setCompletedBanner((curr) => (curr?.taskId === task.id ? null : curr));
    }, 1800);
  };

  if (!currentUser) return null;

  const isRestToday = activeGoal?.restDays.includes(todayKey) || activeDay?.isRestDay;
  const alreadyNudged = activeGoal ? nudgedTodayGoalIds.includes(activeGoal.id) : false;
  const firstName = currentUser.fullName.split(' ')[0];

  return (
    <div className="space-y-5">
      {/* 1. COMPACT GREETING HEADER + DAILY XP PROGRESS */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => setActivePage('avatar')}
              className="shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-[#7956E8]"
              title="Customize avatar"
              aria-label="Customize your avatar"
            >
              <Avatar
                name={currentUser.fullName}
                initials={currentUser.avatarInitials}
                color={currentUser.avatarColor}
                avatarConfig={currentUser.avatarConfig}
                seedKey={currentUser.uid}
                size="lg"
              />
            </button>

            <div className="min-w-0">
              <p className="text-xs font-medium text-[#888888]">{greeting}</p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#242424] truncate">
                Hi, {firstName} 👋
              </h1>
              <p className="text-xs text-[#888888] truncate">
                {activeGoal
                  ? `${activeGoal.title} · Day ${activeDay?.dayNumber ?? 1} of ${activeGoal.durationDays}`
                  : 'Pick a learning goal to get started'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {goals.length > 1 && (
              <select
                aria-label="Switch active learning goal"
                value={selectedGoalId || ''}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3 py-2 text-xs font-semibold text-[#242424] min-h-[38px] max-w-[165px]"
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
              className="hidden lg:inline-flex relative h-10 w-10 items-center justify-center rounded-xl border border-[#EEEEF2] bg-white text-[#666666] hover:bg-[#F7F8FA] hover:text-[#242424] cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#7956E8]" />
              )}
            </button>

            <Button size="sm" onClick={() => setActivePage(activeGoal ? 'checklist' : 'goals')}>
              {activeGoal ? 'Open Quests' : 'Create Goal'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Daily XP Progress Strip */}
        <div className="pt-3 border-t border-[#EEEEF2] space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-extrabold text-[#242424] tabular-nums">
                {currentUser.totalXp.toLocaleString()} XP
              </span>
              <span className="font-semibold text-[#7956E8]">
                Level {levelInfo.level} · {levelInfo.title}
              </span>
            </div>
            <span className="text-[#888888] tabular-nums">
              {levelInfo.nextLevelMinXp
                ? `${levelInfo.xpNeededForNext} XP to Level ${levelInfo.level + 1}`
                : 'Max level'}
            </span>
          </div>
          <ProgressBar percent={levelInfo.progressPercent} color="#7956E8" height="h-2" />
        </div>

        {/* 2. QUICK STATISTICS (Clean 3-Column Divider Row) */}
        <div className="grid grid-cols-3 divide-x divide-[#EEEEF2] pt-2 border-t border-[#EEEEF2]">
          <div className="pr-3">
            <p className="text-[11px] font-medium text-[#888888]">Streak</p>
            <p className="mt-0.5 text-base sm:text-lg font-extrabold text-[#242424] tabular-nums">
              <span aria-hidden="true" className="mr-1">🔥</span>
              {currentUser.currentStreak}d
            </p>
            <p className="text-[11px] text-[#888888] tabular-nums">
              {isRestToday ? 'Rest day' : `Best ${currentUser.longestStreak}d`}
            </p>
          </div>

          <div className="px-3">
            <p className="text-[11px] font-medium text-[#888888]">Today&apos;s study</p>
            <p className="mt-0.5 text-base sm:text-lg font-extrabold text-[#242424] tabular-nums">
              <span aria-hidden="true" className="mr-1">⏱️</span>
              {todaysStudyMinutes}m
            </p>
            <p className="text-[11px] text-[#888888] tabular-nums">
              Goal {activeGoal?.dailyTargetMinutes ?? 60}m
            </p>
          </div>

          <div className="pl-3">
            <p className="text-[11px] font-medium text-[#888888]">Quests done</p>
            <p className="mt-0.5 text-base sm:text-lg font-extrabold text-[#242424] tabular-nums">
              <span aria-hidden="true" className="mr-1">✅</span>
              {completedTodayCount}/{todaysQuests.length}
            </p>
            <p className="text-[11px] text-[#3C8F00] tabular-nums whitespace-nowrap">
              {todaysQuests.length > 0 && completedTodayCount === todaysQuests.length
                ? 'All done!'
                : `+30 XP bonus`}
            </p>
          </div>
        </div>
      </Card>

      {/* NO ACTIVE GOAL EMPTY STATE */}
      {!activeGoal ? (
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title="Start your first StudyDuo goal"
          description="Create a learning roadmap or join your study partner with an invite code to track daily quests together."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Button size="sm" onClick={() => setActivePage('goals')}>
                <Plus className="h-4 w-4" /> Create Goal
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setActivePage('groups')}>
                <UserPlus className="h-4 w-4" /> Join with Code
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* 3. TODAY'S QUESTS + DUO PROGRESS */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
            {/* TODAY'S QUESTS (7 cols) */}
            <Card className="lg:col-span-7" padding="none">
              <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-4 border-b border-[#EEEEF2]">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#242424]">Today&apos;s Quests</h2>
                  <p className="text-xs text-[#888888] truncate">
                    {activeDay ? `Day ${activeDay.dayNumber} · ${activeDay.title}` : 'Daily study checklist'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('checklist')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#7956E8] hover:underline cursor-pointer shrink-0 whitespace-nowrap"
                >
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <AnimatePresence>
                {completedBanner && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden border-b border-[#DFF5CC] bg-[#EFFAE6] px-4 sm:px-5 py-2 text-xs font-semibold text-[#3C8F00] flex items-center justify-between"
                  >
                    <span>{completedBanner.cheer}</span>
                    <span className="tabular-nums">+{completedBanner.xp} XP</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {todaysQuests.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <Calendar className="mx-auto h-5 w-5 text-[#888888]" />
                  <p className="text-sm font-semibold text-[#242424]">No quests for today yet</p>
                  <p className="text-xs text-[#888888]">
                    {isOwner
                      ? 'Add tasks in Quest Center to build today’s study checklist.'
                      : 'Your partner will publish today’s study checklist soon.'}
                  </p>
                  <div className="pt-2">
                    <Button size="sm" variant="secondary" onClick={() => setActivePage('checklist')}>
                      Open Quest Center
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#EEEEF2]">
                  {todaysQuests.map((task, idx) => {
                    const done = myCompletedTaskIds.has(task.id);
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-[#FAFAFC] transition-colors"
                      >
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleQuickComplete(task, idx)}
                          disabled={done}
                          aria-label={done ? `${task.title} completed` : `Complete ${task.title}`}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors duration-150 cursor-pointer ${
                            done
                              ? 'border-[#58CC02] bg-[#58CC02] text-white'
                              : 'border-[#D4D4DC] bg-white text-transparent hover:border-[#7956E8]'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </motion.button>

                        <span className="text-base shrink-0 select-none" aria-hidden="true">
                          {getQuestEmoji(task.title)}
                        </span>

                        <button
                          type="button"
                          onClick={() => setActivePage('checklist')}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <p
                            className={`text-sm font-semibold leading-snug truncate ${
                              done ? 'text-[#888888] line-through' : 'text-[#242424]'
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="text-xs text-[#888888] tabular-nums">
                            {task.estimatedMinutes} min
                            <span aria-hidden="true"> · </span>
                            <span className={done ? 'text-[#3C8F00] font-semibold' : 'text-[#7956E8] font-semibold'}>
                              +{task.xpReward} XP
                            </span>
                          </p>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* DUO PROGRESS (5 cols) */}
            <Card className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#242424]">Duo Progress</h2>
                  <p className="text-xs text-[#888888] truncate">
                    {activeGoal.groupName || 'Your study team'}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#FF9600] tabular-nums shrink-0">
                  🔥 {duoStreak?.duoStreak ?? activeGoal.groupStreak}d duo
                </span>
              </div>

              {/* Both Player Avatars */}
              <div className="grid grid-cols-2 divide-x divide-[#EEEEF2] py-1">
                {[selfParticipant, partner].map((member, idx) => {
                  if (!member) {
                    return (
                      <button
                        key="invite-slot"
                        type="button"
                        onClick={() => setActivePage('groups')}
                        className="flex flex-col items-center justify-center gap-1.5 px-2 py-2 text-center hover:bg-[#F7F8FA] rounded-xl transition-colors cursor-pointer"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-[#A78BFA] text-[#7956E8]">
                          <UserPlus className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-semibold text-[#7956E8]">Invite Partner</p>
                      </button>
                    );
                  }
                  const entry = overallLeaderboard.find((e) => e.uid === member.uid);
                  const xp = entry?.totalXp ?? member.goalXp;
                  const litToday =
                    idx === 0 ? duoStreak?.myStudiedToday : duoStreak?.partnerStudiedToday;
                  return (
                    <div key={member.uid} className="flex flex-col items-center px-2 text-center">
                      <div className="relative">
                        <Avatar
                          name={member.displayName}
                          initials={member.avatarInitials}
                          color={member.avatarColor}
                          avatarConfig={member.avatarConfig}
                          seedKey={member.uid}
                          size="md"
                        />
                        {litToday && (
                          <span
                            title="Studied today"
                            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#58CC02] text-white ring-2 ring-white"
                          >
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="mt-2 max-w-full truncate text-xs font-bold text-[#242424]">
                        {member.uid === currentUser.uid ? 'You' : member.displayName.split(' ')[0]}
                      </p>
                      <p className="text-xs font-bold text-[#7956E8] tabular-nums">
                        {xp.toLocaleString()} XP
                      </p>
                      <p className="text-[11px] text-[#888888] tabular-nums">
                        Lv.{getLevelInfo(xp).level} · {member.currentStreak}d
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Shared Goal Progress */}
              <div className="space-y-1.5 pt-3 border-t border-[#EEEEF2]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#888888]">Shared goal progress</span>
                  <span className="font-bold text-[#242424] tabular-nums">{sharedGoalProgressPct}%</span>
                </div>
                <ProgressBar percent={sharedGoalProgressPct} color="#58CC02" height="h-2" />
              </div>

              {duoStreak && (
                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <p className="text-[#666666] leading-snug">{duoStreak.subtext}</p>
                  {duoStreak.canNudgePartner && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={alreadyNudged}
                      onClick={() => nudgePartnerStreak(activeGoal.id)}
                      className="shrink-0"
                    >
                      <Send className="h-3 w-3" />
                      {alreadyNudged ? 'Nudged' : 'Nudge'}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* 4. WEEKLY ACTIVITY, UPCOMING MILESTONES & RECENT ACHIEVEMENTS */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
            {/* Weekly Study Activity (5 cols) */}
            <Card className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-[#242424]">Weekly Activity</h2>
                  <p className="text-xs text-[#888888] tabular-nums">
                    +{weeklyTotalXp} XP in the last 7 days
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('analytics')}
                  className="text-xs font-semibold text-[#7956E8] hover:underline cursor-pointer"
                >
                  Details
                </button>
              </div>

              <div className="flex items-end justify-between gap-2 h-24 pt-2">
                {weeklyActivity.map((day) => {
                  const pct = day.xp > 0 ? Math.max(18, Math.round((day.xp / maxWeeklyXp) * 100)) : 8;
                  return (
                    <div key={day.dateKey} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-medium text-[#888888] tabular-nums">
                        {day.xp > 0 ? day.xp : ''}
                      </span>
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full max-w-[24px] rounded-t-md transition-all duration-200 ${
                          day.isToday
                            ? 'bg-[#7956E8]'
                            : day.xp > 0
                            ? 'bg-[#58CC02]/75'
                            : 'bg-[#EEEEF2]'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-semibold ${
                          day.isToday ? 'text-[#7956E8]' : 'text-[#888888]'
                        }`}
                      >
                        {day.shortDay}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Upcoming Milestones (4 cols) */}
            <Card className="lg:col-span-4" padding="none">
              <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-[#EEEEF2]">
                <h2 className="text-base font-extrabold text-[#242424]">Upcoming Milestones</h2>
                <button
                  type="button"
                  onClick={() => setActivePage('goals')}
                  className="text-xs font-semibold text-[#7956E8] hover:underline cursor-pointer"
                >
                  Roadmap
                </button>
              </div>

              {upcomingMilestones.length === 0 ? (
                <p className="p-5 text-xs text-[#888888]">No roadmap milestones yet.</p>
              ) : (
                <div className="divide-y divide-[#EEEEF2]">
                  {upcomingMilestones.map(({ phase, done, total, pct }) => (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => setActivePage('goals')}
                      className="w-full text-left px-4 sm:px-5 py-3 space-y-1.5 hover:bg-[#FAFAFC] transition-colors cursor-pointer"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-xs font-bold text-[#242424]">{phase.title}</p>
                        <span
                          className={`text-xs font-bold tabular-nums shrink-0 ${
                            pct === 100 ? 'text-[#3C8F00]' : 'text-[#7956E8]'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                      <p className="text-[11px] text-[#888888] tabular-nums">
                        Days {phase.startDay}–{phase.endDay} · {done}/{total} quests
                      </p>
                      <ProgressBar
                        percent={pct}
                        color={pct === 100 ? '#58CC02' : '#7956E8'}
                        height="h-1.5"
                      />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Achievements (3 cols) */}
            <Card className="lg:col-span-3" padding="none">
              <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-[#EEEEF2]">
                <h2 className="text-base font-extrabold text-[#242424]">Achievements</h2>
                <button
                  type="button"
                  onClick={() => setActivePage('achievements')}
                  className="text-xs font-semibold text-[#7956E8] hover:underline cursor-pointer"
                >
                  All ({achievements.length})
                </button>
              </div>

              {recentAchievements.length === 0 ? (
                <p className="p-5 text-xs text-[#888888]">
                  Finish your first quest to earn a badge!
                </p>
              ) : (
                <div className="divide-y divide-[#EEEEF2]">
                  {recentAchievements.map(({ unlock, def }) => (
                    <button
                      key={unlock.id}
                      type="button"
                      onClick={() => setActivePage('achievements')}
                      className="flex w-full items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-[#FAFAFC] transition-colors cursor-pointer"
                    >
                      <span className="text-lg shrink-0" aria-hidden="true">
                        {getBadgeEmoji(def!.key)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#242424]">{def!.title}</p>
                        <p className="text-[11px] text-[#888888]">
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
