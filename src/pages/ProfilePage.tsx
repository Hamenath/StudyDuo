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
      {/* Pastel Lavender Profile Hero Card */}
      <div className="overflow-hidden rounded-[28px] bg-white border border-[#F0EDF5] shadow-[0_10px_28px_-16px_rgba(118,81,232,0.14)]">
        <div className="bg-[#E9DFFF] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setActivePage('avatar')}
                className="relative group shrink-0 cursor-pointer rounded-full ring-4 ring-white"
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
                <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#7651E8] text-white ring-2 ring-white transition-transform group-hover:scale-105">
                  <Palette className="h-3.5 w-3.5" />
                </span>
              </button>

              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#7651E8]">
                  Level {levelInfo.level} · {levelInfo.title}
                </span>
                <h1 className="mt-1 font-display text-2xl sm:text-3xl font-black tracking-tight text-[#20202A] truncate">
                  {currentUser.fullName}
                </h1>
                <p className="text-xs font-semibold text-[#5C5C6C]">
                  @{currentUser.username} · {currentUser.preferredCategory}
                </p>
                {currentUser.bio && (
                  <p className="mt-1.5 text-xs sm:text-sm text-[#4F4D60] max-w-xl leading-relaxed">
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
                <Settings className="h-4 w-4 text-[#7651E8]" />
                Edit Profile
              </Button>
            </div>
          </div>

          {/* XP Progress Strip */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#20202A] tabular-nums">
                ⚡ {currentUser.totalXp.toLocaleString()} Total XP
              </span>
              <span className="font-semibold text-[#5C5C6C] tabular-nums">
                {levelInfo.nextLevelMinXp
                  ? `${levelInfo.xpNeededForNext} XP until Level ${levelInfo.level + 1}`
                  : 'Max level reached'}
              </span>
            </div>
            <ProgressBar percent={levelInfo.progressPercent} color="#7651E8" trackColor="#FFFFFF" height="h-3" />
          </div>
        </div>

        {/* 4 Pastel Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-white">
          <div className="rounded-2xl bg-[#FFF0C9] px-3.5 py-3 text-center">
            <p className="text-[11px] font-bold text-[#8A5A00]">Streak</p>
            <p className="mt-0.5 font-display text-xl font-black text-[#20202A] tabular-nums">
              🔥 {currentUser.currentStreak}d
            </p>
            <p className="text-[11px] font-medium text-[#8A5A00] tabular-nums">Best {currentUser.longestStreak}d</p>
          </div>
          <div className="rounded-2xl bg-[#E2F5E9] px-3.5 py-3 text-center">
            <p className="text-[11px] font-bold text-[#1F874D]">Quests Done</p>
            <p className="mt-0.5 font-display text-xl font-black text-[#20202A] tabular-nums">
              ✅ {currentUser.completedTasksCount}
            </p>
            <p className="text-[11px] font-medium text-[#1F874D]">Completed</p>
          </div>
          <div className="rounded-2xl bg-[#E9DFFF] px-3.5 py-3 text-center">
            <p className="text-[11px] font-bold text-[#6842DE]">Study Focus</p>
            <p className="mt-0.5 font-display text-xl font-black text-[#20202A] tabular-nums">
              ⏱️ {Math.round((myStudyMinutes / 60) * 10) / 10}h
            </p>
            <p className="text-[11px] font-medium text-[#6842DE]">Total logged</p>
          </div>
          <div className="rounded-2xl bg-[#FFE8F0] px-3.5 py-3 text-center">
            <p className="text-[11px] font-bold text-[#BE3469]">Active Goals</p>
            <p className="mt-0.5 font-display text-xl font-black text-[#20202A] tabular-nums">
              🎯 {goals.length}
            </p>
            <p className="text-[11px] font-medium text-[#BE3469]">Roadmaps</p>
          </div>
        </div>
      </div>

      {/* Cosmetic Inventory + Achievements Collection */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-black text-[#20202A]">Avatar Cosmetics</h2>
              <p className="text-xs text-[#777783]">
                Unlocked automatically from your study milestones
              </p>
            </div>
            <span className="rounded-full bg-[#E9DFFF] px-2.5 py-0.5 text-xs font-extrabold text-[#7651E8] tabular-nums">
              {cosmeticSummary.unlockedCount}/{cosmeticSummary.totalCount}
            </span>
          </div>

          <ProgressBar
            percent={Math.round((cosmeticSummary.unlockedCount / cosmeticSummary.totalCount) * 100)}
            color="#2FB368"
            trackColor="#E2F5E9"
            height="h-2.5"
          />

          <div className="pt-2 border-t border-[#F0EDF5] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#777783]">Currently wearing</p>
              <p className="mt-0.5 text-xs font-bold text-[#20202A] truncate">
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
              <h2 className="font-display text-base font-black text-[#20202A]">Achievements</h2>
              <p className="text-xs text-[#777783]">
                Earned badges unlock special avatar items
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('achievements')}
              className="rounded-full bg-[#FFE8F0] px-3 py-1 text-xs font-extrabold text-[#BE3469] hover:bg-[#FFD8E6] cursor-pointer transition-colors"
            >
              View All ({achievements.length}/{ACHIEVEMENT_CATALOG.length})
            </button>
          </div>

          {achievements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#F0EDF5] bg-[#F8F5FF] p-5 text-center text-xs text-[#777783]">
              Complete your first quest to earn your first badge!
            </div>
          ) : (
            <div className="divide-y divide-[#F0EDF5]">
              {achievements.slice(0, 4).map((unlock) => {
                const def = ACHIEVEMENT_CATALOG.find((c) => c.key === unlock.achievementKey);
                if (!def) return null;
                return (
                  <button
                    key={unlock.id}
                    type="button"
                    onClick={() => setActivePage('achievements')}
                    className="w-full flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 text-left hover:text-[#7651E8] cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF0C9] text-base leading-none shrink-0" aria-hidden="true">
                        🏅
                      </span>
                      <p className="truncate text-sm font-bold text-[#20202A]">{def.title}</p>
                    </div>
                    <span className="text-xs text-[#777783] shrink-0 tabular-nums">
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
          <h2 className="font-display text-base font-black text-[#20202A]">Study Workspace</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'checklist' as const, label: 'Quest Center', desc: 'Daily study tasks', bg: '#E9DFFF', icon: <CheckSquare className="h-4 w-4 text-[#7651E8]" /> },
              { id: 'ai' as const, label: 'AI Coach', desc: 'Plans & quizzes', bg: '#FFE8F0', icon: <Sparkles className="h-4 w-4 text-[#BE3469]" /> },
              { id: 'journal' as const, label: 'Study Journal', desc: 'Private reflections', bg: '#E2F5E9', icon: <BookOpen className="h-4 w-4 text-[#1F874D]" /> },
              { id: 'analytics' as const, label: 'Analytics', desc: 'XP & consistency', bg: '#FFF0C9', icon: <BarChart3 className="h-4 w-4 text-[#B47100]" /> },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className="flex items-center gap-3 rounded-2xl border border-[#F0EDF5] bg-white p-3.5 text-left hover:border-[#D4C4FA] hover:bg-[#FAF8FF] transition-colors cursor-pointer"
              >
                <div
                  style={{ backgroundColor: item.bg }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#20202A] truncate">{item.label}</p>
                  <p className="text-[11px] text-[#777783] truncate">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-6 space-y-3.5">
          <h2 className="font-display text-base font-black text-[#20202A]">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#F0EDF5] bg-[#F8F5FF] p-5 text-center text-xs text-[#777783]">
              Your recent quest completions and milestones will appear here.
            </div>
          ) : (
            <div className="divide-y divide-[#F0EDF5]">
              {recentActivity.map((item) => (
                <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#20202A] leading-snug">
                      You {item.message}
                    </p>
                    <p className="text-[11px] text-[#777783] mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {item.xpDelta ? (
                    <span className="shrink-0 rounded-full bg-[#E2F5E9] px-2.5 py-0.5 text-xs font-extrabold text-[#1F874D] tabular-nums">
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
