export type AvatarCategory =
  | 'skinTone'
  | 'faceStyle'
  | 'hairStyle'
  | 'hairColor'
  | 'eyeStyle'
  | 'outfit'
  | 'outfitColor'
  | 'hat'
  | 'glasses'
  | 'accessory'
  | 'background'
  | 'frame';

export type CosmeticRarity = 'Starter' | 'Rare' | 'Epic' | 'Legend';

export interface AvatarConfig {
  skinTone: string;
  faceStyle: string;
  hairStyle: string;
  hairColor: string;
  eyeStyle: string;
  outfit: string;
  outfitColor: string;
  hat: string;
  glasses: string;
  accessory: string;
  background: string;
  frame: string;
}

export interface CosmeticUnlockCondition {
  type: 'starter' | 'level' | 'achievement' | 'streak' | 'tasks';
  value?: number | string;
  label: string;
}

export interface AvatarCosmeticItem {
  id: string;
  category: AvatarCategory;
  label: string;
  rarity: CosmeticRarity;
  swatch?: string;
  accentSwatch?: string;
  unlock: CosmeticUnlockCondition;
}

export interface AvatarProgressContext {
  level: number;
  currentStreak: number;
  longestStreak: number;
  completedTasksCount: number;
  unlockedAchievementKeys: string[];
}

export const AVATAR_CATEGORY_META: Array<{
  key: AvatarCategory;
  label: string;
  shortLabel: string;
  optional?: boolean;
}> = [
  { key: 'skinTone', label: 'Skin Tone', shortLabel: 'Skin' },
  { key: 'faceStyle', label: 'Face Expression', shortLabel: 'Face' },
  { key: 'hairStyle', label: 'Hairstyle', shortLabel: 'Hair' },
  { key: 'hairColor', label: 'Hair Color', shortLabel: 'Hair Color' },
  { key: 'eyeStyle', label: 'Eye Style', shortLabel: 'Eyes' },
  { key: 'outfit', label: 'Outfit', shortLabel: 'Outfit' },
  { key: 'outfitColor', label: 'Outfit Color', shortLabel: 'Colors' },
  { key: 'hat', label: 'Headwear', shortLabel: 'Hats', optional: true },
  { key: 'glasses', label: 'Eyewear', shortLabel: 'Glasses', optional: true },
  { key: 'accessory', label: 'Accessories', shortLabel: 'Extras', optional: true },
  { key: 'background', label: 'Backdrop', shortLabel: 'Backdrop' },
  { key: 'frame', label: 'Avatar Frame', shortLabel: 'Frames', optional: true },
];

export const AVATAR_CONFIG_KEYS: AvatarCategory[] = [
  'skinTone',
  'faceStyle',
  'hairStyle',
  'hairColor',
  'eyeStyle',
  'outfit',
  'outfitColor',
  'hat',
  'glasses',
  'accessory',
  'background',
  'frame',
];

