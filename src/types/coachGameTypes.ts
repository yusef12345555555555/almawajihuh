// ============================================================
// أنت المدرب | YOU ARE THE COACH - Game Type Definitions
// ============================================================

export type CoachPosition = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'RW' | 'LW' | 'ST';

export interface CoachSquadPlayer {
  id: string;
  name: string;
  nameAr: string;
  position: CoachPosition;
  rating: number; // 70-94
  potential?: number; // 75-99
  age: number;
  fitness: number; // 0 - 100%
  morale?: number; // 0 - 100%
  form?: number; // 1 - 10
  attack: number;
  defense: number;
  passing: number;
  dribbling?: number;
  shooting?: number;
  pace: number;
  physical: number;
  preferredPosition?: CoachPosition;
  preferredFoot?: 'LEFT' | 'RIGHT' | 'BOTH';
  marketValue?: number; // in Millions EUR
  wageWeekly?: number; // in Thousands EUR
  contractYears?: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  injuryStatus?: {
    type: string;
    typeAr: string;
    weeksRemaining: number;
    isMatchDayInjured?: boolean;
    descriptionAr?: string;
  };
  suspensionStatus?: {
    matchesRemaining: number;
    reason: 'RED_CARD' | 'YELLOW_ACCUMULATION';
    reasonAr?: string;
  };
}

export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'LEGENDARY';

export type AIPersonalityType = 'AGGRESSIVE' | 'DEFENSIVE' | 'POSSESSION' | 'COUNTER' | 'BALANCED';

export type CoachGameplayMode = 'SOLO' | 'LOCAL_2P' | 'ROOM_ONLINE' | 'CUSTOM_MIXED';

export interface HumanPlayerSlot {
  id: string;
  playerNumber: number; // 1, 2, ...
  displayName: string;
  teamId: string;
  isHost?: boolean;
  tactics: UserTacticalSettings;
  avatarUrl?: string;
}

export interface ClubManagerInfo {
  name: string;
  nameAr: string;
  photoUrl: string;
  nationality: string;
  nationalityAr: string;
  preferredFormation: string;
  preferredStyle: string;
  tacticalMindset: number; // 80 - 99
  isCustom?: boolean;
  /** Career stats accumulated across seasons (real, persisted — not display-only). */
  matchesManaged?: number;
  trophiesWon?: number;
  reputation?: number;
}

export type CoachManagerProfile = ClubManagerInfo;

export interface CoachTeam {
  id: string;
  name: string;
  nameAr: string;
  shortName: string;
  leagueId: string;
  stadiumName: string;
  primaryColor: string; // hex
  secondaryColor: string; // hex
  logoUrl: string;
  overallRating: number;
  attackRating: number;
  midfieldRating: number;
  defenseRating: number;
  currentManager: ClubManagerInfo;
  manager?: ClubManagerInfo;
  /** Weekly training plan set via CoachTrainingModal; persisted per-team across the season. */
  trainingSchedule?: CoachTrainingSchedule;
  squad: CoachSquadPlayer[];
  startingXI: string[]; // 11 player IDs
  bench: string[]; // 7-9 player IDs
  formation: string; // e.g. '4-3-3'
  playingStyle: string; // e.g. 'Possession Football'
  isNationalTeam?: boolean;
  controllerType?: 'HUMAN' | 'AI';
  humanPlayerNumber?: number;
  humanPlayerName?: string;
  aiPersonality?: AIPersonalityType;
  aiDifficulty?: AIDifficulty;
  budget?: {
    transfer: number; // in Millions EUR
    wage: number; // in Thousands EUR weekly
  };
  boardExpectations?: {
    leagueObjective: string;
    leagueObjectiveAr: string;
    cupObjective: string;
    cupObjectiveAr: string;
    minPointsTarget?: number;
  };
  boardConfidence?: number; // 0-100%
  fanConfidence?: number; // 0-100%
  seasonObjectives?: string[];
  seasonObjectivesAr?: string[];
  captainId?: string;
  penaltyTakerId?: string;
  freeKickTakerId?: string;
  cornerTakerId?: string;
}

// Training System Types
export type TrainingFocusType =
  | 'FITNESS'
  | 'ATTACKING'
  | 'DEFENDING'
  | 'PASSING'
  | 'FINISHING'
  | 'PRESSING'
  | 'TACTICAL'
  | 'SET_PIECES'
  | 'RECOVERY';

