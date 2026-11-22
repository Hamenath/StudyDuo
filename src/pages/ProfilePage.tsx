import React from 'react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  Flame,
  Settings,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { Avatar } from '../components/ui/Primitives';
import { ACHIEVEMENT_CATALOG, getLevelInfo } from '../lib/gamification';
import type { NavPage } from '../types/studyduo';

export const ProfilePage: React.FC = () => {
  const { currentUser, achievements, unreadNotificationCount, setActivePage } = useStudyDuo();

  if (!currentUser) return null;

  const levelInfo = getLevelInfo(currentUser.totalXp);
  const unlockedKeys = new Set(achievements.map((a) => a.achievementKey));
  const unlockedDefs = ACHIEVEMENT_CATALOG.filter((a) => unlockedKeys.has(a.key));

  const hubLinks: Array<{
    page: NavPage;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { page: 'groups', label: 'Study Groups', subtitle: 'Duo members, group streak & activity', icon: Users },
    { page: 'analytics', label: 'Analytics', subtitle: 'XP curve & partner consistency charts', icon: BarChart3 },
    { page: 'journal', label: 'Learning Journal', subtitle: 'Private reflections & study notes', icon: BookOpen },
    { page: 'ai', label: 'AI Study Assistant', subtitle: 'Planner, explainer, quiz & coach', icon: Sparkles },
    {
      page: 'achievements',
      label: 'Achievements',
      subtitle: `${achievements.length} of ${ACHIEVEMENT_CATALOG.length} badges unlocked`,
      icon: Award,
    },
    {
      page: 'notifications',
      label: 'Notifications',
      subtitle: unreadNotificationCount > 0 ? `${unreadNotificationCount} unread alerts` : 'All caught up',
      icon: Bell,
      badge: unreadNotificationCount > 0 ? String(unreadNotificationCount) : undefined,
    },
    { page: 'settings', label: 'Settings & Privacy', subtitle: 'Profile, notifications, PWA & account', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Hero Card */}
      <section className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar
              name={currentUser.fullName}
              initials={currentUser.avatarInitials}
              color={currentUser.avatarColor}
              photoURL={currentUser.photoURL}
              size="xl"
            />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[#242337] truncate">{currentUser.fullName}</h1>
              <p className="text-sm text-[#66687A] truncate">
                @{currentUser.username} · {currentUser.preferredCategory}
              </p>
              <p className="mt-1 text-xs text-[#88899B] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Joined {new Date(currentUser.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActivePage('settings')}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#E9EAF0] bg-white px-4 text-sm font-semibold text-[#242337] hover:bg-[#F8F9FC] transition-colors shrink-0"
          >
            <Settings className="h-4 w-4 text-[#7956D8]" />
            Edit Profile
          </button>
        </div>

        {currentUser.bio && (
          <p className="mt-4 text-sm text-[#242337] leading-relaxed">{currentUser.bio}</p>
        )}

        {/* Level Progress */}
        <div className="mt-5 rounded-xl bg-[#F8F9FC] border border-[#E9EAF0] p-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7956D8]">
                Level {levelInfo.level} · {levelInfo.title}
              </span>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#66687A]">
              {levelInfo.nextLevelMinXp
                ? `${levelInfo.currentXp} / ${levelInfo.nextLevelMinXp} XP (${levelInfo.xpNeededForNext} XP to Level ${levelInfo.level + 1})`
                : `${levelInfo.currentXp} XP · Max Level Reached`}
            </span>
          </div>
          <div className="mt-2.5 h-2.5 w-full rounded-full bg-[#E9EAF0] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#7956D8] transition-all"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stat Grid */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#E9EAF0] p-3.5">
            <p className="text-xs text-[#66687A]">Total XP</p>
            <p className="mt-1 text-xl font-bold text-[#242337] font-mono tabular-nums">{currentUser.totalXp}</p>
          </div>
          <div className="rounded-xl border border-[#E9EAF0] p-3.5">
            <p className="text-xs text-[#66687A] flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-[#F3BD59]" />
              Current Streak
            </p>
            <p className="mt-1 text-xl font-bold text-[#242337] font-mono tabular-nums">
              {currentUser.currentStreak}d
            </p>
          </div>
          <div className="rounded-xl border border-[#E9EAF0] p-3.5">
            <p className="text-xs text-[#66687A]">Longest Streak</p>
            <p className="mt-1 text-xl font-bold text-[#242337] font-mono tabular-nums">
              {currentUser.longestStreak}d
            </p>
          </div>
          <div className="rounded-xl border border-[#E9EAF0] p-3.5">
            <p className="text-xs text-[#66687A] flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-[#38A879]" />
              Tasks Completed
            </p>
            <p className="mt-1 text-xl font-bold text-[#242337] font-mono tabular-nums">
              {currentUser.completedTasksCount}
            </p>
          </div>
        </div>
      </section>

      {/* Unlocked Badges Showcase */}
      <section className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-semibold text-[#242337]">Unlocked Achievements</h2>
          <button
            type="button"
            onClick={() => setActivePage('achievements')}
            className="text-xs font-semibold text-[#7956D8] hover:underline"
          >
            View all {ACHIEVEMENT_CATALOG.length}
          </button>
        </div>

        {unlockedDefs.length === 0 ? (
          <p className="text-sm text-[#66687A]">
            Complete your first task on the Daily Checklist to unlock your first badge.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unlockedDefs.map((badge) => (
              <div key={badge.key} className="flex items-center gap-3 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC]/70 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0EBFF] text-[#7956D8] shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#242337] truncate">{badge.title}</p>
                  <p className="text-xs text-[#66687A] truncate">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Study Hub — 1-tap Mobile & Quick Navigation to All Secondary Screens */}
      <section className="rounded-2xl border border-[#E9EAF0] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E9EAF0]">
          <h2 className="text-base font-semibold text-[#242337]">Study Workspace</h2>
          <p className="text-xs text-[#66687A]">Quick access to every StudyDuo tool and setting.</p>
        </div>
        <div className="divide-y divide-[#E9EAF0]">
          {hubLinks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => setActivePage(item.page)}
                className="w-full min-h-[60px] px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9FC] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0EBFF] text-[#7956D8] shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#242337]">{item.label}</p>
                    <p className="text-xs text-[#66687A] truncate">{item.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.badge && (
                    <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#7956D8] px-1.5 text-xs font-bold text-white font-mono">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-[#88899B]" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
