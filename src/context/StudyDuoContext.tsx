import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, isFirebaseConfigured, OperationType } from '../lib/firebase';
import { createPreviewSeedState } from '../lib/demoData';
import {
  addDaysToDateKey,
  buildCompletionId,
  buildXpTxId,
  calculateGroupStreak,
  calculateIndividualStreak,
  canCompleteTask,
  canEditOfficialTask,
  computeDailyResult,
  DEFAULT_XP_PRESETS,
  evaluateAchievements,
  generateInviteCode,
  getDateKeyInTimezone,
  getInitials,
  getLevelInfo,
} from '../lib/gamification';
import {
  canUserModifyAvatar,
  getDefaultAvatarConfig,
  sanitizeAvatarConfig,
  validateAvatarConfigOwnership,
} from '../lib/avatarCatalog';
import type {
  AchievementUnlock,
  ActivityItem,
  AiSuggestedPhase,
  AvatarConfig,
  DailyCelebrationEvent,
  DailyResult,
  DifficultyLevel,
  Goal,
  Invitation,
  JournalEntry,
  NavPage,
  NotificationItem,
  Participant,
  PersonalNote,
  Phase,
  ResourceLink,
  StudyDay,
  Task,
  TaskCompletion,
  TaskPriority,
  UserPrivateSettings,
  UserPublicProfile,
  XpTransaction,
} from '../types/studyduo';

export interface ToastMessage {
  id: string;
  tone: 'success' | 'error' | 'info';
  message: string;
}

interface CreateGoalInput {
  title: string;
  description: string;
  category: string;
  icon: string;
  startDate: string;
  durationDays: number;
  difficulty: DifficultyLevel;
  timezone: string;
  dailyTargetMinutes: number;
  groupName: string;
}

interface SavePhaseInput {
  id?: string;
  title: string;
  description: string;
  startDay: number;
  endDay: number;
  objectives: string[];
  milestoneTitle: string;
  isPublished: boolean;
}

interface SaveTaskInput {
  id?: string;
  dayId: string;
  dayNumber: number;
  title: string;
  shortDescription: string;
  detailedInstructions: string;
  learningNotes: string;
  youtubeUrl: string;
  chatgptUrl: string;
  resourceLinks: ResourceLink[];
  estimatedMinutes: number;
  xpReward: number;
  priority: TaskPriority;
  isPublished: boolean;
}

interface SaveJournalInput {
  id?: string;
  goalId?: string;
  title: string;
  date: string;
  topic: string;
  notes: string;
  whatILearned: string;
  questions: string;
  challenges: string;
  resources: string;
  isSharedWithOwner: boolean;
}

interface StudyDuoContextValue {
  mode: 'live' | 'preview';
  previewPersona: 'owner' | 'partner';
  switchPreviewPersona: (persona: 'owner' | 'partner') => void;
  enterPreviewMode: () => void;
  exitPreviewMode: () => void;

  authLoading: boolean;
  firebaseUser: FirebaseUser | null;
  needsEmailVerification: boolean;
  currentUser: UserPublicProfile | null;
  privateSettings: UserPrivateSettings | null;
  needsOnboarding: boolean;
  showWelcomeChoice: boolean;
  dismissWelcomeChoice: () => void;

  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
  selectedGoalId: string | null;
  setSelectedGoalId: (goalId: string | null) => void;
  activeGoal: Goal | null;
  pendingInviteCodeFromUrl: string | null;
  clearPendingInviteCodeFromUrl: () => void;

  goals: Goal[];
  participants: Participant[];
  phases: Phase[];
  days: StudyDay[];
  tasks: Task[];
  completions: TaskCompletion[];
  personalNotes: Record<string, PersonalNote>;
  dailyResults: DailyResult[];
  activity: ActivityItem[];
  invitations: Invitation[];
  xpTransactions: XpTransaction[];
  achievements: AchievementUnlock[];
  notifications: NotificationItem[];
  journalEntries: JournalEntry[];
  unreadNotificationCount: number;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (data: {
    fullName: string;
    username: string;
    bio: string;
    preferredCategory: string;
    timezone: string;
    avatarColor: string;
  }) => Promise<void>;
  updateProfile: (patch: Partial<UserPublicProfile>) => Promise<void>;
  saveAvatarConfig: (config: AvatarConfig) => Promise<boolean>;
  updatePrivateSettings: (patch: Partial<UserPrivateSettings>) => Promise<void>;
  deleteAccount: () => Promise<void>;

  // Goal & Roadmap actions
  createGoal: (input: CreateGoalInput) => Promise<string | null>;
  updateGoal: (goalId: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  savePhase: (goalId: string, input: SavePhaseInput) => Promise<void>;
  deletePhase: (goalId: string, phaseId: string) => Promise<void>;
  reorderPhase: (goalId: string, phaseId: string, direction: 'up' | 'down') => Promise<void>;
  approveAiPlanToRoadmap: (goalId: string, phases: AiSuggestedPhase[]) => Promise<void>;

  // Days & Tasks actions
  createStudyDay: (goalId: string, dayNumber: number, title: string, isPublished?: boolean) => Promise<string | null>;
  updateStudyDay: (goalId: string, dayId: string, title: string) => Promise<void>;
  deleteStudyDay: (goalId: string, dayId: string) => Promise<void>;
  toggleDayPublished: (goalId: string, dayId: string, nextPublished: boolean) => Promise<void>;
  toggleRestDay: (goalId: string, dateKey: string) => Promise<void>;
  saveTask: (goalId: string, input: SaveTaskInput) => Promise<void>;
  deleteTask: (goalId: string, dayId: string, taskId: string) => Promise<void>;
  duplicateTask: (goalId: string, task: Task) => Promise<void>;
  archiveTask: (goalId: string, task: Task) => Promise<void>;
  reorderTask: (goalId: string, dayId: string, taskId: string, direction: 'up' | 'down') => Promise<void>;
  completeTask: (goalId: string, task: Task) => Promise<boolean>;
  savePersonalNote: (goalId: string, taskId: string, content: string) => Promise<void>;

  // Invitation actions
  createInvitation: (goalId: string, inviteeEmail?: string) => Promise<Invitation | null>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  acceptInvitationByCode: (code: string) => Promise<boolean>;
  rejectInvitationByCode: (code: string) => Promise<boolean>;

  // Journal, Notifications & Quiz XP
  saveJournalEntry: (input: SaveJournalInput) => Promise<void>;
  deleteJournalEntry: (entryId: string) => Promise<void>;
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  awardQuizXp: (goalId: string, quizKey: string, scoreRatio: number) => Promise<number>;
  nudgePartnerStreak: (goalId: string) => Promise<void>;
  nudgedTodayGoalIds: string[];

  // Daily Completion & Streak Celebration
  celebrationEvent: DailyCelebrationEvent | null;
  dismissCelebration: () => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
}

const StudyDuoContext = createContext<StudyDuoContextValue | null>(null);

function tsToIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export const StudyDuoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialParams = useMemo(() => {
    if (typeof window === 'undefined') return { autostart: false, inviteCode: null };
    const sp = new URLSearchParams(window.location.search);
    return {
      autostart: sp.get('autostart') === '1',
      inviteCode: sp.get('invite')?.trim().toUpperCase() || null,
    };
  }, []);

  const [mode, setMode] = useState<'live' | 'preview'>(() => {
    if (initialParams.autostart) return 'preview';
    try {
      const savedMode = localStorage.getItem('studyduo_mode');
      if (savedMode === 'preview' || savedMode === 'live') return savedMode;
    } catch {
      // fallback
    }
    return 'live';
  });

  const [previewPersona, setPreviewPersona] = useState<'owner' | 'partner'>(() => {
    try {
      const saved = localStorage.getItem('studyduo_preview_persona');
      if (saved === 'owner' || saved === 'partner') return saved;
    } catch {
      // fallback
    }
    return 'owner';
  });

