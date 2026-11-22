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
          <h1 className="text-2xl font-bold text-[#25243A] tracking-tight">Study Duo</h1>
          <p className="mt-1 text-sm text-[#77768C]">Collaborate with a dedicated accountability partner.</p>
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
          <p className="text-xs font-bold uppercase tracking-wider text-[#7956E8]">Co-Op Study Duo</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#25243A] tracking-tight">
            {activeGoal.groupName || activeGoal.title}
          </h1>
          <p className="mt-1 text-sm text-[#77768C]">
            {participants.length}/{activeGoal.maxParticipants} players · {activeGoal.category} ·{' '}
            {activeGoal.durationDays}-day roadmap
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {isOwner && (
            <button
              type="button"
              onClick={handleOpenEditGroup}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#EAE7F8] bg-white px-4 text-sm font-semibold text-[#25243A] hover:bg-[#F8F7FF] transition-colors"
            >
              <Pencil className="h-4 w-4 text-[#7956E8]" />
              Rename Duo
            </button>
          )}
          <button
            type="button"
            onClick={() => setActivePage('checklist')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl sd-gradient-primary px-4 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(121,86,232,0.55)] hover:brightness-105 transition-all"
          >
            Open Quests
          </button>
        </div>
      </header>

      {/* Group Duo Streak & Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sd-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#77768C]">Duo Streak</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#25243A] font-mono tabular-nums">
              {activeGoal.groupStreak}
            </span>
            <span className="text-sm text-[#77768C]">days</span>
            <Flame className="ml-auto h-5 w-5 text-[#FFC857] fill-[#FFC857]/30" />
          </div>
          <p className="mt-1.5 text-xs text-[#77768C] font-mono tabular-nums">
            Best duo streak: {activeGoal.longestGroupStreak} days
          </p>
        </div>

        <div className="sd-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#77768C]">Combined Quests</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#25243A] font-mono tabular-nums">
              {participants.reduce((sum, p) => sum + p.completedTasksCount, 0)}
            </span>
            <span className="text-sm text-[#77768C]">done</span>
            <CheckCircle2 className="ml-auto h-5 w-5 text-[#38B982]" />
          </div>
          <p className="mt-1.5 text-xs text-[#77768C]">
            Tracked independently for each player
          </p>
        </div>

        <div className="sd-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#77768C]">Daily Target</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#25243A] font-mono tabular-nums">
              {activeGoal.dailyTargetMinutes}
            </span>
            <span className="text-sm text-[#77768C]">min / day</span>
            <Target className="ml-auto h-5 w-5 text-[#45C4D8]" />
          </div>
          <p className="mt-1.5 text-xs text-[#77768C]">
            Target date · {activeGoal.targetDate}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Members & Role Clarity */}
        <section className="lg:col-span-7 space-y-4">
          <div className="sd-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-bold text-[#25243A]">Duo Players</h2>
              <span className="text-xs text-[#77768C]">Owner manages roadmap · Both track completions</span>
            </div>

            <div className="space-y-3">
              {participants.map((member) => {
                const lvl = getLevelInfo(member.goalXp);
                const isMe = member.uid === currentUser.uid;
                return (
                  <div
                    key={member.uid}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                      isMe
                        ? 'border-[#7956E8]/30 bg-[#F8F7FF]'
                        : 'border-[#EAE7F8] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={member.displayName}
                        initials={member.avatarInitials}
                        color={member.avatarColor}
                        avatarConfig={member.avatarConfig}
                        seedKey={member.uid}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#25243A] truncate">
                          {member.displayName}
                          {isMe && <span className="ml-1.5 text-xs font-semibold text-[#7956E8]">(You)</span>}
                        </p>
                        <p className="text-xs text-[#77768C] truncate">
                          @{member.username} · {member.role === 'owner' ? 'Goal Owner' : 'Study Partner'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-[#77768C]">
                      <span>
                        <strong className="text-[#25243A]">{member.goalXp}</strong> XP
                      </span>
                      <span>
                        <strong className="text-[#25243A]">{member.completedTasksCount}</strong> done
                      </span>
                      <span>
                        <strong className="text-[#25243A]">{member.currentStreak}d</strong> streak
                      </span>
                      <span className="text-[#7956E8] font-bold">Lv.{lvl.level}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {isOwner && participants.length < activeGoal.maxParticipants && (
              <form onSubmit={handleCreateInvite} className="mt-5 pt-5 border-t border-[#EAE7F8] space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#25243A]">
                  <UserPlus className="h-4 w-4 text-[#7956E8]" />
                  Invite a Study Partner
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Partner email (optional)"
                    className="flex-1 min-h-[44px] rounded-xl border border-[#EAE7F8] bg-white px-3.5 text-sm text-[#25243A] placeholder:text-[#77768C]/70 focus:border-[#7956E8] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={creatingInvite}
                    className="min-h-[44px] rounded-xl sd-gradient-primary px-5 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60 transition-all shrink-0"
                  >
                    {creatingInvite ? 'Generating...' : 'Generate Invite Code'}
                  </button>
                </div>

                {activeInvites.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {activeInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-[#F1EDFF]/80 border border-[#7956E8]/15 px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold font-mono text-[#7956E8] tracking-wide">
                            {inv.code}
                          </p>
                          <p className="text-xs text-[#77768C] truncate">
                            {inv.inviteeEmail ? `For ${inv.inviteeEmail}` : 'Shareable duo invite code'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void copyCode(inv.code)}
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-white px-3 text-xs font-semibold text-[#25243A] border border-[#EAE7F8] hover:bg-[#F8F7FF]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => void cancelInvitation(inv.id)}
                            className="min-h-[36px] rounded-lg px-2.5 text-xs font-semibold text-[#E05A66] hover:bg-white"
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
          <div className="sd-card p-5 sm:p-6">
            <h2 className="text-base font-bold text-[#25243A] mb-3">Your Study Goals</h2>
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
                        ? 'border-[#7956E8] bg-[#F1EDFF]/60'
                        : 'border-[#EAE7F8] bg-white hover:bg-[#F8F7FF]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#25243A] truncate">{g.title}</p>
                      <p className="text-xs text-[#77768C] truncate">
                        {g.groupName || g.category} · {mine ? 'Owner' : 'Partner'} · {g.participantIds.length} player
                        {g.participantIds.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <ShieldCheck
                      className={`h-4 w-4 shrink-0 ${selected ? 'text-[#7956E8]' : 'text-[#77768C]'}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Live Group Activity Feed */}
        <section className="lg:col-span-5 sd-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-bold text-[#25243A]">Duo Activity Feed</h2>
            <Sparkles className="h-4 w-4 text-[#7956E8]" />
          </div>

          {activity.length === 0 ? (
            <p className="text-sm text-[#77768C] py-8 text-center">
              Partner completions, published days, and unlocked milestones appear here in real time.
            </p>
          ) : (
            <div className="divide-y divide-[#EAE7F8]">
              {activity.slice(0, 14).map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[#25243A] leading-snug">
                      <span className="font-bold">{item.actorName}</span> {item.message}
                    </p>
                    {typeof item.xpDelta === 'number' && item.xpDelta > 0 && (
                      <span className="text-xs font-bold font-mono tabular-nums text-[#38B982] shrink-0">
                        +{item.xpDelta} XP
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#77768C]">
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
        title="Rename Study Duo"
        subtitle="Give your study duo a memorable team name."
      >
        <form onSubmit={handleSaveGroupName} className="space-y-4">
          <div>
            <label htmlFor="group-name-input" className="block text-sm font-semibold text-[#25243A] mb-1.5">
              Duo Name
            </label>
            <input
              id="group-name-input"
              type="text"
              required
              maxLength={80}
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] px-3.5 text-sm text-[#25243A] focus:border-[#7956E8] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setEditGroupOpen(false)}
              className="min-h-[44px] rounded-xl border border-[#EAE7F8] px-4 text-sm font-semibold text-[#25243A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl sd-gradient-primary px-5 text-sm font-semibold text-white hover:brightness-105"
            >
              Save Name
            </button>
          </div>
        </form>
      </ModalSheet>
    </div>
  );
};