export const AVATAR_CATALOG: AvatarCosmeticItem[] = [
  // 1. Skin Tones (all starter)
  { id: 'porcelain', category: 'skinTone', label: 'Porcelain', rarity: 'Starter', swatch: '#FCE5D8', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'warm_ivory', category: 'skinTone', label: 'Warm Ivory', rarity: 'Starter', swatch: '#F5CFAF', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'golden_sand', category: 'skinTone', label: 'Golden Sand', rarity: 'Starter', swatch: '#E2B086', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'caramel', category: 'skinTone', label: 'Caramel', rarity: 'Starter', swatch: '#C68A5C', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'chestnut', category: 'skinTone', label: 'Chestnut', rarity: 'Starter', swatch: '#965E3D', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'espresso', category: 'skinTone', label: 'Espresso', rarity: 'Starter', swatch: '#6A3E27', unlock: { type: 'starter', label: 'Starter collection' } },

  // 2. Face Styles
  { id: 'warm_smile', category: 'faceStyle', label: 'Warm Smile', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'cheerful', category: 'faceStyle', label: 'Cheerful Grin', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'focused', category: 'faceStyle', label: 'Focused Mode', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'confident', category: 'faceStyle', label: 'Confident Smirk', rarity: 'Rare', unlock: { type: 'achievement', value: 'first_task', label: 'Unlock "First Task" achievement' } },
  { id: 'playful_wink', category: 'faceStyle', label: 'Playful Wink', rarity: 'Rare', unlock: { type: 'streak', value: 3, label: 'Reach a 3-day study streak' } },
  { id: 'radiant_joy', category: 'faceStyle', label: 'Radiant Joy', rarity: 'Epic', unlock: { type: 'level', value: 4, label: 'Reach Level 4 (Achiever)' } },

  // 3. Hairstyles
  { id: 'short_crop', category: 'hairStyle', label: 'Short Crop', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'wavy_bob', category: 'hairStyle', label: 'Wavy Bob', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'side_part', category: 'hairStyle', label: 'Classic Side Part', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'sleek_bun', category: 'hairStyle', label: 'Top Bun', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'curly_puff', category: 'hairStyle', label: 'Curly Crown', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'long_flow', category: 'hairStyle', label: 'Long Layered', rarity: 'Rare', unlock: { type: 'achievement', value: 'first_day', label: 'Complete your First Learning Day' } },
  { id: 'messy_fringe', category: 'hairStyle', label: 'Studio Fringe', rarity: 'Rare', unlock: { type: 'level', value: 2, label: 'Reach Level 2 (Explorer)' } },
  { id: 'spiky_hero', category: 'hairStyle', label: 'Hero Spikes', rarity: 'Epic', unlock: { type: 'tasks', value: 25, label: 'Complete 25 study quests' } },

  // 4. Hair Colors
  { id: 'ink_black', category: 'hairColor', label: 'Ink Black', rarity: 'Starter', swatch: '#25243A', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'cocoa_brown', category: 'hairColor', label: 'Cocoa Brown', rarity: 'Starter', swatch: '#5B3A29', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'warm_auburn', category: 'hairColor', label: 'Warm Auburn', rarity: 'Starter', swatch: '#9A4632', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'honey_blonde', category: 'hairColor', label: 'Honey Blonde', rarity: 'Starter', swatch: '#D8A657', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'silver_mist', category: 'hairColor', label: 'Silver Mist', rarity: 'Rare', swatch: '#9DA3B8', unlock: { type: 'level', value: 2, label: 'Reach Level 2 (Explorer)' } },
  { id: 'royal_violet', category: 'hairColor', label: 'Royal Violet', rarity: 'Epic', swatch: '#7956E8', unlock: { type: 'level', value: 3, label: 'Reach Level 3 (Learner)' } },
  { id: 'arctic_cyan', category: 'hairColor', label: 'Arctic Cyan', rarity: 'Epic', swatch: '#45C4D8', unlock: { type: 'streak', value: 7, label: 'Reach a 7-day study streak' } },

  // 5. Eye Styles
  { id: 'bright_round', category: 'eyeStyle', label: 'Bright Round', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'calm_almond', category: 'eyeStyle', label: 'Calm Almond', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'happy_arcs', category: 'eyeStyle', label: 'Happy Arcs', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'determined', category: 'eyeStyle', label: 'Determined', rarity: 'Rare', unlock: { type: 'tasks', value: 10, label: 'Complete 10 study quests' } },
  { id: 'sparkle_eyes', category: 'eyeStyle', label: 'Starlight Spark', rarity: 'Epic', unlock: { type: 'achievement', value: 'streak_7', label: 'Unlock "Seven-Day Streak"' } },

  // 6. Outfits
  { id: 'cozy_hoodie', category: 'outfit', label: 'Cozy Hoodie', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'crew_tee', category: 'outfit', label: 'Everyday Tee', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'knit_sweater', category: 'outfit', label: 'Knit Sweater', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'varsity_jacket', category: 'outfit', label: 'Varsity Jacket', rarity: 'Rare', unlock: { type: 'level', value: 2, label: 'Reach Level 2 (Explorer)' } },
  { id: 'studio_blazer', category: 'outfit', label: 'Scholar Blazer', rarity: 'Epic', unlock: { type: 'level', value: 3, label: 'Reach Level 3 (Learner)' } },
  { id: 'champion_cape', category: 'outfit', label: 'Master Mantle', rarity: 'Legend', unlock: { type: 'level', value: 5, label: 'Reach Level 5 (Knowledge Seeker)' } },

  // 7. Outfit Colors
  { id: 'primary_purple', category: 'outfitColor', label: 'StudyDuo Purple', rarity: 'Starter', swatch: '#7956E8', accentSwatch: '#A78BFA', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'cyan_pulse', category: 'outfitColor', label: 'Cyan Pulse', rarity: 'Starter', swatch: '#45C4D8', accentSwatch: '#9EE8F3', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'emerald_leaf', category: 'outfitColor', label: 'Mint Success', rarity: 'Starter', swatch: '#38B982', accentSwatch: '#86E2BA', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'slate_indigo', category: 'outfitColor', label: 'Midnight Slate', rarity: 'Starter', swatch: '#3B3A5A', accentSwatch: '#6D6B94', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'coral_bloom', category: 'outfitColor', label: 'Coral Bloom', rarity: 'Rare', swatch: '#F06A7E', accentSwatch: '#F9A9B5', unlock: { type: 'achievement', value: 'first_task', label: 'Unlock "First Task" achievement' } },
  { id: 'sunlit_gold', category: 'outfitColor', label: 'Champion Gold', rarity: 'Epic', swatch: '#F0AF2D', accentSwatch: '#FFE08A', unlock: { type: 'streak', value: 7, label: 'Reach a 7-day study streak' } },

  // 8. Hats (optional: 'none' is starter)
  { id: 'none', category: 'hat', label: 'No Hat', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'knit_beanie', category: 'hat', label: 'Focus Beanie', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'study_headphones', category: 'hat', label: 'Lo-Fi Headphones', rarity: 'Rare', unlock: { type: 'achievement', value: 'first_day', label: 'Complete your First Learning Day' } },
  { id: 'baseball_cap', category: 'hat', label: 'Quest Cap', rarity: 'Rare', unlock: { type: 'tasks', value: 10, label: 'Complete 10 study quests' } },
  { id: 'grad_cap', category: 'hat', label: 'Scholar Cap', rarity: 'Epic', unlock: { type: 'level', value: 4, label: 'Reach Level 4 (Achiever)' } },
  { id: 'golden_crown', category: 'hat', label: 'Duo Crown', rarity: 'Legend', unlock: { type: 'achievement', value: 'study_champion', label: 'Unlock "Study Champion" achievement' } },

  // 9. Glasses (optional)
  { id: 'none', category: 'glasses', label: 'No Glasses', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'round_wire', category: 'glasses', label: 'Round Frames', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'square_scholar', category: 'glasses', label: 'Scholar Square', rarity: 'Rare', unlock: { type: 'achievement', value: 'first_task', label: 'Unlock "First Task" achievement' } },
  { id: 'gold_rim', category: 'glasses', label: 'Gold Wire Rim', rarity: 'Epic', unlock: { type: 'level', value: 3, label: 'Reach Level 3 (Learner)' } },
  { id: 'cyan_visor', category: 'glasses', label: 'Focus Visor', rarity: 'Legend', unlock: { type: 'tasks', value: 50, label: 'Complete 50 study quests' } },

  // 10. Accessories (optional)
  { id: 'none', category: 'accessory', label: 'No Extra', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'star_pin', category: 'accessory', label: 'Gold Star Pin', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'duo_lanyard', category: 'accessory', label: 'Duo Pass', rarity: 'Rare', unlock: { type: 'streak', value: 3, label: 'Reach a 3-day study streak' } },
  { id: 'cozy_scarf', category: 'accessory', label: 'Lavender Scarf', rarity: 'Rare', unlock: { type: 'level', value: 2, label: 'Reach Level 2 (Explorer)' } },
  { id: 'flame_badge', category: 'accessory', label: 'Streak Flame Charm', rarity: 'Epic', unlock: { type: 'streak', value: 7, label: 'Reach a 7-day study streak' } },
  { id: 'laurel_wings', category: 'accessory', label: 'Golden Crest Wings', rarity: 'Legend', unlock: { type: 'achievement', value: 'goal_completed', label: 'Unlock "Goal Completed" achievement' } },

  // 11. Backgrounds
  { id: 'soft_lavender', category: 'background', label: 'Soft Lavender', rarity: 'Starter', swatch: '#ECE8FF', accentSwatch: '#D9D0FF', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'sky_cyan', category: 'background', label: 'Sky Cyan', rarity: 'Starter', swatch: '#E1F7FB', accentSwatch: '#BDECF4', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'mint_breeze', category: 'background', label: 'Mint Breeze', rarity: 'Starter', swatch: '#E2F7EE', accentSwatch: '#BBEAD6', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'warm_gold', category: 'background', label: 'Sunlit Cream', rarity: 'Rare', swatch: '#FFF4D6', accentSwatch: '#FFE39E', unlock: { type: 'streak', value: 3, label: 'Reach a 3-day study streak' } },
  { id: 'violet_aura', category: 'background', label: 'Violet Halo', rarity: 'Epic', swatch: '#DDD2FF', accentSwatch: '#A78BFA', unlock: { type: 'level', value: 3, label: 'Reach Level 3 (Learner)' } },
  { id: 'solar_burst', category: 'background', label: 'Champion Rays', rarity: 'Legend', swatch: '#FFF0C2', accentSwatch: '#FFC857', unlock: { type: 'achievement', value: 'ten_day_challenge', label: 'Unlock "Ten-Day Challenge"' } },

  // 12. Avatar Frames (optional)
  { id: 'none', category: 'frame', label: 'Clean Edge', rarity: 'Starter', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'lavender_ring', category: 'frame', label: 'Lavender Ring', rarity: 'Starter', swatch: '#A78BFA', unlock: { type: 'starter', label: 'Starter collection' } },
  { id: 'cyan_circuit', category: 'frame', label: 'Cyan Circuit', rarity: 'Rare', swatch: '#45C4D8', unlock: { type: 'level', value: 2, label: 'Reach Level 2 (Explorer)' } },
  { id: 'emerald_laurel', category: 'frame', label: 'Emerald Laurel', rarity: 'Epic', swatch: '#38B982', unlock: { type: 'streak', value: 7, label: 'Reach a 7-day study streak' } },
  { id: 'gold_crest', category: 'frame', label: 'Gold Crest', rarity: 'Epic', swatch: '#FFC857', unlock: { type: 'level', value: 4, label: 'Reach Level 4 (Achiever)' } },
  { id: 'champion_halo', category: 'frame', label: 'Legend Halo', rarity: 'Legend', swatch: '#7956E8', unlock: { type: 'level', value: 6, label: 'Reach Level 6 (Expert)' } },
];

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinTone: 'warm_ivory',
  faceStyle: 'warm_smile',
  hairStyle: 'short_crop',
  hairColor: 'ink_black',
  eyeStyle: 'bright_round',
  outfit: 'cozy_hoodie',
  outfitColor: 'primary_purple',
  hat: 'none',
  glasses: 'none',
  accessory: 'none',
  background: 'soft_lavender',
  frame: 'lavender_ring',
};

