// ============================================================
// ديل أور نو ديل | DEAL OR NO DEAL — Engine (v3)
// ============================================================
// نفس (seed + الأفعال) = نفس اللعبة بالظبط على كل جهاز.
// المحتوى السري للصناديق والكروت الخاصة لا يُرسل كنص حر؛ بل يُشتق
// من الـ seed، وتنتقل فقط الأفعال اللازمة لإعادة البناء.

import { Coach, FootballPlayer, MatchSimulationResult } from '../types';
import {
  DND_CARD_INFO,
  DND_STAGES,
  DndAction,
  DndBox,
  DndCardType,
  DndEvent,
  DndItem,
  DndPools,
  DndPublicView,
  DndSide,
  DndStageKey,
  DndState
} from '../types/dealOrNoDealTypes';
import { createSeededRng, seededShuffle, subSeed } from './seededRandom';
import { simulateDeterministicMatch } from './matchEngine';

export const DND_STAGE_COUNT = DND_STAGES.length;
export const DND_BOXES_PER_SIDE = 4;

const DEF_POS = ['CB', 'LB', 'RB'];
const MID_POS = ['CDM', 'CM', 'CAM'];
const ATT_POS = ['RW', 'LW', 'ST', 'CF'];

const DND_CARD_TYPES: DndCardType[] = ['SHIELD', 'STEAL', 'SWAP'];

interface DndCardPlacement {
  stage: number;
  side: DndSide;
  box: number;
  cardType: DndCardType;
}

/**
 * توزيع الكروت الخاص بالمباراة كلها.
 * - في كل مباراة يوجد 1 إلى 3 كروت فقط (ولا يوجد أي ضمان لظهور الثلاثة).
 * - الكروت من الأنواع الثلاثة بدون تكرار في نفس المباراة.
 * - كل كرت يوضع في جولة مختلفة قدر الإمكان (وبما أن الحد الأقصى 3 والجولات 5، لا يوجد تعارض).
 * - الجولة واللاعب المستفيد والصندوق كلها عشوائية مشتقة من seed المباراة.
 * بالتالي يظل التوزيع ثابتاً لكل الأجهزة في نفس المباراة، لكنه يتغير بالكامل في مباراة جديدة.
 */
function getCardPlacements(seed: number): DndCardPlacement[] {
  const rng = createSeededRng(subSeed(seed, 'dnd-card-distribution-v2'));
  const count = 1 + Math.floor(rng() * DND_CARD_TYPES.length); // 1..3
  const stages = seededShuffle([0, 1, 2, 3, 4], subSeed(seed, 'dnd-card-stages-v2')).slice(0, count);
  const cardTypes = seededShuffle(DND_CARD_TYPES, subSeed(seed, 'dnd-card-types-v2')).slice(0, count);

  return stages.map((stage, i) => ({
    stage,
    side: rng() < 0.5 ? 'A' : 'B',
    box: Math.floor(rng() * DND_BOXES_PER_SIDE),
    cardType: cardTypes[i]
  }));
}

function cardPlacementForStage(seed: number, stage: number): DndCardPlacement | null {
  return getCardPlacements(seed).find((placement) => placement.stage === stage) || null;
}

export const other = (s: DndSide): DndSide => (s === 'A' ? 'B' : 'A');

export function buildPools(players: FootballPlayer[], coaches: Coach[]): DndPools {
  return {
    GK: players.filter((p) => p.position === 'GK'),
    DEF: players.filter((p) => DEF_POS.includes(p.position)),
    MID: players.filter((p) => MID_POS.includes(p.position)),
    ATT: players.filter((p) => ATT_POS.includes(p.position)),
    COACH: coaches
  };
}

export function poolsAreSufficient(pools: DndPools): boolean {
  return DND_STAGES.every((st) => (pools[st.key] as unknown[]).length >= DND_BOXES_PER_SIDE * 2);
}

