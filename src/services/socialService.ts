// ============================================================
// العبها صح | Social & Friends System Service  (REAL — no demo data)
//
// Friends, friend requests and direct messages are stored in Supabase
// (friend_requests / direct_messages) and synced LIVE through Supabase
// Realtime, so a request or a chat message reaches the other player the
// moment it's sent. A local cache keeps the screens instant and lets them
// render synchronously; it starts EMPTY — nothing is ever seeded.
// The tables are created by supabase/SOCIAL_REALTIME.sql.
// ============================================================

import { FriendUser, FriendRequest, ChatConversation, DirectMessage, UserProfile } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { StorageService } from './storageService';
import { getDeviceSecret } from './playerRegistration';

const FRIENDS_KEY = 'el3bha_social_friends_v2';
const REQUESTS_KEY = 'el3bha_social_requests_v2';
const CONVERSATIONS_KEY = 'el3bha_social_conversations_v2';

// Old builds seeded fake friends/requests/chats into localStorage — wipe them for good.
try {
  ['el3bha_social_friends_v1', 'el3bha_social_requests_v1', 'el3bha_social_conversations_v1'].forEach((k) =>
    localStorage.removeItem(k)
  );
} catch {
  /* ignore */
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
};
const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

// لاعب "متصل الآن" فعلاً = آخر نبضة حضور خلال 3 دقايق (مش مجرد قيمة محفوظة).
const ONLINE_WINDOW_MS = 3 * 60 * 1000;
const presenceOf = (row: any): 'ONLINE' | 'OFFLINE' | 'IN_MATCH' => {
  const t = row?.last_active ? new Date(row.last_active).getTime() : 0;
  const fresh = t > 0 && Date.now() - t < ONLINE_WINDOW_MS;
  if (!fresh) return 'OFFLINE';
  return row.status === 'IN_MATCH' ? 'IN_MATCH' : 'ONLINE';
};

const rowToFriend = (row: any): FriendUser => ({
  id: row.id,
  playerId: row.player_id,
  username: row.username,
  nameAr: row.name_ar,
  avatar: row.avatar,
  rating: row.rating,
  rankTier: row.rank_tier,
  status: presenceOf(row),
  lastActive: presenceOf(row) === 'ONLINE' ? 'دلوقتي' : presenceOf(row) === 'IN_MATCH' ? 'في مباراة حالياً' : 'غير متصل',
  favoriteClub: row.favorite_club,
  favoritePlayer: row.favorite_player,
  bio: row.bio,
  winRate: row.win_rate
});

const convKeyOf = (a: string, b: string) => [a, b].sort().join('__');

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

let pulling = false;
let realtimeStarted = false;
let pollTimer: number | null = null;

export class SocialService {
  private static me(): UserProfile {
    return StorageService.getUserProfile();
  }

  // ---------------------------------------------------------------- local cache (sync API used by the screens)
  public static getFriends(): FriendUser[] {
    return readJson<FriendUser[]>(FRIENDS_KEY, []);
  }
  public static saveFriends(friends: FriendUser[]) {
    writeJson(FRIENDS_KEY, friends);
  }
  public static getRequests(): FriendRequest[] {
    return readJson<FriendRequest[]>(REQUESTS_KEY, []);
  }
  public static saveRequests(requests: FriendRequest[]) {
    writeJson(REQUESTS_KEY, requests);
  }
  public static getConversations(): ChatConversation[] {
    return readJson<ChatConversation[]>(CONVERSATIONS_KEY, []);
  }
  public static saveConversations(convs: ChatConversation[]) {
    writeJson(CONVERSATIONS_KEY, convs);
  }

  public static isFriend(playerIdOrId: string): boolean {
    const q = playerIdOrId.toLowerCase();
    return this.getFriends().some((f) => f.id === playerIdOrId || f.playerId.toLowerCase() === q);
  }

