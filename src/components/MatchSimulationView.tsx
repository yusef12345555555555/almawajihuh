// ============================================================
// المواجهة | شاشة المحاكاة (المزاد • تاخد اللاعب/الخفي)
//
// - تمشي دقيقة بدقيقة: 1 2 3 4 5 ...
// - بدون مربعات تغطي الخلفية: كل شيء فوق الخلفية بنص واضح بظل.
// - الخصم يمين • النتيجة في النص • أنت شمال.
// - بعد النهاية: نشوف لعبة تانية • وريني التشكيلة • (انتقم + خلينا صحاب) أو (إعادة المباراة ضد AI).
// - من غير أي تحليل فني/تكتيكي.
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FootballPlayer, Coach, MatchSimulationResult, MatchEvent, PlayerSnapshot } from '../types';
import { simulateDeterministicMatch } from '../services/matchEngine';
import { audioManager } from '../services/audioManager';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';
import { PlayerCosmeticName } from './PlayerCosmeticName';
import { StackedLineups } from './StackedLineups';
import { PlayerCard } from './PlayerCard';
import { StorageService } from '../services/storageService';
import { recordMatchEverywhere } from '../services/dailyService';
import { WithdrawResultScreen } from './WithdrawResultScreen';
import { PostMatchActions } from './PostMatchActions';
import { MatchLiveStatsPanel } from './MatchLiveStatsPanel';
import { computeLiveStats, uniqueEvents } from '../services/liveMatchStats';
import { LogOut, FastForward, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MatchSimulationViewProps {
  userSquad: FootballPlayer[];
  userCoach: Coach | null;
  opponentSquad?: FootballPlayer[];
  opponentCoach?: Coach | null;
  userAvatar?: string;
  opponentAvatar?: string;
  /** اسم الخصم الحقيقي. لو مفيش خصم حقيقي يتعرض «فريق AI». */
  opponentName?: string;
  /** الخصم الحقيقي (لو لاعب حقيقي). null/undefined = AI */
  opponentPlayer?: PlayerSnapshot | null;
  /** AUCTION | DEAL_OR_NO_DEAL | PLAYER_OR_HIDDEN */
  gameId?: string;
  sharedSeed?: number;
  onFinishMatch: (result?: 'WIN' | 'LOSE' | 'DRAW') => void;
  onRematch?: () => void;
  onWithdraw?: () => void;
}

const BG_BY_GAME: Record<string, string> = {
  AUCTION: '/games/backgrounds/auction-bg.png',
  DEAL_OR_NO_DEAL: '/games/backgrounds/deal-or-no-deal-bg.png',
  PLAYER_OR_HIDDEN: '/games/backgrounds/hidden-player-bg.png'
};

const TICK_MS = 210; // دقيقة كل 210ms → 90 دقيقة ≈ 19 ثانية

export const MatchSimulationView: React.FC<MatchSimulationViewProps> = ({
  userSquad,
  userCoach,
  opponentSquad,
  opponentCoach,
  userAvatar,
  opponentAvatar,
  opponentName,
  opponentPlayer,
  gameId = 'AUCTION',
  sharedSeed,
  onFinishMatch,
  onRematch,
  onWithdraw
}) => {
  const me = useMemo(() => StorageService.getUserProfile(), []);
  const isAi = !opponentPlayer;
  const myName = me.nameAr || me.username;
  const myEq = me.equippedCosmetics;
  const oppEq = isAi ? undefined : opponentPlayer?.equippedCosmetics;
  const oppName = isAi ? 'فريق AI' : opponentName || opponentPlayer?.nameAr || opponentPlayer?.name || 'الخصم';
  const myAvatarFinal = userAvatar || me.avatar;
  const oppAvatarFinal = isAi ? 'av_bot' : opponentAvatar || opponentPlayer?.avatar || 'av_default';
  // ضد لاعب حقيقي: الجهازين لازم يحسبوا نفس المباراة → الطرف صاحب الرقم الأصغر هو "المضيف".
  const iAmHome = isAi || (me.id || '') <= (opponentPlayer?.id || '');

  const [result, setResult] = useState<MatchSimulationResult | null>(null);
  const [minute, setMinute] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [withdrawAsk, setWithdrawAsk] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const [lineupOpen, setLineupOpen] = useState(false);
  const recorded = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const oppSquadFinal = opponentSquad && opponentSquad.length ? opponentSquad : userSquad;
    const mySq = userSquad;
    const match = iAmHome
      ? simulateDeterministicMatch(myName, oppName, mySq, oppSquadFinal, userCoach, opponentCoach || null, sharedSeed ?? Date.now())
      : simulateDeterministicMatch(oppName, myName, oppSquadFinal, mySq, opponentCoach || null, userCoach, sharedSeed ?? Date.now());
    setResult(match);
    audioManager.playWhistle();
  }, [userSquad, userCoach, opponentSquad, opponentCoach, sharedSeed, iAmHome, myName, oppName]);

  const myScoreOf = (h: number, a: number) => (iAmHome ? h : a);
  const oppScoreOf = (h: number, a: number) => (iAmHome ? a : h);

  const finishAndRecord = (res: MatchSimulationResult) => {
    if (recorded.current) return;
    recorded.current = true;
    const mine = myScoreOf(res.stats.homeScore, res.stats.awayScore);
    const theirs = oppScoreOf(res.stats.homeScore, res.stats.awayScore);
    const win = mine > theirs;
    const draw = mine === theirs;
    StorageService.recordMatchResult(win, draw);
    StorageService.awardUniversal10Points('match_simulation', res.matchId);
    recordMatchEverywhere({ gameId, opponentName: oppName, opponentIsAi: isAi, scoreFor: mine, scoreAgainst: theirs });
    if (win) {
      StorageService.addCoinsAndXP(650, 400);
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      } catch {
        /* ignore */
      }
    }
  };

  // المؤقّت: دقيقة بدقيقة — الحالة الوحيدة هي رقم الدقيقة، وكل حاجة تانية (الأحداث/النتيجة/الإحصائيات)
  // بتتحسب منه. مفيش side-effects جوه setState فمفيش أي حدث بيتكرر (حتى في StrictMode).
  const minuteRef = useRef(0);
  useEffect(() => {
    if (!result || showIntro || finished || withdrawn || withdrawAsk) return;
    const id = setInterval(() => {
      const prev = minuteRef.current;
      const next = Math.min(90, prev + 1);
      minuteRef.current = next;
      if (result.events.some((e) => e.type === 'GOAL' && e.minute > prev && e.minute <= next)) audioManager.playGoal();
      setMinute(next);
      if (next >= 90) {
        clearInterval(id);
        setFinished(true);
        audioManager.playWhistle();
        finishAndRecord(result);
      }
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, showIntro, finished, withdrawn, withdrawAsk]);

  const skipToEnd = () => {
    if (!result || finished) return;
    minuteRef.current = 90;
    setMinute(90);
    setFinished(true);
    audioManager.playWhistle();
    finishAndRecord(result);
  };

  const confirmWithdraw = () => {
    setWithdrawAsk(false);
    setWithdrawn(true);
    if (!recorded.current) {
      recorded.current = true;
      StorageService.recordMatchResult(false, false);
      recordMatchEverywhere({ gameId, opponentName: oppName, opponentIsAi: isAi, scoreFor: 0, scoreAgainst: 1 });
    }
    onWithdraw?.();
  };

  if (!result) return null;

  const bg = BG_BY_GAME[gameId] || '/brand/home-bg.jpg';
  const frame: React.CSSProperties = {
    backgroundImage: `linear-gradient(rgba(3,7,18,.2), rgba(3,7,18,.55)), url(${bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };
  const shadow = 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]';

  if (showIntro) {
    return (
      <div dir="rtl" className="fixed inset-0 z-[60] flex items-center justify-center" style={frame}>
        <div className={`text-center ${shadow}`}>
          <p className="text-amber-300 text-xs font-black tracking-[0.3em] mb-5 animate-pulse">المواجهة تبدأ الآن</p>
          <div className="flex items-center justify-center gap-5">
            <div className="text-center w-24">
              <PlayerAvatarBadge avatar={oppAvatarFinal} size="lg" equipped={oppEq} />
              <div className="mt-2 flex justify-center"><PlayerCosmeticName name={oppName} equipped={oppEq} size="sm" /></div>
            </div>
            <span className="text-3xl font-black text-white">VS</span>
            <div className="text-center w-24">
              <PlayerAvatarBadge avatar={myAvatarFinal} size="lg" equipped={myEq} />
              <div className="mt-2 flex justify-center"><PlayerCosmeticName name={myName} equipped={myEq} size="sm" /></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (withdrawn) {
    return (
      <WithdrawResultScreen
        didWithdraw
        myName={myName}
        myAvatar={myAvatarFinal}
        opponentName={oppName}
        opponentAvatar={oppAvatarFinal}
        onBack={() => onFinishMatch('LOSE')}
      />
    );
  }

  const shownEvents = uniqueEvents(result.events).filter((e) => e.minute <= minute);
  const lastShown = shownEvents.length ? shownEvents[shownEvents.length - 1] : null;
  const scoreHome = finished ? result.stats.homeScore : lastShown?.scoreHome ?? 0;
  const scoreAway = finished ? result.stats.awayScore : lastShown?.scoreAway ?? 0;
  const live = computeLiveStats(result, minute);
  const myLive = myScoreOf(scoreHome, scoreAway);
  const oppLive = oppScoreOf(scoreHome, scoreAway);
  const outcome: 'WIN' | 'LOSE' | 'DRAW' = myLive > oppLive ? 'WIN' : myLive < oppLive ? 'LOSE' : 'DRAW';
  const feed = shownEvents.filter((e) => e.highlightLevel !== 'low').slice(-4).reverse();

  const mySquadFinal = iAmHome ? result.homeSquad : result.awaySquad;
  const oppSquadShown = iAmHome ? result.awaySquad : result.homeSquad;
  const myCoach = iAmHome ? result.homeCoach : result.awayCoach;
  const oppCoachShown = iAmHome ? result.awayCoach : result.homeCoach;
  const mvp = [...result.homeSquad, ...result.awaySquad].find((p) => p.nameAr === result.stats.mvpPlayerName || p.name === result.stats.mvpPlayerName);

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] overflow-y-auto select-none" style={frame}>
      <div className={`min-h-full w-full max-w-md mx-auto px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+16px)] flex flex-col gap-3 ${shadow}`}>
        {/* الشريط العلوي */}
        <div className="flex items-center justify-between min-h-[28px]">
          {!finished ? (
            <>
              <button
                type="button"
                onClick={() => setWithdrawAsk(true)}
                className="flex items-center gap-1 rounded-full bg-rose-500/30 border border-rose-300/50 px-3 py-1 text-[11px] font-black text-rose-100"
              >
                <LogOut className="w-3.5 h-3.5" /> انسحاب
              </button>
              <button
                type="button"
                onClick={skipToEnd}
                className="flex items-center gap-1 rounded-full bg-black/40 border border-white/25 px-3 py-1 text-[11px] font-black text-white"
              >
                <FastForward className="w-3.5 h-3.5" /> تخطي
              </button>
            </>
          ) : (
            <div className="w-full text-center text-xs font-black text-amber-200">صافرة النهاية</div>
          )}
        </div>

        {/* لوحة النتيجة: الخصم يمين • النتيجة وسط • أنت شمال */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mt-1">
          <div className="text-center min-w-0">
            <PlayerAvatarBadge avatar={oppAvatarFinal} size="md" className="mx-auto" equipped={oppEq} />
            <div className="mt-1 flex justify-center"><PlayerCosmeticName name={oppName} equipped={oppEq} size="sm" /></div>
          </div>
          <div className="text-center px-1">
            <div className="mb-1 text-[11px] font-black tracking-[0.35em] text-amber-300 [text-shadow:0_1px_4px_rgba(0,0,0,1)]">المواجهة</div>
            <div className="rounded-2xl bg-black/60 border border-white/15 px-3 py-1 text-4xl font-black text-white tabular-nums leading-none [text-shadow:0_2px_6px_rgba(0,0,0,.9)]" dir="ltr">
              {myLive} <span className="text-white/50">-</span> {oppLive}
            </div>
            <div className="mt-1 inline-block rounded-full bg-black/50 border border-amber-300/50 px-2.5 py-0.5 text-[11px] font-black text-amber-300 tabular-nums">
              {finished ? 'النهاية' : `${minute}'`}
            </div>
          </div>
          <div className="text-center min-w-0">
            <PlayerAvatarBadge avatar={myAvatarFinal} size="md" className="mx-auto" equipped={myEq} />
            <div className="mt-1 flex justify-center"><PlayerCosmeticName name={myName} equipped={myEq} size="sm" /></div>
          </div>
        </div>

        {/* شريط التقدّم الرفيع */}
        <div className="h-1 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full bg-gradient-to-l from-amber-400 to-yellow-300" style={{ width: `${(minute / 90) * 100}%`, transition: 'width 250ms linear' }} />
        </div>

        {/* الأحداث الحيّة — بدون صندوق */}
        {!finished && (
          <div className="flex-1 min-h-[140px] space-y-1.5">
            {feed.length === 0 && <div className="mx-auto w-fit rounded-full bg-black/60 px-4 py-1.5 text-center text-xs font-bold text-white mt-6">الكرة بدأت… الفريقين بيجسوا نبض بعض ⚽</div>}
            {feed.map((e, i) => (
              <div
                key={`${e.minute}-${i}-${e.type}`}
                className={`flex items-start gap-2 rounded-xl bg-black/65 border border-white/15 px-2.5 py-1.5 text-[13px] leading-snug [text-shadow:0_1px_3px_rgba(0,0,0,.95)] ${
                  e.type === 'GOAL' ? 'text-amber-200 font-black text-[14px] border-amber-300/50' : e.highlightLevel === 'high' ? 'text-white font-bold' : 'text-white'
                } ${i === 0 ? 'animate-in fade-in slide-in-from-top-2 duration-300' : 'opacity-90'}`}
              >
                <span className="shrink-0 min-w-[2rem] text-center rounded bg-black/50 border border-white/15 px-1 py-0.5 text-[10px] font-black tabular-nums">{e.minute}'</span>
                <span className="min-w-0 break-words">{e.descriptionAr}</span>
              </div>
            ))}
          </div>
        )}

        {!finished && (
          <MatchLiveStatsPanel stats={live} myIsHome={iAmHome} myName={myName} oppName={oppName} finished={false} compact />
        )}

        {finished && (
          <>
            <div className="text-center mt-1">
              <Trophy className="w-8 h-8 mx-auto text-amber-300" />
              <div className="text-2xl font-black text-white mt-1">
                {outcome === 'WIN' ? 'كسبت المواجهة! 🎉' : outcome === 'LOSE' ? 'الخصم كسب المرة دي' : 'تعادل!'}
              </div>
              {!mvp && result.stats.mvpPlayerName && (
                <div className="text-[11px] text-amber-200 font-bold mt-1">رجل المباراة: {result.stats.mvpPlayerName}</div>
              )}
            </div>

            {mvp && (
              <div className="flex flex-col items-center -mt-1">
                <div className="text-[11px] font-black text-amber-200 mb-1">⭐ رجل المباراة</div>
                <div className="w-28">
                  <PlayerCard player={mvp} size="fluid" transparent />
                </div>
              </div>
            )}

            <MatchLiveStatsPanel stats={live} myIsHome={iAmHome} myName={myName} oppName={oppName} finished />

            {lineupOpen && (
              <StackedLineups
                top={{ name: oppName, coach: oppCoachShown, squad: oppSquadShown, equipped: oppEq, isUser: false }}
                bottom={{ name: myName, coach: myCoach, squad: mySquadFinal, equipped: myEq, isUser: true }}
                squadSize={mySquadFinal.length > 5 ? 11 : 5}
              />
            )}

            <div className="mt-auto pt-2">
              <PostMatchActions
                gameId={gameId}
                opponent={opponentPlayer || null}
                onSeeOtherGame={() => onFinishMatch(outcome)}
                onShowLineup={() => setLineupOpen((v) => !v)}
                onRematchAi={onRematch}
              />
            </div>
          </>
        )}
      </div>

      {withdrawAsk && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 px-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <div className="w-full max-w-sm text-center space-y-3 rounded-3xl bg-zinc-950/80 border border-white/15 backdrop-blur-sm p-4">
            <div className="text-base font-black text-white">متأكد إنك عايز تنسحب؟</div>
            <div className="text-[11px] text-zinc-300">الانسحاب = خسارة 0 - 1 تلقائياً.</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setWithdrawAsk(false)} className="rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-zinc-950">كمّل</button>
              <button onClick={confirmWithdraw} className="rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white">انسحب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
