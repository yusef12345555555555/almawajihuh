// ============================================================
// العبها صح | EL3BHA SA7 - Core Type Definitions
// ============================================================

export type PlayerPosition =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "CDM"
  | "CM"
  | "CAM"
  | "RW"
  | "LW"
  | "ST";

export type PlayerRarity = "Normal" | "Rare" | "Elite" | "Legend" | "Icon";

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface FootballPlayer {
  id: string;
  name: string;
  nameAr: string;
  position: PlayerPosition;
  overallRating: number;
  nationality: string;
  nationalityAr: string;
  countryCode: string;
  era: string;
  club: string;
  clubAr: string;
  rarity: PlayerRarity;
  marketValue: number; // in Millions (e.g. 85 = 85M)
  photoUrl: string;
  attributes: PlayerAttributes;
  isSecret?: boolean;
  clues?: string[];
  descriptionAr?: string;
  /**
   * Optional full pre-designed card artwork (rating/name/stats already
   * baked into the image by an admin/designer). When set, PlayerCard
   * renders this image alone — no overlaid name/rating/attribute text —
   * because that information already lives in the image itself.
   */
  cardImageUrl?: string;
  /** السعر الفعلي اللي اتدفع للاعب ده في المزاد (بالمليون). مش موجود = مش اتشرى بمزاد. */
  paidPrice?: number;
  /** جه كلاعب بديل مجاني (مفيش سعر اتدفع) */
  acquiredFree?: boolean;
}

export interface Coach {
  id: string;
  name: string;
  nameAr: string;
  rating: number;
  nationality: string;
  nationalityAr: string;
  photoUrl: string;
  style:
    | "Tiki-Taka"
    | "High Press"
    | "Counter Attack"
    | "Park the Bus"
    | "Direct Play";
  styleAr: string;
  attackBonus: number;
  defenseBonus: number;
  possessionBonus: number;
  counterBonus: number;
  pressingBonus: number;
  chemistryBonus: number;
  preferredFormations: string[];
  marketValue: number;
  rarity: PlayerRarity;
  descriptionAr: string;
}

export type FormationType =
  | "4-3-3"
  | "4-4-2"
  | "4-2-3-1"
  | "3-5-2"
  | "5-3-2"
  | "3-4-3";

export interface SquadSlot {
  slotId: string;
  position: PlayerPosition;
  x: number; // Percentage on pitch (0-100)
  y: number; // Percentage on pitch (0-100)
  player: FootballPlayer | null;
}

export interface TeamSquad {
  id: string;
  userId: string;
  teamName: string;
  formation: FormationType;
  slots: SquadSlot[];
  coach: Coach | null;
  budgetRemaining: number;
  totalRating: number;
  attackRating: number;
  midfieldRating: number;
  defenseRating: number;
  chemistry: number;
}

// Auction States
export type AuctionState =
  | "WAITING"
  | "LOBBY"
  | "READY"
  | "COUNTDOWN"
  | "PLAYER_REVEAL"
  | "BIDDING"
  | "BID_LOCKED"
  | "WINNER_REVEAL"
  | "PLAYER_ASSIGNED"
  | "NEXT_ROUND"
  | "SQUAD_BUILDING"
  | "COACH_SELECTION"
  | "MATCH_PREPARATION"
  | "MATCH_RUNNING"
  | "RESULT"
  | "REWARDS"
  | "FINISHED";

export interface AuctionBid {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  amount: number;
  timestamp: number;
  sequence: number;
  isBot?: boolean;
}

export interface AuctionRoomSettings {
  initialBudget: number; // 100 or 200 (in Millions)
  squadSize: number; // 5 or 11
  bidTimerSeconds?: number; // e.g. 10s
  bidTimeLimitSeconds?: number;
  bidIncrement: number; // e.g. 5M
  aiDifficulty?: "Easy" | "Medium" | "Hard" | "Legend";
  allowHiddenPlayers?: boolean;
  fastBidConfirm: boolean;
  coachSelectionAllowed?: boolean;
  budgetMode?: "100M" | "200M";
  allowBots?: boolean;
  mysteryPlayerChance?: number;
  // Strategic Rules & Cards
  auctionStrategyMode?: "STANDARD" | "LAST_BID" | "STRATEGIC" | "CUSTOM";
  standardSkipEnabled?: boolean;
  lastBidEnabled?: boolean;
  wildCardEnabled?: boolean;
  noRiskEnabled?: boolean;
}

export interface RoomParticipant {
  userId: string;
  userName: string;
  userAvatar: string;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  budget: number;
  squad: FootballPlayer[];
  coach: Coach | null;
  hasSkippedCurrent?: boolean;
  lastValidBidInRound?: number;
  totalSpent: number;
  wildCardsAvailable?: number;
  hasUsedWildCard?: boolean;
  hasUsedNoRisk?: boolean;
}

