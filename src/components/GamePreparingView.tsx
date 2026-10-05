// ============================================================
// العبها صح | EL3BHA SA7 - Game Preparation & Loading View
// ============================================================

import React, { useEffect, useState } from 'react';
import { SupportedGameType, GAME_REGISTRY } from '../services/gameRegistry';
import { Swords, ShieldCheck, Zap, Sparkles, Trophy, Loader2 } from 'lucide-react';
import { audioManager } from '../services/audioManager';

interface GamePreparingViewProps {
  gameType: SupportedGameType;
  gameMode?: string;
  opponentName?: string;
  opponentAvatar?: string;
  onReadyToPlay: () => void;
}

export const GamePreparingView: React.FC<GamePreparingViewProps> = ({
  gameType,
  gameMode = 'كلاسيك 100M',
  opponentName = 'الخصم التكتيكي',
  opponentAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  onReadyToPlay
}) => {
  const [prepProgress, setPrepProgress] = useState(0);
  const [prepStatusText, setPrepStatusText] = useState('جارٍ الاتصال بالسيرفر وتثبيت الجلسة...');
  const [countdown, setCountdown] = useState<number | null>(null);

  const gameInfo = GAME_REGISTRY[gameType] || GAME_REGISTRY.AUCTION;

  useEffect(() => {
    // Step 1: Simulated Fast Authoritative Verification (1.2s total)
    const timer1 = setTimeout(() => {
      setPrepProgress(35);
      setPrepStatusText('جارٍ سحب وتوزيع بطاقات اللاعبين والمدربين...');
    }, 400);

    const timer2 = setTimeout(() => {
      setPrepProgress(75);
      setPrepStatusText('جارٍ إعداد أرضية الملعب والمزامنة الحية...');
    }, 800);

    const timer3 = setTimeout(() => {
      setPrepProgress(100);
      setPrepStatusText('اكتملت الجاهزية! انطلاق المواجهة...');
      setCountdown(3);
    }, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Countdown timer 3 -> 2 -> 1 -> START
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      audioManager.playTimerBeep();
      const countTimer = setTimeout(() => {
        setCountdown((c) => (c !== null ? c - 1 : null));
      }, 900);
      return () => clearTimeout(countTimer);
    } else if (countdown === 0) {
      audioManager.playWhistle();
      onReadyToPlay();
    }
  }, [countdown, onReadyToPlay]);

  return (
    <div
      id="game_preparing_environment"
      className="fixed inset-0 z-50 bg-gradient-to-b from-zinc-950 via-[#070b14] to-black text-white flex flex-col items-center justify-center p-4 select-none"
      dir="rtl"
    >
      {/* Background Decorative Rings */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full bg-zinc-900/90 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center space-y-6 backdrop-blur-2xl">
        {/* Game Title & Category Badge */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black">
            <Swords className="w-3.5 h-3.5" />
            <span>مواجهة فردية رسمية 1 VS 1</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">{gameInfo.nameAr}</h2>
          <p className="text-xs text-zinc-400 font-mono font-bold">{gameMode}</p>
        </div>

        {/* 1v1 Faceoff Avatars */}
        <div className="flex items-center justify-center gap-6 py-2">
          {/* You */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-amber-400 p-0.5 overflow-hidden shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  alt="You"
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="absolute -bottom-2 -right-1 bg-amber-500 text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                أنت
              </span>
            </div>
            <span className="text-xs font-bold text-amber-400">المستضيف</span>
          </div>

          {/* VS Badge */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-zinc-950 border-2 border-amber-500/60 flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-sm font-black text-amber-400">VS</span>
            </div>
          </div>

          {/* Opponent */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-blue-400 p-0.5 overflow-hidden shadow-lg">
                <img
                  src={opponentAvatar}
                  alt={opponentName}
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="absolute -bottom-2 -left-1 bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                خصم
              </span>
            </div>
            <span className="text-xs font-bold text-blue-400 truncate max-w-[90px]">{opponentName}</span>
          </div>
        </div>

        {/* Dynamic Countdown OR Progress Bar */}
        {countdown !== null ? (
          <div className="py-4 space-y-2">
            <div className="text-6xl font-black text-amber-400 font-mono animate-bounce drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]">
              {countdown === 0 ? 'انطلق! 🔥' : countdown}
            </div>
            <p className="text-xs font-bold text-emerald-400">تم التحقق من الجلسة • دخول الساحة دلوقتي</p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>{prepStatusText}</span>
              </span>
              <span className="font-mono text-amber-400 font-bold">{prepProgress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{ width: `${prepProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Safety & Rules guarantee footnote */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>جلسة معتمدة • نظام منع الخروج التلقائي نشط</span>
        </div>
      </div>
    </div>
  );
};
