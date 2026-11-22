import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Coffee,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Lock,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  Youtube,
  Zap,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import {
  buildCompletionId,
  canEditOfficialTask,
  DEFAULT_XP_PRESETS,
  getDateKeyInTimezone,
  sanitizeExternalUrl,
} from '../lib/gamification';
import { taskSchema } from '../lib/validation';
import type { ResourceLink, Task, TaskPriority } from '../types/studyduo';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ModalSheet,
  ProgressBar,
} from '../components/ui/Primitives';

const XP_PRESETS = [
  { label: 'Small (10 XP)', value: DEFAULT_XP_PRESETS.small },
  { label: 'Normal (20 XP)', value: DEFAULT_XP_PRESETS.normal },
  { label: 'Difficult (40 XP)', value: DEFAULT_XP_PRESETS.difficult },
  { label: 'Major (60 XP)', value: DEFAULT_XP_PRESETS.major },
];

const DIFFICULTY_STYLES: Record<TaskPriority, { label: string; bg: string; text: string }> = {
  low: { label: 'Easy', bg: 'bg-[#E6F8F0]', text: 'text-[#1D855A]' },
  medium: { label: 'Medium', bg: 'bg-[#F1EDFF]', text: 'text-[#6B48DC]' },
  high: { label: 'Hard', bg: 'bg-[#FFF6DB]', text: 'text-[#9A6808]' },
};

