// ============================================================
// لعبة "أنت المدرب" | You Are The Coach - Complete Management Mode
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  CoachLeague,
  CoachTournament,
  CoachTeam,
  CoachSeasonState,
  CoachMatchResult,
  UserTacticalSettings,
  CoachManagerProfile,
  CoachGameplayMode,
  AIDifficulty,
  TrophyCabinetItem,
  ManagerCareerRecord,
  CoachSquadPlayer,
  CoachCalendarFixture
} from '../types/coachGameTypes';
import { COACH_LEAGUES, COACH_TOURNAMENTS } from '../data/coachGameData';
import { COACH_FORMATIONS, COACH_PLAYING_STYLES } from '../data/coachFormationsAndStyles';
import { CoachSimulationEngine } from '../services/coachSimulationEngine';
import { CoachEcosystemService } from '../services/coachEcosystemService';
import { TacticsBoard } from './coach/TacticsBoard';
import { MatchCenterModal } from './coach/MatchCenterModal';
import { LeagueTableStandings } from './coach/LeagueTableStandings';
import { KnockoutBracketVisualizer } from './coach/KnockoutBracketVisualizer';
import { ManagerProfileEditor } from './coach/ManagerProfileEditor';
import { TrophyCelebrationModal } from './coach/TrophyCelebrationModal';
import { CoachGameModeSelectorModal } from './coach/CoachGameModeSelectorModal';
import { DualCoachPreMatchModal } from './coach/DualCoachPreMatchModal';
import { TakeOverClubView } from './TakeOverClubView';
import { ManagerOverviewTab } from './ManagerOverviewTab';
import { CoachTrainingModal } from './CoachTrainingModal';
import { CoachTransferModal } from './CoachTransferModal';
import { PreMatchScoutingModal } from './PreMatchScoutingModal';
import { CoachTrophyRoomModal } from './CoachTrophyRoomModal';
import { CoachCupFixturesModal } from './coach/CoachCupFixturesModal';
import { ResignationModal } from './coach/ResignationModal';
import { ManagerCareerHistoryPanel } from './coach/ManagerCareerHistoryPanel';
import { ManagerLeagueRankingPanel } from './coach/ManagerLeagueRankingPanel';
import { audioManager } from '../services/audioManager';
import {
  getManagerProfile,
  saveManagerProfile,
  ensureActiveJobMeta,
  getActiveJobMeta,
  resignFromCurrentJob,
  computeGlobalStats,
  getCareerTimeline,
  addGamePoints
} from '../services/careerManagerService';
import { getTransferWindowStatus, clearTransferWindow } from '../services/transferWindowService';
import {
  Trophy,
  Shield,
  Calendar,
  Users,
  Play,
  Award,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Swords,
  ChevronLeft,
  Flame,
  ArrowLeft,
  Sliders,
  Bot,
  User,
  Globe,
  Shuffle,
  Dumbbell,
  Briefcase,
  Search,
  CalendarDays,
  Home
} from 'lucide-react';

const STORAGE_KEY = 'YOU_ARE_THE_COACH_SAVED_CAREER_V1';

interface YouAreTheCoachGameViewProps {
  onBackToDiscovery: () => void;
  onMatchSimulationStateChange?: (isSimulating: boolean) => void;
}

