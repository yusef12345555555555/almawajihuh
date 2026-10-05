// ============================================================
// المواجهة | لوحة إحصائيات المباراة (أثناء المحاكاة وبعدها)
// - كل الأرقام مشتقة من أحداث المباراة الفعلية (liveMatchStats).
// - أنت على الشمال والخصم على اليمين — نفس ترتيب شاشة النتيجة.
// ============================================================

import React from 'react';
import { LiveStats } from '../services/liveMatchStats';

interface Props {
  stats: LiveStats;
  /** هل أنا الفريق المضيف (home)؟ */
  myIsHome: boolean;
  myName: string;
  oppName: string;
  finished: boolean;
  /** نسخة مختصرة أثناء اللعب */
  compact?: boolean;
}

const MY = { from: '#34d399', to: '#10b981', glow: 'rgba(52,211,153,.55)' };
const OPP = { from: '#fb7185', to: '#e11d48', glow: 'rgba(251,113,133,.55)' };

const StatRow: React.FC<{ label: string; icon: string; me: number; opp: number; suffix?: string; invert?: boolean; decimals?: number }> = ({
  label,
  icon,
  me,
  opp,
  suffix = '',
  invert = false,
  decimals = 0
}) => {
  const total = me + opp;
  const mePct = total === 0 ? 50 : (me / total) * 100;
  const meLeads = invert ? me < opp : me > opp;
  const oppLeads = invert ? opp < me : opp > me;
  const fmt = (n: number) => (decimals ? n.toFixed(decimals) : String(n)) + suffix;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px] font-black tabular-nums" dir="ltr">
        <span className={meLeads ? 'text-emerald-300 scale-110 origin-left transition-transform' : 'text-white/80'}>{fmt(me)}</span>
        <span className="text-[10px] font-black text-white/85 tracking-wide" dir="rtl">
          {icon} {label}
        </span>
        <span className={oppLeads ? 'text-rose-300 scale-110 origin-right transition-transform' : 'text-white/80'}>{fmt(opp)}</span>
      </div>
      <div className="flex h-2 gap-[3px]" dir="ltr">
        <div className="flex-1 h-full rounded-full bg-white/10 overflow-hidden flex justify-end">
          <div
            className="h-full rounded-full"
            style={{
              width: `${mePct}%`,
              background: `linear-gradient(270deg, ${MY.from}, ${MY.to})`,
              boxShadow: meLeads ? `0 0 10px ${MY.glow}` : 'none',
              transition: 'width 600ms cubic-bezier(.2,.8,.2,1)'
            }}
          />
        </div>
        <div className="flex-1 h-full rounded-full bg-white/10 overflow-hidden flex justify-start">
          <div
            className="h-full rounded-full"
            style={{
              width: `${100 - mePct}%`,
              background: `linear-gradient(90deg, ${OPP.from}, ${OPP.to})`,
              boxShadow: oppLeads ? `0 0 10px ${OPP.glow}` : 'none',
              transition: 'width 600ms cubic-bezier(.2,.8,.2,1)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const MatchLiveStatsPanel: React.FC<Props> = ({ stats, myIsHome, myName, oppName, finished, compact = false }) => {
  const my = myIsHome ? stats.home : stats.away;
  const opp = myIsHome ? stats.away : stats.home;
  // الزخم من وجهة نظري: موجب = أنا ضاغط
  const momentum = myIsHome ? stats.momentum : -stats.momentum;
  const timeline = stats.timeline.map((t) => ({ me: myIsHome ? t.home : t.away, opp: myIsHome ? t.away : t.home }));
  const maxBar = Math.max(1, ...timeline.map((t) => Math.max(t.me, t.opp)));
  const labels = ['15', '30', '45', '60', '75', '90'];

  return (
    <div
      dir="rtl"
      className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-black/75 to-black/60 backdrop-blur-md [text-shadow:0_1px_3px_rgba(0,0,0,.9)] p-3 shadow-[0_10px_40px_rgba(0,0,0,.45)]"
    >
      <div className="pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-10 h-40 w-40 rounded-full bg-rose-500/20 blur-3xl" />

      <div className="relative flex items-center justify-between mb-2.5" dir="ltr">
        <span className="max-w-[34%] truncate text-[11px] font-black text-emerald-300">{myName}</span>
        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200">
          {!finished && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />}
          {finished ? 'إحصائيات المباراة' : 'إحصائيات مباشرة'}
        </span>
        <span className="max-w-[34%] truncate text-[11px] font-black text-rose-300">{oppName}</span>
      </div>

      <div className="relative space-y-2.5">
        <StatRow label="الاستحواذ" icon="🎯" me={my.possession} opp={opp.possession} suffix="%" />
        <StatRow label="التسديدات" icon="👟" me={my.shots} opp={opp.shots} />
        <StatRow label="على المرمى" icon="🥅" me={my.onTarget} opp={opp.onTarget} />
        <StatRow label="الأهداف المتوقعة xG" icon="📈" me={my.xg} opp={opp.xg} decimals={2} />
        {!compact && (
          <>
            <StatRow label="التصديات" icon="🧤" me={my.saves} opp={opp.saves} />
            <StatRow label="الركنيات" icon="🚩" me={my.corners} opp={opp.corners} />
            <StatRow label="المخالفات" icon="⚠️" me={my.fouls} opp={opp.fouls} invert />
            <StatRow label="إنذارات" icon="🟨" me={my.yellow} opp={opp.yellow} invert />
            {(my.red > 0 || opp.red > 0) && <StatRow label="طرد" icon="🟥" me={my.red} opp={opp.red} invert />}
            {(my.woodwork > 0 || opp.woodwork > 0) && <StatRow label="القائم والعارضة" icon="💥" me={my.woodwork} opp={opp.woodwork} />}
            {(my.injuries > 0 || opp.injuries > 0) && <StatRow label="إصابات" icon="🚑" me={my.injuries} opp={opp.injuries} invert />}
          </>
        )}
      </div>

      {/* مقياس الزخم (آخر 15 دقيقة) */}
      <div className="relative mt-3" dir="ltr">
        <div className="flex items-center justify-between text-[9px] font-black text-white/90 mb-1">
          <span>ضغطك</span>
          <span className="text-amber-200">⚡ الزخم الحالي</span>
          <span>ضغط الخصم</span>
        </div>
        <div className="relative h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/40 z-10" />
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              // أنا على الشمال: ضغطي يمدّ الشريط ناحية الشمال، وضغط الخصم ناحية اليمين
              ...(momentum >= 0 ? { right: '50%' } : { left: '50%' }),
              width: `${Math.abs(momentum) * 50}%`,
              background: momentum >= 0 ? 'linear-gradient(270deg,#34d399,#10b981)' : 'linear-gradient(90deg,#fb7185,#e11d48)',
              transition: 'all 600ms ease'
            }}
          />
        </div>
      </div>

      {/* خط زمني للمحاولات */}
      {!compact && (
        <div className="relative mt-3" dir="ltr">
          <div className="text-[9px] font-black text-white/90 mb-1 text-center">🕒 حدّة الهجمات كل 15 دقيقة</div>
          <div className="grid grid-cols-6 gap-1.5 items-end h-14">
            {timeline.map((t, i) => (
              <div key={i} className="flex flex-col items-center justify-end h-full gap-[2px]">
                <div className="flex items-end gap-[2px] h-full w-full justify-center">
                  <div className="w-1/2 max-w-[10px] rounded-t bg-gradient-to-t from-emerald-600 to-emerald-300" style={{ height: `${(t.me / maxBar) * 100}%`, minHeight: t.me ? 3 : 1, transition: 'height 500ms' }} />
                  <div className="w-1/2 max-w-[10px] rounded-t bg-gradient-to-t from-rose-600 to-rose-300" style={{ height: `${(t.opp / maxBar) * 100}%`, minHeight: t.opp ? 3 : 1, transition: 'height 500ms' }} />
                </div>
                <span className="text-[8px] font-black text-white/80 tabular-nums">{labels[i]}'</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.topPerformer && (
        <div className="relative mt-3 flex items-center justify-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[11px] font-black text-amber-200">
          ⭐ {stats.topPerformer.label}: <span className="text-white">{stats.topPerformer.name}</span>
        </div>
      )}
    </div>
  );
};