function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function poolSignature(pools: DndPools): string {
  const parts = DND_STAGES.map((st) => (pools[st.key] as { id: string }[]).map((x) => x.id).sort().join(','));
  return fnv(parts.join('|')).toString(36);
}

export function starterFor(seed: number): DndSide {
  return createSeededRng(subSeed(seed, 'starter'))() < 0.5 ? 'A' : 'B';
}

export function itemId(it: DndItem): string {
  if (it.kind === 'PLAYER') return it.player.id;
  if (it.kind === 'COACH') return it.coach.id;
  return `card:${it.cardType}`;
}

export function itemName(it: DndItem): string {
  if (it.kind === 'PLAYER') return it.player.nameAr;
  if (it.kind === 'COACH') return it.coach.nameAr;
  return DND_CARD_INFO[it.cardType].nameAr;
}

export function itemRating(it: DndItem): number {
  if (it.kind === 'PLAYER') return it.player.overallRating;
  if (it.kind === 'COACH') return it.coach.rating;
  return 0;
}

export function itemCardType(it: DndItem): DndCardType | null {
  return it.kind === 'CARD' ? it.cardType : null;
}

function playerOrCoachItem(key: DndStageKey, x: FootballPlayer | Coach): DndItem {
  return key === 'COACH' ? { kind: 'COACH', coach: x as Coach } : { kind: 'PLAYER', player: x as FootballPlayer };
}

/**
 * كل صناديق الجولة فيها لاعب/مدرب فعلي دائمًا.
 * الكرت اختياري ومخفي جوه الصندوق كـ cardType، يعني الصندوق يفضل شايل اللاعب + الكرت مع بعض.
 */
export function drawStage(seed: number, stage: number, starter: DndSide, pools: DndPools): Record<DndSide, DndBox[]> {
  const key = DND_STAGES[stage].key;
  const src = pools[key] as (FootballPlayer | Coach)[];
  const picked = seededShuffle(src, subSeed(seed, `stage|${stage}`)).slice(0, DND_BOXES_PER_SIDE * 2);
  const placement = cardPlacementForStage(seed, stage);

  const makeBoxes = (arr: (FootballPlayer | Coach)[]): DndBox[] =>
    arr.map((x, i) => ({
      index: i,
      opened: false,
      item: playerOrCoachItem(key, x)
    }));

  const first = makeBoxes(picked.slice(0, DND_BOXES_PER_SIDE));
  const second = makeBoxes(picked.slice(DND_BOXES_PER_SIDE, DND_BOXES_PER_SIDE * 2));
  const draw = starter === 'A' ? { A: first, B: second } : { A: second, B: first };

  if (placement) {
    const target = draw[placement.side];
    if (target[placement.box]) {
      target[placement.box] = { ...target[placement.box], cardType: placement.cardType };
    }
  }

  return draw;
}

export function createInitialState(seed: number, pools: DndPools): DndState {
  const starter = starterFor(seed);
  return {
    seed,
    starter,
    stage: 0,
    turn: starter,
    phase: 'PLAY',
    draw: drawStage(seed, 0, starter, pools),
    opened: [],
    gambled: false,
    acquired: { A: Array(DND_STAGE_COUNT).fill(null), B: Array(DND_STAGE_COUNT).fill(null) },
    cards: { A: [], B: [] },
    protectedPlayerIds: { A: [], B: [] },
    actionCount: 0,
    events: [],
    pendingCardBox: null,
    revealHold: false
  };
}

export interface ApplyResult {
  ok: boolean;
  state: DndState;
  error?: string;
}

function cloneState(state: DndState): DndState {
  return {
    ...state,
    draw: {
      A: state.draw.A.map((b) => ({ ...b })),
      B: state.draw.B.map((b) => ({ ...b }))
    },
    acquired: { A: [...state.acquired.A], B: [...state.acquired.B] },
    cards: { A: [...state.cards.A], B: [...state.cards.B] },
    protectedPlayerIds: { A: [...state.protectedPlayerIds.A], B: [...state.protectedPlayerIds.B] },
    events: [...state.events],
    pendingCardBox: state.pendingCardBox,
    revealHold: state.revealHold
  };
}

