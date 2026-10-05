// ============================================================
// المواجهة | AL MWAJHA — Real Notification Service
//
// Backed by Supabase (`notifications`, `player_devices`,
// `notification_preferences` — see supabase/schema.sql). Falls
// back to a local-only queue when Supabase isn't configured, so
// the app never crashes and never fakes delivery — it simply
// keeps notifications on-device until a backend exists.
// ============================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { AppNotification, NotificationPreferences, NotificationType, NOTIFICATION_TYPE_CATEGORY } from '../types';

const LOCAL_NOTIFICATIONS_KEY = 'el3bha_sa7_notifications_v1';
const LOCAL_PREFS_KEY = 'el3bha_sa7_notification_prefs_v1';

const DEFAULT_PREFS: NotificationPreferences = {
  masterEnabled: true,
  matches: true,
  matchmaking: true,
  invites: true,
  friends: true,
  tournaments: true,
  coachMode: true,
  updates: false,
  announcements: true
};

function rowToNotification(row: any): AppNotification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    recipientPlayerId: row.recipient_player_id ?? undefined,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data || {},
    isRead: !!row.is_read,
    createdAt: row.created_at
  };
}

function readLocalQueue(): AppNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalQueue(list: AppNotification[]) {
  try {
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    // ignore quota errors
  }
}

export class NotificationService {
  /**
   * Creates a notification for a recipient. Works for both
   * "system → player" (admin, match results, tournaments) and
   * "player → player" (friend requests, invites) flows.
   */
  public static async send(params: {
    recipientId: string;
    recipientPlayerId?: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('notifications').insert({
          recipient_id: params.recipientId,
          recipient_player_id: params.recipientPlayerId ?? null,
          type: params.type,
          title: params.title,
          body: params.body,
          data: params.data ?? {}
        });
        if (!error) return;
      } catch {
        // fall through to local queue
      }
    }

    // Offline / not-yet-configured fallback: keep it on-device only.
    // This is only correct when recipientId === the current device's
    // own user id (there is no way to deliver to another device
    // without a backend) — used for local system-style notices.
    const queue = readLocalQueue();
    queue.unshift({
      id: `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      recipientId: params.recipientId,
      recipientPlayerId: params.recipientPlayerId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      isRead: false,
      createdAt: new Date().toISOString()
    });
    writeLocalQueue(queue);
  }

  public static async fetchForUser(userId: string, limit = 30): Promise<AppNotification[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('notifications')
          .select('*')
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (!error && data) return data.map(rowToNotification);
      } catch {
        // fall through to local
      }
    }
    return readLocalQueue().filter((n) => n.recipientId === userId).slice(0, limit);
  }

  public static async markAsRead(id: string, userId: string): Promise<void> {
    if (id.startsWith('local_')) {
      writeLocalQueue(readLocalQueue().map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      return;
    }
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('notifications').update({ is_read: true }).eq('id', id);
        return;
      } catch {
        // ignore
      }
    }
    writeLocalQueue(readLocalQueue().map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  public static async markAllAsRead(userId: string): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('notifications').update({ is_read: true }).eq('recipient_id', userId).eq('is_read', false);
      } catch {
        // ignore
      }
    }
    writeLocalQueue(readLocalQueue().map((n) => (n.recipientId === userId ? { ...n, isRead: true } : n)));
  }

  /**
   * Subscribes to live inserts for this player via Supabase Realtime.
   * Returns an unsubscribe function — ALWAYS call it on unmount to
   * avoid leaking subscriptions (see project performance requirements).
   * No-ops gracefully when Supabase isn't configured.
   */
  public static subscribe(userId: string, onInsert: (n: AppNotification) => void): () => void {
    const client = getSupabaseClient();
    if (!client) return () => {};

    let channel: RealtimeChannel | null = null;
    try {
      channel = client
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
          (payload) => onInsert(rowToNotification(payload.new))
        )
        .subscribe();
    } catch {
      return () => {};
    }

    return () => {
      try {
        if (channel) client.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }

  // ---------------- Preferences ----------------

  public static async getPreferences(userId: string): Promise<NotificationPreferences> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('notification_preferences')
          .select('*')
          .eq('player_id', userId)
          .maybeSingle();
        if (!error && data) {
          return {
            masterEnabled: data.master_enabled,
            matches: data.matches,
            matchmaking: data.matchmaking,
            invites: data.invites,
            friends: data.friends,
            tournaments: data.tournaments,
            coachMode: data.coach_mode,
            updates: data.updates,
            announcements: data.announcements
          };
        }
      } catch {
        // fall through to local
      }
    }
    try {
      const raw = localStorage.getItem(LOCAL_PREFS_KEY);
      return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  }

  public static async savePreferences(userId: string, prefs: NotificationPreferences): Promise<void> {
    try {
      localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('notification_preferences').upsert(
        {
          player_id: userId,
          master_enabled: prefs.masterEnabled,
          matches: prefs.matches,
          matchmaking: prefs.matchmaking,
          invites: prefs.invites,
          friends: prefs.friends,
          tournaments: prefs.tournaments,
          coach_mode: prefs.coachMode,
          updates: prefs.updates,
          announcements: prefs.announcements,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'player_id' }
      );
    } catch {
      // never break settings screen over a sync failure
    }
  }

  /** True if this notification type is currently allowed by the player's preferences. */
  public static isAllowed(type: NotificationType, prefs: NotificationPreferences): boolean {
    if (!prefs.masterEnabled) return false;
    const category = NOTIFICATION_TYPE_CATEGORY[type];
    return prefs[category];
  }

  // ---------------- Push token registration (Capacitor) ----------------
  // Actual push delivery must happen from a trusted server/Edge Function
  // using the Supabase service-role key — NEVER from frontend code. This
  // only registers the device so that backend can find it later.

  public static async registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return;
    try {
      await client.from('player_devices').upsert(
        {
          player_id: userId,
          device_token: token,
          platform,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'player_id,device_token' }
      );
    } catch {
      // ignore — push registration failures must never break the app
    }
  }
}
