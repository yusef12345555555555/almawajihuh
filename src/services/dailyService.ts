// ============================================================
// المواجهة | التحديات اليومية + مكافأة اللعب اليومي + سجل المباريات
//
// - اليوم بيتحسب بتوقيت مصر (Africa/Cairo) — بيتجدد الساعة 12 بعد منتصف الليل بتوقيت القاهرة.
// - كل يوم 5 تحديات جديدة ومختلفة (بنختارها بـ seed من تاريخ اليوم، ونتجنب تحديات إمبارح).
// - مكافأة اللعب اليومي: 1 كوين مرة واحدة بس في اليوم.
// ============================================================

import { DailyChallenge } from '../types';
import { StorageService } from './storageService';

const DAILY_KEY = 'mw_daily_challenges_v1';
const LOGIN_KEY = 'mw_daily_login_v1';
const HISTORY_KEY = 'mw_match_history_v1';

export type DailyMetric =
  | 'match_played'
  | 'match_won'
  | 'auction_played'
  | 'dnd_played'
  | 'hidden_played'
  | 'win_vs_ai'
  | 'vs_real_played'
  | 'win_vs_real'
  | 'goals_scored'
  | 'clean_sheet';

export interface DailyChallengeItem extends DailyChallenge {
  metric: DailyMetric;
  claimed: boolean;
}

interface DailyState {
  dayKey: string;
  items: DailyChallengeItem[];
  prevIds: string[];
}

interface Template {
  id: string;
  titleAr: string;
  descriptionAr: string;
  metric: DailyMetric;
  total: number;
  rewardCoins: number;
  rewardXP: number;
}

const TEMPLATES: Template[] = [
  { id: 'play2', titleAr: 'سخّن الملعب', descriptionAr: 'العب مباراتين في أي لعبة', metric: 'match_played', total: 2, rewardCoins: 60, rewardXP: 40 },
  { id: 'play4', titleAr: 'ماراثون المواجهات', descriptionAr: 'العب 4 مباريات النهاردة', metric: 'match_played', total: 4, rewardCoins: 130, rewardXP: 80 },
  { id: 'win1', titleAr: 'نكسب النهاردة', descriptionAr: 'افوز في مباراة واحدة', metric: 'match_won', total: 1, rewardCoins: 80, rewardXP: 50 },
  { id: 'win3', titleAr: 'ثلاثية الفوز', descriptionAr: 'افوز في 3 مباريات', metric: 'match_won', total: 3, rewardCoins: 200, rewardXP: 120 },
  { id: 'auction1', titleAr: 'مزايد شاطر', descriptionAr: 'خلّص مباراة واحدة في لعبة المزاد', metric: 'auction_played', total: 1, rewardCoins: 60, rewardXP: 40 },
  { id: 'auction2', titleAr: 'سيد المزاد', descriptionAr: 'العب مباراتين في المزاد', metric: 'auction_played', total: 2, rewardCoins: 120, rewardXP: 70 },
  { id: 'dnd1', titleAr: 'صفقة أو لا؟', descriptionAr: 'العب مباراة في ديل أور نو ديل', metric: 'dnd_played', total: 1, rewardCoins: 60, rewardXP: 40 },
  { id: 'dnd2', titleAr: 'قلب جامد', descriptionAr: 'العب مباراتين في ديل أور نو ديل', metric: 'dnd_played', total: 2, rewardCoins: 120, rewardXP: 70 },
  { id: 'hidden1', titleAr: 'صائد الغموض', descriptionAr: 'العب مباراة في تاخد اللاعب ولا الخفي', metric: 'hidden_played', total: 1, rewardCoins: 60, rewardXP: 40 },
  { id: 'hidden2', titleAr: 'عين الصقر', descriptionAr: 'العب مباراتين في اللاعب الخفي', metric: 'hidden_played', total: 2, rewardCoins: 120, rewardXP: 70 },
  { id: 'beatai', titleAr: 'اهزم الآلة', descriptionAr: 'افوز على فريق AI', metric: 'win_vs_ai', total: 1, rewardCoins: 70, rewardXP: 45 },
  { id: 'beatai2', titleAr: 'سيطرة على الـ AI', descriptionAr: 'افوز على فريق AI مرتين', metric: 'win_vs_ai', total: 2, rewardCoins: 150, rewardXP: 90 },
  { id: 'real1', titleAr: 'تحدّي حقيقي', descriptionAr: 'العب ضد لاعب حقيقي', metric: 'vs_real_played', total: 1, rewardCoins: 100, rewardXP: 60 },
  { id: 'realwin', titleAr: 'كسّر الخصم', descriptionAr: 'افوز على لاعب حقيقي', metric: 'win_vs_real', total: 1, rewardCoins: 180, rewardXP: 110 },
  { id: 'goals3', titleAr: 'ماكينة أهداف', descriptionAr: 'سجّل 3 أهداف في مبارياتك', metric: 'goals_scored', total: 3, rewardCoins: 90, rewardXP: 60 },
  { id: 'goals6', titleAr: 'هدّاف اليوم', descriptionAr: 'سجّل 6 أهداف في مبارياتك', metric: 'goals_scored', total: 6, rewardCoins: 170, rewardXP: 100 },
  { id: 'clean1', titleAr: 'شباك نظيفة', descriptionAr: 'افوز من غير ما يدخل عليك هدف', metric: 'clean_sheet', total: 1, rewardCoins: 110, rewardXP: 70 }
];