const STARTER_PRESETS: AvatarConfig[] = [
  DEFAULT_AVATAR_CONFIG,
  {
    skinTone: 'golden_sand',
    faceStyle: 'cheerful',
    hairStyle: 'wavy_bob',
    hairColor: 'cocoa_brown',
    eyeStyle: 'calm_almond',
    outfit: 'knit_sweater',
    outfitColor: 'emerald_leaf',
    hat: 'none',
    glasses: 'round_wire',
    accessory: 'star_pin',
    background: 'mint_breeze',
    frame: 'lavender_ring',
  },
  {
    skinTone: 'caramel',
    faceStyle: 'focused',
    hairStyle: 'curly_puff',
    hairColor: 'ink_black',
    eyeStyle: 'bright_round',
    outfit: 'crew_tee',
    outfitColor: 'cyan_pulse',
    hat: 'knit_beanie',
    glasses: 'none',
    accessory: 'none',
    background: 'sky_cyan',
    frame: 'none',
  },
  {
    skinTone: 'porcelain',
    faceStyle: 'warm_smile',
    hairStyle: 'sleek_bun',
    hairColor: 'warm_auburn',
    eyeStyle: 'happy_arcs',
    outfit: 'cozy_hoodie',
    outfitColor: 'slate_indigo',
    hat: 'none',
    glasses: 'round_wire',
    accessory: 'none',
    background: 'soft_lavender',
    frame: 'lavender_ring',
  },
];

