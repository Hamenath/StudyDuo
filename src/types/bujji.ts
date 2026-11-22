import type { DifficultyLevel } from './studyduo';

export type BujjiResponseMode =
  | 'quick_answer'
  | 'explain_simply'
  | 'step_by_step'
  | 'deep_learning'
  | 'exam_prep';

export type BujjiSubject =
  | 'Auto'
  | 'Mathematics'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Computer Science'
  | 'Programming'
  | 'English'
  | 'History'
  | 'Geography'
  | 'Economics'
  | 'Languages'
  | 'General Knowledge'
  | 'Exam Prep';

export const BUJJI_SUBJECTS: Exclude<BujjiSubject, 'Auto'>[] = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Programming',
  'English',
  'History',
  'Geography',
  'Economics',
  'Languages',
  'General Knowledge',
  'Exam Prep',
];

export type BujjiIntent =
  | 'explanation'
  | 'calculation'
  | 'definition'
  | 'quiz'
  | 'summary'
  | 'translation'
  | 'comparison'
  | 'code_assistance'
  | 'revision'
  | 'study_planning'
  | 'homework_help';

export type BujjiComplexity = 'simple' | 'standard' | 'complex';

export type BujjiModelId = 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';

export type BujjiThinkingDepth = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface BujjiRouteDecision {
  intent: BujjiIntent;
  subject: Exclude<BujjiSubject, 'Auto'>;
  complexity: BujjiComplexity;
  model: BujjiModelId;
  thinkingDepth: BujjiThinkingDepth;
  needsMathVerification: boolean;
  needsRetrieval: boolean;
  reason: string;
}

export interface MathVerificationResult {
  expression: string;
  verifiedAnswer: string;
  method: 'arithmetic' | 'quadratic' | 'linear' | 'percentage' | 'unit_conversion';
  steps: string[];
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  docTitle: string;
  subject: string;
  chapter: string;
  chunkIndex: number;
  text: string;
  embedding?: number[];
}

export interface KnowledgeDocument {
  id: string;
  userId: string;
  title: string;
  subject: string;
  chapter: string;
  sourceType: 'pdf' | 'notes' | 'markdown' | 'text';
  charCount: number;
  chunkCount: number;
  summary: string;
  keyConcepts: string[];
  indexedContent: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetrievedSource {
  chunkId: string;
  docId: string;
  docTitle: string;
  subject: string;
  chapter: string;
  excerpt: string;
  score: number;
  semanticScore: number;
  lexicalScore: number;
}

export interface BujjiQuizRecord {
  topic: string;
  subject: string;
  scorePercent: number;
  missedConcepts: string[];
  dateKey: string;
}

export interface BujjiLearningMemory {
  uid: string;
  learningLevel: DifficultyLevel;
  curriculum: string;
  preferredMode: BujjiResponseMode;
  weakTopics: string[];
  strongTopics: string[];
  recentQuizResults: BujjiQuizRecord[];
  studyPreferences: string;
  updatedAt: string;
}

export interface BujjiFlashcard {
  id: string;
  front: string;
  back: string;
  tag: string;
}

export interface BujjiStructuredNotes {
  summary: string;
  keyConcepts: string[];
  definitions: Array<{ term: string; definition: string }>;
  flashcards: BujjiFlashcard[];
  revisionMarkdown: string;
}

export interface BujjiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface BujjiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  mode?: BujjiResponseMode;
  homeworkAttempt?: string;
  route?: BujjiRouteDecision;
  sources?: RetrievedSource[];
  mathCheck?: MathVerificationResult | null;
  followUps?: string[];
  cacheHit?: boolean;
  firstTokenMs?: number;
  totalMs?: number;
  isStreaming?: boolean;
  error?: string;
}

export interface BujjiLatencyMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheHitRate: number;
  avgFirstTokenMs: number;
  avgTotalMs: number;
  fastModelCount: number;
  reasoningModelCount: number;
  avgRetrievalMs: number;
}
