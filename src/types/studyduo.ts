export type NavPage =
  | 'dashboard'
  | 'goals'
  | 'checklist'
  | 'leaderboard'
  | 'groups'
  | 'analytics'
  | 'journal'
  | 'ai'
  | 'achievements'
  | 'notifications'
  | 'profile'
  | 'settings';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type TaskPriority = 'low' | 'medium' | 'high';
export type GoalStatus = 'active' | 'completed' | 'archived';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export interface UserPublicProfile {
  uid: string;
  fullName: string;
  username: string;
  avatarColor: string;
  avatarInitials: string;
  photoURL?: string;
  bio: string;
  preferredCategory: string;
  timezone: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  completedTasksCount: number;
  completedGoalsCount: number;
  lastActiveDate?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPrivateSettings {
  uid: string;
  email: string;
  notifyInvites: boolean;
  notifyPartnerActivity: boolean;
  notifyDailyWinner: boolean;
  notifyAchievements: boolean;
  notifyWeeklySummary: boolean;
  shareProgressWithPartner: boolean;
  allowAiJournalContext: boolean;
  updatedAt: string;
}

export interface Goal {
  id: string;
  ownerId: string;
  participantIds: string[];
  title: string;
  description: string;
  category: string;
  icon: string;
  startDate: string; // YYYY-MM-DD
  durationDays: number;
  targetDate: string; // YYYY-MM-DD
  difficulty: DifficultyLevel;
  timezone: string;
  dailyTargetMinutes: number;
  maxParticipants: number;
  groupName: string;
  groupStreak: number;
  longestGroupStreak: number;
  restDays: string[];
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  uid: string;
  goalId: string;
  role: 'owner' | 'collaborator';
  displayName: string;
  username: string;
  avatarColor: string;
  avatarInitials: string;
  goalXp: number;
  completedTasksCount: number;
  daysCompleted: number;
  currentStreak: number;
  longestStreak: number;
  joinedAt: string;
}

export interface Phase {
  id: string;
  goalId: string;
  ownerId: string;
  title: string;
  description: string;
  startDay: number;
  endDay: number;
  order: number;
  objectives: string[];
  milestoneTitle: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudyDay {
  id: string;
  goalId: string;
  ownerId: string;
  dayNumber: number;
  date: string; // YYYY-MM-DD
  title: string;
  phaseId?: string;
  isPublished: boolean;
  isRestDay?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceLink {
  label: string;
  url: string;
  type: 'youtube' | 'chatgpt' | 'docs' | 'pdf' | 'website';
}

export interface Task {
  id: string;
  goalId: string;
  dayId: string;
  dayNumber: number;
  ownerId: string;
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
  order: number;
  isPublished: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletion {
  id: string; // {taskId}_{userId}
  goalId: string;
  dayId: string;
  taskId: string;
  userId: string;
  dateKey: string; // YYYY-MM-DD in goal timezone
  xpAwarded: number;
  estimatedMinutes: number;
  completedAt: string;
}

export interface PersonalNote {
  userId: string;
  taskId: string;
  content: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  code: string;
  goalId: string;
  goalTitle: string;
  inviterId: string;
  inviterName: string;
  inviteeEmail?: string;
  acceptedBy?: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface XpTransaction {
  id: string; // {userId}_{sourceType}_{sourceId}
  userId: string;
  goalId: string;
  sourceType: 'task' | 'daily_bonus' | 'milestone' | 'quiz';
  sourceId: string;
  xpAmount: number;
  dateKey: string;
  label: string;
  createdAt: string;
}

export interface DailyResult {
  dateKey: string;
  goalId: string;
  scores: Record<string, number>;
  winnerIds: string[];
  isTie: boolean;
  isClosed: boolean;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  goalId: string;
  actorId: string;
  actorName: string;
  type:
    | 'task_completed'
    | 'day_completed'
    | 'task_published'
    | 'partner_joined'
    | 'achievement_unlocked'
    | 'milestone_reached';
  message: string;
  xpDelta?: number;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  goalId?: string;
  sharedWithOwnerId?: string;
  isSharedWithOwner: boolean;
  title: string;
  date: string;
  topic: string;
  notes: string;
  whatILearned: string;
  questions: string;
  challenges: string;
  resources: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'invitation_received'
  | 'invitation_accepted'
  | 'partner_completed_task'
  | 'partner_completed_checklist'
  | 'daily_winner'
  | 'achievement_unlocked'
  | 'milestone_reached'
  | 'weekly_summary';

export interface NotificationItem {
  id: string;
  recipientId: string;
  senderId: string;
  goalId?: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  category: 'milestone' | 'streak' | 'consistency' | 'duo';
  targetValue: number;
}

export interface AchievementUnlock {
  id: string;
  userId: string;
  achievementKey: string;
  unlockedAt: string;
}

export interface AiSuggestedPhase {
  title: string;
  description: string;
  startDay: number;
  endDay: number;
  objectives: string[];
  milestoneTitle: string;
  sampleDailyTopics: string[];
  estimatedDailyMinutes: number;
}

export interface AiStudyPlanResponse {
  summary: string;
  phases: AiSuggestedPhase[];
  revisionStrategy: string;
  practiceRecommendations: string[];
}

export interface AiQuizQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'short_answer' | 'coding';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface AiQuizResponse {
  topic: string;
  questions: AiQuizQuestion[];
}
