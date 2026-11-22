import React, { useMemo } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckSquare,
  Flame,
  Home,
  Hourglass,
  Settings,
  Sparkles,
  Target,
  Trophy,
  User,
  Users,
  LogIn,
} from 'lucide-react';
import { useStudyDuo } from '../../context/StudyDuoContext';
import { computeDuoStreakStatus } from '../../lib/gamification';
import type { NavPage } from '../../types/studyduo';
import { Avatar, OfflineIndicator, PWAInstallButton, ToastStack } from '../ui/Primitives';
import { DailyCelebrationOverlay } from '../ui/DailyCelebrationOverlay';

interface NavItemConfig {
  id: NavPage;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  section: 'core' | 'tools' | 'account';
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: Home, section: 'core' },
  { id: 'goals', label: 'My Goals', shortLabel: 'Goals', icon: Target, section: 'core' },
  { id: 'checklist', label: 'Daily Checklist', shortLabel: 'Checklist', icon: CheckSquare, section: 'core' },
  { id: 'leaderboard', label: 'Leaderboard', shortLabel: 'Rank', icon: Trophy, section: 'core' },
  { id: 'groups', label: 'Study Groups', shortLabel: 'Groups', icon: Users, section: 'core' },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: BarChart3, section: 'tools' },
  { id: 'journal', label: 'Learning Journal', shortLabel: 'Journal', icon: BookOpen, section: 'tools' },
  { id: 'ai', label: 'AI Study Assistant', shortLabel: 'AI Tutor', icon: Sparkles, section: 'tools' },
  { id: 'achievements', label: 'Achievements', shortLabel: 'Badges', icon: Award, section: 'account' },
  { id: 'notifications', label: 'Notifications', shortLabel: 'Alerts', icon: Bell, section: 'account' },
  { id: 'profile', label: 'Profile', shortLabel: 'Profile', icon: User, section: 'account' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, section: 'account' },
];

const MOBILE_TABS: NavPage[] = ['dashboard', 'goals', 'checklist', 'leaderboard', 'profile'];