/**
 * Deterministic starter avatar for any user (including existing accounts migrating without avatarConfig).
 */
export function getDefaultAvatarConfig(seedKey?: string): AvatarConfig {
  if (!seedKey) return { ...DEFAULT_AVATAR_CONFIG };
  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) {
    hash = (hash * 31 + seedKey.charCodeAt(i)) >>> 0;
  }
  return { ...STARTER_PRESETS[hash % STARTER_PRESETS.length] };
}

export function getItemsByCategory(category: AvatarCategory): AvatarCosmeticItem[] {
  return AVATAR_CATALOG.filter((item) => item.category === category);
}

export function findCosmeticItem(category: AvatarCategory, id: string): AvatarCosmeticItem | undefined {
  return AVATAR_CATALOG.find((item) => item.category === category && item.id === id);
}

export function isCosmeticItemUnlocked(
  item: AvatarCosmeticItem,
  progress: AvatarProgressContext
): boolean {
  const { unlock } = item;
  switch (unlock.type) {
    case 'starter':
      return true;
    case 'level':
      return progress.level >= Number(unlock.value ?? 1);
    case 'streak':
      return Math.max(progress.currentStreak, progress.longestStreak) >= Number(unlock.value ?? 1);
    case 'tasks':
      return progress.completedTasksCount >= Number(unlock.value ?? 1);
    case 'achievement':
      return progress.unlockedAchievementKeys.includes(String(unlock.value ?? ''));
    default:
      return false;
  }
}

