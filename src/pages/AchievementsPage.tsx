import React, { useMemo, useState } from 'react';
import { Check, Lock, Palette } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { ACHIEVEMENT_CATALOG } from '../lib/gamification';
import { AVATAR_CATALOG } from '../lib/avatarCatalog';
import { Button, ProgressBar } from '../components/ui/Primitives';
import { MascotImage } from '../components/ui/MascotArtwork';

const getBadgeEmoji = (key: string): string => {
  if (key === 'first_day') return '🌱';
  if (key === 'streak_3') return '🔥';
  if (key === 'streak_7') return '⚡';
  if (key === 'streak_30') return '🏆';
  if (key === 'perfect_week') return '🎯';
  if (key === 'tasks_50') return '📚';
  if (key === 'tasks_100') return '🚀';
  if (key === 'goal_completed') return '🎓';
  if (key === 'study_champion') return '👑';
  return '🏅';
};

const PASTEL_ICON_BGS = ['#E9DFFF', '#FFF0C9', '#E2F5E9', '#FFE8F0'];

export const AchievementsPage: React.FC = () => {
  const { achievements, setActivePage } = useStudyDuo();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const unlockMap = useMemo(
    () => new Map(achievements.map((a) => [a.achievementKey, a])),
    [achievements]
  );

  // Map which Avatar Studio cosmetics unlock from each achievement
  const rewardByAchievement = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of AVATAR_CATALOG) {
      if (item.unlock.type === 'achievement' && typeof item.unlock.value === 'string') {
        const list = map.get(item.unlock.value) ?? [];
        list.push(item.label);
        map.set(item.unlock.value, list);
      }
    }
    return map;
  }, []);

  const filteredCatalog = useMemo(() => {
    return ACHIEVEMENT_CATALOG.filter((def) => {
      const isUnlocked = unlockMap.has(def.key);
      if (filter === 'unlocked') return isUnlocked;
      if (filter === 'locked') return !isUnlocked;
      return true;
    });
  }, [filter, unlockMap]);

  const unlockedCount = unlockMap.size;
  const pct = Math.round((unlockedCount / ACHIEVEMENT_CATALOG.length) * 100);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#20202A]">
            Achievements
          </h1>
          <p className="mt-0.5 text-sm text-[#777783]">
            Milestones unlocked automatically from your real study progress.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setActivePage('avatar')}>
          <Palette className="h-4 w-4 text-[#7651E8]" />
          Avatar Studio
        </Button>
      </div>

      {/* Soft Pink Progress Banner with Scholar Owl Mascot */}
      <div className="rounded-[28px] bg-[#FFE8F0] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <MascotImage mascot="owl" className="h-16 w-16 shrink-0" rounded="rounded-2xl" />
            <div>
              <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#BE3469]">
                Collection Progress
              </span>
              <h2 className="mt-1 font-display text-xl font-black text-[#20202A] tabular-nums">
                {unlockedCount} of {ACHIEVEMENT_CATALOG.length} unlocked
              </h2>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Filter achievements"
            className="inline-flex rounded-full bg-white p-1 shadow-xs"
          >
            {(['all', 'unlocked', 'locked'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={filter === tab}
                onClick={() => setFilter(tab)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold capitalize transition-colors cursor-pointer ${
                  filter === tab
                    ? 'bg-[#7651E8] text-white'
                    : 'text-[#777783] hover:text-[#20202A]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar percent={pct} color="#E05288" trackColor="#FFFFFF" height="h-3" />
          </div>
          <span className="text-xs font-black text-[#20202A] tabular-nums">{pct}%</span>
        </div>
      </div>

      {/* Pastel Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCatalog.map((def, idx) => {
          const unlock = unlockMap.get(def.key);
          const isUnlocked = Boolean(unlock);
          const cosmeticRewards = rewardByAchievement.get(def.key) ?? [];
          const iconBg = PASTEL_ICON_BGS[idx % PASTEL_ICON_BGS.length];

          return (
            <div
              key={def.key}
              className={`flex flex-col justify-between rounded-[24px] border p-5 transition-all ${
                isUnlocked
                  ? 'border-[#F0EDF5] bg-white shadow-[0_8px_24px_-16px_rgba(118,81,232,0.14)]'
                  : 'border-[#F0EDF5] bg-white/75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div
                    style={{ backgroundColor: isUnlocked ? iconBg : '#F4F2F8' }}
                    className={`flex h-13 w-13 items-center justify-center rounded-2xl text-2xl ${
                      isUnlocked ? '' : 'grayscale opacity-60'
                    }`}
                    aria-hidden="true"
                  >
                    {getBadgeEmoji(def.key)}
                  </div>

                  {isUnlocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E2F5E9] px-2.5 py-1 text-[11px] font-extrabold text-[#1F874D]">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F4F2F8] px-2.5 py-1 text-[11px] font-bold text-[#777783]">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>

                <h3
                  className={`mt-3.5 font-display text-base font-black ${
                    isUnlocked ? 'text-[#20202A]' : 'text-[#5C5C6C]'
                  }`}
                >
                  {def.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#777783]">
                  {def.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F0EDF5] space-y-1">
                {cosmeticRewards.length > 0 && (
                  <p className="text-xs text-[#7651E8] font-bold">
                    🎁 Unlocks: {cosmeticRewards.join(', ')}
                  </p>
                )}
                <p className="text-[11px] font-medium text-[#777783]">
                  {isUnlocked && unlock
                    ? `Earned ${new Date(unlock.unlockedAt).toLocaleDateString()}`
                    : `Target: ${def.targetValue}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