function pushCard(cards: DndCardType[], type: DndCardType): DndCardType[] {
  return [...cards, type];
}

function removeCard(cards: DndCardType[], type: DndCardType): DndCardType[] {
  const idx = cards.indexOf(type);
  if (idx < 0) return cards;
  return [...cards.slice(0, idx), ...cards.slice(idx + 1)];
}

function allAcquiredPlayerIds(state: DndState): Set<string> {
  const out = new Set<string>();
  (['A', 'B'] as DndSide[]).forEach((side) => {
    state.acquired[side].forEach((it) => {
      if (it?.kind === 'PLAYER') out.add(it.player.id);
    });
  });
  return out;
}

function stageToPlayerIndex(stageKey: DndStageKey): number {
  return DND_STAGES.findIndex((x) => x.key === stageKey);
}

function itemStageIndex(item: FootballPlayer): number {
  if (item.position === 'GK') return stageToPlayerIndex('GK');
  if (DEF_POS.includes(item.position)) return stageToPlayerIndex('DEF');
  if (MID_POS.includes(item.position)) return stageToPlayerIndex('MID');
  return stageToPlayerIndex('ATT');
}

function findAcquiredPlayer(state: DndState, side: DndSide, playerId: string): { index: number; player: FootballPlayer } | null {
  const i = state.acquired[side].findIndex((it) => it?.kind === 'PLAYER' && it.player.id === playerId);
  if (i < 0) return null;
  const it = state.acquired[side][i];
  return it?.kind === 'PLAYER' ? { index: i, player: it.player } : null;
}

function weakestAvailablePlayer(state: DndState, side: DndSide, targetPlayer: FootballPlayer, pools: DndPools): FootballPlayer | null {
  const used = allAcquiredPlayerIds(state);
  const currentDraw = new Set<string>();
  (['A', 'B'] as DndSide[]).forEach((s) => state.draw[s].forEach((b) => b.item.kind === 'PLAYER' && currentDraw.add(b.item.player.id)));
  const key: DndStageKey =
    targetPlayer.position === 'GK' ? 'GK' : DEF_POS.includes(targetPlayer.position) ? 'DEF' : MID_POS.includes(targetPlayer.position) ? 'MID' : 'ATT';
  const pool = (pools[key] as FootballPlayer[]).filter((p) => !used.has(p.id) && !currentDraw.has(p.id) && p.id !== targetPlayer.id);
  return [...pool].sort((a, b) => a.overallRating - b.overallRating)[0] || null;
}