export type TrainingIntensity = 'LIGHT' | 'NORMAL' | 'INTENSE';

export interface CoachTrainingSchedule {
  focus: TrainingFocusType;
  intensity: TrainingIntensity;
  lastCompletedMatchday?: number;
}

// Transfer Market Types
export interface TransferPlayerItem {
  player: CoachSquadPlayer;
  currentTeamId: string;
  currentTeamName: string;
  currentTeamNameAr: string;
  askingPrice: number; // millions
  weeklyWage: number; // thousands
  status: 'AVAILABLE' | 'LOAN_AVAILABLE' | 'UNAVAILABLE';
}

export interface TransferOffer {
  id: string;
  playerId: string;
  playerName: string;
  fromTeamId: string;
  targetTeamId: string;
  offeredFee: number;
  weeklyWage: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  messageAr: string;
}

// Opponent Scouting & Analysis
export interface OpponentScoutingReport {
  opponentTeam: CoachTeam;
  predictedFormation: string;
  predictedStyle: string;
  strengthsAr: string[];
  weaknessesAr: string[];
  topThreat: CoachSquadPlayer;
  winProbability: number;
  drawProbability: number;
  lossProbability: number;
  keyTacticalAdviceAr: string;
  weatherConditionAr: string;
  stadiumName: string;
}

// Trophy Room & Career History
export interface TrophyCabinetItem {
  id: string;
  competitionId?: string;
  competitionName: string;
  competitionNameAr: string;
  season: string;
  trophyIcon: string;
  teamId?: string;
  teamName?: string;
  teamNameAr: string;
  managerName?: string;
  dateWon?: string;
}

export interface ManagerCareerRecord {
  managerName: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  winPercentage: number;
  trophies: TrophyCabinetItem[];
  history: {
    teamName: string;
    teamNameAr: string;
    years: string;
    trophiesCount: number;
    matches: number;
  }[];
  reputation: number; // 0-100
}

export interface FormationSlotCoord {
  slotIndex: number;
  position: CoachPosition;
  roleAr: string;
  x: number; // 0-100% from left
  y: number; // 0-100% from top
}

export interface TacticalFormation {
  id: string;
  name: string;
  nameAr: string;
  descriptionAr: string;
  attackBonus: number;
  defenseBonus: number;
  midfieldBonus: number;
  widthBonus: number;
  counterBonus: number;
  slots: FormationSlotCoord[];
}

export interface PlayingStyleInfo {
  id: string;
  name: string;
  nameAr: string;
  descriptionAr: string;
  keyStrengthAr: string;
  weaknessAr: string;
  possessionModifier: number; // e.g. +10% or -8%
  chanceCreationModifier: number;
  counterVulnerability: number;
  fatigueModifier: number; // Stamina loss per match
  pressingModifier: number;
  suitableFormations: string[];
}

export interface CoachMatchEvent {
  minute: number;
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SAVE' | 'WOODWORK' | 'CHANCE' | 'INJURY' | 'SUB' | 'TACTICAL_CHANGE' | 'TACTICAL_REACTION';
  teamId: string;
  teamName: string;
  playerId?: string;
  playerName: string;
  assistPlayerName?: string;
  descriptionAr: string;
  tacticalShift?: {
    previousFormation?: string;
    newFormation?: string;
    managerName?: string;
    reasonAr?: string;
  };
}

export interface CoachMatchStats {
  possession: [number, number]; // [home, away] e.g. [55, 45]
  shots: [number, number];
  shotsOnTarget: [number, number];
  bigChances?: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
  passAccuracy: [number, number];
}

export interface CoachHalfTimeFeedback {
  whatIsWorkingAr: string[];
  whatIsNotWorkingAr: string[];
  momentumAr: string;
}

export interface CoachMatchResult {
  id: string;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  halfTimeScore?: [number, number];
  halfTimeStats?: CoachMatchStats;
  halfTimeEvents?: CoachMatchEvent[];
  halfTimeFeedback?: CoachHalfTimeFeedback;
  played: boolean;
  events: CoachMatchEvent[];
  stats: CoachMatchStats;
  manOfTheMatch?: {
    playerName: string;
    teamName: string;
    rating: number;
    goals: number;
    assists: number;
  };
  tacticalAnalysisAr?: string;
  penaltyScore?: [number, number];
  isExtraTime?: boolean;
}

