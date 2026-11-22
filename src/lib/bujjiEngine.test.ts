import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BujjiSemanticCache,
  buildBujjiSystemInstruction,
  chunkDocument,
  classifyQuestion,
  cosineSimilarity,
  evaluateRetrievalQuality,
  extractFollowUpsFromText,
  hybridRetrieve,
  safeEvaluateArithmetic,
  trimConversationHistory,
  verifyMathInQuery,
} from './bujjiEngine';
import { runBujjiOfflineEvalSuite, SAMPLE_CURRICULUM_CHUNKS } from './bujjiEval';

describe('Bujji AI 2.0 Intelligence, Routing, Math & RAG Engine', () => {
  it('routes simple definitions/translations to lightweight model and complex STEM/code to capable reasoning model', () => {
    const simpleDef = classifyQuestion({ query: 'What is osmosis?', mode: 'quick_answer' });
    assert.equal(simpleDef.model, 'gemini-3.1-flash-lite');
    assert.equal(simpleDef.thinkingDepth, 'MINIMAL');
    assert.equal(simpleDef.intent, 'definition');

    const complexMath = classifyQuestion({
      query: 'Solve x^2 - 7x + 12 = 0 step by step and explain the discriminant',
      mode: 'step_by_step',
    });
    assert.equal(complexMath.model, 'gemini-4-hydrogen');
    assert.equal(complexMath.subject, 'Mathematics');
    assert.equal(complexMath.needsMathVerification, true);

    const homeworkCheck = classifyQuestion({
      query: 'Can you check my solution for velocity?',
      mode: 'explain_simply',
      hasHomeworkAttempt: true,
    });
    assert.equal(homeworkCheck.intent, 'homework_help');
    assert.equal(homeworkCheck.model, 'gemini-4-hydrogen');
    assert.equal(homeworkCheck.thinkingDepth, 'MEDIUM');
  });

  it('safely verifies arithmetic, equations, percentages, and unit conversions without eval()', () => {
    assert.equal(safeEvaluateArithmetic('(12 + 8) * 3 - 10 / 2'), 55);
    assert.equal(safeEvaluateArithmetic('sqrt(144) + 2^5'), 44);
    assert.equal(safeEvaluateArithmetic('10 / 0'), null);
    assert.equal(safeEvaluateArithmetic('process.exit(1)'), null);

    const quad = verifyMathInQuery('Solve x^2 - 5x + 6 = 0');
    assert.equal(quad?.verifiedAnswer, 'x = 3 or x = 2');
    assert.equal(quad?.method, 'quadratic');

    const lin = verifyMathInQuery('Find x if 3x + 7 = 22');
    assert.equal(lin?.verifiedAnswer, 'x = 5');
    assert.equal(lin?.method, 'linear');

    const pct = verifyMathInQuery('What is 25% of 320?');
    assert.equal(pct?.verifiedAnswer, '80');

    const temp = verifyMathInQuery('Convert 0 C to F');
    assert.equal(temp?.verifiedAnswer, '32 °F');
  });

  it('chunks documents with overlap and retrieves relevant curriculum sources with vector + lexical hybrid scoring', () => {
    const longDoc = [
      'Newton first law of motion describes inertia: objects remain at rest or uniform motion unless acted on by a net external force.',
      'Newton second law states F = m * a, where force is measured in Newtons (kg·m/s²), mass in kilograms, and acceleration in m/s².',
      'Newton third law states that for every action force there is an equal and opposite reaction force acting on different bodies.',
    ].join('\n\n');

    const chunks = chunkDocument({
      docId: 'doc_newton',
      docTitle: 'Physics Mechanics',
      subject: 'Physics',
      chapter: 'Chapter 2: Laws of Motion',
      content: longDoc,
      maxChunkChars: 170,
      overlapChars: 35,
    });
    assert.ok(chunks.length >= 2);
    assert.equal(chunks[0].subject, 'Physics');
    assert.equal(chunks[0].chapter, 'Chapter 2: Laws of Motion');

    // Cosine similarity sanity
    assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
    assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);

    // Hybrid retrieval with vectors
    const withVecs = chunks.map((c, idx) => ({
      ...c,
      embedding: idx === 1 ? [0.98, 0.1, 0.05] : [0.05, 0.9, 0.1],
    }));
    const retrieved = hybridRetrieve({
      query: 'What is Newton second law F = m * a?',
      queryEmbedding: [0.99, 0.08, 0.02],
      chunks: withVecs,
      subjectFilter: 'Physics',
      topK: 2,
    });
    assert.ok(retrieved.length >= 1);
    assert.equal(retrieved[0].docId, 'doc_newton');
    assert.ok(retrieved[0].excerpt.length > 0);

    const quality = evaluateRetrievalQuality(retrieved, ['doc_newton'], 2);
    assert.equal(quality.hit, true);
    assert.equal(quality.mrr, 1);
  });

  it('scopes semantic cache strictly per user and supports cache invalidation on KB updates', () => {
    const cache = new BujjiSemanticCache(20, 60_000);
    const route = classifyQuestion({ query: 'What is DNA?', mode: 'quick_answer' });

    cache.set({
      key: cache.makeKey('user_a', 'What is DNA?', 'quick_answer', 'Beginner', 'kb_1'),
      userId: 'user_a',
      kbSignature: 'kb_1',
      mode: 'quick_answer',
      embedding: [0.9, 0.2, 0.1],
      responseText: 'DNA carries genetic instructions.',
      followUps: ['How does DNA replicate?'],
      sources: [],
      mathCheck: null,
      route,
    });

    // User A gets exact and semantic hit
    const exactHit = cache.get({
      userId: 'user_a',
      query: '  what is dna? ',
      mode: 'quick_answer',
      level: 'Beginner',
      kbSignature: 'kb_1',
    });
    assert.ok(exactHit);
    assert.equal(exactHit?.responseText, 'DNA carries genetic instructions.');

    const semanticHit = cache.get({
      userId: 'user_a',
      query: 'Explain what DNA is',
      mode: 'quick_answer',
      level: 'Beginner',
      kbSignature: 'kb_1',
      queryEmbedding: [0.91, 0.19, 0.1],
    });
    assert.ok(semanticHit);

    // User B MUST NOT receive User A's cached answer
    const crossUser = cache.get({
      userId: 'user_b',
      query: 'What is DNA?',
      mode: 'quick_answer',
      level: 'Beginner',
      kbSignature: 'kb_1',
      queryEmbedding: [0.9, 0.2, 0.1],
    });
    assert.equal(crossUser, null);

    // Invalidation clears User A's entries cleanly
    cache.invalidateUser('user_a');
    assert.equal(
      cache.get({
        userId: 'user_a',
        query: 'What is DNA?',
        mode: 'quick_answer',
        level: 'Beginner',
        kbSignature: 'kb_1',
      }),
      null
    );
  });

  it('manages context windows, builds Bujji master prompt safely, and parses follow-up chips', () => {
    const history = Array.from({ length: 12 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Turn ${i + 1}: ` + 'x'.repeat(600),
    }));
    const trimmed = trimConversationHistory(history, 8, 2500);
    assert.ok(trimmed.length <= 5);
    assert.ok(trimmed[trimmed.length - 1].content.startsWith('Turn 12:'));

    const route = classifyQuestion({ query: 'Explain Ohm law', mode: 'explain_simply' });
    const prompt = buildBujjiSystemInstruction({
      mode: 'explain_simply',
      level: 'Beginner',
      route,
      curriculum: 'CBSE Grade 10',
      memory: { weakTopics: ['Circuit Analysis'], strongTopics: ['Algebra'] },
      sources: SAMPLE_CURRICULUM_CHUNKS.slice(0, 1).map((c) => ({
        chunkId: c.id,
        docId: c.docId,
        docTitle: c.docTitle,
        subject: c.subject,
        chapter: c.chapter,
        excerpt: c.text,
        score: 0.91,
        semanticScore: 0.9,
        lexicalScore: 0.92,
      })),
    });
    assert.ok(prompt.includes('You are Bujji'));
    assert.ok(prompt.includes('CBSE Grade 10'));
    assert.ok(prompt.includes('Circuit Analysis'));
    assert.ok(prompt.includes('[Source 1:'));

    const parsed = extractFollowUpsFromText(
      'Direct answer here.\n\nFOLLOW_UPS: Try a practice problem? | Compare with parallel circuits? | Show a real-world example?'
    );
    assert.equal(parsed.cleanText, 'Direct answer here.');
    assert.equal(parsed.followUps.length, 3);
    assert.equal(parsed.followUps[0], 'Try a practice problem?');
  });

  it('passes the 16-case all-subject Bujji 2.0 offline evaluation benchmark at 100%', () => {
    const metrics = runBujjiOfflineEvalSuite();
    assert.equal(metrics.subjectAccuracy, 1);
    assert.equal(metrics.intentAccuracy, 1);
    assert.equal(metrics.routingAccuracy, 1);
    assert.equal(metrics.mathAccuracy, 1);
    assert.equal(metrics.ragRecallAt3, 1);
    assert.equal(metrics.ragMrr, 1);
    assert.equal(metrics.unindexedRejectionRate, 1);
  });
});
