// ============================================================
// المزاد — كشف الكروت (وايلد كارد / خاطر وبدل)
// ------------------------------------------------------------
// الخطوة 1: بطاقة اللاعب اللي خرج + بطاقة اللاعب اللي دخل.
// الخطوة 2: اللاعب الجديد بينزل التشكيلة ويتظلّل على الملعب.
// ============================================================

import React, { useEffect, useState } from 'react';
import { ArrowDown, Check } from 'lucide-react';
import { FootballPlayer } from '../types';
import { PlayerCard } from './PlayerCard';
import { FootballPitch } from './FootballPitch';
import { audioManager } from '../services/audioManager';

export type CardSwapKind = 'WILD_CARD' | 'NO_RISK';

export interface CardSwapInfo {
  kind: CardSwapKind;
  oldPlayer: FootballPlayer;
  newPlayer: FootballPlayer;
}

const KIND_META: Record<CardSwapKind, { title: string; badge: string; accent: string }> = {
  WILD_CARD: { title: '🃏 وايلد كارد', badge: 'text-emerald-300 border-emerald-400/50 bg-emerald-500/10', accent: 'emerald' },
  NO_RISK: { title: '🎲 خاطر وبدل', badge: 'text-purple-300 border-purple-400/50 bg-purple-500/10', accent: 'purple' }
};

interface Props {
  swap: CardSwapInfo;
  /** التشكيلة بعد التبديل (اللاعب الجديد موجود فيها). */
  squad: FootballPlayer[];
  squadSize: number;
  teamName: string;
  teamAvatar?: string;
  onDone: () => void;
}

export const AuctionCardSwapReveal: React.FC<Props> = ({ swap, squad, squadSize, teamName, teamAvatar, onDone }) => {
  const [step, setStep] = useState<'CARDS' | 'LINEUP'>('CARDS');
  const meta = KIND_META[swap.kind];
  const diff = swap.newPlayer.overallRating - swap.oldPlayer.overallRating;

  // الكروت تظهر شوية، وبعدها اللاعب الجديد ينزل التشكيلة تلقائيًا (والضغط بيسرّع).
  useEffect(() => {
    if (step !== 'CARDS') return;
    const t = setTimeout(() => setStep('LINEUP'), 4200);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    audioManager.playReveal();
  }, []);

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-3">
        <div className="w-full max-w-md rounded-3xl border border-amber-400/40 bg-zinc-950 p-4 space-y-4 text-center shadow-2xl">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-black ${meta.badge}`}>{meta.title}</div>

          {step === 'CARDS' ? (
            <>
              <p className="text-xs text-zinc-300">اللاعب اللي خرج واللاعب اللي دخل مكانه</p>
              <div className="flex items-start justify-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="text-[11px] font-black text-rose-300">⬇️ خرج</div>
                  <div className="opacity-60 grayscale">
                    <PlayerCard player={swap.oldPlayer} size="sm" transparent />
                  </div>
                  <div className="text-[11px] font-black text-zinc-300 max-w-[9rem] break-words">{swap.oldPlayer.nameAr}</div>
                </div>

                <div className="self-center text-2xl text-amber-300 font-black">←</div>

                <div className="flex flex-col items-center gap-1.5 animate-in zoom-in-75 duration-500">
                  <div className="text-[11px] font-black text-emerald-300">⬆️ دخل</div>
                  <div className="rounded-2xl shadow-[0_0_35px_rgba(52,211,153,0.55)]">
                    <PlayerCard player={swap.newPlayer} size="sm" transparent />
                  </div>
                  <div className="text-[11px] font-black text-white max-w-[9rem] break-words">{swap.newPlayer.nameAr}</div>
                </div>
              </div>
              <div className={`text-xs font-black ${diff > 0 ? 'text-emerald-300' : diff < 0 ? 'text-rose-300' : 'text-zinc-300'}`}>
                التقييم: {swap.oldPlayer.overallRating} ← {swap.newPlayer.overallRating} ({diff > 0 ? '+' : ''}
                {diff})
              </div>
              <button
                type="button"
                onClick={() => setStep('LINEUP')}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 font-black text-sm flex items-center justify-center gap-2"
              >
                <ArrowDown className="w-4 h-4" /> نزّله التشكيلة
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-emerald-300 font-black">
                ✅ {swap.newPlayer.nameAr} نزل التشكيلة مكان {swap.oldPlayer.nameAr}
              </p>
              <FootballPitch
                mode={squadSize === 5 ? 'CLASSIC' : 'PRO'}
                squad={squad}
                teamName={teamName}
                teamAvatar={teamAvatar}
                isUser
                compact
                showOwnership={false}
                highlightPlayerIds={[swap.newPlayer.id]}
              />
              <button
                type="button"
                onClick={onDone}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black text-sm flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> تمام
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/** شريط صغير بيفضل ظاهر بعد الكشف: مين خرج ومين دخل. */
export const CardSwapStrip: React.FC<{ swap: CardSwapInfo }> = ({ swap }) => (
  <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/30 px-3 py-2 text-[11px] font-black">
    <span className="text-emerald-300 flex-shrink-0">{KIND_META[swap.kind].title}</span>
    <span className="text-rose-300 line-through truncate max-w-[30%]">{swap.oldPlayer.nameAr}</span>
    <span className="text-amber-300">←</span>
    <span className="text-white truncate max-w-[30%]">{swap.newPlayer.nameAr}</span>
  </div>
);
