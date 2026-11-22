import React, { useMemo, useState } from 'react';
import { Check, Lock, Palette } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { ACHIEVEMENT_CATALOG } from '../lib/gamification';
import { AVATAR_CATALOG } from '../lib/avatarCatalog';
import { Button, Card, ProgressBar } from '../components/ui/Primitives';

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
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#242424]">
            Achievements
          </h1>
          <p className="mt-0.5 text-sm text-[#888888]">
            Milestones unlocked automatically from your real study progress.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setActivePage('avatar')}>
          <Palette className="h-4 w-4 text-[#7956E8]" />
          Avatar Studio
        </Button>
      </div>

      {/* Progress Summary Card */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold text-[#888888]">Collection Progress</p>
            <h2 className="text-lg font-extrabold text-[#242424] tabular-nums">
              {unlockedCount} of {ACHIEVEMENT_CATALOG.length} unlocked
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Filter achievements"
            className="inline-flex rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] p-1"
          >
            {(['all', 'unlocked', 'locked'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={filter === tab}
                onClick={() => setFilter(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors cursor-pointer ${
                  filter === tab
                    ? 'bg-white text-[#242424] shadow-[0_1px_2px_rgba(36,36,36,0.06)]'
                    : 'text-[#888888] hover:text-[#242424]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <ProgressBar percent={pct} color="#58CC02" height="h-2" />
      </Card>

      {/* Clean Minimalist Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCatalog.map((def) => {
          const unlock = unlockMap.get(def.key);
          const isUnlocked = Boolean(unlock);
          const cosmeticRewards = rewardByAchievement.get(def.key) ?? [];

          return (
            <div
              key={def.key}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition-colors ${
                isUnlocked
                  ? 'border-[#EEEEF2] bg-white'
                  : 'border-[#EEEEF2] bg-[#FAFAFC]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                      isUnlocked ? 'bg-[#F7F8FA]' : 'bg-[#F0F1F5] grayscale opacity-60'
                    }`}
                    aria-hidden="true"
                  >
                    {getBadgeEmoji(def.key)}
                  </div>

                  {isUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#3C8F00]">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#888888]">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>

                <h3
                  className={`mt-3.5 text-base font-extrabold ${
                    isUnlocked ? 'text-[#242424]' : 'text-[#5C5C6E]'
                  }`}
                >
                  {def.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#888888]">
                  {def.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EEEEF2] space-y-1">
                {cosmeticRewards.length > 0 && (
                  <p className="text-xs text-[#7956E8] font-semibold">
                    🎁 Unlocks: {cosmeticRewards.join(', ')}
                  </p>
                )}
                <p className="text-[11px] text-[#888888]">
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
