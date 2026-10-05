// ============================================================
// العبها صح | EL3BHA SA7 - Truth or Lie ("بيحور ولا ميحورش")
// ============================================================

import React, { useState } from 'react';
import { TRIVIA_DATA, TriviaItem } from '../data/footballData';
import { audioManager } from '../services/audioManager';
import { StorageService } from '../services/storageService';
import { ActiveGameShell } from './ActiveGameShell';
import { WithdrawResultScreen } from './WithdrawResultScreen';
import {
  CheckCircle2,
  XCircle,
  Flame,
  Award,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TruthOrLieGameViewProps {
  onBack: () => void;
}

export const TruthOrLieGameView: React.FC<TruthOrLieGameViewProps> = ({ onBack }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [withdrew, setWithdrew] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null); // true for truth, false for lie
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  const currentItem = TRIVIA_DATA[currentIndex % TRIVIA_DATA.length];

  const handleAnswer = (userChoiceIsTrue: boolean) => {
    if (isAnswered) return;

    setSelectedAnswer(userChoiceIsTrue);
    setIsAnswered(true);

    const isCorrect = userChoiceIsTrue === currentItem.isTrue;

    if (isCorrect) {
      audioManager.playGoal();
      const newStreak = streak + 1;
      setStreak(newStreak);
      const points = 100 + newStreak * 25;
      setScore((prev) => prev + points);
      StorageService.addCoinsAndXP(points, Math.round(points / 2));
      try {
        if (newStreak >= 3) {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        }
      } catch {}
    } else {
      audioManager.playTimerBeep();
      setStreak(0);
    }
  };

  const handleNext = () => {
    audioManager.playClick();
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCurrentIndex((prev) => prev + 1);
  };

  if (withdrew) {

    const me = StorageService.getUserProfile();

    return (

      <WithdrawResultScreen

        didWithdraw

        myName={me.nameAr}

        myAvatar={me.avatar}

        opponentName="الخصم"

        opponentAvatar="🤖"

        onBack={onBack}

      />

    );

  }


  return (
    <ActiveGameShell
      user={{ id: 'u1', username: 'player', nameAr: 'المتحدي' } as any}
      gameTitle="بيحور ولا ميحورش"
      backgroundUrl="/games/backgrounds/hoartagy-hunter-bg.png"
      roundInfo={`السؤال #${currentIndex + 1}`}
      onWithdraw={() => setWithdrew(true)}
    >
      <div className="max-w-3xl mx-auto space-y-6 py-4 px-3 select-none">
        {/* Header */}
        <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400 flex items-center justify-center text-blue-400 font-black">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">بيحور ولا ميحورش</h2>
              <p className="text-xs text-zinc-400">حقيقة ولا إشاعة؟</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-amber-400/30 px-3 py-1.5 rounded-xl text-amber-400 text-xs font-black">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>كومبو: {streak}x</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-white text-xs font-black font-mono">
              النقاط: {score}
            </div>
          </div>
        </div>

        {/* Main Question Arena */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 p-6 sm:p-10 shadow-2xl text-center space-y-8 surface-aurora">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>قسم: {currentItem.category} • السؤال #{currentIndex + 1}</span>
          </div>

          {/* Statement text */}
          <h3 className="text-lg sm:text-2xl font-black text-white leading-relaxed max-w-2xl mx-auto drop-shadow-md">
            "{currentItem.statementAr}"
          </h3>

          {/* Dual Answer Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {/* ميحورش (حقيقة) */}
            <button
              id="choice_truth_btn"
              disabled={isAnswered}
              onClick={() => handleAnswer(true)}
              className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-black cursor-pointer ${
                isAnswered
                  ? currentItem.isTrue
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 ring-4 ring-emerald-400/30 scale-105'
                    : selectedAnswer === true
                    ? 'bg-rose-600/30 border-rose-400 text-rose-300'
                    : 'opacity-40 border-zinc-800 bg-zinc-900'
                  : 'bg-zinc-900/90 border-emerald-500/50 text-white hover:border-emerald-400 hover:bg-emerald-500/10 active:scale-95 shadow-lg'
              }`}
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <span className="text-lg sm:text-xl">مبيحورش! (حقيقة)</span>
              <span className="text-[11px] text-zinc-400 font-normal">حقيقة موثقة</span>
            </button>

            {/* بيحور (كذب) */}
            <button
              id="choice_lie_btn"
              disabled={isAnswered}
              onClick={() => handleAnswer(false)}
              className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-black cursor-pointer ${
                isAnswered
                  ? !currentItem.isTrue
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 ring-4 ring-emerald-400/30 scale-105'
                    : selectedAnswer === false
                    ? 'bg-rose-600/30 border-rose-400 text-rose-300'
                    : 'opacity-40 border-zinc-800 bg-zinc-900'
                  : 'bg-zinc-900/90 border-rose-500/50 text-white hover:border-rose-400 hover:bg-rose-500/10 active:scale-95 shadow-lg'
              }`}
            >
              <XCircle className="w-8 h-8 text-rose-400" />
              <span className="text-lg sm:text-xl">بيحور! (كذب / شائعة)</span>
              <span className="text-[11px] text-zinc-400 font-normal">إشاعة مش حقيقية</span>
            </button>
          </div>

          {/* Explanation Card after answer */}
          {isAnswered && (
            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl text-right max-w-xl mx-auto space-y-3">
              <div className="flex items-center gap-2 font-black text-sm text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>التوضيح:</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                {currentItem.explanationAr}
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  id="next_question_btn"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  السؤال التالي ➡️
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ActiveGameShell>
  );
};
