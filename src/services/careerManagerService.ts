// ============================================================
// أنت المدرب | نظام هوية المدرب الدائمة + السجل التاريخي للمسيرة
// Persistent Manager Identity, Career History & Global Statistics
//
// This is the single source of truth for everything that must
// survive a resignation ("استقالة") and everything that must
// survive normal exit/refresh/restart:
//   - Manager identity (name, photo, nationality, reputation, rating)
//   - Game Points (progression currency – MAY reset on resignation)
//   - Career History (archived jobs – NEVER reset on resignation)
//
// It intentionally does NOT touch the existing active-career
// storage key used by YouAreTheCoachGameView (STORAGE_KEY =
// 'YOU_ARE_THE_COACH_SAVED_CAREER_V1'). That key remains the
// single source of truth for the CURRENT job. This service only
// tracks the manager's permanent identity + everything that
// happened before the current job.
// ============================================================

import { CoachSeasonState, TrophyCabinetItem } from '../types/coachGameTypes';

// ------------------------------------------------------------
// Storage Keys
// ------------------------------------------------------------
const MANAGER_PROFILE_KEY = 'coach_manager_profile_v1';
const CAREER_HISTORY_KEY = 'coach_manager_career_history_v1';
const ACTIVE_JOB_META_KEY = 'coach_active_job_meta_v1';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
export interface ManagerProfileData {
  managerId: string;
  name: string;
  photoUrl: string | null; // base64 data URL, persisted locally
  nationality: string; // display name (Arabic)
  nationalityCode: string; // ISO-ish code used internally
  reputation: number; // 0-100, long-term
  rating: number; // 0-99, manager rating
  gamePoints: number; // progression currency – resettable
  createdAt: string;
}

export interface ActiveJobMeta {
  jobId: string;
  teamId: string;
  teamType: 'CLUB' | 'NATIONAL_TEAM';
  startDate: string; // ISO date
  startedSeasonLabel: string;
}

export interface CareerJobRecord {
  jobId: string;
  teamId: string;
  teamName: string;
  teamNameAr: string;
  teamType: 'CLUB' | 'NATIONAL_TEAM';
  competitionTitleAr: string;
  startDate: string;
  endDate: string | null; // null only while active; archived records always have a value
  status: 'ACTIVE' | 'RESIGNED';
  departureReasonAr: 'دلوقتي' | 'استقال';
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  trophies: TrophyCabinetItem[];
  finalPosition?: number;
}

