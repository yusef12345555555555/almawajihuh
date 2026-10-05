// ============================================================
// العبها صح | EL3BHA SA7 - Game 2: THE HIDDEN PLAYER (اللاعب الخفي)
// Complete Turn-Based Tactical Squad Building + Referee Mode + AI Evaluation
// ============================================================

import { CoachPrepGate } from "./CoachPrepGate";
import { HiddenLaserFX } from "./HiddenLaserFX";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FootballPlayer,
  Coach,
  PlayerPosition,
  PlayerSnapshot,
} from "../types";
import { getCoachesSync, refreshCoachesInBackground } from "../services/coachRepository";
import { getCombinedPlayersSync, refreshPlayersInBackground } from "../services/playerRepository";
import { audioManager } from "../services/audioManager";
import { StorageService } from "../services/storageService";
import { seededShuffle, subSeed } from "../services/seededRandom";
import { PlayerCard } from "./PlayerCard";
import { FootballPitch } from "./FootballPitch";
import { MatchSimulationView } from "./MatchSimulationView";
import { FriendRoomModal } from "./FriendRoomModal";
import { LiveChannel } from "../services/liveChannel";
import { ActiveGameShell } from "./ActiveGameShell";
import { RefereeSetupModal } from "./RefereeSetupModal";
import { WithdrawResultScreen } from "./WithdrawResultScreen";
import {
  EyeOff,
  Eye,
  Crown,
  Swords,
  Users,
  CheckCircle2,
  HelpCircle,
  Trophy,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Bot,
  Zap,
  RotateCcw,
  Star,
  Flame,
  Shirt,
  Coins,
  Dice5,
  Lock,
  Vote,
  Check,
  Smartphone,
  Award,
  AlertTriangle,
  Play,
  Loader2,
} from "lucide-react";
import confetti from "canvas-confetti";

export type Game2Mode =
  | "PVP_1V1_AI"
  | "PVP_1V1_LOCAL"
  | "REFEREE_MODE"
  | "JUDGE_ONLINE"
  | "PVP_1V1"
  | "YOU_ARE_JUDGE";
export type SquadFormat = 5 | 11;

interface PositionTarget {
  round: number;
  category: "GK" | "DEF" | "MID" | "ATT";
  labelAr: string;
  posCode: PlayerPosition;
}

const POSITIONS_5: PositionTarget[] = [
  { round: 1, category: "GK", labelAr: "حارس", posCode: "GK" },
  { round: 2, category: "DEF", labelAr: "قلب دفاع", posCode: "CB" },
  { round: 3, category: "MID", labelAr: "وسط", posCode: "CM" },
  { round: 4, category: "MID", labelAr: "وسط", posCode: "CAM" },
  { round: 5, category: "ATT", labelAr: "مهاجم", posCode: "ST" },
];

const POSITIONS_11: PositionTarget[] = [
  { round: 1, category: "GK", labelAr: "حارس", posCode: "GK" },
  { round: 2, category: "DEF", labelAr: "ظهير يمين", posCode: "RB" },
  { round: 3, category: "DEF", labelAr: "قلب دفاع", posCode: "CB" },
  { round: 4, category: "DEF", labelAr: "قلب دفاع", posCode: "CB" },
  { round: 5, category: "DEF", labelAr: "ظهير شمال", posCode: "LB" },
  { round: 6, category: "MID", labelAr: "ارتكاز", posCode: "CDM" },
  { round: 7, category: "MID", labelAr: "وسط", posCode: "CM" },
  { round: 8, category: "MID", labelAr: "وسط", posCode: "CAM" },
  { round: 9, category: "ATT", labelAr: "جناح يمين", posCode: "RW" },
  { round: 10, category: "ATT", labelAr: "مهاجم", posCode: "ST" },
  { round: 11, category: "ATT", labelAr: "جناح شمال", posCode: "LW" },
];

export interface PlayerDecisionRecord {
  playerNumber: 1 | 2;
  round: number;
  positionLabel: string;
  choice: "KNOWN" | "HIDDEN";
  receivedPlayer: FootballPlayer;
  knownPlayerOffer: FootballPlayer;
  hiddenPlayerOffer: FootballPlayer;
}

export interface DraftRoundRecord {
  round: number;
  categoryLabel: string;
  p1Decision: PlayerDecisionRecord;
  p2Decision: PlayerDecisionRecord;
  startingPlayer: 1 | 2;
}

interface TakePlayerOrHiddenGameViewProps {
  /** result carries the real match outcome; a plain header "back" (quit mid-game) passes none = forfeit. */
  onBack: (result?: "WIN" | "LOSE" | "DRAW") => void;
  /** Shared seed so both real players see the SAME player pairs
   *  and the SAME coaches. */
  sharedSeed?: number;
  /** الخصم الحقيقي القادم من الدعوة/الانتقام (null = AI) */
  opponentPlayer?: PlayerSnapshot | null;
  /** Used by tournament matches: the format/mode were already agreed on when
   *  the tournament was created, so skip the manual setup screen entirely and
   *  launch straight into the coin toss with these values. */
  forcedFormat?: SquadFormat;
  forcedMode?: Game2Mode;
  /** مدة الجولة المتفق عليها في شاشة التجهيز (ثواني) */
  forcedDuration?: number;
}

