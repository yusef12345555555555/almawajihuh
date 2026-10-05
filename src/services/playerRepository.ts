// ============================================================
// العبها صح | EL3BHA SA7 — Player Repository
//
// Merges the game's built-in local player roster with players
// published through the admin panel (Supabase). If Supabase isn't
// configured, or the fetch fails for any reason, this silently
// falls back to ONLY the local roster — the game must never break,
// slow down, or show an error to a normal player because of this.
// ============================================================

import { FootballPlayer, PlayerAttributes } from '../types';
import { FOOTBALL_PLAYERS } from '../data/footballData';
import { getSupabaseClient } from './supabaseClient';

/**
 * Turns a single overall rating into a full attributes block, applied
 * EVENLY across every attribute — no assumptions that a striker must be
 * good at shooting or a defender must be good at defending. A player's
 * card can be strong or weak regardless of position; only the rating
 * (read straight off the card) decides that. This exists purely so the
 * match engine ALWAYS has real numbers to simulate with and never
 * crashes on `undefined` — a tiny deterministic jitter keeps cards at
 * the same rating from feeling like exact clones of each other.
 */
export function deriveAttributesFromRating(
  rating: number,
  _position: string,
): PlayerAttributes {
  const r = Math.max(40, Math.min(99, rating || 70));
  const jitter = (seed: number) => ((seed * 37) % 5) - 2; // deterministic -2..+2
  const clamp = (n: number) => Math.max(35, Math.min(99, Math.round(n)));

  return {
    pace: clamp(r + jitter(1)),
    shooting: clamp(r + jitter(2)),
    passing: clamp(r + jitter(3)),
    dribbling: clamp(r + jitter(4)),
    defending: clamp(r + jitter(5)),
    physical: clamp(r + jitter(6)),
  };
}

interface AdminPlayerRow {
  id: string;
  name: string;
  name_ar: string;
  position: string;
  overall_rating: number;
  nationality: string | null;
  nationality_ar: string | null;
  country_code: string | null;
  era: string | null;
  club: string | null;
  club_ar: string | null;
  rarity: string;
  market_value: number | null;
  photo_url: string;
  card_image_url: string | null;
  attributes: { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number } | null;
  clues: string[] | null;
  description_ar: string | null;
}

function mapRowToPlayer(row: AdminPlayerRow): FootballPlayer {
  const rating = row.overall_rating || 70;
  const position = row.position as FootballPlayer['position'];
  const hasFullAttributes =
    row.attributes &&
    typeof row.attributes.pace === 'number' &&
    typeof row.attributes.shooting === 'number' &&
    typeof row.attributes.passing === 'number' &&
    typeof row.attributes.dribbling === 'number' &&
    typeof row.attributes.defending === 'number' &&
    typeof row.attributes.physical === 'number';
  return {
    id: `admin_${row.id}`,
    name: row.name,
    nameAr: row.name_ar,
    position,
    overallRating: rating,
    nationality: row.nationality || '',
    nationalityAr: row.nationality_ar || '',
    countryCode: row.country_code || '',
    era: row.era || '',
    club: row.club || '',
    clubAr: row.club_ar || '',
    rarity: (row.rarity as FootballPlayer['rarity']) || 'Normal',
    marketValue: row.market_value || 0,
    photoUrl: row.photo_url,
    cardImageUrl: row.card_image_url || undefined,
    attributes: hasFullAttributes
      ? row.attributes
      : deriveAttributesFromRating(rating, position),
    clues: row.clues || [],
    descriptionAr: row.description_ar || ''
  };
}

let photoOverrides: Map<string, string> = new Map();
let cachedAdminPlayers: FootballPlayer[] | null = null;
let inFlightRequest: Promise<FootballPlayer[]> | null = null;