export const ChecklistPage: React.FC = () => {
  const {
    currentUser,
    goals,
    activeGoal,
    setSelectedGoalId,
    setActivePage,
    participants,
    days,
    tasks,
    completions,
    personalNotes,
    createStudyDay,
    toggleDayPublished,
    toggleRestDay,
    saveTask,
    deleteTask,
    duplicateTask,
    archiveTask,
    reorderTask,
    completeTask,
    savePersonalNote,
  } = useStudyDuo();

  const isOwner = canEditOfficialTask(activeGoal || undefined, currentUser?.uid);
  const tz = activeGoal?.timezone || currentUser?.timezone || 'UTC';
  const todayKey = getDateKeyInTimezone(new Date(), tz);

  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [newDayTitle, setNewDayTitle] = useState('');
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);

  // Task Detail bottom sheet state
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [personalNoteDraft, setPersonalNoteDraft] = useState('');

  // Task Editor modal state (Owner only)
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    shortDescription: '',
    detailedInstructions: '',
    learningNotes: '',
    youtubeUrl: '',
    chatgptUrl: '',
    extraResourceLabel: '',
    extraResourceUrl: '',
    estimatedMinutes: 20,
    xpReward: 20,
    priority: 'medium' as TaskPriority,
    isPublished: true,
  });
  const [taskFormError, setTaskFormError] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    if (days.length === 0) {
      setSelectedDayId('');
      return;
    }
    if (!selectedDayId || !days.some((d) => d.id === selectedDayId)) {
      const todayMatch = days.find((d) => d.date === todayKey);
      setSelectedDayId(todayMatch ? todayMatch.id : days[days.length - 1].id);
    }
  }, [days, selectedDayId, todayKey]);

  const activeDay = useMemo(
    () => days.find((d) => d.id === selectedDayId) || days[0] || null,
    [days, selectedDayId]
  );

  const dayTasks = useMemo(() => {
    if (!activeDay) return [];
    return tasks
      .filter((t) => t.dayId === activeDay.id && !t.isArchived)
      .sort((a, b) => a.order - b.order);
  }, [activeDay, tasks]);

  const partner = useMemo(
    () => participants.find((p) => p.uid !== currentUser?.uid) || null,
    [currentUser?.uid, participants]
  );

  const completionSet = useMemo(() => new Set(completions.map((c) => c.id)), [completions]);

  const myCompletedCount = currentUser
    ? dayTasks.filter((t) => completionSet.has(buildCompletionId(t.id, currentUser.uid))).length
    : 0;
  const partnerCompletedCount = partner
    ? dayTasks.filter((t) => completionSet.has(buildCompletionId(t.id, partner.uid))).length
    : 0;

  const publishedCount = dayTasks.filter((t) => t.isPublished).length;
  const availableXp = dayTasks.filter((t) => t.isPublished).reduce((sum, t) => sum + t.xpReward, 0);
  const dailyPct = dayTasks.length > 0 ? Math.round((myCompletedCount / dayTasks.length) * 100) : 0;
  const isPlannedRestDay = Boolean(
    activeGoal && activeDay && (activeGoal.restDays.includes(activeDay.date) || activeDay.isRestDay)
  );
  const isFutureDay = Boolean(activeDay && activeDay.date > todayKey);

  const handleCompleteQuest = async (task: Task) => {
    if (!activeGoal || !currentUser) return;
    if (completionSet.has(buildCompletionId(task.id, currentUser.uid))) return;
    setJustCompletedId(task.id);
    await completeTask(activeGoal.id, task);
    setTimeout(() => {
      setJustCompletedId((prev) => (prev === task.id ? null : prev));
    }, 950);
  };

  const openTaskDetail = (task: Task) => {
    setDetailTask(task);
    const noteId = currentUser ? `${task.id}_${currentUser.uid}` : '';
    setPersonalNoteDraft(personalNotes[noteId]?.content || '');
  };

  const openNewTaskEditor = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      shortDescription: '',
      detailedInstructions: '',
      learningNotes: '',
      youtubeUrl: '',
      chatgptUrl: '',
      extraResourceLabel: '',
      extraResourceUrl: '',
      estimatedMinutes: 20,
      xpReward: 20,
      priority: 'medium',
      isPublished: true,
    });
    setTaskFormError('');
    setShowTaskEditor(true);
  };

  const openEditTaskEditor = (task: Task) => {
    const firstExtra = task.resourceLinks[0];
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      shortDescription: task.shortDescription,
      detailedInstructions: task.detailedInstructions,
      learningNotes: task.learningNotes,
      youtubeUrl: task.youtubeUrl,
      chatgptUrl: task.chatgptUrl,
      extraResourceLabel: firstExtra?.label || '',
      extraResourceUrl: firstExtra?.url || '',
      estimatedMinutes: task.estimatedMinutes,
      xpReward: task.xpReward,
      priority: task.priority,
      isPublished: task.isPublished,
    });
    setTaskFormError('');
    setShowTaskEditor(true);
  };

  const handleSaveTask = async (publishNow: boolean) => {
    if (!activeGoal || !activeDay) return;
    setTaskFormError('');
    const parsed = taskSchema.safeParse({ ...taskForm, isPublished: publishNow });
    if (!parsed.success) {
      setTaskFormError(parsed.error.issues[0]?.message || 'Please check task fields.');
      return;
    }

    const extraLinks: ResourceLink[] = [];
    if (parsed.data.extraResourceUrl) {
      const lower = parsed.data.extraResourceUrl.toLowerCase();
      extraLinks.push({
        label: parsed.data.extraResourceLabel || 'Study Resource',
        url: parsed.data.extraResourceUrl,
        type: lower.endsWith('.pdf') ? 'pdf' : lower.includes('docs.') ? 'docs' : 'website',
      });
    }

    await saveTask(activeGoal.id, {
      id: editingTask?.id,
      dayId: activeDay.id,
      dayNumber: activeDay.dayNumber,
      title: parsed.data.title,
      shortDescription: parsed.data.shortDescription,
      detailedInstructions: parsed.data.detailedInstructions,
      learningNotes: parsed.data.learningNotes,
      youtubeUrl: parsed.data.youtubeUrl,
      chatgptUrl: parsed.data.chatgptUrl,
      resourceLinks: extraLinks,
      estimatedMinutes: parsed.data.estimatedMinutes,
      xpReward: parsed.data.xpReward,
      priority: parsed.data.priority,
      isPublished: publishNow,
    });
    setShowTaskEditor(false);
  };

  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal) return;
    const nextDayNum = days.length > 0 ? Math.max(...days.map((d) => d.dayNumber)) + 1 : 1;
    const createdId = await createStudyDay(
      activeGoal.id,
      nextDayNum,
      newDayTitle || `Day ${String(nextDayNum).padStart(2, '0')} Quests`,
      true
    );
    if (createdId) {
      setSelectedDayId(createdId);
      setNewDayTitle('');
      setShowAddDayModal(false);
    }
  };

  if (!activeGoal) {
    return (
      <EmptyState
        icon={<CheckSquare className="h-6 w-6" />}
        title="No active quest board yet"
        description="Create a learning goal or accept a partner invitation code to open your daily Quest Center."
        actionLabel="Go to Roadmap"
        onAction={() => setActivePage('goals')}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7956E8]">
            <Sparkles className="h-3.5 w-3.5" />
            Quest Center
          </div>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#25243A]">
            Daily Learning Quests
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-[#77768C]">
            {goals.length > 1 ? (
              <select
                aria-label="Select active goal"
                value={activeGoal.id}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="rounded-xl border border-[#E4DFF6] bg-white px-2.5 py-1 text-xs font-bold text-[#25243A]"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-[#25243A]">{activeGoal.title}</span>
            )}
            {activeDay && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-xs tabular-nums">
                  Day {String(activeDay.dayNumber).padStart(2, '0')} ({activeDay.date})
                </span>
              </>
            )}
          </div>
        </div>

        {isOwner ? (
          <Button onClick={openNewTaskEditor} disabled={!activeDay}>
            <Plus className="h-4 w-4" />
            Add Quest
          </Button>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAE7F8] bg-white px-3 py-2 text-xs font-medium text-[#77768C]">
            <Lock className="h-3.5 w-3.5 text-[#7956E8] shrink-0" />
            <span>Official quests set by owner · Your XP is independent</span>
          </div>
        )}
      </div>

      {/* Horizontal Day Selector Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {days.map((day) => {
          const isSelected = activeDay?.id === day.id;
          const isFuture = day.date > todayKey;
          const isRest = activeGoal.restDays.includes(day.date) || day.isRestDay;
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => setSelectedDayId(day.id)}
              className={`min-h-[48px] px-4 py-2 rounded-2xl border text-left transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'sd-gradient-primary border-[#7956E8] text-white shadow-[0_6px_16px_rgba(121,86,232,0.28)]'
                  : 'bg-white border-[#EAE7F8] text-[#25243A] hover:border-[#CFC6F7]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <p className="font-mono text-xs font-bold leading-none">
                  Day {String(day.dayNumber).padStart(2, '0')}
                </p>
                {isRest && <Coffee className={`h-3 w-3 ${isSelected ? 'text-[#FFC857]' : 'text-[#45C4D8]'}`} />}
                {isFuture && !isOwner && <Lock className="h-3 w-3 opacity-70" />}
              </div>
              <p className={`mt-1 text-[11px] leading-none ${isSelected ? 'text-white/85' : 'text-[#77768C]'}`}>
                {day.date.slice(5)}
                {!day.isPublished ? ' · Draft' : isFuture ? ' · Upcoming' : ''}
              </p>
            </button>
          );
        })}

        {isOwner && (
          <button
            type="button"
            onClick={() => setShowAddDayModal(true)}
            className="min-h-[48px] px-3.5 py-2 rounded-2xl border border-dashed border-[#A78BFA] bg-[#F5F1FF] text-xs font-bold text-[#7956E8] hover:bg-[#ECE5FF] transition-colors inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Day
          </button>
        )}
      </div>

      {/* Rest Day or Upcoming Day Banner */}
      {isPlannedRestDay && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#BEEAF2] bg-[#E8F9FC] px-4 py-3 text-xs font-semibold text-[#177080]">
          <Coffee className="h-4 w-4 shrink-0 text-[#45C4D8]" />
          <span>
            Planned Rest Day active — your individual and Duo streaks stay safely frozen today!
          </span>
        </div>
      )}

      {isFutureDay && !isOwner && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#DFD8F8] bg-[#F5F2FF] px-4 py-3 text-xs font-semibold text-[#5E41C4]">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            Scheduled for {activeDay?.date} — preview upcoming quests ahead of time.
          </span>
        </div>
      )}

      {/* Daily Progress Summary Card */}
      {activeDay && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#25243A]">{activeDay.title}</h2>
              <p className="mt-0.5 text-xs text-[#77768C] font-mono tabular-nums">
                {myCompletedCount}/{dayTasks.length} quests cleared · {availableXp} XP pool (+30 XP full-day bonus)
              </p>
            </div>

            {isOwner && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void toggleRestDay(activeGoal.id, activeDay.date)}
                  className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors cursor-pointer ${
                    isPlannedRestDay
                      ? 'bg-[#E5F8FB] border-[#45C4D8] text-[#177080]'
                      : 'bg-white border-[#EAE7F8] text-[#77768C] hover:text-[#25243A]'
                  }`}
                >
                  <Coffee className="h-3.5 w-3.5" />
                  {isPlannedRestDay ? 'Rest Day Active' : 'Mark Rest Day'}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleDayPublished(activeGoal.id, activeDay.id, !activeDay.isPublished)}
                  className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors cursor-pointer ${
                    activeDay.isPublished
                      ? 'bg-[#E6F8F0] text-[#1F8B5D] hover:bg-[#D5F2E5]'
                      : 'bg-[#F1EDFF] text-[#7956E8] hover:bg-[#E4DCFF]'
                  }`}
                >
                  {activeDay.isPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {activeDay.isPublished ? 'Published' : 'Publish Day'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <ProgressBar
              percent={dailyPct}
              color={dailyPct === 100 ? '#38B982' : '#7956E8'}
              height="h-3"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#77768C]">
              <span className="font-bold text-[#25243A] tabular-nums">
                Your daily completion: {dailyPct}%
              </span>
              {partner && (
                <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
                  <Avatar
                    name={partner.displayName}
                    initials={partner.avatarInitials}
                    color={partner.avatarColor}
                    avatarConfig={partner.avatarConfig}
                    seedKey={partner.uid}
                    size="xs"
                  />
                  {partner.displayName.split(' ')[0]}: {partnerCompletedCount}/{publishedCount || dayTasks.length} quests
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Quest Cards List */}
      {dayTasks.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="No quests on this day yet"
          description={
            isOwner
              ? 'StudyDuo never auto-publishes tasks without your approval. Click "Add Quest" to author official learning quests.'
              : 'Your study goal owner has not published quests for this day yet.'
          }
          actionLabel={isOwner ? 'Add First Quest' : undefined}
          onAction={isOwner ? openNewTaskEditor : undefined}
        />
      ) : (
        <div className="space-y-3" data-testid="checklist-tasks">
          {dayTasks.map((task, idx) => {
            const myDone = currentUser
              ? completionSet.has(buildCompletionId(task.id, currentUser.uid))
              : false;
            const partnerDone = partner
              ? completionSet.has(buildCompletionId(task.id, partner.uid))
              : false;
            const isSparkling = justCompletedId === task.id;
            const safeYt = sanitizeExternalUrl(task.youtubeUrl);
            const safeChatgpt = sanitizeExternalUrl(task.chatgptUrl);
            const diff = DIFFICULTY_STYLES[task.priority] ?? DIFFICULTY_STYLES.medium;

            return (
              <motion.article
                key={task.id}
                layout="position"
                className={`relative rounded-2xl border p-4 sm:p-5 transition-all ${
                  myDone
                    ? 'border-[#BFEFD9] bg-[#F5FCF8] shadow-[0_2px_10px_rgba(56,185,130,0.08)]'
                    : 'border-[#EAE7F8] bg-white hover:border-[#CFC6F7] shadow-[0_2px_12px_rgba(121,86,232,0.04)]'
                }`}
              >
                {/* Floating +XP & Sparkle Burst on Quest Completion */}
                <AnimatePresence>
                  {isSparkling && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.85 }}
                      animate={{ opacity: 1, y: -20, scale: 1.05 }}
                      exit={{ opacity: 0, y: -34 }}
                      transition={{ duration: 0.75, ease: 'easeOut' }}
                      className="pointer-events-none absolute right-5 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-[#7956E8] px-3 py-1 text-xs font-extrabold text-white shadow-lg"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#FFC857]" />+{task.xpReward} XP!
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-start gap-3.5">
                  {/* Animated Quest Checkbox */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => void handleCompleteQuest(task)}
                    aria-label={myDone ? `Completed ${task.title}` : `Mark "${task.title}" complete`}
                    aria-pressed={myDone}
                    className={`mt-0.5 min-h-[44px] min-w-[44px] rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      myDone
                        ? 'bg-[#38B982] border-[#38B982] text-white shadow-[0_4px_12px_rgba(56,185,130,0.3)]'
                        : 'bg-[#FAF9FF] border-[#D3CAF6] text-transparent hover:border-[#7956E8] hover:bg-[#F1EDFF]'
                    }`}
                  >
                    <Check className="h-5 w-5 stroke-[2.75]" />
                  </motion.button>

                  {/* Quest Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openTaskDetail(task)}
                        className="text-left group min-w-0 cursor-pointer"
                      >
                        <h3
                          className={`text-base font-bold leading-snug group-hover:text-[#7956E8] transition-colors ${
                            myDone ? 'text-[#5A7569] line-through' : 'text-[#25243A]'
                          }`}
                        >
                          {task.title}
                        </h3>
                      </button>

                      <span
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-extrabold whitespace-nowrap shrink-0 tabular-nums ${
                          myDone
                            ? 'bg-[#E6F8F0] text-[#1F8B5D]'
                            : 'bg-[#FFF6DB] text-[#9A6808]'
                        }`}
                      >
                        <Zap className="h-3 w-3 fill-current" />+{task.xpReward} XP
                      </span>
                    </div>

                    {task.shortDescription && (
                      <p className="mt-1 text-sm text-[#77768C] leading-relaxed">
                        {task.shortDescription}
                      </p>
                    )}

                    {/* Clean Metadata Row */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#77768C]">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5" />
                        {task.estimatedMinutes} min
                      </span>
                      <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${diff.bg} ${diff.text}`}>
                        {diff.label}
                      </span>
                      {!task.isPublished && (
                        <span className="text-[#9A6808] font-bold whitespace-nowrap">
                          Draft (owner only)
                        </span>
                      )}
                      {partner && (
                        <span
                          className={`whitespace-nowrap font-semibold ${
                            partnerDone ? 'text-[#38B982]' : 'text-[#908EA8]'
                          }`}
                        >
                          {partner.displayName.split(' ')[0]}: {partnerDone ? 'Cleared' : 'Pending'}
                        </span>
                      )}
                    </div>

                    {/* Action & Resource Links Row */}
                    <div className="mt-3.5 pt-3 border-t border-[#F1EEFA] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openTaskDetail(task)}
                          className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-[#F8F7FF] border border-[#E5E0F8] px-3 text-xs font-bold text-[#25243A] hover:bg-[#F1EDFF] hover:text-[#7956E8] transition-colors cursor-pointer"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Brief & Notes
                        </button>

                        {safeYt && (
                          <a
                            href={safeYt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#EAE7F8] px-3 text-xs font-bold text-[#25243A] hover:border-[#E66F77]/60 transition-colors"
                          >
                            <Youtube className="h-3.5 w-3.5 text-[#E66F77]" />
                            YouTube
                          </a>
                        )}

                        {safeChatgpt && (
                          <a
                            href={safeChatgpt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#EAE7F8] px-3 text-xs font-bold text-[#25243A] hover:border-[#38B982]/60 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-[#38B982]" />
                            ChatGPT
                          </a>
                        )}
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => void reorderTask(activeGoal.id, task.dayId, task.id, 'up')}
                            aria-label={`Move "${task.title}" up`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#77768C] hover:bg-[#F3F0FF] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === dayTasks.length - 1}
                            onClick={() => void reorderTask(activeGoal.id, task.dayId, task.id, 'down')}
                            aria-label={`Move "${task.title}" down`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#77768C] hover:bg-[#F3F0FF] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditTaskEditor(task)}
                            aria-label={`Edit "${task.title}"`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#77768C] hover:bg-[#F3F0FF] cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void duplicateTask(activeGoal.id, task)}
                            aria-label={`Duplicate "${task.title}"`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#77768C] hover:bg-[#F3F0FF] cursor-pointer"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void archiveTask(activeGoal.id, task)}
                            aria-label={`Archive "${task.title}"`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#77768C] hover:bg-[#F3F0FF] cursor-pointer"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskToDelete(task)}
                            aria-label={`Delete "${task.title}"`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#E66F77] hover:bg-[#FFF0F1] cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Quest Detail Sheet */}
      <ModalSheet
        open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        title={detailTask?.title || 'Quest Details'}
        subtitle={
          detailTask
            ? `Day ${String(detailTask.dayNumber).padStart(2, '0')} · ${detailTask.estimatedMinutes} min · +${detailTask.xpReward} XP`
            : undefined
        }
        size="lg"
      >
        {detailTask && (
          <div className="space-y-5">
            {detailTask.detailedInstructions && (
              <div>
                <h3 className="text-xs font-bold text-[#77768C] mb-1.5">Instructions</h3>
                <p className="text-sm text-[#25243A] leading-relaxed whitespace-pre-line">
                  {detailTask.detailedInstructions}
                </p>
              </div>
            )}

            {detailTask.learningNotes && (
              <div className="rounded-2xl bg-[#F8F7FF] border border-[#EAE7F8] p-4">
                <h3 className="text-xs font-bold text-[#7956E8] mb-1.5">Official Learning Notes</h3>
                <p className="text-sm text-[#25243A] leading-relaxed whitespace-pre-line">
                  {detailTask.learningNotes}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-[#77768C] mb-2">Study Resources</h3>
              <div className="space-y-2">
                {sanitizeExternalUrl(detailTask.youtubeUrl) && (
                  <a
                    href={sanitizeExternalUrl(detailTask.youtubeUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] flex items-center justify-between gap-3 rounded-xl border border-[#EAE7F8] bg-white px-4 py-2.5 text-sm font-semibold text-[#25243A] hover:bg-[#F8F7FF]"
                  >
                    <span className="flex items-center gap-2.5">
                      <Youtube className="h-4 w-4 text-[#E66F77]" />
                      YouTube Lesson Video
                    </span>
                    <ExternalLink className="h-4 w-4 text-[#88899B]" />
                  </a>
                )}
                {sanitizeExternalUrl(detailTask.chatgptUrl) && (
                  <a
                    href={sanitizeExternalUrl(detailTask.chatgptUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] flex items-center justify-between gap-3 rounded-xl border border-[#EAE7F8] bg-white px-4 py-2.5 text-sm font-semibold text-[#25243A] hover:bg-[#F8F7FF]"
                  >
                    <span className="flex items-center gap-2.5">
                      <MessageSquare className="h-4 w-4 text-[#38B982]" />
                      ChatGPT Study Thread
                    </span>
                    <ExternalLink className="h-4 w-4 text-[#88899B]" />
                  </a>
                )}
                {detailTask.resourceLinks.map((link, i) => {
                  const safe = sanitizeExternalUrl(link.url);
                  if (!safe) return null;
                  return (
                    <a
                      key={i}
                      href={safe}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] flex items-center justify-between gap-3 rounded-xl border border-[#EAE7F8] bg-white px-4 py-2.5 text-sm font-semibold text-[#25243A] hover:bg-[#F8F7FF]"
                    >
                      <span className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-[#7956E8]" />
                        {link.label}
                      </span>
                      <ExternalLink className="h-4 w-4 text-[#88899B]" />
                    </a>
                  );
                })}
                {!sanitizeExternalUrl(detailTask.youtubeUrl) &&
                  !sanitizeExternalUrl(detailTask.chatgptUrl) &&
                  detailTask.resourceLinks.length === 0 && (
                    <p className="text-sm text-[#77768C]">No external links attached to this quest.</p>
                  )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F1EEFA]">
              <label htmlFor="personal-task-note" className="block text-xs font-bold text-[#25243A] mb-1.5">
                My Private Study Notes (visible only to you)
              </label>
              <textarea
                id="personal-task-note"
                rows={3}
                value={personalNoteDraft}
                onChange={(e) => setPersonalNoteDraft(e.target.value)}
                placeholder="Write your own takeaways, code snippets, or follow-up questions..."
                className="w-full rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] p-3 text-sm text-[#25243A] focus:bg-white focus:border-[#7956E8] focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                <Button
                  variant="secondary"
                  onClick={() => void savePersonalNote(activeGoal.id, detailTask.id, personalNoteDraft)}
                >
                  Save Private Note
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    void handleCompleteQuest(detailTask);
                    setDetailTask(null);
                  }}
                >
                  {currentUser && completionSet.has(buildCompletionId(detailTask.id, currentUser.uid))
                    ? 'Quest Cleared'
                    : `Complete Quest (+${detailTask.xpReward} XP)`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </ModalSheet>

      {/* Owner Quest Editor Modal */}
      <ModalSheet
        open={showTaskEditor}
        onClose={() => setShowTaskEditor(false)}
        title={editingTask ? 'Edit Official Quest' : 'Add Quest to Checklist'}
        subtitle={activeDay ? `Day ${String(activeDay.dayNumber).padStart(2, '0')} · ${activeDay.date}` : undefined}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Quest title
            </label>
            <input
              id="task-title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="Learn Python Variables"
              className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-short" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Short description
            </label>
            <input
              id="task-short"
              value={taskForm.shortDescription}
              onChange={(e) => setTaskForm({ ...taskForm, shortDescription: e.target.value })}
              placeholder="Practice snake_case naming and dynamic variable assignment"
              className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-instructions" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Detailed instructions
            </label>
            <textarea
              id="task-instructions"
              rows={2}
              value={taskForm.detailedInstructions}
              onChange={(e) => setTaskForm({ ...taskForm, detailedInstructions: e.target.value })}
              className="w-full rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] p-3 text-sm text-[#25243A] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-notes" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Official learning notes
            </label>
            <textarea
              id="task-notes"
              rows={2}
              value={taskForm.learningNotes}
              onChange={(e) => setTaskForm({ ...taskForm, learningNotes: e.target.value })}
              className="w-full rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] p-3 text-sm text-[#25243A] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-yt" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                YouTube URL (optional)
              </label>
              <input
                id="task-yt"
                type="url"
                value={taskForm.youtubeUrl}
                onChange={(e) => setTaskForm({ ...taskForm, youtubeUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A]"
              />
            </div>
            <div>
              <label htmlFor="task-gpt" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                ChatGPT Conversation URL (optional)
              </label>
              <input
                id="task-gpt"
                type="url"
                value={taskForm.chatgptUrl}
                onChange={(e) => setTaskForm({ ...taskForm, chatgptUrl: e.target.value })}
                placeholder="https://chatgpt.com/share/..."
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-res-label" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Extra resource label
              </label>
              <input
                id="task-res-label"
                value={taskForm.extraResourceLabel}
                onChange={(e) => setTaskForm({ ...taskForm, extraResourceLabel: e.target.value })}
                placeholder="Official Python Docs"
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A]"
              />
            </div>
            <div>
              <label htmlFor="task-res-url" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Extra resource URL
              </label>
              <input
                id="task-res-url"
                type="url"
                value={taskForm.extraResourceUrl}
                onChange={(e) => setTaskForm({ ...taskForm, extraResourceUrl: e.target.value })}
                placeholder="https://docs.python.org/3/"
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="task-min" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Est. min
              </label>
              <input
                id="task-min"
                type="number"
                min={5}
                max={360}
                value={taskForm.estimatedMinutes}
                onChange={(e) => setTaskForm({ ...taskForm, estimatedMinutes: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm font-mono text-[#25243A]"
              />
            </div>
            <div>
              <label htmlFor="task-xp" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                XP reward
              </label>
              <input
                id="task-xp"
                type="number"
                min={5}
                max={200}
                value={taskForm.xpReward}
                onChange={(e) => setTaskForm({ ...taskForm, xpReward: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3 text-sm font-mono text-[#25243A]"
              />
            </div>
            <div>
              <label htmlFor="task-priority" className="block text-xs font-semibold text-[#25243A] mb-1.5">
                Difficulty
              </label>
              <select
                id="task-priority"
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-2.5 text-sm text-[#25243A]"
              >
                <option value="low">Easy</option>
                <option value="medium">Medium</option>
                <option value="high">Hard</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {XP_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setTaskForm({ ...taskForm, xpReward: preset.value })}
                className={`min-h-[36px] rounded-xl px-3 text-xs font-bold border transition-colors cursor-pointer ${
                  taskForm.xpReward === preset.value
                    ? 'bg-[#F1EDFF] border-[#7956E8] text-[#7956E8]'
                    : 'bg-white border-[#EAE7F8] text-[#77768C]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {taskFormError && <p role="alert" className="text-xs font-semibold text-[#E66F77]">{taskFormError}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
            <Button variant="secondary" onClick={() => void handleSaveTask(false)}>
              Save Draft
            </Button>
            <Button onClick={() => void handleSaveTask(true)}>Publish Quest</Button>
          </div>
        </div>
      </ModalSheet>

      {/* Add Study Day Modal */}
      <ModalSheet
        open={showAddDayModal}
        onClose={() => setShowAddDayModal(false)}
        title={`Add Day ${String(days.length + 1).padStart(2, '0')}`}
        subtitle="Create a new study day container, then add your official quests manually."
      >
        <form onSubmit={handleAddDay} className="space-y-4">
          <div>
            <label htmlFor="new-day-title" className="block text-xs font-semibold text-[#25243A] mb-1.5">
              Day theme / focus title
            </label>
            <input
              id="new-day-title"
              value={newDayTitle}
              onChange={(e) => setNewDayTitle(e.target.value)}
              placeholder="Functions, Scope & Error Handling"
              required
              className="w-full min-h-[44px] rounded-xl border border-[#EAE7F8] bg-[#F8F7FF] px-3.5 text-sm text-[#25243A]"
            />
          </div>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" type="button" onClick={() => setShowAddDayModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Day</Button>
          </div>
        </form>
      </ModalSheet>

      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title="Delete official quest?"
        description={`Delete "${taskToDelete?.title}" from this checklist? Historical XP earned by participants will remain preserved in the XP ledger.`}
        confirmLabel="Delete Quest"
        onCancel={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (activeGoal && taskToDelete) {
            void deleteTask(activeGoal.id, taskToDelete.dayId, taskToDelete.id);
          }
          setTaskToDelete(null);
        }}
      />
    </div>
  );
};