function applyUseCard(state: DndState, action: Extract<DndAction, { t: 'USE_CARD' }>, pools: DndPools): ApplyResult {
  const isSquads = state.phase === 'SQUADS';
  if (state.phase !== 'PLAY' && state.phase !== 'SQUADS') return { ok: false, state, error: 'اللعبة خلصت' };
  // الحكم مشاهدة فقط — لا يستهلك كروت ولا ينفّذ تأثيرات.
  if (action.s !== state.turn && !isSquads) return { ok: false, state, error: 'مش دورك' };
  if (!state.cards[action.s].includes(action.cardType)) return { ok: false, state, error: 'الكرت مش موجود معاك' };

  // درع الحماية والسرقة يتفعّلوا بعد اكتمال التشكيلة فقط.
  // لبس صحبك هو الاستثناء: يستخدم أثناء الجولات لأنه يفتح محاولة إضافية.
  if ((action.cardType === 'SHIELD' || action.cardType === 'STEAL') && !isSquads) {
    return { ok: false, state, error: 'الكرت ده بيتفعل بعد اكتمال التشكيلة' };
  }
  if (action.cardType === 'SWAP' && isSquads) {
    return { ok: false, state, error: 'لبس صحبك بيتستخدم أثناء الجولات' };
  }

  // نتحقق من الهدف قبل خصم الكرت حتى الغلط في الاختيار ما يضيعش الكرت.
  const next = cloneState(state);

  if (action.cardType === 'SHIELD') {
    if (!action.targetPlayerId) return { ok: false, state, error: 'اختار اللاعب اللي هيتحمي' };
    const own = findAcquiredPlayer(next, action.s, action.targetPlayerId);
    if (!own) return { ok: false, state, error: 'اللاعب مش موجود في تشكيلتك' };
    if (!next.protectedPlayerIds[action.s].includes(own.player.id)) {
      next.protectedPlayerIds[action.s].push(own.player.id);
    }
    next.cards[action.s] = removeCard(next.cards[action.s], action.cardType);
    next.actionCount += 1;
    next.events.push({
      stage: state.stage,
      side: action.s,
      kind: 'CARD',
      attempt: 1,
      box: -1,
      itemName: `${DND_CARD_INFO.SHIELD.nameAr}: ${own.player.nameAr}`,
      rating: own.player.overallRating,
      cardType: 'SHIELD'
    });
    return { ok: true, state: next };
  }

  if (action.cardType === 'STEAL') {
    const targetSide = action.targetSide || other(action.s);
    if (targetSide === action.s) return { ok: false, state, error: 'السرقة تكون من الخصم فقط' };
    if (!action.targetPlayerId) return { ok: false, state, error: 'اختار اللاعب اللي هيتسرق' };
    if (next.protectedPlayerIds[targetSide].includes(action.targetPlayerId)) return { ok: false, state, error: 'اللاعب ده عليه درع حماية' };
    const target = findAcquiredPlayer(next, targetSide, action.targetPlayerId);
    if (!target) return { ok: false, state, error: 'اللاعب المستهدف مش موجود' };

    const ownIndex = itemStageIndex(target.player);
    const currentOwn = next.acquired[action.s][ownIndex];
    next.acquired[targetSide][target.index] = currentOwn ?? null;
    next.acquired[action.s][ownIndex] = { kind: 'PLAYER', player: target.player };
    if (currentOwn?.kind === 'PLAYER') {
      next.protectedPlayerIds[action.s] = next.protectedPlayerIds[action.s].filter((id) => id !== currentOwn.player.id);
    }
    next.protectedPlayerIds[targetSide] = next.protectedPlayerIds[targetSide].filter((id) => id !== target.player.id);
    next.cards[action.s] = removeCard(next.cards[action.s], action.cardType);
    next.actionCount += 1;
    next.events.push({
      stage: state.stage,
      side: action.s,
      kind: 'CARD',
      attempt: 1,
      box: -1,
      itemName: `${DND_CARD_INFO.STEAL.nameAr}: ${target.player.nameAr}`,
      rating: target.player.overallRating,
      cardType: 'STEAL'
    });
    return { ok: true, state: next };
  }

  // SWAP / لبس صحبك: يبدّل لاعب الخصم بلاعب أضعف من نفس المركز، وبعدها يفتح له صندوق إضافي.
  const targetSide = action.targetSide || other(action.s);
  if (targetSide === action.s) return { ok: false, state, error: 'الكرت يستهدف الخصم' };
  if (!action.targetPlayerId) return { ok: false, state, error: 'اختار لاعب الخصم' };
  const target = findAcquiredPlayer(next, targetSide, action.targetPlayerId);
  if (!target) return { ok: false, state, error: 'اللاعب المستهدف مش موجود' };
  if (next.protectedPlayerIds[targetSide].includes(target.player.id)) return { ok: false, state, error: 'اللاعب ده محمي بدرع' };
  const weak = weakestAvailablePlayer(next, action.s, target.player, pools);
  if (!weak) return { ok: false, state, error: 'مفيش لاعب بديل متاح للكرت' };

  next.acquired[targetSide][target.index] = { kind: 'PLAYER', player: weak };
  next.protectedPlayerIds[targetSide] = next.protectedPlayerIds[targetSide].filter((id) => id !== target.player.id);
  next.opened = [];
  next.gambled = false;
  next.pendingCardBox = null;
  next.cards[action.s] = removeCard(next.cards[action.s], action.cardType);
  next.actionCount += 1;
  next.events.push({
    stage: state.stage,
    side: action.s,
    kind: 'CARD',
    attempt: 1,
    box: -1,
    itemName: `${DND_CARD_INFO.SWAP.nameAr}: ${weak.nameAr}`,
    rating: weak.overallRating,
    cardType: 'SWAP'
  });
  return { ok: true, state: next };
}