/** Fetches admin-published players once, then caches for the rest of the session. Never throws. */
async function fetchAdminPlayers(): Promise<FootballPlayer[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  // صور اللاعبين المرفوعة دفعة من /admin — بتتطبق على كل اللاعبين (بتغيّر photoUrl في المكان)
  try {
    const { data: ov } = await client.from('player_photo_overrides').select('player_id,image_url');
    if (ov && ov.length) {
      const map = new Map<string, string>(ov.map((r: { player_id: string; image_url: string }) => [r.player_id, r.image_url]));
      FOOTBALL_PLAYERS.forEach((p) => {
        const u = map.get(p.id);
        if (u) p.photoUrl = u;
      });
      photoOverrides = map;
    }
  } catch {
    /* بدون صور مخصصة — عادي */
  }

  try {
    const { data, error } = await client
      .from('players')
      .select('*')
      .eq('is_published', true);

    if (error || !data) return [];
    return data.map(mapRowToPlayer).map((p) => (photoOverrides.has(p.id) ? { ...p, photoUrl: photoOverrides.get(p.id)! } : p));
  } catch {
    // Network hiccup, RLS misconfig, etc. — degrade silently.
    return [];
  }
}

/**
 * Returns the full player pool available to the game RIGHT NOW
 * (local roster only) — always instant, always safe, used as the
 * default/initial value everywhere so nothing ever waits on a
 * network request to render.
 */
export function getLocalPlayers(): FootballPlayer[] {
  // No built-in roster anymore — whatever the admin published (already cached) is all there is.
  return getCombinedPlayersSync();
}

/**
 * Returns local + admin-published players together. Safe to call
 * from a useEffect; resolves to just the local roster if Supabase
 * is not configured or the request fails for any reason.
 */
export async function getAllPlayers(forceRefresh = false): Promise<FootballPlayer[]> {
  if (forceRefresh) {
    inFlightRequest = null; // force a brand-new network round trip
    // NOTE: we deliberately do NOT clear cachedAdminPlayers here — see
    // invalidatePlayerCache() below for why.
  }
  if (cachedAdminPlayers && !forceRefresh) {
    return [...cachedAdminPlayers];
  }
  if (!inFlightRequest) {
    inFlightRequest = fetchAdminPlayers();
  }
  const adminPlayers = await inFlightRequest;
  cachedAdminPlayers = adminPlayers;
  // The ONLY source of players is the admin panel — no built-in/demo roster.
  return [...adminPlayers];
}

/**
 * Synchronous helper for code paths that can't await (engine
 * constructors, etc.). Returns local + admin players if the admin
 * fetch has already resolved (e.g. triggered once at app startup),
 * otherwise just the local roster — never blocks, never throws.
 */
export function getCombinedPlayersSync(): FootballPlayer[] {
  // Admin-published players only (the games' single source of truth).
  return cachedAdminPlayers ? [...cachedAdminPlayers] : [];
}

/**
 * Clears the admin-players cache AND immediately kicks off a fresh
 * background fetch (e.g. right after the admin publishes new cards).
 *
 * Important: this does NOT null out `cachedAdminPlayers` synchronously.
 * If it did, every game using the synchronous helper above would
 * instantly (and wrongly) lose ALL admin/uploaded players — not just
 * miss the new ones — for the few hundred milliseconds until the next
 * fetch resolves. Instead we keep serving the last-known-good list
 * until the fresh one lands, then swap it in — so players never
 * disappear, they only ever get updated.
 */
export function invalidatePlayerCache() {
  inFlightRequest = fetchAdminPlayers().then((fresh) => {
    cachedAdminPlayers = fresh;
    inFlightRequest = null;
    return fresh;
  });
}

/**
 * Fire-and-forget nudge any screen can call on mount (games list, a game's
 * own setup screen, etc.) so newly-published players/photos propagate to
 * every player's device almost immediately, without requiring a full app
 * reload. Safe to call as often as needed — de-duplicates automatically
 * via `inFlightRequest`.
 */
export function refreshPlayersInBackground() {
  getAllPlayers(true).catch(() => {});
}
