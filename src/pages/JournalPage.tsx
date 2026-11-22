import React, { useMemo, useState } from 'react';
import { BookOpen, Lock, Pencil, Plus, Search, Share2, Trash2 } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { ConfirmDialog, EmptyState, ModalSheet } from '../components/ui/Primitives';
import { getDateKeyInTimezone } from '../lib/gamification';
import { journalSchema } from '../lib/validation';
import type { JournalEntry } from '../types/studyduo';

export const JournalPage: React.FC = () => {
  const {
    currentUser,
    goals,
    activeGoal,
    journalEntries,
    saveJournalEntry,
    deleteJournalEntry,
  } = useStudyDuo();

  const [searchQuery, setSearchQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);

  const todayKey = useMemo(
    () => getDateKeyInTimezone(new Date(), currentUser?.timezone || 'UTC'),
    [currentUser?.timezone]
  );

  const [formState, setFormState] = useState({
    title: '',
    date: todayKey,
    goalId: activeGoal?.id || '',
    topic: '',
    notes: '',
    whatILearned: '',
    questions: '',
    challenges: '',
    resources: '',
    isSharedWithOwner: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return journalEntries.filter((entry) => {
      if (goalFilter !== 'all' && entry.goalId !== goalFilter) return false;
      if (dateFilter && entry.date !== dateFilter) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.topic.toLowerCase().includes(q) ||
        entry.notes.toLowerCase().includes(q) ||
        entry.whatILearned.toLowerCase().includes(q)
      );
    });
  }, [dateFilter, goalFilter, journalEntries, searchQuery]);

  const openNewEntry = () => {
    setEditingEntry(null);
    setFormError(null);
    setFormState({
      title: '',
      date: todayKey,
      goalId: activeGoal?.id || '',
      topic: '',
      notes: '',
      whatILearned: '',
      questions: '',
      challenges: '',
      resources: '',
      isSharedWithOwner: false,
    });
    setEditorOpen(true);
  };

  const openEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormError(null);
    setFormState({
      title: entry.title,
      date: entry.date,
      goalId: entry.goalId || '',
      topic: entry.topic,
      notes: entry.notes,
      whatILearned: entry.whatILearned,
      questions: entry.questions,
      challenges: entry.challenges,
      resources: entry.resources,
      isSharedWithOwner: entry.isSharedWithOwner,
    });
    setEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = journalSchema.safeParse(formState);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || 'Please complete required journal fields.';
      setFormError(firstErr);
      return;
    }
    setSubmitting(true);
    try {
      await saveJournalEntry({
        id: editingEntry?.id,
        goalId: parsed.data.goalId || undefined,
        title: parsed.data.title,
        date: parsed.data.date,
        topic: parsed.data.topic,
        notes: parsed.data.notes,
        whatILearned: parsed.data.whatILearned,
        questions: parsed.data.questions,
        challenges: parsed.data.challenges,
        resources: parsed.data.resources,
        isSharedWithOwner: parsed.data.isSharedWithOwner,
      });
      setEditorOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGoalForForm = goals.find((g) => g.id === formState.goalId);
  const canShareWithOwner = Boolean(
    selectedGoalForForm && currentUser && selectedGoalForForm.ownerId !== currentUser.uid
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242337] tracking-tight">Learning Journal</h1>
          <p className="mt-1 text-sm text-[#66687A]">
            Private reflections by default — capture takeaways, questions, and blockers.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewEntry}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7] transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Entry
        </button>
      </header>

      {/* Search & Filters */}
      <section className="rounded-2xl border border-[#E9EAF0] bg-white p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#88899B]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, topics, or takeaways..."
            className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] pl-10 pr-3.5 text-sm text-[#242337] placeholder:text-[#88899B] focus:border-[#7956D8] focus:bg-white focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by goal"
          value={goalFilter}
          onChange={(e) => setGoalFilter(e.target.value)}
          className="min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
        >
          <option value="all">All Goals</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>

        <input
          type="date"
          aria-label="Filter by date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-3.5 text-sm text-[#242337] font-mono focus:border-[#7956D8] focus:outline-none"
        />

        {(searchQuery || goalFilter !== 'all' || dateFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setGoalFilter('all');
              setDateFilter('');
            }}
            className="min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-xs font-semibold text-[#66687A] hover:text-[#242337]"
          >
            Reset
          </button>
        )}
      </section>

      {/* Journal Entries List */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={journalEntries.length === 0 ? 'Start your learning journal' : 'No matching journal entries'}
          description={
            journalEntries.length === 0
              ? 'Writing 3 minutes of reflection after studying boosts retention and gives you searchable study notes.'
              : 'Try clearing your search or date filter.'
          }
          actionLabel={journalEntries.length === 0 ? 'Write First Entry' : undefined}
          onAction={journalEntries.length === 0 ? openNewEntry : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => {
            const isMine = entry.userId === currentUser?.uid;
            const linkedGoal = goals.find((g) => g.id === entry.goalId);
            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#242337] leading-snug">{entry.title}</h2>
                    <p className="mt-1 text-xs text-[#66687A] flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono tabular-nums">{entry.date}</span>
                      <span>·</span>
                      <span>{entry.topic}</span>
                      {linkedGoal && (
                        <>
                          <span>·</span>
                          <span>{linkedGoal.title}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-[#7956D8] font-medium">
                        {entry.isSharedWithOwner ? (
                          <>
                            <Share2 className="h-3 w-3" />
                            {isMine ? 'Shared with Goal Owner' : 'Shared by Partner'}
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 text-[#66687A]" />
                            <span className="text-[#66687A]">Private</span>
                          </>
                        )}
                      </span>
                    </p>
                  </div>

                  {isMine && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditEntry(entry)}
                        aria-label={`Edit ${entry.title}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#66687A] hover:bg-[#F8F9FC] hover:text-[#242337]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(entry)}
                        aria-label={`Delete ${entry.title}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#66687A] hover:bg-[#FFF0F1] hover:text-[#E66F77]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-[#242337] leading-relaxed whitespace-pre-wrap">{entry.notes}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E9EAF0]">
                  {entry.whatILearned && (
                    <div className="rounded-xl bg-[#E7F6EE]/60 p-3.5">
                      <p className="text-xs font-semibold text-[#237B54]">What I Learned</p>
                      <p className="mt-1 text-sm text-[#242337] leading-relaxed">{entry.whatILearned}</p>
                    </div>
                  )}
                  {entry.questions && (
                    <div className="rounded-xl bg-[#F0EBFF]/60 p-3.5">
                      <p className="text-xs font-semibold text-[#5E3DB7]">Questions</p>
                      <p className="mt-1 text-sm text-[#242337] leading-relaxed">{entry.questions}</p>
                    </div>
                  )}
                  {entry.challenges && (
                    <div className="rounded-xl bg-[#FFF6E5]/70 p-3.5">
                      <p className="text-xs font-semibold text-[#9C6C14]">Challenges</p>
                      <p className="mt-1 text-sm text-[#242337] leading-relaxed">{entry.challenges}</p>
                    </div>
                  )}
                  {entry.resources && (
                    <div className="rounded-xl bg-[#F8F9FC] p-3.5">
                      <p className="text-xs font-semibold text-[#66687A]">Resources</p>
                      <p className="mt-1 text-sm text-[#242337] leading-relaxed break-words">{entry.resources}</p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <ModalSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingEntry ? 'Edit Journal Entry' : 'New Learning Journal Entry'}
        subtitle="Your journal entries are private by default."
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-[#FFF0F1] border border-[#E66F77]/40 px-3.5 py-2.5 text-sm text-[#B83B45]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="journal-title" className="block text-sm font-medium text-[#242337] mb-1">
                Title *
              </label>
              <input
                id="journal-title"
                type="text"
                required
                value={formState.title}
                onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                placeholder="e.g. Recursion mental model clicked"
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="journal-date" className="block text-sm font-medium text-[#242337] mb-1">
                Date *
              </label>
              <input
                id="journal-date"
                type="date"
                required
                value={formState.date}
                onChange={(e) => setFormState((s) => ({ ...s, date: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm text-[#242337] font-mono focus:border-[#7956D8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="journal-topic" className="block text-sm font-medium text-[#242337] mb-1">
                Topic *
              </label>
              <input
                id="journal-topic"
                type="text"
                required
                value={formState.topic}
                onChange={(e) => setFormState((s) => ({ ...s, topic: e.target.value }))}
                placeholder="e.g. Functions & Closures"
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="journal-goal" className="block text-sm font-medium text-[#242337] mb-1">
                Linked Goal
              </label>
              <select
                id="journal-goal"
                value={formState.goalId}
                onChange={(e) => setFormState((s) => ({ ...s, goalId: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              >
                <option value="">General Reflection</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="journal-notes" className="block text-sm font-medium text-[#242337] mb-1">
              Study Notes *
            </label>
            <textarea
              id="journal-notes"
              rows={4}
              required
              value={formState.notes}
              onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Summarize what you practiced, key insights, or snippets..."
              className="w-full rounded-xl border border-[#E9EAF0] p-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="journal-learned" className="block text-sm font-medium text-[#242337] mb-1">
                What I Learned
              </label>
              <textarea
                id="journal-learned"
                rows={2}
                value={formState.whatILearned}
                onChange={(e) => setFormState((s) => ({ ...s, whatILearned: e.target.value }))}
                className="w-full rounded-xl border border-[#E9EAF0] p-3 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="journal-questions" className="block text-sm font-medium text-[#242337] mb-1">
                Open Questions
              </label>
              <textarea
                id="journal-questions"
                rows={2}
                value={formState.questions}
                onChange={(e) => setFormState((s) => ({ ...s, questions: e.target.value }))}
                className="w-full rounded-xl border border-[#E9EAF0] p-3 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="journal-challenges" className="block text-sm font-medium text-[#242337] mb-1">
                Challenges
              </label>
              <input
                id="journal-challenges"
                type="text"
                value={formState.challenges}
                onChange={(e) => setFormState((s) => ({ ...s, challenges: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="journal-resources" className="block text-sm font-medium text-[#242337] mb-1">
                Resources Referenced
              </label>
              <input
                id="journal-resources"
                type="text"
                value={formState.resources}
                onChange={(e) => setFormState((s) => ({ ...s, resources: e.target.value }))}
                placeholder="Book chapters, docs, video titles..."
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>
          </div>

          {canShareWithOwner && (
            <label className="flex items-start gap-3 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] p-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.isSharedWithOwner}
                onChange={(e) => setFormState((s) => ({ ...s, isSharedWithOwner: e.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-[#7956D8]"
              />
              <div>
                <p className="text-sm font-medium text-[#242337]">Share this entry with the Goal Owner</p>
                <p className="text-xs text-[#66687A]">
                  Optional — off by default so your study notes stay strictly private unless you opt in.
                </p>
              </div>
            </label>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="min-h-[44px] rounded-xl border border-[#E9EAF0] px-4 text-sm font-medium text-[#242337]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editingEntry ? 'Save Changes' : 'Save Entry'}
            </button>
          </div>
        </form>
      </ModalSheet>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Journal Entry"
        description={`Delete "${deleteTarget?.title || ''}"? This cannot be undone.`}
        confirmLabel="Delete Entry"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteJournalEntry(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};