const hashSid = (sid: string): number => {
  let h = 2166136261;
  for (let i = 0; i < sid.length; i++) {
    h ^= sid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const TakePlayerOrHiddenGameView: React.FC<
  TakePlayerOrHiddenGameViewProps
> = ({ onBack, sharedSeed, forcedFormat, forcedMode, forcedDuration, opponentPlayer }) => {
  const [realOpponent, setRealOpponent] = useState<PlayerSnapshot | null>(opponentPlayer || null);
  const isLive = !!realOpponent;
  const iAmGuest = isLive && ((StorageService.getUserProfile().id || "") > (realOpponent?.id || ""));
  const baseSeedRef = useRef<number>(sharedSeed ?? Math.floor(Math.random() * 0xffffffff));
  // ---- اللعب اللحظي ضد لاعب حقيقي ----
  const liveChRef = useRef<LiveChannel | null>(null);
  const liveSidRef = useRef<string | null>(null);
  const liveLastPeer = useRef<number>(Date.now());
  const incomingChoices = useRef<Map<number, "KNOWN" | "HIDDEN">>(new Map());
  const confirmRef = useRef<(c: "KNOWN" | "HIDDEN") => void>(() => {});
  const handshakeResolve = useRef<null | ((v: { sid: string; starter: 1 | 2 }) => void)>(null);
  const hostStarterRef = useRef<1 | 2>(1);
  const liveHelloAt = useRef<number>(0);
  const hostHandshaking = useRef<boolean>(false);
  const iAmGuestRef = useRef(false);
  const pingTimerRef = useRef<number | null>(null);
  const [liveTick, setLiveTick] = useState(0);
  const [oppWithdrew, setOppWithdrew] = useState(false);
  iAmGuestRef.current = iAmGuest;
  const currentUser = useMemo(() => StorageService.getUserProfile(), []);

  // Mode & Format setup
  const [selectedFormat, setSelectedFormat] = useState<SquadFormat | null>(
    null,
  );
  const [withdrew, setWithdrew] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<Game2Mode | null>(null);
  const [decisionDuration, setDecisionDuration] = useState<
    5 | 10 | 15 | 20 | 25 | 30 | 35
  >((([5, 10, 15, 20, 25, 30, 35] as number[]).includes(forcedDuration ?? 15) ? (forcedDuration ?? 15) : 15) as 5 | 10 | 15 | 20 | 25 | 30 | 35);
  const [timeLeft, setTimeLeft] = useState(forcedDuration ?? 15);
  const [showFriendInvite, setShowFriendInvite] = useState(false);
  const [showRefereeSetup, setShowRefereeSetup] = useState(false);
  const [refereePlayers, setRefereePlayers] = useState<
    [PlayerSnapshot, PlayerSnapshot] | null
  >(null);

  // Match Session ID for +10 universal points
  const [matchSessionId, setMatchSessionId] = useState<string>(
    () => `tph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  );
  const [rewardAwarded, setRewardAwarded] = useState<boolean>(false);

  // Overall game state
  const [gameState, setGameState] = useState<
    | "SETUP"
    | "COIN_TOSS"
    | "ROUND_DECISION"
    | "ROUND_REVEAL"
    | "REFEREE_HUB"
    | "COACH_REVEAL"
    | "FORMATION_PREVIEW"
    | "MATCH_SIMULATION"
  >("SETUP");

  // Coin Toss result (who starts Round 1)
  const [starterRound1, setStarterRound1] = useState<1 | 2>(1);
  const [coinSpinning, setCoinSpinning] = useState<boolean>(false);

  // Round tracking
  const [round, setRound] = useState<number>(1);
  // Who is the active decider inside the current round
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  // Which player gets the single decision for this round. It alternates so both
  // sides get equal turns, but there is NEVER a second decision in the same round.
  const [roundStartingPlayer, setRoundStartingPlayer] = useState<1 | 2>(1);
  // Turn phase in current round: 'FIRST_PLAYER_TURN' | 'SECOND_PLAYER_TURN' | 'ROUND_FINISHED'
  const [roundTurnPhase, setRoundTurnPhase] = useState<
    "FIRST_PLAYER_TURN" | "SECOND_PLAYER_TURN" | "ROUND_FINISHED"
  >("FIRST_PLAYER_TURN");

  // Referee Mode state: is the screen currently showing the Referee dashboard or handed to a player?
  const [refereeScreenMode, setRefereeScreenMode] = useState<
    "REFEREE_VIEW" | "PLAYER_VIEW"
  >("REFEREE_VIEW");

  // Currently generated card pair for the active player's turn
  const [knownPlayer, setKnownPlayer] = useState<FootballPlayer>(
    () => getCombinedPlayersSync()[0] as FootballPlayer,
  );
  const [hiddenPlayer, setHiddenPlayer] = useState<FootballPlayer>(
    () => getCombinedPlayersSync()[1] as FootballPlayer,
  );

  // Player choice state for current turn (Immediate confirmation - No modal)
  const [lastRoundDecisions, setLastRoundDecisions] = useState<{
    p1Name: string;
    p1Destination: string;
    p1Player: FootballPlayer;
    p2Name: string;
    p2Destination: string;
    p2Player: FootballPlayer;
  } | null>(null);
  const [isDecisionLocked, setIsDecisionLocked] = useState<boolean>(false);
  const [justRevealedPlayer, setJustRevealedPlayer] =
    useState<FootballPlayer | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Squads and history
  const [player1Squad, setPlayer1Squad] = useState<FootballPlayer[]>([]);
  const [player2Squad, setPlayer2Squad] = useState<FootballPlayer[]>([]);
  const [p1History, setP1History] = useState<PlayerDecisionRecord[]>([]);
  const [p2History, setP2History] = useState<PlayerDecisionRecord[]>([]);
  const [completedRounds, setCompletedRounds] = useState<DraftRoundRecord[]>(
    [],
  );

  // Assigned coaches for final stadium simulation
  const [p1Coach, setP1Coach] = useState<Coach | null>(null);
  const [p2Coach, setP2Coach] = useState<Coach | null>(null);

  // Final evaluation tab in final screen

  const positionSchedule = useMemo(() => {
    return selectedFormat === 11 ? POSITIONS_11 : POSITIONS_5;
  }, [selectedFormat]);

  const isRefereeMode =
    selectedMode === "REFEREE_MODE" || selectedMode === "YOU_ARE_JUDGE";
  const activePlayerTitle = activePlayer === 1 ? "اللاعب 1" : "اللاعب 2";
  const isMyTurn = activePlayer === 1;
  const isOpponentTurn = activePlayer === 2;

  const roundsPerPlayer = selectedFormat === 11 ? 11 : 5;
  // كل جولة = اختيار لاعب واحد فقط. إجمالي الجولات = مركزين لكل لاعب بالتبادل.
  // كل جولة = اختيار واحد فقط. اللاعب الآخر يأخذ اللاعب المقابل تلقائيًا.
  // الخماسي: 5 جولات + المدرب في الجولة السادسة. الكامل: 11 + المدرب في الجولة 12.
  const maxRounds = roundsPerPlayer;
  const positionRound = round;
  const currentPosTarget =
    positionSchedule[positionRound - 1] || positionSchedule[0];

  // Helper to pick two distinct players for a specific position category
  const generatePairForPosition = (
    posTarget: PositionTarget,
    usedIds: Set<string>,
    pairSeedTag: string = "pair",
  ): { known: FootballPlayer; hidden: FootballPlayer } => {
    const isCategory = (p: FootballPlayer) => {
      if (posTarget.category === "GK") return p.position === "GK";
      if (posTarget.category === "DEF")
        return ["CB", "LB", "RB"].includes(p.position);
      if (posTarget.category === "MID")
        return ["CM", "CAM", "CDM", "LM", "RM"].includes(p.position);
      if (posTarget.category === "ATT")
        return ["ST", "RW", "LW", "CF"].includes(p.position);
      return false;
    };

    const pool = getCombinedPlayersSync();
    // الأولوية للمركز المحدد بالظبط، ثم نفس الخط كحل احتياطي فقط لو البيانات ناقصة.
    let available = pool.filter(
      (p) => !usedIds.has(p.id) && p.position === posTarget.posCode,
    );
    if (available.length < 2)
      available = pool.filter((p) => !usedIds.has(p.id) && isCategory(p));
    if (available.length < 2) {
      const allCategory = pool.filter((p) => isCategory(p));
      available = [...available, ...allCategory];
    }

    // Seeded so both players are offered the identical pair.
    const shuffled = seededShuffle(available, subSeed(baseSeedRef.current, pairSeedTag));
    const known = shuffled[0] || pool.find(isCategory) || pool[0];
    const hidden =
      shuffled.find((p) => p.id !== known.id) || shuffled[1] || known;

    return { known, hidden };
  };

  // Start game setup
  const handleSelectFormatAndMode = (
    format: SquadFormat,
    mode: Game2Mode,
    refereePlayersOverride?: [PlayerSnapshot, PlayerSnapshot],
  ) => {
    audioManager.playClick();
    setSelectedFormat(format);
    setSelectedMode(mode);
    setRound(1);
    setPlayer1Squad([]);
    setPlayer2Squad([]);
    setP1History([]);
    setP2History([]);
    setCompletedRounds([]);
    setP1Coach(null);
    setP2Coach(null);
    setRewardAwarded(false);
    if (mode !== "REFEREE_MODE" && mode !== "YOU_ARE_JUDGE")
      setRefereePlayers(null);
    setMatchSessionId(
      `tph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    );

    if (mode === "REFEREE_MODE" || mode === "YOU_ARE_JUDGE") {
      // الحكم يختار اللاعبين أولًا من قائمة الأصدقاء أو بالاسم/اللقب/ID.
      const selectedReferees = refereePlayersOverride ?? refereePlayers;
      if (!selectedReferees) {
        setShowRefereeSetup(true);
        return;
      }
      if (refereePlayersOverride) setRefereePlayers(refereePlayersOverride);
      setStarterRound1(1);
      setRoundStartingPlayer(1);
      setActivePlayer(1);
      setRoundTurnPhase("FIRST_PLAYER_TURN");
      setRefereeScreenMode("REFEREE_VIEW");
      prepareCardsForTurn(1, 1, 1, new Set(), format);
      setGameState("ROUND_DECISION");
    } else {
      // In 1vs1 mode (AI or Local), launch fair Coin Toss to decide starter of Round 1
      setGameState("COIN_TOSS");
      setCoinSpinning(true);
      if (isLive && realOpponent) {
        incomingChoices.current.clear();
        void startLiveHandshake().then((hs) => {
          if (!hs) {
            setOppWithdrew(true); // الخصم ماتصلش
            return;
          }
          setTimeout(() => {
            setStarterRound1(hs.starter);
            setRoundStartingPlayer(hs.starter);
            setActivePlayer(hs.starter);
            setCoinSpinning(false);
            audioManager.playWhistle();
          }, 900);
        });
      } else {
        const chosenStarter: 1 | 2 = Math.random() < 0.5 ? 1 : 2;
        setTimeout(() => {
          setStarterRound1(chosenStarter);
          setRoundStartingPlayer(chosenStarter);
          setActivePlayer(chosenStarter);
          setCoinSpinning(false);
          audioManager.playWhistle();
        }, 1400);
      }
    }
  };

  // مصافحة اللعب اللحظي: المضيف يحدد جلسة جديدة + من يبدأ، والضيف ينتظر ويطبّقهم.
  const startLiveHandshake = async (): Promise<{ sid: string; starter: 1 | 2 } | null> => {
    const me = StorageService.getUserProfile();
    if (!realOpponent) return null;
    if (!liveChRef.current) {
      const ch = new LiveChannel(LiveChannel.pairTopic(me.id, realOpponent.id));
      liveChRef.current = ch;
      const ok = await ch.join();
      if (!ok) return null;
      ch.on("ping", () => (liveLastPeer.current = Date.now()));
      ch.on("bye", () => (liveLastPeer.current = 0));
      ch.on("forfeit", (m) => {
        if (m.sid === liveSidRef.current) setOppWithdrew(true);
      });
      ch.on("choice", (m) => {
        if (m.sid !== liveSidRef.current) return;
        liveLastPeer.current = Date.now();
        incomingChoices.current.set(m.round, m.choice);
        setLiveTick((t) => t + 1);
      });
      ch.on("hello", () => {
        liveLastPeer.current = Date.now();
        liveHelloAt.current = Date.now();
        if (!iAmGuestRef.current && hostHandshaking.current && liveSidRef.current) {
          ch.send("init", { sid: liveSidRef.current, hostStarter: hostStarterRef.current });
        }
      });
      ch.on("init", (m) => {
        liveLastPeer.current = Date.now();
        if (iAmGuestRef.current && handshakeResolve.current) {
          const r = handshakeResolve.current;
          handshakeResolve.current = null;
          r({ sid: m.sid, starter: m.hostStarter === 1 ? 2 : 1 });
        }
      });
      const pinger = window.setInterval(() => ch.send("ping", { from: me.id }), 3000);
      pingTimerRef.current = pinger;
    }
    const ch = liveChRef.current!;
    liveLastPeer.current = Date.now();
    if (!iAmGuest) {
      const sid = `h_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
      const hostStarter: 1 | 2 = Math.random() < 0.5 ? 1 : 2;
      liveSidRef.current = sid;
      hostStarterRef.current = hostStarter;
      baseSeedRef.current = ((sharedSeed ?? 0) ^ hashSid(sid)) >>> 0;
      hostHandshaking.current = true;
      // انتظر "hello" من الضيف (يعني دخل نفس اللعبة فعلاً) — بحد أقصى 30 ثانية
      return new Promise((resolve) => {
        const t0 = Date.now();
        const iv = window.setInterval(() => {
          if (liveHelloAt.current > t0 - 3000) {
            clearInterval(iv);
            ch.send("init", { sid, hostStarter });
            hostHandshaking.current = false;
            resolve({ sid, starter: hostStarter });
          } else if (Date.now() - t0 > 30000) {
            clearInterval(iv);
            hostHandshaking.current = false;
            resolve(null);
          }
        }, 300);
      });
    }
    return new Promise((resolve) => {
      const t = window.setTimeout(() => {
        handshakeResolve.current = null;
        resolve(null);
      }, 30000);
      handshakeResolve.current = (v) => {
        clearTimeout(t);
        liveSidRef.current = v.sid;
        baseSeedRef.current = ((sharedSeed ?? 0) ^ hashSid(v.sid)) >>> 0;
        resolve(v);
      };
      ch.send("hello", { from: me.id });
      const hv = window.setInterval(() => {
        if (!handshakeResolve.current) clearInterval(hv);
        else ch.send("hello", { from: me.id });
      }, 1000);
    });
  };

  useEffect(() => {
    refreshPlayersInBackground();
    refreshCoachesInBackground();
  }, []);

  const autoLaunchedRef = useRef(false);
  useEffect(() => {
    if (autoLaunchedRef.current) return;
    if (forcedFormat && forcedMode && gameState === "SETUP") {
      autoLaunchedRef.current = true;
      handleSelectFormatAndMode(forcedFormat, forcedMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedFormat, forcedMode, gameState]);

  // Helper to prepare fresh cards for the current turn
  const prepareCardsForTurn = (
    roundNum: number,
    startPlayer: 1 | 2,
    currPlayer: 1 | 2,
    existingUsedIds: Set<string>,
    formatOverride?: SquadFormat,
  ) => {
    const format = formatOverride ?? selectedFormat;
    const schedule = format === 11 ? POSITIONS_11 : POSITIONS_5;
    // Each round maps to exactly one schedule slot. Never divide the round by 2:
    // that would repeat positions (e.g. rounds 1+2 both becoming GK/slot 1).
    const pos =
      schedule[roundNum - 1] || schedule[schedule.length - 1] || schedule[0];
    const { known, hidden } = generatePairForPosition(
      pos,
      existingUsedIds,
      `pair:${roundNum}:${isLive ? ((currPlayer === 1) !== iAmGuest ? "H" : "G") : currPlayer}`,
    );
    setKnownPlayer(known);
    setHiddenPlayer(hidden);
    setIsDecisionLocked(false);
    setJustRevealedPlayer(null);
  };

  // Start round 1 after coin toss
  const handleStartFromCoinToss = () => {
    audioManager.playClick();
    prepareCardsForTurn(1, starterRound1, starterRound1, new Set());
    setRoundTurnPhase("FIRST_PLAYER_TURN");
    setGameState("ROUND_DECISION");
  };

  // Player chooses KNOWN or HIDDEN - Immediate confirmation with zero modal
  // الليزر على كارت اللاعب الخفي فقط — بيظهر عند الطرفين وفي جولتي وجولة الخصم (بيتشغّل من handleConfirmDecision)
  const [laserOn, setLaserOn] = useState(false);
  const handleSelectChoice = (choice: "KNOWN" | "HIDDEN") => {
    if (isDecisionLocked) return;
    handleConfirmDecision(choice);
  };

  // Player confirms decision (IMMEDIATE & FINAL - NO UNDO)
  const handleConfirmDecision = (choice: "KNOWN" | "HIDDEN") => {
    if (isDecisionLocked) return;
    setIsDecisionLocked(true);
    // لعب لحظي: قراري يوصل للخصم فوراً (لو الدور دوري أنا)
    if (isLive && activePlayer === 1) {
      liveChRef.current?.send("choice", { sid: liveSidRef.current, round, choice });
    }

    audioManager.playWhistle();

    // قاعده اللعبة: اللاعب النشط يختار لاعبًا واحدًا، واللاعب الآخر
    // ينتقل تلقائيًا إلى تشكيل الخصم في نفس المركز ونفس الجولة.
    const received = choice === "KNOWN" ? knownPlayer : hiddenPlayer;
    const opponentReceived = choice === "KNOWN" ? hiddenPlayer : knownPlayer;
    setJustRevealedPlayer(received);

    const activeName = activePlayer === 1 ? "اللاعب 1" : "اللاعب 2";
    const opponentName = activePlayer === 1 ? "اللاعب 2" : "اللاعب 1";
    const myDest =
      choice === "KNOWN"
        ? "اللاعب المعروف (Known Player)"
        : "اللاعب الخفي (Hidden Player)";
    const oppDest =
      choice === "KNOWN"
        ? "اللاعب الخفي (Hidden Player)"
        : "اللاعب المعروف (Known Player)";

    setLastRoundDecisions({
      p1Name: activePlayer === 1 ? activeName : opponentName,
      p1Destination: activePlayer === 1 ? myDest : oppDest,
      p1Player: activePlayer === 1 ? received : opponentReceived,
      p2Name: activePlayer === 2 ? activeName : opponentName,
      p2Destination: activePlayer === 2 ? myDest : oppDest,
      p2Player: activePlayer === 2 ? received : opponentReceived,
    });

    const record: PlayerDecisionRecord = {
      playerNumber: activePlayer,
      round,
      positionLabel: currentPosTarget.labelAr,
      choice,
      receivedPlayer: received,
      knownPlayerOffer: knownPlayer,
      hiddenPlayerOffer: hiddenPlayer,
    };

    let nextP1Squad = player1Squad;
    let nextP2Squad = player2Squad;
    if (activePlayer === 1) {
      nextP1Squad = [...player1Squad, received];
      nextP2Squad = [...player2Squad, opponentReceived];
      setPlayer1Squad(nextP1Squad);
      setPlayer2Squad(nextP2Squad);
      setP1History((prev) => [...prev, record]);
    } else {
      nextP2Squad = [...player2Squad, received];
      nextP1Squad = [...player1Squad, opponentReceived];
      setPlayer2Squad(nextP2Squad);
      setPlayer1Squad(nextP1Squad);
      setP2History((prev) => [...prev, record]);
    }

    const goReveal = () => {
      setGameState("ROUND_REVEAL");
      audioManager.playReveal();
      if (received.overallRating >= 90 || opponentReceived.overallRating >= 90) {
        try {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }
    };
    // الليزر بيضرب كارت اللاعب الخفي في كل قرار (سواء اخترت الخفي أو المعروف، ومن عندي أو من الخصم)،
    // وبيظهر عند الطرفين، وبعدها الكشف.
    setLaserOn(true);
    window.setTimeout(() => {
      setLaserOn(false);
      goReveal();
    }, 1500);
  };

  confirmRef.current = handleConfirmDecision;

  // مؤقت القرار: لو الوقت خلص، الاختيار المعروف يتاخد تلقائيًا للاعب صاحب الدور.
  useEffect(() => {
    if (gameState !== "ROUND_DECISION" || isDecisionLocked) return;
    const started = Date.now();
    setTimeLeft(decisionDuration);
    // دور الخصم الحقيقي: نسيب مهلة 4 ثواني زيادة لوصول قراره قبل ما نطبّق الاختيار الافتراضي
    const grace = isLive && activePlayer === 2 ? 4 : 0;
    const iv = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left = Math.max(0, decisionDuration - elapsed);
      setTimeLeft(left);
      if (elapsed >= decisionDuration + grace) {
        window.clearInterval(iv);
        if (!isDecisionLocked) handleConfirmDecision("KNOWN");
      }
    }, 250);
    return () => window.clearInterval(iv);
  }, [gameState, round, activePlayer, decisionDuration, isDecisionLocked]);

  // تطبيق قرار الخصم الحقيقي لما يوصل (أو لو وصل بدري واستنّى الدور)
  useEffect(() => {
    if (!isLive || gameState !== "ROUND_DECISION" || activePlayer !== 2 || isDecisionLocked) return;
    const c = incomingChoices.current.get(round);
    if (c) {
      incomingChoices.current.delete(round);
      confirmRef.current(c);
    }
  }, [isLive, gameState, activePlayer, round, isDecisionLocked, liveTick]);

  // خروج الخصم / انقطاعه أثناء اللعب = فوزك
  useEffect(() => {
    if (!isLive) return;
    const t = window.setInterval(() => {
      const active = ["COIN_TOSS", "ROUND_DECISION", "ROUND_REVEAL"].includes(gameState);
      if (active && liveSidRef.current && Date.now() - liveLastPeer.current > 20000) setOppWithdrew(true);
    }, 3000);
    return () => clearInterval(t);
  }, [isLive, gameState]);

  // تنظيف القناة عند الخروج
  useEffect(() => {
    return () => {
      try {
        liveChRef.current?.send("bye", { sid: liveSidRef.current });
      } catch {
        /* ignore */
      }
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      const ch = liveChRef.current;
      setTimeout(() => ch?.leave(), 400);
    };
  }, []);

  // AI Automatic Strategic Turn Handler
  useEffect(() => {
    const isAiMode =
      selectedMode === "PVP_1V1_AI" || selectedMode === "PVP_1V1";
    if (!isAiMode || isLive) return;
    if (gameState !== "ROUND_DECISION") return;
    if (activePlayer !== 2) return;

    setIsAiThinking(true);
    const thinkDelay = 1400 + Math.random() * 800;

    const timer = setTimeout(() => {
      // Strategic AI Evaluation:
      // Evaluates known player quality vs estimated pool average (~83),
      // current round importance, squad rating comparison, and risk appetite.
      const rating = knownPlayer.overallRating;
      const myTotal = player2Squad.reduce((s, p) => s + p.overallRating, 0);
      const oppTotal = player1Squad.reduce((s, p) => s + p.overallRating, 0);
      const trailing = oppTotal > myTotal;
      const expectedHidden = 83.5;

      let chooseKnown = false;
      if (rating >= 88) {
        // World-class known player: almost always lock unless desperate
        chooseKnown = trailing && rating < 89 ? Math.random() < 0.85 : true;
      } else if (rating >= 84) {
        // Strong player above average: take known 75% of the time, gamble 25% if trailing
        chooseKnown = trailing ? Math.random() < 0.6 : Math.random() < 0.85;
      } else if (rating >= 80) {
        // Average player: if trailing behind opponent, take the risk on hidden
        chooseKnown = trailing ? Math.random() < 0.35 : Math.random() < 0.55;
      } else {
        // Sub-80 player: known is weak, strongly prefer mystery gamble
        chooseKnown = Math.random() < 0.15;
      }

      setIsAiThinking(false);
      handleConfirmDecision(chooseKnown ? "KNOWN" : "HIDDEN");
    }, thinkDelay);

    return () => clearTimeout(timer);
  }, [
    gameState,
    activePlayer,
    knownPlayer,
    selectedMode,
    round,
    player1Squad,
    player2Squad,
  ]);

  // بعد كل اختيار: اللاعب التالي فقط. مفيش اختيارين لنفس اللاعب في نفس الجولة.
  const handleProceedAfterReveal = () => {
    audioManager.playClick();

    if (round >= maxRounds) {
      handleFinishAllRounds();
      return;
    }

    const nextRoundNum = round + 1;
    const nextPlayer: 1 | 2 = activePlayer === 1 ? 2 : 1;

    setRound(nextRoundNum);
    setActivePlayer(nextPlayer);
    setRoundStartingPlayer(nextPlayer);
    setRoundTurnPhase("FIRST_PLAYER_TURN");

    // ممنوع لاعب يتكرر: كل جولة بتقفل اللاعب المعروف والخفي معًا،
    // لأن واحد بيروح لك والتاني للخصم.
    const usedIds = new Set<string>();
    [...p1History, ...p2History].forEach((h) => {
      usedIds.add(h.knownPlayerOffer.id);
      usedIds.add(h.hiddenPlayerOffer.id);
    });
    usedIds.add(knownPlayer.id);
    usedIds.add(hiddenPlayer.id);
    prepareCardsForTurn(nextRoundNum, nextPlayer, nextPlayer, usedIds);

    if (selectedMode === "REFEREE_MODE" || selectedMode === "YOU_ARE_JUDGE") {
      setRefereeScreenMode("REFEREE_VIEW");
    }
    setGameState("ROUND_DECISION");
  };

  // كشف اللاعب ثم انتقال تلقائي للدور التالي بعد لحظة قصيرة.
  useEffect(() => {
    if (gameState !== "ROUND_REVEAL" || !justRevealedPlayer) return;
    const timer = window.setTimeout(() => handleProceedAfterReveal(), 2000);
    return () => window.clearTimeout(timer);
  }, [gameState, justRevealedPlayer]);

  // All rounds complete -> Generate coaches and finalize AI Evaluation
  const handleFinishAllRounds = () => {
    audioManager.playGoal();
    const shuffledCoaches = seededShuffle(
      getCoachesSync(),
      subSeed(baseSeedRef.current, "coaches"),
    );
    const first = shuffledCoaches[0] || null;
    const second = shuffledCoaches[1] || shuffledCoaches[0] || null;
    // المدربين محسوبين من وجهة نظر المضيف؛ الضيف بيبدّلهم
    setP1Coach(iAmGuest ? second : first);
    setP2Coach(iAmGuest ? first : second);

    // Award universal 10 points
    if (!rewardAwarded) {
      StorageService.awardUniversal10Points(
        "take_player_or_hidden",
        matchSessionId,
      );
      setRewardAwarded(true);
    }

    try {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
    } catch {}

    setGameState("COACH_REVEAL");
  };

  const handleLaunchMatchSimulation = () => {
    audioManager.playWhistle();
    setGameState("MATCH_SIMULATION");
  };

  const handleRematch = () => {
    audioManager.playClick();
    if (selectedFormat && selectedMode) {
      handleSelectFormatAndMode(selectedFormat, selectedMode);
    } else {
      setSelectedFormat(null);
      setSelectedMode(null);
      setGameState("SETUP");
    }
  };

  // Withdrawal must actually terminate this game screen instead of only setting a flag.
  if (oppWithdrew && !withdrew) {
    return (
      <WithdrawResultScreen
        didWithdraw={false}
        myName={currentUser.nameAr || currentUser.username || "أنت"}
        myAvatar={currentUser.avatar || "av_default"}
        opponentName={realOpponent?.nameAr || realOpponent?.name || "الخصم"}
        opponentAvatar={realOpponent?.avatar || "av_bot"}
        onBack={() => onBack("WIN")}
      />
    );
  }
  if (withdrew) {
    const opponentName = realOpponent?.nameAr || realOpponent?.name || "فريق AI";
    return (
      <WithdrawResultScreen
        didWithdraw={true}
        myName={currentUser.nameAr || currentUser.username || "أنت"}
        myAvatar={currentUser.avatar || "av_default"}
        opponentName={opponentName}
        opponentAvatar={realOpponent?.avatar || "av_bot"}
        onBack={() => onBack("LOSE")}
      />
    );
  }

  // =========================================================================
  // VIEW 1: Format & Mode Selection Screen
  // =========================================================================
  if (
    (gameState === "SETUP" || !selectedFormat || !selectedMode) &&
    forcedFormat &&
    forcedMode
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="text-sm font-bold">جاري تجهيز المواجهة...</span>
      </div>
    );
  }

  if (gameState === "SETUP" || !selectedFormat || !selectedMode) {
    // شاشة شفافة فوق خلفية اللعبة: كل الاختيارات صغيرة وجنب بعض (حجم التشكيلة 2 • الأوضاع 4 • المدة صف واحد)
    const modeCards: { id: string; mode: Game2Mode | null; title: string; emoji: string }[] = [
      { id: "mode_1v1_ai", mode: "PVP_1V1_AI" as Game2Mode, title: "ضد AI", emoji: "🤖" },
      { id: "mode_online_friend", mode: null, title: "مع صحبك", emoji: "🤝" },
      { id: "mode_1v1_local", mode: "PVP_1V1_LOCAL" as Game2Mode, title: "التطبيق حكم", emoji: "📱" },
      { id: "mode_referee_3p", mode: "REFEREE_MODE" as Game2Mode, title: "حكم بشري", emoji: "🎙️" },
    ];
    const durations = [5, 10, 15, 20, 25, 30, 35] as const;
    const showDuration = selectedMode === "PVP_1V1_AI" || selectedMode === "PVP_1V1_LOCAL";
    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-[60] overflow-y-auto select-none"
        style={{
          backgroundImage: "linear-gradient(rgba(3,7,18,.15), rgba(3,7,18,.5)), url('/games/backgrounds/hidden-player-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="min-h-full w-full max-w-md mx-auto px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+14px)] flex flex-col gap-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onBack()}
              className="flex items-center gap-1.5 text-[11px] font-black text-white bg-black/45  border border-white/15 rounded-full px-3 py-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>رجوع</span>
            </button>
            <h1 className="text-base font-black text-white">تاخد اللاعب ده ولا الخفي؟</h1>
            <div className="w-14" />
          </div>

          <div className="flex-1" />

          <div>
            <div className="text-[11px] font-black text-amber-200 mb-1.5 text-center">حجم التشكيلة</div>
            <div className="grid grid-cols-2 gap-2">
              {([5, 11] as const).map((n) => (
                <button
                  key={n}
                  id={`format_${n}_btn`}
                  type="button"
                  onClick={() => setSelectedFormat(n)}
                  className={`rounded-2xl border-2 px-2 py-2 text-center backdrop-blur-[2px] transition-all ${
                    selectedFormat === n ? "border-amber-300 bg-amber-950/60" : "border-white/25 bg-black/35"
                  }`}
                >
                  <div className="text-sm font-black text-amber-300">{n === 5 ? "خماسي" : "11 كاملة"}</div>
                  <div className="text-[9px] text-zinc-200">{n === 5 ? "5 مراكز + مدرب" : "11 مركز + مدرب"}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedFormat && (
            <div>
              <div className="text-[11px] font-black text-amber-200 mb-1.5 text-center">نمط اللعب</div>
              <div className="grid grid-cols-4 gap-1.5">
                {modeCards.map((card) => {
                  const selected = !!card.mode && selectedMode === card.mode;
                  return (
                    <button
                      key={card.id}
                      id={card.id}
                      type="button"
                      onClick={() => {
                        audioManager.playClick();
                        if (card.id === "mode_online_friend") {
                          setShowFriendInvite(true);
                          return;
                        }
                        if (card.mode === "REFEREE_MODE") {
                          handleSelectFormatAndMode(selectedFormat, "REFEREE_MODE");
                          return;
                        }
                        if (card.mode) setSelectedMode(card.mode);
                      }}
                      className={`rounded-xl border-2 py-2 px-1 text-center backdrop-blur-[2px] transition-all ${
                        selected ? "border-amber-300 bg-amber-950/60 scale-[1.03]" : "border-white/25 bg-black/35"
                      }`}
                    >
                      <div className="text-xl leading-none">{card.emoji}</div>
                      <div className="mt-1 text-[10px] font-black text-white leading-tight">{card.title}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showDuration && (
            <div>
              <div className="text-[11px] font-black text-amber-200 mb-1.5 text-center">مدة الجولة (ثانية)</div>
              <div className="grid grid-cols-7 gap-1">
                {durations.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDecisionDuration(sec)}
                    className={`rounded-lg py-2 text-[11px] font-black border backdrop-blur-[2px] transition-all ${
                      decisionDuration === sec ? "bg-amber-400 text-zinc-950 border-amber-200" : "bg-black/40 text-white border-white/25"
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleSelectFormatAndMode(selectedFormat, selectedMode, undefined)}
                className="mt-3 w-full rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 py-3 text-base font-black text-zinc-950 shadow-[0_0_28px_rgba(245,158,11,.4)] active:scale-[.98] transition-transform"
              >
                يلا نلعب
              </button>
            </div>
          )}
        </div>

        {showFriendInvite && (
          <FriendRoomModal
            user={currentUser as any}
            mode={{ kind: "host", gameMode: "PLAYER_OR_HIDDEN", gameLabelAr: "تاخد اللاعب ده ولا اللاعب الخفي؟" }}
            onClose={() => setShowFriendInvite(false)}
            onStart={(opp, roomSettings) => {
              setRealOpponent(opp || null);
              setSelectedFormat(roomSettings.format);
              setShowFriendInvite(false);
              handleSelectFormatAndMode(roomSettings.format, "PVP_1V1");
            }}
          />
        )}
        {showRefereeSetup && (
          <RefereeSetupModal
            user={currentUser as any}
            onClose={() => setShowRefereeSetup(false)}
            onStart={(players) => {
              setRefereePlayers(players);
              setShowRefereeSetup(false);
              if (selectedFormat) handleSelectFormatAndMode(selectedFormat, "REFEREE_MODE", players);
            }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Coin Toss Opening (Determines starter for Round 1 in 1vs1)
  // =========================================================================
  if (gameState === "COIN_TOSS") {
    return (
      <ActiveGameShell
        user={currentUser as any}
        gameTitle="تاخد اللاعب ده ولا الخفي؟"
        backgroundUrl="/games/backgrounds/hidden-player-bg.png"
        roundInfo="قرعة البداية • تحديد من يبدأ بالاختيار"
        onWithdraw={() => {
          if (isLive) liveChRef.current?.send("forfeit", { sid: liveSidRef.current });
          setWithdrew(true);
        }}
      >
        <div className="max-w-xl mx-auto space-y-8 py-12 px-4 text-center select-none animate-fade-in">
          <div className="space-y-3">
            <span className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black">
              🎲 قرعة عادلة للبداية
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              قرعة تحديد من يختار أولاً
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              الفائز بالقرعة يبدأ الاختيار في الجولة الأولى، ثم يتناوب اللاعبان
              بحيث يبدأ الطرف الآخر في الجولة الثانية تلقائياً.
            </p>
          </div>

          {/* Animated Coin */}
          <div className="py-8 flex flex-col items-center justify-center">
            <div
              className={`w-32 h-32 rounded-full border-4 border-amber-300 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 flex items-center justify-center text-zinc-950 shadow-[0_0_50px_rgba(245,158,11,0.6)] ${
                coinSpinning ? "animate-spin" : "scale-105"
              }`}
            >
              {coinSpinning ? (
                <Coins className="w-16 h-16 animate-pulse" />
              ) : (
                <div className="text-center font-black">
                  <span className="text-3xl block">👑</span>
                  <span className="text-xs font-mono">
                    {starterRound1 === 1 ? "اللاعب 1" : "اللاعب 2"}
                  </span>
                </div>
              )}
            </div>

            {!coinSpinning && (
              <div className="mt-6 space-y-4 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-black/25 border-2 border-amber-400 text-white font-black text-sm sm:text-base shadow-xl">
                  <span>القرعة اختارت:</span>
                  <strong className="text-amber-400">
                    {starterRound1 === 1
                      ? "اللاعب 1 يبدأ الجولة الأولى! 🟢"
                      : "اللاعب 2 يبدأ الجولة الأولى! 🔴"}
                  </strong>
                </div>

                <div>
                  <button
                    id="start_draft_btn"
                    onClick={handleStartFromCoinToss}
                    className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all"
                  >
                    الانطلاق إلى الجولة 1 (مركز {positionSchedule[0].labelAr})
                    🚀
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ActiveGameShell>
    );
  }

  // =========================================================================
  // VIEW 3A: System coach reveal — deliberately NO result calculation here.
  // =========================================================================
  if (gameState === "COACH_REVEAL") {
    return (
      <CoachPrepGate bgUrl="/games/backgrounds/hidden-player-bg.png">
      <ActiveGameShell
        user={currentUser as any}
        gameTitle="اختيار مدربي المواجهة"
        backgroundUrl="/games/backgrounds/hidden-player-bg.png"
        roundInfo="المدربون أولاً • ثم التشكيلتان • ثم صافرة البداية"
        onWithdraw={() => {
          if (isLive) liveChRef.current?.send("forfeit", { sid: liveSidRef.current });
          setWithdrew(true);
        }}
      >
        <div className="max-w-5xl mx-auto space-y-6 py-8 px-3 sm:px-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black">
              👑 اختيار النظام للمدربين
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white">
              المدربان جاهزان للمواجهة
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              تم اختيار مدرب مستقل لكل فريق. لا توجد نتيجة أو محاكاة قبل زر
              البداية.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                label: "مدرب التشكيلة الأولى",
                coach: p1Coach,
                accent: "amber",
              },
              {
                label: "مدرب التشكيلة الثانية",
                coach: p2Coach,
                accent: "blue",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`rounded-3xl border-2 ${item.accent === "amber" ? "border-amber-400/60 bg-amber-500/10" : "border-blue-400/60 bg-blue-500/10"} p-5 text-center shadow-2xl`}
              >
                <div className="text-[10px] font-black text-zinc-400 mb-3">
                  {item.label}
                </div>
                {item.coach && (
                  <>
                    <div className="mx-auto w-28 h-28 rounded-3xl overflow-hidden border-2 border-white/20 bg-black">
                      <img
                        src={item.coach.photoUrl}
                        alt={item.coach.nameAr}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="mt-3 text-xl font-black text-white">
                      {item.coach.nameAr}
                    </div>
                    <div className="mt-1 text-xs text-amber-300 font-bold">
                      {item.coach.styleAr}
                    </div>
                    <div className="mt-2 text-sm font-black text-white">
                      ⭐ {item.coach.rating}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              audioManager.playClick();
              setGameState("FORMATION_PREVIEW");
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-300 to-blue-500 text-zinc-950 font-black text-base shadow-[0_0_35px_rgba(245,158,11,.35)] hover:scale-[1.01] transition-all"
          >
            عرض التشكيلتين والمدربين 🔥
          </button>
        </div>
      </ActiveGameShell>
      </CoachPrepGate>
    );
  }

  // =========================================================================
  // VIEW 3B: Lineups only — no static score, no fake verdict.
  // =========================================================================
  if (gameState === "FORMATION_PREVIEW") {
    return (
      <ActiveGameShell
        user={currentUser as any}
        gameTitle="تشكيلتا المواجهة"
        backgroundUrl="/games/backgrounds/hidden-player-bg.png"
        roundInfo="المدرب فوق تشكيلته • اضغط يلا نشوف مين هيكسب"
        onWithdraw={() => {
          if (isLive) liveChRef.current?.send("forfeit", { sid: liveSidRef.current });
          setWithdrew(true);
        }}
      >
        <div className="max-w-7xl mx-auto space-y-5 py-5 px-2 sm:px-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {[
              {
                title: "التشكيلة الأولى",
                squad: player1Squad,
                coach: p1Coach,
                color: "amber",
              },
              {
                title: "التشكيلة الثانية",
                squad: player2Squad,
                coach: p2Coach,
                color: "blue",
              },
            ].map((team, idx) => (
              <div
                key={idx}
                className={`rounded-3xl border-2 ${team.color === "amber" ? "border-amber-400/50" : "border-blue-400/50"} bg-black/20 p-4 shadow-2xl`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[10px] text-zinc-500 font-black">
                      {team.title}
                    </div>
                    <div className="text-lg font-black text-white">
                      {team.squad.length} لاعبين
                    </div>
                  </div>
                  {team.coach && (
                    <div className="flex items-center gap-2 rounded-2xl bg-black/25 border border-zinc-800 px-3 py-2">
                      <img
                        src={team.coach.photoUrl}
                        alt={team.coach.nameAr}
                        className="w-9 h-9 rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="text-[9px] text-zinc-500 font-bold">
                          المدرب
                        </div>
                        <div className="text-xs font-black text-amber-300">
                          {team.coach.nameAr}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <FootballPitch
                  mode={selectedFormat === 5 ? "CLASSIC" : "PRO"}
                  squad={team.squad}
                  teamName={team.title}
                  teamAvatar={idx === 0 ? currentUser.avatar : "🤖"}
                  isUser={idx === 0}
                  budgetRemaining={0}
                  showOwnership={false}
                  onSelectPlayer={() => {}}
                />
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-amber-400/30 bg-black/20 p-4 sm:p-5 text-center shadow-2xl">
            <div className="text-xs text-zinc-400 mb-3">
              الشاشة دي للمعاينة فقط — نتيجة المباراة لن تُحسب إلا بعد الضغط.
            </div>
            <button
              onClick={handleLaunchMatchSimulation}
              className="w-full sm:max-w-xl mx-auto py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-blue-500 text-zinc-950 font-black text-lg shadow-[0_0_40px_rgba(245,158,11,.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              يلا نشوف مين هيكسب
            </button>
          </div>
        </div>
      </ActiveGameShell>
    );
  }

  // =========================================================================
  // VIEW 4: Real Match Simulation (Full Stadium)
  // =========================================================================
  if (gameState === "MATCH_SIMULATION") {
    return (
      <MatchSimulationView
        userSquad={player1Squad}
        userCoach={p1Coach}
        opponentSquad={player2Squad}
        opponentCoach={p2Coach}
        userAvatar={currentUser.avatar}
        gameId="PLAYER_OR_HIDDEN"
        opponentPlayer={realOpponent}
        opponentName={realOpponent?.nameAr}
        opponentAvatar={realOpponent?.avatar}
        sharedSeed={sharedSeed}
        onFinishMatch={() => onBack()}
        onRematch={handleRematch}
      />
    );
  }

  return (
    <>
      <HiddenLaserFX active={laserOn} targetId="mystery_hidden_player_card" />
      {showFriendInvite && (
          <FriendRoomModal
            user={currentUser as any}
            mode={{ kind: "host", gameMode: "PLAYER_OR_HIDDEN", gameLabelAr: "تاخد اللاعب ده ولا اللاعب الخفي؟" }}
            onClose={() => setShowFriendInvite(false)}
            onStart={(opp, roomSettings) => {
              setRealOpponent(opp || null);
              setSelectedFormat(roomSettings.format);
              setShowFriendInvite(false);
              handleSelectFormatAndMode(roomSettings.format, "PVP_1V1");
            }}
          />
        )}
      <ActiveGameShell
        user={currentUser as any}
        gameTitle="تاخد اللاعب ده ولا الخفي؟"
        backgroundUrl="/games/backgrounds/hidden-player-bg.png"
        roundInfo={`الجولة ${round} من ${maxRounds} • ${currentPosTarget.labelAr}`}
        onWithdraw={() => {
          if (isLive) liveChRef.current?.send("forfeit", { sid: liveSidRef.current });
          setWithdrew(true);
        }}
      >
        <div className="max-w-7xl mx-auto space-y-6 py-2 px-2 sm:px-4 select-none">
          {/* Top Status & Turn Bar */}
          {gameState === "ROUND_DECISION" && (
            <div className="mx-auto mb-3 w-fit rounded-full border border-amber-400/40 bg-black/20 px-4 py-1.5 text-xs font-black text-amber-300">
              الوقت: {timeLeft} ث
            </div>
          )}
          <div className="bg-black/20 border border-zinc-800/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black">
                {selectedFormat === 5 ? "خماسي (5 لاعبين)" : "محترف (11 لاعب)"}
              </span>
              <div className="text-sm font-black text-white flex items-center gap-2">
                <span>المركز المطلوب:</span>
                <span className="text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                  {currentPosTarget.labelAr}
                </span>
              </div>
            </div>

            {/* Turn Indicator Badge */}
            <div className="flex items-center gap-3">
              {isRefereeMode ? (
                <div className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400 text-purple-300 text-xs font-black flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-400" />
                  <span>
                    {refereeScreenMode === "REFEREE_VIEW"
                      ? `لوحة الحكم • الدور على: ${activePlayerTitle}`
                      : `شاشة المتنافس: ${activePlayerTitle}`}
                  </span>
                </div>
              ) : (
                <div
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-black flex items-center gap-2 ${
                    isMyTurn
                      ? "bg-emerald-500/20 border-emerald-400/80 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)] animate-pulse"
                      : "bg-rose-500/20 border-rose-400/80 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-current" />
                  <span>
                    {selectedMode === "PVP_1V1_LOCAL"
                      ? `دور ${activePlayerTitle} للاختيار!`
                      : isMyTurn
                        ? "دورك دلوقتي للاختيار! (Your Turn)"
                        : "دور الخصم دلوقتي! (Opponent Turn)"}
                  </span>
                </div>
              )}

              <div className="text-xs font-mono font-bold text-zinc-400 bg-black/25 px-2.5 py-1 rounded-lg border border-zinc-800">
                الجولة {round} / {maxRounds}
              </div>
            </div>
          </div>

          {/* In Referee Mode: Toggle between Referee View (Private) and Player Screen */}
          {isRefereeMode && (
            <div className="bg-purple-950/40 border border-purple-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                <span>
                  {refereeScreenMode === "REFEREE_VIEW"
                    ? "أنت في شاشة الحكم (ترى كل البطاقات سراً). عندما تصبح جاهزاً، اضغط لعرض الشاشة للاعب."
                    : `أنت في شاشة ${activePlayerTitle}. البطاقة الخفية محجوبة بالكامل!`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {refereeScreenMode === "REFEREE_VIEW" ? (
                  <button
                    id="show_to_player_btn"
                    onClick={() => {
                      audioManager.playClick();
                      setRefereeScreenMode("PLAYER_VIEW");
                    }}
                    className="py-2 px-4 rounded-xl bg-purple-500 text-white font-black text-xs hover:bg-purple-600 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>تسليم الشاشة لـ {activePlayerTitle}</span>
                  </button>
                ) : (
                  <button
                    id="return_to_referee_btn"
                    onClick={() => {
                      audioManager.playClick();
                      setRefereeScreenMode("REFEREE_VIEW");
                    }}
                    className="py-2 px-4 rounded-xl bg-zinc-800 border border-purple-400 text-purple-300 font-black text-xs hover:bg-zinc-700 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Crown className="w-4 h-4" />
                    <span>العودة لشاشة الحكم (RETURN TO REFEREE)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Central Decision Stage: Known Player vs Hidden Mystery Player */}
          <div
            className={`bg-black/25 backdrop-blur-[2px] border-2 rounded-3xl p-5 sm:p-7 transition-all ${
              isRefereeMode
                ? "border-purple-500/50"
                : isMyTurn
                  ? "border-emerald-500/50"
                  : "border-rose-500/30"
            }`}
          >
            {/* Section Heading */}
            <div className="text-center mb-6 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                <span>🎯 توافق المركز:</span>
                <span>
                  كلا اللاعبين ({currentPosTarget.posCode}) لمركز{" "}
                  {currentPosTarget.labelAr}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white">
                {gameState === "ROUND_DECISION" ? (
                  isRefereeMode && refereeScreenMode === "REFEREE_VIEW" ? (
                    <span className="text-purple-300">
                      👑 لوحة الحكم: اعرض الخيار على {activePlayerTitle}: النجم
                      المكشوف أم البطاقة الخفية؟
                    </span>
                  ) : isMyTurn ||
                    selectedMode === "PVP_1V1_LOCAL" ||
                    (isRefereeMode && refereeScreenMode === "PLAYER_VIEW") ? (
                    <span className="text-emerald-400">
                      {activePlayerTitle}: هل تأخذ النجم المكشوف... أم تخاطر
                      بالبطاقة الخفية؟
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center justify-center gap-2">
                      <Bot className="w-5 h-5 animate-bounce" />
                      <span>
                        الخصم يدرس الخيارات التكتيكية للمركز دلوقتي...
                      </span>
                    </span>
                  )
                ) : (
                  <span className="text-amber-400">
                    🎉 تم تأكيد الاختيار! اتحدد اللاعب وإضافتها لتشكيلة{" "}
                    {activePlayerTitle}
                  </span>
                )}
              </h2>
            </div>

            {/* Two Cards Showcase Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center justify-items-center max-w-4xl mx-auto py-2">
              {/* 1. KNOWN PLAYER CARD */}
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <div className="w-full flex items-center justify-between px-2">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                    الخيار المضمون (KNOWN)
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    تقييم: {knownPlayer.overallRating} ★
                  </span>
                </div>

                <div className="transform transition-transform hover:scale-[1.02]">
                  <div className="w-28"><PlayerCard player={knownPlayer} size="fluid" transparent /></div>
                </div>

                {/* Take Known Button */}
                {gameState === "ROUND_DECISION" && (
                  <button
                    id="take_known_player_btn"
                    disabled={
                      isDecisionLocked ||
                      (!isRefereeMode &&
                        isOpponentTurn &&
                        selectedMode === "PVP_1V1_AI")
                    }
                    onClick={() => handleSelectChoice("KNOWN")}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                      isDecisionLocked ||
                      (!isRefereeMode &&
                        isOpponentTurn &&
                        selectedMode === "PVP_1V1_AI")
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 border border-emerald-400/40 cursor-pointer"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>أخذ اللاعب المكشوف ({knownPlayer.nameAr})</span>
                  </button>
                )}
              </div>

              {/* 2. HIDDEN PLAYER CARD */}
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <div className="w-full flex items-center justify-between px-2">
                  <span className="text-xs font-black text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-500/40">
                    خيار المخاطرة (HIDDEN)
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {isRefereeMode && refereeScreenMode === "REFEREE_VIEW"
                      ? `سري للحكم: ${hiddenPlayer.overallRating} ★`
                      : "? تقييم غامض ?"}
                  </span>
                </div>

                {/* If Referee View in Referee Mode -> Referee sees the real card with a Referee Badge! */}
                {isRefereeMode && refereeScreenMode === "REFEREE_VIEW" ? (
                  <div className="relative transform transition-transform hover:scale-[1.02]">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20 bg-purple-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-lg border border-purple-300 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>مرئي للحكم فقط (سري)</span>
                    </div>
                    <div className="w-28"><PlayerCard player={hiddenPlayer} size="fluid" transparent /></div>
                  </div>
                ) : gameState === "ROUND_REVEAL" ? (
                  /* Revealed state after decision */
                  <div className="transform transition-transform scale-105 animate-fade-in">
                    <div className="w-28"><PlayerCard player={hiddenPlayer} size="fluid" transparent /></div>
                  </div>
                ) : (
                  /* Strictly Hidden Mystery Card for players */
                  <div
                    id="mystery_hidden_player_card"
                    onClick={() => {
                      if (
                        !isDecisionLocked &&
                        !(isOpponentTurn && selectedMode === "PVP_1V1_AI")
                      ) {
                        handleSelectChoice("HIDDEN");
                      }
                    }}
                    className="relative overflow-hidden rounded-2xl border-2 border-dashed border-purple-400/90 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black w-60 min-h-[360px] p-4 text-center text-white flex flex-col items-center justify-between shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:scale-105 cursor-pointer group transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent animate-pulse" />

                    {/* Top Mystery Header */}
                    <div className="relative z-10 w-full flex items-center justify-between border-b border-purple-500/30 pb-2">
                      <span className="text-xs font-mono font-black text-purple-300">
                        ? ???
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-[10px] font-bold text-purple-200">
                        {currentPosTarget.posCode}
                      </span>
                    </div>

                    {/* Center Mystery Icon & Pulse */}
                    <div className="relative z-10 flex flex-col items-center my-auto">
                      <div className="w-20 h-20 rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center text-purple-300 text-4xl font-black mb-3 shadow-[0_0_30px_rgba(168,85,247,0.5)] group-hover:rotate-12 transition-transform animate-bounce">
                        ?
                      </div>
                      <span className="text-xl font-black text-purple-300 tracking-wider">
                        ? HIDDEN PLAYER ?
                      </span>
                      <span className="text-xs text-zinc-400 mt-1">
                        لاعب خفي مجهول الهوية
                      </span>
                      <div className="mt-3 px-3 py-1 bg-black/20 rounded-full text-[10px] text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>الهوية محمية بالكامل</span>
                      </div>
                    </div>

                    {/* Bottom mystery footnote */}
                    <div className="relative z-10 w-full pt-2 border-t border-purple-500/30 text-[10px] text-zinc-400">
                      مخاطرة قد تمنحك أسطورة خارقة!
                    </div>
                  </div>
                )}

                {/* Take Hidden Button */}
                {gameState === "ROUND_DECISION" && (
                  <button
                    id="take_hidden_player_btn"
                    disabled={
                      isDecisionLocked ||
                      (!isRefereeMode &&
                        isOpponentTurn &&
                        selectedMode === "PVP_1V1_AI")
                    }
                    onClick={() => handleSelectChoice("HIDDEN")}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                      isDecisionLocked ||
                      (!isRefereeMode &&
                        isOpponentTurn &&
                        selectedMode === "PVP_1V1_AI")
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95 border border-purple-400/40 cursor-pointer"
                    }`}
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>المخاطرة وأخذ اللاعب الخفي (TAKE HIDDEN)</span>
                  </button>
                )}
              </div>
            </div>

            {/* AI Thinking Bar */}
            {gameState === "ROUND_DECISION" &&
              isOpponentTurn &&
              isAiThinking && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-3 text-amber-300 text-xs font-black animate-pulse">
                  <Bot className="w-5 h-5 animate-spin" />
                  <span>
                    الذكاء الاصطناعي يدرس العرض التكتيكي ويزن المخاطرة...
                  </span>
                </div>
              )}

          </div>

          {/* Squad Status Mini-Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Player 1 Squad Progress */}
            <div className="p-4 rounded-2xl bg-black/25 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-emerald-400">
                  تشكيلة اللاعب 1 ({player1Squad.length}/{roundsPerPlayer})
                </span>
                <span className="font-mono text-zinc-400">
                  مجموع: {player1Squad.reduce((s, p) => s + p.overallRating, 0)}{" "}
                  ★
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {player1Squad.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded bg-black/25 border border-zinc-800 text-[11px] font-bold text-zinc-200"
                  >
                    {p.nameAr} ({p.overallRating})
                  </span>
                ))}
                {player1Squad.length === 0 && (
                  <span className="text-[11px] text-zinc-600">
                    في انتظار الاختيار الأول...
                  </span>
                )}
              </div>
            </div>

            {/* Player 2 Squad Progress */}
            <div className="p-4 rounded-2xl bg-black/25 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-blue-400">
                  تشكيلة اللاعب 2 ({player2Squad.length}/{roundsPerPlayer})
                </span>
                <span className="font-mono text-zinc-400">
                  مجموع: {player2Squad.reduce((s, p) => s + p.overallRating, 0)}{" "}
                  ★
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {player2Squad.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded bg-black/25 border border-zinc-800 text-[11px] font-bold text-zinc-200"
                  >
                    {p.nameAr} ({p.overallRating})
                  </span>
                ))}
                {player2Squad.length === 0 && (
                  <span className="text-[11px] text-zinc-600">
                    في انتظار الاختيار الأول...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* التشكيل تحت الاختيارات أثناء اللعب — أصغر وواضح */}
        <div className="mx-auto w-full max-w-3xl grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
          <FootballPitch
            mode={selectedFormat === 11 ? 11 : 5}
            squad={player1Squad}
            teamName="تشكيلة اللاعب 1"
            isUser
            compact
            showOwnership={false}
          />
          <FootballPitch
            mode={selectedFormat === 11 ? 11 : 5}
            squad={player2Squad}
            teamName="تشكيلة اللاعب 2"
            isUser={false}
            compact
            showOwnership={false}
          />
        </div>
      </ActiveGameShell>
    </>
  );
};
