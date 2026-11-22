import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useStudyDuo } from '../../context/StudyDuoContext';
import { Button } from './Primitives';

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#242424]/40 px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={dismissCelebration}
        >
          <motion.div
            className="relative w-full max-w-sm rounded-2xl border border-[#EEEEF2] bg-white p-6 text-center shadow-xl"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={dismissCelebration}
              aria-label="Close celebration"
              className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-xl text-[#888888] hover:bg-[#F7F8FA] hover:text-[#242424] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F8FA] border border-[#EEEEF2] text-3xl"
              aria-hidden="true"
            >
              {celebrationEvent.kind === 'level_up'
                ? '👑'
                : celebrationEvent.kind === 'day_completed'
                ? '🎉'
                : '🔥'}
            </motion.div>

            <p className="mt-3 text-xs font-semibold text-[#7956E8]">
              {celebrationEvent.kind === 'level_up'
                ? `Level ${celebrationEvent.newLevel} reached`
                : celebrationEvent.kind === 'day_completed'
                ? `Day ${celebrationEvent.dayNumber} complete`
                : `Day ${celebrationEvent.dayNumber} streak`}
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-[#242424]">
              {celebrationEvent.kind === 'level_up'
                ? `Welcome to ${celebrationEvent.newLevelTitle || `Level ${celebrationEvent.newLevel}`}!`
                : celebrationEvent.kind === 'day_completed'
                ? 'Nice work! All quests done'
                : "You're building a streak!"}
            </h2>

            <p className="mt-1.5 text-sm leading-relaxed text-[#888888]">
              {celebrationEvent.kind === 'level_up'
                ? `Check Avatar Studio for newly unlocked styles. Keep going on "${celebrationEvent.goalTitle}".`
                : celebrationEvent.kind === 'day_completed'
                ? `You finished every published task on Day ${celebrationEvent.dayNumber} of "${celebrationEvent.goalTitle}".`
                : `Your ${celebrationEvent.streakDays}-day study streak is safely locked in.`}
            </p>

            <div className="mt-5 grid grid-cols-2 divide-x divide-[#EEEEF2] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] py-3">
              <div className="px-3">
                <p className="text-[11px] font-medium text-[#888888]">XP earned</p>
                <p className="mt-0.5 text-lg font-extrabold text-[#7956E8] tabular-nums">
                  +{celebrationEvent.xpEarned + celebrationEvent.bonusXp}
                </p>
                {celebrationEvent.bonusXp > 0 && (
                  <p className="text-[10px] font-semibold text-[#3C8F00]">
                    +{celebrationEvent.bonusXp} bonus
                  </p>
                )}
              </div>

              <div className="px-3">
                <p className="text-[11px] font-medium text-[#888888]">Streak</p>
                <p className="mt-0.5 text-lg font-extrabold text-[#FF9600] tabular-nums">
                  🔥 {celebrationEvent.streakDays}d
                </p>
                <p className="text-[10px] font-medium text-[#888888]">
                  {celebrationEvent.duoStreakDays > 0
                    ? `Duo: ${celebrationEvent.duoStreakDays}d`
                    : 'Keep it going'}
                </p>
              </div>
            </div>

            {celebrationEvent.partnerName && (
              <p className="mt-3 text-xs text-[#666666]">
                {celebrationEvent.duoFlameLitToday
                  ? `Both you and ${celebrationEvent.partnerName} studied today!`
                  : `Your side is done — waiting on ${celebrationEvent.partnerName} today.`}
              </p>
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
