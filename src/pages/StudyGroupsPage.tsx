import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Flame,
  Pencil,
  ShieldCheck,
  Sparkles,
  Target,
  UserPlus,
  Users,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { Avatar, EmptyState, ModalSheet } from '../components/ui/Primitives';
import { canManageGoal, getLevelInfo } from '../lib/gamification';

export const StudyGroupsPage: React.FC = () => {
  const {
    currentUser,
    activeGoal,
    goals,
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
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-[#242337] tracking-tight">Study Groups</h1>
          <p className="mt-1 text-sm text-[#66687A]">Collaborate with a dedicated accountability partner.</p>
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
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242337] tracking-tight">
            {activeGoal.groupName || activeGoal.title}
          </h1>
          <p className="mt-1 text-sm text-[#66687A]">
            {participants.length}/{activeGoal.maxParticipants} members · {activeGoal.category} ·{' '}
            {activeGoal.durationDays}-day roadmap
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isOwner && (
            <button
              type="button"
              onClick={handleOpenEditGroup}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E9EAF0] bg-white px-4 text-sm font-medium text-[#242337] hover:bg-[#F8F9FC] transition-colors"
            >
              <Pencil className="h-4 w-4 text-[#7956D8]" />
              Rename Group
            </button>
          )}
          <button
            type="button"
            onClick={() => setActivePage('checklist')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#7956D8] px-4 text-sm font-semibold text-white hover:bg-[#6643C7] transition-colors"
          >
            Open Checklist
          </button>
        </div>
      </header>

      {/* Group Duo Streak & Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E9EAF0] bg-white p-5">
          <p className="text-xs font-medium text-[#66687A]">Duo Group Streak</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#242337] font-mono tabular-nums">
              {activeGoal.groupStreak}
            </span>
            <span className="text-sm text-[#66687A]">days</span>
            <Flame className="ml-auto h-5 w-5 text-[#F3BD59]" />
          </div>
          <p className="mt-1.5 text-xs text-[#66687A] font-mono tabular-nums">
            Best duo streak: {activeGoal.longestGroupStreak} days
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9EAF0] bg-white p-5">
          <p className="text-xs font-medium text-[#66687A]">Combined Tasks Completed</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#242337] font-mono tabular-nums">
              {participants.reduce((sum, p) => sum + p.completedTasksCount, 0)}
            </span>
            <span className="text-sm text-[#66687A]">tasks</span>
            <CheckCircle2 className="ml-auto h-5 w-5 text-[#38A879]" />
          </div>
          <p className="mt-1.5 text-xs text-[#66687A]">
            Tracked independently for each member
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9EAF0] bg-white p-5">
          <p className="text-xs font-medium text-[#66687A]">Daily Study Target</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#242337] font-mono tabular-nums">
              {activeGoal.dailyTargetMinutes}
            </span>
            <span className="text-sm text-[#66687A]">min / day</span>
            <Target className="ml-auto h-5 w-5 text-[#7956D8]" />
          </div>
          <p className="mt-1.5 text-xs text-[#66687A]">
            Target date · {activeGoal.targetDate}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Members & Role Clarity */}
        <section className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-semibold text-[#242337]">Duo Members</h2>
              <span className="text-xs text-[#66687A]">Owner manages roadmap · Both track completions</span>
            </div>

            <div className="space-y-3">
              {participants.map((member) => {
                const lvl = getLevelInfo(member.goalXp);
                const isMe = member.uid === currentUser.uid;
                return (
                  <div
                    key={member.uid}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#E9EAF0] bg-[#F8F9FC]/60 p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={member.displayName}
                        initials={member.avatarInitials}
                        color={member.avatarColor}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#242337] truncate">
                          {member.displayName}
                          {isMe && <span className="ml-1.5 text-xs text-[#7956D8]">(You)</span>}
                        </p>
                        <p className="text-xs text-[#66687A] truncate">
                          @{member.username} · {member.role === 'owner' ? 'Goal Owner' : 'Study Partner'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-[#66687A]">
                      <span>
                        <strong className="text-[#242337]">{member.goalXp}</strong> XP
                      </span>
                      <span>
                        <strong className="text-[#242337]">{member.completedTasksCount}</strong> done
                      </span>
                      <span>
                        <strong className="text-[#242337]">{member.currentStreak}d</strong> streak
                      </span>
                      <span className="text-[#7956D8] font-semibold">Lv.{lvl.level}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {isOwner && participants.length < activeGoal.maxParticipants && (
              <form onSubmit={handleCreateInvite} className="mt-5 pt-5 border-t border-[#E9EAF0] space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#242337]">
                  <UserPlus className="h-4 w-4 text-[#7956D8]" />
                  Invite a Study Partner
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Partner email (optional)"
                    className="flex-1 min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-3.5 text-sm text-[#242337] placeholder:text-[#88899B] focus:border-[#7956D8] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={creatingInvite}
                    className="min-h-[44px] rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-60 transition-colors shrink-0"
                  >
                    {creatingInvite ? 'Generating...' : 'Generate Invite Code'}
                  </button>
                </div>

                {activeInvites.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {activeInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-[#F0EBFF]/70 px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold font-mono text-[#7956D8] tracking-wide">
                            {inv.code}
                          </p>
                          <p className="text-xs text-[#66687A] truncate">
                            {inv.inviteeEmail ? `For ${inv.inviteeEmail}` : 'Shareable duo invite code'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void copyCode(inv.code)}
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-white px-3 text-xs font-semibold text-[#242337] border border-[#E9EAF0] hover:bg-[#F8F9FC]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => void cancelInvitation(inv.id)}
                            className="min-h-[36px] rounded-lg px-2.5 text-xs font-medium text-[#E66F77] hover:bg-white"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Shared Goals Switcher */}
          <div className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
            <h2 className="text-base font-semibold text-[#242337] mb-3">Your Study Goals</h2>
            <div className="space-y-2.5">
              {goals.map((g) => {
                const selected = g.id === activeGoal.id;
                const mine = g.ownerId === currentUser.uid;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGoalId(g.id)}
                    className={`w-full text-left rounded-xl border p-3.5 transition-colors flex items-center justify-between gap-3 ${
                      selected
                        ? 'border-[#7956D8] bg-[#F0EBFF]/50'
                        : 'border-[#E9EAF0] bg-white hover:bg-[#F8F9FC]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#242337] truncate">{g.title}</p>
                      <p className="text-xs text-[#66687A] truncate">
                        {g.groupName || g.category} · {mine ? 'Owner' : 'Partner'} · {g.participantIds.length} member
                        {g.participantIds.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <ShieldCheck
                      className={`h-4 w-4 shrink-0 ${selected ? 'text-[#7956D8]' : 'text-[#88899B]'}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Live Group Activity Feed */}
        <section className="lg:col-span-5 rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold text-[#242337]">Duo Activity Feed</h2>
            <Sparkles className="h-4 w-4 text-[#7956D8]" />
          </div>

          {activity.length === 0 ? (
            <p className="text-sm text-[#66687A] py-8 text-center">
              Partner completions, published days, and unlocked milestones appear here in real time.
            </p>
          ) : (
            <div className="divide-y divide-[#E9EAF0]">
              {activity.slice(0, 14).map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[#242337] leading-snug">
                      <span className="font-semibold">{item.actorName}</span> {item.message}
                    </p>
                    {typeof item.xpDelta === 'number' && item.xpDelta > 0 && (
                      <span className="text-xs font-semibold font-mono tabular-nums text-[#38A879] shrink-0">
                        +{item.xpDelta} XP
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#88899B]">
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
        </section>
      </div>

      <ModalSheet
        open={editGroupOpen}
        onClose={() => setEditGroupOpen(false)}
        title="Rename Study Group"
        subtitle="Give your study duo a memorable team name."
      >
        <form onSubmit={handleSaveGroupName} className="space-y-4">
          <div>
            <label htmlFor="group-name-input" className="block text-sm font-medium text-[#242337] mb-1.5">
              Group Name
            </label>
            <input
              id="group-name-input"
              type="text"
              required
              maxLength={80}
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setEditGroupOpen(false)}
              className="min-h-[44px] rounded-xl border border-[#E9EAF0] px-4 text-sm font-medium text-[#242337]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7]"
            >
              Save Name
            </button>
          </div>
        </form>
      </ModalSheet>
    </div>
  );
};
