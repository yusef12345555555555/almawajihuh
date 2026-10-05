// ============================================================
// العبها صح | EL3BHA SA7 — Game Cover Images (Slots 1-6)
//
// Lets the admin upload one cover image per game (6 total) that
// replaces the default icon-based card in the games list. Falls
// back to nothing (default icon stays) if Supabase isn't
// configured or no image has been uploaded for that slot yet.
// ============================================================

import { getSupabaseClient } from './supabaseClient';

export interface GameImageSlot {
  slot: number;
  gameId: string;
  imageUrl: string | null;
}

let cachedSlots: Record<number, string | null> | null = null;
let inFlightRequest: Promise<Record<number, string | null>> | null = null;

async function fetchGameImages(): Promise<Record<number, string | null>> {
  const client = getSupabaseClient();
  if (!client) return {};

  try {
    const { data, error } = await client.from('game_images').select('slot, image_url');
    if (error || !data) return {};
    const map: Record<number, string | null> = {};
    for (const row of data as { slot: number; image_url: string | null }[]) {
      map[row.slot] = row.image_url;
    }
    return map;
  } catch {
    return {};
  }
}

/** Resolves to a map of slot(1-6) -> image URL (or null if not set/unavailable). Never throws. */
export async function getGameImageSlots(): Promise<Record<number, string | null>> {
  if (cachedSlots) return cachedSlots;
  if (!inFlightRequest) inFlightRequest = fetchGameImages();
  cachedSlots = await inFlightRequest;
  return cachedSlots;
}

export function invalidateGameImagesCache() {
  cachedSlots = null;
  inFlightRequest = null;
}

/** Maps each SupportedGameType id to its fixed slot number (1-6) for the admin panel and the games list. */
export const GAME_SLOT_BY_ID: Record<string, number> = {
  AUCTION: 1,
  PLAYER_OR_HIDDEN: 2,
  HOARTAGY_HUNTER: 3,
  PLAYER_GUESS: 4,
  SAFI: 5,
  YOU_ARE_THE_COACH: 6,
  DEAL_OR_NO_DEAL: 7
};

/**
 * صور الألعاب الرسمية (متضمّنة في التطبيق). الصورة بتظهر كاملة تحت اسم لعبتها.
 * تخمين اللاعب (PLAYER_GUESS) ملهوش صورة لسه — بيفضل بشكله الحالي.
 * أي صورة يرفعها الأدمن (Supabase) بتظهر عند كل اللاعبين وبتاخد الأولوية على دي؛ دي الافتراضية.
 */
export const BUNDLED_GAME_IMAGES: Record<string, string> = {
  AUCTION: '/games/game-auction.png',
  PLAYER_OR_HIDDEN: '/games/game-hidden.webp',
  HOARTAGY_HUNTER: '/games/game-hoartagy.webp',
  SAFI: '/games/game-safi.jpg',
  YOU_ARE_THE_COACH: '/games/game-coach.png',
  DEAL_OR_NO_DEAL: '/games/game-dond.png'
};
