import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { z } from 'zod';
import {
  buildBujjiSystemInstruction,
  classifyQuestion,
  extractFollowUpsFromText,
  trimConversationHistory,
  verifyMathInQuery,
} from './src/lib/bujjiEngine';
import { runBujjiOfflineEvalSuite } from './src/lib/bujjiEval';
import {
  bujjiResponseCache,
  extractTextFromPdfBase64,
  getBujjiLatencyMetrics,
  getUserChunkCount,
  getUserIndexedDocIds,
  getUserKbSignature,
  indexUserDocument,
  mapThinkingLevel,
  recordBujjiMetrics,
  removeUserDocument,
  resolveBujjiUser,
  searchUserKnowledgeBase,
  summarizeIngestedDocument,
  syncUserDocuments,
  withRetryAndTimeout,
} from './src/server/bujjiService';
import type {
  BujjiFlashcard,
  BujjiStructuredNotes,
  KnowledgeDocument,
} from './src/types/bujji';

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

function getOptionalGeminiClient(): GoogleGenAI | null {
  try {
    return getGeminiClient();
  } catch {
    return null;
  }
}

// Sliding-window rate limiter for AI routes (40 req / minute / IP)
const aiRateLimitMap = new Map<string, number[]>();
function aiRateLimit(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 40;
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

const bujjiSubjectEnum = z.enum([
  'Auto',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Programming',
  'English',
  'History',
  'Geography',
  'Economics',
  'Languages',
  'General Knowledge',
  'Exam Prep',
]);

const bujjiModeEnum = z.enum([
  'quick_answer',
  'explain_simply',
  'step_by_step',
  'deep_learning',
  'exam_prep',
]);

const bujjiStreamRequestSchema = z.object({
  message: z.string().trim().min(1).max(3000),
  mode: bujjiModeEnum.default('step_by_step'),
  subject: bujjiSubjectEnum.default('Auto'),
  homeworkAttempt: z.string().trim().max(3000).optional(),
  bypassCache: z.boolean().default(false),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })
    )
    .max(16)
    .default([]),
  memory: z
    .object({
      learningLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
      curriculum: z.string().max(120).optional(),
      weakTopics: z.array(z.string().max(100)).max(25).optional(),
      strongTopics: z.array(z.string().max(100)).max(25).optional(),
      studyPreferences: z.string().max(600).optional(),
      recentQuizResults: z
        .array(
          z.object({
            topic: z.string().max(120),
            subject: z.string().max(60),
            scorePercent: z.number().min(0).max(100),
            missedConcepts: z.array(z.string().max(120)).max(10),
            dateKey: z.string().max(20),
          })
        )
        .max(10)
        .optional(),
    })
    .optional(),
  goalContext: z
    .object({
      goalTitle: z.string().max(140).optional(),
      goalCategory: z.string().max(60).optional(),
      difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
      completedTasks: z.array(z.string().max(140)).max(20).optional(),
      upcomingTasks: z.array(z.string().max(140)).max(15).optional(),
    })
    .optional(),
});

const kbIngestSchema = z.object({
  docId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{3,80}$/)
    .optional(),
  title: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(60).default('General Knowledge'),
  chapter: z.string().trim().max(120).default(''),
  sourceType: z.enum(['pdf', 'notes', 'markdown', 'text']).default('notes'),
  textContent: z.string().max(65_000).optional(),
  pdfBase64: z.string().max(6_000_000).optional(),
  generateSummary: z.boolean().default(true),
});

const kbSyncSchema = z.object({
  documents: z
    .array(
      z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
        title: z.string().min(1).max(160),
        subject: z.string().min(1).max(60),
        chapter: z.string().max(120).default(''),
        indexedContent: z.string().min(1).max(60_000),
      })
    )
    .max(20),
});

const kbDeleteSchema = z.object({
  docId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
});

