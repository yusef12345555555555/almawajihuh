// ============================================================
// العبها صح | EL3BHA SA7 - Dedicated Fullscreen Tournament Match Arena
// Implements 1v1 Host/Opponent, "أنا جاهز" system, and launches the REAL selected game
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Shield,
  Clock,
  Swords,
  Crown,
  CheckCircle2,
  AlertCircle,
  Play,
  Flame,
  UserCheck,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { UserProfile, FootballPlayer, Coach, AuctionRoomSettings } from '../types';
import { TournamentEntity, TournamentMatchSlot, TournamentParticipant } from '../types/tournamentTypes';
import { TournamentEngineService } from '../services/tournamentEngineService';
import { audioManager } from '../services/audioManager';
import { AuctionGameView } from './AuctionGameView';
import { TakePlayerOrHiddenGameView } from './TakePlayerOrHiddenGameView';
import { HoartagyHunterGameView } from './HoartagyHunterGameView';
import { PlayerGuessGameView } from './PlayerGuessGameView';
import { DealOrNoDealGameView } from './DealOrNoDealGameView';
import { RosterGate } from './RosterGate';
import { GameEntranceGate } from './GameEntranceGate';
import { simulateDeterministicMatch } from '../services/matchEngine';
import confetti from 'canvas-confetti';

interface TournamentMatchArenaProps {
  tournament: TournamentEntity;
  match: TournamentMatchSlot;
  user: UserProfile;
  onMatchComplete: (homeScore: number, awayScore: number) => void;
  onExit: () => void;
}

