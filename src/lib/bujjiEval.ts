import type { BujjiIntent, BujjiResponseMode, BujjiSubject, KnowledgeChunk } from '../types/bujji';
import {
  chunkDocument,
  classifyQuestion,
  evaluateRetrievalQuality,
  hybridRetrieve,
  verifyMathInQuery,
} from './bujjiEngine';

export interface BujjiEvalCase {
  id: string;
  subject: Exclude<BujjiSubject, 'Auto'>;
  query: string;
  mode: BujjiResponseMode;
  expectedIntent: BujjiIntent;
  expectedModel: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';
  expectedMathAnswer?: string;
  expectedDocId?: string;
  mustRejectUnindexed?: boolean;
}

export const BUJJI_EVAL_DATASET: BujjiEvalCase[] = [
  // All 13 subjects represented + simple vs complex routing + math verification + RAG retrieval
  {
    id: 'math-arith',
    subject: 'Mathematics',
    query: 'Calculate (25 * 4) + 18 / 3',
    mode: 'quick_answer',
    expectedIntent: 'calculation',
    expectedModel: 'gemini-3.1-flash-lite',
    expectedMathAnswer: '106',
  },
  {
    id: 'math-quadratic',
    subject: 'Mathematics',
    query: 'Solve x^2 - 5x + 6 = 0 step by step',
    mode: 'step_by_step',
    expectedIntent: 'calculation',
    expectedModel: 'gemini-4-hydrogen',
    expectedMathAnswer: 'x = 3 or x = 2',
  },
  {
    id: 'math-percent',
    subject: 'Mathematics',
    query: 'What is 15% of 240?',
    mode: 'quick_answer',
    expectedIntent: 'calculation',
    expectedModel: 'gemini-3.1-flash-lite',
    expectedMathAnswer: '36',
  },
  {
    id: 'physics-ohm',
    subject: 'Physics',
    query: 'Explain Ohm\'s law and derive power dissipation in a resistor step by step',
    mode: 'step_by_step',
    expectedIntent: 'explanation',
    expectedModel: 'gemini-4-hydrogen',
    expectedDocId: 'doc_phys_ch1',
  },
  {
    id: 'physics-temp',
    subject: 'Physics',
    query: 'Convert 100 C to F',
    mode: 'quick_answer',
    expectedIntent: 'calculation',
    expectedModel: 'gemini-3.1-flash-lite',
    expectedMathAnswer: '212 °F',
  },
  {
    id: 'chem-bonding',
    subject: 'Chemistry',
    query: 'Compare covalent bond vs ionic bond with examples',
    mode: 'explain_simply',
    expectedIntent: 'comparison',
    expectedModel: 'gemini-4-hydrogen',
    expectedDocId: 'doc_chem_ch2',
  },
  {
    id: 'bio-photosynthesis',
    subject: 'Biology',
    query: 'Explain photosynthesis light-dependent reactions and Calvin cycle',
    mode: 'deep_learning',
    expectedIntent: 'explanation',
    expectedModel: 'gemini-4-hydrogen',
    expectedDocId: 'doc_bio_ch4',
  },
  {
    id: 'cs-bigo',
    subject: 'Computer Science',
    query: 'Compare merge sort vs quicksort time complexity and Big-O edge cases',
    mode: 'deep_learning',
    expectedIntent: 'comparison',
    expectedModel: 'gemini-4-hydrogen',
  },
  {
    id: 'prog-debug',
    subject: 'Programming',
    query: 'Debug this Python recursion function that hits RecursionError when computing factorial',
    mode: 'step_by_step',
    expectedIntent: 'code_assistance',
    expectedModel: 'gemini-4-hydrogen',
  },
  {
    id: 'english-metaphor',
    subject: 'English',
    query: 'What is a metaphor?',
    mode: 'quick_answer',
    expectedIntent: 'definition',
    expectedModel: 'gemini-3.1-flash-lite',
  },
  {
    id: 'history-ww1',
    subject: 'History',
    query: 'Explain the main causes of World War I and the Treaty of Versailles',
    mode: 'exam_prep',
    expectedIntent: 'explanation',
    expectedModel: 'gemini-4-hydrogen',
    expectedDocId: 'doc_hist_ch3',
  },
  {
    id: 'geo-tectonics',
    subject: 'Geography',
    query: 'How do plate tectonics cause earthquakes and volcanic arcs?',
    mode: 'explain_simply',
    expectedIntent: 'explanation',
    expectedModel: 'gemini-4-hydrogen',
  },
  {
    id: 'econ-elasticity',
    subject: 'Economics',
    query: 'Explain price elasticity of demand and how monetary policy affects inflation',
    mode: 'exam_prep',
    expectedIntent: 'explanation',
    expectedModel: 'gemini-4-hydrogen',
  },
  {
    id: 'lang-translate',
    subject: 'Languages',
    query: 'Translate "Good morning, let us study" into Spanish',
    mode: 'quick_answer',
    expectedIntent: 'translation',
    expectedModel: 'gemini-3.1-flash-lite',
  },
  {
    id: 'exam-prep-quiz',
    subject: 'Exam Prep',
    query: 'Generate a quiz for SAT algebra practice test',
    mode: 'exam_prep',
    expectedIntent: 'quiz',
    expectedModel: 'gemini-4-hydrogen',
  },
  {
    id: 'gk-def',
    subject: 'General Knowledge',
    query: 'What is the United Nations?',
    mode: 'quick_answer',
    expectedIntent: 'definition',
    expectedModel: 'gemini-3.1-flash-lite',
    mustRejectUnindexed: true,
  },
];