const kbSearchSchema = z.object({
  query: z.string().trim().min(2).max(500),
  subjectFilter: z.string().max(60).optional(),
  topK: z.number().int().min(1).max(8).default(4),
});

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
  subject: z.string().trim().max(60).optional(),
  completedTasks: z.array(z.string().max(150)).max(25).default([]),
  questionCount: z.number().int().min(3).max(8).default(4),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
  questionTypes: z
    .array(z.enum(['mcq', 'true_false', 'fill_blank', 'short_answer', 'coding']))
    .min(1)
    .max(5)
    .optional(),
  useKnowledgeBase: z.boolean().default(true),
});

const notesRequestSchema = z.object({
  mode: z.enum(['summarize', 'organize', 'flashcards', 'revision_sheet', 'practice_questions']),
  notesText: z.string().trim().min(10).max(16_000),
  goalTitle: z.string().trim().max(140).optional(),
  subject: z.string().trim().max(60).optional(),
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
    weakTopics: z.array(z.string().max(100)).max(15).optional(),
    strongTopics: z.array(z.string().max(100)).max(15).optional(),
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
  if (
    msg.includes('token') ||
    msg.includes('Token') ||
    msg.includes('signature') ||
    msg.includes('audience') ||
    msg.includes('issuer')
  ) {
    return { status: 401, message: 'Session verification failed. Please sign in again.' };
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
  if (msg.includes('timed out')) {
    return {
      status: 504,
      message: 'Bujji took too long to respond. Try Quick Answer mode or retry in a moment.',
    };
  }
  return {
    status: 500,
    message: 'Bujji AI encountered an error generating a response. Please try again.',
  };
}

function writeSseEvent(res: express.Response, event: string, data: unknown): void {
  if (res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function createServer() {
  const app = express();
  app.disable('x-powered-by');

  const smallJsonParser = express.json({ limit: '512kb' });
  const largeJsonParser = express.json({ limit: '6mb' });
  app.use((req, res, next) => {
    if (req.path === '/api/ai/kb/ingest' || req.path === '/api/ai/kb/sync') {
      largeJsonParser(req, res, next);
    } else {
      smallJsonParser(req, res, next);
    }
  });

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
      bujjiVersion: '2.0',
      aiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      timestamp: new Date().toISOString(),
    });
  });

  // ==================== BUJJI AI 2.0 STREAMING ENGINE ====================

  app.post('/api/ai/bujji/stream', aiRateLimit, async (req, res) => {
    const parsed = bujjiStreamRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid Bujji request', details: parsed.error.flatten() });
      return;
    }

    let authCtx;
    try {
      authCtx = await resolveBujjiUser(req);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
      return;
    }

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
      return;
    }

    const startedAt = Date.now();
    const {
      message,
      mode,
      subject,
      homeworkAttempt,
      bypassCache,
      history,
      memory,
      goalContext,
    } = parsed.data;

    const learnerLevel = memory?.learningLevel || goalContext?.difficulty || 'Intermediate';
    const hasKnowledgeBase = getUserChunkCount(authCtx.userId) > 0;
    const route = classifyQuestion({
      query: message,
      mode,
      explicitSubject: subject,
      goalCategory: goalContext?.goalCategory,
      hasHomeworkAttempt: Boolean(homeworkAttempt),
      hasKnowledgeBase,
    });

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      const kbSignature = getUserKbSignature(authCtx.userId);
      const canUseCache = !bypassCache && history.length === 0 && !homeworkAttempt;

      // Fast path: check exact-key per-user cache BEFORE spending latency on embedding retrieval
      if (canUseCache) {
        const exactCached = bujjiResponseCache.get({
          userId: authCtx.userId,
          query: message,
          mode,
          level: learnerLevel,
          kbSignature,
        });
        if (exactCached) {
          const firstTokenMs = Math.max(1, Date.now() - startedAt);
          writeSseEvent(res, 'meta', {
            route: exactCached.route,
            sources: exactCached.sources,
            mathCheck: exactCached.mathCheck,
            cacheHit: true,
            retrievalMs: 0,
          });
          writeSseEvent(res, 'token', { text: exactCached.responseText });
          const totalMs = Math.max(1, Date.now() - startedAt);
          recordBujjiMetrics({
            firstTokenMs,
            totalMs,
            retrievalMs: 0,
            cacheHit: true,
            model: exactCached.route.model,
          });
          writeSseEvent(res, 'done', {
            cleanText: exactCached.responseText,
            followUps: exactCached.followUps,
            cacheHit: true,
            firstTokenMs,
            totalMs,
            retrievalMs: 0,
            route: exactCached.route,
            sources: exactCached.sources,
            mathCheck: exactCached.mathCheck,
          });
          res.end();
          return;
        }
      }

      // Run deterministic math verification & curriculum RAG retrieval in parallel
      const mathCheck = route.needsMathVerification ? verifyMathInQuery(message) : null;
      const retrievalPromise = route.needsRetrieval
        ? searchUserKnowledgeBase({
            ai,
            userId: authCtx.userId,
            query: message,
            subjectFilter: subject === 'Auto' ? route.subject : subject,
            topK: 4,
          })
        : Promise.resolve({ sources: [], queryEmbedding: undefined, retrievalMs: 0 });

      const { sources, queryEmbedding, retrievalMs } = await retrievalPromise;

      // Semantic cache check (using queryEmbedding when available) for paraphrased repeat questions
      if (canUseCache && queryEmbedding?.length) {
        const cached = bujjiResponseCache.get({
          userId: authCtx.userId,
          query: message,
          mode,
          level: learnerLevel,
          kbSignature,
          queryEmbedding,
        });

        if (cached) {
          const firstTokenMs = Math.max(1, Date.now() - startedAt);
          writeSseEvent(res, 'meta', {
            route: cached.route,
            sources: cached.sources,
            mathCheck: cached.mathCheck,
            cacheHit: true,
            retrievalMs,
          });
          writeSseEvent(res, 'token', { text: cached.responseText });
          const totalMs = Math.max(1, Date.now() - startedAt);
          recordBujjiMetrics({
            firstTokenMs,
            totalMs,
            retrievalMs,
            cacheHit: true,
            model: cached.route.model,
          });
          writeSseEvent(res, 'done', {
            cleanText: cached.responseText,
            followUps: cached.followUps,
            cacheHit: true,
            firstTokenMs,
            totalMs,
            retrievalMs,
            route: cached.route,
            sources: cached.sources,
            mathCheck: cached.mathCheck,
          });
          res.end();
          return;
        }
      }

      // Send routing, sources, and math verification metadata immediately before generation starts
      writeSseEvent(res, 'meta', {
        route,
        sources,
        mathCheck,
        cacheHit: false,
        retrievalMs,
      });

      const systemInstruction = buildBujjiSystemInstruction({
        mode,
        level: learnerLevel,
        route,
        curriculum: memory?.curriculum,
        memory,
        goalContext,
        sources,
        mathCheck,
        homeworkAttempt,
      });

      const trimmedHistory = trimConversationHistory(history, 8, 4800);
      const contents = [
        ...trimmedHistory.map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        })),
        {
          role: 'user',
          parts: [
            {
              text: homeworkAttempt
                ? `Question / Problem:\n${message}\n\nMy Attempted Solution:\n${homeworkAttempt}`
                : message,
            },
          ],
        },
      ];

      const streamResponse = await withRetryAndTimeout(
        () =>
          ai.models.generateContentStream({
            model: route.model,
            contents,
            config: {
              thinkingConfig: { thinkingLevel: mapThinkingLevel(route.thinkingDepth) },
              systemInstruction,
            },
          }),
        { timeoutMs: 45_000, maxRetries: 1, signal: abortController.signal }
      );

      let rawBuffer = '';
      let firstTokenMs = 0;

      for await (const chunk of streamResponse) {
        if (abortController.signal.aborted) {
          break;
        }
        const delta = chunk.text || '';
        if (delta) {
          if (firstTokenMs === 0) {
            firstTokenMs = Date.now() - startedAt;
          }
          rawBuffer += delta;
          writeSseEvent(res, 'token', { text: delta });
        }
      }

      if (abortController.signal.aborted) {
        res.end();
        return;
      }

      const totalMs = Date.now() - startedAt;
      if (firstTokenMs === 0) firstTokenMs = totalMs;

      const { cleanText, followUps } = extractFollowUpsFromText(rawBuffer);

      if (canUseCache && cleanText.length >= 16) {
        bujjiResponseCache.set({
          key: bujjiResponseCache.makeKey(authCtx.userId, message, mode, learnerLevel, kbSignature),
          userId: authCtx.userId,
          kbSignature,
          mode,
          embedding: queryEmbedding,
          responseText: cleanText,
          followUps,
          sources,
          mathCheck,
          route,
        });
      }

      recordBujjiMetrics({
        firstTokenMs,
        totalMs,
        retrievalMs,
        cacheHit: false,
        model: route.model,
      });

      writeSseEvent(res, 'done', {
        cleanText,
        followUps,
        cacheHit: false,
        firstTokenMs,
        totalMs,
        retrievalMs,
        route,
        sources,
        mathCheck,
      });
      res.end();
    } catch (err) {
      if (!abortController.signal.aborted) {
        const formatted = formatGeminiError(err);
        writeSseEvent(res, 'error', { status: formatted.status, error: formatted.message });
      }
      res.end();
    }
  });

  // ==================== CURRICULUM-AWARE RAG KNOWLEDGE BASE ROUTES ====================

  app.post('/api/ai/kb/ingest', aiRateLimit, async (req, res) => {
    const parsed = kbIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid knowledge document upload', details: parsed.error.flatten() });
      return;
    }

    let authCtx;
    try {
      authCtx = await resolveBujjiUser(req);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
      return;
    }

    try {
      const { docId, title, subject, chapter, sourceType, textContent, pdfBase64, generateSummary } =
        parsed.data;

      let extractedText = (textContent || '').trim();
      let pages: number | undefined;

      if (sourceType === 'pdf' && pdfBase64) {
        const pdfResult = await extractTextFromPdfBase64(pdfBase64);
        extractedText = pdfResult.text;
        pages = pdfResult.pages;
      }

      if (extractedText.length < 20) {
        res.status(400).json({
          error: 'Please provide at least 20 characters of study material or upload a text-based PDF.',
        });
        return;
      }

      const trimmedContent = extractedText.slice(0, 60_000);
      const finalDocId = docId || `kb_${crypto.randomBytes(6).toString('hex')}`;
      const ai = getOptionalGeminiClient();

      const [{ chunks, embedded }, summaryData] = await Promise.all([
        indexUserDocument({
          ai,
          userId: authCtx.userId,
          docId: finalDocId,
          title,
          subject,
          chapter,
          content: trimmedContent,
        }),
        ai && generateSummary
          ? summarizeIngestedDocument(ai, title, subject, trimmedContent)
          : Promise.resolve({
              summary:
                trimmedContent.slice(0, 240).replace(/\s+/g, ' ').trim() +
                (trimmedContent.length > 240 ? '...' : ''),
              keyConcepts: [],
            }),
      ]);

      const nowIso = new Date().toISOString();
      const document: KnowledgeDocument = {
        id: finalDocId,
        userId: authCtx.userId,
        title,
        subject,
        chapter,
        sourceType,
        charCount: trimmedContent.length,
        chunkCount: chunks.length,
        summary: summaryData.summary,
        keyConcepts: summaryData.keyConcepts,
        indexedContent: trimmedContent,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      res.json({ document, embedded, pages });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process uploaded study document.';
      res.status(400).json({ error: msg });
    }
  });

  app.post('/api/ai/kb/sync', aiRateLimit, async (req, res) => {
    const parsed = kbSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid sync payload', details: parsed.error.flatten() });
      return;
    }

    try {
      const authCtx = await resolveBujjiUser(req);
      const ai = getOptionalGeminiClient();
      const result = await syncUserDocuments(ai, authCtx.userId, parsed.data.documents);
      res.json(result);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/ai/kb/delete', aiRateLimit, async (req, res) => {
    const parsed = kbDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    try {
      const authCtx = await resolveBujjiUser(req);
      const removed = removeUserDocument(authCtx.userId, parsed.data.docId);
      res.json({ removed, remainingChunks: getUserChunkCount(authCtx.userId) });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/ai/kb/search', aiRateLimit, async (req, res) => {
    const parsed = kbSearchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid search query', details: parsed.error.flatten() });
      return;
    }

    try {
      const authCtx = await resolveBujjiUser(req);
      const ai = getOptionalGeminiClient();
      const result = await searchUserKnowledgeBase({
        ai,
        userId: authCtx.userId,
        query: parsed.data.query,
        subjectFilter: parsed.data.subjectFilter,
        topK: parsed.data.topK,
      });
      res.json({
        sources: result.sources,
        retrievalMs: result.retrievalMs,
        indexedChunks: getUserChunkCount(authCtx.userId),
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.get('/api/ai/bujji/metrics', async (req, res) => {
    try {
      const authCtx = await resolveBujjiUser(req);
      res.json({
        metrics: getBujjiLatencyMetrics(),
        evaluation: runBujjiOfflineEvalSuite(),
        indexedDocs: getUserIndexedDocIds(authCtx.userId).length,
        indexedChunks: getUserChunkCount(authCtx.userId),
      });
    } catch {
      res.json({
        metrics: getBujjiLatencyMetrics(),
        evaluation: runBujjiOfflineEvalSuite(),
        indexedDocs: 0,
        indexedChunks: 0,
      });
    }
  });

  // ==================== EXISTING STUDYDUO AI ENDPOINTS (PRESERVED & UPGRADED) ====================

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

      const response = await withRetryAndTimeout(() =>
        ai.models.generateContent({
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
              'You are Bujji, StudyDuo AI Study Planner. Produce clear, structured, actionable learning roadmaps for two study partners. Never invent URLs. Keep descriptions concise and motivating.',
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
        })
      );

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

      const response = await withRetryAndTimeout(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Topic to explain: "${topic}"
Approach: ${styleInstructions[style]}
${goalContext ? `Study goal context: ${goalContext}` : ''}

Format clearly with Markdown headings, bold key terms, formulas in LaTeX if relevant, bullet points, and a 2-minute quick self-check prompt at the end. Do not invent external URLs.`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are Bujji, StudyDuo AI Tutor. Give crisp, encouraging, accurate explanations structured for mobile readability. Never fabricate URLs.',
          },
        })
      );

      res.json({ explanation: response.text || 'No explanation returned.' });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. AI Quiz Generator (MCQ, True/False, Fill-in-the-Blank, Short Answer, Coding + KB Grounding)
  app.post('/api/ai/quiz', aiRateLimit, async (req, res) => {
    const parsed = quizRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid quiz request', details: parsed.error.flatten() });
      return;
    }

    try {
      const authCtx = await resolveBujjiUser(req);
      const ai = getGeminiClient();
      const { topic, subject, completedTasks, questionCount, difficulty, questionTypes, useKnowledgeBase } =
        parsed.data;

      const requestedTypes =
        questionTypes && questionTypes.length > 0
          ? questionTypes
          : ['mcq', 'true_false', 'fill_blank', 'short_answer', 'coding'];

      let groundedExcerpt = '';
      let sourcesUsed: Array<{ docTitle: string; chapter: string }> = [];
      if (useKnowledgeBase && getUserChunkCount(authCtx.userId) > 0) {
        const kb = await searchUserKnowledgeBase({
          ai,
          userId: authCtx.userId,
          query: `${subject || ''} ${topic}`.trim(),
          subjectFilter: subject,
          topK: 3,
        });
        if (kb.sources.length > 0) {
          sourcesUsed = kb.sources.map((s) => ({ docTitle: s.docTitle, chapter: s.chapter }));
          groundedExcerpt = `\nGrounded Uploaded Study Notes (incorporate key concepts accurately):\n${kb.sources
            .map((s, idx) => `[${idx + 1}. ${s.docTitle}${s.chapter ? ` - ${s.chapter}` : ''}]: ${s.excerpt}`)
            .join('\n')}`;
        }
      }

      const response = await withRetryAndTimeout(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Generate a ${questionCount}-question study quiz on "${topic}"${subject ? ` (Subject: ${subject})` : ''} at ${difficulty} difficulty.
${completedTasks.length > 0 ? `Base questions on these completed study tasks where relevant: ${completedTasks.join('; ')}` : ''}${groundedExcerpt}

Use ONLY these requested question types: ${requestedTypes.join(', ')}.
- "mcq": include 4 distinct options in options array.
- "true_false": options must be ["True", "False"].
- "fill_blank": include "_____" in the question sentence and set correctAnswer to the exact short missing word/phrase/value.
- "short_answer": concise conceptual question.
- "coding": practical code snippet or applied problem-solving prompt.

For every question, include:
- correctAnswer (accurate, verified)
- explanation (clear step-by-step educational explanation)
- conceptTag (short 2-4 word sub-topic label)
- misconceptionHint (1 brief sentence warning about the most common mistake students make on this question)`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are Bujji Quiz Engine inside StudyDuo. Create accurate, concept-testing questions across all academic subjects with clear explanations and misconception feedback.',
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
                        description: 'One of: mcq, true_false, fill_blank, short_answer, coding',
                      },
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctAnswer: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                      conceptTag: { type: Type.STRING },
                      misconceptionHint: { type: Type.STRING },
                    },
                    required: [
                      'id',
                      'type',
                      'question',
                      'correctAnswer',
                      'explanation',
                      'conceptTag',
                      'misconceptionHint',
                    ],
                  },
                },
              },
              required: ['topic', 'questions'],
            },
          },
        })
      );

      const parsedQuiz = parseJsonFromModelText<{
        topic?: string;
        questions?: Array<{
          id?: string;
          type?: string;
          question?: string;
          options?: string[];
          correctAnswer?: string;
          explanation?: string;
          conceptTag?: string;
          misconceptionHint?: string;
        }>;
      }>(response.text);

      const allowedTypes = new Set(['mcq', 'true_false', 'fill_blank', 'short_answer', 'coding']);
      const normalizedQuestions = (parsedQuiz.questions || []).map((q, idx) => ({
        id: q.id || `q_${idx + 1}`,
        type: allowedTypes.has(String(q.type)) ? String(q.type) : 'short_answer',
        question: String(q.question || ''),
        options: Array.isArray(q.options) && q.options.length > 0 ? q.options.map(String) : undefined,
        correctAnswer: String(q.correctAnswer || ''),
        explanation: String(q.explanation || ''),
        conceptTag: String(q.conceptTag || topic).slice(0, 60),
        misconceptionHint: String(q.misconceptionHint || ''),
        subject: subject || 'General Knowledge',
        difficulty,
      }));

      res.json({
        quiz: {
          topic: parsedQuiz.topic || topic,
          questions: normalizedQuestions,
        },
        sourcesUsed,
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 4. AI Smart Notes Assistant (returns both structured JSON + flashcards AND rendered Markdown)
  app.post('/api/ai/notes', aiRateLimit, async (req, res) => {
    const parsed = notesRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid notes request', details: parsed.error.flatten() });
      return;
    }

    try {
      const ai = getGeminiClient();
      const { mode, notesText, goalTitle, subject } = parsed.data;
      const modeFocus: Record<string, string> = {
        summarize: 'Prioritize an ultra-clear executive summary and crisp key takeaways in revisionMarkdown.',
        organize: 'Reorganize the material into clean thematic Markdown sections with bullet points and action items in revisionMarkdown.',
        flashcards: 'Make the flashcards especially sharp and high-yield for active recall.',
        revision_sheet: 'Format revisionMarkdown as a structured 1-page exam revision cheat sheet with formulas, rules, and examples.',
        practice_questions: 'Include 5 active-recall practice questions with collapsible/concise model answers in revisionMarkdown.',
      };

      const response = await withRetryAndTimeout(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Transform the learner's study notes into a complete Smart Notes study kit.
Primary Mode Focus: ${modeFocus[mode]}
${subject ? `Subject: ${subject}` : ''}
${goalTitle ? `Learning Goal: ${goalTitle}` : ''}

Return valid JSON containing:
- summary: 2-3 sentence executive summary
- keyConcepts: 5-8 concise high-yield concept strings
- definitions: 4-6 key term/definition pairs
- flashcards: 6 interactive Q&A flashcards (front, back, tag)
- revisionMarkdown: richly formatted Markdown tailored to the Primary Mode Focus (headings, bold, bullets, LaTeX math where appropriate; NEVER invent external URLs)

Learner Notes:
"""
${notesText}
"""`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are Bujji Smart Notes Assistant inside StudyDuo. Distill study notes accurately without fabricating facts or external URLs.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
                definitions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: { type: Type.STRING },
                      definition: { type: Type.STRING },
                    },
                    required: ['term', 'definition'],
                  },
                },
                flashcards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      front: { type: Type.STRING },
                      back: { type: Type.STRING },
                      tag: { type: Type.STRING },
                    },
                    required: ['front', 'back', 'tag'],
                  },
                },
                revisionMarkdown: { type: Type.STRING },
              },
              required: ['summary', 'keyConcepts', 'definitions', 'flashcards', 'revisionMarkdown'],
            },
          },
        })
      );

      const raw = parseJsonFromModelText<Partial<BujjiStructuredNotes>>(response.text);
      const flashcards: BujjiFlashcard[] = Array.isArray(raw.flashcards)
        ? raw.flashcards.map((fc, i) => ({
            id: fc.id || `fc_${i + 1}`,
            front: String(fc.front || ''),
            back: String(fc.back || ''),
            tag: String(fc.tag || subject || 'Key Idea'),
          }))
        : [];

      const structured: BujjiStructuredNotes = {
        summary: String(raw.summary || ''),
        keyConcepts: Array.isArray(raw.keyConcepts) ? raw.keyConcepts.map(String) : [],
        definitions: Array.isArray(raw.definitions)
          ? raw.definitions.map((d) => ({ term: String(d.term || ''), definition: String(d.definition || '') }))
          : [],
        flashcards,
        revisionMarkdown: String(raw.revisionMarkdown || raw.summary || 'No notes output returned.'),
      };

      res.json({
        result: structured.revisionMarkdown,
        structured,
      });
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
        coach: 'Act as Bujji, a personal Study Coach answering what to study next, what to revise, and upcoming milestones.',
        progress_analyzer: 'Analyze the learner study history constructively, celebrate wins, address weak topics, and suggest consistency habits.',
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
        context.weakTopics?.length ? `Tracked Weak Topics: ${context.weakTopics.join(', ')}` : '',
        context.strongTopics?.length ? `Tracked Strong Topics: ${context.strongTopics.join(', ')}` : '',
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

      const response = await withRetryAndTimeout(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `${modeRole[mode]}

Context:
${contextLines}

User question: "${question}"

Respond with clean Markdown headings, bold priorities, actionable daily steps, and warm encouragement.`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are Bujji, StudyDuo Personal Study Coach. Be supportive, concise, practical, and privacy-respecting. Never fabricate URLs or fake statistics.',
          },
        })
      );

      res.json({ reply: response.text || 'No response generated.' });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const httpServer = http.createServer(app);

  if (!isProduction) {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        ws: hmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });

    if (hmrDisabled) {
      // Vite 8 still injects /@vite/client in dev HTML even when hmr/ws are false,
      // which attempts a WebSocket connection to port 24678 and throws behind HTTPS proxies.
      // Serve a zero-WebSocket shim that preserves Vite's CSS & hot-context module exports.
      app.get('/@vite/client', (_req, res) => {
        res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export class ErrorOverlay extends HTMLElement {}
`);
      });
    }

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
