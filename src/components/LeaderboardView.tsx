// ============================================================
// المواجهة | المتصدرون — ترتيب فعلي من لاعبين حقيقيين
//
// - البيانات من جدول اللاعبين الحقيقي (التقييم بيتغير بنتائج المباريات الفعلية).
// - منصة تتويج: الأول فوق بتاج ورقم 1، التاني والتالت على الجنبين بميدالية برقم الترتيب.
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Crown, Trophy, Medal, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { UserProfile, EquippedCosmetics } from '../types';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';
import { PlayerCosmeticName } from './PlayerCosmeticName';

interface Row {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  rating: number;
  rankTier: string;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  equipped?: EquippedCosmetics;
}

const MEDAL = {
  2: { ring: 'from-zinc-200 to-zinc-400', text: 'text-zinc-900', block: 'from-zinc-500/80 to-zinc-700/80', h: 'h-20' },
  3: { ring: 'from-amber-500 to-amber-800', text: 'text-amber-50', block: 'from-amber-800/80 to-amber-950/80', h: 'h-14' }
} as const;

const PodiumPlayer: React.FC<{ p?: Row; place: 1 | 2 | 3; mine: boolean }> = ({ p, place, mine }) => {
  if (!p) return <div className="flex-1" />;
  const first = place === 1;
  return (
    <div className={`flex-1 min-w-0 flex flex-col items-center ${first ? 'order-2' : place === 2 ? 'order-1' : 'order-3'}`}>
      {first && <Crown className="w-8 h-8 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,.8)] mb-0.5" fill="currentColor" />}
      <div className="relative">
        <PlayerAvatarBadge avatar={p.avatar} size={first ? 'xl' : 'lg'} ring={false} equipped={p.equipped} className={`${first ? 'ring-4 ring-amber-300' : place === 2 ? 'ring-4 ring-zinc-300' : 'ring-4 ring-amber-700'}`} />
        {!first && (
          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-b ${MEDAL[place as 2 | 3].ring} ${MEDAL[place as 2 | 3].text} border-2 border-white/70 shadow flex items-center justify-center`}>
            <span className="text-xs font-black">{place}</span>
          </div>
        )}
      </div>
      <div className="mt-3 w-full text-center px-0.5">
        <PlayerCosmeticName name={p.name} equipped={p.equipped} size="sm" showTitle={false} />
        <div className={`font-black font-mono ${first ? 'text-amber-300 text-base' : 'text-white text-sm'}`}>{p.rating}</div>
        {mine && <div className="text-[9px] font-black text-emerald-300">أنت</div>}
      </div>
      <div
        className={`mt-1 w-full rounded-t-2xl bg-gradient-to-b flex items-start justify-center pt-1 ${
          first ? 'h-28 from-amber-400/90 to-amber-700/90 shadow-[0_0_30px_rgba(245,158,11,.35)]' : `${MEDAL[place as 2 | 3].h} ${MEDAL[place as 2 | 3].block}`
        }`}
      >
        {first && <span className="text-3xl font-black text-zinc-950">1</span>}
        {!first && <span className="text-xl font-black text-white/90">{place}</span>}
      </div>
    </div>
  );
};

export const LeaderboardView: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const client = getSupabaseClient();
      if (!client) {
        if (!cancelled) setLoaded(true);
        return;
      }
      try {
        const { data } = await client
          .from('game_users')
          .select('id,name_ar,username,avatar,rating,rank_tier,wins,losses,draws,games_played,equipped')
          .order('rating', { ascending: false })
          .order('wins', { ascending: false })
          .limit(100);
        if (cancelled) return;
        const real = (data || []).filter((r: any) => (r.games_played ?? 0) > 0 || r.id === user.id);
        setRows(
          real.map((r: any, i: number) => ({
            rank: i + 1,
            id: r.id,
            name: r.name_ar || r.username,
            avatar: r.avatar,
            rating: r.rating,
            rankTier: r.rank_tier,
            wins: r.wins ?? 0,
            losses: r.losses ?? 0,
            draws: r.draws ?? 0,
            games: r.games_played ?? 0,
            equipped: r.equipped && Object.keys(r.equipped).length ? r.equipped : undefined
          }))
        );
      } catch {
        /* keep previous */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    void load();
    const t = window.setInterval(load, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [user.id]);

  const myRow = useMemo(() => rows.find((r) => r.id === user.id), [rows, user.id]);
  const rest = rows.slice(3);

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12 px-1" dir="rtl">
      <div className="text-center pt-1">
        <div className="inline-flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-black text-white">المتصدرون</h2>
        </div>
        <p className="text-[11px] text-zinc-400 mt-0.5">الترتيب من مبارياتك الفعلية مع أصدقائك واللاعبين الحقيقيين</p>
      </div>

      {!loaded && (
        <div className="flex items-center justify-center py-10 text-zinc-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> بنحمّل الترتيب...
        </div>
      )}

      {loaded && rows.length === 0 && (
        <div className="text-center text-sm text-zinc-400 py-10">
          لسه مفيش مباريات مسجّلة. العب أول ماتش وكن أول المتصدرين! 🏆
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* منصة التتويج */}
          <div className="flex items-end gap-2 px-1 pt-2">
            <PodiumPlayer p={rows[1]} place={2} mine={rows[1]?.id === user.id} />
            <PodiumPlayer p={rows[0]} place={1} mine={rows[0]?.id === user.id} />
            <PodiumPlayer p={rows[2]} place={3} mine={rows[2]?.id === user.id} />
          </div>

          {/* ترتيبي */}
          {myRow && myRow.rank > 3 && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-center text-xs font-black text-emerald-200">
              ترتيبك الحالي: #{myRow.rank} • {myRow.rating} نقطة
            </div>
          )}

          {/* باقي الترتيب */}
          <div className="space-y-1.5">
            {rest.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2 ${r.id === user.id ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-950/70'}`}
              >
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-black text-amber-300 shrink-0">{r.rank}</div>
                <PlayerAvatarBadge avatar={r.avatar} size="sm" equipped={r.equipped} />
                <div className="min-w-0 flex-1">
                  <PlayerCosmeticName name={r.name} equipped={r.equipped} size="sm" showTitle={false} />
                  <div className="text-[10px] text-zinc-500">
                    {r.games} مباراة • فوز {r.wins} • خسارة {r.losses}
                  </div>
                </div>
                <div className="text-sm font-black text-amber-400 font-mono">{r.rating}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500">
            <Medal className="w-3 h-3" /> بيتحدّث تلقائياً
          </div>
        </>
      )}
    </div>
  );
};
