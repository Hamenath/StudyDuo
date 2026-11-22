import type {
  AchievementDefinition,
  DailyResult,
  Goal,
  JournalEntry,
  Participant,
  Task,
  TaskCompletion,
  XpTransaction,
} from '../types/studyduo';

export interface LevelThreshold {
  level: number;
  title: string;
  minXp: number;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, title: 'Beginner', minXp: 0 },
  { level: 2, title: 'Explorer', minXp: 150 },
  { level: 3, title: 'Learner', minXp: 400 },
  { level: 4, title: 'Achiever', minXp: 800 },
  { level: 5, title: 'Knowledge Seeker', minXp: 1400 },
  { level: 6, title: 'Expert', minXp: 2300 },
  { level: 7, title: 'Master', minXp: 3600 },
];

export const DEFAULT_XP_PRESETS = {
  small: 10,
  normal: 20,
  difficult: 40,
  major: 60,
  dailyCompletionBonus: 30,
  weeklyMilestoneBonus: 100,
} as const;

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    key: 'first_task',
    title: 'First Task',
    description: 'Complete your very first study task.',
    category: 'milestone',
    targetValue: 1,
  },
  {
    key: 'first_day',
    title: 'First Learning Day',
    description: 'Finish every published task in a daily checklist.',
    category: 'milestone',
    targetValue: 1,
  },
  {
    key: 'streak_3',
    title: 'Three-Day Streak',
    description: 'Maintain an active study streak for 3 consecutive days.',
    category: 'streak',
    targetValue: 3,
  },
  {
    key: 'streak_7',
    title: 'Seven-Day Streak',
    description: 'Study consistently for 7 consecutive days.',
    category: 'streak',
    targetValue: 7,
  },
  {
    key: 'ten_day_challenge',
    title: 'Ten-Day Challenge',
    description: 'Complete tasks across 10 unique study days.',
    category: 'consistency',
    targetValue: 10,
  },
  {
    key: 'tasks_50',
    title: '50 Tasks Completed',
    description: 'Check off 50 total learning tasks across your goals.',
    category: 'milestone',
    targetValue: 50,
  },
  {
    key: 'tasks_100',
    title: '100 Tasks Completed',
    description: 'Reach 100 completed study tasks.',
    category: 'milestone',
    targetValue: 100,
  },
  {
    key: 'perfect_week',
    title: 'Perfect Week',
    description: 'Complete at least one task on all 7 days of a week.',
    category: 'consistency',
    targetValue: 7,
  },
  {
    key: 'goal_completed',
    title: 'Goal Completed',
    description: 'Reach 100% completion on a full learning goal.',
    category: 'milestone',
    targetValue: 1,
  },
  {
    key: 'study_champion',
    title: 'Study Champion',
    description: 'Finish in first place on the daily leaderboard 3 times.',
    category: 'duo',
    targetValue: 3,
  },
];

export interface LevelProgressInfo {
  level: number;
  title: string;
  currentXp: number;
  currentLevelMinXp: number;
  nextLevelMinXp: number | null;
  xpIntoLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
}

export function getLevelInfo(totalXp: number): LevelProgressInfo {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let current = LEVEL_THRESHOLDS[0];
  let next: LevelThreshold | null = null;

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (safeXp >= LEVEL_THRESHOLDS[i].minXp) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] ?? null;
    }
  }

  if (!next) {
    return {
      level: current.level,
      title: current.title,
      currentXp: safeXp,
      currentLevelMinXp: current.minXp,
      nextLevelMinXp: null,
      xpIntoLevel: safeXp - current.minXp,
      xpNeededForNext: 0,
      progressPercent: 100,
    };
  }

  const span = next.minXp - current.minXp;
  const into = safeXp - current.minXp;
  return {
    level: current.level,
    title: current.title,
    currentXp: safeXp,
    currentLevelMinXp: current.minXp,
    nextLevelMinXp: next.minXp,
    xpIntoLevel: into,
    xpNeededForNext: next.minXp - safeXp,
    progressPercent: Math.min(100, Math.max(0, Math.round((into / span) * 100))),
  };
}

/**
 * Formats a Date into YYYY-MM-DD in the specified IANA timezone without UTC drift.
 */
export function getDateKeyInTimezone(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Calendar arithmetic directly on YYYY-MM-DD strings (immune to DST and timezone offset shifts).
 */
export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d + deltaDays);
  const next = new Date(utc);
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function diffCalendarDays(earlierKey: string, laterKey: string): number {
  const [y1, m1, d1] = earlierKey.split('-').map(Number);
  const [y2, m2, d2] = laterKey.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}

