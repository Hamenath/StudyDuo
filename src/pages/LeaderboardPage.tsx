import React, { useMemo, useState } from 'react';
import { Trophy, UserPlus } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { computeLeaderboard, getDateKeyInTimezone } from '../lib/gamification';
import { Avatar, Button, Card, EmptyState } from '../components/ui/Primitives';

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
        icon={<Trophy className="h-6 w-6" />}
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
      {/* Header & Clean Segmented Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#242424]">
            Leaderboard
          </h1>
          <p className="mt-0.5 text-sm text-[#888888]">
            {activeGoal.title} · Fair, tie-aware XP standings
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Leaderboard timeframe"
          className="inline-flex rounded-xl border border-[#EEEEF2] bg-white p-1 self-start sm:self-auto"
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
                className={`min-h-[36px] rounded-lg px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#7956E8] text-white'
                    : 'text-[#888888] hover:text-[#242424]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact Top-3 Highlight Strip (no oversized cartoon podium) */}
      {rankings.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="No participants ranked yet"
          description="Complete quests to appear on the leaderboard."
        />
      ) : (
        <Card>
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-sm font-bold text-[#242424]">
              {tab === 'today'
                ? `Today's Leaders (${todayKey})`
                : tab === 'week'
                ? '7-Day Leaders'
                : 'All-Time Leaders'}
            </h2>
            {isTiedTop && (
              <span className="text-xs font-bold text-[#B26A00]">🤝 Tied for #1</span>
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
                  className={`flex items-center gap-3 rounded-xl border p-3.5 ${
                    isFirst
                      ? 'border-[#F5D782] bg-[#FFFDF5]'
                      : 'border-[#EEEEF2] bg-white'
                  }`}
                >
                  <span className="text-xl leading-none shrink-0" aria-hidden="true">
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
                    <p className="text-sm font-bold text-[#242424] truncate">
                      {entry.displayName.split(' ')[0]}
                      {isMe ? ' (You)' : ''}
                    </p>
                    <p className="text-xs text-[#888888] tabular-nums">
                      Lv.{entry.level} · 🔥 {entry.currentStreak}d
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-[#7956E8] tabular-nums">
                      {entry.points.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-semibold text-[#888888]">XP</p>
                  </div>
                </div>
              );
            })}

            {participants.length < activeGoal.maxParticipants && (
              <button
                type="button"
                onClick={() => setActivePage('groups')}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#D8D4EC] bg-[#FAFAFC] p-3.5 text-xs font-semibold text-[#7956E8] hover:bg-[#F5F2FF] transition-colors cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Invite Study Partner
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Clean Standings List + Daily Winner History */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Standings (7 cols) */}
        <Card padding="none" className="lg:col-span-7 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-[#EEEEF2]">
            <h2 className="text-base font-bold text-[#242424]">Standings</h2>
            <span className="text-xs font-medium text-[#888888] capitalize">{tab} XP</span>
          </div>

          <div className="divide-y divide-[#EEEEF2]">
            {rankings.map((entry) => {
              const isMe = entry.uid === currentUser?.uid;
              return (
                <div
                  key={entry.uid}
                  className={`flex items-center justify-between gap-3 px-5 py-3.5 ${
                    isMe ? 'bg-[#FAF8FF]' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 text-center text-sm font-extrabold text-[#242424] tabular-nums shrink-0">
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
                      <p className="truncate text-sm font-bold text-[#242424]">
                        {entry.displayName}
                        {isMe && (
                          <span className="ml-1.5 text-xs font-semibold text-[#7956E8]">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-[#888888] truncate">
                        Lv.{entry.level} {entry.levelTitle} · 🔥 {entry.currentStreak}d
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-[#7956E8] tabular-nums">
                      {entry.points.toLocaleString()} XP
                    </p>
                    {entry.isTied && (
                      <p className="text-[11px] font-semibold text-[#B26A00]">Tied</p>
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
            <h2 className="text-base font-bold text-[#242424]">Daily Winner History</h2>
            <p className="text-xs text-[#888888] mt-0.5">Recorded in goal timezone ({tz})</p>
          </div>

          {sortedHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#EEEEF2] bg-[#F7F8FA] p-5 text-center text-xs text-[#888888]">
              Complete today&apos;s quests to record your first daily winner entry.
            </div>
          ) : (
            <div className="divide-y divide-[#EEEEF2]">
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
                      <p className="font-mono text-xs font-bold text-[#242424] tabular-nums">
                        {res.dateKey}
                        {res.dateKey === todayKey ? ' · Today' : ''}
                      </p>
                      <p className="text-xs text-[#888888] truncate mt-0.5">
                        {res.winnerIds.length === 0
                          ? 'No XP recorded'
                          : res.isTie
                          ? `Tie: ${winnerNames}`
                          : `Winner: ${winnerNames}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs font-bold tabular-nums text-[#5C5C6E]">
                      {Object.entries(res.scores).map(([uid, score]) => {
                        const p = participantById.get(uid);
                        return (
                          <span key={uid}>
                            {p ? p.displayName.split(' ')[0].slice(0, 1) : '?'}:{' '}
                            <span className="text-[#7956E8]">{score}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button variant="secondary" size="sm" fullWidth onClick={() => setActivePage('checklist')}>
            Earn XP in Quest Center
          </Button>
        </Card>
      </div>
    </div>
  );
};
