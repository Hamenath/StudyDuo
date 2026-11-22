import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Flag,
  Link2,
  Lock,
  Plus,
  Sparkles,
  Target,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { canManageGoal, getDateKeyInTimezone } from '../lib/gamification';
import { goalSchema, inviteCodeSchema, phaseSchema } from '../lib/validation';
import type { DifficultyLevel, Phase } from '../types/studyduo';
import { Avatar, ConfirmDialog, EmptyState, ModalSheet } from '../components/ui/Primitives';

const CATEGORIES = [
  'Programming',
  'Data Science & AI',
  'UI/UX Design',
  'Languages',
  'Exam Prep',
  'Business & Finance',
  'Cloud & DevOps',
  'Mathematics',
];

export const GoalsPage: React.FC = () => {
  const {
    currentUser,
    goals,
    activeGoal,
    setSelectedGoalId,
    setActivePage,
    participants,
    phases,
    invitations,
    createGoal,
    savePhase,
    deletePhase,
    reorderPhase,
    createInvitation,
    cancelInvitation,
    acceptInvitationByCode,
    showToast,
  } = useStudyDuo();

  const isOwner = canManageGoal(activeGoal || undefined, currentUser?.uid);
  const todayStr = getDateKeyInTimezone(new Date(), currentUser?.timezone || 'UTC');

  // Create Goal modal state
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    category: 'Programming',
    icon: 'code',
    startDate: todayStr,
    durationDays: 60,
    difficulty: 'Intermediate' as DifficultyLevel,
    timezone: currentUser?.timezone || 'UTC',
    dailyTargetMinutes: 60,
    groupName: '',
  });
  const [goalError, setGoalError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Join by Invite Code modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // Phase Editor modal state
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [phaseForm, setPhaseForm] = useState({
    title: '',
    description: '',
    startDay: 1,
    endDay: 10,
    milestoneTitle: '',
    objectivesText: '',
    isPublished: true,
  });
  const [phaseError, setPhaseError] = useState('');
  const [phaseToDelete, setPhaseToDelete] = useState<Phase | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalError('');
    const parsed = goalSchema.safeParse(goalForm);
    if (!parsed.success) {
      setGoalError(parsed.error.issues[0]?.message || 'Please check your goal details.');
      return;
    }
    setSavingGoal(true);
    try {
      const createdId = await createGoal(parsed.data);
      if (createdId) {
        setShowCreateGoal(false);
        setGoalForm({
          ...goalForm,
          title: '',
          description: '',
          groupName: '',
        });
      }
    } finally {
      setSavingGoal(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    const parsed = inviteCodeSchema.safeParse({ code: joinCode });
    if (!parsed.success) {
      setJoinError(parsed.error.issues[0]?.message || 'Enter a valid invitation code.');
      return;
    }
    setJoining(true);
    try {
      const ok = await acceptInvitationByCode(parsed.data.code);
      if (ok) {
        setShowJoinModal(false);
        setJoinCode('');
      }
    } finally {
      setJoining(false);
    }
  };

  const openNewPhase = () => {
    const lastEnd = phases.length > 0 ? phases[phases.length - 1].endDay : 0;
    const nextStart = Math.min(activeGoal?.durationDays || 60, lastEnd + 1);
    const nextEnd = Math.min(activeGoal?.durationDays || 60, nextStart + 9);
    setEditingPhase(null);
    setPhaseForm({
      title: `Phase ${phases.length + 1}: `,
      description: '',
      startDay: nextStart,
      endDay: nextEnd,
      milestoneTitle: '',
      objectivesText: '',
      isPublished: true,
    });
    setPhaseError('');
    setShowPhaseModal(true);
  };

  const openEditPhase = (phase: Phase) => {
    setEditingPhase(phase);
    setPhaseForm({
      title: phase.title,
      description: phase.description,
      startDay: phase.startDay,
      endDay: phase.endDay,
      milestoneTitle: phase.milestoneTitle,
      objectivesText: phase.objectives.join('\n'),
      isPublished: phase.isPublished,
    });
    setPhaseError('');
    setShowPhaseModal(true);
  };

  const handleSavePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal) return;
    setPhaseError('');
    const parsed = phaseSchema.safeParse(phaseForm);
    if (!parsed.success) {
      setPhaseError(parsed.error.issues[0]?.message || 'Check phase fields.');
      return;
    }
    const objectives = parsed.data.objectivesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 10);

    await savePhase(activeGoal.id, {
      id: editingPhase?.id,
      title: parsed.data.title,
      description: parsed.data.description,
      startDay: parsed.data.startDay,
      endDay: parsed.data.endDay,
      milestoneTitle: parsed.data.milestoneTitle,
      objectives,
      isPublished: parsed.data.isPublished,
    });
    setShowPhaseModal(false);
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal) return;
    const created = await createInvitation(activeGoal.id, inviteeEmail);
    if (created) {
      setInviteeEmail('');
    }
  };

  const copyInviteLink = async (code: string) => {
    const shareUrl = `${window.location.origin}/?invite=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedCode(code);
      showToast('Shareable invitation URL copied to clipboard.');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      showToast(`Share code: ${code}`, 'info');
    }
  };

  const goalInvitations = activeGoal
    ? invitations.filter((i) => i.goalId === activeGoal.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#242337]">My Goals</h1>
          <p className="mt-1 text-sm text-[#66687A]">
            Create learning goals, structure roadmap phases, and invite your study partner.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowJoinModal(true)}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[#E9EAF0] bg-white px-4 py-2.5 text-sm font-semibold text-[#242337] hover:bg-[#F8F9FC] transition-colors whitespace-nowrap"
          >
            <Link2 className="h-4 w-4 text-[#7956D8]" />
            Join with Code
          </button>
          <button
            type="button"
            onClick={() => setShowCreateGoal(true)}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#7956D8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6643C7] transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </button>
        </div>
      </div>

      {/* Goals Selector Grid */}
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title="Start your first learning goal"
          description="Define your subject, target duration, and daily study target — then invite a partner to stay accountable together."
          actionLabel="Create Study Goal"
          onAction={() => setShowCreateGoal(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => {
              const selected = g.id === activeGoal?.id;
              const ownedByMe = g.ownerId === currentUser?.uid;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGoalId(g.id)}
                  className={`text-left rounded-2xl bg-white border p-5 transition-all ${
                    selected
                      ? 'border-[#7956D8] ring-1 ring-[#7956D8]/20'
                      : 'border-[#E9EAF0] hover:border-[#7956D8]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-[#66687A]">
                    <span>
                      {g.category} · {g.difficulty} · {g.durationDays} days
                    </span>
                    <span className={`font-semibold ${ownedByMe ? 'text-[#7956D8]' : 'text-[#38A879]'}`}>
                      {ownedByMe ? 'Owner' : 'Partner'}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-bold text-[#242337] leading-snug">{g.title}</h2>
                  {g.description && (
                    <p className="mt-1 text-sm text-[#66687A] line-clamp-2">{g.description}</p>
                  )}
                  <div className="mt-4 pt-3 border-t border-[#E9EAF0] flex items-center justify-between text-xs text-[#66687A] font-mono tabular-nums">
                    <span>
                      {g.startDate} → {g.targetDate}
                    </span>
                    <span>
                      {g.participantIds.length}/{g.maxParticipants} members
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Goal Roadmap & Duo Management */}
          {activeGoal && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
              {/* Roadmap Phases (Left 8 cols) */}
              <section className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#242337]">Learning Roadmap</h2>
                    <p className="text-xs text-[#66687A] mt-0.5">
                      {isOwner
                        ? 'You own this roadmap. Add, reorder, and publish phases for your study partner.'
                        : 'Read-only official roadmap maintained by the goal owner.'}
                    </p>
                  </div>
                  {isOwner ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePage('ai')}
                        className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#F0EBFF] px-3.5 py-2 text-xs font-semibold text-[#7956D8] hover:bg-[#E4DAFF] transition-colors whitespace-nowrap"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Draft Plan
                      </button>
                      <button
                        type="button"
                        onClick={openNewPhase}
                        className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#7956D8] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#6643C7] transition-colors whitespace-nowrap"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Phase
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#66687A]">
                      <Lock className="h-3.5 w-3.5" />
                      Owner-managed
                    </span>
                  )}
                </div>

                {phases.length === 0 ? (
                  <EmptyState
                    icon={<Flag className="h-6 w-6" />}
                    title="No roadmap phases yet"
                    description={
                      isOwner
                        ? 'Break your learning goal into clear milestones (e.g., Phase 1: Fundamentals, Phase 2: Projects) or ask the AI Study Planner to draft one for your review.'
                        : 'The goal owner has not published roadmap phases yet.'
                    }
                    actionLabel={isOwner ? 'Add First Phase' : undefined}
                    onAction={isOwner ? openNewPhase : undefined}
                  />
                ) : (
                  <div className="space-y-3">
                    {phases.map((phase, idx) => (
                      <article
                        key={phase.id}
                        className="rounded-2xl bg-white border border-[#E9EAF0] p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-[#66687A] font-mono tabular-nums">
                              Days {String(phase.startDay).padStart(2, '0')}–{String(phase.endDay).padStart(2, '0')}
                              {' · '}
                              <span className={phase.isPublished ? 'text-[#38A879] font-semibold' : 'text-[#9A6A0A] font-semibold'}>
                                {phase.isPublished ? 'Published' : 'Draft'}
                              </span>
                            </p>
                            <h3 className="mt-1 text-base font-bold text-[#242337]">{phase.title}</h3>
                            {phase.description && (
                              <p className="mt-1 text-sm text-[#66687A] leading-relaxed">
                                {phase.description}
                              </p>
                            )}
                          </div>

                          {isOwner && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => void reorderPhase(activeGoal.id, phase.id, 'up')}
                                aria-label={`Move ${phase.title} up`}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#66687A] hover:bg-[#F8F9FC] disabled:opacity-30"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === phases.length - 1}
                                onClick={() => void reorderPhase(activeGoal.id, phase.id, 'down')}
                                aria-label={`Move ${phase.title} down`}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#66687A] hover:bg-[#F8F9FC] disabled:opacity-30"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void savePhase(activeGoal.id, {
                                    ...phase,
                                    isPublished: !phase.isPublished,
                                  })
                                }
                                aria-label={phase.isPublished ? `Unpublish ${phase.title}` : `Publish ${phase.title}`}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#66687A] hover:bg-[#F8F9FC]"
                              >
                                {phase.isPublished ? <Eye className="h-4 w-4 text-[#38A879]" /> : <EyeOff className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditPhase(phase)}
                                aria-label={`Edit ${phase.title}`}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#66687A] hover:bg-[#F8F9FC]"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPhaseToDelete(phase)}
                                aria-label={`Delete ${phase.title}`}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#E66F77] hover:bg-[#FEECEE]"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {phase.objectives.length > 0 && (
                          <ul className="mt-3 space-y-1.5 text-sm text-[#242337]">
                            {phase.objectives.map((obj, oIdx) => (
                              <li key={oIdx} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#7956D8] shrink-0" />
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {phase.milestoneTitle && (
                          <div className="mt-4 pt-3 border-t border-[#E9EAF0] flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#66687A]">
                              Milestone: <strong className="text-[#242337]">{phase.milestoneTitle}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => setActivePage('checklist')}
                              className="font-semibold text-[#7956D8] hover:underline"
                            >
                              Open Checklist
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {/* Duo Members & Invitations (Right 4 cols) */}
              <aside className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl bg-white border border-[#E9EAF0] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#242337]">Study Duo</h3>
                    <span className="text-xs font-mono text-[#66687A] tabular-nums">
                      {participants.length}/{activeGoal.maxParticipants}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {participants.map((p) => (
                      <div key={p.uid} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={p.displayName}
                            initials={p.avatarInitials}
                            color={p.avatarColor}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#242337] truncate">
                              {p.displayName}
                              {p.uid === currentUser?.uid ? ' (You)' : ''}
                            </p>
                            <p className="text-xs text-[#66687A] truncate">
                              @{p.username} · {p.role === 'owner' ? 'Goal Owner' : 'Partner'}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#7956D8] tabular-nums shrink-0">
                          {p.goalXp} XP
                        </span>
                      </div>
                    ))}
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      disabled={activeGoal.participantIds.length >= activeGoal.maxParticipants}
                      onClick={() => setShowInviteModal(true)}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#F0EBFF] px-4 py-2.5 text-sm font-semibold text-[#7956D8] hover:bg-[#E4DAFF] disabled:opacity-50 transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                      {activeGoal.participantIds.length >= activeGoal.maxParticipants
                        ? 'Duo Roster Full (2/2)'
                        : 'Invite Study Partner'}
                    </button>
                  )}
                </div>

                {/* Active Invitations */}
                {isOwner && goalInvitations.length > 0 && (
                  <div className="rounded-2xl bg-white border border-[#E9EAF0] p-5 space-y-3">
                    <h3 className="text-sm font-bold text-[#242337]">Invitations</h3>
                    <div className="divide-y divide-[#E9EAF0]">
                      {goalInvitations.map((inv) => (
                        <div key={inv.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-bold text-[#242337]">{inv.code}</span>
                            <span
                              className={`text-xs font-semibold capitalize ${
                                inv.status === 'accepted'
                                  ? 'text-[#38A879]'
                                  : inv.status === 'pending'
                                  ? 'text-[#7956D8]'
                                  : 'text-[#88899B]'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                          {inv.inviteeEmail && (
                            <p className="text-xs text-[#66687A] truncate">For: {inv.inviteeEmail}</p>
                          )}
                          {inv.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void copyInviteLink(inv.code)}
                                className="min-h-[36px] flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E9EAF0] bg-[#F8F9FC] px-2.5 text-xs font-semibold text-[#242337] hover:bg-[#F0EBFF]"
                              >
                                {copiedCode === inv.code ? <Check className="h-3.5 w-3.5 text-[#38A879]" /> : <Copy className="h-3.5 w-3.5" />}
                                Copy Link
                              </button>
                              <button
                                type="button"
                                onClick={() => void cancelInvitation(inv.id)}
                                aria-label={`Cancel invite ${inv.code}`}
                                className="min-h-[36px] inline-flex items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#E66F77] hover:bg-[#FEECEE]"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          )}
        </>
      )}

      {/* Create Goal Modal */}
      <ModalSheet
        open={showCreateGoal}
        onClose={() => setShowCreateGoal(false)}
        title="Create Study Goal"
        subtitle="Only you can edit the official roadmap and daily checklists for this goal."
        size="lg"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label htmlFor="goal-title" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Goal title
            </label>
            <input
              id="goal-title"
              value={goalForm.title}
              onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
              placeholder="Become a Python Developer in 60 Days"
              required
              className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="goal-desc" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Learning description
            </label>
            <textarea
              id="goal-desc"
              rows={2}
              value={goalForm.description}
              onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
              placeholder="What outcomes and projects will you build together?"
              className="w-full rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] p-3 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="goal-cat" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Subject / Category
              </label>
              <select
                id="goal-cat"
                value={goalForm.category}
                onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="goal-diff" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Difficulty
              </label>
              <select
                id="goal-diff"
                value={goalForm.difficulty}
                onChange={(e) => setGoalForm({ ...goalForm, difficulty: e.target.value as DifficultyLevel })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="goal-start" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Start date
              </label>
              <input
                id="goal-start"
                type="date"
                value={goalForm.startDate}
                onChange={(e) => setGoalForm({ ...goalForm, startDate: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="goal-dur" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Duration (days)
              </label>
              <input
                id="goal-dur"
                type="number"
                min={1}
                max={365}
                value={goalForm.durationDays}
                onChange={(e) => setGoalForm({ ...goalForm, durationDays: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 text-sm font-mono text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="goal-target-min" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Daily target (min)
              </label>
              <input
                id="goal-target-min"
                type="number"
                min={10}
                max={480}
                value={goalForm.dailyTargetMinutes}
                onChange={(e) => setGoalForm({ ...goalForm, dailyTargetMinutes: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 text-sm font-mono text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="goal-group" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Study group name (optional)
              </label>
              <input
                id="goal-group"
                value={goalForm.groupName}
                onChange={(e) => setGoalForm({ ...goalForm, groupName: e.target.value })}
                placeholder="Python Builders Duo"
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="goal-tz" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Goal timezone
              </label>
              <input
                id="goal-tz"
                value={goalForm.timezone}
                onChange={(e) => setGoalForm({ ...goalForm, timezone: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              />
            </div>
          </div>

          {goalError && <p role="alert" className="text-xs font-medium text-[#E66F77]">{goalError}</p>}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateGoal(false)}
              className="min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-4 text-sm font-medium text-[#242337]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingGoal}
              className="min-h-[44px] rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-60"
            >
              {savingGoal ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </ModalSheet>

      {/* Join Goal Modal */}
      <ModalSheet
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Join a Study Goal"
        subtitle="Enter the invitation code shared by your study partner."
      >
        <form onSubmit={handleJoinByCode} className="space-y-4">
          <div>
            <label htmlFor="join-code-input" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Invitation code
            </label>
            <input
              id="join-code-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="DUO-A1B2C3"
              className="w-full min-h-[46px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-4 text-base font-mono uppercase tracking-wider text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
            />
          </div>
          {joinError && <p role="alert" className="text-xs font-medium text-[#E66F77]">{joinError}</p>}
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="min-h-[44px] rounded-xl border border-[#E9EAF0] px-4 text-sm font-medium text-[#242337]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joining}
              className="min-h-[44px] rounded-xl bg-[#38A879] px-5 text-sm font-semibold text-white hover:bg-[#2E9167] disabled:opacity-60"
            >
              {joining ? 'Joining...' : 'Accept & Join'}
            </button>
          </div>
        </form>
      </ModalSheet>

      {/* Phase Editor Modal */}
      <ModalSheet
        open={showPhaseModal}
        onClose={() => setShowPhaseModal(false)}
        title={editingPhase ? 'Edit Roadmap Phase' : 'Add Roadmap Phase'}
      >
        <form onSubmit={handleSavePhase} className="space-y-4">
          <div>
            <label htmlFor="phase-title" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Phase title
            </label>
            <input
              id="phase-title"
              value={phaseForm.title}
              onChange={(e) => setPhaseForm({ ...phaseForm, title: e.target.value })}
              required
              className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="phase-desc" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Description
            </label>
            <textarea
              id="phase-desc"
              rows={2}
              value={phaseForm.description}
              onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })}
              className="w-full rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] p-3 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="phase-start" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Start day
              </label>
              <input
                id="phase-start"
                type="number"
                min={1}
                max={365}
                value={phaseForm.startDay}
                onChange={(e) => setPhaseForm({ ...phaseForm, startDay: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 text-sm font-mono text-[#242337]"
              />
            </div>
            <div>
              <label htmlFor="phase-end" className="block text-xs font-semibold text-[#242337] mb-1.5">
                End day
              </label>
              <input
                id="phase-end"
                type="number"
                min={1}
                max={365}
                value={phaseForm.endDay}
                onChange={(e) => setPhaseForm({ ...phaseForm, endDay: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 text-sm font-mono text-[#242337]"
              />
            </div>
          </div>
          <div>
            <label htmlFor="phase-milestone" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Milestone project or check-in
            </label>
            <input
              id="phase-milestone"
              value={phaseForm.milestoneTitle}
              onChange={(e) => setPhaseForm({ ...phaseForm, milestoneTitle: e.target.value })}
              placeholder="CLI Expense Tracker Script"
              className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337]"
            />
          </div>
          <div>
            <label htmlFor="phase-obj" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Learning objectives (one per line)
            </label>
            <textarea
              id="phase-obj"
              rows={3}
              value={phaseForm.objectivesText}
              onChange={(e) => setPhaseForm({ ...phaseForm, objectivesText: e.target.value })}
              placeholder="Master variables and data types&#10;Complete 5 hands-on scripts"
              className="w-full rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] p-3 text-sm text-[#242337]"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-[#242337] cursor-pointer">
            <input
              type="checkbox"
              checked={phaseForm.isPublished}
              onChange={(e) => setPhaseForm({ ...phaseForm, isPublished: e.target.checked })}
              className="h-4 w-4 accent-[#7956D8]"
            />
            Publish immediately to study partner
          </label>
          {phaseError && <p role="alert" className="text-xs text-[#E66F77]">{phaseError}</p>}
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowPhaseModal(false)}
              className="min-h-[44px] rounded-xl border border-[#E9EAF0] px-4 text-sm font-medium text-[#242337]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7]"
            >
              Save Phase
            </button>
          </div>
        </form>
      </ModalSheet>

      {/* Invite Partner Modal */}
      <ModalSheet
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Study Partner"
        subtitle="Generate a unique invitation code and shareable URL valid for 7 days."
      >
        <form onSubmit={handleGenerateInvite} className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Partner’s email (optional note)
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteeEmail}
              onChange={(e) => setInviteeEmail(e.target.value)}
              placeholder="partner@example.com"
              className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337]"
            />
          </div>
          <button
            type="submit"
            className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#7956D8] text-sm font-semibold text-white hover:bg-[#6643C7]"
          >
            <Users className="h-4 w-4" />
            Generate Invite Code & Link
          </button>
        </form>
      </ModalSheet>

      <ConfirmDialog
        open={Boolean(phaseToDelete)}
        title="Delete roadmap phase?"
        description={`Remove "${phaseToDelete?.title}" from this goal roadmap? Existing daily tasks will remain untouched.`}
        confirmLabel="Delete Phase"
        onCancel={() => setPhaseToDelete(null)}
        onConfirm={() => {
          if (activeGoal && phaseToDelete) {
            void deletePhase(activeGoal.id, phaseToDelete.id);
          }
          setPhaseToDelete(null);
        }}
      />
    </div>
  );
};