function finalizeTurn(st: DndState, side: DndSide, chosenIdx: number): DndState {
  const next = cloneState(st);
  const acquired = { A: [...next.acquired.A], B: [...next.acquired.B] };
  const boxes = next.draw[side].map((b) => ({
    ...b,
    opened: true,
    role: (b.index === chosenIdx ? 'chosen' : next.gambled && b.index === next.opened[0] ? 'passed' : 'revealed') as DndBox['role']
  }));
  const chosen = boxes[chosenIdx];
  if (!chosen) return next;
  acquired[side][next.stage] = chosen.item;
  if (chosen.cardType) {
    next.cards[side] = pushCard(next.cards[side], chosen.cardType);
  }
  next.acquired = acquired;
  next.draw = { ...next.draw, [side]: boxes };
  next.pendingCardBox = null;
  next.revealHold = true;
  return next;
}

export function applyAction(state: DndState, action: DndAction, pools: DndPools): ApplyResult {
  const fail = (error: string): ApplyResult => ({ ok: false, state, error });

  if (action.t === 'USE_CARD') {
    return applyUseCard(state, action, pools);
  }

  if (state.phase !== 'PLAY') return fail('اللعبة خلصت مرحلة الاختيار');
  if (action.s !== state.turn) return fail('مش دورك');

  if (action.t === 'CONTINUE') {
    if (!state.revealHold) return fail('مفيش كشف منتظر');
    return advance({ ...state, revealHold: false }, pools);
  }

  if (state.revealHold) return fail('استنى كشف الصناديق يخلص');

  const side = state.turn;
  const boxes = state.draw[side];
  const next: DndState = { ...cloneState(state), actionCount: state.actionCount + 1 };
  const evBase = { stage: state.stage, side };

  if (action.t === 'OPEN') {
    // محاولة واحدة فقط في كل ضغط: الأولى ثم الثانية. بعد الثانية تنتقل الجولة تلقائيًا.
    const attempt = (state.opened.length + 1) as 1 | 2;
    if (attempt > 2) return fail('خلصت محاولاتك — استنى الدور التالي');
    if (state.pendingCardBox !== null) return fail('الصندوق اللي فيه الكرت لسه محتاج قرار');

    const box = boxes[action.b];
    if (!box) return fail('صندوق غير موجود');
    if (box.opened) return fail('الصندوق ده اتفتح قبل كده');
    const opened = [...state.opened, action.b];
    const updatedBox = { ...box, opened: true, role: (box.cardType ? 'card' : attempt === 1 ? 'pending' : 'chosen') as DndBox['role'] };
    const updatedDraw = boxes.map((b) => (b.index === action.b ? updatedBox : b));

    // الجولة الأولى + صندوق فيه كرت: الكرت يظهر، لكن اللاعب يفضل مخفي لحد ما ياخد الصفقة أو يقرر يجازف.
    if (attempt === 1 && box.cardType) {
      const ev: DndEvent = {
        ...evBase,
        kind: 'CARD',
        attempt: 1,
        box: action.b,
        itemName: itemName(box.item),
        rating: itemRating(box.item),
        cardType: box.cardType
      };
      return {
        ok: true,
        state: {
          ...next,
          draw: { ...state.draw, [side]: updatedDraw },
          opened,
          pendingCardBox: action.b,
          events: [...state.events, ev]
        }
      };
    }

    const ev: DndEvent = {
      ...evBase,
      kind: attempt === 1 ? 'OPEN' : box.cardType ? 'CARD' : 'FORCED',
      attempt,
      box: action.b,
      itemName: itemName(box.item),
      rating: itemRating(box.item),
      cardType: box.cardType
    };
    const withOpen: DndState = {
      ...next,
      draw: { ...state.draw, [side]: updatedDraw },
      opened,
      events: [...state.events, ev],
      pendingCardBox: null
    };

    // المحاولة الثانية تنهي الدور مهما كان محتوى الصندوق. لو فيه كرت، اللاعب يكسب اللاعب + الكرت.
    if (attempt === 2) return { ok: true, state: finalizeTurn(withOpen, side, action.b) };
    return { ok: true, state: withOpen };
  }

  // لو الصندوق الأول فيه كرت، اللاعب يقدر ياخد الصفقة أو يجازف. الجازفة تعني صندوقًا ثانيًا فقط.
  if (action.t === 'GAMBLE') {
    if (state.opened.length !== 1 || state.gambled) return fail('مش وقت الجازفة');
    const first = boxes[state.opened[0]];
    if (!first) return fail('افتح صندوق الأول');
    const ev: DndEvent = { ...evBase, kind: 'GAMBLE', attempt: 1, box: first.index, itemName: itemName(first.item), rating: itemRating(first.item), cardType: first.cardType };
    return {
      ok: true,
      state: {
        ...next,
        gambled: true,
        pendingCardBox: null,
        events: [...state.events, ev]
      }
    };
  }

  if (action.t === 'DEAL') {
    if (state.opened.length !== 1) return fail('لازم يكون عندك صندوق أول');
    const chosenIdx = state.opened[0];
    const chosen = boxes[chosenIdx];
    if (!chosen) return fail('الصندوق مش موجود');
    if (!state.pendingCardBox && !state.gambled && !chosen.cardType) {
      // صفقة عادية بعد أول صندوق بدون كرت.
    } else if (!state.pendingCardBox && !chosen.cardType && state.gambled) {
      return fail('بعد الجازفة افتح الصندوق الثاني');
    }
    if (state.gambled) return fail('بعد الجازفة مفيش صفقة إضافية');
    const ev: DndEvent = {
      ...evBase,
      kind: 'DEAL',
      attempt: 1,
      box: chosenIdx,
      itemName: itemName(chosen.item),
      rating: itemRating(chosen.item),
      cardType: chosen.cardType
    };
    return { ok: true, state: finalizeTurn({ ...next, events: [...state.events, ev], pendingCardBox: null }, side, chosenIdx) };
  }

  return fail('الفعل مش صالح دلوقتي');
}