export interface GlobalManagerStats {
  totalClubs: number;
  totalNationalTeams: number;
  totalMatches: number;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  totalGoalsFor: number;
  totalGoalsAgainst: number;
  goalDifference: number;
  winPercentage: number;
  totalTrophies: number;
  biggestWin: { label: string; diff: number } | null;
  biggestDefeat: { label: string; diff: number } | null;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const defaultProfile = (): ManagerProfileData => ({
  managerId: uid(),
  name: 'المدرب',
  photoUrl: null,
  nationality: 'مصر',
  nationalityCode: 'EG',
  reputation: 50,
  rating: 70,
  gamePoints: 0,
  createdAt: new Date().toISOString()
});

// ------------------------------------------------------------
// Manager Profile (persists across resignation, exit, restart)
// ------------------------------------------------------------
export function getManagerProfile(): ManagerProfileData {
  const existing = safeParse<ManagerProfileData | null>(localStorage.getItem(MANAGER_PROFILE_KEY), null);
  if (existing && existing.managerId) return existing;
  const created = defaultProfile();
  localStorage.setItem(MANAGER_PROFILE_KEY, JSON.stringify(created));
  return created;
}

export function saveManagerProfile(patch: Partial<Omit<ManagerProfileData, 'managerId' | 'createdAt'>>): ManagerProfileData {
  const current = getManagerProfile();
  const updated: ManagerProfileData = { ...current, ...patch };
  localStorage.setItem(MANAGER_PROFILE_KEY, JSON.stringify(updated));
  return updated;
}

/** Adds (or subtracts, if negative) Game Points. Never goes below 0. Does NOT touch career stats. */
export function addGamePoints(delta: number): ManagerProfileData {
  const current = getManagerProfile();
  const nextPoints = Math.max(0, Math.round(current.gamePoints + delta));
  return saveManagerProfile({ gamePoints: nextPoints });
}

/** Resets ONLY game points (progression currency). Career statistics are untouched. */
function resetGamePoints(): ManagerProfileData {
  return saveManagerProfile({ gamePoints: 0 });
}

// ------------------------------------------------------------
// Active Job Meta (tracks start date/id of the CURRENT job so it
// can be correctly archived when the manager resigns)
// ------------------------------------------------------------
export function getActiveJobMeta(): ActiveJobMeta | null {
  return safeParse<ActiveJobMeta | null>(localStorage.getItem(ACTIVE_JOB_META_KEY), null);
}

function setActiveJobMeta(meta: ActiveJobMeta | null) {
  if (meta) {
    localStorage.setItem(ACTIVE_JOB_META_KEY, JSON.stringify(meta));
  } else {
    localStorage.removeItem(ACTIVE_JOB_META_KEY);
  }
}

/**
 * Call whenever a career is active on screen (on load + right after
 * creating a new career). If the active job meta doesn't match the
 * team currently being managed, a fresh job record is started —
 * this only happens when a genuinely new job begins (a brand new
 * career object was created), never on simple navigation/refresh.
 */
export function ensureActiveJobMeta(career: CoachSeasonState): ActiveJobMeta {
  const existing = getActiveJobMeta();
  if (existing && existing.teamId === career.userTeam.id) {
    return existing;
  }
  const meta: ActiveJobMeta = {
    jobId: uid(),
    teamId: career.userTeam.id,
    teamType: career.userTeam.isNationalTeam ? 'NATIONAL_TEAM' : 'CLUB',
    startDate: new Date().toISOString(),
    startedSeasonLabel: new Date().getFullYear().toString()
  };
  setActiveJobMeta(meta);
  return meta;
}

// ------------------------------------------------------------
// Career History (PERMANENT — never cleared by resignation)
// ------------------------------------------------------------
export function getCareerHistory(): CareerJobRecord[] {
  return safeParse<CareerJobRecord[]>(localStorage.getItem(CAREER_HISTORY_KEY), []);
}

function appendToHistory(record: CareerJobRecord) {
  const history = getCareerHistory();
  history.push(record);
  localStorage.setItem(CAREER_HISTORY_KEY, JSON.stringify(history));
}

/** Extracts matches/W/D/L/goals for the user's team from whatever the current career object actually recorded. */
function extractCurrentJobStats(career: CoachSeasonState): {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  finalPosition?: number;
} {
  if (career.competitionType === 'LEAGUE' && career.standings) {
    const row = career.standings.find((r) => r.teamId === career.userTeam.id);
    if (row) {
      const finalPosition = [...career.standings]
        .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference)
        .findIndex((r) => r.teamId === career.userTeam.id) + 1;
      return {
        matches: row.played,
        wins: row.won,
        draws: row.drawn,
        losses: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        finalPosition: finalPosition || undefined
      };
    }
  }

  if (career.competitionType === 'TOURNAMENT' && career.tournamentRounds) {
    let matches = 0, wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    for (const round of career.tournamentRounds) {
      for (const m of round.matches) {
        if (!m.played) continue;
        const isHome = m.homeTeamId === career.userTeam.id;
        const isAway = m.awayTeamId === career.userTeam.id;
        if (!isHome && !isAway) continue;
        matches++;
        const gf = isHome ? m.homeScore : m.awayScore;
        const ga = isHome ? m.awayScore : m.homeScore;
        goalsFor += gf;
        goalsAgainst += ga;
        if (gf > ga) wins++;
        else if (gf === ga) draws++;
        else losses++;
      }
    }
    return { matches, wins, draws, losses, goalsFor, goalsAgainst };
  }

