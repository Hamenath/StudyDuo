import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { Avatar, Button, Card, ConfirmDialog, EmptyState, ModalSheet, ProgressBar } from '../components/ui/Primitives';
import { MascotImage } from '../components/ui/MascotArtwork';
import { SocialShareComponent } from '../components/groups/SocialShareComponent';
import { canManageGoal, getDateKeyInTimezone, getLevelInfo } from '../lib/gamification';
import { extractInviteCodeFromInput } from '../lib/socialShare';
import { goalSchema, inviteCodeSchema } from '../lib/validation';
import type { DifficultyLevel, Goal } from '../types/studyduo';

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

export const StudyGroupsPage: React.FC = () => {
  const {
    currentUser,
    activeGoal,
    goals,
    tasks,
    completions,
    setSelectedGoalId,
    participants,
    activity,
    invitations,
    createGoal,
    updateGoal,
    deleteGoal,
    createInvitation,
    cancelInvitation,
    acceptInvitationByCode,
    pendingInviteCodeFromUrl,
    clearPendingInviteCodeFromUrl,
    setActivePage,
    showToast,
  } = useStudyDuo();

  const todayStr = getDateKeyInTimezone(new Date(), currentUser?.timezone || 'UTC');

  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [renamingGoal, setRenamingGoal] = useState<Goal | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [goalTitleInput, setGoalTitleInput] = useState('');
  const [duoToDelete, setDuoToDelete] = useState<Goal | null>(null);

  const [showCreateDuoModal, setShowCreateDuoModal] = useState(false);
  const [duoForm, setDuoForm] = useState({
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
  const [duoFormError, setDuoFormError] = useState('');
  const [creatingDuo, setCreatingDuo] = useState(false);

  const [joinInput, setJoinInput] = useState(pendingInviteCodeFromUrl || '');
  const [joinError, setJoinError] = useState('');
  const [joiningDuo, setJoiningDuo] = useState(false);

  useEffect(() => {
    if (pendingInviteCodeFromUrl) {
      setJoinInput(pendingInviteCodeFromUrl);
    }
  }, [pendingInviteCodeFromUrl]);

  const isOwner = canManageGoal(activeGoal ?? undefined, currentUser?.uid);

  // Shared duo progress across active tasks for this goal
  const sharedProgress = useMemo(() => {
    const activeTasks = tasks.filter((t) => !t.isArchived);
    const totalSlots = activeTasks.length * Math.max(1, participants.length);
    if (totalSlots === 0) return 0;
    const activeIds = new Set(activeTasks.map((t) => t.id));
    const doneSlots = completions.filter((c) => activeIds.has(c.taskId)).length;
    return Math.min(100, Math.round((doneSlots / totalSlots) * 100));
  }, [completions, participants.length, tasks]);

  const combinedQuestsDone = useMemo(
    () => participants.reduce((sum, p) => sum + p.completedTasksCount, 0),
    [participants]
  );

  const motivationalLine = useMemo(() => {
    if (!activeGoal) return '';
    if (participants.length < 2) return 'Invite a friend to turn this roadmap into a two-player duo.';
    if (activeGoal.groupStreak >= 7) return 'Amazing consistency together — keep the momentum going! 🔥';
    if (sharedProgress >= 75) return 'You two are crushing this roadmap together! 🎉';
    return 'Steady progress every day beats cramming. Check in with your partner! 🤝';
  }, [activeGoal, participants.length, sharedProgress]);

  const handleOpenEditGroup = (targetGoal?: Goal) => {
    const goalToEdit = targetGoal || activeGoal;
    if (!goalToEdit) return;
    setRenamingGoal(goalToEdit);
    setGroupNameInput(goalToEdit.groupName || `${goalToEdit.title} Duo`);
    setGoalTitleInput(goalToEdit.title);
    setEditGroupOpen(true);
  };

  const handleSaveGroupName = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetGoal = renamingGoal || activeGoal;
    if (!targetGoal || !groupNameInput.trim()) return;
    const cleanTitle = goalTitleInput.trim() || targetGoal.title;
    await updateGoal(targetGoal.id, {
      groupName: groupNameInput.trim(),
      title: cleanTitle,
    });
    setEditGroupOpen(false);
    setRenamingGoal(null);
  };

  const handleCreateDuo = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuoFormError('');
    const parsed = goalSchema.safeParse(duoForm);
    if (!parsed.success) {
      setDuoFormError(parsed.error.issues[0]?.message || 'Please check your duo details.');
      return;
    }
    setCreatingDuo(true);
    try {
      const createdId = await createGoal(parsed.data);
      if (createdId) {
        setShowCreateDuoModal(false);
        setDuoForm({ ...duoForm, title: '', description: '', groupName: '' });
      }
    } finally {
      setCreatingDuo(false);
    }
  };

  const handleJoinDuoByCodeOrLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    const extractedCode = extractInviteCodeFromInput(joinInput);
    const parsed = inviteCodeSchema.safeParse({ code: extractedCode });
    if (!parsed.success) {
      setJoinError(parsed.error.issues[0]?.message || 'Enter a valid duo invite code or link.');
      return;
    }
    setJoiningDuo(true);
    try {
      const ok = await acceptInvitationByCode(parsed.data.code);
      if (ok) {
        setJoinInput('');
        clearPendingInviteCodeFromUrl();
      }
    } finally {
      setJoiningDuo(false);
    }
  };

  if (!activeGoal || !currentUser) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#20202A] tracking-tight">Study Duo</h1>
          <p className="mt-1 text-sm text-[#777783]">Collaborate with a dedicated study partner.</p>
        </header>

        <Card>
          <form onSubmit={handleJoinDuoByCodeOrLink} className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E2F5E9] text-[#1F874D]">
                <UserPlus className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-base font-black text-[#20202A]">
                  Have a Study Duo Invite Link or Code?
                </h2>
                <p className="text-xs text-[#777783]">
                  Paste the invite code or WhatsApp/social invite link shared by your study partner to join immediately.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                aria-label="Study duo invite code or link"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="Paste invite link or code (e.g. DUO-JOIN26)"
                className="flex-1 min-h-[44px] rounded-full border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm font-mono text-[#20202A] placeholder:font-sans placeholder:text-[#8B8A99] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
              <Button type="submit" variant="success" disabled={joiningDuo} className="shrink-0">
                {joiningDuo ? 'Joining Duo...' : 'Join Study Duo'}
              </Button>
            </div>
            {joinError && <p role="alert" className="text-xs font-semibold text-[#C82D4F]">{joinError}</p>}
          </form>
        </Card>

        <EmptyState
          mascot="language"
          title="No study duo yet"
          description="Create a shared learning goal or accept a partner invitation above to form your StudyDuo group."
          actionLabel="Create or Join a Goal"
          onAction={() => setActivePage('goals')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#20202A] tracking-tight truncate">
            {activeGoal.groupName || activeGoal.title}
          </h1>
          <p className="mt-0.5 text-sm text-[#777783]">
            {participants.length}/{activeGoal.maxParticipants} learners · {activeGoal.category} ·{' '}
            {activeGoal.durationDays}-day goal
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {isOwner && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleOpenEditGroup(activeGoal)}>
                <Pencil className="h-3.5 w-3.5 text-[#7651E8]" />
                Rename Duo
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDuoToDelete(activeGoal)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete Duo
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => setShowCreateDuoModal(true)}>
            <Plus className="h-3.5 w-3.5 text-[#7651E8]" />
            New Duo
          </Button>
          <Button size="sm" onClick={() => setActivePage('checklist')}>
            Open Quests
          </Button>
        </div>
      </header>

      {/* Incoming Deep-Link Invite Banner if ?invite=CODE was clicked */}
      {pendingInviteCodeFromUrl && (
        <div className="rounded-[24px] bg-[#E2F5E9] border border-[#BFE8CE] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-[#136F3A]">Invitation Link Detected</p>
            <p className="text-sm font-bold text-[#20202A] mt-0.5">
              Ready to join study duo with invite code{' '}
              <span className="font-mono text-[#7651E8]">{pendingInviteCodeFromUrl}</span>?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                clearPendingInviteCodeFromUrl();
                setJoinInput('');
              }}
            >
              Dismiss
            </Button>
            <Button
              size="sm"
              variant="success"
              disabled={joiningDuo}
              onClick={() => {
                const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                void handleJoinDuoByCodeOrLink(fakeEvent);
              }}
            >
              {joiningDuo ? 'Joining...' : 'Accept & Join Now'}
            </Button>
          </div>
        </div>
      )}

      {/* Pastel Collaborative Duo Hero Card */}
      <div className="rounded-[28px] bg-[#E9DFFF] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <MascotImage mascot="brain" className="h-16 w-16 shrink-0" rounded="rounded-2xl" />
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#6842DE]">
                Shared Goal
              </span>
              <h2 className="mt-1 font-display text-lg sm:text-xl font-black text-[#20202A] truncate">
                {activeGoal.title}
              </h2>
              <p className="text-xs font-medium text-[#5C5C6C]">{motivationalLine}</p>
            </div>
          </div>

          <span className="rounded-full bg-white px-3.5 py-1.5 text-sm font-black text-[#1F874D] tabular-nums shrink-0 shadow-xs">
            {sharedProgress}% complete
          </span>
        </div>

        <ProgressBar percent={sharedProgress} color="#7651E8" trackColor="#FFFFFF" height="h-3" />

        {/* Both Avatars Side-by-Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {participants.map((member, idx) => {
            const lvl = getLevelInfo(member.goalXp);
            const isMe = member.uid === currentUser.uid;
            return (
              <div
                key={member.uid}
                className={`flex items-center gap-3.5 rounded-[22px] p-4 shadow-[0_6px_18px_-12px_rgba(32,32,42,0.12)] ${
                  idx === 0 ? 'bg-white' : 'bg-[#FFFDF5]'
                }`}
              >
                <Avatar
                  name={member.displayName}
                  initials={member.avatarInitials}
                  color={member.avatarColor}
                  avatarConfig={member.avatarConfig}
                  seedKey={member.uid}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-extrabold text-[#20202A] truncate">
                      {member.displayName}
                    </p>
                    {isMe && (
                      <span className="rounded-full bg-[#E9DFFF] px-2 py-0.5 text-[10px] font-extrabold text-[#7651E8] shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#777783] truncate">
                    Lv.{lvl.level} · {member.role === 'owner' ? 'Goal Owner' : 'Study Partner'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs tabular-nums">
                    <span className="rounded-full bg-[#F8F5FF] px-2 py-0.5 font-extrabold text-[#7651E8]">
                      {member.goalXp} XP
                    </span>
                    <span className="rounded-full bg-[#E2F5E9] px-2 py-0.5 font-bold text-[#1F874D]">
                      ✅ {member.completedTasksCount}
                    </span>
                    <span className="rounded-full bg-[#FFF0C9] px-2 py-0.5 font-bold text-[#B47100]">
                      🔥 {member.currentStreak}d
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3 Pastel Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-[#FFF0C9] px-3 py-3 text-center">
            <p className="text-[11px] font-bold text-[#8A5A00]">Duo Streak</p>
            <p className="mt-0.5 font-display text-lg font-black text-[#20202A] tabular-nums">
              🔥 {activeGoal.groupStreak}d
            </p>
          </div>
          <div className="rounded-2xl bg-[#E2F5E9] px-3 py-3 text-center">
            <p className="text-[11px] font-bold text-[#1F874D]">Combined Done</p>
            <p className="mt-0.5 font-display text-lg font-black text-[#20202A] tabular-nums">
              ✅ {combinedQuestsDone}
            </p>
          </div>
          <div className="rounded-2xl bg-[#FFE8F0] px-3 py-3 text-center">
            <p className="text-[11px] font-bold text-[#BE3469]">Daily Target</p>
            <p className="mt-0.5 font-display text-lg font-black text-[#20202A] tabular-nums">
              ⏱️ {activeGoal.dailyTargetMinutes}m
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Social Share & Dynamic Invite Link Component */}
      <SocialShareComponent
        goal={activeGoal}
        inviterName={currentUser.fullName}
        invitations={invitations}
        isOwner={isOwner}
        onCreateInvitation={createInvitation}
        onCancelInvitation={cancelInvitation}
        onToast={showToast}
      />

      {/* Join Another Duo via Shared Invite Link or Code */}
      <Card>
        <form onSubmit={handleJoinDuoByCodeOrLink} className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E2F5E9] text-[#1F874D]">
              <UserPlus className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-black text-[#20202A]">
                Join a Friend&apos;s Duo via Invite Link or Code
              </h2>
              <p className="text-xs text-[#777783]">
                Paste the full invite link or code (e.g. DUO-JOIN26) shared by your study partner to join their goal.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              aria-label="Join duo by invite link or code"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="Paste invite link or code (e.g. DUO-JOIN26)"
              className="flex-1 min-h-[44px] rounded-full border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm font-mono text-[#20202A] placeholder:font-sans placeholder:text-[#8B8A99] focus:bg-white focus:border-[#7651E8] focus:outline-none"
            />
            <Button type="submit" variant="success" disabled={joiningDuo} className="shrink-0">
              {joiningDuo ? 'Joining...' : 'Accept & Join Duo'}
            </Button>
          </div>
          {joinError && <p role="alert" className="text-xs font-semibold text-[#C82D4F]">{joinError}</p>}
        </form>
      </Card>

      {/* Goals Switcher + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card className="lg:col-span-5">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-display text-base font-black text-[#20202A]">Your Study Duos &amp; Goals</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#F8F5FF] px-2.5 py-0.5 text-xs font-bold text-[#7651E8] tabular-nums">
                {goals.length} total
              </span>
              <button
                type="button"
                onClick={() => setShowCreateDuoModal(true)}
                className="inline-flex items-center gap-1 rounded-full bg-[#E9DFFF] px-2.5 py-1 text-xs font-extrabold text-[#7651E8] hover:bg-[#DFD2FF] transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {goals.map((g) => {
              const selected = g.id === activeGoal.id;
              const mine = g.ownerId === currentUser.uid;
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGoalId(g.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedGoalId(g.id);
                    }
                  }}
                  className={`w-full text-left rounded-2xl p-3.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    selected
                      ? 'bg-[#E9DFFF]/70'
                      : 'bg-[#F8F5FF]/70 hover:bg-[#F8F5FF]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-extrabold truncate ${
                        selected ? 'text-[#7651E8]' : 'text-[#20202A]'
                      }`}
                    >
                      {g.groupName || g.title}
                    </p>
                    <p className="text-xs text-[#777783] truncate mt-0.5">
                      {g.title} · {mine ? 'Owner' : 'Partner'} · {g.participantIds.length}{' '}
                      {g.participantIds.length === 1 ? 'learner' : 'learners'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {mine && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditGroup(g);
                          }}
                          aria-label={`Rename ${g.groupName || g.title}`}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#7651E8] hover:bg-[#E9DFFF] transition-colors cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDuoToDelete(g);
                          }}
                          aria-label={`Delete ${g.groupName || g.title}`}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#C82D4F] hover:bg-[#FFF0F3] transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </>
                    )}
                    {selected && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7651E8] text-white">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-7">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-display text-base font-black text-[#20202A]">Recent Activity</h2>
            <span className="text-xs font-semibold text-[#777783]">Live duo updates</span>
          </div>

          {activity.length === 0 ? (
            <p className="text-sm text-[#777783] py-8 text-center">
              Partner completions, published days, and milestones appear here in real time.
            </p>
          ) : (
            <div className="divide-y divide-[#F0EDF5]">
              {activity.slice(0, 12).map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[#20202A] leading-snug">
                      <span className="font-extrabold">{item.actorName}</span> {item.message}
                    </p>
                    {typeof item.xpDelta === 'number' && item.xpDelta > 0 && (
                      <span className="rounded-full bg-[#E2F5E9] px-2.5 py-0.5 text-xs font-extrabold tabular-nums text-[#1F874D] shrink-0">
                        +{item.xpDelta} XP
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#777783]">
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ModalSheet
        open={editGroupOpen}
        onClose={() => {
          setEditGroupOpen(false);
          setRenamingGoal(null);
        }}
        title="Rename Study Duo &amp; Goal"
        subtitle="Update your duo team name and shared goal title."
      >
        <form onSubmit={handleSaveGroupName} className="space-y-4">
          <div>
            <label htmlFor="group-name-input" className="block text-sm font-bold text-[#20202A] mb-1.5">
              Duo Name
            </label>
            <input
              id="group-name-input"
              type="text"
              required
              maxLength={80}
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="goal-title-rename-input" className="block text-sm font-bold text-[#20202A] mb-1.5">
              Shared Goal Title
            </label>
            <input
              id="goal-title-rename-input"
              type="text"
              required
              maxLength={120}
              value={goalTitleInput}
              onChange={(e) => setGoalTitleInput(e.target.value)}
              className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditGroupOpen(false);
                setRenamingGoal(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save Name</Button>
          </div>
        </form>
      </ModalSheet>

      <ModalSheet
        open={showCreateDuoModal}
        onClose={() => setShowCreateDuoModal(false)}
        title="Create New Study Duo"
        subtitle="Start a new shared learning goal and invite a study partner."
        size="lg"
      >
        <form onSubmit={handleCreateDuo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-duo-group-name" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Study Duo Name
              </label>
              <input
                id="new-duo-group-name"
                value={duoForm.groupName}
                onChange={(e) => setDuoForm({ ...duoForm, groupName: e.target.value })}
                placeholder="React Mastery Duo"
                required
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A] focus:bg-white focus:border-[#7956E8] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="new-duo-goal-title" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Shared Goal Title
              </label>
              <input
                id="new-duo-goal-title"
                value={duoForm.title}
                onChange={(e) => setDuoForm({ ...duoForm, title: e.target.value })}
                placeholder="Master Full-Stack React in 45 Days"
                required
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A] focus:bg-white focus:border-[#7956E8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="new-duo-desc" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Description
            </label>
            <textarea
              id="new-duo-desc"
              rows={2}
              value={duoForm.description}
              onChange={(e) => setDuoForm({ ...duoForm, description: e.target.value })}
              placeholder="What will your duo learn and build together?"
              className="w-full rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] p-3 text-sm text-[#25243A] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="new-duo-cat" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Category
              </label>
              <select
                id="new-duo-cat"
                value={duoForm.category}
                onChange={(e) => setDuoForm({ ...duoForm, category: e.target.value })}
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
              <label htmlFor="new-duo-dur" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Duration (days)
              </label>
              <input
                id="new-duo-dur"
                type="number"
                min={1}
                max={365}
                value={duoForm.durationDays}
                onChange={(e) => setDuoForm({ ...duoForm, durationDays: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm font-mono text-[#25243A]"
              />
            </div>
            <div>
              <label htmlFor="new-duo-target-min" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Daily target (min)
              </label>
              <input
                id="new-duo-target-min"
                type="number"
                min={10}
                max={480}
                value={duoForm.dailyTargetMinutes}
                onChange={(e) => setDuoForm({ ...duoForm, dailyTargetMinutes: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm font-mono text-[#25243A]"
              />
            </div>
          </div>

          {duoFormError && <p role="alert" className="text-xs font-semibold text-[#E66F77]">{duoFormError}</p>}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreateDuoModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creatingDuo}>
              {creatingDuo ? 'Creating...' : 'Create Duo'}
            </Button>
          </div>
        </form>
      </ModalSheet>

      <ConfirmDialog
        open={Boolean(duoToDelete)}
        title="Delete Study Duo permanently?"
        description={`Are you sure you want to delete "${duoToDelete?.groupName || duoToDelete?.title}" and all of its shared roadmap milestones and daily quests? This action cannot be undone.`}
        confirmLabel="Delete Duo"
        onCancel={() => setDuoToDelete(null)}
        onConfirm={() => {
          if (duoToDelete) {
            void deleteGoal(duoToDelete.id);
          }
          setDuoToDelete(null);
        }}
      />
    </div>
  );
};
