// ============================================================
// العبها صح | EL3BHA SA7 - Server-Authoritative 1v1 Auction Engine
// ============================================================

import {
  FootballPlayer,
  AuctionState,
  AuctionBid,
  AuctionRoomSettings,
  RoomParticipant,
  Coach,
} from "../types";
import { getCoachesSync } from "./coachRepository";
import { getCombinedPlayersSync } from "./playerRepository";
import { audioManager } from "./audioManager";

export const DEFAULT_AUCTION_TIMER = 15;
export const DEFAULT_STARTING_BID = 1.0; // 1,000,000 minor units (1M)
export const DEFAULT_BID_INCREMENT = 1.0; // 1M default step
export const MIN_DECIMAL_STEP = 0.1; // 0.1M precision

// Minor units helper: 1M = 1,000,000 minor units to avoid IEEE-754 floating-point inaccuracies
export function toMinorUnits(millions: number): number {
  return Math.round(millions * 1_000_000);
}

export function fromMinorUnits(minorUnits: number): number {
  return Math.round(minorUnits) / 1_000_000;
}

export function normalizeBidAmount(amount: number | string): number {
  if (typeof amount === "string") {
    // Replace Arabic decimal separators and commas with standard period
    const cleanStr = amount
      .replace(/,/g, ".")
      .replace(/٫/g, ".")
      .replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed) || parsed < 0) return 0;
    return Math.round(parsed * 100) / 100;
  }
  if (isNaN(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
}

export function formatMoneyDisplay(millions: number): string {
  const norm = normalizeBidAmount(millions);
  if (norm === 0) return "0M";
  if (norm % 1 === 0) {
    return `${norm}M`;
  }
  return `${norm}M`;
}

export interface OriginalPlayerResult {
  player: FootballPlayer;
  winnerId: string;
  winnerName: string;
  winnerAvatar: string;
  isUserWinner: boolean;
  amount: number;
  isSold: boolean;
  titleAr: string;
  subtitleAr: string;
}

export interface AlternatePlayerResult {
  player: FootballPlayer;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  isUserReceiver: boolean;
  cost: number;
  isFree: boolean;
  isLastBidCost: boolean;
  isRevealed: boolean;
  titleAr: string;
  subtitleAr: string;
}

export interface FreePlayerAward {
  userId: string;
  userName: string;
  player: FootballPlayer;
  isSkipper: boolean;
  cost: number;
  isFree: boolean;
  isLastBidCost?: boolean;
  reasonAr: string;
}

export interface AuctionHistoryEntry {
  id: string;
  round: number;
  positionCategory: string;
  player: FootballPlayer;
  winnerName: string;
  winnerAvatar: string;
  isUser: boolean;
  amount: number;
  isFree: boolean;
  isAlternate?: boolean;
  timestamp: number;
}

export type AuctionResolutionState =
  | AuctionState
  | "BIDDING_CLOSED"
  | "ORIGINAL_PLAYER_RESOLUTION"
  | "ALTERNATE_PLAYER_REVEAL"
  | "ROUND_COMPLETE"
  | "FREE_PLAYER_REVEAL"
  | "NO_RISK_WINDOW"
  | "COACH_REVEAL"
  | "FORFEIT";

export interface NoRiskSimulationResult {
  bucket: "GK" | "DEF" | "MID" | "FWD";
  bucketLabelAr: string;
  oldPlayer: FootballPlayer;
  newPlayer: FootballPlayer | null; // null = kept the original (no swap this box)
  squadIndex: number;
}

export interface AuctionSessionState {
  sessionId: string;
  state: AuctionResolutionState;
  currentRound: number;
  totalRounds: number;
  currentPositionCategory:
    | "حراسة المرمى (GK)"
    | "الدفاع (DEF)"
    | "وسط الملعب (MID)"
    | "الهجوم (ATT)";
  currentPlayer: FootballPlayer | null;
  isMysteryPlayer: boolean;
  mysteryRevealed: boolean;
  currentHighBid: AuctionBid | null;
  currentTurnUserId: string | null;
  bidHistory: AuctionBid[];
  auctionHistory: AuctionHistoryEntry[];
  participants: RoomParticipant[];
  timerRemaining: number;
  timerTotal: number;
  sequenceNumber: number;
  settings: AuctionRoomSettings;
  winnerOfCurrentRound: RoomParticipant | null;
  originalPlayerResult: OriginalPlayerResult | null;
  alternatePlayerResult: AlternatePlayerResult | null;
  freePlayerAward: FreePlayerAward | null;
  forfeitWinnerId?: string;
  forfeitLoserId?: string;
  assignedCoaches?: {
    userCoach: Coach;
    opponentCoach: Coach;
  };
  lastBidEnabled: boolean;
  wildCardEnabled: boolean;
  noRiskEnabled: boolean;
  noRiskPhaseCompleted?: boolean;
  noRiskReplacedPlayer?: {
    userOldPlayer?: FootballPlayer;
    userNewPlayer?: FootballPlayer;
    opponentOldPlayer?: FootballPlayer;
    opponentNewPlayer?: FootballPlayer;
  };
  /** Per-position "pack opening" simulation results — one box per bucket. */
  noRiskSimulation?: NoRiskSimulationResult[];
  /** نتيجة الوايلد كارد: مين خرج ومين دخل التشكيلة (بتفضل ظاهرة في شاشة المدربين والتشكيلة النهائية). */
  wildCardSwap?: {
    userOldPlayer?: FootballPlayer;
    userNewPlayer?: FootballPlayer;
  };
}

/** فئة المركز بتاعة لاعب — بتضمن إن البديل يجي من نفس المركز حتى لو الـpool خلص. */
function categoryOfPosition(
  pos: FootballPlayer["position"],
): "حراسة المرمى (GK)" | "الدفاع (DEF)" | "وسط الملعب (MID)" | "الهجوم (ATT)" {
  if (pos === "GK") return "حراسة المرمى (GK)";
  if (["CB", "LB", "RB"].includes(pos)) return "الدفاع (DEF)";
  if (["CM", "CAM", "CDM"].includes(pos)) return "وسط الملعب (MID)";
  return "الهجوم (ATT)";
}

export class AuctionEngine {
  private state: AuctionSessionState;
  private timerInterval: number | null = null;
  private listeners: ((state: AuctionSessionState) => void)[] = [];
  private resolutionTimeouts: number[] = [];
  private processedRequestIds: Set<string> = new Set();

  // Positional Pools
  private gkPool: FootballPlayer[] = [];
  private defPool: FootballPlayer[] = [];
  private midPool: FootballPlayer[] = [];
  private attPool: FootballPlayer[] = [];
  private usedPlayerIds: Set<string> = new Set();

  constructor(
    userParticipant: RoomParticipant,
    settings: AuctionRoomSettings,
    _botCount: number = 1,
  ) {
    const isLastBid = Boolean(settings.lastBidEnabled);
    const isWildCard = Boolean(settings.wildCardEnabled);
    const isNoRisk = Boolean(settings.noRiskEnabled);

    const initialParticipants: RoomParticipant[] = [
      {
        ...userParticipant,
        budget: settings.initialBudget,
        squad: [],
        coach: null,
        totalSpent: 0,
        hasSkippedCurrent: false,
        lastValidBidInRound: 0,
        wildCardsAvailable: isWildCard ? 1 : 0,
        hasUsedWildCard: false,
        hasUsedNoRisk: false,
      },
    ];

    const botProfiles = [
      {
        name: "🤖 المايسترو طارق (خصم النظام)",
        avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      },
      {
        name: "🤖 الكابتن فيصل (خصم النظام)",
        avatar:
          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      },
      {
        name: "🤖 القناص سامح (خصم النظام)",
        avatar:
          "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      },
    ];
    const chosenBot =
      botProfiles[Math.floor(Math.random() * botProfiles.length)];

    // Strictly 1v1: 1 User + 1 Opponent with identical symmetric rules
    initialParticipants.push({
      userId: `bot_opponent_1v1`,
      userName: "فريق AI",
      userAvatar: "av_bot",
      isHost: false,
      isReady: true,
      isBot: true,
      budget: settings.initialBudget,
      squad: [],
      coach: null,
      totalSpent: 0,
      hasSkippedCurrent: false,
      lastValidBidInRound: 0,
      wildCardsAvailable: isWildCard ? 1 : 0,
      hasUsedWildCard: false,
      hasUsedNoRisk: false,
    });

    // Partition players into positional pools and shuffle
    // Partition players into positional pools and shuffle. Includes
    // any admin-published players alongside the built-in roster, so a
    // freshly-added batch of cards genuinely gets drawn in matches —
    // not just displayed somewhere unused.
    const allPlayers = getCombinedPlayersSync();
    this.gkPool = allPlayers
      .filter((p) => p.position === "GK")
      .sort(() => Math.random() - 0.5);
    this.defPool = allPlayers
      .filter((p) => ["CB", "LB", "RB"].includes(p.position))
      .sort(() => Math.random() - 0.5);
    this.midPool = allPlayers
      .filter((p) => ["CM", "CAM", "CDM"].includes(p.position))
      .sort(() => Math.random() - 0.5);
    this.attPool = allPlayers
      .filter((p) => ["ST", "RW", "LW", "CF"].includes(p.position))
      .sort(() => Math.random() - 0.5);

    const timerDuration =
      settings.bidTimerSeconds ||
      settings.bidTimeLimitSeconds ||
      DEFAULT_AUCTION_TIMER;

    this.state = {
      sessionId: `auction_1v1_${Date.now()}`,
      state: "LOBBY",
      currentRound: 0,
      totalRounds: settings.squadSize, // 5 for Classic (100M), 11 for Pro (200M)
      currentPositionCategory: "حراسة المرمى (GK)",
      currentPlayer: null,
      isMysteryPlayer: false,
      mysteryRevealed: false,
      currentHighBid: null,
      currentTurnUserId: initialParticipants[0]?.userId || null,
      bidHistory: [],
      auctionHistory: [],
      participants: initialParticipants,
      timerRemaining: timerDuration,
      timerTotal: timerDuration,
      sequenceNumber: 0,
      settings: {
        ...settings,
        bidTimerSeconds: timerDuration,
        bidTimeLimitSeconds: timerDuration,
        lastBidEnabled: isLastBid,
        wildCardEnabled: isWildCard,
        noRiskEnabled: isNoRisk,
      },
      winnerOfCurrentRound: null,
      originalPlayerResult: null,
      alternatePlayerResult: null,
      freePlayerAward: null,
      lastBidEnabled: isLastBid,
      wildCardEnabled: isWildCard,
      noRiskEnabled: isNoRisk,
      noRiskPhaseCompleted: false,
    };
  }

  /** يحوّل الخصم من بوت إلى لاعب حقيقي (اللعب الأونلاين). */
  public setRealOpponent(opp: { userId: string; userName: string; userAvatar: string }) {
    const p2 = this.state.participants[1];
    if (!p2) return;
    p2.userId = opp.userId;
    p2.userName = opp.userName;
    p2.userAvatar = opp.userAvatar;
    p2.isBot = false;
    p2.isReady = true;
  }

  public subscribe(listener: (state: AuctionSessionState) => void) {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Fully stops this engine instance: clears the live bidding countdown
   * interval AND every pending resolution/reveal setTimeout, and drops
   * all listeners. MUST be called whenever the match screen is left
   * (withdraw, back button, unmount) — without this, the previous
   * bug was that the countdown + auto-bid-resolution timers kept
   * firing forever in the background after the player navigated away
   * (since only the React listener was detached, not the engine's own
   * timers), silently continuing to simulate/resolve rounds and, in
   * rare cases, still calling into stale callbacks from a screen that
   * no longer exists.
   */
  public destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.clearAllTimeouts();
    this.listeners = [];
  }

  private notify() {
    this.listeners.forEach((l) => l(this.getState()));
  }

  public getState(): AuctionSessionState {
    return {
      ...this.state,
      participants: this.state.participants.map((p) => ({
        ...p,
        squad: [...p.squad],
      })),
      bidHistory: [...this.state.bidHistory],
      auctionHistory: [...this.state.auctionHistory],
    };
  }

  private clearAllTimeouts() {
    this.resolutionTimeouts.forEach((t) => clearTimeout(t));
    this.resolutionTimeouts = [];
  }

  public startAuction() {
    this.state.state = "COUNTDOWN";
    this.state.currentRound = 1;
    this.notify();
    audioManager.playWhistle();

    const t = window.setTimeout(() => {
      this.startNextPlayerRound();
    }, 2000);
    this.resolutionTimeouts.push(t);
  }

  // Determine current position category based on squad size and current round
  public getTargetPositionForRound(
    round: number,
    totalRounds: number,
  ): {
    category:
      | "حراسة المرمى (GK)"
      | "الدفاع (DEF)"
      | "وسط الملعب (MID)"
      | "الهجوم (ATT)";
    pool: FootballPlayer[];
  } {
    if (totalRounds === 5) {
      // Classic 5-player mode (100M):
      // Round 1: GK vs GK
      // Round 2: DEF vs DEF
      // Round 3: MID vs MID
      // Round 4: MID vs MID
      // Round 5: ATT vs ATT
      if (round === 1)
        return { category: "حراسة المرمى (GK)", pool: this.gkPool };
      if (round === 2) return { category: "الدفاع (DEF)", pool: this.defPool };
      if (round === 3 || round === 4)
        return { category: "وسط الملعب (MID)", pool: this.midPool };
      return { category: "الهجوم (ATT)", pool: this.attPool };
    } else {
      // Pro 11-player mode (200M):
      // Round 1: GK vs GK
      // Rounds 2-5: DEF vs DEF (4 Defenders)
      // Rounds 6-8: MID vs MID (3 Midfielders)
      // Rounds 9-11: ATT vs ATT (3 Attackers)
      if (round === 1)
        return { category: "حراسة المرمى (GK)", pool: this.gkPool };
      if (round >= 2 && round <= 5)
        return { category: "الدفاع (DEF)", pool: this.defPool };
      if (round >= 6 && round <= 8)
        return { category: "وسط الملعب (MID)", pool: this.midPool };
      return { category: "الهجوم (ATT)", pool: this.attPool };
    }
  }

  // Draw a player from appropriate pool ensuring STRICT 100% position category matching
  public drawPlayerForCategory(
    categoryPool: FootballPlayer[],
    targetCategory?:
      | "حراسة المرمى (GK)"
      | "الدفاع (DEF)"
      | "وسط الملعب (MID)"
      | "الهجوم (ATT)",
  ): FootballPlayer {
    for (let i = categoryPool.length - 1; i >= 0; i--) {
      const p = categoryPool[i];
      if (!this.usedPlayerIds.has(p.id)) {
        this.usedPlayerIds.add(p.id);
        categoryPool.splice(i, 1);
        return p;
      }
    }

    // Determine category to filter matching players
    const currentCat = targetCategory || this.state.currentPositionCategory;
    const isMatchingCat = (p: FootballPlayer) => {
      if (currentCat.includes("GK") || currentCat === "حراسة المرمى (GK)")
        return p.position === "GK";
      if (currentCat.includes("DEF") || currentCat === "الدفاع (DEF)")
        return ["CB", "LB", "RB"].includes(p.position);
      if (currentCat.includes("MID") || currentCat === "وسط الملعب (MID)")
        return ["CM", "CAM", "CDM", "LM", "RM"].includes(p.position);
      return ["ST", "RW", "LW", "CF"].includes(p.position);
    };

    const matchingCategoryPlayers =
      getCombinedPlayersSync().filter(isMatchingCat);
    const unusedInCategory = matchingCategoryPlayers.find(
      (p) => !this.usedPlayerIds.has(p.id),
    );

    if (unusedInCategory) {
      this.usedPlayerIds.add(unusedInCategory.id);
      return unusedInCategory;
    }

    // Strict Fallback: Pick any player from the EXACT SAME position category (never cross categories!)
    const fallbackSameCat =
      matchingCategoryPlayers[
        Math.floor(Math.random() * matchingCategoryPlayers.length)
      ] || matchingCategoryPlayers[0];
    return fallbackSameCat;
  }

  // Draw a random alternate player for a user when skip occurs (Guaranteed same position)
  public drawFreePlayerForCurrentPhase(): FootballPlayer {
    const { pool, category } = this.getTargetPositionForRound(
      this.state.currentRound,
      this.state.totalRounds,
    );
    return this.drawPlayerForCategory(pool, category);
  }

  // Calculate the authoritative minimum legal next bid
  public getMinimumNextBid(): number {
    if (!this.state.currentHighBid || this.state.currentHighBid.amount <= 0) {
      return DEFAULT_STARTING_BID; // 1M initial bid
    }
    const increment = this.state.settings.bidIncrement || DEFAULT_BID_INCREMENT;
    return normalizeBidAmount(this.state.currentHighBid.amount + increment);
  }

  private startNextPlayerRound() {
    if (this.state.currentRound > this.state.totalRounds) {
      if (
        this.state.settings.noRiskEnabled &&
        !this.state.noRiskPhaseCompleted
      ) {
        this.startNoRiskPhase();
      } else {
        this.startCoachRevealPhase();
      }
      return;
    }

    const { category, pool } = this.getTargetPositionForRound(
      this.state.currentRound,
      this.state.totalRounds,
    );
    const nextPlayer = this.drawPlayerForCategory(pool);
    const isMystery = !!(
      this.state.settings.allowHiddenPlayers && Math.random() < 0.25
    );

    // Reset round state & reset each participant's valid bid for the NEW round
    this.state.currentPositionCategory = category;
    this.state.currentPlayer = nextPlayer;
    this.state.isMysteryPlayer = isMystery;
    this.state.mysteryRevealed = !isMystery;
    this.state.currentHighBid = null;
    this.turnPassedThisRound = false;
    this.state.currentTurnUserId =
      this.state.participants[
        (this.state.currentRound - 1) % this.state.participants.length
      ]?.userId ||
      this.state.participants[0]?.userId ||
      null;
    this.state.bidHistory = [];
    this.state.state = "PLAYER_REVEAL";
    this.state.winnerOfCurrentRound = null;
    this.state.originalPlayerResult = null;
    this.state.alternatePlayerResult = null;
    this.state.freePlayerAward = null;

    this.state.participants.forEach((p) => {
      p.hasSkippedCurrent = false;
      p.lastValidBidInRound = 0; // Strictly reset per round
    });

    const roundTimer =
      this.state.settings.bidTimerSeconds ||
      this.state.settings.bidTimeLimitSeconds ||
      DEFAULT_AUCTION_TIMER;
    this.state.timerRemaining = roundTimer;
    this.state.timerTotal = roundTimer;
    this.notify();
    audioManager.playReveal();

    const t = window.setTimeout(() => {
      if (this.state.state === "FORFEIT") return;
      this.state.state = "BIDDING";
      this.notify();
      this.startTimer();
      this.triggerBotBidding();
    }, 2000);
    this.resolutionTimeouts.push(t);
  }

  // الدور اتنقل للطرف التاني مرة في الجولة دي بسبب انتهاء الوقت من غير مزايدة
  private turnPassedThisRound = false;

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = window.setInterval(() => {
      if (this.state.state !== "BIDDING") return;

      this.state.timerRemaining -= 1;
      if (this.state.timerRemaining <= 3 && this.state.timerRemaining > 0) {
        audioManager.playTimerBeep();
      }

      if (this.state.timerRemaining <= 0) {
        if (!this.state.currentHighBid && !this.turnPassedThisRound && this.state.participants.length > 1 && this.state.currentTurnUserId) {
          // صاحب الدور الوقت خلص عنده ومزايدش → اللاعب بيروح للطرف التاني وبيقدر يزايد عليه (مرة واحدة)
          this.turnPassedThisRound = true;
          const other = this.state.participants.find((p) => p.userId !== this.state.currentTurnUserId);
          if (other) {
            this.state.currentTurnUserId = other.userId;
            this.state.timerRemaining = this.state.timerTotal;
            this.notify();
            if (other.isBot) this.triggerBotBidding();
            return;
          }
        }
        this.executeAuctionResolution();
      } else {
        this.notify();
      }
    }, 1000);
  }

  // ============================================================
  // SERVER AUTHORITATIVE BID ENGINE WITH CUSTOM AMOUNTS & DECIMALS
  // ============================================================
  public placeBid(
    userId: string,
    customAmount?: number | string,
    requestId?: string,
  ): {
    success: boolean;
    message: string;
    errorCode?: string;
    bid?: AuctionBid;
  } {
    // Idempotency check: Reject duplicate requests
    if (requestId && this.processedRequestIds.has(requestId)) {
      return {
        success: false,
        message: "تم استلام ده الطلب ومعالجته مسبقاً",
        errorCode: "DUPLICATE_REQUEST",
      };
    }

    if (
      this.state.state !== "BIDDING" ||
      !this.state.currentPlayer ||
      this.state.timerRemaining <= 0
    ) {
      return {
        success: false,
        message: "المزاد ليس في مرحلة المزايدة النشطة",
        errorCode: "AUCTION_NOT_ACTIVE",
      };
    }

    const participant = this.state.participants.find(
      (p) => p.userId === userId,
    );
    if (!participant) {
      return {
        success: false,
        message: "المستخدم غير متواجد بالغرفة",
        errorCode: "USER_NOT_FOUND",
      };
    }

    if (
      this.state.currentTurnUserId &&
      participant.userId !== this.state.currentTurnUserId
    ) {
      return {
        success: false,
        message: "استنى مزايدة الخصم الأول",
        errorCode: "NOT_YOUR_TURN",
      };
    }

    if (participant.hasSkippedCurrent) {
      return {
        success: false,
        message: "لقد قمت بالتخطي في دي الجولة",
        errorCode: "ALREADY_SKIPPED",
      };
    }

    if (participant.squad.length >= this.state.totalRounds) {
      return {
        success: false,
        message: "تشكيلتك اكتملت بالفعل",
        errorCode: "SQUAD_FULL",
      };
    }

    const currentAmount = this.state.currentHighBid
      ? normalizeBidAmount(this.state.currentHighBid.amount)
      : 0;
    const minBid = this.getMinimumNextBid();

    // Parse and normalize bid amount safely
    let bidAmount: number;
    if (customAmount !== undefined && customAmount !== null) {
      bidAmount = normalizeBidAmount(customAmount);
    } else {
      bidAmount = minBid;
    }

    // Validation 1: Must be positive numeric amount
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return {
        success: false,
        message: "يرجى إدخال مبلغ مزايدة صالح",
        errorCode: "INVALID_AMOUNT",
      };
    }

    // Validation 2: Initial bid must be >= 1M starting bid
    if (currentAmount === 0 && bidAmount < DEFAULT_STARTING_BID) {
      return {
        success: false,
        message: `الحد الأدنى لافتتاح المزاد هو ${DEFAULT_STARTING_BID}M €`,
        errorCode: "BID_TOO_LOW",
      };
    }

    // Validation 3: Subsequence bid must be strictly greater than current high bid
    if (currentAmount > 0 && bidAmount <= currentAmount) {
      return {
        success: false,
        message: `المزايدة الحالية لازم تكون ${minBid}M أو أكثر (أعلى من ${currentAmount}M €)`,
        errorCode: "BID_TOO_LOW",
      };
    }

    if (currentAmount > 0 && bidAmount < minBid) {
      // If user entered a custom decimal amount higher than current but below min step
      // If it's strictly > currentAmount by at least MIN_DECIMAL_STEP (0.1M), allow precision bidding!
      const minPossible = normalizeBidAmount(currentAmount + MIN_DECIMAL_STEP);
      if (bidAmount < minPossible) {
        return {
          success: false,
          message: `المزايدة الحالية لازم تكون ${minBid}M أو أكثر`,
          errorCode: "BID_TOO_LOW",
        };
      }
    }

    // Validation 4: Budget check
    if (participant.budget < bidAmount) {
      return {
        success: false,
        message: `المبلغ (${formatMoneyDisplay(bidAmount)}) يتجاوز ميزانيتك المتاحة (${formatMoneyDisplay(participant.budget)})`,
        errorCode: "OVER_BUDGET",
      };
    }

    // Mark requestId as processed
    if (requestId) {
      this.processedRequestIds.add(requestId);
    }

    // Authoritative State Mutation
    participant.lastValidBidInRound = bidAmount;

    this.state.sequenceNumber += 1;
    const newBid: AuctionBid = {
      id: `bid_${this.state.sequenceNumber}_${Date.now()}`,
      userId: participant.userId,
      userName: participant.userName,
      userAvatar: participant.userAvatar,
      amount: bidAmount,
      timestamp: Date.now(),
      sequence: this.state.sequenceNumber,
      isBot: participant.isBot,
    };

    this.state.currentHighBid = newBid;
    this.state.bidHistory.unshift(newBid);

    // المزايدة بالتبادل: نفس اللاعب ممنوع يزايد مرتين ورا بعض.
    const nextParticipant = this.state.participants.find(
      (p) => p.userId !== participant.userId,
    );
    this.state.currentTurnUserId = nextParticipant?.userId || null;
    this.state.timerRemaining = this.state.timerTotal;

    // Anti-sniping rule: if bid placed in last 5 seconds, extend timer by 5 seconds
    if (this.state.timerRemaining < 5) {
      this.state.timerRemaining = Math.min(
        this.state.timerRemaining + 5,
        this.state.timerTotal,
      );
    }

    audioManager.playBid();
    this.notify();

    // دور الخصم فقط بعد مزايدتك؛ ممنوع نفس الطرف يزايد مرتين ورا بعض.
    if (this.state.currentTurnUserId) {
      const next = this.state.participants.find(
        (p) => p.userId === this.state.currentTurnUserId,
      );
      if (next?.isBot) this.triggerBotBidding();
    }

    return {
      success: true,
      message: `تم تقديم مزايدتك الرسمية بمبلغ ${formatMoneyDisplay(bidAmount)} € بنجاح`,
      bid: newBid,
    };
  }

  // Skip Player: Standard skip gives alternate player free (0M) or for last bid if enabled
  public skipPlayer(userId: string) {
    if (this.state.state !== "BIDDING" || !this.state.currentPlayer) return;

    const skippingParticipant = this.state.participants.find(
      (p) => p.userId === userId,
    );
    if (!skippingParticipant) return;
    if (
      this.state.currentTurnUserId &&
      skippingParticipant.userId !== this.state.currentTurnUserId
    )
      return;

    skippingParticipant.hasSkippedCurrent = true;
    this.executeAuctionResolution(skippingParticipant.userId);
  }

  // ============================================================
  // EXACT AUCTION ROUND RESOLUTION PROTOCOL (MANDATORY SEQUENCE)
  // ============================================================
  // 1. Reveal auctioned player (done in PLAYER_REVEAL)
  // 2. Start 30-second timer (done in BIDDING)
  // 3. Players bid / skip
  // 4. Timer reaches 0 OR skip occurs -> BIDDING_CLOSED
  // 5. Determine winner of original player -> ORIGINAL_PLAYER_RESOLUTION (Show dedicated result card)
  // 6. Dedicate visual confirmation (2s), assign original player to winner squad, deduct budget
  // 7. Transition to ALTERNATE_PLAYER_REVEAL -> show dedicated alternate player card with real photo
  // 8. Show whether alternate is FREE or Last Bid cost, assign to receiver squad, deduct budget if paid
  // 9. Update auction history with 2 permanent entries
  // 10. Advance to NEXT ROUND only after all previous steps are complete!
  // ============================================================

  private executeAuctionResolution(skipperUserId?: string) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.clearAllTimeouts();
    this.state.state = "BIDDING_CLOSED";
    this.notify();

    const t1 = window.setTimeout(() => {
      if (this.state.state === "FORFEIT") return;
      const auctionedPlayer = this.state.currentPlayer;
      if (!auctionedPlayer) return;

      const p1 = this.state.participants[0];
      const p2 = this.state.participants[1];
      let winner: RoomParticipant;
      let price = 0;

      if (this.state.currentHighBid) {
        winner =
          this.state.participants.find(
            (p) => p.userId === this.state.currentHighBid!.userId,
          ) || p1;
        price = normalizeBidAmount(this.state.currentHighBid.amount);
      } else if (skipperUserId) {
        // مفيش لاعب ببلاش: لو مفيش مزايدة، مفيش بيع مجاني.
        winner =
          this.state.participants.find((p) => p.userId !== skipperUserId) || p2;
        price = DEFAULT_STARTING_BID;
      } else {
        // انتهى الوقت من غير مزايدة: أول لاعب فقط يحصل على اللاعب بسعر البداية.
        winner = p1;
        price = DEFAULT_STARTING_BID;
      }

      price = Math.min(
        normalizeBidAmount(price),
        normalizeBidAmount(winner.budget),
      );
      winner.budget = normalizeBidAmount(winner.budget - price);
      winner.totalSpent = normalizeBidAmount(winner.totalSpent + price);
      winner.squad.push({ ...auctionedPlayer, paidPrice: price, acquiredFree: false });
      this.state.winnerOfCurrentRound = winner;
      this.state.originalPlayerResult = {
        player: auctionedPlayer,
        winnerId: winner.userId,
        winnerName: winner.userName,
        winnerAvatar: winner.userAvatar,
        isUserWinner: !winner.isBot,
        amount: price,
        isSold: true,
        titleAr: !winner.isBot ? "راحتلك" : `راحت لـ ${winner.userName}`,
        subtitleAr: `${auctionedPlayer.nameAr} — ${formatMoneyDisplay(price)} €`,
      };

      this.state.auctionHistory.unshift({
        id: `hist_${Date.now()}_orig`,
        round: this.state.currentRound,
        positionCategory: this.state.currentPositionCategory,
        player: auctionedPlayer,
        winnerName: winner.userName,
        winnerAvatar: winner.userAvatar,
        isUser: !winner.isBot,
        amount: price,
        isFree: false,
        isAlternate: false,
        timestamp: Date.now(),
      });

      // التخلي عن اللاعب يعطي لاعبًا بديلًا مجانيًا. Last Bid يحوّل البديل إلى صفقة بآخر مزايدة.
      const lastBid = Boolean(this.state.settings.lastBidEnabled);
      const loser =
        this.state.participants.find((p) => p.userId !== winner.userId) || p2;
      const loserLastBid = normalizeBidAmount(loser.lastValidBidInRound || 0);
      const shouldAwardAlternate =
        Boolean(skipperUserId) ||
        (lastBid && loserLastBid > 0 && loser.budget >= loserLastBid);
      if (shouldAwardAlternate) {
        const extra = this.drawFreePlayerForCurrentPhase();
        const alternateCost = lastBid && loserLastBid > 0 ? loserLastBid : 0;
        if (alternateCost > 0) {
          loser.budget = normalizeBidAmount(loser.budget - alternateCost);
          loser.totalSpent = normalizeBidAmount(
            loser.totalSpent + alternateCost,
          );
        }
        loser.squad.push({ ...extra, paidPrice: alternateCost, acquiredFree: alternateCost === 0 });
        this.state.alternatePlayerResult = {
          player: extra,
          receiverId: loser.userId,
          receiverName: loser.userName,
          receiverAvatar: loser.userAvatar,
          isUserReceiver: !loser.isBot,
          cost: alternateCost,
          isFree: alternateCost === 0,
          isLastBidCost: alternateCost > 0,
          isRevealed: true,
          titleAr:
            alternateCost > 0
              ? !loser.isBot
                ? "Last Bid"
                : `Last Bid لـ ${loser.userName}`
              : !loser.isBot
                ? "لاعب بديل"
                : `لاعب بديل لـ ${loser.userName}`,
          subtitleAr:
            alternateCost > 0
              ? `${extra.nameAr} — آخر مزايدة ${formatMoneyDisplay(alternateCost)} €`
              : `${extra.nameAr} — مجاني`,
        };
        this.state.freePlayerAward = {
          userId: loser.userId,
          userName: loser.userName,
          player: extra,
          isSkipper: Boolean(skipperUserId),
          cost: alternateCost,
          isFree: alternateCost === 0,
          isLastBidCost: alternateCost > 0,
          reasonAr: `آخر مزايدة: ${formatMoneyDisplay(loserLastBid)} €`,
        };
        this.state.auctionHistory.unshift({
          id: `hist_${Date.now()}_lastbid`,
          round: this.state.currentRound,
          positionCategory: this.state.currentPositionCategory,
          player: extra,
          winnerName: loser.userName,
          winnerAvatar: loser.userAvatar,
          isUser: !loser.isBot,
          amount: loserLastBid,
          isFree: false,
          isAlternate: true,
          timestamp: Date.now() + 1,
        });
        this.state.state = "ALTERNATE_PLAYER_REVEAL";
      } else {
        this.state.alternatePlayerResult = null;
        this.state.freePlayerAward = null;
        this.state.state = "ORIGINAL_PLAYER_RESOLUTION";
      }

      this.notify();
      audioManager.playCoin();

      const t2 = window.setTimeout(
        () => {
          if (this.state.state === "FORFEIT") return;
          this.state.currentRound += 1;
          this.startNextPlayerRound();
        },
        this.state.alternatePlayerResult ? 2200 : 1600,
      );
      this.resolutionTimeouts.push(t2);
    }, 600);
    this.resolutionTimeouts.push(t1);
  }

  // AI Bot Bidding Logic with flexible increments
  private triggerBotBidding() {
    if (this.state.state !== "BIDDING" || !this.state.currentPlayer) return;

    const bot = this.state.participants.find((p) => p.isBot);
    if (
      !bot ||
      bot.hasSkippedCurrent ||
      bot.squad.length >= this.state.totalRounds
    )
      return;
    if (this.state.currentHighBid?.userId === bot.userId) return;

    const delay = Math.floor(Math.random() * 2000) + 1200;

    const t = window.setTimeout(() => {
      if (this.state.state !== "BIDDING" || !this.state.currentPlayer) return;
      if (
        bot.hasSkippedCurrent ||
        this.state.currentHighBid?.userId === bot.userId
      )
        return;

      const rating = this.state.currentPlayer.overallRating;
      const currentAmount = this.state.currentHighBid
        ? normalizeBidAmount(this.state.currentHighBid.amount)
        : 0;
      const nextAmount = this.getMinimumNextBid();
      const remainingSlots = Math.max(
        1,
        this.state.totalRounds - bot.squad.length,
      );
      const opponent = this.state.participants.find(
        (p) => p.userId !== bot.userId,
      );
      const oppBudget = opponent ? opponent.budget : 50;

      // Non-linear player valuation (exponential curve for world-class legends)
      let baseValuation = (rating - 75) * 3.5 + 10;
      if (rating >= 91) baseValuation += 20;
      else if (rating >= 88) baseValuation += 12;
      else if (rating >= 84) baseValuation += 5;
      else if (rating < 80) baseValuation = Math.max(4, baseValuation * 0.7);

      // Position urgency factor
      const currentCategory = this.state.currentPositionCategory;
      const hasSlotFilled = bot.squad.some(
        (p) => categoryOfPosition(p.position) === currentCategory,
      );
      const urgencyMultiplier = hasSlotFilled ? 0.75 : 1.25;

      // Safe reserve calculation to avoid running out of budget before squad completes
      const safeReserve = (remainingSlots - 1) * 3.5;
      const availableFunds = Math.max(0, bot.budget - safeReserve);
      const maxBotWillingToPay = Math.min(
        availableFunds,
        baseValuation * urgencyMultiplier,
      );

      // Strategic decision
      if (nextAmount <= maxBotWillingToPay && nextAmount <= bot.budget) {
        const amount = this.chooseBotBidAmount({
          currentAmount,
          nextAmount,
          maxWilling: Math.min(maxBotWillingToPay, bot.budget),
          rating,
          remainingSlots,
          botBudget: bot.budget,
          oppBudget,
          hasSlotFilled,
        });
        this.placeBid(bot.userId, amount);
      } else if (
        this.state.currentHighBid &&
        !this.state.currentHighBid.isBot
      ) {
        // Price exceeds strategic expected value -> skip cleanly without bluffing into ruin
        this.skipPlayer(bot.userId);
      }
    }, delay);
    this.resolutionTimeouts.push(t);
  }

  // اختيار قيمة زيادة الذكاء الاصطناعي: مش دايماً +1M — بيزوّد 1..10M أو قفزات كبيرة (30/60/70M)
  // حسب قيمة اللاعب، الميزانية، عدد الخانات المتبقية، وضع التشكيلة (5 أو 11)، وميزانية الخصم.
  private chooseBotBidAmount(ctx: {
    currentAmount: number;
    nextAmount: number;
    maxWilling: number;
    rating: number;
    remainingSlots: number;
    botBudget: number;
    oppBudget: number;
    hasSlotFilled: boolean;
  }): number {
    const { currentAmount, nextAmount, maxWilling, rating, remainingSlots, botBudget, oppBudget, hasSlotFilled } = ctx;
    const isFive = this.state.totalRounds <= 5;
    const room = Math.floor(maxWilling - currentAmount); // أقصى زيادة تقدر عليها قيمتها عنده
    const minStep = Math.max(1, Math.ceil(nextAmount - currentAmount));
    if (room <= minStep) return nextAmount;

    const pick = (arr: number[]) => arr[Math.floor(Math.random() * arr.length)];
    const star = rating >= 90 ? 3 : rating >= 87 ? 2 : rating >= 83 ? 1 : 0; // مستوى النجومية
    const rich = botBudget >= oppBudget * 1.4; // الذكاء غني قدام الخصم
    const lateSlots = remainingSlots <= (isFive ? 2 : 3); // آخر الخانات = ضغط أكبر لإنهاء التشكيلة

    // القفزات الكبيرة (30/60/70): نجم فعلاً + قدرة مالية، وبتتعمل مرة من كل كام مزايدة
    // في الخماسي أكتر (كل خانة مصيرية) وفي 11 أقل وبحذر عشان الميزانية تكفي كل التشكيلة.
    const bigChance = (isFive ? 0.22 : 0.09) * (star >= 2 ? 1.4 : star === 1 ? 0.6 : 0.15) * (rich ? 1.3 : 0.8) * (hasSlotFilled ? 0.5 : 1);
    if (room >= 30 && Math.random() < bigChance) {
      const bigs = [30, 60, 70].filter((v) => v <= room && (v < 60 || star >= 2) && (isFive || v <= 60));
      // قفزة تكسر الخصم: لو الخصم ميزانيته قريبة من القفزة بتبقى مغرية أكتر
      if (bigs.length) return normalizeBidAmount(currentAmount + pick(bigs));
    }

    // الزيادات العادية 2..10 (أحياناً 1) — الأوزان بتتغير بالنجومية والضغط
    const pool: number[] = [];
    const add = (v: number, w: number) => {
      if (v < minStep || v > room) return;
      for (let i = 0; i < w; i++) pool.push(v);
    };
    // زيادات صغيرة: لاعب عادي أو تشكيلة 11 (حذر)
    add(1, isFive ? 1 : 2);
    add(2, 3);
    add(3, 3);
    add(4, 2 + (star >= 1 ? 1 : 0));
    add(5, 2 + star);
    add(6, 1 + star);
    add(7, 1 + (star >= 1 ? 1 : 0) + (lateSlots ? 1 : 0));
    add(8, (star >= 1 ? 1 : 0) + (isFive ? 1 : 0));
    add(9, (star >= 2 ? 1 : 0) + (lateSlots && isFive ? 1 : 0));
    add(10, (star >= 2 ? 2 : 0) + (rich ? 1 : 0) + (isFive && star >= 1 ? 1 : 0));
    // في 11 لاعب: تخفيض الزيادات العالية لحد ما نتأكد إن في ميزانية للخانات الباقية
    const filtered = !isFive && remainingSlots > 4 ? pool.filter((v) => v <= 6 || Math.random() < 0.35) : pool;
    const chosen = filtered.length ? pick(filtered) : minStep;
    return normalizeBidAmount(currentAmount + Math.max(minStep, Math.min(chosen, room)));
  }

  // WILD CARD: Swap 1 eligible squad player with another valid random player of the same position
  public useWildCard(
    userId: string,
    targetPlayerId?: string,
  ): {
    success: boolean;
    oldPlayer?: FootballPlayer;
    newPlayer?: FootballPlayer;
    message: string;
  } {
    if (!this.state.settings.wildCardEnabled) {
      return {
        success: false,
        message: "بطاقة Wild Card غير مفعلة في دي المباراة",
      };
    }

    const participant = this.state.participants.find(
      (p) => p.userId === userId,
    );
    if (!participant) return { success: false, message: "المستخدم غير متواجد" };

    if (
      (participant.wildCardsAvailable ?? 0) <= 0 ||
      participant.hasUsedWildCard
    ) {
      return { success: false, message: "لقد استخدمت بطاقة Wild Card بالفعل" };
    }

    const targetIndex = targetPlayerId
      ? participant.squad.findIndex((p) => p.id === targetPlayerId)
      : Math.floor(Math.random() * participant.squad.length);
    if (targetIndex < 0 || targetIndex >= participant.squad.length) {
      return { success: false, message: "لا يوجد لاعب صالح للاستبدال" };
    }

    const targetPlayer = participant.squad[targetIndex];
    let poolToUse: FootballPlayer[] = [];
    if (targetPlayer.position === "GK") poolToUse = this.gkPool;
    else if (["CB", "LB", "RB"].includes(targetPlayer.position))
      poolToUse = this.defPool;
    else if (["CM", "CAM", "CDM"].includes(targetPlayer.position))
      poolToUse = this.midPool;
    else poolToUse = this.attPool;

    // Wild Card is always a blind random replacement. Remaining budget only
    // changes the quality band that can be drawn; it never guarantees a player.
    const budget = participant.budget;
    const sortedPool = [...poolToUse].sort(
      (a, b) => b.overallRating - a.overallRating,
    );
    const tierRatio = Math.max(
      0,
      Math.min(1, budget / Math.max(1, this.state.settings.initialBudget)),
    );
    const maxIndex = Math.max(
      0,
      Math.min(
        sortedPool.length - 1,
        Math.floor((1 - tierRatio * 0.72) * sortedPool.length),
      ),
    );
    const candidatePool = sortedPool.slice(0, Math.max(1, maxIndex + 1));
    // نمرّر فئة المركز صراحةً: لو الـpool خلص، البديل برضه يفضل من نفس المركز (مش من مركز الجولة الأخيرة).
    const newPlayer = this.drawPlayerForCategory(
      candidatePool,
      categoryOfPosition(targetPlayer.position),
    );
    participant.squad[targetIndex] = newPlayer;
    participant.wildCardsAvailable = 0;
    participant.hasUsedWildCard = true;
    this.state.wildCardSwap = {
      userOldPlayer: targetPlayer,
      userNewPlayer: newPlayer,
    };

    audioManager.playCardDraw();
    this.notify();

    return {
      success: true,
      oldPlayer: targetPlayer,
      newPlayer,
      message: `تم استخدام Wild Card واستبدال ${targetPlayer.nameAr} بالنجم ${newPlayer.nameAr}!`,
    };
  }

  // NO RISK NO FUN Phase
  private startNoRiskPhase() {
    this.state.state = "NO_RISK_WINDOW";
    this.notify();
  }

  /**
   * The upgraded "pack opening" version of No Risk No Fun: instead of
   * one blind random swap anywhere in the squad, resolves ONE box per
   * position bucket (GK / DEF / MID / FWD) — each box independently
   * has a real chance to swap that slot for a fresh player from the
   * SAME position pool, or to keep the original. Results are computed
   * all at once (deterministic engine state), but the UI reveals them
   * one box at a time with its own ritual for the suspense.
   */
  public triggerNoRiskSimulation(userId: string): {
    success: boolean;
    message: string;
  } {
    if (
      !this.state.settings.noRiskEnabled ||
      this.state.state !== "NO_RISK_WINDOW"
    ) {
      return {
        success: false,
        message: "مرحلة No Risk No Fun غير متاحة حالياً",
      };
    }
    const participant = this.state.participants.find(
      (p) => p.userId === userId,
    );
    if (
      !participant ||
      participant.hasUsedNoRisk ||
      participant.squad.length === 0
    ) {
      return { success: false, message: "مش ممكن تطبيق الاستبدال" };
    }

    // Exactly ONE blind random replacement. The player never chooses the box
    // or the replacement, and the result is committed before the match starts.
    const squadIndex = Math.floor(Math.random() * participant.squad.length);
    const oldPlayer = participant.squad[squadIndex];
    let pool: FootballPlayer[];
    if (oldPlayer.position === "GK") pool = this.gkPool;
    else if (["CB", "LB", "RB"].includes(oldPlayer.position))
      pool = this.defPool;
    else if (["CM", "CAM", "CDM"].includes(oldPlayer.position))
      pool = this.midPool;
    else pool = this.attPool;

    const newPlayer = this.drawPlayerForCategory(
      pool,
      categoryOfPosition(oldPlayer.position),
    );
    participant.squad[squadIndex] = newPlayer;
    participant.hasUsedNoRisk = true;
    this.state.noRiskSimulation = [
      {
        bucket:
          oldPlayer.position === "GK"
            ? "GK"
            : ["CB", "LB", "RB"].includes(oldPlayer.position)
              ? "DEF"
              : ["CM", "CAM", "CDM"].includes(oldPlayer.position)
                ? "MID"
                : "FWD",
        bucketLabelAr:
          oldPlayer.position === "GK"
            ? "حراسة المرمى"
            : ["CB", "LB", "RB"].includes(oldPlayer.position)
              ? "الدفاع"
              : ["CM", "CAM", "CDM"].includes(oldPlayer.position)
                ? "وسط الملعب"
                : "الهجوم",
        oldPlayer,
        newPlayer,
        squadIndex,
      },
    ];
    this.state.noRiskReplacedPlayer = {
      userOldPlayer: oldPlayer,
      userNewPlayer: newPlayer,
    };

    audioManager.playCardDraw();
    this.notify();
    return {
      success: true,
      message: `تم تنفيذ خاطر وبدل! تم استبدال ${oldPlayer.nameAr} بلاعب عشوائي: ${newPlayer.nameAr}`,
    };
  }

  public triggerNoRiskNoFun(userId: string): {
    success: boolean;
    message: string;
  } {
    if (
      !this.state.settings.noRiskEnabled ||
      this.state.state !== "NO_RISK_WINDOW"
    ) {
      return {
        success: false,
        message: "مرحلة No Risk No Fun غير متاحة حالياً",
      };
    }

    const participant = this.state.participants.find(
      (p) => p.userId === userId,
    );
    if (
      !participant ||
      participant.hasUsedNoRisk ||
      participant.squad.length === 0
    ) {
      return { success: false, message: "مش ممكن تطبيق الاستبدال" };
    }

    const randomIndex = Math.floor(Math.random() * participant.squad.length);
    const oldPlayer = participant.squad[randomIndex];

    let pool: FootballPlayer[] = [];
    if (oldPlayer.position === "GK") pool = this.gkPool;
    else if (["CB", "LB", "RB"].includes(oldPlayer.position))
      pool = this.defPool;
    else if (["CM", "CAM", "CDM"].includes(oldPlayer.position))
      pool = this.midPool;
    else pool = this.attPool;

    const newPlayer = this.drawPlayerForCategory(
      pool,
      categoryOfPosition(oldPlayer.position),
    );
    participant.squad[randomIndex] = newPlayer;
    participant.hasUsedNoRisk = true;

    this.state.noRiskReplacedPlayer = {
      userOldPlayer: oldPlayer,
      userNewPlayer: newPlayer,
    };

    audioManager.playCardDraw();
    this.notify();

    return {
      success: true,
      message: `تم تنفيذ No Risk No Fun! استبدال ${oldPlayer.nameAr} بـ ${newPlayer.nameAr}`,
    };
  }

  public completeNoRiskPhase() {
    this.state.noRiskPhaseCompleted = true;
    this.startCoachRevealPhase();
  }

  // Coach Assignment Phase: Completely FREE and automatic random assignment
  private startCoachRevealPhase() {
    const shuffledCoaches = [...getCoachesSync()].sort(() => Math.random() - 0.5);
    const userCoach = shuffledCoaches[0];
    const opponentCoach = shuffledCoaches[1] || shuffledCoaches[0];

    const p1 = this.state.participants[0];
    const p2 = this.state.participants[1];

    if (p1) p1.coach = userCoach;
    if (p2) p2.coach = opponentCoach;

    this.state.assignedCoaches = {
      userCoach,
      opponentCoach,
    };

    this.state.state = "COACH_REVEAL";
    this.notify();
    audioManager.playReveal();
  }

  // Handle voluntary forfeit / withdrawal
  public forfeitGame(userId: string) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.clearAllTimeouts();

    const forfeitingParticipant = this.state.participants.find(
      (p) => p.userId === userId,
    );
    const winningParticipant = this.state.participants.find(
      (p) => p.userId !== userId,
    );

    this.state.forfeitLoserId = forfeitingParticipant
      ? forfeitingParticipant.userId
      : userId;
    this.state.forfeitWinnerId = winningParticipant
      ? winningParticipant.userId
      : "opponent";
    this.state.state = "FORFEIT";
    this.notify();
  }
}
