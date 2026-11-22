import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Clock, Flame, TrendingUp } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { Card, EmptyState } from '../components/ui/Primitives';
import { addDaysToDateKey, getDateKeyInTimezone, getSharedDailyScore } from '../lib/gamification';

type RangeDays = 7 | 14 | 30;

export const AnalyticsPage: React.FC = () => {
  const { currentUser, activeGoal, participants, completions, dailyResults, xpTransactions, setActivePage } = useStudyDuo();
  const [rangeDays, setRangeDays] = useState<RangeDays>(7);

  const todayKey = useMemo(
    () => getDateKeyInTimezone(new Date(), activeGoal?.timezone || currentUser?.timezone || 'UTC'),
    [activeGoal?.timezone, currentUser?.timezone]
  );

  const dateWindow = useMemo(() => {
    const keys: string[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      keys.push(addDaysToDateKey(todayKey, -i));
    }
    return keys;
  }, [rangeDays, todayKey]);

  const partner = useMemo(
    () => participants.find((p) => p.uid !== currentUser?.uid) ?? null,
    [currentUser?.uid, participants]
  );

  const myCompletions = useMemo(
    () => (currentUser ? completions.filter((c) => c.userId === currentUser.uid) : []),
    [completions, currentUser]
  );

  const chartData = useMemo(() => {
    if (!currentUser || !activeGoal) return [];
    let cumulativeXp = 0;

    const startKey = dateWindow[0];
    for (const tx of xpTransactions) {
      if (tx.userId === currentUser.uid && tx.goalId === activeGoal.id && tx.dateKey < startKey) {
        cumulativeXp += tx.xpAmount;
      }
    }

    return dateWindow.map((dateKey) => {
      const myCount = completions.filter((c) => c.userId === currentUser.uid && c.dateKey === dateKey).length;
      const partnerCount = partner
        ? completions.filter((c) => c.userId === partner.uid && c.dateKey === dateKey).length
        : 0;
      const myDayXp = getSharedDailyScore({
        goalId: activeGoal.id,
        dateKey,
        userId: currentUser.uid,
        dailyResults,
        completions,
        transactions: xpTransactions,
      });
      const partnerDayXp = partner
        ? getSharedDailyScore({
            goalId: activeGoal.id,
            dateKey,
            userId: partner.uid,
            dailyResults,
            completions,
            transactions: xpTransactions,
          })
        : 0;

      cumulativeXp += myDayXp;

      return {
        label: dateKey.slice(5),
        myTasks: myCount,
        partnerTasks: partnerCount,
        myXp: myDayXp,
        partnerXp: partnerDayXp,
        cumulativeXp,
      };
    });
  }, [activeGoal, completions, currentUser, dailyResults, dateWindow, partner, xpTransactions]);

  const summary = useMemo(() => {
    const startKey = dateWindow[0];
    const inWindow = myCompletions.filter((c) => c.dateKey >= startKey && c.dateKey <= todayKey);
    const totalMinutes = inWindow.reduce((sum, c) => sum + (c.estimatedMinutes || 0), 0);
    const activeDays = new Set(inWindow.map((c) => c.dateKey)).size;
    const consistencyPct = Math.round((activeDays / rangeDays) * 100);
    const totalXpWindow = xpTransactions
      .filter(
        (tx) =>
          tx.userId === currentUser?.uid &&
          tx.goalId === activeGoal?.id &&
          tx.dateKey >= startKey &&
          tx.dateKey <= todayKey
      )
      .reduce((sum, tx) => sum + tx.xpAmount, 0);
    return {
      tasksCount: inWindow.length,
      totalMinutes,
      activeDays,
      consistencyPct,
      totalXpWindow,
    };
  }, [activeGoal?.id, currentUser?.uid, dateWindow, myCompletions, rangeDays, todayKey, xpTransactions]);

  if (!activeGoal || !currentUser) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#20202A] tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-[#777783]">Honest trends built directly from your completed tasks.</p>
        </header>
        <EmptyState
          mascot="science"
          title="No goal selected"
          description="Create or join a study goal to track your daily completion rate, XP curve, and duo pace."
          actionLabel="Go to Roadmap"
          onAction={() => setActivePage('goals')}
        />
      </div>
    );
  }

  const hasAnyData = completions.length > 0 || xpTransactions.some((t) => t.goalId === activeGoal.id);

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#20202A] tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-[#777783]">
            {activeGoal.title} · Real study metrics across the last {rangeDays} days
          </p>
        </div>

        <div className="inline-flex rounded-full border border-[#F0EDF5] bg-white p-1 self-start sm:self-auto shadow-xs">
          {([7, 14, 30] as RangeDays[]).map((daysOpt) => (
            <button
              key={daysOpt}
              type="button"
              onClick={() => setRangeDays(daysOpt)}
              className={`min-h-[38px] rounded-full px-4 text-xs font-extrabold font-mono transition-colors cursor-pointer ${
                rangeDays === daysOpt
                  ? 'bg-[#7651E8] text-white'
                  : 'text-[#777783] hover:text-[#20202A]'
              }`}
            >
              {daysOpt}D
            </button>
          ))}
        </div>
      </header>

      {/* 4 Pastel Summary KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[24px] bg-[#E2F5E9] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1F874D]">Tasks Completed</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#2FB368]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl sm:text-3xl font-black text-[#20202A] tabular-nums">
            {summary.tasksCount}
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#1F874D]">Last {rangeDays} days</p>
        </div>

        <div className="rounded-[24px] bg-[#E9DFFF] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6842DE]">XP Earned</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#7651E8]">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl sm:text-3xl font-black text-[#20202A] tabular-nums">
            {summary.totalXpWindow}
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#6842DE]">Verified transactions</p>
        </div>

        <div className="rounded-[24px] bg-[#FFF0C9] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8A5A00]">Consistency</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#E59A18]">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl sm:text-3xl font-black text-[#20202A] tabular-nums">
            {summary.consistencyPct}%
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#8A5A00] tabular-nums">
            {summary.activeDays} of {rangeDays} days active
          </p>
        </div>

        <div className="rounded-[24px] bg-[#FFE8F0] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#BE3469]">Study Time</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#E05288]">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl sm:text-3xl font-black text-[#20202A] tabular-nums">
            {summary.totalMinutes}m
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#BE3469]">Estimated task duration</p>
        </div>
      </section>

      {!hasAnyData ? (
        <EmptyState
          mascot="science"
          title="No completed tasks recorded yet"
          description="StudyDuo never fabricates charts. Check off your first task in Quest Center and your real completion and XP curves will appear immediately."
          actionLabel="Open Quest Center"
          onAction={() => setActivePage('checklist')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Cumulative XP Growth */}
          <Card>
            <h2 className="font-display text-base font-black text-[#20202A]">Your Cumulative XP Growth</h2>
            <p className="mt-0.5 text-xs text-[#777783]">
              Tracks your earned XP progression across the selected window.
            </p>
            <div className="mt-5 h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height={256} minWidth={1}>
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="xpPurpleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7651E8" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#7651E8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDF5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#777783' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#777783' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#F0EDF5',
                      borderRadius: '16px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeXp"
                    name="Cumulative XP"
                    stroke="#7651E8"
                    strokeWidth={3}
                    fill="url(#xpPurpleGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Daily Task Completion Comparison */}
          <Card>
            <h2 className="font-display text-base font-black text-[#20202A]">Daily Tasks Completed</h2>
            <p className="mt-0.5 text-xs text-[#777783]">
              {partner ? `You vs ${partner.displayName.split(' ')[0]} per day` : 'Tasks completed per day'}
            </p>
            <div className="mt-5 h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height={256} minWidth={1}>
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDF5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#777783' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#777783' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#F0EDF5',
                      borderRadius: '16px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="myTasks" name="You" fill="#7651E8" radius={[8, 8, 0, 0]} maxBarSize={24} />
                  {partner && (
                    <Bar
                      dataKey="partnerTasks"
                      name={partner.displayName.split(' ')[0]}
                      fill="#2FB368"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={24}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Daily XP Comparison */}
          <Card className="lg:col-span-2">
            <h2 className="font-display text-base font-black text-[#20202A]">Daily XP Comparison</h2>
            <p className="mt-0.5 text-xs text-[#777783]">
              Side-by-side daily XP pace to keep both partners motivated.
            </p>
            <div className="mt-5 h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height={256} minWidth={1}>
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDF5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#777783' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#777783' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#F0EDF5',
                      borderRadius: '16px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="myXp" name="Your XP" fill="#7651E8" radius={[8, 8, 0, 0]} maxBarSize={26} />
                  {partner && (
                    <Bar
                      dataKey="partnerXp"
                      name={`${partner.displayName.split(' ')[0]}'s XP`}
                      fill="#FFC857"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={26}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