  /** Subscribe to any friends/requests/chat change (local or remote). Returns an unsubscribe fn. */
  public static subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }

  // ---------------------------------------------------------------- realtime sync
  /** Starts the live connection once per session: pulls everything now, then listens for changes. */
  public static startRealtime() {
    const client = getSupabaseClient();
    if (!client || realtimeStarted) return;
    realtimeStarted = true;
    void this.pull();
    const onChange = () => void this.pull();
    client
      .channel('social-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, onChange)
      .subscribe();
    // Safety net in case a realtime event is missed (flaky connection).
    pollTimer = window.setInterval(() => void this.pull(), 20000);
    // حضور اللاعب: نبضة كل 60 ثانية طول ما التطبيق ظاهر.
    void this.heartbeat();
    window.setInterval(() => {
      if (document.visibilityState === 'visible') void this.heartbeat();
    }, 60000);
  }

  /** Re-downloads friends, requests and chat history for the current player and refreshes the cache. */
  public static async pull(): Promise<void> {
    const client = getSupabaseClient();
    if (!client || pulling) return;
    const me = this.me();
    if (!me?.id) return;
    pulling = true;
    try {
      const { data: reqRows } = await client
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`)
        .order('created_at', { ascending: false })
        .limit(300);
      const rows = reqRows || [];

      const requests: FriendRequest[] = rows
        .filter((r: any) => r.status === 'PENDING')
        .map((r: any) => ({
          id: r.id,
          senderId: r.sender_id,
          senderPlayerId: r.sender_player_id,
          senderName: r.sender_name,
          senderAvatar: r.sender_avatar,
          senderRating: r.sender_rating,
          receiverId: r.receiver_id,
          status: 'PENDING' as const,
          timestamp: new Date(r.created_at).getTime(),
          direction: (r.receiver_id === me.id ? 'INCOMING' : 'OUTGOING') as 'INCOMING' | 'OUTGOING'
        }));
      this.saveRequests(requests);

      const friendIds = Array.from(
        new Set(
          rows
            .filter((r: any) => r.status === 'ACCEPTED')
            .map((r: any) => (r.sender_id === me.id ? r.receiver_id : r.sender_id))
        )
      ) as string[];

      let friends: FriendUser[] = [];
      if (friendIds.length > 0) {
        const { data: userRows } = await client.from('game_users').select('*').in('id', friendIds);
        friends = (userRows || []).map(rowToFriend);
      }
      this.saveFriends(friends);

      // Chat history
      const { data: msgRows } = await client
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`)
        .order('created_at', { ascending: true })
        .limit(1000);

      const oldConvs = this.getConversations();
      const convs: ChatConversation[] = friends.map((f) => {
        const key = convKeyOf(me.id, f.id);
        const msgs: DirectMessage[] = (msgRows || [])
          .filter((m: any) => m.conversation_key === key)
          .map((m: any) => ({
            id: m.id,
            conversationId: `conv_${f.id}`,
            senderId: m.sender_id,
            senderName: m.sender_id === me.id ? 'أنت' : m.sender_name,
            text: m.body,
            timestamp: new Date(m.created_at).getTime(),
            read: m.sender_id === me.id
          }));
        const old = oldConvs.find((c) => c.id === `conv_${f.id}`);
        // A message counts as read if it was already read locally.
        const readIds = new Set((old?.messages || []).filter((m) => m.read).map((m) => m.id));
        msgs.forEach((m) => {
          if (readIds.has(m.id)) m.read = true;
        });
        const last = msgs[msgs.length - 1];
        return {
          id: `conv_${f.id}`,
          friendId: f.id,
          friendPlayerId: f.playerId,
          friendName: f.nameAr || f.username,
          friendAvatar: f.avatar,
          friendStatus: f.status,
          lastMessage: last ? last.text : 'محادثة جديدة',
          lastMessageTime: last ? new Date(last.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
          unreadCount: msgs.filter((m) => !m.read).length,
          messages: msgs
        };
      });
      this.saveConversations(convs);
      notify();
    } catch {
      // never break the app because a sync failed — the cache still works
    } finally {
      pulling = false;
    }
  }

  // ---------------------------------------------------------------- your own directory entry (so others can find you)
  private static async ensureAuth(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data } = await client.auth.getSession();
      if (!data.session) await client.auth.signInAnonymously();
    } catch {
      /* anonymous sign-in not enabled — direct upsert fallback below */
    }
  }

  /**
   * Publishes/refreshes THIS player's row in the searchable directory so other
   * real players can find them by Player ID, nickname or name — right away.
   * يعتمد على مفتاح الجهاز السري (بدون Anonymous Auth) ويرجع للطرق القديمة كاحتياطي.
   */
  public static async publishOwnProfile(user: UserProfile): Promise<void> {
    const client = getSupabaseClient();
    if (!client || !user.playerId) return;
    try {
      const { data, error } = await client.rpc('mw_sync_profile', {
        p_secret: getDeviceSecret(),
        p_id: user.id,
        p_player_id: user.playerId,
        p_username: user.username,
        p_name_ar: user.nameAr || user.username,
        p_avatar: user.avatar || '',
        p_rating: user.rating ?? 1000,
        p_rank_tier: user.rankTier || 'برونزي',
        p_wins: user.wins ?? 0,
        p_losses: user.losses ?? 0,
        p_draws: user.draws ?? 0,
        p_games_played: user.gamesPlayed ?? 0,
        p_points: user.points ?? 0,
        p_favorite_club: user.favoriteClub || '',
        p_favorite_player: user.favoritePlayer || '',
        p_bio: '',
        p_equipped: user.equippedCosmetics || {}
      });
      const res = data as { ok?: boolean; player_id?: string } | null;
      if (!error && res?.ok) {
        // لو السيرفر أعطى رقم مختلف (تعارض نادر) نعتمده محلياً.
        if (res.player_id && res.player_id !== user.playerId) {
          const fresh = StorageService.getUserProfile();
          StorageService.saveUser({ ...fresh, playerId: res.player_id });
          try {
            window.dispatchEvent(new CustomEvent('mw:profile-changed'));
          } catch {
            /* ignore */
          }
        }
        return;
      }
      if (!error && res && res.ok === false) return; // رفض أمني صريح (ملف لجهاز آخر) — لا نحاول بدائل

      // --- احتياطي 1: الدالة القديمة (تحتاج Anonymous Auth) ---
      await this.ensureAuth();
      const legacy = await client.rpc('claim_profile', {
        p_id: user.id,
        p_player_id: user.playerId,
        p_username: user.username,
        p_name_ar: user.nameAr || user.username,
        p_avatar: user.avatar || '',
        p_rating: user.rating ?? 1000,
        p_rank_tier: user.rankTier || 'برونزي',
        p_wins: user.wins ?? 0,
        p_losses: user.losses ?? 0,
        p_draws: user.draws ?? 0,
        p_games_played: user.gamesPlayed ?? 0,
        p_favorite_club: user.favoriteClub || '',
        p_favorite_player: user.favoritePlayer || '',
        p_bio: ''
      });
      if (!legacy.error && (legacy.data as any)?.ok !== false) return;
      // --- احتياطي 2: كتابة مباشرة (لو السيرفر قديم جداً) ---
      await client.from('game_users').upsert(
        {
          id: user.id,
          player_id: user.playerId,
          username: user.username,
          name_ar: user.nameAr || user.username,
          avatar: user.avatar || '',
          rating: user.rating,
          rank_tier: user.rankTier,
          status: 'ONLINE',
          wins: user.wins,
          losses: user.losses,
          draws: user.draws,
          games_played: user.gamesPlayed,
          win_rate: user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0,
          favorite_club: user.favoriteClub,
          favorite_player: user.favoritePlayer,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );
    } catch {
      // Never let a directory-sync failure break the player-facing app.
    }
  }

  /** نبضة حضور: بتخلي اللاعب يظهر "متصل الآن" عند أصدقائه. */
  public static async heartbeat(): Promise<void> {
    const client = getSupabaseClient();
    const me = this.me();
    if (!client || !me?.id) return;
    try {
      await client.rpc('mw_heartbeat', { p_secret: getDeviceSecret(), p_id: me.id });
    } catch {
      /* ignore */
    }
  }

  /** Real search across every registered player: Player ID, nickname, or Arabic name (partial matches too). */
  public static async searchPlayers(query: string, excludeUserId?: string): Promise<FriendUser[]> {
    const clean = query.trim().replace(/[%,()]/g, ' ').trim();
    if (!clean || !isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await client
        .from('game_users')
        .select('*')
        .or(`player_id.ilike.%${clean}%,username.ilike.%${clean}%,name_ar.ilike.%${clean}%`)
        .neq('id', excludeUserId || '__none__')
        .limit(20);
      if (error || !data) return [];
      const q = clean.toLowerCase();
      const list = data.map(rowToFriend);
      // الأقرب أولاً: تطابق تام لرقم اللاعب ثم الاسم/اللقب.
      list.sort((a, b) => {
        const score = (f: FriendUser) =>
          f.playerId.toLowerCase() === q ? 0 : f.username.toLowerCase() === q || (f.nameAr || '').toLowerCase() === q ? 1 : 2;
        return score(a) - score(b);
      });
      return list;
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------- friend requests
  public static sendFriendRequest(target: FriendUser): { success: boolean; message: string } {
    if (this.isFriend(target.id)) {
      return { success: false, message: 'ده اللاعب موجود بالفعل في قائمة أصدقائك!' };
    }
    const me = this.me();
    const requests = this.getRequests();
    if (requests.some((r) => r.direction === 'OUTGOING' && r.receiverId === target.id && r.status === 'PENDING')) {
      return { success: false, message: 'في طلب صداقة لسه مستني الرد مع اللاعب ده!' };
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newReq: FriendRequest = {
      id,
      senderId: me.id,
      senderPlayerId: me.playerId || '',
      senderName: me.nameAr || me.username,
      senderAvatar: me.avatar,
      senderRating: me.rating,
      receiverId: target.id,
      status: 'PENDING',
      timestamp: Date.now(),
      direction: 'OUTGOING'
    };
    requests.unshift(newReq);
    this.saveRequests(requests);
    notify();

    const client = getSupabaseClient();
    if (client) {
      void this.ensureAuth().then(() =>
        client
          .from('friend_requests')
          .insert({
            id,
            sender_id: me.id,
            sender_player_id: me.playerId || '',
            sender_name: me.nameAr || me.username,
            sender_avatar: me.avatar || '',
            sender_rating: me.rating ?? 1000,
            receiver_id: target.id,
            status: 'PENDING'
          })
          .then(() => undefined)
      );
    }
    return { success: true, message: 'تم إرسال طلب الصداقة بنجاح! ⚽' };
  }

  public static acceptFriendRequest(requestId: string): { friends: FriendUser[]; requests: FriendRequest[] } {
    const all = this.getRequests();
    const req = all.find((r) => r.id === requestId);
    if (!req) return { friends: this.getFriends(), requests: all };

    const requests = all.filter((r) => r.id !== requestId);
    this.saveRequests(requests);

    const friends = this.getFriends();
    if (!friends.some((f) => f.id === req.senderId)) {
      friends.unshift({
        id: req.senderId,
        playerId: req.senderPlayerId,
        username: req.senderName,
        nameAr: req.senderName,
        avatar: req.senderAvatar,
        rating: req.senderRating,
        rankTier: '',
        status: 'ONLINE',
        lastActive: 'دلوقتي'
      });
      this.saveFriends(friends);
    }
    notify();

    const client = getSupabaseClient();
    if (client) {
      void client
        .from('friend_requests')
        .update({ status: 'ACCEPTED' })
        .eq('id', requestId)
        .then(() => this.pull());
    }
    return { friends, requests };
  }

  public static rejectFriendRequest(requestId: string): FriendRequest[] {
    const requests = this.getRequests().filter((r) => r.id !== requestId);
    this.saveRequests(requests);
    notify();
    const client = getSupabaseClient();
    if (client) void client.from('friend_requests').update({ status: 'REJECTED' }).eq('id', requestId).then(() => undefined);
    return requests;
  }

  public static removeFriend(friendId: string): FriendUser[] {
    const me = this.me();
    const friends = this.getFriends().filter((f) => f.id !== friendId && f.playerId !== friendId);
    this.saveFriends(friends);
    this.saveConversations(this.getConversations().filter((c) => c.friendId !== friendId));
    notify();
    const client = getSupabaseClient();
    if (client) {
      void client
        .from('friend_requests')
        .delete()
        .or(
          `and(sender_id.eq.${me.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${me.id})`
        )
        .then(() => undefined);
    }
    return friends;
  }

  // ---------------------------------------------------------------- chat
  public static getOrCreateConversation(friend: FriendUser): ChatConversation {
    const convs = this.getConversations();
    let existing = convs.find((c) => c.friendId === friend.id);
    if (!existing) {
      existing = {
        id: `conv_${friend.id}`,
        friendId: friend.id,
        friendPlayerId: friend.playerId,
        friendName: friend.nameAr || friend.username,
        friendAvatar: friend.avatar,
        friendStatus: friend.status,
        lastMessage: 'محادثة جديدة',
        lastMessageTime: '',
        unreadCount: 0,
        messages: []
      };
      convs.unshift(existing);
      this.saveConversations(convs);
    }
    return existing;
  }

  /** Sends a real message: shows instantly on your side, and reaches the friend live through Realtime. */
  public static sendMessage(conversationId: string, text: string, _legacyCb?: unknown): ChatConversation[] {
    const convs = this.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    const body = text.trim();
    if (!conv || !body) return convs;
    const me = this.me();

    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    conv.messages.push({
      id,
      conversationId,
      senderId: me.id,
      senderName: 'أنت',
      text: body,
      timestamp: Date.now(),
      read: true
    });
    conv.lastMessage = body;
    conv.lastMessageTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    this.saveConversations(convs);
    notify();

    const client = getSupabaseClient();
    if (client) {
      void this.ensureAuth().then(() =>
        client
          .from('direct_messages')
          .insert({
            id,
            conversation_key: convKeyOf(me.id, conv.friendId),
            sender_id: me.id,
            sender_name: me.nameAr || me.username,
            recipient_id: conv.friendId,
            body
          })
          .then(() => undefined)
      );
    }
    return convs;
  }

  public static markConversationRead(conversationId: string): ChatConversation[] {
    const convs = this.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (conv) {
      conv.unreadCount = 0;
      conv.messages.forEach((m) => (m.read = true));
      this.saveConversations(convs);
    }
    return convs;
  }
}