export const YouAreTheCoachGameView: React.FC<YouAreTheCoachGameViewProps> = ({
  onBackToDiscovery,
  onMatchSimulationStateChange
}) => {
  // Game Navigation Stages: 'MENU' | 'SELECT_COMPETITION' | 'SELECT_TEAM' | 'TAKE_OVER' | 'DASHBOARD'
  const [stage, setStage] = useState<'MENU' | 'SELECT_COMPETITION' | 'SELECT_TEAM' | 'TAKE_OVER' | 'DASHBOARD'>('MENU');
  const [candidateTeam, setCandidateTeam] = useState<CoachTeam | null>(null);
  const [competitionCategory, setCompetitionCategory] = useState<'LEAGUE' | 'TOURNAMENT'>('LEAGUE');
  const [selectedLeague, setSelectedLeague] = useState<CoachLeague | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<CoachTournament | null>(null);
  const [teamSearchQuery, setTeamSearchQuery] = useState<string>('');

  // Active Career State
  const [career, setCareer] = useState<CoachSeasonState | null>(null);

  // Active Tab inside Dashboard: 'OVERVIEW' | 'TACTICS' | 'TABLE' | 'FIXTURES' | 'SQUAD' | 'MANAGER'
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TACTICS' | 'TABLE' | 'FIXTURES' | 'SQUAD' | 'MANAGER'>('OVERVIEW');

  // Active Match Simulation Modal
  const [activeMatchModal, setActiveMatchModal] = useState<{
    homeTeam: CoachTeam;
    awayTeam: CoachTeam;
    result?: CoachMatchResult;
    isKnockout?: boolean;
  } | null>(null);

  // Management Modals
  const [showTrainingModal, setShowTrainingModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showScoutingModal, setShowScoutingModal] = useState<boolean>(false);
  const [showTrophyRoomModal, setShowTrophyRoomModal] = useState<boolean>(false);

  // Trophy celebration modal
  const [showTrophyModal, setShowTrophyModal] = useState<boolean>(false);

  // Trophy cabinet history
  const [trophiesCabinet, setTrophiesCabinet] = useState<TrophyCabinetItem[]>([]);

  // Permanent manager identity (survives resignation, exit, restart)
  const [managerIdentity, setManagerIdentity] = useState(() => getManagerProfile());

  // Resignation flow ("استقالة") — must be explicit, never triggered by normal exit
  const [showResignationModal, setShowResignationModal] = useState<boolean>(false);

  // Domestic cup fixtures (FA Cup / Carabao Cup / etc.) viewer + active cup match
  const [showCupsFixturesModal, setShowCupsFixturesModal] = useState<boolean>(false);
  const [activeCupMatch, setActiveCupMatch] = useState<{
    fixtureId: string;
    homeTeam: CoachTeam;
    awayTeam: CoachTeam;
    result?: CoachMatchResult;
    isKnockout?: boolean;
  } | null>(null);

  // Multiplayer, Game Mode & AI Setup State
  const [selectedGameplayMode, setSelectedGameplayMode] = useState<CoachGameplayMode>('SOLO');
  const [selectedAIDifficulty, setSelectedAIDifficulty] = useState<AIDifficulty>('NORMAL');
  const [currentRoomCode, setCurrentRoomCode] = useState<string>(
    `COACH-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [showGameModeModal, setShowGameModeModal] = useState<boolean>(false);
  const [preMatchData, setPreMatchData] = useState<{
    homeTeam: CoachTeam;
    awayTeam: CoachTeam;
    isKnockout: boolean;
  } | null>(null);

  // Load saved career from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: CoachSeasonState = JSON.parse(saved);
        // HARD SAFETY: a stale save could contain an injured/suspended
        // player inside the Starting XI (e.g. from before this fix
        // existed) — repair it immediately on load, before it's ever
        // shown or used in a match.
        parsed.userTeam = CoachSimulationEngine.sanitizeTeamForMatch(parsed.userTeam);
        setCareer(parsed);
        setTrophiesCabinet(parsed.trophiesWon || []);
        // Register/confirm this job's identity for permanent history tracking.
        // This NEVER resets or creates a new career — it only ensures the
        // active job has a start date recorded for accurate archiving later.
        ensureActiveJobMeta(parsed);
      }
    } catch (e) {
      console.error('Error loading saved career:', e);
    }
  }, []);

  // Sync active match simulation state with parent app to control FloatingChat
  useEffect(() => {
    onMatchSimulationStateChange?.(!!activeMatchModal);
    return () => {
      onMatchSimulationStateChange?.(false);
    };
  }, [activeMatchModal, onMatchSimulationStateChange]);

  // Persist trophies won this season into the actual career save file
  // itself (not just React state), so they survive refresh/restart.
  useEffect(() => {
    if (!career) return;
    const currentlySaved = JSON.stringify(career.trophiesWon || []);
    const inMemory = JSON.stringify(trophiesCabinet);
    if (currentlySaved !== inMemory) {
      const merged: CoachSeasonState = { ...career, trophiesWon: trophiesCabinet };
      setCareer(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trophiesCabinet]);

  // Save career state whenever it changes
  // Save career state whenever it changes. Accepts either a full object
  // or an updater function — the updater form is REQUIRED whenever more
  // than one saveCareer(...) call can fire in the same event/tick (e.g.
  // formation change + tactics change together), because two calls that
  // each spread a stale `career` closure variable would otherwise silently
  // overwrite each other and drop one of the two changes.
  const saveCareer = (
    newCareer: CoachSeasonState | null | ((prev: CoachSeasonState | null) => CoachSeasonState | null)
  ) => {
    setCareer((prevCareer) => {
      const resolved = typeof newCareer === 'function' ? (newCareer as (p: CoachSeasonState | null) => CoachSeasonState | null)(prevCareer) : newCareer;
      if (resolved) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      return resolved;
    });
  };

  // Start new career setup
  const handleStartNewMode = (type: 'LEAGUE' | 'TOURNAMENT') => {
    setCompetitionCategory(type);
    setStage('SELECT_COMPETITION');
    audioManager.playClick();
  };

  const handleSelectLeague = (league: CoachLeague) => {
    setSelectedLeague(league);
    setSelectedTournament(null);
    setStage('SELECT_TEAM');
    audioManager.playClick();
  };

  const handleSelectTournament = (tourn: CoachTournament) => {
    setSelectedTournament(tourn);
    setSelectedLeague(null);
    setStage('SELECT_TEAM');
    audioManager.playClick();
  };

  const handleInitiateTakeover = (chosenTeam: CoachTeam) => {
    setCandidateTeam(chosenTeam);
    setStage('TAKE_OVER');
    audioManager.playClick();
  };

  // Initialize Career when team is chosen
  const handleSelectTeam = (
    chosenTeam: CoachTeam,
    mode: CoachGameplayMode = selectedGameplayMode,
    difficulty: AIDifficulty = selectedAIDifficulty
  ) => {
    audioManager.playFanfare();

    const userTactics: UserTacticalSettings = {
      formation: chosenTeam.formation || '4-3-3',
      playingStyle: chosenTeam.playingStyle || 'POSSESSION',
      mentality: 'BALANCED',
      attackingMentality: 'BALANCED',
      pressingLine: 'HIGH',
      pressingIntensity: 'HIGH',
      width: 'NORMAL',
      tempo: 'FAST'
    };

    // Enrich squad with morale, fitness, form, and contracts if missing
    const enrichedSquad: CoachSquadPlayer[] = (chosenTeam.squad || []).map((p) => ({
      ...p,
      fitness: p.fitness ?? 95,
      morale: p.morale ?? 80,
      form: p.form ?? 75,
      contractYears: p.contractYears ?? 2,
      wageWeekly: p.wageWeekly ?? Math.max(10, Math.round(p.rating * 1.5))
    }));

    const userTeamCopy: CoachTeam = {
      ...JSON.parse(JSON.stringify(chosenTeam)),
      controllerType: 'HUMAN',
      squad: enrichedSquad,
      boardConfidence: chosenTeam.boardConfidence || 85,
      fanConfidence: chosenTeam.fanConfidence || 80,
      budget: chosenTeam.budget || {
        transfer: chosenTeam.isNationalTeam ? 0 : 85,
        wage: chosenTeam.isNationalTeam ? 0 : 750
      }
    };

    if (competitionCategory === 'LEAGUE' && selectedLeague) {
      // Setup League Career
      const teamsWithControllers: CoachTeam[] = selectedLeague.teams.map((t) => ({
        ...JSON.parse(JSON.stringify(t)),
        controllerType: t.id === chosenTeam.id ? 'HUMAN' : 'AI'
      }));

      const standings = CoachSimulationEngine.initializeStandings(teamsWithControllers);
      const schedule = CoachSimulationEngine.generateLeagueSchedule(teamsWithControllers, chosenTeam.id);

      // Domestic cups / league cups / continental fixtures for this
      // league (e.g. FA Cup + Carabao Cup for an English club),
      // interleaved at realistic points in the season. Only the
      // non-league entries are kept — our own randomized `schedule`
      // above remains the single source of truth for league matchdays.
      const unifiedCalendar = CoachEcosystemService.generateUnifiedSeasonCalendar(
        userTeamCopy,
        teamsWithControllers,
        selectedLeague.id
      );
      let leagueMatchdaysSeenSoFar = 0;
      const domesticCupFixtures: (CoachCalendarFixture & { triggerAfterMatchday: number })[] = [];
      unifiedCalendar.forEach((fixture) => {
        if (fixture.competitionTier === 'LEAGUE') {
          leagueMatchdaysSeenSoFar++;
          return;
        }
        domesticCupFixtures.push({ ...fixture, triggerAfterMatchday: leagueMatchdaysSeenSoFar });
      });

      const newCareer: CoachSeasonState = {
        competitionType: 'LEAGUE',
        competitionId: selectedLeague.id,
        competitionTitle: selectedLeague.name,
        competitionTitleAr: selectedLeague.nameAr,
        userTeam: userTeamCopy,
        userTactics,
        managerProfile: {
          ...(chosenTeam.manager || chosenTeam.currentManager),
          name: managerIdentity.name,
          nameAr: managerIdentity.name,
          photoUrl: managerIdentity.photoUrl || (chosenTeam.manager || chosenTeam.currentManager).photoUrl,
          nationality: managerIdentity.nationality,
          nationalityAr: managerIdentity.nationality,
          matchesManaged: (chosenTeam.manager || chosenTeam.currentManager).matchesManaged ?? 0,
          trophiesWon: (chosenTeam.manager || chosenTeam.currentManager).trophiesWon ?? 0,
          reputation: (chosenTeam.manager || chosenTeam.currentManager).reputation ?? (chosenTeam.manager || chosenTeam.currentManager).tacticalMindset
        },
        currentMatchday: 1,
        totalMatchdays: schedule.length,
        standings,
        schedule: schedule.map((s) => ({
          matchday: s.matchday,
          homeTeamId: s.homeTeam.id,
          awayTeamId: s.awayTeam.id,
          homeTeamName: s.homeTeam.name,
          awayTeamName: s.awayTeam.name,
          homeTeamNameAr: s.homeTeam.nameAr,
          awayTeamNameAr: s.awayTeam.nameAr,
          homeScore: 0,
          awayScore: 0,
          played: false
        })),
        isCompleted: false,
        allTeams: teamsWithControllers,
        gameplayMode: mode,
        aiDifficulty: difficulty,
        domesticCupFixtures,
        roomCode: currentRoomCode
      };

      ensureActiveJobMeta(newCareer);
      saveCareer(newCareer);
      setStage('DASHBOARD');
      setActiveTab('OVERVIEW');
    } else if (competitionCategory === 'TOURNAMENT' && selectedTournament) {
      // Setup Knockout Tournament Career
      const rawTeams = [...(selectedTournament.teams || selectedTournament.participants || [])];
      const teamsWithControllers: CoachTeam[] = rawTeams.map((t) => ({
        ...JSON.parse(JSON.stringify(t)),
        controllerType: t.id === chosenTeam.id ? 'HUMAN' : 'AI'
      }));

      // Shuffle teams
      const shuffled = [...teamsWithControllers].sort(() => 0.5 - Math.random());

      // Quarter-Finals pairing
      const qfMatches = [];
      for (let i = 0; i < 8; i += 2) {
        qfMatches.push({
          homeTeamId: shuffled[i].id,
          awayTeamId: shuffled[i + 1].id,
          homeTeamName: shuffled[i].name,
          awayTeamName: shuffled[i + 1].name,
          homeTeamNameAr: shuffled[i].nameAr,
          awayTeamNameAr: shuffled[i + 1].nameAr,
          homeScore: 0,
          awayScore: 0,
          played: false
        });
      }

      const newCareer: CoachSeasonState = {
        competitionType: 'TOURNAMENT',
        competitionId: selectedTournament.id,
        competitionTitle: selectedTournament.name,
        competitionTitleAr: selectedTournament.nameAr,
        userTeam: userTeamCopy,
        userTactics,
        managerProfile: {
          ...(chosenTeam.manager || chosenTeam.currentManager),
          name: managerIdentity.name,
          nameAr: managerIdentity.name,
          photoUrl: managerIdentity.photoUrl || (chosenTeam.manager || chosenTeam.currentManager).photoUrl,
          nationality: managerIdentity.nationality,
          nationalityAr: managerIdentity.nationality,
          matchesManaged: (chosenTeam.manager || chosenTeam.currentManager).matchesManaged ?? 0,
          trophiesWon: (chosenTeam.manager || chosenTeam.currentManager).trophiesWon ?? 0,
          reputation: (chosenTeam.manager || chosenTeam.currentManager).reputation ?? (chosenTeam.manager || chosenTeam.currentManager).tacticalMindset
        },
        currentMatchday: 1,
        totalMatchdays: 3, // QF, SF, Final
        tournamentRounds: [
          { roundName: 'Quarter-Finals', roundNameAr: 'ربع النهائي', matches: qfMatches },
          { roundName: 'Semi-Finals', roundNameAr: 'نصف النهائي', matches: [] },
          { roundName: 'Final', roundNameAr: 'النهائي الكبير', matches: [] }
        ],
        isCompleted: false,
        allTeams: teamsWithControllers,
        gameplayMode: mode,
        aiDifficulty: difficulty,
        roomCode: currentRoomCode
      };

      ensureActiveJobMeta(newCareer);
      saveCareer(newCareer);
      setStage('DASHBOARD');
      setActiveTab('OVERVIEW');
    }
  };

  // Launch the Next Matchday: Opens PreMatch Scouting or Dual Coach Dressing Room
  const handlePlayNextMatch = () => {
    if (!career) return;
    audioManager.playClick();

    if (career.gameplayMode === 'LOCAL_2P') {
      if (career.competitionType === 'LEAGUE') {
        const currentFixture = career.schedule?.find((s) => s.matchday === career.currentMatchday);
        if (!currentFixture) return;

        const homeTeam = career.allTeams.find((t) => t.id === currentFixture.homeTeamId) || career.userTeam;
        const awayTeam = career.allTeams.find((t) => t.id === currentFixture.awayTeamId) || career.userTeam;

        const actualHome = homeTeam.id === career.userTeam.id ? career.userTeam : homeTeam;
        const actualAway = awayTeam.id === career.userTeam.id ? career.userTeam : awayTeam;

        setPreMatchData({
          homeTeam: actualHome,
          awayTeam: actualAway,
          isKnockout: false
        });
      } else if (career.competitionType === 'TOURNAMENT' && career.tournamentRounds) {
        const currentRoundIdx = career.currentMatchday - 1;
        const currentRound = career.tournamentRounds[currentRoundIdx];
        if (!currentRound) return;

        const userMatch = currentRound.matches.find(
          (m) => m.homeTeamId === career.userTeam.id || m.awayTeamId === career.userTeam.id
        );
        if (!userMatch) return;

        const homeTeam = career.allTeams.find((t) => t.id === userMatch.homeTeamId) || career.userTeam;
        const awayTeam = career.allTeams.find((t) => t.id === userMatch.awayTeamId) || career.userTeam;

        const actualHome = homeTeam.id === career.userTeam.id ? career.userTeam : homeTeam;
        const actualAway = awayTeam.id === career.userTeam.id ? career.userTeam : awayTeam;

        setPreMatchData({
          homeTeam: actualHome,
          awayTeam: actualAway,
          isKnockout: true
        });
      }
    } else {
      // Default: Full Pre-Match Scouting Report and Analysis
      setShowScoutingModal(true);
    }
  };

  // Kickoff executed after scouting review
  const handleExecuteKickoffFromScouting = () => {
    setShowScoutingModal(false);
    if (!career) return;
    audioManager.playWhistle();

    if (career.competitionType === 'LEAGUE') {
      const currentFixture = career.schedule?.find((s) => s.matchday === career.currentMatchday);
      if (!currentFixture) return;

      const homeTeam = career.allTeams.find((t) => t.id === currentFixture.homeTeamId) || career.userTeam;
      const awayTeam = career.allTeams.find((t) => t.id === currentFixture.awayTeamId) || career.userTeam;

      const actualHome = homeTeam.id === career.userTeam.id ? career.userTeam : homeTeam;
      const actualAway = awayTeam.id === career.userTeam.id ? career.userTeam : awayTeam;

      setActiveMatchModal({
        homeTeam: actualHome,
        awayTeam: actualAway,
        isKnockout: false
      });
    } else if (career.competitionType === 'TOURNAMENT' && career.tournamentRounds) {
      const currentRoundIdx = career.currentMatchday - 1;
      const currentRound = career.tournamentRounds[currentRoundIdx];
      if (!currentRound) return;

      const userMatch = currentRound.matches.find(
        (m) => m.homeTeamId === career.userTeam.id || m.awayTeamId === career.userTeam.id
      );
      if (!userMatch) return;

      const homeTeam = career.allTeams.find((t) => t.id === userMatch.homeTeamId) || career.userTeam;
      const awayTeam = career.allTeams.find((t) => t.id === userMatch.awayTeamId) || career.userTeam;

      const actualHome = homeTeam.id === career.userTeam.id ? career.userTeam : homeTeam;
      const actualAway = awayTeam.id === career.userTeam.id ? career.userTeam : awayTeam;

      setActiveMatchModal({
        homeTeam: actualHome,
        awayTeam: actualAway,
        isKnockout: true
      });
    }
  };

  // Kickoff executed after tactical instructions set in DualCoachPreMatchModal
  const handleConfirmKickoff = (updatedHomeTeam: CoachTeam, updatedAwayTeam: CoachTeam) => {
    if (!career || !preMatchData) return;
    audioManager.playWhistle();

    setPreMatchData(null);

    setActiveMatchModal({
      homeTeam: updatedHomeTeam,
      awayTeam: updatedAwayTeam,
      isKnockout: preMatchData.isKnockout
    });
  };

  // Save game mode & AI difficulty configuration
  const handleSaveGameMode = (config: {
    mode: CoachGameplayMode;
    difficulty: AIDifficulty;
    secondPlayerTeamId?: string;
    customHumanTeamIds?: string[];
    roomCode: string;
  }) => {
    setSelectedGameplayMode(config.mode);
    setSelectedAIDifficulty(config.difficulty);
    setCurrentRoomCode(config.roomCode);

    if (career) {
      const updatedAllTeams = career.allTeams.map((t) => {
        let isHuman = false;
        if (t.id === career.userTeam.id) {
          isHuman = true;
        } else if (config.mode === 'LOCAL_2P' && t.id === config.secondPlayerTeamId) {
          isHuman = true;
        } else if (config.mode === 'CUSTOM_MIXED' && config.customHumanTeamIds?.includes(t.id)) {
          isHuman = true;
        }
        return {
          ...t,
          controllerType: isHuman ? ('HUMAN' as const) : ('AI' as const)
        };
      });

      saveCareer({
        ...career,
        gameplayMode: config.mode,
        aiDifficulty: config.difficulty,
        roomCode: config.roomCode,
        allTeams: updatedAllTeams
      });
    }

    setShowGameModeModal(false);
  };

  // Callback when match center finishes
  const handleFinishMatch = (finalMatchResult?: CoachMatchResult) => {
    if (!career || !activeMatchModal) return;

    const result = finalMatchResult || activeMatchModal.result;
    if (!result) return;

    // Determine win / draw / loss for confidence delta
    const isWin =
      (career.userTeam.id === result.homeTeamId && result.homeScore > result.awayScore) ||
      (career.userTeam.id === result.awayTeamId && result.awayScore > result.homeScore);
    const isDraw = result.homeScore === result.awayScore;
    const isLoss = !isWin && !isDraw;

    // Game Points economy: wins earn the most, draws earn fewer, losses
    // reduce the balance (never below 0). This is separate from — and
    // survives independently of — permanent career statistics.
    const pointsDelta = isWin ? 100 : isDraw ? 40 : -20;
    setManagerIdentity(addGamePoints(pointsDelta));

    const oppTeamId = career.userTeam.id === result.homeTeamId ? result.awayTeamId : result.homeTeamId;
    const oppTeam = career.allTeams.find((t) => t.id === oppTeamId) || career.userTeam;

    const { boardDelta, fanDelta } = CoachSimulationEngine.calculateConfidenceDelta(
      isWin,
      isDraw,
      isLoss,
      career.userTeam.overallRating,
      oppTeam.overallRating
    );

    const updatedBoardConf = Math.min(100, Math.max(15, (career.userTeam.boardConfidence || 85) + boardDelta));
    const updatedFanConf = Math.min(100, Math.max(15, (career.userTeam.fanConfidence || 80) + fanDelta));

    // Create a copy of userTeam with updated fitness, injuries, and confidence
    const updatedUserTeam = { ...career.userTeam };
    CoachSimulationEngine.recoverSquadFitness(updatedUserTeam);
    CoachSimulationEngine.advanceSquadCalendar(updatedUserTeam);
    updatedUserTeam.boardConfidence = updatedBoardConf;
    updatedUserTeam.fanConfidence = updatedFanConf;

    if (career.competitionType === 'LEAGUE') {
      // 1. Update standings with user's match
      let newStandings = CoachSimulationEngine.updateStandingsWithMatch(career.standings || [], result);

      // 2. Simulate other matches for this matchday
      const otherFixtures = career.allTeams.filter((t) => t.id !== career.userTeam.id);
      for (let i = 0; i < otherFixtures.length; i += 2) {
        if (i + 1 < otherFixtures.length) {
          const res = CoachSimulationEngine.simulateMatch({
            homeTeam: otherFixtures[i],
            awayTeam: otherFixtures[i + 1],
            matchday: career.currentMatchday,
            isKnockout: false
          });
          newStandings = CoachSimulationEngine.updateStandingsWithMatch(newStandings, res);
        }
      }

      // 3. Mark schedule fixture played
      const newSchedule = career.schedule?.map((s) => {
        if (s.matchday === career.currentMatchday) {
          return {
            ...s,
            played: true,
            homeScore: result.homeScore,
            awayScore: result.awayScore
          };
        }
        return s;
      });

      // 4. Check if season ended
      const nextMatchday = career.currentMatchday + 1;
      const isCompleted = nextMatchday > career.totalMatchdays;
      const isUserChampion = isCompleted && newStandings[0]?.teamId === career.userTeam.id;

      if (isUserChampion) {
        const newTrophy: TrophyCabinetItem = {
          id: `trophy_${career.competitionId}_${Date.now()}`,
          competitionId: career.competitionId,
          competitionName: career.competitionTitle,
          competitionNameAr: career.competitionTitleAr,
          season: '2026/2027',
          teamId: career.userTeam.id,
          teamNameAr: career.userTeam.nameAr,
          dateWon: new Date().toLocaleDateString('ar-EG'),
          trophyIcon: '🏆'
        };
        setTrophiesCabinet((prev) => [newTrophy, ...prev]);
      }

      const updatedCareer: CoachSeasonState = {
        ...career,
        userTeam: updatedUserTeam,
        currentMatchday: nextMatchday,
        standings: newStandings,
        schedule: newSchedule,
        isCompleted,
        championTeamId: isCompleted ? newStandings[0]?.teamId : undefined,
        managerProfile: {
          ...career.managerProfile,
          matchesManaged: career.managerProfile.matchesManaged + 1,
          trophiesWon: isUserChampion
            ? career.managerProfile.trophiesWon + 1
            : career.managerProfile.trophiesWon,
          reputation: isUserChampion
            ? Math.min(99, career.managerProfile.reputation + 10)
            : career.managerProfile.reputation
        }
      };

      saveCareer(updatedCareer);
      setActiveMatchModal(null);

      if (isUserChampion) {
        setShowTrophyModal(true);
      }
    } else if (career.competitionType === 'TOURNAMENT' && career.tournamentRounds) {
      // Tournament progression
      const currentRoundIdx = career.currentMatchday - 1;
      const rounds = [...career.tournamentRounds];
      const currentRound = rounds[currentRoundIdx];

      // Update current round match
      currentRound.matches = currentRound.matches.map((m) => {
        if (m.homeTeamId === result.homeTeamId && m.awayTeamId === result.awayTeamId) {
          return {
            ...m,
            played: true,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            penaltyScore: result.penaltyScore
          };
        }
        return m;
      });

      // Simulate other matches in the same round if any
      currentRound.matches.forEach((m) => {
        if (!m.played) {
          const h = career.allTeams.find((t) => t.id === m.homeTeamId) || career.allTeams[0];
          const a = career.allTeams.find((t) => t.id === m.awayTeamId) || career.allTeams[1];
          const simRes = CoachSimulationEngine.simulateMatch({
            homeTeam: h,
            awayTeam: a,
            matchday: career.currentMatchday,
            isKnockout: true
          });
          m.played = true;
          m.homeScore = simRes.homeScore;
          m.awayScore = simRes.awayScore;
          m.penaltyScore = simRes.penaltyScore;
        }
      });

      // Determine winners
      const winners: CoachTeam[] = [];
      currentRound.matches.forEach((m) => {
        const homeWon = m.homeScore > m.awayScore || (m.penaltyScore && m.penaltyScore[0] > m.penaltyScore[1]);
        const winTeamId = homeWon ? m.homeTeamId : m.awayTeamId;
        const winTeam = career.allTeams.find((t) => t.id === winTeamId);
        if (winTeam) winners.push(winTeam);
      });

      // Populate next round
      let nextMatchday = career.currentMatchday + 1;
      let isCompleted = false;
      let championId: string | undefined = undefined;

      if (currentRoundIdx === 0 && rounds[1]) {
        // Build Semi-Finals
        rounds[1].matches = [
          {
            homeTeamId: winners[0]?.id || '',
            awayTeamId: winners[1]?.id || '',
            homeTeamName: winners[0]?.name || '',
            awayTeamName: winners[1]?.name || '',
            homeTeamNameAr: winners[0]?.nameAr || '',
            awayTeamNameAr: winners[1]?.nameAr || '',
            homeScore: 0,
            awayScore: 0,
            played: false
          },
          {
            homeTeamId: winners[2]?.id || '',
            awayTeamId: winners[3]?.id || '',
            homeTeamName: winners[2]?.name || '',
            awayTeamName: winners[3]?.name || '',
            homeTeamNameAr: winners[2]?.nameAr || '',
            awayTeamNameAr: winners[3]?.nameAr || '',
            homeScore: 0,
            awayScore: 0,
            played: false
          }
        ];
      } else if (currentRoundIdx === 1 && rounds[2]) {
        // Build Grand Final
        rounds[2].matches = [
          {
            homeTeamId: winners[0]?.id || '',
            awayTeamId: winners[1]?.id || '',
            homeTeamName: winners[0]?.name || '',
            awayTeamName: winners[1]?.name || '',
            homeTeamNameAr: winners[0]?.nameAr || '',
            awayTeamNameAr: winners[1]?.nameAr || '',
            homeScore: 0,
            awayScore: 0,
            played: false
          }
        ];
      } else if (currentRoundIdx === 2) {
        // Tournament Finished!
        isCompleted = true;
        championId = winners[0]?.id;
      }

      const isUserChampion = isCompleted && championId === career.userTeam.id;

      if (isUserChampion) {
        const newTrophy: TrophyCabinetItem = {
          id: `trophy_${career.competitionId}_${Date.now()}`,
          competitionId: career.competitionId,
          competitionName: career.competitionTitle,
          competitionNameAr: career.competitionTitleAr,
          season: '2026/2027',
          teamId: career.userTeam.id,
          teamNameAr: career.userTeam.nameAr,
          dateWon: new Date().toLocaleDateString('ar-EG'),
          trophyIcon: '🏆'
        };
        setTrophiesCabinet((prev) => [newTrophy, ...prev]);
      }

      const updatedCareer: CoachSeasonState = {
        ...career,
        userTeam: updatedUserTeam,
        currentMatchday: nextMatchday,
        tournamentRounds: rounds,
        isCompleted,
        championTeamId: championId,
        managerProfile: {
          ...career.managerProfile,
          matchesManaged: career.managerProfile.matchesManaged + 1,
          trophiesWon: isUserChampion
            ? career.managerProfile.trophiesWon + 1
            : career.managerProfile.trophiesWon,
          reputation: isUserChampion
            ? Math.min(99, career.managerProfile.reputation + 15)
            : career.managerProfile.reputation
        }
      };

      saveCareer(updatedCareer);
      setActiveMatchModal(null);

      if (isUserChampion) {
        setShowTrophyModal(true);
      }
    }
  };

  // "استقالة" — opens the explicit confirmation modal. This is NEVER
  // triggered by Back/Home/Exit/Refresh — only by this dedicated button.
  const handleRequestResignation = () => {
    audioManager.playClick();
    setShowResignationModal(true);
  };

  // Confirmed resignation: archive the job permanently into career
  // history (matches/wins/draws/losses/goals/trophies all preserved),
  // reset Game Points only, then clear the active job so a new one
  // can begin.
  const handleConfirmResignation = () => {
    if (!career) return;
    const jobId = getActiveJobMeta()?.jobId;
    resignFromCurrentJob(career);
    if (jobId) clearTransferWindow(jobId);
    setManagerIdentity(getManagerProfile());
    saveCareer(null);
    setShowResignationModal(false);
    setStage('MENU');
    audioManager.playClick();
  };

  const handleCancelResignation = () => {
    setShowResignationModal(false);
  };

  // Plays a due domestic cup / league cup / continental fixture. Kept
  // fully separate from the league/tournament match flow so the
  // already-working `handleFinishMatch` logic is never touched.
  const handlePlayCupFixture = (fixtureId: string) => {
    if (!career || !career.domesticCupFixtures) return;
    const fixture = career.domesticCupFixtures.find((f) => f.id === fixtureId);
    if (!fixture) return;

    const homeTeam =
      fixture.homeTeamId === career.userTeam.id
        ? career.userTeam
        : career.allTeams.find((t) => t.id === fixture.homeTeamId);
    const awayTeam =
      fixture.awayTeamId === career.userTeam.id
        ? career.userTeam
        : career.allTeams.find((t) => t.id === fixture.awayTeamId);
    if (!homeTeam || !awayTeam) return;

    setShowCupsFixturesModal(false);
    setActiveCupMatch({ fixtureId, homeTeam, awayTeam });
    audioManager.playWhistle();
  };

  // Finalizes a cup match: records the result on the fixture, awards
  // Game Points via the real reward calculator (underdog bonus,
  // clean sheet, comeback, difficulty multiplier — not a flat number),
  // and — if this was the cup Final and the user won — adds a trophy.
  const handleFinishCupMatch = (finalMatchResult?: CoachMatchResult) => {
    if (!career || !activeCupMatch) return;
    const result = finalMatchResult || activeCupMatch.result;
    if (!result) return;
    const fixture = career.domesticCupFixtures?.find((f) => f.id === activeCupMatch.fixtureId);
    if (!fixture) {
      setActiveCupMatch(null);
      return;
    }

    const updatedFixtures = (career.domesticCupFixtures || []).map((f) =>
      f.id === activeCupMatch.fixtureId
        ? { ...f, played: true, homeScore: result.homeScore, awayScore: result.awayScore, matchResult: result }
        : f
    );

    const rewards = CoachEcosystemService.calculateMatchRewards(
      result,
      career.userTeam.id,
      activeCupMatch.homeTeam,
      activeCupMatch.awayTeam,
      fixture.competitionTier,
      career.aiDifficulty || 'NORMAL'
    );
    setManagerIdentity(addGamePoints(rewards.pointsDelta));

    const isUserHome = career.userTeam.id === activeCupMatch.homeTeam.id;
    const userWon = isUserHome ? result.homeScore > result.awayScore : result.awayScore > result.homeScore;
    const isFinal = fixture.stageNameAr.includes('النهائي') && !fixture.stageNameAr.includes('ربع') && !fixture.stageNameAr.includes('نصف');

    let updatedTrophies = trophiesCabinet;
    if (isFinal && userWon) {
      updatedTrophies = [
        ...trophiesCabinet,
        {
          id: `trophy_${fixture.competitionId}_${Date.now()}`,
          competitionId: fixture.competitionId,
          competitionName: fixture.competitionNameAr,
          competitionNameAr: fixture.competitionNameAr,
          season: new Date().getFullYear().toString(),
          trophyIcon: fixture.competitionIcon || '🏆',
          teamId: career.userTeam.id,
          teamName: career.userTeam.name,
          teamNameAr: career.userTeam.nameAr,
          managerName: career.managerProfile.name,
          dateWon: new Date().toISOString()
        }
      ];
      setTrophiesCabinet(updatedTrophies);
      setShowTrophyModal(true);
    }

    saveCareer({ ...career, domesticCupFixtures: updatedFixtures });
    setActiveCupMatch(null);
    audioManager.playWhistle();
  };

  // -------------------------------------------------------------
  // VIEW: 1. MAIN GAME MENU (LEAGUES VS TOURNAMENTS)
  // -------------------------------------------------------------
  if (stage === 'MENU') {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
        <button
          type="button"
          onClick={() => { audioManager.playClick(); onBackToDiscovery(); }}
          className="fixed top-4 right-4 z-[70] w-12 h-12 rounded-2xl bg-zinc-950/90 border border-amber-400/60 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,.25)] backdrop-blur-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          aria-label="الصفحة الرئيسية"
          title="الصفحة الرئيسية"
        >
          <Home className="w-5 h-5" />
        </button>
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              audioManager.playClick();
              onBackToDiscovery();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>العودة للألعاب</span>
          </button>

          {career && (
            <button
              onClick={() => {
                audioManager.playClick();
                setStage('DASHBOARD');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs shadow-lg hover:bg-amber-400 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>استكمال مسيرتك الحالية ({career.userTeam.nameAr})</span>
            </button>
          )}
        </div>

        {/* Hero Title */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black">
            <Flame className="w-4 h-4 text-emerald-400" />
            <span>الخطوة 1: اختار التجربة</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            اختار <span className="text-amber-400">هتدرب مين؟</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            اختار إدارة نادٍ أوروبي في دوري محلي بنظام النقاط والمواجهات ذهاباً وإياباً، أو قيادة منتخب وطني في بطولة قارية بنظام خروج المغلوب.
          </p>

          {/* Quick Mode & AI Difficulty Selector */}
          <div className="pt-2 flex items-center justify-center">
            <button
              onClick={() => {
                audioManager.playClick();
                setShowGameModeModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-xs font-black text-amber-300 hover:text-white transition-all shadow-md cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>
                نمط المنافسة والذكاء الاصطناعي: {selectedGameplayMode === 'LOCAL_2P' ? '👥 لاعبان محلياً (Pass & Play)' : selectedGameplayMode === 'ROOM_ONLINE' ? `🌐 غرفة أونلاين (${currentRoomCode})` : selectedGameplayMode === 'CUSTOM_MIXED' ? '🔀 دوري مختلط (بشري + AI)' : `🤖 فردي ضد AI (${selectedAIDifficulty})`}
              </span>
              <span className="text-[10px] text-zinc-400 underline mr-1">تعديل</span>
            </button>
          </div>
        </div>

        {/* Main 2 Paths: CLUBS (نادي) vs NATIONAL TEAMS (منتخب) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Card 1: CLUBS */}
          <div
            onClick={() => handleStartNewMode('LEAGUE')}
            className="group relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 shadow-2xl hover:scale-[1.02] flex flex-col justify-between overflow-hidden surface-aurora"
          >
            <div className="absolute -top-10 -left-10 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-black">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-black text-amber-400 tracking-wider uppercase">
                  CLUBS • أندية
                </span>
                <h3 className="text-2xl font-black text-white mt-1 group-hover:text-amber-300 transition-colors">
                  نادي (Club Management)
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                موسم دوري كامل بنظام النقاط والذهاب والإياب: الدوري الإنجليزي، الدوري الإسباني، الألماني، الإيطالي، والفرنسي.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                  الدوري الإنجليزي الممتاز
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                  الدوري الإسباني (لا ليغا)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                  الدوري الألماني (بوندسليغا)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                  الدوري الإيطالي (سيريا أ)
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-black text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>اختيار النادي والدوري</span>
              <ChevronLeft className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: NATIONAL TEAMS */}
          <div
            onClick={() => handleStartNewMode('TOURNAMENT')}
            className="group relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 shadow-2xl hover:scale-[1.02] flex flex-col justify-between overflow-hidden surface-aurora"
          >
            <div className="absolute -top-10 -left-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-black">
                <Swords className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-black text-emerald-400 tracking-wider uppercase">
                  NATIONAL TEAMS • منتخبات
                </span>
                <h3 className="text-2xl font-black text-white mt-1 group-hover:text-emerald-300 transition-colors">
                  منتخب (National Team Management)
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                بطولات خروج المغلوب مع أشواط إضافية وركلات ترجيح: دوري أبطال أوروبا، كأس العالم، كأس أمم إفريقيا، وكأس أمم أوروبا.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                  دوري أبطال أوروبا (UCL)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                  كأس العالم (World Cup)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                  كأس أمم إفريقيا (AFCON)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                  كأس أمم أوروبا (Euro)
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-black text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>اختيار المنتخب والبطولة</span>
              <ChevronLeft className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Game Mode Modal on Menu Screen */}
        {showGameModeModal && (
          <CoachGameModeSelectorModal
            currentMode={selectedGameplayMode}
            currentDifficulty={selectedAIDifficulty}
            allTeams={COACH_LEAGUES[0].teams}
            userTeamId={COACH_LEAGUES[0].teams[0].id}
            roomCode={currentRoomCode}
            onConfirm={handleSaveGameMode}
            onClose={() => setShowGameModeModal(false)}
          />
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: 2. SELECT COMPETITION (LEAGUE OR TOURNAMENT)
  // -------------------------------------------------------------
  if (stage === 'SELECT_COMPETITION') {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              audioManager.playClick();
              setStage('MENU');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>رجوع</span>
          </button>

          <h2 className="text-base sm:text-xl font-black text-white">
            {competitionCategory === 'LEAGUE' ? 'اختار الدوري' : 'اختار البطولة'}
          </h2>

          <div className="w-12" />
        </div>

        {competitionCategory === 'LEAGUE' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COACH_LEAGUES.map((league) => (
              <div
                key={league.id}
                onClick={() => handleSelectLeague(league)}
                className="group bg-zinc-900/90 border border-zinc-800 hover:border-amber-400 rounded-3xl p-5 cursor-pointer transition-all hover:scale-[1.02] shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center font-black text-amber-400 text-lg">
                    {league.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                      {league.nameAr}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{league.name}</p>
                  </div>
                  {league.descriptionAr && <p className="text-xs text-zinc-500 leading-relaxed">{league.descriptionAr}</p>}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-bold text-amber-400">
                  <span>{league.teams.length} أندية</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COACH_TOURNAMENTS.map((tourn) => (
              <div
                key={tourn.id}
                onClick={() => handleSelectTournament(tourn)}
                className="group bg-zinc-900/90 border border-zinc-800 hover:border-emerald-400 rounded-3xl p-5 cursor-pointer transition-all hover:scale-[1.02] shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center font-black text-emerald-400 text-lg">
                    {tourn.shortName || tourn.id.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                      {tourn.nameAr}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{tourn.name}</p>
                  </div>
                  {tourn.descriptionAr && <p className="text-xs text-zinc-500 leading-relaxed">{tourn.descriptionAr}</p>}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span>{(tourn.teams || tourn.participants || []).length} فرق</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: 3. SELECT TEAM (CLUBS OR NATIONAL TEAMS)
  // -------------------------------------------------------------
  if (stage === 'SELECT_TEAM') {
    const teamsList = selectedLeague ? selectedLeague.teams : selectedTournament ? selectedTournament.teams : [];
    const compTitle = selectedLeague ? selectedLeague.nameAr : selectedTournament ? selectedTournament.nameAr : '';

    const filteredTeams = teamsList.filter((team) => {
      if (!teamSearchQuery.trim()) return true;
      const q = teamSearchQuery.trim().toLowerCase();
      return (
        team.nameAr.toLowerCase().includes(q) ||
        team.name.toLowerCase().includes(q) ||
        team.shortName.toLowerCase().includes(q) ||
        (team.stadiumName && team.stadiumName.toLowerCase().includes(q))
      );
    });

    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              audioManager.playClick();
              setStage('SELECT_COMPETITION');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>رجوع للبطولات</span>
          </button>

          <div className="text-center">
            <h2 className="text-base sm:text-xl font-black text-white">الخطوة 2: اختار فريقك</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{compTitle}</p>
          </div>

          <div className="w-16" />
        </div>

        {/* Search & Filter Bar */}
        <div className="relative max-w-md mx-auto w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={teamSearchQuery}
            onChange={(e) => setTeamSearchQuery(e.target.value)}
            placeholder="ابحث عن الفريق أو النادي أو الدولة..."
            className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition shadow-inner"
          />
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              onClick={() => handleInitiateTakeover(team)}
              className="group bg-zinc-900/90 border border-zinc-800 hover:border-amber-400 rounded-3xl p-4 cursor-pointer transition-all hover:scale-[1.02] shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Crest and short name */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-md"
                    style={{ backgroundColor: team.primaryColor || '#f59e0b' }}
                  >
                    {team.shortName}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 font-bold block">القوة الإجمالية</span>
                    <span className="text-base font-black text-amber-400 font-mono">{team.overallRating}</span>
                  </div>
                </div>

                <h3 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                  {team.nameAr}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">{team.name}</p>

                <div className="mt-2 text-[11px] text-zinc-500">
                  الملعب: <span className="text-zinc-300">{team.stadiumName}</span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  المدرب الحالي: <span className="text-zinc-300">{team.manager?.name || team.currentManager?.name}</span>
                </div>

                {/* Sub-ratings */}
                <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
                  <div className="bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                    <div className="text-[9px] text-zinc-400 font-bold">هجوم</div>
                    <div className="text-xs font-black text-rose-400 font-mono">{team.attackRating}</div>
                  </div>
                  <div className="bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                    <div className="text-[9px] text-zinc-400 font-bold">وسط</div>
                    <div className="text-xs font-black text-amber-400 font-mono">{team.midfieldRating}</div>
                  </div>
                  <div className="bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                    <div className="text-[9px] text-zinc-400 font-bold">دفاع</div>
                    <div className="text-xs font-black text-blue-400 font-mono">{team.defenseRating}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-black text-amber-400 group-hover:translate-x-0.5 transition-transform">
                <span>تولي تدريب الفريق</span>
                <ChevronLeft className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: 3.5. TAKE OVER CLUB (APPOINTMENT & SQUAD AUDIT)
  // -------------------------------------------------------------
  if (stage === 'TAKE_OVER' && candidateTeam) {
    const compTitle = selectedLeague ? selectedLeague.nameAr : selectedTournament ? selectedTournament.nameAr : '';
    return (
      <TakeOverClubView
        team={candidateTeam}
        competitionTitleAr={compTitle}
        onConfirmTakeover={(t, mode, diff) => handleSelectTeam(t, mode || selectedGameplayMode, diff || selectedAIDifficulty)}
        onBack={() => setStage('SELECT_TEAM')}
      />
    );
  }

  // -------------------------------------------------------------
  // VIEW: 4. CAREER DASHBOARD (MATCHDAY / TACTICS / STANDINGS)
  // -------------------------------------------------------------
  if (career && (stage === 'DASHBOARD' || career)) {
    // Next fixture details
    const nextLeagueFixture = career.schedule?.find((s) => s.matchday === career.currentMatchday);
    const nextTournRound = career.tournamentRounds?.[career.currentMatchday - 1];
    const nextTournMatch = nextTournRound?.matches.find(
      (m) => m.homeTeamId === career.userTeam.id || m.awayTeamId === career.userTeam.id
    );

    const nextOpponentTeamId =
      career.competitionType === 'LEAGUE'
        ? nextLeagueFixture?.homeTeamId === career.userTeam.id
          ? nextLeagueFixture.awayTeamId
          : nextLeagueFixture?.homeTeamId
        : nextTournMatch?.homeTeamId === career.userTeam.id
        ? nextTournMatch.awayTeamId
        : nextTournMatch?.homeTeamId;

    const nextOpponentTeam = career.allTeams.find((t) => t.id === nextOpponentTeamId);
    const isUserHome =
      career.competitionType === 'LEAGUE'
        ? nextLeagueFixture?.homeTeamId === career.userTeam.id
        : nextTournMatch?.homeTeamId === career.userTeam.id;

    const nextOpponentNameAr = nextOpponentTeam?.nameAr;
    const opponentPositionRank = career.standings
      ? career.standings.findIndex((s) => s.teamId === nextOpponentTeamId) + 1 || 1
      : 1;

    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
        {/* Top Career Navigation Bar */}
        <div className="relative overflow-hidden bg-zinc-900/90 border border-amber-500/25 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          {/* User Club badge and info */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-lg"
              style={{ backgroundColor: career.userTeam.primaryColor || '#f59e0b' }}
            >
              {career.userTeam.shortName}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">{career.userTeam.nameAr}</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                  {career.competitionTitleAr}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold border border-zinc-700">
                  {career.gameplayMode === 'LOCAL_2P'
                    ? '👥 2-Player'
                    : career.gameplayMode === 'ROOM_ONLINE'
                    ? `🌐 ${career.roomCode || 'Online'}`
                    : career.gameplayMode === 'CUSTOM_MIXED'
                    ? '🔀 Mixed'
                    : `🤖 AI (${career.aiDifficulty || 'Normal'})`}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                المدرب: <span className="text-white font-bold">{career.managerProfile.name}</span> • الجولة الحالية:{' '}
                <span className="text-amber-400 font-mono font-bold">
                  {career.isCompleted ? 'انتهت المسيرة' : `${career.currentMatchday} / ${career.totalMatchdays}`}
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons: Next Matchday, Training, Transfers, Trophy Room, Mode Config & Reset */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <button
              onClick={() => {
                audioManager.playClick();
                onBackToDiscovery();
              }}
              title="الرجوع للرئيسية — مسيرتك هتفضل محفوظة زي ما هي"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-emerald-400 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">الرئيسية</span>
            </button>

            <button
              onClick={() => {
                audioManager.playClick();
                setShowTrainingModal(true);
              }}
              title="إدارة الحصص التدريبية ومعدلات اللياقة"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-400 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">التدريب</span>
            </button>

            <button
              onClick={() => {
                audioManager.playClick();
                setShowTransferModal(true);
              }}
              title="سوق الانتقالات وتجديد العقود"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-emerald-400 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">الانتقالات</span>
            </button>

            <button
              onClick={() => {
                audioManager.playClick();
                setShowTrophyRoomModal(true);
              }}
              title="خزانة الكؤوس وسجل الألقاب التاريخية"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-yellow-400 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden md:inline">الكؤوس</span>
            </button>

            {career.domesticCupFixtures && career.domesticCupFixtures.length > 0 && (
              <button
                onClick={() => {
                  audioManager.playClick();
                  setShowCupsFixturesModal(true);
                }}
                title="مباريات كأس الرابطة وكأس الاتحاد ومواعيدها"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-400 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">مباريات الكأس</span>
                {career.domesticCupFixtures.some(
                  (f) =>
                    !f.played &&
                    f.triggerAfterMatchday <= career.currentMatchday - 1 &&
                    (f.homeTeamId === career.userTeam.id || f.awayTeamId === career.userTeam.id)
                ) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              </button>
            )}

            <button
              onClick={() => {
                audioManager.playClick();
                setShowGameModeModal(true);
              }}
              title="تعديل نمط المنافسة ومستوى صعوبة الذكاء الاصطناعي"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-400 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">الصعوبة</span>
            </button>

            {!career.isCompleted ? (
              <button
                onClick={handlePlayNextMatch}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>المباراة القادمة {nextOpponentNameAr ? `(ضد ${nextOpponentNameAr})` : ''}</span>
              </button>
            ) : (
              <div className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40">
                موسم مكتمل!
              </div>
            )}

            <button
              onClick={handleRequestResignation}
              title="استقالة"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-black">استقالة</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-x-auto text-xs font-black">
          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('OVERVIEW');
            }}
            className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            المركز الإداري (Hub)
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('TACTICS');
            }}
            className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'TACTICS'
                ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            التشكيلة والتكتيك (10 خطط وأساليب)
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('TABLE');
            }}
            className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'TABLE'
                ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {career.competitionType === 'LEAGUE' ? 'جدول الترتيب' : 'شجرة البطولة'}
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('FIXTURES');
            }}
            className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'FIXTURES'
                ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            جدول المباريات والنتائج
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('SQUAD');
            }}
            className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'SQUAD'
                ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            قائمة لاعبي الفريق ({career.userTeam.squad.length})
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setActiveTab('MANAGER');
            }}
            className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'MANAGER'
                ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ملف المدرب وهوية القيادة
          </button>
        </div>

        {/* Tab 0: MANAGER OVERVIEW HUB */}
        {activeTab === 'OVERVIEW' && (
          <ManagerOverviewTab
            userTeam={career.userTeam}
            currentMatchday={career.currentMatchday}
            totalMatchdays={career.totalMatchdays}
            competitionTitleAr={career.competitionTitleAr}
            nextMatch={nextLeagueFixture}
            nextOpponentTeam={nextOpponentTeam}
            standings={career.standings}
            boardConfidence={career.userTeam.boardConfidence ?? 85}
            fanConfidence={career.userTeam.fanConfidence ?? 80}
            managerPoints={managerIdentity.gamePoints}
            onOpenPreMatch={handlePlayNextMatch}
            onOpenTactics={() => setActiveTab('TACTICS')}
            onOpenTraining={() => setShowTrainingModal(true)}
            onOpenTransfers={() => setShowTransferModal(true)}
            onOpenTable={() => setActiveTab('TABLE')}
            onOpenTrophyRoom={() => setShowTrophyRoomModal(true)}
          />
        )}

        {/* Tab 1: TACTICS & STARTING XI */}
        {activeTab === 'TACTICS' && (
          <TacticsBoard
            team={career.userTeam}
            tactics={career.userTactics}
            onUpdateTeam={(updatedTeam) => {
              saveCareer((prev) => (prev ? { ...prev, userTeam: updatedTeam } : prev));
            }}
            onUpdateTactics={(updatedTactics) => {
              saveCareer((prev) => (prev ? { ...prev, userTactics: updatedTactics } : prev));
            }}
          />
        )}

        {/* Tab 2: TABLE OR TOURNAMENT BRACKET */}
        {activeTab === 'TABLE' && (
          <>
            {career.competitionType === 'LEAGUE' && career.standings ? (
              <>
                <LeagueTableStandings
                  standings={career.standings}
                  userTeamId={career.userTeam.id}
                  leagueTitleAr={career.competitionTitleAr}
                  allTeams={career.allTeams}
                />
                <ManagerLeagueRankingPanel
                  standings={career.standings}
                  allTeams={career.allTeams}
                  userTeamId={career.userTeam.id}
                />
              </>
            ) : career.tournamentRounds ? (
              <KnockoutBracketVisualizer
                rounds={career.tournamentRounds}
                userTeamId={career.userTeam.id}
                tournamentNameAr={career.competitionTitleAr}
                championTeamNameAr={
                  career.championTeamId
                    ? career.allTeams.find((t) => t.id === career.championTeamId)?.nameAr
                    : undefined
                }
              />
            ) : null}
          </>
        )}

        {/* Tab 3: FIXTURES & SCHEDULE */}
        {activeTab === 'FIXTURES' && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Calendar className="w-5 h-5 text-amber-400" />
              جدول مباريات الموسم
            </h3>

            {career.schedule && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {career.schedule.map((match) => (
                  <div
                    key={`sch_${match.matchday}`}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                      match.matchday === career.currentMatchday
                        ? 'bg-amber-500/15 border-amber-400 text-white font-bold'
                        : match.played
                        ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300'
                        : 'bg-zinc-950/40 border-zinc-800/40 text-zinc-500'
                    }`}
                  >
                    <span className="font-mono font-black text-amber-400 w-16">
                      الجولة {match.matchday}
                    </span>

                    <div className="flex-1 flex items-center justify-center gap-4">
                      <span className={`w-32 text-left truncate ${match.homeTeamId === career.userTeam.id ? 'text-amber-300 font-black' : ''}`}>
                        {match.homeTeamNameAr}
                      </span>

                      <div className="px-3 py-1 bg-zinc-900 rounded-lg font-mono font-black text-xs border border-zinc-800 min-w-[50px] text-center">
                        {match.played ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
                      </div>

                      <span className={`w-32 text-right truncate ${match.awayTeamId === career.userTeam.id ? 'text-amber-300 font-black' : ''}`}>
                        {match.awayTeamNameAr}
                      </span>
                    </div>

                    <span className="text-[10px] w-14 text-left font-bold">
                      {match.played ? 'انتهت' : match.matchday === career.currentMatchday ? 'القادمة' : 'مجدولة'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: FULL SQUAD ROSTER */}
        {activeTab === 'SQUAD' && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Users className="w-5 h-5 text-amber-400" />
              قائمة لاعبي نادي {career.userTeam.nameAr}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {career.userTeam.squad.map((player) => {
                const isStarter = career.userTeam.startingXI.includes(player.id);

                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      isStarter ? 'bg-zinc-950 border-amber-500/40 shadow-sm' : 'bg-zinc-950/60 border-zinc-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-black">
                          {player.position}
                        </span>
                        <h4 className="text-xs font-black text-white">{player.nameAr}</h4>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        أهداف: <strong className="text-amber-400">{player.goals}</strong> • مباريات:{' '}
                        {player.matchesPlayed} • اللياقة: {player.fitness}%
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-amber-400 block">{player.rating}</span>
                      <span className="text-[9px] text-zinc-500 font-bold">{isStarter ? 'أساسي' : 'بديل'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: MANAGER PROFILE */}
        {activeTab === 'MANAGER' && (
          <div className="space-y-8">
            <ManagerProfileEditor
              manager={career.managerProfile}
              teamNameAr={career.userTeam.nameAr}
              onUpdateManager={(updated) => {
                saveCareer({
                  ...career,
                  managerProfile: updated
                });
                // Persist identity permanently so it survives resignation,
                // exit, restart, and carries over into the NEXT job too.
                setManagerIdentity(
                  saveManagerProfile({
                    name: updated.nameAr || updated.name,
                    photoUrl: updated.photoUrl,
                    nationality: updated.nationalityAr || updated.nationality
                  })
                );
              }}
            />
            <div className="border-t border-zinc-800 pt-6">
              <ManagerCareerHistoryPanel liveCareer={career} />
            </div>
          </div>
        )}

        {/* Resignation Confirmation ("استقالة") — distinct from normal exit */}
        {showResignationModal && (
          <ResignationModal
            teamNameAr={career.userTeam.nameAr}
            onCancel={handleCancelResignation}
            onConfirm={handleConfirmResignation}
          />
        )}

        {/* Domestic Cup Fixtures Viewer ("مباريات الكأس") */}
        {showCupsFixturesModal && career.domesticCupFixtures && (
          <CoachCupFixturesModal
            fixtures={career.domesticCupFixtures}
            currentMatchday={career.currentMatchday}
            userTeamId={career.userTeam.id}
            onPlayFixture={handlePlayCupFixture}
            onClose={() => setShowCupsFixturesModal(false)}
          />
        )}

        {/* Active Cup Match Modal (kept separate from the league/tournament match flow) */}
        {activeCupMatch && (
          <MatchCenterModal
            homeTeam={activeCupMatch.homeTeam}
            awayTeam={activeCupMatch.awayTeam}
            matchResult={activeCupMatch.result}
            simulationParams={{
              homeTeam: activeCupMatch.homeTeam,
              awayTeam: activeCupMatch.awayTeam,
              userTeamId: career.userTeam.id,
              userTactics: career.userTactics,
              matchday: career.currentMatchday,
              isKnockout: true,
              aiDifficulty: career.aiDifficulty || 'NORMAL'
            }}
            userTeamId={career.userTeam.id}
            userTactics={career.userTactics}
            onFinish={handleFinishCupMatch}
          />
        )}

        {/* Active Match Modal */}
        {activeMatchModal && (
          <MatchCenterModal
            homeTeam={activeMatchModal.homeTeam}
            awayTeam={activeMatchModal.awayTeam}
            matchResult={activeMatchModal.result}
            simulationParams={{
              homeTeam: activeMatchModal.homeTeam,
              awayTeam: activeMatchModal.awayTeam,
              userTeamId: career.userTeam.id,
              userTactics: career.userTactics,
              matchday: career.currentMatchday,
              isKnockout: activeMatchModal.isKnockout || false,
              aiDifficulty: career.aiDifficulty || 'NORMAL'
            }}
            userTeamId={career.userTeam.id}
            userTactics={career.userTactics}
            onFinish={handleFinishMatch}
          />
        )}

        {/* Championship Celebration Modal */}
        {showTrophyModal && (
          <TrophyCelebrationModal
            competitionTitleAr={career.competitionTitleAr}
            teamNameAr={career.userTeam.nameAr}
            managerName={career.managerProfile.name}
            onClose={() => setShowTrophyModal(false)}
          />
        )}

        {/* Dual Coach Pre-Match Dressing Room Modal */}
        {preMatchData && (
          <DualCoachPreMatchModal
            homeTeam={preMatchData.homeTeam}
            awayTeam={preMatchData.awayTeam}
            homeTactics={career.userTactics}
            onConfirmKickoff={handleConfirmKickoff}
            onCancel={() => setPreMatchData(null)}
          />
        )}

        {/* Game Mode & AI Difficulty Modal in Dashboard */}
        {showGameModeModal && (
          <CoachGameModeSelectorModal
            currentMode={career.gameplayMode || selectedGameplayMode}
            currentDifficulty={career.aiDifficulty || selectedAIDifficulty}
            allTeams={career.allTeams}
            userTeamId={career.userTeam.id}
            roomCode={career.roomCode || currentRoomCode}
            onConfirm={handleSaveGameMode}
            onClose={() => setShowGameModeModal(false)}
          />
        )}

        {/* Squad Training & Conditioning Modal */}
        {showTrainingModal && (
          <CoachTrainingModal
            team={career.userTeam}
            currentMatchday={career.currentMatchday}
            existingSchedule={career.userTeam.trainingSchedule}
            onApplyTraining={(updatedTeam, schedule) => {
              saveCareer({
                ...career,
                userTeam: {
                  ...updatedTeam,
                  trainingSchedule: schedule
                }
              });
              setShowTrainingModal(false);
            }}
            onClose={() => setShowTrainingModal(false)}
          />
        )}

        {/* Transfer Market & Contract Extensions Modal */}
        {showTransferModal && (
          <CoachTransferModal
            userTeam={career.userTeam}
            allTeams={career.allTeams}
            managerPoints={managerIdentity.gamePoints}
            windowStatus={getTransferWindowStatus(getActiveJobMeta()?.jobId || career.userTeam.id, career)}
            onUpdateTeam={(updatedTeam) => {
              saveCareer({
                ...career,
                userTeam: updatedTeam
              });
            }}
            onUpdatePoints={(newPoints) => {
              setManagerIdentity(saveManagerProfile({ gamePoints: Math.max(0, newPoints) }));
            }}
            onClose={() => setShowTransferModal(false)}
          />
        )}

        {/* Opponent Scouting & Matchday Preparation Modal */}
        {showScoutingModal && nextOpponentTeam && (
          <PreMatchScoutingModal
            userTeam={career.userTeam}
            opponentTeam={nextOpponentTeam}
            isHomeMatch={isUserHome}
            matchday={career.currentMatchday}
            opponentPositionRank={opponentPositionRank}
            onOpenTactics={() => {
              setShowScoutingModal(false);
              setActiveTab('TACTICS');
            }}
            onKickoff={handleExecuteKickoffFromScouting}
            onClose={() => setShowScoutingModal(false)}
          />
        )}

        {/* Manager Trophy Room & Career History Modal */}
        {showTrophyRoomModal && (() => {
          // Real, non-fake career statistics — derived from actual
          // standings/tournament results + permanent archived history.
          const globalStats = computeGlobalStats(career);
          const timeline = getCareerTimeline(career);
          const allTrophies = [
            ...trophiesCabinet,
            ...timeline.flatMap((job) => job.trophies)
          ];
          return (
            <CoachTrophyRoomModal
              userTeam={career.userTeam}
              managerName={career.managerProfile.name}
              trophiesWon={allTrophies}
              careerRecord={{
                managerName: career.managerProfile.name,
                matches: globalStats.totalMatches,
                wins: globalStats.totalWins,
                draws: globalStats.totalDraws,
                losses: globalStats.totalLosses,
                goalsScored: globalStats.totalGoalsFor,
                goalsConceded: globalStats.totalGoalsAgainst,
                winPercentage: globalStats.winPercentage,
                trophies: allTrophies,
                history: timeline.map((job) => ({
                  teamName: job.teamName,
                  teamNameAr: job.teamNameAr,
                  years: `${new Date(job.startDate).getFullYear()}${
                    job.endDate ? '–' + new Date(job.endDate).getFullYear() : ' – دلوقتي'
                  }`,
                  trophiesCount: job.trophies.length,
                  matches: job.matches
                })),
                reputation: managerIdentity.reputation
              }}
              onClose={() => setShowTrophyRoomModal(false)}
            />
          );
        })()}
      </div>
    );
  }

  return null;
};
