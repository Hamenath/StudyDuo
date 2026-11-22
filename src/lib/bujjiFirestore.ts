import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from './firebase';
import type { BujjiLearningMemory, BujjiQuizRecord, KnowledgeDocument } from '../types/bujji';
import type { DifficultyLevel } from '../types/studyduo';

const PREVIEW_MEMORY_KEY = 'studyduo_bujji_preview_memory_v1';
const PREVIEW_KB_KEY = 'studyduo_bujji_preview_kb_v1';

export function createDefaultBujjiMemory(
  uid: string,
  level: DifficultyLevel = 'Intermediate'
): BujjiLearningMemory {
  return {
    uid,
    learningLevel: level,
    curriculum: '',
    preferredMode: 'step_by_step',
    weakTopics: [],
    strongTopics: [],
    recentQuizResults: [],
    studyPreferences: '',
    updatedAt: new Date().toISOString(),
  };
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function sanitizeMemory(raw: BujjiLearningMemory): BujjiLearningMemory {
  return {
    uid: raw.uid,
    learningLevel: raw.learningLevel,
    curriculum: raw.curriculum.trim().slice(0, 120),
    preferredMode: raw.preferredMode,
    weakTopics: Array.from(new Set(raw.weakTopics.map((t) => t.trim()).filter(Boolean))).slice(0, 25),
    strongTopics: Array.from(new Set(raw.strongTopics.map((t) => t.trim()).filter(Boolean))).slice(0, 25),
    recentQuizResults: raw.recentQuizResults.slice(0, 20),
    studyPreferences: raw.studyPreferences.trim().slice(0, 600),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export async function getBujjiAuthHeaders(
  mode: 'live' | 'preview',
  previewUserId?: string
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (mode === 'live' && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Let backend validate and return a clear 401 if token retrieval fails
    }
  } else {
    headers['X-StudyDuo-Preview'] = 'true';
    headers['X-StudyDuo-Preview-User'] = previewUserId || 'preview_learner';
  }
  return headers;
}

export async function loadBujjiMemory(
  userId: string,
  mode: 'live' | 'preview',
  defaultLevel: DifficultyLevel = 'Intermediate'
): Promise<BujjiLearningMemory> {
  if (mode === 'preview' || !isFirebaseConfigured) {
    try {
      const raw = window.sessionStorage.getItem(`${PREVIEW_MEMORY_KEY}_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as BujjiLearningMemory;
        return sanitizeMemory({ ...createDefaultBujjiMemory(userId, defaultLevel), ...parsed, uid: userId });
      }
    } catch {
      // Ignore storage errors in sandboxed preview
    }
    return createDefaultBujjiMemory(userId, defaultLevel);
  }

  const docPath = `users/${userId}/aiMemory/profile`;
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'aiMemory', 'profile'));
    if (!snap.exists()) {
      return createDefaultBujjiMemory(userId, defaultLevel);
    }
    const data = snap.data();
    return sanitizeMemory({
      uid: userId,
      learningLevel: (data.learningLevel as DifficultyLevel) || defaultLevel,
      curriculum: typeof data.curriculum === 'string' ? data.curriculum : '',
      preferredMode: data.preferredMode || 'step_by_step',
      weakTopics: Array.isArray(data.weakTopics) ? data.weakTopics.map(String) : [],
      strongTopics: Array.isArray(data.strongTopics) ? data.strongTopics.map(String) : [],
      recentQuizResults: Array.isArray(data.recentQuizResults)
        ? (data.recentQuizResults as BujjiQuizRecord[])
        : [],
      studyPreferences: typeof data.studyPreferences === 'string' ? data.studyPreferences : '',
      updatedAt: toIsoString(data.updatedAt),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, docPath);
  }
}

export async function saveBujjiMemory(
  memory: BujjiLearningMemory,
  mode: 'live' | 'preview'
): Promise<BujjiLearningMemory> {
  const clean = sanitizeMemory({ ...memory, updatedAt: new Date().toISOString() });

  if (mode === 'preview' || !isFirebaseConfigured) {
    try {
      window.sessionStorage.setItem(`${PREVIEW_MEMORY_KEY}_${clean.uid}`, JSON.stringify(clean));
    } catch {
      // Ignore storage quota errors
    }
    return clean;
  }

  const docPath = `users/${clean.uid}/aiMemory/profile`;
  try {
    await setDoc(doc(db, 'users', clean.uid, 'aiMemory', 'profile'), {
      uid: clean.uid,
      learningLevel: clean.learningLevel,
      curriculum: clean.curriculum,
      preferredMode: clean.preferredMode,
      weakTopics: clean.weakTopics,
      strongTopics: clean.strongTopics,
      recentQuizResults: clean.recentQuizResults,
      studyPreferences: clean.studyPreferences,
      updatedAt: serverTimestamp(),
    });
    return clean;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function recordQuizToBujjiMemory(
  currentMemory: BujjiLearningMemory,
  quizRecord: BujjiQuizRecord,
  mode: 'live' | 'preview'
): Promise<BujjiLearningMemory> {
  const weakSet = new Set(currentMemory.weakTopics);
  const strongSet = new Set(currentMemory.strongTopics);

  if (quizRecord.scorePercent >= 80) {
    strongSet.add(quizRecord.topic);
    weakSet.delete(quizRecord.topic);
  } else if (quizRecord.scorePercent < 65) {
    weakSet.add(quizRecord.topic);
    strongSet.delete(quizRecord.topic);
  }

  for (const missed of quizRecord.missedConcepts) {
    if (missed.trim()) {
      weakSet.add(missed.trim().slice(0, 80));
    }
  }

  const updated: BujjiLearningMemory = {
    ...currentMemory,
    weakTopics: Array.from(weakSet).slice(0, 25),
    strongTopics: Array.from(strongSet).slice(0, 25),
    recentQuizResults: [quizRecord, ...currentMemory.recentQuizResults].slice(0, 20),
    updatedAt: new Date().toISOString(),
  };

  return saveBujjiMemory(updated, mode);
}

export async function loadKnowledgeDocs(
  userId: string,
  mode: 'live' | 'preview'
): Promise<KnowledgeDocument[]> {
  if (mode === 'preview' || !isFirebaseConfigured) {
    try {
      const raw = window.sessionStorage.getItem(`${PREVIEW_KB_KEY}_${userId}`);
      if (raw) {
        return JSON.parse(raw) as KnowledgeDocument[];
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  }

  const path = `users/${userId}/knowledgeDocs`;
  try {
    const q = query(
      collection(db, 'users', userId, 'knowledgeDocs'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          userId: String(data.userId || userId),
          title: String(data.title || 'Untitled Notes'),
          subject: String(data.subject || 'General Knowledge'),
          chapter: String(data.chapter || ''),
          sourceType: (data.sourceType as KnowledgeDocument['sourceType']) || 'notes',
          charCount: Number(data.charCount || 0),
          chunkCount: Number(data.chunkCount || 0),
          summary: String(data.summary || ''),
          keyConcepts: Array.isArray(data.keyConcepts) ? data.keyConcepts.map(String) : [],
          indexedContent: String(data.indexedContent || ''),
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveKnowledgeDoc(
  docItem: KnowledgeDocument,
  mode: 'live' | 'preview'
): Promise<KnowledgeDocument> {
  const clean: KnowledgeDocument = {
    ...docItem,
    title: docItem.title.trim().slice(0, 160),
    subject: docItem.subject.trim().slice(0, 60),
    chapter: docItem.chapter.trim().slice(0, 120),
    summary: docItem.summary.trim().slice(0, 2000),
    keyConcepts: docItem.keyConcepts.map((k) => k.trim()).filter(Boolean).slice(0, 20),
    indexedContent: docItem.indexedContent.slice(0, 60000),
    charCount: Math.min(80000, Math.max(0, docItem.charCount)),
    chunkCount: Math.min(200, Math.max(0, docItem.chunkCount)),
    updatedAt: new Date().toISOString(),
  };

  if (mode === 'preview' || !isFirebaseConfigured) {
    const existing = await loadKnowledgeDocs(clean.userId, 'preview');
    const next = [clean, ...existing.filter((d) => d.id !== clean.id)];
    try {
      window.sessionStorage.setItem(`${PREVIEW_KB_KEY}_${clean.userId}`, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
    return clean;
  }

  const docPath = `users/${clean.userId}/knowledgeDocs/${clean.id}`;
  try {
    await setDoc(doc(db, 'users', clean.userId, 'knowledgeDocs', clean.id), {
      id: clean.id,
      userId: clean.userId,
      title: clean.title,
      subject: clean.subject,
      chapter: clean.chapter,
      sourceType: clean.sourceType,
      charCount: clean.charCount,
      chunkCount: clean.chunkCount,
      summary: clean.summary,
      keyConcepts: clean.keyConcepts,
      indexedContent: clean.indexedContent,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return clean;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, docPath);
  }
}

export async function deleteKnowledgeDoc(
  userId: string,
  docId: string,
  mode: 'live' | 'preview'
): Promise<void> {
  if (mode === 'preview' || !isFirebaseConfigured) {
    const existing = await loadKnowledgeDocs(userId, 'preview');
    const next = existing.filter((d) => d.id !== docId);
    try {
      window.sessionStorage.setItem(`${PREVIEW_KB_KEY}_${userId}`, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    return;
  }

  const docPath = `users/${userId}/knowledgeDocs/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'knowledgeDocs', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}
