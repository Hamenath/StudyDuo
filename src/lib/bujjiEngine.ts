import type {
  BujjiChatTurn,
  BujjiIntent,
  BujjiLearningMemory,
  BujjiResponseMode,
  BujjiRouteDecision,
  BujjiSubject,
  KnowledgeChunk,
  MathVerificationResult,
  RetrievedSource,
} from '../types/bujji';
import type { DifficultyLevel } from '../types/studyduo';

// ==================== 1. SUBJECT & INTENT ROUTER ====================

const SUBJECT_PATTERNS: Array<{ subject: Exclude<BujjiSubject, 'Auto'>; priority?: number; patterns: RegExp[] }> = [
  {
    subject: 'Exam Prep',
    priority: 2,
    patterns: [
      /\b(sat|act|gre|gmat|jee|neet|upsc|gate|ielts|toefl|ap exam|gcse|cbse|icse|mock test|past paper|competitive exam|exam strategy|practice test)\b/i,
    ],
  },
  {
    subject: 'Languages',
    priority: 2,
    patterns: [
      /\b(translate|translation|spanish|french|german|japanese|hindi|tamil|telugu|mandarin|korean|arabic|conjugate|conjugation|pronunciation|how do you say)\b/i,
    ],
  },
  {
    subject: 'Programming',
    patterns: [
      /\b(python|javascript|typescript|java|c\+\+|rust|golang|sql|html|css|react|node\.?js|fastapi|django|flask|git|api|regex|async|await|decorator|pointer|recursion|debug|traceback|syntaxerror|typeerror|recursionerror|function|loop|array|hashmap|linked list)\b/i,
      /```[\s\S]*```/,
    ],
  },
  {
    subject: 'Computer Science',
    patterns: [
      /\b(big-?o|time complexity|space complexity|algorithm|data structure|binary tree|merge sort|quicksort|graph theory|dijkstra|dynamic programming|operating system|deadlock|tcp|udp|http|dns|compiler|cpu|cache|database normalization|acid|turing|automata|cryptography)\b/i,
    ],
  },
  {
    subject: 'Physics',
    patterns: [
      /\b(newton|kinematics|velocity|acceleration|momentum|force|gravity|thermodynamics|entropy|optics|refraction|diffraction|quantum|relativity|electromagnetism|ohm'?s law|voltage|current|resistance|resistor|circuit|capacitor|magnetic field|wavelength|frequency|joule|watt|kinetic energy|potential energy|celsius|fahrenheit|kelvin|\d+\s*°?\s*[cfk]\s*(?:to|in)\s*°?\s*[cfk])\b/i,
    ],
  },
  {
    subject: 'Chemistry',
    patterns: [
      /\b(molecule|atom|electron|proton|neutron|periodic table|covalent|ionic bond|stoichiometry|molarity|mole|ph scale|acid|base|redox|oxidation|reduction|organic chemistry|alkane|alkene|benzene|catalyst|enthalpy|gibbs|equilibrium|titration|chemical equation|avogadro)\b/i,
    ],
  },
  {
    subject: 'Biology',
    patterns: [
      /\b(cell|mitosis|meiosis|dna|rna|genetics|photosynthesis|respiration|enzyme|protein synthesis|ribosome|mitochondria|evolution|natural selection|ecosystem|taxonomy|nervous system|neuron|hormone|immune system|bacteria|virus|chromosome|allele|punnett|osmosis|chloroplast|calvin cycle)\b/i,
    ],
  },
  {
    subject: 'Mathematics',
    patterns: [
      /\b(algebra|calculus|derivative|integral|matrix|matrices|eigenvalue|quadratic|polynomial|trigonometry|sine|cosine|tangent|logarithm|probability|statistics|variance|standard deviation|permutation|combination|geometry|pythagoras|theorem|equation|fraction|percentage|solve for x|factorize|simplify)\b/i,
      /\d+\s*[\+\-\*\/\^]\s*\d+/,
      /\bx\^2\b|\bsqrt\(/i,
      /\d+\s*%\s*of\s*\d+/i,
    ],
  },
  {
    subject: 'Economics',
    patterns: [
      /\b(microeconomics|macroeconomics|gdp|inflation|deflation|supply and demand|elasticity|opportunity cost|monetary policy|fiscal policy|central bank|interest rate|monopoly|oligopoly|comparative advantage|balance of payments|keynesian|marginal utility)\b/i,
    ],
  },
  {
    subject: 'History',
    patterns: [
      /\b(world war|industrial revolution|french revolution|renaissance|cold war|roman empire|mughal|ancient egypt|mesopotamia|colonialism|treaty of versailles|civil rights|dynasty|empire|medieval|historian|century bce|century ce)\b/i,
    ],
  },
  {
    subject: 'Geography',
    patterns: [
      /\b(plate tectonics|latitude|longitude|monsoon|climate zone|biome|watershed|glacier|volcano|volcanic|earthquake|topography|erosion|atmosphere|troposphere|ocean current|continent|capital city|equator|tropic of cancer)\b/i,
    ],
  },
  {
    subject: 'English',
    patterns: [
      /\b(grammar|metaphor|simile|alliteration|syntax|thesis statement|essay|shakespeare|poem|poetry|literary device|passive voice|active voice|clause|participle|punctuation|rhetoric|comprehension|vocabulary|synonym|antonym)\b/i,
    ],
  },
];

export function detectSubject(
  query: string,
  explicitSubject?: BujjiSubject,
  goalCategory?: string
): Exclude<BujjiSubject, 'Auto'> {
  if (explicitSubject && explicitSubject !== 'Auto') {
    return explicitSubject;
  }

  let bestSubject: Exclude<BujjiSubject, 'Auto'> | null = null;
  let bestScore = 0;

  for (const entry of SUBJECT_PATTERNS) {
    let score = 0;
    for (const rx of entry.patterns) {
      if (rx.test(query)) {
        score += entry.priority || 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestSubject = entry.subject;
    }
  }

  if (bestSubject) {
    return bestSubject;
  }

  if (goalCategory) {
    const cat = goalCategory.toLowerCase();
    if (cat.includes('program') || cat.includes('dev') || cat.includes('python')) return 'Programming';
    if (cat.includes('data') || cat.includes('ai') || cat.includes('computer')) return 'Computer Science';
    if (cat.includes('math')) return 'Mathematics';
    if (cat.includes('language')) return 'Languages';
    if (cat.includes('exam')) return 'Exam Prep';
    if (cat.includes('business') || cat.includes('finance') || cat.includes('econ')) return 'Economics';
  }

  return 'General Knowledge';
}

export function detectIntent(query: string, hasHomeworkAttempt = false): BujjiIntent {
  const q = query.trim().toLowerCase();

  if (hasHomeworkAttempt || /\b(check my answer|is my solution right|where did i go wrong|grade my work|homework)\b/i.test(q)) {
    return 'homework_help';
  }
  if (/\b(translate|how do you say|in spanish|in french|in hindi|in german|in japanese|in tamil|in telugu)\b/i.test(q)) {
    return 'translation';
  }
  if (/\b(quiz me|generate a quiz|practice test|mcq|multiple choice|true or false|fill in the blank|test my knowledge)\b/i.test(q)) {
    return 'quiz';
  }
  if (/\b(study plan|schedule|roadmap|what should i study next|daily plan|study routine|weak topics)\b/i.test(q)) {
    return 'study_planning';
  }
  if (/\b(revise|revision|flashcard|cheat sheet|memorize|recap)\b/i.test(q)) {
    return 'revision';
  }
  if (/\b(summarize|summary|tldr|tl;dr|key takeaways|extract key)\b/i.test(q)) {
    return 'summary';
  }
  if (/\b(compare|difference between|vs\.?|versus|contrast|pros and cons)\b/i.test(q)) {
    return 'comparison';
  }
  if (/\b(debug|fix this code|write a function|implement|refactor|code example|syntax error|runtime error|big-?o)\b/i.test(q) || /```/.test(q)) {
    return 'code_assistance';
  }
  if (
    /\b(calculate|compute|solve|evaluate|convert|find x|derivative of|integral of|roots of)\b/i.test(q) ||
    /\b(what is|how much is)\s+\d/i.test(q) ||
    /\d+\s*%\s*of\s*\d+/i.test(q) ||
    /\d+\s*[\+\-\*\/\^]\s*\d+/.test(q)
  ) {
    return 'calculation';
  }
  if (/^(what is|define|definition of|meaning of|who is|when was|where is)\b/i.test(q) && q.length < 95) {
    return 'definition';
  }
  return 'explanation';
}

export function classifyQuestion(params: {
  query: string;
  mode: BujjiResponseMode;
  explicitSubject?: BujjiSubject;
  goalCategory?: string;
  hasHomeworkAttempt?: boolean;
  hasKnowledgeBase?: boolean;
}): BujjiRouteDecision {
  const { query, mode, explicitSubject, goalCategory, hasHomeworkAttempt = false, hasKnowledgeBase = false } = params;
  const subject = detectSubject(query, explicitSubject, goalCategory);
  const intent = detectIntent(query, hasHomeworkAttempt);
  const qLen = query.trim().length;

  const isComplexSignal =
    hasHomeworkAttempt ||
    mode === 'deep_learning' ||
    mode === 'exam_prep' ||
    mode === 'step_by_step' ||
    intent === 'code_assistance' ||
    intent === 'homework_help' ||
    intent === 'study_planning' ||
    /\b(prove|proof|derive|derivation|step by step|step-by-step|debug|architecture|edge case|multi-step|quadratic|integral|differential|stoichiometry|mechanism|analyze|evaluate)\b/i.test(query) ||
    qLen > 240;

  const isSimpleSignal =
    !isComplexSignal &&
    (mode === 'quick_answer' ||
      ((intent === 'definition' || intent === 'translation') && qLen < 120) ||
      (intent === 'calculation' && qLen < 80 && !/\b(proof|derive|integrate|differentiate|matrix)\b/i.test(query)));

  const complexity = isComplexSignal ? 'complex' : isSimpleSignal ? 'simple' : 'standard';

  // Smart model routing:
  // - Lightweight ultra-fast model (gemini-3.1-flash-lite, MINIMAL thinking) for simple lookups/definitions/translations/quick answers
  // - Capable reasoning model (gemini-4-hydrogen, LOW/MEDIUM/HIGH thinking) for standard & complex STEM, coding, homework, and exam prep
  let model: BujjiRouteDecision['model'] = 'gemini-4-hydrogen';
  let thinkingDepth: BujjiRouteDecision['thinkingDepth'] = 'LOW';
  let reason = 'Balanced educational reasoning route';

  if (complexity === 'simple') {
    model = 'gemini-3.1-flash-lite';
    thinkingDepth = 'MINIMAL';
    reason = 'Fast lightweight route for concise direct answer';
  } else if (complexity === 'complex') {
    model = 'gemini-4-hydrogen';
    thinkingDepth = mode === 'deep_learning' || mode === 'exam_prep' || hasHomeworkAttempt ? 'MEDIUM' : 'LOW';
    reason = 'Capable reasoning route for step-by-step accuracy';
  }

  const needsMathVerification =
    intent === 'calculation' ||
    subject === 'Mathematics' ||
    subject === 'Physics' ||
    subject === 'Chemistry' ||
    /\d+\s*[\+\-\*\/\^%]\s*\d+/.test(query);

  const needsRetrieval =
    Boolean(hasKnowledgeBase) && intent !== 'translation';

  return {
    intent,
    subject,
    complexity,
    model,
    thinkingDepth,
    needsMathVerification,
    needsRetrieval,
    reason,
  };
}

// ==================== 2. SAFE COMPUTATIONAL MATH VERIFIER ====================
// Pure recursive-descent parser — ZERO eval(), ZERO Function().

type Token =
  | { type: 'num'; value: number }
  | { type: 'op'; value: string }
  | { type: 'fn'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

const MATH_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

const MATH_FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: (degOrRad) => Math.sin(degOrRad),
  cos: (degOrRad) => Math.cos(degOrRad),
  tan: (degOrRad) => Math.tan(degOrRad),
  log: (x) => Math.log10(x),
  log10: (x) => Math.log10(x),
  ln: (x) => Math.log(x),
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
};

function tokenizeMath(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').trim();

  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/\d|\./.test(ch)) {
      let numStr = '';
      let dots = 0;
      while (i < s.length && (/\d/.test(s[i]) || s[i] === '.')) {
        if (s[i] === '.') dots += 1;
        if (dots > 1) return null;
        numStr += s[i];
        i += 1;
      }
      const val = Number(numStr);
      if (!Number.isFinite(val)) return null;
      tokens.push({ type: 'num', value: val });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < s.length && /[a-zA-Z0-9]/.test(s[i])) {
        ident += s[i].toLowerCase();
        i += 1;
      }
      if (ident in MATH_CONSTANTS) {
        tokens.push({ type: 'num', value: MATH_CONSTANTS[ident] });
      } else if (ident in MATH_FUNCTIONS) {
        tokens.push({ type: 'fn', value: ident });
      } else {
        return null;
      }
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i += 1;
      continue;
    }
    if ('+-*/^%'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }
    return null;
  }

  return tokens.length > 0 ? tokens : null;
}

export function safeEvaluateArithmetic(expression: string): number | null {
  if (!expression || expression.length > 120) return null;
  const tokens = tokenizeMath(expression);
  if (!tokens) return null;

  let pos = 0;

  function peek(): Token | undefined {
    return tokens![pos];
  }

  function consume(): Token {
    return tokens![pos++];
  }

  function parseExpression(): number {
    let left = parseTerm();
    while (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value.match(/^[+-]$/)) {
      const op = (consume() as { type: 'op'; value: string }).value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value.match(/^[*\/%]$/)) {
      const op = (consume() as { type: 'op'; value: string }).value;
      const right = parsePower();
      if ((op === '/' || op === '%') && right === 0) {
        throw new Error('Division by zero');
      }
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  }

  function parsePower(): number {
    let base = parseUnary();
    if (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value === '^') {
      consume();
      const exponent = parsePower();
      if (Math.abs(exponent) > 200) throw new Error('Exponent too large');
      base = Math.pow(base, exponent);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value === '-') {
      consume();
      return -parseUnary();
    }
    if (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value === '+') {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end');
    if (tok.type === 'num') {
      consume();
      return tok.value;
    }
    if (tok.type === 'fn') {
      consume();
      if (peek()?.type !== 'lparen') throw new Error('Expected (');
      consume();
      const arg = parseExpression();
      if (peek()?.type !== 'rparen') throw new Error('Expected )');
      consume();
      return MATH_FUNCTIONS[tok.value](arg);
    }
    if (tok.type === 'lparen') {
      consume();
      const val = parseExpression();
      if (peek()?.type !== 'rparen') throw new Error('Expected )');
      consume();
      return val;
    }
    throw new Error('Invalid token');
  }

  try {
    const result = parseExpression();
    if (pos !== tokens.length || !Number.isFinite(result)) return null;
    return Math.round(result * 1e10) / 1e10;
  } catch {
    return null;
  }
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(6)));
}

export function verifyMathInQuery(query: string): MathVerificationResult | null {
  const q = query.trim();

  // 1. Percentage: "what is 15% of 240"
  const pctMatch = q.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
  if (pctMatch) {
    const p = Number(pctMatch[1]);
    const base = Number(pctMatch[2]);
    if (Number.isFinite(p) && Number.isFinite(base)) {
      const ans = Math.round(((p / 100) * base) * 1e10) / 1e10;
      return {
        expression: `${p}% of ${base}`,
        verifiedAnswer: formatNum(ans),
        method: 'percentage',
        steps: [
          `Convert ${p}% to a decimal: ${p} / 100 = ${formatNum(p / 100)}`,
          `Multiply by ${base}: ${formatNum(p / 100)} × ${base} = ${formatNum(ans)}`,
        ],
      };
    }
  }

  // 2. Quadratic equation: ax^2 + bx + c = 0
  const quadMatch = q.replace(/\s+/g, '').match(/([+-]?\d*)x\^2([+-]\d*)x([+-]\d+)=0/i);
  if (quadMatch) {
    const parseCoeff = (s: string) => {
      if (s === '' || s === '+') return 1;
      if (s === '-') return -1;
      return Number(s);
    };
    const a = parseCoeff(quadMatch[1]);
    const b = parseCoeff(quadMatch[2]);
    const c = Number(quadMatch[3]);
    if (a !== 0 && Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
      const aStr = a === 1 ? 'x²' : a === -1 ? '-x²' : `${a}x²`;
      const bStr = b === 0 ? '' : b > 0 ? ` + ${b === 1 ? '' : b}x` : ` - ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`;
      const cStr = c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${Math.abs(c)}`;
      const prettyQuad = `${aStr}${bStr}${cStr} = 0`;
      const d = b * b - 4 * a * c;
      if (d > 0) {
        const r1 = (-b + Math.sqrt(d)) / (2 * a);
        const r2 = (-b - Math.sqrt(d)) / (2 * a);
        return {
          expression: prettyQuad,
          verifiedAnswer: `x = ${formatNum(r1)} or x = ${formatNum(r2)}`,
          method: 'quadratic',
          steps: [
            `Discriminant Δ = b² - 4ac = (${b})² - 4(${a})(${c}) = ${formatNum(d)}`,
            `Roots: x = (${-b} ± √${formatNum(d)}) / ${2 * a}`,
            `x₁ = ${formatNum(r1)}, x₂ = ${formatNum(r2)}`,
          ],
        };
      }
      if (d === 0) {
        const r = -b / (2 * a);
        return {
          expression: prettyQuad,
          verifiedAnswer: `x = ${formatNum(r)} (repeated root)`,
          method: 'quadratic',
          steps: [
            `Discriminant Δ = b² - 4ac = 0`,
            `Repeated root: x = ${-b} / ${2 * a} = ${formatNum(r)}`,
          ],
        };
      }
      const real = -b / (2 * a);
      const imag = Math.sqrt(-d) / (2 * Math.abs(a));
      return {
        expression: prettyQuad,
        verifiedAnswer: `x = ${formatNum(real)} ± ${formatNum(imag)}i`,
        method: 'quadratic',
        steps: [
          `Discriminant Δ = b² - 4ac = ${formatNum(d)} < 0 (complex conjugate roots)`,
          `x = ${formatNum(real)} ± ${formatNum(imag)}i`,
        ],
      };
    }
  }

  // 3. Linear equation: ax + b = c
  const linMatch = q.replace(/\s+/g, '').match(/([+-]?\d*)x([+-]\d+)=([+-]?\d+)/i);
  if (linMatch && !/x\^/i.test(q)) {
    const a = linMatch[1] === '' || linMatch[1] === '+' ? 1 : linMatch[1] === '-' ? -1 : Number(linMatch[1]);
    const b = Number(linMatch[2]);
    const c = Number(linMatch[3]);
    if (a !== 0 && Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
      const x = (c - b) / a;
      const aStr = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
      const bStr = b >= 0 ? ` + ${b}` : ` - ${Math.abs(b)}`;
      return {
        expression: `${aStr}${bStr} = ${c}`,
        verifiedAnswer: `x = ${formatNum(x)}`,
        method: 'linear',
        steps: [
          `Isolate the x term: ${aStr} = ${c} ${b >= 0 ? '-' : '+'} ${Math.abs(b)} = ${formatNum(c - b)}`,
          `Divide by ${a}: x = ${formatNum(c - b)} / ${a} = ${formatNum(x)}`,
        ],
      };
    }
  }

  // 4. Temperature unit conversions (C <-> F <-> K)
  const tempMatch = q.match(/(-?\d+(?:\.\d+)?)\s*°?\s*(celsius|c|fahrenheit|f|kelvin|k)\s*(?:to|in)\s*(celsius|c|fahrenheit|f|kelvin|k)\b/i);
  if (tempMatch) {
    const val = Number(tempMatch[1]);
    const from = tempMatch[2][0].toLowerCase();
    const to = tempMatch[3][0].toLowerCase();
    if (from !== to && Number.isFinite(val)) {
      let cVal = val;
      if (from === 'f') cVal = ((val - 32) * 5) / 9;
      if (from === 'k') cVal = val - 273.15;
      let out = cVal;
      if (to === 'f') out = (cVal * 9) / 5 + 32;
      if (to === 'k') out = cVal + 273.15;
      const unitLabel = to === 'c' ? '°C' : to === 'f' ? '°F' : 'K';
      return {
        expression: `${val} ${from.toUpperCase()} → ${to.toUpperCase()}`,
        verifiedAnswer: `${formatNum(out)} ${unitLabel}`,
        method: 'unit_conversion',
        steps: [`Converted ${val} ${from.toUpperCase()} to ${formatNum(out)} ${unitLabel}`],
      };
    }
  }

  // 5. Direct arithmetic expression inside query
  const exprCandidates = q.match(/(?:(?:sqrt|abs|sin|cos|tan|log|ln)\s*\([^)]+\)|[\d.(][\d\s.+\-*/^%×÷−()]{2,}[\d)])/gi);
  if (exprCandidates) {
    for (const candidate of exprCandidates) {
      if (!/[+\-*/^%×÷−]|sqrt|log|ln|sin|cos|tan/i.test(candidate)) continue;
      const evaluated = safeEvaluateArithmetic(candidate);
      if (evaluated !== null) {
        return {
          expression: candidate.trim(),
          verifiedAnswer: formatNum(evaluated),
          method: 'arithmetic',
          steps: [`Evaluated ${candidate.trim()} = ${formatNum(evaluated)}`],
        };
      }
    }
  }

  return null;
}

// ==================== 3. CURRICULUM-AWARE RAG ENGINE ====================

export function chunkDocument(params: {
  docId: string;
  docTitle: string;
  subject: string;
  chapter: string;
  content: string;
  maxChunkChars?: number;
  overlapChars?: number;
}): KnowledgeChunk[] {
  const {
    docId,
    docTitle,
    subject,
    chapter,
    content,
    maxChunkChars = 650,
    overlapChars = 120,
  } = params;

  const cleaned = content
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return [];

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = '';

  for (const para of paragraphs) {
    if (para.length > maxChunkChars) {
      if (buffer.trim()) {
        chunks.push(buffer.trim());
        buffer = '';
      }
      // Split large paragraph on sentence boundaries
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sentenceBuf = '';
      for (const sentence of sentences) {
        if ((sentenceBuf + ' ' + sentence).trim().length > maxChunkChars) {
          if (sentenceBuf.trim()) {
            chunks.push(sentenceBuf.trim());
            const tail = sentenceBuf.trim().slice(-overlapChars);
            sentenceBuf = `${tail} ${sentence}`.trim();
          } else {
            // Hard slice oversized sentence
            for (let start = 0; start < sentence.length; start += maxChunkChars - overlapChars) {
              chunks.push(sentence.slice(start, start + maxChunkChars).trim());
            }
          }
        } else {
          sentenceBuf = `${sentenceBuf} ${sentence}`.trim();
        }
      }
      if (sentenceBuf.trim()) {
        buffer = sentenceBuf.trim();
      }
      continue;
    }

    if ((buffer + '\n\n' + para).trim().length > maxChunkChars) {
      if (buffer.trim()) {
        chunks.push(buffer.trim());
        const tail = buffer.trim().slice(-overlapChars);
        buffer = `${tail}\n\n${para}`.trim();
      } else {
        buffer = para;
      }
    } else {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
    }
  }

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks.map((text, idx) => ({
    id: `${docId}_c${idx + 1}`,
    docId,
    docTitle,
    subject,
    chapter,
    chunkIndex: idx,
    text,
  }));
}

export function cosineSimilarity(a?: number[], b?: number[]): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'for', 'of', 'to', 'in', 'with',
  'what', 'how', 'why', 'when', 'where', 'can', 'you', 'explain', 'me', 'about', 'does', 'do',
  'are', 'was', 'were', 'be', 'been', 'this', 'that', 'these', 'those', 'from', 'by', 'as', 'it',
]);

function extractTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

export function lexicalRelevanceScore(query: string, chunkText: string, metadataText = ''): number {
  const qTerms = extractTerms(query);
  if (qTerms.length === 0) return 0;

  const haystack = `${chunkText} ${metadataText}`.toLowerCase();
  const docTerms = new Set(extractTerms(haystack));

  let matched = 0;
  for (const term of qTerms) {
    if (docTerms.has(term) || haystack.includes(term)) {
      matched += 1;
    }
  }

  const coverage = matched / qTerms.length;
  // Exact phrase bonus
  const normalizedQuery = qTerms.join(' ');
  const phraseBonus = normalizedQuery.length >= 6 && haystack.includes(normalizedQuery) ? 0.18 : 0;

  return Math.min(1, coverage * 0.85 + phraseBonus);
}

export function hybridRetrieve(params: {
  query: string;
  queryEmbedding?: number[];
  chunks: KnowledgeChunk[];
  subjectFilter?: string;
  topK?: number;
  minScore?: number;
}): RetrievedSource[] {
  const {
    query,
    queryEmbedding,
    chunks,
    subjectFilter,
    topK = 4,
    minScore = 0.24,
  } = params;

  if (!chunks.length || !query.trim()) return [];

  const scored: RetrievedSource[] = [];

  for (const chunk of chunks) {
    const hasVectors = Boolean(queryEmbedding?.length && chunk.embedding?.length);
    const semanticScore = hasVectors ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0;
    const lexicalScore = lexicalRelevanceScore(query, chunk.text, `${chunk.docTitle} ${chunk.chapter} ${chunk.subject}`);

    const subjectBoost =
      subjectFilter &&
      subjectFilter !== 'Auto' &&
      chunk.subject.toLowerCase() === subjectFilter.toLowerCase()
        ? 0.08
        : 0;

    const combined = hasVectors
      ? Math.min(1, semanticScore * 0.68 + lexicalScore * 0.32 + subjectBoost)
      : Math.min(1, lexicalScore + subjectBoost);

    if (combined >= minScore) {
      scored.push({
        chunkId: chunk.id,
        docId: chunk.docId,
        docTitle: chunk.docTitle,
        subject: chunk.subject,
        chapter: chunk.chapter,
        excerpt: chunk.text.length > 360 ? `${chunk.text.slice(0, 357)}...` : chunk.text,
        score: Math.round(combined * 1000) / 1000,
        semanticScore: Math.round(semanticScore * 1000) / 1000,
        lexicalScore: Math.round(lexicalScore * 1000) / 1000,
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function evaluateRetrievalQuality(
  results: RetrievedSource[],
  expectedDocIds: string[],
  k = 3
): { precisionAtK: number; mrr: number; hit: boolean } {
  const top = results.slice(0, k);
  const expectedSet = new Set(expectedDocIds);
  if (top.length === 0 || expectedSet.size === 0) {
    return { precisionAtK: 0, mrr: 0, hit: false };
  }

  let hits = 0;
  let firstRank = 0;
  top.forEach((item, idx) => {
    if (expectedSet.has(item.docId)) {
      hits += 1;
      if (firstRank === 0) firstRank = idx + 1;
    }
  });

  return {
    precisionAtK: Math.round((hits / top.length) * 1000) / 1000,
    mrr: firstRank > 0 ? Math.round((1 / firstRank) * 1000) / 1000 : 0,
    hit: firstRank > 0,
  };
}

// ==================== 4. USER-SCOPED SEMANTIC CACHE ====================

interface CacheEntry {
  key: string;
  userId: string;
  kbSignature: string;
  mode: BujjiResponseMode;
  embedding?: number[];
  responseText: string;
  followUps: string[];
  sources: RetrievedSource[];
  mathCheck: MathVerificationResult | null;
  route: BujjiRouteDecision;
  createdAt: number;
}

export class BujjiSemanticCache {
  private entries = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries = 150, ttlMs = 10 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  private normalize(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  makeKey(userId: string, query: string, mode: BujjiResponseMode, level: DifficultyLevel, kbSignature: string): string {
    return `${userId}::${mode}::${level}::${kbSignature}::${this.normalize(query)}`;
  }

  get(params: {
    userId: string;
    query: string;
    mode: BujjiResponseMode;
    level: DifficultyLevel;
    kbSignature: string;
    queryEmbedding?: number[];
  }): CacheEntry | null {
    const now = Date.now();
    const exactKey = this.makeKey(params.userId, params.query, params.mode, params.level, params.kbSignature);
    const direct = this.entries.get(exactKey);
    if (direct) {
      if (now - direct.createdAt <= this.ttlMs) {
        return direct;
      }
      this.entries.delete(exactKey);
    }

    // Semantic hit strictly scoped to the same user, mode, and KB state
    if (params.queryEmbedding?.length) {
      for (const [k, entry] of this.entries.entries()) {
        if (now - entry.createdAt > this.ttlMs) {
          this.entries.delete(k);
          continue;
        }
        if (
          entry.userId === params.userId &&
          entry.mode === params.mode &&
          entry.kbSignature === params.kbSignature &&
          entry.embedding?.length
        ) {
          const sim = cosineSimilarity(params.queryEmbedding, entry.embedding);
          if (sim >= 0.96) {
            return entry;
          }
        }
      }
    }

    return null;
  }

  set(entry: Omit<CacheEntry, 'createdAt'>): void {
    if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey) this.entries.delete(oldestKey);
    }
    this.entries.set(entry.key, { ...entry, createdAt: Date.now() });
  }

  invalidateUser(userId: string): void {
    for (const [k, entry] of this.entries.entries()) {
      if (entry.userId === userId) {
        this.entries.delete(k);
      }
    }
  }
}

// ==================== 5. CONTEXT WINDOW MANAGEMENT ====================

export function trimConversationHistory(
  history: BujjiChatTurn[],
  maxTurns = 8,
  maxTotalChars = 5200
): BujjiChatTurn[] {
  const recent = history.slice(-maxTurns);
  const kept: BujjiChatTurn[] = [];
  let totalChars = 0;

  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const turn = recent[i];
    const clippedContent = turn.content.length > 1200 ? `${turn.content.slice(0, 1197)}...` : turn.content;
    if (totalChars + clippedContent.length > maxTotalChars && kept.length > 0) {
      break;
    }
    kept.unshift({ role: turn.role, content: clippedContent });
    totalChars += clippedContent.length;
  }

  return kept;
}

// ==================== 6. BUJJI MASTER SYSTEM PROMPT ====================

const RESPONSE_MODE_INSTRUCTIONS: Record<BujjiResponseMode, string> = {
  quick_answer:
    'MODE — QUICK ANSWER: Lead immediately with the exact direct answer in 1–2 crisp sentences, followed by at most 3 ultra-concise bullet points or the key formula. Zero fluff.',
  explain_simply:
    'MODE — EXPLAIN SIMPLY: Lead with a crystal-clear plain-English direct answer, then explain using a relatable everyday analogy, bold key terms, and one short concrete example.',
  step_by_step:
    'MODE — STEP-BY-STEP: Lead with the final answer or core goal, then break the full solution into clearly numbered steps (1, 2, 3...), showing formulas, given values, units, and intermediate checks.',
  deep_learning:
    'MODE — DEEP LEARNING: Lead with the core thesis/answer, then provide structured sections covering underlying principles, formal equations/code, real-world applications, edge cases, and common misconceptions.',
  exam_prep:
    'MODE — EXAM PREPARATION: Lead with the high-yield exam answer, then include key definitions, formulas/mnemonics, common exam traps to avoid, and 1 quick self-check practice question at the end.',
};

const LEVEL_INSTRUCTIONS: Record<DifficultyLevel, string> = {
  Beginner:
    'LEARNER LEVEL — BEGINNER: Use everyday language, build foundational intuition, and introduce one idea at a time without jargon overload.',
  Intermediate:
    'LEARNER LEVEL — INTERMEDIATE: Connect relationships between concepts, include worked examples, and highlight practical applications.',
  Advanced:
    'LEARNER LEVEL — ADVANCED: Explain deeper theoretical principles, use accurate technical terminology, and address edge cases and trade-offs.',
};

export function buildBujjiSystemInstruction(params: {
  mode: BujjiResponseMode;
  level: DifficultyLevel;
  route: BujjiRouteDecision;
  curriculum?: string;
  memory?: Partial<BujjiLearningMemory> | null;
  goalContext?: {
    goalTitle?: string;
    completedTasks?: string[];
    upcomingTasks?: string[];
  };
  sources?: RetrievedSource[];
  mathCheck?: MathVerificationResult | null;
  homeworkAttempt?: string;
}): string {
  const { mode, level, route, curriculum, memory, goalContext, sources, mathCheck, homeworkAttempt } = params;

  const memoryLines: string[] = [];
  if (curriculum) memoryLines.push(`- Stated Curriculum/Syllabus: ${curriculum}`);
  if (memory?.weakTopics?.length) memoryLines.push(`- Tracked Weak Topics to reinforce gently: ${memory.weakTopics.slice(0, 8).join(', ')}`);
  if (memory?.strongTopics?.length) memoryLines.push(`- Tracked Strong Topics: ${memory.strongTopics.slice(0, 8).join(', ')}`);
  if (memory?.studyPreferences) memoryLines.push(`- Stated Learning Preferences: ${memory.studyPreferences}`);
  if (memory?.recentQuizResults?.length) {
    const recentSummary = memory.recentQuizResults
      .slice(0, 3)
      .map((q) => `${q.topic} (${q.scorePercent}%${q.missedConcepts.length ? `, missed: ${q.missedConcepts.slice(0, 2).join('; ')}` : ''})`)
      .join(' | ');
    memoryLines.push(`- Recent Quiz Performance: ${recentSummary}`);
  }
  if (goalContext?.goalTitle) memoryLines.push(`- Active StudyDuo Goal: ${goalContext.goalTitle}`);
  if (goalContext?.completedTasks?.length) {
    memoryLines.push(`- Recently Completed Tasks: ${goalContext.completedTasks.slice(0, 8).join(', ')}`);
  }

  const ragSection =
    sources && sources.length > 0
      ? `VERIFIED UPLOADED STUDY MATERIALS (Prioritize these when relevant and cite them naturally as [Source 1], [Source 2], etc.):
${sources
  .map(
    (s, i) =>
      `[Source ${i + 1}: "${s.docTitle}" | Subject: ${s.subject}${s.chapter ? ` | Chapter: ${s.chapter}` : ''}]
${s.excerpt}`
  )
  .join('\n\n')}`
      : 'UPLOADED STUDY MATERIALS: None matched this query. Answer using verified general academic knowledge, and NEVER claim to have read an unprovided document or syllabus.';

  const mathSection = mathCheck
    ? `COMPUTATIONAL VERIFICATION RESULT (Pre-checked deterministically):
Expression: ${mathCheck.expression}
Verified Answer: ${mathCheck.verifiedAnswer}
Check Steps: ${mathCheck.steps.join(' ; ')}
Use this verified calculation to ensure 100% arithmetic accuracy, while explaining the full reasoning clearly.`
    : '';

  const homeworkSection = homeworkAttempt
    ? `HOMEWORK HELPER TASK:
The student provided their own solution attempt:
"""
${homeworkAttempt}
"""
Carefully verify their attempt:
1. State clearly whether their answer is **Correct**, **Partially Correct**, or **Needs Revision**.
2. Pinpoint the exact misconception or step where an error occurred (if any).
3. Walk through the correct step-by-step method and teach the underlying concept encouragingly.`
    : '';

  return `You are Bujji, the intelligent personal AI learning companion inside StudyDuo.
Your mission is to help students understand, practice, remember, and master academic subjects with speed, clarity, and academic accuracy.

ROUTING CONTEXT:
- Detected Subject: ${route.subject}
- Detected Intent: ${route.intent}
- ${RESPONSE_MODE_INSTRUCTIONS[mode]}
- ${LEVEL_INSTRUCTIONS[level]}

PRESENTATION & FORMATTING RULES (STRICT):
1. Lead immediately with the direct answer (avoid filler greetings like "Great question!" or "Sure, I can help!").
2. Format cleanly with Markdown: use **bold** for key terms, short paragraphs, headings (## / ###) for multi-part answers, numbered lists for steps, bullet lists for properties, Markdown tables for comparisons, fenced code blocks with language tags for code, and LaTeX math ($inline$ or $$block$$) for formulas and equations.
3. Never return an unformatted wall of text. Keep explanations concise, age-appropriate, encouraging, and crystal clear.
4. For Mathematics & Science: show the formula, list given values, compute carefully, check units, and highlight the final answer clearly.
5. Distinguish honestly between verified uploaded material, general academic knowledge, and uncertainty. Never fabricate citations, URLs, or student history. Ask a brief clarifying question only if curriculum/grade materially changes the answer.
6. At the very end of your response, include a final line in this exact format with 3 short contextual follow-up questions separated by |:
FOLLOW_UPS: Follow-up question 1? | Follow-up question 2? | Follow-up question 3?

${memoryLines.length > 0 ? `VERIFIED STUDENT CONTEXT (Use naturally without inventing unstated history):\n${memoryLines.join('\n')}` : 'STUDENT CONTEXT: No prior learning history provided for this query. Do not invent history.'}

${ragSection}
${mathSection}
${homeworkSection}`.trim();
}

export function extractFollowUpsFromText(rawText: string): { cleanText: string; followUps: string[] } {
  const match = rawText.match(/\n?FOLLOW_UPS:\s*(.+)$/im);
  if (!match) {
    return { cleanText: rawText.trim(), followUps: [] };
  }
  const cleanText = rawText.slice(0, match.index).trim();
  const followUps = match[1]
    .split('|')
    .map((s) => s.trim().replace(/^[-•*\d.)\s]+/, ''))
    .filter((s) => s.length >= 4 && s.length <= 110)
    .slice(0, 3);

  return { cleanText, followUps };
}
