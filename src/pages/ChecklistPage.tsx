import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
  CheckSquare,
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
  Trash2,
  Youtube,
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
import { Avatar, ConfirmDialog, EmptyState, ModalSheet } from '../components/ui/Primitives';

const XP_PRESETS = [
  { label: 'Small (10 XP)', value: DEFAULT_XP_PRESETS.small },
  { label: 'Normal (20 XP)', value: DEFAULT_XP_PRESETS.normal },
  { label: 'Difficult (40 XP)', value: DEFAULT_XP_PRESETS.difficult },
  { label: 'Major (60 XP)', value: DEFAULT_XP_PRESETS.major },
];

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

  // Pick today's day or latest available day automatically
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
  const isPlannedRestDay = Boolean(activeGoal && activeDay && activeGoal.restDays.includes(activeDay.date));

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
      newDayTitle || `Day ${String(nextDayNum).padStart(2, '0')} Learning`,
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
        title="No active goal selected"
        description="Create a study goal or accept an invitation code to open your daily checklist."
        actionLabel="Go to My Goals"
        onAction={() => setActivePage('goals')}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#242337]">
            Today’s Learning
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#66687A]">
            {goals.length > 1 ? (
              <select
                aria-label="Select active goal"
                value={activeGoal.id}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="rounded-lg border border-[#E9EAF0] bg-white px-2.5 py-1 text-sm font-semibold text-[#242337]"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-medium text-[#242337]">{activeGoal.title}</span>
            )}
            {activeDay && (
              <>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="font-mono text-xs whitespace-nowrap">
                  Day {String(activeDay.dayNumber).padStart(2, '0')} ({activeDay.date})
                </span>
              </>
            )}
          </div>
        </div>

        {isOwner ? (
          <button
            type="button"
            onClick={openNewTaskEditor}
            disabled={!activeDay}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#7956D8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#66687A]">
            <Lock className="h-3.5 w-3.5 text-[#7956D8]" />
            Official tasks managed by owner · Your progress is independent
          </div>
        )}
      </div>

      {/* Horizontal Day Selector Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {days.map((day) => {
          const isSelected = activeDay?.id === day.id;
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => setSelectedDayId(day.id)}
              className={`min-h-[44px] px-4 py-2 rounded-xl border text-left transition-colors shrink-0 ${
                isSelected
                  ? 'bg-[#7956D8] border-[#7956D8] text-white'
                  : 'bg-white border-[#E9EAF0] text-[#242337] hover:border-[#7956D8]/40'
              }`}
            >
              <p className="font-mono text-xs font-bold leading-none">
                Day {String(day.dayNumber).padStart(2, '0')}
              </p>
              <p className={`mt-1 text-[11px] leading-none ${isSelected ? 'text-white/85' : 'text-[#66687A]'}`}>
                {day.date.slice(5)}
                {!day.isPublished ? ' · Draft' : ''}
              </p>
            </button>
          );
        })}

        {isOwner && (
          <button
            type="button"
            onClick={() => setShowAddDayModal(true)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-dashed border-[#7956D8]/50 bg-[#F0EBFF]/40 text-xs font-semibold text-[#7956D8] hover:bg-[#F0EBFF] transition-colors inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Day
          </button>
        )}
      </div>

      {/* Daily Progress & Partner Comparison Summary */}
      {activeDay && (
        <section className="rounded-2xl bg-white border border-[#E9EAF0] p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#242337]">{activeDay.title}</h2>
              <p className="mt-0.5 text-xs text-[#66687A] font-mono tabular-nums">
                {myCompletedCount}/{dayTasks.length} completed · {availableXp} XP available (+30 XP full-day bonus)
              </p>
            </div>

            {isOwner && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void toggleRestDay(activeGoal.id, activeDay.date)}
                  className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                    isPlannedRestDay
                      ? 'bg-[#FFF6E5] border-[#F3BD59] text-[#9A6A0A]'
                      : 'bg-white border-[#E9EAF0] text-[#66687A] hover:text-[#242337]'
                  }`}
                >
                  <Coffee className="h-3.5 w-3.5" />
                  {isPlannedRestDay ? 'Planned Rest Day' : 'Mark Rest Day'}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleDayPublished(activeGoal.id, activeDay.id, !activeDay.isPublished)}
                  className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
                    activeDay.isPublished
                      ? 'bg-[#E7F6EE] text-[#287D59] hover:bg-[#D5EFE1]'
                      : 'bg-[#F0EBFF] text-[#7956D8] hover:bg-[#E4DAFF]'
                  }`}
                >
                  {activeDay.isPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {activeDay.isPublished ? 'Published' : 'Publish Checklist'}
                </button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-2.5 w-full rounded-full bg-[#F0EBFF] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#7956D8] transition-all duration-300"
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            {partner && (
              <div className="flex items-center justify-between text-xs text-[#66687A]">
                <span className="font-mono tabular-nums">Your progress: {dailyPct}%</span>
                <span className="flex items-center gap-1.5 font-mono tabular-nums">
                  <Avatar
                    name={partner.displayName}
                    initials={partner.avatarInitials}
                    color={partner.avatarColor}
                    size="xs"
                  />
                  {partner.displayName.split(' ')[0]}: {partnerCompletedCount}/{publishedCount || dayTasks.length} tasks
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Checklist Task Cards */}
      {dayTasks.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="No tasks on this day yet"
          description={
            isOwner
              ? 'StudyDuo never auto-publishes tasks without your approval. Click "Add Task" to author today’s official learning items.'
              : 'Your study goal owner has not published tasks for this day yet.'
          }
          actionLabel={isOwner ? 'Add First Task' : undefined}
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
            const safeYt = sanitizeExternalUrl(task.youtubeUrl);
            const safeChatgpt = sanitizeExternalUrl(task.chatgptUrl);

            return (
              <article
                key={task.id}
                className={`rounded-2xl bg-white border p-4 sm:p-5 transition-colors ${
                  myDone ? 'border-[#38A879]/40 bg-[#E7F6EE]/20' : 'border-[#E9EAF0]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Large 44px Touch Target Completion Button */}
                  <button
                    type="button"
                    onClick={() => void completeTask(activeGoal.id, task)}
                    aria-label={myDone ? `Completed ${task.title}` : `Mark "${task.title}" complete`}
                    aria-pressed={myDone}
                    className={`mt-0.5 min-h-[44px] min-w-[44px] rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 ${
                      myDone
                        ? 'bg-[#38A879] border-[#38A879] text-white'
                        : 'bg-white border-[#D6D8E4] text-transparent hover:border-[#7956D8]'
                    }`}
                  >
                    <Check className="h-5 w-5 stroke-[2.75]" />
                  </button>

                  {/* Task Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openTaskDetail(task)}
                        className="text-left group min-w-0"
                      >
                        <h3
                          className={`text-base font-bold leading-snug group-hover:text-[#7956D8] transition-colors ${
                            myDone ? 'text-[#66687A] line-through' : 'text-[#242337]'
                          }`}
                        >
                          {task.title}
                        </h3>
                      </button>

                      <span className="font-mono text-xs font-bold text-[#7956D8] whitespace-nowrap shrink-0 pt-0.5 tabular-nums">
                        +{task.xpReward} XP
                      </span>
                    </div>

                    {task.shortDescription && (
                      <p className="mt-1 text-sm text-[#66687A] leading-relaxed">
                        {task.shortDescription}
                      </p>
                    )}

                    {/* Clean Unboxed Metadata Line (Zero Pill Clutter) */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#66687A]">
                      <span className="font-mono tabular-nums whitespace-nowrap">{task.estimatedMinutes} min</span>
                      <span
                        className={`capitalize font-medium whitespace-nowrap ${
                          task.priority === 'high'
                            ? 'text-[#D0545D]'
                            : task.priority === 'medium'
                            ? 'text-[#9A6A0A]'
                            : 'text-[#66687A]'
                        }`}
                      >
                        {task.priority} priority
                      </span>
                      {!task.isPublished && (
                        <span className="text-[#9A6A0A] font-semibold whitespace-nowrap">Draft (owner only)</span>
                      )}
                      {partner && (
                        <span className={`whitespace-nowrap ${partnerDone ? 'text-[#38A879] font-medium' : 'text-[#88899B]'}`}>
                          {partner.displayName.split(' ')[0]}: {partnerDone ? 'Completed' : 'Pending'}
                        </span>
                      )}
                    </div>

                    {/* Action & Resource Row */}
                    <div className="mt-3.5 pt-3 border-t border-[#E9EAF0] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openTaskDetail(task)}
                          className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-[#F8F9FC] border border-[#E9EAF0] px-3 text-xs font-semibold text-[#242337] hover:bg-[#F0EBFF] hover:text-[#7956D8] transition-colors"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Notes & Details
                        </button>

                        {safeYt && (
                          <a
                            href={safeYt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-[#F8F9FC] border border-[#E9EAF0] px-3 text-xs font-semibold text-[#242337] hover:border-[#E66F77]/50 transition-colors"
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
                            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-[#F8F9FC] border border-[#E9EAF0] px-3 text-xs font-semibold text-[#242337] hover:border-[#38A879]/50 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-[#38A879]" />
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
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#66687A] hover:bg-[#F8F9FC] disabled:opacity-30"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === dayTasks.length - 1}
                            onClick={() => void reorderTask(activeGoal.id, task.dayId, task.id, 'down')}
                            aria-label={`Move "${task.title}" down`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#66687A] hover:bg-[#F8F9FC] disabled:opacity-30"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditTaskEditor(task)}
                            aria-label={`Edit "${task.title}"`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#66687A] hover:bg-[#F8F9FC]"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void duplicateTask(activeGoal.id, task)}
                            aria-label={`Duplicate "${task.title}"`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#66687A] hover:bg-[#F8F9FC]"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void archiveTask(activeGoal.id, task)}
                            aria-label={`Archive "${task.title}"`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#66687A] hover:bg-[#F8F9FC]"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskToDelete(task)}
                            aria-label={`Delete "${task.title}"`}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#E66F77] hover:bg-[#FEECEE]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Task Detail Sheet (With Resources & Private Personal Notes) */}
      <ModalSheet
        open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        title={detailTask?.title || 'Task Details'}
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
                <h3 className="text-xs font-bold text-[#66687A] mb-1.5">Instructions</h3>
                <p className="text-sm text-[#242337] leading-relaxed whitespace-pre-line">
                  {detailTask.detailedInstructions}
                </p>
              </div>
            )}

            {detailTask.learningNotes && (
              <div className="rounded-2xl bg-[#F8F9FC] border border-[#E9EAF0] p-4">
                <h3 className="text-xs font-bold text-[#7956D8] mb-1.5">Official Learning Notes</h3>
                <p className="text-sm text-[#242337] leading-relaxed whitespace-pre-line">
                  {detailTask.learningNotes}
                </p>
              </div>
            )}

            {/* Learning Resources */}
            <div>
              <h3 className="text-xs font-bold text-[#66687A] mb-2">Study Resources</h3>
              <div className="space-y-2">
                {sanitizeExternalUrl(detailTask.youtubeUrl) && (
                  <a
                    href={sanitizeExternalUrl(detailTask.youtubeUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] flex items-center justify-between gap-3 rounded-xl border border-[#E9EAF0] bg-white px-4 py-2.5 text-sm font-medium text-[#242337] hover:bg-[#F8F9FC]"
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
                    className="min-h-[44px] flex items-center justify-between gap-3 rounded-xl border border-[#E9EAF0] bg-white px-4 py-2.5 text-sm font-medium text-[#242337] hover:bg-[#F8F9FC]"
                  >
                    <span className="flex items-center gap-2.5">
                      <MessageSquare className="h-4 w-4 text-[#38A879]" />
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
                      className="min-h-[44px] flex items-center justify-between gap-3 rounded-xl border border-[#E9EAF0] bg-white px-4 py-2.5 text-sm font-medium text-[#242337] hover:bg-[#F8F9FC]"
                    >
                      <span className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-[#7956D8]" />
                        {link.label}
                      </span>
                      <ExternalLink className="h-4 w-4 text-[#88899B]" />
                    </a>
                  );
                })}
                {!sanitizeExternalUrl(detailTask.youtubeUrl) &&
                  !sanitizeExternalUrl(detailTask.chatgptUrl) &&
                  detailTask.resourceLinks.length === 0 && (
                    <p className="text-sm text-[#88899B]">No external links attached to this task.</p>
                  )}
              </div>
            </div>

            {/* Private Personal Notes (Accessible to Both Owner & Collaborator Independently) */}
            <div className="pt-3 border-t border-[#E9EAF0]">
              <label htmlFor="personal-task-note" className="block text-xs font-bold text-[#242337] mb-1.5">
                My Private Study Notes (visible only to you)
              </label>
              <textarea
                id="personal-task-note"
                rows={3}
                value={personalNoteDraft}
                onChange={(e) => setPersonalNoteDraft(e.target.value)}
                placeholder="Write your own takeaways, code snippets, or follow-up questions..."
                className="w-full rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] p-3 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => void savePersonalNote(activeGoal.id, detailTask.id, personalNoteDraft)}
                  className="min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-4 text-sm font-semibold text-[#242337] hover:bg-[#F8F9FC]"
                >
                  Save Private Note
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void completeTask(activeGoal.id, detailTask);
                    setDetailTask(null);
                  }}
                  className="min-h-[44px] rounded-xl bg-[#38A879] px-5 text-sm font-semibold text-white hover:bg-[#2F9268]"
                >
                  {currentUser && completionSet.has(buildCompletionId(detailTask.id, currentUser.uid))
                    ? 'Completed'
                    : `Complete Task (+${detailTask.xpReward} XP)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalSheet>

      {/* Owner Task Editor Modal */}
      <ModalSheet
        open={showTaskEditor}
        onClose={() => setShowTaskEditor(false)}
        title={editingTask ? 'Edit Official Task' : 'Add Task to Checklist'}
        subtitle={activeDay ? `Day ${String(activeDay.dayNumber).padStart(2, '0')} · ${activeDay.date}` : undefined}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Task title
            </label>
            <input
              id="task-title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="Learn Python Variables"
              className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-short" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Short description
            </label>
            <input
              id="task-short"
              value={taskForm.shortDescription}
              onChange={(e) => setTaskForm({ ...taskForm, shortDescription: e.target.value })}
              placeholder="Practice snake_case naming and dynamic variable assignment"
              className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-instructions" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Detailed instructions
            </label>
            <textarea
              id="task-instructions"
              rows={2}
              value={taskForm.detailedInstructions}
              onChange={(e) => setTaskForm({ ...taskForm, detailedInstructions: e.target.value })}
              className="w-full rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] p-3 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-notes" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Official learning notes
            </label>
            <textarea
              id="task-notes"
              rows={2}
              value={taskForm.learningNotes}
              onChange={(e) => setTaskForm({ ...taskForm, learningNotes: e.target.value })}
              className="w-full rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] p-3 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-yt" className="block text-xs font-semibold text-[#242337] mb-1.5">
                YouTube URL (optional)
              </label>
              <input
                id="task-yt"
                type="url"
                value={taskForm.youtubeUrl}
                onChange={(e) => setTaskForm({ ...taskForm, youtubeUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337]"
              />
            </div>
            <div>
              <label htmlFor="task-gpt" className="block text-xs font-semibold text-[#242337] mb-1.5">
                ChatGPT Conversation URL (optional)
              </label>
              <input
                id="task-gpt"
                type="url"
                value={taskForm.chatgptUrl}
                onChange={(e) => setTaskForm({ ...taskForm, chatgptUrl: e.target.value })}
                placeholder="https://chatgpt.com/share/..."
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-res-label" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Extra resource label
              </label>
              <input
                id="task-res-label"
                value={taskForm.extraResourceLabel}
                onChange={(e) => setTaskForm({ ...taskForm, extraResourceLabel: e.target.value })}
                placeholder="Official Python Docs"
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337]"
              />
            </div>
            <div>
              <label htmlFor="task-res-url" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Extra resource URL
              </label>
              <input
                id="task-res-url"
                type="url"
                value={taskForm.extraResourceUrl}
                onChange={(e) => setTaskForm({ ...taskForm, extraResourceUrl: e.target.value })}
                placeholder="https://docs.python.org/3/"
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="task-min" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Est. minutes
              </label>
              <input
                id="task-min"
                type="number"
                min={5}
                max={360}
                value={taskForm.estimatedMinutes}
                onChange={(e) => setTaskForm({ ...taskForm, estimatedMinutes: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 text-sm font-mono text-[#242337]"
              />
            </div>
            <div>
              <label htmlFor="task-xp" className="block text-xs font-semibold text-[#242337] mb-1.5">
                XP reward
              </label>
              <input
                id="task-xp"
                type="number"
                min={5}
                max={200}
                value={taskForm.xpReward}
                onChange={(e) => setTaskForm({ ...taskForm, xpReward: Number(e.target.value) })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 text-sm font-mono text-[#242337]"
              />
            </div>
            <div>
              <label htmlFor="task-priority" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Priority
              </label>
              <select
                id="task-priority"
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-2.5 text-sm text-[#242337]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* XP Quick Presets */}
          <div className="flex flex-wrap gap-2">
            {XP_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setTaskForm({ ...taskForm, xpReward: preset.value })}
                className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold border transition-colors ${
                  taskForm.xpReward === preset.value
                    ? 'bg-[#F0EBFF] border-[#7956D8] text-[#7956D8]'
                    : 'bg-white border-[#E9EAF0] text-[#66687A]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {taskFormError && <p role="alert" className="text-xs font-medium text-[#E66F77]">{taskFormError}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => void handleSaveTask(false)}
              className="min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-4 text-sm font-semibold text-[#242337] hover:bg-[#F8F9FC]"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => void handleSaveTask(true)}
              className="min-h-[44px] rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7]"
            >
              Publish Task
            </button>
          </div>
        </div>
      </ModalSheet>

      {/* Add Study Day Modal */}
      <ModalSheet
        open={showAddDayModal}
        onClose={() => setShowAddDayModal(false)}
        title={`Add Day ${String(days.length + 1).padStart(2, '0')}`}
        subtitle="Create a new study day container, then add your official tasks manually."
      >
        <form onSubmit={handleAddDay} className="space-y-4">
          <div>
            <label htmlFor="new-day-title" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Day theme / focus title
            </label>
            <input
              id="new-day-title"
              value={newDayTitle}
              onChange={(e) => setNewDayTitle(e.target.value)}
              placeholder="Functions, Scope & Error Handling"
              required
              className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337]"
            />
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddDayModal(false)}
              className="min-h-[44px] rounded-xl border border-[#E9EAF0] px-4 text-sm font-medium text-[#242337]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#7956D8] px-5 text-sm font-semibold text-white hover:bg-[#6643C7]"
            >
              Create Day
            </button>
          </div>
        </form>
      </ModalSheet>

      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title="Delete official task?"
        description={`Delete "${taskToDelete?.title}" from this checklist? Historical XP earned by participants will remain preserved in the XP ledger.`}
        confirmLabel="Delete Task"
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