  const [previewState, setPreviewState] = useState(() => {
    try {
      const saved = localStorage.getItem('studyduo_preview_state_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.goals) && parsed.goals.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return createPreviewSeedState();
  });

  const [authLoading, setAuthLoading] = useState(!initialParams.autostart);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [liveUser, setLiveUser] = useState<UserPublicProfile | null>(null);
  const [livePrivate, setLivePrivate] = useState<UserPrivateSettings | null>(null);
  const [showWelcomeChoice, setShowWelcomeChoice] = useState(false);

  const [activePage, setActivePage] = useState<NavPage>(() => {
    if (initialParams.inviteCode) return 'groups';
    try {
      const savedPage = localStorage.getItem('studyduo_active_page') as NavPage | null;
      if (savedPage) return savedPage;
    } catch {
      // fallback
    }
    return 'dashboard';
  });

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(() => {
    if (initialParams.autostart) return 'goal_python_60';
    try {
      const saved = localStorage.getItem('studyduo_selected_goal_id');
      if (saved) return saved;
    } catch {
      // fallback
    }
    return null;
  });

  const [pendingInviteCodeFromUrl, setPendingInviteCodeFromUrl] = useState<string | null>(
    initialParams.inviteCode
  );

  // Automatically persist navigation and active selections
  useEffect(() => {
    try {
      localStorage.setItem('studyduo_mode', mode);
      localStorage.setItem('studyduo_preview_persona', previewPersona);
      localStorage.setItem('studyduo_active_page', activePage);
      if (selectedGoalId) {
        localStorage.setItem('studyduo_selected_goal_id', selectedGoalId);
      }
      if (mode === 'preview') {
        localStorage.setItem('studyduo_preview_state_v1', JSON.stringify(previewState));
      }
    } catch {
      // ignore quota / private mode storage errors
    }
  }, [mode, previewPersona, activePage, selectedGoalId, previewState]);

  // Live Firestore synced slices
  const [liveGoals, setLiveGoals] = useState<Goal[]>([]);
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);
  const [livePhases, setLivePhases] = useState<Phase[]>([]);
  const [liveDays, setLiveDays] = useState<StudyDay[]>([]);
  const [liveTasksByDay, setLiveTasksByDay] = useState<Record<string, Task[]>>({});
  const [liveCompletions, setLiveCompletions] = useState<TaskCompletion[]>([]);
  const [livePersonalNotes, setLivePersonalNotes] = useState<Record<string, PersonalNote>>({});
  const [liveDailyResults, setLiveDailyResults] = useState<DailyResult[]>([]);
  const [liveActivity, setLiveActivity] = useState<ActivityItem[]>([]);
  const [liveInvitations, setLiveInvitations] = useState<Invitation[]>([]);
  const [liveXpTransactions, setLiveXpTransactions] = useState<XpTransaction[]>([]);
  const [liveAchievements, setLiveAchievements] = useState<AchievementUnlock[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([]);
  const [liveJournalEntries, setLiveJournalEntries] = useState<JournalEntry[]>([]);
  const [liveSharedJournalEntries, setLiveSharedJournalEntries] = useState<JournalEntry[]>([]);
  const [celebrationEvent, setCelebrationEvent] = useState<DailyCelebrationEvent | null>(null);
  const [nudgedTodayGoalIds, setNudgedTodayGoalIds] = useState<string[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const completionLocks = useRef<Set<string>>(new Set());

  const dismissCelebration = useCallback(() => {
    setCelebrationEvent(null);
  }, []);

  const showToast = useCallback((message: string, tone: ToastMessage['tone'] = 'success') => {
    const id = makeId('toast');
    setToasts((prev) => [...prev.slice(-3), { id, tone, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ==================== FIREBASE AUTH LISTENER ====================
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setLiveUser(null);
        setLivePrivate(null);
        setLiveGoals([]);
        setAuthLoading(false);
        return;
      }

      if (mode === 'preview' && !initialParams.autostart) {
        setMode('live');
      }

      // Fast non-blocking load: immediately release splash screen
      setAuthLoading(false);

      // Create initial local profile immediately if none exists so user is never trapped in onboarding
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const baseName = fbUser.displayName?.trim() || fbUser.email?.split('@')[0] || 'Learner';
      const slug = baseName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'learner';
      const initialUsername = `${slug}_${fbUser.uid.slice(0, 4).toLowerCase()}`;

      const defaultProfile: UserPublicProfile = {
        uid: fbUser.uid,
        fullName: baseName,
        username: initialUsername,
        avatarColor: '#7956E8',
        avatarInitials: getInitials(baseName),
        avatarConfig: getDefaultAvatarConfig(fbUser.uid),
        photoURL: fbUser.photoURL || '',
        bio: '',
        preferredCategory: 'Programming',
        timezone: tz,
        totalXp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        completedTasksCount: 0,
        completedGoalsCount: 0,
        lastActiveDate: '',
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLiveUser((prev) => prev || defaultProfile);

      try {
        const userRef = doc(db, 'users', fbUser.uid);
        const batch = writeBatch(db);
        batch.set(
          userRef,
          {
            uid: fbUser.uid,
            fullName: baseName,
            username: initialUsername,
            avatarColor: '#7956E8',
            avatarInitials: getInitials(baseName),
            avatarConfig: getDefaultAvatarConfig(fbUser.uid),
            photoURL: fbUser.photoURL || '',
            bio: '',
            preferredCategory: 'Programming',
            timezone: tz,
            totalXp: 0,
            level: 1,
            currentStreak: 0,
            longestStreak: 0,
            completedTasksCount: 0,
            completedGoalsCount: 0,
            onboardingCompleted: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        batch.set(
          doc(db, 'users', fbUser.uid, 'private', 'settings'),
          {
            uid: fbUser.uid,
            email: fbUser.email || 'user@studyduo.app',
            notifyInvites: true,
            notifyPartnerActivity: true,
            notifyDailyWinner: true,
            notifyAchievements: true,
            notifyWeeklySummary: true,
            shareProgressWithPartner: true,
            allowAiJournalContext: false,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await batch.commit();
      } catch (err) {
        console.warn('Initial profile sync queued in background:', err);
      }
    });

    return () => unsub();
  }, [initialParams.autostart, mode]);

  // ==================== LIVE FIRESTORE USER & GLOBAL SUBSCRIPTIONS ====================
  useEffect(() => {
    if (mode !== 'live' || !firebaseUser) return;

    const uid = firebaseUser.uid;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setLiveUser({
              uid: d.uid,
              fullName: d.fullName,
              username: d.username,
              avatarColor: d.avatarColor || '#7956E8',
              avatarInitials: d.avatarInitials || getInitials(d.fullName || 'SD'),
              avatarConfig: sanitizeAvatarConfig(d.avatarConfig, d.uid),
              photoURL: d.photoURL || '',
              bio: d.bio || '',
              preferredCategory: d.preferredCategory || 'Programming',
              timezone: d.timezone || 'UTC',
              totalXp: Number(d.totalXp || 0),
              level: Number(d.level || 1),
              currentStreak: Number(d.currentStreak || 0),
              longestStreak: Number(d.longestStreak || 0),
              completedTasksCount: Number(d.completedTasksCount || 0),
              completedGoalsCount: Number(d.completedGoalsCount || 0),
              lastActiveDate: d.lastActiveDate || '',
              onboardingCompleted: Boolean(d.onboardingCompleted),
              createdAt: tsToIso(d.createdAt),
              updatedAt: tsToIso(d.updatedAt),
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid, 'private', 'settings'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setLivePrivate({
              uid: d.uid,
              email: d.email,
              notifyInvites: Boolean(d.notifyInvites),
              notifyPartnerActivity: Boolean(d.notifyPartnerActivity),
              notifyDailyWinner: Boolean(d.notifyDailyWinner),
              notifyAchievements: Boolean(d.notifyAchievements),
              notifyWeeklySummary: Boolean(d.notifyWeeklySummary),
              shareProgressWithPartner: Boolean(d.shareProgressWithPartner),
              allowAiJournalContext: Boolean(d.allowAiJournalContext),
              updatedAt: tsToIso(d.updatedAt),
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/private/settings`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'goals'), where('participantIds', 'array-contains', uid)),
        (snap) => {
          const list: Goal[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              ownerId: d.ownerId,
              participantIds: d.participantIds || [],
              title: d.title,
              description: d.description || '',
              category: d.category,
              icon: d.icon || 'code',
              startDate: d.startDate,
              durationDays: Number(d.durationDays || 30),
              targetDate: d.targetDate,
              difficulty: d.difficulty,
              timezone: d.timezone || 'UTC',
              dailyTargetMinutes: Number(d.dailyTargetMinutes || 45),
              maxParticipants: Number(d.maxParticipants || 2),
              groupName: d.groupName || d.title,
              groupStreak: Number(d.groupStreak || 0),
              longestGroupStreak: Number(d.longestGroupStreak || 0),
              restDays: d.restDays || [],
              status: d.status || 'active',
              createdAt: tsToIso(d.createdAt),
              updatedAt: tsToIso(d.updatedAt),
            };
          });
          setLiveGoals(list);
          setSelectedGoalId((prev) => {
            const saved = (() => {
              try {
                return localStorage.getItem('studyduo_selected_goal_id');
              } catch {
                return null;
              }
            })();
            if (prev && list.some((g) => g.id === prev)) return prev;
            if (saved && list.some((g) => g.id === saved)) return saved;
            return list[0]?.id ?? null;
          });
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'goals')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'xpTransactions'), where('userId', '==', uid)),
        (snap) => {
          setLiveXpTransactions(
            snap.docs.map((s) => {
              const d = s.data();
              return {
                id: d.id,
                userId: d.userId,
                goalId: d.goalId,
                sourceType: d.sourceType,
                sourceId: d.sourceId,
                xpAmount: Number(d.xpAmount),
                dateKey: d.dateKey,
                label: d.label,
                createdAt: tsToIso(d.createdAt),
              };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'xpTransactions')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'achievements'), where('userId', '==', uid)),
        (snap) => {
          setLiveAchievements(
            snap.docs.map((s) => {
              const d = s.data();
              return {
                id: d.id,
                userId: d.userId,
                achievementKey: d.achievementKey,
                unlockedAt: tsToIso(d.unlockedAt),
              };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'achievements')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('recipientId', '==', uid)),
        (snap) => {
          const items: NotificationItem[] = snap.docs
            .map((s) => {
              const d = s.data();
              return {
                id: d.id,
                recipientId: d.recipientId,
                senderId: d.senderId,
                goalId: d.goalId,
                type: d.type,
                title: d.title,
                body: d.body,
                isRead: Boolean(d.isRead),
                createdAt: tsToIso(d.createdAt),
              };
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setLiveNotifications(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'journalEntries'), where('userId', '==', uid)),
        (snap) => {
          const items: JournalEntry[] = snap.docs
            .map((s) => {
              const d = s.data();
              return {
                id: d.id,
                userId: d.userId,
                goalId: d.goalId || '',
                sharedWithOwnerId: d.sharedWithOwnerId || '',
                isSharedWithOwner: Boolean(d.isSharedWithOwner),
                title: d.title,
                date: d.date,
                topic: d.topic || '',
                notes: d.notes || '',
                whatILearned: d.whatILearned || '',
                questions: d.questions || '',
                challenges: d.challenges || '',
                resources: d.resources || '',
                createdAt: tsToIso(d.createdAt),
                updatedAt: tsToIso(d.updatedAt),
              };
            })
            .sort((a, b) => b.date.localeCompare(a.date));
          setLiveJournalEntries(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'journalEntries')
      )
    );

    // Opt-in partner journal entries explicitly shared with this goal owner
    unsubs.push(
      onSnapshot(
        query(
          collection(db, 'journalEntries'),
          where('sharedWithOwnerId', '==', uid),
          where('isSharedWithOwner', '==', true)
        ),
        (snap) => {
          const sharedItems: JournalEntry[] = snap.docs
            .map((s) => {
              const d = s.data();
              return {
                id: d.id,
                userId: d.userId,
                goalId: d.goalId || '',
                sharedWithOwnerId: d.sharedWithOwnerId || '',
                isSharedWithOwner: Boolean(d.isSharedWithOwner),
                title: d.title,
                date: d.date,
                topic: d.topic || '',
                notes: d.notes || '',
                whatILearned: d.whatILearned || '',
                questions: d.questions || '',
                challenges: d.challenges || '',
                resources: d.resources || '',
                createdAt: tsToIso(d.createdAt),
                updatedAt: tsToIso(d.updatedAt),
              };
            })
            .sort((a, b) => b.date.localeCompare(a.date));
          setLiveSharedJournalEntries(sharedItems);
        },
        (err) => {
          console.warn('Shared partner journal listener skipped (index may be building):', err?.message);
          setLiveSharedJournalEntries([]);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'invitations'), where('inviterId', '==', uid)),
        (snap) => {
          setLiveInvitations(
            snap.docs.map((s) => {
              const d = s.data();
              return {
                id: d.id,
                code: d.code,
                goalId: d.goalId,
                goalTitle: d.goalTitle,
                inviterId: d.inviterId,
                inviterName: d.inviterName,
                inviteeEmail: d.inviteeEmail || '',
                acceptedBy: d.acceptedBy || '',
                status: d.status,
                expiresAt: tsToIso(d.expiresAt),
                createdAt: tsToIso(d.createdAt),
                updatedAt: tsToIso(d.updatedAt),
              };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'invitations')
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [firebaseUser, mode]);

  // ==================== ACTIVE GOAL SUBCOLLECTION LISTENERS (LIVE MODE) ====================
  useEffect(() => {
    if (mode !== 'live' || !firebaseUser || !selectedGoalId) {
      setLiveParticipants([]);
      setLivePhases([]);
      setLiveDays([]);
      setLiveTasksByDay({});
      setLiveCompletions([]);
      setLivePersonalNotes({});
      setLiveDailyResults([]);
      setLiveActivity([]);
      return;
    }

    const goalId = selectedGoalId;
    const uid = firebaseUser.uid;
    const activeGoalObj = liveGoals.find((g) => g.id === goalId);
    const isOwner = activeGoalObj?.ownerId === uid;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'goals', goalId, 'participants'),
        (snap) => {
          setLiveParticipants(
            snap.docs.map((s) => {
              const d = s.data();
              return {
                uid: d.uid,
                goalId: d.goalId,
                role: d.role,
                displayName: d.displayName,
                username: d.username,
                avatarColor: d.avatarColor || '#7956E8',
                avatarInitials: d.avatarInitials || getInitials(d.displayName || 'SD'),
                avatarConfig: sanitizeAvatarConfig(d.avatarConfig, d.uid),
                goalXp: Number(d.goalXp || 0),
                completedTasksCount: Number(d.completedTasksCount || 0),
                daysCompleted: Number(d.daysCompleted || 0),
                currentStreak: Number(d.currentStreak || 0),
                longestStreak: Number(d.longestStreak || 0),
                joinedAt: tsToIso(d.joinedAt),
              };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `goals/${goalId}/participants`)
      )
    );

    const phasesQuery = isOwner
      ? collection(db, 'goals', goalId, 'phases')
      : query(collection(db, 'goals', goalId, 'phases'), where('isPublished', '==', true));
    unsubs.push(
      onSnapshot(
        phasesQuery,
        (snap) => {
          const items: Phase[] = snap.docs
            .map((s) => {
              const d = s.data();
              return {
                id: d.id,
                goalId: d.goalId,
                ownerId: d.ownerId,
                title: d.title,
                description: d.description || '',
                startDay: Number(d.startDay),
                endDay: Number(d.endDay),
                order: Number(d.order || 0),
                objectives: d.objectives || [],
                milestoneTitle: d.milestoneTitle || '',
                isPublished: Boolean(d.isPublished),
                createdAt: tsToIso(d.createdAt),
                updatedAt: tsToIso(d.updatedAt),
              };
            })
            .sort((a, b) => a.order - b.order || a.startDay - b.startDay);
          setLivePhases(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `goals/${goalId}/phases`)
      )
    );

    const daysQuery = isOwner
      ? collection(db, 'goals', goalId, 'days')
      : query(collection(db, 'goals', goalId, 'days'), where('isPublished', '==', true));
    unsubs.push(
      onSnapshot(
        daysQuery,
        (snap) => {
          const items: StudyDay[] = snap.docs
            .map((s) => {
              const d = s.data();
              return {
                id: d.id,
                goalId: d.goalId,
                ownerId: d.ownerId,
                dayNumber: Number(d.dayNumber),
                date: d.date,
                title: d.title,
                phaseId: d.phaseId || '',
                isPublished: Boolean(d.isPublished),
                isRestDay: Boolean(d.isRestDay),
                createdAt: tsToIso(d.createdAt),
                updatedAt: tsToIso(d.updatedAt),
              };
            })
            .sort((a, b) => a.dayNumber - b.dayNumber);
          setLiveDays(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `goals/${goalId}/days`)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'goals', goalId, 'completions'),
        (snap) => {
          setLiveCompletions(
            snap.docs.map((s) => {
              const d = s.data();
              return {
                id: d.id,
                goalId: d.goalId,
                dayId: d.dayId,
                taskId: d.taskId,
                userId: d.userId,
                dateKey: d.dateKey,
                xpAwarded: Number(d.xpAwarded),
                estimatedMinutes: Number(d.estimatedMinutes || 0),
                completedAt: tsToIso(d.completedAt),
              };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `goals/${goalId}/completions`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'goals', goalId, 'personalNotes'), where('userId', '==', uid)),
        (snap) => {
          const map: Record<string, PersonalNote> = {};
          snap.docs.forEach((s) => {
            const d = s.data();
            map[s.id] = {
              userId: d.userId,
              taskId: d.taskId,
              content: d.content || '',
              updatedAt: tsToIso(d.updatedAt),
            };
          });
          setLivePersonalNotes(map);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `goals/${goalId}/personalNotes`)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'goals', goalId, 'dailyResults'),
        (snap) => {
          setLiveDailyResults(
            snap.docs.map((s) => {
              const d = s.data();
              return {
                dateKey: d.dateKey,
                goalId: d.goalId,
                scores: d.scores || {},
                winnerIds: d.winnerIds || [],
                isTie: Boolean(d.isTie),
                isClosed: Boolean(d.isClosed),
                updatedAt: tsToIso(d.updatedAt),
              };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `goals/${goalId}/dailyResults`)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'goals', goalId, 'activity'),
        (snap) => {
          const items: ActivityItem[] = snap.docs
            .map((s) => {
              const d = s.data();
              return {
                id: d.id,
                goalId: d.goalId,
                actorId: d.actorId,
                actorName: d.actorName,
                type: d.type,
                message: d.message,
                xpDelta: d.xpDelta,
                createdAt: tsToIso(d.createdAt),
              };
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setLiveActivity(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `goals/${goalId}/activity`)
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [firebaseUser, liveGoals, mode, selectedGoalId]);

  // Listen to tasks for each study day of the active goal in live mode
  useEffect(() => {
    if (mode !== 'live' || !firebaseUser || !selectedGoalId || liveDays.length === 0) {
      setLiveTasksByDay({});
      return;
    }
    const goalId = selectedGoalId;
    const uid = firebaseUser.uid;
    const isOwner = liveGoals.find((g) => g.id === goalId)?.ownerId === uid;

    const unsubs = liveDays.map((day) => {
      const q = isOwner
        ? collection(db, 'goals', goalId, 'days', day.id, 'tasks')
        : query(collection(db, 'goals', goalId, 'days', day.id, 'tasks'), where('isPublished', '==', true));

      return onSnapshot(
        q,
        (snap) => {
          const dayTasks: Task[] = snap.docs
            .map((s) => {
              const d = s.data();
              return {
                id: d.id,
                goalId: d.goalId,
                dayId: d.dayId,
                dayNumber: Number(d.dayNumber),
                ownerId: d.ownerId,
                title: d.title,
                shortDescription: d.shortDescription || '',
                detailedInstructions: d.detailedInstructions || '',
                learningNotes: d.learningNotes || '',
                youtubeUrl: d.youtubeUrl || '',
                chatgptUrl: d.chatgptUrl || '',
                resourceLinks: d.resourceLinks || [],
                estimatedMinutes: Number(d.estimatedMinutes || 20),
                xpReward: Number(d.xpReward || 20),
                priority: d.priority || 'medium',
                order: Number(d.order || 0),
                isPublished: Boolean(d.isPublished),
                isArchived: Boolean(d.isArchived),
                createdAt: tsToIso(d.createdAt),
                updatedAt: tsToIso(d.updatedAt),
              };
            })
            .sort((a, b) => a.order - b.order);
          setLiveTasksByDay((prev) => ({ ...prev, [day.id]: dayTasks }));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `goals/${goalId}/days/${day.id}/tasks`)
      );
    });

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [firebaseUser, liveDays, liveGoals, mode, selectedGoalId]);

  // ==================== DERIVED ACTIVE STATE (LIVE VS PREVIEW) ====================
  const currentUser = useMemo<UserPublicProfile | null>(() => {
    if (mode === 'preview') {
      return previewPersona === 'owner' ? previewState.ownerUser : previewState.partnerUser;
    }
    return liveUser;
  }, [liveUser, mode, previewPersona, previewState.ownerUser, previewState.partnerUser]);

  const privateSettings = useMemo<UserPrivateSettings | null>(() => {
    if (mode === 'preview') {
      return {
        ...previewState.privateSettings,
        uid: currentUser?.uid || previewState.ownerUser.uid,
        email: previewPersona === 'owner' ? 'alex.chen@studyduo.app' : 'maya.lin@studyduo.app',
      };
    }
    return livePrivate;
  }, [currentUser?.uid, livePrivate, mode, previewPersona, previewState]);

  const goals = mode === 'preview' ? previewState.goals : liveGoals;
  const effectiveGoalId = selectedGoalId && goals.some((g) => g.id === selectedGoalId)
    ? selectedGoalId
    : goals[0]?.id ?? null;

  const activeGoal = useMemo(
    () => goals.find((g) => g.id === effectiveGoalId) ?? null,
    [effectiveGoalId, goals]
  );

  const participants = useMemo(() => {
    if (!effectiveGoalId) return [];
    return mode === 'preview'
      ? previewState.participantsByGoal[effectiveGoalId] || []
      : liveParticipants;
  }, [effectiveGoalId, liveParticipants, mode, previewState.participantsByGoal]);

  const phases = useMemo(() => {
    if (!effectiveGoalId) return [];
    const list =
      mode === 'preview'
        ? previewState.phasesByGoal[effectiveGoalId] || []
        : livePhases;
    if (!currentUser || !activeGoal) return list;
    return activeGoal.ownerId === currentUser.uid ? list : list.filter((p) => p.isPublished);
  }, [activeGoal, currentUser, effectiveGoalId, livePhases, mode, previewState.phasesByGoal]);

  const days = useMemo(() => {
    if (!effectiveGoalId) return [];
    const list =
      mode === 'preview'
        ? previewState.daysByGoal[effectiveGoalId] || []
        : liveDays;
    if (!currentUser || !activeGoal) return list;
    return activeGoal.ownerId === currentUser.uid ? list : list.filter((d) => d.isPublished);
  }, [activeGoal, currentUser, effectiveGoalId, liveDays, mode, previewState.daysByGoal]);

  const tasks = useMemo(() => {
    if (!effectiveGoalId) return [];
    const raw =
      mode === 'preview'
        ? previewState.tasksByGoal[effectiveGoalId] || []
        : Object.values(liveTasksByDay).flat();
    const visible =
      !currentUser || !activeGoal || activeGoal.ownerId === currentUser.uid
        ? raw
        : raw.filter((t) => t.isPublished && !t.isArchived);
    return visible.sort((a, b) => a.dayNumber - b.dayNumber || a.order - b.order);
  }, [activeGoal, currentUser, effectiveGoalId, liveTasksByDay, mode, previewState.tasksByGoal]);

  const completions = useMemo(() => {
    if (!effectiveGoalId) return [];
    return mode === 'preview'
      ? previewState.completionsByGoal[effectiveGoalId] || []
      : liveCompletions;
  }, [effectiveGoalId, liveCompletions, mode, previewState.completionsByGoal]);

  const personalNotes = useMemo(() => {
    if (!effectiveGoalId) return {};
    return mode === 'preview'
      ? previewState.personalNotesByGoal[effectiveGoalId] || {}
      : livePersonalNotes;
  }, [effectiveGoalId, livePersonalNotes, mode, previewState.personalNotesByGoal]);

  const dailyResults = useMemo(() => {
    if (!effectiveGoalId) return [];
    return mode === 'preview'
      ? previewState.dailyResultsByGoal[effectiveGoalId] || []
      : liveDailyResults;
  }, [effectiveGoalId, liveDailyResults, mode, previewState.dailyResultsByGoal]);

  const activity = useMemo(() => {
    if (!effectiveGoalId) return [];
    return mode === 'preview'
      ? previewState.activityByGoal[effectiveGoalId] || []
      : liveActivity;
  }, [effectiveGoalId, liveActivity, mode, previewState.activityByGoal]);

  const invitations = mode === 'preview' ? previewState.invitations : liveInvitations;
  const xpTransactions = mode === 'preview' ? previewState.xpTransactions : liveXpTransactions;
  const achievements = useMemo(() => {
    const raw = mode === 'preview' ? previewState.achievements : liveAchievements;
    return currentUser ? raw.filter((a) => a.userId === currentUser.uid) : [];
  }, [currentUser, liveAchievements, mode, previewState.achievements]);

  const notifications = useMemo(() => {
    const raw = mode === 'preview' ? previewState.notifications : liveNotifications;
    return currentUser ? raw.filter((n) => n.recipientId === currentUser.uid) : [];
  }, [currentUser, liveNotifications, mode, previewState.notifications]);

  const journalEntries = useMemo(() => {
    if (!currentUser) return [];
    if (mode === 'preview') {
      return previewState.journalEntries.filter(
        (e) => e.userId === currentUser.uid || (e.isSharedWithOwner && e.sharedWithOwnerId === currentUser.uid)
      );
    }
    const mergedMap = new Map<string, JournalEntry>();
    for (const e of liveJournalEntries) mergedMap.set(e.id, e);
    for (const e of liveSharedJournalEntries) mergedMap.set(e.id, e);
    return Array.from(mergedMap.values())
      .filter((e) => e.userId === currentUser.uid || (e.isSharedWithOwner && e.sharedWithOwnerId === currentUser.uid))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [currentUser, liveJournalEntries, liveSharedJournalEntries, mode, previewState.journalEntries]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const needsEmailVerification = Boolean(mode === 'live' && firebaseUser && !firebaseUser.emailVerified);
  const needsOnboarding = Boolean(mode === 'live' && firebaseUser && firebaseUser.emailVerified && liveUser && !liveUser.onboardingCompleted);

  // ==================== MODE SWITCHERS ====================
  const enterPreviewMode = useCallback(() => {
    setMode('preview');
    setPreviewPersona('owner');
    setSelectedGoalId((prev) => prev || previewState.goals[0]?.id || null);
    setActivePage('dashboard');
    showToast('Entered Interactive Preview — explore all 12 screens or switch Owner/Partner roles.', 'info');
  }, [previewState.goals, showToast]);

  const exitPreviewMode = useCallback(() => {
    setMode('live');
    setActivePage('dashboard');
  }, []);

  const switchPreviewPersona = useCallback(
    (persona: 'owner' | 'partner') => {
      setPreviewPersona(persona);
      showToast(
        persona === 'owner'
          ? 'Viewing as Alex Chen (Goal Owner — full roadmap & task controls)'
          : 'Viewing as Maya Lin (Study Partner — read-only roadmap, independent completions)',
        'info'
      );
    },
    [showToast]
  );

  // ==================== AUTH ACTIONS ====================
  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) {
      showToast('Firebase is not configured yet. Use Interactive Preview or configure Firebase.', 'error');
      return;
    }
    try {
      setMode('live');
      await signInWithPopup(auth, googleProvider);
      showToast('Signed in with Google.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (msg.includes('popup-closed-by-user')) {
        showToast('Sign-in popup was closed before completing.', 'info');
      } else {
        showToast(msg, 'error');
      }
      throw err;
    }
  }, [showToast]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        setMode('live');
        await signInWithEmailAndPassword(auth, email.trim(), password);
        showToast('Signed in successfully.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sign-in failed.';
        if (msg.includes('operation-not-allowed')) {
          showToast(
            'Email/Password provider is not enabled yet in Firebase Console. Sign in with Google or enable Email/Password under Authentication > Sign-in method.',
            'error'
          );
        } else if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
          showToast('Invalid email or password. Please check your credentials.', 'error');
        } else {
          showToast(msg, 'error');
        }
        throw err;
      }
    },
    [showToast]
  );

  const registerWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        setMode('live');
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(cred.user);
        showToast(
          `Account created for ${fullName}! Check your email inbox to verify your address before saving study data.`,
          'info'
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Registration failed.';
        if (msg.includes('operation-not-allowed')) {
          showToast(
            'Email/Password sign-up requires enabling Email/Password in your Firebase Console (Authentication > Sign-in method). Google Sign-In is ready immediately!',
            'error'
          );
        } else if (msg.includes('email-already-in-use')) {
          showToast('That email is already registered. Try signing in instead.', 'error');
        } else {
          showToast(msg, 'error');
        }
        throw err;
      }
    },
    [showToast]
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      try {
        await sendPasswordResetEmail(auth, email.trim());
        showToast('Password reset link sent to your email.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to send reset email.';
        showToast(msg, 'error');
        throw err;
      }
    },
    [showToast]
  );

  const logout = useCallback(async () => {
    if (mode === 'preview') {
      setMode('live');
      setActivePage('dashboard');
      showToast('Exited preview mode.', 'info');
      return;
    }
    await signOut(auth);
    setActivePage('dashboard');
    showToast('Signed out of StudyDuo.', 'info');
  }, [mode, showToast]);

  const completeOnboarding = useCallback(
    async (data: {
      fullName: string;
      username: string;
      bio: string;
      preferredCategory: string;
      timezone: string;
      avatarColor: string;
    }) => {
      const fallbackProfile: UserPublicProfile = {
        uid: firebaseUser?.uid || 'guest-user',
        fullName: data.fullName.trim(),
        username: data.username.trim(),
        bio: data.bio.trim(),
        preferredCategory: data.preferredCategory,
        timezone: data.timezone,
        avatarColor: data.avatarColor,
        avatarInitials: getInitials(data.fullName),
        avatarConfig: getDefaultAvatarConfig(firebaseUser?.uid || 'guest-user'),
        photoURL: firebaseUser?.photoURL || '',
        totalXp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        completedTasksCount: 0,
        completedGoalsCount: 0,
        lastActiveDate: '',
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (mode === 'preview' || !firebaseUser) {
        setLiveUser(fallbackProfile);
        setShowWelcomeChoice(false);
        setActivePage('dashboard');
        return;
      }

      const uid = firebaseUser.uid;
      try {
        const userRef = doc(db, 'users', uid);
        const updatePayload = {
          fullName: data.fullName.trim(),
          username: data.username.trim(),
          bio: data.bio.trim(),
          preferredCategory: data.preferredCategory,
          timezone: data.timezone,
          avatarColor: data.avatarColor,
          avatarInitials: getInitials(data.fullName),
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
        };

        const batch = writeBatch(db);
        batch.set(
          userRef,
          {
            uid,
            ...updatePayload,
            avatarConfig: getDefaultAvatarConfig(uid),
            photoURL: firebaseUser.photoURL || '',
            totalXp: 0,
            level: 1,
            currentStreak: 0,
            longestStreak: 0,
            completedTasksCount: 0,
            completedGoalsCount: 0,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        batch.set(
          doc(db, 'users', uid, 'private', 'settings'),
          {
            uid,
            email: firebaseUser.email || 'user@studyduo.app',
            notifyInvites: true,
            notifyPartnerActivity: true,
            notifyDailyWinner: true,
            notifyAchievements: true,
            notifyWeeklySummary: true,
            shareProgressWithPartner: true,
            allowAiJournalContext: false,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await batch.commit();

        setLiveUser((prev) =>
          prev
            ? { ...prev, ...updatePayload, updatedAt: new Date().toISOString() }
            : fallbackProfile
        );
        setShowWelcomeChoice(false);
        setActivePage('dashboard');
        showToast('Profile ready! Welcome to StudyDuo.');
      } catch (err) {
        console.warn('Firestore online sync deferred, applying profile locally:', err);
        setLiveUser(fallbackProfile);
        setShowWelcomeChoice(false);
        setActivePage('dashboard');
        showToast('Profile saved! Welcome to StudyDuo.');
      }
    },
    [firebaseUser, mode, showToast]
  );

  const updateProfile = useCallback(
    async (patch: Partial<UserPublicProfile>) => {
      if (!currentUser) return;
      const initials = patch.fullName ? getInitials(patch.fullName) : currentUser.avatarInitials;
      if (mode === 'preview') {
        setPreviewState((prev) => {
          const nextParticipantsByGoal = { ...prev.participantsByGoal };
          for (const gId of Object.keys(nextParticipantsByGoal)) {
            nextParticipantsByGoal[gId] = nextParticipantsByGoal[gId].map((p) =>
              p.uid === currentUser.uid
                ? {
                    ...p,
                    ...(patch.fullName !== undefined ? { displayName: patch.fullName.trim(), avatarInitials: initials } : {}),
                    ...(patch.username !== undefined ? { username: patch.username.trim() } : {}),
                    ...(patch.avatarColor !== undefined ? { avatarColor: patch.avatarColor } : {}),
                  }
                : p
            );
          }
          return {
            ...prev,
            ownerUser:
              previewPersona === 'owner'
                ? { ...prev.ownerUser, ...patch, avatarInitials: initials, updatedAt: new Date().toISOString() }
                : prev.ownerUser,
            partnerUser:
              previewPersona === 'partner'
                ? { ...prev.partnerUser, ...patch, avatarInitials: initials, updatedAt: new Date().toISOString() }
                : prev.partnerUser,
            participantsByGoal: nextParticipantsByGoal,
          };
        });
        showToast('Profile updated.');
        return;
      }
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          ...(patch.fullName !== undefined ? { fullName: patch.fullName.trim(), avatarInitials: initials } : {}),
          ...(patch.username !== undefined ? { username: patch.username.trim() } : {}),
          ...(patch.bio !== undefined ? { bio: patch.bio.trim() } : {}),
          ...(patch.preferredCategory !== undefined ? { preferredCategory: patch.preferredCategory } : {}),
          ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
          ...(patch.avatarColor !== undefined ? { avatarColor: patch.avatarColor } : {}),
          updatedAt: serverTimestamp(),
        });
        // Keep shared goal participant cards in sync with updated display identity
        const participantPatch: Record<string, string> = {};
        if (patch.fullName !== undefined) {
          participantPatch.displayName = patch.fullName.trim();
          participantPatch.avatarInitials = initials;
        }
        if (patch.username !== undefined) participantPatch.username = patch.username.trim();
        if (patch.avatarColor !== undefined) participantPatch.avatarColor = patch.avatarColor;
        if (Object.keys(participantPatch).length > 0 && liveGoals.length > 0) {
          await Promise.allSettled(
            liveGoals.map((g) => updateDoc(doc(db, 'goals', g.id, 'participants', currentUser.uid), participantPatch))
          );
        }
        showToast('Profile updated.');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    },
    [currentUser, liveGoals, mode, previewPersona, showToast]
  );

  const saveAvatarConfig = useCallback(
    async (config: AvatarConfig): Promise<boolean> => {
      if (!currentUser) return false;
      const actingUid = mode === 'live' ? firebaseUser?.uid : currentUser.uid;
      if (!canUserModifyAvatar(actingUid, currentUser.uid)) {
        showToast('You can only customize your own avatar.', 'error');
        return false;
      }

      const validation = validateAvatarConfigOwnership(
        config,
        {
          level: currentUser.level,
          currentStreak: currentUser.currentStreak,
          longestStreak: currentUser.longestStreak,
          completedTasksCount: currentUser.completedTasksCount,
          unlockedAchievementKeys: achievements.map((a) => a.achievementKey),
        },
        currentUser.uid
      );

      if (!validation.valid) {
        const firstLocked = validation.lockedItems[0];
        showToast(
          `Locked item "${firstLocked.label}": ${firstLocked.requirement}.`,
          'error'
        );
        return false;
      }

      const cleanConfig = validation.sanitizedConfig;

      if (mode === 'preview') {
        setPreviewState((prev) => {
          const nextParticipantsByGoal = { ...prev.participantsByGoal };
          for (const gId of Object.keys(nextParticipantsByGoal)) {
            nextParticipantsByGoal[gId] = nextParticipantsByGoal[gId].map((p) =>
              p.uid === currentUser.uid ? { ...p, avatarConfig: cleanConfig } : p
            );
          }
          return {
            ...prev,
            ownerUser:
              previewPersona === 'owner'
                ? { ...prev.ownerUser, avatarConfig: cleanConfig, updatedAt: new Date().toISOString() }
                : prev.ownerUser,
            partnerUser:
              previewPersona === 'partner'
                ? { ...prev.partnerUser, avatarConfig: cleanConfig, updatedAt: new Date().toISOString() }
                : prev.partnerUser,
            participantsByGoal: nextParticipantsByGoal,
          };
        });
        showToast('Avatar look saved!');
        return true;
      }

      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          avatarConfig: cleanConfig,
          updatedAt: serverTimestamp(),
        });
        if (liveGoals.length > 0) {
          await Promise.allSettled(
            liveGoals.map((g) =>
              updateDoc(doc(db, 'goals', g.id, 'participants', currentUser.uid), {
                avatarConfig: cleanConfig,
              })
            )
          );
        }
        showToast('Avatar saved across your profile and study duo!');
        return true;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
        return false;
      }
    },
    [achievements, currentUser, firebaseUser?.uid, liveGoals, mode, previewPersona, showToast]
  );

  const updatePrivateSettings = useCallback(
    async (patch: Partial<UserPrivateSettings>) => {
      if (!currentUser) return;
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          privateSettings: { ...prev.privateSettings, ...patch, updatedAt: new Date().toISOString() },
        }));
        showToast('Preferences saved.');
        return;
      }
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'private', 'settings'), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
        showToast('Preferences saved.');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/private/settings`);
      }
    },
    [currentUser, mode, showToast]
  );

  const deleteAccount = useCallback(async () => {
    if (mode === 'preview') {
      setMode('live');
      showToast('Preview session cleared.', 'info');
      return;
    }
    if (!firebaseUser) return;
    try {
      const uid = firebaseUser.uid;
      await deleteDoc(doc(db, 'users', uid, 'private', 'settings'));
      await deleteDoc(doc(db, 'users', uid));
      await deleteUser(firebaseUser);
      showToast('Account permanently deleted.', 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to delete account.';
      showToast(
        msg.includes('requires-recent-login')
          ? 'Please sign out and sign back in before deleting your account.'
          : msg,
        'error'
      );
    }
  }, [firebaseUser, mode, showToast]);

  // ==================== GOAL & ROADMAP ACTIONS ====================
  const createGoal = useCallback(
    async (input: CreateGoalInput): Promise<string | null> => {
      if (!currentUser) return null;
      const goalId = makeId('goal');
      const targetDate = addDaysToDateKey(input.startDate, Math.max(0, input.durationDays - 1));
      const nowIso = new Date().toISOString();
      const newGoal: Goal = {
        id: goalId,
        ownerId: currentUser.uid,
        participantIds: [currentUser.uid],
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        icon: input.icon || 'code',
        startDate: input.startDate,
        durationDays: input.durationDays,
        targetDate,
        difficulty: input.difficulty,
        timezone: input.timezone,
        dailyTargetMinutes: input.dailyTargetMinutes,
        maxParticipants: 2,
        groupName: input.groupName.trim() || `${input.title.trim()} Duo`,
        groupStreak: 0,
        longestGroupStreak: 0,
        restDays: [],
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const ownerParticipant: Participant = {
        uid: currentUser.uid,
        goalId,
        role: 'owner',
        displayName: currentUser.fullName,
        username: currentUser.username,
        avatarColor: currentUser.avatarColor,
        avatarInitials: currentUser.avatarInitials,
        avatarConfig: sanitizeAvatarConfig(currentUser.avatarConfig, currentUser.uid),
        goalXp: 0,
        completedTasksCount: 0,
        daysCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        joinedAt: nowIso,
      };
      const day1Id = 'day_01';
      const day1: StudyDay = {
        id: day1Id,
        goalId,
        ownerId: currentUser.uid,
        dayNumber: 1,
        date: input.startDate,
        title: 'Day 1 Checklist',
        isPublished: true,
        isRestDay: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          goals: [newGoal, ...prev.goals],
          participantsByGoal: { ...prev.participantsByGoal, [goalId]: [ownerParticipant] },
          phasesByGoal: { ...prev.phasesByGoal, [goalId]: [] },
          daysByGoal: { ...prev.daysByGoal, [goalId]: [day1] },
          tasksByGoal: { ...prev.tasksByGoal, [goalId]: [] },
          completionsByGoal: { ...prev.completionsByGoal, [goalId]: [] },
          dailyResultsByGoal: { ...prev.dailyResultsByGoal, [goalId]: [] },
          activityByGoal: { ...prev.activityByGoal, [goalId]: [] },
        }));
        setSelectedGoalId(goalId);
        setShowWelcomeChoice(false);
        showToast(`Created goal "${newGoal.title}"! Add tasks manually or invite your partner.`);
        return goalId;
      }

      try {
        setLiveGoals((prev) => [newGoal, ...prev.filter((g) => g.id !== goalId)]);
        setSelectedGoalId(goalId);
        setShowWelcomeChoice(false);
        showToast(`Created goal "${newGoal.title}"!`);

        // Perform Firestore writes with a 3.5s timeout so sluggish network never stalls the UI
        const syncPromise = Promise.all([
          setDoc(doc(db, 'goals', goalId), {
            ...newGoal,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          setDoc(doc(db, 'goals', goalId, 'participants', currentUser.uid), {
            ...ownerParticipant,
            joinedAt: serverTimestamp(),
          }),
          setDoc(doc(db, 'goals', goalId, 'days', day1Id), {
            ...day1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        ]);

        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));
        await Promise.race([syncPromise, timeoutPromise]);
        return goalId;
      } catch (err) {
        console.warn('Firestore sync deferred, creating goal locally:', err);
        setLiveGoals((prev) => [newGoal, ...prev.filter((g) => g.id !== goalId)]);
        setSelectedGoalId(goalId);
        setShowWelcomeChoice(false);
        showToast(`Created goal "${newGoal.title}"!`);
        return goalId;
      }
    },
    [currentUser, mode, showToast]
  );

  const updateGoal = useCallback(
    async (goalId: string, patch: Partial<Goal>) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can modify goal settings.', 'error');
        return;
      }
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          goals: prev.goals.map((g) =>
            g.id === goalId ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g
          ),
        }));
        showToast('Goal updated.');
        return;
      }
      try {
        await updateDoc(doc(db, 'goals', goalId), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
        showToast('Goal updated.');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `goals/${goalId}`);
      }
    },
    [currentUser, goals, mode, showToast]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can delete this roadmap.', 'error');
        return;
      }
      const nextRemainingGoalId = goals.find((g) => g.id !== goalId)?.id ?? null;

      if (mode === 'preview') {
        setPreviewState((prev) => {
          const nextGoals = prev.goals.filter((g) => g.id !== goalId);
          const nextParticipants = { ...prev.participantsByGoal };
          delete nextParticipants[goalId];
          const nextPhases = { ...prev.phasesByGoal };
          delete nextPhases[goalId];
          const nextDays = { ...prev.daysByGoal };
          delete nextDays[goalId];
          const nextTasks = { ...prev.tasksByGoal };
          delete nextTasks[goalId];
          const nextCompletions = { ...prev.completionsByGoal };
          delete nextCompletions[goalId];
          const nextDailyResults = { ...prev.dailyResultsByGoal };
          delete nextDailyResults[goalId];
          const nextActivity = { ...prev.activityByGoal };
          delete nextActivity[goalId];
          return {
            ...prev,
            goals: nextGoals,
            participantsByGoal: nextParticipants,
            phasesByGoal: nextPhases,
            daysByGoal: nextDays,
            tasksByGoal: nextTasks,
            completionsByGoal: nextCompletions,
            dailyResultsByGoal: nextDailyResults,
            activityByGoal: nextActivity,
            invitations: prev.invitations.filter((inv) => inv.goalId !== goalId),
          };
        });
        if (selectedGoalId === goalId) {
          setSelectedGoalId(nextRemainingGoalId);
        }
        showToast(`Deleted "${target.title}".`, 'info');
        return;
      }

      try {
        // Delete child tasks, days, phases, participants, and invitations where permitted
        const isSelected = selectedGoalId === goalId;
        if (isSelected) {
          for (const d of liveDays) {
            const dTasks = liveTasksByDay[d.id] || [];
            for (const t of dTasks) {
              await deleteDoc(doc(db, 'goals', goalId, 'days', d.id, 'tasks', t.id)).catch(() => {});
            }
            await deleteDoc(doc(db, 'goals', goalId, 'days', d.id)).catch(() => {});
          }
          for (const ph of livePhases) {
            await deleteDoc(doc(db, 'goals', goalId, 'phases', ph.id)).catch(() => {});
          }
          for (const pt of liveParticipants) {
            await deleteDoc(doc(db, 'goals', goalId, 'participants', pt.uid)).catch(() => {});
          }
        }
        const goalInvites = invitations.filter((inv) => inv.goalId === goalId && inv.inviterId === currentUser.uid);
        for (const inv of goalInvites) {
          await deleteDoc(doc(db, 'invitations', inv.id)).catch(() => {});
        }
        await deleteDoc(doc(db, 'goals', goalId));
        if (selectedGoalId === goalId) {
          setSelectedGoalId(nextRemainingGoalId);
        }
        showToast(`Deleted "${target.title}".`, 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `goals/${goalId}`);
      }
    },
    [
      currentUser,
      goals,
      invitations,
      liveDays,
      liveParticipants,
      livePhases,
      liveTasksByDay,
      mode,
      selectedGoalId,
      showToast,
    ]
  );

  const savePhase = useCallback(
    async (goalId: string, input: SavePhaseInput) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can edit the official roadmap.', 'error');
        return;
      }
      const existingPhases = mode === 'preview' ? previewState.phasesByGoal[goalId] || [] : livePhases;
      const isEdit = Boolean(input.id);
      const phaseId = input.id || makeId('phase');
      const nowIso = new Date().toISOString();
      const order = isEdit
        ? existingPhases.find((p) => p.id === phaseId)?.order ?? existingPhases.length
        : existingPhases.length;

      const phaseObj: Phase = {
        id: phaseId,
        goalId,
        ownerId: currentUser.uid,
        title: input.title.trim(),
        description: input.description.trim(),
        startDay: input.startDay,
        endDay: input.endDay,
        order,
        objectives: input.objectives.slice(0, 10),
        milestoneTitle: input.milestoneTitle.trim(),
        isPublished: input.isPublished,
        createdAt: existingPhases.find((p) => p.id === phaseId)?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      if (mode === 'preview') {
        setPreviewState((prev) => {
          const cur = prev.phasesByGoal[goalId] || [];
          const next = isEdit ? cur.map((p) => (p.id === phaseId ? phaseObj : p)) : [...cur, phaseObj];
          return { ...prev, phasesByGoal: { ...prev.phasesByGoal, [goalId]: next } };
        });
        showToast(isEdit ? 'Roadmap phase updated.' : 'Roadmap phase added.');
        return;
      }

      try {
        const ref = doc(db, 'goals', goalId, 'phases', phaseId);
        if (isEdit) {
          await updateDoc(ref, {
            title: phaseObj.title,
            description: phaseObj.description,
            startDay: phaseObj.startDay,
            endDay: phaseObj.endDay,
            order: phaseObj.order,
            objectives: phaseObj.objectives,
            milestoneTitle: phaseObj.milestoneTitle,
            isPublished: phaseObj.isPublished,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...phaseObj,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        showToast(isEdit ? 'Roadmap phase updated.' : 'Roadmap phase added.');
      } catch (err) {
        handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, `goals/${goalId}/phases/${phaseId}`);
      }
    },
    [currentUser, goals, livePhases, mode, previewState.phasesByGoal, showToast]
  );

  const deletePhase = useCallback(
    async (goalId: string, phaseId: string) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can delete roadmap phases.', 'error');
        return;
      }
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          phasesByGoal: {
            ...prev.phasesByGoal,
            [goalId]: (prev.phasesByGoal[goalId] || []).filter((p) => p.id !== phaseId),
          },
        }));
        showToast('Phase removed.', 'info');
        return;
      }
      try {
        await deleteDoc(doc(db, 'goals', goalId, 'phases', phaseId));
        showToast('Phase removed.', 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `goals/${goalId}/phases/${phaseId}`);
      }
    },
    [currentUser, goals, mode, showToast]
  );

  const reorderPhase = useCallback(
    async (goalId: string, phaseId: string, direction: 'up' | 'down') => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can reorder phases.', 'error');
        return;
      }
      const list = [...(mode === 'preview' ? previewState.phasesByGoal[goalId] || [] : livePhases)].sort(
        (a, b) => a.order - b.order
      );
      const idx = list.findIndex((p) => p.id === phaseId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;

      const updated = [...list];
      const [moved] = updated.splice(idx, 1);
      updated.splice(swapIdx, 0, moved);
      const reindexed = updated.map((p, i) => ({ ...p, order: i }));

      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          phasesByGoal: { ...prev.phasesByGoal, [goalId]: reindexed },
        }));
        return;
      }
      try {
        const batch = writeBatch(db);
        reindexed.forEach((p) => {
          batch.update(doc(db, 'goals', goalId, 'phases', p.id), {
            order: p.order,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `goals/${goalId}/phases`);
      }
    },
    [currentUser, goals, livePhases, mode, previewState.phasesByGoal, showToast]
  );

  const approveAiPlanToRoadmap = useCallback(
    async (goalId: string, suggestedPhases: AiSuggestedPhase[]) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can approve AI-suggested roadmap phases.', 'error');
        return;
      }
      for (const sp of suggestedPhases) {
        await savePhase(goalId, {
          title: sp.title,
          description: sp.description,
          startDay: Math.max(1, Math.min(target.durationDays, sp.startDay)),
          endDay: Math.max(1, Math.min(target.durationDays, Math.max(sp.startDay, sp.endDay))),
          objectives: sp.objectives.slice(0, 10),
          milestoneTitle: sp.milestoneTitle || '',
          isPublished: false, // Saved as draft for owner final publish control
        });
      }
      showToast(`Added ${suggestedPhases.length} AI phases as drafts to your roadmap for review!`);
    },
    [currentUser, goals, savePhase, showToast]
  );

  // ==================== STUDY DAYS & TASKS ACTIONS ====================
  const createStudyDay = useCallback(
    async (goalId: string, dayNumber: number, title: string, isPublished = true): Promise<string | null> => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can add study days.', 'error');
        return null;
      }
      const dayId = `day_${String(dayNumber).padStart(2, '0')}`;
      const date = addDaysToDateKey(target.startDate, Math.max(0, dayNumber - 1));
      const nowIso = new Date().toISOString();
      const newDay: StudyDay = {
        id: dayId,
        goalId,
        ownerId: currentUser.uid,
        dayNumber,
        date,
        title: title.trim() || `Day ${dayNumber}`,
        isPublished,
        isRestDay: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (mode === 'preview') {
        setPreviewState((prev) => {
          const cur = prev.daysByGoal[goalId] || [];
          if (cur.some((d) => d.id === dayId)) return prev;
          return {
            ...prev,
            daysByGoal: {
              ...prev.daysByGoal,
              [goalId]: [...cur, newDay].sort((a, b) => a.dayNumber - b.dayNumber),
            },
          };
        });
        showToast(`Created Day ${String(dayNumber).padStart(2, '0')}.`);
        return dayId;
      }

      try {
        await setDoc(doc(db, 'goals', goalId, 'days', dayId), {
          ...newDay,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(`Created Day ${String(dayNumber).padStart(2, '0')}.`);
        return dayId;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `goals/${goalId}/days/${dayId}`);
      }
    },
    [currentUser, goals, mode, showToast]
  );

  const updateStudyDay = useCallback(
    async (goalId: string, dayId: string, title: string) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can rename study days.', 'error');
        return;
      }
      const cleanTitle = title.trim();
      if (!cleanTitle) {
        showToast('Study day title cannot be empty.', 'error');
        return;
      }
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          daysByGoal: {
            ...prev.daysByGoal,
            [goalId]: (prev.daysByGoal[goalId] || []).map((d) =>
              d.id === dayId ? { ...d, title: cleanTitle, updatedAt: new Date().toISOString() } : d
            ),
          },
        }));
        showToast('Study day renamed.');
        return;
      }
      try {
        await updateDoc(doc(db, 'goals', goalId, 'days', dayId), {
          title: cleanTitle,
          updatedAt: serverTimestamp(),
        });
        showToast('Study day renamed.');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `goals/${goalId}/days/${dayId}`);
      }
    },
    [currentUser, goals, mode, showToast]
  );

  const deleteStudyDay = useCallback(
    async (goalId: string, dayId: string) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can delete study days.', 'error');
        return;
      }
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          daysByGoal: {
            ...prev.daysByGoal,
            [goalId]: (prev.daysByGoal[goalId] || []).filter((d) => d.id !== dayId),
          },
          tasksByGoal: {
            ...prev.tasksByGoal,
            [goalId]: (prev.tasksByGoal[goalId] || []).filter((t) => t.dayId !== dayId),
          },
        }));
        showToast('Study day and its quests deleted.', 'info');
        return;
      }
      try {
        const dayTasks = liveTasksByDay[dayId] || [];
        for (const t of dayTasks) {
          await deleteDoc(doc(db, 'goals', goalId, 'days', dayId, 'tasks', t.id)).catch(() => {});
        }
        await deleteDoc(doc(db, 'goals', goalId, 'days', dayId));
        showToast('Study day deleted.', 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `goals/${goalId}/days/${dayId}`);
      }
    },
    [currentUser, goals, liveTasksByDay, mode, showToast]
  );

  const toggleDayPublished = useCallback(
    async (goalId: string, dayId: string, nextPublished: boolean) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can publish or unpublish checklists.', 'error');
        return;
      }
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          daysByGoal: {
            ...prev.daysByGoal,
            [goalId]: (prev.daysByGoal[goalId] || []).map((d) =>
              d.id === dayId ? { ...d, isPublished: nextPublished, updatedAt: new Date().toISOString() } : d
            ),
          },
          tasksByGoal: {
            ...prev.tasksByGoal,
            [goalId]: (prev.tasksByGoal[goalId] || []).map((t) =>
              t.dayId === dayId && !t.isArchived ? { ...t, isPublished: nextPublished } : t
            ),
          },
        }));
        showToast(nextPublished ? 'Daily checklist published to your partner!' : 'Checklist switched to draft.');
        return;
      }
      try {
        await updateDoc(doc(db, 'goals', goalId, 'days', dayId), {
          isPublished: nextPublished,
          updatedAt: serverTimestamp(),
        });
        const dayTasks = liveTasksByDay[dayId] || [];
        if (dayTasks.length > 0) {
          const batch = writeBatch(db);
          dayTasks.forEach((t) => {
            if (!t.isArchived) {
              batch.update(doc(db, 'goals', goalId, 'days', dayId, 'tasks', t.id), {
                isPublished: nextPublished,
                updatedAt: serverTimestamp(),
              });
            }
          });
          await batch.commit();
        }
        showToast(nextPublished ? 'Daily checklist published!' : 'Checklist switched to draft.');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `goals/${goalId}/days/${dayId}`);
      }
    },
    [currentUser, goals, liveTasksByDay, mode, showToast]
  );

  const toggleRestDay = useCallback(
    async (goalId: string, dateKey: string) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can schedule planned rest days.', 'error');
        return;
      }
      const hasRest = target.restDays.includes(dateKey);
      const nextRestDays = hasRest
        ? target.restDays.filter((d) => d !== dateKey)
        : [...target.restDays, dateKey].slice(0, 30);
      await updateGoal(goalId, { restDays: nextRestDays });
    },
    [currentUser, goals, showToast, updateGoal]
  );

  const saveTask = useCallback(
    async (goalId: string, input: SaveTaskInput) => {
      const target = goals.find((g) => g.id === goalId);
      if (!canEditOfficialTask(target, currentUser?.uid)) {
        showToast('Only the goal owner can add or edit official checklist tasks.', 'error');
        return;
      }
      if (!currentUser) return;

      const dayTasks = tasks.filter((t) => t.dayId === input.dayId && !t.isArchived);
      const isEdit = Boolean(input.id);
      const taskId = input.id || makeId('task');
      const nowIso = new Date().toISOString();
      const existingTask = dayTasks.find((t) => t.id === taskId);

      const taskObj: Task = {
        id: taskId,
        goalId,
        dayId: input.dayId,
        dayNumber: input.dayNumber,
        ownerId: currentUser.uid,
        title: input.title.trim(),
        shortDescription: input.shortDescription.trim(),
        detailedInstructions: input.detailedInstructions.trim(),
        learningNotes: input.learningNotes.trim(),
        youtubeUrl: input.youtubeUrl.trim(),
        chatgptUrl: input.chatgptUrl.trim(),
        resourceLinks: input.resourceLinks.slice(0, 8),
        estimatedMinutes: input.estimatedMinutes,
        xpReward: input.xpReward,
        priority: input.priority,
        order: existingTask ? existingTask.order : dayTasks.length,
        isPublished: input.isPublished,
        isArchived: false,
        createdAt: existingTask?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      if (mode === 'preview') {
        setPreviewState((prev) => {
          const cur = prev.tasksByGoal[goalId] || [];
          const next = isEdit ? cur.map((t) => (t.id === taskId ? taskObj : t)) : [...cur, taskObj];
          return { ...prev, tasksByGoal: { ...prev.tasksByGoal, [goalId]: next } };
        });
        showToast(isEdit ? 'Task updated.' : input.isPublished ? 'Task published to checklist!' : 'Task saved as draft.');
        return;
      }

      try {
        const ref = doc(db, 'goals', goalId, 'days', input.dayId, 'tasks', taskId);
        if (isEdit) {
          await updateDoc(ref, {
            title: taskObj.title,
            shortDescription: taskObj.shortDescription,
            detailedInstructions: taskObj.detailedInstructions,
            learningNotes: taskObj.learningNotes,
            youtubeUrl: taskObj.youtubeUrl,
            chatgptUrl: taskObj.chatgptUrl,
            resourceLinks: taskObj.resourceLinks,
            estimatedMinutes: taskObj.estimatedMinutes,
            xpReward: taskObj.xpReward,
            priority: taskObj.priority,
            order: taskObj.order,
            isPublished: taskObj.isPublished,
            isArchived: false,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...taskObj,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        showToast(isEdit ? 'Task updated.' : input.isPublished ? 'Task published!' : 'Draft saved.');
      } catch (err) {
        handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, `goals/${goalId}/days/${input.dayId}/tasks/${taskId}`);
      }
    },
    [currentUser, goals, mode, showToast, tasks]
  );

  const deleteTask = useCallback(
    async (goalId: string, dayId: string, taskId: string) => {
      const target = goals.find((g) => g.id === goalId);
      if (!canEditOfficialTask(target, currentUser?.uid)) {
        showToast('Only the goal owner can delete official tasks.', 'error');
        return;
      }
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          tasksByGoal: {
            ...prev.tasksByGoal,
            [goalId]: (prev.tasksByGoal[goalId] || []).filter((t) => t.id !== taskId),
          },
        }));
        showToast('Task deleted.', 'info');
        return;
      }
      try {
        await deleteDoc(doc(db, 'goals', goalId, 'days', dayId, 'tasks', taskId));
        showToast('Task deleted.', 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `goals/${goalId}/days/${dayId}/tasks/${taskId}`);
      }
    },
    [currentUser?.uid, goals, mode, showToast]
  );

  const duplicateTask = useCallback(
    async (goalId: string, task: Task) => {
      await saveTask(goalId, {
        dayId: task.dayId,
        dayNumber: task.dayNumber,
        title: `${task.title} (Copy)`,
        shortDescription: task.shortDescription,
        detailedInstructions: task.detailedInstructions,
        learningNotes: task.learningNotes,
        youtubeUrl: task.youtubeUrl,
        chatgptUrl: task.chatgptUrl,
        resourceLinks: task.resourceLinks,
        estimatedMinutes: task.estimatedMinutes,
        xpReward: task.xpReward,
        priority: task.priority,
        isPublished: false,
      });
    },
    [saveTask]
  );

  const archiveTask = useCallback(
    async (goalId: string, task: Task) => {
      const target = goals.find((g) => g.id === goalId);
      if (!canEditOfficialTask(target, currentUser?.uid)) {
        showToast('Only the goal owner can archive tasks.', 'error');
        return;
      }
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          tasksByGoal: {
            ...prev.tasksByGoal,
            [goalId]: (prev.tasksByGoal[goalId] || []).map((t) =>
              t.id === task.id ? { ...t, isArchived: true, isPublished: false } : t
            ),
          },
        }));
        showToast('Task archived.', 'info');
        return;
      }
      try {
        await updateDoc(doc(db, 'goals', goalId, 'days', task.dayId, 'tasks', task.id), {
          isArchived: true,
          isPublished: false,
          updatedAt: serverTimestamp(),
        });
        showToast('Task archived.', 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `goals/${goalId}/days/${task.dayId}/tasks/${task.id}`);
      }
    },
    [currentUser?.uid, goals, mode, showToast]
  );

  const reorderTask = useCallback(
    async (goalId: string, dayId: string, taskId: string, direction: 'up' | 'down') => {
      const target = goals.find((g) => g.id === goalId);
      if (!canEditOfficialTask(target, currentUser?.uid)) {
        showToast('Only the goal owner can reorder tasks.', 'error');
        return;
      }
      const list = tasks.filter((t) => t.dayId === dayId && !t.isArchived).sort((a, b) => a.order - b.order);
      const idx = list.findIndex((t) => t.id === taskId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
      const next = [...list];
      const [moved] = next.splice(idx, 1);
      next.splice(swapIdx, 0, moved);
      const reindexed = next.map((t, i) => ({ ...t, order: i }));

      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          tasksByGoal: {
            ...prev.tasksByGoal,
            [goalId]: (prev.tasksByGoal[goalId] || []).map(
              (t) => reindexed.find((r) => r.id === t.id) || t
            ),
          },
        }));
        return;
      }
      try {
        const batch = writeBatch(db);
        reindexed.forEach((t) => {
          batch.update(doc(db, 'goals', goalId, 'days', dayId, 'tasks', t.id), {
            order: t.order,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `goals/${goalId}/days/${dayId}/tasks`);
      }
    },
    [currentUser?.uid, goals, mode, showToast, tasks]
  );

  // ==================== IDEMPOTENT TASK COMPLETION + XP TRANSACTION ====================
  const completeTask = useCallback(
    async (goalId: string, task: Task): Promise<boolean> => {
      const target = goals.find((g) => g.id === goalId);
      if (!currentUser || !target || !canCompleteTask(target, task, currentUser.uid)) {
        showToast('You do not have permission to complete this task.', 'error');
        return false;
      }

      const completionId = buildCompletionId(task.id, currentUser.uid);
      if (completionLocks.current.has(completionId)) {
        return false;
      }
      if (completions.some((c) => c.id === completionId)) {
        showToast('Already completed — XP is awarded once per task.', 'info');
        return false;
      }

      completionLocks.current.add(completionId);
      const dateKey = getDateKeyInTimezone(new Date(), target.timezone || currentUser.timezone);
      const txId = buildXpTxId(currentUser.uid, 'task', task.id);
      const nowIso = new Date().toISOString();

      try {
        // Check whether completing this task finishes all published tasks for this day
        const publishedDayTasks = tasks.filter(
          (t) => t.dayId === task.dayId && t.isPublished && !t.isArchived
        );
        const alreadyDoneIds = new Set(
          completions.filter((c) => c.userId === currentUser.uid && c.dayId === task.dayId).map((c) => c.taskId)
        );
        alreadyDoneIds.add(task.id);
        const completesWholeDay =
          publishedDayTasks.length > 0 && publishedDayTasks.every((t) => alreadyDoneIds.has(t.id));
        const bonusTxId = buildXpTxId(currentUser.uid, 'daily_bonus', task.dayId);
        const alreadyHasDayBonus = xpTransactions.some((x) => x.id === bonusTxId);
        const bonusXp = completesWholeDay && !alreadyHasDayBonus ? DEFAULT_XP_PRESETS.dailyCompletionBonus : 0;
        const totalAwarded = task.xpReward + bonusXp;

        const newCompletion: TaskCompletion = {
          id: completionId,
          goalId,
          dayId: task.dayId,
          taskId: task.id,
          userId: currentUser.uid,
          dateKey,
          xpAwarded: task.xpReward,
          estimatedMinutes: task.estimatedMinutes,
          completedAt: nowIso,
        };

        const newTx: XpTransaction = {
          id: txId,
          userId: currentUser.uid,
          goalId,
          sourceType: 'task',
          sourceId: task.id,
          xpAmount: task.xpReward,
          dateKey,
          label: task.title,
          createdAt: nowIso,
        };

        const bonusTx: XpTransaction | null =
          bonusXp > 0
            ? {
                id: bonusTxId,
                userId: currentUser.uid,
                goalId,
                sourceType: 'daily_bonus',
                sourceId: task.dayId,
                xpAmount: bonusXp,
                dateKey,
                label: `Day ${task.dayNumber} Checklist Completion Bonus`,
                createdAt: nowIso,
              }
            : null;

        const isFirstCompletionToday = !completions.some(
          (c) => c.userId === currentUser.uid && c.dateKey === dateKey
        );
        const partnerParticipant = participants.find((p) => p.uid !== currentUser.uid);
        const partnerStudiedToday = Boolean(
          partnerParticipant &&
            completions.some((c) => c.userId === partnerParticipant.uid && c.dateKey === dateKey)
        );

        // Optimistically update live state instantly across the entire website
        const updatedTotalXp = currentUser.totalXp + totalAwarded;
        const updatedLevel = getLevelInfo(updatedTotalXp).level;
        const updatedUser: UserPublicProfile = {
          ...currentUser,
          totalXp: updatedTotalXp,
          level: updatedLevel,
          completedTasksCount: currentUser.completedTasksCount + 1,
          lastActiveDate: dateKey,
          updatedAt: nowIso,
        };
        setLiveUser(updatedUser);
        setLiveCompletions((prev) => [...prev.filter((c) => c.id !== completionId), newCompletion]);
        setLiveParticipants((prev) =>
          prev.map((p) =>
            p.uid === currentUser.uid
              ? {
                  ...p,
                  goalXp: p.goalXp + totalAwarded,
                  completedTasksCount: p.completedTasksCount + 1,
                  daysCompleted: p.daysCompleted + (bonusXp > 0 ? 1 : 0),
                }
              : p
          )
        );

        if (mode === 'preview') {
          const prevGoalCompletions = previewState.completionsByGoal[goalId] || [];
          const projectedCompletions = [...prevGoalCompletions, newCompletion];
          const projectedUserDates = projectedCompletions
            .filter((c) => c.userId === currentUser.uid)
            .map((c) => c.dateKey);
          const projectedInd = calculateIndividualStreak(projectedUserDates, target.restDays, dateKey);
          const projectedGrp = calculateGroupStreak(
            target.participantIds,
            projectedCompletions,
            target.restDays,
            dateKey
          );

          setPreviewState((prev) => {
            const existingGoalCompletions = prev.completionsByGoal[goalId] || [];
            if (existingGoalCompletions.some((c) => c.id === completionId)) return prev;

            const nextCompletions = [...existingGoalCompletions, newCompletion];
            const nextTxs = bonusTx
              ? [...prev.xpTransactions, newTx, bonusTx]
              : [...prev.xpTransactions, newTx];

            const userDates = nextCompletions
              .filter((c) => c.userId === currentUser.uid)
              .map((c) => c.dateKey);
            const { currentStreak, longestStreak } = calculateIndividualStreak(
              userDates,
              target.restDays,
              dateKey
            );
            const { groupStreak, longestGroupStreak } = calculateGroupStreak(
              target.participantIds,
              nextCompletions,
              target.restDays,
              dateKey
            );

            const nextTotalXp = currentUser.totalXp + totalAwarded;
            const nextLevel = getLevelInfo(nextTotalXp).level;
            const nextCompletedCount = currentUser.completedTasksCount + 1;

            const partnerId = target.participantIds.find((id) => id !== currentUser.uid);
            const nextDailyRes = computeDailyResult(goalId, dateKey, target.participantIds, nextTxs, false);
            const prevDailyList = prev.dailyResultsByGoal[goalId] || [];
            const nextDailyList = prevDailyList.some((r) => r.dateKey === dateKey)
              ? prevDailyList.map((r) => (r.dateKey === dateKey ? nextDailyRes : r))
              : [...prevDailyList, nextDailyRes];

            const newUnlockedKeys = evaluateAchievements({
              completedTasksCount: nextCompletedCount,
              completedDaysCount: completesWholeDay ? 1 : 0,
              uniqueActiveDaysCount: new Set(userDates).size,
              currentStreak,
              longestStreak,
              completedGoalsCount: currentUser.completedGoalsCount,
              dailyWinsCount: nextDailyList.filter((r) => r.winnerIds.includes(currentUser.uid)).length,
              existingKeys: prev.achievements
                .filter((a) => a.userId === currentUser.uid)
                .map((a) => a.achievementKey),
            });

            const newAchievementDocs: AchievementUnlock[] = newUnlockedKeys.map((key) => ({
              id: `${currentUser.uid}_${key}`,
              userId: currentUser.uid,
              achievementKey: key,
              unlockedAt: nowIso,
            }));

            const newAct: ActivityItem = {
              id: makeId('act'),
              goalId,
              actorId: currentUser.uid,
              actorName: currentUser.fullName,
              type: completesWholeDay ? 'day_completed' : 'task_completed',
              message: completesWholeDay
                ? `finished "${task.title}" and completed all of Day ${task.dayNumber}!`
                : `completed "${task.title}" on Day ${task.dayNumber}`,
              xpDelta: totalAwarded,
              createdAt: nowIso,
            };

            const nextNotifications = [...prev.notifications];
            if (partnerId) {
              nextNotifications.unshift({
                id: makeId('notif'),
                recipientId: partnerId,
                senderId: currentUser.uid,
                goalId,
                type: completesWholeDay ? 'partner_completed_checklist' : 'partner_completed_task',
                title: `${currentUser.fullName} completed a task`,
                body: `Earned +${totalAwarded} XP on "${task.title}".`,
                isRead: false,
                createdAt: nowIso,
              });
            }

            const updatedUser: UserPublicProfile = {
              ...currentUser,
              totalXp: nextTotalXp,
              level: nextLevel,
              currentStreak,
              longestStreak: Math.max(currentUser.longestStreak, longestStreak),
              completedTasksCount: nextCompletedCount,
              lastActiveDate: dateKey,
              updatedAt: nowIso,
            };

            return {
              ...prev,
              ownerUser: previewPersona === 'owner' ? updatedUser : prev.ownerUser,
              partnerUser: previewPersona === 'partner' ? updatedUser : prev.partnerUser,
              goals: prev.goals.map((g) =>
                g.id === goalId
                  ? { ...g, groupStreak, longestGroupStreak: Math.max(g.longestGroupStreak, longestGroupStreak) }
                  : g
              ),
              participantsByGoal: {
                ...prev.participantsByGoal,
                [goalId]: (prev.participantsByGoal[goalId] || []).map((p) =>
                  p.uid === currentUser.uid
                    ? {
                        ...p,
                        goalXp: p.goalXp + totalAwarded,
                        completedTasksCount: p.completedTasksCount + 1,
                        daysCompleted: p.daysCompleted + (bonusXp > 0 ? 1 : 0),
                        currentStreak,
                        longestStreak: Math.max(p.longestStreak, longestStreak),
                      }
                    : p
                ),
              },
              completionsByGoal: { ...prev.completionsByGoal, [goalId]: nextCompletions },
              dailyResultsByGoal: { ...prev.dailyResultsByGoal, [goalId]: nextDailyList },
              activityByGoal: {
                ...prev.activityByGoal,
                [goalId]: [newAct, ...(prev.activityByGoal[goalId] || [])],
              },
              xpTransactions: nextTxs,
              achievements: [...prev.achievements, ...newAchievementDocs],
              notifications: nextNotifications,
            };
          });

          const prevLevelInfo = getLevelInfo(currentUser.totalXp);
          const nextLevelInfo = getLevelInfo(currentUser.totalXp + totalAwarded);
          const leveledUp = nextLevelInfo.level > prevLevelInfo.level;

          if (leveledUp || completesWholeDay || isFirstCompletionToday) {
            setCelebrationEvent({
              id: makeId('cel'),
              kind: leveledUp ? 'level_up' : completesWholeDay ? 'day_completed' : 'streak_day_lit',
              dayNumber: task.dayNumber,
              goalTitle: target.title,
              streakDays: Math.max(1, projectedInd.currentStreak),
              duoStreakDays: projectedGrp.groupStreak,
              duoFlameLitToday: partnerStudiedToday,
              partnerName: partnerParticipant?.displayName,
              xpEarned: task.xpReward,
              bonusXp,
              isLevelUp: leveledUp,
              newLevel: leveledUp ? nextLevelInfo.level : undefined,
              newLevelTitle: leveledUp ? nextLevelInfo.title : undefined,
            });
          }

          showToast(
            bonusXp > 0
              ? `Task completed! +${task.xpReward} XP + ${bonusXp} XP Day Completion Bonus!`
              : `Task completed! +${task.xpReward} XP earned.`
          );
          return true;
        }

        // LIVE FIRESTORE ATOMIC TRANSACTION (strict idempotency against duplicate XP)
        const compRef = doc(db, 'goals', goalId, 'completions', completionId);
        const txRef = doc(db, 'xpTransactions', txId);
        const userRef = doc(db, 'users', currentUser.uid);
        const partRef = doc(db, 'goals', goalId, 'participants', currentUser.uid);
        const dailyRef = doc(db, 'goals', goalId, 'dailyResults', dateKey);

        const txResult = await runTransaction(db, async (txn) => {
          const existingComp = await txn.get(compRef);
          if (existingComp.exists()) {
            return { awarded: false, currentStreak: currentUser.currentStreak, longestStreak: currentUser.longestStreak };
          }
          const userSnap = await txn.get(userRef);
          const partSnap = await txn.get(partRef);
          const dailySnap = await txn.get(dailyRef);

          const curUserData = userSnap.data() || {};
          const curPartData = partSnap.data() || {};
          const prevXp = Number(curUserData.totalXp || 0);
          const nextTotalXp = prevXp + totalAwarded;
          const nextLevel = getLevelInfo(nextTotalXp).level;
          const nextTasksCount = Number(curUserData.completedTasksCount || 0) + 1;

          const allUserDates = [
            ...completions.filter((c) => c.userId === currentUser.uid).map((c) => c.dateKey),
            dateKey,
          ];
          const { currentStreak, longestStreak } = calculateIndividualStreak(
            allUserDates,
            target.restDays,
            dateKey
          );
          const nextLongestStreak = Math.max(Number(curUserData.longestStreak || 0), longestStreak);

          txn.set(compRef, {
            ...newCompletion,
            completedAt: serverTimestamp(),
          });
          txn.set(txRef, {
            ...newTx,
            createdAt: serverTimestamp(),
          });
          if (bonusTx) {
            txn.set(doc(db, 'xpTransactions', bonusTx.id), {
              ...bonusTx,
              createdAt: serverTimestamp(),
            });
          }

          txn.update(userRef, {
            totalXp: nextTotalXp,
            level: nextLevel,
            currentStreak,
            longestStreak: nextLongestStreak,
            completedTasksCount: nextTasksCount,
            completedGoalsCount: Number(curUserData.completedGoalsCount || 0),
            lastActiveDate: dateKey,
            updatedAt: serverTimestamp(),
          });

          if (partSnap.exists()) {
            txn.update(partRef, {
              goalXp: Number(curPartData.goalXp || 0) + totalAwarded,
              completedTasksCount: Number(curPartData.completedTasksCount || 0) + 1,
              daysCompleted: Number(curPartData.daysCompleted || 0) + (bonusXp > 0 ? 1 : 0),
              currentStreak,
              longestStreak: Math.max(Number(curPartData.longestStreak || 0), longestStreak),
            });
          }

          const existingScores: Record<string, number> = dailySnap.exists()
            ? { ...(dailySnap.data().scores || {}) }
            : {};
          existingScores[currentUser.uid] = (existingScores[currentUser.uid] || 0) + totalAwarded;
          let maxScore = 0;
          Object.values(existingScores).forEach((s) => {
            if (s > maxScore) maxScore = s;
          });
          const winnerIds =
            maxScore > 0
              ? Object.keys(existingScores).filter((uid) => existingScores[uid] === maxScore)
              : [];

          txn.set(dailyRef, {
            dateKey,
            goalId,
            scores: existingScores,
            winnerIds,
            isTie: winnerIds.length > 1,
            isClosed: false,
            updatedAt: serverTimestamp(),
          });

          return { awarded: true, currentStreak, longestStreak: nextLongestStreak };
        });

        if (!txResult.awarded) {
          showToast('Task already completed — no duplicate XP awarded.', 'info');
          return false;
        }

        // Sync Duo Group Streak on goal doc whenever both partners have studied
        const updatedCompletions = [...completions, newCompletion];
        const { groupStreak, longestGroupStreak } = calculateGroupStreak(
          target.participantIds,
          updatedCompletions,
          target.restDays,
          dateKey
        );
        const nextLongestGroupStreak = Math.max(target.longestGroupStreak || 0, longestGroupStreak);
        if (groupStreak !== target.groupStreak || nextLongestGroupStreak !== target.longestGroupStreak) {
          await updateDoc(doc(db, 'goals', goalId), {
            groupStreak,
            longestGroupStreak: nextLongestGroupStreak,
            updatedAt: serverTimestamp(),
          });
        }

        // Write shared activity & partner notification outside core transaction
        const actId = makeId('act');
        await setDoc(doc(db, 'goals', goalId, 'activity', actId), {
          id: actId,
          goalId,
          actorId: currentUser.uid,
          actorName: currentUser.fullName,
          type: completesWholeDay ? 'day_completed' : 'task_completed',
          message: completesWholeDay
            ? `finished "${task.title}" and completed all of Day ${task.dayNumber}!`
            : `completed "${task.title}" on Day ${task.dayNumber}`,
          xpDelta: totalAwarded,
          createdAt: serverTimestamp(),
        });

        const partnerId = target.participantIds.find((id) => id !== currentUser.uid);
        if (partnerId) {
          const notifId = makeId('notif');
          await setDoc(doc(db, 'notifications', notifId), {
            id: notifId,
            recipientId: partnerId,
            senderId: currentUser.uid,
            goalId,
            type: completesWholeDay ? 'partner_completed_checklist' : 'partner_completed_task',
            title: `${currentUser.fullName} completed a task`,
            body: `Finished "${task.title}" (+${totalAwarded} XP).`,
            isRead: false,
            createdAt: serverTimestamp(),
          });
        }

        // Check & record newly unlocked achievements using exact calculated streak
        const unlockedKeys = evaluateAchievements({
          completedTasksCount: currentUser.completedTasksCount + 1,
          completedDaysCount: completesWholeDay ? 1 : 0,
          uniqueActiveDaysCount: new Set([
            ...completions.filter((c) => c.userId === currentUser.uid).map((c) => c.dateKey),
            dateKey,
          ]).size,
          currentStreak: txResult.currentStreak,
          longestStreak: txResult.longestStreak,
          completedGoalsCount: currentUser.completedGoalsCount,
          dailyWinsCount: dailyResults.filter((r) => r.winnerIds.includes(currentUser.uid)).length,
          existingKeys: achievements.map((a) => a.achievementKey),
        });
        for (const key of unlockedKeys) {
          const achId = `${currentUser.uid}_${key}`;
          await setDoc(doc(db, 'achievements', achId), {
            id: achId,
            userId: currentUser.uid,
            achievementKey: key,
            unlockedAt: serverTimestamp(),
          });
        }

        const prevLevelLive = getLevelInfo(currentUser.totalXp);
        const nextLevelLive = getLevelInfo(currentUser.totalXp + totalAwarded);
        const leveledUpLive = nextLevelLive.level > prevLevelLive.level;

        if (leveledUpLive || completesWholeDay || isFirstCompletionToday) {
          setCelebrationEvent({
            id: makeId('cel'),
            kind: leveledUpLive ? 'level_up' : completesWholeDay ? 'day_completed' : 'streak_day_lit',
            dayNumber: task.dayNumber,
            goalTitle: target.title,
            streakDays: Math.max(1, txResult.currentStreak),
            duoStreakDays: groupStreak,
            duoFlameLitToday: partnerStudiedToday,
            partnerName: partnerParticipant?.displayName,
            xpEarned: task.xpReward,
            bonusXp,
            isLevelUp: leveledUpLive,
            newLevel: leveledUpLive ? nextLevelLive.level : undefined,
            newLevelTitle: leveledUpLive ? nextLevelLive.title : undefined,
          });
        }

        showToast(
          bonusXp > 0
            ? `Task completed! +${task.xpReward} XP + ${bonusXp} XP Day Bonus!`
            : `Task completed! +${task.xpReward} XP earned.`
        );
        return true;
      } catch (err) {
        console.warn('Firestore sync backgrounded, state already updated optimistically:', err);
        return true;
      } finally {
        completionLocks.current.delete(completionId);
      }
    },
    [
      achievements,
      completions,
      currentUser,
      dailyResults,
      goals,
      mode,
      participants,
      previewPersona,
      previewState.completionsByGoal,
      showToast,
      tasks,
      xpTransactions,
    ]
  );

  const savePersonalNote = useCallback(
    async (goalId: string, taskId: string, content: string) => {
      if (!currentUser) return;
      const noteId = `${taskId}_${currentUser.uid}`;
      const trimmed = content.slice(0, 3000);
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          personalNotesByGoal: {
            ...prev.personalNotesByGoal,
            [goalId]: {
              ...(prev.personalNotesByGoal[goalId] || {}),
              [noteId]: {
                userId: currentUser.uid,
                taskId,
                content: trimmed,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        }));
        showToast('Private note saved.');
        return;
      }
      try {
        await setDoc(doc(db, 'goals', goalId, 'personalNotes', noteId), {
          userId: currentUser.uid,
          taskId,
          content: trimmed,
          updatedAt: serverTimestamp(),
        });
        showToast('Private note saved.');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `goals/${goalId}/personalNotes/${noteId}`);
      }
    },
    [currentUser, mode, showToast]
  );

  // ==================== INVITATION ACTIONS ====================
  const createInvitation = useCallback(
    async (goalId: string, inviteeEmail?: string): Promise<Invitation | null> => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !currentUser || target.ownerId !== currentUser.uid) {
        showToast('Only the goal owner can generate invitations.', 'error');
        return null;
      }
      if (mode !== 'preview' && target.participantIds.length >= target.maxParticipants) {
        showToast(`This goal already has its maximum of ${target.maxParticipants} participants.`, 'error');
        return null;
      }

      const code = generateInviteCode('DUO');
      const expiresDate = new Date(Date.now() + 7 * 86_400_000);
      const nowIso = new Date().toISOString();
      const inv: Invitation = {
        id: code,
        code,
        goalId,
        goalTitle: target.title,
        inviterId: currentUser.uid,
        inviterName: currentUser.fullName,
        inviteeEmail: inviteeEmail?.trim() || '',
        status: 'pending',
        expiresAt: expiresDate.toISOString(),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (mode === 'preview') {
        setPreviewState((prev) => ({ ...prev, invitations: [inv, ...prev.invitations] }));
        showToast(`Invitation code ${code} created!`);
        return inv;
      }

      try {
        await setDoc(doc(db, 'invitations', code), {
          ...inv,
          expiresAt: Timestamp.fromDate(expiresDate),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(`Invitation code ${code} created!`);
        return inv;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `invitations/${code}`);
      }
    },
    [currentUser, goals, mode, showToast]
  );

  const cancelInvitation = useCallback(
    async (invitationId: string) => {
      if (!currentUser) return;
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          invitations: prev.invitations.map((i) =>
            i.id === invitationId ? { ...i, status: 'cancelled', updatedAt: new Date().toISOString() } : i
          ),
        }));
        showToast('Invitation cancelled.', 'info');
        return;
      }
      try {
        await updateDoc(doc(db, 'invitations', invitationId), {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
        showToast('Invitation cancelled.', 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `invitations/${invitationId}`);
      }
    },
    [currentUser, mode, showToast]
  );

  const acceptInvitationByCode = useCallback(
    async (rawCode: string): Promise<boolean> => {
      if (!currentUser) return false;
      const code = rawCode.trim().toUpperCase();

      if (mode === 'preview') {
        const inv = previewState.invitations.find((i) => i.code === code);
        if (!inv) {
          showToast(`Invitation code "${code}" not found.`, 'error');
          return false;
        }
        if (inv.status !== 'pending') {
          showToast(`Invitation is already ${inv.status}.`, 'error');
          return false;
        }
        if (inv.inviterId === currentUser.uid) {
          showToast('You are already the owner of this goal. Switch to Partner view to test accepting.', 'info');
          return false;
        }
        setPreviewState((prev) => {
          const curParts = prev.participantsByGoal[inv.goalId] || [];
          const hasPart = curParts.some((p) => p.uid === currentUser.uid);
          return {
            ...prev,
            invitations: prev.invitations.map((i) =>
              i.code === code ? { ...i, status: 'accepted', acceptedBy: currentUser.uid } : i
            ),
            goals: prev.goals.map((g) =>
              g.id === inv.goalId && !g.participantIds.includes(currentUser.uid)
                ? { ...g, participantIds: [...g.participantIds, currentUser.uid], lastAcceptedInviteCode: code }
                : g
            ),
            participantsByGoal: hasPart
              ? prev.participantsByGoal
              : {
                  ...prev.participantsByGoal,
                  [inv.goalId]: [
                    ...curParts,
                    {
                      uid: currentUser.uid,
                      goalId: inv.goalId,
                      role: 'collaborator',
                      displayName: currentUser.fullName,
                      username: currentUser.username,
                      avatarColor: currentUser.avatarColor,
                      avatarInitials: currentUser.avatarInitials,
                      avatarConfig: sanitizeAvatarConfig(currentUser.avatarConfig, currentUser.uid),
                      goalXp: 0,
                      completedTasksCount: 0,
                      daysCompleted: 0,
                      currentStreak: 0,
                      longestStreak: 0,
                      joinedAt: new Date().toISOString(),
                    },
                  ],
                },
          };
        });
        setSelectedGoalId(inv.goalId);
        setShowWelcomeChoice(false);
        showToast(`Joined "${inv.goalTitle}"!`);
        return true;
      }

      try {
        const invRef = doc(db, 'invitations', code);
        const invSnap = await getDoc(invRef);
        if (!invSnap.exists()) {
          showToast(`Invitation code "${code}" was not found.`, 'error');
          return false;
        }
        const inv = invSnap.data();
        if (inv.status !== 'pending') {
          showToast(`This invitation is ${inv.status}.`, 'error');
          return false;
        }
        const expMs = inv.expiresAt instanceof Timestamp ? inv.expiresAt.toMillis() : Date.parse(inv.expiresAt);
        if (expMs < Date.now()) {
          showToast('This invitation has expired.', 'error');
          return false;
        }
        if (inv.inviterId === currentUser.uid) {
          showToast('You already own this goal.', 'info');
          return false;
        }
        if (liveGoals.some((g) => g.id === inv.goalId)) {
          showToast('You are already a member of this goal.', 'info');
          return false;
        }

        // Security rule validates pending invitation proof on goal update before invite flips to 'accepted'
        const goalRef = doc(db, 'goals', inv.goalId);
        await updateDoc(goalRef, {
          participantIds: arrayUnion(currentUser.uid),
          lastAcceptedInviteCode: code,
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'goals', inv.goalId, 'participants', currentUser.uid), {
          uid: currentUser.uid,
          goalId: inv.goalId,
          role: 'collaborator',
          displayName: currentUser.fullName,
          username: currentUser.username,
          avatarColor: currentUser.avatarColor,
          avatarInitials: currentUser.avatarInitials,
          avatarConfig: sanitizeAvatarConfig(currentUser.avatarConfig, currentUser.uid),
          goalXp: 0,
          completedTasksCount: 0,
          daysCompleted: 0,
          currentStreak: 0,
          longestStreak: 0,
          joinedAt: serverTimestamp(),
        });
        await updateDoc(invRef, {
          status: 'accepted',
          acceptedBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        });

        const notifId = makeId('notif');
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientId: inv.inviterId,
          senderId: currentUser.uid,
          goalId: inv.goalId,
          type: 'invitation_accepted',
          title: `${currentUser.fullName} joined your study goal!`,
          body: `Your partner accepted invite ${code} for "${inv.goalTitle}".`,
          isRead: false,
          createdAt: serverTimestamp(),
        });

        setSelectedGoalId(inv.goalId);
        setShowWelcomeChoice(false);
        setPendingInviteCodeFromUrl(null);
        showToast(`Joined "${inv.goalTitle}"!`);
        return true;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `invitations/${code}`);
      }
    },
    [currentUser, liveGoals, mode, previewState.invitations, showToast]
  );

  const rejectInvitationByCode = useCallback(
    async (rawCode: string): Promise<boolean> => {
      if (!currentUser) return false;
      const code = rawCode.trim().toUpperCase();
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          invitations: prev.invitations.map((i) =>
            i.code === code && i.status === 'pending' ? { ...i, status: 'rejected' } : i
          ),
        }));
        showToast('Invitation declined.', 'info');
        return true;
      }
      try {
        await updateDoc(doc(db, 'invitations', code), {
          status: 'rejected',
          acceptedBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        });
        showToast('Invitation declined.', 'info');
        return true;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `invitations/${code}`);
      }
    },
    [currentUser, mode, showToast]
  );

  // ==================== JOURNAL, NOTIFICATIONS & QUIZ XP ====================
  const saveJournalEntry = useCallback(
    async (input: SaveJournalInput) => {
      if (!currentUser) return;
      const isEdit = Boolean(input.id);
      const entryId = input.id || makeId('journal');
      const nowIso = new Date().toISOString();
      const linkedGoal = goals.find((g) => g.id === input.goalId);
      const sharedWithOwnerId =
        input.isSharedWithOwner && linkedGoal && linkedGoal.ownerId !== currentUser.uid
          ? linkedGoal.ownerId
          : '';

      const entry: JournalEntry = {
        id: entryId,
        userId: currentUser.uid,
        goalId: input.goalId || '',
        sharedWithOwnerId,
        isSharedWithOwner: input.isSharedWithOwner,
        title: input.title.trim(),
        date: input.date,
        topic: input.topic.trim(),
        notes: input.notes.trim(),
        whatILearned: input.whatILearned.trim(),
        questions: input.questions.trim(),
        challenges: input.challenges.trim(),
        resources: input.resources.trim(),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          journalEntries: isEdit
            ? prev.journalEntries.map((e) => (e.id === entryId ? { ...entry, createdAt: e.createdAt } : e))
            : [entry, ...prev.journalEntries],
        }));
        showToast(isEdit ? 'Journal entry updated.' : 'Journal entry saved.');
        return;
      }

      try {
        const ref = doc(db, 'journalEntries', entryId);
        if (isEdit) {
          await updateDoc(ref, {
            goalId: entry.goalId,
            sharedWithOwnerId: entry.sharedWithOwnerId,
            isSharedWithOwner: entry.isSharedWithOwner,
            title: entry.title,
            date: entry.date,
            topic: entry.topic,
            notes: entry.notes,
            whatILearned: entry.whatILearned,
            questions: entry.questions,
            challenges: entry.challenges,
            resources: entry.resources,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...entry,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        showToast(isEdit ? 'Journal entry updated.' : 'Journal entry saved.');
      } catch (err) {
        handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, `journalEntries/${entryId}`);
      }
    },
    [currentUser, goals, mode, showToast]
  );

  const deleteJournalEntry = useCallback(
    async (entryId: string) => {
      if (!currentUser) return;
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          journalEntries: prev.journalEntries.filter((e) => e.id !== entryId),
        }));
        showToast('Journal entry deleted.', 'info');
        return;
      }
      try {
        await deleteDoc(doc(db, 'journalEntries', entryId));
        showToast('Journal entry deleted.', 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `journalEntries/${entryId}`);
      }
    },
    [currentUser, mode, showToast]
  );

  const markNotificationRead = useCallback(
    async (notifId: string) => {
      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)),
        }));
        return;
      }
      try {
        await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
      }
    },
    [mode]
  );

  const markAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    if (mode === 'preview') {
      setPreviewState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.recipientId === currentUser?.uid ? { ...n, isRead: true } : n
        ),
      }));
      showToast('All notifications marked as read.', 'info');
      return;
    }
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { isRead: true }));
      await batch.commit();
      showToast('All notifications marked as read.', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  }, [currentUser?.uid, mode, notifications, showToast]);

  // Anti-farm quiz XP: atomic transaction, awarded at most once per unique quizKey/day (max 15 XP)
  const awardQuizXp = useCallback(
    async (goalId: string, quizKey: string, scoreRatio: number): Promise<number> => {
      if (!currentUser || scoreRatio < 0.5) return 0;
      const goal = goals.find((g) => g.id === goalId);
      const dateKey = getDateKeyInTimezone(new Date(), goal?.timezone || currentUser.timezone);
      const cleanKey = quizKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
      const sourceId = `${cleanKey}_${dateKey}`;
      const txId = buildXpTxId(currentUser.uid, 'quiz', sourceId);
      if (xpTransactions.some((t) => t.id === txId)) {
        return 0; // Already rewarded today for this quiz topic
      }
      const xpAmount = scoreRatio >= 0.8 ? 15 : 10;
      const nowIso = new Date().toISOString();

      if (mode === 'preview') {
        const tx: XpTransaction = {
          id: txId,
          userId: currentUser.uid,
          goalId,
          sourceType: 'quiz',
          sourceId,
          xpAmount,
          dateKey,
          label: `AI Quiz Mastery (${Math.round(scoreRatio * 100)}%)`,
          createdAt: nowIso,
        };
        setPreviewState((prev) => {
          if (prev.xpTransactions.some((x) => x.id === txId)) return prev;
          const nextTxs = [...prev.xpTransactions, tx];
          const nextXp = currentUser.totalXp + xpAmount;
          const updatedUser = { ...currentUser, totalXp: nextXp, level: getLevelInfo(nextXp).level };
          const participantIds = goal?.participantIds || [currentUser.uid];
          const nextDailyRes = computeDailyResult(goalId, dateKey, participantIds, nextTxs, false);
          const prevDailyList = prev.dailyResultsByGoal[goalId] || [];
          const nextDailyList = prevDailyList.some((r) => r.dateKey === dateKey)
            ? prevDailyList.map((r) => (r.dateKey === dateKey ? nextDailyRes : r))
            : [...prevDailyList, nextDailyRes];
          return {
            ...prev,
            ownerUser: previewPersona === 'owner' ? updatedUser : prev.ownerUser,
            partnerUser: previewPersona === 'partner' ? updatedUser : prev.partnerUser,
            participantsByGoal: {
              ...prev.participantsByGoal,
              [goalId]: (prev.participantsByGoal[goalId] || []).map((p) =>
                p.uid === currentUser.uid ? { ...p, goalXp: p.goalXp + xpAmount } : p
              ),
            },
            dailyResultsByGoal: { ...prev.dailyResultsByGoal, [goalId]: nextDailyList },
            xpTransactions: nextTxs,
          };
        });
        showToast(`Quiz mastered! +${xpAmount} XP awarded (capped once per topic/day).`);
        return xpAmount;
      }

      try {
        const txRef = doc(db, 'xpTransactions', txId);
        const userRef = doc(db, 'users', currentUser.uid);
        const partRef = doc(db, 'goals', goalId, 'participants', currentUser.uid);
        const dailyRef = doc(db, 'goals', goalId, 'dailyResults', dateKey);

        const awardedAmount = await runTransaction(db, async (txn) => {
          const existingTx = await txn.get(txRef);
          if (existingTx.exists()) return 0;
          const userSnap = await txn.get(userRef);
          const partSnap = await txn.get(partRef);
          const dailySnap = await txn.get(dailyRef);

          const curXp = Number(userSnap.data()?.totalXp || 0);
          const nextXp = curXp + xpAmount;

          txn.set(txRef, {
            id: txId,
            userId: currentUser.uid,
            goalId,
            sourceType: 'quiz',
            sourceId,
            xpAmount,
            dateKey,
            label: `AI Quiz Mastery (${Math.round(scoreRatio * 100)}%)`,
            createdAt: serverTimestamp(),
          });
          txn.update(userRef, {
            totalXp: nextXp,
            level: getLevelInfo(nextXp).level,
            updatedAt: serverTimestamp(),
          });
          if (partSnap.exists()) {
            txn.update(partRef, {
              goalXp: Number(partSnap.data()?.goalXp || 0) + xpAmount,
            });
          }

          const scores: Record<string, number> = dailySnap.exists()
            ? { ...(dailySnap.data().scores || {}) }
            : {};
          scores[currentUser.uid] = (scores[currentUser.uid] || 0) + xpAmount;
          let maxScore = 0;
          Object.values(scores).forEach((s) => {
            if (s > maxScore) maxScore = s;
          });
          const winnerIds =
            maxScore > 0 ? Object.keys(scores).filter((uid) => scores[uid] === maxScore) : [];
          txn.set(dailyRef, {
            dateKey,
            goalId,
            scores,
            winnerIds,
            isTie: winnerIds.length > 1,
            isClosed: false,
            updatedAt: serverTimestamp(),
          });

          return xpAmount;
        });

        if (awardedAmount > 0) {
          showToast(`Quiz mastered! +${awardedAmount} XP awarded.`);
        }
        return awardedAmount;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `xpTransactions/${txId}`);
        return 0;
      }
    },
    [currentUser, goals, mode, previewPersona, showToast, xpTransactions]
  );

  // Snapchat-style friendly Duo Streak Nudge (once per day per goal)
  const nudgePartnerStreak = useCallback(
    async (goalId: string) => {
      if (!currentUser) return;
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;
      const partnerId = goal.participantIds.find((id) => id !== currentUser.uid);
      if (!partnerId) {
        showToast('Invite a study partner first to start a Duo Flame.', 'info');
        return;
      }
      if (nudgedTodayGoalIds.includes(goalId)) {
        showToast('You already sent a friendly streak reminder today!', 'info');
        return;
      }
      const partnerName = participants.find((p) => p.uid === partnerId)?.displayName || 'your partner';
      const nowIso = new Date().toISOString();
      const notifId = makeId('notif');
      const streakLabel = goal.groupStreak > 0 ? `${goal.groupStreak}-day Duo Flame` : 'Duo Flame';

      if (mode === 'preview') {
        setPreviewState((prev) => ({
          ...prev,
          notifications: [
            {
              id: notifId,
              recipientId: partnerId,
              senderId: currentUser.uid,
              goalId,
              type: 'streak_reminder',
              title: `${currentUser.fullName} nudged your Duo Flame!`,
              body: `Complete 1 task on "${goal.title}" before midnight to keep your ${streakLabel} alive.`,
              isRead: false,
              createdAt: nowIso,
            },
            ...prev.notifications,
          ],
        }));
        setNudgedTodayGoalIds((prev) => [...prev, goalId]);
        showToast(`Sent a friendly streak reminder to ${partnerName}!`);
        return;
      }

      try {
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientId: partnerId,
          senderId: currentUser.uid,
          goalId,
          type: 'streak_reminder',
          title: `${currentUser.fullName} nudged your Duo Flame!`,
          body: `Complete 1 task on "${goal.title}" before midnight to keep your ${streakLabel} alive.`,
          isRead: false,
          createdAt: serverTimestamp(),
        });
        setNudgedTodayGoalIds((prev) => [...prev, goalId]);
        showToast(`Sent a friendly streak reminder to ${partnerName}!`);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `notifications/${notifId}`);
      }
    },
    [currentUser, goals, mode, nudgedTodayGoalIds, participants, showToast]
  );

  const value: StudyDuoContextValue = {
    mode,
    previewPersona,
    switchPreviewPersona,
    enterPreviewMode,
    exitPreviewMode,
    authLoading,
    firebaseUser,
    needsEmailVerification,
    currentUser,
    privateSettings,
    needsOnboarding,
    showWelcomeChoice,
    dismissWelcomeChoice: () => setShowWelcomeChoice(false),
    activePage,
    setActivePage,
    selectedGoalId: effectiveGoalId,
    setSelectedGoalId,
    activeGoal,
    pendingInviteCodeFromUrl,
    clearPendingInviteCodeFromUrl: () => setPendingInviteCodeFromUrl(null),
    goals,
    participants,
    phases,
    days,
    tasks,
    completions,
    personalNotes,
    dailyResults,
    activity,
    invitations,
    xpTransactions,
    achievements,
    notifications,
    journalEntries,
    unreadNotificationCount,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    logout,
    completeOnboarding,
    updateProfile,
    saveAvatarConfig,
    updatePrivateSettings,
    deleteAccount,
    createGoal,
    updateGoal,
    deleteGoal,
    savePhase,
    deletePhase,
    reorderPhase,
    approveAiPlanToRoadmap,
    createStudyDay,
    updateStudyDay,
    deleteStudyDay,
    toggleDayPublished,
    toggleRestDay,
    saveTask,
    deleteTask,
    duplicateTask,
    archiveTask,
    reorderTask,
    completeTask,
    savePersonalNote,
    createInvitation,
    cancelInvitation,
    acceptInvitationByCode,
    rejectInvitationByCode,
    saveJournalEntry,
    deleteJournalEntry,
    markNotificationRead,
    markAllNotificationsRead,
    awardQuizXp,
    nudgePartnerStreak,
    nudgedTodayGoalIds,
    celebrationEvent,
    dismissCelebration,
    toasts,
    showToast,
    dismissToast,
  };

  return <StudyDuoContext.Provider value={value}>{children}</StudyDuoContext.Provider>;
};

export function useStudyDuo(): StudyDuoContextValue {
  const ctx = useContext(StudyDuoContext);
  if (!ctx) throw new Error('useStudyDuo must be used within StudyDuoProvider');
  return ctx;
}