// ---------------------------------------------------------------- الوقت (توقيت مصر)
export function cairoDayKey(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    // احتياطي: UTC+2
    return new Date(d.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10);
  }
}

/** الوقت المتبقي (بالمللي ثانية) لحد منتصف الليل بتوقيت القاهرة. */
export function msUntilCairoMidnight(now: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(now);
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
    const secondsPassed = (g('hour') % 24) * 3600 + g('minute') * 60 + g('second');
    return Math.max(1000, (86400 - secondsPassed) * 1000);
  } catch {
    return 3600 * 1000;
  }
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(dayKey: string, prevIds: string[]): DailyChallengeItem[] {
  const rand = seededRand(hashStr(`mwajha|${dayKey}|${StorageService.getUserProfile().id}`));
  const shuffled = [...TEMPLATES].sort(() => rand() - 0.5);
  // نفضّل تحديات مختلفة عن إمبارح، وما نكررش نفس النوع (metric) في نفس اليوم.
  const ordered = [...shuffled.filter((t) => !prevIds.includes(t.id)), ...shuffled.filter((t) => prevIds.includes(t.id))];
  const picked: Template[] = [];
  const usedMetrics = new Set<DailyMetric>();
  for (const t of ordered) {
    if (picked.length >= 5) break;
    if (usedMetrics.has(t.metric)) continue;
    usedMetrics.add(t.metric);
    picked.push(t);
  }
  for (const t of ordered) {
    if (picked.length >= 5) break;
    if (!picked.includes(t)) picked.push(t);
  }
  return picked.map((t) => ({
    id: `${dayKey}_${t.id}`,
    titleAr: t.titleAr,
    descriptionAr: t.descriptionAr,
    metric: t.metric,
    rewardCoins: t.rewardCoins,
    rewardXP: t.rewardXP,
    completed: false,
    claimed: false,
    progress: 0,
    total: t.total
  }));
}

function readState(): DailyState | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    return raw ? (JSON.parse(raw) as DailyState) : null;
  } catch {
    return null;
  }
}

function writeState(s: DailyState) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** تحديات اليوم (تتجدد تلقائياً لما اليوم بتوقيت مصر يتغيّر). */
export function getDailyChallenges(): DailyChallengeItem[] {
  const today = cairoDayKey();
  const st = readState();
  if (st && st.dayKey === today && st.items?.length) return st.items;
  const prevIds = (st?.items || []).map((i) => i.id.split('_').slice(1).join('_'));
  const fresh: DailyState = { dayKey: today, items: generate(today, prevIds), prevIds };
  writeState(fresh);
  return fresh.items;
}

export function trackDaily(metric: DailyMetric, amount = 1) {
  const items = getDailyChallenges();
  let changed = false;
  items.forEach((i) => {
    if (i.metric === metric && !i.completed) {
      i.progress = Math.min(i.total, i.progress + amount);
      if (i.progress >= i.total) i.completed = true;
      changed = true;
    }
  });
  if (changed) writeState({ dayKey: cairoDayKey(), items, prevIds: readState()?.prevIds || [] });
}