export const TournamentMatchArena: React.FC<TournamentMatchArenaProps> = ({
  tournament,
  match: initialMatch,
  user,
  onMatchComplete,
  onExit
}) => {
  const [match, setMatch] = useState<TournamentMatchSlot>(initialMatch);
  const [matchState, setMatchState] = useState<'LOBBY' | 'COUNTDOWN' | 'REAL_GAME' | 'RESULT'>('LOBBY');
  const [countdown, setCountdown] = useState<number>(3);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isHost = match.hostId === user.id || match.homeParticipant?.id === user.id;
  const isHomeUser = match.homeParticipant?.id === user.id;
  const isAwayUser = match.awayParticipant?.id === user.id;

  const isUserReady = isHomeUser ? match.hostReady : match.awayReady;
  const isOpponentReady = isHomeUser ? match.awayReady : match.hostReady;

  const opponentParticipant: TournamentParticipant | null = isHomeUser
    ? match.awayParticipant
    : match.homeParticipant;

  const bothReady = match.hostReady && match.awayReady;

  // Listen to live ready updates
  useEffect(() => {
    const unsub = TournamentEngineService.subscribe((event) => {
      if (event.type === 'MATCH_PLAYER_READY' && event.payload.matchId === match.id) {
        setMatch(event.payload.match);
      }
    });
    return () => unsub();
  }, [match.id]);

  // Handle Toggle Ready
  const handleToggleReady = () => {
    audioManager.playClick();
    const res = TournamentEngineService.toggleParticipantReady(tournament.id, match.id, user.id);
    if (res.success && res.match) {
      setMatch(res.match);
      // If both players are now ready, auto-initiate 3-second countdown
      if (res.match.hostReady && res.match.awayReady) {
        setTimeout(() => {
          triggerCountdown();
        }, 300);
      }
    }
  };

  const triggerCountdown = () => {
    audioManager.playWhistle();
    setMatchState('COUNTDOWN');
    let count = 3;
    setCountdown(3);
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        // Launch the actual selected tournament game
        setMatchState('REAL_GAME');
      }
    }, 1000);
  };

  // Host starts the match
  const handleHostStart = () => {
    setErrorMsg(null);
    if (!isHost) {
      setErrorMsg('فقط مضيف المواجهة يملك صلاحية بدء المباراة.');
      return;
    }
    if (!bothReady) {
      setErrorMsg('PLAYER_NOT_READY: لازم يؤكد كلا الطرفين (أنا جاهز) أولاً!');
      return;
    }

    triggerCountdown();
  };

  // Handle Game Finish from the Real Game Engine — result is the ACTUAL outcome reported by the
  // game itself (win/lose/draw), never assumed. A plain quit/back with no result = forfeit (loss).
  const handleRealGameResult = (result?: 'WIN' | 'LOSE' | 'DRAW') => {
    let finalHome = 0;
    let finalAway = 0;
    const userWon = result === 'WIN';
    const isDraw = result === 'DRAW';

    if (isDraw) {
      finalHome = 2;
      finalAway = 2;
    } else if (isHomeUser) {
      finalHome = userWon ? 3 : 1;
      finalAway = userWon ? 1 : 3;
    } else {
      finalHome = userWon ? 1 : 3;
      finalAway = userWon ? 3 : 1;
    }

    setHomeScore(finalHome);
    setAwayScore(finalAway);
    setMatchState('RESULT');

    if (userWon) {
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch {}
    }
  };

  const handleFinishAndReturn = () => {
    onMatchComplete(homeScore, awayScore);
  };

  // -------------------------------------------------------------
  // REAL GAME EXECUTION SCREEN
  // -------------------------------------------------------------
  if (matchState === 'REAL_GAME') {
    const isProMax = tournament.gameMode === '200M' || tournament.gameMode === '11_PLAYERS';
    // Deterministic seed shared by both real participants of this match so they
    // both see the exact same cards/players — derived from the match id, never random.
    const matchSeed = Array.from(String(match.id)).reduce(
      (h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0,
      17,
    );

    const auctionSettings: AuctionRoomSettings = {
      budgetMode: tournament.gameMode === '200M' ? '200M' : '100M',
      initialBudget: tournament.gameMode === '200M' ? 200 : 100,
      squadSize: tournament.gameMode === '200M' ? 11 : 5,
      // نفس إعدادات المزاد العادي بالظبط (مؤقت 5/10/15، زيادة 1M، كروت مطفية افتراضياً) —
      // البطولة لازم تستخدم نفس منطق اللعبة العادية، مش نسخة مختلفة منه.
      bidTimerSeconds: 15,
      bidTimeLimitSeconds: 15,
      bidIncrement: 1,
      fastBidConfirm: false,
      allowBots: false,
      mysteryPlayerChance: 0.3,
      wildCardEnabled: false,
      lastBidEnabled: false,
      noRiskEnabled: false
    };

    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Tournament Context HUD */}
        <div className="bg-zinc-950/95 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-400/40">
              🏆 {tournament.name} • {match.roundNameAr}
            </span>
            <span className="text-xs text-zinc-300 font-bold hidden sm:inline">
              اللعبة: {tournament.gameNameAr} ({tournament.gameModeLabelAr})
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-amber-400 font-black">{match.homeParticipant?.name}</span>
            <span className="text-zinc-400 font-mono">VS</span>
            <span className="text-blue-400 font-black">{match.awayParticipant?.name}</span>
          </div>
        </div>

        {/* The Exact Real Game Screen */}
        <div className="flex-1 relative overflow-hidden">
         <RosterGate onBack={() => handleRealGameResult('LOSE')} needs={{ gk: 2, def: 2, mid: 4, att: 2, coaches: 2 }}>
         <GameEntranceGate user={user} gameTitle={tournament.gameNameAr}>
          {tournament.gameId === 'AUCTION' && (
            <AuctionGameView
              user={user}
              settings={auctionSettings}
              onFinishGame={(squad, coach, opponentSquad, opponentCoach) => {
                // النتيجة بتتحسب بمحاكاة حقيقية على التشكيلتين النهائيتين (بعد أي كروت) —
                // مش فوز تلقائي زي الأول.
                if (!opponentSquad || opponentSquad.length === 0) {
                  handleRealGameResult('WIN');
                  return;
                }
                const seed = Array.from(String(match.id)).reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
                const sim = simulateDeterministicMatch(user.nameAr, 'الخصم', squad, opponentSquad, coach, opponentCoach ?? null, seed);
                const { homeScore, awayScore } = sim.stats;
                handleRealGameResult(homeScore > awayScore ? 'WIN' : homeScore < awayScore ? 'LOSE' : 'DRAW');
              }}
              onBackToHome={() => handleRealGameResult('LOSE')}
              onWithdraw={() => handleRealGameResult('LOSE')}
            />
          )}

          {tournament.gameId === 'PLAYER_OR_HIDDEN' && (
            <TakePlayerOrHiddenGameView
              onBack={handleRealGameResult}
              sharedSeed={matchSeed}
              forcedFormat={isProMax ? 11 : 5}
              forcedMode="PVP_1V1_AI"
            />
          )}

          {tournament.gameId === 'HOARTAGY_HUNTER' && (
            <HoartagyHunterGameView
              onBack={handleRealGameResult}
            />
          )}

          {/* «PLAYER_GUESS» قديمة اتدمجت في «اقف ف صفي» — بطولات قديمة بتفضل شغالة */}
          {(tournament.gameId === 'SAFI' || (tournament.gameId as string) === 'PLAYER_GUESS') && (
            <PlayerGuessGameView onBack={handleRealGameResult} sharedSeed={matchSeed} />
          )}

          {tournament.gameId === 'DEAL_OR_NO_DEAL' && (
            <DealOrNoDealGameView
              user={user}
              presetOpponent={
                opponentParticipant
                  ? {
                      playerId: opponentParticipant.id,
                      id: opponentParticipant.id,
                      name: opponentParticipant.name,
                      nameAr: opponentParticipant.name,
                      avatar: opponentParticipant.avatar,
                      rating: opponentParticipant.rating,
                    }
                  : null
              }
              playMethod="ai"
              presetTurnSeconds={tournament.turnSeconds || 15}
              onBackToHome={() => handleRealGameResult('LOSE')}
              onWithdraw={(winnerIsOpponent) => handleRealGameResult(winnerIsOpponent ? 'LOSE' : 'WIN')}
              onMatchFinished={(outcome) =>
                handleRealGameResult(outcome === 'win' ? 'WIN' : outcome === 'loss' ? 'LOSE' : 'DRAW')
              }
            />
          )}
         </GameEntranceGate>
         </RosterGate>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-y-auto">
      {/* Top Match Bar */}
      <div className="bg-zinc-950/90 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 font-black">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">{tournament.name}</h2>
            <p className="text-xs text-amber-400 font-bold">
              {match.roundNameAr} • {tournament.gameNameAr} ({tournament.gameModeLabelAr})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-zinc-400 block">الجائزة الإجمالية</span>
            <span className="text-xs font-black text-amber-400">{tournament.prizePoolCoins} كوينز + 100 نقطة 🏆</span>
          </div>
          {matchState === 'LOBBY' && (
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer"
            >
              العودة للجدول
            </button>
          )}
        </div>
      </div>

      {/* Main Arena Content */}
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col justify-center">
        {/* LOBBY STATE: HOST & OPPONENT READY CHECK */}
        {matchState === 'LOBBY' && (
          <div className="bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.25)] space-y-8">
            <div className="text-center space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-black">
                ⚔️ غرفة المواجهة الإقصائية
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                تأكيد الجاهزية وبدء المواجهة
              </h3>
              <p className="text-xs text-zinc-400">
                يشترط ضغط (أنا جاهز) من الطرفين لتفعيل زر انطلاق المباراة لدى مضيف الغرفة.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-xs text-red-300 text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Competitors 1v1 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              {/* Home / Host Card */}
              <div
                className={`p-5 rounded-2xl border-2 transition-all text-center space-y-3 ${
                  match.hostReady
                    ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                    : 'bg-zinc-900/80 border-zinc-700'
                }`}
              >
                <div className="relative inline-block">
                  <img
                    src={match.homeParticipant?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                    alt={match.homeParticipant?.name}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto border-2 border-amber-400"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-black">
                    المضيف (HOST)
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-black text-white">{match.homeParticipant?.name}</h4>
                  <span className="text-xs text-zinc-400">التقييم: {match.homeParticipant?.rating || 1500} ELO</span>
                </div>

                <div className="pt-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                      match.hostReady
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {match.hostReady ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    <span>{match.hostReady ? 'جاهز للمباراة' : 'غير جاهز'}</span>
                  </span>
                </div>
              </div>

              {/* Away / Opponent Card */}
              <div
                className={`p-5 rounded-2xl border-2 transition-all text-center space-y-3 ${
                  match.awayReady
                    ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                    : 'bg-zinc-900/80 border-zinc-700'
                }`}
              >
                <div className="relative inline-block">
                  <img
                    src={match.awayParticipant?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                    alt={match.awayParticipant?.name}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto border-2 border-purple-400"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-purple-500 text-white text-[10px] font-black">
                    المنافس (OPPONENT)
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-black text-white">{match.awayParticipant?.name}</h4>
                  <span className="text-xs text-zinc-400">التقييم: {match.awayParticipant?.rating || 1500} ELO</span>
                </div>

                <div className="pt-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                      match.awayReady
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {match.awayReady ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    <span>{match.awayReady ? 'جاهز للمباراة' : 'غير جاهز'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Central Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-zinc-800">
              {/* Ready Button for Current User */}
              <button
                onClick={handleToggleReady}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isUserReady
                    ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span>{isUserReady ? '✓ أنت جاهز (اضغط للإلغاء)' : 'أنا جاهز ⚡'}</span>
              </button>

              {/* Host Start Match Button */}
              {isHost && (
                <button
                  onClick={handleHostStart}
                  disabled={!bothReady}
                  className={`w-full sm:w-auto px-10 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                    bothReady
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-zinc-950 shadow-[0_0_30px_rgba(245,158,11,0.6)] cursor-pointer hover:scale-105 active:scale-95'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{bothReady ? 'بدء المباراة دلوقتي 🚀' : 'في انتظار جاهزية الخصم...'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* COUNTDOWN STATE */}
        {matchState === 'COUNTDOWN' && (
          <div className="text-center py-20 space-y-6">
            <h3 className="text-lg font-bold text-amber-400">
              استعد! انطلاق ساحة {tournament.gameNameAr} بعد:
            </h3>
            <div className="text-8xl font-black text-amber-400 animate-ping font-mono">{countdown}</div>
            <p className="text-xs text-zinc-400">جاري تحميل أرضية الملعب وبطاقات اللاعبين...</p>
          </div>
        )}

        {/* RESULT STATE: WINNER DECLARATION */}
        {matchState === 'RESULT' && (
          <div className="bg-gradient-to-b from-amber-950/40 via-zinc-950 to-zinc-950 border-2 border-amber-400 rounded-3xl p-8 text-center space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.4)]">
            <Crown className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
            <h3 className="text-3xl font-black text-white">
              صافرة النهاية: فوز {homeScore > awayScore ? match.homeParticipant?.name : match.awayParticipant?.name} 🏆
            </h3>
            <p className="text-sm text-zinc-300">
              النتيجة النهائية: {homeScore} - {awayScore} • تأهل الفائز تلقائياً للدور القادم في جدول الـ Bracket!
            </p>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold">
              ✅ تم تسجيل النتيجة وتأهيل الفائز وإيداع +10 نقاط مكافأة الجولة الرسمية.
            </div>

            <button
              onClick={handleFinishAndReturn}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-sm shadow-xl cursor-pointer"
            >
              العودة وتحديث جدول البطولة 🏆
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
