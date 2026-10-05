// ============================================================
// أنت المدرب | Advanced Mathematical Football Simulation Engine
// ============================================================

import {
  CoachTeam,
  CoachMatchResult,
  CoachMatchEvent,
  CoachMatchStats,
  CoachHalfTimeFeedback,
  LeagueStandingRow,
  UserTacticalSettings,
  AIDifficulty,
  CoachSquadPlayer
} from '../types/coachGameTypes';
import {
  COACH_FORMATIONS,
  COACH_PLAYING_STYLES,
  COACH_TACTICAL_ROLES,
  calculatePositionPenalty,
  pickAutomaticBestXI
} from '../data/coachFormationsAndStyles';
import { CoachAiIntelligence } from './coachAiIntelligence';

export interface SimulationParams {
  homeTeam: CoachTeam;
  awayTeam: CoachTeam;
  userTeamId?: string;
  userTactics?: UserTacticalSettings;
  matchday: number;
  isKnockout?: boolean;
  aiDifficulty?: AIDifficulty;
}

export interface HalfTimeSimState {
  params: SimulationParams;
  homeScore: number;
  awayScore: number;
  events: CoachMatchEvent[];
  stats: CoachMatchStats;
  homeStrength: {
    overall: number;
    attack: number;
    midfield: number;
    defense: number;
    fitnessAvg: number;
    staminaDrainMultiplier: number;
  };
  awayStrength: {
    overall: number;
    attack: number;
    midfield: number;
    defense: number;
    fitnessAvg: number;
    staminaDrainMultiplier: number;
  };
  halfTimeFeedback: CoachHalfTimeFeedback;
  firstHalfHomeStarters: CoachSquadPlayer[];
  firstHalfAwayStarters: CoachSquadPlayer[];
  homeInjuries: number;
  awayInjuries: number;
}

// ============================================================
// In-Match Forced Decisions (Injury Substitution / Red Card Response)
//
// A stoppage is rolled BEFORE any goals/events are generated for the
// half. If one fires for the human-controlled team, NOTHING for the
// rest of that half has been decided yet — the manager's choice
// (which bench player comes on / how to set up with ten men) is fed
// back into the engine and genuinely changes the probabilities used
// to generate the remainder of the half. Nothing is precomputed and
// then cosmetically wrapped around a forced choice.
// ============================================================
export interface PendingMatchDecision {
  type: 'INJURY' | 'RED_CARD';
  minute: number;
  teamId: string;
  playerId: string;
  playerName: string;
  position: string;
  positionAr: string;
}

export interface PartialHalfResult {
  isPartial: true;
  half: 1 | 2;
  pendingDecision: PendingMatchDecision;
  resumeMinute: number;
  halfEndMinute: number;
  eventsSoFar: CoachMatchEvent[];
  homeGoalsSoFar: number;
  awayGoalsSoFar: number;
  params: SimulationParams;
  priorHalfState?: HalfTimeSimState; // only set when half === 2
}

export class CoachSimulationEngine {
  /**
   * Calculates overall squad strength of Starting XI accounting for fitness, morale, form,
   * player position suitability (penalties), tactical roles, and manager tactical instructions.
   */
  public static calculateStartingStrength(
    team: CoachTeam,
    tactics?: UserTacticalSettings
  ): {
    overall: number;
    attack: number;
    midfield: number;
    defense: number;
    fitnessAvg: number;
    staminaDrainMultiplier: number;
  } {
    const starters = team.squad.filter((p) => team.startingXI.includes(p.id));
    if (starters.length === 0) {
      return {
        overall: team.overallRating,
        attack: team.attackRating,
        midfield: team.midfieldRating,
        defense: team.defenseRating,
        fitnessAvg: 95,
        staminaDrainMultiplier: 1.0
      };
    }

    const formation = COACH_FORMATIONS.find((f) => f.id === team.formation) || COACH_FORMATIONS[0];
    const rolesMap = tactics?.playerRoles || {};

    let totalPositionPenalty = 0;
    let roleAttackMod = 0;
    let roleMidfieldMod = 0;
    let roleDefenseMod = 0;
    let totalStaminaDrainMod = 0;

    formation.slots.forEach((slot, idx) => {
      const player = starters[idx];
      if (player) {
        const pen = calculatePositionPenalty(player.position, slot.position);
        totalPositionPenalty += pen.penalty;

        const roleId = rolesMap[player.id];
        if (roleId) {
          const roleDef = COACH_TACTICAL_ROLES.find((r) => r.id === roleId);
          if (roleDef) {
            totalStaminaDrainMod += roleDef.staminaDrainModifier;
            if (roleDef.category === 'STRIKER') {
              roleAttackMod += roleDef.chanceModifier * 0.4;
              roleMidfieldMod += roleDef.possessionModifier * 0.5;
            } else if (roleDef.category === 'MIDFIELD') {
              roleMidfieldMod += (roleDef.possessionModifier + roleDef.chanceModifier) * 0.4;
              if (roleId === 'anchor') roleDefenseMod += 5;
              if (roleId === 'box_to_box') {
                roleAttackMod += 3;
                roleDefenseMod += 3;
              }
            } else if (roleDef.category === 'DEFENSE') {
              roleDefenseMod += 3;
              if (roleId === 'attacking_fullback' || roleId === 'wing_back') {
                roleAttackMod += 4;
                roleDefenseMod -= 1;
              }
              if (roleId === 'advanced_cb') {
                roleMidfieldMod += 3;
              }
            }
          }
        } else {
          totalStaminaDrainMod += 1.0;
        }
      }
    });

    const avgStaminaDrain = starters.length ? totalStaminaDrainMod / starters.length : 1.0;
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 80);

    const forwards = starters.filter((p) => ['ST', 'RW', 'LW'].includes(p.position));
    const mids = starters.filter((p) => ['CM', 'CAM', 'CDM'].includes(p.position));
    const defs = starters.filter((p) => ['CB', 'LB', 'RB', 'GK'].includes(p.position));

    let attVal = (forwards.length ? avg(forwards.map((p) => p.attack)) : team.attackRating) + roleAttackMod;
    let midVal = (mids.length ? avg(mids.map((p) => p.passing)) : team.midfieldRating) + roleMidfieldMod;
    let defVal = (defs.length ? avg(defs.map((p) => p.defense)) : team.defenseRating) + roleDefenseMod;

    let staminaMultiplier = avgStaminaDrain;
    if (tactics) {
      switch (tactics.mentality) {
        case 'ALL_OUT_ATTACK':
          attVal += 13;
          defVal -= 10;
          staminaMultiplier += 0.2;
          break;
        case 'ATTACKING':
          attVal += 7;
          defVal -= 4;
          staminaMultiplier += 0.1;
          break;
        case 'DEFENSIVE':
          attVal -= 5;
          defVal += 7;
          staminaMultiplier -= 0.05;
          break;
        case 'VERY_DEFENSIVE':
          attVal -= 11;
          defVal += 13;
          staminaMultiplier -= 0.1;
          break;
        case 'BALANCED':
        default:
          break;
      }

      switch (tactics.pressingIntensity) {
        case 'INTENSE':
          midVal += 6;
          staminaMultiplier += 0.25;
          break;
        case 'HIGH':
          midVal += 3;
          staminaMultiplier += 0.12;
          break;
        case 'LOW':
          midVal -= 3;
          staminaMultiplier -= 0.15;
          break;
        case 'BALANCED':
        default:
          break;
      }

      switch (tactics.defensiveLine) {
        case 'HIGH':
          midVal += 3;
          defVal -= 2;
          break;
        case 'DEEP':
          defVal += 5;
          attVal -= 2;
          break;
        case 'BALANCED':
        default:
          break;
      }

      switch (tactics.passingStyle) {
        case 'SHORT':
          midVal += 4;
          break;
        case 'DIRECT':
          attVal += 4;
          midVal -= 2;
          break;
        case 'LONG':
          attVal += 3;
          midVal -= 4;
          break;
        case 'MIXED':
        default:
          break;
      }
    }

    const fitness = avg(starters.map((p) => p.fitness));
    const moraleAvg = avg(starters.map((p) => p.morale || 85));
    const formAvg = avg(starters.map((p) => p.form || 7));

    const moraleMod = (moraleAvg - 80) * 0.15;
    const formMod = (formAvg - 7) * 1.0;
    const fitnessFactor = fitness >= 85 ? 1.0 : fitness >= 70 ? 0.92 : 0.8;

    const posPenaltyPerPlayer = starters.length ? totalPositionPenalty / starters.length : 0;

    const baseOverall = attVal * 0.35 + midVal * 0.35 + defVal * 0.3;
    const overall = (baseOverall + moraleMod + formMod + posPenaltyPerPlayer) * fitnessFactor;

