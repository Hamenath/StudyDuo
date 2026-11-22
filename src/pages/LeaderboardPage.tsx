import React, { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { computeLeaderboard, getDateKeyInTimezone } from '../lib/gamification';
import { Avatar, Button, Card, EmptyState } from '../components/ui/Primitives';
import { MascotImage } from '../components/ui/MascotArtwork';

type LeaderboardTab = 'today' | 'week' | 'overall';

const TABS: Array<{ id: LeaderboardTab; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Weekly' },
  { id: 'overall', label: 'Overall' },
];

const RANK_MEDAL = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

export const LeaderboardPage: React.FC = () => {
  const {
    currentUser,
    activeGoal,
    participants,
    xpTransactions,
    dailyResults,
    completions,
    setActivePage,
  } = useStudyDuo();

  const [tab, setTab] = useState<LeaderboardTab>('today');

  const tz = activeGoal?.timezone || currentUser?.timezone || 'UTC';
  const todayKey = getDateKeyInTimezone(new Date(), tz);

  const rankings = useMemo(() => {
    if (!activeGoal) return [];
    const totalXpMap: Record<string, number> = {};
    if (currentUser) {
      totalXpMap[currentUser.uid] = currentUser.totalXp;
    }
    return computeLeaderboard(
      participants,
      xpTransactions,
      activeGoal.id,
      todayKey,
      tab,
      totalXpMap,
      dailyResults,
      completions
    );
  }, [activeGoal, completions, currentUser, dailyResults, participants, tab, todayKey, xpTransactions]);

  const sortedHistory = useMemo(
    () => [...dailyResults].sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [dailyResults]
  );

  const participantById = useMemo(
    () => new Map(participants.map((p) => [p.uid, p])),
    [participants]
  );

  if (!activeGoal) {
    return (
      <EmptyState
        mascot="owl"
        title="No active leaderboard yet"
        description="Join or create a study goal to compare daily, weekly, and overall XP with your study partner."
        actionLabel="Go to Roadmap"
        onAction={() => setActivePage('goals')}
      />
    );
  }

  const topThree = rankings.slice(0, 3);
  const isTiedTop = Boolean(
    rankings[0] && rankings[1] && rankings[0].isTied && rankings[1].isTied && rankings[0].rank === 1
  );

  return (
    <div className="space-y-5">
      {/* Header & Rounded Pill Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#20202A]">
            Leaderboard
          </h1>
          <p className="mt-0.5 text-sm text-[#777783]">
            {activeGoal.title} · Fair, tie-aware XP standings
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Leaderboard timeframe"
          className="inline-flex rounded-full border border-[#F0EDF5] bg-white p-1 self-start sm:self-auto shadow-xs"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`min-h-[38px] rounded-full px-4 text-xs font-extrabold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#7651E8] text-white'
                    : 'text-[#777783] hover:text-[#20202A]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pastel Yellow Leaders Showcase */}
      {rankings.length === 0 ? (
        <EmptyState
          mascot="owl"
          title="No participants ranked yet"
          description="Complete quests to appear on the leaderboard."
        />
      ) : (
        <div className="rounded-[28px] bg-[#FFF0C9] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MascotImage
                mascot="owl"
                className="h-14 w-14 shrink-0 ring-2 ring-white shadow-xs"
                rounded="rounded-full"
                seamless={false}
              />
              <div>
                <h2 className="font-display text-lg font-black text-[#20202A]">
                  {tab === 'today'
                    ? `Today's Leaders (${todayKey})`
                    : tab === 'week'
                    ? '7-Day Leaders'
                    : 'All-Time Leaders'}
                </h2>
                <p className="text-xs font-semibold text-[#8A5A00]">
                  Every quest counts toward your daily crown!
                </p>
              </div>
            </div>
            {isTiedTop && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#B47100]">
                🤝 Tied for #1
              </span>
            )}
          </div>

          <div
            className={`grid grid-cols-1 gap-3 ${
              topThree.length === 2 && participants.length >= activeGoal.maxParticipants
                ? 'sm:grid-cols-2'
                : 'sm:grid-cols-3'
            }`}
          >
            {topThree.map((entry) => {
              const isFirst = entry.rank === 1;
              const isMe = entry.uid === currentUser?.uid;
              return (
                <div
                  key={entry.uid}
                  className={`flex items-center gap-3 rounded-[22px] p-4 shadow-[0_6px_18px_-12px_rgba(32,32,42,0.14)] ${
                    isFirst ? 'bg-white ring-2 ring-[#FFC857]' : 'bg-white/90'
                  }`}
                >
                  <span className="text-2xl leading-none shrink-0" aria-hidden="true">
                    {RANK_MEDAL(entry.rank)}
                  </span>
                  <Avatar
                    name={entry.displayName}
                    initials={entry.avatarInitials}
                    color={entry.avatarColor}
                    avatarConfig={entry.avatarConfig}
                    seedKey={entry.uid}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-[#20202A] truncate">
                      {entry.displayName.split(' ')[0]}
                      {isMe ? ' (You)' : ''}
                    </p>
                    <p className="text-xs text-[#777783] tabular-nums">
                      Lv.{entry.level} · 🔥 {entry.currentStreak}d
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-base font-black text-[#7651E8] tabular-nums">
                      {entry.points.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-[#777783]">XP</p>
                  </div>
                </div>
              );
            })}

            {participants.length < activeGoal.maxParticipants && (
              <button
                type="button"
                onClick={() => setActivePage('groups')}
                className="flex items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-[#E6C575] bg-white/75 p-4 text-xs font-extrabold text-[#8A5A00] hover:bg-white transition-colors cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Invite Study Partner
              </button>
            )}
          </div>
        </div>
      )}

      {/* Standings List + Daily Winner History */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Standings (7 cols) */}
        <Card padding="none" className="lg:col-span-7 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-[#F0EDF5]">
            <h2 className="font-display text-base font-black text-[#20202A]">Standings</h2>
            <span className="rounded-full bg-[#F8F5FF] px-3 py-0.5 text-xs font-bold text-[#7651E8] capitalize">
              {tab} XP
            </span>
          </div>

          <div className="divide-y divide-[#F0EDF5]">
            {rankings.map((entry) => {
              const isMe = entry.uid === currentUser?.uid;
              return (
                <div
                  key={entry.uid}
                  className={`flex items-center justify-between gap-3 px-5 py-3.5 ${
                    isMe ? 'bg-[#F8F5FF]' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E9DFFF]/70 text-xs font-black text-[#7651E8] tabular-nums shrink-0">
                      #{entry.rank}
                    </span>
                    <Avatar
                      name={entry.displayName}
                      initials={entry.avatarInitials}
                      color={entry.avatarColor}
                      avatarConfig={entry.avatarConfig}
                      seedKey={entry.uid}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-[#20202A]">
                        {entry.displayName}
                        {isMe && (
                          <span className="ml-1.5 text-xs font-bold text-[#7651E8]">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-[#777783] truncate">
                        Lv.{entry.level} {entry.levelTitle} · 🔥 {entry.currentStreak}d
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-[#7651E8] tabular-nums">
                      {entry.points.toLocaleString()} XP
                    </p>
                    {entry.isTied && (
                      <p className="text-[11px] font-bold text-[#B47100]">Tied</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Winner History (5 cols) */}
        <Card className="lg:col-span-5 space-y-4">
          <div>
            <h2 className="font-display text-base font-black text-[#20202A]">Daily Winner History</h2>
            <p className="text-xs text-[#777783] mt-0.5">Recorded in goal timezone ({tz})</p>
          </div>

          {sortedHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E4DAFA] bg-[#F8F5FF] p-5 text-center text-xs text-[#777783]">
              Complete today&apos;s quests to record your first daily winner entry.
            </div>
          ) : (
            <div className="divide-y divide-[#F0EDF5]">
              {sortedHistory.slice(0, 8).map((res) => {
                const winnerNames = res.winnerIds
                  .map((id) => participantById.get(id)?.displayName.split(' ')[0] || 'Player')
                  .join(' & ');
                return (
                  <div
                    key={res.dateKey}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-[#20202A] tabular-nums">
                        {res.dateKey}
                        {res.dateKey === todayKey ? ' · Today' : ''}
                      </p>
                      <p className="text-xs text-[#777783] truncate mt-0.5">
                        {res.winnerIds.length === 0
                          ? 'No XP recorded'
                          : res.isTie
                          ? `Tie: ${winnerNames}`
                          : `Winner: ${winnerNames}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs font-bold tabular-nums text-[#5C5C6C]">
                      {Object.entries(res.scores).map(([uid, score]) => {
                        const p = participantById.get(uid);
                        return (
                          <span key={uid} className="rounded-full bg-[#F8F5FF] px-2 py-0.5">
                            {p ? p.displayName.split(' ')[0].slice(0, 1) : '?'}:{' '}
                            <span className="text-[#7651E8]">{score}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button variant="primary" size="sm" fullWidth withArrowCircle onClick={() => setActivePage('checklist')}>
            Earn XP in Quest Center
          </Button>
        </Card>
      </div>
    </div>
  );
};