export interface LeagueStandingRow {
  teamId: string;
  teamName: string;
  teamNameAr: string;
  logoUrl: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface CoachLeague {
  id: string;
  name: string;
  nameAr: string;
  country: string;
  countryAr: string;
  logoUrl: string;
  bannerUrl: string;
  reputation: number; // 1-5 stars
  teams: CoachTeam[];
  descriptionAr?: string;
}

export interface KnockoutMatch {
  id: string;
  roundNameAr: string;
  stage: 'R16' | 'QF' | 'SF' | 'FINAL';
  homeTeam: CoachTeam | null;
  awayTeam: CoachTeam | null;
  homeScore?: number;
  awayScore?: number;
  penaltyScore?: [number, number];
  winnerTeamId?: string;
  played: boolean;
  matchResult?: CoachMatchResult;
}

export type TournamentBracketRound = KnockoutMatch[];

export interface TournamentGroup {
  name: string;
  teams: CoachTeam[];
  standings: LeagueStandingRow[];
  fixtures: {
    round: number;
    homeTeamId: string;
    awayTeamId: string;
    played: boolean;
    homeScore?: number;
    awayScore?: number;
  }[];
}

export interface CoachTournament {
  id: string;
  name: string;
  nameAr: string;
  shortName?: string;
  type?: 'CLUB' | 'NATIONAL';
  logoUrl: string;
  bannerUrl: string;
  teamsCount?: number;
  format?: string;
  hasLeaguePhase?: boolean; // UEFA Champions League format
  participants?: CoachTeam[];
  teams?: CoachTeam[];
  currentStage?: 'LEAGUE_PHASE' | 'GROUPS' | 'R16' | 'QF' | 'SF' | 'FINAL' | 'COMPLETED';
  descriptionAr?: string;
}

export interface TacticalRoleDefinition {
  id: string;
  category: 'STRIKER' | 'MIDFIELD' | 'DEFENSE';
  name: string;
  nameAr: string;
  shortDescAr: string;
  tacticalImpactAr: string;
  suitablePositions: CoachPosition[];
  staminaDrainModifier: number; // e.g. 1.2 for Box-to-Box
  possessionModifier: number; // e.g. +3 for False 9
  chanceModifier: number;
}

export type TacticalCohesionLevel = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'WEAK' | 'POOR';

export interface TacticalCohesionResult {
  score: number; // 0 - 100
  level: TacticalCohesionLevel;
  levelAr: string; // 'ممتاز' | 'جيد' | 'متوسط' | 'ضعيف' | 'سيئ'
  issuesAr: string[];
  strengthsAr: string[];
  color: string;
}

export interface UserTacticalSettings {
  formation: string;
  playingStyle: string;
  mentality?: 'VERY_DEFENSIVE' | 'DEFENSIVE' | 'BALANCED' | 'ATTACKING' | 'ALL_OUT_ATTACK';
  attackingMentality?: 'VERY_DEFENSIVE' | 'DEFENSIVE' | 'BALANCED' | 'ATTACKING' | 'ALL_OUT_ATTACK';
  tempo: 'SLOW' | 'BALANCED' | 'FAST';
  defensiveLine?: 'DEEP' | 'BALANCED' | 'HIGH';
  pressingLine?: 'DEEP' | 'BALANCED' | 'HIGH';
  pressingIntensity?: 'LOW' | 'BALANCED' | 'HIGH' | 'INTENSE';
  width: 'NARROW' | 'BALANCED' | 'WIDE' | 'NORMAL';
  passingStyle?: 'SHORT' | 'DIRECT' | 'MIXED' | 'LONG';
  counterAttacking?: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  playerRoles?: Record<string, string>; // playerId -> roleId
}

export interface CoachScheduleMatch {
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamNameAr?: string;
  awayTeamNameAr?: string;
  homeScore: number;
  awayScore: number;
  played: boolean;
  matchResult?: CoachMatchResult;
}

export interface CoachTournamentMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamNameAr?: string;
  awayTeamNameAr?: string;
  homeScore: number;
  awayScore: number;
  played: boolean;
  penaltyScore?: [number, number];
  winnerTeamId?: string;
  matchResult?: CoachMatchResult;
}

