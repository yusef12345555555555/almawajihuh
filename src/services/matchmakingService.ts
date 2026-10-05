// ============================================================
// المواجهة | AL MWAJHA — Real Matchmaking Service
//
// Backed by Supabase (`matchmaking_queue`, `match_invites` — see
// supabase/schema.sql). No fake/demo opponents: every match here
// is between two real device identities.
// ============================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import { NotificationService } from './notificationService';
import { MatchInvite, MatchmakingTicket, PlayerSnapshot } from '../types';

function rowToTicket(row: any): MatchmakingTicket {
  return {
    id: row.id,
    playerId: row.player_id,
    playerSnapshot: row.player_snapshot,
    gameMode: row.game_mode,
    status: row.status,
    matchedWith: row.matched_with ?? undefined,
    opponentSnapshot: row.opponent_snapshot ?? undefined,
    createdAt: row.created_at
  };
}

function rowToInvite(row: any): MatchInvite {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderSnapshot: row.sender_snapshot,
    recipientId: row.recipient_id,
    gameMode: row.game_mode,
    status: row.status,
    createdAt: row.created_at
  };
}

export class MatchmakingService {
  static isAvailable(): boolean {
    return !!getSupabaseClient();
  }

  /**
   * "هاتلي منافس" — enqueue for a quick real-player match. Tries to
   * atomically claim an existing SEARCHING ticket for the same game
   * mode first (instant match); otherwise creates a new ticket and
   * waits for someone else to claim it (via subscribe()).
   */
  static async enqueue(me: PlayerSnapshot, gameMode: string): Promise<MatchmakingTicket | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    // 1) Look for someone else already searching for the same mode.
    const { data: candidates } = await client
      .from('matchmaking_queue')
      .select('*')
      .eq('game_mode', gameMode)
      .eq('status', 'SEARCHING')
      .neq('player_id', me.id)
      .order('created_at', { ascending: true })
      .limit(5);

    if (candidates && candidates.length > 0) {
      for (const candidate of candidates) {
        // Atomic claim: only succeeds if it's STILL 'SEARCHING' — this
        // is what prevents two players from claiming the same ticket.
        const { data: claimed, error } = await client
          .from('matchmaking_queue')
          .update({ status: 'MATCHED', matched_with: me.id, opponent_snapshot: me, updated_at: new Date().toISOString() })
          .eq('id', candidate.id)
          .eq('status', 'SEARCHING')
          .select()
          .maybeSingle();

        if (!error && claimed) {
          // Create my own MATCHED row too, so my own subscribe() flow works identically.
          const { data: myRow } = await client
            .from('matchmaking_queue')
            .insert({
              player_id: me.id,
              player_snapshot: me,
              game_mode: gameMode,
              status: 'MATCHED',
              matched_with: claimed.player_id,
              opponent_snapshot: claimed.player_snapshot
            })
            .select()
            .single();

          // Real notification to the other player (their client is likely
          // subscribed live, but this also covers the "left the screen" case).
          await NotificationService.send({
            recipientId: claimed.player_id,
            recipientPlayerId: claimed.player_snapshot?.playerId,
            type: 'OPPONENT_FOUND',
            title: 'تم العثور على منافس',
            body: `${me.nameAr || me.name} جاهز لمواجهتك دلوقتي!`,
            data: { screen: 'games' }
          });

          return myRow ? rowToTicket(myRow) : null;
        }
        // Someone else claimed it first — try the next candidate.
      }
    }

    // 2) Nobody available yet — create a fresh SEARCHING ticket and wait.
    const { data, error } = await client
      .from('matchmaking_queue')
      .insert({ player_id: me.id, player_snapshot: me, game_mode: gameMode, status: 'SEARCHING' })
      .select()
      .single();

    if (error || !data) return null;
    return rowToTicket(data);
  }

  static async cancel(ticketId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('matchmaking_queue').update({ status: 'CANCELLED' }).eq('id', ticketId).eq('status', 'SEARCHING');
    } catch {
      // ignore
    }
  }

  /** Subscribes to updates on my own ticket (fires when someone claims me). */
  static subscribeToTicket(ticketId: string, onUpdate: (t: MatchmakingTicket) => void): () => void {
    const client = getSupabaseClient();
    if (!client) return () => {};

    let channel: RealtimeChannel | null = null;
    try {
      channel = client
        .channel(`mm_ticket:${ticketId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'matchmaking_queue', filter: `id=eq.${ticketId}` },
          (payload) => onUpdate(rowToTicket(payload.new))
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

  // ---------------- Friend invites ("بحث عن صديق") ----------------

  static async sendInvite(sender: PlayerSnapshot, recipientId: string, recipientPlayerId: string, gameMode: string): Promise<MatchInvite | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('match_invites')
      .insert({ sender_id: sender.id, sender_snapshot: sender, recipient_id: recipientId, game_mode: gameMode, status: 'PENDING' })
      .select()
      .single();

    if (error || !data) return null;

    await NotificationService.send({
      recipientId,
      recipientPlayerId,
      type: 'GAME_INVITE',
      title: 'دعوة لمباراة',
      body: `${sender.nameAr || sender.name} دعاك تلعب المواجهة!`,
      data: { screen: 'games', matchInviteId: data.id }
    });

    return rowToInvite(data);
  }

  static async fetchPendingInvitesFor(userId: string): Promise<MatchInvite[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client
      .from('match_invites')
      .select('*')
      .eq('recipient_id', userId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToInvite);
  }

  static async respondToInvite(inviteId: string, accept: boolean): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('match_invites').update({ status: accept ? 'ACCEPTED' : 'DECLINED', updated_at: new Date().toISOString() }).eq('id', inviteId);
    } catch {
      // ignore
    }
  }

  static subscribeToInvite(inviteId: string, onUpdate: (invite: MatchInvite) => void): () => void {
    const client = getSupabaseClient();
    if (!client) return () => {};
    let channel: RealtimeChannel | null = null;
    try {
      channel = client
        .channel(`invite:${inviteId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'match_invites', filter: `id=eq.${inviteId}` },
          (payload) => onUpdate(rowToInvite(payload.new))
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

  /** Subscribes to brand-new invites addressed to me (for a live in-app banner). */
  static subscribeToIncomingInvites(userId: string, onInvite: (invite: MatchInvite) => void): () => void {
    const client = getSupabaseClient();
    if (!client) return () => {};
    let channel: RealtimeChannel | null = null;
    try {
      channel = client
        .channel(`incoming_invites:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'match_invites', filter: `recipient_id=eq.${userId}` },
          (payload) => onInvite(rowToInvite(payload.new))
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
}
