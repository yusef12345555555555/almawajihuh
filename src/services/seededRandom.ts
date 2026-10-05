// ============================================================
// المواجهة | AL MWAJHA — Seeded Randomness
//
// WHY THIS EXISTS:
// Every game used to build its card set with Math.random(). That
// means two real players in the same match got DIFFERENT cards —
// the match wasn't actually shared, it just looked like it was.
//
// Both devices already agree on one number (deriveSharedMatchSeed),
// so if every shuffle/pick is driven by that seed instead, both
// sides independently generate the EXACT same cards, in the same
// order, with no network round-trip and nothing to desync.
//
// Rule of thumb: anything that decides WHAT the players see must
// use these helpers. Only cosmetic things (animation jitter, AI
// "thinking" delay) may keep using Math.random().
// ============================================================

/** Deterministic PRNG (mulberry32). Same seed → same stream, forever. */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates using a seeded stream. Never mutates the input. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = createSeededRng(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Deterministically pick one item. */
export function seededPick<T>(items: T[], seed: number): T {
  const rng = createSeededRng(seed);
  return items[Math.floor(rng() * items.length)];
}

/** Deterministically take N items without repeats. */
export function seededSample<T>(items: T[], count: number, seed: number): T[] {
  return seededShuffle(items, seed).slice(0, count);
}

/**
 * Derives a distinct sub-seed from a match seed so different parts of
 * one match (cards vs coaches vs turn order) don't all reuse the same
 * stream and accidentally correlate.
 */
export function subSeed(matchSeed: number, tag: string): number {
  let hash = 0x811c9dc5 ^ (matchSeed >>> 0);
  for (let i = 0; i < tag.length; i++) {
    hash ^= tag.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
