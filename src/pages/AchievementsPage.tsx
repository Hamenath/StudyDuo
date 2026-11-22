import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  CheckCircle2,
  Lock,
  Palette,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { ACHIEVEMENT_CATALOG } from '../lib/gamification';
import { AVATAR_CATALOG } from '../lib/avatarCatalog';
import { Button, Card, ProgressBar } from '../components/ui/Primitives';

const BadgeArtwork: React.FC<{ achievementKey: string; unlocked: boolean }> = ({
  achievementKey,
  unlocked,
}) => {
  const palette = unlocked
    ? achievementKey.includes('streak')
      ? { bg1: '#FFF4D4', bg2: '#FFD873', stroke: '#D98806', accent: '#7956E8' }
      : achievementKey === 'study_champion'
      ? { bg1: '#F1EDFF', bg2: '#C8B6FF', stroke: '#7956E8', accent: '#FFC857' }
      : achievementKey.includes('tasks') || achievementKey === 'goal_completed'
      ? { bg1: '#E5F8FB', bg2: '#AEE8F2', stroke: '#1D8597', accent: '#7956E8' }
      : { bg1: '#E6F8F0', bg2: '#A8E8CB', stroke: '#1F8B5D', accent: '#FFC857' }
    : { bg1: '#F4F3FA', bg2: '#E7E5F2', stroke: '#9E9CB4', accent: '#B8B6CA' };

  return (
    <svg viewBox="0 0 80 80" className="h-16 w-16 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={`bg-${achievementKey}-${unlocked ? 'u' : 'l'}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.bg1} />
          <stop offset="100%" stopColor={palette.bg2} />
        </linearGradient>
      </defs>
      {/* Shield / Hexagon Medallion */}
      <polygon
        points="40,5 70,21 70,55 40,75 10,55 10,21"
        fill={`url(#bg-${achievementKey}-${unlocked ? 'u' : 'l'})`}
        stroke={palette.stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <polygon
        points="40,12 63,25 63,52 40,68 17,52 17,25"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        opacity="0.7"
      />

      {/* Icon Motif per Badge */}
      {achievementKey.includes('streak') ? (
        <path
          d="M41 21 C48 29 51 36 47 46 C44 52 36 53 32 47 C29 42 32 35 36 32 C35 37 38 38 40 34 C41 30 40 25 41 21 Z"
          fill={palette.stroke}
        />
      ) : achievementKey === 'study_champion' ? (
        <polygon
          points="24,49 27,31 35,39 40,26 45,39 53,31 56,49"
          fill={palette.accent}
          stroke={palette.stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ) : achievementKey === 'first_day' || achievementKey === 'perfect_week' ? (
        <g>
          <circle cx="40" cy="40" r="13" fill="none" stroke={palette.stroke} strokeWidth="3" />
          <path d="M34 40 L38.5 44.5 L47 35.5" fill="none" stroke={palette.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : (
        <polygon
          points="40,22 44.8,33.2 57,34.4 47.8,42.5 50.5,54.5 40,48.2 29.5,54.5 32.2,42.5 23,34.4 35.2,33.2"
          fill={palette.stroke}
        />
      )}

      {unlocked && (
        <circle cx="62" cy="18" r="4" fill="#FFC857" stroke="#FFFFFF" strokeWidth="1.5" />
      )}
    </svg>
  );
};

export const AchievementsPage: React.FC = () => {
  const { achievements, setActivePage } = useStudyDuo();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [flippedKey, setFlippedKey] = useState<string | null>(null);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7956E8]">
            <Award className="h-3.5 w-3.5" />
            Collectible Gallery
          </div>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#25243A]">
            Achievements &amp; Rewards
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#77768C]">
            Tap any badge card to inspect its unlock condition and Avatar Studio rewards.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setActivePage('avatar')}>
          <Palette className="h-4 w-4 text-[#7956E8]" />
          Avatar Studio
        </Button>
      </div>

      {/* Collection Progress Banner */}
      <Card className="sd-gradient-hero border-[#E5DFFA]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-bold text-[#7956E8]">Badge Collection</p>
            <h2 className="text-xl font-extrabold text-[#25243A] tabular-nums">
              {unlockedCount} of {ACHIEVEMENT_CATALOG.length} unlocked
            </h2>
          </div>
          <div className="inline-flex rounded-xl border border-[#DFD8F8] bg-white p-1">
            {(['all', 'unlocked', 'locked'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors cursor-pointer ${
                  filter === tab
                    ? 'bg-[#7956E8] text-white'
                    : 'text-[#77768C] hover:text-[#25243A]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <ProgressBar percent={pct} color="#7956E8" height="h-2.5" />
      </Card>

      {/* Collectible Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCatalog.map((def) => {
          const unlock = unlockMap.get(def.key);
          const isUnlocked = Boolean(unlock);
          const isFlipped = flippedKey === def.key;
          const cosmeticRewards = rewardByAchievement.get(def.key) ?? [];

          return (
            <motion.button
              key={def.key}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setFlippedKey(isFlipped ? null : def.key)}
              className={`group relative flex flex-col justify-between text-left rounded-2xl border p-5 min-h-[210px] transition-all cursor-pointer ${
                isUnlocked
                  ? 'border-[#DCD3FA] bg-white shadow-[0_6px_20px_rgba(121,86,232,0.08)]'
                  : 'border-[#ECE9F6] bg-[#FAF9FD]'
              }`}
            >
              {!isFlipped ? (
                /* FRONT OF BADGE CARD */
                <motion.div
                  key="front"
                  initial={{ opacity: 0, rotateY: -18 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  transition={{ duration: 0.24 }}
                  className="flex flex-col justify-between h-full gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <BadgeArtwork achievementKey={def.key} unlocked={isUnlocked} />
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isUnlocked
                            ? 'bg-[#E6F8F0] text-[#1F8B5D]'
                            : 'bg-[#EFEDF8] text-[#77768C]'
                        }`}
                      >
                        {isUnlocked ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Unlocked
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" /> Locked
                          </>
                        )}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A98B0]">
                        {def.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-[#25243A]">{def.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#77768C]">{def.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F1EEFA] text-[11px]">
                    <span className="font-semibold text-[#77768C]">
                      {isUnlocked && unlock
                        ? `Earned ${new Date(unlock.unlockedAt).toLocaleDateString()}`
                        : `Goal: ${def.targetValue}`}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#7956E8]">
                      <RotateCw className="h-3 w-3" /> Flip details
                    </span>
                  </div>
                </motion.div>
              ) : (
                /* BACK OF BADGE CARD (REVEAL DETAILS) */
                <motion.div
                  key="back"
                  initial={{ opacity: 0, rotateY: 18 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  transition={{ duration: 0.24 }}
                  className="flex flex-col justify-between h-full gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#7956E8] inline-flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Badge Details
                    </span>
                    <span className="text-[11px] font-bold text-[#77768C]">Tap to flip back</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="rounded-xl bg-[#F8F7FF] border border-[#EAE7F8] p-2.5">
                      <p className="font-bold text-[#25243A]">Unlock Condition</p>
                      <p className="mt-0.5 text-[#77768C]">{def.description}</p>
                    </div>

                    <div className="rounded-xl bg-[#FFF9EB] border border-[#FFE5A3] p-2.5">
                      <p className="font-bold text-[#8A5A00]">Avatar Cosmetic Reward</p>
                      <p className="mt-0.5 text-[#7A5714]">
                        {cosmeticRewards.length > 0
                          ? `Unlocks: ${cosmeticRewards.join(', ')}`
                          : 'Counts toward your StudyDuo player showcase.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] font-bold text-[#25243A]">
                    Status:{' '}
                    <span className={isUnlocked ? 'text-[#38B982]' : 'text-[#77768C]'}>
                      {isUnlocked && unlock
                        ? `Unlocked on ${new Date(unlock.unlockedAt).toLocaleDateString()}`
                        : 'Keep studying to unlock'}
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