export const StudyDuoBrandMark: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden="true" className="shrink-0">
    <rect width="512" height="512" rx="120" fill="#7956D8" />
    <rect x="136" y="138" width="118" height="236" rx="28" fill="#FFFFFF" />
    <rect x="258" y="138" width="118" height="236" rx="28" fill="#F0EBFF" />
    <circle cx="195" cy="216" r="20" fill="#7956D8" />
    <circle cx="317" cy="216" r="20" fill="#38A879" />
    <path d="M174 288L192 306L218 274" stroke="#7956D8" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M296 288L314 306L340 274" stroke="#38A879" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    mode,
    previewPersona,
    switchPreviewPersona,
    exitPreviewMode,
    currentUser,
    activeGoal,
    participants,
    completions,
    activePage,
    setActivePage,
    unreadNotificationCount,
    celebrationEvent,
    dismissCelebration,
    toasts,
    dismissToast,
  } = useStudyDuo();

  const duoStreak = useMemo(() => {
    if (!currentUser) return null;
    const partner = participants.find((p) => p.uid !== currentUser.uid);
    return computeDuoStreakStatus({
      participantIds: activeGoal?.participantIds || [currentUser.uid],
      currentUserId: currentUser.uid,
      partnerName: partner?.displayName,
      completions,
      restDays: activeGoal?.restDays || [],
      timezone: activeGoal?.timezone || currentUser.timezone || 'UTC',
      groupStreak: activeGoal?.groupStreak || 0,
    });
  }, [activeGoal, completions, currentUser, participants]);

  const streakCount = currentUser?.currentStreak || 0;
  const streakNeedsAction =
    duoStreak?.state === 'waiting_on_you' || duoStreak?.state === 'at_risk';
  const streakIsLit = Boolean(duoStreak?.myStudiedToday);

  const renderStreakPill = (compact = false) => {
    if (!currentUser) return null;
    const statusDesc = duoStreak?.headline || `${streakCount} day study streak`;
    return (
      <button
        type="button"
        onClick={() => setActivePage(streakNeedsAction ? 'checklist' : 'dashboard')}
        title={`${streakCount}-day study streak · ${statusDesc}`}
        aria-label={`Study streak: ${streakCount} days. ${statusDesc}`}
        className={`inline-flex items-center gap-1 rounded-xl border px-2.5 transition-colors shrink-0 ${
          compact ? 'min-h-[36px] py-1' : 'min-h-[34px] py-1'
        } ${
          streakIsLit
            ? 'bg-[#FFF6E5] border-[#F3BD59]/55 text-[#9A6A0A] hover:bg-[#FFEDC8]'
            : streakNeedsAction
            ? 'bg-[#FFF1EC] border-[#E87A4E]/45 text-[#B44A22] hover:bg-[#FFE6DC]'
            : 'bg-[#F8F9FC] border-[#E9EAF0] text-[#66687A] hover:bg-[#F0EBFF]/60 hover:text-[#242337]'
        }`}
      >
        <Flame
          className={`h-4 w-4 shrink-0 ${
            streakIsLit
              ? 'text-[#E58A2B] fill-[#F3BD59]'
              : streakNeedsAction
              ? 'text-[#D95B2B]'
              : 'text-[#88899B]'
          }`}
        />
        <span className="font-mono text-xs font-bold tabular-nums leading-none">
          {streakCount}
          {!compact ? 'd' : ''}
        </span>
        {streakNeedsAction && (
          <Hourglass className="h-3 w-3 text-[#D95B2B] shrink-0" aria-hidden="true" />
        )}
      </button>
    );
  };

  const renderNavSection = (title: string, section: NavItemConfig['section']) => (
    <div className="space-y-1">
      <p className="px-3 text-xs font-medium text-[#88899B]">{title}</p>
      {NAV_ITEMS.filter((item) => item.section === section).map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActivePage(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`w-full min-h-[44px] flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-[#F0EBFF] text-[#7956D8] font-semibold'
                : 'text-[#66687A] hover:bg-[#F8F9FC] hover:text-[#242337]'
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-[#7956D8]' : 'text-[#88899B]'}`} />
              <span className="truncate">{item.label}</span>
            </span>
            {item.id === 'notifications' && unreadNotificationCount > 0 && (
              <span className="font-mono text-xs font-semibold text-[#7956D8] tabular-nums">
                {unreadNotificationCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#242337] flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-[260px] lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-[#E9EAF0] z-30">
        <div className="h-16 px-4 flex items-center justify-between gap-2 border-b border-[#E9EAF0]">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2.5 min-w-0 text-left"
          >
            <StudyDuoBrandMark size={30} />
            <span className="text-lg font-bold tracking-tight text-[#242337] whitespace-nowrap">
              StudyDuo
            </span>
          </button>
          {renderStreakPill(false)}
        </div>

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {renderNavSection('Study Workspace', 'core')}
          {renderNavSection('Insights & AI', 'tools')}
          {renderNavSection('Account', 'account')}
        </nav>

        <div className="p-3 border-t border-[#E9EAF0] space-y-2.5">
          <PWAInstallButton />
          {currentUser && (
            <button
              type="button"
              onClick={() => setActivePage('profile')}
              className="w-full flex items-center gap-3 rounded-xl p-2 hover:bg-[#F8F9FC] transition-colors text-left"
            >
              <Avatar
                name={currentUser.fullName}
                initials={currentUser.avatarInitials}
                color={currentUser.avatarColor}
                photoURL={currentUser.photoURL}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#242337] truncate">{currentUser.fullName}</p>
                <p className="text-xs text-[#66687A] font-mono tabular-nums truncate">
                  Lvl {currentUser.level} · {currentUser.totalXp} XP
                </p>
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[260px]">
        {/* Mobile Compact Top Header (56px height, optimized down to 320px) */}
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-[#E9EAF0] px-3.5 sm:px-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2 min-h-[44px] whitespace-nowrap shrink-0"
          >
            <StudyDuoBrandMark size={26} />
            <span className="text-base font-bold tracking-tight text-[#242337]">StudyDuo</span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {renderStreakPill(true)}
            <button
              type="button"
              onClick={() => setActivePage('ai')}
              aria-label="Open AI Study Assistant"
              className={`min-h-[44px] min-w-[40px] sm:min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${
                activePage === 'ai' ? 'bg-[#F0EBFF] text-[#7956D8]' : 'text-[#66687A] hover:bg-[#F8F9FC]'
              }`}
            >
              <Sparkles className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setActivePage('notifications')}
              aria-label={`Notifications (${unreadNotificationCount} unread)`}
              className={`relative min-h-[44px] min-w-[40px] sm:min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${
                activePage === 'notifications'
                  ? 'bg-[#F0EBFF] text-[#7956D8]'
                  : 'text-[#66687A] hover:bg-[#F8F9FC]'
              }`}
            >
              <Bell className="h-5 w-5" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-2 right-1.5 sm:right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#7956D8] px-1 text-[10px] font-bold text-white tabular-nums">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Interactive Preview Mode Switcher Strip (non-sticky so it doesn't eat viewport) */}
        {mode === 'preview' && (
          <div className="bg-[#F0EBFF]/75 border-b border-[#7956D8]/15 px-3.5 sm:px-5 lg:px-8 py-2.5">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#242337]">
                <span className="font-semibold text-[#7956D8]">Interactive Preview</span>
                <span aria-hidden="true" className="text-[#88899B] hidden sm:inline">·</span>
                <span className="text-[#66687A] hidden sm:inline">Test duo roles live or sign in to save to Firestore</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-xl bg-white p-0.5 border border-[#E9EAF0]" role="group" aria-label="Switch preview persona">
                  <button
                    type="button"
                    onClick={() => switchPreviewPersona('owner')}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      previewPersona === 'owner'
                        ? 'bg-[#7956D8] text-white'
                        : 'text-[#66687A] hover:text-[#242337]'
                    }`}
                  >
                    Alex (Owner)
                  </button>
                  <button
                    type="button"
                    onClick={() => switchPreviewPersona('partner')}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      previewPersona === 'partner'
                        ? 'bg-[#38A879] text-white'
                        : 'text-[#66687A] hover:text-[#242337]'
                    }`}
                  >
                    Maya (Partner)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={exitPreviewMode}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#E9EAF0] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#242337] hover:bg-[#F8F9FC] transition-colors whitespace-nowrap"
                >
                  <LogIn className="h-3.5 w-3.5 text-[#7956D8]" />
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Scrollable Content */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Fixed 5-Tab Bottom Navigation Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E9EAF0] pb-safe"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          {MOBILE_TABS.map((tabId) => {
            const item = NAV_ITEMS.find((n) => n.id === tabId)!;
            const Icon = item.icon;
            const isActive =
              activePage === tabId ||
              (tabId === 'profile' &&
                ['settings', 'achievements', 'notifications', 'journal', 'analytics', 'groups', 'ai'].includes(
                  activePage
                ));
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => setActivePage(tabId)}
                aria-current={activePage === tabId ? 'page' : undefined}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? 'text-[#7956D8]' : 'text-[#88899B]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className={`text-[10px] sm:text-[11px] leading-none whitespace-nowrap ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <DailyCelebrationOverlay event={celebrationEvent} onDismiss={dismissCelebration} />
      <OfflineIndicator />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
