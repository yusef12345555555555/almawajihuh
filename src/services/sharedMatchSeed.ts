// ============================================================
// المواجهة | AL MWAJHA — Shared Match Seed
//
// The match engine (matchEngine.ts) is already deterministic: same
// seed + same two squads + same coaches → the exact same match,
// event for event. So two real players don't need a live socket to
// see the SAME result — they just need to agree on one seed.
//
// Both clients can compute this independently (no network round-trip
// needed) because it's derived only from data both sides already
// have after matchmaking: the two Player IDs + the game mode.
// ============================================================

function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0; // unsigned 32-bit
}

/**
 * Deterministic seed shared by both real players in a match. Sorting
 * the two IDs first means it doesn't matter which side computes it —
 * both get the exact same number.
 */
export function deriveSharedMatchSeed(playerIdA: string, playerIdB: string, gameMode: string, roundSalt: string = ''): number {
  const [a, b] = [playerIdA, playerIdB].sort();
  return fnv1aHash(`${a}|${b}|${gameMode}|${roundSalt}`);
}
