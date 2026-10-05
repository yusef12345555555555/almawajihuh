// ============================================================
// المواجهة | «جاري اختيار المدربين…» — شاشة تحميل قبل كشف التشكيلة والمدرب
// نفس الشكل المستخدم في المزاد، ومتاحة لباقي الألعاب (ديل أور نو ديل • تاخد اللاعب ولا الخفي).
// ============================================================

import React, { useEffect, useState } from 'react';
import { audioManager } from '../services/audioManager';

const STEPS = ['بنفتح ملفات المدربين…', 'بنقيّم الأسلوب التكتيكي…', 'جاري اختيار المدربين…', 'المدربين جاهزين!'];

export const CoachPrepGate: React.FC<{ bgUrl: string; ms?: number; children: React.ReactNode }> = ({ bgUrl, ms = 3000, children }) => {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / ms);
      setProgress(p);
      if (p >= 1) {
        clearInterval(id);
        setTimeout(() => {
          setDone(true);
          try {
            audioManager.playWhistle();
          } catch {
            /* ignore */
          }
        }, 220);
      }
    }, 60);
    return () => clearInterval(id);
  }, [ms]);

  if (done) return <>{children}</>;

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length))];
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundImage: `linear-gradient(rgba(3,7,18,.15), rgba(3,7,18,.5)), url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="w-full max-w-xs px-6 text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
        <div className="relative w-24 h-24 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-2 border-amber-400/25" />
          <div className="absolute inset-0 rounded-full border-t-2 border-amber-300 animate-spin" style={{ animationDuration: '1.1s' }} />
          <div className="absolute inset-3 rounded-full border-b-2 border-yellow-200/70 animate-spin" style={{ animationDuration: '1.8s', animationDirection: 'reverse' }} />
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🧠</div>
        </div>
        <div className="text-xl font-black text-white">جاري اختيار المدربين</div>
        <div className="text-[12px] text-amber-200 font-bold mt-1.5 min-h-[18px]">{step}</div>
        <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-l from-amber-400 via-yellow-300 to-amber-500" style={{ width: `${Math.round(progress * 100)}%`, transition: 'width 80ms linear' }} />
        </div>
        <div className="mt-1 text-[10px] font-black text-white/80 tabular-nums" dir="ltr">{Math.round(progress * 100)}%</div>
      </div>
    </div>
  );
};
