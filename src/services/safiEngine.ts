// ============================================================
// اقف ف صفي عشان بصفي — محرك اللعبة (منطق صافي بدون واجهة)
// ------------------------------------------------------------
// القواعد:
//  • لوحة ثابتة من 30 كارت طول الماتش (متتغيرش أبدًا).
//  • كل لاعب عنده لاعب سري من اللوحة، ولكل واحد 7 أدوار (سؤال أو تخمين)،
//    ومدة الدور 20 ثانية.
//  • لو خمّنت اللاعب السري بتاع الخصم صح → تكسب فورًا.
//  • لو الأدوار خلصت من غير تخمين صح → كل واحد يثبّت تخمين نهائي،
//    ويتكشف لاعب كل طرف، والأقرب للاعب السري (أعلى نسبة تشابه) هو الكسبان.
// ============================================================

import type { FootballPlayer, PlayerPosition } from '../types';
import { createSeededRng, seededSample, subSeed } from './seededRandom';

export const SAFI_BOARD_SIZE = 30;
export const SAFI_TURNS_PER_SIDE = 7;
export const SAFI_TURN_SECONDS = 20;
/** احتمال إن الـAI يسأل أفضل سؤال ممكن (الباقي أسئلة مفيدة عشوائية). */
export const SAFI_AI_SKILL = 0.3;

export type SafiSide = 'USER' | 'AI';
export type SafiPhase = 'USER' | 'AI' | 'FINAL' | 'DONE';
export type SafiCategory = 'position' | 'country' | 'club' | 'rating' | 'other';

export interface SafiQuestion {
  id: string;
  category: SafiCategory;
  textAr: string;
  test: (p: FootballPlayer) => boolean;
}

export type SafiLogEntry =
  | { kind: 'QUESTION'; side: SafiSide; questionId: string; textAr: string; answer: boolean }
  | { kind: 'GUESS'; side: SafiSide; playerId: string; playerName: string; correct: boolean }
  | { kind: 'TIMEOUT'; side: SafiSide };

export interface SafiOutcome {
  winner: SafiSide | 'DRAW';
  reason: 'EXACT' | 'CLOSEST' | 'BOTH_EXACT' | 'TIE';
  /** تخمين اللاعب (النهائي أو الأخير) */
  userGuess?: FootballPlayer;
  aiGuess?: FootballPlayer;
  /** نسبة تشابه تخمين كل طرف مع لاعب الطرف التاني السري (0-100) */
  userSimilarity: number;
  aiSimilarity: number;
}

export interface SafiState {
  board: FootballPlayer[];
  questions: SafiQuestion[];
  userSecret: FootballPlayer;
  aiSecret: FootballPlayer;
  phase: SafiPhase;
  userTurnsUsed: number;
  aiTurnsUsed: number;
  askedByUser: string[];
  askedByAi: string[];
  wrongUserGuesses: string[];
  wrongAiGuesses: string[];
  /** المرشحين اللي لسه ممكن يكونوا لاعب المستخدم السري من وجهة نظر الـAI */
  aiCandidates: string[];
  log: SafiLogEntry[];
  outcome?: SafiOutcome;
}

// ------------------------------------------------------------
// أسئلة اللوحة
// ------------------------------------------------------------

const DEF: PlayerPosition[] = ['CB', 'LB', 'RB'];
const MID: PlayerPosition[] = ['CDM', 'CM', 'CAM'];
const ATT: PlayerPosition[] = ['ST', 'RW', 'LW'];

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT';
export function positionGroup(pos: PlayerPosition): PositionGroup {
  if (pos === 'GK') return 'GK';
  if (DEF.includes(pos)) return 'DEF';
  if (MID.includes(pos)) return 'MID';
  return 'ATT';
}

const RETIRED = 'معتزل';
const isLegend = (p: FootballPlayer) => String(p.era || '').toLowerCase().includes('legend');

/**
 * أسئلة نعم/لا مبنية على بيانات اللوحة نفسها. بنحتفظ بس بالأسئلة اللي فعلاً
 * بتفرّق (فيها نعم ولا على الأقل) — عشان محدش يضيع دور على سؤال إجابته معروفة.
 */
