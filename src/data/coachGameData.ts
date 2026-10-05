// ============================================================
// أنت المدرب | Complete Football Database (5 Leagues & 3 Tournaments)
// Full 5 Major European Leagues (96 Clubs) & 3 Major Tournaments (108 Teams)
// ============================================================

import { CoachLeague, CoachTournament } from '../types/coachGameTypes';
import { ALL_DOMESTIC_LEAGUES } from './coachClubsData';
import { ALL_TOURNAMENTS } from './coachTournamentsData';

export const COACH_LEAGUES: CoachLeague[] = ALL_DOMESTIC_LEAGUES;
export const COACH_TOURNAMENTS: CoachTournament[] = ALL_TOURNAMENTS;
