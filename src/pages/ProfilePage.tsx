import React, { useMemo } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  CheckSquare,
  Clock,
  Flame,
  Palette,
  Settings,
  Sparkles,
  Trophy,
  Zap,
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
    <div className="space-y-6">
      {/* Player Identity Hero */}
      <Card padding="none" className="overflow-hidden border-[#E5DFFA]">
        <div className="sd-gradient-hero p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
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
                  animated
                />
                <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#7956E8] text-white shadow-md ring-2 ring-white group-hover:scale-105 transition-transform">
                  <Palette className="h-4 w-4" />
                </span>
              </button>

              <div className="min-w-0">
                <p className="text-xs font-bold text-[#7956E8]">
                  Level {levelInfo.level} · {levelInfo.title}
                </p>
                <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-[#25243A] truncate">
                  {currentUser.fullName}
                </h1>
                <p className="text-xs font-medium text-[#77768C]">
                  @{currentUser.username} · {currentUser.preferredCategory}
                </p>
                {currentUser.bio && (
                  <p className="mt-2 text-xs sm:text-sm text-[#4C4A66] max-w-xl leading-relaxed">
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

          {/* XP Level Progress Bar */}
          <div className="mt-5 rounded-2xl bg-white/90 border border-[#EAE7F8] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#25243A] inline-flex items-center gap-1.5 tabular-nums">
                <Zap className="h-4 w-4 text-[#FFC857] fill-[#FFC857]" />
                {currentUser.totalXp.toLocaleString()} Total XP
              </span>
              <span className="font-semibold text-[#77768C] tabular-nums">
                {levelInfo.nextLevelMinXp
                  ? `${levelInfo.xpNeededForNext} XP until Level ${levelInfo.level + 1}`
                  : 'Maximum Level Reached'}
              </span>
            </div>
            <ProgressBar percent={levelInfo.progressPercent} color="#7956E8" height="h-2.5" />
          </div>
        </div>
      </Card>

      {/* Study Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card padding="sm" className="text-center">
          <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF6DB] text-[#D98806]">
            <Flame className="h-4 w-4 fill-[#FFC857]" />
          </div>
          <p className="text-xl font-extrabold text-[#25243A] tabular-nums">
            {currentUser.currentStreak}d
          </p>
          <p className="text-[11px] font-medium text-[#77768C]">
            Current Streak (Best {currentUser.longestStreak}d)
          </p>
        </Card>

        <Card padding="sm" className="text-center">
          <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F8F0] text-[#1F8B5D]">
            <CheckSquare className="h-4 w-4" />
          </div>
          <p className="text-xl font-extrabold text-[#25243A] tabular-nums">
            {currentUser.completedTasksCount}
          </p>
          <p className="text-[11px] font-medium text-[#77768C]">Quests Cleared</p>
        </Card>

        <Card padding="sm" className="text-center">
          <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5F8FB] text-[#1D8597]">
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-xl font-extrabold text-[#25243A] tabular-nums">
            {Math.round((myStudyMinutes / 60) * 10) / 10}h
          </p>
          <p className="text-[11px] font-medium text-[#77768C]">Study Focus</p>
        </Card>

        <Card padding="sm" className="text-center">
          <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1EDFF] text-[#7956E8]">
            <Trophy className="h-4 w-4" />
          </div>
          <p className="text-xl font-extrabold text-[#25243A] tabular-nums">{goals.length}</p>
          <p className="text-[11px] font-medium text-[#77768C]">Active Goals</p>
        </Card>
      </div>

      {/* Cosmetic Inventory + Achievements Collection */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Cosmetic Inventory Preview (6 cols) */}
        <Card className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-[#25243A]">Cosmetic Inventory</h2>
              <p className="text-xs text-[#77768C]">
                Avatar items unlocked through real study milestones
              </p>
            </div>
            <span className="rounded-xl bg-[#F1EDFF] px-2.5 py-1 text-xs font-extrabold text-[#7956E8] tabular-nums">
              {cosmeticSummary.unlockedCount}/{cosmeticSummary.totalCount}
            </span>
          </div>

          <ProgressBar
            percent={Math.round((cosmeticSummary.unlockedCount / cosmeticSummary.totalCount) * 100)}
            color="#45C4D8"
            height="h-2"
          />

          <div className="rounded-2xl border border-[#EAE7F8] bg-[#FCFBFF] p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#77768C]">
                Currently Equipped
              </p>
              <p className="mt-1 text-xs font-semibold text-[#25243A] truncate">
                {equippedLabels.join(' · ') || 'Starter Outfit'}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setActivePage('avatar')}>
              Open Studio
            </Button>
          </div>
        </Card>

        {/* Achievement Collection Preview (6 cols) */}
        <Card className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-[#25243A]">Achievement Collection</h2>
              <p className="text-xs text-[#77768C]">
                Earned badges unlock special avatar cosmetics
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
            <div className="rounded-2xl border border-dashed border-[#DFD8F8] bg-[#FAF9FF] p-5 text-center text-xs text-[#77768C]">
              Complete your first quest to earn your first badge!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {achievements.slice(0, 4).map((unlock) => {
                const def = ACHIEVEMENT_CATALOG.find((c) => c.key === unlock.achievementKey);
                if (!def) return null;
                return (
                  <button
                    key={unlock.id}
                    type="button"
                    onClick={() => setActivePage('achievements')}
                    className="flex items-center gap-2.5 rounded-xl border border-[#EAE7F8] bg-[#FCFBFF] p-2.5 text-left hover:border-[#CFC6F7] cursor-pointer"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF6DB] text-[#D98806]">
                      <Award className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#25243A]">{def.title}</p>
                      <p className="text-[10px] text-[#77768C]">
                        {new Date(unlock.unlockedAt).toLocaleDateString()}
                      </p>
                    </div>
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
          <h2 className="text-base font-extrabold text-[#25243A]">Study Workspace</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'checklist' as const, label: 'Quest Center', desc: 'Daily study tasks', icon: <CheckSquare className="h-4 w-4 text-[#7956E8]" /> },
              { id: 'ai' as const, label: 'AI Coach', desc: 'Plans & quizzes', icon: <Sparkles className="h-4 w-4 text-[#45C4D8]" /> },
              { id: 'journal' as const, label: 'Study Journal', desc: 'Private reflections', icon: <BookOpen className="h-4 w-4 text-[#38B982]" /> },
              { id: 'analytics' as const, label: 'Analytics', desc: 'XP & consistency', icon: <BarChart3 className="h-4 w-4 text-[#D98806]" /> },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className="flex items-center gap-3 rounded-2xl border border-[#EAE7F8] bg-[#FCFBFF] p-3 text-left hover:border-[#CFC6F7] hover:bg-[#F5F2FF] transition-colors cursor-pointer"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-[#EAE7F8]">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#25243A] truncate">{item.label}</p>
                  <p className="text-[11px] text-[#77768C] truncate">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-6 space-y-3.5">
          <h2 className="text-base font-extrabold text-[#25243A]">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DFD8F8] bg-[#FAF9FF] p-6 text-center text-xs text-[#77768C]">
              Your recent quest completions and milestones will appear here.
            </div>
          ) : (
            <div className="divide-y divide-[#F1EEFA]">
              {recentActivity.map((item) => (
                <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#25243A] leading-snug">
                      You {item.message}
                    </p>
                    <p className="text-[11px] text-[#77768C] mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {item.xpDelta ? (
                    <span className="shrink-0 rounded-lg bg-[#FFF6DB] px-2 py-0.5 text-[11px] font-extrabold text-[#9A6808] tabular-nums">
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
