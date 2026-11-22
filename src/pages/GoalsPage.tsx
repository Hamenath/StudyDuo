import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  Compass,
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
import { addDaysToDateKey, canManageGoal, getDateKeyInTimezone } from '../lib/gamification';
import { goalSchema, inviteCodeSchema, phaseSchema } from '../lib/validation';
import type { DifficultyLevel, Phase } from '../types/studyduo';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ModalSheet,
  ProgressBar,
} from '../components/ui/Primitives';

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

type NodeState = 'completed' | 'current' | 'upcoming' | 'locked';

export const GoalsPage: React.FC = () => {
  const {
    currentUser,
    goals,
    activeGoal,
    setSelectedGoalId,
    setActivePage,
    participants,
    phases,
    tasks,
    completions,
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

  const myCompletedTaskIds = useMemo(() => {
    if (!currentUser) return new Set<string>();
    return new Set(completions.filter((c) => c.userId === currentUser.uid).map((c) => c.taskId));
  }, [completions, currentUser]);

  // Compute adventure roadmap nodes with completion %, task counts, target dates, and status
  const roadmapNodes = useMemo(() => {
    const sorted = [...phases].sort((a, b) => a.order - b.order);
    let foundCurrent = false;

    return sorted.map((phase) => {
      const phaseTasks = tasks.filter(
        (t) =>
          !t.isArchived &&
          (t.isPublished || isOwner) &&
          t.dayNumber >= phase.startDay &&
          t.dayNumber <= phase.endDay
      );
      const completedCount = phaseTasks.filter((t) => myCompletedTaskIds.has(t.id)).length;
      const pct = phaseTasks.length > 0 ? Math.round((completedCount / phaseTasks.length) * 100) : 0;
      const targetDate = activeGoal?.startDate
        ? addDaysToDateKey(activeGoal.startDate, Math.max(0, phase.endDay - 1))
        : null;

      let state: NodeState;
      if (!phase.isPublished && !isOwner) {
        state = 'locked';
      } else if (phaseTasks.length > 0 && pct === 100) {
        state = 'completed';
      } else if (!foundCurrent) {
        state = 'current';
        foundCurrent = true;
      } else if (!phase.isPublished) {
        state = 'locked';
      } else {
        state = 'upcoming';
      }

      return {
        phase,
        taskCount: phaseTasks.length,
        completedCount,
        pct,
        targetDate,
        state,
      };
    });
  }, [activeGoal?.startDate, isOwner, myCompletedTaskIds, phases, tasks]);

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
        setGoalForm({ ...goalForm, title: '', description: '', groupName: '' });
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
    if (created) setInviteeEmail('');
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7956E8]">
            <Compass className="h-3.5 w-3.5" />
            Roadmap Adventure
          </div>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#25243A]">
            Goals &amp; Milestone Map
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#77768C]">
            Follow your connected learning adventure, track milestones, and level up with your duo.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setShowJoinModal(true)}>
            <Link2 className="h-4 w-4 text-[#7956E8]" />
            Join with Code
          </Button>
          <Button size="sm" onClick={() => setShowCreateGoal(true)}>
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        </div>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title="Start your first learning adventure"
          description="Define your subject, target duration, and daily study target — then invite a partner to stay accountable together."
          actionLabel="Create Study Goal"
          onAction={() => setShowCreateGoal(true)}
        />
      ) : (
        <>
          {/* Goal Switcher Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => {
              const selected = g.id === activeGoal?.id;
              const ownedByMe = g.ownerId === currentUser?.uid;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGoalId(g.id)}
                  className={`text-left rounded-2xl bg-white border p-5 transition-all cursor-pointer ${
                    selected
                      ? 'border-[#7956E8] ring-2 ring-[#7956E8]/15 shadow-[0_6px_20px_rgba(121,86,232,0.1)]'
                      : 'border-[#EAE7F8] hover:border-[#CFC6F7]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-[#77768C]">
                    <span className="truncate">
                      {g.category} · {g.difficulty} · {g.durationDays}d
                    </span>
                    <span
                      className={`font-bold shrink-0 ${
                        ownedByMe ? 'text-[#7956E8]' : 'text-[#38B982]'
                      }`}
                    >
                      {ownedByMe ? 'Owner' : 'Partner'}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-extrabold text-[#25243A] leading-snug">
                    {g.title}
                  </h2>
                  {g.description && (
                    <p className="mt-1 text-xs sm:text-sm text-[#77768C] line-clamp-2">
                      {g.description}
                    </p>
                  )}
                  <div className="mt-4 pt-3 border-t border-[#F1EEFA] flex items-center justify-between text-xs text-[#77768C] font-mono tabular-nums">
                    <span>
                      {g.startDate} → {g.targetDate}
                    </span>
                    <span>
                      {g.participantIds.length}/{g.maxParticipants} players
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Connected Adventure Map + Duo Roster */}
          {activeGoal && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1 items-start">
              {/* Adventure Timeline (Left 8 cols) */}
              <section className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#25243A]">Milestone Journey</h2>
                    <p className="text-xs text-[#77768C] mt-0.5">
                      {isOwner
                        ? 'You own this roadmap. Add, reorder, and publish milestones for your partner.'
                        : 'Read-only official roadmap maintained by the goal owner.'}
                    </p>
                  </div>
                  {isOwner ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="secondary" size="sm" onClick={() => setActivePage('ai')}>
                        <Sparkles className="h-3.5 w-3.5 text-[#7956E8]" />
                        AI Draft Plan
                      </Button>
                      <Button size="sm" onClick={openNewPhase}>
                        <Plus className="h-3.5 w-3.5" />
                        Add Phase
                      </Button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#EAE7F8] px-3 py-1.5 text-xs font-semibold text-[#77768C]">
                      <Lock className="h-3.5 w-3.5 text-[#7956E8]" />
                      Owner-managed
                    </span>
                  )}
                </div>

                {roadmapNodes.length === 0 ? (
                  <EmptyState
                    icon={<Flag className="h-6 w-6" />}
                    title="No roadmap milestones yet"
                    description={
                      isOwner
                        ? 'Break your learning goal into connected milestones or ask AI Coach to draft a roadmap for your approval.'
                        : 'The goal owner has not published roadmap milestones yet.'
                    }
                    actionLabel={isOwner ? 'Add First Phase' : undefined}
                    onAction={isOwner ? openNewPhase : undefined}
                  />
                ) : (
                  <div className="relative pl-10 sm:pl-12 space-y-4">
                    {/* Vertical Adventure Connector Line */}
                    <div
                      aria-hidden="true"
                      className="absolute left-[17px] sm:left-[21px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#38B982] via-[#7956E8] to-[#E2DCF8]"
                    />

                    {roadmapNodes.map(({ phase, taskCount, completedCount, pct, targetDate, state }, idx) => {
                      const stateMeta =
                        state === 'completed'
                          ? { label: 'Completed', text: 'text-[#1F8B5D]', bg: 'bg-[#E6F8F0]' }
                          : state === 'current'
                          ? { label: 'Current Stage', text: 'text-[#7956E8]', bg: 'bg-[#F1EDFF]' }
                          : state === 'locked'
                          ? { label: 'Locked Draft', text: 'text-[#77768C]', bg: 'bg-[#F3F2FA]' }
                          : { label: 'Upcoming', text: 'text-[#1D8597]', bg: 'bg-[#E5F8FB]' };

                      return (
                        <article
                          key={phase.id}
                          className={`relative rounded-2xl border bg-white p-4 sm:p-5 transition-all ${
                            state === 'current'
                              ? 'border-[#7956E8] shadow-[0_8px_24px_rgba(121,86,232,0.12)]'
                              : state === 'completed'
                              ? 'border-[#BFEFD9]'
                              : 'border-[#EAE7F8]'
                          }`}
                        >
                          {/* Connected Node Marker */}
                          <div
                            aria-hidden="true"
                            className={`absolute -left-10 sm:-left-12 top-5 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl border-2 text-xs font-extrabold shadow-sm ${
                              state === 'completed'
                                ? 'border-[#38B982] bg-[#38B982] text-white'
                                : state === 'current'
                                ? 'border-[#7956E8] bg-[#7956E8] text-white ring-4 ring-[#7956E8]/15'
                                : state === 'locked'
                                ? 'border-[#E2DCF8] bg-[#F5F3FC] text-[#9A98B0]'
                                : 'border-[#45C4D8] bg-white text-[#1D8597]'
                            }`}
                          >
                            {state === 'completed' ? (
                              <Check className="h-4 w-4 stroke-[3]" />
                            ) : state === 'locked' ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${stateMeta.bg} ${stateMeta.text}`}>
                                  {stateMeta.label}
                                </span>
                                <span className="font-mono text-[#77768C] tabular-nums">
                                  Days {String(phase.startDay).padStart(2, '0')}–{String(phase.endDay).padStart(2, '0')}
                                </span>
                                {targetDate && (
                                  <span className="inline-flex items-center gap-1 text-[#77768C]">
                                    <Calendar className="h-3 w-3" />
                                    {targetDate}
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-1.5 text-base font-extrabold text-[#25243A] leading-snug">
                                {phase.title}
                              </h3>
                              {phase.description && (
                                <p className="mt-1 text-xs sm:text-sm text-[#77768C] leading-relaxed">
                                  {phase.description}
                                </p>
                              )}
                            </div>

                            {isOwner && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => void reorderPhase(activeGoal.id, phase.id, 'up')}
                                  aria-label={`Move ${phase.title} up`}
                                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#77768C] hover:bg-[#F3F0FF] disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === roadmapNodes.length - 1}
                                  onClick={() => void reorderPhase(activeGoal.id, phase.id, 'down')}
                                  aria-label={`Move ${phase.title} down`}
                                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#77768C] hover:bg-[#F3F0FF] disabled:opacity-30 cursor-pointer"
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
                                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#77768C] hover:bg-[#F3F0FF] cursor-pointer"
                                >
                                  {phase.isPublished ? (
                                    <Eye className="h-4 w-4 text-[#38B982]" />
                                  ) : (
                                    <EyeOff className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditPhase(phase)}
                                  aria-label={`Edit ${phase.title}`}
                                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#77768C] hover:bg-[#F3F0FF] cursor-pointer"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPhaseToDelete(phase)}
                                  aria-label={`Delete ${phase.title}`}
                                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#E66F77] hover:bg-[#FFF0F1] cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Milestone Completion Progress */}
                          <div className="mt-3.5 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[#77768C] tabular-nums">
                                {taskCount > 0
                                  ? `${completedCount}/${taskCount} quests completed`
                                  : 'No quests assigned yet'}
                              </span>
                              <span className="font-extrabold text-[#25243A] tabular-nums">{pct}%</span>
                            </div>
                            <ProgressBar
                              percent={pct}
                              color={
                                state === 'completed'
                                  ? '#38B982'
                                  : state === 'current'
                                  ? '#7956E8'
                                  : '#45C4D8'
                              }
                              height="h-2"
                            />
                          </div>

                          {phase.objectives.length > 0 && (
                            <ul className="mt-3 space-y-1 text-xs sm:text-sm text-[#3E3C56]">
                              {phase.objectives.map((obj, oIdx) => (
                                <li key={oIdx} className="flex items-start gap-2">
                                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#A78BFA] shrink-0" />
                                  <span>{obj}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {phase.milestoneTitle && (
                            <div className="mt-3.5 pt-3 border-t border-[#F1EEFA] flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="text-[#77768C]">
                                Milestone:{' '}
                                <strong className="font-bold text-[#25243A]">
                                  {phase.milestoneTitle}
                                </strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => setActivePage('checklist')}
                                className="font-bold text-[#7956E8] hover:underline cursor-pointer"
                              >
                                Open Quest Center
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Study Duo & Invitations (Right 4 cols) */}
              <aside className="lg:col-span-4 space-y-4">
                <Card className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-[#25243A]">Study Duo</h3>
                    <span className="text-xs font-mono font-bold text-[#7956E8] tabular-nums">
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
                            avatarConfig={p.avatarConfig}
                            seedKey={p.uid}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#25243A] truncate">
                              {p.displayName}
                              {p.uid === currentUser?.uid ? ' (You)' : ''}
                            </p>
                            <p className="text-xs text-[#77768C] truncate">
                              @{p.username} · {p.role === 'owner' ? 'Owner' : 'Partner'}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-extrabold text-[#7956E8] tabular-nums shrink-0">
                          {p.goalXp} XP
                        </span>
                      </div>
                    ))}
                  </div>

                  {isOwner && (
                    <Button
                      variant="secondary"
                      fullWidth
                      disabled={activeGoal.participantIds.length >= activeGoal.maxParticipants}
                      onClick={() => setShowInviteModal(true)}
                    >
                      <UserPlus className="h-4 w-4 text-[#7956E8]" />
                      {activeGoal.participantIds.length >= activeGoal.maxParticipants
                        ? 'Duo Roster Full (2/2)'
                        : 'Invite Study Partner'}
                    </Button>
                  )}
                </Card>

                {isOwner && goalInvitations.length > 0 && (
                  <Card className="space-y-3">
                    <h3 className="text-sm font-extrabold text-[#25243A]">Invitations</h3>
                    <div className="divide-y divide-[#F1EEFA]">
                      {goalInvitations.map((inv) => (
                        <div key={inv.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-bold text-[#25243A]">
                              {inv.code}
                            </span>
                            <span
                              className={`text-xs font-bold capitalize ${
                                inv.status === 'accepted'
                                  ? 'text-[#38B982]'
                                  : inv.status === 'pending'
                                  ? 'text-[#7956E8]'
                                  : 'text-[#88899B]'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                          {inv.inviteeEmail && (
                            <p className="text-xs text-[#77768C] truncate">For: {inv.inviteeEmail}</p>
                          )}
                          {inv.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void copyInviteLink(inv.code)}
                                className="min-h-[36px] flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-2.5 text-xs font-bold text-[#25243A] hover:bg-[#F1EDFF] cursor-pointer"
                              >
                                {copiedCode === inv.code ? (
                                  <Check className="h-3.5 w-3.5 text-[#38B982]" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                                Copy Link
                              </button>
                              <button
                                type="button"
                                onClick={() => void cancelInvitation(inv.id)}
                                aria-label={`Cancel invite ${inv.code}`}
                                className="min-h-[36px] inline-flex items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-bold text-[#E66F77] hover:bg-[#FFF0F1] cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
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
        subtitle="Only you can edit the official roadmap and daily quests for this goal."
        size="lg"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label htmlFor="goal-title" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Goal title
            </label>
            <input
              id="goal-title"
              value={goalForm.title}
              onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
              placeholder="Become a Python Developer in 60 Days"
              required
              className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="goal-desc" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Learning description
            </label>
            <textarea
              id="goal-desc"
              rows={2}
              value={goalForm.description}
              onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
              placeholder="What outcomes and projects will you build together?"
              className="w-full rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] p-3 text-sm text-[#25243A] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="goal-cat" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Subject / Category
              </label>
              <select
                id="goal-cat"
                value={goalForm.category}
                onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm text-[#25243A]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="goal-diff" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Difficulty
              </label>
              <select
                id="goal-diff"
                value={goalForm.difficulty}
                onChange={(e) => setGoalForm({ ...goalForm, difficulty: e.target.value as DifficultyLevel })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm text-[#25243A]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="goal-start" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Start date
              </label>
              <input
                id="goal-start"
                type="date"
                value={goalForm.startDate}
                onChange={(e) => setGoalForm({ ...goalForm, startDate: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm text-[#25243A]"
              />
            </div>
            <div>
              <label htmlFor="goal-dur" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Duration (days)
              </label>
              <input
                id="goal-dur"
                type="number"
                min={1}
                max={365}
                value={goalForm.durationDays}
                onChange={(e) => setGoalForm({ ...goalForm, durationDays: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm font-mono text-[#25243A]"
              />
            </div>
            <div>
              <label htmlFor="goal-target-min" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Daily target (min)
              </label>
              <input
                id="goal-target-min"
                type="number"
                min={10}
                max={480}
                value={goalForm.dailyTargetMinutes}
                onChange={(e) => setGoalForm({ ...goalForm, dailyTargetMinutes: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm font-mono text-[#25243A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="goal-group" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Study group name (optional)
              </label>
              <input
                id="goal-group"
                value={goalForm.groupName}
                onChange={(e) => setGoalForm({ ...goalForm, groupName: e.target.value })}
                placeholder="Python Builders Duo"
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A]"
              />
            </div>
            <div>
              <label htmlFor="goal-tz" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Goal timezone
              </label>
              <input
                id="goal-tz"
                value={goalForm.timezone}
                onChange={(e) => setGoalForm({ ...goalForm, timezone: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A]"
              />
            </div>
          </div>

          {goalError && <p role="alert" className="text-xs font-semibold text-[#E66F77]">{goalError}</p>}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreateGoal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingGoal}>
              {savingGoal ? 'Creating...' : 'Create Goal'}
            </Button>
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
            <label htmlFor="join-code-input" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Invitation code
            </label>
            <input
              id="join-code-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="DUO-A1B2C3"
              className="w-full min-h-[46px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-4 text-base font-mono uppercase tracking-wider text-[#25243A]"
            />
          </div>
          {joinError && <p role="alert" className="text-xs font-semibold text-[#E66F77]">{joinError}</p>}
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" type="button" onClick={() => setShowJoinModal(false)}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={joining}>
              {joining ? 'Joining...' : 'Accept & Join'}
            </Button>
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
            <label htmlFor="phase-title" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Phase title
            </label>
            <input
              id="phase-title"
              value={phaseForm.title}
              onChange={(e) => setPhaseForm({ ...phaseForm, title: e.target.value })}
              required
              className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A]"
            />
          </div>
          <div>
            <label htmlFor="phase-desc" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Description
            </label>
            <textarea
              id="phase-desc"
              rows={2}
              value={phaseForm.description}
              onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })}
              className="w-full rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] p-3 text-sm text-[#25243A]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="phase-start" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Start day
              </label>
              <input
                id="phase-start"
                type="number"
                min={1}
                max={365}
                value={phaseForm.startDay}
                onChange={(e) => setPhaseForm({ ...phaseForm, startDay: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm font-mono text-[#25243A]"
              />
            </div>
            <div>
              <label htmlFor="phase-end" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                End day
              </label>
              <input
                id="phase-end"
                type="number"
                min={1}
                max={365}
                value={phaseForm.endDay}
                onChange={(e) => setPhaseForm({ ...phaseForm, endDay: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm font-mono text-[#25243A]"
              />
            </div>
          </div>
          <div>
            <label htmlFor="phase-milestone" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Milestone project or check-in
            </label>
            <input
              id="phase-milestone"
              value={phaseForm.milestoneTitle}
              onChange={(e) => setPhaseForm({ ...phaseForm, milestoneTitle: e.target.value })}
              placeholder="CLI Expense Tracker Script"
              className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A]"
            />
          </div>
          <div>
            <label htmlFor="phase-obj" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Learning objectives (one per line)
            </label>
            <textarea
              id="phase-obj"
              rows={3}
              value={phaseForm.objectivesText}
              onChange={(e) => setPhaseForm({ ...phaseForm, objectivesText: e.target.value })}
              placeholder="Master variables and data types&#10;Complete 5 hands-on scripts"
              className="w-full rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] p-3 text-sm text-[#25243A]"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-[#25243A] cursor-pointer">
            <input
              type="checkbox"
              checked={phaseForm.isPublished}
              onChange={(e) => setPhaseForm({ ...phaseForm, isPublished: e.target.checked })}
              className="h-4 w-4 accent-[#7956E8]"
            />
            Publish immediately to study partner
          </label>
          {phaseError && <p role="alert" className="text-xs text-[#E66F77]">{phaseError}</p>}
          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowPhaseModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Phase</Button>
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
            <label htmlFor="invite-email" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Partner&apos;s email (optional note)
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteeEmail}
              onChange={(e) => setInviteeEmail(e.target.value)}
              placeholder="partner@example.com"
              className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A]"
            />
          </div>
          <Button type="submit" fullWidth>
            <Users className="h-4 w-4" />
            Generate Invite Code &amp; Link
          </Button>
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
