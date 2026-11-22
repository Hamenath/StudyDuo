/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StudyDuoProvider, useStudyDuo } from './context/StudyDuoContext';
import { AppShell, StudyDuoBrandMark } from './components/layout/AppShell';
import {
  AuthScreen,
  EmailVerificationGate,
  OnboardingFlow,
  WelcomeChoiceScreen,
} from './components/auth/AuthOnboardingFlow';
import { DashboardPage } from './pages/DashboardPage';
import { GoalsPage } from './pages/GoalsPage';
import { ChecklistPage } from './pages/ChecklistPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { StudyGroupsPage } from './pages/StudyGroupsPage';
import { JournalPage } from './pages/JournalPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((mod) => ({ default: mod.AnalyticsPage }))
);

const AiAssistantPage = lazy(() =>
  import('./pages/AiAssistantPage').then((mod) => ({ default: mod.AiAssistantPage }))
);

const PageFallback: React.FC = () => (
  <div className="space-y-4 py-4 animate-pulse" aria-label="Loading view">
    <div className="h-8 w-56 rounded-xl bg-[#E9EAF0]" />
    <div className="h-32 w-full rounded-2xl bg-white border border-[#E9EAF0]" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="h-48 rounded-2xl bg-white border border-[#E9EAF0]" />
      <div className="h-48 rounded-2xl bg-white border border-[#E9EAF0]" />
    </div>
  </div>
);

const StudyDuoRouter: React.FC = () => {
  const {
    mode,
    authLoading,
    currentUser,
    needsEmailVerification,
    needsOnboarding,
    showWelcomeChoice,
    activePage,
  } = useStudyDuo();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-6">
        <StudyDuoBrandMark size={44} />
        <p className="mt-4 text-sm font-semibold text-[#242337]">Loading StudyDuo...</p>
        <p className="mt-1 text-xs text-[#66687A]">Syncing your study workspace</p>
      </div>
    );
  }

  if (mode === 'live') {
    if (needsEmailVerification) {
      return <EmailVerificationGate />;
    }
    if (!currentUser) {
      return <AuthScreen />;
    }
    if (needsOnboarding) {
      return <OnboardingFlow />;
    }
    if (showWelcomeChoice) {
      return <WelcomeChoiceScreen />;
    }
  } else if (!currentUser) {
    return <AuthScreen />;
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
        return (
          <Suspense fallback={<PageFallback />}>
            <AnalyticsPage />
          </Suspense>
        );
      case 'journal':
        return <JournalPage />;
      case 'ai':
        return (
          <Suspense fallback={<PageFallback />}>
            <AiAssistantPage />
          </Suspense>
        );
      case 'achievements':
        return <AchievementsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <AppShell>{renderPage()}</AppShell>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <StudyDuoProvider>
        <StudyDuoRouter />
      </StudyDuoProvider>
    </ErrorBoundary>
  );
}