/**
 * Calculates individual current & longest streak respecting planned rest days
 * and calendar dates in the goal's timezone.
 */
export function calculateIndividualStreak(
  activeDateKeys: string[],
  restDayKeys: string[],
  todayKey: string
): { currentStreak: number; longestStreak: number } {
  const activeSet = new Set(activeDateKeys);
  const restSet = new Set(restDayKeys);

  if (activeSet.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Compute current streak walking backwards from todayKey.
  // If user hasn't studied today yet, start checking from yesterday so active streaks don't drop mid-day.
  let cursor = activeSet.has(todayKey) ? todayKey : addDaysToDateKey(todayKey, -1);
  let currentStreak = 0;

  // Walk backwards at most 400 days
  for (let i = 0; i < 400; i++) {
    if (activeSet.has(cursor)) {
      currentStreak += 1;
      cursor = addDaysToDateKey(cursor, -1);
    } else if (restSet.has(cursor)) {
      // Planned rest day bridges streak without breaking or incrementing
      cursor = addDaysToDateKey(cursor, -1);
    } else {
      break;
    }
  }

  // Compute longest streak across sorted unique active days
  const sorted = Array.from(activeSet).sort();
  let longestStreak = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gap = diffCalendarDays(prev, curr);

    if (gap === 1) {
      run += 1;
    } else if (gap > 1) {
      // Check if every day between prev and curr is a planned rest day
      let allRest = true;
      for (let step = 1; step < gap; step++) {
        if (!restSet.has(addDaysToDateKey(prev, step))) {
          allRest = false;
          break;
        }
      }
      run = allRest ? run + 1 : 1;
    }

    if (run > longestStreak) {
      longestStreak = run;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  };
}

/**
 * Group streak: every participant completed at least 1 task on the same active study day.
 */
export function calculateGroupStreak(
  participantIds: string[],
  completions: TaskCompletion[],
  restDayKeys: string[],
  todayKey: string
): { groupStreak: number; longestGroupStreak: number } {
  if (participantIds.length < 2) {
    return { groupStreak: 0, longestGroupStreak: 0 };
  }

  const datesByUser = new Map<string, Set<string>>();
  for (const uid of participantIds) {
    datesByUser.set(uid, new Set());
  }
  for (const comp of completions) {
    datesByUser.get(comp.userId)?.add(comp.dateKey);
  }

  const firstSet = datesByUser.get(participantIds[0]) ?? new Set<string>();
  const sharedDates: string[] = [];
  for (const dateKey of firstSet) {
    const everyoneActive = participantIds.every((uid) => datesByUser.get(uid)?.has(dateKey));
    if (everyoneActive) {
      sharedDates.push(dateKey);
    }
  }

  const { currentStreak, longestStreak } = calculateIndividualStreak(sharedDates, restDayKeys, todayKey);
  return { groupStreak: currentStreak, longestGroupStreak: longestStreak };
}

export type DuoStreakState =
  | 'safe'
  | 'waiting_on_partner'
  | 'waiting_on_you'
  | 'at_risk'
  | 'rest_day'
  | 'starting';

export interface DuoStreakStatus {
  state: DuoStreakState;
  duoStreak: number;
  myStudiedToday: boolean;
  partnerStudiedToday: boolean;
  hasPartner: boolean;
  hoursUntilMidnight: number;
  headline: string;
  subtext: string;
  canNudgePartner: boolean;
}

export function getHoursUntilMidnightInTimezone(now: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hourVal = Number(parts.find((p) => p.type === 'hour')?.value ?? '12') % 24;
    const minVal = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    const remainingMinutes = Math.max(1, 24 * 60 - (hourVal * 60 + minVal));
    return Math.max(1, Math.min(24, Math.ceil(remainingMinutes / 60)));
  } catch {
    const remainingMinutes = Math.max(1, 24 * 60 - (now.getUTCHours() * 60 + now.getUTCMinutes()));
    return Math.max(1, Math.min(24, Math.ceil(remainingMinutes / 60)));
  }
}

/**
 * Snapchat-style Duo Streak status engine for both study partners.
 * Tracks whether both sides lit today's flame, countdown hours to midnight,
 * rest-day protection, and when a friendly partner nudge is appropriate.
 */