export function getUnlockedCosmeticSummary(progress: AvatarProgressContext): {
  unlockedCount: number;
  totalCount: number;
  unlockedKeys: Set<string>;
} {
  const unlockedKeys = new Set<string>();
  for (const item of AVATAR_CATALOG) {
    if (isCosmeticItemUnlocked(item, progress)) {
      unlockedKeys.add(`${item.category}:${item.id}`);
    }
  }
  return {
    unlockedCount: unlockedKeys.size,
    totalCount: AVATAR_CATALOG.length,
    unlockedKeys,
  };
}

/**
 * Safely normalizes any raw or partial avatar object from Firestore or older user documents.
 */
export function sanitizeAvatarConfig(
  raw: unknown,
  fallbackSeed?: string
): AvatarConfig {
  const fallback = getDefaultAvatarConfig(fallbackSeed);
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Record<string, unknown>;
  const result: AvatarConfig = { ...fallback };
  for (const key of AVATAR_CONFIG_KEYS) {
    const val = obj[key];
    if (typeof val === 'string' && findCosmeticItem(key, val)) {
      result[key] = val;
    }
  }
  return result;
}

export interface AvatarOwnershipValidationResult {
  valid: boolean;
  lockedItems: Array<{ category: AvatarCategory; id: string; label: string; requirement: string }>;
  sanitizedConfig: AvatarConfig;
}

/**
 * Strictly validates that every equipped cosmetic in `config` exists in the catalog
 * AND is legitimately unlocked by `progress`. Locked or invalid items are rejected
 * and replaced with valid starter fallbacks in `sanitizedConfig`.
 */
export function validateAvatarConfigOwnership(
  config: AvatarConfig,
  progress: AvatarProgressContext,
  fallbackSeed?: string
): AvatarOwnershipValidationResult {
  const fallback = getDefaultAvatarConfig(fallbackSeed);
  const sanitizedConfig: AvatarConfig = { ...fallback };
  const lockedItems: AvatarOwnershipValidationResult['lockedItems'] = [];

  for (const category of AVATAR_CONFIG_KEYS) {
    const requestedId = config[category];
    const item = findCosmeticItem(category, requestedId);
    if (!item) {
      lockedItems.push({
        category,
        id: String(requestedId),
        label: String(requestedId),
        requirement: 'Unknown cosmetic item',
      });
      continue;
    }
    if (!isCosmeticItemUnlocked(item, progress)) {
      lockedItems.push({
        category,
        id: item.id,
        label: item.label,
        requirement: item.unlock.label,
      });
      continue;
    }
    sanitizedConfig[category] = item.id;
  }

  return {
    valid: lockedItems.length === 0,
    lockedItems,
    sanitizedConfig,
  };
}

/**
 * Security guard verifying a user can only mutate their own avatar document.
 */
export function canUserModifyAvatar(actingUid: string | undefined, targetUid: string | undefined): boolean {
  return Boolean(actingUid && targetUid && actingUid === targetUid);
}
