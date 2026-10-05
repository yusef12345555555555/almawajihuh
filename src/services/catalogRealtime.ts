// ============================================================
// Live catalog sync: the moment the admin publishes / edits / deletes a
// player or coach, every open game gets the new roster (Supabase Realtime),
// with a light poll as a safety net.
// ============================================================
import { getSupabaseClient } from './supabaseClient';
import { getAllPlayers } from './playerRepository';
import { getAllCoaches } from './coachRepository';

let started = false;
let debounce: number | null = null;
let readyResolve: (() => void) | null = null;
const readyPromise = new Promise<void>((resolve) => {
  readyResolve = resolve;
});

const refreshAll = () => {
  if (debounce) window.clearTimeout(debounce);
  debounce = window.setTimeout(() => {
    void getAllPlayers(true).catch(() => {});
    void getAllCoaches(true).catch(() => {});
  }, 300);
};

export function startCatalogRealtime() {
  if (started) return;
  started = true;
  Promise.all([getAllPlayers(true).catch(() => null), getAllCoaches(true).catch(() => null)]).finally(() =>
    readyResolve?.(),
  );
  const client = getSupabaseClient();
  if (client) {
    client
      .channel('catalog-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coaches' }, refreshAll)
      .subscribe();
  }
  window.setInterval(refreshAll, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshAll();
  });
}

/** Resolves once the very first players+coaches fetch has settled (success or failure). Used to gate the boot intro on real data, not a guessed timer. */
export function catalogReady(): Promise<void> {
  return readyPromise;
}