export function buildSafiQuestions(board: FootballPlayer[]): SafiQuestion[] {
  const all: SafiQuestion[] = [];

  all.push({ id: 'pos:GK', category: 'position', textAr: 'هل هو حارس مرمى؟', test: (p) => positionGroup(p.position) === 'GK' });
  all.push({ id: 'pos:DEF', category: 'position', textAr: 'هل هو مدافع؟', test: (p) => positionGroup(p.position) === 'DEF' });
  all.push({ id: 'pos:MID', category: 'position', textAr: 'هل هو لاعب وسط؟', test: (p) => positionGroup(p.position) === 'MID' });
  all.push({ id: 'pos:ATT', category: 'position', textAr: 'هل هو مهاجم أو جناح؟', test: (p) => positionGroup(p.position) === 'ATT' });

  const countries = Array.from(new Set(board.map((p) => p.nationalityAr))).sort((a, b) => a.localeCompare(b, 'ar'));
  for (const c of countries) {
    all.push({ id: `country:${c}`, category: 'country', textAr: `هل جنسيته ${c}؟`, test: (p) => p.nationalityAr === c });
  }

  const clubs = Array.from(new Set(board.map((p) => p.clubAr))).sort((a, b) => a.localeCompare(b, 'ar'));
  for (const club of clubs) {
    all.push({
      id: `club:${club}`,
      category: 'club',
      textAr: club === RETIRED ? 'هل هو لاعب معتزل؟' : `هل يلعب حاليًا في ${club}؟`,
      test: (p) => p.clubAr === club
    });
  }

  all.push({ id: 'rating:90', category: 'rating', textAr: 'هل تقييمه 90 أو أكتر؟', test: (p) => p.overallRating >= 90 });
  all.push({ id: 'rating:87', category: 'rating', textAr: 'هل تقييمه 87 أو أكتر؟', test: (p) => p.overallRating >= 87 });
  all.push({ id: 'rating:85', category: 'rating', textAr: 'هل تقييمه 85 أو أكتر؟', test: (p) => p.overallRating >= 85 });

  all.push({ id: 'other:legend', category: 'other', textAr: 'هل هو من أساطير اللعبة؟', test: (p) => isLegend(p) });
  all.push({ id: 'other:icon', category: 'other', textAr: 'هل كارته من فئة «أيقونة» (Icon)؟', test: (p) => p.rarity === 'Icon' });

  return all.filter((q) => {
    const yes = board.filter((p) => q.test(p)).length;
    return yes > 0 && yes < board.length;
  });
}

// ------------------------------------------------------------
// التشابه (لتحديد الأقرب في النهاية)
// ------------------------------------------------------------

const SIMILARITY_MAX = 110;

/** 0–100. 100 = نفس اللاعب بالظبط، وأي لاعب تاني مايعدّيش 99. */
export function similarity(guess: FootballPlayer, secret: FootballPlayer): number {
  if (guess.id === secret.id) return 100;
  let score = 0;
  if (guess.nationalityAr === secret.nationalityAr) score += 30;
  if (guess.clubAr === secret.clubAr) score += guess.clubAr === RETIRED ? 10 : 30;
  if (guess.position === secret.position) score += 25;
  else if (positionGroup(guess.position) === positionGroup(secret.position)) score += 12;
  if (isLegend(guess) === isLegend(secret)) score += 5;
  score += Math.max(0, 20 - Math.abs(guess.overallRating - secret.overallRating) * 2);
  return Math.min(99, Math.round((score / SIMILARITY_MAX) * 100));
}

// ------------------------------------------------------------
// إنشاء اللعبة
// ------------------------------------------------------------

export function createSafiGame(pool: FootballPlayer[], seed: number): SafiState {
  const board = seededSample(pool, Math.min(SAFI_BOARD_SIZE, pool.length), subSeed(seed, 'board'));
  // لاعب سري لكل طرف — مختلفين عن بعض
  const secrets = seededSample(board, 2, subSeed(seed, 'secrets'));
  const userSecret = secrets[0];
  const aiSecret = secrets[1] ?? board[1] ?? board[0];
  return {
    board,
    questions: buildSafiQuestions(board),
    userSecret,
    aiSecret,
    phase: 'USER',
    userTurnsUsed: 0,
    aiTurnsUsed: 0,
    askedByUser: [],
    askedByAi: [],
    wrongUserGuesses: [],
    wrongAiGuesses: [],
    aiCandidates: board.filter((p) => p.id !== aiSecret.id).map((p) => p.id),
    log: []
  };
}

