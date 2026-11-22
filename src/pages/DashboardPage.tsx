import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Edit3,
  Plus,
  Search,
  Send,
  Star,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import {
  ACHIEVEMENT_CATALOG,
  addDaysToDateKey,
  computeDuoStreakStatus,
  computeLeaderboard,
  getDateKeyInTimezone,
  getLevelInfo,
} from '../lib/gamification';
import type { Task, TaskPriority } from '../types/studyduo';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ModalSheet,
  ProgressBar,
} from '../components/ui/Primitives';
import { SocialShareComponent } from '../components/groups/SocialShareComponent';
import {
  getSubjectTheme,
  MascotImage,
  SUBJECT_THEMES,
  SubjectCardMotif,
  type SubjectPastelTheme,
} from '../components/ui/MascotArtwork';

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

const PASTEL_CYCLE: SubjectPastelTheme[] = [
  SUBJECT_THEMES.lavender,
  SUBJECT_THEMES.yellow,
  SUBJECT_THEMES.green,
  SUBJECT_THEMES.pink,
];

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
    invitations,
    createInvitation,
    cancelInvitation,
    unreadNotificationCount,
    saveTask,
    deleteTask,
    completeTask,
    nudgePartnerStreak,
    nudgedTodayGoalIds,
    setActivePage,
    showToast,
  } = useStudyDuo();

  const [completedBanner, setCompletedBanner] = useState<{ taskId: string; xp: number; cheer: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const [quickTaskModalOpen, setQuickTaskModalOpen] = useState(false);
  const [editingQuickTask, setEditingQuickTask] = useState<Task | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDesc, setQuickTaskDesc] = useState('');
  const [quickTaskMinutes, setQuickTaskMinutes] = useState(20);
  const [quickTaskXp, setQuickTaskXp] = useState(20);
  const [quickTaskPriority, setQuickTaskPriority] = useState<TaskPriority>('medium');
  const [quickTaskToDelete, setQuickTaskToDelete] = useState<Task | null>(null);

  const tz = activeGoal?.timezone || currentUser?.timezone || 'UTC';
  const todayKey = getDateKeyInTimezone(new Date(), tz);
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

  // Pastel Subject / Progress Cards (matching the reference screenshot's signature stacked pastel cards)
  const progressCards = useMemo(() => {
    if (!activeGoal) return [];
    const visiblePhases = phases
      .filter((p) => p.isPublished || isOwner)
      .sort((a, b) => a.order - b.order);

    const primaryTheme = getSubjectTheme(activeGoal.category, 0);
    const orderedThemes: SubjectPastelTheme[] = [
      primaryTheme,
      ...PASTEL_CYCLE.filter((t) => t.id !== primaryTheme.id),
    ];

    if (visiblePhases.length === 0) {
      const pct =
        todaysQuests.length > 0 ? Math.round((completedTodayCount / todaysQuests.length) * 100) : 0;
      const poolXp = todaysQuests.reduce((sum, t) => sum + t.xpReward, 0) || 60;
      return [
        {
          id: activeGoal.id,
          title: activeGoal.title,
          subtitle: activeGoal.category,
          status: pct === 100 ? 'Completed' : 'In Progress',
          xpBadge: `+${poolXp} XP`,
          pct,
          taskSummary: `${completedTodayCount}/${todaysQuests.length} tasks`,
          theme: primaryTheme,
          targetPage: 'checklist' as const,
        },
      ];
    }

    let foundActive = false;
    return visiblePhases.slice(0, 4).map((phase, idx) => {
      const phaseTasks = tasks.filter(
        (t) =>
          !t.isArchived &&
          (t.isPublished || isOwner) &&
          t.dayNumber >= phase.startDay &&
          t.dayNumber <= phase.endDay
      );
      const done = phaseTasks.filter((t) => myCompletedTaskIds.has(t.id)).length;
      const pct = phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0;
      const xpPool = phaseTasks.reduce((sum, t) => sum + t.xpReward, 0) || 80;

      let status = 'Up Next';
      if (phaseTasks.length > 0 && pct === 100) {
        status = 'Completed';
      } else if (!foundActive) {
        status = 'In Progress';
        foundActive = true;
      }

      return {
        id: phase.id,
        title: phase.title,
        subtitle: `${activeGoal.category} · Days ${phase.startDay}–${phase.endDay}`,
        status,
        xpBadge: `+${xpPool} XP`,
        pct,
        taskSummary: phaseTasks.length > 0 ? `${done}/${phaseTasks.length} quests` : 'Milestone ready',
        theme: orderedThemes[idx % orderedThemes.length],
        targetPage: status === 'In Progress' ? ('checklist' as const) : ('goals' as const),
      };
    });
  }, [activeGoal, completedTodayCount, isOwner, myCompletedTaskIds, phases, tasks, todaysQuests]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredProgressCards = useMemo(() => {
    if (!normalizedQuery) return progressCards;
    return progressCards.filter(
      (c) =>
        c.title.toLowerCase().includes(normalizedQuery) ||
        c.subtitle.toLowerCase().includes(normalizedQuery) ||
        c.status.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, progressCards]);

  const filteredTodaysQuests = useMemo(() => {
    if (!normalizedQuery) return todaysQuests;
    return todaysQuests.filter(
      (t) =>
        t.title.toLowerCase().includes(normalizedQuery) ||
        (t.shortDescription || '').toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, todaysQuests]);

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
    <div className="space-y-6">
      {/* 1. REFERENCE-STYLE GREETING TOP BAR */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => setActivePage('avatar')}
            className="shrink-0 cursor-pointer rounded-full ring-[3px] ring-[#E9DFFF] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-[#7651E8]"
            title="Customize your avatar"
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
            <h1 className="font-display text-xl sm:text-2xl font-black text-[#20202A] truncate">
              Hey {firstName}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-[#777783] truncate">
              Keep going, you&apos;re doing great!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeGoal && (
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              aria-label="Invite friend to StudyDuo"
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-[#7651E8] px-3.5 sm:px-4 py-2 text-xs font-extrabold text-white hover:bg-[#6540D6] shadow-[0_6px_16px_-6px_rgba(118,81,232,0.45)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Invite Friend</span>
            </button>
          )}

          {goals.length > 1 && (
            <select
              aria-label="Switch active learning goal"
              value={selectedGoalId || ''}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="rounded-full border border-[#F0EDF5] bg-white px-3.5 py-2 text-xs font-bold text-[#20202A] min-h-[42px] max-w-[175px] shadow-[0_4px_14px_-8px_rgba(118,81,232,0.16)] cursor-pointer"
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
            className="hidden lg:inline-flex relative h-11 w-11 items-center justify-center rounded-full border border-[#F0EDF5] bg-white text-[#20202A] hover:bg-[#E9DFFF]/50 shadow-[0_4px_14px_-8px_rgba(118,81,232,0.18)] transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-[19px] w-[19px]" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-[#7651E8] ring-2 ring-white" />
            )}
          </button>
        </div>
      </div>

      {/* 2. "YOUR PROGRESS TODAY" HEADING + WORKING SEARCH BUTTON */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl sm:text-[36px] font-black tracking-tight text-[#20202A] leading-[1.1]">
              Your Progress Today
            </h2>
            {activeGoal && (
              <p className="mt-1 text-xs sm:text-sm font-medium text-[#777783]">
                {activeGoal.title} · Day {activeDay?.dayNumber ?? 1} of {activeGoal.durationDays}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchOpen((prev) => !prev);
              if (searchOpen) setSearchQuery('');
            }}
            aria-label={searchOpen ? 'Close search' : 'Search lessons and quests'}
            aria-expanded={searchOpen}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${
              searchOpen
                ? 'bg-[#7651E8] text-white'
                : 'bg-[#EFE9FF] text-[#20202A] hover:bg-[#E9DFFF]'
            }`}
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.16 }}
              className="overflow-hidden"
            >
              <div className="relative">
                <Search className="h-4 w-4 text-[#8B8A99] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter milestones or today's tasks..."
                  aria-label="Filter milestones or today's tasks"
                  autoFocus
                  className="w-full min-h-[46px] rounded-full border border-[#E4DAFA] bg-white pl-11 pr-10 text-sm text-[#20202A] shadow-xs focus:border-[#7651E8] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777783] hover:text-[#20202A] cursor-pointer p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact Pastel Daily Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-[22px] bg-white border border-[#F0EDF5] px-4 py-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0C9] text-lg">
              🔥
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#777783]">Streak</p>
              <p className="font-display text-lg font-black text-[#20202A] tabular-nums leading-tight">
                {currentUser.currentStreak}d
              </p>
              <p className="text-[10px] font-medium text-[#777783] truncate">
                {isRestToday ? 'Rest day' : `Best ${currentUser.longestStreak}d`}
              </p>
            </div>
          </div>

          <div className="rounded-[22px] bg-white border border-[#F0EDF5] px-4 py-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E9DFFF] text-lg">
              ⚡
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#777783]">Level {levelInfo.level}</p>
              <p className="font-display text-lg font-black text-[#7651E8] tabular-nums leading-tight">
                {currentUser.totalXp.toLocaleString()} XP
              </p>
              <p className="text-[10px] font-medium text-[#777783] truncate">
                {levelInfo.nextLevelMinXp ? `${levelInfo.xpNeededForNext} to Lv.${levelInfo.level + 1}` : 'Max level'}
              </p>
            </div>
          </div>

          <div className="rounded-[22px] bg-white border border-[#F0EDF5] px-4 py-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E2F5E9] text-lg">
              ⏱️
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#777783]">Study Time</p>
              <p className="font-display text-lg font-black text-[#20202A] tabular-nums leading-tight">
                {todaysStudyMinutes}m
              </p>
              <p className="text-[10px] font-medium text-[#777783] truncate">
                Target {activeGoal?.dailyTargetMinutes ?? 60}m
              </p>
            </div>
          </div>

          <div className="rounded-[22px] bg-white border border-[#F0EDF5] px-4 py-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFE8F0] text-lg">
              ✅
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#777783]">Tasks Done</p>
              <p className="font-display text-lg font-black text-[#20202A] tabular-nums leading-tight">
                {completedTodayCount}/{todaysQuests.length}
              </p>
              <p className="text-[10px] font-bold text-[#1F874D] truncate">
                {todaysQuests.length > 0 && completedTodayCount === todaysQuests.length
                  ? 'All complete!'
                  : '+30 XP bonus'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NO ACTIVE GOAL EMPTY STATE */}
      {!activeGoal ? (
        <div className="space-y-4">
          <EmptyState
            mascot="brain"
            title="Start your first StudyDuo goal"
            description="Create a learning roadmap or join your study partner with an invite code to track daily quests together."
            actionLabel="Create Study Goal"
            onAction={() => setActivePage('goals')}
          />
          <div className="text-center">
            <Button variant="secondary" size="sm" onClick={() => setActivePage('groups')}>
              <UserPlus className="h-4 w-4 text-[#7651E8]" />
              Have an invite code? Join Partner
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* 3. SIGNATURE PASTEL ILLUSTRATED SUBJECT / PROGRESS CARDS (Matches Reference Screenshot) */}
          <section aria-label="Learning progress cards" className="space-y-3">
            {filteredProgressCards.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-sm font-bold text-[#20202A]">No matching learning cards</p>
                <p className="text-xs text-[#777783] mt-1">Try a different search term or clear the filter.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProgressCards.map((card) => (
                  <div
                    key={card.id}
                    style={{ backgroundColor: card.theme.cardBg }}
                    className="sd-pastel-card relative overflow-hidden p-5 flex flex-col justify-between gap-4"
                  >
                    {/* Top Row: Status Pill & Gold Star XP Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <span
                        style={{ color: card.theme.statusText }}
                        className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-extrabold shadow-[0_2px_8px_rgba(32,32,42,0.05)]"
                      >
                        {card.status}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#20202A] shadow-[0_2px_8px_rgba(32,32,42,0.05)] tabular-nums">
                        <Star className="h-3.5 w-3.5 fill-[#FFC857] text-[#FFC857]" />
                        {card.xpBadge}
                      </span>
                    </div>

                    {/* Middle Row: 3D Cartoon Mascot + Title + Thick Progress Bar + Decorative Motif */}
                    <div className="flex items-center gap-3.5 relative">
                      <MascotImage
                        mascot={card.theme.mascot}
                        className="h-20 w-20 sm:h-24 sm:w-24 shrink-0"
                        rounded="rounded-[22px]"
                      />

                      <div className="min-w-0 flex-1 z-10 space-y-1.5">
                        <h3 className="font-display text-lg sm:text-xl font-black text-[#20202A] leading-tight line-clamp-2">
                          {card.title}
                        </h3>
                        <p className="text-xs font-semibold text-[#5C5C6C] truncate">
                          {card.subtitle}
                        </p>

                        <div className="flex items-center gap-2.5 pt-1">
                          <div className="flex-1">
                            <ProgressBar
                              percent={card.pct}
                              color={card.theme.progressFill}
                              trackColor="#FFFFFF"
                              height="h-3"
                            />
                          </div>
                          <span className="text-xs font-extrabold text-[#20202A] tabular-nums shrink-0">
                            {card.pct}%
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:block shrink-0 self-center opacity-90">
                        <SubjectCardMotif themeId={card.theme.id} />
                      </div>
                    </div>

                    {/* Bottom Row: Overlapping Learner Avatars + White Arrow Pill Button */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex -space-x-2">
                          {participants.slice(0, 3).map((member) => (
                            <div
                              key={member.uid}
                              className="rounded-full ring-2 ring-white"
                            >
                              <Avatar
                                name={member.displayName}
                                initials={member.avatarInitials}
                                color={member.avatarColor}
                                avatarConfig={member.avatarConfig}
                                seedKey={member.uid}
                                size="xs"
                              />
                            </div>
                          ))}
                        </div>
                        <span className="inline-flex items-center rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-[#20202A] truncate">
                          {card.taskSummary}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActivePage(card.targetPage)}
                        aria-label={`Open ${card.title}`}
                        className="inline-flex h-10 px-4 items-center justify-center rounded-full bg-white text-[#20202A] hover:bg-[#20202A] hover:text-white shadow-[0_4px_12px_rgba(32,32,42,0.08)] transition-colors cursor-pointer shrink-0"
                      >
                        <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4. TODAY'S TASKS + DUO PROGRESS */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
            {/* TODAY'S TASKS (7 cols) */}
            <Card className="lg:col-span-7" padding="none">
              <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-[#F0EDF5]">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-black text-[#20202A]">Today&apos;s Tasks</h3>
                  <p className="text-xs text-[#777783] truncate">
                    {activeDay ? `Day ${activeDay.dayNumber} · ${activeDay.title}` : 'Daily study checklist'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isOwner && activeDay && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuickTask(null);
                        setQuickTaskTitle('');
                        setQuickTaskDesc('');
                        setQuickTaskMinutes(20);
                        setQuickTaskXp(20);
                        setQuickTaskPriority('medium');
                        setQuickTaskModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-[#7651E8] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#6540D6] cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Task
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActivePage('checklist')}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E9DFFF] px-3 py-1.5 text-xs font-extrabold text-[#7651E8] hover:bg-[#DFD2FF] cursor-pointer whitespace-nowrap transition-colors"
                  >
                    Open All <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {completedBanner && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden border-b border-[#CBEBD7] bg-[#E2F5E9] px-5 py-2.5 text-xs font-extrabold text-[#1F874D] flex items-center justify-between"
                  >
                    <span>{completedBanner.cheer}</span>
                    <span className="tabular-nums">+{completedBanner.xp} XP</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {filteredTodaysQuests.length === 0 ? (
                <div className="p-7 text-center space-y-2.5">
                  <Calendar className="mx-auto h-6 w-6 text-[#7651E8]" />
                  <p className="font-display text-base font-extrabold text-[#20202A]">
                    {normalizedQuery ? 'No matching tasks today' : 'No quests for today yet'}
                  </p>
                  <p className="text-xs text-[#777783]">
                    {normalizedQuery
                      ? 'Try clearing your search filter.'
                      : isOwner
                      ? 'Add tasks in Quest Center to build today’s study checklist.'
                      : 'Your partner will publish today’s study checklist soon.'}
                  </p>
                  {!normalizedQuery && (
                    <div className="pt-1">
                      <Button size="sm" variant="secondary" onClick={() => setActivePage('checklist')}>
                        Open Quest Center
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[#F0EDF5]">
                  {filteredTodaysQuests.map((task, idx) => {
                    const done = myCompletedTaskIds.has(task.id);
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors ${
                          done ? 'bg-[#F4FBF6]' : 'hover:bg-[#FAF8FF]'
                        }`}
                      >
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleQuickComplete(task, idx)}
                          disabled={done}
                          aria-label={done ? `${task.title} completed` : `Complete ${task.title}`}
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 cursor-pointer ${
                            done
                              ? 'border-[#2FB368] bg-[#2FB368] text-white'
                              : 'border-[#D7D0EE] bg-white text-transparent hover:border-[#7651E8]'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </motion.button>

                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F8F5FF] text-base select-none"
                          aria-hidden="true"
                        >
                          {getQuestEmoji(task.title)}
                        </span>

                        <button
                          type="button"
                          onClick={() => setActivePage('checklist')}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <p
                            className={`text-sm font-bold leading-snug truncate ${
                              done ? 'text-[#8B8A99] line-through' : 'text-[#20202A]'
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="text-xs text-[#777783] tabular-nums">
                            {task.estimatedMinutes} min
                            <span aria-hidden="true"> · </span>
                            <span className={done ? 'text-[#1F874D] font-bold' : 'text-[#7651E8] font-bold'}>
                              +{task.xpReward} XP
                            </span>
                          </p>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingQuickTask(task);
                                  setQuickTaskTitle(task.title);
                                  setQuickTaskDesc(task.shortDescription);
                                  setQuickTaskMinutes(task.estimatedMinutes);
                                  setQuickTaskXp(task.xpReward);
                                  setQuickTaskPriority(task.priority);
                                  setQuickTaskModalOpen(true);
                                }}
                                aria-label={`Rename ${task.title}`}
                                className="inline-flex items-center gap-1 rounded-full bg-[#F8F5FF] px-2.5 py-1 text-[11px] font-extrabold text-[#7651E8] hover:bg-[#E9DFFF] transition-colors cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span className="hidden sm:inline">Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickTaskToDelete(task)}
                                aria-label={`Delete ${task.title}`}
                                className="inline-flex items-center gap-1 rounded-full bg-[#FFF0F3] px-2.5 py-1 text-[11px] font-extrabold text-[#C82D4F] hover:bg-[#FFE3E9] transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </>
                          )}
                          <span
                            className={`hidden sm:inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                              done
                                ? 'bg-[#E2F5E9] text-[#1F874D]'
                                : 'bg-[#E9DFFF] text-[#6842DE]'
                            }`}
                          >
                            {done ? 'Done' : 'To Do'}
                          </span>
                        </div>
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
                  <h3 className="font-display text-lg font-black text-[#20202A]">Duo Progress</h3>
                  <p className="text-xs text-[#777783] truncate">
                    {activeGoal.groupName || 'Your study team'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0C9] px-3 py-1 text-xs font-extrabold text-[#B47100] tabular-nums shrink-0">
                  🔥 {duoStreak?.duoStreak ?? activeGoal.groupStreak}d Duo
                </span>
              </div>

              {/* Both Player Avatars */}
              <div className="grid grid-cols-2 gap-3">
                {[selfParticipant, partner].map((member, idx) => {
                  if (!member) {
                    return (
                      <button
                        key="invite-slot"
                        type="button"
                        onClick={() => setActivePage('groups')}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-[22px] border-2 border-dashed border-[#D8C7FF] bg-[#F8F5FF] px-3 py-4 text-center hover:bg-[#E9DFFF]/50 transition-colors cursor-pointer"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#7651E8]">
                          <UserPlus className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-extrabold text-[#7651E8]">Invite Partner</p>
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
                      className={`flex flex-col items-center rounded-[22px] p-3.5 text-center ${
                        idx === 0 ? 'bg-[#F8F5FF]' : 'bg-[#FFF9E9]'
                      }`}
                    >
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
                            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#2FB368] text-white ring-2 ring-white"
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="mt-2 max-w-full truncate text-xs font-extrabold text-[#20202A]">
                        {member.uid === currentUser.uid ? 'You' : member.displayName.split(' ')[0]}
                      </p>
                      <p className="text-xs font-extrabold text-[#7651E8] tabular-nums">
                        {xp.toLocaleString()} XP
                      </p>
                      <p className="text-[11px] font-medium text-[#777783] tabular-nums">
                        Lv.{getLevelInfo(xp).level} · {member.currentStreak}d
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Shared Goal Progress */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#777783]">Shared goal progress</span>
                  <span className="font-extrabold text-[#20202A] tabular-nums">{sharedGoalProgressPct}%</span>
                </div>
                <ProgressBar percent={sharedGoalProgressPct} color="#2FB368" trackColor="#E2F5E9" height="h-3" />
              </div>

              {duoStreak && (
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#F8F5FF] px-3.5 py-2.5 text-xs">
                  <p className="text-[#5C5C6C] font-medium leading-snug">{duoStreak.subtext}</p>
                  {duoStreak.canNudgePartner && (
                    <Button
                      size="sm"
                      variant="primary"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="w-full inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full bg-[#7651E8] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#6540D6] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Share Invite Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage('groups')}
                  className="w-full inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-[#D8C6FF] bg-[#F8F5FF] px-4 py-2 text-xs font-extrabold text-[#7651E8] hover:bg-[#E9DFFF]/70 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Open Duo Room</span>
                </button>
              </div>
            </Card>
          </div>

          {/* 5. WEEKLY ACTIVITY & RECENT ACHIEVEMENTS */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
            {/* Weekly Study Activity (7 cols) */}
            <Card className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-black text-[#20202A]">Weekly Activity</h3>
                  <p className="text-xs text-[#777783] tabular-nums">
                    +{weeklyTotalXp} XP earned over the last 7 days
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('analytics')}
                  className="rounded-full bg-[#F8F5FF] px-3 py-1.5 text-xs font-extrabold text-[#7651E8] hover:bg-[#E9DFFF] cursor-pointer transition-colors"
                >
                  Analytics
                </button>
              </div>

              <div className="flex items-end justify-between gap-2 h-28 pt-2">
                {weeklyActivity.map((day) => {
                  const pct = day.xp > 0 ? Math.max(20, Math.round((day.xp / maxWeeklyXp) * 100)) : 10;
                  return (
                    <div key={day.dateKey} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-bold text-[#777783] tabular-nums">
                        {day.xp > 0 ? day.xp : ''}
                      </span>
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full max-w-[30px] rounded-full transition-all duration-200 ${
                          day.isToday
                            ? 'bg-[#7651E8]'
                            : day.xp > 0
                            ? 'bg-[#A78BFA]'
                            : 'bg-[#F0EDF5]'
                        }`}
                      />
                      <span
                        className={`text-[11px] font-bold ${
                          day.isToday ? 'text-[#7651E8]' : 'text-[#777783]'
                        }`}
                      >
                        {day.shortDay}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Recent Achievements (5 cols) */}
            <div className="lg:col-span-5 rounded-[28px] bg-[#FFE8F0] p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <MascotImage mascot="owl" className="h-14 w-14 shrink-0" rounded="rounded-2xl" />
                  <div>
                    <h3 className="font-display text-lg font-black text-[#20202A]">Achievements</h3>
                    <p className="text-xs font-semibold text-[#8C4563]">
                      {achievements.length} badges unlocked
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('achievements')}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#BE3469] hover:bg-[#20202A] hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  View All
                </button>
              </div>

              {recentAchievements.length === 0 ? (
                <div className="rounded-2xl bg-white/90 p-4 text-xs font-medium text-[#777783]">
                  Finish your first quest to unlock your first achievement medallion!
                </div>
              ) : (
                <div className="space-y-2">
                  {recentAchievements.map(({ unlock, def }) => (
                    <button
                      key={unlock.id}
                      type="button"
                      onClick={() => setActivePage('achievements')}
                      className="flex w-full items-center gap-3 rounded-2xl bg-white/90 px-3.5 py-2.5 text-left hover:bg-white transition-colors cursor-pointer"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0C9] text-lg" aria-hidden="true">
                        {getBadgeEmoji(def!.key)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-extrabold text-[#20202A]">{def!.title}</p>
                        <p className="text-[11px] text-[#777783]">
                          Unlocked {new Date(unlock.unlockedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#BE3469] shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ModalSheet
            open={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            title="Invite Your Friend to StudyDuo"
            subtitle="Copy your dynamic invite link or code so your study partner can join your duo."
            size="lg"
          >
            <SocialShareComponent
              goal={activeGoal}
              inviterName={currentUser.fullName}
              invitations={invitations}
              isOwner={isOwner}
              onCreateInvitation={createInvitation}
              onCancelInvitation={cancelInvitation}
              onToast={showToast}
              compact
            />
          </ModalSheet>

          <ModalSheet
            open={quickTaskModalOpen}
            onClose={() => {
              setQuickTaskModalOpen(false);
              setEditingQuickTask(null);
            }}
            title={editingQuickTask ? 'Rename & Edit Task' : 'Add Task to Today'}
            subtitle={activeDay ? `Day ${activeDay.dayNumber} · ${activeDay.title}` : undefined}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!activeGoal || !activeDay || !quickTaskTitle.trim()) return;
                void saveTask(activeGoal.id, {
                  id: editingQuickTask?.id,
                  dayId: editingQuickTask?.dayId || activeDay.id,
                  dayNumber: editingQuickTask?.dayNumber || activeDay.dayNumber,
                  title: quickTaskTitle.trim(),
                  shortDescription: quickTaskDesc.trim(),
                  detailedInstructions: editingQuickTask?.detailedInstructions || '',
                  learningNotes: editingQuickTask?.learningNotes || '',
                  youtubeUrl: editingQuickTask?.youtubeUrl || '',
                  chatgptUrl: editingQuickTask?.chatgptUrl || '',
                  resourceLinks: editingQuickTask?.resourceLinks || [],
                  estimatedMinutes: quickTaskMinutes,
                  xpReward: quickTaskXp,
                  priority: quickTaskPriority,
                  isPublished: true,
                });
                setQuickTaskModalOpen(false);
                setEditingQuickTask(null);
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="quick-task-title" className="block text-xs font-semibold text-[#242424] mb-1.5">
                  Task title
                </label>
                <input
                  id="quick-task-title"
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  placeholder="Practice 5 Python List Comprehensions"
                  required
                  className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3.5 text-sm text-[#242424] focus:bg-white focus:border-[#7956E8] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="quick-task-desc" className="block text-xs font-semibold text-[#242424] mb-1.5">
                  Short description (optional)
                </label>
                <input
                  id="quick-task-desc"
                  value={quickTaskDesc}
                  onChange={(e) => setQuickTaskDesc(e.target.value)}
                  placeholder="Complete exercises and test edge cases"
                  className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3.5 text-sm text-[#242424] focus:bg-white focus:border-[#7956E8] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="quick-task-min" className="block text-xs font-semibold text-[#242424] mb-1.5">
                    Est. min
                  </label>
                  <input
                    id="quick-task-min"
                    type="number"
                    min={5}
                    max={360}
                    value={quickTaskMinutes}
                    onChange={(e) => setQuickTaskMinutes(Number(e.target.value))}
                    className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3 text-sm font-mono text-[#242424]"
                  />
                </div>
                <div>
                  <label htmlFor="quick-task-xp" className="block text-xs font-semibold text-[#242424] mb-1.5">
                    XP reward
                  </label>
                  <input
                    id="quick-task-xp"
                    type="number"
                    min={5}
                    max={200}
                    value={quickTaskXp}
                    onChange={(e) => setQuickTaskXp(Number(e.target.value))}
                    className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3 text-sm font-mono text-[#242424]"
                  />
                </div>
                <div>
                  <label htmlFor="quick-task-prio" className="block text-xs font-semibold text-[#242424] mb-1.5">
                    Difficulty
                  </label>
                  <select
                    id="quick-task-prio"
                    value={quickTaskPriority}
                    onChange={(e) => setQuickTaskPriority(e.target.value as TaskPriority)}
                    className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-2.5 text-sm text-[#242424]"
                  >
                    <option value="low">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="high">Hard</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setQuickTaskModalOpen(false);
                    setEditingQuickTask(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">{editingQuickTask ? 'Save Task' : 'Add Task'}</Button>
              </div>
            </form>
          </ModalSheet>

          <ConfirmDialog
            open={Boolean(quickTaskToDelete)}
            title="Delete task?"
            description={`Delete "${quickTaskToDelete?.title}" from today's checklist?`}
            confirmLabel="Delete Task"
            onCancel={() => setQuickTaskToDelete(null)}
            onConfirm={() => {
              if (activeGoal && quickTaskToDelete) {
                void deleteTask(activeGoal.id, quickTaskToDelete.dayId, quickTaskToDelete.id);
              }
              setQuickTaskToDelete(null);
            }}
          />
        </>
      )}
    </div>
  );
};