export function claimDailyChallenge(id: string): DailyChallengeItem[] {
  const items = getDailyChallenges();
  const t = items.find((i) => i.id === id);
  if (t && t.completed && !t.claimed) {
    t.claimed = true;
    StorageService.addCoinsAndXP(t.rewardCoins, t.rewardXP);
    writeState({ dayKey: cairoDayKey(), items, prevIds: readState()?.prevIds || [] });
  }
  return items;
}

// ---------------------------------------------------------------- مكافأة اللعب اليومي
export const DAILY_LOGIN_COINS = 1;

export function hasClaimedDailyLogin(): boolean {
  try {
    return localStorage.getItem(LOGIN_KEY) === cairoDayKey();
  } catch {
    return true;
  }
}

/** يمنح الكوين مرة واحدة فقط في اليوم. يرجّع true لو اتمنحت دلوقتي. */
export function claimDailyLoginReward(): boolean {
  if (hasClaimedDailyLogin()) return false;
  try {
    localStorage.setItem(LOGIN_KEY, cairoDayKey());
  } catch {
    return false;
  }
  StorageService.addCoinsAndXP(DAILY_LOGIN_COINS, 0);
  return true;
}

// ---------------------------------------------------------------- سجل المباريات
export type MatchHistoryResult = 'WIN' | 'LOSS' | 'DRAW';

export interface MatchHistoryEntry {
  id: string;
  gameId: string;
  gameLabelAr: string;
  opponentName: string;
  opponentIsAi: boolean;
  result: MatchHistoryResult;
  scoreFor: number;
  scoreAgainst: number;
  at: number;
}

export const GAME_LABELS_AR: Record<string, string> = {
  AUCTION: 'المزاد',
  DEAL_OR_NO_DEAL: 'ديل أور نو ديل',
  PLAYER_OR_HIDDEN: 'تاخد اللاعب ولا الخفي'
};

export function getMatchHistory(): MatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as MatchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export interface MatchMeta {
  gameId: string;
  opponentName: string;
  opponentIsAi: boolean;
  scoreFor: number;
  scoreAgainst: number;
}

/** يسجّل المباراة في السجل ويحدّث التحديات اليومية — بيتنادى مرة واحدة لكل مباراة. */
export function recordMatchEverywhere(meta: MatchMeta): void {
  const result: MatchHistoryResult = meta.scoreFor > meta.scoreAgainst ? 'WIN' : meta.scoreFor < meta.scoreAgainst ? 'LOSS' : 'DRAW';
  const entry: MatchHistoryEntry = {
    id: `m_${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`,
    gameId: meta.gameId,
    gameLabelAr: GAME_LABELS_AR[meta.gameId] || meta.gameId,
    opponentName: meta.opponentName,
    opponentIsAi: meta.opponentIsAi,
    result,
    scoreFor: meta.scoreFor,
    scoreAgainst: meta.scoreAgainst,
    at: Date.now()
  };
  try {
    const list = [entry, ...getMatchHistory()].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }

  trackDaily('match_played');
  if (meta.gameId === 'AUCTION') trackDaily('auction_played');
  if (meta.gameId === 'DEAL_OR_NO_DEAL') trackDaily('dnd_played');
  if (meta.gameId === 'PLAYER_OR_HIDDEN') trackDaily('hidden_played');
  if (!meta.opponentIsAi) trackDaily('vs_real_played');
  if (meta.scoreFor > 0) trackDaily('goals_scored', meta.scoreFor);
  if (result === 'WIN') {
    trackDaily('match_won');
    if (meta.opponentIsAi) trackDaily('win_vs_ai');
    else trackDaily('win_vs_real');
    if (meta.scoreAgainst === 0) trackDaily('clean_sheet');
  }

  // تقدّم الإنجازات الثابتة
  try {
    const list = StorageService.getAchievements();
    const bump = (id: string, by = 1) => {
      const a = list.find((x) => x.id === id);
      if (a && !a.unlocked) {
        a.progress = Math.min(a.maxProgress, a.progress + by);
        if (a.progress >= a.maxProgress) a.unlocked = true;
      }
    };
    if (result === 'WIN') {
      bump('ach_10_wins');
      const first = list.find((x) => x.maxProgress === 1 && /الأول/.test(x.descriptionAr));
      if (first) bump(first.id);
    }
    StorageService.saveAchievements(list);
  } catch {
    /* ignore */
  }
}