  return { matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
}

/**
 * Archives the CURRENT job into permanent Career History with
 * departure reason "استقال", then resets Game Points only.
 * Career statistics (matches/wins/draws/losses/goals/trophies)
 * are preserved forever inside the returned record.
 *
 * This does NOT clear the active career object itself — the
 * caller is responsible for clearing the active-career storage
 * key (STORAGE_KEY) after calling this function.
 */
export function resignFromCurrentJob(career: CoachSeasonState): CareerJobRecord {
  const meta = ensureActiveJobMeta(career);
  const stats = extractCurrentJobStats(career);

  const record: CareerJobRecord = {
    jobId: meta.jobId,
    teamId: career.userTeam.id,
    teamName: career.userTeam.name,
    teamNameAr: career.userTeam.nameAr,
    teamType: meta.teamType,
    competitionTitleAr: career.competitionTitleAr,
    startDate: meta.startDate,
    endDate: new Date().toISOString(),
    status: 'RESIGNED',
    departureReasonAr: 'استقال',
    matches: stats.matches,
    wins: stats.wins,
    draws: stats.draws,
    losses: stats.losses,
    goalsFor: stats.goalsFor,
    goalsAgainst: stats.goalsAgainst,
    trophies: career.trophiesWon || [],
    finalPosition: stats.finalPosition
  };

  appendToHistory(record);
  setActiveJobMeta(null);
  resetGamePoints();

  return record;
}

// ------------------------------------------------------------
// Global & Per-Club Statistics — always derived from real records,
// never hard-coded.
// ------------------------------------------------------------
export function computeGlobalStats(liveCareer?: CoachSeasonState | null): GlobalManagerStats {
  const history = getCareerHistory();
  const rows: CareerJobRecord[] = [...history];

  // Include the currently active job's live stats too, so the
  // profile reflects "so far" totals without needing to resign first.
  if (liveCareer) {
    const meta = ensureActiveJobMeta(liveCareer);
    const stats = extractCurrentJobStats(liveCareer);
    rows.push({
      jobId: meta.jobId,
      teamId: liveCareer.userTeam.id,
      teamName: liveCareer.userTeam.name,
      teamNameAr: liveCareer.userTeam.nameAr,
      teamType: meta.teamType,
      competitionTitleAr: liveCareer.competitionTitleAr,
      startDate: meta.startDate,
      endDate: null,
      status: 'ACTIVE',
      departureReasonAr: 'دلوقتي',
      matches: stats.matches,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      trophies: liveCareer.trophiesWon || []
    });
  }

  const uniqueTeams = new Set(rows.map((r) => r.teamId));
  const clubTeams = new Set(rows.filter((r) => r.teamType === 'CLUB').map((r) => r.teamId));
  const nationalTeams = new Set(rows.filter((r) => r.teamType === 'NATIONAL_TEAM').map((r) => r.teamId));

  let totalMatches = 0, totalWins = 0, totalDraws = 0, totalLosses = 0, totalGoalsFor = 0, totalGoalsAgainst = 0, totalTrophies = 0;
  let biggestWin: { label: string; diff: number } | null = null;
  let biggestDefeat: { label: string; diff: number } | null = null;

  for (const r of rows) {
    totalMatches += r.matches;
    totalWins += r.wins;
    totalDraws += r.draws;
    totalLosses += r.losses;
    totalGoalsFor += r.goalsFor;
    totalGoalsAgainst += r.goalsAgainst;
    totalTrophies += r.trophies?.length || 0;

    const diff = r.goalsFor - r.goalsAgainst;
    if (r.wins > 0 && (!biggestWin || diff > biggestWin.diff)) {
      biggestWin = { label: `${r.teamNameAr}`, diff };
    }
    if (r.losses > 0 && (!biggestDefeat || diff < biggestDefeat.diff)) {
      biggestDefeat = { label: `${r.teamNameAr}`, diff };
    }
  }

  void uniqueTeams;

  return {
    totalClubs: clubTeams.size,
    totalNationalTeams: nationalTeams.size,
    totalMatches,
    totalWins,
    totalDraws,
    totalLosses,
    totalGoalsFor,
    totalGoalsAgainst,
    goalDifference: totalGoalsFor - totalGoalsAgainst,
    winPercentage: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 1000) / 10 : 0,
    totalTrophies,
    biggestWin,
    biggestDefeat
  };
}

