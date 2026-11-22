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
import { BarChart3, CheckCircle2, Clock, Flame, TrendingUp } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { EmptyState } from '../components/ui/Primitives';
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

    // Seed cumulative XP prior to window
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
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-[#242337] tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-[#66687A]">Honest trends built directly from your completed tasks.</p>
        </header>
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No goal selected"
          description="Create or join a study goal to track your daily completion rate, XP curve, and duo pace."
          actionLabel="Go to Goals"
          onAction={() => setActivePage('goals')}
        />
      </div>
    );
  }

  const hasAnyData = completions.length > 0 || xpTransactions.some((t) => t.goalId === activeGoal.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242337] tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-[#66687A]">
            {activeGoal.title} · Real study metrics across the last {rangeDays} days
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[#E9EAF0] bg-white p-1">
          {([7, 14, 30] as RangeDays[]).map((daysOpt) => (
            <button
              key={daysOpt}
              type="button"
              onClick={() => setRangeDays(daysOpt)}
              className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold font-mono transition-colors ${
                rangeDays === daysOpt
                  ? 'bg-[#7956D8] text-white'
                  : 'text-[#66687A] hover:text-[#242337]'
              }`}
            >
              {daysOpt}D
            </button>
          ))}
        </div>
      </header>

      {/* Summary KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E9EAF0] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#66687A]">Tasks Completed</span>
            <CheckCircle2 className="h-4 w-4 text-[#38A879]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#242337] font-mono tabular-nums">
            {summary.tasksCount}
          </p>
          <p className="mt-1 text-xs text-[#66687A]">Last {rangeDays} days</p>
        </div>

        <div className="rounded-2xl border border-[#E9EAF0] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#66687A]">XP Earned</span>
            <TrendingUp className="h-4 w-4 text-[#7956D8]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#242337] font-mono tabular-nums">
            {summary.totalXpWindow}
          </p>
          <p className="mt-1 text-xs text-[#66687A]">Verified transactions</p>
        </div>

        <div className="rounded-2xl border border-[#E9EAF0] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#66687A]">Consistency</span>
            <Flame className="h-4 w-4 text-[#F3BD59]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#242337] font-mono tabular-nums">
            {summary.consistencyPct}%
          </p>
          <p className="mt-1 text-xs text-[#66687A] font-mono tabular-nums">
            {summary.activeDays} of {rangeDays} days active
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9EAF0] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#66687A]">Study Time</span>
            <Clock className="h-4 w-4 text-[#7956D8]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#242337] font-mono tabular-nums">
            {summary.totalMinutes}m
          </p>
          <p className="mt-1 text-xs text-[#66687A]">Estimated task duration</p>
        </div>
      </section>

      {!hasAnyData ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No completed tasks recorded yet"
          description="StudyDuo never fabricates charts. Check off your first task in Daily Checklist and your real completion and XP curves will appear immediately."
          actionLabel="Open Daily Checklist"
          onAction={() => setActivePage('checklist')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cumulative XP Growth */}
          <section className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
            <h2 className="text-base font-semibold text-[#242337]">Your Cumulative XP Growth</h2>
            <p className="mt-0.5 text-xs text-[#66687A]">
              Tracks your earned XP progression across the selected window.
            </p>
            <div className="mt-5 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="xpPurpleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7956D8" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#7956D8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9EAF0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#66687A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#66687A' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E9EAF0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeXp"
                    name="Cumulative XP"
                    stroke="#7956D8"
                    strokeWidth={2.5}
                    fill="url(#xpPurpleGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Daily Task Completion Comparison */}
          <section className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
            <h2 className="text-base font-semibold text-[#242337]">Daily Tasks Completed</h2>
            <p className="mt-0.5 text-xs text-[#66687A]">
              {partner ? `You vs ${partner.displayName.split(' ')[0]} per day` : 'Tasks completed per day'}
            </p>
            <div className="mt-5 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9EAF0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#66687A' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#66687A' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E9EAF0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="myTasks" name="You" fill="#7956D8" radius={[6, 6, 0, 0]} maxBarSize={24} />
                  {partner && (
                    <Bar
                      dataKey="partnerTasks"
                      name={partner.displayName.split(' ')[0]}
                      fill="#38A879"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={24}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Daily XP Comparison */}
          <section className="lg:col-span-2 rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
            <h2 className="text-base font-semibold text-[#242337]">Daily XP Comparison</h2>
            <p className="mt-0.5 text-xs text-[#66687A]">
              Side-by-side daily XP pace to keep both partners motivated.
            </p>
            <div className="mt-5 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9EAF0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#66687A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#66687A' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E9EAF0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="myXp" name="Your XP" fill="#7956D8" radius={[6, 6, 0, 0]} maxBarSize={26} />
                  {partner && (
                    <Bar
                      dataKey="partnerXp"
                      name={`${partner.displayName.split(' ')[0]}'s XP`}
                      fill="#F3BD59"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={26}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
