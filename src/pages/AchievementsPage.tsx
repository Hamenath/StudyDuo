import React, { useMemo } from 'react';
import { Award, CheckCircle2, Lock } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { ACHIEVEMENT_CATALOG } from '../lib/gamification';

const BadgeArtwork: React.FC<{ category: string; unlocked: boolean }> = ({ category, unlocked }) => {
  const fillBg = unlocked
    ? category === 'streak'
      ? '#FFF6E5'
      : category === 'duo'
      ? '#E7F6EE'
      : '#F0EBFF'
    : '#F2F3F7';
  const strokeMain = unlocked
    ? category === 'streak'
      ? '#E09F24'
      : category === 'duo'
      ? '#38A879'
      : '#7956D8'
    : '#A4A6B8';

  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="14" fill={fillBg} />
      <path
        d="M24 11l3.6 7.3 8.1 1.2-5.9 5.7 1.4 8.1L24 29.5l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2L24 11z"
        fill={unlocked ? strokeMain : 'none'}
        stroke={strokeMain}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const AchievementsPage: React.FC = () => {
  const { currentUser, achievements, completions, dailyResults } = useStudyDuo();

  const unlockMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of achievements) {
      map[a.achievementKey] = a.unlockedAt;
    }
    return map;
  }, [achievements]);

  const progressValues = useMemo(() => {
    if (!currentUser) return {} as Record<string, number>;
    const myComps = completions.filter((c) => c.userId === currentUser.uid);
    const uniqueDays = new Set(myComps.map((c) => c.dateKey)).size;
    const dailyWins = dailyResults.filter((r) => r.winnerIds.includes(currentUser.uid)).length;
    const maxStreak = Math.max(currentUser.currentStreak, currentUser.longestStreak);

    return {
      first_task: Math.min(1, currentUser.completedTasksCount),
      first_day: Math.min(1, uniqueDays > 0 ? 1 : 0),
      streak_3: Math.min(3, maxStreak),
      streak_7: Math.min(7, maxStreak),
      ten_day_challenge: Math.min(10, uniqueDays),
      tasks_50: Math.min(50, currentUser.completedTasksCount),
      tasks_100: Math.min(100, currentUser.completedTasksCount),
      perfect_week: Math.min(7, maxStreak),
      goal_completed: Math.min(1, currentUser.completedGoalsCount),
      study_champion: Math.min(3, dailyWins),
    } as Record<string, number>;
  }, [completions, currentUser, dailyResults]);

  const unlockedCount = Object.keys(unlockMap).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#242337] tracking-tight">Achievements</h1>
          <p className="mt-1 text-sm text-[#66687A]">
            Milestones earned automatically from real completed tasks, streaks, and daily wins.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-[#E9EAF0] bg-white px-4 py-2.5 text-sm font-semibold text-[#242337] font-mono tabular-nums self-start">
          <Award className="h-4 w-4 text-[#7956D8]" />
          {unlockedCount} / {ACHIEVEMENT_CATALOG.length} Unlocked
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACHIEVEMENT_CATALOG.map((def) => {
          const unlockedAt = unlockMap[def.key];
          const isUnlocked = Boolean(unlockedAt);
          const currentVal = isUnlocked ? def.targetValue : progressValues[def.key] ?? 0;
          const pct = Math.min(100, Math.round((currentVal / def.targetValue) * 100));

          return (
            <div
              key={def.key}
              className={`rounded-2xl border p-5 transition-colors ${
                isUnlocked ? 'border-[#7956D8]/30 bg-white' : 'border-[#E9EAF0] bg-white/80'
              }`}
            >
              <div className="flex items-start gap-4">
                <BadgeArtwork category={def.category} unlocked={isUnlocked} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-[#242337] truncate">{def.title}</h2>
                    {isUnlocked ? (
                      <CheckCircle2 className="h-4 w-4 text-[#38A879] shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-[#88899B] shrink-0" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#66687A] leading-relaxed">{def.description}</p>

                  <div className="mt-3.5">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#66687A] mb-1.5">
                      <span>
                        {currentVal} / {def.targetValue}
                      </span>
                      <span>
                        {isUnlocked
                          ? `Unlocked ${new Date(unlockedAt).toLocaleDateString()}`
                          : `${pct}%`}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F0EBFF] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isUnlocked ? 'bg-[#38A879]' : 'bg-[#7956D8]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
