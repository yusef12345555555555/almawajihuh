// ============================================================
// العبها صح | EL3BHA SA7 - Mystery Hidden Player Game Mode
// ============================================================

import React, { useState, useEffect } from 'react';
import { FootballPlayer } from '../types';
import { getCombinedPlayersSync, refreshPlayersInBackground } from '../services/playerRepository';
import { audioManager } from '../services/audioManager';
import { seededPick, subSeed } from '../services/seededRandom';
import { StorageService } from '../services/storageService';
import { ActiveGameShell } from './ActiveGameShell';
import { WithdrawResultScreen } from './WithdrawResultScreen';
import { PlayerCard } from './PlayerCard';
import {
  EyeOff,
  Eye,
  HelpCircle,
  Trophy,
  CheckCircle2,
  XCircle,
  Timer,
  Sparkles,
  ArrowRight,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface HiddenPlayerGameViewProps {
  onBack: () => void;
  /** Shared seed so both real players get the SAME hidden player. */
  sharedSeed?: number;
}

export const HiddenPlayerGameView: React.FC<HiddenPlayerGameViewProps> = ({ onBack, sharedSeed }) => {
  const baseSeed = React.useRef(sharedSeed ?? Math.floor(Math.random() * 0xffffffff)).current;
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [targetPlayer, setTargetPlayer] = useState<FootballPlayer>(() => getCombinedPlayersSync()[0] as FootballPlayer);
  const [revealedCluesCount, setRevealedCluesCount] = useState<number>(1);
  const [guessInput, setGuessInput] = useState<string>('');
  const [gameState, setGameState] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');
  const [score, setScore] = useState<number>(0);
  const [timerSeconds, setTimerSeconds] = useState<number>(15);
  const [withdrew, setWithdrew] = useState<boolean>(false);

  const startNewRound = () => {
    // Seeded per round, so both sides reveal the same player each round.
    const nextRound = roundIndex + 1;
    setRoundIndex(nextRound);
    const pick = seededPick(getCombinedPlayersSync(), subSeed(baseSeed, `hidden:${nextRound}`));
    setTargetPlayer(pick);
    setRevealedCluesCount(1);
    setGuessInput('');
    setGameState('PLAYING');
    setTimerSeconds(15);
    audioManager.playClick();
  };

  useEffect(() => {
    startNewRound();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState('LOST');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  const handleRevealNextClue = () => {
    if (revealedCluesCount < (targetPlayer.clues?.length || 4)) {
      audioManager.playClick();
      setRevealedCluesCount((prev) => prev + 1);
    }
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || gameState !== 'PLAYING') return;

    const inputLower = guessInput.trim().toLowerCase();
    const isCorrect =
      inputLower === targetPlayer.name.toLowerCase() ||
      inputLower === targetPlayer.nameAr.toLowerCase() ||
      targetPlayer.nameAr.includes(guessInput.trim()) ||
      targetPlayer.name.toLowerCase().includes(inputLower);

    if (isCorrect) {
      const calculatedScore = Math.max(100, Math.round(500 - revealedCluesCount * 60 + timerSeconds * 5));
      setScore(calculatedScore);
      setGameState('WON');
      audioManager.playGoal();
      StorageService.addCoinsAndXP(400, 250);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } else {
      audioManager.playTimerBeep();
      setGuessInput('');
    }
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
      gameTitle="اللاعب الخفي (Mystery Player)"
      backgroundUrl="/games/backgrounds/hidden-player-bg.png"
      roundInfo={`التلميح ${revealedCluesCount} من 4`}
      timerSeconds={timerSeconds}
      timerTotal={45}
      onWithdraw={() => setWithdrew(true)}
    >
      <div className="max-w-4xl mx-auto space-y-6 py-4 px-3 select-none">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 font-black">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">اللاعب الخفي (Mystery Player)</h2>
              <p className="text-xs text-zinc-400">خمّن الأسطورة بأقل تلميحات</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl font-mono text-amber-400 text-xs sm:text-sm font-bold">
              <Timer className="w-4 h-4" />
              <span>00:{String(timerSeconds ?? 0).padStart(2, '0')}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-white text-xs font-black font-mono">
              النقاط: {score}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Mystery Card / Revealed Card */}
        <div className="md:col-span-5 flex justify-center">
          <PlayerCard
            player={targetPlayer}
            isMystery={gameState === 'PLAYING'}
            isRevealed={gameState !== 'PLAYING'}
            size="lg"
            transparent
          />
        </div>

        {/* Right: Progressive Clues & Guess Input */}
        <div className="md:col-span-7 bg-zinc-950/80 rounded-3xl p-6 space-y-5 surface-aurora">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>التلميحات المتاحة ({revealedCluesCount} من {targetPlayer.clues?.length || 4})</span>
            </h3>

            <div className="space-y-2.5">
              {targetPlayer.clues?.map((clue, idx) => {
                const isRevealed = idx < revealedCluesCount;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border transition-all text-xs flex items-center gap-3 ${
                      isRevealed
                        ? 'bg-zinc-900/90 border-amber-400/40 text-amber-300 font-bold shadow'
                        : 'bg-zinc-900/30 border-zinc-800/40 text-zinc-600'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-mono font-bold text-amber-400 text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{isRevealed ? clue : 'تلميح مغلق — اضغط لكشف التلميح التالي'}</span>
                  </div>
                );
              })}
            </div>

            {gameState === 'PLAYING' && revealedCluesCount < (targetPlayer.clues?.length || 4) && (
              <button
                onClick={handleRevealNextClue}
                className="mt-3 text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>تلميح تاني (-30)</span>
              </button>
            )}
          </div>

          {/* Form / Guess Input */}
          {gameState === 'PLAYING' ? (
            <form onSubmit={handleGuessSubmit} className="space-y-3 pt-2 border-t border-zinc-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="اكتب اسم اللاعب بالعربية أو الإنجليزية..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>تخمين</span>
                </button>
              </div>

              {/* Quick Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5">
                {['ميسي', 'رونالدو', 'كاكا', 'زيدان', 'رونالدينيو', 'صلاح', 'مبابي'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setGuessInput(sug)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </form>
          ) : (
            /* Result Banner */
            <div className={`p-4 rounded-2xl border text-center space-y-3 ${gameState === 'WON' ? 'bg-emerald-950/60 border-emerald-500/60' : 'bg-rose-950/60 border-rose-500/60'}`}>
              <div className="flex items-center justify-center gap-2">
                {gameState === 'WON' ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <h4 className="text-lg font-black text-emerald-300">صح! 🎉</h4>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-rose-400" />
                    <h4 className="text-lg font-black text-rose-300">انتهى الوقت! اللاعب كان: {targetPlayer.nameAr}</h4>
                  </>
                )}
              </div>

              {gameState === 'WON' && (
                <div className="text-xs text-zinc-300">
                  حصلت على <span className="text-amber-400 font-black font-mono">+{score} نقطة</span> وتمت إضافة المكافأة إلى رصيدك!
                </div>
              )}

              <button
                onClick={startNewRound}
                className="px-6 py-2.5 rounded-xl bg-amber-400 text-zinc-950 font-black text-xs hover:bg-amber-300 transition-colors"
              >
                جولة جديدة بلاعب آخر 🔄
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </ActiveGameShell>
  );
};
