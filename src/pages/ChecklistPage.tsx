import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
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
  Star,
  Trash2,
  Youtube,
} from 'lucide-react';
import {
  buildQuestSpecificRoadmap,
  getRecommendedChannelsForTopic,
} from '../lib/channelRecommendations';
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
import { getSubjectTheme, MascotImage, SubjectCardMotif } from '../components/ui/MascotArtwork';

const XP_PRESETS = [
  { label: 'Small (10 XP)', value: DEFAULT_XP_PRESETS.small },
  { label: 'Normal (20 XP)', value: DEFAULT_XP_PRESETS.normal },
  { label: 'Difficult (40 XP)', value: DEFAULT_XP_PRESETS.difficult },
  { label: 'Major (60 XP)', value: DEFAULT_XP_PRESETS.major },
];

const COMPLETION_MESSAGES = [
  'Nice work! 🎉',
  'One step closer! 🚀',
  "You're building a streak! 🔥",
];

function getTaskEmoji(title: string, priority: TaskPriority): string {
  const lower = title.toLowerCase();
  if (lower.includes('loop') || lower.includes('while') || lower.includes('for')) return '🔁';
  if (lower.includes('string') || lower.includes('text') || lower.includes('write')) return '📝';
  if (lower.includes('challenge') || lower.includes('project') || lower.includes('cli') || lower.includes('build')) return '🚀';
  if (lower.includes('python') || lower.includes('code') || lower.includes('function') || lower.includes('api')) return '💻';
  if (lower.includes('quiz') || lower.includes('test') || lower.includes('practice')) return '🎯';
  if (lower.includes('data') || lower.includes('list') || lower.includes('dict')) return '📊';
  if (priority === 'high') return '⚡';
  if (priority === 'low') return '🌱';
  return '📘';
}

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
    updateStudyDay,
    deleteStudyDay,
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
  const [showRenameDayModal, setShowRenameDayModal] = useState(false);
  const [renameDayInput, setRenameDayInput] = useState('');
  const [showDeleteDayConfirm, setShowDeleteDayConfirm] = useState(false);
  const [justCompleted, setJustCompleted] = useState<{ id: string; xp: number; message: string } | null>(null);

  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [personalNoteDraft, setPersonalNoteDraft] = useState('');

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

  const handleCompleteQuest = async (task: Task, index = 0) => {
    if (!activeGoal || !currentUser) return;
    if (completionSet.has(buildCompletionId(task.id, currentUser.uid))) return;
    const message = COMPLETION_MESSAGES[index % COMPLETION_MESSAGES.length];
    setJustCompleted({ id: task.id, xp: task.xpReward, message });
    await completeTask(activeGoal.id, task);
    setTimeout(() => {
      setJustCompleted((prev) => (prev?.id === task.id ? null : prev));
    }, 1800);
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

  const openRenameDayModal = () => {
    if (!activeDay) return;
    setRenameDayInput(activeDay.title);
    setShowRenameDayModal(true);
  };

  const handleRenameDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal || !activeDay || !renameDayInput.trim()) return;
    await updateStudyDay(activeGoal.id, activeDay.id, renameDayInput.trim());
    setShowRenameDayModal(false);
  };

  if (!activeGoal) {
    return (
      <EmptyState
        mascot="coding"
        title="No active checklist yet"
        description="Create a learning goal or join with a partner invite code to open your Quest Center."
        actionLabel="Go to Roadmap"
        onAction={() => setActivePage('goals')}
      />
    );
  }

  const subjectTheme = getSubjectTheme(activeGoal.category, 0);

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#20202A]">Quest Center</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#777783]">
            {goals.length > 1 ? (
              <select
                aria-label="Select active goal"
                value={activeGoal.id}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="rounded-full border border-[#F0EDF5] bg-white px-3 py-1 text-xs font-bold text-[#20202A]"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-[#20202A]">{activeGoal.title}</span>
            )}
            {activeDay && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  Day {activeDay.dayNumber} ({activeDay.date})
                </span>
              </>
            )}
          </div>
        </div>

        {isOwner ? (
          <Button size="sm" onClick={openNewTaskEditor} disabled={!activeDay}>
            <Plus className="h-4 w-4" />
            Add Quest
          </Button>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#F0EDF5] px-3.5 py-1.5 text-xs font-semibold text-[#777783]">
            <Lock className="h-3.5 w-3.5 text-[#7651E8] shrink-0" />
            <span>Official quests set by owner · Independent XP</span>
          </div>
        )}
      </div>

      {/* Rounded Day Selector Pills */}
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
              className={`min-h-[46px] px-4 py-2 rounded-2xl border text-left transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#7651E8] border-[#7651E8] text-white shadow-[0_8px_18px_-10px_rgba(118,81,232,0.7)]'
                  : 'bg-white border-[#F0EDF5] text-[#20202A] hover:border-[#D8C8FA]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold leading-none tabular-nums">
                  Day {day.dayNumber}
                </span>
                {isRest && <Coffee className="h-3 w-3 opacity-85" />}
                {isFuture && !isOwner && <Lock className="h-3 w-3 opacity-75" />}
              </div>
              <p className={`mt-1 text-[11px] leading-none tabular-nums ${isSelected ? 'text-white/85' : 'text-[#777783]'}`}>
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
            className="min-h-[46px] px-4 py-2 rounded-2xl border-2 border-dashed border-[#CBB8FA] bg-white text-xs font-extrabold text-[#7651E8] hover:bg-[#E9DFFF]/50 transition-colors inline-flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Day
          </button>
        )}
      </div>

      {isPlannedRestDay && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#FFF0C9] px-4 py-3 text-xs font-bold text-[#8A5A00]">
          <span aria-hidden="true">☕</span>
          <span>Planned rest day — your individual and duo streaks stay safely protected today.</span>
        </div>
      )}

      {isFutureDay && !isOwner && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#E9DFFF]/70 px-4 py-3 text-xs font-semibold text-[#5C44A8]">
          <Lock className="h-3.5 w-3.5 text-[#7651E8] shrink-0" />
          <span>Scheduled for {activeDay?.date} — preview upcoming quests ahead of time.</span>
        </div>
      )}

      {/* Pastel Subject Daily Progress Banner */}
      {activeDay && (
        <div
          style={{ backgroundColor: subjectTheme.cardBg }}
          className="rounded-[28px] p-5 sm:p-6 space-y-4 relative overflow-hidden"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <MascotImage
                mascot={subjectTheme.mascot}
                className="h-18 w-18 sm:h-20 sm:w-20 shrink-0"
                rounded="rounded-[20px]"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    style={{ color: subjectTheme.statusText }}
                    className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold"
                  >
                    {dailyPct === 100 && dayTasks.length > 0
                      ? 'Completed'
                      : isFutureDay
                      ? 'Upcoming'
                      : 'In Progress'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#20202A] tabular-nums">
                    <Star className="h-3 w-3 fill-[#FFC857] text-[#FFC857]" />
                    {availableXp} XP Pool
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-lg sm:text-xl font-black text-[#20202A] truncate">
                  {activeDay.title}
                </h2>
                <p className="text-xs font-semibold text-[#5C5C6C] tabular-nums">
                  {myCompletedCount}/{dayTasks.length} quests completed · +30 XP daily bonus
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap z-10">
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={openRenameDayModal}
                    aria-label="Rename Study Day"
                    className="min-h-[36px] inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-bold text-[#7651E8] hover:bg-[#F8F5FF] transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Rename Day
                  </button>
                  {days.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteDayConfirm(true)}
                      aria-label="Delete Study Day"
                      className="min-h-[36px] inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-bold text-[#C82D4F] hover:bg-[#FFF0F3] transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Day
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void toggleRestDay(activeGoal.id, activeDay.date)}
                    className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                      isPlannedRestDay
                        ? 'bg-[#7651E8] text-white'
                        : 'bg-white text-[#20202A] hover:bg-[#F8F5FF]'
                    }`}
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    {isPlannedRestDay ? 'Rest Day On' : 'Rest Day'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleDayPublished(activeGoal.id, activeDay.id, !activeDay.isPublished)}
                    className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                      activeDay.isPublished
                        ? 'bg-[#2FB368] text-white'
                        : 'bg-white text-[#7651E8]'
                    }`}
                  >
                    {activeDay.isPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {activeDay.isPublished ? 'Published' : 'Publish Day'}
                  </button>
                </>
              )}
              <div className="hidden md:block">
                <SubjectCardMotif themeId={subjectTheme.id} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar
                percent={dailyPct}
                color={dailyPct === 100 ? '#2FB368' : subjectTheme.progressFill}
                trackColor="#FFFFFF"
                height="h-3"
              />
            </div>
            <span className="text-xs font-black text-[#20202A] tabular-nums">{dailyPct}%</span>
          </div>

          {partner && (
            <div className="flex items-center gap-2 text-xs font-bold text-[#20202A]">
              <Avatar
                name={partner.displayName}
                initials={partner.avatarInitials}
                color={partner.avatarColor}
                avatarConfig={partner.avatarConfig}
                seedKey={partner.uid}
                size="xs"
              />
              <span className="tabular-nums">
                {partner.displayName.split(' ')[0]}: {partnerCompletedCount}/{publishedCount || dayTasks.length} done today
              </span>
            </div>
          )}
        </div>
      )}

      {/* Friendly Completion Feedback Strip */}
      <AnimatePresence>
        {justCompleted && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex items-center justify-between rounded-2xl border border-[#CBEBD7] bg-[#E2F5E9] px-4 py-3 text-xs font-extrabold text-[#1F874D]"
          >
            <span>{justCompleted.message}</span>
            <span className="tabular-nums">+{justCompleted.xp} XP</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean Rounded Checklist Task Cards */}
      {dayTasks.length === 0 ? (
        <EmptyState
          mascot="language"
          title="No quests on this day yet"
          description={
            isOwner
              ? 'Click "Add Quest" to create official learning tasks for this day.'
              : 'Your goal owner has not published tasks for this day yet.'
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
            const isJustDone = justCompleted?.id === task.id;
            const safeYt = sanitizeExternalUrl(task.youtubeUrl);
            const safeChatgpt = sanitizeExternalUrl(task.chatgptUrl);

            const statusBadge = myDone
              ? { label: 'Completed', cls: 'bg-[#E2F5E9] text-[#1F874D]' }
              : !task.isPublished
              ? { label: 'Draft', cls: 'bg-[#FFE8F0] text-[#BE3469]' }
              : isFutureDay
              ? { label: 'Upcoming', cls: 'bg-[#FFF0C9] text-[#B47100]' }
              : { label: 'Not Started', cls: 'bg-[#E9DFFF] text-[#6842DE]' };

            return (
              <article
                key={task.id}
                className={`rounded-[24px] border p-4 sm:p-5 transition-all ${
                  myDone
                    ? 'bg-[#F5FCF7] border-[#CBEBD7]'
                    : 'bg-white border-[#F0EDF5] shadow-[0_6px_20px_-14px_rgba(118,81,232,0.12)]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Animated Round Checkbox */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => void handleCompleteQuest(task, idx)}
                    aria-label={myDone ? `Completed ${task.title}` : `Mark "${task.title}" complete`}
                    aria-pressed={myDone}
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[#F8F5FF] transition-colors cursor-pointer"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
                        myDone
                          ? 'bg-[#2FB368] border-[#2FB368] text-white'
                          : 'bg-white border-[#D4CCE9] text-transparent hover:border-[#7651E8]'
                      }`}
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                    </span>
                  </motion.button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openTaskDetail(task)}
                        className="flex items-start gap-2.5 text-left group min-w-0 cursor-pointer"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F8F5FF] text-base select-none"
                          aria-hidden="true"
                        >
                          {getTaskEmoji(task.title, task.priority)}
                        </span>
                        <h3
                          className={`font-display text-base font-extrabold leading-snug group-hover:text-[#7651E8] transition-colors pt-0.5 ${
                            myDone ? 'text-[#8B8A99] line-through' : 'text-[#20202A]'
                          }`}
                        >
                          {task.title}
                        </h3>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                        <motion.span
                          key={isJustDone ? `xp-pop-${task.id}` : `xp-idle-${task.id}`}
                          initial={isJustDone ? { scale: 1.18 } : false}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.22 }}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums whitespace-nowrap ${
                            myDone ? 'bg-[#E2F5E9] text-[#1F874D]' : 'bg-[#FFF0C9] text-[#B47100]'
                          }`}
                        >
                          +{task.xpReward} XP
                        </motion.span>
                      </div>
                    </div>

                    {task.shortDescription && (
                      <p className="mt-1.5 text-xs sm:text-sm text-[#777783] leading-relaxed">
                        {task.shortDescription}
                      </p>
                    )}

                    {/* Clean Inline Metadata */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#777783] tabular-nums">
                      <span>⏱️ {task.estimatedMinutes} min</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">
                        {task.priority === 'low' ? 'Easy' : task.priority === 'high' ? 'Hard' : 'Medium'}
                      </span>
                      {partner && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className={partnerDone ? 'text-[#1F874D] font-bold' : 'text-[#777783]'}>
                            {partner.displayName.split(' ')[0]}: {partnerDone ? 'Completed' : 'Pending'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action Links & Owner Tools */}
                    <div className="mt-3 pt-3 border-t border-[#F0EDF5] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => openTaskDetail(task)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#F8F5FF] px-3 py-1.5 text-[#7651E8] hover:bg-[#E9DFFF] transition-colors cursor-pointer"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Notes
                        </button>

                        {safeYt && (
                          <a
                            href={safeYt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF0F3] px-3 py-1.5 text-[#C82D4F] hover:bg-[#FFE3E9] transition-colors"
                          >
                            <Youtube className="h-3.5 w-3.5" />
                            Video
                          </a>
                        )}

                        {safeChatgpt && (
                          <a
                            href={safeChatgpt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#E2F5E9] px-3 py-1.5 text-[#1F874D] hover:bg-[#D1EEDD] transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            ChatGPT
                          </a>
                        )}
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => void reorderTask(activeGoal.id, task.dayId, task.id, 'up')}
                            aria-label={`Move "${task.title}" up`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-full text-[#777783] hover:bg-[#F8F5FF] hover:text-[#20202A] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === dayTasks.length - 1}
                            onClick={() => void reorderTask(activeGoal.id, task.dayId, task.id, 'down')}
                            aria-label={`Move "${task.title}" down`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-full text-[#777783] hover:bg-[#F8F5FF] hover:text-[#20202A] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditTaskEditor(task)}
                            aria-label={`Edit "${task.title}"`}
                            className="min-h-[34px] inline-flex items-center gap-1 rounded-full bg-[#F8F5FF] px-3 text-xs font-extrabold text-[#7651E8] hover:bg-[#E9DFFF] transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Rename</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void duplicateTask(activeGoal.id, task)}
                            aria-label={`Duplicate "${task.title}"`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-full text-[#777783] hover:bg-[#F8F5FF] hover:text-[#20202A] cursor-pointer"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void archiveTask(activeGoal.id, task)}
                            aria-label={`Archive "${task.title}"`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-full text-[#777783] hover:bg-[#F8F5FF] hover:text-[#20202A] cursor-pointer"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskToDelete(task)}
                            aria-label={`Delete "${task.title}"`}
                            className="min-h-[34px] inline-flex items-center gap-1 rounded-full bg-[#FFF0F3] px-3 text-xs font-extrabold text-[#C82D4F] hover:bg-[#FFE3E9] transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
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

      {/* Quest Detail Sheet */}
      <ModalSheet
        open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        title={detailTask?.title || 'Quest Details'}
        subtitle={
          detailTask
            ? `Day ${detailTask.dayNumber} · ${detailTask.estimatedMinutes} min · +${detailTask.xpReward} XP`
            : undefined
        }
        size="lg"
      >
        {detailTask && (
          <div className="space-y-5">
            {detailTask.detailedInstructions && (
              <div>
                <h3 className="text-xs font-bold text-[#888888] mb-1.5">Instructions</h3>
                <p className="text-sm text-[#242424] leading-relaxed whitespace-pre-line">
                  {detailTask.detailedInstructions}
                </p>
              </div>
            )}

            {detailTask.learningNotes && (
              <div className="rounded-xl bg-[#F7F8FA] border border-[#EEEEF2] p-4">
                <h3 className="text-xs font-bold text-[#7956E8] mb-1.5">Official Learning Notes</h3>
                <p className="text-sm text-[#242424] leading-relaxed whitespace-pre-line">
                  {detailTask.learningNotes}
                </p>
              </div>
            )}

            {/* One Quest Roadmap & Step-by-Step Breakdown */}
            <div className="rounded-2xl bg-[#F8F5FF] border border-[#E9DFFF] p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#7651E8]" />
                <h3 className="text-xs font-black text-[#7651E8] uppercase tracking-wider">
                  Quest Study Roadmap
                </h3>
              </div>
              <div className="space-y-2">
                {buildQuestSpecificRoadmap(detailTask.title, activeGoal?.category).map((step) => (
                  <div key={step.step} className="flex items-start gap-2.5 text-xs text-[#20202A]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7651E8] text-[10px] font-bold text-white">
                      {step.step}
                    </span>
                    <div>
                      <p className="font-bold text-[#20202A]">{step.title}</p>
                      <p className="text-[#777783] mt-0.5">{step.objective}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended YouTube Channels for this Quest */}
            <div className="rounded-2xl bg-white border border-[#F0EDF5] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-[#E5484D]" />
                  <h3 className="text-xs font-black text-[#20202A] uppercase tracking-wider">
                    Recommended YouTube Channels
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-[#777783]">Handpicked for this topic</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getRecommendedChannelsForTopic(detailTask.title).map((channel, i) => (
                  <a
                    key={i}
                    href={channel.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-[#F0EDF5] bg-[#F8F5FF] hover:bg-[#E9DFFF]/60 transition-colors flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-black text-[#20202A] group-hover:text-[#7651E8]">
                          {channel.name}
                        </p>
                        <ExternalLink className="h-3 w-3 text-[#777783] group-hover:text-[#7651E8]" />
                      </div>
                      <p className="text-[10px] font-mono text-[#7651E8]">{channel.handle}</p>
                      <p className="text-[11px] text-[#777783] mt-1 line-clamp-2">{channel.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-[#888888] mb-2">Study Resources</h3>
              <div className="space-y-2">
                {sanitizeExternalUrl(detailTask.youtubeUrl) && (
                  <a
                    href={sanitizeExternalUrl(detailTask.youtubeUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[42px] flex items-center justify-between gap-3 rounded-xl border border-[#EEEEF2] bg-white px-4 py-2 text-sm font-medium text-[#242424] hover:bg-[#F7F8FA]"
                  >
                    <span className="flex items-center gap-2.5">
                      <Youtube className="h-4 w-4 text-[#E5484D]" />
                      YouTube Lesson Video
                    </span>
                    <ExternalLink className="h-4 w-4 text-[#888888]" />
                  </a>
                )}
                {sanitizeExternalUrl(detailTask.chatgptUrl) && (
                  <a
                    href={sanitizeExternalUrl(detailTask.chatgptUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[42px] flex items-center justify-between gap-3 rounded-xl border border-[#EEEEF2] bg-white px-4 py-2 text-sm font-medium text-[#242424] hover:bg-[#F7F8FA]"
                  >
                    <span className="flex items-center gap-2.5">
                      <MessageSquare className="h-4 w-4 text-[#58CC02]" />
                      ChatGPT Study Thread
                    </span>
                    <ExternalLink className="h-4 w-4 text-[#888888]" />
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
                      className="min-h-[42px] flex items-center justify-between gap-3 rounded-xl border border-[#EEEEF2] bg-white px-4 py-2 text-sm font-medium text-[#242424] hover:bg-[#F7F8FA]"
                    >
                      <span className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-[#7956E8]" />
                        {link.label}
                      </span>
                      <ExternalLink className="h-4 w-4 text-[#888888]" />
                    </a>
                  );
                })}
                {!sanitizeExternalUrl(detailTask.youtubeUrl) &&
                  !sanitizeExternalUrl(detailTask.chatgptUrl) &&
                  detailTask.resourceLinks.length === 0 && (
                    <p className="text-sm text-[#888888]">No external links attached to this quest.</p>
                  )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#EEEEF2]">
              <label htmlFor="personal-task-note" className="block text-xs font-bold text-[#242424] mb-1.5">
                My Private Study Notes (visible only to you)
              </label>
              <textarea
                id="personal-task-note"
                rows={3}
                value={personalNoteDraft}
                onChange={(e) => setPersonalNoteDraft(e.target.value)}
                placeholder="Write your own takeaways, code snippets, or follow-up questions..."
                className="w-full rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] p-3 text-sm text-[#242424] focus:bg-white focus:border-[#7956E8] focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    onClick={() => void savePersonalNote(activeGoal.id, detailTask.id, personalNoteDraft)}
                  >
                    Save Note
                  </Button>
                  {isOwner && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const target = detailTask;
                          setDetailTask(null);
                          openEditTaskEditor(target);
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5 text-[#7651E8]" />
                        Rename / Edit
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          const target = detailTask;
                          setDetailTask(null);
                          setTaskToDelete(target);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Quest
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="success"
                  onClick={() => {
                    void handleCompleteQuest(detailTask);
                    setDetailTask(null);
                  }}
                >
                  {currentUser && completionSet.has(buildCompletionId(detailTask.id, currentUser.uid))
                    ? 'Completed ✓'
                    : `Mark Complete (+${detailTask.xpReward} XP)`}
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
        title={editingTask ? 'Edit Quest' : 'Add Quest'}
        subtitle={activeDay ? `Day ${activeDay.dayNumber} · ${activeDay.date}` : undefined}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-xs font-semibold text-[#242424] mb-1.5">
              Quest title
            </label>
            <input
              id="task-title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="Learn Python Variables"
              className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3.5 text-sm text-[#242424] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-short" className="block text-xs font-semibold text-[#242424] mb-1.5">
              Short description
            </label>
            <input
              id="task-short"
              value={taskForm.shortDescription}
              onChange={(e) => setTaskForm({ ...taskForm, shortDescription: e.target.value })}
              placeholder="Practice snake_case naming and dynamic variable assignment"
              className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3.5 text-sm text-[#242424] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-instructions" className="block text-xs font-semibold text-[#242424] mb-1.5">
              Detailed instructions
            </label>
            <textarea
              id="task-instructions"
              rows={2}
              value={taskForm.detailedInstructions}
              onChange={(e) => setTaskForm({ ...taskForm, detailedInstructions: e.target.value })}
              className="w-full rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] p-3 text-sm text-[#242424] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-notes" className="block text-xs font-semibold text-[#242424] mb-1.5">
              Official learning notes
            </label>
            <textarea
              id="task-notes"
              rows={2}
              value={taskForm.learningNotes}
              onChange={(e) => setTaskForm({ ...taskForm, learningNotes: e.target.value })}
              className="w-full rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] p-3 text-sm text-[#242424] focus:bg-white focus:border-[#7956E8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-yt" className="block text-xs font-semibold text-[#242424] mb-1.5">
                YouTube URL (optional)
              </label>
              <input
                id="task-yt"
                type="url"
                value={taskForm.youtubeUrl}
                onChange={(e) => setTaskForm({ ...taskForm, youtubeUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3.5 text-sm text-[#242424]"
              />
            </div>
            <div>
              <label htmlFor="task-gpt" className="block text-xs font-semibold text-[#242424] mb-1.5">
                ChatGPT URL (optional)
              </label>
              <input
                id="task-gpt"
                type="url"
                value={taskForm.chatgptUrl}
                onChange={(e) => setTaskForm({ ...taskForm, chatgptUrl: e.target.value })}
                placeholder="https://chatgpt.com/share/..."
                className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3.5 text-sm text-[#242424]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-res-label" className="block text-xs font-semibold text-[#242424] mb-1.5">
                Extra resource label
              </label>
              <input
                id="task-res-label"
                value={taskForm.extraResourceLabel}
                onChange={(e) => setTaskForm({ ...taskForm, extraResourceLabel: e.target.value })}
                placeholder="Official Python Docs"
                className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3.5 text-sm text-[#242424]"
              />
            </div>
            <div>
              <label htmlFor="task-res-url" className="block text-xs font-semibold text-[#242424] mb-1.5">
                Extra resource URL
              </label>
              <input
                id="task-res-url"
                type="url"
                value={taskForm.extraResourceUrl}
                onChange={(e) => setTaskForm({ ...taskForm, extraResourceUrl: e.target.value })}
                placeholder="https://docs.python.org/3/"
                className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3.5 text-sm text-[#242424]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="task-min" className="block text-xs font-semibold text-[#242424] mb-1.5">
                Est. min
              </label>
              <input
                id="task-min"
                type="number"
                min={5}
                max={360}
                value={taskForm.estimatedMinutes}
                onChange={(e) => setTaskForm({ ...taskForm, estimatedMinutes: Number(e.target.value) })}
                className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3 text-sm font-mono text-[#242424]"
              />
            </div>
            <div>
              <label htmlFor="task-xp" className="block text-xs font-semibold text-[#242424] mb-1.5">
                XP reward
              </label>
              <input
                id="task-xp"
                type="number"
                min={5}
                max={200}
                value={taskForm.xpReward}
                onChange={(e) => setTaskForm({ ...taskForm, xpReward: Number(e.target.value) })}
                className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3 text-sm font-mono text-[#242424]"
              />
            </div>
            <div>
              <label htmlFor="task-priority" className="block text-xs font-semibold text-[#242424] mb-1.5">
                Difficulty
              </label>
              <select
                id="task-priority"
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-2.5 text-sm text-[#242424]"
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
                className={`min-h-[34px] rounded-lg px-3 text-xs font-semibold border transition-colors cursor-pointer ${
                  taskForm.xpReward === preset.value
                    ? 'bg-[#F3F0FF] border-[#7956E8] text-[#7956E8]'
                    : 'bg-white border-[#EEEEF2] text-[#666666]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {taskFormError && <p role="alert" className="text-xs font-semibold text-[#E5484D]">{taskFormError}</p>}

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
        title={`Add Day ${days.length + 1}`}
        subtitle="Create a new study day, then add official quests."
      >
        <form onSubmit={handleAddDay} className="space-y-4">
          <div>
            <label htmlFor="new-day-title" className="block text-xs font-semibold text-[#242424] mb-1.5">
              Day theme / focus title
            </label>
            <input
              id="new-day-title"
              value={newDayTitle}
              onChange={(e) => setNewDayTitle(e.target.value)}
              placeholder="Functions, Scope & Error Handling"
              required
              className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3.5 text-sm text-[#242424]"
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

      {/* Rename Study Day Modal */}
      <ModalSheet
        open={showRenameDayModal}
        onClose={() => setShowRenameDayModal(false)}
        title={activeDay ? `Rename Day ${activeDay.dayNumber}` : 'Rename Study Day'}
        subtitle="Update the theme or title for this study day."
      >
        <form onSubmit={handleRenameDay} className="space-y-4">
          <div>
            <label htmlFor="rename-day-title" className="block text-xs font-semibold text-[#242424] mb-1.5">
              Day theme / focus title
            </label>
            <input
              id="rename-day-title"
              value={renameDayInput}
              onChange={(e) => setRenameDayInput(e.target.value)}
              placeholder="Functions, Scope & Error Handling"
              required
              className="w-full min-h-[42px] rounded-xl border border-[#EEEEF2] bg-[#F7F8FA] px-3.5 text-sm text-[#242424]"
            />
          </div>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" type="button" onClick={() => setShowRenameDayModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Day Title</Button>
          </div>
        </form>
      </ModalSheet>

      <ConfirmDialog
        open={showDeleteDayConfirm}
        title="Delete study day?"
        description={
          activeDay
            ? `Delete Day ${activeDay.dayNumber} ("${activeDay.title}") and all quests scheduled for this day?`
            : 'Delete this study day?'
        }
        confirmLabel="Delete Day"
        onCancel={() => setShowDeleteDayConfirm(false)}
        onConfirm={() => {
          if (activeGoal && activeDay) {
            void deleteStudyDay(activeGoal.id, activeDay.id);
          }
          setShowDeleteDayConfirm(false);
        }}
      />

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
