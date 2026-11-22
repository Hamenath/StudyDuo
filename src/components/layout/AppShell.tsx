import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Flame,
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
    className="inline-flex shrink-0 items-center justify-center rounded-xl sd-gradient-primary text-white shadow-[0_6px_16px_-4px_rgba(121,86,232,0.5)]"
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
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="h-4 w-4" /> },
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
        className={`relative flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
          active
            ? 'text-[#7956E8]'
            : 'text-[#66647B] hover:bg-[#F6F4FF] hover:text-[#25243A]'
        }`}
      >
        {active && (
          <motion.span
            layoutId="desktopSidebarActive"
            className="absolute inset-0 rounded-xl bg-[#F1EDFF]"
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2.5">
          <span className={active ? 'text-[#7956E8]' : 'text-[#8987A0]'}>{item.icon}</span>
          <span>{item.label}</span>
        </span>
        {item.id === 'notifications' && unreadNotificationCount > 0 && (
          <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7956E8] px-1.5 text-[10px] font-bold text-white tabular-nums">
            {unreadNotificationCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-dvh bg-[#F8F7FF] text-[#25243A] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 border-r border-[#EAE7F8] bg-white z-30">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#F2EFFA]">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl sd-gradient-primary text-white shadow-[0_4px_14px_rgba(121,86,232,0.32)] group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-[#25243A]">StudyDuo</div>
              <div className="text-[11px] font-medium text-[#77768C]">Level Up Together.</div>
            </div>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary navigation">
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#9A98B0]">
              Adventure
            </p>
            {DESKTOP_MAIN_NAV.map(renderDesktopButton)}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#9A98B0]">
              Studio & Tools
            </p>
            {DESKTOP_STUDIO_NAV.map(renderDesktopButton)}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#9A98B0]">
              Account
            </p>
            {DESKTOP_ACCOUNT_NAV.map(renderDesktopButton)}
          </div>
        </nav>

        {/* Player Identity Footer */}
        {currentUser && (
          <div className="border-t border-[#F2EFFA] p-3.5 space-y-2.5 bg-[#FCFBFF]">
            <button
              type="button"
              onClick={() => setActivePage('avatar')}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#EAE7F8] bg-white p-2.5 text-left hover:border-[#CFC6F7] transition-colors cursor-pointer"
              title="Open Avatar Studio"
            >
              <Avatar
                initials={currentUser.avatarInitials}
                color={currentUser.avatarColor}
                avatarConfig={currentUser.avatarConfig}
                seedKey={currentUser.uid}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#25243A]">{currentUser.fullName}</p>
                <p className="text-[11px] font-medium text-[#7956E8] tabular-nums">
                  Lv.{levelInfo.level} · {currentUser.totalXp.toLocaleString()} XP
                </p>
              </div>
              <span className="flex items-center gap-0.5 rounded-lg bg-[#FFF7E0] px-1.5 py-1 text-[11px] font-bold text-[#A56D06] tabular-nums">
                <Flame className="h-3 w-3 text-[#FFC857] fill-[#FFC857]" />
                {currentUser.currentStreak}
              </span>
            </button>

            <button
              type="button"
              onClick={mode === 'preview' ? exitPreviewMode : logout}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-[#77768C] hover:bg-[#F3F0FF] hover:text-[#25243A] transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              {mode === 'preview' ? 'Sign In with Real Account' : 'Sign Out'}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Offline Warning Banner */}
        {isOffline && (
          <div className="bg-[#FFF7E0] border-b border-[#FFE099] px-4 py-2 text-xs font-semibold text-[#8A5A00] flex items-center justify-center gap-2">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>You are offline. Changes will resume syncing once your connection returns.</span>
          </div>
        )}

        {/* Interactive Preview Mode Banner */}
        {mode === 'preview' && (
          <div className="bg-[#F3EFFF] border-b border-[#E3DCFA] px-3 sm:px-4 py-2 text-xs text-[#25243A]">
            <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-[#7956E8] shrink-0" />
                <span className="font-bold text-[#7956E8]">Preview Duo</span>
                <span className="hidden md:inline text-[#6E6C85]">
                  Switch players to test independent quests, custom avatars, & owner/partner permissions.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-xl bg-white p-0.5 border border-[#DFD8F8]">
                  <button
                    type="button"
                    onClick={() => switchPreviewPersona('owner')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      previewPersona === 'owner'
                        ? 'bg-[#7956E8] text-white'
                        : 'text-[#6E6C85] hover:text-[#25243A]'
                    }`}
                  >
                    Alex (Owner)
                  </button>
                  <button
                    type="button"
                    onClick={() => switchPreviewPersona('partner')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      previewPersona === 'partner'
                        ? 'bg-[#38B982] text-white'
                        : 'text-[#6E6C85] hover:text-[#25243A]'
                    }`}
                  >
                    Maya (Partner)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={exitPreviewMode}
                  className="rounded-xl bg-white px-2.5 py-1 text-[11px] font-bold text-[#7956E8] border border-[#DDD4FA] hover:bg-[#F7F5FF] cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Compact Top Header (50px) */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[#EAE7F8] bg-white/95 px-3.5 h-[50px]">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2 cursor-pointer min-w-0"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg sd-gradient-primary text-white shadow-sm shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-extrabold tracking-tight text-[#25243A] truncate">
              StudyDuo
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {currentUser && (
              <button
                type="button"
                onClick={() => setActivePage('checklist')}
                className="flex items-center gap-1 rounded-xl bg-[#FFF7E0] border border-[#FFE39E] px-2 py-1 text-xs font-bold text-[#9A6406] cursor-pointer tabular-nums min-h-[34px]"
                title="Today's Quests & Streak"
              >
                <Flame className="h-3.5 w-3.5 text-[#F59E0B] fill-[#FFC857]" />
                <span>{currentUser.currentStreak}d</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActivePage('checklist')}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                activePage === 'checklist'
                  ? 'bg-[#7956E8] text-white'
                  : 'bg-[#F4F1FE] text-[#7956E8]'
              }`}
              aria-label="Open Quest Center"
              title="Quest Center"
            >
              <CheckSquare className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActivePage('notifications')}
              className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#F6F5FB] text-[#66647B] hover:text-[#25243A] cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#7956E8] ring-2 ring-white" />
              )}
            </button>
          </div>
        </header>

        {/* Page Container with Smooth Transition */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-28 lg:pb-10 min-w-0">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Floating Rounded Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed inset-x-3 bottom-2 z-30 pb-safe pointer-events-none"
      >
        <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-[#E5E0F8] bg-white/95 px-1 py-1 shadow-[0_12px_32px_rgba(121,86,232,0.16),0_2px_8px_rgba(37,36,58,0.06)]">
          <div className="grid grid-cols-5 gap-0.5">
            {MOBILE_TABS.map((tab) => {
              const active =
                activePage === tab.id ||
                (tab.id === 'profile' && (activePage === 'avatar' || activePage === 'settings' || activePage === 'achievements')) ||
                (tab.id === 'dashboard' && activePage === 'checklist');
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePage(tab.id)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 min-h-[44px] transition-colors cursor-pointer ${
                    active ? 'text-[#7956E8]' : 'text-[#83819A] hover:text-[#25243A]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {active && (
                    <motion.span
                      layoutId="mobileFloatingNavActive"
                      className="absolute inset-0.5 rounded-xl bg-[#F1EDFF]"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{tab.icon}</span>
                  <span className="relative z-10 text-[10px] font-bold leading-none">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Celebration Modal Overlay */}
      <DailyCelebrationOverlay />

      {/* Toast Stack (positioned bottom-right on desktop, above floating nav on mobile) */}
      <div
        aria-live="polite"
        className="fixed bottom-[76px] right-3 left-3 sm:left-auto sm:right-5 lg:bottom-6 lg:right-6 z-50 flex flex-col gap-2 sm:max-w-xs pointer-events-none"
      >
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 shadow-lg text-xs font-semibold ${
              t.tone === 'error'
                ? 'bg-[#FFF3F4] border-[#F6C8CD] text-[#A82C38]'
                : t.tone === 'info'
                ? 'bg-[#F3F0FF] border-[#DBD2FA] text-[#5B3CC4]'
                : 'bg-white border-[#EAE7F8] text-[#25243A]'
            }`}
          >
            {t.tone === 'success' && (
              <CheckCircle2 className="h-4 w-4 text-[#38B982] shrink-0 mt-0.5" />
            )}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-[#8E8CA6] hover:text-[#25243A] cursor-pointer"
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