export function computeDuoStreakStatus(params: {
  participantIds: string[];
  currentUserId: string;
  partnerName?: string;
  completions: TaskCompletion[];
  restDays: string[];
  timezone: string;
  groupStreak?: number;
  now?: Date;
}): DuoStreakStatus {
  const now = params.now ?? new Date();
  const todayKey = getDateKeyInTimezone(now, params.timezone);
  const hoursUntilMidnight = getHoursUntilMidnightInTimezone(now, params.timezone);
  const partnerLabel = params.partnerName?.trim() || 'your partner';

  const partnerIds = params.participantIds.filter((uid) => uid !== params.currentUserId);
  const hasPartner = partnerIds.length > 0;
  const isRestDay = params.restDays.includes(todayKey);

  const myStudiedToday = params.completions.some(
    (c) => c.userId === params.currentUserId && c.dateKey === todayKey
  );
  const partnerStudiedToday =
    hasPartner &&
    partnerIds.every((pid) =>
      params.completions.some((c) => c.userId === pid && c.dateKey === todayKey)
    );

  const computed = calculateGroupStreak(
    params.participantIds,
    params.completions,
    params.restDays,
    todayKey
  );
  const duoStreak = Math.max(computed.groupStreak, params.groupStreak ?? 0);

  if (isRestDay) {
    return {
      state: 'rest_day',
      duoStreak,
      myStudiedToday,
      partnerStudiedToday,
      hasPartner,
      hoursUntilMidnight,
      headline: 'Rest day freeze active',
      subtext: 'Your duo streak is safely paused today — resume tomorrow to keep building.',
      canNudgePartner: false,
    };
  }

  if (!hasPartner) {
    return myStudiedToday
      ? {
          state: 'safe',
          duoStreak: 0,
          myStudiedToday: true,
          partnerStudiedToday: false,
          hasPartner: false,
          hoursUntilMidnight,
          headline: 'Your flame is lit today',
          subtext: 'Invite a study partner to start a shared Duo Flame together.',
          canNudgePartner: false,
        }
      : {
          state: 'starting',
          duoStreak: 0,
          myStudiedToday: false,
          partnerStudiedToday: false,
          hasPartner: false,
          hoursUntilMidnight,
          headline: 'Ignite your daily streak',
          subtext: 'Finish 1 study task today to light your flame.',
          canNudgePartner: false,
        };
  }

  if (myStudiedToday && partnerStudiedToday) {
    const activeCount = Math.max(1, duoStreak);
    return {
      state: 'safe',
      duoStreak: activeCount,
      myStudiedToday: true,
      partnerStudiedToday: true,
      hasPartner: true,
      hoursUntilMidnight,
      headline: `Day ${activeCount} Duo Flame safe!`,
      subtext: `Both you and ${partnerLabel} studied today. Come back tomorrow to keep it burning.`,
      canNudgePartner: false,
    };
  }

  if (myStudiedToday && !partnerStudiedToday) {
    return {
      state: 'waiting_on_partner',
      duoStreak,
      myStudiedToday: true,
      partnerStudiedToday: false,
      hasPartner: true,
      hoursUntilMidnight,
      headline: `Waiting on ${partnerLabel}`,
      subtext: `Your side is lit! ${partnerLabel} has ${hoursUntilMidnight}h left today to keep your Duo Flame alive.`,
      canNudgePartner: true,
    };
  }

  if (!myStudiedToday && partnerStudiedToday) {
    return {
      state: 'waiting_on_you',
      duoStreak,
      myStudiedToday: false,
      partnerStudiedToday: true,
      hasPartner: true,
      hoursUntilMidnight,
      headline: `${partnerLabel} lit their side!`,
      subtext: `Complete 1 task in the next ${hoursUntilMidnight}h to keep your Duo Flame burning.`,
      canNudgePartner: false,
    };
  }

  if (duoStreak > 0) {
    return {
      state: 'at_risk',
      duoStreak,
      myStudiedToday: false,
      partnerStudiedToday: false,
      hasPartner: true,
      hoursUntilMidnight,
      headline: `${duoStreak}-day Duo Flame needs a spark`,
      subtext: `${hoursUntilMidnight}h left today — complete 1 task to light your side first.`,
      canNudgePartner: false,
    };
  }

  return {
    state: 'starting',
    duoStreak: 0,
    myStudiedToday: false,
    partnerStudiedToday: false,
    hasPartner: true,
    hoursUntilMidnight,
    headline: 'Start your Duo Flame',
    subtext: `Both you and ${partnerLabel} need 1 task today to ignite Day 1.`,
    canNudgePartner: false,
  };
}