export const SAMPLE_CURRICULUM_CHUNKS: KnowledgeChunk[] = [
  ...chunkDocument({
    docId: 'doc_phys_ch1',
    docTitle: 'Grade 10 Physics — Electricity',
    subject: 'Physics',
    chapter: 'Chapter 1: Ohm\'s Law & Circuits',
    content:
      'Ohm\'s Law states that the current I flowing through a conductor between two points is directly proportional to the voltage V across the two points, given constant temperature: V = I * R. Electrical power dissipated in a resistor is P = V * I = I^2 * R = V^2 / R, measured in Watts (W).',
  }),
  ...chunkDocument({
    docId: 'doc_chem_ch2',
    docTitle: 'Chemistry Essentials — Chemical Bonding',
    subject: 'Chemistry',
    chapter: 'Chapter 2: Ionic vs Covalent Bonds',
    content:
      'An ionic bond forms through complete transfer of valence electrons from a metal to a non-metal, creating oppositely charged ions held by electrostatic attraction (e.g., NaCl). A covalent bond forms when two non-metal atoms share pairs of valence electrons (e.g., H2O, CO2).',
  }),
  ...chunkDocument({
    docId: 'doc_bio_ch4',
    docTitle: 'Biology Unit 4 — Cellular Energetics',
    subject: 'Biology',
    chapter: 'Chapter 4: Photosynthesis',
    content:
      'Photosynthesis converts solar energy into chemical energy inside chloroplasts. The light-dependent reactions occur in the thylakoid membranes, splitting water to release O2 and producing ATP and NADPH. The Calvin cycle occurs in the stroma, fixing CO2 into glucose using ATP and NADPH.',
  }),
  ...chunkDocument({
    docId: 'doc_hist_ch3',
    docTitle: 'Modern World History Notes',
    subject: 'History',
    chapter: 'Chapter 3: World War I & Peace Treaties',
    content:
      'The four long-term causes of World War I are remembered by MAIN: Militarism, Alliances, Imperialism, and Nationalism. The 1919 Treaty of Versailles formally ended the war with Germany, imposing reparations, territorial losses, and military restrictions.',
  }),
];

export function runBujjiOfflineEvalSuite() {
  let subjectCorrect = 0;
  let intentCorrect = 0;
  let modelCorrect = 0;
  let mathChecked = 0;
  let mathCorrect = 0;
  let ragCases = 0;
  let ragHits = 0;
  let ragMrrSum = 0;
  let unindexedClean = 0;
  let unindexedCases = 0;

  for (const tc of BUJJI_EVAL_DATASET) {
    const route = classifyQuestion({
      query: tc.query,
      mode: tc.mode,
      hasKnowledgeBase: true,
    });

    if (route.subject === tc.subject) subjectCorrect += 1;
    if (route.intent === tc.expectedIntent) intentCorrect += 1;
    if (route.model === tc.expectedModel) modelCorrect += 1;

    if (tc.expectedMathAnswer) {
      mathChecked += 1;
      const mathRes = verifyMathInQuery(tc.query);
      if (mathRes?.verifiedAnswer === tc.expectedMathAnswer) {
        mathCorrect += 1;
      }
    }

    if (tc.expectedDocId) {
      ragCases += 1;
      const retrieved = hybridRetrieve({
        query: tc.query,
        chunks: SAMPLE_CURRICULUM_CHUNKS,
        subjectFilter: tc.subject,
        topK: 3,
      });
      const evalMetric = evaluateRetrievalQuality(retrieved, [tc.expectedDocId], 3);
      if (evalMetric.hit) ragHits += 1;
      ragMrrSum += evalMetric.mrr;
    }

    if (tc.mustRejectUnindexed) {
      unindexedCases += 1;
      const retrieved = hybridRetrieve({
        query: tc.query,
        chunks: SAMPLE_CURRICULUM_CHUNKS,
        subjectFilter: tc.subject,
        topK: 3,
        minScore: 0.3,
      });
      if (retrieved.length === 0) unindexedClean += 1;
    }
  }

  return {
    totalCases: BUJJI_EVAL_DATASET.length,
    subjectAccuracy: subjectCorrect / BUJJI_EVAL_DATASET.length,
    intentAccuracy: intentCorrect / BUJJI_EVAL_DATASET.length,
    routingAccuracy: modelCorrect / BUJJI_EVAL_DATASET.length,
    mathAccuracy: mathChecked > 0 ? mathCorrect / mathChecked : 1,
    ragRecallAt3: ragCases > 0 ? ragHits / ragCases : 1,
    ragMrr: ragCases > 0 ? ragMrrSum / ragCases : 1,
    unindexedRejectionRate: unindexedCases > 0 ? unindexedClean / unindexedCases : 1,
  };
}
