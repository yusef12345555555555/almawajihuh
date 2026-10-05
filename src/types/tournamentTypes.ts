// ============================================================
// العبها صح | EL3BHA SA7 - Comprehensive Tournament Types & Schemas
// ============================================================

export type TournamentGameId =
  | "AUCTION"
  | "PLAYER_OR_HIDDEN"
  | "HOARTAGY_HUNTER"
  | "PLAYER_GUESS"
  | "SAFI"
  | "DEAL_OR_NO_DEAL";

export type TournamentType = "INDIVIDUAL" | "TEAM";

export type TournamentStatus =
  | "OPEN"
  | "ALMOST_FULL"
  | "FULL"
  | "STARTING"
  | "IN_PROGRESS"
  | "SEMIFINAL"
  | "FINAL"
  | "FINISHED"
  | "CANCELLED";

export interface TournamentParticipant {
  id: string;
  name: string;
  avatar: string;
  isHost?: boolean;
  isTeam?: boolean;
  teamMembers?: string[];
  teamCaptain?: string;
  clubId?: string;
  badgeEmoji?: string;
  rating?: number;
  isAi?: boolean;
  isWithdrawn?: boolean;
}

export interface TournamentMatchSlot {
  id: string;
  round: number; // 1 = Quarterfinals, 2 = Semifinals, 3 = Final
  roundNameAr: string; // 'ربع النهائي' | 'نصف النهائي' | 'النهائي الكبير'
  matchIndex: number; // 0, 1, 2, 3 in Quarterfinals, 0, 1 in Semifinals, 0 in Final
  branch: "LEFT" | "RIGHT" | "FINAL";
  homeParticipant: TournamentParticipant | null;
  awayParticipant: TournamentParticipant | null;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerId?: string | null;
  loserId?: string | null;
  status: "SCHEDULED" | "READY_TO_START" | "PLAYING" | "FINISHED";
  nextMatchId?: string; // Target match slot for the winner
  nextSlotRole?: "home" | "away";
  matchSessionId: string;
  hostId: string; // The host participant ID
  hostReady: boolean;
  awayReady: boolean;
  startedAt?: number;
  finishedAt?: number;
}

export interface TournamentEntity {
  id: string;
  name: string;
  gameId: TournamentGameId;
  gameNameAr: string;
  gameMode: string;
  gameModeLabelAr: string;
  /** Per-decision thinking time in seconds, chosen once at creation time.
   *  Used by games like "ديل أو نو ديل" so every match in the tournament
   *  starts directly instead of re-asking each time. */
  turnSeconds?: number;
  type: TournamentType; // 'INDIVIDUAL' | 'TEAM'
  capacity: 4 | 8 | 16 | 32;
  currentParticipantsCount: number;
  status: TournamentStatus;
  creatorId: string;
  creatorName: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  descriptionAr: string;
  prizePoolCoins: number;
  prizePoolPoints: number;
  participants: TournamentParticipant[];
  matches: TournamentMatchSlot[];
  champion: TournamentParticipant | null;
  rulesAr: string[];
}
