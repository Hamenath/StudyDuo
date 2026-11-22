import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Lock,
  RotateCcw,
  Save,
  Shuffle,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import {
  AVATAR_CATALOG,
  AVATAR_CATEGORY_META,
  AVATAR_CONFIG_KEYS,
  findCosmeticItem,
  getDefaultAvatarConfig,
  getItemsByCategory,
  getUnlockedCosmeticSummary,
  isCosmeticItemUnlocked,
  sanitizeAvatarConfig,
  type AvatarCategory,
  type AvatarConfig,
  type AvatarCosmeticItem,
  type CosmeticRarity,
} from '../lib/avatarCatalog';
import { getLevelInfo } from '../lib/gamification';
import { PlayerAvatar } from '../components/avatar/PlayerAvatar';
import { Button, Card } from '../components/ui/Primitives';

const RARITY_BADGE: Record<CosmeticRarity, string> = {
  Starter: 'bg-[#F4F2F8] text-[#777783]',
  Rare: 'bg-[#E2F5E9] text-[#1F874D]',
  Epic: 'bg-[#E9DFFF] text-[#6842DE]',
  Legend: 'bg-[#FFF0C9] text-[#B47100]',
};

export const AvatarStudioPage: React.FC = () => {
  const { currentUser, achievements, saveAvatarConfig, setActivePage, showToast } = useStudyDuo();

  const savedConfig = useMemo<AvatarConfig>(() => {
    if (!currentUser) return getDefaultAvatarConfig();
    return sanitizeAvatarConfig(currentUser.avatarConfig, currentUser.uid);
  }, [currentUser]);

  const [draft, setDraft] = useState<AvatarConfig>(savedConfig);
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('hairStyle');
  const [saving, setSaving] = useState(false);
  const [lockedNotice, setLockedNotice] = useState<{ label: string; requirement: string } | null>(null);

  // Sync draft when switching preview persona or account
  const [trackedUid, setTrackedUid] = useState<string | undefined>(currentUser?.uid);
  if (currentUser?.uid !== trackedUid) {
    setTrackedUid(currentUser?.uid);
    setDraft(savedConfig);
    setLockedNotice(null);
  }

  const progress = useMemo(
    () => ({
      level: currentUser?.level ?? 1,
      currentStreak: currentUser?.currentStreak ?? 0,
      longestStreak: currentUser?.longestStreak ?? 0,
      completedTasksCount: currentUser?.completedTasksCount ?? 0,
      unlockedAchievementKeys: achievements.map((a) => a.achievementKey),
    }),
    [achievements, currentUser]
  );

  const summary = useMemo(() => getUnlockedCosmeticSummary(progress), [progress]);
  const levelInfo = useMemo(() => getLevelInfo(currentUser?.totalXp ?? 0), [currentUser?.totalXp]);

  const itemsInCategory = useMemo(
    () => getItemsByCategory(activeCategory),
    [activeCategory]
  );

  const categoryMeta = useMemo(
    () => AVATAR_CATEGORY_META.find((c) => c.key === activeCategory)!,
    [activeCategory]
  );

  const hasChanges = useMemo(
    () => AVATAR_CONFIG_KEYS.some((k) => draft[k] !== savedConfig[k]),
    [draft, savedConfig]
  );

  if (!currentUser) return null;

  const handleSelectItem = (item: AvatarCosmeticItem) => {
    const unlocked = isCosmeticItemUnlocked(item, progress);
    if (!unlocked) {
      setLockedNotice({ label: item.label, requirement: item.unlock.label });
      return;
    }
    setLockedNotice(null);

    // Optional categories allow tapping an already-equipped item to unequip back to 'none'
    if (categoryMeta.optional && draft[item.category] === item.id && item.id !== 'none') {
      setDraft((prev) => ({ ...prev, [item.category]: 'none' }));
      return;
    }

    setDraft((prev) => ({ ...prev, [item.category]: item.id }));
  };

  const handleRandomize = () => {
    const next: AvatarConfig = { ...draft };
    for (const key of AVATAR_CONFIG_KEYS) {
      const unlockedOptions = getItemsByCategory(key).filter((item) =>
        isCosmeticItemUnlocked(item, progress)
      );
      if (unlockedOptions.length > 0) {
        const pick = unlockedOptions[Math.floor(Math.random() * unlockedOptions.length)];
        next[key] = pick.id;
      }
    }
    setDraft(next);
    setLockedNotice(null);
  };

  const handleReset = () => {
    setDraft(savedConfig);
    setLockedNotice(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveAvatarConfig(draft);
    setSaving(false);
    if (ok) {
      setLockedNotice(null);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setDraft(savedConfig);
      showToast('Unsaved avatar changes discarded.', 'info');
    }
    setActivePage('profile');
  };

  const equippedSummary = [
    findCosmeticItem('outfit', draft.outfit)?.label,
    draft.hat !== 'none' ? findCosmeticItem('hat', draft.hat)?.label : null,
    draft.glasses !== 'none' ? findCosmeticItem('glasses', draft.glasses)?.label : null,
    draft.frame !== 'none' ? findCosmeticItem('frame', draft.frame)?.label : null,
  ].filter(Boolean);

  return (
    <div className="space-y-5 pb-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setActivePage('profile')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F0EDF5] bg-white text-[#20202A] hover:bg-[#E9DFFF] cursor-pointer shrink-0 transition-colors"
            aria-label="Back to Profile"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#20202A] truncate">
              Avatar Studio
            </h1>
            <p className="text-xs sm:text-sm text-[#777783]">
              Personalize your character · Cosmetics never affect XP or rankings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="secondary" size="sm" onClick={handleCancel} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex-1 sm:flex-none"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : hasChanges ? 'Save Avatar' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Main Responsive Studio Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left: Pastel Lavender Live Preview Stage */}
        <div className="lg:col-span-5 overflow-hidden rounded-[28px] bg-white border border-[#F0EDF5] shadow-[0_10px_28px_-16px_rgba(118,81,232,0.14)]">
          <div className="px-5 pt-5 pb-6 text-center bg-[#E9DFFF]">
            <div className="flex items-center justify-between text-xs mb-4">
              <span className="rounded-full bg-white px-3 py-1 font-extrabold text-[#7651E8]">
                Lv.{levelInfo.level} · {levelInfo.title}
              </span>
              <span className="rounded-full bg-white px-3 py-1 font-extrabold tabular-nums text-[#20202A]">
                {summary.unlockedCount}/{summary.totalCount} unlocked
              </span>
            </div>

            <div className="mx-auto my-2 flex h-44 w-44 items-center justify-center rounded-[32px] bg-white shadow-[0_12px_28px_-14px_rgba(118,81,232,0.28)]">
              <motion.div
                key={`${draft.hairStyle}-${draft.outfit}-${draft.hat}-${draft.frame}-${draft.background}-${draft.glasses}`}
                initial={{ scale: 0.96, opacity: 0.85 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex justify-center"
              >
                <PlayerAvatar
                  config={draft}
                  seedKey={currentUser.uid}
                  size="studio"
                  alt={`${currentUser.fullName} live avatar preview`}
                />
              </motion.div>
            </div>

            <h2 className="mt-4 font-display text-xl font-black text-[#20202A]">{currentUser.fullName}</h2>
            <p className="text-xs font-semibold text-[#5C5C6C]">@{currentUser.username}</p>

            {equippedSummary.length > 0 && (
              <p className="mt-2 inline-flex flex-wrap justify-center gap-1 text-xs font-semibold text-[#6842DE]">
                {equippedSummary.join(' · ')}
              </p>
            )}
          </div>

          <div className="p-4 flex flex-wrap items-center justify-between gap-2 bg-white">
            <Button variant="secondary" size="sm" onClick={handleRandomize}>
              <Shuffle className="h-3.5 w-3.5 text-[#7651E8]" />
              Shuffle Unlocked
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* Right: Category Selector & Cosmetic Grid */}
        <Card className="lg:col-span-7 space-y-4">
          {/* Category Bar (All 12 Categories) */}
          <div className="-mx-1 px-1 overflow-x-auto sm:overflow-visible no-scrollbar">
            <div
              className="flex items-center gap-1.5 min-w-max sm:min-w-0 sm:flex-wrap pb-1"
              role="tablist"
              aria-label="Avatar customization categories"
            >
              {AVATAR_CATEGORY_META.map((cat) => {
                const isActive = cat.key === activeCategory;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActiveCategory(cat.key);
                      setLockedNotice(null);
                    }}
                    className={`rounded-full px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer min-h-[36px] ${
                      isActive
                        ? 'bg-[#7651E8] text-white'
                        : 'bg-[#F8F5FF] text-[#5C5C6C] hover:bg-[#E9DFFF] hover:text-[#20202A]'
                    }`}
                  >
                    {cat.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Category Heading */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EDF5] pb-3">
            <div>
              <h3 className="font-display text-base font-black text-[#20202A]">{categoryMeta.label}</h3>
              <p className="text-xs text-[#777783]">
                {categoryMeta.optional
                  ? 'Tap an unlocked item to equip or tap again to remove.'
                  : 'Select any unlocked style to preview live.'}
              </p>
            </div>
            <span className="rounded-full bg-[#E9DFFF] px-2.5 py-0.5 text-xs font-extrabold text-[#7651E8] tabular-nums">
              {itemsInCategory.filter((i) => isCosmeticItemUnlocked(i, progress)).length}/
              {itemsInCategory.length} owned
            </span>
          </div>

          {/* Locked Condition Callout */}
          {lockedNotice && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              className="flex items-center gap-2.5 rounded-2xl bg-[#FFF0C9] px-4 py-3 text-xs font-semibold text-[#8A5A00]"
            >
              <Lock className="h-4 w-4 shrink-0 text-[#B47100]" />
              <span>
                <strong className="font-extrabold">{lockedNotice.label}</strong> is locked —{' '}
                {lockedNotice.requirement}.
              </span>
            </motion.div>
          )}

          {/* Scrollable Cosmetic Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {itemsInCategory.map((item) => {
              const unlocked = isCosmeticItemUnlocked(item, progress);
              const isEquipped = draft[item.category] === item.id;
              const isColorOnly =
                item.category === 'skinTone' ||
                item.category === 'hairColor' ||
                item.category === 'outfitColor' ||
                item.category === 'background';

              const previewConfig: AvatarConfig = {
                ...draft,
                [item.category]: item.id,
              };

              return (
                <button
                  key={`${item.category}-${item.id}`}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  aria-pressed={isEquipped}
                  className={`group relative flex flex-col items-center rounded-2xl border p-3 text-center transition-all cursor-pointer min-h-[124px] ${
                    isEquipped
                      ? 'border-[#7651E8] bg-[#F5F0FF] shadow-xs'
                      : unlocked
                      ? 'border-[#F0EDF5] bg-white hover:border-[#D4C4FA] hover:bg-[#FAF8FF]'
                      : 'border-[#F0EDF5] bg-[#FAF9FC] opacity-80 hover:border-[#DFDAEB]'
                  }`}
                >
                  {/* Top status row */}
                  <div className="flex w-full items-center justify-between gap-1 mb-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${RARITY_BADGE[item.rarity]}`}>
                      {item.rarity}
                    </span>
                    {isEquipped ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2FB368] text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    ) : !unlocked ? (
                      <Lock className="h-3.5 w-3.5 text-[#8B8A99]" />
                    ) : null}
                  </div>

                  {/* Swatch or Mini Avatar Preview */}
                  {isColorOnly && item.swatch ? (
                    <div
                      className="my-1.5 h-10 w-10 rounded-full border-2 border-white ring-1 ring-[#E2DCEB]"
                      style={{
                        background: item.accentSwatch
                          ? `linear-gradient(135deg, ${item.swatch} 0%, ${item.accentSwatch} 100%)`
                          : item.swatch,
                      }}
                    />
                  ) : (
                    <div className={`my-0.5 ${!unlocked ? 'grayscale-[45%] opacity-70' : ''}`}>
                      <PlayerAvatar
                        config={previewConfig}
                        size="md"
                        alt={`${item.label} preview`}
                      />
                    </div>
                  )}

                  <span className="mt-2 text-xs font-extrabold text-[#20202A] leading-tight">
                    {item.label}
                  </span>

                  {!unlocked && (
                    <span className="mt-1 text-[10px] leading-snug text-[#777783] line-clamp-2">
                      {item.unlock.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Unlock Roadmap Hint */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F0EDF5] text-xs text-[#777783]">
            <span>
              Earn XP, build streaks, and unlock badges to collect all{' '}
              <strong className="font-extrabold text-[#20202A]">{AVATAR_CATALOG.length}</strong> cosmetics.
            </span>
            <button
              type="button"
              onClick={() => setActivePage('achievements')}
              className="shrink-0 font-extrabold text-[#7651E8] hover:underline cursor-pointer"
            >
              View Badges
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
