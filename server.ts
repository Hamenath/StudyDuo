import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Shared Gemini client initialized exclusively on the server
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Simple in-memory sliding-window rate limiter for AI routes (25 req / minute / IP)
const aiRateLimitMap = new Map<string, number[]>();
function aiRateLimit(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 25;
  const recent = (aiRateLimitMap.get(ip) || []).filter((ts) => now - ts < windowMs);
  if (recent.length >= maxRequests) {
    res.status(429).json({
      error: 'Too many AI study requests. Please wait a moment before trying again.',
    });
    return;
  }
  recent.push(now);
  aiRateLimitMap.set(ip, recent);
  next();
}

// ==================== ZOD INPUT SCHEMAS ====================

const planRequestSchema = z.object({
  goalPrompt: z.string().trim().min(5).max(500),
  durationDays: z.number().int().min(7).max(365).default(60),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
  dailyTargetMinutes: z.number().int().min(15).max(360).default(60),
  category: z.string().trim().max(60).optional(),
});

const explainRequestSchema = z.object({
  topic: z.string().trim().min(2).max(200),
  style: z
    .enum(['beginner', 'practical_examples', 'deep_dive', 'common_mistakes'])
    .default('beginner'),
  goalContext: z.string().trim().max(1200).optional(),
});

const quizRequestSchema = z.object({
  topic: z.string().trim().min(2).max(200),
  completedTasks: z.array(z.string().max(150)).max(25).default([]),
  questionCount: z.number().int().min(3).max(8).default(4),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
});

const notesRequestSchema = z.object({
  mode: z.enum(['summarize', 'organize', 'flashcards', 'revision_sheet', 'practice_questions']),
  notesText: z.string().trim().min(10).max(6000),
  goalTitle: z.string().trim().max(140).optional(),
});

const coachRequestSchema = z.object({
  mode: z.enum(['coach', 'progress_analyzer', 'roadmap_advisor', 'resources', 'partner_insights']),
  question: z.string().trim().min(2).max(600),
  context: z.object({
    goalTitle: z.string().max(140).optional(),
    currentDayNumber: z.number().int().min(1).max(365).optional(),
    completedTasks: z.array(z.string().max(140)).max(30).default([]),
    upcomingTasks: z.array(z.string().max(140)).max(20).default([]),
    phases: z.array(z.string().max(140)).max(15).default([]),
    userStats: z
      .object({
        streak: z.number().min(0),
        totalXp: z.number().min(0),
        dailyPoints: z.number().min(0),
      })
      .optional(),
    partnerStats: z
      .object({
        name: z.string().max(80),
        streak: z.number().min(0),
        dailyPoints: z.number().min(0),
        completedTasksCount: z.number().min(0),
      })
      .optional(),
    authorizedJournalSummaries: z.array(z.string().max(500)).max(5).optional(),
  }),
});

function parseJsonFromModelText<T>(raw: string | undefined): T {
  const cleaned = (raw ?? '{}')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('GEMINI_API_KEY')) {
    return { status: 503, message: msg };
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Gemini API quota reached. Please try again shortly or check your API billing tier in Settings > Secrets.',
    };
  }
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Gemini API key could not be verified. Check your key in Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: 'AI Study Assistant encountered an error generating a response. Please try again.',
  };
}

