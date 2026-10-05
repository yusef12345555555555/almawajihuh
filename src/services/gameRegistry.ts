// ============================================================
// العبها صح | EL3BHA SA7 - Central Game Registry & Types
// ============================================================

import { GameModeId } from '../types';

export type SupportedGameType =
  | 'AUCTION'
  | 'PLAYER_OR_HIDDEN'
  | 'HOARTAGY_HUNTER'
  | 'SAFI'
  | 'DEAL_OR_NO_DEAL';

export interface GameRegistryEntry {
  id: SupportedGameType;
  aliases: string[];
  nameAr: string;
  nameEn: string;
  categoryTagAr: string;
  descriptionAr: string;
  modes: {
    id: string;
    nameAr: string;
    budget?: number;
    squadSize?: number;
    descriptionAr: string;
  }[];
  defaultRewardPoints: number;
  pitchSupported: boolean;
}

export const GAME_REGISTRY: Record<SupportedGameType, GameRegistryEntry> = {
  AUCTION: {
    id: 'AUCTION',
    aliases: ['auction', 'mode_auction_100m', 'mode_auction_200m', 'AUCTION_100M', 'AUCTION_200M', 'auction_pro'],
    nameAr: 'المزاد',
    nameEn: 'Auction',
    categoryTagAr: 'المزاد والاستراتيجية',
    descriptionAr: 'زايد وكوّن فريقك.',
    modes: [
      { id: '100M', nameAr: 'كلاسيك 100M', budget: 100, squadSize: 5, descriptionAr: '100M لخماسي أساطير.' },
      { id: '200M', nameAr: 'برو ماكس 200M', budget: 200, squadSize: 11, descriptionAr: '200M لتشكيلة كاملة ومدرب.' }
    ],
    defaultRewardPoints: 10,
    pitchSupported: true
  },
  PLAYER_OR_HIDDEN: {
    id: 'PLAYER_OR_HIDDEN',
    aliases: ['take_player_or_hidden', 'hidden_player', 'mode_hidden_player'],
    nameAr: 'تاخد اللاعب ده ولا اللاعب الخفي؟',
    nameEn: 'Take Player Or Hidden',
    categoryTagAr: 'المجهول والمخاطرة',
    descriptionAr: 'خده ولا تخاطر بالخفي.',
    modes: [
      { id: '5_PLAYERS', nameAr: 'خماسي تكتيكي (5 لاعبين)', squadSize: 5, descriptionAr: 'خماسي ناري بسرعة.' },
      { id: '11_PLAYERS', nameAr: 'محترف كامل (11 لاعباً)', squadSize: 11, descriptionAr: 'تشكيلة 11 كاملة ومدرب.' }
    ],
    defaultRewardPoints: 10,
    pitchSupported: true
  },
  HOARTAGY_HUNTER: {
    id: 'HOARTAGY_HUNTER',
    aliases: ['hoartagy_hunter', 'truth_or_lie', 'mode_truth_or_lie'],
    nameAr: 'الحوارتجي والصياد',
    nameEn: 'Hoartagy & Hunter',
    categoryTagAr: 'خداع واستجواب',
    descriptionAr: 'اسأل واعرف بيحور ولا لأ.',
    modes: [
      { id: 'STANDARD', nameAr: 'تحقيق 5 أسئلة', descriptionAr: 'اكشف كدب الحوارتجي.' }
    ],
    defaultRewardPoints: 10,
    pitchSupported: false
  },
  SAFI: {
    id: 'SAFI',
    // «تخمين اللاعب» القديمة اتدمجت هنا — أي غرفة/بطولة قديمة بنفس الأسماء بتفتح اللعبة دي.
    aliases: ['safi', 'player_guess', 'PLAYER_GUESS', 'GUESS_PLAYER', 'guess'],
    nameAr: 'اقف ف صفي عشان بصفي',
    nameEn: 'Safi Elimination',
    categoryTagAr: 'مبارزة وإقصاء',
    descriptionAr: '30 كارت ثابتين — 7 أسئلة لكل لاعب و20 ثانية للدور، والأقرب للاعب السري يكسب.',
    modes: [
      { id: 'STANDARD', nameAr: 'تصفية مباشرة', descriptionAr: '7 أسئلة لكل خصم، 20 ثانية للدور.' }
    ],
    defaultRewardPoints: 10,
    pitchSupported: false
  },
  DEAL_OR_NO_DEAL: {
    id: 'DEAL_OR_NO_DEAL',
    aliases: ['deal_or_no_deal', 'DEAL_OR_NO_DEAL', 'mode_deal_or_no_deal', 'dond'],
    nameAr: 'ديل أور نو ديل',
    nameEn: 'Deal or No Deal',
    categoryTagAr: 'صناديق ومخاطرة',
    descriptionAr: 'صفقة ولا لأ؟ 4 صناديق وعروض بنك وكروت مفاجآت.',
    modes: [
      { id: 'STANDARD', nameAr: 'ماتش قياسي (5 جولات)', descriptionAr: '5 جولات وعروض بنك وكروت عشوائية.' }
    ],
    defaultRewardPoints: 10,
    pitchSupported: false
  }
};

export function resolveGameType(rawId?: string): SupportedGameType {
  if (!rawId) return 'AUCTION';
  const clean = rawId.trim();

  for (const [key, entry] of Object.entries(GAME_REGISTRY)) {
    if (key === clean || entry.id === clean || entry.aliases.includes(clean)) {
      return key as SupportedGameType;
    }
  }

  // Fallbacks based on partial matching
  const lower = clean.toLowerCase();
  if (lower.includes('auction') || lower.includes('100m') || lower.includes('200m')) return 'AUCTION';
  if (lower.includes('hidden') || lower.includes('take_player')) return 'PLAYER_OR_HIDDEN';
  if (lower.includes('hoartagy') || lower.includes('truth')) return 'HOARTAGY_HUNTER';
  if (lower.includes('safi')) return 'SAFI';
  if (lower.includes('guess')) return 'SAFI';
  if (lower.includes('deal') || lower.includes('dond')) return 'DEAL_OR_NO_DEAL';

  return 'AUCTION';
}
