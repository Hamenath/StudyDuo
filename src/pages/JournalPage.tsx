import React, { useMemo, useState } from 'react';
import { Lock, Pencil, Plus, Search, Share2, Trash2 } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { Button, Card, ConfirmDialog, EmptyState, ModalSheet } from '../components/ui/Primitives';
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
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#20202A] tracking-tight">
            Learning Journal
          </h1>
          <p className="mt-1 text-sm text-[#777783]">
            Private reflections by default — capture takeaways, questions, and blockers.
          </p>
        </div>
        <Button size="sm" onClick={openNewEntry}>
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </header>

      {/* Search & Filters */}
      <Card padding="sm" className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B8A99]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, topics, or takeaways..."
            className="w-full min-h-[44px] rounded-full border border-[#F0EDF5] bg-[#F8F5FF] pl-10 pr-4 text-sm text-[#20202A] placeholder:text-[#8B8A99] focus:border-[#7651E8] focus:bg-white focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by goal"
          value={goalFilter}
          onChange={(e) => setGoalFilter(e.target.value)}
          className="min-h-[44px] rounded-full border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
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
          className="min-h-[44px] rounded-full border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] font-mono focus:bg-white focus:border-[#7651E8] focus:outline-none"
        />

        {(searchQuery || goalFilter !== 'all' || dateFilter) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setGoalFilter('all');
              setDateFilter('');
            }}
          >
            Reset
          </Button>
        )}
      </Card>

      {/* Journal Entries List */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          mascot="language"
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
              <Card key={entry.id} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-black text-[#20202A] leading-snug">{entry.title}</h2>
                    <p className="mt-1.5 text-xs text-[#777783] flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#F8F5FF] px-2.5 py-0.5 font-mono font-bold text-[#20202A] tabular-nums">
                        {entry.date}
                      </span>
                      <span className="rounded-full bg-[#FFF0C9] px-2.5 py-0.5 font-bold text-[#8A5A00]">
                        {entry.topic}
                      </span>
                      {linkedGoal && (
                        <span className="text-[#5C5C6C] font-semibold">{linkedGoal.title}</span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E9DFFF] px-2.5 py-0.5 text-[#7651E8] font-bold">
                        {entry.isSharedWithOwner ? (
                          <>
                            <Share2 className="h-3 w-3" />
                            {isMine ? 'Shared with Owner' : 'Shared by Partner'}
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            Private
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
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full text-[#777783] hover:bg-[#F8F5FF] hover:text-[#20202A] cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(entry)}
                        aria-label={`Delete ${entry.title}`}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full text-[#777783] hover:bg-[#FFF0F3] hover:text-[#C82D4F] cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-[#20202A] leading-relaxed whitespace-pre-wrap">{entry.notes}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#F0EDF5]">
                  {entry.whatILearned && (
                    <div className="rounded-2xl bg-[#E2F5E9] p-4">
                      <p className="text-xs font-extrabold text-[#1F874D]">What I Learned</p>
                      <p className="mt-1 text-sm text-[#20202A] leading-relaxed">{entry.whatILearned}</p>
                    </div>
                  )}
                  {entry.questions && (
                    <div className="rounded-2xl bg-[#E9DFFF] p-4">
                      <p className="text-xs font-extrabold text-[#6842DE]">Questions</p>
                      <p className="mt-1 text-sm text-[#20202A] leading-relaxed">{entry.questions}</p>
                    </div>
                  )}
                  {entry.challenges && (
                    <div className="rounded-2xl bg-[#FFF0C9] p-4">
                      <p className="text-xs font-extrabold text-[#8A5A00]">Challenges</p>
                      <p className="mt-1 text-sm text-[#20202A] leading-relaxed">{entry.challenges}</p>
                    </div>
                  )}
                  {entry.resources && (
                    <div className="rounded-2xl bg-[#FFE8F0] p-4">
                      <p className="text-xs font-extrabold text-[#BE3469]">Resources</p>
                      <p className="mt-1 text-sm text-[#20202A] leading-relaxed break-words">{entry.resources}</p>
                    </div>
                  )}
                </div>
              </Card>
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
            <div className="rounded-2xl bg-[#FFF0F3] border border-[#FFD6DF] px-4 py-2.5 text-sm text-[#B82547]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="journal-title" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Title *
              </label>
              <input
                id="journal-title"
                type="text"
                required
                value={formState.title}
                onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                placeholder="e.g. Recursion mental model clicked"
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="journal-date" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Date *
              </label>
              <input
                id="journal-date"
                type="date"
                required
                value={formState.date}
                onChange={(e) => setFormState((s) => ({ ...s, date: e.target.value }))}
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] font-mono focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="journal-topic" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Topic *
              </label>
              <input
                id="journal-topic"
                type="text"
                required
                value={formState.topic}
                onChange={(e) => setFormState((s) => ({ ...s, topic: e.target.value }))}
                placeholder="e.g. Functions & Closures"
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="journal-goal" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Linked Goal
              </label>
              <select
                id="journal-goal"
                value={formState.goalId}
                onChange={(e) => setFormState((s) => ({ ...s, goalId: e.target.value }))}
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
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
            <label htmlFor="journal-notes" className="block text-xs font-bold text-[#20202A] mb-1.5">
              Study Notes *
            </label>
            <textarea
              id="journal-notes"
              rows={4}
              required
              value={formState.notes}
              onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Summarize what you practiced, key insights, or snippets..."
              className="w-full rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="journal-learned" className="block text-xs font-bold text-[#20202A] mb-1.5">
                What I Learned
              </label>
              <textarea
                id="journal-learned"
                rows={2}
                value={formState.whatILearned}
                onChange={(e) => setFormState((s) => ({ ...s, whatILearned: e.target.value }))}
                className="w-full rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="journal-questions" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Open Questions
              </label>
              <textarea
                id="journal-questions"
                rows={2}
                value={formState.questions}
                onChange={(e) => setFormState((s) => ({ ...s, questions: e.target.value }))}
                className="w-full rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="journal-challenges" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Challenges
              </label>
              <input
                id="journal-challenges"
                type="text"
                value={formState.challenges}
                onChange={(e) => setFormState((s) => ({ ...s, challenges: e.target.value }))}
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="journal-resources" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Resources Referenced
              </label>
              <input
                id="journal-resources"
                type="text"
                value={formState.resources}
                onChange={(e) => setFormState((s) => ({ ...s, resources: e.target.value }))}
                placeholder="Book chapters, docs, video titles..."
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
          </div>

          {canShareWithOwner && (
            <label className="flex items-start gap-3 rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.isSharedWithOwner}
                onChange={(e) => setFormState((s) => ({ ...s, isSharedWithOwner: e.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-[#7651E8]"
              />
              <div>
                <p className="text-sm font-bold text-[#20202A]">Share this entry with the Goal Owner</p>
                <p className="text-xs text-[#777783]">
                  Optional — off by default so your study notes stay strictly private unless you opt in.
                </p>
              </div>
            </label>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingEntry ? 'Save Changes' : 'Save Entry'}
            </Button>
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
