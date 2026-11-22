import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Primitives';
import { MascotImage } from './MascotArtwork';

import type { DailyCelebrationEvent } from '../../types/studyduo';

export const DailyCelebrationOverlay: React.FC<{
  celebration: DailyCelebrationEvent | null;
  onClose: () => void;
  onOpenAvatarStudio?: () => void;
}> = ({ celebration, onClose, onOpenAvatarStudio }) => {
  const totalXp = celebration ? celebration.xpEarned + celebration.bonusXp : 0;

  return (
    <AnimatePresence>
      {celebration && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="celebration-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#20202A]/45 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-[32px] bg-white border border-[#F0EDF5] shadow-xl text-center"
          >
            {/* Soft Pink Pastel Hero with 3D Owl Star Trophy Mascot */}
            <div className="bg-[#FFE8F0] px-6 pt-7 pb-5 flex flex-col items-center">
              <MascotImage
                mascot="owl"
                className="h-32 w-32"
                rounded="rounded-[24px]"
              />
              <span className="mt-2 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#7651E8] shadow-xs">
                {celebration.isLevelUp && celebration.newLevel
                  ? `Level ${celebration.newLevel} Unlocked!`
                  : celebration.kind === 'day_completed'
                  ? `Day ${celebration.dayNumber} Complete! 🎉`
                  : 'Streak Lit Today! 🔥'}
              </span>
            </div>

            <div className="p-6">
              <h2 id="celebration-title" className="text-2xl font-extrabold text-[#20202A]">
                {celebration.isLevelUp
                  ? celebration.newLevelTitle || 'You leveled up!'
                  : celebration.kind === 'day_completed'
                  ? 'Awesome work today!'
                  : 'Streak kept alive!'}
              </h2>
              <p className="mt-1 text-sm text-[#777783]">
                {celebration.duoFlameLitToday && celebration.partnerName ? (
                  <>
                    You and <strong className="font-semibold text-[#20202A]">{celebration.partnerName}</strong> lit your{' '}
                    <strong className="font-semibold text-[#7651E8]">{celebration.duoStreakDays}-day Duo Flame</strong> in{' '}
                    <strong className="font-semibold text-[#20202A]">{celebration.goalTitle}</strong>.
                  </>
                ) : (
                  <>
                    Great progress on Day {celebration.dayNumber} of{' '}
                    <strong className="font-semibold text-[#20202A]">{celebration.goalTitle}</strong>.
                  </>
                )}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#E2F5E9] px-3 py-3">
                  <p className="text-[11px] font-bold text-[#1F874D]">XP Earned</p>
                  <p className="mt-0.5 text-xl font-extrabold text-[#1F874D] tabular-nums">
                    +{totalXp} XP
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF0C9] px-3 py-3">
                  <p className="text-[11px] font-bold text-[#B47100]">Active Streak</p>
                  <p className="mt-0.5 text-xl font-extrabold text-[#B47100] tabular-nums">
                    🔥 {celebration.streakDays}d
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <Button fullWidth onClick={onClose} withArrowCircle>
                  Keep Learning
                </Button>
                {onOpenAvatarStudio && (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      onClose();
                      onOpenAvatarStudio();
                    }}
                  >
                    Open Avatar Studio
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