/**
 * Deterministic IDs for idempotency (prevents duplicate completion & duplicate XP awards).
 */
export function buildCompletionId(taskId: string, userId: string): string {
  return `${taskId}_${userId}`;
}

export function buildXpTxId(
  userId: string,
  sourceType: XpTransaction['sourceType'],
  sourceId: string
): string {
  return `${userId}_${sourceType}_${sourceId}`;
}

/**
 * Returns a participant's daily XP for a given dateKey using shared goal data
 * (dailyResults + completions + personal xpTransactions) so partner scores are always accurate
 * even when partner xpTransactions remain private in Firestore.
 */
export function getSharedDailyScore(params: {
  goalId: string;
  dateKey: string;
  userId: string;
  dailyResults?: DailyResult[];
  completions?: TaskCompletion[];
  transactions?: XpTransaction[];
}): number {
  const dr = params.dailyResults?.find(
    (d) => d.goalId === params.goalId && d.dateKey === params.dateKey
  );
  const drScore = dr?.scores?.[params.userId] ?? 0;

  let txScore = 0;
  if (params.transactions) {
    for (const tx of params.transactions) {
      if (tx.goalId === params.goalId && tx.dateKey === params.dateKey && tx.userId === params.userId) {
        txScore += tx.xpAmount;
      }
    }
  }

  let compScore = 0;
  if (params.completions) {
    for (const comp of params.completions) {
      if (comp.goalId === params.goalId && comp.dateKey === params.dateKey && comp.userId === params.userId) {
        compScore += comp.xpAwarded;
      }
    }
  }

  return Math.max(drScore, txScore, compScore);
}

/**
 * Computes daily scores and winner(s) with tie support and zero bonus XP for winning.
 */
export function computeDailyResult(
  goalId: string,
  dateKey: string,
  participantIds: string[],
  transactions: XpTransaction[],
  isClosed = false
): DailyResult {
  const scores: Record<string, number> = {};
  for (const uid of participantIds) {
    scores[uid] = 0;
  }

  for (const tx of transactions) {
    if (tx.goalId === goalId && tx.dateKey === dateKey) {
      scores[tx.userId] = (scores[tx.userId] ?? 0) + tx.xpAmount;
    }
  }

  let maxScore = 0;
  for (const uid of Object.keys(scores)) {
    if (scores[uid] > maxScore) {
      maxScore = scores[uid];
    }
  }

  const winnerIds =
    maxScore > 0
      ? Object.keys(scores).filter((uid) => scores[uid] === maxScore)
      : [];

  return {
    dateKey,
    goalId,
    scores,
    winnerIds,
    isTie: winnerIds.length > 1,
    isClosed,
    updatedAt: new Date().toISOString(),
  };
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  username: string;
  avatarColor: string;
  avatarInitials: string;
  role: 'owner' | 'collaborator';
  points: number;
  dailyPoints: number;
  weeklyPoints: number;
  totalXp: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  rank: number;
  isTied: boolean;
}