// ------------------------------------------------------------
// دور اللاعب
// ------------------------------------------------------------

/** بعد ما أي طرف يخلّص دوره: نحدد الدور اللي بعده. */
function advance(state: SafiState, justPlayed: SafiSide): SafiState {
  if (state.phase === 'DONE') return state;
  if (justPlayed === 'USER') return { ...state, phase: 'AI' };
  // AI لعب
  if (state.aiTurnsUsed >= SAFI_TURNS_PER_SIDE) return { ...state, phase: 'FINAL' };
  return { ...state, phase: 'USER' };
}

export function userAsk(state: SafiState, questionId: string): SafiState {
  if (state.phase !== 'USER') return state;
  const q = state.questions.find((x) => x.id === questionId);
  if (!q || state.askedByUser.includes(questionId)) return state;
  const answer = q.test(state.aiSecret);
  return advance(
    {
      ...state,
      userTurnsUsed: state.userTurnsUsed + 1,
      askedByUser: [...state.askedByUser, questionId],
      log: [...state.log, { kind: 'QUESTION', side: 'USER', questionId, textAr: q.textAr, answer }]
    },
    'USER'
  );
}

/** تخمين مباشر أثناء اللعب — لو صح الفوز فورًا، لو غلط بيستهلك الدور. */
export function userGuess(state: SafiState, playerId: string): SafiState {
  if (state.phase !== 'USER') return state;
  const guess = state.board.find((p) => p.id === playerId);
  if (!guess || state.wrongUserGuesses.includes(playerId)) return state;
  const correct = guess.id === state.aiSecret.id;
  const next: SafiState = {
    ...state,
    userTurnsUsed: state.userTurnsUsed + 1,
    log: [...state.log, { kind: 'GUESS', side: 'USER', playerId, playerName: guess.nameAr, correct }]
  };
  if (correct) {
    return {
      ...next,
      phase: 'DONE',
      outcome: {
        winner: 'USER',
        reason: 'EXACT',
        userGuess: guess,
        userSimilarity: 100,
        aiSimilarity: 0
      }
    };
  }
  return advance({ ...next, wrongUserGuesses: [...state.wrongUserGuesses, playerId] }, 'USER');
}

/** الوقت خلص من غير حركة. */
export function userTimeout(state: SafiState): SafiState {
  if (state.phase !== 'USER') return state;
  return advance(
    { ...state, userTurnsUsed: state.userTurnsUsed + 1, log: [...state.log, { kind: 'TIMEOUT', side: 'USER' }] },
    'USER'
  );
}

// ------------------------------------------------------------
// دور الـAI
// ------------------------------------------------------------

function pickAiQuestion(state: SafiState, rng: () => number): SafiQuestion | null {
  const candidates = state.board.filter((p) => state.aiCandidates.includes(p.id));
  const scored = state.questions
    .filter((q) => !state.askedByAi.includes(q.id))
    .map((q) => {
      const yes = candidates.filter((p) => q.test(p)).length;
      return { q, split: Math.min(yes, candidates.length - yes) };
    })
    .filter((x) => x.split > 0);
  if (!scored.length) return null;
  scored.sort((a, b) => b.split - a.split);
  // الـAI ذكي بس مش خارق: بيختار أفضل سؤال أحيانًا وسؤال مفيد عشوائي في الباقي.
  if (rng() < SAFI_AI_SKILL) return scored[0].q;
  return scored[Math.floor(rng() * scored.length)].q;
}

