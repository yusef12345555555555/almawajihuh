// ============================================================
// العبها صح | EL3BHA SA7 - Real-Time Tournament & Bracket Storage Service
// PostgreSQL / Local Storage Hybrid with Real-Time Event Bus
// ============================================================

import {
  TournamentEntity,
  TournamentParticipant,
  TournamentMatchSlot,
  TournamentGameId,
  TournamentType,
} from "../types/tournamentTypes";
import { UserProfile } from "../types";
import { StorageService } from "./storageService";

const TOURNAMENTS_STORAGE_KEY = "el3bha_sa7_real_tournaments_v3";
const EVENT_BUS_KEY = "el3bha_sa7_tournament_events_bus";

export type TournamentEventCallback = (event: {
  type: string;
  payload: any;
}) => void;

export class TournamentEngineService {
  private static listeners: Set<TournamentEventCallback> = new Set();

  public static subscribe(cb: TournamentEventCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private static emit(type: string, payload: any) {
    this.listeners.forEach((cb) => {
      try {
        cb({ type, payload });
      } catch (err) {
        console.error("Tournament event error:", err);
      }
    });
  }

  // 1. Initial Seeding if no tournaments exist
  private static getInitialTournaments(): TournamentEntity[] {
    const defaultTournaments: TournamentEntity[] = [];

    return defaultTournaments;
  }

  // 2. Load all tournaments
  public static getAllTournaments(): TournamentEntity[] {
    try {
      const data = localStorage.getItem(TOURNAMENTS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    const initial = this.getInitialTournaments();
    this.saveTournaments(initial);
    return initial;
  }

  // Save all tournaments
  public static saveTournaments(tournaments: TournamentEntity[]) {
    try {
      localStorage.setItem(
        TOURNAMENTS_STORAGE_KEY,
        JSON.stringify(tournaments),
      );
    } catch (err) {
      console.error("Failed to save tournaments:", err);
    }
  }

  // 3. Get single tournament by ID
  public static getTournamentById(id: string): TournamentEntity | null {
    const list = this.getAllTournaments();
    return list.find((t) => t.id === id) || null;
  }

  // 4. Create a new tournament
  public static createTournament(params: {
    name: string;
    gameId: TournamentGameId;
    gameNameAr: string;
    gameMode: string;
    gameModeLabelAr: string;
    type: TournamentType;
    capacity: 4 | 8 | 16 | 32;
    descriptionAr: string;
    prizePoolCoins: number;
    prizePoolPoints: number;
    creator: UserProfile;
    teamName?: string;
    teamMembers?: string[];
    customParticipants?: TournamentParticipant[];
    isAiTournament?: boolean;
    aiDifficulty?: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
    /** Per-decision thinking time (seconds), chosen once at creation — e.g. for ديل أو نو ديل. */
    turnSeconds?: number;
  }): TournamentEntity {
    const list = this.getAllTournaments();

    let initialParticipants: TournamentParticipant[] = [];

    if (params.customParticipants && params.customParticipants.length > 0) {
      initialParticipants = [...params.customParticipants];
    } else {
      const creatorParticipant: TournamentParticipant = {
        id: params.creator.id,
        name:
          params.type === "TEAM" && params.teamName
            ? params.teamName
            : params.creator.nameAr || params.creator.username,
        avatar:
          params.creator.avatar ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
        isHost: true,
        isTeam: params.type === "TEAM",
        teamCaptain: params.creator.nameAr || params.creator.username,
        teamMembers:
          params.type === "TEAM"
            ? params.teamMembers || [params.creator.nameAr || "اللاعب"]
            : undefined,
        rating: params.creator.rating || 1500,
      };
      initialParticipants.push(creatorParticipant);

      // If AI tournament, fill with realistic AI opponents immediately!
      if (params.isAiTournament) {
        const aiAvatars = ["av_bot"];

        const aiNames = ["فريق AI"];

        for (let i = 0; i < params.capacity - 1; i++) {
          const name =
            params.type === "TEAM"
              ? aiNames[0]
              : aiNames[i % aiNames.length];

          initialParticipants.push({
            id: `ai_comp_${Date.now()}_${i}`,
            name,
            avatar: aiAvatars[i % aiAvatars.length],
            isAi: true,
            isTeam: params.type === "TEAM",
            rating: 1500 + Math.floor(Math.random() * 200),
          });
        }
      }
    }

    const isFullNow = initialParticipants.length >= params.capacity;

    const newTournament: TournamentEntity = {
      id: `tour_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: params.name.trim(),
      gameId: params.gameId,
      gameNameAr: params.gameNameAr,
      gameMode: params.gameMode,
      gameModeLabelAr: params.gameModeLabelAr,
      turnSeconds: params.turnSeconds,
      type: params.type,
      capacity: params.capacity,
      currentParticipantsCount: initialParticipants.length,
      status: isFullNow ? "FULL" : "OPEN",
      creatorId: params.creator.id,
      creatorName: params.creator.nameAr || params.creator.username,
      createdAt: Date.now(),
      descriptionAr: params.descriptionAr || "بطولة خروج مغلوب.",
      prizePoolCoins: params.prizePoolCoins || 3000,
      prizePoolPoints: params.prizePoolPoints || 50,
      participants: initialParticipants,
      matches: [],
      champion: null,
      rulesAr: [
        `اللعبة مقفلة بالكامل: ${params.gameNameAr} (${params.gameModeLabelAr}).`,
        `نوع البطولة: ${params.type === "INDIVIDUAL" ? "فردية (لاعب ضد لاعب)" : "فرق (فريق ضد فريق)"}.`,
        `السعة الإلزامية: ${params.capacity} ${params.type === "INDIVIDUAL" ? "لاعب" : "فرق"}.`,
        params.isAiTournament
          ? "بطولة ذكاء اصطناعي تفاعلية مع كبار المدربين التكتيكيين."
          : "بطولة أونلاين بين لاعبين حقيقيين.",
        "يتم قفل التسجيل تلقائياً فور اكتمال المقاعد والبدء في قرعة الـ Bracket الثابت.",
        "كل مواجهة تتطلب تأكيد (أنا جاهز) من الطرفين قبل إعطاء الإذن لبدء المباراة.",
      ],
    };

    if (isFullNow) {
      this.generateAndLockBracket(newTournament);
    }

    list.unshift(newTournament);
    this.saveTournaments(list);
    this.emit("TOURNAMENT_CREATED", newTournament);
    return newTournament;
  }

  // 5. Join Tournament
  public static joinTournament(
    tournamentId: string,
    user: UserProfile,
    teamInfo?: { teamName: string; teamMembers: string[] },
  ): { success: boolean; message: string; tournament?: TournamentEntity } {
    const list = this.getAllTournaments();
    const index = list.findIndex((t) => t.id === tournamentId);
    if (index === -1) {
      return { success: false, message: "البطولة غير موجودة!" };
    }

    const t = list[index];

    // Status verification
    if (
      t.status === "FULL" ||
      t.status === "FINISHED" ||
      t.status === "IN_PROGRESS" ||
      t.status === "SEMIFINAL" ||
      t.status === "FINAL"
    ) {
      return {
        success: false,
        message: "البطولة مكتملة أو جارية بالفعل، التسجيل مغلق!",
      };
    }

    if (t.participants.length >= t.capacity) {
      t.status = "FULL";
      this.saveTournaments(list);
      return { success: false, message: "اكتملت مقاعد البطولة بالكامل!" };
    }

    // Duplicate check
    const alreadyJoined = t.participants.some((p) => p.id === user.id);
    if (alreadyJoined) {
      return { success: false, message: "أنت مسجل بالفعل في دي البطولة!" };
    }

    // Add participant
    const newParticipant: TournamentParticipant = {
      id: user.id,
      name:
        t.type === "TEAM" && teamInfo?.teamName
          ? teamInfo.teamName
          : user.nameAr || user.username,
      avatar:
        user.avatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
      isTeam: t.type === "TEAM",
      teamCaptain: user.nameAr || user.username,
      teamMembers:
        t.type === "TEAM"
          ? teamInfo?.teamMembers || [user.nameAr || "اللاعب"]
          : undefined,
      rating: user.rating || 1500,
    };

    t.participants.push(newParticipant);
    t.currentParticipantsCount = t.participants.length;

    // Update status
    if (t.currentParticipantsCount >= t.capacity) {
      t.status = "FULL";
      // Automatically generate persistent bracket
      this.generateAndLockBracket(t);
    } else if (t.currentParticipantsCount === t.capacity - 1) {
      t.status = "ALMOST_FULL";
    } else {
      t.status = "OPEN";
    }

    list[index] = t;
    this.saveTournaments(list);
    this.emit("TOURNAMENT_JOINED", {
      tournament: t,
      participant: newParticipant,
    });

    return {
      success: true,
      message: "تم الانضمام للبطولة بنجاح!",
      tournament: t,
    };
  }

  // 6. Fill AI / Fast Test Participants (to test full tournament execution instantly)
  public static fillTournamentWithSimulatedParticipants(
    tournamentId: string,
  ): TournamentEntity | null {
    const list = this.getAllTournaments();
    const index = list.findIndex((t) => t.id === tournamentId);
    if (index === -1) return null;

    const t = list[index];
    if (
      t.status === "FULL" ||
      t.status === "FINISHED" ||
      t.status === "IN_PROGRESS"
    )
      return t;

    const aiAvatars = ["av_bot"];

    const aiNames = ["فريق AI"];

    let aiIndex = 0;
    while (t.participants.length < t.capacity) {
      const name =
        t.type === "TEAM"
          ? aiNames[0]
          : aiNames[aiIndex % aiNames.length];
      t.participants.push({
        id: `ai_participant_${Date.now()}_${aiIndex}`,
        name,
        avatar: aiAvatars[aiIndex % aiAvatars.length],
        isAi: true,
        isTeam: t.type === "TEAM",
        rating: 1450 + Math.floor(Math.random() * 250),
      });
      aiIndex++;
    }

    t.currentParticipantsCount = t.participants.length;
    t.status = "FULL";
    this.generateAndLockBracket(t);

    list[index] = t;
    this.saveTournaments(list);
    this.emit("TOURNAMENT_FULL", t);
    return t;
  }

  // 7. Generate and Lock Symmetrical Bracket
  // Generic single-elimination bracket generator. Correctly supports ANY
  // power-of-two capacity (4, 8, 16, 32, ...) instead of silently truncating
  // everything above 8 to an 8-slot bracket — every registered participant
  // gets a real seeded slot and every round is generated and linked.
  public static generateAndLockBracket(tournament: TournamentEntity) {
    if (tournament.matches.length > 0) return; // Already locked

    tournament.status = "IN_PROGRESS";
    tournament.startedAt = Date.now();

    const parts = [...tournament.participants];
    const capacity = Math.max(2, tournament.capacity || parts.length || 2);
    const totalRounds = Math.max(1, Math.round(Math.log2(capacity)));

    const roundLabel = (roundsFromFinal: number): string => {
      if (roundsFromFinal === 0) return "النهائي الكبير على كأس البطولة 🏆";
      if (roundsFromFinal === 1) return "نصف النهائي";
      if (roundsFromFinal === 2) return "ربع النهائي";
      if (roundsFromFinal === 3) return "دور الـ16";
      return `الدور التمهيدي (${roundsFromFinal})`;
    };

    const matches: TournamentMatchSlot[] = [];
    // roundMatchIds[r] holds the match ids created for round r (1-indexed), in matchIndex order
    const roundMatchIds: string[][] = [];

    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = capacity / Math.pow(2, round);
      const ids: string[] = [];
      for (let i = 0; i < matchesInRound; i++) {
        const id = `${tournament.id}_r${round}_${i}`;
        ids.push(id);

        const isFirstRound = round === 1;
        const home = isFirstRound ? parts[i * 2] || null : null;
        const away = isFirstRound ? parts[i * 2 + 1] || null : null;
        const roundsFromFinal = totalRounds - round;
        const branch: "LEFT" | "RIGHT" | "FINAL" =
          matchesInRound === 1 ? "FINAL" : i < matchesInRound / 2 ? "LEFT" : "RIGHT";

        const nextRound = round + 1;
        const nextMatchId =
          nextRound <= totalRounds ? `${tournament.id}_r${nextRound}_${Math.floor(i / 2)}` : undefined;
        const nextSlotRole: "home" | "away" | undefined =
          nextRound <= totalRounds ? (i % 2 === 0 ? "home" : "away") : undefined;

        matches.push({
          id,
          round,
          roundNameAr: roundLabel(roundsFromFinal),
          matchIndex: i,
          branch,
          homeParticipant: home,
          awayParticipant: away,
          status: isFirstRound && home && away ? "READY_TO_START" : "SCHEDULED",
          matchSessionId: `match_${id}`,
          hostId: (isFirstRound && home?.id) || "",
          hostReady: isFirstRound ? (home?.isAi ? true : false) : false,
          awayReady: isFirstRound ? (away?.isAi ? true : false) : false,
          nextMatchId,
          nextSlotRole,
        });
      }
      roundMatchIds.push(ids);
    }

    // Byes: if round 1 has a slot with only one of home/away filled (odd
    // seed counts), auto-advance that lone participant instead of leaving
    // the match stuck forever.
    for (const m of matches) {
      if (m.round === 1 && ((m.homeParticipant && !m.awayParticipant) || (!m.homeParticipant && m.awayParticipant))) {
        const lone = m.homeParticipant || m.awayParticipant;
        m.status = "FINISHED";
        m.winnerId = lone?.id || null;
        m.finishedAt = Date.now();
        if (m.nextMatchId && lone) {
          const nextM = matches.find((nm) => nm.id === m.nextMatchId);
          if (nextM) {
            if (m.nextSlotRole === "home") {
              nextM.homeParticipant = lone;
              nextM.hostId = lone.id;
              nextM.hostReady = lone.isAi ? true : false;
            } else {
              nextM.awayParticipant = lone;
              nextM.awayReady = lone.isAi ? true : false;
            }
            if (nextM.homeParticipant && nextM.awayParticipant) nextM.status = "READY_TO_START";
          }
        }
      }
    }

    tournament.matches = matches;
  }

  // 8. Toggle Participant Ready State in a Match Slot
  public static toggleParticipantReady(
    tournamentId: string,
    matchId: string,
    participantId: string,
  ): { success: boolean; match?: TournamentMatchSlot; error?: string } {
    const list = this.getAllTournaments();
    const tIndex = list.findIndex((t) => t.id === tournamentId);
    if (tIndex === -1) return { success: false, error: "البطولة غير موجودة" };

    const t = list[tIndex];
    const mIndex = t.matches.findIndex((m) => m.id === matchId);
    if (mIndex === -1) return { success: false, error: "المباراة غير موجودة" };

    const match = t.matches[mIndex];

    if (match.homeParticipant?.id === participantId) {
      match.hostReady = !match.hostReady;
    } else if (match.awayParticipant?.id === participantId) {
      match.awayReady = !match.awayReady;
    } else {
      return { success: false, error: "أنت لست طرفاً في دي المواجهة" };
    }

    list[tIndex] = t;
    this.saveTournaments(list);
    this.emit("MATCH_PLAYER_READY", { tournamentId, matchId, match });
    return { success: true, match };
  }

  // 9. Host Starts Match (Strict Server-Side Validation)
  public static startTournamentMatch(
    tournamentId: string,
    matchId: string,
    callerParticipantId: string,
  ): { success: boolean; error?: string; match?: TournamentMatchSlot } {
    const list = this.getAllTournaments();
    const tIndex = list.findIndex((t) => t.id === tournamentId);
    if (tIndex === -1) return { success: false, error: "البطولة غير موجودة" };

    const t = list[tIndex];
    const mIndex = t.matches.findIndex((m) => m.id === matchId);
    if (mIndex === -1) return { success: false, error: "المباراة غير موجودة" };

    const match = t.matches[mIndex];

    // Verify Caller is Host
    if (
      match.hostId !== callerParticipantId &&
      match.homeParticipant?.id !== callerParticipantId
    ) {
      return {
        success: false,
        error: "فقط مضيف الغرفة يملك صلاحية بدء المباراة!",
      };
    }

    // Verify Exactly Two Competitors exist
    if (!match.homeParticipant || !match.awayParticipant) {
      return { success: false, error: "لم يكتمل طرفا المواجهة بعد!" };
    }

    // Verify BOTH are Ready
    if (!match.hostReady || !match.awayReady) {
      return {
        success: false,
        error: "PLAYER_NOT_READY: لازم يؤكد كلا الطرفين (أنا جاهز) أولاً!",
      };
    }

    match.status = "PLAYING";
    match.startedAt = Date.now();

    list[tIndex] = t;
    this.saveTournaments(list);
    this.emit("TOURNAMENT_MATCH_STARTED", { tournamentId, matchId, match });
    return { success: true, match };
  }

  // 10. Record Match Result & Advance Winner Automatically
  public static recordMatchResultAndAdvance(
    tournamentId: string,
    matchId: string,
    homeScore: number,
    awayScore: number,
  ): {
    success: boolean;
    tournament?: TournamentEntity;
    champion?: TournamentParticipant | null;
  } {
    const list = this.getAllTournaments();
    const tIndex = list.findIndex((t) => t.id === tournamentId);
    if (tIndex === -1) return { success: false };

    const t = list[tIndex];
    const mIndex = t.matches.findIndex((m) => m.id === matchId);
    if (mIndex === -1) return { success: false };

    const match = t.matches[mIndex];
    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.status = "FINISHED";
    match.finishedAt = Date.now();

    const homeWon = homeScore >= awayScore;
    const winner = homeWon ? match.homeParticipant : match.awayParticipant;
    const loser = homeWon ? match.awayParticipant : match.homeParticipant;

    match.winnerId = winner?.id || null;
    match.loserId = loser?.id || null;

    // Award +10 points to current active user for completing the tournament match
    StorageService.awardUniversal10Points(
      `tournament_${t.gameId}`,
      match.matchSessionId,
    );

    // If this was the Grand Final: Declare Champion!
    const isGrandFinal =
      !match.nextMatchId ||
      match.id.endsWith("_final") ||
      match.branch === "FINAL";
    if (isGrandFinal) {
      t.champion = winner;
      t.status = "FINISHED";
      t.finishedAt = Date.now();

      // If user won the championship, award bonus prize
      const user = StorageService.getUserProfile();
      if (winner && winner.id === user.id) {
        user.coins += t.prizePoolCoins || 5000;
        user.points = (user.points || 0) + (t.prizePoolPoints || 100);
        user.wins += 1;
        user.rating += 45;
        StorageService.saveUserProfile(user);
      }

      list[tIndex] = t;
      this.saveTournaments(list);
      this.emit("CHAMPION_DECLARED", { tournament: t, champion: winner });
      return { success: true, tournament: t, champion: winner };
    }

    // Advance winner to the predetermined next branch match slot
    if (match.nextMatchId && winner) {
      const nextMatch = t.matches.find((m) => m.id === match.nextMatchId);
      if (nextMatch) {
        if (match.nextSlotRole === "home") {
          nextMatch.homeParticipant = winner;
          nextMatch.hostId = winner.id;
          nextMatch.hostReady = winner.isAi ? true : false;
        } else {
          nextMatch.awayParticipant = winner;
          nextMatch.awayReady = winner.isAi ? true : false;
        }

        // If both slots of next match are now filled, mark ready to start
        if (nextMatch.homeParticipant && nextMatch.awayParticipant) {
          nextMatch.status = "READY_TO_START";
        }
      }
    }

    // Check if any other round needs auto-simulation for AI vs AI
    this.autoSimulateAiMatches(t);

    list[tIndex] = t;
    this.saveTournaments(list);
    this.emit("TOURNAMENT_MATCH_FINISHED", {
      tournamentId,
      matchId,
      match,
      winner,
    });
    return { success: true, tournament: t, champion: null };
  }

  // 11. Auto-simulate background AI vs AI matches to keep bracket flowing smoothly
  public static autoSimulateAiMatches(tournament: TournamentEntity) {
    let advanced = false;
    for (const m of tournament.matches) {
      if (
        m.status === "READY_TO_START" &&
        m.homeParticipant?.isAi &&
        m.awayParticipant?.isAi &&
        !m.winnerId
      ) {
        // AI vs AI auto resolution
        const hScore = Math.floor(Math.random() * 4) + 1;
        const aScore = Math.floor(Math.random() * 4);
        const resolvedHScore = hScore === aScore ? hScore + 1 : hScore;
        m.homeScore = resolvedHScore;
        m.awayScore = aScore;
        m.status = "FINISHED";
        m.finishedAt = Date.now();

        const winner =
          resolvedHScore > aScore ? m.homeParticipant : m.awayParticipant;
        const loser =
          resolvedHScore > aScore ? m.awayParticipant : m.homeParticipant;
        m.winnerId = winner?.id || null;
        m.loserId = loser?.id || null;

        const isGrandFinal =
          !m.nextMatchId || m.id.endsWith("_final") || m.branch === "FINAL";
        if (isGrandFinal) {
          tournament.champion = winner;
          tournament.status = "FINISHED";
          tournament.finishedAt = Date.now();
        } else if (m.nextMatchId && winner) {
          const nextM = tournament.matches.find(
            (nm) => nm.id === m.nextMatchId,
          );
          if (nextM) {
            if (m.nextSlotRole === "home") {
              nextM.homeParticipant = winner;
              nextM.hostId = winner.id;
              nextM.hostReady = true;
            } else {
              nextM.awayParticipant = winner;
              nextM.awayReady = true;
            }
            if (nextM.homeParticipant && nextM.awayParticipant) {
              nextM.status = "READY_TO_START";
            }
          }
        }
        advanced = true;
      }
    }
    if (advanced) {
      // Run iteratively if a newly advanced AI enabled another AI vs AI match
      this.autoSimulateAiMatches(tournament);
    }
  }

  // 12. Robust Withdraw from Tournament State Machine
  public static withdrawFromTournament(
    tournamentId: string,
    participantId: string,
  ): { success: boolean; message: string; tournament?: TournamentEntity } {
    const list = this.getAllTournaments();
    const index = list.findIndex((t) => t.id === tournamentId);
    if (index === -1) return { success: false, message: "البطولة غير موجودة" };

    const t = list[index];

    // If tournament already finished, nothing to withdraw from
    if (t.status === "FINISHED") {
      return { success: false, message: "البطولة منتهية بالفعل!" };
    }

    // Case A: Tournament is still in OPEN registration (Bracket not locked yet)
    if (
      t.status === "OPEN" ||
      t.status === "ALMOST_FULL" ||
      t.matches.length === 0
    ) {
      t.participants = t.participants.filter((p) => p.id !== participantId);
      t.currentParticipantsCount = t.participants.length;
      t.status = "OPEN";

      // Reassign host if creator left
      if (t.creatorId === participantId && t.participants.length > 0) {
        t.creatorId = t.participants[0].id;
        t.creatorName = t.participants[0].name;
        t.participants[0].isHost = true;
      }

      list[index] = t;
      this.saveTournaments(list);
      this.emit("TOURNAMENT_LEFT", {
        tournamentId,
        participantId,
        tournament: t,
      });
      return {
        success: true,
        message: "تم الانسحاب وتحرير مقعدك في البطولة بنجاح.",
        tournament: t,
      };
    }

    // Case B: Tournament is IN_PROGRESS (Active Bracket)
    // Mark participant as withdrawn
    const part = t.participants.find((p) => p.id === participantId);
    if (part) {
      part.isWithdrawn = true;
    }

    // Process all active/scheduled matches involving this withdrawn player
    for (const match of t.matches) {
      if (match.status !== "FINISHED") {
        const isHome = match.homeParticipant?.id === participantId;
        const isAway = match.awayParticipant?.id === participantId;

        if (isHome || isAway) {
          const opponent = isHome
            ? match.awayParticipant
            : match.homeParticipant;

          if (opponent && !opponent.isWithdrawn) {
            // Opponent gets walkover win 3-0
            match.homeScore = isHome ? 0 : 3;
            match.awayScore = isHome ? 3 : 0;
            match.status = "FINISHED";
            match.winnerId = opponent.id;
            match.loserId = participantId;
            match.finishedAt = Date.now();

            const isGrandFinal =
              !match.nextMatchId ||
              match.id.endsWith("_final") ||
              match.branch === "FINAL";
            if (isGrandFinal) {
              t.champion = opponent;
              t.status = "FINISHED";
              t.finishedAt = Date.now();
            } else if (match.nextMatchId) {
              const nextM = t.matches.find((nm) => nm.id === match.nextMatchId);
              if (nextM) {
                if (match.nextSlotRole === "home") {
                  nextM.homeParticipant = opponent;
                  nextM.hostId = opponent.id;
                  nextM.hostReady = opponent.isAi ? true : false;
                } else {
                  nextM.awayParticipant = opponent;
                  nextM.awayReady = opponent.isAi ? true : false;
                }
                if (nextM.homeParticipant && nextM.awayParticipant) {
                  nextM.status = "READY_TO_START";
                }
              }
            }
          } else {
            // Opponent is not yet determined in this slot
            if (isHome) match.homeParticipant = null;
            if (isAway) match.awayParticipant = null;
          }
        }
      }
    }

    // Progress any AI vs AI matches triggered by this walkover
    this.autoSimulateAiMatches(t);

    list[index] = t;
    this.saveTournaments(list);
    this.emit("TOURNAMENT_LEFT", {
      tournamentId,
      participantId,
      tournament: t,
    });
    return {
      success: true,
      message:
        "تم تسجيل انسحابك من البطولة وتأهيل المنافس تلقائياً مع استمرار باقي مباريات الكأس.",
      tournament: t,
    };
  }
}
