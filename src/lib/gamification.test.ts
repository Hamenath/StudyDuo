import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToDateKey,
  buildCompletionId,
  buildXpTxId,
  calculateGroupStreak,
  calculateIndividualStreak,
  canCompleteTask,
  canEditOfficialTask,
  canReadJournalEntry,
  computeDailyResult,
  computeDuoStreakStatus,
  computeLeaderboard,
  DEFAULT_XP_PRESETS,
  evaluateAchievements,
  getLevelInfo,
  getSharedDailyScore,
  sanitizeExternalUrl,
} from './gamification';
import type {
  DailyResult,
  Goal,
  JournalEntry,
  Participant,
  Task,
  TaskCompletion,
  XpTransaction,
} from '../types/studyduo';

test('level progression maps XP thresholds accurately from Level 1 to Level 7', () => {
  assert.equal(getLevelInfo(0).level, 1);
  assert.equal(getLevelInfo(0).title, 'Beginner');
  assert.equal(getLevelInfo(150).level, 2);
  assert.equal(getLevelInfo(150).title, 'Explorer');
  assert.equal(getLevelInfo(400).level, 3);
  assert.equal(getLevelInfo(3600).level, 7);
  assert.equal(getLevelInfo(5000).progressPercent, 100);
});

test('individual streak handles consecutive days, date boundaries, and planned rest days', () => {
  const res = calculateIndividualStreak(
    ['2026-11-18', '2026-11-19', '2026-11-21', '2026-11-22'],
    ['2026-11-20'],
    '2026-11-22'
  );
  assert.equal(res.currentStreak, 4);
  assert.equal(res.longestStreak, 4);

  // Without a planned rest day on Nov 20, streak resets to 2 (Nov 21-22)
  const broken = calculateIndividualStreak(
    ['2026-11-18', '2026-11-19', '2026-11-21', '2026-11-22'],
    [],
    '2026-11-22'
  );
  assert.equal(broken.currentStreak, 2);
  assert.equal(broken.longestStreak, 2);
});

