import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  HelpCircle,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Wand2,
  XCircle,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { canManageGoal, getDateKeyInTimezone, getSharedDailyScore } from '../lib/gamification';
import {
  createDefaultBujjiMemory,
  deleteKnowledgeDoc,
  getBujjiAuthHeaders,
  loadBujjiMemory,
  loadKnowledgeDocs,
  recordQuizToBujjiMemory,
  saveBujjiMemory,
  saveKnowledgeDoc,
} from '../lib/bujjiFirestore';
import {
  BUJJI_SUBJECTS,
  type BujjiChatMessage,
  type BujjiLearningMemory,
  type BujjiResponseMode,
  type BujjiRouteDecision,
  type BujjiStructuredNotes,
  type BujjiSubject,
  type KnowledgeDocument,
  type MathVerificationResult,
  type RetrievedSource,
} from '../types/bujji';
import type {
  AiQuizQuestion,
  AiQuizResponse,
  AiStudyPlanResponse,
  DifficultyLevel,
} from '../types/studyduo';
import { Button, Card } from '../components/ui/Primitives';
import { MascotImage } from '../components/ui/MascotArtwork';
import { BujjiResponseRenderer } from '../components/ai/BujjiResponseRenderer';
import { BujjiFlashcardsDeck } from '../components/ai/BujjiFlashcardsDeck';
import { BujjiKnowledgeBaseTab } from '../components/ai/BujjiKnowledgeBaseTab';
import { BujjiMemoryCoachPanel } from '../components/ai/BujjiMemoryCoachPanel';

type AiTab = 'ask' | 'kb' | 'quiz' | 'notes' | 'planner' | 'memory';

const RESPONSE_MODES: Array<{ id: BujjiResponseMode; label: string; hint: string }> = [
  { id: 'quick_answer', label: 'Quick Answer', hint: 'Fast, crisp answer' },
  { id: 'explain_simply', label: 'Explain Simply', hint: 'Analogy & plain English' },
  { id: 'step_by_step', label: 'Step-by-Step', hint: 'Full worked steps' },
  { id: 'deep_learning', label: 'Deep Learning', hint: 'Theory & edge cases' },
  { id: 'exam_prep', label: 'Exam Prep', hint: 'High-yield & traps' },
];

const QUIZ_TYPES: Array<{ id: AiQuizQuestion['type']; label: string }> = [
  { id: 'mcq', label: 'MCQ' },
  { id: 'true_false', label: 'True / False' },
  { id: 'fill_blank', label: 'Fill in Blank' },
  { id: 'short_answer', label: 'Short Answer' },
  { id: 'coding', label: 'Coding / Applied' },
];

const STARTER_PROMPTS: Array<{ label: string; subject: BujjiSubject; mode: BujjiResponseMode; prompt: string }> = [
  {
    label: 'Solve & verify quadratic',
    subject: 'Mathematics',
    mode: 'step_by_step',
    prompt: 'Solve x^2 - 5x + 6 = 0 step by step and explain how to check the roots.',
  },
  {
    label: 'Explain Big-O simply',
    subject: 'Computer Science',
    mode: 'explain_simply',
    prompt: 'Compare O(n log n) merge sort vs O(n^2) bubble sort in a table with a simple analogy.',
  },
  {
    label: 'Physics quick formula',
    subject: 'Physics',
    mode: 'exam_prep',
    prompt: 'Explain Newton’s Second Law with a worked numerical example and common exam traps.',
  },
  {
    label: 'Debug Python recursion',
    subject: 'Programming',
    mode: 'step_by_step',
    prompt: 'Why does a recursive factorial function hit RecursionError without a base case? Show the fixed Python code.',
  },
];

