// ============================================================
// المواجهة | سجل المباريات (الملف الشخصي): نوع اللعبة • المنافس • التاريخ • النتيجة
// ============================================================

import React, { useMemo, useState } from 'react';
import { Swords, Bot, User, History } from 'lucide-react';
import { getMatchHistory, MatchHistoryResult } from '../services/dailyService';

const RES: Record<MatchHistoryResult, { label: string; bar: string; chip: string }> = {
  WIN: { label: 'فوز', bar: 'bg-emerald-400', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40' },
  LOSS: { label: 'خسارة', bar: 'bg-rose-400', chip: 'bg-rose-500/15 text-rose-300 border-rose-400/40' },
  DRAW: { label: 'تعادل', bar: 'bg-amber-400', chip: 'bg-amber-500/15 text-amber-300 border-amber-400/40' }
};

const fmtDate = (t: number) =>
  new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(t));

export const MatchHistoryList: React.FC = () => {
  const all = useMemo(() => getMatchHistory(), []);
  const [filter, setFilter] = useState<'ALL' | MatchHistoryResult>('ALL');
  const list = filter === 'ALL' ? all : all.filter((m) => m.result === filter);
  const wins = all.filter((m) => m.result === 'WIN').length;
  const losses = all.filter((m) => m.result === 'LOSS').length;
  const draws = all.length - wins - losses;

  return (
    <div className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-black text-white">سجل المباريات</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-black">
          <span className="text-emerald-300">{wins} فوز</span>•<span className="text-amber-300">{draws} تعادل</span>•<span className="text-rose-300">{losses} خسارة</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {([['ALL', 'الكل'], ['WIN', 'فوز'], ['DRAW', 'تعادل'], ['LOSS', 'خسارة']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-lg py-1.5 text-[11px] font-black border ${filter === k ? 'bg-amber-400 text-zinc-950 border-amber-200' : 'bg-zinc-900 text-zinc-300 border-zinc-800'}`}>
            {l}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="text-center text-xs text-zinc-500 py-6">لسه مفيش مباريات هنا — العب أول ماتش!</div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
          {list.map((m) => (
            <div key={m.id} className="relative overflow-hidden flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 pl-3 pr-4 py-2.5">
              <div className={`absolute right-0 top-0 bottom-0 w-1 ${RES[m.result].bar}`} />
              <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                {m.opponentIsAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-white">
                  <Swords className="w-3 h-3 text-amber-400" /> <span className="truncate">{m.gameLabelAr}</span>
                </div>
                <div className="text-[11px] text-zinc-300 truncate">ضد {m.opponentName}</div>
                <div className="text-[10px] text-zinc-500">{fmtDate(m.at)}</div>
              </div>
              <div className="text-center shrink-0">
                <div className="text-base font-black text-white font-mono tabular-nums" dir="ltr">{m.scoreFor} - {m.scoreAgainst}</div>
                <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-black ${RES[m.result].chip}`}>{RES[m.result].label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
