// ============================================================
// Preloads player/coach photos into the browser's image cache BEFORE a game
// starts, so cards actually have their photo ready the instant they appear
// during play instead of popping in slowly mid-match. Always resolves
// within a bounded time — a slow or failing image can never block the game
// from opening.
// ============================================================

/** Preloads a single image URL; resolves (never rejects) whether it succeeds or fails. */
function preloadOne(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (!url) return resolve();
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
    // Already cached? decode() resolves immediately; harmless if unsupported.
    if (img.complete) resolve();
  });
}

/**
 * Preloads up to `limit` image URLs in parallel, capped at `timeoutMs`
 * total. Always resolves — never blocks game entry, even offline.
 */
export function preloadImages(urls: (string | undefined | null)[], timeoutMs = 3500, limit = 40): Promise<void> {
  const clean = Array.from(new Set(urls.filter((u): u is string => !!u && /^https?:\/\//.test(u)))).slice(0, limit);
  if (clean.length === 0) return Promise.resolve();
  const all = Promise.all(clean.map(preloadOne)).then(() => undefined);
  return Promise.race([all, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}