function advance(st: DndState, pools: DndPools): ApplyResult {
  if (st.turn === st.starter) {
    return { ok: true, state: { ...st, turn: other(st.starter), opened: [], gambled: false, pendingCardBox: null, revealHold: false } };
  }
  const nextStage = st.stage + 1;
  if (nextStage >= DND_STAGE_COUNT) {
    return { ok: true, state: { ...st, phase: 'SQUADS', opened: [], gambled: false, pendingCardBox: null } };
  }
  return {
    ok: true,
    state: {
      ...st,
      stage: nextStage,
      turn: st.starter,
      opened: [],
      gambled: false,
      pendingCardBox: null,
      revealHold: false,
      draw: drawStage(st.seed, nextStage, st.starter, pools)
    }
  };
}

export function replay(seed: number, pools: DndPools, actions: DndAction[]): DndState {
  let st = createInitialState(seed, pools);
  for (const a of actions) {
    const r = applyAction(st, a, pools);
    if (!r.ok) break;
    st = r.state;
  }
  return st;
}

export interface DndSquad {
  players: FootballPlayer[];
  coach: Coach | null;
  cards: DndCardType[];
  bySlot: { GK: FootballPlayer | null; DEF: FootballPlayer | null; MID: FootballPlayer | null; ATT: FootballPlayer | null };
}

