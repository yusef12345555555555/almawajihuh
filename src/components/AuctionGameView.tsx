// ============================================================
// العبها صح | EL3BHA SA7 - 1v1 Fullscreen Football Pitch Auction Arena
// ============================================================

import React, { useState, useEffect } from 'react';
import { UserProfile, AuctionRoomSettings, RoomParticipant, FootballPlayer, Coach, PlayerSnapshot } from '../types';
import { LiveChannel } from '../services/liveChannel';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';
import { PlayerCosmeticName } from './PlayerCosmeticName';
import { RemoteAuctionEngine } from '../services/auctionRemote';
import {
  AuctionEngine,
  AuctionSessionState,
  DEFAULT_AUCTION_TIMER,
  DEFAULT_STARTING_BID,
  normalizeBidAmount,
  formatMoneyDisplay
} from '../services/auctionEngine';
import { PlayerCard } from './PlayerCard';
import { RadialGlowBurst } from './RevealFX';
import { FootballPitch } from './FootballPitch';
import { AuctionCardSwapReveal, CardSwapInfo, CardSwapStrip } from './AuctionCardSwapReveal';
import { ActiveGameShell } from './ActiveGameShell';
import { CoachLineupReveal } from './CoachLineupReveal';
import { WithdrawResultScreen } from './WithdrawResultScreen';
import { audioManager } from '../services/audioManager';
import { refreshPlayersInBackground } from '../services/playerRepository';
import {
  Gavel,
  Timer,
  Users,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Flame,
  ArrowRight,
  Award,
  LogOut,
  Swords,
  Gift,
  Dice5,
  Shuffle,
  Trophy,
  ShieldCheck,
  Check,
  Plus,
  Minus,
  Coins,
  Zap,
  SlidersHorizontal
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuctionGameViewProps {
  user: UserProfile;
  settings: AuctionRoomSettings;
  onFinishGame: (squad: FootballPlayer[], coach: Coach | null, opponentSquad?: FootballPlayer[], opponentCoach?: Coach | null) => void;
  onBackToHome: () => void;
  onWithdraw: () => void;
  /** الخصم الحقيقي (لعب لحظي). غير موجود = ضد AI */
  opponent?: PlayerSnapshot | null;
}

type EngineLike = Pick<AuctionEngine, 'placeBid' | 'skipPlayer' | 'forfeitGame' | 'useWildCard' | 'triggerNoRiskSimulation' | 'completeNoRiskPhase' | 'getMinimumNextBid' | 'getState' | 'startAuction' | 'destroy' | 'subscribe'>;

const ACTIVE_STATES = ['COUNTDOWN', 'PLAYER_REVEAL', 'BIDDING', 'BID_LOCKED', 'WINNER_REVEAL', 'ORIGINAL_PLAYER_RESOLUTION', 'ALTERNATE_PLAYER_REVEAL', 'NEXT_ROUND', 'PLAYER_ASSIGNED'];

/** يضبط الحقول حسب وجهة نظر اللاعب نفسه (المحرك بيحسبها من وجهة نظر المضيف). */
function forMe(state: AuctionSessionState, myId: string, iAmGuest: boolean): AuctionSessionState {
  const next: AuctionSessionState = { ...state };
  if (state.originalPlayerResult) {
    const r = state.originalPlayerResult;
    const mine = r.winnerId === myId;
    next.originalPlayerResult = { ...r, isUserWinner: mine, titleAr: mine ? 'راحتلك' : `راحت لـ ${r.winnerName}` };
  }
  if (state.alternatePlayerResult) {
    const r = state.alternatePlayerResult;
    const mine = r.receiverId === myId;
    next.alternatePlayerResult = {
      ...r,
      isUserReceiver: mine,
      titleAr: r.cost > 0 ? (mine ? 'Last Bid' : `Last Bid لـ ${r.receiverName}`) : mine ? 'لاعب بديل' : `لاعب بديل لـ ${r.receiverName}`
    };
  }
  if (iAmGuest && state.assignedCoaches) {
    next.assignedCoaches = { userCoach: state.assignedCoaches.opponentCoach, opponentCoach: state.assignedCoaches.userCoach } as typeof state.assignedCoaches;
  }
  return next;
}

export const AuctionGameView: React.FC<AuctionGameViewProps> = ({
  user,
  settings,
  onFinishGame,
  onBackToHome,
  onWithdraw,
  opponent
}) => {
  const live = !!opponent;
  const iAmGuest = live && (user.id || '') > (opponent?.id || '');
  const [liveWait, setLiveWait] = useState<'connecting' | 'waiting' | 'ok' | 'failed'>(live ? 'connecting' : 'ok');
  const [liveFailWhy, setLiveFailWhy] = useState('');
  const [engine, setEngine] = useState<EngineLike | null>(null);
  const [sessionState, setSessionStateRaw] = useState<AuctionSessionState | null>(null);
  const setSessionState = (st: AuctionSessionState) => setSessionStateRaw(live ? forMe(st, user.id, iAmGuest) : st);
  const [activePitchView, setActivePitchView] = useState<'BOTH' | 'YOU' | 'OPPONENT'>('BOTH');
  const [bidError, setBidError] = useState<string | null>(null);
  const [wildCardMessage, setWildCardMessage] = useState<string | null>(null);
  const [selectedBidAmount, setSelectedBidAmount] = useState<number>(DEFAULT_STARTING_BID);
  const [manualInputStr, setManualInputStr] = useState<string>(String(DEFAULT_STARTING_BID));
  const [isDecimalStep, setIsDecimalStep] = useState<boolean>(false);
  const [noRiskChargingIdx, setNoRiskChargingIdx] = useState<number | null>(null);
  const [noRiskRevealedCount, setNoRiskRevealedCount] = useState(0);
  const [noRiskCoachBoxOpened, setNoRiskCoachBoxOpened] = useState(false);
  const [showAuctionFinalPreview, setShowAuctionFinalPreview] = useState(false);
  /** كشف الكرت: اللاعب اللي خرج واللي دخل + نزوله التشكيلة (وايلد كارد / خاطر وبدل). */
  const [swapReveal, setSwapReveal] = useState<CardSwapInfo | null>(null);

  // Initialize Auction Engine with 30s Server-Authoritative timer
  useEffect(() => {
    refreshPlayersInBackground();
    const userParticipant: RoomParticipant = {
      userId: user.id,
      userName: user.nameAr || user.username,
      userAvatar: user.avatar,
      isHost: true,
      isReady: true,
      isBot: false,
      budget: settings.initialBudget,
      squad: [],
      coach: null,
      totalSpent: 0,
      hasSkippedCurrent: false,
      lastValidBidInRound: 0,
      wildCardsAvailable: settings.wildCardEnabled ? 1 : 0,
      hasUsedWildCard: false,
      hasUsedNoRisk: false
    };

    const effectiveSettings = live ? { ...settings, wildCardEnabled: false, noRiskEnabled: false } : { ...settings };
    const handleState = (state: AuctionSessionState) => {
      setSessionState(state);
      if (
        (state.state === 'ORIGINAL_PLAYER_RESOLUTION' && state.originalPlayerResult?.winnerId === user.id) ||
        (state.state === 'ALTERNATE_PLAYER_REVEAL' && state.alternatePlayerResult?.receiverId === user.id)
      ) {
        try {
          confetti({ particleCount: 30, spread: 55, origin: { y: 0.6 } });
        } catch {}
      }
      if (state.state === 'FORFEIT' && state.forfeitLoserId !== user.id) {
        try {
          confetti({ particleCount: 130, spread: 110, origin: { y: 0.5 }, colors: ['#fbbf24', '#fde68a', '#34d399', '#818cf8'] });
        } catch {}
      }
    };

    // ---------------- ضد AI ----------------
    if (!live) {
      const newEngine = new AuctionEngine(userParticipant, effectiveSettings, 1);
      setEngine(newEngine);
      const unsubscribe = newEngine.subscribe(handleState);
      newEngine.startAuction();
      return () => {
        unsubscribe();
        newEngine.destroy();
      };
    }

    // ---------------- لعب لحظي ضد لاعب حقيقي ----------------
    const topic = LiveChannel.pairTopic(user.id, opponent!.id);
    const ch = new LiveChannel(topic);
    const cleanups: (() => void)[] = [];
    let alive = true;
    let lastPeer = Date.now();
    const sid = { current: null as string | null };

    const peerLostCheck = (isHost: boolean, eng: any) => {
      const t = window.setInterval(() => {
        const st = eng.getState?.();
        if (!st || !ACTIVE_STATES.includes(String(st.state))) return;
        if (Date.now() - lastPeer > 20000) {
          if (isHost) {
            eng.forfeitGame(opponent!.id);
          } else {
            handleState({ ...st, state: 'FORFEIT', forfeitLoserId: opponent!.id } as AuctionSessionState);
          }
        }
      }, 3000);
      cleanups.push(() => clearInterval(t));
    };

    void (async () => {
      const ok = await ch.join();
      if (!alive) return;
      if (!ok) {
        setLiveFailWhy(`تعذر فتح القناة اللحظية (${ch.lastStatus || 'لا رد'}) — اتأكد من النت ومن تفعيل Realtime في Supabase`);
        setLiveWait('failed');
        return;
      }
      setLiveWait('waiting');
      cleanups.push(ch.on('ping', () => (lastPeer = Date.now())));
      const pinger = window.setInterval(() => ch.send('ping', { from: user.id }), 3000);
      cleanups.push(() => clearInterval(pinger));
      cleanups.push(
        ch.on('bye', () => {
          lastPeer = 0; // الخصم خرج
        })
      );

      if (!iAmGuest) {
        // ===== المضيف: يشغّل المحرك الحقيقي =====
        const hostEngine = new AuctionEngine(userParticipant, effectiveSettings, 1);
        hostEngine.setRealOpponent({ userId: opponent!.id, userName: opponent!.nameAr || opponent!.name, userAvatar: opponent!.avatar });
        sid.current = `s_${Date.now().toString(36)}`;
        setEngine(hostEngine);
        let started = false;
        const push = (st: AuctionSessionState) => ch.send('state', { sid: sid.current, state: st, min: hostEngine.getMinimumNextBid() });
        const unsub = hostEngine.subscribe((st) => {
          handleState(st);
          if (started) push(st);
        });
        cleanups.push(unsub);
        cleanups.push(() => hostEngine.destroy());
        const startNow = () => {
          if (started) return;
          started = true;
          lastPeer = Date.now();
          setLiveWait('ok');
          hostEngine.startAuction();
          peerLostCheck(true, hostEngine);
        };
        cleanups.push(
          ch.on('hello', () => {
            lastPeer = Date.now();
            if (!started) startNow();
            else push(hostEngine.getState());
          })
        );
        cleanups.push(
          ch.on('act', (m) => {
            if (m.sid !== sid.current || m.from !== opponent!.id) return;
            lastPeer = Date.now();
            if (m.type === 'bid') {
              const r = hostEngine.placeBid(opponent!.id, m.amount);
              if (!r.success) ch.send('err', { sid: sid.current, message: r.message });
            } else if (m.type === 'skip') hostEngine.skipPlayer(opponent!.id);
            else if (m.type === 'forfeit') hostEngine.forfeitGame(opponent!.id);
          })
        );
        // لو الضيف ما دخلش خلال 30 ثانية
        const waitTimer = window.setTimeout(() => {
          if (!started) setLiveWait('failed');
        }, 30000);
        cleanups.push(() => clearTimeout(waitTimer));
      } else {
        // ===== الضيف: يعرض حالة المضيف ويبعت قراراته =====
        const remote = new RemoteAuctionEngine(ch, () => sid.current);
        setEngine(remote as unknown as EngineLike);
        cleanups.push(remote.subscribe(handleState));
        cleanups.push(
          ch.on('state', (m) => {
            lastPeer = Date.now();
            if (sid.current !== m.sid) {
              sid.current = m.sid;
              setLiveWait('ok');
              peerLostCheck(false, remote);
            }
            remote.apply(m.state, m.min);
          })
        );
        cleanups.push(
          ch.on('err', (m) => {
            if (m.sid === sid.current) setBidError(m.message);
          })
        );
        const hello = window.setInterval(() => {
          if (!sid.current) ch.send('hello', { from: user.id });
        }, 1000);
        cleanups.push(() => clearInterval(hello));
        ch.send('hello', { from: user.id });
        const waitTimer = window.setTimeout(() => {
          if (!sid.current) setLiveWait('failed');
        }, 30000);
        cleanups.push(() => clearTimeout(waitTimer));
      }
    })();

    return () => {
      alive = false;
      try {
        ch.send('bye', { from: user.id });
      } catch {
        /* ignore */
      }
      cleanups.forEach((c) => c());
      setTimeout(() => ch.leave(), 150);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, user.id, opponent?.id]);

  // Synchronize selected bid with round/turn minimums (Must be before any conditional returns!)
  // The bid box is a LIVE value, not a free-standing number: the moment
  // anyone (me or the opponent) raises, it snaps to the next legal bid.
  // So if the auction sits at 20, both screens immediately show 21.
  useEffect(() => {
    if (!engine || !sessionState) return;
    const minLegal = engine.getMinimumNextBid();
    setSelectedBidAmount(minLegal);
    setManualInputStr(String(minLegal));
  }, [sessionState?.currentRound, sessionState?.currentHighBid?.amount, sessionState?.state, engine]);

  if (!sessionState || !engine) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-zinc-400">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-lg">
          {liveWait === 'failed' ? (liveFailWhy || 'الخصم ماتصلش بالمزاد') : liveWait === 'waiting' ? 'مستنيين الخصم يدخل المزاد…' : 'بنجهز المزاد...'}
        </p>
        {liveWait === 'failed' && (
          <button onClick={onBackToHome} className="mt-4 rounded-xl bg-amber-400 px-5 py-2 text-sm font-black text-zinc-950">رجوع</button>
        )}
      </div>
    );
  }

  const myParticipant = sessionState.participants.find((p) => p.userId === user.id) || sessionState.participants[0];
  const opponentParticipant = sessionState.participants.find((p) => p.userId !== user.id) || sessionState.participants[1];

  const currentBidAmount = sessionState.currentHighBid ? normalizeBidAmount(sessionState.currentHighBid.amount) : 0;
  const nextMinBid = engine.getMinimumNextBid();
  const myCurrentValidBid = myParticipant?.lastValidBidInRound || 0;
  const myBudget = myParticipant?.budget || 0;

  // Withdrawal must SHOW the result, not bounce the player to the menu.
  // Route it through the engine so state becomes FORFEIT and the 1-0
  // result screen renders; the screen's own button then exits.
  const handleWithdrawInGame = () => {
    if (engine) engine.forfeitGame(user.id);
  };

  const handleStepDecrease = () => {
    setBidError(null);
    const step = isDecimalStep ? 0.1 : ((sessionState?.settings?.bidIncrement ?? settings.bidIncrement) || 1.0);
    const nextVal = Math.max(nextMinBid, normalizeBidAmount(selectedBidAmount - step));
    setSelectedBidAmount(nextVal);
    setManualInputStr(String(nextVal));
    audioManager.playClick();
  };

  const handleStepIncrease = () => {
    setBidError(null);
    const step = isDecimalStep ? 0.1 : ((sessionState?.settings?.bidIncrement ?? settings.bidIncrement) || 1.0);
    const nextVal = Math.min(myBudget, normalizeBidAmount(selectedBidAmount + step));
    setSelectedBidAmount(nextVal);
    setManualInputStr(String(nextVal));
    audioManager.playClick();
  };

  const handleQuickAdd = (amount: number) => {
    setBidError(null);
    const nextVal = Math.min(myBudget, normalizeBidAmount(selectedBidAmount + amount));
    setSelectedBidAmount(nextVal);
    setManualInputStr(String(nextVal));
    audioManager.playClick();
  };

  const handleSetMaxBudget = () => {
    setBidError(null);
    setSelectedBidAmount(myBudget);
    setManualInputStr(String(myBudget));
    audioManager.playClick();
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBidError(null);
    const val = e.target.value;
    setManualInputStr(val);
    const cleanNum = normalizeBidAmount(val);
    if (!isNaN(cleanNum) && cleanNum > 0) {
      setSelectedBidAmount(cleanNum);
    }
  };

  const handleManualBlur = () => {
    const cleanNum = normalizeBidAmount(manualInputStr);
    if (isNaN(cleanNum) || cleanNum < nextMinBid) {
      setSelectedBidAmount(nextMinBid);
      setManualInputStr(String(nextMinBid));
    } else if (cleanNum > myBudget) {
      setSelectedBidAmount(myBudget);
      setManualInputStr(String(myBudget));
    } else {
      setSelectedBidAmount(cleanNum);
      setManualInputStr(String(cleanNum));
    }
  };

  const handleRequestBid = (amount?: number) => {
    setBidError(null);
    if (!sessionState.currentPlayer || !engine) return;

    const targetAmount = normalizeBidAmount(amount !== undefined ? amount : selectedBidAmount);

    if (targetAmount < nextMinBid) {
      setBidError(`أقل مبلغ ${formatMoneyDisplay(nextMinBid)} €`);
      return;
    }
    if (targetAmount > myBudget) {
      setBidError(`فلوسك مش كفاية (${formatMoneyDisplay(myBudget)})`);
      return;
    }

    // Bidding must feel instant: press a preset (+1/+2/+3...) or type a
    // custom number, then press "زايد" — it reaches the opponent right
    // away. No separate confirmation step in between.
    const res = engine.placeBid(user.id, targetAmount);
    if (!res.success) {
      setBidError(res.message);
    }
  };

  const handleTriggerWildCard = () => {
    if (!engine) return;
    const res = engine.useWildCard(user.id);
    setWildCardMessage(res.message);
    setTimeout(() => setWildCardMessage(null), 4000);
    if (res.success && res.oldPlayer && res.newPlayer) {
      setSwapReveal({ kind: 'WILD_CARD', oldPlayer: res.oldPlayer, newPlayer: res.newPlayer });
    }
  };

  // ما بعد الكروت: مين خرج ومين دخل (بتفضل ظاهرة لحد المحاكاة)
  const wildSwap: CardSwapInfo | null =
    sessionState.wildCardSwap?.userOldPlayer && sessionState.wildCardSwap.userNewPlayer
      ? { kind: 'WILD_CARD', oldPlayer: sessionState.wildCardSwap.userOldPlayer, newPlayer: sessionState.wildCardSwap.userNewPlayer }
      : null;
  const noRiskSwap: CardSwapInfo | null =
    sessionState.noRiskReplacedPlayer?.userOldPlayer && sessionState.noRiskReplacedPlayer.userNewPlayer
      ? { kind: 'NO_RISK', oldPlayer: sessionState.noRiskReplacedPlayer.userOldPlayer, newPlayer: sessionState.noRiskReplacedPlayer.userNewPlayer }
      : null;
  const cardSwaps = [noRiskSwap, wildSwap].filter((x): x is CardSwapInfo => !!x);
  const swappedPlayerIds = cardSwaps.map((x) => x.newPlayer.id);

  const swapOverlay = swapReveal ? (
    <AuctionCardSwapReveal
      swap={swapReveal}
      squad={myParticipant.squad}
      squadSize={(sessionState?.settings?.squadSize ?? settings.squadSize)}
      teamName={user.nameAr}
      teamAvatar={user.avatar}
      onDone={() => setSwapReveal(null)}
    />
  ) : null;

  // FORFEIT / WITHDRAWAL TERMINATION
  if (sessionState.state === 'FORFEIT') {
    const isLoser = sessionState.forfeitLoserId === user.id;
    return (
      <WithdrawResultScreen
        didWithdraw={isLoser}
        myName={user.nameAr || user.username}
        myAvatar={user.avatar || 'av_default'}
        opponentName={opponentParticipant?.userName || 'الخصم'}
        opponentAvatar={opponentParticipant?.userAvatar || 'av_bot'}
        onBack={onBackToHome}
      />
    );
  }

  // NO RISK NO FUN: one blind random swap, then show the committed result.
  if (sessionState.state === 'NO_RISK_WINDOW') {
    const sim = sessionState.noRiskSimulation?.[0] || null;
    const handleReveal = () => {
      if (noRiskChargingIdx !== null) return;
      setNoRiskChargingIdx(0);
      audioManager.playCardDraw();
      setTimeout(() => {
        setNoRiskChargingIdx(null);
        setNoRiskRevealedCount(1);
        audioManager.playReveal();
        if (sim?.newPlayer) setSwapReveal({ kind: 'NO_RISK', oldPlayer: sim.oldPlayer, newPlayer: sim.newPlayer });
      }, 1200);
    };

    return (
      <ActiveGameShell user={user} opponent={opponentParticipant} gameTitle="خاطر وبدل" backgroundUrl="/games/backgrounds/auction-bg.png" gamePhase="NO RISK NO FUN" userBudget={myParticipant.budget} opponentBudget={opponentParticipant.budget} onWithdraw={handleWithdrawInGame}>
        <div className="max-w-2xl mx-auto space-y-6 py-8">
          <div className="rounded-3xl p-6 sm:p-8 text-center shadow-2xl  ">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/40"><Dice5 className="w-4 h-4 text-purple-400" /><span>خاطر وبدل • NO RISK NO FUN</span></div>
            {!sim ? (
              <>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-5">جاهز للمخاطرة؟</h2>
                <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto mt-2">النظام يختار لاعبًا واحدًا عشوائيًا ويستبدله بلاعب عشوائي من نفس المركز. أنت لا تختار اللاعب الجديد.</p>
                <button id="trigger_no_risk_btn" onClick={() => engine.triggerNoRiskSimulation(user.id)} className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-700 text-white font-black text-sm shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:scale-[1.02] active:scale-95 transition-all">🎲 خاطر وبدل الآن</button>
                <button id="skip_no_risk_btn" onClick={() => engine.completeNoRiskPhase()} className="mt-3 w-full py-3 rounded-2xl bg-black/25 text-zinc-300 font-bold text-sm border border-zinc-700">سيبها</button>
              </>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-5">النتيجة العشوائية جاهزة 🎲</h2>
                {noRiskRevealedCount === 0 ? (
                  <div className="mt-6 flex justify-center">
                    <div className={`relative w-56 h-72 rounded-3xl border-2 border-purple-400 bg-gradient-to-b from-purple-950 via-zinc-950 to-black p-4 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(168,85,247,.35)] ${noRiskChargingIdx !== null ? 'animate-pulse scale-105' : ''}`}>
                      <button onClick={handleReveal} disabled={noRiskChargingIdx !== null} className="w-full h-full text-purple-300 font-black"><Sparkles className="w-12 h-12 mx-auto mb-4 animate-pulse" /><div>اضغط لكشف اللاعب</div><div className="text-[10px] text-zinc-500 mt-2">النتيجة عشوائية بالكامل</div></button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {noRiskSwap && <CardSwapStrip swap={noRiskSwap} />}
                    <FootballPitch mode={(sessionState?.settings?.squadSize ?? settings.squadSize) === 5 ? 'CLASSIC' : 'PRO'} squad={myParticipant.squad} teamName={user.nameAr} teamAvatar={user.avatar} isUser compact showOwnership={false} highlightPlayerIds={swappedPlayerIds} />
                  </div>
                )}
                {noRiskRevealedCount > 0 && <button id="start_play_after_no_risk_btn" onClick={() => engine.completeNoRiskPhase()} className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-zinc-950 font-black text-base shadow-[0_0_30px_rgba(52,211,153,0.5)] hover:scale-[1.02] active:scale-95 transition-all">أكمل للمدربين والتشكيلة 🔥</button>}
              </>
            )}
          </div>
        </div>
        {swapOverlay}
      </ActiveGameShell>
    );
  }

  // AUTOMATIC COACH REVEAL PHASE — «بنجهز المدربين» ثم التشكيلة والمدرب فوقها
  if (sessionState.state === 'COACH_REVEAL' && sessionState.assignedCoaches) {
    const userCoach = sessionState.assignedCoaches.userCoach;
    const opponentCoach = sessionState.assignedCoaches.opponentCoach;
    const latestState = engine ? engine.getState() : sessionState;
    const mineNow = latestState.participants.find((p) => p.userId === user.id) ?? myParticipant;
    const rivalNow = latestState.participants.find((p) => p.userId !== user.id) ?? opponentParticipant;

    return (
      <>
        <CoachLineupReveal
          bgUrl="/games/backgrounds/auction-bg.png"
          myName={user.nameAr}
          oppName={opponentParticipant.userName}
          myCoach={userCoach}
          oppCoach={opponentCoach}
          mySquad={mineNow.squad}
          oppSquad={rivalNow.squad}
          squadSize={(sessionState?.settings?.squadSize ?? settings.squadSize) === 5 ? 5 : 11}
          highlightPlayerIds={swappedPlayerIds}
          extra={
            <>
              {cardSwaps.length > 0 && <div className="space-y-1.5">{cardSwaps.map((sw) => <CardSwapStrip key={sw.kind} swap={sw} />)}</div>}
              {sessionState.wildCardEnabled && (myParticipant.wildCardsAvailable ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={handleTriggerWildCard}
                  className="w-full rounded-xl border border-emerald-300/60 bg-emerald-950/50 backdrop-blur-[2px] px-3 py-2 text-[11px] font-black text-emerald-100"
                >
                  استخدم وايلد كارد — تبديل عشوائي 🎲
                </button>
              )}
            </>
          }
          onStart={() => {
            // نقرأ التشكيلتين من المحرك وقت الضغط — عشان المحاكاة تتلعب بالاعيبة اللي اتبدلوا بالكروت.
            const latest = engine ? engine.getState() : sessionState;
            const mine = latest.participants.find((p) => p.userId === user.id) ?? myParticipant;
            const rival = latest.participants.find((p) => p.userId !== user.id) ?? opponentParticipant;
            onFinishGame([...mine.squad], userCoach, [...rival.squad], opponentCoach);
          }}
        />
        {swapOverlay}
      </>
    );
  }

  // ACTIVE 1V1 AUCTION ARENA WITH REAL FOOTBALL PITCH & 30-SECOND BIDDING
  return (
    <ActiveGameShell
      user={user}
      opponent={opponentParticipant}
      gameTitle="ساحة المزاد"
      backgroundUrl="/games/backgrounds/auction-bg.png"
      gamePhase={sessionState.currentPositionCategory}
      roundInfo={`الجولة ${sessionState.currentRound} / ${sessionState.totalRounds}`}
      userBudget={myParticipant.budget}
      opponentBudget={opponentParticipant.budget}
      timerSeconds={sessionState.timerRemaining}
      timerTotal={sessionState.timerTotal}
      onWithdraw={handleWithdrawInGame}
    >
      <div className="space-y-3 pb-8 select-none">
        {/* Wild Card Notification Banner */}
        {wildCardMessage && (
          <div className="bg-amber-400/20 border border-amber-400 text-amber-300 text-xs font-bold p-3 rounded-2xl text-center shadow-lg animate-pulse">
            {wildCardMessage}
          </div>
        )}

        {/* Tactical Pitch Tabs for mobile if desired */}
        <div className="flex sm:hidden items-center justify-center gap-2 mb-1">
          <button
            onClick={() => setActivePitchView('BOTH')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activePitchView === 'BOTH' ? 'bg-amber-500 text-zinc-950 font-black' : 'bg-black/25 text-zinc-400'
            }`}
          >
            كل التشكيلات
          </button>
          <button
            onClick={() => setActivePitchView('YOU')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activePitchView === 'YOU' ? 'bg-emerald-500 text-zinc-950 font-black' : 'bg-black/25 text-zinc-400'
            }`}
          >
            تشكيلتك ({myParticipant.squad.length})
          </button>
          <button
            onClick={() => setActivePitchView('OPPONENT')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activePitchView === 'OPPONENT' ? 'bg-blue-500 text-white font-black' : 'bg-black/25 text-zinc-400'
            }`}
          >
            تشكيلة الخصم ({opponentParticipant.squad.length})
          </button>
        </div>

        {/* 1v1 Main Arena Layout: Split Pitch View (Left) + Center Auction Stage (Center) + Opponent Pitch (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* YOUR TEAM REAL FOOTBALL PITCH */}
          <div
            className={`lg:col-span-4 space-y-2 order-2 lg:order-1 ${
              activePitchView === 'OPPONENT' ? 'hidden sm:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-1.5">
              <div className="min-w-0">
                <div className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">فريقي</div>
                <div className="flex items-center gap-1.5 min-w-0"><PlayerAvatarBadge avatar={myParticipant.userAvatar} size="sm" ring={false} equipped={user.equippedCosmetics} /><PlayerCosmeticName name={myParticipant.userName} equipped={user.equippedCosmetics} size="sm" /></div>
              </div>
              <div className="shrink-0 rounded-2xl border border-emerald-400/50 bg-emerald-950/70 px-3 py-2 text-center shadow-[0_0_18px_rgba(16,185,129,.18)]">
                <div className="text-[9px] text-emerald-300 font-black">ميزانيتي</div>
                <div className="text-base font-black text-white font-mono">{formatMoneyDisplay(myParticipant.budget)}M €</div>
              </div>
            </div>
            <FootballPitch
              mode={(sessionState?.settings?.squadSize ?? settings.squadSize) === 5 ? 'CLASSIC' : 'PRO'}
              squad={myParticipant.squad}
              teamName={myParticipant.userName}
              teamAvatar={myParticipant.userAvatar}
              isUser={true}
              budgetRemaining={myParticipant.budget}
              activeTargetPosition={sessionState.currentPositionCategory}
              showOwnership={true}
              onSelectPlayer={() => {}}
            />

            {/* Quick Squad Stats Card */}
            <div className="bg-black/30  border border-white/10 rounded-2xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">إجمالي المصروف:</span>
                <span className="font-mono font-bold text-amber-400">{myParticipant.totalSpent}M €</span>
              </div>
              {sessionState.wildCardEnabled && (
                <div className="text-[11px] text-amber-300 font-bold">
                  Wild Card: {myParticipant.wildCardsAvailable ? 'متاح بعد الجيم' : 'مستخدم'}
                </div>
              )}
            </div>
          </div>

          {/* CENTER SPOTLIGHT: REAL PLAYER AUCTION CARD & 30-SECOND BIDDING CONTROLS */}
          <div className="lg:col-span-4 space-y-3 order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-3xl bg-black/20 border border-white/10 p-4 shadow-2xl flex flex-col items-center justify-center">
              {/* 30-Second Urgency Countdown Header */}
              <div className="w-full flex items-center justify-between mb-2 bg-black/30  border border-white/10 px-3 py-1.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] font-black text-amber-300">المركز:</span>
                  <span className="text-xs font-bold text-white">{sessionState.currentPositionCategory}</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <Timer
                    className={`w-4 h-4 ${
                      (sessionState.timerRemaining ?? 0) <= 3
                        ? 'text-rose-500 animate-bounce'
                        : (sessionState.timerRemaining ?? 0) <= 5
                        ? 'text-orange-400 animate-pulse'
                        : 'text-amber-400'
                    }`}
                  />
                  <span
                    id="center_authoritative_timer"
                    className={`text-xl font-black ${
                      (sessionState.timerRemaining ?? 0) <= 3
                        ? 'text-rose-500 animate-ping font-mono'
                        : (sessionState.timerRemaining ?? 0) <= 5
                        ? 'text-orange-400 animate-pulse'
                        : (sessionState.timerRemaining ?? 0) <= 10
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                    }`}
                  >
                    00:{String(sessionState.timerRemaining ?? 0).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* DEDICATED STATE 1: ORIGINAL PLAYER RESOLUTION — clean reveal, no covering box, no bid breakdown */}
              {sessionState.state === 'ORIGINAL_PLAYER_RESOLUTION' && sessionState.originalPlayerResult && (
                <div className="w-full flex flex-col items-center gap-2 animate-fade-in">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/90 text-zinc-950 text-[11px] font-black shadow-lg">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>انضم للتشكيلة</span>
                  </div>
                  <div className="scale-95">
                    <div className="w-28"><PlayerCard player={sessionState.originalPlayerResult.player} size="fluid" transparent /></div>
                  </div>
                </div>
              )}

              {/* DEDICATED STATE 2: ALTERNATE PLAYER REVEAL — clean reveal, no covering box, no cost breakdown */}
              {sessionState.state === 'ALTERNATE_PLAYER_REVEAL' && sessionState.alternatePlayerResult && (
                <div className="w-full flex flex-col items-center gap-2 animate-fade-in">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/90 text-white text-[11px] font-black shadow-lg">
                    <Gift className="w-3.5 h-3.5" />
                    <span>لاعب بديل</span>
                  </div>
                  <div className="scale-95">
                    <div className="w-28"><PlayerCard player={sessionState.alternatePlayerResult.player} size="fluid" transparent /></div>
                  </div>
                </div>
              )}

              {/* ACTIVE BIDDING / PLAYER REVEAL STAGE */}
              {sessionState.state !== 'ORIGINAL_PLAYER_RESOLUTION' &&
                sessionState.state !== 'ALTERNATE_PLAYER_REVEAL' &&
                sessionState.currentPlayer && (
                  <>
                    {/* Main Player Card */}
                    <div className="my-1 flex justify-center">
                      <div className="w-28 sm:w-32">
                        <PlayerCard
                          player={sessionState.currentPlayer}
                          isMystery={sessionState.isMysteryPlayer}
                          isRevealed={sessionState.mysteryRevealed}
                          size="fluid"
                          transparent
                        />
                      </div>
                    </div>

                    {/* Highest Bid Meter */}
                    <div className="w-full mt-2 bg-black/25 border border-amber-500/50 p-2.5 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-zinc-400">أعلى مزايدة مسجلة</div>
                        <div className="text-xl font-black text-amber-400 font-mono">
                          {sessionState.currentHighBid ? `${sessionState.currentHighBid.amount}M €` : 'في انتظار المزايدة'}
                        </div>
                      </div>

                      {sessionState.currentHighBid ? (
                        <div className="flex items-center gap-2 text-left">
                          <PlayerAvatarBadge avatar={sessionState.currentHighBid.userAvatar} size="sm" ring={false} equipped={sessionState.currentHighBid.userId === user.id ? user.equippedCosmetics : opponent?.equippedCosmetics} />
                          <div>
                            <div className="text-[11px] font-black text-white">{sessionState.currentHighBid.userName}</div>
                            <div className="text-[9px] text-emerald-400">تسلسل #{sessionState.currentHighBid.sequence}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-500 font-bold">ابدأ بـ {nextMinBid}M</div>
                      )}
                    </div>

                    {/* Last Valid Bid Indicator */}
                    <div className="w-full mt-1.5 flex items-center justify-between text-[11px] px-1 text-zinc-400 font-mono">
                      <span>مزايدتك الحالية في الجولة:</span>
                      <span className="font-bold text-amber-300">
                        {myCurrentValidBid > 0 ? `${myCurrentValidBid}M €` : '0M €'}
                      </span>
                    </div>

                    {/* Error Banner */}
                    {bidError && (
                      <div className="w-full mt-1.5 bg-rose-950/90 border border-rose-500/70 p-2 rounded-xl text-rose-300 text-xs flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{bidError}</span>
                      </div>
                    )}

                    {/* ADVANCED CUSTOM BID AMOUNT SYSTEM */}
                    <div className="w-full mt-3 space-y-2.5">
                      {/* Step & Manual Input Panel */}
                      <div className="bg-black/30  border border-white/10 rounded-2xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold px-1">
                          <span className="flex items-center gap-1">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                            <span>حدد قيمة المزايدة القادمة:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsDecimalStep(!isDecimalStep)}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                              isDecimalStep
                                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-black'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                            }`}
                            title="تبديل دقة الزيادة والنقصان"
                          >
                            دقة الخطوة: {isDecimalStep ? '0.1M (عشري)' : '1M (قياسي)'}
                          </button>
                        </div>

                        {/* Minus / Input / Plus Stepper */}
                        <div className="flex items-center gap-2">
                          {/* MINUS BUTTON */}
                          <button
                            id="bid_minus_btn"
                            type="button"
                            disabled={sessionState.state !== 'BIDDING' || selectedBidAmount <= nextMinBid}
                            onClick={handleStepDecrease}
                            className="w-12 h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 hover:text-rose-300 font-black text-xl flex items-center justify-center border border-zinc-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                            title={`إنقاص ${isDecimalStep ? '0.1M' : '1M'}`}
                          >
                            <Minus className="w-5 h-5" />
                          </button>

                          {/* DIRECT MANUAL INPUT */}
                          <div className="relative flex-1">
                            <input
                              id="bid_custom_input"
                              type="text"
                              inputMode="decimal"
                              value={manualInputStr}
                              onChange={handleManualChange}
                              onBlur={handleManualBlur}
                              disabled={sessionState.state !== 'BIDDING'}
                              placeholder={`${nextMinBid}`}
                              className="w-full h-12 bg-black/25 border-2 border-amber-500/60 focus:border-amber-400 rounded-xl px-3 pl-12 text-center text-xl font-mono font-black text-amber-300 outline-none shadow-inner transition-all disabled:opacity-50"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400 pointer-events-none">
                              M €
                            </span>
                          </div>

                          {/* PLUS BUTTON */}
                          <button
                            id="bid_plus_btn"
                            type="button"
                            disabled={sessionState.state !== 'BIDDING' || selectedBidAmount >= myBudget}
                            onClick={handleStepIncrease}
                            className="w-12 h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 hover:text-emerald-300 font-black text-xl flex items-center justify-center border border-zinc-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                            title={`زيادة ${isDecimalStep ? '0.1M' : '1M'}`}
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Presets & Quick Shortcuts */}
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                          <button
                            type="button"
                            disabled={sessionState.state !== 'BIDDING' || selectedBidAmount + 1 > myBudget}
                            onClick={() => handleQuickAdd(1)}
                            className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[11px] border border-zinc-700/60 active:scale-95 disabled:opacity-30 transition-all"
                          >
                            +1M
                          </button>
                          <button
                            type="button"
                            disabled={sessionState.state !== 'BIDDING' || selectedBidAmount + 2 > myBudget}
                            onClick={() => handleQuickAdd(2)}
                            className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[11px] border border-zinc-700/60 active:scale-95 disabled:opacity-30 transition-all"
                          >
                            +2M
                          </button>
                          <button
                            type="button"
                            disabled={sessionState.state !== 'BIDDING' || selectedBidAmount + 5 > myBudget}
                            onClick={() => handleQuickAdd(5)}
                            className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-[11px] border border-zinc-700/60 active:scale-95 disabled:opacity-30 transition-all"
                          >
                            +5M
                          </button>
                          <button
                            type="button"
                            disabled={sessionState.state !== 'BIDDING' || selectedBidAmount + 10 > myBudget}
                            onClick={() => handleQuickAdd(10)}
                            className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-[11px] border border-zinc-700/60 active:scale-95 disabled:opacity-30 transition-all"
                          >
                            +10M
                          </button>
                          <button
                            type="button"
                            disabled={sessionState.state !== 'BIDDING' || myBudget < nextMinBid}
                            onClick={handleSetMaxBudget}
                            className="py-1.5 rounded-lg bg-gradient-to-r from-amber-600/30 to-yellow-600/30 hover:from-amber-600/50 hover:to-yellow-600/50 text-amber-200 font-black text-[10px] border border-amber-500/40 active:scale-95 disabled:opacity-30 transition-all"
                          >
                            الكل (MAX)
                          </button>
                        </div>
                      </div>

                      {/* Primary Dynamic Confirm/Place Bid Button */}
                      <button
                        id="bid_submit_btn"
                        disabled={
                          sessionState.state !== 'BIDDING' ||
                          selectedBidAmount < nextMinBid ||
                          selectedBidAmount > myBudget
                        }
                        onClick={() => handleRequestBid(selectedBidAmount)}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 border border-amber-300"
                      >
                        <Gavel className="w-4 h-4 text-zinc-950" />
                        <span>زايد دلوقتي بمبلغ {formatMoneyDisplay(selectedBidAmount)} €</span>
                      </button>

                      {/* Strategic SKIP Button */}
                      <button
                        id="skip_player_btn"
                        disabled={sessionState.state !== 'BIDDING' || sessionState.currentTurnUserId !== user.id}
                        onClick={() => {
                          if (sessionState.currentTurnUserId !== user.id) return;
                          audioManager.playCoin();
                          engine.skipPlayer(user.id);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-950/60 via-zinc-900 to-rose-950/60 border border-rose-500/50 hover:border-rose-400 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-900/30 transition-all"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-400" />
                        <span>تخلي عن اللاعب</span>
                      </button>
                    </div>
                  </>
                )}
            </div>

          </div>

          {/* OPPONENT REAL FOOTBALL PITCH */}
          <div
            className={`lg:col-span-4 space-y-2 order-3 ${
              activePitchView === 'YOU' ? 'hidden sm:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-1.5">
              <div className="min-w-0">
                <div className="text-[10px] font-black text-blue-300 uppercase tracking-wider">الخصم</div>
                <div className="flex items-center gap-1.5 min-w-0"><PlayerAvatarBadge avatar={opponentParticipant.userAvatar} size="sm" ring={false} equipped={opponent?.equippedCosmetics} /><PlayerCosmeticName name={opponentParticipant.userName} equipped={opponent?.equippedCosmetics} size="sm" /></div>
              </div>
              <div className="shrink-0 rounded-2xl border border-blue-400/50 bg-blue-950/70 px-3 py-2 text-center shadow-[0_0_18px_rgba(59,130,246,.18)]">
                <div className="text-[9px] text-blue-300 font-black">ميزانية الخصم</div>
                <div className="text-base font-black text-white font-mono">{formatMoneyDisplay(opponentParticipant.budget)}M €</div>
              </div>
            </div>
            <FootballPitch
              mode={(sessionState?.settings?.squadSize ?? settings.squadSize) === 5 ? 'CLASSIC' : 'PRO'}
              squad={opponentParticipant.squad}
              teamName={opponentParticipant.userName}
              teamAvatar={opponentParticipant.userAvatar}
              isUser={false}
              equipped={opponent?.equippedCosmetics}
              budgetRemaining={opponentParticipant.budget}
              activeTargetPosition={sessionState.currentPositionCategory}
              showOwnership={false}
            />

            {/* Quick Opponent Stats */}
            <div className="bg-black/30  border border-white/10 rounded-2xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">إجمالي صرف الخصم:</span>
                <span className="font-mono font-bold text-blue-400">{opponentParticipant.totalSpent}M €</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                اكتمال التشكيلة: {opponentParticipant.squad.length} / {sessionState.totalRounds}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ActiveGameShell>
  );
};
