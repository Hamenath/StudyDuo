import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, Flame, Sparkles, Trophy, X } from 'lucide-react';
import type { DailyCelebrationEvent } from '../../types/studyduo';

interface DailyCelebrationOverlayProps {
  event: DailyCelebrationEvent | null;
  onDismiss: () => void;
}

const SPARK_OFFSETS = [
  { x: -72, y: -56, delay: 0.05, color: '#F3BD59', size: 10 },
  { x: 74, y: -52, delay: 0.1, color: '#7956D8', size: 9 },
  { x: -86, y: 12, delay: 0.12, color: '#38A879', size: 8 },
  { x: 88, y: 18, delay: 0.08, color: '#F3BD59', size: 11 },
  { x: -46, y: -82, delay: 0.14, color: '#38A879', size: 7 },
  { x: 48, y: -80, delay: 0.06, color: '#7956D8', size: 8 },
  { x: -52, y: 58, delay: 0.16, color: '#7956D8', size: 7 },
  { x: 56, y: 54, delay: 0.11, color: '#38A879', size: 9 },
];

export const DailyCelebrationOverlay: React.FC<DailyCelebrationOverlayProps> = ({
  event,
  onDismiss,
}) => {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!event) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [event, onDismiss]);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#242337]/45 backdrop-blur-[3px] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-celebration-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onDismiss();
          }}
        >
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            className="relative w-full max-w-sm rounded-3xl bg-white border border-[#E9EAF0] shadow-2xl p-6 sm:p-7 text-center overflow-hidden"
          >
            {/* Subtle warm top glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FFF6E5]/85 via-[#F0EBFF]/35 to-transparent"
            />

            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close celebration"
              className="absolute top-3.5 right-3.5 z-10 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#66687A] hover:bg-[#F8F9FC] hover:text-[#242337] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Animated Emblem & Sparks */}
            <div className="relative mx-auto mt-2 mb-5 flex h-24 w-24 items-center justify-center">
              {!prefersReducedMotion &&
                SPARK_OFFSETS.map((spark, idx) => (
                  <motion.span
                    key={idx}
                    aria-hidden="true"
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1.15, 0.4],
                      x: spark.x,
                      y: spark.y,
                    }}
                    transition={{
                      duration: 0.95,
                      delay: spark.delay,
                      ease: 'easeOut',
                    }}
                    style={{
                      width: spark.size,
                      height: spark.size,
                      backgroundColor: spark.color,
                    }}
                    className="absolute rounded-full pointer-events-none"
                  />
                ))}

              {!prefersReducedMotion && (
                <motion.div
                  aria-hidden="true"
                  initial={{ scale: 0.7, opacity: 0.6 }}
                  animate={{ scale: [0.92, 1.18, 1.05], opacity: [0.55, 0.2, 0] }}
                  transition={{ duration: 1.1, repeat: 1, repeatDelay: 0.5 }}
                  className={`absolute inset-0 rounded-full ${
                    event.kind === 'day_completed' ? 'bg-[#38A879]/25' : 'bg-[#F3BD59]/35'
                  }`}
                />
              )}

              <motion.div
                initial={prefersReducedMotion ? {} : { scale: 0.6, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.06 }}
                className={`relative flex h-20 w-20 items-center justify-center rounded-3xl shadow-md ${
                  event.kind === 'day_completed'
                    ? 'bg-gradient-to-br from-[#38A879] to-[#2B8A61] text-white'
                    : 'bg-gradient-to-br from-[#F3BD59] to-[#E58A2B] text-white'
                }`}
              >
                {event.kind === 'day_completed' ? (
                  <Trophy className="h-10 w-10" />
                ) : (
                  <Flame className="h-10 w-10 fill-current" />
                )}
              </motion.div>
            </div>

            {/* Eyebrow */}
            <p className="relative text-xs font-bold uppercase tracking-wider text-[#7956D8]">
              {event.kind === 'day_completed'
                ? `Day ${String(event.dayNumber).padStart(2, '0')} Complete`
                : `Day ${event.streakDays} Streak Lit`}
            </p>

            {/* Headline */}
            <h2
              id="daily-celebration-title"
              className="relative mt-1.5 text-2xl font-bold tracking-tight text-[#242337]"
            >
              {event.kind === 'day_completed'
                ? 'Checklist Crushed!'
                : event.streakDays === 1
                ? 'Your Flame Is Lit!'
                : `${event.streakDays}-Day Streak Alive!`}
            </h2>

            <p className="relative mt-1.5 text-sm text-[#66687A] leading-relaxed">
              {event.kind === 'day_completed'
                ? `You completed every published task on Day ${event.dayNumber} of ${event.goalTitle}.`
                : `Consistent daily reps build mastery on ${event.goalTitle}.`}
            </p>

            {/* Rewards & Streak Metrics */}
            <div className="relative mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#FFF6E5] border border-[#F3BD59]/35 px-3 py-3">
                <div className="flex items-center justify-center gap-1.5 text-[#9A6A0A]">
                  <Flame className="h-4 w-4 text-[#E58A2B] fill-[#F3BD59]" />
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {event.streakDays}d
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-[#9A6A0A]/80">Study Streak</p>
              </div>

              <div className="rounded-2xl bg-[#F0EBFF] border border-[#7956D8]/25 px-3 py-3">
                <div className="flex items-center justify-center gap-1 text-[#7956D8]">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-mono text-lg font-bold tabular-nums">
                    +{event.xpEarned + event.bonusXp}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-[#7956D8]/85">
                  {event.bonusXp > 0 ? `Includes +${event.bonusXp} Bonus` : 'XP Earned'}
                </p>
              </div>
            </div>

            {/* Duo Flame Status Banner */}
            {event.partnerName && (
              <div
                className={`relative mt-3.5 rounded-2xl px-3.5 py-2.5 text-xs font-medium flex items-center justify-center gap-2 ${
                  event.duoFlameLitToday
                    ? 'bg-[#E7F6EE] text-[#1E6B4B] border border-[#38A879]/30'
                    : 'bg-[#F8F9FC] text-[#66687A] border border-[#E9EAF0]'
                }`}
              >
                {event.duoFlameLitToday ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-[#38A879] shrink-0" />
                    <span>
                      Duo Flame safe! Both you and {event.partnerName.split(' ')[0]} studied today
                      {event.duoStreakDays > 0 ? ` (${event.duoStreakDays}d)` : ''}.
                    </span>
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4 text-[#E58A2B] shrink-0" />
                    <span>
                      Your side is lit — waiting on {event.partnerName.split(' ')[0]} today!
                    </span>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="relative mt-5 w-full min-h-[46px] rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7] transition-colors shadow-sm"
            >
              Keep Going
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