export function buildSquad(state: DndState, side: DndSide): DndSquad {
  const a = state.acquired[side];
  const pl = (i: number) => {
    const it = a[i];
    return it && it.kind === 'PLAYER' ? it.player : null;
  };
  const c = a[4];
  const bySlot = { GK: pl(0), DEF: pl(1), MID: pl(2), ATT: pl(3) };
  return {
    players: [bySlot.GK, bySlot.DEF, bySlot.MID, bySlot.ATT].filter(Boolean) as FootballPlayer[],
    coach: c && c.kind === 'COACH' ? c.coach : null,
    cards: [...state.cards[side]],
    bySlot
  };
}

export function simulateFinal(state: DndState, nameA: string, nameB: string): MatchSimulationResult {
  const sa = buildSquad(state, 'A');
  const sb = buildSquad(state, 'B');
  return simulateDeterministicMatch(nameA, nameB, sa.players, sb.players, sa.coach, sb.coach, subSeed(state.seed, 'final_match'));
}

export function toPublicView(state: DndState, side: DndSide, pools: DndPools): DndPublicView {
  const key: DndStageKey = DND_STAGES[state.stage].key;
  const boxes = state.draw[side];
  const firstIdx = state.opened[0];
  const first = firstIdx !== undefined ? boxes[firstIdx] : undefined;
  const ratings = (arr: (DndItem | null)[]) => arr.filter((x): x is DndItem => !!x && x.kind !== 'CARD').map((x) => itemRating(x));
  const revealedIds = new Set<string>();
  boxes.filter((b) => b.opened).forEach((b) => {
    if (b.item.kind !== 'CARD') revealedIds.add(itemId(b.item));
  });
  const pool = pools[key] as (FootballPlayer | Coach)[];
  const poolRatings = pool
    .filter((x) => !revealedIds.has(x.id))
    .map((x) => ('overallRating' in x ? x.overallRating : x.rating));
  return {
    stageKey: key,
    stageIndex: state.stage,
    firstRevealedRating: first ? itemRating(first.item) : 0,
    unopenedCount: boxes.filter((b) => !b.opened).length,
    poolRatings,
    myAcquiredRatings: ratings(state.acquired[side]),
    oppAcquiredRatings: ratings(state.acquired[other(side)]),
    myCards: state.cards[side],
    oppCards: state.cards[other(side)]
  };
}

export function aiShouldDeal(view: DndPublicView, seed: number): boolean {
  const ratings = view.poolRatings;
  if (ratings.length === 0) return true;
  const mean = ratings.reduce((s, v) => s + v, 0) / ratings.length;
  const sd = Math.sqrt(ratings.reduce((s, v) => s + (v - mean) ** 2, 0) / ratings.length) || 1;
  const mine = view.myAcquiredRatings.reduce((s, v) => s + v, 0);
  const theirs = view.oppAcquiredRatings.reduce((s, v) => s + v, 0);
  const done = Math.max(1, Math.max(view.myAcquiredRatings.length, view.oppAcquiredRatings.length));
  const standing = (mine - theirs) / done;
  const riskMargin = 0.15 * sd * Math.max(-2, Math.min(2, standing / Math.max(1, sd)));
  const noise = (createSeededRng(subSeed(seed, `ai|${view.stageIndex}|${view.firstRevealedRating}`))() - 0.5) * 0.3 * sd;
  return view.firstRevealedRating >= mean + riskMargin + noise;
}

export function aiPickBox(availableIndexes: number[], rng: () => number = Math.random): number {
  return availableIndexes[Math.floor(rng() * availableIndexes.length)];
}

export function randomSeed(): number {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] >>> 0;
  } catch {
    return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
  }
}
