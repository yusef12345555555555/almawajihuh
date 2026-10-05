// ============================================================
// المواجهة | غرف اللعب مع الصحاب
//   إنشاء غرفة بإعداداتها (خماسي/11 + كروت) → لينك/دعوة → "أنا جاهز" للاتنين → بداية الماتش.
//   مبنية على جدول match_invites (شغّل supabase/UPDATE_V4_ROOMS.sql).
// ============================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import { NotificationService } from './notificationService';
import { PlayerSnapshot } from '../types';

export interface RoomSettings {
  format: 5 | 11;
  cards: boolean;
  /** مدة القرار/المزايدة بالثواني (بيحددها صاحب الغرفة) */
  duration?: number;
  /** المزاد: كارت واحد بس أو من غير كروت */
  auctionCard?: 'NONE' | 'LAST_BID' | 'WILD_CARD' | 'NO_RISK';
  /** مين الخصم/الحكم (للعب من غير غرفة): AI | التطبيق حكم | حكم بشري */
  mode?: 'AI' | 'LOCAL' | 'REFEREE';
}

export type RoomStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED' | 'STARTED';

export interface FriendRoom {
  id: string;
  /** كود الغرفة القصير (6 حروف/أرقام) */
  code: string;
  gameMode: string;
  status: RoomStatus;
  settings: RoomSettings;
  host: PlayerSnapshot;
  hostId: string;
  guest: PlayerSnapshot | null;
  guestId: string;
  hostReady: boolean;
  guestReady: boolean;
  expiresAt: number;
  createdAt: number;
}

/** مدة التجهيز بعد دخول الضيف (دقيقة) */
export const ROOM_READY_SECONDS = 60;
/** مدة انتظار دخول الضيف للغرفة (3 دقايق) */
export const ROOM_WAIT_SECONDS = 180;
export const ROOM_QUERY_PARAM = 'room';
export const OPEN_ROOM_EVENT = 'mw:open-room';

const DEFAULT_SETTINGS: RoomSettings = { format: 5, cards: true };

function rowToRoom(row: any): FriendRoom {
  const s = row.settings || {};
  return {
    id: row.id,
    code: String(row.code || ''),
    gameMode: row.game_mode,
    status: row.status,
    settings: { format: s.format === 11 ? 11 : 5, cards: s.cards !== false, duration: typeof s.duration === 'number' ? s.duration : undefined, auctionCard: s.auctionCard, mode: s.mode },
    host: row.sender_snapshot,
    hostId: row.sender_id,
    guest: row.recipient_snapshot || null,
    guestId: row.recipient_id || '',
    hostReady: !!row.sender_ready,
    guestReady: !!row.recipient_ready,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : new Date(row.created_at).getTime() + ROOM_WAIT_SECONDS * 1000,
    createdAt: new Date(row.created_at).getTime()
  };
}

// ---------- إعدادات معلّقة بتقراها اللعبة عند البداية ----------
let pendingSettings: RoomSettings | null = null;
export function setPendingRoomSettings(s: RoomSettings | null) {
  pendingSettings = s;
}
/** بتقرأ الإعدادات المتفق عليها في الغرفة (لو في) من غير ما تمسحها — بتتمسح لما اللعبة تخلص. */
export function peekPendingRoomSettings(): RoomSettings | null {
  return pendingSettings;
}
export function clearPendingRoomSettings() {
  pendingSettings = null;
}

export function roomLink(id: string): string {
  try {
    const u = new URL(window.location.href);
    u.search = '';
    u.hash = '';
    u.searchParams.set(ROOM_QUERY_PARAM, id);
    return u.toString();
  } catch {
    return `?${ROOM_QUERY_PARAM}=${id}`;
  }
}

/** استخراج رقم الغرفة من لينك كامل أو من الـ ID نفسه */
export function parseRoomRef(text: string): string | null {
  const t = (text || '').trim();
  if (!t) return null;
  const m = t.match(/[?&]room=([0-9a-f-]{36})/i) || t.match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
  return m ? m[1] : null;
}

