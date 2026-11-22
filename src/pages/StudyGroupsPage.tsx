import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Pencil,
  UserPlus,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { Avatar, Button, Card, EmptyState, ModalSheet, ProgressBar } from '../components/ui/Primitives';
import { MascotImage } from '../components/ui/MascotArtwork';
import { canManageGoal, getLevelInfo } from '../lib/gamification';

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
    updateGoal,
    createInvitation,
    cancelInvitation,
    setActivePage,
    showToast,
  } = useStudyDuo();

  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);

  const isOwner = canManageGoal(activeGoal ?? undefined, currentUser?.uid);
  const activeInvites = useMemo(
    () => invitations.filter((inv) => inv.goalId === activeGoal?.id && inv.status === 'pending'),
    [activeGoal?.id, invitations]
  );

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

  const handleOpenEditGroup = () => {
    if (!activeGoal) return;
    setGroupNameInput(activeGoal.groupName || activeGoal.title);
    setEditGroupOpen(true);
  };

  const handleSaveGroupName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal || !groupNameInput.trim()) return;
    await updateGoal(activeGoal.id, { groupName: groupNameInput.trim() });
    setEditGroupOpen(false);
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal) return;
    setCreatingInvite(true);
    try {
      await createInvitation(activeGoal.id, inviteEmail.trim() || undefined);
      setInviteEmail('');
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`Copied invite code ${code}`);
    } catch {
      showToast(`Invite code: ${code}`, 'info');
    }
  };

  if (!activeGoal || !currentUser) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#20202A] tracking-tight">Study Duo</h1>
          <p className="mt-1 text-sm text-[#777783]">Collaborate with a dedicated study partner.</p>
        </header>
        <EmptyState
          mascot="language"
          title="No study duo yet"
          description="Create a shared learning goal or accept a partner invitation to form your StudyDuo group."
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
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && (
            <Button variant="secondary" size="sm" onClick={handleOpenEditGroup}>
              <Pencil className="h-3.5 w-3.5 text-[#7651E8]" />
              Rename Duo
            </Button>
          )}
          <Button size="sm" onClick={() => setActivePage('checklist')}>
            Open Quests
          </Button>
        </div>
      </header>

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

        {/* 3 Pastel Summary Pills */}
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

      {/* Invite Partner (if owner and slot available) */}
      {isOwner && participants.length < activeGoal.maxParticipants && (
        <Card>
          <form onSubmit={handleCreateInvite} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E9DFFF] text-[#7651E8]">
                <UserPlus className="h-4 w-4" />
              </span>
              <h2 className="font-display text-base font-black text-[#20202A]">Invite a Study Partner</h2>
            </div>
            <p className="text-xs text-[#777783]">
              Generate a shareable invite code so your friend can join this goal and track tasks alongside you.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Partner email (optional)"
                className="flex-1 min-h-[44px] rounded-full border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] placeholder:text-[#8B8A99] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
              <Button type="submit" disabled={creatingInvite} className="shrink-0">
                {creatingInvite ? 'Generating...' : 'Generate Invite Code'}
              </Button>
            </div>

            {activeInvites.length > 0 && (
              <div className="divide-y divide-[#F0EDF5] pt-2">
                {activeInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-2 py-2.5 first:pt-1 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold font-mono text-[#7651E8] tracking-wide">
                        {inv.code}
                      </p>
                      <p className="text-xs text-[#777783] truncate">
                        {inv.inviteeEmail ? `For ${inv.inviteeEmail}` : 'Shareable duo invite code'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void copyCode(inv.code)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-[#F8F5FF] px-3.5 text-xs font-bold text-[#20202A] border border-[#F0EDF5] hover:bg-[#E9DFFF] cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelInvitation(inv.id)}
                        className="min-h-[36px] rounded-full px-3 text-xs font-bold text-[#C82D4F] hover:bg-[#FFF0F3] cursor-pointer"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>
        </Card>
      )}

      {/* Goals Switcher + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card className="lg:col-span-5">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-display text-base font-black text-[#20202A]">Your Study Goals</h2>
            <span className="rounded-full bg-[#F8F5FF] px-2.5 py-0.5 text-xs font-bold text-[#7651E8] tabular-nums">
              {goals.length} total
            </span>
          </div>
          <div className="space-y-2">
            {goals.map((g) => {
              const selected = g.id === activeGoal.id;
              const mine = g.ownerId === currentUser.uid;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGoalId(g.id)}
                  className={`w-full text-left rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    selected
                      ? 'bg-[#E9DFFF]/70'
                      : 'bg-[#F8F5FF]/70 hover:bg-[#F8F5FF]'
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-extrabold truncate ${
                        selected ? 'text-[#7651E8]' : 'text-[#20202A]'
                      }`}
                    >
                      {g.title}
                    </p>
                    <p className="text-xs text-[#777783] truncate mt-0.5">
                      {g.groupName || g.category} · {mine ? 'Owner' : 'Partner'} · {g.participantIds.length}{' '}
                      {g.participantIds.length === 1 ? 'learner' : 'learners'}
                    </p>
                  </div>
                  {selected && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7651E8] text-white">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                  )}
                </button>
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
        onClose={() => setEditGroupOpen(false)}
        title="Rename Study Duo"
        subtitle="Give your study duo a memorable team name."
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditGroupOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Name</Button>
          </div>
        </form>
      </ModalSheet>
    </div>
  );
};
