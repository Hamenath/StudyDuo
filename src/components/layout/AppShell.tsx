import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Home,
  LogOut,
  Map as MapIcon,
  Palette,
  Settings,
  Sparkles,
  Trophy,
  User,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { useStudyDuo } from '../../context/StudyDuoContext';
import { getLevelInfo } from '../../lib/gamification';
import type { NavPage } from '../../types/studyduo';
import { Avatar } from '../ui/Primitives';
import { DailyCelebrationOverlay } from '../ui/DailyCelebrationOverlay';

export const StudyDuoBrandMark: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <span
    style={{ width: size, height: size }}
    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#7956E8] text-white"
    aria-hidden="true"
  >
    <Sparkles style={{ width: Math.round(size * 0.52), height: Math.round(size * 0.52) }} />
  </span>
);

interface NavItem {
  id: NavPage;
  label: string;
  icon: React.ReactNode;
}

const DESKTOP_MAIN_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { id: 'checklist', label: 'Quest Center', icon: <CheckSquare className="h-4 w-4" /> },
  { id: 'goals', label: 'Roadmap', icon: <MapIcon className="h-4 w-4" /> },
  { id: 'groups', label: 'Duo', icon: <Users className="h-4 w-4" /> },
  { id: 'leaderboard', label: 'Ranks', icon: <Trophy className="h-4 w-4" /> },
  { id: 'achievements', label: 'Achievements', icon: <Award className="h-4 w-4" /> },
];

