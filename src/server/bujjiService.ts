import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { extractText } from 'unpdf';
import {
  BujjiSemanticCache,
  chunkDocument,
  hybridRetrieve,
} from '../lib/bujjiEngine';
import type {
  BujjiLatencyMetrics,
  BujjiThinkingDepth,
  KnowledgeChunk,
  KnowledgeDocument,
  RetrievedSource,
} from '../types/bujji';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 1. FIREBASE ID TOKEN VERIFICATION ====================
// Uses Google's public x509 certificates + node:crypto RSA-SHA256 verification
// so it works on all Firebase projects (including Starter Tier without IAM admin keys).

interface VerifiedAuthContext {
  userId: string;
  isPreview: boolean;
  email?: string;
}

let cachedProjectId: string | null = null;
function getFirebaseProjectId(): string | null {
  if (cachedProjectId !== null) return cachedProjectId;
  try {
    const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { projectId?: string };
      if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
        cachedProjectId = parsed.projectId;
        return cachedProjectId;
      }
    }
  } catch {
    // Ignore read error
  }
  cachedProjectId = '';
  return null;
}

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedCerts: Record<string, string> | null = null;
let certsExpiresAt = 0;

async function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && now < certsExpiresAt) {
    return cachedCerts;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(GOOGLE_CERTS_URL, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Failed to fetch Firebase public keys (${res.status})`);
    }
    const certs = (await res.json()) as Record<string, string>;
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeSec = maxAgeMatch ? Math.min(Number(maxAgeMatch[1]), 3600) : 1800;
    cachedCerts = certs;
    certsExpiresAt = now + maxAgeSec * 1000;
    return certs;
  } finally {
    clearTimeout(timer);
  }
}

function decodeBase64UrlJson<T>(segment: string): T {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const raw = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(raw) as T;
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error('Firebase project configuration is missing on the server.');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed authentication token.');
  }

  const [headerSeg, payloadSeg, sigSeg] = parts;
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerSeg);
  const payload = decodeBase64UrlJson<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
  }>(payloadSeg);

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported token signing algorithm.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSec) {
    throw new Error('Authentication token has expired.');
  }
  if (!payload.iat || payload.iat > nowSec + 300) {
    throw new Error('Invalid token issue time.');
  }
  if (payload.aud !== projectId) {
    throw new Error('Token audience mismatch.');
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Token issuer mismatch.');
  }
  if (!payload.sub || payload.sub.length > 128) {
    throw new Error('Token subject missing.');
  }

  const certs = await fetchGooglePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    // Force refresh once in case Google rotated keys
    cachedCerts = null;
    const refreshed = await fetchGooglePublicCerts();
    const retryPem = refreshed[header.kid];
    if (!retryPem) {
      throw new Error('Unknown token signing key.');
    }
    const okRetry = crypto
      .createVerify('RSA-SHA256')
      .update(`${headerSeg}.${payloadSeg}`)
      .verify(retryPem, Buffer.from(sigSeg.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
    if (!okRetry) {
      throw new Error('Invalid token signature.');
    }
    return { uid: payload.sub, email: payload.email };
  }

  const ok = crypto
    .createVerify('RSA-SHA256')
    .update(`${headerSeg}.${payloadSeg}`)
    .verify(certPem, Buffer.from(sigSeg.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));

  if (!ok) {
    throw new Error('Invalid token signature.');
  }

  return { uid: payload.sub, email: payload.email };
}

export async function resolveBujjiUser(req: express.Request): Promise<VerifiedAuthContext> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verified = await verifyFirebaseIdToken(token);
    return {
      userId: verified.uid,
      isPreview: false,
      email: verified.email,
    };
  }

  // Strictly isolated preview namespace when running StudyDuo's interactive Preview Mode
  const isPreviewHeader = req.headers['x-studyduo-preview'] === 'true';
  if (isPreviewHeader) {
    const rawPreviewId = String(req.headers['x-studyduo-preview-user'] || 'preview_learner')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 48);
    return {
      userId: `preview_${rawPreviewId || 'learner'}`,
      isPreview: true,
    };
  }

  // Backward-compatible fallback for existing StudyDuo client calls without auth header
  const ipHash = crypto
    .createHash('sha256')
    .update(req.ip || req.socket.remoteAddress || 'anon')
    .digest('hex')
    .slice(0, 12);
  return {
    userId: `session_${ipHash}`,
    isPreview: true,
  };
}

// ==================== 2. RESILIENT GEMINI EXECUTION ====================

export function mapThinkingLevel(depth: BujjiThinkingDepth): ThinkingLevel {
  switch (depth) {
    case 'MINIMAL':
      return ThinkingLevel.MINIMAL;
    case 'MEDIUM':
      return ThinkingLevel.MEDIUM;
    case 'HIGH':
      return ThinkingLevel.HIGH;
    case 'LOW':
    default:
      return ThinkingLevel.LOW;
  }
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('GEMINI_API_KEY') ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('400') ||
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED')
  ) {
    return false;
  }
  return (
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('DEADLINE_EXCEEDED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ECONNRESET') ||
    msg.includes('fetch failed')
  );
}

export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  options: { timeoutMs?: number; maxRetries?: number; signal?: AbortSignal } = {}
): Promise<T> {
  const { timeoutMs = 45_000, maxRetries = 2, signal } = options;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (signal?.aborted) {
      throw new Error('Request cancelled by client.');
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('AI request timed out. Please try again.')), timeoutMs);
        }),
      ]);
      if (timer) clearTimeout(timer);
      return result;
    } catch (err) {
      if (timer) clearTimeout(timer);
      lastErr = err;
      if (attempt < maxRetries && isRetryableError(err) && !signal?.aborted) {
        const backoffMs = 450 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }

  throw lastErr;
}

// ==================== 3. EMBEDDINGS & CURRICULUM VECTOR STORE ====================

const EMBEDDING_MODEL = 'gemini-embedding-2';

export async function embedTexts(ai: GoogleGenAI, texts: string[]): Promise<Array<number[] | undefined>> {
  if (!texts.length) return [];
  const results: Array<number[] | undefined> = new Array(texts.length).fill(undefined);
  const batchSize = 16;

  for (let start = 0; start < texts.length; start += batchSize) {
    const slice = texts.slice(start, start + batchSize).map((t) => t.slice(0, 2000));
    try {
      const response = await withRetryAndTimeout(
        () =>
          ai.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: slice,
          }),
        { timeoutMs: 12_000, maxRetries: 1 }
      );

      if (Array.isArray(response.embeddings) && response.embeddings.length > 0) {
        response.embeddings.forEach((emb, i) => {
          if (emb?.values && emb.values.length > 0) {
            results[start + i] = emb.values;
          }
        });
      }
    } catch {
      // Graceful degradation: hybridRetrieve still performs strong lexical+metadata matching
    }
  }

  return results;
}

export async function extractTextFromPdfBase64(pdfBase64: string): Promise<{ text: string; pages: number }> {
  const cleaned = pdfBase64.replace(/^data:application\/pdf;base64,/i, '').trim();
  const buffer = Buffer.from(cleaned, 'base64');

  if (buffer.byteLength === 0) {
    throw new Error('Uploaded PDF file is empty.');
  }
  if (buffer.byteLength > 4 * 1024 * 1024) {
    throw new Error('PDF exceeds the 4 MB upload limit. Please upload a smaller chapter or notes excerpt.');
  }

  // Verify PDF magic header (%PDF-)
  const header = buffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    throw new Error('Uploaded file is not a valid PDF document.');
  }

  const extracted = await extractText(new Uint8Array(buffer), { mergePages: true });
  const rawText = Array.isArray(extracted.text)
    ? extracted.text.join('\n\n')
    : String(extracted.text || '');

  const normalized = rawText
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (normalized.length < 20) {
    throw new Error(
      'Could not extract readable text from this PDF (it may be a scanned image). Try pasting notes or uploading a text-based PDF.'
    );
  }

  return {
    text: normalized.slice(0, 60_000),
    pages: Number(extracted.totalPages || 1),
  };
}

// Per-user isolated in-memory vector store: userId -> (docId -> KnowledgeChunk[])
const userKnowledgeStore = new Map<string, Map<string, KnowledgeChunk[]>>();

// Shared semantic response cache (strictly scoped per userId + mode + level + kbSignature)
export const bujjiResponseCache = new BujjiSemanticCache(200, 12 * 60 * 1000);

export function getUserKbSignature(userId: string): string {
  const docs = userKnowledgeStore.get(userId);
  if (!docs || docs.size === 0) return 'kb_empty';
  const keys = Array.from(docs.keys()).sort();
  return `kb_${docs.size}_${keys.join(',').slice(0, 80)}`;
}

export function getUserChunkCount(userId: string): number {
  const docs = userKnowledgeStore.get(userId);
  if (!docs) return 0;
  let total = 0;
  for (const chunks of docs.values()) total += chunks.length;
  return total;
}

export function getUserIndexedDocIds(userId: string): string[] {
  const docs = userKnowledgeStore.get(userId);
  return docs ? Array.from(docs.keys()) : [];
}

export async function indexUserDocument(params: {
  ai: GoogleGenAI | null;
  userId: string;
  docId: string;
  title: string;
  subject: string;
  chapter: string;
  content: string;
}): Promise<{ chunks: KnowledgeChunk[]; embedded: boolean }> {
  const { ai, userId, docId, title, subject, chapter, content } = params;
  const chunks = chunkDocument({
    docId,
    docTitle: title,
    subject,
    chapter,
    content,
  }).slice(0, 80); // Bounded chunk count per document

  let embedded = false;
  if (ai && chunks.length > 0) {
    const vectors = await embedTexts(
      ai,
      chunks.map((c) => `${title} — ${subject} ${chapter}\n${c.text}`)
    );
    chunks.forEach((c, idx) => {
      if (vectors[idx]) {
        c.embedding = vectors[idx];
        embedded = true;
      }
    });
  }

  let userDocs = userKnowledgeStore.get(userId);
  if (!userDocs) {
    userDocs = new Map<string, KnowledgeChunk[]>();
    userKnowledgeStore.set(userId, userDocs);
  }
  userDocs.set(docId, chunks);
  bujjiResponseCache.invalidateUser(userId);

  return { chunks, embedded };
}

export async function syncUserDocuments(
  ai: GoogleGenAI | null,
  userId: string,
  docs: Array<Pick<KnowledgeDocument, 'id' | 'title' | 'subject' | 'chapter' | 'indexedContent'>>
): Promise<{ syncedCount: number; totalChunks: number }> {
  let userDocs = userKnowledgeStore.get(userId);
  if (!userDocs) {
    userDocs = new Map<string, KnowledgeChunk[]>();
    userKnowledgeStore.set(userId, userDocs);
  }

  const incomingIds = new Set(docs.map((d) => d.id));
  for (const existingId of Array.from(userDocs.keys())) {
    if (!incomingIds.has(existingId)) {
      userDocs.delete(existingId);
    }
  }

  let syncedCount = 0;
  for (const docItem of docs.slice(0, 20)) {
    if (!userDocs.has(docItem.id) && docItem.indexedContent.trim().length > 0) {
      await indexUserDocument({
        ai,
        userId,
        docId: docItem.id,
        title: docItem.title,
        subject: docItem.subject,
        chapter: docItem.chapter,
        content: docItem.indexedContent,
      });
      syncedCount += 1;
    }
  }

  return {
    syncedCount,
    totalChunks: getUserChunkCount(userId),
  };
}

export function removeUserDocument(userId: string, docId: string): boolean {
  const userDocs = userKnowledgeStore.get(userId);
  if (!userDocs) return false;
  const deleted = userDocs.delete(docId);
  if (deleted) {
    bujjiResponseCache.invalidateUser(userId);
  }
  return deleted;
}

export async function searchUserKnowledgeBase(params: {
  ai: GoogleGenAI | null;
  userId: string;
  query: string;
  subjectFilter?: string;
  topK?: number;
  precomputedEmbedding?: number[];
}): Promise<{ sources: RetrievedSource[]; queryEmbedding?: number[]; retrievalMs: number }> {
  const started = Date.now();
  const userDocs = userKnowledgeStore.get(params.userId);
  if (!userDocs || userDocs.size === 0) {
    return { sources: [], retrievalMs: Date.now() - started };
  }

  const allChunks: KnowledgeChunk[] = [];
  let hasAnyVector = false;
  for (const docChunks of userDocs.values()) {
    for (const c of docChunks) {
      allChunks.push(c);
      if (c.embedding?.length) hasAnyVector = true;
    }
  }

  if (allChunks.length === 0) {
    return { sources: [], retrievalMs: Date.now() - started };
  }

  let queryEmbedding = params.precomputedEmbedding;
  if (!queryEmbedding && hasAnyVector && params.ai) {
    const vectors = await embedTexts(params.ai, [params.query]);
    queryEmbedding = vectors[0];
  }

  const sources = hybridRetrieve({
    query: params.query,
    queryEmbedding,
    chunks: allChunks,
    subjectFilter: params.subjectFilter,
    topK: params.topK ?? 4,
    minScore: hasAnyVector && queryEmbedding ? 0.36 : 0.24,
  });

  return {
    sources,
    queryEmbedding,
    retrievalMs: Date.now() - started,
  };
}

export async function summarizeIngestedDocument(
  ai: GoogleGenAI,
  title: string,
  subject: string,
  content: string
): Promise<{ summary: string; keyConcepts: string[] }> {
  try {
    const response = await withRetryAndTimeout(
      () =>
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `Analyze this uploaded study document and return a concise 2-sentence summary and 5 to 8 key concepts.
Title: "${title}"
Subject: ${subject}

Excerpt:
"""
${content.slice(0, 7000)}
"""`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                keyConcepts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['summary', 'keyConcepts'],
            },
          },
        }),
      { timeoutMs: 15_000, maxRetries: 1 }
    );

    const parsed = JSON.parse((response.text || '{}').trim()) as {
      summary?: string;
      keyConcepts?: string[];
    };

    return {
      summary: String(parsed.summary || '').slice(0, 1500),
      keyConcepts: Array.isArray(parsed.keyConcepts)
        ? parsed.keyConcepts.map((k) => String(k).trim()).filter(Boolean).slice(0, 12)
        : [],
    };
  } catch {
    return {
      summary: content.slice(0, 240).replace(/\s+/g, ' ').trim() + (content.length > 240 ? '...' : ''),
      keyConcepts: [],
    };
  }
}

// ==================== 4. LIVE LATENCY TELEMETRY ====================

interface MetricsState {
  totalRequests: number;
  cacheHits: number;
  sumFirstTokenMs: number;
  sumTotalMs: number;
  sumRetrievalMs: number;
  fastModelCount: number;
  reasoningModelCount: number;
}

const metricsState: MetricsState = {
  totalRequests: 0,
  cacheHits: 0,
  sumFirstTokenMs: 0,
  sumTotalMs: 0,
  sumRetrievalMs: 0,
  fastModelCount: 0,
  reasoningModelCount: 0,
};

export function recordBujjiMetrics(entry: {
  firstTokenMs: number;
  totalMs: number;
  retrievalMs: number;
  cacheHit: boolean;
  model: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';
}): void {
  metricsState.totalRequests += 1;
  if (entry.cacheHit) metricsState.cacheHits += 1;
  metricsState.sumFirstTokenMs += entry.firstTokenMs;
  metricsState.sumTotalMs += entry.totalMs;
  metricsState.sumRetrievalMs += entry.retrievalMs;
  if (entry.model === 'gemini-3.1-flash-lite') {
    metricsState.fastModelCount += 1;
  } else {
    metricsState.reasoningModelCount += 1;
  }
}

export function getBujjiLatencyMetrics(): BujjiLatencyMetrics {
  const n = metricsState.totalRequests;
  return {
    totalRequests: n,
    cacheHits: metricsState.cacheHits,
    cacheHitRate: n > 0 ? Math.round((metricsState.cacheHits / n) * 1000) / 1000 : 0,
    avgFirstTokenMs: n > 0 ? Math.round(metricsState.sumFirstTokenMs / n) : 0,
    avgTotalMs: n > 0 ? Math.round(metricsState.sumTotalMs / n) : 0,
    fastModelCount: metricsState.fastModelCount,
    reasoningModelCount: metricsState.reasoningModelCount,
    avgRetrievalMs: n > 0 ? Math.round(metricsState.sumRetrievalMs / n) : 0,
  };
}
