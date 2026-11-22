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
  computeLeaderboard,
  evaluateAchievements,
  getLevelInfo,
  sanitizeExternalUrl,
} from './gamification';
import type { Goal, JournalEntry, Participant, Task, TaskCompletion, XpTransaction } from '../types/studyduo';

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
