import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, Flame, Sparkles, Trophy, Users, X, Zap } from 'lucide-react';
import { useStudyDuo } from '../../context/StudyDuoContext';
import { Button } from './Primitives';

const SPARK_POSITIONS = [
  { x: -78, y: -56, color: '#FFC857', size: 8 },
  { x: 76, y: -52, color: '#45C4D8', size: 7 },
  { x: -94, y: 12, color: '#A78BFA', size: 6 },
  { x: 92, y: 18, color: '#38B982', size: 7 },
  { x: -50, y: -82, color: '#7956E8', size: 6 },
  { x: 52, y: -78, color: '#FFC857', size: 8 },
];

export const DailyCelebrationOverlay: React.FC = () => {
  const { celebrationEvent, dismissCelebration, setActivePage } = useStudyDuo();

  useEffect(() => {
    if (!celebrationEvent) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissCelebration();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [celebrationEvent, dismissCelebration]);

  return (
    <AnimatePresence>
      {celebrationEvent && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Study milestone celebration"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#25243A]/45 px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={dismissCelebration}
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#EAE7F8] bg-white p-6 text-center shadow-[0_24px_64px_rgba(37,36,58,0.22)]"
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Gradient Strip */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-28"
              style={{
                background:
                  celebrationEvent.kind === 'level_up'
                    ? 'linear-gradient(180deg, rgba(121,86,232,0.16) 0%, rgba(255,255,255,0) 100%)'
                    : celebrationEvent.kind === 'day_completed'
                    ? 'linear-gradient(180deg, rgba(56,185,130,0.16) 0%, rgba(255,255,255,0) 100%)'
                    : 'linear-gradient(180deg, rgba(255,200,87,0.22) 0%, rgba(255,255,255,0) 100%)',
              }}
            />

            <button
              type="button"
              onClick={dismissCelebration}
              aria-label="Close celebration"
              className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full text-[#77768C] hover:bg-[#F3F0FF] hover:text-[#25243A] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Emblem with Finite Spark Burst */}
            <div className="relative mx-auto mt-2 flex h-20 w-20 items-center justify-center">
              {SPARK_POSITIONS.map((s, idx) => (
                <motion.span
                  key={idx}
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-full"
                  style={{ width: s.size, height: s.size, backgroundColor: s.color }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                  animate={{ x: s.x * 0.65, y: s.y * 0.65, opacity: [0, 1, 0], scale: [0.4, 1.15, 0.6] }}
                  transition={{ duration: 0.75, delay: 0.05 * idx, ease: 'easeOut' }}
                />
              ))}

              <motion.div
                initial={{ scale: 0.7, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                className={`flex h-20 w-20 items-center justify-center rounded-3xl border shadow-md ${
                  celebrationEvent.kind === 'level_up'
                    ? 'border-[#D9CEFF] bg-[#F1EDFF] text-[#7956E8]'
                    : celebrationEvent.kind === 'day_completed'
                    ? 'border-[#C6F0DD] bg-[#E6F8F0] text-[#38B982]'
                    : 'border-[#FFE29D] bg-[#FFF7E0] text-[#D98806]'
                }`}
              >
                {celebrationEvent.kind === 'level_up' ? (
                  <Crown className="h-9 w-9" />
                ) : celebrationEvent.kind === 'day_completed' ? (
                  <Trophy className="h-9 w-9" />
                ) : (
                  <Flame className="h-9 w-9" />
                )}
              </motion.div>
            </div>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#F1EDFF] px-3 py-1 text-[11px] font-bold text-[#7956E8]">
              <Sparkles className="h-3.5 w-3.5" />
              {celebrationEvent.kind === 'level_up'
                ? `Level ${celebrationEvent.newLevel} Reached`
                : celebrationEvent.kind === 'day_completed'
                ? `Day ${celebrationEvent.dayNumber} Complete`
                : `Day ${celebrationEvent.dayNumber} Streak Lit`}
            </div>

            <h2 className="mt-3 text-xl font-extrabold tracking-tight text-[#25243A]">
              {celebrationEvent.kind === 'level_up'
                ? `Level Up: ${celebrationEvent.newLevelTitle || `Level ${celebrationEvent.newLevel}`}!`
                : celebrationEvent.kind === 'day_completed'
                ? 'All daily quests cleared!'
                : 'Daily flame ignited!'}
            </h2>

            <p className="mt-1.5 text-sm leading-relaxed text-[#77768C]">
              {celebrationEvent.kind === 'level_up'
                ? `New avatar rewards may now be unlocked in the Avatar Studio. Keep pushing on "${celebrationEvent.goalTitle}".`
                : celebrationEvent.kind === 'day_completed'
                ? `You finished every published quest on Day ${celebrationEvent.dayNumber} of "${celebrationEvent.goalTitle}".`
                : `Your Day ${celebrationEvent.streakDays} study streak is safely locked in.`}
            </p>

            {/* Metric Strip */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-[#EAE7F8] bg-[#FAF9FF] p-3">
                <p className="text-[11px] font-medium text-[#77768C]">XP Awarded</p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-lg font-extrabold text-[#7956E8] tabular-nums">
                  <Zap className="h-4 w-4 text-[#FFC857] fill-[#FFC857]" />
                  +{celebrationEvent.xpEarned + celebrationEvent.bonusXp}
                </p>
                {celebrationEvent.bonusXp > 0 && (
                  <p className="text-[10px] font-semibold text-[#38B982]">
                    Includes +{celebrationEvent.bonusXp} Day Bonus
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-[#EAE7F8] bg-[#FAF9FF] p-3">
                <p className="text-[11px] font-medium text-[#77768C]">Current Streak</p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-lg font-extrabold text-[#D98806] tabular-nums">
                  <Flame className="h-4 w-4 text-[#FFC857] fill-[#FFC857]" />
                  {celebrationEvent.streakDays}d
                </p>
                <p className="text-[10px] font-semibold text-[#77768C]">
                  {celebrationEvent.duoStreakDays > 0
                    ? `Duo: ${celebrationEvent.duoStreakDays}d`
                    : 'Keep it going'}
                </p>
              </div>
            </div>

            {celebrationEvent.partnerName && (
              <div
                className={`mt-3 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                  celebrationEvent.duoFlameLitToday
                    ? 'border-[#C8F0DF] bg-[#E6F8F0] text-[#1D7F54]'
                    : 'border-[#E6E2FA] bg-[#F8F7FF] text-[#66647B]'
                }`}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {celebrationEvent.duoFlameLitToday
                    ? `Both you and ${celebrationEvent.partnerName} lit today's Duo Flame!`
                    : `Your side is lit — waiting on ${celebrationEvent.partnerName} today.`}
                </span>
              </div>
            )}

            <div className="mt-5 flex items-center gap-2.5">
              {celebrationEvent.kind === 'level_up' && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    dismissCelebration();
                    setActivePage('avatar');
                  }}
                >
                  Avatar Studio
                </Button>
              )}
              <Button fullWidth onClick={dismissCelebration}>
                Continue
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