export interface Room {
  id: string;
  code: string;
  name?: string;
  title?: string;
  gameType: GameModeId | string;
  hostId: string;
  hostName?: string;
  isPublic?: boolean;
  isPrivate?: boolean;
  maxPlayers?: number;
  maxParticipants?: number;
  currentParticipants?: number;
  participants: RoomParticipant[];
  status: "OPEN" | "IN_GAME" | "FINISHED" | "LOBBY";
  settings: AuctionRoomSettings;
  createdAt: number;
}

export type GameModeId =
  | "AUCTION"
  | "PLAYER_OR_HIDDEN"
  | "HOARTAGY_HUNTER"
  | "PLAYER_GUESS"
  | "SAFI"
  | "auction"
  | "hidden_player"
  | "truth_or_lie"
  | "coach_challenge"
  | "squad_builder"
  | "intelligence_match"
  | "tournament"
  | "AUCTION_100M"
  | "AUCTION_200M"
  | "YOU_ARE_THE_COACH"
  | "you_are_the_coach"
  | "DEAL_OR_NO_DEAL"
  | "deal_or_no_deal";

export interface GameModeInfo {
  id: GameModeId;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  descriptionAr: string;
  iconName: string;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: number;
  difficulty: "سهل" | "متوسط" | "صعب" | "أسطوري";
  rewardCoins: number;
  rewardXP: number;
  badge: string;
  color: string;
}

// Match Simulation
export type MatchEventType =
  | "KICKOFF"
  | "PASS"
  | "DRIBBLE"
  | "SHOT"
  | "SAVE"
  | "GOAL"
  | "ASSIST"
  | "CORNER"
  | "FOUL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "INTERCEPTION"
  | "HALFTIME"
  | "FULLTIME"
  | "PENALTY_GOAL"
  | "WOODWORK"
  | "INJURY";

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  teamId: "home" | "away";
  playerName: string;
  playerPhoto?: string;
  descriptionAr: string;
  scoreHome: number;
  scoreAway: number;
  highlightLevel: "low" | "medium" | "high" | "goal";
}

export interface MatchStats {
  homeScore: number;
  awayScore: number;
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeXG: number;
  awayXG: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  mvpPlayerName: string;
  mvpPlayer?: FootballPlayer;
  mvpRating: number;
  tacticalAnalysisAr: string[];
}

export interface MatchSimulationResult {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeSquad: FootballPlayer[];
  awaySquad: FootballPlayer[];
  homeCoach: Coach | null;
  awayCoach: Coach | null;
  events: MatchEvent[];
  stats: MatchStats;
  winner: "home" | "away" | "draw";
  randomSeed: number;
  gameVersion: string;
}

// Chat & Social
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  reaction?: string;
}

// Tournament
export interface TournamentMatch {
  id: string;
  round: number; // 1 = Quarter, 2 = Semi, 3 = Final
  matchNumber: number;
  homePlayer: RoomParticipant | null;
  awayPlayer: RoomParticipant | null;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string;
  status: "PENDING" | "PLAYING" | "FINISHED";
}

export interface Tournament {
  id: string;
  name: string;
  totalPlayers: 8 | 16;
  participants: RoomParticipant[];
  matches: TournamentMatch[];
  currentRound: number;
  winner: RoomParticipant | null;
  prizePool: number;
  status: "REGISTRATION" | "IN_PROGRESS" | "COMPLETED";
}

// User Profile & Achievements
export interface UserProfile {
  id: string;
  playerId?: string; // Player ID (e.g. EL3B-7824)
  username: string;
  nameAr: string;
  avatar: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  coins: number;
  tickets: number;
  points: number; // Universal Game Completion Points (+10 per game)
  rating: number; // ELO rating (e.g. 1450)
  rankTier: "برونزي" | "فضي" | "ذهبي" | "بلاتيني" | "أساطير النخبة" | string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  auctionsWon: number;
  favoritePlayer: string;
  favoriteClub: string;
  soundEnabled: boolean;
  fastBiddingEnabled: boolean;
  achievements: Achievement[];
  /** Real consecutive-win streak, positive while winning; reset to 0 on any loss or draw. */
  currentStreak: number;
  inventory?: string[]; // IDs of owned cosmetic items
  equippedCosmetics?: EquippedCosmetics;
}

// Social & Friends System Types
export type UserOnlineStatus = "ONLINE" | "OFFLINE" | "IN_MATCH";

export interface FriendUser {
  id: string;
  playerId: string; // e.g. EL3B-1092
  username: string;
  nameAr: string;
  avatar: string;
  rating: number;
  rankTier: string;
  status: UserOnlineStatus;
  lastActive: string;
  favoriteClub?: string;
  favoritePlayer?: string;
  bio?: string;
  winRate?: number;
}

