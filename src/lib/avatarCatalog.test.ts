import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVATAR_CATALOG,
  AVATAR_CATEGORY_META,
  canUserModifyAvatar,
  DEFAULT_AVATAR_CONFIG,
  getDefaultAvatarConfig,
  getUnlockedCosmeticSummary,
  sanitizeAvatarConfig,
  validateAvatarConfigOwnership,
  type AvatarConfig,
  type AvatarProgressContext,
} from './avatarCatalog.ts';
import { computeLeaderboard } from './gamification.ts';
import type { Participant } from '../types/studyduo.ts';

describe('Avatar Customization Catalog & Ownership Validation', () => {
  it('covers all 12 customization categories with starter items in each', () => {
    assert.equal(AVATAR_CATEGORY_META.length, 12);
    for (const meta of AVATAR_CATEGORY_META) {
      const items = AVATAR_CATALOG.filter((i) => i.category === meta.key);
      assert.ok(items.length >= 2, `Expected multiple items in ${meta.key}`);
      assert.ok(
        items.some((i) => i.unlock.type === 'starter'),
        `Expected at least one starter item in ${meta.key}`
      );
    }
  });

  it('allows a Level 1 / 0-task user to equip starter items and rejects locked cosmetics', () => {
    const rookieProgress: AvatarProgressContext = {
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      completedTasksCount: 0,
      unlockedAchievementKeys: [],
    };

    const starterRes = validateAvatarConfigOwnership(DEFAULT_AVATAR_CONFIG, rookieProgress);
    assert.equal(starterRes.valid, true);
    assert.equal(starterRes.lockedItems.length, 0);

    const hackedConfig: AvatarConfig = {
      ...DEFAULT_AVATAR_CONFIG,
      hat: 'golden_crown', // requires study_champion
      frame: 'champion_halo', // requires level 6
      outfit: 'champion_cape', // requires level 5
    };
    const rejectedRes = validateAvatarConfigOwnership(hackedConfig, rookieProgress);
    assert.equal(rejectedRes.valid, false);
    assert.equal(rejectedRes.lockedItems.length, 3);
    assert.equal(rejectedRes.sanitizedConfig.hat, DEFAULT_AVATAR_CONFIG.hat);
    assert.equal(rejectedRes.sanitizedConfig.frame, DEFAULT_AVATAR_CONFIG.frame);
    assert.equal(rejectedRes.sanitizedConfig.outfit, DEFAULT_AVATAR_CONFIG.outfit);
  });

  it('unlocks progression cosmetics strictly when real level, streak, task, and achievement criteria are met', () => {
    const seasonedProgress: AvatarProgressContext = {
      level: 4,
      currentStreak: 7,
      longestStreak: 7,
      completedTasksCount: 25,
      unlockedAchievementKeys: ['first_task', 'first_day', 'streak_7', 'study_champion'],
    };

    const config: AvatarConfig = {
      ...DEFAULT_AVATAR_CONFIG,
      faceStyle: 'radiant_joy', // level 4
      hairStyle: 'spiky_hero', // 25 tasks
      hairColor: 'arctic_cyan', // 7-day streak
      eyeStyle: 'sparkle_eyes', // streak_7 achievement
      hat: 'golden_crown', // study_champion achievement
      frame: 'gold_crest', // level 4
    };

    const res = validateAvatarConfigOwnership(config, seasonedProgress);
    assert.equal(res.valid, true);
    assert.equal(res.lockedItems.length, 0);

    const summary = getUnlockedCosmeticSummary(seasonedProgress);
    assert.ok(summary.unlockedCount > 35 && summary.unlockedCount < summary.totalCount);
  });

  it('gracefully migrates existing users without avatarConfig using deterministic defaults', () => {
    const a1 = sanitizeAvatarConfig(undefined, 'user_alex');
    const a2 = sanitizeAvatarConfig(null, 'user_alex');
    assert.deepEqual(a1, a2);
    assert.deepEqual(a1, getDefaultAvatarConfig('user_alex'));

    const partial = sanitizeAvatarConfig({ hairStyle: 'wavy_bob', hat: 'nonexistent_item' }, 'user_alex');
    assert.equal(partial.hairStyle, 'wavy_bob');
    assert.equal(partial.hat, a1.hat);
  });

  it('enforces self-only avatar modification and guarantees cosmetics do not affect leaderboard scores', () => {
    assert.equal(canUserModifyAvatar('user_a', 'user_a'), true);
    assert.equal(canUserModifyAvatar('user_a', 'user_b'), false);
    assert.equal(canUserModifyAvatar(undefined, 'user_a'), false);

    const participants: Participant[] = [
      {
        uid: 'user_a',
        goalId: 'g1',
        role: 'owner',
        displayName: 'Alex',
        username: 'alex',
        avatarColor: '#7956E8',
        avatarInitials: 'AL',
        avatarConfig: { ...DEFAULT_AVATAR_CONFIG, hat: 'golden_crown', frame: 'champion_halo' },
        goalXp: 200,
        completedTasksCount: 5,
        daysCompleted: 1,
        currentStreak: 3,
        longestStreak: 3,
        joinedAt: '2026-11-20T00:00:00Z',
      },
      {
        uid: 'user_b',
        goalId: 'g1',
        role: 'collaborator',
        displayName: 'Maya',
        username: 'maya',
        avatarColor: '#38B982',
        avatarInitials: 'MA',
        avatarConfig: DEFAULT_AVATAR_CONFIG,
        goalXp: 200,
        completedTasksCount: 5,
        daysCompleted: 1,
        currentStreak: 3,
        longestStreak: 3,
        joinedAt: '2026-11-20T00:00:00Z',
      },
    ];

    const board = computeLeaderboard(participants, [], 'g1', '2026-11-22', 'overall', {
      user_a: 400,
      user_b: 400,
    });
    assert.equal(board[0].points, 400);
    assert.equal(board[1].points, 400);
    assert.equal(board[0].isTied, true);
    assert.equal(board[1].isTied, true);
    assert.equal(board[0].avatarConfig?.hat, 'golden_crown');
  });
});
