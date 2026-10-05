// ============================================================
// أنت المدرب | احتفالية التتويج بالبطولة (Trophy Celebration Modal)
// ============================================================

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { audioManager } from '../../services/audioManager';
import { Trophy, Award, Sparkles, Star, ChevronLeft } from 'lucide-react';

interface TrophyCelebrationModalProps {
  competitionTitleAr: string;
  teamNameAr: string;
  managerName: string;
  onClose: () => void;
}

export const TrophyCelebrationModal: React.FC<TrophyCelebrationModalProps> = ({
  competitionTitleAr,
  teamNameAr,
  managerName,
  onClose
}) => {
  useEffect(() => {
    audioManager.playFanfare();

    // Multistage Confetti fireworks
    const duration = 4.5 * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(245,158,11,0.5)] space-y-6 animate-in fade-in zoom-in duration-300">
        {/* Glow ambient */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Golden Trophy Icon */}
        <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 p-1 shadow-2xl flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-yellow-400 animate-bounce" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>مبرووووك التتويج التاريخي</span>
            <Sparkles className="w-4 h-4" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">
            بطل {competitionTitleAr}!
          </h2>

          <p className="text-sm text-zinc-300 max-w-sm mx-auto leading-relaxed">
            قاد المدير الفني القدير <strong className="text-amber-400">{managerName}</strong> نادي{' '}
            <strong className="text-white">{teamNameAr}</strong> لحصد اللقب عن جدارة واستحقاق بعد موسم تكتيكي استثنائي!
          </p>
        </div>

        {/* Honors Badges */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <div className="bg-zinc-900/80 border border-amber-500/30 p-2.5 rounded-2xl">
            <div className="text-xs font-mono font-black text-amber-400">+100</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">سمعة المدرب</div>
          </div>
          <div className="bg-zinc-900/80 border border-amber-500/30 p-2.5 rounded-2xl">
            <div className="text-xs font-mono font-black text-emerald-400">+1</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">كأس جديدة</div>
          </div>
          <div className="bg-zinc-900/80 border border-amber-500/30 p-2.5 rounded-2xl">
            <div className="text-xs font-mono font-black text-yellow-300">نجم ذهبي</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">وسام التكتيك</div>
          </div>
        </div>

        {/* Close / Continue Button */}
        <button
          onClick={() => {
            audioManager.playClick();
            onClose();
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-sm shadow-xl hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>استكمال المسيرة التدريبية</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
