import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Crown,
  Flame,
  Medal,
  Scale,
  Sparkles,
  Trophy,
  UserPlus,
  Zap,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { computeLeaderboard, getDateKeyInTimezone } from '../lib/gamification';
import { Avatar, Button, Card, EmptyState } from '../components/ui/Primitives';

type LeaderboardTab = 'today' | 'week' | 'overall';

const TABS: Array<{ id: LeaderboardTab; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Weekly' },
  { id: 'overall', label: 'Overall' },
];

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

  const first = rankings[0] ?? null;
  const second = rankings[1] ?? null;
  const third = rankings[2] ?? null;
  const isTiedTop = Boolean(first && second && first.isTied && second.isTied && first.rank === 1);

  return (
    <div className="space-y-6">
      {/* Header & Segmented Filter */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7956E8]">
            <Trophy className="h-3.5 w-3.5" />
            Friendly Competition
          </div>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#25243A]">
            Leaderboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#77768C]">
            {activeGoal.title} · Tie-aware rankings with zero unfair bonus XP
          </p>
        </div>

        {/* Animated Segmented Tabs */}
        <div
          role="tablist"
          aria-label="Leaderboard timeframe"
          className="inline-flex rounded-2xl border border-[#EAE7F8] bg-white p-1 self-start sm:self-auto shadow-xs"
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
                className={`relative min-h-[38px] rounded-xl px-4 text-xs font-bold transition-colors cursor-pointer ${
                  active ? 'text-white' : 'text-[#77768C] hover:text-[#25243A]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="leaderboardTabPill"
                    className="absolute inset-0 rounded-xl bg-[#7956E8] shadow-[0_4px_12px_rgba(121,86,232,0.28)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TOP-3 VISUAL PODIUM */}
      {rankings.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="No participants ranked yet"
          description="Complete quests to appear on the podium."
        />
      ) : (
        <Card padding="none" className="overflow-hidden border-[#E4DDF9]">
          <div className="sd-gradient-hero px-4 sm:px-6 pt-6 pb-5">
            <div className="flex items-center justify-between gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7956E8]">
                <Sparkles className="h-3.5 w-3.5" />
                {tab === 'today'
                  ? `Today's Podium (${todayKey})`
                  : tab === 'week'
                  ? '7-Day Podium'
                  : 'All-Time Hall of Fame'}
              </span>
              {isTiedTop && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF6DB] px-2.5 py-0.5 text-[11px] font-bold text-[#9A6808]">
                  <Scale className="h-3 w-3" /> Tied for #1
                </span>
              )}
            </div>

            {/* 3-Column Podium Grid: 2nd (Left), 1st (Center Elevated), 3rd (Right) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-2xl mx-auto">
              {/* 2ND PLACE */}
              <motion.div layout className="flex flex-col items-center text-center">
                {second ? (
                  <>
                    <div className="relative">
                      <Avatar
                        name={second.displayName}
                        initials={second.avatarInitials}
                        color={second.avatarColor}
                        avatarConfig={second.avatarConfig}
                        seedKey={second.uid}
                        size="md"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#A78BFA] text-[11px] font-extrabold text-white ring-2 ring-white tabular-nums">
                        {second.rank}
                      </span>
                    </div>
                    <p className="mt-2.5 max-w-full truncate text-xs sm:text-sm font-extrabold text-[#25243A]">
                      {second.displayName.split(' ')[0]}
                    </p>
                    <p className="text-[11px] font-bold text-[#7956E8] tabular-nums">
                      {second.points.toLocaleString()} XP
                    </p>
                    <p className="text-[10px] text-[#77768C]">Lv.{second.level}</p>
                    <div className="mt-2.5 w-full h-16 sm:h-20 rounded-t-2xl bg-gradient-to-b from-[#EDE7FF] to-[#DFD5FF] border-t border-x border-[#D4C7FF] flex items-center justify-center">
                      <Medal className="h-5 w-5 text-[#7956E8]" />
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActivePage('groups')}
                    className="flex flex-col items-center w-full cursor-pointer group"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[#C7BDF5] bg-white text-[#7956E8] group-hover:bg-[#F1EDFF]">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <p className="mt-2 text-xs font-bold text-[#77768C]">Invite Duo</p>
                    <div className="mt-3 w-full h-14 rounded-t-2xl bg-[#F3F0FF] border-t border-x border-dashed border-[#D8CFF8]" />
                  </button>
                )}
              </motion.div>

              {/* 1ST PLACE (CENTER ELEVATED) */}
              <motion.div layout className="flex flex-col items-center text-center">
                {first && (
                  <>
                    <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF6DB] text-[#D98806] shadow-xs">
                      <Crown className="h-4 w-4 fill-[#FFC857]" />
                    </div>
                    <div className="relative">
                      <Avatar
                        name={first.displayName}
                        initials={first.avatarInitials}
                        color={first.avatarColor}
                        avatarConfig={first.avatarConfig}
                        seedKey={first.uid}
                        size="lg"
                        animated
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#FFC857] text-[11px] font-extrabold text-[#25243A] ring-2 ring-white tabular-nums">
                        {first.rank}
                      </span>
                    </div>
                    <p className="mt-2.5 max-w-full truncate text-xs sm:text-sm font-extrabold text-[#25243A]">
                      {first.displayName.split(' ')[0]}
                      {first.uid === currentUser?.uid ? ' (You)' : ''}
                    </p>
                    <p className="text-xs sm:text-sm font-extrabold text-[#7956E8] tabular-nums">
                      {first.points.toLocaleString()} XP
                    </p>
                    <p className="text-[10px] font-semibold text-[#77768C]">
                      Lv.{first.level} · {first.levelTitle}
                    </p>
                    <div className="mt-2.5 w-full h-24 sm:h-28 rounded-t-2xl bg-gradient-to-b from-[#FFF3C4] to-[#FFE28A] border-t border-x border-[#FFD463] flex flex-col items-center justify-center gap-1 shadow-inner">
                      <Trophy className="h-6 w-6 text-[#B77500]" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#9A6200]">
                        {isTiedTop ? 'Co-Leader' : 'Leader'}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>

              {/* 3RD PLACE / DUO SPOT */}
              <motion.div layout className="flex flex-col items-center text-center">
                {third ? (
                  <>
                    <div className="relative">
                      <Avatar
                        name={third.displayName}
                        initials={third.avatarInitials}
                        color={third.avatarColor}
                        avatarConfig={third.avatarConfig}
                        seedKey={third.uid}
                        size="md"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#45C4D8] text-[11px] font-extrabold text-white ring-2 ring-white tabular-nums">
                        {third.rank}
                      </span>
                    </div>
                    <p className="mt-2.5 max-w-full truncate text-xs sm:text-sm font-extrabold text-[#25243A]">
                      {third.displayName.split(' ')[0]}
                    </p>
                    <p className="text-[11px] font-bold text-[#1D8597] tabular-nums">
                      {third.points.toLocaleString()} XP
                    </p>
                    <p className="text-[10px] text-[#77768C]">Lv.{third.level}</p>
                    <div className="mt-2.5 w-full h-12 sm:h-16 rounded-t-2xl bg-gradient-to-b from-[#E5F8FB] to-[#C8F0F7] border-t border-x border-[#B2E8F2] flex items-center justify-center">
                      <span className="text-xs font-extrabold text-[#1D8597]">#3</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center w-full opacity-80">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E5F8FB] text-[#1D8597]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <p className="mt-2 text-[11px] font-bold text-[#77768C]">Duo Mode</p>
                    <p className="text-[10px] text-[#9A98B0]">2-Player Arena</p>
                    <div className="mt-2.5 w-full h-12 sm:h-14 rounded-t-2xl bg-[#ECF9FC] border-t border-x border-[#D2F0F6] flex items-center justify-center">
                      <span className="text-[11px] font-bold text-[#45C4D8]">2/2</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </Card>
      )}

      {/* DETAILED RANKINGS + WINNER HISTORY */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Ranked Standings (7 cols) */}
        <Card className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-[#25243A]">Player Standings</h2>
            <span className="text-xs font-semibold text-[#77768C] capitalize">{tab} XP</span>
          </div>

          <div className="space-y-2.5">
            {rankings.map((entry) => {
              const isMe = entry.uid === currentUser?.uid;
              return (
                <motion.div
                  key={entry.uid}
                  layout
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${
                    isMe
                      ? 'border-[#CBBFF8] bg-[#F7F4FF]'
                      : 'border-[#EAE7F8] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold tabular-nums ${
                        entry.rank === 1
                          ? 'bg-[#FFF6DB] text-[#A56A00]'
                          : entry.rank === 2
                          ? 'bg-[#F1EDFF] text-[#7956E8]'
                          : 'bg-[#E5F8FB] text-[#1D8597]'
                      }`}
                    >
                      #{entry.rank}
                    </div>
                    <Avatar
                      name={entry.displayName}
                      initials={entry.avatarInitials}
                      color={entry.avatarColor}
                      avatarConfig={entry.avatarConfig}
                      seedKey={entry.uid}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#25243A]">
                        {entry.displayName}
                        {isMe ? ' (You)' : ''}
                      </p>
                      <p className="text-[11px] text-[#77768C] truncate">
                        Lv.{entry.level} {entry.levelTitle} ·{' '}
                        <span className="inline-flex items-center gap-0.5 text-[#D98806] font-semibold">
                          <Flame className="h-3 w-3 fill-[#FFC857]" />
                          {entry.currentStreak}d
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="inline-flex items-center gap-1 text-sm font-extrabold text-[#7956E8] tabular-nums">
                      <Zap className="h-3.5 w-3.5 text-[#FFC857] fill-[#FFC857]" />
                      {entry.points.toLocaleString()} XP
                    </p>
                    {entry.isTied && (
                      <p className="text-[10px] font-bold text-[#9A6808]">Tied</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Daily Winner History (5 cols) */}
        <Card className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-[#25243A]">Winner History</h2>
              <p className="text-xs text-[#77768C]">Daily score records in goal timezone</p>
            </div>
            <Calendar className="h-4 w-4 text-[#7956E8]" />
          </div>

          {sortedHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DFD8F8] bg-[#FAF9FF] p-6 text-center text-xs text-[#77768C]">
              Complete today&apos;s quests to record your first daily winner entry.
            </div>
          ) : (
            <div className="divide-y divide-[#F1EEFA]">
              {sortedHistory.slice(0, 8).map((res) => {
                const winnerNames = res.winnerIds
                  .map((id) => participantById.get(id)?.displayName.split(' ')[0] || 'Player')
                  .join(' & ');
                return (
                  <div key={res.dateKey} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-[#25243A] tabular-nums">
                        {res.dateKey}
                        {res.dateKey === todayKey ? ' · Live' : ''}
                      </p>
                      <p className="text-xs text-[#77768C] truncate mt-0.5">
                        {res.winnerIds.length === 0
                          ? 'No XP recorded'
                          : res.isTie
                          ? `Tie: ${winnerNames}`
                          : `Winner: ${winnerNames}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {Object.entries(res.scores).map(([uid, score]) => {
                        const p = participantById.get(uid);
                        return (
                          <span
                            key={uid}
                            className="rounded-lg bg-[#F5F2FF] px-2 py-0.5 text-[11px] font-bold text-[#6B48DC] tabular-nums"
                          >
                            {p ? p.displayName.split(' ')[0].slice(0, 1) : '?'}: {score}
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
