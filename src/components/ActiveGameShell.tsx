// ============================================================
// العبها صح | EL3BHA SA7 - Active Game Shell & Route Guard
// ============================================================

import React, { useEffect, useState } from 'react';
import { UserProfile, RoomParticipant } from '../types';
import { LogOut, AlertTriangle, Shield, Swords, Users, MessageSquare } from 'lucide-react';
import { audioManager } from '../services/audioManager';
import { useBackHandler } from '../services/backHandler';

interface ActiveGameShellProps {
  user: UserProfile;
  opponent?: RoomParticipant | { userName: string; userAvatar?: string; budget?: number };
  gameTitle?: string;
  gamePhase?: string;
  roundInfo?: string;
  userBudget?: number;
  opponentBudget?: number;
  timerSeconds?: number;
  timerTotal?: number;
  onWithdraw: () => void;
  children: React.ReactNode;
  backgroundUrl?: string;
}

export const ActiveGameShell: React.FC<ActiveGameShellProps> = ({
  user,
  opponent,
  gameTitle = 'ساحة المزاد',
  gamePhase,
  roundInfo,
  userBudget,
  opponentBudget,
  timerSeconds,
  timerTotal = 30,
  onWithdraw,
  children,
  backgroundUrl
}) => {
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  // زر/إيماءة الرجوع في الهاتف = نافذة تأكيد الانسحاب (مش خروج مفاجئ)
  useBackHandler(true, () => setShowWithdrawDialog(true));
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'أنت داخل مباراة حالياً. هل أنت متأكد من الانسحاب؟';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleConfirmWithdraw = () => {
    audioManager.playClick();
    setShowWithdrawDialog(false);
    onWithdraw();
  };

  // Compute timer urgency color & animation
  const getTimerUrgencyStyle = (t?: number) => {
    if (t === undefined) return '';
    if (t <= 3) return 'text-rose-500 animate-ping font-black';
    if (t <= 5) return 'text-orange-500 font-black animate-pulse';
    if (t <= 10) return 'text-amber-400 font-bold';
    return 'text-emerald-400 font-bold';
  };

  return (
    <div
      id="active_game_fullscreen_shell"
      className="mw-clear fixed inset-0 z-50 bg-black text-white flex flex-col overflow-y-auto select-none"
      dir="rtl"
    >
      {backgroundUrl && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <img src={backgroundUrl} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/45" />
        </div>
      )}

      {/* Top Game HUD (Replaces standard navbar completely) */}
      <header className="sticky top-0 z-40 bg-black/40 border-b border-amber-500/20 px-3 sm:px-6 py-2 relative">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Safe Exit / Withdraw Action */}
          <div className="flex items-center gap-2">
            <button
              id="game_withdraw_btn"
              onClick={() => {
                audioManager.playClick();
                setShowWithdrawDialog(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors"
            >
              <LogOut className="w-4 h-4 rotate-180" />
              <span>انسحاب</span>
            </button>

            {roundInfo && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/25 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                <span className="text-amber-400 font-bold">{roundInfo}</span>
              </div>
            )}
          </div>

          {/* Center Title & Phase */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                <Swords className="w-3 h-3 text-zinc-950" />
              </div>
              <h1 className="text-xs sm:text-sm font-black text-white tracking-wide">{gameTitle}</h1>
            </div>
            {gamePhase && (
              <span className="text-[10px] sm:text-[11px] text-amber-400 font-medium">{gamePhase}</span>
            )}
          </div>

          {/* The live auction budget + countdown intentionally do NOT live in the global HUD.
              Each budget is shown beside its own formation, while the authoritative
              countdown is rendered directly above the player card it controls. */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/20 border border-zinc-800 text-[10px] text-zinc-400 font-bold">
              <Users className="w-3 h-3 text-zinc-500" />
              <span>المواجهة المباشرة</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Screen Viewport */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 flex flex-col justify-start">
        {children}
      </main>

      {/* Withdraw Confirmation Modal */}
      {showWithdrawDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20  animate-in fade-in">
          <div className="bg-black/25 border border-rose-500/50 p-6 rounded-3xl max-w-md w-full text-center space-y-4 shadow-[0_0_50px_rgba(244,63,94,0.3)]">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">تأكيد الانسحاب من المباراة</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                أنت داخل مباراة تنافسية نشطة. مغادرتك دلوقتي تُعد انسحاباً رسمياً وتمنح الفوز للخصم مع خصم نقاط التصنيف (ELO).
              </p>
            </div>

            <div className="bg-black/20 p-3 rounded-2xl border border-zinc-800 text-[11px] text-zinc-300 text-right space-y-1">
              <div>• احتساب النتيجة: <strong>هزيمة بالانسحاب</strong></div>
              <div>• خصم تقييم التصنيف: <strong>-25 نقطة</strong></div>
              <div>• مكافأة الخصم: <strong>فوز مستحق</strong></div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmWithdraw}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-colors"
              >
                نعم، تأكيد الانسحاب
              </button>
              <button
                onClick={() => setShowWithdrawDialog(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors"
              >
                البقاء في المباراة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