export type FriendRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "BLOCKED";

export interface FriendRequest {
  id: string;
  senderId: string;
  senderPlayerId: string;
  senderName: string;
  senderAvatar: string;
  senderRating: number;
  receiverId: string;
  status: FriendRequestStatus;
  timestamp: number;
  direction: "INCOMING" | "OUTGOING";
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface ChatConversation {
  id: string;
  friendId: string;
  friendPlayerId: string;
  friendName: string;
  friendAvatar: string;
  friendStatus: UserOnlineStatus;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: DirectMessage[];
}

export interface Achievement {
  id: string;
  titleAr: string;
  descriptionAr: string;
  icon: string;
  rewardCoins: number;
  rewardXP: number;
  unlocked: boolean;
  claimed?: boolean;
  progress: number;
  maxProgress: number;
}

export interface DailyChallenge {
  id: string;
  titleAr: string;
  descriptionAr: string;
  rewardCoins: number;
  rewardXP: number;
  completed: boolean;
  progress: number;
  total: number;
}

// ============================================================
// Real Notification System (Supabase Realtime + Push)
// ============================================================

export type NotificationType =
  | "MATCH_RESULT"
  | "OPPONENT_FOUND"
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "GAME_INVITE"
  | "TOURNAMENT_UPDATE"
  | "COACH_EVENT"
  | "SYSTEM_UPDATE"
  | "ANNOUNCEMENT"
  | "ADMIN";

/** Where a notification should take the player when tapped. */
export interface NotificationDeepLink {
  screen?: string; // matches an `activeTab` value in App.tsx
  matchId?: string;
  friendRequestId?: string;
  tournamentId?: string;
  [key: string]: unknown;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  recipientPlayerId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationDeepLink;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  masterEnabled: boolean;
  matches: boolean;
  matchmaking: boolean;
  invites: boolean;
  friends: boolean;
  tournaments: boolean;
  coachMode: boolean;
  updates: boolean;
  announcements: boolean;
}

/** Maps a NotificationType to the preference category that gates it. */
export const NOTIFICATION_TYPE_CATEGORY: Record<
  NotificationType,
  keyof Omit<NotificationPreferences, "masterEnabled">
> = {
  MATCH_RESULT: "matches",
  OPPONENT_FOUND: "matchmaking",
  FRIEND_REQUEST: "friends",
  FRIEND_ACCEPTED: "friends",
  GAME_INVITE: "invites",
  TOURNAMENT_UPDATE: "tournaments",
  COACH_EVENT: "coachMode",
  SYSTEM_UPDATE: "updates",
  ANNOUNCEMENT: "announcements",
  ADMIN: "announcements",
};

// ============================================================
// Real Multiplayer Matchmaking & Cosmetics
// ============================================================

export type CosmeticCategory =
  | "NAME_STYLE"
  | "CROWN_BADGE"
  | "FRAME_BORDER"
  | "ENTRANCE_EFFECT"
  | "TACTICAL_TITLE";

export type CosmeticRarity =
  | "COMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY"
  | "MYTHIC";

export type MarketCategory = "AVATAR_FRAME" | "NAME_FRAME" | "ENTRANCE" | "PITCH_SKIN";

/** عنصر في السوق — بيتضاف من لوحة الإدارة فقط. */
export interface MarketItem {
  id: string;
  category: MarketCategory;
  nameAr: string;
  price: number;
  imageUrl: string; // إطار/دخلة/أرضية (11 لاعب)
  imageUrlAlt?: string; // أرضية 5 لاعبين (اختياري)
  scale: number; // حجم إطار الصورة نسبةً لحجم الصورة (افتراضي 1.3)
  isActive: boolean;
  sortOrder: number;
}

export interface EquippedCosmetics {
  avatarFrame?: string; // MarketItem.id
  nameFrame?: string;
  entrance?: string;
  pitchSkin?: string;
}

export interface PlayerSnapshot {
  playerId: string; // e.g. ELM27
  id: string; // matches game_users.id
  name: string;
  nameAr: string;
  avatar: string;
  rating?: number;
  equippedCosmetics?: EquippedCosmetics;
}

export type MatchmakingStatus =
  | "SEARCHING"
  | "MATCHED"
  | "CANCELLED"
  | "EXPIRED";

export interface MatchmakingTicket {
  id: string;
  playerId: string;
  playerSnapshot: PlayerSnapshot;
  gameMode: string;
  status: MatchmakingStatus;
  matchedWith?: string;
  opponentSnapshot?: PlayerSnapshot;
  createdAt: string;
}

export type MatchInviteStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface MatchInvite {
  id: string;
  senderId: string;
  senderSnapshot: PlayerSnapshot;
  recipientId: string;
  gameMode: string;
  status: MatchInviteStatus;
  createdAt: string;
}
