// ============================================================
// العبها صح | EL3BHA SA7 — Supabase Client
//
// IMPORTANT: this file must NEVER throw or crash the app, even if
// Supabase hasn't been configured yet. Every consumer of
// `getSupabaseClient()` must handle a `null` return by simply
// skipping the admin-published content (players/images) and
// falling back to the game's built-in local data — the normal
// player-facing app must work perfectly with zero setup.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('YOUR-PROJECT') && !key.includes('YOUR-PUBLIC');
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  try {
    if (!isSupabaseConfigured()) {
      cachedClient = null;
      return null;
    }
    cachedClient = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string
    );
    return cachedClient;
  } catch (err) {
    // Any misconfiguration (bad URL, etc.) must degrade gracefully,
    // never crash the player-facing app.
    console.warn('Supabase client could not be initialized — admin-published content will be skipped.', err);
    cachedClient = null;
    return null;
  }
}
