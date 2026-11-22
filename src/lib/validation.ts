import { z } from 'zod';

const safeHttpUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid http:// or https:// URL' }
  );

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
  username: z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only use letters, numbers, and underscores'),
  bio: z.string().trim().max(280).optional().default(''),
  preferredCategory: z.string().trim().min(1).max(60),
  timezone: z.string().trim().min(1).max(64),
  avatarColor: z.string().trim().min(4).max(24),
});

export const goalSchema = z.object({
  title: z.string().trim().min(3, 'Goal title must be at least 3 characters').max(120),
  description: z.string().trim().max(600).default(''),
  category: z.string().trim().min(1, 'Select a category').max(50),
  icon: z.string().trim().max(32).default('code'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date format'),
  durationDays: z.coerce.number().int().min(1, 'At least 1 day').max(365, 'Max 365 days'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  timezone: z.string().trim().min(1).max(64),
  dailyTargetMinutes: z.coerce.number().int().min(10, 'At least 10 minutes').max(480),
  groupName: z.string().trim().max(80).default(''),
});

export const phaseSchema = z.object({
  title: z.string().trim().min(2, 'Phase title is required').max(120),
  description: z.string().trim().max(500).default(''),
  startDay: z.coerce.number().int().min(1).max(365),
  endDay: z.coerce.number().int().min(1).max(365),
  milestoneTitle: z.string().trim().max(120).default(''),
  objectivesText: z.string().max(1000).default(''),
  isPublished: z.boolean().default(true),
}).refine((data) => data.endDay >= data.startDay, {
  message: 'End day must be on or after start day',
  path: ['endDay'],
});

export const taskSchema = z.object({
  title: z.string().trim().min(2, 'Task title is required').max(140),
  shortDescription: z.string().trim().max(280).default(''),
  detailedInstructions: z.string().trim().max(3000).default(''),
  learningNotes: z.string().trim().max(4000).default(''),
  youtubeUrl: safeHttpUrl.default(''),
  chatgptUrl: safeHttpUrl.default(''),
  extraResourceLabel: z.string().trim().max(80).default(''),
  extraResourceUrl: safeHttpUrl.default(''),
  estimatedMinutes: z.coerce.number().int().min(5, 'Min 5 minutes').max(360),
  xpReward: z.coerce.number().int().min(5, 'Min 5 XP').max(200, 'Max 200 XP'),
  priority: z.enum(['low', 'medium', 'high']),
  isPublished: z.boolean().default(true),
});

export const journalSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(140),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date format'),
  goalId: z.string().trim().max(128).optional().default(''),
  topic: z.string().trim().min(1, 'Topic is required').max(120),
  notes: z.string().trim().min(3, 'Write your study notes').max(4000),
  whatILearned: z.string().trim().max(2000).default(''),
  questions: z.string().trim().max(2000).default(''),
  challenges: z.string().trim().max(2000).default(''),
  resources: z.string().trim().max(1500).default(''),
  isSharedWithOwner: z.boolean().default(false),
});

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(6, 'Enter a valid invite code')
    .max(24)
    .regex(/^[A-Z0-9-]+$/, 'Invite codes contain letters, numbers, and hyphens only'),
});
