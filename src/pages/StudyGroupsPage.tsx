import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Pencil,
  UserPlus,
  Users,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { Avatar, Button, Card, EmptyState, ModalSheet, ProgressBar } from '../components/ui/Primitives';
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
          <h1 className="text-2xl font-extrabold text-[#242424] tracking-tight">Study Duo</h1>
          <p className="mt-1 text-sm text-[#888888]">Collaborate with a dedicated study partner.</p>
        </header>
        <EmptyState
          icon={<Users className="h-6 w-6" />}
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
      {/* Clean Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-[#242424] tracking-tight truncate">
            {activeGoal.groupName || activeGoal.title}
          </h1>
          <p className="mt-0.5 text-sm text-[#888888]">
            {participants.length}/{activeGoal.maxParticipants} learners · {activeGoal.category} ·{' '}
            {activeGoal.durationDays}-day goal
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && (
            <Button variant="secondary" size="sm" onClick={handleOpenEditGroup}>
              <Pencil className="h-3.5 w-3.5" />
              Rename Duo
            </Button>
          )}
          <Button size="sm" onClick={() => setActivePage('checklist')}>
            Open Quests
          </Button>
        </div>
      </header>

      {/* Main Collaborative Duo Card */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-5 sm:p-6">
          {/* Shared Goal & Progress */}
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#888888]">Shared Goal</p>
              <h2 className="text-base font-extrabold text-[#242424] truncate">{activeGoal.title}</h2>
            </div>
            <span className="text-sm font-extrabold text-[#3C8F00] tabular-nums">
              {sharedProgress}% complete
            </span>
          </div>
          <ProgressBar percent={sharedProgress} color="#58CC02" height="h-2" />
          <p className="mt-2.5 text-xs text-[#5C5C6E]">{motivationalLine}</p>

          {/* Both Avatars Side-by-Side */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {participants.map((member) => {
              const lvl = getLevelInfo(member.goalXp);
              const isMe = member.uid === currentUser.uid;
              return (
                <div
                  key={member.uid}
                  className={`flex items-center gap-3.5 rounded-xl border p-3.5 ${
                    isMe ? 'border-[#D9CEFF] bg-[#FBF9FF]' : 'border-[#EEEEF2] bg-white'
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
                      <p className="text-sm font-bold text-[#242424] truncate">
                        {member.displayName}
                      </p>
                      {isMe && (
                        <span className="text-[11px] font-bold text-[#7956E8] shrink-0">You</span>
                      )}
                    </div>
                    <p className="text-xs text-[#888888] truncate">
                      Lv.{lvl.level} · {member.role === 'owner' ? 'Goal Owner' : 'Study Partner'}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums text-[#5C5C6E]">
                      <span className="font-bold text-[#7956E8]">{member.goalXp} XP</span>
                      <span>✅ {member.completedTasksCount}</span>
                      <span className="text-[#D97706] font-semibold">🔥 {member.currentStreak}d</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hairline-Divided Summary Strip */}
        <div className="grid grid-cols-3 divide-x divide-[#EEEEF2] border-t border-[#EEEEF2] bg-[#FAFAFC]">
          <div className="px-4 py-3 text-center">
            <p className="text-[11px] font-medium text-[#888888]">Duo Streak</p>
            <p className="mt-0.5 text-base font-extrabold text-[#242424] tabular-nums">
              🔥 {activeGoal.groupStreak}d
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[11px] font-medium text-[#888888]">Combined Done</p>
            <p className="mt-0.5 text-base font-extrabold text-[#242424] tabular-nums">
              ✅ {combinedQuestsDone}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[11px] font-medium text-[#888888]">Daily Target</p>
            <p className="mt-0.5 text-base font-extrabold text-[#242424] tabular-nums">
              ⏱️ {activeGoal.dailyTargetMinutes}m
            </p>
          </div>
        </div>
      </Card>

      {/* Invite Partner (if owner and slot available) */}
      {isOwner && participants.length < activeGoal.maxParticipants && (
        <Card>
          <form onSubmit={handleCreateInvite} className="space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#7956E8]" />
              <h2 className="text-sm font-bold text-[#242424]">Invite a Study Partner</h2>
            </div>
            <p className="text-xs text-[#888888]">
              Generate a shareable invite code so your friend can join this goal and track tasks alongside you.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Partner email (optional)"
                className="flex-1 min-h-[42px] rounded-xl border border-[#EEEEF2] bg-white px-3.5 text-sm text-[#242424] placeholder:text-[#888888] focus:border-[#7956E8] focus:outline-none"
              />
              <Button type="submit" disabled={creatingInvite} className="shrink-0">
                {creatingInvite ? 'Generating...' : 'Generate Invite Code'}
              </Button>
            </div>

            {activeInvites.length > 0 && (
              <div className="divide-y divide-[#EEEEF2] pt-2">
                {activeInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-2 py-2.5 first:pt-1 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold font-mono text-[#7956E8] tracking-wide">
                        {inv.code}
                      </p>
                      <p className="text-xs text-[#888888] truncate">
                        {inv.inviteeEmail ? `For ${inv.inviteeEmail}` : 'Shareable duo invite code'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void copyCode(inv.code)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-[#F7F8FA] px-3 text-xs font-semibold text-[#242424] border border-[#EEEEF2] hover:bg-[#F0F1F5] cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelInvitation(inv.id)}
                        className="min-h-[36px] rounded-lg px-2.5 text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#242424]">Your Study Goals</h2>
            <span className="text-xs text-[#888888] tabular-nums">{goals.length} total</span>
          </div>
          <div className="divide-y divide-[#EEEEF2]">
            {goals.map((g) => {
              const selected = g.id === activeGoal.id;
              const mine = g.ownerId === currentUser.uid;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGoalId(g.id)}
                  className="w-full text-left py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-bold truncate ${
                        selected ? 'text-[#7956E8]' : 'text-[#242424] group-hover:text-[#7956E8]'
                      }`}
                    >
                      {g.title}
                    </p>
                    <p className="text-xs text-[#888888] truncate mt-0.5">
                      {g.groupName || g.category} · {mine ? 'Owner' : 'Partner'} · {g.participantIds.length}{' '}
                      {g.participantIds.length === 1 ? 'learner' : 'learners'}
                    </p>
                  </div>
                  {selected && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7956E8] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#242424]">Recent Activity</h2>
            <span className="text-xs text-[#888888]">Live duo updates</span>
          </div>

          {activity.length === 0 ? (
            <p className="text-sm text-[#888888] py-8 text-center">
              Partner completions, published days, and milestones appear here in real time.
            </p>
          ) : (
            <div className="divide-y divide-[#EEEEF2]">
              {activity.slice(0, 12).map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[#242424] leading-snug">
                      <span className="font-bold">{item.actorName}</span> {item.message}
                    </p>
                    {typeof item.xpDelta === 'number' && item.xpDelta > 0 && (
                      <span className="text-xs font-bold tabular-nums text-[#3C8F00] shrink-0">
                        +{item.xpDelta} XP
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#888888]">
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
            <label htmlFor="group-name-input" className="block text-sm font-semibold text-[#242424] mb-1.5">
              Duo Name
            </label>
            <input
              id="group-name-input"
              type="text"
              required
              maxLength={80}
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] px-3.5 text-sm text-[#242424] focus:border-[#7956E8] focus:outline-none"
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