export function computeLeaderboard(
  participants: Participant[],
  transactions: XpTransaction[],
  goalId: string,
  todayKey: string,
  tab: 'today' | 'week' | 'overall',
  userTotalXpMap?: Record<string, number>,
  dailyResults?: DailyResult[],
  completions?: TaskCompletion[]
): LeaderboardEntry[] {
  const weekCutoff = addDaysToDateKey(todayKey, -6);

  const raw = participants.map((p) => {
    let txDaily = 0;
    let txWeekly = 0;
    let goalPoints = 0;

    for (const tx of transactions) {
      if (tx.goalId !== goalId || tx.userId !== p.uid) continue;
      goalPoints += tx.xpAmount;
      if (tx.dateKey === todayKey) {
        txDaily += tx.xpAmount;
      }
      if (tx.dateKey >= weekCutoff && tx.dateKey <= todayKey) {
        txWeekly += tx.xpAmount;
      }
    }

    let drDaily = 0;
    let drWeekly = 0;
    if (dailyResults) {
      for (const dr of dailyResults) {
        if (dr.goalId !== goalId) continue;
        const val = dr.scores[p.uid] ?? 0;
        if (dr.dateKey === todayKey) {
          drDaily += val;
        }
        if (dr.dateKey >= weekCutoff && dr.dateKey <= todayKey) {
          drWeekly += val;
        }
      }
    }

    let compDaily = 0;
    let compWeekly = 0;
    if (completions) {
      for (const comp of completions) {
        if (comp.goalId !== goalId || comp.userId !== p.uid) continue;
        if (comp.dateKey === todayKey) {
          compDaily += comp.xpAwarded;
        }
        if (comp.dateKey >= weekCutoff && comp.dateKey <= todayKey) {
          compWeekly += comp.xpAwarded;
        }
      }
    }

    const dailyPoints = Math.max(txDaily, drDaily, compDaily);
    const weeklyPoints = Math.max(txWeekly, drWeekly, compWeekly);
    const totalXp = userTotalXpMap?.[p.uid] ?? Math.max(p.goalXp, goalPoints, weeklyPoints);
    const levelInfo = getLevelInfo(totalXp);
    const points =
      tab === 'today' ? dailyPoints : tab === 'week' ? weeklyPoints : totalXp;

    return {
      uid: p.uid,
      displayName: p.displayName,
      username: p.username,
      avatarColor: p.avatarColor,
      avatarInitials: p.avatarInitials,
      role: p.role,
      points,
      dailyPoints,
      weeklyPoints,
      totalXp,
      level: levelInfo.level,
      levelTitle: levelInfo.title,
      currentStreak: p.currentStreak,
      rank: 1,
      isTied: false,
    };
  });

  raw.sort((a, b) => b.points - a.points || b.totalXp - a.totalXp || a.displayName.localeCompare(b.displayName));

  for (let i = 0; i < raw.length; i++) {
    if (i > 0 && raw[i].points === raw[i - 1].points) {
      raw[i].rank = raw[i - 1].rank;
      raw[i].isTied = true;
      raw[i - 1].isTied = true;
    } else {
      raw[i].rank = i + 1;
    }
  }

  return raw;
}

export function evaluateAchievements(params: {
  completedTasksCount: number;
  completedDaysCount: number;
  uniqueActiveDaysCount: number;
  currentStreak: number;
  longestStreak: number;
  completedGoalsCount: number;
  dailyWinsCount: number;
  existingKeys: string[];
}): string[] {
  const existing = new Set(params.existingKeys);
  const newlyUnlocked: string[] = [];

  const checks: Array<[string, boolean]> = [
    ['first_task', params.completedTasksCount >= 1],
    ['first_day', params.completedDaysCount >= 1],
    ['streak_3', Math.max(params.currentStreak, params.longestStreak) >= 3],
    ['streak_7', Math.max(params.currentStreak, params.longestStreak) >= 7],
    ['ten_day_challenge', params.uniqueActiveDaysCount >= 10],
    ['tasks_50', params.completedTasksCount >= 50],
    ['tasks_100', params.completedTasksCount >= 100],
    ['perfect_week', Math.max(params.currentStreak, params.longestStreak) >= 7],
    ['goal_completed', params.completedGoalsCount >= 1],
    ['study_champion', params.dailyWinsCount >= 3],
  ];

  for (const [key, met] of checks) {
    if (met && !existing.has(key)) {
      newlyUnlocked.push(key);
    }
  }

  return newlyUnlocked;
}

// ==================== PERMISSION GUARDS ====================

export function canManageGoal(goal: Goal | undefined, userId: string | undefined): boolean {
  if (!goal || !userId) return false;
  return goal.ownerId === userId;
}

export function canEditOfficialTask(goal: Goal | undefined, userId: string | undefined): boolean {
  return canManageGoal(goal, userId);
}

export function canCompleteTask(
  goal: Goal | undefined,
  task: Task | undefined,
  userId: string | undefined
): boolean {
  if (!goal || !task || !userId) return false;
  if (!goal.participantIds.includes(userId)) return false;
  if (task.isArchived) return false;
  if (!task.isPublished && goal.ownerId !== userId) return false;
  return true;
}

export function canReadJournalEntry(entry: JournalEntry, userId: string): boolean {
  if (entry.userId === userId) return true;
  return entry.isSharedWithOwner && entry.sharedWithOwnerId === userId;
}

// ==================== SAFE URL & INVITE HELPERS ====================

export function sanitizeExternalUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function generateInviteCode(prefix = 'DUO'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part = '';
  for (let i = 0; i < 6; i++) {
    part += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${part}`;
}

export function getGreetingByHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
