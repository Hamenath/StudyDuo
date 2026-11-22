import React, { useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Compass,
  Loader2,
  Plus,
  Save,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import type { BujjiLearningMemory, BujjiResponseMode } from '../../types/bujji';
import type { DifficultyLevel } from '../../types/studyduo';
import { Button, Card } from '../ui/Primitives';
import { BujjiResponseRenderer } from './BujjiResponseRenderer';

interface BujjiMemoryCoachPanelProps {
  memory: BujjiLearningMemory;
  onSaveMemory: (updated: BujjiLearningMemory) => Promise<void>;
  coachMode: 'coach' | 'progress_analyzer' | 'roadmap_advisor' | 'resources' | 'partner_insights';
  setCoachMode: (
    mode: 'coach' | 'progress_analyzer' | 'roadmap_advisor' | 'resources' | 'partner_insights'
  ) => void;
  coachQuestion: string;
  setCoachQuestion: (q: string) => void;
  coachResult: string | null;
  loading: boolean;
  allowAiJournalContext: boolean;
  onAskCoach: (e: React.FormEvent) => Promise<void>;
  onPracticeWeakTopic: (topic: string) => void;
}

const MODE_LABELS: Array<{ id: BujjiResponseMode; label: string }> = [
  { id: 'quick_answer', label: 'Quick Answer' },
  { id: 'explain_simply', label: 'Explain Simply' },
  { id: 'step_by_step', label: 'Step-by-Step' },
  { id: 'deep_learning', label: 'Deep Learning' },
  { id: 'exam_prep', label: 'Exam Preparation' },
];

export const BujjiMemoryCoachPanel: React.FC<BujjiMemoryCoachPanelProps> = ({
  memory,
  onSaveMemory,
  coachMode,
  setCoachMode,
  coachQuestion,
  setCoachQuestion,
  coachResult,
  loading,
  allowAiJournalContext,
  onAskCoach,
  onPracticeWeakTopic,
}) => {
  const [draft, setDraft] = useState<BujjiLearningMemory>(memory);
  const [newWeak, setNewWeak] = useState('');
  const [newStrong, setNewStrong] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setDraft(memory);
  }, [memory]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveMemory(draft);
    } finally {
      setSaving(false);
    }
  };

  const addTopic = (kind: 'weak' | 'strong') => {
    const val = (kind === 'weak' ? newWeak : newStrong).trim();
    if (!val) return;
    if (kind === 'weak') {
      setDraft((prev) => ({
        ...prev,
        weakTopics: Array.from(new Set([...prev.weakTopics, val])).slice(0, 25),
      }));
      setNewWeak('');
    } else {
      setDraft((prev) => ({
        ...prev,
        strongTopics: Array.from(new Set([...prev.strongTopics, val])).slice(0, 25),
      }));
      setNewStrong('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Personal AI Learning Memory Profile */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0EDF5]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E9DFFF] text-[#7651E8]">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-black text-[#20202A]">
                Bujji Learning Memory
              </h2>
              <p className="text-xs text-[#777783]">
                Private to your account. Bujji adapts explanations, pacing, and revision advice to this profile.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label htmlFor="mem-level" className="block text-xs font-bold text-[#777783] mb-1">
                Learning Level
              </label>
              <select
                id="mem-level"
                value={draft.learningLevel}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, learningLevel: e.target.value as DifficultyLevel }))
                }
                className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label htmlFor="mem-mode" className="block text-xs font-bold text-[#777783] mb-1">
                Default Response Mode
              </label>
              <select
                id="mem-mode"
                value={draft.preferredMode}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    preferredMode: e.target.value as BujjiResponseMode,
                  }))
                }
                className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              >
                {MODE_LABELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mem-curr" className="block text-xs font-bold text-[#777783] mb-1">
                Curriculum / Exam Track
              </label>
              <input
                id="mem-curr"
                type="text"
                value={draft.curriculum}
                onChange={(e) => setDraft((prev) => ({ ...prev, curriculum: e.target.value }))}
                placeholder="e.g. AP CS, CBSE 12, SAT, University"
                className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="mem-pref" className="block text-xs font-bold text-[#777783] mb-1">
              Study Preferences (How Bujji should teach you)
            </label>
            <input
              id="mem-pref"
              type="text"
              value={draft.studyPreferences}
              onChange={(e) => setDraft((prev) => ({ ...prev, studyPreferences: e.target.value }))}
              placeholder="e.g. Use visual analogies, highlight exam traps, keep math steps concise"
              className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
            />
          </div>

          {/* Weak & Strong Topic Chips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#FFE8F0]/60 p-3.5 space-y-2.5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#B82547]">
                Weak Topics to Revise ({draft.weakTopics.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {draft.weakTopics.length === 0 ? (
                  <span className="text-xs text-[#777783]">
                    Auto-populated when you miss quiz concepts, or add manually.
                  </span>
                ) : (
                  draft.weakTopics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#9C2340]"
                    >
                      <button
                        type="button"
                        onClick={() => onPracticeWeakTopic(topic)}
                        title="Ask Bujji to revise this topic"
                        className="hover:underline cursor-pointer"
                      >
                        {topic}
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${topic}`}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            weakTopics: prev.weakTopics.filter((t) => t !== topic),
                          }))
                        }
                        className="text-[#B82547]/70 hover:text-[#B82547] cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newWeak}
                  onChange={(e) => setNewWeak(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTopic('weak');
                    }
                  }}
                  placeholder="Add weak topic..."
                  className="flex-1 min-h-[36px] rounded-full border border-[#FFD6DF] bg-white px-3 text-xs text-[#20202A] focus:border-[#7651E8] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addTopic('weak')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white border border-[#FFD6DF] text-[#B82547] hover:bg-[#FFF0F3] cursor-pointer"
                  aria-label="Add weak topic"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-[#E2F5E9]/70 p-3.5 space-y-2.5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#1F874D]">
                Mastered Strong Topics ({draft.strongTopics.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {draft.strongTopics.length === 0 ? (
                  <span className="text-xs text-[#777783]">
                    Score 80%+ on quizzes to automatically track strengths!
                  </span>
                ) : (
                  draft.strongTopics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#1F874D]"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{topic}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${topic}`}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            strongTopics: prev.strongTopics.filter((t) => t !== topic),
                          }))
                        }
                        className="text-[#1F874D]/70 hover:text-[#1F874D] cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newStrong}
                  onChange={(e) => setNewStrong(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTopic('strong');
                    }
                  }}
                  placeholder="Add mastered topic..."
                  className="flex-1 min-h-[36px] rounded-full border border-[#C6EBD5] bg-white px-3 text-xs text-[#20202A] focus:border-[#7651E8] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addTopic('strong')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white border border-[#C6EBD5] text-[#1F874D] hover:bg-[#E2F5E9] cursor-pointer"
                  aria-label="Add strong topic"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Learning Memory
            </Button>
          </div>
        </form>

        {/* Recent Quiz Performance History */}
        {memory.recentQuizResults.length > 0 && (
          <div className="pt-3 border-t border-[#F0EDF5] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#777783]">
              <TrendingUp className="h-3.5 w-3.5 text-[#7651E8]" />
              Recent Quiz Analytics
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {memory.recentQuizResults.slice(0, 6).map((qr, i) => (
                <div
                  key={`${qr.topic}-${qr.dateKey}-${i}`}
                  className="rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-[#20202A] truncate">{qr.topic}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono font-bold ${
                        qr.scorePercent >= 80
                          ? 'bg-[#E2F5E9] text-[#1F874D]'
                          : qr.scorePercent >= 60
                          ? 'bg-[#FFF0C9] text-[#8A5A00]'
                          : 'bg-[#FFE8F0] text-[#B82547]'
                      }`}
                    >
                      {qr.scorePercent}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#777783]">
                    {qr.subject} · {qr.dateKey}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Personal Study Coach Q&A */}
      <Card>
        <form onSubmit={(e) => void onAskCoach(e)} className="space-y-4">
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
                className={`min-h-[38px] rounded-full px-4 text-xs font-bold border transition-colors cursor-pointer ${
                  coachMode === m.id
                    ? 'border-[#7651E8] bg-[#E9DFFF] text-[#7651E8]'
                    : 'border-[#F0EDF5] bg-[#F8F5FF] text-[#777783] hover:text-[#20202A]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="coach-question" className="block text-sm font-bold text-[#20202A] mb-1.5">
              Ask Bujji Study Coach
            </label>
            <textarea
              id="coach-question"
              rows={3}
              required
              minLength={2}
              value={coachQuestion}
              onChange={(e) => setCoachQuestion(e.target.value)}
              className="w-full rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-[#777783]">
              Private journal notes are{' '}
              <strong className="text-[#20202A]">
                {allowAiJournalContext ? 'included (opted in)' : 'excluded (private)'}
              </strong>
              . Adjust anytime in Settings.
            </p>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
              Ask Coach
            </Button>
          </div>
        </form>
      </Card>

      {coachResult && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#7651E8]" />
            <h3 className="font-display text-base font-black text-[#20202A]">Bujji Coach Plan</h3>
          </div>
          <BujjiResponseRenderer content={coachResult} />
        </Card>
      )}
    </div>
  );
};
