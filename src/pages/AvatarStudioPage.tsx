import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Lock,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  Unlock,
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

const RARITY_STYLES: Record<CosmeticRarity, { text: string; bg: string }> = {
  Starter: { text: 'text-[#6D6B84]', bg: 'bg-[#F3F2FA]' },
  Rare: { text: 'text-[#1D8597]', bg: 'bg-[#E5F8FB]' },
  Epic: { text: 'text-[#6B48DC]', bg: 'bg-[#F1EDFF]' },
  Legend: { text: 'text-[#9A6808]', bg: 'bg-[#FFF6DB]' },
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
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EAE7F8] bg-white text-[#25243A] hover:bg-[#F4F0FF] cursor-pointer shrink-0"
            aria-label="Back to Profile"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#25243A] truncate">
              Avatar Studio
            </h1>
            <p className="text-xs sm:text-sm text-[#77768C]">
              Personalize your study identity · Cosmetics never affect XP or rankings
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
        {/* Left: Live Preview Stage */}
        <Card className="lg:col-span-5 overflow-hidden p-0">
          <div className="sd-gradient-hero px-5 pt-6 pb-5 text-center border-b border-[#EFEBF9]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#77768C] mb-3">
              <span className="inline-flex items-center gap-1.5 text-[#7956E8]">
                <Sparkles className="h-3.5 w-3.5" />
                Lv. {levelInfo.level} · {levelInfo.title}
              </span>
              <span className="tabular-nums text-[#25243A]">
                {summary.unlockedCount}/{summary.totalCount} unlocked
              </span>
            </div>

            <motion.div
              key={`${draft.hairStyle}-${draft.outfit}-${draft.hat}-${draft.frame}-${draft.background}`}
              initial={{ scale: 0.96, opacity: 0.85 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto my-2 flex justify-center"
            >
              <PlayerAvatar
                config={draft}
                seedKey={currentUser.uid}
                size="studio"
                animated
                alt={`${currentUser.fullName} live avatar preview`}
              />
            </motion.div>

            <h2 className="mt-3 text-lg font-extrabold text-[#25243A]">{currentUser.fullName}</h2>
            <p className="text-xs text-[#77768C]">@{currentUser.username}</p>

            {equippedSummary.length > 0 && (
              <p className="mt-2.5 text-[11px] font-medium text-[#6C6A82]">
                {equippedSummary.join(' · ')}
              </p>
            )}
          </div>

          <div className="p-4 flex flex-wrap items-center justify-between gap-2 bg-white">
            <Button variant="secondary" size="sm" onClick={handleRandomize}>
              <Shuffle className="h-3.5 w-3.5" />
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
        </Card>

        {/* Right: Category Selector & Cosmetic Grid */}
        <Card className="lg:col-span-7 p-4 sm:p-5 space-y-4">
          {/* Category Bar (All 12 Categories — wraps on sm+, horizontal scroll on compact mobile) */}
          <div className="-mx-1 px-1 overflow-x-auto sm:overflow-visible no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max sm:min-w-0 sm:flex-wrap pb-1" role="tablist" aria-label="Avatar customization categories">
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
                    className={`relative rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer min-h-[40px] ${
                      isActive
                        ? 'text-white'
                        : 'text-[#6A6880] hover:bg-[#F3F0FF] hover:text-[#25243A]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="avatarStudioCategoryPill"
                        className="absolute inset-0 rounded-xl bg-[#7956E8] shadow-[0_4px_12px_rgba(121,86,232,0.28)]"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{cat.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Category Heading */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F2EFFA] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#25243A]">{categoryMeta.label}</h3>
              <p className="text-[11px] text-[#77768C]">
                {categoryMeta.optional
                  ? 'Tap an unlocked item to equip or tap again to remove.'
                  : 'Select any unlocked style to preview live.'}
              </p>
            </div>
            <span className="text-xs font-semibold text-[#7956E8] tabular-nums">
              {itemsInCategory.filter((i) => isCosmeticItemUnlocked(i, progress)).length}/
              {itemsInCategory.length} owned
            </span>
          </div>

          {/* Locked Condition Callout */}
          {lockedNotice && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 rounded-xl border border-[#FFE29D] bg-[#FFF9E8] px-3.5 py-2.5 text-xs text-[#7D5306]"
            >
              <Lock className="h-4 w-4 shrink-0 text-[#D98806]" />
              <span>
                <strong className="font-bold">{lockedNotice.label}</strong> is locked —{' '}
                {lockedNotice.requirement}.
              </span>
            </motion.div>
          )}

          {/* Scrollable Cosmetic Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {itemsInCategory.map((item) => {
              const unlocked = isCosmeticItemUnlocked(item, progress);
              const isEquipped = draft[item.category] === item.id;
              const rarityStyle = RARITY_STYLES[item.rarity];
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
                      ? 'border-[#7956E8] bg-[#F6F3FF] ring-2 ring-[#7956E8]/20'
                      : unlocked
                      ? 'border-[#EAE7F8] bg-white hover:border-[#CBBFF8] hover:bg-[#FAF9FF]'
                      : 'border-[#EEEBF8] bg-[#FAF9FD] opacity-80 hover:border-[#DFD8F5]'
                  }`}
                >
                  {/* Top status corner */}
                  <div className="flex w-full items-center justify-between gap-1 mb-2">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${rarityStyle.bg} ${rarityStyle.text}`}
                    >
                      {item.rarity}
                    </span>
                    {isEquipped ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7956E8] text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : !unlocked ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EFEBF9] text-[#77768C]">
                        <Lock className="h-3 w-3" />
                      </span>
                    ) : (
                      <Unlock className="h-3 w-3 text-[#C2B9E6] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>

                  {/* Swatch or Mini Avatar Preview */}
                  {isColorOnly && item.swatch ? (
                    <div
                      className="my-1.5 h-11 w-11 rounded-full border-2 border-white shadow-sm ring-1 ring-[#E4DFF6]"
                      style={{
                        background: item.accentSwatch
                          ? `linear-gradient(135deg, ${item.swatch} 0%, ${item.accentSwatch} 100%)`
                          : item.swatch,
                      }}
                    />
                  ) : (
                    <div className={`my-0.5 ${!unlocked ? 'grayscale-[40%] opacity-75' : ''}`}>
                      <PlayerAvatar
                        config={previewConfig}
                        size="md"
                        alt={`${item.label} preview`}
                      />
                    </div>
                  )}

                  <span className="mt-2 text-xs font-bold text-[#25243A] leading-tight">
                    {item.label}
                  </span>

                  {!unlocked && (
                    <span className="mt-1 text-[10px] leading-snug text-[#77768C] line-clamp-2">
                      {item.unlock.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Unlock Roadmap Hint */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F7FF] border border-[#EAE7F8] px-3.5 py-2.5 text-xs text-[#6B6980]">
            <span>
              Earn XP, maintain streaks, and unlock achievements to collect all{' '}
              <strong className="font-bold text-[#25243A]">{AVATAR_CATALOG.length}</strong> cosmetics.
            </span>
            <button
              type="button"
              onClick={() => setActivePage('achievements')}
              className="shrink-0 font-bold text-[#7956E8] hover:underline cursor-pointer"
            >
              View Badges
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
