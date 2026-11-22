import React, { useMemo } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  Palette,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { ACHIEVEMENT_CATALOG, getLevelInfo } from '../lib/gamification';
import {
  findCosmeticItem,
  getUnlockedCosmeticSummary,
  sanitizeAvatarConfig,
} from '../lib/avatarCatalog';
import { Avatar, Button, Card, ProgressBar } from '../components/ui/Primitives';

export const ProfilePage: React.FC = () => {
  const {
    currentUser,
    achievements,
    completions,
    activity,
    goals,
    setActivePage,
  } = useStudyDuo();

  const levelInfo = useMemo(() => getLevelInfo(currentUser?.totalXp || 0), [currentUser?.totalXp]);

  const avatarConfig = useMemo(
    () => sanitizeAvatarConfig(currentUser?.avatarConfig, currentUser?.uid),
    [currentUser?.avatarConfig, currentUser?.uid]
  );

  const cosmeticSummary = useMemo(
    () =>
      getUnlockedCosmeticSummary({
        level: currentUser?.level ?? 1,
        currentStreak: currentUser?.currentStreak ?? 0,
        longestStreak: currentUser?.longestStreak ?? 0,
        completedTasksCount: currentUser?.completedTasksCount ?? 0,
        unlockedAchievementKeys: achievements.map((a) => a.achievementKey),
      }),
    [achievements, currentUser]
  );

  const myStudyMinutes = useMemo(
    () =>
      completions
        .filter((c) => c.userId === currentUser?.uid)
        .reduce((acc, c) => acc + (c.estimatedMinutes || 0), 0),
    [completions, currentUser?.uid]
  );

  const recentActivity = useMemo(
    () =>
      activity
        .filter((a) => a.actorId === currentUser?.uid)
        .slice(0, 5),
    [activity, currentUser?.uid]
  );

  if (!currentUser) return null;

  const equippedLabels = [
    findCosmeticItem('outfit', avatarConfig.outfit)?.label,
    avatarConfig.hat !== 'none' ? findCosmeticItem('hat', avatarConfig.hat)?.label : null,
    avatarConfig.glasses !== 'none' ? findCosmeticItem('glasses', avatarConfig.glasses)?.label : null,
    avatarConfig.frame !== 'none' ? findCosmeticItem('frame', avatarConfig.frame)?.label : null,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Clean Flat White Profile Header Card */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setActivePage('avatar')}
                className="relative group shrink-0 cursor-pointer rounded-full"
                aria-label="Open Avatar Studio"
              >
                <Avatar
                  name={currentUser.fullName}
                  initials={currentUser.avatarInitials}
                  color={currentUser.avatarColor}
                  avatarConfig={avatarConfig}
                  seedKey={currentUser.uid}
                  size="xl"
                />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#7956E8] text-white ring-2 ring-white transition-transform group-hover:scale-105">
                  <Palette className="h-3.5 w-3.5" />
                </span>
              </button>

              <div className="min-w-0">
                <p className="text-xs font-bold text-[#7956E8]">
                  Level {levelInfo.level} · {levelInfo.title}
                </p>
                <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-[#242424] truncate">
                  {currentUser.fullName}
                </h1>
                <p className="text-xs text-[#888888]">
                  @{currentUser.username} · {currentUser.preferredCategory}
                </p>
                {currentUser.bio && (
                  <p className="mt-1.5 text-xs sm:text-sm text-[#5C5C6E] max-w-xl leading-relaxed">
                    {currentUser.bio}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button size="sm" onClick={() => setActivePage('avatar')}>
                <Palette className="h-4 w-4" />
                Customize Avatar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setActivePage('settings')}>
                <Settings className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Thin XP Progress Strip */}
          <div className="mt-5 pt-4 border-t border-[#EEEEF2] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#242424] tabular-nums">
                ⚡ {currentUser.totalXp.toLocaleString()} Total XP
              </span>
              <span className="text-[#888888] tabular-nums">
                {levelInfo.nextLevelMinXp
                  ? `${levelInfo.xpNeededForNext} XP until Level ${levelInfo.level + 1}`
                  : 'Max level reached'}
              </span>
            </div>
            <ProgressBar percent={levelInfo.progressPercent} color="#7956E8" height="h-2" />
          </div>
        </div>

        {/* Hairline-Divided 4-Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#EEEEF2] border-t border-[#EEEEF2] bg-[#FAFAFC]">
          <div className="px-4 py-3.5 text-center">
            <p className="text-[11px] font-medium text-[#888888]">Streak</p>
            <p className="mt-0.5 text-lg font-extrabold text-[#242424] tabular-nums">
              🔥 {currentUser.currentStreak}d
            </p>
            <p className="text-[11px] text-[#888888] tabular-nums">Best {currentUser.longestStreak}d</p>
          </div>
          <div className="px-4 py-3.5 text-center border-l border-[#EEEEF2] sm:border-l-0">
            <p className="text-[11px] font-medium text-[#888888]">Quests Done</p>
            <p className="mt-0.5 text-lg font-extrabold text-[#242424] tabular-nums">
              ✅ {currentUser.completedTasksCount}
            </p>
            <p className="text-[11px] text-[#888888]">Completed</p>
          </div>
          <div className="px-4 py-3.5 text-center">
            <p className="text-[11px] font-medium text-[#888888]">Study Focus</p>
            <p className="mt-0.5 text-lg font-extrabold text-[#242424] tabular-nums">
              ⏱️ {Math.round((myStudyMinutes / 60) * 10) / 10}h
            </p>
            <p className="text-[11px] text-[#888888]">Total logged</p>
          </div>
          <div className="px-4 py-3.5 text-center border-l border-[#EEEEF2] sm:border-l-0">
            <p className="text-[11px] font-medium text-[#888888]">Active Goals</p>
            <p className="mt-0.5 text-lg font-extrabold text-[#242424] tabular-nums">
              🎯 {goals.length}
            </p>
            <p className="text-[11px] text-[#888888]">Roadmaps</p>
          </div>
        </div>
      </Card>

      {/* Cosmetic Inventory + Achievements Collection */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#242424]">Avatar Cosmetics</h2>
              <p className="text-xs text-[#888888]">
                Unlocked automatically from your study milestones
              </p>
            </div>
            <span className="text-xs font-extrabold text-[#7956E8] tabular-nums">
              {cosmeticSummary.unlockedCount}/{cosmeticSummary.totalCount}
            </span>
          </div>

          <ProgressBar
            percent={Math.round((cosmeticSummary.unlockedCount / cosmeticSummary.totalCount) * 100)}
            color="#58CC02"
            height="h-2"
          />

          <div className="pt-2 border-t border-[#EEEEF2] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#888888]">Currently wearing</p>
              <p className="mt-0.5 text-xs font-semibold text-[#242424] truncate">
                {equippedLabels.join(' · ') || 'Starter Outfit'}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setActivePage('avatar')}>
              Open Studio
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#242424]">Achievements</h2>
              <p className="text-xs text-[#888888]">
                Earned badges unlock special avatar items
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('achievements')}
              className="text-xs font-bold text-[#7956E8] hover:underline cursor-pointer"
            >
              View All ({achievements.length}/{ACHIEVEMENT_CATALOG.length})
            </button>
          </div>

          {achievements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#EEEEF2] bg-[#F7F8FA] p-5 text-center text-xs text-[#888888]">
              Complete your first quest to earn your first badge!
            </div>
          ) : (
            <div className="divide-y divide-[#EEEEF2]">
              {achievements.slice(0, 4).map((unlock) => {
                const def = ACHIEVEMENT_CATALOG.find((c) => c.key === unlock.achievementKey);
                if (!def) return null;
                return (
                  <button
                    key={unlock.id}
                    type="button"
                    onClick={() => setActivePage('achievements')}
                    className="w-full flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 text-left hover:text-[#7956E8] cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base leading-none shrink-0" aria-hidden="true">🏅</span>
                      <p className="truncate text-sm font-bold text-[#242424]">{def.title}</p>
                    </div>
                    <span className="text-xs text-[#888888] shrink-0 tabular-nums">
                      {new Date(unlock.unlockedAt).toLocaleDateString()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Study Workspace Shortcuts + Recent Activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-6 space-y-3.5">
          <h2 className="text-base font-bold text-[#242424]">Study Workspace</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'checklist' as const, label: 'Quest Center', desc: 'Daily study tasks', icon: <CheckSquare className="h-4 w-4 text-[#7956E8]" /> },
              { id: 'ai' as const, label: 'AI Coach', desc: 'Plans & quizzes', icon: <Sparkles className="h-4 w-4 text-[#7956E8]" /> },
              { id: 'journal' as const, label: 'Study Journal', desc: 'Private reflections', icon: <BookOpen className="h-4 w-4 text-[#3C8F00]" /> },
              { id: 'analytics' as const, label: 'Analytics', desc: 'XP & consistency', icon: <BarChart3 className="h-4 w-4 text-[#D97706]" /> },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className="flex items-center gap-3 rounded-xl border border-[#EEEEF2] bg-white p-3 text-left hover:border-[#D4CCFA] hover:bg-[#FAFAFC] transition-colors cursor-pointer"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F7F8FA]">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#242424] truncate">{item.label}</p>
                  <p className="text-[11px] text-[#888888] truncate">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-6 space-y-3.5">
          <h2 className="text-base font-bold text-[#242424]">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#EEEEF2] bg-[#F7F8FA] p-5 text-center text-xs text-[#888888]">
              Your recent quest completions and milestones will appear here.
            </div>
          ) : (
            <div className="divide-y divide-[#EEEEF2]">
              {recentActivity.map((item) => (
                <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#242424] leading-snug">
                      You {item.message}
                    </p>
                    <p className="text-[11px] text-[#888888] mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {item.xpDelta ? (
                    <span className="shrink-0 text-xs font-bold text-[#3C8F00] tabular-nums">
                      +{item.xpDelta} XP
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
