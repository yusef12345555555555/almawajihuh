// ============================================================
// المواجهة | ليزر كارت «اللاعب الخفي»
// بيتحط فوق كارت اللاعب الخفي بس (مش الشاشة كلها): شعاعات ليزر بتمسح الكارت + مسح عمودي + حلقة توهج + وميض.
// بيشتغل عند الطرفين لأنه مربوط بقرار اختيار الخفي نفسه (مني أو من الخصم أو من الـ AI).
// ============================================================

import React, { useEffect, useState } from 'react';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const HiddenLaserFX: React.FC<{ active: boolean; targetId: string }> = ({ active, targetId }) => {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!active) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.getElementById(targetId);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const iv = window.setInterval(measure, 100);
    return () => window.clearInterval(iv);
  }, [active, targetId]);

  if (!active || !rect) return null;

  const beams = [
    { top: '10%', delay: 0, color: '#a855f7', dir: 'L' },
    { top: '26%', delay: 0.1, color: '#22d3ee', dir: 'R' },
    { top: '42%', delay: 0.04, color: '#f0abfc', dir: 'L' },
    { top: '58%', delay: 0.18, color: '#38bdf8', dir: 'R' },
    { top: '74%', delay: 0.08, color: '#c084fc', dir: 'L' },
    { top: '90%', delay: 0.24, color: '#22d3ee', dir: 'R' }
  ];

  return (
    <div className="pointer-events-none fixed z-[300]" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} aria-hidden="true">
      <style>{`
        @keyframes hlzSweepL { 0% { transform: translateX(-110%); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateX(110%); opacity: 0 } }
        @keyframes hlzSweepR { 0% { transform: translateX(110%); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateX(-110%); opacity: 0 } }
        @keyframes hlzRing { 0% { transform: scale(.96); opacity: .95 } 100% { transform: scale(1.18); opacity: 0 } }
        @keyframes hlzFlash { 0%,55% { opacity: 0 } 72% { opacity: .75 } 100% { opacity: 0 } }
        @keyframes hlzScan { 0% { top: -14% } 100% { top: 104% } }
        @keyframes hlzGlow { 0%,100% { opacity: .5 } 50% { opacity: 1 } }
      `}</style>
      {/* توهج حوالين الكارت */}
      <div className="absolute -inset-2 rounded-3xl" style={{ boxShadow: '0 0 28px 6px #a855f7, 0 0 60px 12px rgba(34,211,238,.55)', animation: 'hlzGlow .5s ease-in-out 3' }} />
      {[0, 0.28, 0.56].map((d, i) => (
        <div key={i} className="absolute inset-0 rounded-2xl" style={{ border: '3px solid #c084fc', animation: `hlzRing 1.1s ${d}s ease-out both` }} />
      ))}
      {/* جوه حدود الكارت بس */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        {beams.map((b, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-[3px]"
            style={{
              top: b.top,
              background: `linear-gradient(90deg, transparent, ${b.color}, #fff, ${b.color}, transparent)`,
              boxShadow: `0 0 14px 3px ${b.color}, 0 0 34px 8px ${b.color}88`,
              animation: `${b.dir === 'L' ? 'hlzSweepL' : 'hlzSweepR'} 0.95s ${b.delay}s cubic-bezier(.4,0,.2,1) both`
            }}
          />
        ))}
        <div
          className="absolute left-0 right-0 h-14"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(168,85,247,.5), rgba(34,211,238,.4), transparent)', animation: 'hlzScan 1.2s .1s linear both' }}
        />
        <div className="absolute inset-0 bg-white" style={{ animation: 'hlzFlash 1.5s ease forwards' }} />
      </div>
    </div>
  );
};
