import React, { Suspense, lazy } from 'react';
import { StudyDuoProvider, useStudyDuo } from './context/StudyDuoContext';
import { AuthOnboardingFlow } from './components/auth/AuthOnboardingFlow';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { ChecklistPage } from './pages/ChecklistPage';
import { GoalsPage } from './pages/GoalsPage';
import { DashboardSkeleton } from './components/ui/Primitives';

const LeaderboardPage = lazy(() =>
  import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage }))
);
const StudyGroupsPage = lazy(() =>
  import('./pages/StudyGroupsPage').then((m) => ({ default: m.StudyGroupsPage }))
);
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const JournalPage = lazy(() =>
  import('./pages/JournalPage').then((m) => ({ default: m.JournalPage }))
);
const AiAssistantPage = lazy(() =>
  import('./pages/AiAssistantPage').then((m) => ({ default: m.AiAssistantPage }))
);
const AchievementsPage = lazy(() =>
  import('./pages/AchievementsPage').then((m) => ({ default: m.AchievementsPage }))
);
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const AvatarStudioPage = lazy(() =>
  import('./pages/AvatarStudioPage').then((m) => ({ default: m.AvatarStudioPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const PageFallback: React.FC = () => <DashboardSkeleton />;

const StudyDuoRouter: React.FC = () => {
  const {
    mode,
    authLoading,
    firebaseUser,
    needsEmailVerification,
    currentUser,
    needsOnboarding,
    showWelcomeChoice,
    activePage,
  } = useStudyDuo();

  if (authLoading && mode === 'live') {
    return (
      <div className="min-h-dvh bg-[#F8F5FF] flex items-center justify-center p-6">
        <div className="w-full max-w-xs rounded-[28px] bg-white border border-[#F0EDF5] p-8 text-center shadow-[0_10px_28px_-12px_rgba(118,81,232,0.12)]">
          <div className="mx-auto mb-4 h-24 w-24 rounded-3xl bg-[#E9DFFF] flex items-center justify-center animate-pulse">
            <span className="text-4xl" aria-hidden="true">🧠</span>
          </div>
          <p className="text-base font-extrabold text-[#20202A]">Loading StudyDuo...</p>
          <p className="mt-1 text-xs text-[#777783]">Preparing your learning duo space</p>
        </div>
      </div>
    );
  }

  if (mode === 'live') {
    if (!firebaseUser || needsEmailVerification || !currentUser || needsOnboarding || showWelcomeChoice) {
      return <AuthOnboardingFlow />;
    }
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'goals':
        return <GoalsPage />;
      case 'checklist':
        return <ChecklistPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'groups':
        return <StudyGroupsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'journal':
        return <JournalPage />;
      case 'ai':
        return <AiAssistantPage />;
      case 'achievements':
        return <AchievementsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'avatar':
        return <AvatarStudioPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
    </AppShell>
  );
};

export default function App() {
  return (
    <StudyDuoProvider>
      <StudyDuoRouter />
    </StudyDuoProvider>
  );
}
