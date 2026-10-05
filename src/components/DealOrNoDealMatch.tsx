// ديل أور نو ديل — شاشة المحاكاة النهائية + النتيجة.
// المباراة بتتحاكى بمحرك المباراة (simulateDeterministicMatch) على اللاعبين اللي اتكسبوا فعلاً.
// النتيجة نفسها على جهاز الطرفين (نفس الـ seed).
// دقيقة بدقيقة • شفافة فوق الخلفية • بدون تحليل فني • أزرار ما بعد المباراة الجديدة.
import React, { useEffect, useRef, useState } from 'react';
import { FastForward, Trophy } from 'lucide-react';
import { MatchSimulationResult, PlayerSnapshot } from '../types';
import { DndSide } from '../types/dealOrNoDealTypes';
import { DndSquad } from '../services/dealOrNoDealEngine';
import { FormationPitch } from './DealOrNoDealParts';
import { WinCelebrationFX } from './RevealFX';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';
import { PlayerCosmeticName } from './PlayerCosmeticName';
import { PostMatchActions } from './PostMatchActions';
import { PlayerCard } from './PlayerCard';
import { MatchLiveStatsPanel } from './MatchLiveStatsPanel';
import { computeLiveStats, uniqueEvents } from '../services/liveMatchStats';
import { audioManager } from '../services/audioManager';
import { recordMatchEverywhere } from '../services/dailyService';
import { StorageService } from '../services/storageService';

interface Props {
  result: MatchSimulationResult;
  mySide: DndSide;
  myName: string;
  oppName: string;
  mySquad: DndSquad;
  oppSquad: DndSquad;
  canRematch: boolean;
  rematchWaiting: boolean;
  onFinished: (outcome: 'win' | 'loss' | 'draw') => void;
  onRematch: () => void;
  onBackToGames: () => void;
  startFinished?: boolean;
  /** وضع الحكم: عرض محايد (فاز فلان) وعناوين بأسماء اللاعبين */
  neutral?: boolean;
  /** الخصم الحقيقي. null/undefined = AI */
  opponent?: PlayerSnapshot | null;
  myAvatar?: string;
  oppAvatar?: string;
}

const TICK_MS = 210;