export function aiPlay(state: SafiState, rng: () => number): SafiState {
  if (state.phase !== 'AI') return state;
  const candidates = state.board.filter((p) => state.aiCandidates.includes(p.id));
  const shouldGuess = candidates.length === 1 || (candidates.length === 2 && rng() < 0.5);
  const question = shouldGuess ? null : pickAiQuestion(state, rng);

  if (shouldGuess || !question) {
    // تخمين مباشر (أو مفيش سؤال مفيد فاضل)
    const pool = candidates.length ? candidates : state.board.filter((p) => p.id !== state.aiSecret.id);
    const guess = pool[Math.floor(rng() * pool.length)];
    const correct = guess.id === state.userSecret.id;
    const next: SafiState = {
      ...state,
      aiTurnsUsed: state.aiTurnsUsed + 1,
      log: [...state.log, { kind: 'GUESS', side: 'AI', playerId: guess.id, playerName: guess.nameAr, correct }]
    };
    if (correct) {
      return {
        ...next,
        phase: 'DONE',
        outcome: { winner: 'AI', reason: 'EXACT', aiGuess: guess, userSimilarity: 0, aiSimilarity: 100 }
      };
    }
    return advance(
      { ...next, wrongAiGuesses: [...state.wrongAiGuesses, guess.id], aiCandidates: state.aiCandidates.filter((id) => id !== guess.id) },
      'AI'
    );
  }

  const answer = question.test(state.userSecret);
  return advance(
    {
      ...state,
      aiTurnsUsed: state.aiTurnsUsed + 1,
      askedByAi: [...state.askedByAi, question.id],
      aiCandidates: state.aiCandidates.filter((id) => {
        const p = state.board.find((x) => x.id === id)!;
        return question.test(p) === answer;
      }),
      log: [...state.log, { kind: 'QUESTION', side: 'AI', questionId: question.id, textAr: question.textAr, answer }]
    },
    'AI'
  );
}

// ------------------------------------------------------------
// التخمين النهائي والحسم
// ------------------------------------------------------------

/** الـAI بيختار أكتر مرشح "وسطي" (أعلى تشابه مع باقي المرشحين) عشان يقرّب أكتر. */
function aiFinalGuess(state: SafiState, rng: () => number): FootballPlayer {
  const cands = state.board.filter((p) => state.aiCandidates.includes(p.id));
  const pool = cands.length ? cands : state.board.filter((p) => p.id !== state.aiSecret.id);
  let best = pool[0];
  let bestScore = -1;
  for (const c of pool) {
    const s = pool.reduce((sum, o) => sum + (o.id === c.id ? 100 : similarity(c, o)), 0) + rng() * 0.01;
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}

/**
 * التخمين النهائي للمستخدم (بعد ما الأدوار كلها خلصت). بيحسم المباراة.
 * الـUI بيختار لاعب تلقائي لو الوقت خلص.
 */
export function userFinalGuess(state: SafiState, playerId: string, rng: () => number): SafiState {
  if (state.phase !== 'FINAL') return state;
  const userGuessP = state.board.find((p) => p.id === playerId) ?? state.board[0];
  const aiGuessP = aiFinalGuess(state, rng);

  const userSim = similarity(userGuessP, state.aiSecret);
  const aiSim = similarity(aiGuessP, state.userSecret);
  const userExact = userGuessP.id === state.aiSecret.id;
  const aiExact = aiGuessP.id === state.userSecret.id;

  let winner: SafiOutcome['winner'];
  let reason: SafiOutcome['reason'];
  if (userExact && aiExact) {
    winner = 'DRAW';
    reason = 'BOTH_EXACT';
  } else if (userExact || aiExact) {
    winner = userExact ? 'USER' : 'AI';
    reason = 'EXACT';
  } else if (userSim !== aiSim) {
    winner = userSim > aiSim ? 'USER' : 'AI';
    reason = 'CLOSEST';
  } else {
    // نفس التشابه: الأقرب في التقييم يكسب، ولو برضه متساويين → تعادل
    const userDiff = Math.abs(userGuessP.overallRating - state.aiSecret.overallRating);
    const aiDiff = Math.abs(aiGuessP.overallRating - state.userSecret.overallRating);
    if (userDiff !== aiDiff) {
      winner = userDiff < aiDiff ? 'USER' : 'AI';
      reason = 'CLOSEST';
    } else {
      winner = 'DRAW';
      reason = 'TIE';
    }
  }

  return {
    ...state,
    phase: 'DONE',
    log: [
      ...state.log,
      { kind: 'GUESS', side: 'USER', playerId: userGuessP.id, playerName: userGuessP.nameAr, correct: userExact },
      { kind: 'GUESS', side: 'AI', playerId: aiGuessP.id, playerName: aiGuessP.nameAr, correct: aiExact }
    ],
    outcome: { winner, reason, userGuess: userGuessP, aiGuess: aiGuessP, userSimilarity: userSim, aiSimilarity: aiSim }
  };
}

export function createAiRng(seed: number): () => number {
  return createSeededRng(subSeed(seed, 'safi-ai'));
}
