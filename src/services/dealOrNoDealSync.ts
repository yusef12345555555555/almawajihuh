// ============================================================
// ديل أور نو ديل | DEAL OR NO DEAL — Live Match Sync (v2)
//
// بيستخدم جدول `dnd_matches` الموجود (supabase/SUPABASE_SETUP.sql).
// اللي بيتخزن في الصف = seed عشوائي لكل ماتش + سجل الأفعال (actions).
// محتوى الصناديق ما بيتبعتش — الجهازين بيولّدوه محلياً من نفس الـ seed،
// وبيعملوا replay للأفعال فيطلع نفس الحالة بالظبط (وده اللي بيخلي الرجوع
// بعد فصل النت يرجّع نفس الصناديق ونفس اللاعبين).
// ============================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import { PlayerSnapshot } from '../types';
import { DndAction, DndSide } from '../types/dealOrNoDealTypes';

export interface DndMatchRow {
  id: string;
  seed: number;
  playerA: PlayerSnapshot;
  playerB: PlayerSnapshot | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';
  actions: DndAction[];
  poolSig: string;
  pairKey: string;
  winner: DndSide | 'DRAW' | null;
  abandonedBy: DndSide | null;
  /** مدة التفكير لكل خطوة (بالثواني) — لاعب A بيختارها بعد ما الاتنين يدخلوا. null = لسه ما اتحددتش. */
  turnSeconds: number | null;
}

function rowToMatch(row: any): DndMatchRow {
  const st = (row.state || {}) as any;
  return {
    id: row.id,
    seed: Number(row.seed),
    playerA: row.player_a,
    playerB: row.player_b,
    status: row.status,
    actions: Array.isArray(st.actions) ? st.actions : [],
    poolSig: st.poolSig || '',
    pairKey: st.pairKey || '',
    winner: row.winner,
    abandonedBy: st.abandonedBy || null,
    turnSeconds: typeof st.turnSeconds === 'number' ? st.turnSeconds : null
  };
}

function fnv(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** مفتاح الزوج — ثابت للاتنين. الـ salt بيتغير في إعادة المواجهة عشان ما نلقطش ماتش قديم. */
export function makePairKey(a: string, b: string, salt: string): string {
  return fnv([a, b].sort().join('|') + '|DND2|' + salt);
}

const FRESH_MS = 90_000;

export class DealOrNoDealSync {
  static isAvailable(): boolean {
    return !!getSupabaseClient();
  }

  /**
   * الجهازين بينادوا نفس الدالة. اللي يلاقي غرفة منتظرة لنفس الزوج (وحديثة) يدخلها
   * كلاعب B؛ غير كده بيعمل غرفة جديدة بـ seed عشوائي جديد كلاعب A ويستنى.
   * ولو الاتنين عملوا غرفة في نفس اللحظة: الأقدم هي الأساسية والتانية بتتلغي.
   */
  static async joinOrCreate(me: PlayerSnapshot, pairKey: string, seed: number, poolSig: string): Promise<DndMatchRow | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const since = new Date(Date.now() - FRESH_MS).toISOString();

    const tryClaim = async (): Promise<DndMatchRow | null> => {
      const { data: rows } = await client
        .from('dnd_matches')
        .select('*')
        .eq('status', 'WAITING')
        .eq('state->>pairKey', pairKey)
        .is('player_b', null)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(5);
      for (const w of rows || []) {
        if (w.player_a?.id === me.id) continue;
        const { data: claimed } = await client
          .from('dnd_matches')
          .update({ player_b: me, status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
          .eq('id', w.id)
          .eq('status', 'WAITING')
          .is('player_b', null)
          .select()
          .maybeSingle();
        if (claimed) return rowToMatch(claimed);
      }
      return null;
    };

    const claimed = await tryClaim();
    if (claimed) return claimed;

    const { data, error } = await client
      .from('dnd_matches')
      .insert({
        seed,
        player_a: me,
        player_b: null,
        status: 'WAITING',
        turn: 'A',
        state: { pairKey, poolSig, actions: [], turnSeconds: null }
      })
      .select()
      .single();
    if (error || !data) return null;

    // سباق: لو الخصم عمل غرفة في نفس اللحظة، الأقدم تكسب.
    const { data: rivals } = await client
      .from('dnd_matches')
      .select('*')
      .eq('status', 'WAITING')
      .eq('state->>pairKey', pairKey)
      .is('player_b', null)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(5);
    const first = (rivals || [])[0];
    if (first && first.id !== data.id && first.player_a?.id !== me.id) {
      await client.from('dnd_matches').update({ status: 'ABANDONED' }).eq('id', data.id);
      const c2 = await tryClaim();
      if (c2) return c2;
    }
    return rowToMatch(data);
  }

  static async fetch(matchId: string): Promise<DndMatchRow | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await client.from('dnd_matches').select('*').eq('id', matchId).maybeSingle();
    return data ? rowToMatch(data) : null;
  }

  static subscribe(matchId: string, onUpdate: (row: DndMatchRow) => void): () => void {
    const client = getSupabaseClient();
    if (!client) return () => {};
    let channel: RealtimeChannel | null = null;
    try {
      channel = client
        .channel(`dnd_match_v2:${matchId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dnd_matches', filter: `id=eq.${matchId}` }, (payload) =>
          onUpdate(rowToMatch(payload.new))
        )
        .subscribe();
    } catch {
      /* الـ polling هو الاحتياطي */
    }
    return () => {
      try {
        if (channel) client.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }

  /** بيكتب سجل الأفعال كله (اللي دوره بس هو اللي بيكتب، فمفيش تعارض). */
  static async pushActions(row: DndMatchRow, actions: DndAction[]): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    await client
      .from('dnd_matches')
      .update({
        state: { pairKey: row.pairKey, poolSig: row.poolSig, actions, turnSeconds: row.turnSeconds },
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id)
      .eq('status', 'IN_PROGRESS');
  }

  /** لاعب A بيحدد مدة التفكير قبل ما اللعب يبدأ. */
  static async setTurnSeconds(row: DndMatchRow, seconds: number): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    await client
      .from('dnd_matches')
      .update({
        state: { pairKey: row.pairKey, poolSig: row.poolSig, actions: row.actions, turnSeconds: seconds },
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id)
      .eq('status', 'IN_PROGRESS');
  }

  /** انسحاب: الماتش بيتقفل والخصم بياخد الفوز. */
  static async abandon(row: DndMatchRow, leaver: DndSide, actions: DndAction[]): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    await client
      .from('dnd_matches')
      .update({
        status: 'ABANDONED',
        winner: leaver === 'A' ? 'B' : 'A',
        state: { pairKey: row.pairKey, poolSig: row.poolSig, actions, abandonedBy: leaver, turnSeconds: row.turnSeconds },
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id)
      .in('status', ['IN_PROGRESS', 'WAITING']);
  }

  static async finish(row: DndMatchRow, winner: DndSide | 'DRAW'): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    await client
      .from('dnd_matches')
      .update({ status: 'FINISHED', winner, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'IN_PROGRESS');
  }

  static async cancelWaiting(matchId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    await client.from('dnd_matches').update({ status: 'ABANDONED' }).eq('id', matchId).eq('status', 'WAITING');
  }
}