export const DealOrNoDealMatch: React.FC<Props> = ({
  result,
  mySide,
  myName,
  oppName,
  mySquad,
  oppSquad,
  rematchWaiting,
  onFinished,
  onRematch,
  onBackToGames,
  startFinished = false,
  neutral = false,
  opponent = null,
  myAvatar = 'av_default',
  oppAvatar = 'av_bot'
}) => {
  const events = result.events;
  const [minute, setMinute] = useState(startFinished ? 90 : 0);
  const finished = minute >= 90;
  const reported = useRef(false);
  const [lineupOpen, setLineupOpen] = useState(false);

  const minuteRef = useRef(startFinished ? 90 : 0);
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      const prev = minuteRef.current;
      const next = Math.min(90, prev + 1);
      minuteRef.current = next;
      if (events.some((e) => e.type === 'GOAL' && e.minute > prev && e.minute <= next)) audioManager.playGoal();
      setMinute(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [finished, events]);

  const myEq = neutral ? undefined : StorageService.getUserProfile().equippedCosmetics;
  const oppEq = neutral ? undefined : opponent?.equippedCosmetics;
  const mvp = [...result.homeSquad, ...result.awaySquad].find((p) => p.nameAr === result.stats.mvpPlayerName || p.name === result.stats.mvpPlayerName);
  const myIsHome = mySide === 'A';
  const myScore = myIsHome ? result.stats.homeScore : result.stats.awayScore;
  const oppScore = myIsHome ? result.stats.awayScore : result.stats.homeScore;
  const outcome: 'win' | 'loss' | 'draw' = myScore > oppScore ? 'win' : myScore < oppScore ? 'loss' : 'draw';

  useEffect(() => {
    if (finished && !reported.current) {
      reported.current = true;
      audioManager.playWhistle();
      if (!neutral && !startFinished) {
        recordMatchEverywhere({ gameId: 'DEAL_OR_NO_DEAL', opponentName: oppName, opponentIsAi: !opponent, scoreFor: myScore, scoreAgainst: oppScore });
      }
      onFinished(outcome);
    }
  }, [finished, outcome, onFinished, neutral, startFinished, oppName, opponent, myScore, oppScore]);

  const seen = uniqueEvents(events).filter((e) => e.minute <= minute);
  const live = computeLiveStats(result, minute);
  const cur = seen.length ? seen[seen.length - 1] : null;
  const scoreHome = finished ? result.stats.homeScore : cur?.scoreHome ?? 0;
  const scoreAway = finished ? result.stats.awayScore : cur?.scoreAway ?? 0;
  const myLive = myIsHome ? scoreHome : scoreAway;
  const oppLive = myIsHome ? scoreAway : scoreHome;
  const feed = seen.filter((e) => e.highlightLevel !== 'low').slice(-4).reverse();
  const shadow = 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]';

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[60] overflow-y-auto select-none"
      style={{
        backgroundImage: "linear-gradient(rgba(3,7,18,.2), rgba(3,7,18,.55)), url('/games/backgrounds/deal-or-no-deal-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <WinCelebrationFX active={finished && (neutral || outcome === 'win')} />
      <div className={`min-h-full w-full max-w-md mx-auto px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+16px)] flex flex-col gap-3 ${shadow}`}>
        <div className="flex justify-end min-h-[28px]">
          {!finished ? (
            <button
              type="button"
              onClick={() => { minuteRef.current = 90; setMinute(90); }}
              className="flex items-center gap-1 rounded-full bg-black/40 border border-white/25 px-3 py-1 text-[11px] font-black text-white"
            >
              <FastForward className="w-3.5 h-3.5" /> تخطي
            </button>
          ) : (
            <div className="w-full text-center text-xs font-black text-amber-200">صافرة النهاية</div>
          )}
        </div>

        {/* الخصم يمين • النتيجة وسط • أنت شمال */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="text-center min-w-0">
            <PlayerAvatarBadge avatar={oppAvatar} size="md" className="mx-auto" equipped={oppEq} />
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
            <PlayerAvatarBadge avatar={myAvatar} size="md" className="mx-auto" equipped={myEq} />
            <div className="mt-1 flex justify-center"><PlayerCosmeticName name={myName} equipped={myEq} size="sm" /></div>
          </div>
        </div>

        <div className="h-1 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full bg-gradient-to-l from-amber-400 to-yellow-300" style={{ width: `${(minute / 90) * 100}%`, transition: 'width 250ms linear' }} />
        </div>

        {!finished && (
          <div className="flex-1 min-h-[140px] space-y-1.5">
            {feed.length === 0 && <div className="mx-auto w-fit rounded-full bg-black/60 px-4 py-1.5 text-center text-xs font-bold text-white mt-6">المباراة بدأت… ⚽</div>}
            {feed.map((e, i) => (
              <div
                key={`${e.minute}-${i}-${e.type}`}
                className={`flex items-start gap-2 rounded-xl bg-black/65 border border-white/15 px-2.5 py-1.5 text-[13px] leading-snug [text-shadow:0_1px_3px_rgba(0,0,0,.95)] ${e.type === 'GOAL' ? 'text-amber-200 font-black text-[13px]' : 'text-white/90'} ${i === 0 ? 'animate-in fade-in slide-in-from-top-2 duration-300' : 'opacity-90'}`}
              >
                <span className="shrink-0 min-w-[2rem] text-center rounded bg-black/50 border border-white/15 px-1 py-0.5 text-[10px] font-black tabular-nums">{e.minute}'</span>
                <span className="min-w-0 break-words">{e.descriptionAr}</span>
              </div>
            ))}
          </div>
        )}

        {!finished && (
          <MatchLiveStatsPanel stats={live} myIsHome={myIsHome} myName={myName} oppName={oppName} finished={false} compact />
        )}

        {finished && (
          <>
            <div className="text-center mt-1">
              <Trophy className="w-8 h-8 mx-auto text-amber-300" />
              <div className="text-2xl font-black text-white mt-1">
                {neutral
                  ? outcome === 'win'
                    ? `فاز ${myName}! 🎉`
                    : outcome === 'loss'
                    ? `فاز ${oppName}! 🎉`
                    : 'تعادل!'
                  : outcome === 'win'
                  ? 'كسبت المواجهة! 🎉'
                  : outcome === 'loss'
                  ? 'الخصم كسب المرة دي'
                  : 'تعادل!'}
              </div>
              
            </div>

            {mvp && (
              <div className="flex flex-col items-center">
                <div className="text-[11px] font-black text-amber-200 mb-1">⭐ رجل المباراة</div>
                <div className="w-28">
                  <PlayerCard player={mvp} size="fluid" transparent />
                </div>
              </div>
            )}

            <MatchLiveStatsPanel stats={live} myIsHome={myIsHome} myName={myName} oppName={oppName} finished />

            {lineupOpen && (
              <div className="space-y-4 max-w-sm mx-auto w-full">
                <FormationPitch
                  title={neutral ? oppName : `تشكيلة ${oppName}`}
                  slots={oppSquad.bySlot}
                  coach={oppSquad.coach}
                  cards={oppSquad.cards}
                  accent="rose"
                  equipped={oppEq}
                />
                <FormationPitch
                  title={neutral ? myName : 'تشكيلتي'}
                  slots={mySquad.bySlot}
                  coach={mySquad.coach}
                  cards={mySquad.cards}
                  accent="emerald"
                  equipped={myEq}
                />
              </div>
            )}

            <div className="mt-auto pt-2">
              {rematchWaiting && <div className="text-center text-[11px] font-bold text-amber-200 mb-2">مستني رد الخصم…</div>}
              <PostMatchActions
                gameId="DEAL_OR_NO_DEAL"
                opponent={neutral ? null : opponent}
                onSeeOtherGame={onBackToGames}
                onShowLineup={() => setLineupOpen((v) => !v)}
                onRematchAi={onRematch}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