export function computeClubStats(teamId: string, liveCareer?: CoachSeasonState | null): CareerJobRecord[] {
  const history = getCareerHistory().filter((r) => r.teamId === teamId);
  if (liveCareer && liveCareer.userTeam.id === teamId) {
    const meta = ensureActiveJobMeta(liveCareer);
    const stats = extractCurrentJobStats(liveCareer);
    history.push({
      jobId: meta.jobId,
      teamId,
      teamName: liveCareer.userTeam.name,
      teamNameAr: liveCareer.userTeam.nameAr,
      teamType: meta.teamType,
      competitionTitleAr: liveCareer.competitionTitleAr,
      startDate: meta.startDate,
      endDate: null,
      status: 'ACTIVE',
      departureReasonAr: 'دلوقتي',
      matches: stats.matches,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      trophies: liveCareer.trophiesWon || []
    });
  }
  return history;
}

/** Full chronological timeline: archived history + the live job (if any), oldest first. */
export function getCareerTimeline(liveCareer?: CoachSeasonState | null): CareerJobRecord[] {
  const history = [...getCareerHistory()];
  if (liveCareer) {
    const meta = ensureActiveJobMeta(liveCareer);
    const stats = extractCurrentJobStats(liveCareer);
    history.push({
      jobId: meta.jobId,
      teamId: liveCareer.userTeam.id,
      teamName: liveCareer.userTeam.name,
      teamNameAr: liveCareer.userTeam.nameAr,
      teamType: meta.teamType,
      competitionTitleAr: liveCareer.competitionTitleAr,
      startDate: meta.startDate,
      endDate: null,
      status: 'ACTIVE',
      departureReasonAr: 'دلوقتي',
      matches: stats.matches,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      trophies: liveCareer.trophiesWon || []
    });
  }
  return history.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export const NATIONALITY_OPTIONS: { code: string; nameAr: string }[] = [
  { code: 'EG', nameAr: 'مصر' },
  { code: 'SA', nameAr: 'السعودية' },
  { code: 'AE', nameAr: 'الإمارات' },
  { code: 'MA', nameAr: 'المغرب' },
  { code: 'DZ', nameAr: 'الجزائر' },
  { code: 'TN', nameAr: 'تونس' },
  { code: 'IQ', nameAr: 'العراق' },
  { code: 'JO', nameAr: 'الأردن' },
  { code: 'QA', nameAr: 'قطر' },
  { code: 'KW', nameAr: 'الكويت' },
  { code: 'LB', nameAr: 'لبنان' },
  { code: 'SY', nameAr: 'سوريا' },
  { code: 'PS', nameAr: 'فلسطين' },
  { code: 'SD', nameAr: 'السودان' },
  { code: 'LY', nameAr: 'ليبيا' },
  { code: 'ES', nameAr: 'إسبانيا' },
  { code: 'GB', nameAr: 'إنجلترا' },
  { code: 'FR', nameAr: 'فرنسا' },
  { code: 'DE', nameAr: 'ألمانيا' },
  { code: 'IT', nameAr: 'إيطاليا' },
  { code: 'PT', nameAr: 'البرتغال' },
  { code: 'NL', nameAr: 'هولندا' },
  { code: 'BR', nameAr: 'البرازيل' },
  { code: 'AR', nameAr: 'الأرجنتين' }
];