    return {
      overall: Math.round(overall),
      attack: Math.round((attVal + posPenaltyPerPlayer) * fitnessFactor),
      midfield: Math.round((midVal + posPenaltyPerPlayer) * fitnessFactor),
      defense: Math.round((defVal + posPenaltyPerPlayer) * fitnessFactor),
      fitnessAvg: Math.round(fitness),
      staminaDrainMultiplier: Math.max(0.7, Number(staminaMultiplier.toFixed(2)))
    };
  }

  /**
   * Evaluates formation and style tactical compatibility
   */
  public static getTacticalSynergy(formationId: string, styleId: string): number {
    const style = COACH_PLAYING_STYLES.find((s) => s.id === styleId || s.name.toLowerCase() === styleId.toLowerCase());
    if (!style) return 0;
    if (style.suitableFormations.includes(formationId)) return 6;
    return 1;
  }

  /**
   * محاكاة الشوط الأول فقط (Minutes 1 - 45 + Stoppage Time)
   */
  /**
   * Rolls whether a mid-half stoppage (injury requiring a forced
   * substitution, or a red card requiring a tactical response) happens
   * to the GIVEN team during the given half. Purely random — never
   * guaranteed, never scripted to a fixed minute.
   */
  private static positionLabelAr(position: string): string {
    if (position === 'GK') return 'حارس مرمى';
    if (['CB', 'LB', 'RB'].includes(position)) return position === 'CB' ? 'قلب دفاع' : position === 'LB' ? 'ظهير أيسر' : 'ظهير أيمن';
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(position)) return position === 'CDM' ? 'وسط دفاعي' : position === 'CAM' ? 'وسط هجومي' : 'لاعب وسط';
    if (['ST', 'CF'].includes(position)) return 'مهاجم';
    if (['LW', 'RW'].includes(position)) return position === 'LW' ? 'جناح أيسر' : 'جناح أيمن';
    return position;
  }

  private static rollStoppage(team: CoachTeam, half: 1 | 2): PendingMatchDecision | null {
    const starters = team.squad.filter((p) => team.startingXI.includes(p.id) && p.position !== 'GK');
    if (starters.length < 3) return null;

    // Rare, match-to-match events: they may cluster by pure chance, but are
    // deliberately far below the old rates so an injury/red is not a normal
    // part of every match.
    const injuryChance = 0.045;
    const redCardChance = 0.012;
    const roll = Math.random();
    const minuteRange: [number, number] = half === 1 ? [10, 38] : [50, 82];
    const minute = Math.floor(Math.random() * (minuteRange[1] - minuteRange[0])) + minuteRange[0];

    if (roll < injuryChance) {
      const player = starters[Math.floor(Math.random() * starters.length)];
      return { type: 'INJURY', minute, teamId: team.id, playerId: player.id, playerName: player.nameAr, position: player.position, positionAr: this.positionLabelAr(player.position) };
    }
    if (roll < injuryChance + redCardChance) {
      const player = starters[Math.floor(Math.random() * starters.length)];
      return { type: 'RED_CARD', minute, teamId: team.id, playerId: player.id, playerName: player.nameAr, position: player.position, positionAr: this.positionLabelAr(player.position) };
    }
    return null;
  }

  /**
   * Generates goals/events for an arbitrary sub-window of a half,
   * scaled proportionally to the window's share of the half. Used
   * both for the "before the stoppage" chunk and for the "after the
   * manager's decision" resumed chunk — so a substitution or tactical
   * response genuinely changes what the rest of the half produces.
   */
  private static generateWindowEvents(
    homeTeam: CoachTeam,
    awayTeam: CoachTeam,
    homeStrength: { attack: number; defense: number },
    awayStrength: { attack: number; defense: number },
    windowMinutes: number,
    totalHalfMinutes: number,
    minuteOffset: number,
    penalty?: { teamId: string; attackMult: number; defenseMult: number }
  ): { homeGoals: number; awayGoals: number; events: CoachMatchEvent[] } {
    const ratio = Math.max(0, windowMinutes) / totalHalfMinutes;

    let homeAtk = homeStrength.attack;
    let homeDef = homeStrength.defense;
    let awayAtk = awayStrength.attack;
    let awayDef = awayStrength.defense;

    if (penalty?.teamId === homeTeam.id) {
      homeAtk *= penalty.attackMult;
      homeDef *= penalty.defenseMult;
    } else if (penalty?.teamId === awayTeam.id) {
      awayAtk *= penalty.attackMult;
      awayDef *= penalty.defenseMult;
    }

    const homeStarters = homeTeam.squad.filter((p) => homeTeam.startingXI.includes(p.id));
    const awayStarters = awayTeam.squad.filter((p) => awayTeam.startingXI.includes(p.id));

    const baseShotsPerHalf = 8.5;
    const homeShotsWindow = Math.max(0, Math.round(baseShotsPerHalf * ratio * (0.5 + Math.random())));
    const awayShotsWindow = Math.max(0, Math.round(baseShotsPerHalf * ratio * (0.5 + Math.random())));

    const homeSOT = Math.round(homeShotsWindow * (0.35 + Math.random() * 0.25));
    const awaySOT = Math.round(awayShotsWindow * (0.35 + Math.random() * 0.25));

    let homeGoals = 0;
    let awayGoals = 0;
    const events: CoachMatchEvent[] = [];

    const pickScorer = (starters: CoachSquadPlayer[]) => {
      const strikers = starters.filter((p) => ['ST', 'RW', 'LW', 'CAM'].includes(p.position));
      const pool = strikers.length ? strikers : starters;
      return pool[Math.floor(Math.random() * pool.length)] || starters[0];
    };

    for (let i = 0; i < homeSOT; i++) {
      const chance = (homeAtk / (awayDef + 35)) * 0.72;
      if (Math.random() < chance) {
        homeGoals++;
        const scorer = pickScorer(homeStarters);
        if (scorer) {
          scorer.goals += 1;
          events.push({
            minute: minuteOffset + Math.floor(Math.random() * Math.max(1, windowMinutes)),
            type: 'GOAL',
            teamId: homeTeam.id,
            teamName: homeTeam.nameAr,
            playerId: scorer.id,
            playerName: scorer.nameAr,
            descriptionAr: `⚽ جوووول! ${scorer.nameAr} يسجل هدفاً بعد اللحظة المؤثرة في المباراة!`
          });
        }
      }
    }

    for (let i = 0; i < awaySOT; i++) {
      const chance = (awayAtk / (homeDef + 35)) * 0.69;
      if (Math.random() < chance) {
        awayGoals++;
        const scorer = pickScorer(awayStarters);
        if (scorer) {
          scorer.goals += 1;
          events.push({
            minute: minuteOffset + Math.floor(Math.random() * Math.max(1, windowMinutes)),
            type: 'GOAL',
            teamId: awayTeam.id,
            teamName: awayTeam.nameAr,
            playerId: scorer.id,
            playerName: scorer.nameAr,
            descriptionAr: `⚽ جوووول للخصم! ${scorer.nameAr} يستغل الموقف ويسجل هدفاً!`
          });
        }
      }
    }

    return { homeGoals, awayGoals, events: events.sort((a, b) => a.minute - b.minute) };
  }

  private static buildStoppageEvent(homeTeam: CoachTeam, awayTeam: CoachTeam, stoppage: PendingMatchDecision): CoachMatchEvent {
    const teamName = stoppage.teamId === homeTeam.id ? homeTeam.nameAr : awayTeam.nameAr;
    if (stoppage.type === 'INJURY') {
      return {
        minute: stoppage.minute,
        type: 'INJURY',
        teamId: stoppage.teamId,
        teamName,
        playerId: stoppage.playerId,
        playerName: stoppage.playerName,
        descriptionAr: `🚑 إصابة للاعب ${stoppage.playerName} (${stoppage.positionAr})! لا يستطيع مواصلة المباراة ويتطلب الأمر تبديلاً فورياً من دكة البدلاء.`
      };
    }
    return {
      minute: stoppage.minute,
      type: 'RED_CARD',
      teamId: stoppage.teamId,
      teamName,
      playerId: stoppage.playerId,
      playerName: stoppage.playerName,
      descriptionAr: `🟥 طرد مباشر! ${stoppage.playerName} (${stoppage.positionAr}) يغادر الملعب ويتبقى الفريق بعشرة لاعبين فقط!`
    };
  }

  /** Builds the partial (paused) result for a half, up to the moment the stoppage occurred. */
  private static buildPartialHalf(
    params: SimulationParams,
    half: 1 | 2,
    stoppage: PendingMatchDecision,
    priorHalfState?: HalfTimeSimState
  ): PartialHalfResult {
    const { homeTeam, awayTeam, userTeamId, userTactics } = params;
    const isHomeUser = userTeamId ? homeTeam.id === userTeamId : false;
    const homeStrength = this.calculateStartingStrength(homeTeam, isHomeUser ? userTactics : undefined);
    const awayStrength = this.calculateStartingStrength(awayTeam, !isHomeUser ? userTactics : undefined);

    const halfStart = half === 1 ? 0 : 45;
    const halfEnd = half === 1 ? 45 : 90;
    const windowMinutes = stoppage.minute - halfStart;

    const { homeGoals, awayGoals, events } = this.generateWindowEvents(
      homeTeam,
      awayTeam,
      homeStrength,
      awayStrength,
      windowMinutes,
      halfEnd - halfStart,
      halfStart
    );

    const stoppageEvent = this.buildStoppageEvent(homeTeam, awayTeam, stoppage);
    const eventsSoFar = [...(priorHalfState?.events || []), ...events, stoppageEvent].sort((a, b) => a.minute - b.minute);

    return {
      isPartial: true,
      half,
      pendingDecision: stoppage,
      resumeMinute: stoppage.minute,
      halfEndMinute: halfEnd,
      eventsSoFar,
      homeGoalsSoFar: (priorHalfState?.homeScore || 0) + homeGoals,
      awayGoalsSoFar: (priorHalfState?.awayScore || 0) + awayGoals,
      params,
      priorHalfState
    };
  }

  /**
   * Resumes a paused FIRST half after the manager's decision has been
   * applied (substitution already made in updatedHomeTeam/AwayTeam, or
   * tactics already updated). Produces a normal HalfTimeSimState so
   * the rest of the app (halftime screen, simulateSecondHalf) works
   * exactly as it does for a non-interrupted half.
   */
  public static resumeFirstHalf(
    partial: PartialHalfResult,
    updatedHomeTeam: CoachTeam,
    updatedAwayTeam: CoachTeam,
    updatedTactics?: UserTacticalSettings
  ): HalfTimeSimState {
    const params: SimulationParams = {
      ...partial.params,
      homeTeam: updatedHomeTeam,
      awayTeam: updatedAwayTeam,
      userTactics: updatedTactics ?? partial.params.userTactics
    };
    const isHomeUser = params.userTeamId ? updatedHomeTeam.id === params.userTeamId : false;
    const homeStrength = this.calculateStartingStrength(updatedHomeTeam, isHomeUser ? params.userTactics : undefined);
    const awayStrength = this.calculateStartingStrength(updatedAwayTeam, !isHomeUser ? params.userTactics : undefined);

    const penalty = this.computeRedCardPenalty(partial.pendingDecision, params.userTactics);
    const windowMinutes = partial.halfEndMinute - partial.resumeMinute;
    const { homeGoals, awayGoals, events } = this.generateWindowEvents(
      updatedHomeTeam,
      updatedAwayTeam,
      homeStrength,
      awayStrength,
      windowMinutes,
      45,
      partial.resumeMinute,
      penalty
    );

    const allEvents = [...partial.eventsSoFar, ...events].sort((a, b) => a.minute - b.minute);
    const totalHomeGoals = partial.homeGoalsSoFar + homeGoals;
    const totalAwayGoals = partial.awayGoalsSoFar + awayGoals;

    const homeStarters = updatedHomeTeam.squad.filter((p) => updatedHomeTeam.startingXI.includes(p.id));
    const awayStarters = updatedAwayTeam.squad.filter((p) => updatedAwayTeam.startingXI.includes(p.id));

    const homeReds = partial.pendingDecision.type === 'RED_CARD' && partial.pendingDecision.teamId === updatedHomeTeam.id ? 1 : 0;
    const awayReds = partial.pendingDecision.type === 'RED_CARD' && partial.pendingDecision.teamId === updatedAwayTeam.id ? 1 : 0;

    const stats: CoachMatchStats = {
      possession: [50, 50],
      shots: [Math.max(4, totalHomeGoals * 2 + 4), Math.max(4, totalAwayGoals * 2 + 4)],
      shotsOnTarget: [Math.max(2, totalHomeGoals + 2), Math.max(2, totalAwayGoals + 2)],
      corners: [4, 4],
      fouls: [8, 8],
      yellowCards: [0, 0],
      redCards: [homeReds, awayReds],
      passAccuracy: [80, 80]
    };

    return {
      params,
      homeScore: totalHomeGoals,
      awayScore: totalAwayGoals,
      events: allEvents,
      stats,
      homeStrength,
      awayStrength,
      halfTimeFeedback: {
        whatIsWorkingAr: totalHomeGoals >= totalAwayGoals ? ['التعامل الجيد مع الحادثة حافظ على تماسك الفريق.'] : [],
        whatIsNotWorkingAr:
          partial.pendingDecision.type === 'RED_CARD'
            ? ['اللعب بعشرة لاعبين يفرض ضغطاً دفاعياً إضافياً لبقية الشوط.']
            : ['غياب المصاب المفاجئ أثر على تماسك خطة اللعب.'],
        momentumAr:
          totalHomeGoals === totalAwayGoals
            ? 'تعادل بعد حادثة مؤثرة غيّرت مجرى الشوط'
            : totalHomeGoals > totalAwayGoals
            ? 'أفضلية لفريقك رغم الحادثة المؤثرة'
            : 'الخصم يستغل الحادثة ويفرض أفضليته'
      },
      firstHalfHomeStarters: homeStarters,
      firstHalfAwayStarters: awayStarters,
      homeInjuries: partial.pendingDecision.type === 'INJURY' && partial.pendingDecision.teamId === updatedHomeTeam.id ? 1 : 0,
      awayInjuries: partial.pendingDecision.type === 'INJURY' && partial.pendingDecision.teamId === updatedAwayTeam.id ? 1 : 0
    };
  }

  private static computeRedCardPenalty(
    decision: PendingMatchDecision,
    tactics?: UserTacticalSettings
  ): { teamId: string; attackMult: number; defenseMult: number } | undefined {
    if (decision.type !== 'RED_CARD') return undefined;
    const mentality = tactics?.mentality;
    let attackMult = 0.88;
    let defenseMult = 0.92;
    if (mentality === 'VERY_DEFENSIVE' || mentality === 'DEFENSIVE') {
      // Compact & disciplined with ten men — sacrifices attack, protects defense best.
      attackMult = 0.8;
      defenseMult = 0.97;
    } else if (mentality === 'ATTACKING' || mentality === 'ALL_OUT_ATTACK') {
      // Risky — keeps more attacking threat but leaves the defense far more exposed.
      attackMult = 0.97;
      defenseMult = 0.8;
    }
    return { teamId: decision.teamId, attackMult, defenseMult };
  }

  /**
   * Resumes a paused SECOND half after the manager's decision has been
   * applied, producing the full final CoachMatchResult (combining the
   * already-locked first half with the freshly-generated remainder of
   * the second half).
   */
  public static resumeSecondHalf(
    partial: PartialHalfResult,
    updatedHomeTeam: CoachTeam,
    updatedAwayTeam: CoachTeam,
    updatedTactics?: UserTacticalSettings
  ): CoachMatchResult {
    const halfTimeState = partial.priorHalfState!;
    const params: SimulationParams = {
      ...partial.params,
      homeTeam: updatedHomeTeam,
      awayTeam: updatedAwayTeam,
      userTactics: updatedTactics ?? partial.params.userTactics
    };
    const isHomeUser = params.userTeamId ? updatedHomeTeam.id === params.userTeamId : false;
    const homeStrength = this.calculateStartingStrength(updatedHomeTeam, isHomeUser ? params.userTactics : undefined);
    const awayStrength = this.calculateStartingStrength(updatedAwayTeam, !isHomeUser ? params.userTactics : undefined);

    const penalty = this.computeRedCardPenalty(partial.pendingDecision, params.userTactics);
    const windowMinutes = partial.halfEndMinute - partial.resumeMinute;
    const { homeGoals, awayGoals, events: windowEvents } = this.generateWindowEvents(
      updatedHomeTeam,
      updatedAwayTeam,
      homeStrength,
      awayStrength,
      windowMinutes,
      45,
      partial.resumeMinute,
      penalty
    );

    const events = [...partial.eventsSoFar, ...windowEvents].sort((a, b) => a.minute - b.minute);
    const finalHomeScore = partial.homeGoalsSoFar + homeGoals;
    const finalAwayScore = partial.awayGoalsSoFar + awayGoals;

    const homeStarters = updatedHomeTeam.squad.filter((p) => updatedHomeTeam.startingXI.includes(p.id));
    const awayStarters = updatedAwayTeam.squad.filter((p) => updatedAwayTeam.startingXI.includes(p.id));

    updatedHomeTeam.squad.forEach((p) => {
      if (updatedHomeTeam.startingXI.includes(p.id)) {
        p.fitness = Math.max(48, p.fitness - 9);
        p.matchesPlayed += 1;
      }
    });
    updatedAwayTeam.squad.forEach((p) => {
      if (updatedAwayTeam.startingXI.includes(p.id)) {
        p.fitness = Math.max(48, p.fitness - 9);
        p.matchesPlayed += 1;
      }
    });

    let penaltyScore: [number, number] | undefined = undefined;
    let isExtraTime = false;
    if (params.isKnockout && finalHomeScore === finalAwayScore) {
      isExtraTime = true;
      let extraHomeGoals = finalHomeScore;
      let extraAwayGoals = finalAwayScore;
      if (Math.random() < 0.35) {
        if (Math.random() > 0.5) extraHomeGoals++;
        else extraAwayGoals++;
      }
      if (extraHomeGoals === extraAwayGoals) {
        let pHome = 4 + (Math.random() > 0.5 ? 1 : 0);
        let pAway = 4 + (Math.random() > 0.5 ? 1 : 0);
        if (pHome === pAway) {
          if (Math.random() > 0.5) pHome++;
          else pAway++;
        }
        penaltyScore = [pHome, pAway];
      }
    }

    const homeReds = partial.pendingDecision.type === 'RED_CARD' && partial.pendingDecision.teamId === updatedHomeTeam.id ? 1 : 0;
    const awayReds = partial.pendingDecision.type === 'RED_CARD' && partial.pendingDecision.teamId === updatedAwayTeam.id ? 1 : 0;

    const finalStats: CoachMatchStats = {
      possession: halfTimeState.stats.possession,
      shots: [
        halfTimeState.stats.shots[0] + Math.max(2, finalHomeScore * 2),
        halfTimeState.stats.shots[1] + Math.max(2, finalAwayScore * 2)
      ],
      shotsOnTarget: [
        halfTimeState.stats.shotsOnTarget[0] + Math.max(1, finalHomeScore),
        halfTimeState.stats.shotsOnTarget[1] + Math.max(1, finalAwayScore)
      ],
      bigChances: halfTimeState.stats.bigChances,
      corners: halfTimeState.stats.corners,
      fouls: halfTimeState.stats.fouls,
      yellowCards: halfTimeState.stats.yellowCards,
      redCards: [homeReds, awayReds],
      passAccuracy: halfTimeState.stats.passAccuracy
    };

    const pickScorer = (starters: CoachSquadPlayer[]) => {
      const strikers = starters.filter((p) => ['ST', 'RW', 'LW', 'CAM'].includes(p.position));
      const pool = strikers.length ? strikers : starters;
      return pool[Math.floor(Math.random() * pool.length)] || starters[0];
    };
    const motmPlayer = finalHomeScore >= finalAwayScore ? pickScorer(homeStarters) : pickScorer(awayStarters);
    const motmTeam = finalHomeScore >= finalAwayScore ? updatedHomeTeam.nameAr : updatedAwayTeam.nameAr;

    let analysis = '';
    if (finalHomeScore > finalAwayScore) {
      analysis = `انتصار مستحق لنادي ${updatedHomeTeam.nameAr} رغم اللحظة المؤثرة في المباراة، بنتيجة ${finalHomeScore} - ${finalAwayScore}.`;
    } else if (finalHomeScore < finalAwayScore) {
      analysis = `خسارة لنادي ${updatedHomeTeam.nameAr} بعد لحظة مؤثرة غيّرت مجرى اللقاء، بنتيجة ${finalAwayScore} - ${finalHomeScore}.`;
    } else {
      analysis = `تعادل (${finalHomeScore} - ${finalAwayScore}) في مباراة شهدت لحظة مؤثرة غيّرت خطط الفريقين.`;
    }

    return {
      id: `match_${params.matchday}_${updatedHomeTeam.id}_${updatedAwayTeam.id}_${Date.now()}`,
      matchday: params.matchday,
      homeTeamId: updatedHomeTeam.id,
      awayTeamId: updatedAwayTeam.id,
      homeScore: finalHomeScore,
      awayScore: finalAwayScore,
      halfTimeScore: [halfTimeState.homeScore, halfTimeState.awayScore],
      halfTimeStats: halfTimeState.stats,
      halfTimeEvents: halfTimeState.events,
      halfTimeFeedback: halfTimeState.halfTimeFeedback,
      played: true,
      events,
      stats: finalStats,
      manOfTheMatch: {
        playerName: motmPlayer?.nameAr || 'لاعب مؤثر',
        teamName: motmTeam,
        rating: 8.2,
        goals: finalHomeScore >= finalAwayScore ? Math.max(1, homeGoals) : 0,
        assists: 0
      },
      tacticalAnalysisAr: analysis,
      penaltyScore,
      isExtraTime
    };
  }

  public static simulateFirstHalf(params: SimulationParams): HalfTimeSimState | PartialHalfResult {
    // HARD SAFETY: never let an injured/suspended player take the pitch,
    // even if one slipped into a stale saved career or a manual XI pick.
    params = {
      ...params,
      homeTeam: this.sanitizeTeamForMatch(params.homeTeam),
      awayTeam: this.sanitizeTeamForMatch(params.awayTeam)
    };
    const { homeTeam, awayTeam, userTeamId, userTactics } = params;

    const isHomeUser = userTeamId ? homeTeam.id === userTeamId : false;
    const isAwayUser = userTeamId ? awayTeam.id === userTeamId : false;

    // Forced in-match decision check — rolled BEFORE anything else is
    // generated for this half, so if it fires, nothing about the rest
    // of the half has been decided yet.
    if (userTeamId) {
      const userTeam = isHomeUser ? homeTeam : isAwayUser ? awayTeam : null;
      if (userTeam) {
        const stoppage = this.rollStoppage(userTeam, 1);
        if (stoppage) {
          return this.buildPartialHalf(params, 1, stoppage);
        }
      }
    }

    const homeStrength = this.calculateStartingStrength(homeTeam, isHomeUser ? userTactics : undefined);
    const awayStrength = this.calculateStartingStrength(awayTeam, isAwayUser ? userTactics : undefined);

    const homeFormation = COACH_FORMATIONS.find((f) => f.id === homeTeam.formation);
    const awayFormation = COACH_FORMATIONS.find((f) => f.id === awayTeam.formation);

    const homeStyle = COACH_PLAYING_STYLES.find(
      (s) => s.name === homeTeam.playingStyle || s.id === homeTeam.playingStyle
    );
    const awayStyle = COACH_PLAYING_STYLES.find(
      (s) => s.name === awayTeam.playingStyle || s.id === awayTeam.playingStyle
    );

    const homeHomeAdvantage = 3.5;
    const homeSynergy = this.getTacticalSynergy(homeTeam.formation, homeTeam.playingStyle);
    const awaySynergy = this.getTacticalSynergy(awayTeam.formation, awayTeam.playingStyle);

    // Every playing style genuinely changes the match, not just its
    // label: a high counterVulnerability style (High Press, Possession)
    // hands the OPPONENT extra attacking chances (space left in behind),
    // while a low counterVulnerability style (Low Block, Defensive
    // Football) chokes off exactly that same opportunity for them.
    const homeChanceMod = (homeStyle?.chanceCreationModifier || 0) + (awayStyle?.counterVulnerability || 0) * 0.4;
    const awayChanceMod = (awayStyle?.chanceCreationModifier || 0) + (homeStyle?.counterVulnerability || 0) * 0.4;

    let homeTacticalAdv = 0;
    let awayTacticalAdv = 0;

    if (homeStyle?.id === 'counter_attack' && (awayStyle?.id === 'possession' || awayStyle?.id === 'high_press')) {
      homeTacticalAdv += 5;
    }
    if (awayStyle?.id === 'counter_attack' && (homeStyle?.id === 'possession' || homeStyle?.id === 'high_press')) {
      awayTacticalAdv += 5;
    }

    const homeTotalRating =
      homeStrength.overall + homeHomeAdvantage + homeSynergy + homeTacticalAdv + (homeFormation?.midfieldBonus || 0) * 0.15;
    const awayTotalRating =
      awayStrength.overall + awaySynergy + awayTacticalAdv + (awayFormation?.midfieldBonus || 0) * 0.15;

    // Possession % for 1st half
    const possessionBase = 50 + (homeTotalRating - awayTotalRating) * 0.75;
    const stylePossDiff = (homeStyle?.possessionModifier || 0) - (awayStyle?.possessionModifier || 0);
    const homePossRaw = Math.min(74, Math.max(26, Math.round(possessionBase + stylePossDiff * 0.55)));
    const awayPossRaw = 100 - homePossRaw;

    // 1st Half Shots & Big Chances
    const homeShots = Math.max(
      1,
      Math.round(5 + (homePossRaw - 50) * 0.12 + homeChanceMod * 0.25 + (Math.random() * 3 - 1.5))
    );
    const awayShots = Math.max(
      1,
      Math.round(5 + (awayPossRaw - 50) * 0.12 + awayChanceMod * 0.25 + (Math.random() * 3 - 1.5))
    );

    const homeShotsOnTarget = Math.max(0, Math.min(homeShots, Math.round(homeShots * (0.35 + Math.random() * 0.25))));
    const awayShotsOnTarget = Math.max(0, Math.min(awayShots, Math.round(awayShots * (0.35 + Math.random() * 0.25))));

    const homeBigChances = Math.max(0, Math.round(homeShotsOnTarget * 0.45 + (Math.random() > 0.6 ? 1 : 0)));
    const awayBigChances = Math.max(0, Math.round(awayShotsOnTarget * 0.45 + (Math.random() > 0.6 ? 1 : 0)));

    let homeGoals = 0;
    let awayGoals = 0;

    const homeGKHeroic = Math.random() < 0.12;
    const awayGKHeroic = Math.random() < 0.12;

    for (let i = 0; i < homeShotsOnTarget; i++) {
      let scoringChance = (homeStrength.attack / (awayStrength.defense + 35)) * 0.58;
      if (awayGKHeroic) scoringChance *= 0.45;
      if (Math.random() < scoringChance) homeGoals++;
    }

    for (let i = 0; i < awayShotsOnTarget; i++) {
      let scoringChance = (awayStrength.attack / (homeStrength.defense + 35)) * 0.55;
      if (homeGKHeroic) scoringChance *= 0.45;
      if (Math.random() < scoringChance) awayGoals++;
    }

    const events: CoachMatchEvent[] = [];
    const homeStarters = homeTeam.squad.filter((p) => homeTeam.startingXI.includes(p.id));
    const awayStarters = awayTeam.squad.filter((p) => awayTeam.startingXI.includes(p.id));

    const pickScorer = (starters: typeof homeStarters) => {
      const strikers = starters.filter((p) => ['ST', 'RW', 'LW', 'CAM'].includes(p.position));
      const pool = strikers.length ? strikers : starters;
      return pool[Math.floor(Math.random() * pool.length)] || starters[0];
    };

    const pickAssister = (starters: typeof homeStarters, scorerId: string) => {
      const others = starters.filter(
        (p) => p.id !== scorerId && ['CAM', 'CM', 'RW', 'LW', 'LB', 'RB'].includes(p.position)
      );
      if (!others.length || Math.random() < 0.25) return undefined;
      return others[Math.floor(Math.random() * others.length)].nameAr;
    };

    for (let g = 0; g < homeGoals; g++) {
      const minute = Math.floor(Math.random() * 42) + 3;
      const scorer = pickScorer(homeStarters);
      const assist = pickAssister(homeStarters, scorer.id);
      scorer.goals += 1;
      events.push({
        minute,
        type: 'GOAL',
        teamId: homeTeam.id,
        teamName: homeTeam.nameAr,
        playerId: scorer.id,
        playerName: scorer.nameAr,
        assistPlayerName: assist,
        descriptionAr: assist
          ? `⚽ جوووول! ${scorer.nameAr} يفتتح التسجيل بعد تمريرة حاسمة متقنة من ${assist}!`
          : `⚽ جوووول! ${scorer.nameAr} يسدد كرة رائعة داخل الشباك معلناً الهدف الأول!`
      });
    }

    for (let g = 0; g < awayGoals; g++) {
      const minute = Math.floor(Math.random() * 42) + 3;
      const scorer = pickScorer(awayStarters);
      const assist = pickAssister(awayStarters, scorer.id);
      scorer.goals += 1;
      events.push({
        minute,
        type: 'GOAL',
        teamId: awayTeam.id,
        teamName: awayTeam.nameAr,
        playerId: scorer.id,
        playerName: scorer.nameAr,
        assistPlayerName: assist,
        descriptionAr: assist
          ? `⚽ جوووول للخصم! ${scorer.nameAr} يسجل هدفاً مباغتاً بعد صناعة من ${assist}!`
          : `⚽ جوووول للخصم! تسديدة قوية من ${scorer.nameAr} تسكن الشباك!`
      });
    }

    if (homeShotsOnTarget > 0 || awayShotsOnTarget > 0) {
      events.push({
        minute: Math.floor(Math.random() * 35) + 6,
        type: 'SAVE',
        teamId: homeTeam.id,
        teamName: homeTeam.nameAr,
        playerName: homeStarters[0]?.nameAr || 'حارس المرمى',
        descriptionAr: `🧤 تصدٍ بارع من حارس المرمى يحرم المهاجم من هدف محقق!`
      });
    }

    if (Math.random() < 0.45) {
      events.push({
        minute: Math.floor(Math.random() * 38) + 5,
        type: 'WOODWORK',
        teamId: Math.random() > 0.5 ? homeTeam.id : awayTeam.id,
        teamName: homeTeam.nameAr,
        playerName: 'القائم',
        descriptionAr: `💥 يا رباااه! القائم يتعاطف مع الحارس ويبعد كرة هدف مؤكد!`
      });
    }

    let homeYellows = 0;
    let awayYellows = 0;
    // Higher pressing intensity means more physical duels and more
    // cards, exactly like real football — a Low Block team collects far
    // fewer cards than a High Press / High Intensity team.
    const homeCardChance = 0.4 + (homeStyle?.pressingModifier || 0) * 0.006;
    const awayCardChance = 0.4 + (awayStyle?.pressingModifier || 0) * 0.006;
    if (Math.random() < homeCardChance) {
      homeYellows++;
      const def = homeStarters[Math.floor(Math.random() * homeStarters.length)] || homeStarters[0];
      def.yellowCards += 1;
      events.push({
        minute: Math.floor(Math.random() * 35) + 10,
        type: 'YELLOW_CARD',
        teamId: homeTeam.id,
        teamName: homeTeam.nameAr,
        playerName: def.nameAr,
        descriptionAr: `🟨 إنذار مبكر على ${def.nameAr} بعد عرقلة لمنع هجمة سريعة.`
      });
    }
    if (Math.random() < awayCardChance) {
      awayYellows++;
      const def = awayStarters[Math.floor(Math.random() * awayStarters.length)] || awayStarters[0];
      def.yellowCards += 1;
      events.push({
        minute: Math.floor(Math.random() * 35) + 10,
        type: 'YELLOW_CARD',
        teamId: awayTeam.id,
        teamName: awayTeam.nameAr,
        playerName: def.nameAr,
        descriptionAr: `🟨 بطاقة صفراء على لاعب الخصم ${def.nameAr}.`
      });
    }

    events.sort((a, b) => a.minute - b.minute);

    const whatIsWorkingAr: string[] = [];
    const whatIsNotWorkingAr: string[] = [];
    let momentumAr = 'مباراة متكافئة وحذرة بين الفريقين';

    const userPoss = isHomeUser ? homePossRaw : awayPossRaw;
    const userGoals = isHomeUser ? homeGoals : awayGoals;
    const oppGoals = isHomeUser ? awayGoals : homeGoals;
    const userShots = isHomeUser ? homeShots : awayShots;
    const oppShots = isHomeUser ? awayShots : homeShots;

    if (userPoss >= 56) {
      whatIsWorkingAr.push('الاستحواذ ممتاز (+ ' + userPoss + '%) وتدوير الكرة في مناطق المنافس يسير بثبات.');
    } else if (userPoss <= 42) {
      whatIsNotWorkingAr.push('فقدان السيطرة في خط الوسط وصعوبة الخروج بالكرة تحت الضغط.');
    }

    if (userShots >= 5) {
      whatIsWorkingAr.push('خلق الفرص فعال وهجوم الفريق يهدد مرمى الخصم بشكل متكرر.');
    } else {
      whatIsNotWorkingAr.push('المهاجم يعاني من العزلة وقلة الإمداد بالكرات العرضية والبينية.');
    }

    if (oppShots >= 5) {
      whatIsNotWorkingAr.push('مساحات مكشوفة في الثلث الدفاعي تسمح للخصم بتهديد المرمى والتسديد بحرية.');
    } else {
      whatIsWorkingAr.push('التماسك الدفاعي صلب وإفساد لهجمات المنافس قبل الدخول للصندوق.');
    }

    if (userGoals > oppGoals) {
      momentumAr = 'أفضلية معنوية وميدانية لفريقك بفضل التقدم في النتيجة';
      whatIsWorkingAr.push('الانضباط التكتيكي وترجمة الفرص منحت الفريق التقدم.');
    } else if (userGoals < oppGoals) {
      momentumAr = 'الخصم يسيطر على الإيقاع ويجب إجراء تعديل هجومي عاجل';
      whatIsNotWorkingAr.push('تأخر في النتيجة يتطلب جرأة أكبر وتكثيف الهجوم لكسر الدفاع.');
    } else {
      momentumAr = 'تعادل وتنافس قوي، الشوط الثاني يحتاج حسماً تكتيكياً';
    }

    const halfDrain = Math.round(homeStrength.staminaDrainMultiplier * 8 + 4);
    homeStarters.forEach((p) => {
      p.fitness = Math.max(55, p.fitness - halfDrain);
    });
    awayStarters.forEach((p) => {
      p.fitness = Math.max(55, p.fitness - halfDrain);
    });

    const halfStats: CoachMatchStats = {
      possession: [homePossRaw, awayPossRaw],
      shots: [homeShots, awayShots],
      shotsOnTarget: [homeShotsOnTarget, awayShotsOnTarget],
      bigChances: [homeBigChances, awayBigChances],
      corners: [Math.round(homeShots * 0.4), Math.round(awayShots * 0.4)],
      fouls: [Math.round(homeShots * 0.5) + 3, Math.round(awayShots * 0.5) + 3],
      yellowCards: [homeYellows, awayYellows],
      redCards: [0, 0],
      passAccuracy: [
        Math.round(80 + (homePossRaw - 50) * 0.25),
        Math.round(80 + (awayPossRaw - 50) * 0.25)
      ]
    };

    return {
      params,
      homeScore: homeGoals,
      awayScore: awayGoals,
      events,
      stats: halfStats,
      homeStrength,
      awayStrength,
      halfTimeFeedback: {
        whatIsWorkingAr,
        whatIsNotWorkingAr,
        momentumAr
      },
      firstHalfHomeStarters: homeStarters,
      firstHalfAwayStarters: awayStarters,
      homeInjuries: 0,
      awayInjuries: 0
    };
  }

  /**
   * محاكاة الشوط الثاني مع تطبيق أي تعديلات تكتيكية أو تبديلات أجراها المدرب (Minutes 46 - 90+)
   */
  public static simulateSecondHalf(
    halfTimeState: HalfTimeSimState,
    updatedParams?: Partial<SimulationParams>
  ): CoachMatchResult | PartialHalfResult {
    const params: SimulationParams = {
      ...halfTimeState.params,
      ...updatedParams
    };

    const { homeTeam, awayTeam, userTeamId, userTactics, matchday, isKnockout } = params;
    const isHomeUser = userTeamId ? homeTeam.id === userTeamId : false;
    const isAwayUser = userTeamId ? awayTeam.id === userTeamId : false;

    // Forced in-match decision check for the second half — same
    // principle: rolled before any second-half goals exist yet.
    if (userTeamId) {
      const userTeam = isHomeUser ? homeTeam : isAwayUser ? awayTeam : null;
      if (userTeam) {
        const stoppage = this.rollStoppage(userTeam, 2);
        if (stoppage) {
          return this.buildPartialHalf(params, 2, stoppage, halfTimeState);
        }
      }
    }

    // Recalculate second half strengths based on ANY NEW TACTICS OR SUBS
    const homeStrength = this.calculateStartingStrength(homeTeam, isHomeUser ? userTactics : undefined);
    const awayStrength = this.calculateStartingStrength(awayTeam, isAwayUser ? userTactics : undefined);

    const homeFormation = COACH_FORMATIONS.find((f) => f.id === homeTeam.formation);
    const awayFormation = COACH_FORMATIONS.find((f) => f.id === awayTeam.formation);

    const homeStyle = COACH_PLAYING_STYLES.find(
      (s) => s.name === homeTeam.playingStyle || s.id === homeTeam.playingStyle
    );
    const awayStyle = COACH_PLAYING_STYLES.find(
      (s) => s.name === awayTeam.playingStyle || s.id === awayTeam.playingStyle
    );

    // High-intensity styles (High Press, High Intensity) burn a team out
    // by the second half far more than a conservative style (Low Block,
    // Defensive Football) — applied here as a genuine strength penalty
    // for the remainder of the match, not just a cosmetic stat.
    const homeFatiguePenalty = 1 - Math.min(0.12, (homeStyle?.fatigueModifier || 6) * 0.006);
    const awayFatiguePenalty = 1 - Math.min(0.12, (awayStyle?.fatigueModifier || 6) * 0.006);
    homeStrength.attack = Math.round(homeStrength.attack * homeFatiguePenalty);
    homeStrength.defense = Math.round(homeStrength.defense * homeFatiguePenalty);
    awayStrength.attack = Math.round(awayStrength.attack * awayFatiguePenalty);
    awayStrength.defense = Math.round(awayStrength.defense * awayFatiguePenalty);

    const homeHomeAdvantage = 3.5;
    const homeSynergy = this.getTacticalSynergy(homeTeam.formation, homeTeam.playingStyle);
    const awaySynergy = this.getTacticalSynergy(awayTeam.formation, awayTeam.playingStyle);

    // Every playing style genuinely changes the match, not just its
    // label: a high counterVulnerability style (High Press, Possession)
    // hands the OPPONENT extra attacking chances (space left in behind),
    // while a low counterVulnerability style (Low Block, Defensive
    // Football) chokes off exactly that same opportunity for them.
    const homeChanceMod = (homeStyle?.chanceCreationModifier || 0) + (awayStyle?.counterVulnerability || 0) * 0.4;
    const awayChanceMod = (awayStyle?.chanceCreationModifier || 0) + (homeStyle?.counterVulnerability || 0) * 0.4;

    let homeTacticalAdv = 0;
    let awayTacticalAdv = 0;

    if (homeStyle?.id === 'counter_attack' && (awayStyle?.id === 'possession' || awayStyle?.id === 'high_press')) {
      homeTacticalAdv += 5;
    }
    if (awayStyle?.id === 'counter_attack' && (homeStyle?.id === 'possession' || homeStyle?.id === 'high_press')) {
      awayTacticalAdv += 5;
    }

    const homeTotalRating =
      homeStrength.overall + homeHomeAdvantage + homeSynergy + homeTacticalAdv + (homeFormation?.midfieldBonus || 0) * 0.15;
    const awayTotalRating =
      awayStrength.overall + awaySynergy + awayTacticalAdv + (awayFormation?.midfieldBonus || 0) * 0.15;

    // 2nd half possession
    const possessionBase = 50 + (homeTotalRating - awayTotalRating) * 0.75;
    const stylePossDiff = (homeStyle?.possessionModifier || 0) - (awayStyle?.possessionModifier || 0);
    const secondHalfHomePoss = Math.min(76, Math.max(24, Math.round(possessionBase + stylePossDiff * 0.6)));
    const secondHalfAwayPoss = 100 - secondHalfHomePoss;

    // Second half shots
    const secondHalfHomeShots = Math.max(
      2,
      Math.round(6 + (secondHalfHomePoss - 50) * 0.14 + homeChanceMod * 0.3 + (Math.random() * 4 - 2))
    );
    const secondHalfAwayShots = Math.max(
      2,
      Math.round(6 + (secondHalfAwayPoss - 50) * 0.14 + awayChanceMod * 0.3 + (Math.random() * 4 - 2))
    );

    const secondHalfHomeShotsOnTarget = Math.max(
      1,
      Math.min(secondHalfHomeShots, Math.round(secondHalfHomeShots * (0.35 + Math.random() * 0.25)))
    );
    const secondHalfAwayShotsOnTarget = Math.max(
      1,
      Math.min(secondHalfAwayShots, Math.round(secondHalfAwayShots * (0.35 + Math.random() * 0.25)))
    );

    const secondHalfHomeBigChances = Math.max(0, Math.round(secondHalfHomeShotsOnTarget * 0.5 + (Math.random() > 0.5 ? 1 : 0)));
    const secondHalfAwayBigChances = Math.max(0, Math.round(secondHalfAwayShotsOnTarget * 0.5 + (Math.random() > 0.5 ? 1 : 0)));

    let secondHalfHomeGoals = 0;
    let secondHalfAwayGoals = 0;

    const homeGKHeroic = Math.random() < 0.15;
    const awayGKHeroic = Math.random() < 0.15;

    for (let i = 0; i < secondHalfHomeShotsOnTarget; i++) {
      let scoringChance = (homeStrength.attack / (awayStrength.defense + 35)) * 0.76;
      if (awayGKHeroic) scoringChance *= 0.45;
      if (Math.random() < scoringChance) secondHalfHomeGoals++;
    }

    for (let i = 0; i < secondHalfAwayShotsOnTarget; i++) {
      let scoringChance = (awayStrength.attack / (homeStrength.defense + 35)) * 0.73;
      if (homeGKHeroic) scoringChance *= 0.45;
      if (Math.random() < scoringChance) secondHalfAwayGoals++;
    }

    const homeStarters = homeTeam.squad.filter((p) => homeTeam.startingXI.includes(p.id));
    const awayStarters = awayTeam.squad.filter((p) => awayTeam.startingXI.includes(p.id));

    const pickScorer = (starters: typeof homeStarters) => {
      const strikers = starters.filter((p) => ['ST', 'RW', 'LW', 'CAM'].includes(p.position));
      const pool = strikers.length ? strikers : starters;
      return pool[Math.floor(Math.random() * pool.length)] || starters[0];
    };

    const pickAssister = (starters: typeof homeStarters, scorerId: string) => {
      const others = starters.filter(
        (p) => p.id !== scorerId && ['CAM', 'CM', 'RW', 'LW', 'LB', 'RB'].includes(p.position)
      );
      if (!others.length || Math.random() < 0.25) return undefined;
      return others[Math.floor(Math.random() * others.length)].nameAr;
    };

    const events: CoachMatchEvent[] = [...halfTimeState.events];

    // Second Half Goals (minutes 48 to 90)
    for (let g = 0; g < secondHalfHomeGoals; g++) {
      const minute = Math.floor(Math.random() * 41) + 48;
      const scorer = pickScorer(homeStarters);
      const assist = pickAssister(homeStarters, scorer.id);
      scorer.goals += 1;
      events.push({
        minute,
        type: 'GOAL',
        teamId: homeTeam.id,
        teamName: homeTeam.nameAr,
        playerId: scorer.id,
        playerName: scorer.nameAr,
        assistPlayerName: assist,
        descriptionAr: assist
          ? `⚽ جوووول! ${scorer.nameAr} يسجل هدفاً قاتلاً بعد صناعة ذكية من ${assist}!`
          : `⚽ جوووول! لمسة سحرية من ${scorer.nameAr} تهز الشباك في الشوط الثاني!`
      });
    }

    for (let g = 0; g < secondHalfAwayGoals; g++) {
      const minute = Math.floor(Math.random() * 41) + 48;
      const scorer = pickScorer(awayStarters);
      const assist = pickAssister(awayStarters, scorer.id);
      scorer.goals += 1;
      events.push({
        minute,
        type: 'GOAL',
        teamId: awayTeam.id,
        teamName: awayTeam.nameAr,
        playerId: scorer.id,
        playerName: scorer.nameAr,
        assistPlayerName: assist,
        descriptionAr: assist
          ? `⚽ جوووول للخصم! ${scorer.nameAr} يسجل هدفاً بعد ارتباك دفاعي وصناعة من ${assist}!`
          : `⚽ جوووول للخصم! تسديدة من ${scorer.nameAr} تعانق الشباك!`
      });
    }

    const diff = params.aiDifficulty || 'NORMAL';
    const isHomeAI = homeTeam.controllerType === 'AI' || (params.userTeamId ? homeTeam.id !== params.userTeamId : false);
    const isAwayAI = awayTeam.controllerType === 'AI' || (params.userTeamId ? awayTeam.id !== params.userTeamId : true);

    const currentTotalHomeGoals = halfTimeState.homeScore + secondHalfHomeGoals;
    const currentTotalAwayGoals = halfTimeState.awayScore + secondHalfAwayGoals;

    if (isHomeAI) {
      const homePersonality = CoachAiIntelligence.getTeamPersonality(homeTeam);
      const reactMinute = Math.floor(Math.random() * 14) + 60;
      const homeReact = CoachAiIntelligence.evaluateInMatchReaction({
        team: homeTeam,
        opponentTeam: awayTeam,
        aiScore: currentTotalHomeGoals,
        opponentScore: currentTotalAwayGoals,
        difficulty: diff,
        personality: homePersonality,
        minute: reactMinute
      });
      if (homeReact) {
        events.push(homeReact);
      }
    }

    if (isAwayAI) {
      const awayPersonality = CoachAiIntelligence.getTeamPersonality(awayTeam);
      const reactMinute = Math.floor(Math.random() * 14) + 60;
      const awayReact = CoachAiIntelligence.evaluateInMatchReaction({
        team: awayTeam,
        opponentTeam: homeTeam,
        aiScore: currentTotalAwayGoals,
        opponentScore: currentTotalHomeGoals,
        difficulty: diff,
        personality: awayPersonality,
        minute: reactMinute
      });
      if (awayReact) {
        events.push(awayReact);
      }
    }

    let homeReds = halfTimeState.stats.redCards[0];
    let awayReds = halfTimeState.stats.redCards[1];
    // Note: a stoppage on the user's own team for this half would have
    // already been handled above via the forced-decision pause, so this
    // flavor roll only ever applies to the AI-controlled side.
    if (Math.random() < 0.012 && homeStarters.length > 1 && homeTeam.id !== userTeamId) {
      const punishedPlayer = homeStarters[Math.floor(Math.random() * homeStarters.length)];
      homeReds = 1;
      punishedPlayer.redCards += 1;
      events.push({
        minute: Math.floor(Math.random() * 30) + 55,
        type: 'RED_CARD',
        teamId: homeTeam.id,
        teamName: homeTeam.nameAr,
        playerId: punishedPlayer.id,
        playerName: punishedPlayer.nameAr,
        descriptionAr: `🟥 طرد مباشر! الحكم يشهر البطاقة الحمراء في وجه ${punishedPlayer.nameAr} بعد تدخل متهور!`
      });
    } else if (Math.random() < 0.012 && awayStarters.length > 1 && awayTeam.id !== userTeamId) {
      const punishedPlayer = awayStarters[Math.floor(Math.random() * awayStarters.length)];
      awayReds = 1;
      punishedPlayer.redCards += 1;
      events.push({
        minute: Math.floor(Math.random() * 30) + 55,
        type: 'RED_CARD',
        teamId: awayTeam.id,
        teamName: awayTeam.nameAr,
        playerId: punishedPlayer.id,
        playerName: punishedPlayer.nameAr,
        descriptionAr: `🟥 طرد على لاعب الخصم ${punishedPlayer.nameAr} بعد تدخل عنيف!`
      });
    }

    // AI-only flavor injuries (the user's own team's injuries are always
    // handled via the forced-decision pause above, never here).
    if (Math.random() < 0.025 && homeStarters.length > 2 && homeTeam.id !== userTeamId) {
      const injured = homeStarters.filter((p) => p.position !== 'GK')[
        Math.floor(Math.random() * Math.max(1, homeStarters.length - 1))
      ];
      if (injured) {
        injured.injuryStatus = {
          type: 'MUSCLE',
          typeAr: 'إصابة عضلية',
          weeksRemaining: Math.floor(Math.random() * 3) + 1,
          descriptionAr: 'تمزق عضلي يستدعي الراحة والعلاج'
        };
        events.push({
          minute: Math.floor(Math.random() * 30) + 55,
          type: 'INJURY',
          teamId: homeTeam.id,
          teamName: homeTeam.nameAr,
          playerId: injured.id,
          playerName: injured.nameAr,
          descriptionAr: `🚑 إصابة للاعب ${injured.nameAr} (${this.positionLabelAr(injured.position)}) ويضطر مدربه لتبديله على طول.`
        });
      }
    } else if (Math.random() < 0.025 && awayStarters.length > 2 && awayTeam.id !== userTeamId) {
      const injured = awayStarters.filter((p) => p.position !== 'GK')[
        Math.floor(Math.random() * Math.max(1, awayStarters.length - 1))
      ];
      if (injured) {
        injured.injuryStatus = {
          type: 'ANKLE',
          typeAr: 'إصابة في الكاحل',
          weeksRemaining: Math.floor(Math.random() * 3) + 1,
          descriptionAr: 'التواء في الكاحل'
        };
        events.push({
          minute: Math.floor(Math.random() * 30) + 55,
          type: 'INJURY',
          teamId: awayTeam.id,
          teamName: awayTeam.nameAr,
          playerId: injured.id,
          playerName: injured.nameAr,
          descriptionAr: `🚑 إصابة للاعب الخصم ${injured.nameAr} (${this.positionLabelAr(injured.position)}) ويغادر الملعب للعلاج.`
        });
      }
    }

    events.sort((a, b) => a.minute - b.minute);

    const finalHomeScore = halfTimeState.homeScore + secondHalfHomeGoals;
    const finalAwayScore = halfTimeState.awayScore + secondHalfAwayGoals;

    let penaltyScore: [number, number] | undefined = undefined;
    let isExtraTime = false;

    if (isKnockout && finalHomeScore === finalAwayScore) {
      isExtraTime = true;
      let extraHomeGoals = finalHomeScore;
      let extraAwayGoals = finalAwayScore;
      if (Math.random() < 0.35) {
        if (Math.random() > 0.5) extraHomeGoals++;
        else extraAwayGoals++;
      }
      if (extraHomeGoals === extraAwayGoals) {
        let pHome = 4 + (Math.random() > 0.5 ? 1 : 0);
        let pAway = 4 + (Math.random() > 0.5 ? 1 : 0);
        if (pHome === pAway) {
          if (Math.random() > 0.5) pHome++;
          else pAway++;
        }
        penaltyScore = [pHome, pAway];
      }
    }

    const totalPossHome = Math.round((halfTimeState.stats.possession[0] + secondHalfHomePoss) / 2);
    const totalPossAway = 100 - totalPossHome;
    const totalShotsHome = halfTimeState.stats.shots[0] + secondHalfHomeShots;
    const totalShotsAway = halfTimeState.stats.shots[1] + secondHalfAwayShots;
    const totalShotsOnTargetHome = halfTimeState.stats.shotsOnTarget[0] + secondHalfHomeShotsOnTarget;
    const totalShotsOnTargetAway = halfTimeState.stats.shotsOnTarget[1] + secondHalfAwayShotsOnTarget;
    const totalBigChancesHome = (halfTimeState.stats.bigChances?.[0] || 0) + secondHalfHomeBigChances;
    const totalBigChancesAway = (halfTimeState.stats.bigChances?.[1] || 0) + secondHalfAwayBigChances;

    const secondHalfDrain = Math.round(homeStrength.staminaDrainMultiplier * 9 + 4);
    homeTeam.squad.forEach((p) => {
      const isStarter = homeTeam.startingXI.includes(p.id);
      if (isStarter) {
        p.fitness = Math.max(48, p.fitness - secondHalfDrain);
        p.matchesPlayed += 1;
      } else {
        p.fitness = Math.min(100, p.fitness + 6);
      }
    });

    awayTeam.squad.forEach((p) => {
      const isStarter = awayTeam.startingXI.includes(p.id);
      if (isStarter) {
        p.fitness = Math.max(48, p.fitness - secondHalfDrain);
        p.matchesPlayed += 1;
      } else {
        p.fitness = Math.min(100, p.fitness + 6);
      }
    });

    const motmPlayer = finalHomeScore >= finalAwayScore ? pickScorer(homeStarters) : pickScorer(awayStarters);
    const motmTeam = finalHomeScore >= finalAwayScore ? homeTeam.nameAr : awayTeam.nameAr;

    let analysis = '';
    if (finalHomeScore > finalAwayScore) {
      analysis = `انتصار تكتيكي مستحق لنادي ${homeTeam.nameAr}. نجحت الرؤية التكتيكية والتبديلات في حسم اللقاء بنتيجة ${finalHomeScore} - ${finalAwayScore}.`;
    } else if (finalHomeScore < finalAwayScore) {
      analysis = `خسارة صعبة لنادي ${homeTeam.nameAr}. المنافس نجح في ترجمة فرصه الهجومية والخروج بنتيجة الفوز ${finalAwayScore} - ${finalHomeScore}.`;
    } else {
      analysis = `تعادل تكتيكي ملتهب (${finalHomeScore} - ${finalAwayScore}). مباراة متكافئة تقاسم فيها الفريقان السيطرة والنقاط.`;
    }

    const finalStats: CoachMatchStats = {
      possession: [totalPossHome, totalPossAway],
      shots: [totalShotsHome, totalShotsAway],
      shotsOnTarget: [totalShotsOnTargetHome, totalShotsOnTargetAway],
      bigChances: [totalBigChancesHome, totalBigChancesAway],
      corners: [Math.round(totalShotsHome * 0.4), Math.round(totalShotsAway * 0.4)],
      fouls: [Math.round(totalShotsHome * 0.5) + 6, Math.round(totalShotsAway * 0.5) + 6],
      yellowCards: [
        halfTimeState.stats.yellowCards[0] + (Math.random() > 0.6 ? 1 : 0),
        halfTimeState.stats.yellowCards[1] + (Math.random() > 0.6 ? 1 : 0)
      ],
      redCards: [homeReds, awayReds],
      passAccuracy: [
        Math.round(79 + (totalPossHome - 50) * 0.28),
        Math.round(79 + (totalPossAway - 50) * 0.28)
      ]
    };

    return {
      id: `match_${matchday}_${homeTeam.id}_${awayTeam.id}_${Date.now()}`,
      matchday,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeScore: finalHomeScore,
      awayScore: finalAwayScore,
      halfTimeScore: [halfTimeState.homeScore, halfTimeState.awayScore],
      halfTimeStats: halfTimeState.stats,
      halfTimeEvents: halfTimeState.events,
      halfTimeFeedback: halfTimeState.halfTimeFeedback,
      played: true,
      events,
      stats: finalStats,
      manOfTheMatch: {
        playerName: motmPlayer.nameAr,
        teamName: motmTeam,
        rating: 8.8,
        goals: finalHomeScore >= finalAwayScore ? Math.max(1, secondHalfHomeGoals) : 0,
        assists: 1
      },
      tacticalAnalysisAr: analysis,
      penaltyScore,
      isExtraTime
    };
  }

  /**
   * Main Match Simulator: executes first half and second half sequentially
   */
  /**
   * Auto-resolves a paused stoppage exactly as a competent manager would
   * when no human is present to decide (background/no-UI simulations):
   * picks the best available bench player of a similar position for an
   * injury, or keeps a sensible balanced tactical setup for a red card.
   */
  private static autoResolveStoppage(partial: PartialHalfResult): { home: CoachTeam; away: CoachTeam; tactics?: UserTacticalSettings } {
    const { homeTeam, awayTeam, userTactics } = partial.params;
    const isHomeTeamAffected = partial.pendingDecision.teamId === homeTeam.id;
    const affectedTeam = isHomeTeamAffected ? homeTeam : awayTeam;

    if (partial.pendingDecision.type === 'INJURY') {
      const injuredId = partial.pendingDecision.playerId;
      const benchPlayers = affectedTeam.bench
        .map((id) => affectedTeam.squad.find((p) => p.id === id))
        .filter(Boolean) as CoachSquadPlayer[];
      const replacement = [...benchPlayers].sort((a, b) => b.rating - a.rating)[0];
      if (replacement) {
        const newStartingXI = affectedTeam.startingXI.map((id) => (id === injuredId ? replacement.id : id));
        const newBench = affectedTeam.bench.map((id) => (id === replacement.id ? injuredId : id));
        const updatedAffected: CoachTeam = { ...affectedTeam, startingXI: newStartingXI, bench: newBench };
        return isHomeTeamAffected
          ? { home: updatedAffected, away: awayTeam, tactics: userTactics }
          : { home: homeTeam, away: updatedAffected, tactics: userTactics };
      }
    }

    return { home: homeTeam, away: awayTeam, tactics: userTactics };
  }

  /**
   * HARD SAFETY GATE: an injured or suspended player must never take
   * part in a match, no matter how they ended up in the Starting XI
   * (manual selection, a stale saved career, a half-time substitution
   * mistake, etc.). Silently and automatically repairs the lineup
   * with the best eligible replacement before any simulation runs.
   */
  public static sanitizeTeamForMatch(team: CoachTeam): CoachTeam {
    const isUnavailable = (p?: CoachSquadPlayer): boolean => {
      if (!p) return true;
      const injured = !!p.injuryStatus && (p.injuryStatus.isMatchDayInjured || p.injuryStatus.weeksRemaining > 0);
      const suspended = !!p.suspensionStatus && p.suspensionStatus.matchesRemaining > 0;
      return injured || suspended;
    };

    const hasUnavailableStarter = team.startingXI.some((id) => isUnavailable(team.squad.find((p) => p.id === id)));
    if (!hasUnavailableStarter) return team;

    const formation = COACH_FORMATIONS.find((f) => f.id === team.formation);
    if (formation) {
      // Reuse the exact same tactical-fit algorithm as "اختيار التشكيلة
      // تلقائيًا" — it already excludes unavailable players entirely.
      const { startingXI, bench } = pickAutomaticBestXI(team, formation);
      return { ...team, startingXI, bench };
    }

    // Fallback (formation data unavailable for some reason): swap each
    // unavailable starter 1:1 with the best eligible bench player.
    let bench = [...team.bench];
    const startingXI = team.startingXI.map((id) => {
      const p = team.squad.find((s) => s.id === id);
      if (!isUnavailable(p)) return id;
      const replacement = bench
        .map((bid) => team.squad.find((s) => s.id === bid))
        .filter((bp): bp is CoachSquadPlayer => !isUnavailable(bp))
        .sort((a, b) => b.rating - a.rating)[0];
      if (replacement) {
        bench = bench.map((bid) => (bid === replacement.id ? id : bid));
        return replacement.id;
      }
      return id; // no eligible replacement available at all — leave as-is
    });

    return { ...team, startingXI, bench };
  }

  public static simulateMatch(params: SimulationParams): CoachMatchResult {
    const safeParams: SimulationParams = {
      ...params,
      homeTeam: this.sanitizeTeamForMatch(params.homeTeam),
      awayTeam: this.sanitizeTeamForMatch(params.awayTeam)
    };
    let firstHalfState = this.simulateFirstHalf(safeParams);
    if ('isPartial' in firstHalfState) {
      const resolved = this.autoResolveStoppage(firstHalfState);
      firstHalfState = this.resumeFirstHalf(firstHalfState, resolved.home, resolved.away, resolved.tactics);
    }

    let secondHalfResult = this.simulateSecondHalf(firstHalfState);
    if ('isPartial' in secondHalfResult) {
      const resolved = this.autoResolveStoppage(secondHalfResult);
      secondHalfResult = this.resumeSecondHalf(secondHalfResult, resolved.home, resolved.away, resolved.tactics);
    }
    return secondHalfResult;
  }

  /**
   * Legacy Match Simulator
   */
  private static legacySimulateMatch(params: SimulationParams): CoachMatchResult {
    const { homeTeam, awayTeam, matchday, isKnockout } = params;

    const homeStrength = this.calculateStartingStrength(homeTeam);
    const awayStrength = this.calculateStartingStrength(awayTeam);

    const homeFormation = COACH_FORMATIONS.find((f) => f.id === homeTeam.formation);
    const awayFormation = COACH_FORMATIONS.find((f) => f.id === awayTeam.formation);

    const homeStyle = COACH_PLAYING_STYLES.find((s) => s.name === homeTeam.playingStyle || s.id === homeTeam.playingStyle);
    const awayStyle = COACH_PLAYING_STYLES.find((s) => s.name === awayTeam.playingStyle || s.id === awayTeam.playingStyle);

    // Tactical calculations
    const homeHomeAdvantage = 4; // +4% home advantage
    const homeSynergy = this.getTacticalSynergy(homeTeam.formation, homeTeam.playingStyle);
    const awaySynergy = this.getTacticalSynergy(awayTeam.formation, awayTeam.playingStyle);

    // Style Counter-Play Bonus (Underdog tactical masterclass)
    let homeTacticalAdv = 0;
    let awayTacticalAdv = 0;

    // Counter Attack & Low block are lethal against Possession / High Press if gap is reasonable
    if (homeStyle?.id === 'counter_attack' && (awayStyle?.id === 'possession' || awayStyle?.id === 'high_press')) {
      homeTacticalAdv += 5;
    }
    if (awayStyle?.id === 'counter_attack' && (homeStyle?.id === 'possession' || homeStyle?.id === 'high_press')) {
      awayTacticalAdv += 5;
    }

    const homeTotalRating = homeStrength.overall + homeHomeAdvantage + homeSynergy + homeTacticalAdv + (homeFormation?.midfieldBonus || 0) * 0.2;
    const awayTotalRating = awayStrength.overall + awaySynergy + awayTacticalAdv + (awayFormation?.midfieldBonus || 0) * 0.2;

    // Possession %
    const possessionBase = 50 + (homeTotalRating - awayTotalRating) * 0.8;
    const stylePossDiff = (homeStyle?.possessionModifier || 0) - (awayStyle?.possessionModifier || 0);
    const homePossRaw = Math.min(74, Math.max(26, Math.round(possessionBase + stylePossDiff * 0.6)));
    const awayPossRaw = 100 - homePossRaw;

    // Chances & Shots
    const homeShots = Math.max(3, Math.round(8 + (homePossRaw - 50) * 0.2 + (homeStyle?.chanceCreationModifier || 0) * 0.4 + (Math.random() * 6 - 3)));
    const awayShots = Math.max(2, Math.round(8 + (awayPossRaw - 50) * 0.2 + (awayStyle?.chanceCreationModifier || 0) * 0.4 + (Math.random() * 6 - 3)));

    const homeShotsOnTarget = Math.max(1, Math.min(homeShots, Math.round(homeShots * (0.35 + Math.random() * 0.25))));
    const awayShotsOnTarget = Math.max(1, Math.min(awayShots, Math.round(awayShots * (0.35 + Math.random() * 0.25))));

    // Goal scoring roll
    let homeGoals = 0;
    let awayGoals = 0;

    // Goalkeeper heroics roll (chance of making heroic saves)
    const homeGKHeroic = Math.random() < 0.15;
    const awayGKHeroic = Math.random() < 0.15;

    for (let i = 0; i < homeShotsOnTarget; i++) {
      let scoringChance = (homeStrength.attack / (awayStrength.defense + 35)) * 0.68;
      if (awayGKHeroic) scoringChance *= 0.45; // Goalkeeper having game of his life!
      if (Math.random() < scoringChance) homeGoals++;
    }

    for (let i = 0; i < awayShotsOnTarget; i++) {
      let scoringChance = (awayStrength.attack / (homeStrength.defense + 35)) * 0.65;
      if (homeGKHeroic) scoringChance *= 0.45;
      if (Math.random() < scoringChance) awayGoals++;
    }

    // Generate timeline events
    const events: CoachMatchEvent[] = [];
    const homeStarters = homeTeam.squad.filter((p) => homeTeam.startingXI.includes(p.id));
    const awayStarters = awayTeam.squad.filter((p) => awayTeam.startingXI.includes(p.id));

    const pickScorer = (starters: typeof homeStarters) => {
      const strikers = starters.filter((p) => ['ST', 'RW', 'LW', 'CAM'].includes(p.position));
      const pool = strikers.length ? strikers : starters;
      return pool[Math.floor(Math.random() * pool.length)] || starters[0];
    };

    const pickAssister = (starters: typeof homeStarters, scorerId: string) => {
      const others = starters.filter((p) => p.id !== scorerId && ['CAM', 'CM', 'RW', 'LW', 'LB', 'RB'].includes(p.position));
      if (!others.length || Math.random() < 0.25) return undefined;
      return others[Math.floor(Math.random() * others.length)].nameAr;
    };

    // Home Goals
    for (let g = 0; g < homeGoals; g++) {
      const minute = Math.floor(Math.random() * 88) + 2;
      const scorer = pickScorer(homeStarters);
      const assist = pickAssister(homeStarters, scorer.id);
      scorer.goals += 1;
      events.push({
        minute,
        type: 'GOAL',
        teamId: homeTeam.id,
        teamName: homeTeam.nameAr,
        playerId: scorer.id,
        playerName: scorer.nameAr,
        assistPlayerName: assist,
        descriptionAr: assist
          ? `⚽ جوووول! ${scorer.nameAr} يسجل هدفاً رائعاً بعد تمريرة حاسمة متقنة من ${assist}!`
          : `⚽ جوووول! ${scorer.nameAr} يضع الكرة ببراعة داخل الشباك معلناً الهدف!`
      });
    }

    // Away Goals
    for (let g = 0; g < awayGoals; g++) {
      const minute = Math.floor(Math.random() * 88) + 2;
      const scorer = pickScorer(awayStarters);
      const assist = pickAssister(awayStarters, scorer.id);
      scorer.goals += 1;
      events.push({
        minute,
        type: 'GOAL',
        teamId: awayTeam.id,
        teamName: awayTeam.nameAr,
        playerId: scorer.id,
        playerName: scorer.nameAr,
        assistPlayerName: assist,
        descriptionAr: assist
          ? `⚽ جوووول للخصم! ${scorer.nameAr} يسجل هدفاً بعد صناعة من ${assist}!`
          : `⚽ جوووول! ${scorer.nameAr} يسدد كرة قوية تسكن الشباك!`
      });
    }

    // In-Match Injuries (Realistic Football Occurrence)
    let homeInjuriesCount = 0;
    let awayInjuriesCount = 0;

    // Home injury roll
    const homeInjuryRisk = (homeStyle?.fatigueModifier || 6) > 7 ? 0.06 : 0.045;
    if (Math.random() < homeInjuryRisk && homeStarters.length > 2) {
      const injuredPlayer = homeStarters[Math.floor(Math.random() * (homeStarters.length - 1)) + 1]; // avoid GK
      const min = Math.floor(Math.random() * 65) + 15;
      const weeksOut = Math.floor(Math.random() * 3) + 1;
      injuredPlayer.injuryStatus = {
        type: 'MUSCLE',
        typeAr: 'إصابة عضلية',
        weeksRemaining: weeksOut,
        descriptionAr: 'تمزق عضلي يستدعي الراحة والعلاج'
      };
      homeInjuriesCount++;
      events.push({
        minute: min,
        type: 'INJURY',
        teamId: homeTeam.id,
        teamName: homeTeam.nameAr,
        playerId: injuredPlayer.id,
        playerName: injuredPlayer.nameAr,
        descriptionAr: `🚑 إصابة عضلية للاعب ${injuredPlayer.nameAr} (${this.positionLabelAr(injuredPlayer.position)})! يسقط على أرضية الملعب ويطلب الطاقم الطبي تبديله.`
      });
    }

    // Away injury roll
    if (Math.random() < 0.045 && awayStarters.length > 2) {
      const injuredPlayer = awayStarters[Math.floor(Math.random() * (awayStarters.length - 1)) + 1];
      const min = Math.floor(Math.random() * 65) + 15;
      const weeksOut = Math.floor(Math.random() * 3) + 1;
      injuredPlayer.injuryStatus = {
        type: 'ANKLE',
        typeAr: 'إصابة في الكاحل',
        weeksRemaining: weeksOut,
        descriptionAr: 'التواء في الكاحل'
      };
      awayInjuriesCount++;
      events.push({
        minute: min,
        type: 'INJURY',
        teamId: awayTeam.id,
        teamName: awayTeam.nameAr,
        playerId: injuredPlayer.id,
        playerName: injuredPlayer.nameAr,
        descriptionAr: `🚑 إصابة للاعب الخصم ${injuredPlayer.nameAr} (${this.positionLabelAr(injuredPlayer.position)}) ويغادر الملعب لتلقي العلاج.`
      });
    }

    // Cards & Fouls
    const homeFouls = Math.round(8 + (homeStyle?.pressingModifier || 0) * 0.4 + Math.random() * 6);
    const awayFouls = Math.round(8 + (awayStyle?.pressingModifier || 0) * 0.4 + Math.random() * 6);

    const homeYellows = Math.min(4, Math.floor(homeFouls / 5) + (Math.random() < 0.4 ? 1 : 0));
    const awayYellows = Math.min(4, Math.floor(awayFouls / 5) + (Math.random() < 0.4 ? 1 : 0));

    let homeReds = 0;
    let awayReds = 0;

    // Rare red card (1 in 25 matches)
    if (Math.random() < 0.015 && homeStarters.length > 1) {
      const punishedPlayer = homeStarters[Math.floor(Math.random() * homeStarters.length)];
      const min = Math.floor(Math.random() * 50) + 30;
      homeReds = 1;
      punishedPlayer.redCards += 1;
      punishedPlayer.suspensionStatus = {
        matchesRemaining: 1,
        reason: 'RED_CARD',
        reasonAr: 'بطاقة حمراء مباشرة'
      };
      events.push({
        minute: min,
        type: 'RED_CARD',
        teamId: homeTeam.id,
        teamName: homeTeam.nameAr,
        playerId: punishedPlayer.id,
        playerName: punishedPlayer.nameAr,
        descriptionAr: `🟥 طرد مباشر! الحكم يشهر البطاقة الحمراء في وجه ${punishedPlayer.nameAr} بعد تدخل متهور!`
      });
    } else if (Math.random() < 0.015 && awayStarters.length > 1) {
      const punishedPlayer = awayStarters[Math.floor(Math.random() * awayStarters.length)];
      const min = Math.floor(Math.random() * 50) + 30;
      awayReds = 1;
      punishedPlayer.redCards += 1;
      punishedPlayer.suspensionStatus = {
        matchesRemaining: 1,
        reason: 'RED_CARD',
        reasonAr: 'بطاقة حمراء مباشرة'
      };
      events.push({
        minute: min,
        type: 'RED_CARD',
        teamId: awayTeam.id,
        teamName: awayTeam.nameAr,
        playerId: punishedPlayer.id,
        playerName: punishedPlayer.nameAr,
        descriptionAr: `🟥 طرد على لاعب الخصم ${punishedPlayer.nameAr} بعد تدخل عنيف!`
      });
    }

    // Add yellow card events
    for (let y = 0; y < homeYellows; y++) {
      const min = Math.floor(Math.random() * 80) + 10;
      const defPlayer = homeStarters[Math.floor(Math.random() * homeStarters.length)] || homeStarters[0];
      defPlayer.yellowCards += 1;
      events.push({
        minute: min,
        type: 'YELLOW_CARD',
        teamId: homeTeam.id,
        teamName: homeTeam.nameAr,
        playerName: defPlayer.nameAr,
        descriptionAr: `🟨 إنذار وبطاقة صفراء على ${defPlayer.nameAr} بعد تدخل تكتيكي لقطع الهجمة.`
      });
    }

    for (let y = 0; y < awayYellows; y++) {
      const min = Math.floor(Math.random() * 80) + 10;
      const defPlayer = awayStarters[Math.floor(Math.random() * awayStarters.length)] || awayStarters[0];
      defPlayer.yellowCards += 1;
      events.push({
        minute: min,
        type: 'YELLOW_CARD',
        teamId: awayTeam.id,
        teamName: awayTeam.nameAr,
        playerName: defPlayer.nameAr,
        descriptionAr: `🟨 بطاقة صفراء على لاعب الخصم ${defPlayer.nameAr}.`
      });
    }

    // Goalkeeper saves & Woodwork drama
    events.push({
      minute: Math.floor(Math.random() * 40) + 5,
      type: 'SAVE',
      teamId: homeTeam.id,
      teamName: homeTeam.nameAr,
      playerName: homeStarters[0].nameAr,
      descriptionAr: `🧤 تصدٍ إعجازي من حارس المرمى ينقذ الفريق من هدف محقق!`
    });

    events.push({
      minute: Math.floor(Math.random() * 40) + 48,
      type: 'WOODWORK',
      teamId: Math.random() > 0.5 ? homeTeam.id : awayTeam.id,
      teamName: homeTeam.nameAr,
      playerName: 'القائم',
      descriptionAr: `💥 يا رباااه! تسديدة صاروخية ترتطم بالقائم وتمنع هدفاً سينمائياً!`
    });

    // In-Match AI Tactical Reaction
    const diff = params.aiDifficulty || 'NORMAL';
    const isHomeAI = homeTeam.controllerType === 'AI' || (params.userTeamId ? homeTeam.id !== params.userTeamId : false);
    const isAwayAI = awayTeam.controllerType === 'AI' || (params.userTeamId ? awayTeam.id !== params.userTeamId : true);

    if (isHomeAI) {
      const homePersonality = CoachAiIntelligence.getTeamPersonality(homeTeam);
      const reactMinute = Math.floor(Math.random() * 15) + 60;
      const homeReact = CoachAiIntelligence.evaluateInMatchReaction({
        team: homeTeam,
        opponentTeam: awayTeam,
        aiScore: homeGoals,
        opponentScore: awayGoals,
        difficulty: diff,
        personality: homePersonality,
        minute: reactMinute
      });
      if (homeReact) {
        events.push(homeReact);
        if (homeGoals < awayGoals && Math.random() < 0.35) {
          const lateMin = Math.min(89, reactMinute + Math.floor(Math.random() * 12) + 4);
          const scorer = pickScorer(homeStarters);
          homeGoals++;
          scorer.goals++;
          events.push({
            minute: lateMin,
            type: 'GOAL',
            teamId: homeTeam.id,
            teamName: homeTeam.nameAr,
            playerId: scorer.id,
            playerName: scorer.nameAr,
            descriptionAr: `⚽ جوووول! استجابة تكتيكية مباشرة! ${scorer.nameAr} يسجل هدفاً بعد المجازفة الهجومية للمدرب!`
          });
        }
      }
    }

    if (isAwayAI) {
      const awayPersonality = CoachAiIntelligence.getTeamPersonality(awayTeam);
      const reactMinute = Math.floor(Math.random() * 15) + 60;
      const awayReact = CoachAiIntelligence.evaluateInMatchReaction({
        team: awayTeam,
        opponentTeam: homeTeam,
        aiScore: awayGoals,
        opponentScore: homeGoals,
        difficulty: diff,
        personality: awayPersonality,
        minute: reactMinute
      });
      if (awayReact) {
        events.push(awayReact);
        if (awayGoals < homeGoals && Math.random() < 0.35) {
          const lateMin = Math.min(89, reactMinute + Math.floor(Math.random() * 12) + 4);
          const scorer = pickScorer(awayStarters);
          awayGoals++;
          scorer.goals++;
          events.push({
            minute: lateMin,
            type: 'GOAL',
            teamId: awayTeam.id,
            teamName: awayTeam.nameAr,
            playerId: scorer.id,
            playerName: scorer.nameAr,
            descriptionAr: `⚽ جوووول مباغت! التعديل التكتيكي يثمر عن هدف لـ ${scorer.nameAr} بعد ضغط هجومي مكثف!`
          });
        }
      }
    }

    // Sort events chronologically
    events.sort((a, b) => a.minute - b.minute);

    // League matches stay league matches: no penalties. But a drawn match should
    // not feel like the engine is afraid to choose a winner. A late-pressure roll
    // creates a decisive goal in most deadlocked league games, and a red-card
    // deficit gives the opponent the stronger late-pressure edge.
    if (!isKnockout && homeGoals === awayGoals && (homeReds !== awayReds || Math.random() < 0.72)) {
      const homeStrengthLate = homeStrength.attack + homeStrength.midfield + homeStrength.defense - homeReds * 28;
      const awayStrengthLate = awayStrength.attack + awayStrength.midfield + awayStrength.defense - awayReds * 28;
      let homeLateChance = Math.max(0.28, Math.min(0.72, 0.5 + (homeStrengthLate - awayStrengthLate) / 300));
      if (homeReds > awayReds) homeLateChance = 0.18;
      if (awayReds > homeReds) homeLateChance = 0.82;
      const lateTeam = Math.random() < homeLateChance ? 'home' : 'away';
      const pool = lateTeam === 'home' ? homeStarters : awayStarters;
      const scorer = pickScorer(pool);
      if (scorer) {
        if (lateTeam === 'home') homeGoals++; else awayGoals++;
        scorer.goals += 1;
        events.push({
          minute: Math.floor(Math.random() * 5) + 86,
          type: 'GOAL',
          teamId: lateTeam === 'home' ? homeTeam.id : awayTeam.id,
          teamName: lateTeam === 'home' ? homeTeam.nameAr : awayTeam.nameAr,
          playerId: scorer.id,
          playerName: scorer.nameAr,
          descriptionAr: `⚡ هدف الحسم في اللحظات الأخيرة! ${scorer.nameAr} يستغل اندفاع المباراة ويقلب النتيجة!`
        });
      }
    }

    // Handle Knockout Extra Time / Penalties if draw
    let penaltyScore: [number, number] | undefined = undefined;
    let isExtraTime = false;

    if (isKnockout && homeGoals === awayGoals) {
      isExtraTime = true;
      if (Math.random() < 0.35) {
        if (Math.random() > 0.5) homeGoals++;
        else awayGoals++;
      }
      if (homeGoals === awayGoals) {
        let pHome = 4 + (Math.random() > 0.5 ? 1 : 0);
        let pAway = 4 + (Math.random() > 0.5 ? 1 : 0);
        if (pHome === pAway) {
          if (Math.random() > 0.5) pHome++;
          else pAway++;
        }
        penaltyScore = [pHome, pAway];
      }
    }

    // Fatigue application and rest recovery
    const homeFatigueDrain = (homeStyle?.fatigueModifier || 6) + 3;
    homeTeam.squad.forEach((p) => {
      const isStarter = homeTeam.startingXI.includes(p.id);
      if (isStarter) {
        p.fitness = Math.max(50, p.fitness - homeFatigueDrain);
        p.matchesPlayed += 1;
      } else {
        // Bench player rested recovers stamina
        p.fitness = Math.min(100, p.fitness + 6);
      }
    });

    const awayFatigueDrain = (awayStyle?.fatigueModifier || 6) + 3;
    awayTeam.squad.forEach((p) => {
      const isStarter = awayTeam.startingXI.includes(p.id);
      if (isStarter) {
        p.fitness = Math.max(50, p.fitness - awayFatigueDrain);
        p.matchesPlayed += 1;
      } else {
        p.fitness = Math.min(100, p.fitness + 6);
      }
    });

    // Man of the match
    const motmPlayer = homeGoals >= awayGoals ? pickScorer(homeStarters) : pickScorer(awayStarters);
    const motmTeam = homeGoals >= awayGoals ? homeTeam.nameAr : awayTeam.nameAr;

    // Tactical Analysis Text
    let analysis = '';
    if (homeGoals > awayGoals) {
      analysis = `انتصار تكتيكي مستحق لنادي ${homeTeam.nameAr}. نجح أسلوب (${homeStyle?.nameAr || 'المتوازن'}) في فرض السيادة الميدانية وحسم الفرص الهجومية بذكاء.`;
    } else if (homeGoals < awayGoals) {
      analysis = `خسارة صعبة لنادي ${homeTeam.nameAr}. نجح الخصم ${awayTeam.nameAr} في استغلال المساحات والتفوق في التحولات الهجومية.`;
    } else {
      analysis = `تعادل تكتيكي ملتهب. مباراة مغلقة وشديدة التنافسية تقاسم فيها الفريقان السيطرة والنقاط.`;
    }

    const stats: CoachMatchStats = {
      possession: [homePossRaw, awayPossRaw],
      shots: [homeShots, awayShots],
      shotsOnTarget: [homeShotsOnTarget, awayShotsOnTarget],
      corners: [Math.round(homeShots * 0.4), Math.round(awayShots * 0.4)],
      fouls: [homeFouls, awayFouls],
      yellowCards: [homeYellows, awayYellows],
      redCards: [homeReds, awayReds],
      passAccuracy: [Math.round(78 + (homePossRaw - 50) * 0.3), Math.round(78 + (awayPossRaw - 50) * 0.3)]
    };

    return {
      id: `match_${matchday}_${homeTeam.id}_${awayTeam.id}_${Date.now()}`,
      matchday,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeScore: homeGoals,
      awayScore: awayGoals,
      played: true,
      events,
      stats,
      manOfTheMatch: {
        playerName: motmPlayer.nameAr,
        teamName: motmTeam,
        rating: 8.7,
        goals: homeGoals >= awayGoals ? Math.max(1, homeGoals) : 0,
        assists: 1
      },
      tacticalAnalysisAr: analysis,
      penaltyScore,
      isExtraTime
    };
  }

  /**
   * Calculates dynamic change in board and fan confidence after a match
   */
  public static calculateConfidenceDelta(
    isWin: boolean,
    isDraw: boolean,
    isLoss: boolean,
    userRating: number,
    oppRating: number
  ): { boardDelta: number; fanDelta: number } {
    const ratingGap = userRating - oppRating;

    if (isWin) {
      if (ratingGap <= -4) {
        // Giant killing upset win!
        return { boardDelta: 6, fanDelta: 8 };
      }
      return { boardDelta: 3, fanDelta: 4 };
    }

    if (isDraw) {
      if (ratingGap <= -4) {
        // Great point against a giant
        return { boardDelta: 2, fanDelta: 2 };
      }
      if (ratingGap >= 5) {
        // Disappointing draw against underdog
        return { boardDelta: -2, fanDelta: -3 };
      }
      return { boardDelta: 0, fanDelta: 0 };
    }

    if (isLoss) {
      if (ratingGap >= 5) {
        // Shocking loss against weak team
        return { boardDelta: -7, fanDelta: -9 };
      }
      if (ratingGap <= -5) {
        // Expected loss against giant
        return { boardDelta: -2, fanDelta: -2 };
      }
      return { boardDelta: -4, fanDelta: -5 };
    }

    return { boardDelta: 0, fanDelta: 0 };
  }

  /**
   * Initializes League Standings from list of teams
   */
  public static initializeStandings(teams: CoachTeam[]): LeagueStandingRow[] {
    return teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      teamNameAr: team.nameAr,
      logoUrl: team.logoUrl,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: []
    }));
  }

  /**
   * Updates Standings Table from a simulated match result
   */
  public static updateStandingsWithMatch(standings: LeagueStandingRow[], result: CoachMatchResult): LeagueStandingRow[] {
    const updated = standings.map((row) => ({ ...row, form: [...row.form] }));
    const homeRow = updated.find((r) => r.teamId === result.homeTeamId);
    const awayRow = updated.find((r) => r.teamId === result.awayTeamId);

    if (!homeRow || !awayRow) return standings;

    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.goalsFor += result.homeScore;
    homeRow.goalsAgainst += result.awayScore;
    awayRow.goalsFor += result.awayScore;
    awayRow.goalsAgainst += result.homeScore;

    homeRow.goalDifference = homeRow.goalsFor - homeRow.goalsAgainst;
    awayRow.goalDifference = awayRow.goalsFor - awayRow.goalsAgainst;

    if (result.homeScore > result.awayScore) {
      homeRow.won += 1;
      homeRow.points += 3;
      homeRow.form.unshift('W');
      awayRow.lost += 1;
      awayRow.form.unshift('L');
    } else if (result.homeScore < result.awayScore) {
      awayRow.won += 1;
      awayRow.points += 3;
      awayRow.form.unshift('W');
      homeRow.lost += 1;
      homeRow.form.unshift('L');
    } else {
      homeRow.drawn += 1;
      awayRow.drawn += 1;
      homeRow.points += 1;
      awayRow.points += 1;
      homeRow.form.unshift('D');
      awayRow.form.unshift('D');
    }

    if (homeRow.form.length > 5) homeRow.form.pop();
    if (awayRow.form.length > 5) awayRow.form.pop();

    // Sort by points, then goal difference, then goals for
    updated.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    return updated;
  }

  /**
   * Generates a realistic League Schedule
   */
  public static generateLeagueSchedule(
    teams: CoachTeam[],
    userTeamId: string
  ): { matchday: number; homeTeam: CoachTeam; awayTeam: CoachTeam }[] {
    const userTeam = teams.find((t) => t.id === userTeamId) || teams[0];
    const opponents = teams.filter((t) => t.id !== userTeamId);

    // Shuffle opponent order (Fisher-Yates) so the fixture list is
    // genuinely different every time a career starts with this team —
    // never a fixed "big clubs first, small clubs later" pattern
    // inherited from the underlying team-data order.
    const shuffledOpponents = [...opponents];
    for (let i = shuffledOpponents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOpponents[i], shuffledOpponents[j]] = [shuffledOpponents[j], shuffledOpponents[i]];
    }

    const fixtures: { homeTeam: CoachTeam; awayTeam: CoachTeam }[] = [];

    // First leg — venue (home/away) randomized per opponent, not a
    // fixed alternating pattern.
    shuffledOpponents.forEach((opp) => {
      const isHome = Math.random() < 0.5;
      fixtures.push({ homeTeam: isHome ? userTeam : opp, awayTeam: isHome ? opp : userTeam });
    });

    // Return leg — always the opposite venue from the first meeting.
    shuffledOpponents.forEach((opp, idx) => {
      const firstLegWasHome = fixtures[idx].homeTeam.id === userTeam.id;
      fixtures.push({
        homeTeam: firstLegWasHome ? opp : userTeam,
        awayTeam: firstLegWasHome ? userTeam : opp
      });
    });

    // Shuffle the overall matchday ORDER too — real leagues never play
    // every home fixture in a block followed by every away fixture.
    const order = fixtures.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    // Avoid facing the exact same opponent on back-to-back matchdays.
    const opponentIdOf = (fixtureIdx: number) => {
      const f = fixtures[fixtureIdx];
      return f.homeTeam.id === userTeam.id ? f.awayTeam.id : f.homeTeam.id;
    };
    for (let i = 1; i < order.length; i++) {
      if (opponentIdOf(order[i]) === opponentIdOf(order[i - 1])) {
        for (let k = i + 1; k < order.length; k++) {
          if (opponentIdOf(order[k]) !== opponentIdOf(order[i - 1])) {
            [order[i], order[k]] = [order[k], order[i]];
            break;
          }
        }
      }
    }

    return order.map((fixtureIdx, matchdayIdx) => ({
      matchday: matchdayIdx + 1,
      homeTeam: fixtures[fixtureIdx].homeTeam,
      awayTeam: fixtures[fixtureIdx].awayTeam
    }));
  }

  /**
   * Advances medical recovery and suspensions by 1 matchday
   */
  public static advanceSquadCalendar(team: CoachTeam): void {
    team.squad.forEach((p) => {
      // Injury recovery
      if (p.injuryStatus && p.injuryStatus.weeksRemaining > 0) {
        p.injuryStatus.weeksRemaining -= 1;
        if (p.injuryStatus.weeksRemaining <= 0) {
          p.injuryStatus = undefined;
          p.fitness = 82; // returns with moderate sharpness
        }
      }

      // Suspension recovery
      if (p.suspensionStatus && p.suspensionStatus.matchesRemaining > 0) {
        p.suspensionStatus.matchesRemaining -= 1;
        if (p.suspensionStatus.matchesRemaining <= 0) {
          p.suspensionStatus = undefined;
        }
      }
    });
  }

  /**
   * Recovers squad fitness between matchdays
   */
  public static recoverSquadFitness(team: CoachTeam): void {
    team.squad.forEach((p) => {
      if (!p.injuryStatus) {
        // Natural gradual stamina replenishment capped at 100
        p.fitness = Math.min(100, (p.fitness || 85) + 10);
      }
    });
  }
}
