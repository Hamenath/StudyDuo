import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileText,
  HelpCircle,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { canManageGoal, getDateKeyInTimezone } from '../lib/gamification';
import type { AiQuizResponse, AiStudyPlanResponse, DifficultyLevel } from '../types/studyduo';

type AiTab = 'planner' | 'explainer' | 'quiz' | 'notes' | 'coach';

export const AiAssistantPage: React.FC = () => {
  const {
    currentUser,
    privateSettings,
    activeGoal,
    phases,
    tasks,
    completions,
    participants,
    xpTransactions,
    journalEntries,
    approveAiPlanToRoadmap,
    awardQuizXp,
    showToast,
  } = useStudyDuo();

  const [tab, setTab] = useState<AiTab>('planner');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Planner state
  const [planPrompt, setPlanPrompt] = useState(
    activeGoal ? `Improve and expand our ${activeGoal.title} roadmap` : 'Learn Python backend engineering from scratch'
  );
  const [planDuration, setPlanDuration] = useState(activeGoal?.durationDays || 60);
  const [planDifficulty, setPlanDifficulty] = useState<DifficultyLevel>(activeGoal?.difficulty || 'Intermediate');
  const [planMinutes, setPlanMinutes] = useState(activeGoal?.dailyTargetMinutes || 60);
  const [planResult, setPlanResult] = useState<AiStudyPlanResponse | null>(null);
  const [approvingPlan, setApprovingPlan] = useState(false);

  // Explainer state
  const [explainTopic, setExplainTopic] = useState('');
  const [explainStyle, setExplainStyle] = useState<'beginner' | 'practical_examples' | 'deep_dive' | 'common_mistakes'>(
    'beginner'
  );
  const [explainResult, setExplainResult] = useState<string | null>(null);

  // Quiz state
  const [quizTopic, setQuizTopic] = useState(activeGoal?.title || 'Python Fundamentals');
  const [quizCount, setQuizCount] = useState(4);
  const [quizResult, setQuizResult] = useState<AiQuizResponse | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizGraded, setQuizGraded] = useState(false);
  const [quizAwardedXp, setQuizAwardedXp] = useState<number | null>(null);

  // Notes state
  const [notesMode, setNotesMode] = useState<
    'summarize' | 'organize' | 'flashcards' | 'revision_sheet' | 'practice_questions'
  >('summarize');
  const [notesInput, setNotesInput] = useState('');
  const [notesResult, setNotesResult] = useState<string | null>(null);

  // Coach state
  const [coachMode, setCoachMode] = useState<
    'coach' | 'progress_analyzer' | 'roadmap_advisor' | 'resources' | 'partner_insights'
  >('coach');
  const [coachQuestion, setCoachQuestion] = useState('What should I focus on studying next to stay on track?');
  const [coachResult, setCoachResult] = useState<string | null>(null);

  const isOwner = canManageGoal(activeGoal ?? undefined, currentUser?.uid);

  const myCompletedTaskTitles = useMemo(() => {
    if (!currentUser) return [];
    const doneIds = new Set(completions.filter((c) => c.userId === currentUser.uid).map((c) => c.taskId));
    return tasks.filter((t) => doneIds.has(t.id)).map((t) => t.title);
  }, [completions, currentUser, tasks]);

  const myPendingTaskTitles = useMemo(() => {
    if (!currentUser) return [];
    const doneIds = new Set(completions.filter((c) => c.userId === currentUser.uid).map((c) => c.taskId));
    return tasks.filter((t) => !doneIds.has(t.id) && t.isPublished && !t.isArchived).map((t) => t.title);
  }, [completions, currentUser, tasks]);

  async function postAi<T>(endpoint: string, payload: unknown): Promise<T | null> {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || `Request failed (${res.status}). Check your Gemini API key in Settings > Secrets.`);
        return null;
      }
      return data as T;
    } catch {
      setErrorMsg('Could not reach the StudyDuo AI server. Please check your connection and try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }

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

  const handleExplain = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await postAi<{ explanation: string }>('/api/ai/explain', {
      topic: explainTopic,
      style: explainStyle,
      goalContext: activeGoal ? `${activeGoal.title} (${activeGoal.difficulty})` : undefined,
    });
    if (res?.explanation) setExplainResult(res.explanation);
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizGraded(false);
    setQuizAnswers({});
    setQuizAwardedXp(null);
    const res = await postAi<{ quiz: AiQuizResponse }>('/api/ai/quiz', {
      topic: quizTopic,
      completedTasks: myCompletedTaskTitles.slice(0, 15),
      questionCount: quizCount,
      difficulty: activeGoal?.difficulty || 'Intermediate',
    });
    if (res?.quiz) setQuizResult(res.quiz);
  };

  const handleGradeQuiz = async () => {
    if (!quizResult) return;
    let correct = 0;
    for (const q of quizResult.questions) {
      const userAns = (quizAnswers[q.id] || '').trim().toLowerCase();
      const target = q.correctAnswer.trim().toLowerCase();
      if (q.type === 'mcq' || q.type === 'true_false') {
        if (userAns === target) correct += 1;
      } else {
        // For short answer / coding, award credit for substantive non-empty response containing key terms
        const keywords = target.split(/\s+/).filter((w) => w.length > 3);
        const matched = keywords.some((kw) => userAns.includes(kw));
        if (userAns.length >= 4 && (matched || userAns === target)) correct += 1;
      }
    }
    setQuizGraded(true);
    const ratio = quizResult.questions.length > 0 ? correct / quizResult.questions.length : 0;

    if (activeGoal) {
      const todayKey = getDateKeyInTimezone(new Date(), activeGoal.timezone);
      const slug = quizResult.topic.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'quiz';
      const xp = await awardQuizXp(activeGoal.id, `${todayKey}_${slug}`, ratio);
      setQuizAwardedXp(xp);
    } else {
      showToast(`Quiz graded: ${correct}/${quizResult.questions.length} correct!`, 'info');
    }
  };

  const handleNotesTransform = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await postAi<{ result: string }>('/api/ai/notes', {
      mode: notesMode,
      notesText: notesInput,
      goalTitle: activeGoal?.title,
    });
    if (res?.result) setNotesResult(res.result);
  };

  const handleAskCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    const todayKey = getDateKeyInTimezone(new Date(), activeGoal?.timezone || currentUser?.timezone || 'UTC');
    const myDailyPts = xpTransactions
      .filter((tx) => tx.userId === currentUser?.uid && tx.goalId === activeGoal?.id && tx.dateKey === todayKey)
      .reduce((s, t) => s + t.xpAmount, 0);

    const partner = participants.find((p) => p.uid !== currentUser?.uid);
    const partnerDailyPts = partner
      ? xpTransactions
          .filter((tx) => tx.userId === partner.uid && tx.goalId === activeGoal?.id && tx.dateKey === todayKey)
          .reduce((s, t) => s + t.xpAmount, 0)
      : 0;

    // Respect user privacy setting: only include personal journal summaries if explicitly opted-in
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

  const tabs: Array<{ id: AiTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'planner', label: 'Study Planner', icon: Wand2 },
    { id: 'explainer', label: 'Topic Explainer', icon: BookOpen },
    { id: 'quiz', label: 'Quiz Me', icon: HelpCircle },
    { id: 'notes', label: 'Notes Assistant', icon: FileText },
    { id: 'coach', label: 'Study Coach', icon: Compass },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#242337] tracking-tight">AI Study Assistant</h1>
        <p className="mt-1 text-sm text-[#66687A]">
          Draft study roadmaps, break down tough concepts, test your memory, and get personalized coaching.
        </p>
      </header>

      {/* Feature Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setErrorMsg(null);
              }}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors border ${
                active
                  ? 'border-[#7956D8] bg-[#7956D8] text-white'
                  : 'border-[#E9EAF0] bg-white text-[#242337] hover:bg-[#F8F9FC]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-[#E66F77]/40 bg-[#FFF0F1] p-4 text-sm text-[#9B2C36]"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-[#E66F77]" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* 1. AI STUDY PLANNER */}
      {tab === 'planner' && (
        <section className="space-y-5">
          <form onSubmit={handleGeneratePlan} className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6 space-y-4">
            <div>
              <label htmlFor="ai-plan-prompt" className="block text-sm font-semibold text-[#242337] mb-1.5">
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
                className="w-full rounded-xl border border-[#E9EAF0] p-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label htmlFor="ai-plan-days" className="block text-xs font-medium text-[#66687A] mb-1">
                  Duration (Days)
                </label>
                <input
                  id="ai-plan-days"
                  type="number"
                  min={7}
                  max={365}
                  value={planDuration}
                  onChange={(e) => setPlanDuration(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm font-mono text-[#242337] focus:border-[#7956D8] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="ai-plan-diff" className="block text-xs font-medium text-[#66687A] mb-1">
                  Difficulty
                </label>
                <select
                  id="ai-plan-diff"
                  value={planDifficulty}
                  onChange={(e) => setPlanDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label htmlFor="ai-plan-mins" className="block text-xs font-medium text-[#66687A] mb-1">
                  Daily Target (Min)
                </label>
                <input
                  id="ai-plan-mins"
                  type="number"
                  min={15}
                  max={360}
                  value={planMinutes}
                  onChange={(e) => setPlanMinutes(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm font-mono text-[#242337] focus:border-[#7956D8] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <p className="text-xs text-[#66687A]">
                AI suggestions are always reviewed first — only the Goal Owner can add them as draft phases.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-60 shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Study Plan
              </button>
            </div>
          </form>

          {planResult && (
            <div className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E9EAF0]">
                <div>
                  <h2 className="text-lg font-semibold text-[#242337]">Suggested Roadmap</h2>
                  <p className="mt-1 text-sm text-[#66687A] leading-relaxed">{planResult.summary}</p>
                </div>

                {activeGoal && isOwner ? (
                  <button
                    type="button"
                    disabled={approvingPlan}
                    onClick={() => void handleApprovePlan()}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#38A879] px-4 text-sm font-semibold text-white hover:bg-[#2F9368] disabled:opacity-60 shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {approvingPlan ? 'Adding Drafts...' : 'Approve & Add Draft Phases'}
                  </button>
                ) : (
                  <p className="text-xs text-[#66687A] bg-[#F8F9FC] rounded-xl px-3 py-2 shrink-0">
                    Goal Owner approval required to add phases
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {planResult.phases.map((phase, idx) => (
                  <div key={`${phase.title}-${idx}`} className="rounded-xl border border-[#E9EAF0] bg-[#F8F9FC]/60 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#242337]">{phase.title}</h3>
                      <span className="text-xs font-mono text-[#7956D8] font-semibold">
                        Days {phase.startDay}–{phase.endDay} · ~{phase.estimatedDailyMinutes}m/day
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#66687A]">{phase.description}</p>
                    {phase.objectives.length > 0 && (
                      <ul className="mt-2.5 space-y-1 text-xs text-[#242337] list-disc pl-4">
                        {phase.objectives.map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2.5 text-xs font-medium text-[#38A879]">
                      Milestone: {phase.milestoneTitle}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E9EAF0]">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#66687A]">Revision Strategy</h4>
                  <p className="mt-1.5 text-sm text-[#242337] leading-relaxed">{planResult.revisionStrategy}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#66687A]">
                    Practice Recommendations
                  </h4>
                  <ul className="mt-1.5 space-y-1 text-sm text-[#242337] list-disc pl-4">
                    {planResult.practiceRecommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 2. TOPIC EXPLAINER */}
      {tab === 'explainer' && (
        <section className="space-y-5">
          <form onSubmit={handleExplain} className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="explain-topic" className="block text-sm font-semibold text-[#242337] mb-1.5">
                  Concept or topic to explain
                </label>
                <input
                  id="explain-topic"
                  type="text"
                  required
                  minLength={2}
                  value={explainTopic}
                  onChange={(e) => setExplainTopic(e.target.value)}
                  placeholder="e.g. Python decorators, Big-O notation, async/await"
                  className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="explain-style" className="block text-sm font-semibold text-[#242337] mb-1.5">
                  Style
                </label>
                <select
                  id="explain-style"
                  value={explainStyle}
                  onChange={(e) =>
                    setExplainStyle(
                      e.target.value as 'beginner' | 'practical_examples' | 'deep_dive' | 'common_mistakes'
                    )
                  }
                  className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
                >
                  <option value="beginner">Explain like a beginner</option>
                  <option value="practical_examples">Practical examples</option>
                  <option value="deep_dive">Deep mental model</option>
                  <option value="common_mistakes">Common mistakes</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                Explain Topic
              </button>
            </div>
          </form>

          {explainResult && (
            <div className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold text-[#242337] mb-3">AI Explanation</h2>
              <div className="text-sm text-[#242337] leading-relaxed whitespace-pre-wrap">{explainResult}</div>
            </div>
          )}
        </section>
      )}

      {/* 3. QUIZ GENERATOR */}
      {tab === 'quiz' && (
        <section className="space-y-5">
          <form onSubmit={handleGenerateQuiz} className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="quiz-topic" className="block text-sm font-semibold text-[#242337] mb-1.5">
                  Quiz Topic
                </label>
                <input
                  id="quiz-topic"
                  type="text"
                  required
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder="e.g. Lists, Dictionaries & Functions"
                  className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="quiz-count" className="block text-sm font-semibold text-[#242337] mb-1.5">
                  Questions
                </label>
                <select
                  id="quiz-count"
                  value={quizCount}
                  onChange={(e) => setQuizCount(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
                >
                  <option value={3}>3 Questions</option>
                  <option value={4}>4 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={6}>6 Questions</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-[#66687A]">
                Tailored to your {myCompletedTaskTitles.length} completed tasks · Earn up to +15 verified XP per unique daily quiz.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-60 shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Generate Quiz
              </button>
            </div>
          </form>

          {quizResult && (
            <div className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E9EAF0]">
                <h2 className="text-base font-semibold text-[#242337]">Quiz: {quizResult.topic}</h2>
                {quizAwardedXp !== null && (
                  <span className="text-xs font-semibold font-mono text-[#38A879]">
                    {quizAwardedXp > 0 ? `+${quizAwardedXp} XP earned` : 'Practice review complete'}
                  </span>
                )}
              </div>

              <div className="space-y-5">
                {quizResult.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-xl border border-[#E9EAF0] bg-[#F8F9FC]/60 p-4 space-y-3">
                    <p className="text-sm font-semibold text-[#242337]">
                      {idx + 1}. {q.question}
                    </p>

                    {q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt) => {
                          const picked = quizAnswers[q.id] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={quizGraded}
                              onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                              className={`min-h-[44px] text-left rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                                picked
                                  ? 'border-[#7956D8] bg-[#F0EBFF] text-[#242337] font-semibold'
                                  : 'border-[#E9EAF0] bg-white text-[#242337] hover:bg-[#F8F9FC]'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        rows={2}
                        disabled={quizGraded}
                        value={quizAnswers[q.id] || ''}
                        onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Write your answer..."
                        className="w-full rounded-xl border border-[#E9EAF0] bg-white p-3 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
                      />
                    )}

                    {quizGraded && (
                      <div className="rounded-xl bg-[#E7F6EE]/70 p-3 text-xs text-[#242337] space-y-1">
                        <p className="font-semibold text-[#237B54]">Answer: {q.correctAnswer}</p>
                        <p className="text-[#242337]/90 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!quizGraded && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleGradeQuiz()}
                    className="min-h-[44px] rounded-xl bg-[#38A879] px-6 text-sm font-semibold text-white hover:bg-[#2F9368]"
                  >
                    Submit & Check Answers
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 4. NOTES ASSISTANT */}
      {tab === 'notes' && (
        <section className="space-y-5">
          <form onSubmit={handleNotesTransform} className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
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
                  className={`min-h-[40px] rounded-xl px-3.5 text-xs font-semibold border transition-colors ${
                    notesMode === m.id
                      ? 'border-[#7956D8] bg-[#F0EBFF] text-[#7956D8]'
                      : 'border-[#E9EAF0] bg-white text-[#66687A] hover:text-[#242337]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="notes-input" className="block text-sm font-semibold text-[#242337] mb-1.5">
                Paste your raw study notes
              </label>
              <textarea
                id="notes-input"
                rows={5}
                required
                minLength={10}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Paste notes from a lecture, tutorial, or journal entry..."
                className="w-full rounded-xl border border-[#E9EAF0] p-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Transform Notes
              </button>
            </div>
          </form>

          {notesResult && (
            <div className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold text-[#242337] mb-3">Notes Output</h2>
              <div className="text-sm text-[#242337] leading-relaxed whitespace-pre-wrap">{notesResult}</div>
            </div>
          )}
        </section>
      )}

      {/* 5. STUDY COACH & INSIGHTS */}
      {tab === 'coach' && (
        <section className="space-y-5">
          <form onSubmit={handleAskCoach} className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'coach', label: 'Study Coach' },
                  { id: 'progress_analyzer', label: 'Progress Analyzer' },
                  { id: 'roadmap_advisor', label: 'Roadmap Advisor' },
                  { id: 'resources', label: 'Resource Topics' },
                  { id: 'partner_insights', label: 'Partner Insights' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCoachMode(m.id)}
                  className={`min-h-[40px] rounded-xl px-3.5 text-xs font-semibold border transition-colors ${
                    coachMode === m.id
                      ? 'border-[#7956D8] bg-[#F0EBFF] text-[#7956D8]'
                      : 'border-[#E9EAF0] bg-white text-[#66687A] hover:text-[#242337]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="coach-question" className="block text-sm font-semibold text-[#242337] mb-1.5">
                Ask your StudyDuo Coach
              </label>
              <textarea
                id="coach-question"
                rows={3}
                required
                minLength={2}
                value={coachQuestion}
                onChange={(e) => setCoachQuestion(e.target.value)}
                className="w-full rounded-xl border border-[#E9EAF0] p-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-[#66687A]">
                Private journal notes are{' '}
                <strong>{privateSettings?.allowAiJournalContext ? 'included (opted in)' : 'excluded (private)'}</strong>
                . Adjust anytime in Settings.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-60 shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
                Ask Coach
              </button>
            </div>
          </form>

          {coachResult && (
            <div className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold text-[#242337] mb-3">Coach Insights</h2>
              <div className="text-sm text-[#242337] leading-relaxed whitespace-pre-wrap">{coachResult}</div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
