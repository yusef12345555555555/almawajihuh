// ============================================================
// ديل أور نو ديل | DEAL OR NO DEAL — Types (v3)
// ============================================================

import { Coach, FootballPlayer } from './index';

export type DndSide = 'A' | 'B';
export type DndStageKey = 'GK' | 'DEF' | 'MID' | 'ATT' | 'COACH';

export type DndCardType = 'SHIELD' | 'STEAL' | 'SWAP';

export interface DndStageDef {
  key: DndStageKey;
  labelAr: string;
  singularAr: string;
  emoji: string;
}

export const DND_STAGES: DndStageDef[] = [
  { key: 'GK', labelAr: 'حراس المرمى', singularAr: 'حارس مرمى', emoji: '🧤' },
  { key: 'DEF', labelAr: 'المدافعين', singularAr: 'مدافع', emoji: '🛡️' },
  { key: 'MID', labelAr: 'لاعبي الوسط', singularAr: 'لاعب وسط', emoji: '🎯' },
  { key: 'ATT', labelAr: 'المهاجمين', singularAr: 'مهاجم', emoji: '⚡' },
  { key: 'COACH', labelAr: 'المدربين', singularAr: 'مدرب', emoji: '📋' }
];

export const DND_CARD_INFO: Record<DndCardType, { nameAr: string; shortAr: string; emoji: string }> = {
  SHIELD: {
    nameAr: 'درع الحماية',
    shortAr: 'احمي لاعبك من السرقة',
    emoji: '🛡️'
  },
  STEAL: {
    nameAr: 'كرت السرقة',
    shortAr: 'خد لاعب الخصم وبدّله بمركزك',
    emoji: '🦹'
  },
  SWAP: {
    nameAr: 'لبس صحبك',
    shortAr: 'لبّسه لاعب أضعف وافتح صندوق كمان',
    emoji: '🔄'
  }
};

export type DndItem =
  | { kind: 'PLAYER'; player: FootballPlayer }
  | { kind: 'COACH'; coach: Coach }
  | { kind: 'CARD'; cardType: DndCardType };

export interface DndBox {
  index: number;
  item: DndItem;
  /** الكرت الموجود جوه نفس الصندوق؛ الصندوق دايمًا فيه لاعب/مدرب + ممكن كرت. */
  cardType?: DndCardType;
  opened: boolean;
  role?: 'chosen' | 'passed' | 'revealed' | 'card' | 'pending';
}

export type DndAction =
  | { t: 'OPEN'; s: DndSide; b: number }
  | { t: 'DEAL'; s: DndSide }
  | { t: 'GAMBLE'; s: DndSide }
  | { t: 'CONTINUE'; s: DndSide }
  | { t: 'USE_CARD'; s: DndSide; cardType: DndCardType; targetSide?: DndSide; targetPlayerId?: string };

export interface DndEvent {
  stage: number;
  side: DndSide;
  kind: 'OPEN' | 'DEAL' | 'GAMBLE' | 'FORCED' | 'CARD';
  attempt: 1 | 2;
  box: number;
  itemName: string;
  rating: number;
  cardType?: DndCardType;
}

export interface DndState {
  seed: number;
  starter: DndSide;
  stage: number;
  turn: DndSide;
  phase: 'PLAY' | 'SQUADS';
  draw: Record<DndSide, DndBox[]>;
  opened: number[];
  gambled: boolean;
  acquired: Record<DndSide, (DndItem | null)[]>;
  cards: Record<DndSide, DndCardType[]>;
  protectedPlayerIds: Record<DndSide, string[]>;
  actionCount: number;
  events: DndEvent[];
  /** الصندوق الحالي اللي فوقه الكرت وبيستنى قرار اللاعب. */
  pendingCardBox: number | null;
  /** بعد كشف كل صناديق الدور: نثبتها 4 ثوانٍ قبل الانتقال للدور/الجولة التالية. */
  revealHold: boolean;
}

export interface DndPools {
  GK: FootballPlayer[];
  DEF: FootballPlayer[];
  MID: FootballPlayer[];
  ATT: FootballPlayer[];
  COACH: Coach[];
}

export type DndMode = 'AI' | 'PVP' | 'REF';

export interface DndPublicView {
  stageKey: DndStageKey;
  stageIndex: number;
  firstRevealedRating: number;
  unopenedCount: number;
  poolRatings: number[];
  myAcquiredRatings: number[];
  oppAcquiredRatings: number[];
  myCards: DndCardType[];
  oppCards: DndCardType[];
}
