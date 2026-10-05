// ============================================================
// Roster gate: players & coaches come ONLY from the admin panel, so before a
// game that draws cards opens we make sure the roster is loaded (fresh from the
// server) and big enough. If it's not, the player gets a clear message instead
// of a black screen or a half-broken game.
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, WifiOff, RefreshCw, ArrowRight } from 'lucide-react';
import { getAllPlayers } from '../services/playerRepository';
import { getAllCoaches } from '../services/coachRepository';
import { preloadImages } from '../services/imagePreloader';

export interface RosterNeeds {
  gk?: number;
  def?: number;
  mid?: number;
  att?: number;
  coaches?: number;
  total?: number;
}

interface Counts {
  gk: number;
  def: number;
  mid: number;
  att: number;
  coaches: number;
  total: number;
}

const DEF = ['CB', 'LB', 'RB'];
const MID = ['CM', 'CAM', 'CDM', 'LM', 'RM'];
const ATT = ['ST', 'RW', 'LW', 'CF'];

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

interface Props {
  needs: RosterNeeds;
  onBack: () => void;
  children: React.ReactNode;
}

export const RosterGate: React.FC<Props> = ({ needs, onBack, children }) => {
  const [state, setState] = useState<'loading' | 'preloading' | 'ok' | 'short'>('loading');
  const [counts, setCounts] = useState<Counts | null>(null);

  const check = useCallback(async () => {
    setState('loading');
    const [players, coaches] = await Promise.all([
      withTimeout(getAllPlayers(true), 8000, null),
      withTimeout(getAllCoaches(true), 8000, null)
    ]);
    // if the network timed out, fall back to whatever is already cached
    const ps = players ?? (await getAllPlayers());
    const cs = coaches ?? (await getAllCoaches());
    const c: Counts = {
      gk: ps.filter((p) => p.position === 'GK').length,
      def: ps.filter((p) => DEF.includes(p.position)).length,
      mid: ps.filter((p) => MID.includes(p.position)).length,
      att: ps.filter((p) => ATT.includes(p.position)).length,
      coaches: cs.length,
      total: ps.length
    };
    setCounts(c);
    const ok =
      c.gk >= (needs.gk ?? 0) &&
      c.def >= (needs.def ?? 0) &&
      c.mid >= (needs.mid ?? 0) &&
      c.att >= (needs.att ?? 0) &&
      c.coaches >= (needs.coaches ?? 0) &&
      c.total >= (needs.total ?? 0);
    if (!ok) {
      setState('short');
      return;
    }
    // Warm the browser's image cache for this roster's photos NOW, while
    // the loading screen is already showing — this is exactly what makes
    // cards appear instantly once the game actually starts instead of
    // popping in slowly mid-match. Capped at 4s so a slow/offline photo
    // can never delay entry beyond that.
    setState('preloading');
    await preloadImages([...ps.map((p) => p.photoUrl), ...cs.map((cch) => cch.photoUrl)], 4000, 60);
    setState('ok');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (state === 'ok') return <>{children}</>;

  if (state === 'loading' || state === 'preloading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-zinc-400" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="text-sm font-bold">
          جاري تجهيز المواجهة...
        </span>
      </div>
    );
  }

  const row = (label: string, have: number, need?: number) =>
    need ? (
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-300">{label}</span>
        <span className={have >= need ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
          {have} / {need}
        </span>
      </div>
    ) : null;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4" dir="rtl">
      <div className="max-w-md w-full bg-zinc-950/90 border border-rose-500/40 rounded-3xl p-6 space-y-4 text-center">
        <WifiOff className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-base font-black text-white">مفيش لاعبين كفاية في قاعدة البيانات حاليًا</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          بطاقات اللاعبين والمدربين بتيجي من الإدارة بس، ولازم يكون فيه اتصال بالإنترنت. اطلب من الإدارة تضيف الناقص وحاول تاني.
        </p>
        {counts && (
          <div className="bg-zinc-900 rounded-2xl p-4 space-y-2">
            {row('حراس المرمى', counts.gk, needs.gk)}
            {row('المدافعين', counts.def, needs.def)}
            {row('خط الوسط', counts.mid, needs.mid)}
            {row('المهاجمين', counts.att, needs.att)}
            {row('المدربين', counts.coaches, needs.coaches)}
            {row('إجمالي اللاعبين', counts.total, needs.total)}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => void check()}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-amber-500 text-zinc-950 text-sm font-black cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </button>
          <button
            onClick={onBack}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-zinc-800 text-white text-sm font-black cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" /> رجوع
          </button>
        </div>
      </div>
    </div>
  );
};