export const AiAssistantPage: React.FC = () => {
  const {
    mode: appMode,
    currentUser,
    privateSettings,
    activeGoal,
    phases,
    tasks,
    completions,
    dailyResults,
    participants,
    xpTransactions,
    journalEntries,
    approveAiPlanToRoadmap,
    awardQuizXp,
    showToast,
  } = useStudyDuo();

  const userId = currentUser?.uid || 'preview_learner';
  const defaultLevel: DifficultyLevel = activeGoal?.difficulty || 'Intermediate';

  const [tab, setTab] = useState<AiTab>('ask');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Persistent Bujji Learning Memory & Curriculum Knowledge Base
  const [memory, setMemory] = useState<BujjiLearningMemory>(() =>
    createDefaultBujjiMemory(userId, defaultLevel)
  );
  const [kbDocs, setKbDocs] = useState<KnowledgeDocument[]>([]);

  // Ask Bujji Streaming Chat State
  const [chatMessages, setChatMessages] = useState<BujjiChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [responseMode, setResponseMode] = useState<BujjiResponseMode>('step_by_step');
  const [selectedSubject, setSelectedSubject] = useState<BujjiSubject>('Auto');
  const [homeworkMode, setHomeworkMode] = useState(false);
  const [homeworkAttempt, setHomeworkAttempt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Planner State (Preserved with Owner Approval)
  const [planPrompt, setPlanPrompt] = useState(
    activeGoal
      ? `Improve and expand our ${activeGoal.title} roadmap`
      : 'Learn Python backend engineering from scratch'
  );
  const [planDuration, setPlanDuration] = useState(activeGoal?.durationDays || 60);
  const [planDifficulty, setPlanDifficulty] = useState<DifficultyLevel>(defaultLevel);
  const [planMinutes, setPlanMinutes] = useState(activeGoal?.dailyTargetMinutes || 60);
  const [planResult, setPlanResult] = useState<AiStudyPlanResponse | null>(null);
  const [approvingPlan, setApprovingPlan] = useState(false);

  // Quiz Generator State
  const [quizTopic, setQuizTopic] = useState(activeGoal?.title || 'Python Fundamentals');
  const [quizSubject, setQuizSubject] = useState<string>('Programming');
  const [quizDifficulty, setQuizDifficulty] = useState<DifficultyLevel>(defaultLevel);
  const [quizCount, setQuizCount] = useState(4);
  const [quizTypes, setQuizTypes] = useState<AiQuizQuestion['type'][]>([
    'mcq',
    'true_false',
    'fill_blank',
    'short_answer',
  ]);
  const [useKbForQuiz, setUseKbForQuiz] = useState(true);
  const [quizResult, setQuizResult] = useState<AiQuizResponse | null>(null);
  const [quizSourcesUsed, setQuizSourcesUsed] = useState<Array<{ docTitle: string; chapter: string }>>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizGraded, setQuizGraded] = useState(false);
  const [quizScoreSummary, setQuizScoreSummary] = useState<{ correct: number; total: number; percent: number } | null>(null);
  const [quizAwardedXp, setQuizAwardedXp] = useState<number | null>(null);

  // Smart Notes State
  const [notesMode, setNotesMode] = useState<
    'summarize' | 'organize' | 'flashcards' | 'revision_sheet' | 'practice_questions'
  >('summarize');
  const [notesSubject, setNotesSubject] = useState<string>('Computer Science');
  const [notesInput, setNotesInput] = useState('');
  const [notesStructured, setNotesStructured] = useState<BujjiStructuredNotes | null>(null);
  const [notesResult, setNotesResult] = useState<string | null>(null);

  // Coach State
  const [coachMode, setCoachMode] = useState<
    'coach' | 'progress_analyzer' | 'roadmap_advisor' | 'resources' | 'partner_insights'
  >('coach');
  const [coachQuestion, setCoachQuestion] = useState(
    'Based on my completed tasks and weak topics, what should I study and revise today?'
  );
  const [coachResult, setCoachResult] = useState<string | null>(null);

  const isOwner = canManageGoal(activeGoal ?? undefined, currentUser?.uid);

  const authHeadersFactory = useCallback(
    () => getBujjiAuthHeaders(appMode, userId),
    [appMode, userId]
  );

  // Load persisted AI Learning Memory & Knowledge Docs and sync KB with server vector store
  useEffect(() => {
    let active = true;
    async function hydrateBujji() {
      try {
        const [loadedMem, loadedDocs] = await Promise.all([
          loadBujjiMemory(userId, appMode, defaultLevel),
          loadKnowledgeDocs(userId, appMode),
        ]);
        if (!active) return;
        setMemory(loadedMem);
        setResponseMode(loadedMem.preferredMode || 'step_by_step');
        setKbDocs(loadedDocs);

        if (loadedDocs.length > 0) {
          const headers = await getBujjiAuthHeaders(appMode, userId);
          void fetch('/api/ai/kb/sync', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              documents: loadedDocs.map((d) => ({
                id: d.id,
                title: d.title,
                subject: d.subject,
                chapter: d.chapter,
                indexedContent: d.indexedContent,
              })),
            }),
          }).catch(() => {});
        }
      } catch {
        // Non-fatal hydration fallback
      }
    }
    void hydrateBujji();
    return () => {
      active = false;
    };
  }, [userId, appMode, defaultLevel]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  const myCompletedTaskTitles = useMemo(() => {
    if (!currentUser) return [];
    const doneIds = new Set(
      completions.filter((c) => c.userId === currentUser.uid).map((c) => c.taskId)
    );
    return tasks.filter((t) => doneIds.has(t.id)).map((t) => t.title);
  }, [completions, currentUser, tasks]);

  const myPendingTaskTitles = useMemo(() => {
    if (!currentUser) return [];
    const doneIds = new Set(
      completions.filter((c) => c.userId === currentUser.uid).map((c) => c.taskId)
    );
    return tasks
      .filter((t) => !doneIds.has(t.id) && t.isPublished && !t.isArchived)
      .map((t) => t.title);
  }, [completions, currentUser, tasks]);

  async function postAi<T>(endpoint: string, payload: unknown): Promise<T | null> {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = await authHeadersFactory();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(
          data.error ||
            `Request failed (${res.status}). Check your Gemini API key in Settings > Secrets.`
        );
        return null;
      }
      return data as T;
    } catch {
      setErrorMsg('Could not reach the StudyDuo Bujji AI server. Please check your connection.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  // ==================== ASK BUJJI STREAMING HANDLER ====================

  const handleStopStream = () => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setIsStreaming(false);
    setChatMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  const sendBujjiMessage = async (
    overrideText?: string,
    overrideMode?: BujjiResponseMode,
    overrideSubject?: BujjiSubject
  ) => {
    const questionText = (overrideText ?? chatInput).trim();
    if (!questionText || isStreaming) return;

    const activeMode = overrideMode ?? responseMode;
    const activeSubject = overrideSubject ?? selectedSubject;
    const attemptText = homeworkMode ? homeworkAttempt.trim() : '';

    setErrorMsg(null);
    setChatInput('');
    if (homeworkMode && !overrideText) {
      setHomeworkAttempt('');
    }

    const userMsgId = `u_${Date.now()}`;
    const assistantMsgId = `a_${Date.now() + 1}`;

    const historySnapshot = chatMessages
      .filter((m) => !m.error && m.content.trim().length > 0)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg: BujjiChatMessage = {
      id: userMsgId,
      role: 'user',
      content: questionText,
      mode: activeMode,
      homeworkAttempt: attemptText || undefined,
      createdAt: new Date().toISOString(),
    };

    const assistantPlaceholder: BujjiChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    setChatMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setIsStreaming(true);

    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      const headers = await authHeadersFactory();
      const res = await fetch('/api/ai/bujji/stream', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          message: questionText,
          mode: activeMode,
          subject: activeSubject,
          homeworkAttempt: attemptText || undefined,
          history: historySnapshot,
          memory: {
            learningLevel: memory.learningLevel,
            curriculum: memory.curriculum,
            weakTopics: memory.weakTopics,
            strongTopics: memory.strongTopics,
            studyPreferences: memory.studyPreferences,
            recentQuizResults: memory.recentQuizResults.slice(0, 5),
          },
          goalContext: activeGoal
            ? {
                goalTitle: activeGoal.title,
                goalCategory: activeGoal.category,
                difficulty: activeGoal.difficulty,
                completedTasks: myCompletedTaskTitles.slice(0, 12),
                upcomingTasks: myPendingTaskTitles.slice(0, 8),
              }
            : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const message = errData.error || `Bujji request failed (${res.status}).`;
        setErrorMsg(message);
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false, error: message } : m
          )
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response body unavailable.');
      }

      const decoder = new TextDecoder();
      let sseBuffer = '';

      const applySseBlock = (block: string) => {
        const lines = block.split('\n');
        let eventType = 'message';
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          }
        }
        if (dataLines.length === 0) return;

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
        } catch {
          return;
        }

        if (eventType === 'meta') {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    route: payload.route as BujjiRouteDecision | undefined,
                    sources: (payload.sources as RetrievedSource[]) || [],
                    mathCheck: (payload.mathCheck as MathVerificationResult | null) ?? null,
                    cacheHit: Boolean(payload.cacheHit),
                  }
                : m
            )
          );
        } else if (eventType === 'token') {
          const delta = String(payload.text || '');
          if (delta) {
            setChatMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: m.content + delta } : m
              )
            );
          }
        } else if (eventType === 'done') {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: String(payload.cleanText || m.content),
                    followUps: Array.isArray(payload.followUps)
                      ? payload.followUps.map(String)
                      : [],
                    cacheHit: Boolean(payload.cacheHit),
                    firstTokenMs:
                      typeof payload.firstTokenMs === 'number' ? payload.firstTokenMs : m.firstTokenMs,
                    totalMs: typeof payload.totalMs === 'number' ? payload.totalMs : m.totalMs,
                    route: (payload.route as BujjiRouteDecision) || m.route,
                    sources: (payload.sources as RetrievedSource[]) || m.sources,
                    mathCheck:
                      payload.mathCheck !== undefined
                        ? (payload.mathCheck as MathVerificationResult | null)
                        : m.mathCheck,
                    isStreaming: false,
                  }
                : m
            )
          );
        } else if (eventType === 'error') {
          const errText = String(payload.error || 'Bujji encountered an error.');
          setErrorMsg(errText);
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, isStreaming: false, error: errText } : m
            )
          );
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split('\n\n');
        sseBuffer = parts.pop() || '';
        for (const block of parts) {
          if (block.trim()) applySseBlock(block);
        }
      }
      if (sseBuffer.trim()) {
        applySseBlock(sseBuffer);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        const message = 'Connection interrupted while streaming from Bujji AI.';
        setErrorMsg(message);
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false, error: message } : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      streamAbortRef.current = null;
      setChatMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
      );
      window.setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    }
  };

  // ==================== KNOWLEDGE BASE HANDLERS ====================

  const handleDocumentIndexed = async (docItem: KnowledgeDocument) => {
    const saved = await saveKnowledgeDoc({ ...docItem, userId }, appMode);
    setKbDocs((prev) => [saved, ...prev.filter((d) => d.id !== saved.id)]);
  };

  const handleDocumentDeleted = async (docId: string) => {
    try {
      const headers = await authHeadersFactory();
      await Promise.all([
        deleteKnowledgeDoc(userId, docId, appMode),
        fetch('/api/ai/kb/delete', {
          method: 'POST',
          headers,
          body: JSON.stringify({ docId }),
        }),
      ]);
      setKbDocs((prev) => prev.filter((d) => d.id !== docId));
      showToast('Removed study document from Bujji Knowledge Base.', 'info');
    } catch {
      setErrorMsg('Could not delete document. Please try again.');
    }
  };

  // ==================== MEMORY, PLANNER, QUIZ, NOTES, COACH HANDLERS ====================

  const handleSaveMemory = async (updated: BujjiLearningMemory) => {
    try {
      const saved = await saveBujjiMemory(updated, appMode);
      setMemory(saved);
      setResponseMode(saved.preferredMode);
      showToast('Bujji Learning Memory saved!', 'success');
    } catch {
      setErrorMsg('Could not save learning memory.');
    }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await postAi<{ plan: AiStudyPlanResponse }>('/api/ai/plan', {
      goalPrompt: planPrompt,
      durationDays: Number(planDuration),
      difficulty: planDifficulty,
      dailyTargetMinutes: Number(planMinutes),
      category: activeGoal?.category || currentUser?.preferredCategory || 'Programming',
    });
    if (res?.plan) setPlanResult(res.plan);
  };

  const handleApprovePlan = async () => {
    if (!activeGoal || !planResult || !isOwner) return;
    setApprovingPlan(true);
    try {
      await approveAiPlanToRoadmap(activeGoal.id, planResult.phases);
    } finally {
      setApprovingPlan(false);
    }
  };

  const toggleQuizType = (type: AiQuizQuestion['type']) => {
    setQuizTypes((prev) => {
      if (prev.includes(type)) {
        return prev.length > 1 ? prev.filter((t) => t !== type) : prev;
      }
      return [...prev, type];
    });
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizGraded(false);
    setQuizAnswers({});
    setQuizAwardedXp(null);
    setQuizScoreSummary(null);
    const res = await postAi<{
      quiz: AiQuizResponse;
      sourcesUsed?: Array<{ docTitle: string; chapter: string }>;
    }>('/api/ai/quiz', {
      topic: quizTopic,
      subject: quizSubject,
      completedTasks: myCompletedTaskTitles.slice(0, 15),
      questionCount: quizCount,
      difficulty: quizDifficulty,
      questionTypes: quizTypes,
      useKnowledgeBase: useKbForQuiz && kbDocs.length > 0,
    });
    if (res?.quiz) {
      setQuizResult(res.quiz);
      setQuizSourcesUsed(res.sourcesUsed || []);
    }
  };

  const isQuestionCorrect = (q: AiQuizQuestion, rawUserAns: string): boolean => {
    const userAns = rawUserAns.trim().toLowerCase();
    const target = q.correctAnswer.trim().toLowerCase();
    if (!userAns) return false;
    if (q.type === 'mcq' || q.type === 'true_false') {
      return userAns === target;
    }
    if (q.type === 'fill_blank') {
      const cleanUser = userAns.replace(/[^a-z0-9.\-]/g, '');
      const cleanTarget = target.replace(/[^a-z0-9.\-]/g, '');
      return cleanUser === cleanTarget || userAns.includes(target) || target.includes(userAns);
    }
    const keywords = target.split(/\s+/).filter((w) => w.length > 3);
    const matched = keywords.some((kw) => userAns.includes(kw));
    return userAns.length >= 4 && (matched || userAns === target);
  };

  const handleGradeQuiz = async () => {
    if (!quizResult) return;
    let correct = 0;
    const missedConcepts: string[] = [];

    for (const q of quizResult.questions) {
      const ok = isQuestionCorrect(q, quizAnswers[q.id] || '');
      if (ok) {
        correct += 1;
      } else if (q.conceptTag) {
        missedConcepts.push(q.conceptTag);
      }
    }

    const total = quizResult.questions.length;
    const ratio = total > 0 ? correct / total : 0;
    const percent = Math.round(ratio * 100);
    setQuizGraded(true);
    setQuizScoreSummary({ correct, total, percent });

    const todayKey = getDateKeyInTimezone(
      new Date(),
      activeGoal?.timezone || currentUser?.timezone || 'UTC'
    );

    // Record quiz analytics & weak/strong topics into Bujji AI Learning Memory
    try {
      const updatedMem = await recordQuizToBujjiMemory(
        memory,
        {
          topic: quizResult.topic,
          subject: quizSubject,
          scorePercent: percent,
          missedConcepts: Array.from(new Set(missedConcepts)).slice(0, 5),
          dateKey: todayKey,
        },
        appMode
      );
      setMemory(updatedMem);
    } catch {
      // Non-fatal memory update
    }

    if (activeGoal) {
      const slug = quizResult.topic.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'quiz';
      const xp = await awardQuizXp(activeGoal.id, `${todayKey}_${slug}`, ratio);
      setQuizAwardedXp(xp);
    } else {
      showToast(`Quiz graded: ${correct}/${total} (${percent}%) — Memory updated!`, 'info');
    }
  };

  const handleNotesTransform = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await postAi<{ result: string; structured?: BujjiStructuredNotes }>('/api/ai/notes', {
      mode: notesMode,
      notesText: notesInput,
      goalTitle: activeGoal?.title,
      subject: notesSubject,
    });
    if (res?.result) setNotesResult(res.result);
    if (res?.structured) setNotesStructured(res.structured);
  };

  const handleAskCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    const todayKey = getDateKeyInTimezone(
      new Date(),
      activeGoal?.timezone || currentUser?.timezone || 'UTC'
    );
    const myDailyPts =
      currentUser && activeGoal
        ? getSharedDailyScore({
            goalId: activeGoal.id,
            dateKey: todayKey,
            userId: currentUser.uid,
            dailyResults,
            completions,
            transactions: xpTransactions,
          })
        : 0;

    const partner = participants.find((p) => p.uid !== currentUser?.uid);
    const partnerDailyPts =
      partner && activeGoal
        ? getSharedDailyScore({
            goalId: activeGoal.id,
            dateKey: todayKey,
            userId: partner.uid,
            dailyResults,
            completions,
            transactions: xpTransactions,
          })
        : 0;

    const authorizedJournalSummaries = privateSettings?.allowAiJournalContext
      ? journalEntries
          .filter((j) => j.userId === currentUser?.uid)
          .slice(0, 4)
          .map((j) => `${j.date} (${j.topic}): ${j.whatILearned || j.notes.slice(0, 180)}`)
      : undefined;

    const res = await postAi<{ reply: string }>('/api/ai/coach', {
      mode: coachMode,
      question: coachQuestion,
      context: {
        goalTitle: activeGoal?.title,
        phases: phases.map((p) => `${p.title} (Days ${p.startDay}-${p.endDay})`),
        completedTasks: myCompletedTaskTitles.slice(0, 20),
        upcomingTasks: myPendingTaskTitles.slice(0, 12),
        weakTopics: memory.weakTopics.slice(0, 12),
        strongTopics: memory.strongTopics.slice(0, 12),
        userStats: currentUser
          ? {
              streak: currentUser.currentStreak,
              totalXp: currentUser.totalXp,
              dailyPoints: myDailyPts,
            }
          : undefined,
        partnerStats: partner
          ? {
              name: partner.displayName,
              streak: partner.currentStreak,
              dailyPoints: partnerDailyPts,
              completedTasksCount: partner.completedTasksCount,
            }
          : undefined,
        authorizedJournalSummaries,
      },
    });
    if (res?.reply) setCoachResult(res.reply);
  };

  const tabs: Array<{ id: AiTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }> = [
    { id: 'ask', label: 'Ask Bujji', icon: MessageSquare },
    { id: 'kb', label: 'Knowledge Base', icon: BookMarked, badge: kbDocs.length > 0 ? String(kbDocs.length) : undefined },
    { id: 'quiz', label: 'Quiz Me', icon: HelpCircle },
    { id: 'notes', label: 'Smart Notes', icon: FileText },
    { id: 'planner', label: 'Study Planner', icon: Wand2 },
    { id: 'memory', label: 'Memory & Coach', icon: Brain },
  ];

  return (
    <div className="space-y-5">
      {/* Pastel Lavender Bujji AI 2.0 Banner */}
      <div className="rounded-[28px] bg-[#E9DFFF] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <MascotImage mascot="brain" className="h-18 w-18 shrink-0" rounded="rounded-2xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#7651E8]">
                <Sparkles className="h-3 w-3" />
                Bujji AI 2.0
              </span>
              <span className="inline-flex items-center rounded-full bg-[#FFF0C9] px-2.5 py-0.5 text-[11px] font-extrabold text-[#8A5A00]">
                {memory.learningLevel}
              </span>
              {kbDocs.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-[#E2F5E9] px-2.5 py-0.5 text-[11px] font-extrabold text-[#1F874D]">
                  {kbDocs.length} KB Doc{kbDocs.length === 1 ? '' : 's'} Active
                </span>
              )}
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-black text-[#20202A] tracking-tight">
              Your All-Subject AI Companion
            </h1>
            <p className="text-xs sm:text-sm text-[#5C5C6C]">
              Real-time streaming tutor, curriculum PDF & notes RAG, homework checking, quizzes, and flip flashcards.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Bujji AI features">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(item.id);
                setErrorMsg(null);
              }}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-full px-4 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors border cursor-pointer ${
                active
                  ? 'border-[#7651E8] bg-[#7651E8] text-white'
                  : 'border-[#F0EDF5] bg-white text-[#20202A] hover:bg-[#F8F5FF]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                    active ? 'bg-white/20 text-white' : 'bg-[#E9DFFF] text-[#7651E8]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-[#FFD6DF] bg-[#FFF0F3] p-4 text-sm text-[#B82547]"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-[#D9365E]" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* ==================== 1. ASK BUJJI (STREAMING TUTOR & HOMEWORK HELPER) ==================== */}
      {tab === 'ask' && (
        <section className="space-y-4">
          {/* Controls Bar: Response Modes + Subject + Homework Helper */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Response mode">
                {RESPONSE_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setResponseMode(m.id)}
                    title={m.hint}
                    className={`min-h-[34px] rounded-full px-3.5 text-xs font-bold border transition-colors cursor-pointer ${
                      responseMode === m.id
                        ? 'border-[#7651E8] bg-[#E9DFFF] text-[#5B35C9]'
                        : 'border-[#F0EDF5] bg-[#F8F5FF] text-[#6A697A] hover:text-[#20202A]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="bujji-subject" className="sr-only">
                  Subject
                </label>
                <select
                  id="bujji-subject"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value as BujjiSubject)}
                  className="min-h-[34px] rounded-full border border-[#F0EDF5] bg-[#F8F5FF] px-3 text-xs font-bold text-[#20202A] focus:border-[#7651E8] focus:outline-none"
                >
                  <option value="Auto">Auto-Detect Subject</option>
                  {BUJJI_SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setHomeworkMode((v) => !v)}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors cursor-pointer ${
                    homeworkMode
                      ? 'border-[#2FB368] bg-[#E2F5E9] text-[#1F874D]'
                      : 'border-[#F0EDF5] bg-white text-[#5C5C6C] hover:bg-[#F8F5FF]'
                  }`}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Check My Answer
                </button>

                {chatMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleStopStream();
                      setChatMessages([]);
                      setErrorMsg(null);
                    }}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-full border border-[#F0EDF5] bg-white px-3 text-xs font-bold text-[#777783] hover:text-[#20202A] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    New Chat
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Conversation Canvas */}
          <Card className="p-4 sm:p-5 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="py-4 space-y-5">
                <div className="text-center max-w-lg mx-auto space-y-1.5">
                  <h2 className="font-display text-lg font-black text-[#20202A]">
                    Ask Bujji anything across all 13 subjects
                  </h2>
                  <p className="text-xs sm:text-sm text-[#777783]">
                    Math equations are verified step-by-step, code blocks are ready to copy, and your uploaded PDFs/notes are cited automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STARTER_PROMPTS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setResponseMode(item.mode);
                        setSelectedSubject(item.subject);
                        void sendBujjiMessage(item.prompt, item.mode, item.subject);
                      }}
                      className="rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3.5 text-left hover:border-[#C5B3FA] hover:bg-[#F2ECFF] transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[#7651E8]">{item.label}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#5C5C6C]">
                          {item.subject}
                        </span>
                      </div>
                      <p className="text-xs text-[#4C4B5C] line-clamp-2">{item.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'user' ? (
                      <div className="max-w-[88%] sm:max-w-[78%] rounded-[22px] rounded-br-md bg-[#7651E8] px-4 py-3 text-sm text-white space-y-2">
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        {msg.homeworkAttempt && (
                          <div className="rounded-xl bg-white/15 px-3 py-2 text-xs">
                            <p className="font-extrabold uppercase tracking-wider text-[10px] text-[#E9DFFF] mb-0.5">
                              My Attempt
                            </p>
                            <p className="whitespace-pre-wrap">{msg.homeworkAttempt}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full rounded-[22px] rounded-bl-md border border-[#EFEAF8] bg-white p-4 sm:p-5 shadow-[0_6px_20px_-14px_rgba(118,81,232,0.18)]">
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E9DFFF] text-[#7651E8]">
                            <Sparkles className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-display text-xs font-black text-[#20202A]">
                            Bujji AI
                          </span>
                        </div>
                        {msg.error ? (
                          <p className="text-sm text-[#B82547]">{msg.error}</p>
                        ) : (
                          <BujjiResponseRenderer
                            content={msg.content}
                            isStreaming={msg.isStreaming}
                            route={msg.route}
                            sources={msg.sources}
                            mathCheck={msg.mathCheck}
                            followUps={msg.followUps}
                            cacheHit={msg.cacheHit}
                            firstTokenMs={msg.firstTokenMs}
                            totalMs={msg.totalMs}
                            onSelectFollowUp={(q) => void sendBujjiMessage(q)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendBujjiMessage();
              }}
              className="pt-3 border-t border-[#F0EDF5] space-y-2.5"
            >
              {homeworkMode && (
                <div className="rounded-2xl border border-[#C6EBD5] bg-[#E2F5E9]/60 p-3 space-y-1.5">
                  <label
                    htmlFor="homework-attempt"
                    className="block text-xs font-extrabold text-[#1F874D]"
                  >
                    Homework Helper — Paste Your Attempted Answer or Steps
                  </label>
                  <textarea
                    id="homework-attempt"
                    rows={2}
                    value={homeworkAttempt}
                    onChange={(e) => setHomeworkAttempt(e.target.value)}
                    placeholder="e.g. I got x = 4 because I added 6 instead of subtracting..."
                    className="w-full rounded-xl border border-[#C6EBD5] bg-white p-2.5 text-sm text-[#20202A] focus:border-[#2FB368] focus:outline-none"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <label htmlFor="bujji-chat-input" className="sr-only">
                  Ask Bujji a question
                </label>
                <textarea
                  id="bujji-chat-input"
                  rows={2}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendBujjiMessage();
                    }
                  }}
                  placeholder={
                    homeworkMode
                      ? 'Enter the homework problem or question...'
                      : 'Ask any question — math, physics, code, history, languages, or your uploaded notes...'
                  }
                  className="flex-1 rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none resize-none"
                />
                <div className="flex sm:flex-col justify-end gap-2">
                  {isStreaming ? (
                    <Button type="button" variant="danger" onClick={handleStopStream}>
                      <Square className="h-3.5 w-3.5 fill-current" />
                      Stop
                    </Button>
                  ) : (
                    <Button type="submit" disabled={!chatInput.trim()}>
                      <Send className="h-4 w-4" />
                      Ask Bujji
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Card>
        </section>
      )}

      {/* ==================== 2. CURRICULUM KNOWLEDGE BASE (RAG) ==================== */}
      {tab === 'kb' && (
        <BujjiKnowledgeBaseTab
          docs={kbDocs}
          authHeadersFactory={authHeadersFactory}
          onDocumentIndexed={handleDocumentIndexed}
          onDocumentDeleted={handleDocumentDeleted}
          onSendDocToNotes={(docItem) => {
            setNotesSubject(docItem.subject);
            setNotesInput(docItem.indexedContent.slice(0, 14_000));
            setNotesMode('flashcards');
            setTab('notes');
            showToast(`Loaded "${docItem.title}" into Smart Notes!`, 'info');
          }}
          onAskAboutDoc={(docItem) => {
            setSelectedSubject(
              BUJJI_SUBJECTS.includes(docItem.subject as Exclude<BujjiSubject, 'Auto'>)
                ? (docItem.subject as BujjiSubject)
                : 'Auto'
            );
            setChatInput(`Explain the key ideas from my uploaded notes "${docItem.title}" and test me with 1 quick question.`);
            setTab('ask');
          }}
          onError={setErrorMsg}
          showToast={showToast}
        />
      )}

      {/* ==================== 3. QUIZ GENERATOR ==================== */}
      {tab === 'quiz' && (
        <section className="space-y-5">
          <Card>
            <form onSubmit={handleGenerateQuiz} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-5">
                  <label htmlFor="quiz-topic" className="block text-xs font-bold text-[#777783] mb-1">
                    Quiz Topic
                  </label>
                  <input
                    id="quiz-topic"
                    type="text"
                    required
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    placeholder="e.g. Quadratic Equations, Photosynthesis, Python Dicts"
                    className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="quiz-subject" className="block text-xs font-bold text-[#777783] mb-1">
                    Subject
                  </label>
                  <select
                    id="quiz-subject"
                    value={quizSubject}
                    onChange={(e) => setQuizSubject(e.target.value)}
                    className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                  >
                    {BUJJI_SUBJECTS.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="quiz-diff" className="block text-xs font-bold text-[#777783] mb-1">
                    Level
                  </label>
                  <select
                    id="quiz-diff"
                    value={quizDifficulty}
                    onChange={(e) => setQuizDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3 text-xs font-semibold text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="quiz-count" className="block text-xs font-bold text-[#777783] mb-1">
                    Count
                  </label>
                  <select
                    id="quiz-count"
                    value={quizCount}
                    onChange={(e) => setQuizCount(Number(e.target.value))}
                    className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3 text-xs font-semibold text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                  >
                    <option value={3}>3 Qs</option>
                    <option value={4}>4 Qs</option>
                    <option value={5}>5 Qs</option>
                    <option value={6}>6 Qs</option>
                    <option value={8}>8 Qs</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-[#777783]">Question Formats</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUIZ_TYPES.map((qt) => {
                    const selected = quizTypes.includes(qt.id);
                    return (
                      <button
                        key={qt.id}
                        type="button"
                        onClick={() => toggleQuizType(qt.id)}
                        className={`min-h-[34px] rounded-full px-3.5 text-xs font-bold border transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#7651E8] bg-[#E9DFFF] text-[#5B35C9]'
                            : 'border-[#F0EDF5] bg-[#F8F5FF] text-[#777783]'
                        }`}
                      >
                        {qt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-[#777783]">
                    Earn up to +15 verified XP per unique daily quiz · Missed concepts auto-sync to Bujji Learning Memory.
                  </p>
                  {kbDocs.length > 0 && (
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#5230BA] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useKbForQuiz}
                        onChange={(e) => setUseKbForQuiz(e.target.checked)}
                        className="accent-[#7651E8]"
                      />
                      Ground questions in my {kbDocs.length} uploaded Knowledge Base document{kbDocs.length === 1 ? '' : 's'}
                    </label>
                  )}
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                  Generate Quiz
                </Button>
              </div>
            </form>
          </Card>

          {quizResult && (
            <Card className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0EDF5]">
                <div>
                  <h2 className="font-display text-lg font-black text-[#20202A]">
                    Quiz: {quizResult.topic}
                  </h2>
                  {quizSourcesUsed.length > 0 && (
                    <p className="text-xs font-semibold text-[#7651E8]">
                      Grounded in: {quizSourcesUsed.map((s) => s.docTitle).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {quizScoreSummary && (
                    <span className="rounded-full bg-[#E9DFFF] px-3 py-1 text-xs font-extrabold text-[#5B35C9]">
                      Score: {quizScoreSummary.correct}/{quizScoreSummary.total} ({quizScoreSummary.percent}%)
                    </span>
                  )}
                  {quizAwardedXp !== null && (
                    <span className="rounded-full bg-[#E2F5E9] px-3 py-1 text-xs font-extrabold text-[#1F874D]">
                      {quizAwardedXp > 0 ? `+${quizAwardedXp} XP earned` : 'Practice review saved'}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {quizResult.questions.map((q, idx) => {
                  const userVal = quizAnswers[q.id] || '';
                  const correct = quizGraded ? isQuestionCorrect(q, userVal) : false;
                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#7651E8]">
                          {q.type.replace('_', ' ')}
                        </span>
                        {q.conceptTag && (
                          <span className="text-[11px] font-semibold text-[#777783]">
                            {q.conceptTag}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-extrabold text-[#20202A]">
                        {idx + 1}. {q.question}
                      </p>

                      {q.options && q.options.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt) => {
                            const picked = userVal === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={quizGraded}
                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                className={`min-h-[44px] text-left rounded-2xl border px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                                  picked
                                    ? 'border-[#7651E8] bg-[#E9DFFF] text-[#20202A] font-bold'
                                    : 'border-[#F0EDF5] bg-white text-[#20202A] hover:bg-[#FAF8FF]'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : q.type === 'fill_blank' ? (
                        <input
                          type="text"
                          disabled={quizGraded}
                          value={userVal}
                          onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Type the missing word or value..."
                          className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-white px-4 text-sm text-[#20202A] focus:border-[#7651E8] focus:outline-none"
                        />
                      ) : (
                        <textarea
                          rows={2}
                          disabled={quizGraded}
                          value={userVal}
                          onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={
                            q.type === 'coding'
                              ? 'Write your code snippet or solution...'
                              : 'Write your answer...'
                          }
                          className="w-full rounded-2xl border border-[#F0EDF5] bg-white p-3 text-sm text-[#20202A] focus:border-[#7651E8] focus:outline-none"
                        />
                      )}

                      {quizGraded && (
                        <div
                          className={`rounded-2xl p-3.5 text-xs space-y-1.5 ${
                            correct
                              ? 'bg-[#E2F5E9] text-[#194D30]'
                              : 'bg-[#FFF0F3] text-[#7D1D34]'
                          }`}
                        >
                          <p className="font-extrabold flex items-center gap-1.5">
                            {correct ? (
                              <CheckCircle2 className="h-4 w-4 text-[#1F874D]" />
                            ) : (
                              <XCircle className="h-4 w-4 text-[#D9365E]" />
                            )}
                            <span>Correct Answer: {q.correctAnswer}</span>
                          </p>
                          <p className="leading-relaxed text-[#20202A]">{q.explanation}</p>
                          {q.misconceptionHint && (
                            <p className="text-[11px] font-semibold text-[#8A5A00] bg-[#FFF0C9]/80 rounded-xl px-2.5 py-1.5">
                              Watch out: {q.misconceptionHint}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!quizGraded && (
                <div className="flex justify-end">
                  <Button variant="success" onClick={() => void handleGradeQuiz()}>
                    Submit & Grade Quiz
                  </Button>
                </div>
              )}
            </Card>
          )}
        </section>
      )}

      {/* ==================== 4. SMART NOTES & INTERACTIVE FLASHCARDS ==================== */}
      {tab === 'notes' && (
        <section className="space-y-5">
          <Card>
            <form onSubmit={handleNotesTransform} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'summarize', label: 'Summarize' },
                      { id: 'organize', label: 'Organize' },
                      { id: 'flashcards', label: 'Flashcards' },
                      { id: 'revision_sheet', label: 'Revision Sheet' },
                      { id: 'practice_questions', label: 'Practice Qs' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setNotesMode(m.id)}
                      className={`min-h-[36px] rounded-full px-3.5 text-xs font-bold border transition-colors cursor-pointer ${
                        notesMode === m.id
                          ? 'border-[#7651E8] bg-[#E9DFFF] text-[#7651E8]'
                          : 'border-[#F0EDF5] bg-[#F8F5FF] text-[#777783] hover:text-[#20202A]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <select
                  aria-label="Notes subject"
                  value={notesSubject}
                  onChange={(e) => setNotesSubject(e.target.value)}
                  className="min-h-[36px] rounded-full border border-[#F0EDF5] bg-[#F8F5FF] px-3 text-xs font-bold text-[#20202A]"
                >
                  {BUJJI_SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              {kbDocs.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-bold text-[#777783]">Load from Knowledge Base:</span>
                  {kbDocs.slice(0, 5).map((docItem) => (
                    <button
                      key={docItem.id}
                      type="button"
                      onClick={() => {
                        setNotesSubject(docItem.subject);
                        setNotesInput(docItem.indexedContent.slice(0, 14_000));
                      }}
                      className="rounded-full bg-[#F8F5FF] border border-[#E9DFFF] px-3 py-1 font-bold text-[#5230BA] hover:bg-[#E9DFFF] cursor-pointer"
                    >
                      {docItem.title}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label htmlFor="notes-input" className="block text-sm font-bold text-[#20202A] mb-1.5">
                  Paste study notes or select an indexed document above
                </label>
                <textarea
                  id="notes-input"
                  rows={5}
                  required
                  minLength={10}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Paste notes from a lecture, PDF, textbook chapter, or journal entry..."
                  className="w-full rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Generate Smart Notes & Flashcards
                </Button>
              </div>
            </form>
          </Card>

          {notesStructured && (
            <div className="space-y-4">
              {/* Executive Summary & Key Concepts */}
              <Card className="space-y-4">
                <div className="rounded-2xl bg-[#E9DFFF]/55 p-4 space-y-1.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#5B35C9]">
                    Executive Summary
                  </p>
                  <p className="text-sm font-medium text-[#20202A] leading-relaxed">
                    {notesStructured.summary}
                  </p>
                </div>

                {notesStructured.keyConcepts.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#777783]">
                      Key Concepts
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {notesStructured.keyConcepts.map((concept) => (
                        <span
                          key={concept}
                          className="rounded-full bg-[#FFF0C9] px-3 py-1 text-xs font-bold text-[#7A5100]"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {notesStructured.definitions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#777783]">
                      Key Definitions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {notesStructured.definitions.map((def) => (
                        <div
                          key={def.term}
                          className="rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3 text-xs space-y-1"
                        >
                          <p className="font-extrabold text-[#7651E8]">{def.term}</p>
                          <p className="text-[#3C3B4D] leading-relaxed">{def.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Interactive Flip Flashcards */}
              {notesStructured.flashcards.length > 0 && (
                <Card>
                  <BujjiFlashcardsDeck cards={notesStructured.flashcards} />
                </Card>
              )}

              {/* Structured Revision Sheet */}
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-[#7651E8]" />
                  <h3 className="font-display text-base font-black text-[#20202A]">
                    Revision Notes
                  </h3>
                </div>
                <BujjiResponseRenderer content={notesStructured.revisionMarkdown} />
              </Card>
            </div>
          )}

          {!notesStructured && notesResult && (
            <Card>
              <h2 className="font-display text-base font-black text-[#20202A] mb-3">Notes Output</h2>
              <BujjiResponseRenderer content={notesResult} />
            </Card>
          )}
        </section>
      )}

      {/* ==================== 5. STUDY PLANNER (WITH OWNER APPROVAL) ==================== */}
      {tab === 'planner' && (
        <section className="space-y-5">
          <Card>
            <form onSubmit={handleGeneratePlan} className="space-y-4">
              <div>
                <label htmlFor="ai-plan-prompt" className="block text-sm font-bold text-[#20202A] mb-1.5">
                  What do you and your partner want to learn?
                </label>
                <textarea
                  id="ai-plan-prompt"
                  rows={3}
                  required
                  minLength={5}
                  value={planPrompt}
                  onChange={(e) => setPlanPrompt(e.target.value)}
                  placeholder="e.g. Become confident in React, TypeScript, and building REST APIs in 45 days"
                  className="w-full rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label htmlFor="ai-plan-days" className="block text-xs font-bold text-[#777783] mb-1">
                    Duration (Days)
                  </label>
                  <input
                    id="ai-plan-days"
                    type="number"
                    min={7}
                    max={365}
                    value={planDuration}
                    onChange={(e) => setPlanDuration(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm font-mono text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ai-plan-diff" className="block text-xs font-bold text-[#777783] mb-1">
                    Difficulty
                  </label>
                  <select
                    id="ai-plan-diff"
                    value={planDifficulty}
                    onChange={(e) => setPlanDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-plan-mins" className="block text-xs font-bold text-[#777783] mb-1">
                    Daily Target (Min)
                  </label>
                  <input
                    id="ai-plan-mins"
                    type="number"
                    min={15}
                    max={360}
                    value={planMinutes}
                    onChange={(e) => setPlanMinutes(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm font-mono text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="text-xs text-[#777783]">
                  AI suggestions are always reviewed first — only the Goal Owner can add them as draft phases.
                </p>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate Study Plan
                </Button>
              </div>
            </form>
          </Card>

          {planResult && (
            <Card className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#F0EDF5]">
                <div>
                  <h2 className="font-display text-lg font-black text-[#20202A]">Suggested Roadmap</h2>
                  <p className="mt-1 text-sm text-[#777783] leading-relaxed">{planResult.summary}</p>
                </div>

                {activeGoal && isOwner ? (
                  <Button variant="success" disabled={approvingPlan} onClick={() => void handleApprovePlan()}>
                    <CheckCircle2 className="h-4 w-4" />
                    {approvingPlan ? 'Adding Drafts...' : 'Approve & Add Draft Phases'}
                  </Button>
                ) : (
                  <p className="text-xs font-semibold text-[#777783] bg-[#F8F5FF] rounded-full px-3.5 py-2 shrink-0">
                    Goal Owner approval required to add phases
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {planResult.phases.map((phase, idx) => (
                  <div key={`${phase.title}-${idx}`} className="rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-[#20202A]">{phase.title}</h3>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-mono text-[#7651E8] font-bold">
                        Days {phase.startDay}–{phase.endDay} · ~{phase.estimatedDailyMinutes}m/day
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#5C5C6C]">{phase.description}</p>
                    {phase.objectives.length > 0 && (
                      <ul className="mt-2.5 space-y-1 text-xs text-[#20202A] list-disc pl-4">
                        {phase.objectives.map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2.5 text-xs font-extrabold text-[#1F874D]">
                      Milestone: {phase.milestoneTitle}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#F0EDF5]">
                <div className="rounded-2xl bg-[#FFF0C9]/70 p-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8A5A00]">
                    Revision Strategy
                  </h4>
                  <p className="mt-1.5 text-sm text-[#20202A] leading-relaxed">
                    {planResult.revisionStrategy}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#E2F5E9]/80 p-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1F874D]">
                    Practice Recommendations
                  </h4>
                  <ul className="mt-1.5 space-y-1 text-sm text-[#20202A] list-disc pl-4">
                    {planResult.practiceRecommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </section>
      )}

      {/* ==================== 6. LEARNING MEMORY & PERSONAL STUDY COACH ==================== */}
      {tab === 'memory' && (
        <BujjiMemoryCoachPanel
          memory={memory}
          onSaveMemory={handleSaveMemory}
          coachMode={coachMode}
          setCoachMode={setCoachMode}
          coachQuestion={coachQuestion}
          setCoachQuestion={setCoachQuestion}
          coachResult={coachResult}
          loading={loading}
          allowAiJournalContext={Boolean(privateSettings?.allowAiJournalContext)}
          onAskCoach={handleAskCoach}
          onPracticeWeakTopic={(topic) => {
            setResponseMode('explain_simply');
            setTab('ask');
            void sendBujjiMessage(
              `Help me strengthen my weak topic "${topic}" with a clear explanation and 1 practice check.`,
              'explain_simply'
            );
          }}
        />
      )}
    </div>
  );
};