async function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '512kb' }));

  // Basic security headers (preserving iframe embedding for AI Studio preview)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'StudyDuo',
      aiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      timestamp: new Date().toISOString(),
    });
  });

  // 1. AI Study Planner — returns structured suggested roadmap for owner review
  app.post('/api/ai/plan', aiRateLimit, async (req, res) => {
    const parsed = planRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid study plan request', details: parsed.error.flatten() });
      return;
    }

    try {
      const ai = getGeminiClient();
      const { goalPrompt, durationDays, difficulty, dailyTargetMinutes, category } = parsed.data;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Design a structured, practical ${durationDays}-day collaborative study roadmap for two study partners.
Goal request: "${goalPrompt}"
Category: ${category || 'General Learning'}
Difficulty: ${difficulty}
Daily target study time: ${dailyTargetMinutes} minutes per day.

Create 4 to 6 logical phases spanning Day 1 to Day ${durationDays} with clear startDay/endDay ranges, concrete learning objectives, milestone titles, sample daily topics, a revision strategy, and hands-on practice recommendations. Do NOT invent or fabricate external URLs.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are StudyDuo AI Study Planner. Produce clear, structured, actionable learning roadmaps for two study partners. Never invent URLs. Keep descriptions concise and motivating.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              revisionStrategy: { type: Type.STRING },
              practiceRecommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              phases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    startDay: { type: Type.INTEGER },
                    endDay: { type: Type.INTEGER },
                    milestoneTitle: { type: Type.STRING },
                    estimatedDailyMinutes: { type: Type.INTEGER },
                    objectives: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    sampleDailyTopics: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: [
                    'title',
                    'description',
                    'startDay',
                    'endDay',
                    'milestoneTitle',
                    'estimatedDailyMinutes',
                    'objectives',
                    'sampleDailyTopics',
                  ],
                },
              },
            },
            required: ['summary', 'revisionStrategy', 'practiceRecommendations', 'phases'],
          },
        },
      });

      const plan = parseJsonFromModelText(response.text);
      res.json({ plan });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 2. AI Topic Explainer
  app.post('/api/ai/explain', aiRateLimit, async (req, res) => {
    const parsed = explainRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid explanation request', details: parsed.error.flatten() });
      return;
    }

    try {
      const ai = getGeminiClient();
      const { topic, style, goalContext } = parsed.data;
      const styleInstructions: Record<string, string> = {
        beginner: 'Explain this like I am a complete beginner using a simple analogy and step-by-step breakdown.',
        practical_examples: 'Give 3 concrete, practical real-world examples with concise snippets or walkthroughs.',
        deep_dive: 'Explain the underlying mental model, trade-offs, and key edge cases clearly.',
        common_mistakes: 'Highlight the top 5 common mistakes learners make and how to avoid each one.',
      };

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Topic to explain: "${topic}"
Approach: ${styleInstructions[style]}
${goalContext ? `Study goal context: ${goalContext}` : ''}

Format clearly with short headings, bullet points, and a 2-minute quick self-check prompt at the end. Do not invent external URLs.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are StudyDuo AI Tutor. Give crisp, encouraging, accurate explanations structured for mobile readability. Never fabricate URLs.',
        },
      });

      res.json({ explanation: response.text || 'No explanation returned.' });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. AI Quiz Generator (MCQ, True/False, Short Answer, Coding)
  app.post('/api/ai/quiz', aiRateLimit, async (req, res) => {
    const parsed = quizRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid quiz request', details: parsed.error.flatten() });
      return;
    }

    try {
      const ai = getGeminiClient();
      const { topic, completedTasks, questionCount, difficulty } = parsed.data;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate a ${questionCount}-question study quiz on "${topic}" at ${difficulty} difficulty.
${completedTasks.length > 0 ? `Base questions on these completed study tasks: ${completedTasks.join('; ')}` : ''}
Include a balanced mix of types: "mcq" (with 4 concise options), "true_false" (options: ["True", "False"]), "short_answer", and "coding" (or practical scenario if non-coding).
Provide an accurate correctAnswer and a clear educational explanation for each question.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are StudyDuo Quiz Engine. Create fair, concept-testing questions with concise explanations.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: {
                      type: Type.STRING,
                      description: 'One of: mcq, true_false, short_answer, coding',
                    },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['id', 'type', 'question', 'correctAnswer', 'explanation'],
                },
              },
            },
            required: ['topic', 'questions'],
          },
        },
      });

      const parsedQuiz = parseJsonFromModelText<{
        topic?: string;
        questions?: Array<{
          id?: string;
          type?: string;
          question?: string;
          options?: string[];
          correctAnswer?: string;
          explanation?: string;
        }>;
      }>(response.text);

      const allowedTypes = new Set(['mcq', 'true_false', 'short_answer', 'coding']);
      const normalizedQuestions = (parsedQuiz.questions || []).map((q, idx) => ({
        id: q.id || `q_${idx + 1}`,
        type: allowedTypes.has(String(q.type)) ? String(q.type) : 'short_answer',
        question: String(q.question || ''),
        options: Array.isArray(q.options) && q.options.length > 0 ? q.options.map(String) : undefined,
        correctAnswer: String(q.correctAnswer || ''),
        explanation: String(q.explanation || ''),
      }));

      res.json({
        quiz: {
          topic: parsedQuiz.topic || topic,
          questions: normalizedQuestions,
        },
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 4. AI Notes Assistant
  app.post('/api/ai/notes', aiRateLimit, async (req, res) => {
    const parsed = notesRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid notes request', details: parsed.error.flatten() });
      return;
    }

    try {
      const ai = getGeminiClient();
      const { mode, notesText, goalTitle } = parsed.data;
      const modePrompts: Record<string, string> = {
        summarize: 'Summarize these study notes into crisp key takeaways and a 3-sentence executive summary.',
        organize: 'Reorganize these notes into clean thematic sections with bullet points and action items.',
        flashcards: 'Generate 6 high-yield Q&A flashcards formatted clearly as Front / Back pairs.',
        revision_sheet: 'Create a structured 1-page revision cheat sheet covering definitions, rules, and examples.',
        practice_questions: 'Generate 5 open-ended practice questions with brief model answers.',
      };

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${modePrompts[mode]}
${goalTitle ? `Learning Goal: ${goalTitle}` : ''}

Learner Notes:
"""
${notesText}
"""`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are StudyDuo Notes Assistant. Transform learner notes cleanly without inventing external URLs or unrelated facts.',
        },
      });

      res.json({ result: response.text || 'No notes output returned.' });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 5. AI Study Coach, Progress Analyzer, Roadmap Advisor, Resources & Partner Insights
  app.post('/api/ai/coach', aiRateLimit, async (req, res) => {
    const parsed = coachRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid coach request', details: parsed.error.flatten() });
      return;
    }

    try {
      const ai = getGeminiClient();
      const { mode, question, context } = parsed.data;

      const modeRole: Record<string, string> = {
        coach: 'Act as a personal Study Coach answering what to study next, what to revise, and upcoming milestones.',
        progress_analyzer: 'Analyze the learner study history constructively, celebrate wins, and identify consistency habits.',
        roadmap_advisor: 'Suggest thoughtful improvements to upcoming roadmap phases. Remind the user that the goal owner must approve official roadmap edits.',
        resources: 'Recommend well-known official documentation topics, book chapters, and search keywords to study. CRITICAL: NEVER invent or fabricate specific URLs—refer only to official documentation names and exact search queries.',
        partner_insights: 'Provide constructive, encouraging comparison insights between the learner and their study partner without shaming or exposing private information.',
      };

      const contextLines = [
        context.goalTitle ? `Active Goal: ${context.goalTitle}` : 'Active Goal: None selected',
        context.currentDayNumber ? `Current Study Day: Day ${context.currentDayNumber}` : '',
        context.phases.length ? `Roadmap Phases: ${context.phases.join(' -> ')}` : '',
        context.completedTasks.length
          ? `Completed Tasks (${context.completedTasks.length}): ${context.completedTasks.slice(0, 15).join(', ')}`
          : 'Completed Tasks: None yet',
        context.upcomingTasks.length
          ? `Upcoming/Pending Tasks: ${context.upcomingTasks.slice(0, 10).join(', ')}`
          : 'Upcoming Tasks: None scheduled',
        context.userStats
          ? `Learner Stats: ${context.userStats.totalXp} total XP, ${context.userStats.dailyPoints} pts today, ${context.userStats.streak}-day streak`
          : '',
        context.partnerStats
          ? `Study Partner (${context.partnerStats.name}): ${context.partnerStats.dailyPoints} pts today, ${context.partnerStats.streak}-day streak, ${context.partnerStats.completedTasksCount} tasks completed`
          : '',
        context.authorizedJournalSummaries?.length
          ? `Authorized Journal Notes:\n- ${context.authorizedJournalSummaries.join('\n- ')}`
          : 'Private journal entries were not included.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${modeRole[mode]}

Context:
${contextLines}

User question: "${question}"

Respond with clear structure, actionable advice, and warm encouragement.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are StudyDuo AI Study Coach. Be supportive, concise, practical, and privacy-respecting. Never fabricate URLs or fake statistics.',
        },
      });

      res.json({ reply: response.text || 'No response generated.' });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const httpServer = http.createServer(app);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyDuo server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start StudyDuo server:', err);
  process.exit(1);
});