const DESKTOP_STUDIO_NAV: NavItem[] = [
  { id: 'avatar', label: 'Avatar Studio', icon: <Palette className="h-4 w-4" /> },
  { id: 'ai', label: 'AI Coach', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'journal', label: 'Journal', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
];

const DESKTOP_ACCOUNT_NAV: NavItem[] = [
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

const MOBILE_TABS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { id: 'goals', label: 'Roadmap', icon: <MapIcon className="h-5 w-5" /> },
  { id: 'groups', label: 'Duo', icon: <Users className="h-5 w-5" /> },
  { id: 'leaderboard', label: 'Ranks', icon: <Trophy className="h-5 w-5" /> },
  { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    mode,
    previewPersona,
    switchPreviewPersona,
    exitPreviewMode,
    currentUser,
    activePage,
    setActivePage,
    unreadNotificationCount,
    logout,
    toasts,
    dismissToast,
  } = useStudyDuo();

  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const levelInfo = getLevelInfo(currentUser?.totalXp || 0);

  const renderDesktopButton = (item: NavItem) => {
    const active = activePage === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setActivePage(item.id)}
        className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap ${
          active
            ? 'bg-[#F3F0FF] text-[#7956E8] font-semibold'
            : 'text-[#555555] hover:bg-[#F7F8FA] hover:text-[#242424]'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <span className={active ? 'text-[#7956E8]' : 'text-[#888888]'}>{item.icon}</span>
          <span>{item.label}</span>
        </span>
        {item.id === 'notifications' && unreadNotificationCount > 0 && (
          <span className="text-xs font-bold text-[#7956E8] tabular-nums">
            {unreadNotificationCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-dvh bg-[#F7F8FA] text-[#242424] flex">
      {/* Clean Minimalist Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 border-r border-[#EEEEF2] bg-white z-30">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#EEEEF2]">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <StudyDuoBrandMark size={32} />
            <span className="text-base font-extrabold tracking-tight text-[#242424] whitespace-nowrap">
              StudyDuo
            </span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary navigation">
          <div className="space-y-0.5">
            <p className="px-3 pb-1 text-[11px] font-semibold text-[#888888]">Learning</p>
            {DESKTOP_MAIN_NAV.map(renderDesktopButton)}
          </div>

          <div className="space-y-0.5">
            <p className="px-3 pb-1 text-[11px] font-semibold text-[#888888]">Tools</p>
            {DESKTOP_STUDIO_NAV.map(renderDesktopButton)}
          </div>

          <div className="space-y-0.5">
            <p className="px-3 pb-1 text-[11px] font-semibold text-[#888888]">Account</p>
            {DESKTOP_ACCOUNT_NAV.map(renderDesktopButton)}
          </div>
        </nav>

        {/* User Footer */}
        {currentUser && (
          <div className="border-t border-[#EEEEF2] p-3 space-y-2 bg-white">
            <button
              type="button"
              onClick={() => setActivePage('avatar')}
              className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-[#F7F8FA] transition-colors cursor-pointer"
              title="Customize your avatar"
            >
              <Avatar
                initials={currentUser.avatarInitials}
                color={currentUser.avatarColor}
                avatarConfig={currentUser.avatarConfig}
                seedKey={currentUser.uid}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#242424]">{currentUser.fullName}</p>
                <p className="text-[11px] text-[#888888] tabular-nums">
                  Lv.{levelInfo.level} · {currentUser.totalXp.toLocaleString()} XP
                </p>
              </div>
              <span className="text-xs font-bold text-[#FF9600] tabular-nums shrink-0">
                🔥 {currentUser.currentStreak}
              </span>
            </button>

            <button
              type="button"
              onClick={mode === 'preview' ? exitPreviewMode : logout}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium text-[#888888] hover:bg-[#F7F8FA] hover:text-[#242424] transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              {mode === 'preview' ? 'Sign In' : 'Sign Out'}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        {/* Offline Warning Banner */}
        {isOffline && (
          <div className="bg-[#FFF8E6] border-b border-[#F2DFAA] px-4 py-2 text-xs font-medium text-[#8A5A00] flex items-center justify-center gap-2">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>You are offline. Changes will sync once reconnected.</span>
          </div>
        )}

        {/* Interactive Preview Mode Switcher */}
        {mode === 'preview' && (
          <div className="bg-white border-b border-[#EEEEF2] px-3 sm:px-5 py-2 text-xs text-[#242424]">
            <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-[#7956E8]">Preview mode</span>
                <span className="hidden md:inline text-[#888888]">
                  Switch between Owner and Partner accounts to test independent quests and permissions.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-lg bg-[#F7F8FA] p-0.5 border border-[#EEEEF2]">
                  <button
                    type="button"
                    onClick={() => switchPreviewPersona('owner')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      previewPersona === 'owner'
                        ? 'bg-[#7956E8] text-white'
                        : 'text-[#666666] hover:text-[#242424]'
                    }`}
                  >
                    Alex (Owner)
                  </button>
                  <button
                    type="button"
                    onClick={() => switchPreviewPersona('partner')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      previewPersona === 'partner'
                        ? 'bg-[#58CC02] text-white'
                        : 'text-[#666666] hover:text-[#242424]'
                    }`}
                  >
                    Maya (Partner)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={exitPreviewMode}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-[#7956E8] border border-[#E4E4EC] hover:bg-[#F7F8FA] cursor-pointer whitespace-nowrap"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compact Mobile Top Header (50px) */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[#EEEEF2] bg-white px-3.5 h-[50px]">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2 cursor-pointer min-w-0"
          >
            <StudyDuoBrandMark size={28} />
            <span className="text-sm font-extrabold tracking-tight text-[#242424] whitespace-nowrap">
              StudyDuo
            </span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {currentUser && (
              <button
                type="button"
                onClick={() => setActivePage('checklist')}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#FF9600] hover:bg-[#FFF4E5] cursor-pointer tabular-nums min-h-[36px]"
                aria-label={`${currentUser.currentStreak} day study streak`}
              >
                <span aria-hidden="true">🔥</span>
                <span>{currentUser.currentStreak}d</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActivePage('checklist')}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                activePage === 'checklist'
                  ? 'bg-[#F3F0FF] text-[#7956E8]'
                  : 'text-[#666666] hover:bg-[#F7F8FA]'
              }`}
              aria-label="Open Quest Center"
              title="Quest Center"
            >
              <CheckSquare className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => setActivePage('notifications')}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#666666] hover:bg-[#F7F8FA] hover:text-[#242424] cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#7956E8] ring-2 ring-white" />
              )}
            </button>
          </div>
        </header>

        {/* Page Container with Subtle Transition */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 pb-24 lg:pb-10 min-w-0">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Clean Fixed Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#EEEEF2] bg-white pb-safe"
      >
        <div className="mx-auto max-w-md grid grid-cols-5">
          {MOBILE_TABS.map((tab) => {
            const active =
              activePage === tab.id ||
              (tab.id === 'profile' &&
                (activePage === 'avatar' || activePage === 'settings' || activePage === 'achievements')) ||
              (tab.id === 'dashboard' && activePage === 'checklist');
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePage(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[54px] transition-colors duration-150 cursor-pointer ${
                  active ? 'text-[#7956E8]' : 'text-[#888888] hover:text-[#242424]'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-[2.5px] w-7 rounded-full bg-[#7956E8]"
                  />
                )}
                <span>{tab.icon}</span>
                <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Celebration Modal Overlay */}
      <DailyCelebrationOverlay />

      {/* Clean Bottom-Right Toast Stack */}
      <div
        aria-live="polite"
        className="fixed bottom-[68px] right-3 left-3 sm:left-auto sm:right-5 lg:bottom-6 lg:right-6 z-50 flex flex-col gap-2 sm:max-w-xs pointer-events-none"
      >
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.16 }}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-md text-xs font-medium ${
              t.tone === 'error'
                ? 'bg-[#FFF5F5] border-[#F5C6C8] text-[#A6282E]'
                : t.tone === 'info'
                ? 'bg-white border-[#EEEEF2] text-[#242424]'
                : 'bg-white border-[#CDEFA9] text-[#242424]'
            }`}
          >
            {t.tone === 'success' && (
              <CheckCircle2 className="h-4 w-4 text-[#58CC02] shrink-0 mt-0.5" />
            )}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-[#888888] hover:text-[#242424] cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