export class FriendRoomService {
  static async create(host: PlayerSnapshot, gameMode: string, settings: RoomSettings = DEFAULT_SETTINGS): Promise<FriendRoom | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const expires = new Date(Date.now() + ROOM_WAIT_SECONDS * 1000).toISOString();
    const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const makeCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
    // كود قصير فريد — لو اتكرر (نادر جداً) نجرّب كود تاني
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, error } = await client
        .from('match_invites')
        .insert({
          sender_id: host.id,
          sender_snapshot: host,
          recipient_id: '',
          game_mode: gameMode,
          status: 'PENDING',
          settings,
          code: makeCode(),
          expires_at: expires
        })
        .select()
        .single();
      if (!error && data) return rowToRoom(data);
      if (error && !/duplicate|unique/i.test(error.message || '')) {
        console.warn('room create failed', error.message);
        return null;
      }
    }
    return null;
  }

  static async get(id: string): Promise<FriendRoom | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.from('match_invites').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return rowToRoom(data);
  }

  /** الوصول للغرفة بالكود القصير (من غير حساسية لحالة الحروف) */
  static async getByCode(code: string): Promise<FriendRoom | null> {
    const client = getSupabaseClient();
    const c = (code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!client || c.length < 4) return null;
    const { data, error } = await client
      .from('match_invites')
      .select('*')
      .eq('code', c)
      .in('status', ['PENDING', 'ACCEPTED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return rowToRoom(data);
  }

  /** دعوة صاحب معيّن للغرفة (إشعار داخل التطبيق + إشعار نظام لو التطبيق مقفول) */
  static async inviteFriend(room: FriendRoom, host: PlayerSnapshot, friendId: string, friendPlayerId: string, gameLabelAr: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    await client.from('match_invites').update({ recipient_id: friendId, updated_at: new Date().toISOString() }).eq('id', room.id).eq('status', 'PENDING');
    await NotificationService.send({
      recipientId: friendId,
      recipientPlayerId: friendPlayerId,
      type: 'GAME_INVITE',
      title: 'دعوة لمباراة',
      body: `${host.nameAr || host.name} دعاك تلعب ${gameLabelAr} — افتح الإشعار واختار يلا نلعب أو فكك`,
      data: { screen: 'room', roomId: room.id, matchInviteId: room.id, code: room.code }
    });
  }

  /** الضيف بيدخل الغرفة (يلا نلعب) */
  static async join(roomId: string, me: PlayerSnapshot): Promise<{ ok: boolean; room?: FriendRoom; reason?: 'GONE' | 'FULL' | 'SELF' }> {
    const client = getSupabaseClient();
    if (!client) return { ok: false, reason: 'GONE' };
    const room = await this.get(roomId);
    if (!room || room.status === 'CANCELLED' || room.status === 'EXPIRED' || room.status === 'DECLINED' || room.expiresAt < Date.now()) {
      return { ok: false, reason: 'GONE' };
    }
    if (room.hostId === me.id) return { ok: false, reason: 'SELF' };
    if (room.guestId && room.guestId !== me.id && room.guest) return { ok: false, reason: 'FULL' };
    const { data, error } = await client
      .from('match_invites')
      .update({ recipient_id: me.id, recipient_snapshot: me, status: 'ACCEPTED', expires_at: new Date(Date.now() + ROOM_READY_SECONDS * 1000).toISOString(), updated_at: new Date().toISOString() })
      .eq('id', roomId)
      .in('status', ['PENDING', 'ACCEPTED'])
      .select()
      .maybeSingle();
    if (error || !data) return { ok: false, reason: 'GONE' };
    return { ok: true, room: rowToRoom(data) };
  }

  static async setReady(roomId: string, role: 'host' | 'guest', ready: boolean): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { error } = await client
        .from('match_invites')
        .update(role === 'host' ? { sender_ready: ready, updated_at: new Date().toISOString() } : { recipient_ready: ready, updated_at: new Date().toISOString() })
        .eq('id', roomId);
      if (error) console.warn('setReady failed:', error.message);
    } catch (e) {
      console.warn('setReady failed', e);
    }
  }

  static async setStatus(roomId: string, status: RoomStatus): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('match_invites').update({ status, updated_at: new Date().toISOString() }).eq('id', roomId);
    } catch {
      /* ignore */
    }
  }

  static subscribe(roomId: string, onUpdate: (r: FriendRoom) => void): () => void {
    const client = getSupabaseClient();
    if (!client) return () => {};
    let channel: RealtimeChannel | null = null;
    let poll: number | undefined;
    try {
      channel = client
        .channel(`room:${roomId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_invites', filter: `id=eq.${roomId}` }, (p) => onUpdate(rowToRoom(p.new)))
        .subscribe();
    } catch {
      /* fall back to polling only */
    }
    // شبكة أمان: لو الـ Realtime اتأخر/اتقطع نسأل كل ثانيتين.
    poll = window.setInterval(async () => {
      const r = await FriendRoomService.get(roomId);
      if (r) onUpdate(r);
    }, 2000);
    return () => {
      if (poll) window.clearInterval(poll);
      try {
        if (channel) client.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }
}

export function openRoomInApp(roomId: string) {
  try {
    window.dispatchEvent(new CustomEvent(OPEN_ROOM_EVENT, { detail: { roomId } }));
  } catch {
    /* ignore */
  }
}

/** رقم الغرفة من داتا الإشعار (بنقبل roomId أو matchInviteId القديم) */
export function roomIdFromNotificationData(d: unknown): string | null {
  const o = (d || {}) as Record<string, unknown>;
  const v = o.roomId || o.matchInviteId;
  return v ? String(v) : null;
}