export interface CoachTournamentRoundItem {
  roundName: string;
  roundNameAr: string;
  matches: CoachTournamentMatch[];
}

export type CoachCompetitionTier = 'LEAGUE' | 'DOMESTIC_CUP' | 'LEAGUE_CUP' | 'SUPER_CUP' | 'CONTINENTAL';

export interface CoachCalendarFixture {
  id: string;
  fixtureIndex: number;
  dateStr: string;
  daysRestSinceLastMatch: number;
  isCongested: boolean;
  competitionTier: CoachCompetitionTier;
  competitionId: string;
  competitionNameAr: string;
  competitionIcon: string;
  stageNameAr: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamNameAr: string;
  awayTeamNameAr: string;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
  isKnockout: boolean;
  isTwoLegged?: boolean;
  leg?: 1 | 2;
  aggregateScore?: [number, number];
  matchResult?: CoachMatchResult;
  selectedDifficulty?: AIDifficulty;
}

export interface CoachDomesticEcosystem {
  country: string;
  countryAr: string;
  leagueId: string;
  leagueNameAr: string;
  domesticCupId: string;
  domesticCupNameAr: string;
  domesticCupIcon: string;
  leagueCupId?: string;
  leagueCupNameAr?: string;
  leagueCupIcon?: string;
  superCupId?: string;
  superCupNameAr?: string;
  superCupIcon?: string;
  continentalSlots: {
    uclTeamsCount: number;
    uelTeamsCount: number;
    ueclTeamsCount: number;
  };
}

export interface CoachSeasonState {
  competitionType: 'LEAGUE' | 'TOURNAMENT';
  competitionId: string;
  competitionTitle: string;
  competitionTitleAr: string;
  userTeam: CoachTeam;
  userTactics: UserTacticalSettings;
  managerProfile: ClubManagerInfo;
  currentMatchday: number;
  totalMatchdays: number;
  managerPoints?: number; // نقاط المدرب (Currency earned through matches)
  calendarFixtures?: CoachCalendarFixture[]; // Unified multi-competition season calendar
  gameplayMode?: CoachGameplayMode;
  aiDifficulty?: AIDifficulty;
  roomCode?: string;
  humanPlayers?: HumanPlayerSlot[];
  activeHumanPlayerIndex?: number;
  standings?: LeagueStandingRow[];
  schedule?: CoachScheduleMatch[];
  tournamentRounds?: CoachTournamentRoundItem[];
  isCompleted: boolean;
  championTeamId?: string;
  championTeamName?: string;
  championTeamNameAr?: string;
  allTeams: CoachTeam[];
  // Football Manager Simulation Extensions
  trainingSchedule?: CoachTrainingSchedule;
  transferOffers?: TransferOffer[];
  boardConfidence?: number; // 0-100%
  fanConfidence?: number; // 0-100%
  trophiesWon?: TrophyCabinetItem[];
  // Domestic cups / league cups / continental fixtures interleaved with
  // the league season (e.g. FA Cup + Carabao Cup for an English club).
  // Each entry knows exactly how many LEAGUE matchdays must be completed
  // before it becomes playable, and carries its own played/result state.
  domesticCupFixtures?: (CoachCalendarFixture & { triggerAfterMatchday: number })[];
  careerHistory?: {
    seasonYear: string;
    clubNameAr: string;
    position: number;
    points: number;
    trophyWon?: string;
  }[];
}

export interface CoachCareerState {
  careerId: string;
  mode: 'LEAGUE' | 'TOURNAMENT';
  competitionId: string;
  userTeamId: string;
  currentSeason: number;
  currentMatchday: number;
  totalMatchdays: number;
  userTactics: UserTacticalSettings;
  customManager?: ClubManagerInfo;
  fixtures: CoachMatchResult[];
  standings: LeagueStandingRow[];
  tournamentKnockouts?: KnockoutMatch[];
  tournamentGroups?: TournamentGroup[];
  isCompleted: boolean;
  championTeamId?: string;
  careerStats: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsScored: number;
    goalsConceded: number;
    cleanSheets: number;
    trophies: number;
  };
}
