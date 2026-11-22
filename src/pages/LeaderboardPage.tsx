import React, { useMemo, useState } from 'react';
import { Award, Calendar, Crown, Flame, Sparkles, Trophy, Users } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { Avatar, EmptyState } from '../components/ui/Primitives';
import { computeLeaderboard, getDateKeyInTimezone } from '../lib/gamification';

type LeaderboardTab = 'today' | 'week' | 'overall';

export const LeaderboardPage: React.FC = () => {
  const {
    currentUser,
    activeGoal,
    goals,
    setSelectedGoalId,
    participants,
    completions,
    xpTransactions,
    dailyResults,
    setActivePage,
  } = useStudyDuo();

  const [tab, setTab] = useState<LeaderboardTab>('today');

  const todayKey = useMemo(
    () => getDateKeyInTimezone(new Date(), activeGoal?.timezone || currentUser?.timezone || 'UTC'),
    [activeGoal?.timezone, currentUser?.timezone]
  );

  const entries = useMemo(() => {
    if (!activeGoal) return [];
    const userXpMap: Record<string, number> = {};
    for (const p of participants) {
      userXpMap[p.uid] = p.uid === currentUser?.uid ? currentUser.totalXp : p.goalXp;
    }
    return computeLeaderboard(
      participants,
      xpTransactions,
      activeGoal.id,
      todayKey,
      tab,
      userXpMap,
      dailyResults,
      completions
    );
  }, [activeGoal, completions, currentUser, dailyResults, participants, tab, todayKey, xpTransactions]);

  const sortedHistory = useMemo(
    () => [...dailyResults].sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [dailyResults]
  );

  const participantById = useMemo(() => {
    const map: Record<string, (typeof participants)[number]> = {};
    for (const p of participants) map[p.uid] = p;
    return map;
  }, [participants]);

  if (!activeGoal || !currentUser) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-[#242337] tracking-tight">Leaderboard</h1>
          <p className="mt-1 text-sm text-[#66687A]">Friendly daily momentum with your study partner.</p>
        </header>
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="No active study goal yet"
          description="Create a goal or join a partner's goal to start tracking daily and weekly XP together."
          actionLabel="Open My Goals"
          onAction={() => setActivePage('goals')}
        />
      </div>
    );
  }

  const first = entries[0];
  const second = entries[1];
  const isTieAtTop = Boolean(first && second && first.isTied && first.rank === 1 && second.rank === 1);
  const scoreLabel = tab === 'today' ? 'pts today' : tab === 'week' ? 'pts this week' : 'total XP';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242337] tracking-tight">Leaderboard</h1>
          <p className="mt-1 text-sm text-[#66687A]">
            {activeGoal.groupName || activeGoal.title} · Friendly daily momentum, no unfair winner bonus XP
          </p>
        </div>

        {goals.length > 1 && (
          <select
            aria-label="Switch goal leaderboard"
            value={activeGoal.id}
            onChange={(e) => setSelectedGoalId(e.target.value)}
            className="min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-3.5 text-sm font-medium text-[#242337] focus:border-[#7956D8] focus:outline-none"
          >
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        )}
      </header>

      {/* Segmented tabs */}
      <div className="inline-flex w-full sm:w-auto rounded-2xl border border-[#E9EAF0] bg-white p-1.5">
        {(
          [
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'overall', label: 'Overall' },
          ] as Array<{ id: LeaderboardTab; label: string }>
        ).map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 sm:flex-initial min-h-[40px] rounded-xl px-5 text-sm font-semibold transition-colors ${
                active ? 'bg-[#7956D8] text-white' : 'text-[#66687A] hover:text-[#242337]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Duo Podium */}
      {entries.length > 0 && (
        <section className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-5 border-b border-[#E9EAF0]">
            <div>
              <h2 className="text-base font-semibold text-[#242337]">
                {isTieAtTop
                  ? 'Neck and neck! Both partners tied for 1st'
                  : first && first.points > 0
                  ? `${first.displayName} is leading ${tab === 'today' ? 'today' : tab === 'week' ? 'this week' : 'overall'}`
                  : 'Ready for today’s first study session'}
              </h2>
              <p className="mt-0.5 text-xs text-[#66687A]">
                Scores update automatically as each partner completes tasks independently.
              </p>
            </div>
            <div className="text-xs font-medium text-[#66687A] font-mono tabular-nums">
              Goal timezone · {activeGoal.timezone}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {entries.map((entry) => {
              const isMe = entry.uid === currentUser.uid;
              const isLeader = entry.rank === 1 && entry.points > 0;
              return (
                <div
                  key={entry.uid}
                  className={`rounded-2xl border p-5 transition-colors ${
                    isLeader
                      ? 'border-[#F3BD59]/60 bg-[#FFFDF7]'
                      : 'border-[#E9EAF0] bg-[#F8F9FC]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative">
                        <Avatar
                          name={entry.displayName}
                          initials={entry.avatarInitials}
                          color={entry.avatarColor}
                          size="lg"
                        />
                        {isLeader && (
                          <span
                            title={entry.isTied ? 'Tied for 1st' : '1st Place'}
                            className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#F3BD59] text-white shadow-sm"
                          >
                            <Crown className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[#242337] truncate">
                          {entry.displayName}
                          {isMe && <span className="ml-1.5 text-xs font-medium text-[#7956D8]">(You)</span>}
                        </p>
                        <p className="text-xs text-[#66687A] truncate">
                          @{entry.username} · Level {entry.level} {entry.levelTitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#66687A]">
                        {entry.isTied ? `Tied #${entry.rank}` : `#${entry.rank}`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-baseline justify-between gap-3 pt-4 border-t border-[#E9EAF0]/80">
                    <div>
                      <p className="text-3xl font-bold text-[#242337] font-mono tabular-nums leading-none">
                        {entry.points}
                      </p>
                      <p className="mt-1 text-xs text-[#66687A]">{scoreLabel}</p>
                    </div>

                    <div className="text-right text-xs text-[#66687A] space-y-1 font-mono tabular-nums">
                      <p className="flex items-center justify-end gap-1 text-[#242337] font-medium">
                        <Flame className="h-3.5 w-3.5 text-[#F3BD59]" />
                        {entry.currentStreak}d streak
                      </p>
                      <p>
                        Today {entry.dailyPoints} · Week {entry.weeklyPoints}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {entries.length < 2 && (
              <div className="rounded-2xl border border-dashed border-[#E9EAF0] bg-[#F8F9FC]/60 p-5 flex flex-col items-start justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0EBFF] text-[#7956D8]">
                  <Users className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#242337]">Invite your study partner</p>
                <p className="mt-1 text-xs text-[#66687A] leading-relaxed">
                  Share an invite code from your goal page to unlock head-to-head daily standings and group streaks.
                </p>
                <button
                  type="button"
                  onClick={() => setActivePage('goals')}
                  className="mt-4 min-h-[40px] rounded-xl bg-[#7956D8] px-4 text-xs font-semibold text-white hover:bg-[#6643C7] transition-colors"
                >
                  Generate Invite Code
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Daily Winner History */}
      <section className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-[#7956D8]" />
            <div>
              <h2 className="text-base font-semibold text-[#242337]">Daily Winner History</h2>
              <p className="text-xs text-[#66687A]">
                Every day celebrates consistency — ties celebrate both partners equally.
              </p>
            </div>
          </div>
        </div>

        {sortedHistory.length === 0 ? (
          <div className="rounded-xl bg-[#F8F9FC] p-6 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-[#7956D8]" />
            <p className="mt-2 text-sm font-medium text-[#242337]">No daily results logged yet</p>
            <p className="mt-1 text-xs text-[#66687A]">
              Complete tasks on your daily checklist to record today’s score.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E9EAF0]">
            {sortedHistory.map((day) => {
              const winnerNames = day.winnerIds
                .map((uid) => participantById[uid]?.displayName || 'Learner')
                .join(' & ');
              return (
                <div
                  key={day.dateKey}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF6E5] text-[#C28A1E] shrink-0">
                      <Award className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#242337] truncate">
                        {day.winnerIds.length === 0
                          ? 'No tasks completed'
                          : day.isTie
                          ? `Tie — ${winnerNames}`
                          : `${winnerNames} won the day`}
                      </p>
                      <p className="text-xs text-[#66687A] font-mono tabular-nums">
                        {day.dateKey} {day.dateKey === todayKey ? '· In progress' : '· Final'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-[#242337] pl-13 sm:pl-0">
                    {Object.entries(day.scores).map(([uid, score]) => (
                      <span key={uid} className="text-[#66687A]">
                        {participantById[uid]?.displayName.split(' ')[0] || 'Member'}:{' '}
                        <strong className="text-[#242337]">{score} XP</strong>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
