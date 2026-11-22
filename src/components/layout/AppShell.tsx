import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Download,
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
import { StudyDuoOwlMark } from '../ui/MascotArtwork';

export const StudyDuoBrandMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <StudyDuoOwlMark size={size} />
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
  { id: 'ai', label: 'Bujji AI', icon: <Sparkles className="h-4 w-4" /> },
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
    celebrationEvent,
    dismissCelebration,
    pendingInviteCodeFromUrl,
    clearPendingInviteCodeFromUrl,
    acceptInvitationByCode,
  } = useStudyDuo();

  const [joiningFromUrlBanner, setJoiningFromUrlBanner] = useState(false);

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
        className={`flex w-full items-center justify-between gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap ${
          active
            ? 'bg-[#E9DFFF] text-[#7651E8] font-bold'
            : 'text-[#5C5C6C] hover:bg-[#F8F5FF] hover:text-[#20202A]'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <span className={active ? 'text-[#7651E8]' : 'text-[#8B8A99]'}>{item.icon}</span>
          <span>{item.label}</span>
        </span>
        {item.id === 'notifications' && unreadNotificationCount > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#7651E8] px-1.5 text-[11px] font-bold text-white tabular-nums">
            {unreadNotificationCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-dvh bg-[#F8F5FF] text-[#20202A] flex">
      {/* Friendly Soft-Pastel Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 border-r border-[#F0EDF5] bg-white z-30">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0EDF5]">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <StudyDuoOwlMark size={36} />
            <span className="font-display text-xl font-black tracking-tight whitespace-nowrap">
              <span className="text-[#7651E8]">Study</span>
              <span className="text-[#20202A]">Duo</span>
            </span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5" aria-label="Primary navigation">
          <div className="space-y-1">
            <p className="px-3.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#9A99AA]">
              Learning
            </p>
            {DESKTOP_MAIN_NAV.map(renderDesktopButton)}
          </div>

          <div className="space-y-1">
            <p className="px-3.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#9A99AA]">
              Studio & Tools
            </p>
            {DESKTOP_STUDIO_NAV.map(renderDesktopButton)}
          </div>

          <div className="space-y-1">
            <p className="px-3.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#9A99AA]">
              Account
            </p>
            {DESKTOP_ACCOUNT_NAV.map(renderDesktopButton)}
          </div>
        </nav>

        {/* User Footer */}
        {currentUser && (
          <div className="border-t border-[#F0EDF5] p-3.5 space-y-2 bg-white">
            <button
              type="button"
              onClick={() => setActivePage('avatar')}
              className="flex w-full items-center gap-2.5 rounded-2xl bg-[#F8F5FF] p-2.5 text-left hover:bg-[#E9DFFF]/70 transition-colors cursor-pointer"
              title="Customize your avatar"
            >
              <Avatar
                name={currentUser.fullName}
                initials={currentUser.avatarInitials}
                color={currentUser.avatarColor}
                avatarConfig={currentUser.avatarConfig}
                seedKey={currentUser.uid}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-[#20202A]">{currentUser.fullName}</p>
                <p className="text-[11px] font-medium text-[#777783] tabular-nums">
                  Lv.{levelInfo.level} · {currentUser.totalXp.toLocaleString()} XP
                </p>
              </div>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FFF0C9] px-2 py-0.5 text-[11px] font-extrabold text-[#B47100] tabular-nums shrink-0">
                🔥 {currentUser.currentStreak}
              </span>
            </button>

            <a
              href="/StudyDuo-v1.0.0-release.apk"
              download="StudyDuo-v1.0.0-release.apk"
              className="flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-semibold bg-[#E9DFFF] text-[#7651E8] hover:bg-[#d8c6ff] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download APK
            </a>

            <button
              type="button"
              onClick={mode === 'preview' ? exitPreviewMode : logout}
              className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold text-[#777783] hover:bg-[#F8F5FF] hover:text-[#20202A] transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              {mode === 'preview' ? 'Sign In' : 'Sign Out'}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Offline Warning Banner */}
        {isOffline && (
          <div className="bg-[#FFF0C9] border-b border-[#F3D998] px-4 py-2 text-xs font-semibold text-[#8A5A00] flex items-center justify-center gap-2">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>You are offline. Changes will sync once reconnected.</span>
          </div>
        )}

        {/* Interactive Preview Mode Switcher */}
        {mode === 'preview' && (
          <div className="bg-white/95 border-b border-[#F0EDF5] px-3 sm:px-5 py-2 text-xs text-[#20202A]">
            <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center rounded-full bg-[#E9DFFF] px-2.5 py-0.5 text-[11px] font-extrabold text-[#7651E8]">
                  Preview Mode
                </span>
                <span className="hidden md:inline text-[#777783]">
                  Switch between Owner and Partner accounts to test independent quests and permissions.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-full bg-[#F8F5FF] p-0.5 border border-[#F0EDF5]">
                  <button
                    type="button"
                    onClick={() => switchPreviewPersona('owner')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      previewPersona === 'owner'
                        ? 'bg-[#7651E8] text-white'
                        : 'text-[#777783] hover:text-[#20202A]'
                    }`}
                  >
                    Alex (Owner)
                  </button>
                  <button
                    type="button"
                    onClick={() => switchPreviewPersona('partner')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      previewPersona === 'partner'
                        ? 'bg-[#2FB368] text-white'
                        : 'text-[#777783] hover:text-[#20202A]'
                    }`}
                  >
                    Maya (Partner)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={exitPreviewMode}
                  className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#7651E8] border border-[#E9DFFF] hover:bg-[#F8F5FF] cursor-pointer whitespace-nowrap"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compact Mobile Top Header (52px) */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[#F0EDF5] bg-white/95 backdrop-blur-sm px-4 h-[52px]">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2 cursor-pointer min-w-0"
          >
            <StudyDuoOwlMark size={30} />
            <span className="font-display text-base font-black tracking-tight whitespace-nowrap">
              <span className="text-[#7651E8]">Study</span>
              <span className="text-[#20202A]">Duo</span>
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {currentUser && (
              <button
                type="button"
                onClick={() => setActivePage('checklist')}
                className="flex items-center gap-1 rounded-full bg-[#FFF0C9] px-2.5 py-1 text-xs font-extrabold text-[#B47100] cursor-pointer tabular-nums min-h-[34px]"
                aria-label={`${currentUser.currentStreak} day study streak`}
              >
                <span aria-hidden="true">🔥</span>
                <span>{currentUser.currentStreak}d</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActivePage('ai')}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer ${
                activePage === 'ai'
                  ? 'bg-[#7651E8] text-white'
                  : 'bg-[#E9DFFF] text-[#7651E8] hover:bg-[#DDD0FF]'
              }`}
              aria-label="Open Bujji AI"
              title="Bujji AI"
            >
              <Sparkles className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActivePage('checklist')}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer ${
                activePage === 'checklist'
                  ? 'bg-[#E9DFFF] text-[#7651E8]'
                  : 'bg-[#F8F5FF] text-[#5C5C6C] hover:bg-[#E9DFFF]'
              }`}
              aria-label="Open Quest Center"
              title="Quest Center"
            >
              <CheckSquare className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActivePage('notifications')}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F5FF] text-[#5C5C6C] hover:bg-[#E9DFFF] hover:text-[#20202A] cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#7651E8] ring-2 ring-white" />
              )}
            </button>
          </div>
        </header>

        {/* Page Container */}
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

      {/* Friendly Rounded Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#F0EDF5] bg-white/95 backdrop-blur-sm pb-safe shadow-[0_-6px_20px_-10px_rgba(118,81,232,0.12)]"
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
                  active ? 'text-[#7651E8]' : 'text-[#8B8A99] hover:text-[#20202A]'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-[3px] w-8 rounded-full bg-[#7651E8]"
                  />
                )}
                <span>{tab.icon}</span>
                <span className={`text-[10px] leading-none ${active ? 'font-extrabold' : 'font-semibold'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Celebration Modal Overlay */}
      <DailyCelebrationOverlay
        celebration={celebrationEvent}
        onClose={dismissCelebration}
        onOpenAvatarStudio={() => {
          dismissCelebration();
          setActivePage('avatar');
        }}
      />

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
            className={`pointer-events-auto flex items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-md text-xs font-semibold ${
              t.tone === 'error'
                ? 'bg-[#FFF0F3] border-[#FFD6DF] text-[#B82547]'
                : t.tone === 'info'
                ? 'bg-[#F8F5FF] border-[#E9DFFF] text-[#20202A]'
                : 'bg-white border-[#D6F2E1] text-[#20202A]'
            }`}
          >
            {t.tone === 'success' && (
              <CheckCircle2 className="h-4 w-4 text-[#2FB368] shrink-0 mt-0.5" />
            )}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-[#777783] hover:text-[#20202A] cursor-pointer"
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