test('group streak requires both participants to complete a task on the same day', () => {
  const completions: TaskCompletion[] = [
    { id: 't1_u1', goalId: 'g1', dayId: 'd1', taskId: 't1', userId: 'u1', dateKey: '2026-11-20', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
    { id: 't1_u2', goalId: 'g1', dayId: 'd1', taskId: 't1', userId: 'u2', dateKey: '2026-11-20', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
    { id: 't2_u1', goalId: 'g1', dayId: 'd2', taskId: 't2', userId: 'u1', dateKey: '2026-11-21', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
    { id: 't2_u2', goalId: 'g1', dayId: 'd2', taskId: 't2', userId: 'u2', dateKey: '2026-11-21', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
    { id: 't3_u1', goalId: 'g1', dayId: 'd3', taskId: 't3', userId: 'u1', dateKey: '2026-11-22', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
  ];
  // On Nov 22 only u1 completed so far; group streak stays alive at 2 from Nov 20-21
  const grp = calculateGroupStreak(['u1', 'u2'], completions, [], '2026-11-22');
  assert.equal(grp.groupStreak, 2);
  assert.equal(grp.longestGroupStreak, 2);
});

test('daily result and leaderboard support ties without unfair bonus XP', () => {
  const txs: XpTransaction[] = [
    { id: 'u1_task_t1', userId: 'u1', goalId: 'g1', sourceType: 'task', sourceId: 't1', xpAmount: 40, dateKey: '2026-11-22', label: 'Variables', createdAt: '' },
    { id: 'u2_task_t1', userId: 'u2', goalId: 'g1', sourceType: 'task', sourceId: 't1', xpAmount: 40, dateKey: '2026-11-22', label: 'Variables', createdAt: '' },
  ];
  const daily = computeDailyResult('g1', '2026-11-22', ['u1', 'u2'], txs, true);
  assert.equal(daily.isTie, true);
  assert.deepEqual(daily.winnerIds.sort(), ['u1', 'u2']);

  const participants: Participant[] = [
    { uid: 'u1', goalId: 'g1', role: 'owner', displayName: 'Alex', username: 'alex', avatarColor: '#7956D8', avatarInitials: 'AL', goalXp: 40, completedTasksCount: 1, daysCompleted: 0, currentStreak: 1, longestStreak: 1, joinedAt: '' },
    { uid: 'u2', goalId: 'g1', role: 'collaborator', displayName: 'Maya', username: 'maya', avatarColor: '#38A879', avatarInitials: 'MA', goalXp: 40, completedTasksCount: 1, daysCompleted: 0, currentStreak: 1, longestStreak: 1, joinedAt: '' },
  ];
  const board = computeLeaderboard(participants, txs, 'g1', '2026-11-22', 'today');
  assert.equal(board[0].rank, 1);
  assert.equal(board[1].rank, 1);
  assert.equal(board[0].isTied, true);
  assert.equal(board[0].dailyPoints, 40);
});

test('deterministic completion & XP transaction keys prevent duplicate XP awards', () => {
  assert.equal(buildCompletionId('task_1', 'userA'), 'task_1_userA');
  assert.equal(buildXpTxId('userA', 'task', 'task_1'), 'userA_task_task_1');
  assert.notEqual(buildCompletionId('task_1', 'userA'), buildCompletionId('task_1', 'userB'));
});

test('owner vs collaborator permissions enforce official task ownership and journal privacy', () => {
  const goal: Goal = {
    id: 'g1',
    ownerId: 'userA',
    participantIds: ['userA', 'userB'],
    title: 'Python 60',
    description: '',
    category: 'Programming',
    icon: 'code',
    startDate: '2026-11-01',
    durationDays: 60,
    targetDate: '2026-12-31',
    difficulty: 'Intermediate',
    timezone: 'UTC',
    dailyTargetMinutes: 45,
    maxParticipants: 2,
    groupName: 'Python Duo',
    groupStreak: 2,
    longestGroupStreak: 2,
    restDays: [],
    status: 'active',
    createdAt: '',
    updatedAt: '',
  };
  const draftTask: Task = {
    id: 't1', goalId: 'g1', dayId: 'd1', dayNumber: 1, ownerId: 'userA',
    title: 'Draft Task', shortDescription: '', detailedInstructions: '', learningNotes: '',
    youtubeUrl: '', chatgptUrl: '', resourceLinks: [], estimatedMinutes: 20, xpReward: 20,
    priority: 'medium', order: 0, isPublished: false, isArchived: false, createdAt: '', updatedAt: '',
  };

  assert.equal(canEditOfficialTask(goal, 'userA'), true);
  assert.equal(canEditOfficialTask(goal, 'userB'), false);
  assert.equal(canCompleteTask(goal, draftTask, 'userB'), false);
  assert.equal(canCompleteTask(goal, { ...draftTask, isPublished: true }, 'userB'), true);

  const privateEntry: JournalEntry = {
    id: 'j1', userId: 'userB', goalId: 'g1', sharedWithOwnerId: 'userA',
    isSharedWithOwner: false, title: 'My Notes', date: '2026-11-22', topic: 'Python',
    notes: 'Private reflections', whatILearned: '', questions: '', challenges: '', resources: '',
    createdAt: '', updatedAt: '',
  };
  assert.equal(canReadJournalEntry(privateEntry, 'userB'), true);
  assert.equal(canReadJournalEntry(privateEntry, 'userA'), false);
  assert.equal(canReadJournalEntry({ ...privateEntry, isSharedWithOwner: true }, 'userA'), true);
});

test('URL sanitizer blocks javascript: and data: URIs while permitting https/http', () => {
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(sanitizeExternalUrl('https://docs.python.org/3/'), 'https://docs.python.org/3/');
});

test('achievement evaluation unlocks eligible badges without duplicating existing ones', () => {
  const unlocked = evaluateAchievements({
    completedTasksCount: 1,
    completedDaysCount: 1,
    uniqueActiveDaysCount: 3,
    currentStreak: 3,
    longestStreak: 3,
    completedGoalsCount: 0,
    dailyWinsCount: 1,
    existingKeys: ['first_task'],
  });
  assert.deepEqual(unlocked.sort(), ['first_day', 'streak_3']);
});

test('calendar date arithmetic crosses month and year boundaries cleanly', () => {
  assert.equal(addDaysToDateKey('2026-12-30', 3), '2027-01-02');
  assert.equal(addDaysToDateKey('2026-03-01', -1), '2026-02-28');
});

test('two-account workflow: owner creates 5 Python tasks, partner joins, completions remain independent and leaderboard works with private partner xpTransactions', () => {
  const today = '2026-11-22';
  const goal: Goal = {
    id: 'goal_py',
    ownerId: 'acctA',
    participantIds: ['acctA', 'acctB'],
    title: 'Learn Python in 30 Days',
    description: 'Core Python mastery',
    category: 'Programming',
    icon: 'code',
    startDate: today,
    durationDays: 30,
    targetDate: addDaysToDateKey(today, 29),
    difficulty: 'Beginner',
    timezone: 'UTC',
    dailyTargetMinutes: 60,
    maxParticipants: 2,
    groupName: 'Python Duo',
    groupStreak: 0,
    longestGroupStreak: 0,
    restDays: [],
    status: 'active',
    createdAt: '',
    updatedAt: '',
  };

  // Account A creates 5 tasks and publishes them
  const tasks: Task[] = [10, 20, 20, 40, 20].map((xp, idx) => ({
    id: `task_${idx + 1}`,
    goalId: goal.id,
    dayId: 'day_1',
    dayNumber: 1,
    ownerId: 'acctA',
    title: `Python Task ${idx + 1}`,
    shortDescription: 'Official published task',
    detailedInstructions: '',
    learningNotes: '',
    youtubeUrl: '',
    chatgptUrl: '',
    resourceLinks: [],
    estimatedMinutes: 15,
    xpReward: xp,
    priority: 'medium',
    order: idx,
    isPublished: true,
    isArchived: false,
    createdAt: '',
    updatedAt: '',
  }));

  // Both Account A and B see identical 5 official published tasks
  const visibleToA = tasks.filter((t) => canCompleteTask(goal, t, 'acctA'));
  const visibleToB = tasks.filter((t) => canCompleteTask(goal, t, 'acctB'));
  assert.equal(visibleToA.length, 5);
  assert.equal(visibleToB.length, 5);
  assert.deepEqual(
    visibleToA.map((t) => t.id),
    visibleToB.map((t) => t.id)
  );

  // Account A completes all 5 tasks (110 XP + 30 daily bonus = 140 XP)
  // Account B completes 2 tasks independently (10 + 20 = 30 XP)
  const completionsMap = new Map<string, TaskCompletion>();
  const completeIdempotent = (uid: string, task: Task): boolean => {
    const cid = buildCompletionId(task.id, uid);
    if (completionsMap.has(cid)) return false;
    completionsMap.set(cid, {
      id: cid,
      goalId: goal.id,
      dayId: task.dayId,
      taskId: task.id,
      userId: uid,
      dateKey: today,
      xpAwarded: task.xpReward,
      estimatedMinutes: task.estimatedMinutes,
      completedAt: new Date().toISOString(),
    });
    return true;
  };

  for (const t of tasks) {
    assert.equal(completeIdempotent('acctA', t), true);
  }
  // Duplicate completion by Account A must be rejected
  assert.equal(completeIdempotent('acctA', tasks[0]), false);

  // Completing tasks as A did NOT complete them for B
  assert.equal(completionsMap.has(buildCompletionId(tasks[0].id, 'acctB')), false);

  // Account B completes task 1 and task 2 independently
  assert.equal(completeIdempotent('acctB', tasks[0]), true);
  assert.equal(completeIdempotent('acctB', tasks[1]), true);
  assert.equal(completeIdempotent('acctB', tasks[0]), false);

  const allCompletions = Array.from(completionsMap.values());
  assert.equal(allCompletions.filter((c) => c.userId === 'acctA').length, 5);
  assert.equal(allCompletions.filter((c) => c.userId === 'acctB').length, 2);

  // Simulate Live Firestore where Account B only receives their own xpTransactions,
  // while dailyResults and completions are shared by both members.
  const acctBOnlyTxs: XpTransaction[] = [
    { id: buildXpTxId('acctB', 'task', 'task_1'), userId: 'acctB', goalId: goal.id, sourceType: 'task', sourceId: 'task_1', xpAmount: 10, dateKey: today, label: 'Python Task 1', createdAt: '' },
    { id: buildXpTxId('acctB', 'task', 'task_2'), userId: 'acctB', goalId: goal.id, sourceType: 'task', sourceId: 'task_2', xpAmount: 20, dateKey: today, label: 'Python Task 2', createdAt: '' },
  ];
  const sharedDailyResults: DailyResult[] = [
    {
      dateKey: today,
      goalId: goal.id,
      scores: {
        acctA: 110 + DEFAULT_XP_PRESETS.dailyCompletionBonus,
        acctB: 30,
      },
      winnerIds: ['acctA'],
      isTie: false,
      isClosed: false,
      updatedAt: '',
    },
  ];
  const participants: Participant[] = [
    { uid: 'acctA', goalId: goal.id, role: 'owner', displayName: 'Account A', username: 'accta', avatarColor: '#7956D8', avatarInitials: 'AA', goalXp: 140, completedTasksCount: 5, daysCompleted: 1, currentStreak: 1, longestStreak: 1, joinedAt: '' },
    { uid: 'acctB', goalId: goal.id, role: 'collaborator', displayName: 'Account B', username: 'acctb', avatarColor: '#38A879', avatarInitials: 'AB', goalXp: 30, completedTasksCount: 2, daysCompleted: 0, currentStreak: 1, longestStreak: 1, joinedAt: '' },
  ];

  // From Account B's perspective (only own xpTransactions visible), leaderboard MUST still show Account A's 140 XP accurately!
  const todayBoard = computeLeaderboard(
    participants,
    acctBOnlyTxs,
    goal.id,
    today,
    'today',
    undefined,
    sharedDailyResults,
    allCompletions
  );
  assert.equal(todayBoard[0].uid, 'acctA');
  assert.equal(todayBoard[0].dailyPoints, 140);
  assert.equal(todayBoard[0].rank, 1);
  assert.equal(todayBoard[1].uid, 'acctB');
  assert.equal(todayBoard[1].dailyPoints, 30);
  assert.equal(todayBoard[1].rank, 2);

  // Even if owner later edits task_1.xpReward from 10 -> 60, historical completion keeps 10 XP immutable!
  const editedTask = { ...tasks[0], xpReward: 60 };
  assert.equal(editedTask.xpReward, 60);
  assert.equal(completionsMap.get(buildCompletionId('task_1', 'acctB'))?.xpAwarded, 10);
  assert.equal(
    getSharedDailyScore({
      goalId: goal.id,
      dateKey: today,
      userId: 'acctA',
      dailyResults: sharedDailyResults,
      completions: allCompletions,
      transactions: acctBOnlyTxs,
    }),
    140
  );
});

test('Snapchat-style duo streak status handles all 6 partner states accurately', () => {
  const fixedNow = new Date('2026-11-22T18:00:00Z'); // 6h until UTC midnight
  const baseCompletions: TaskCompletion[] = [
    { id: 't1_u1', goalId: 'g1', dayId: 'd1', taskId: 't1', userId: 'u1', dateKey: '2026-11-21', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
    { id: 't1_u2', goalId: 'g1', dayId: 'd1', taskId: 't1', userId: 'u2', dateKey: '2026-11-21', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
  ];

  // 1. Starting (no history, neither studied today)
  const starting = computeDuoStreakStatus({
    participantIds: ['u1', 'u2'],
    currentUserId: 'u1',
    partnerName: 'Maya',
    completions: [],
    restDays: [],
    timezone: 'UTC',
    now: fixedNow,
  });
  assert.equal(starting.state, 'starting');
  assert.equal(starting.hoursUntilMidnight, 6);

  // 2. At risk (active streak from yesterday, neither studied today)
  const atRisk = computeDuoStreakStatus({
    participantIds: ['u1', 'u2'],
    currentUserId: 'u1',
    partnerName: 'Maya',
    completions: baseCompletions,
    restDays: [],
    timezone: 'UTC',
    now: fixedNow,
  });
  assert.equal(atRisk.state, 'at_risk');
  assert.equal(atRisk.duoStreak, 1);

  // 3. Waiting on partner (u1 studied today, u2 hasn't -> nudge unlocked!)
  const waitingPartner = computeDuoStreakStatus({
    participantIds: ['u1', 'u2'],
    currentUserId: 'u1',
    partnerName: 'Maya',
    completions: [
      ...baseCompletions,
      { id: 't2_u1', goalId: 'g1', dayId: 'd2', taskId: 't2', userId: 'u1', dateKey: '2026-11-22', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
    ],
    restDays: [],
    timezone: 'UTC',
    now: fixedNow,
  });
  assert.equal(waitingPartner.state, 'waiting_on_partner');
  assert.equal(waitingPartner.canNudgePartner, true);
  assert.equal(waitingPartner.myStudiedToday, true);
  assert.equal(waitingPartner.partnerStudiedToday, false);

  // 4. Waiting on you (from u2's perspective when u1 studied today)
  const waitingYou = computeDuoStreakStatus({
    participantIds: ['u1', 'u2'],
    currentUserId: 'u2',
    partnerName: 'Alex',
    completions: [
      ...baseCompletions,
      { id: 't2_u1', goalId: 'g1', dayId: 'd2', taskId: 't2', userId: 'u1', dateKey: '2026-11-22', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
    ],
    restDays: [],
    timezone: 'UTC',
    now: fixedNow,
  });
  assert.equal(waitingYou.state, 'waiting_on_you');
  assert.equal(waitingYou.canNudgePartner, false);

  // 5. Safe (both studied today -> duoStreak increments to 2!)
  const safe = computeDuoStreakStatus({
    participantIds: ['u1', 'u2'],
    currentUserId: 'u1',
    partnerName: 'Maya',
    completions: [
      ...baseCompletions,
      { id: 't2_u1', goalId: 'g1', dayId: 'd2', taskId: 't2', userId: 'u1', dateKey: '2026-11-22', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
      { id: 't2_u2', goalId: 'g1', dayId: 'd2', taskId: 't2', userId: 'u2', dateKey: '2026-11-22', xpAwarded: 20, estimatedMinutes: 20, completedAt: '' },
    ],
    restDays: [],
    timezone: 'UTC',
    now: fixedNow,
  });
  assert.equal(safe.state, 'safe');
  assert.equal(safe.duoStreak, 2);
  assert.equal(safe.myStudiedToday, true);
  assert.equal(safe.partnerStudiedToday, true);

  // 6. Rest day freeze
  const restDay = computeDuoStreakStatus({
    participantIds: ['u1', 'u2'],
    currentUserId: 'u1',
    partnerName: 'Maya',
    completions: baseCompletions,
    restDays: ['2026-11-22'],
    timezone: 'UTC',
    now: fixedNow,
  });
  assert.equal(restDay.state, 'rest_day');
});

