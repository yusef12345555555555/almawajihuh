// ============================================================
// المواجهة | بنجهز المدربين ← التشكيلة والمدرب فوقها
// يُستخدم في المزاد واللاعب الخفي بعد انتهاء مرحلة الاختيار.
//
// 1) شاشة تحميل احترافية «بنجهز المدربين» (شفافة فوق خلفية اللعبة)
// 2) بعد اختيار المدرب بواسطة النظام: التشكيلة وفوقها المدرب — من غير مربعات
// ============================================================

import React, { useEffect, useState } from 'react';
import { Coach, FootballPlayer } from '../types';
import { StackedLineups } from './StackedLineups';
import { StorageService } from '../services/storageService';
import { audioManager } from '../services/audioManager';
import { Play } from 'lucide-react';

interface Props {
  bgUrl: string;
  myName: string;
  oppName: string;
  myCoach: Coach | null;
  oppCoach: Coach | null;
  mySquad: FootballPlayer[];
  oppSquad: FootballPlayer[];
  squadSize: 5 | 11;
  /** محتوى إضافي بين المدرب والتشكيلة (شريط الكروت / وايلد كارد) */
  extra?: React.ReactNode;
  highlightPlayerIds?: string[];
  oppEquipped?: import('../types').EquippedCosmetics;
  onStart: () => void;
  startLabel?: string;
  /** مدة شاشة التحميل بالمللي ثانية */
  loadingMs?: number;
}

const LOADING_STEPS = ['بنفتح ملفات المدربين…', 'بنقيّم الأسلوب التكتيكي…', 'بنختار المدرب المناسب لتشكيلتك…', 'المدربين جاهزين!'];

export const CoachLineupReveal: React.FC<Props> = ({
  bgUrl,
  myName,
  oppName,
  myCoach,
  oppCoach,
  mySquad,
  oppSquad,
  squadSize,
  extra,
  highlightPlayerIds,
  oppEquipped,
  onStart,
  startLabel = 'يلا نشوف مين هيكسب',
  loadingMs = 3200
}) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / loadingMs);
      setProgress(p);
      if (p >= 1) {
        clearInterval(id);
        setTimeout(() => {
          setLoading(false);
          try {
            audioManager.playWhistle();
          } catch {
            /* ignore */
          }
        }, 250);
      }
    }, 60);
    return () => clearInterval(id);
  }, [loadingMs]);

  const frame: React.CSSProperties = {
    backgroundImage: `linear-gradient(rgba(3,7,18,.15), rgba(3,7,18,.5)), url(${bgUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };
  const shadow = 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]';

  if (loading) {
    const step = LOADING_STEPS[Math.min(LOADING_STEPS.length - 1, Math.floor(progress * LOADING_STEPS.length))];
    return (
      <div dir="rtl" className="fixed inset-0 z-[60] flex items-center justify-center" style={frame}>
        <div className={`w-full max-w-xs px-6 text-center ${shadow}`}>
          <div className="relative w-24 h-24 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/25" />
            <div className="absolute inset-0 rounded-full border-t-2 border-amber-300 animate-spin" style={{ animationDuration: '1.1s' }} />
            <div className="absolute inset-3 rounded-full border-b-2 border-yellow-200/70 animate-spin" style={{ animationDuration: '1.8s', animationDirection: 'reverse' }} />
            <div className="absolute inset-0 flex items-center justify-center text-4xl">🧠</div>
          </div>
          <div className="text-xl font-black text-white">بنجهز المدربين</div>
          <div className="text-[12px] text-amber-200 font-bold mt-1.5 min-h-[18px]">{step}</div>
          <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-l from-amber-400 via-yellow-300 to-amber-500" style={{ width: `${Math.round(progress * 100)}%`, transition: 'width 80ms linear' }} />
          </div>
          <div className="mt-1 text-[10px] font-black text-white/80 tabular-nums" dir="ltr">{Math.round(progress * 100)}%</div>
        </div>
      </div>
    );
  }

  const myEq = StorageService.getUserProfile().equippedCosmetics;

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] overflow-y-auto select-none" style={frame}>
      <div className={`min-h-full w-full max-w-md mx-auto px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+14px)] flex flex-col gap-3 ${shadow}`}>
        {extra}

        <StackedLineups
          top={{ name: oppName, coach: oppCoach, squad: oppSquad, equipped: oppEquipped, isUser: false }}
          bottom={{ name: myName, coach: myCoach, squad: mySquad, equipped: myEq, isUser: true }}
          squadSize={squadSize}
          highlightPlayerIds={highlightPlayerIds}
        />

        <button
          type="button"
          onClick={() => {
            audioManager.playClick();
            onStart();
          }}
          className="mt-1 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 py-3 text-sm font-black text-zinc-950 shadow-[0_0_28px_rgba(245,158,11,.45)] active:scale-[.98] transition-transform"
        >
          <Play className="w-4 h-4 fill-current" /> {startLabel}
        </button>
      </div>
    </div>
  );
};
