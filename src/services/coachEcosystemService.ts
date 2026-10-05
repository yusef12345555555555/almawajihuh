// ============================================================
// أنت المدرب | نظام المسابقات المحلية والقارية والرزنامة الموحدة
// Football Competition Ecosystem & Unified Season Calendar
// ============================================================

import {
  CoachTeam,
  CoachMatchResult,
  CoachCompetitionTier,
  CoachCalendarFixture,
  CoachDomesticEcosystem,
  AIDifficulty
} from '../types/coachGameTypes';
import { UCL_36_TEAMS } from '../data/coachTournamentsData';

export const DOMESTIC_ECOSYSTEMS: Record<string, CoachDomesticEcosystem> = {
  premier_league: {
    country: 'England',
    countryAr: 'إنجلترا',
    leagueId: 'premier_league',
    leagueNameAr: 'الدوري الإنجليزي الممتاز (Premier League)',
    domesticCupId: 'fa_cup',
    domesticCupNameAr: 'كأس الاتحاد الإنجليزي (FA Cup)',
    domesticCupIcon: '🛡️',
    leagueCupId: 'carabao_cup',
    leagueCupNameAr: 'كأس رابطة المحترفين (Carabao Cup)',
    leagueCupIcon: '⚡',
    superCupId: 'community_shield',
    superCupNameAr: 'درع المجتمع الإنجليزي (Community Shield)',
    superCupIcon: '🏆',
    continentalSlots: {
      uclTeamsCount: 4,
      uelTeamsCount: 2,
      ueclTeamsCount: 1
    }
  },
  la_liga: {
    country: 'Spain',
    countryAr: 'إسبانيا',
    leagueId: 'la_liga',
    leagueNameAr: 'الدوري الإسباني (La Liga EA Sports)',
    domesticCupId: 'copa_del_rey',
    domesticCupNameAr: 'كأس ملك إسبانيا (Copa del Rey)',
    domesticCupIcon: '👑',
    superCupId: 'supercopa_espana',
    superCupNameAr: 'كأس السوبر الإسباني (Supercopa)',
    superCupIcon: '🏆',
    continentalSlots: {
      uclTeamsCount: 4,
      uelTeamsCount: 2,
      ueclTeamsCount: 1
    }
  },
  serie_a: {
    country: 'Italy',
    countryAr: 'إيطاليا',
    leagueId: 'serie_a',
    leagueNameAr: 'الدوري الإيطالي (Serie A Enilive)',
    domesticCupId: 'coppa_italia',
    domesticCupNameAr: 'كأس إيطاليا (Coppa Italia)',
    domesticCupIcon: '🛡️',
    superCupId: 'supercoppa_italiana',
    superCupNameAr: 'كأس السوبر الإيطالي (Supercoppa)',
    superCupIcon: '🏆',
    continentalSlots: {
      uclTeamsCount: 5,
      uelTeamsCount: 2,
      ueclTeamsCount: 1
    }
  },
  bundesliga: {
    country: 'Germany',
    countryAr: 'ألمانيا',
    leagueId: 'bundesliga',
    leagueNameAr: 'الدوري الألماني (Bundesliga)',
    domesticCupId: 'dfb_pokal',
    domesticCupNameAr: 'كأس ألمانيا (DFB-Pokal)',
    domesticCupIcon: '🛡️',
    superCupId: 'dfl_supercup',
    superCupNameAr: 'كأس السوبر الألماني (DFL-Supercup)',
    superCupIcon: '🏆',
    continentalSlots: {
      uclTeamsCount: 5,
      uelTeamsCount: 2,
      ueclTeamsCount: 1
    }
  },
  ligue_1: {
    country: 'France',
    countryAr: 'فرنسا',
    leagueId: 'ligue_1',
    leagueNameAr: 'الدوري الفرنسي (Ligue 1 McDonald\'s)',
    domesticCupId: 'coupe_de_france',
    domesticCupNameAr: 'كأس فرنسا (Coupe de France)',
    domesticCupIcon: '🛡️',
    superCupId: 'trophee_des_champions',
    superCupNameAr: 'كأس الأبطال الفرنسي (Trophée des Champions)',
    superCupIcon: '🏆',
    continentalSlots: {
      uclTeamsCount: 4,
      uelTeamsCount: 2,
      ueclTeamsCount: 1
    }
  }
};

export class CoachEcosystemService {
  /**
   * Determine continental participation for a club based on rating / reputation
   */
  public static getContinentalStatus(userTeam: CoachTeam): {
    qualified: boolean;
    tier: 'UCL' | 'UEL' | 'UECL' | 'NONE';
    tournamentNameAr: string;
    tournamentIcon: string;
  } {
    if (userTeam.isNationalTeam) {
      return {
        qualified: false,
        tier: 'NONE',
        tournamentNameAr: '',
        tournamentIcon: ''
      };
    }

    // Top clubs (rating >= 84) qualify for Champions League
    if (userTeam.overallRating >= 84) {
      return {
        qualified: true,
        tier: 'UCL',
        tournamentNameAr: 'دوري أبطال أوروبا (UEFA Champions League)',
        tournamentIcon: '⭐️'
      };
    }
    // High-mid clubs (rating 80-83) qualify for Europa League
    if (userTeam.overallRating >= 80) {
      return {
        qualified: true,
        tier: 'UEL',
        tournamentNameAr: 'الدوري الأوروبي (UEFA Europa League)',
        tournamentIcon: '🟠'
      };
    }
    // Mid clubs (rating 77-79) qualify for Conference League
    if (userTeam.overallRating >= 77) {
      return {
        qualified: true,
        tier: 'UECL',
        tournamentNameAr: 'دوري المؤتمر الأوروبي (Conference League)',
        tournamentIcon: '🟢'
      };
    }

    return {
      qualified: false,
      tier: 'NONE',
      tournamentNameAr: '',
      tournamentIcon: ''
    };
  }

  /**
   * Generate an authentic, intertwined unified calendar for the entire season
   */
  public static generateUnifiedSeasonCalendar(
    userTeam: CoachTeam,
    leagueTeams: CoachTeam[],
    leagueId: string
  ): CoachCalendarFixture[] {
    const ecosystem = DOMESTIC_ECOSYSTEMS[leagueId] || DOMESTIC_ECOSYSTEMS.premier_league;
    const continental = this.getContinentalStatus(userTeam);

    const fixtures: CoachCalendarFixture[] = [];
    const opponents = leagueTeams.filter((t) => t.id !== userTeam.id);
    const shuffledOpponents = [...opponents].sort(() => 0.5 - Math.random());

    let fixtureIdx = 1;
    const dates = [
      '12 أغسطس', '17 أغسطس', '21 أغسطس', '26 أغسطس', '31 أغسطس',
      '14 سبتمبر', '18 سبتمبر', '22 سبتمبر', '26 سبتمبر', '30 سبتمبر',
      '4 أكتوبر', '18 أكتوبر', '22 أكتوبر', '26 أكتوبر', '30 أكتوبر',
      '3 نوفمبر', '7 نوفمبر', '23 نوفمبر', '27 نوفمبر', '1 ديسمبر',
      '5 ديسمبر', '9 ديسمبر', '14 ديسمبر', '19 ديسمبر', '23 ديسمبر',
      '27 ديسمبر', '1 يناير', '5 يناير', '9 يناير', '14 يناير',
      '18 يناير', '22 يناير', '27 يناير', '1 فبراير', '5 فبراير',
      '10 فبراير', '15 فبراير', '22 فبراير', '26 فبراير', '2 مارس',
      '8 مارس', '13 مارس', '29 مارس', '2 أبريل', '7 أبريل',
      '12 أبريل', '16 أبريل', '21 أبريل', '26 أبريل', '1 مايو',
      '6 مايو', '11 مايو', '18 مايو', '25 مايو', '31 مايو'
    ];

    // Helper to pick cup/continental opponents
    const pickCupOpponent = (avoidTeamId?: string) => {
      const pool = leagueTeams.filter((t) => t.id !== userTeam.id && t.id !== avoidTeamId);
      return pool[Math.floor(Math.random() * pool.length)] || opponents[0];
    };

    const pickContinentalOpponent = () => {
      const euroPool = UCL_36_TEAMS.filter((t) => t.id !== userTeam.id);
      return euroPool[Math.floor(Math.random() * euroPool.length)] || opponents[0];
    };

    // 1. Optional Super Cup at the very start (if high rated)
    if (userTeam.overallRating >= 84 && ecosystem.superCupNameAr) {
      const superOpponent = pickCupOpponent();
      fixtures.push({
        id: `cal_supercup_${fixtureIdx}`,
        fixtureIndex: fixtureIdx,
        dateStr: dates[0] || '8 أغسطس',
        daysRestSinceLastMatch: 7,
        isCongested: false,
        competitionTier: 'SUPER_CUP',
        competitionId: ecosystem.superCupId || 'supercup',
        competitionNameAr: ecosystem.superCupNameAr,
        competitionIcon: ecosystem.superCupIcon || '🏆',
        stageNameAr: 'النهائي الكبير (مباراة واحدة)',
        homeTeamId: userTeam.id,
        awayTeamId: superOpponent.id,
        homeTeamNameAr: userTeam.nameAr,
        awayTeamNameAr: superOpponent.nameAr,
        played: false,
        isKnockout: true
      });
      fixtureIdx++;
    }

    // 2. Intertwine League Matches with Domestic Cups & Continental Fixtures
    let leagueOpponentIndex = 0;
    let cupRound = 1;
    let continentalMatchday = 1;

    for (let round = 1; round <= Math.min(38, opponents.length * 2); round++) {
      // Pick next league opponent
      const opp = shuffledOpponents[leagueOpponentIndex % shuffledOpponents.length];
      leagueOpponentIndex++;

      const isHome = round % 2 === 1;
      const prevFixture = fixtures[fixtures.length - 1];
      const restDays = prevFixture ? (round % 3 === 0 ? 3 : 4) : 7;
      const isCongested = restDays <= 3;

      // Add League Match
      fixtures.push({
        id: `cal_league_${round}`,
        fixtureIndex: fixtureIdx,
        dateStr: dates[fixtureIdx - 1] || `أسبوع ${round}`,
        daysRestSinceLastMatch: restDays,
        isCongested,
        competitionTier: 'LEAGUE',
        competitionId: leagueId,
        competitionNameAr: ecosystem.leagueNameAr,
        competitionIcon: '🏆',
        stageNameAr: `الجولة ${round}`,
        homeTeamId: isHome ? userTeam.id : opp.id,
        awayTeamId: isHome ? opp.id : userTeam.id,
        homeTeamNameAr: isHome ? userTeam.nameAr : opp.nameAr,
        awayTeamNameAr: isHome ? opp.nameAr : userTeam.nameAr,
        played: false,
        isKnockout: false
      });
      fixtureIdx++;

      // Inject Carabao Cup / League Cup round in early season (rounds 3, 7, 12)
      if (ecosystem.leagueCupId && (round === 3 || round === 7 || round === 12)) {
        const leagueCupOpponent = pickCupOpponent();
        const stageLabel =
          round === 3 ? 'الدور الثاني' : round === 7 ? 'دور الـ 16' : 'ربع النهائي';
        fixtures.push({
          id: `cal_leaguecup_${round}`,
          fixtureIndex: fixtureIdx,
          dateStr: dates[fixtureIdx - 1] || `كأس الرابطة`,
          daysRestSinceLastMatch: 3, // Midweek congestion!
          isCongested: true,
          competitionTier: 'LEAGUE_CUP',
          competitionId: ecosystem.leagueCupId,
          competitionNameAr: ecosystem.leagueCupNameAr || 'كأس الرابطة',
          competitionIcon: ecosystem.leagueCupIcon || '⚡',
          stageNameAr: `${stageLabel} (خروج مغلوب)`,
          homeTeamId: userTeam.id,
          awayTeamId: leagueCupOpponent.id,
          homeTeamNameAr: userTeam.nameAr,
          awayTeamNameAr: leagueCupOpponent.nameAr,
          played: false,
          isKnockout: true
        });
        fixtureIdx++;
      }

      // Inject Continental Match (every ~4 league games for qualified teams)
      if (continental.qualified && continentalMatchday <= 8 && round % 4 === 0) {
        const euroOpponent = pickContinentalOpponent();
        fixtures.push({
          id: `cal_continental_${continentalMatchday}`,
          fixtureIndex: fixtureIdx,
          dateStr: dates[fixtureIdx - 1] || `أسبوع قاري`,
          daysRestSinceLastMatch: 3, // Classic Tuesday/Wednesday European congestion!
          isCongested: true,
          competitionTier: 'CONTINENTAL',
          competitionId: continental.tier.toLowerCase(),
          competitionNameAr: continental.tournamentNameAr,
          competitionIcon: continental.tournamentIcon,
          stageNameAr: `مرحلة الدوري الأوروبي - الجولة ${continentalMatchday}`,
          homeTeamId: continentalMatchday % 2 === 1 ? userTeam.id : euroOpponent.id,
          awayTeamId: continentalMatchday % 2 === 1 ? euroOpponent.id : userTeam.id,
          homeTeamNameAr: continentalMatchday % 2 === 1 ? userTeam.nameAr : euroOpponent.nameAr,
          awayTeamNameAr: continentalMatchday % 2 === 1 ? euroOpponent.nameAr : userTeam.nameAr,
          played: false,
          isKnockout: false
        });
        continentalMatchday++;
        fixtureIdx++;
      }

      // Inject Domestic Cup (FA Cup / Copa del Rey / DFB-Pokal) rounds in mid & late season
      if (round === 15 || round === 20 || round === 25 || round === 30) {
        const cupOpponent = pickCupOpponent();
        const stageNames = ['الدور الثالث (64)', 'دور الـ 32', 'دور الـ 16', 'ربع النهائي'];
        const stageTitle = stageNames[cupRound - 1] || 'الأدوار الإقصائية';

        fixtures.push({
          id: `cal_domestic_cup_${cupRound}`,
          fixtureIndex: fixtureIdx,
          dateStr: dates[fixtureIdx - 1] || `كأس محلية`,
          daysRestSinceLastMatch: 4,
          isCongested: false,
          competitionTier: 'DOMESTIC_CUP',
          competitionId: ecosystem.domesticCupId,
          competitionNameAr: ecosystem.domesticCupNameAr,
          competitionIcon: ecosystem.domesticCupIcon,
          stageNameAr: `${stageTitle} (مباراة إقصائية)`,
          homeTeamId: cupRound % 2 === 1 ? userTeam.id : cupOpponent.id,
          awayTeamId: cupRound % 2 === 1 ? cupOpponent.id : userTeam.id,
          homeTeamNameAr: cupRound % 2 === 1 ? userTeam.nameAr : cupOpponent.nameAr,
          awayTeamNameAr: cupRound % 2 === 1 ? cupOpponent.nameAr : userTeam.nameAr,
          played: false,
          isKnockout: true
        });
        cupRound++;
        fixtureIdx++;
      }
    }

    return fixtures;
  }

  /**
   * Calculate manager points reward / penalty based strictly on match events and performance
   */
  public static calculateMatchRewards(
    result: CoachMatchResult,
    userTeamId: string,
    homeTeam: CoachTeam,
    awayTeam: CoachTeam,
    tier: CoachCompetitionTier,
    difficulty: AIDifficulty = 'NORMAL'
  ): {
    pointsDelta: number;
    breakdown: { labelAr: string; amount: number }[];
  } {
    const isUserHome = userTeamId === homeTeam.id;
    const userScore = isUserHome ? result.homeScore : result.awayScore;
    const oppScore = isUserHome ? result.awayScore : result.homeScore;

    const oppTeam = isUserHome ? awayTeam : homeTeam;
    const userTeam = isUserHome ? homeTeam : awayTeam;

    const isWin = userScore > oppScore;
    const isDraw = userScore === oppScore;
    const isLoss = userScore < oppScore;

    const breakdown: { labelAr: string; amount: number }[] = [];
    let totalPoints = 0;

    if (isWin) {
      // 1. Base Win Points by competition tier
      let baseWin = 120;
      let compLabel = 'فوز في بطولة الدوري';
      if (tier === 'CONTINENTAL') {
        baseWin = 190;
        compLabel = 'فوز قاري في دوري أبطال أوروبا';
      } else if (tier === 'DOMESTIC_CUP' || tier === 'LEAGUE_CUP') {
        baseWin = 145;
        compLabel = 'فوز إقصائي في الكأس المحلية';
      } else if (tier === 'SUPER_CUP') {
        baseWin = 220;
        compLabel = 'تتويج بلقب السوبر الكبير';
      }

      breakdown.push({ labelAr: compLabel, amount: baseWin });
      totalPoints += baseWin;

      // 2. Clean Sheet Bonus
      if (oppScore === 0) {
        breakdown.push({ labelAr: 'مكافأة شباك نظيفة (Clean Sheet)', amount: 40 });
        totalPoints += 40;
      }

      // 3. Underdog Bonus: Beat an opponent with rating >= 3 higher
      if (oppTeam.overallRating >= userTeam.overallRating + 3) {
        const underdogBonus = (oppTeam.overallRating - userTeam.overallRating) * 20;
        breakdown.push({
          labelAr: `مفاجأة كبرى بالفوز على خصم متفوق (${oppTeam.nameAr})`,
          amount: Math.min(150, underdogBonus)
        });
        totalPoints += Math.min(150, underdogBonus);
      }

      // 4. Comeback Bonus: Conceded in 1st half and won in 2nd half
      if (result.halfTimeScore) {
        const htUser = isUserHome ? result.halfTimeScore[0] : result.halfTimeScore[1];
        const htOpp = isUserHome ? result.halfTimeScore[1] : result.halfTimeScore[0];
        if (htOpp > htUser) {
          breakdown.push({ labelAr: 'ريمونتادا ملحمية وقلب النتيجة للشوط الثاني', amount: 65 });
          totalPoints += 65;
        }
      }

      // 5. MOTM Bonus if from user team
      if (result.manOfTheMatch && result.manOfTheMatch.teamName === userTeam.nameAr) {
        breakdown.push({
          labelAr: `رجل المباراة في فريقك (${result.manOfTheMatch.playerName})`,
          amount: 30
        });
        totalPoints += 30;
      }

      // 6. Difficulty multiplier
      if (difficulty === 'LEGENDARY') {
        const legBonus = Math.round(totalPoints * 0.3);
        breakdown.push({ labelAr: 'مكافأة اللعب على المستوى الأسطوري (+30%)', amount: legBonus });
        totalPoints += legBonus;
      } else if (difficulty === 'HARD') {
        const hardBonus = Math.round(totalPoints * 0.15);
        breakdown.push({ labelAr: 'مكافأة اللعب على المستوى الصعب (+15%)', amount: hardBonus });
        totalPoints += hardBonus;
      }
    } else if (isDraw) {
      let baseDraw = 45;
      if (tier === 'CONTINENTAL') baseDraw = 60;
      breakdown.push({ labelAr: 'نقطة تعادل إيجابي', amount: baseDraw });
      totalPoints += baseDraw;

      // Draw against higher rated team
      if (oppTeam.overallRating >= userTeam.overallRating + 4) {
        breakdown.push({ labelAr: 'صمود بطولي وتعادل أمام فريق عملاق', amount: 35 });
        totalPoints += 35;
      }
    } else {
      // Loss: Point penalty (reasonable, non-destructive)
      let penalty = -25;
      if (tier === 'CONTINENTAL') penalty = -20;
      if (userTeam.overallRating > oppTeam.overallRating + 5) {
        penalty = -40; // shock loss penalty
      }
      breakdown.push({ labelAr: 'عقوبة خسارة اللقاء التكتيكي', amount: penalty });
      totalPoints = penalty;
    }

    return {
      pointsDelta: totalPoints,
      breakdown
    };
  }

  /**
   * Determine player cost in Manager Points based on rating, age, position and prestige
   */
  public static calculatePlayerPointPrice(rating: number, isStar: boolean = false): number {
    if (rating >= 90) return 2200 + Math.round((rating - 90) * 200);
    if (rating >= 86) return 1400 + Math.round((rating - 86) * 180);
    if (rating >= 82) return 800 + Math.round((rating - 82) * 120);
    if (rating >= 78) return 400 + Math.round((rating - 78) * 90);
    return 180 + Math.round((rating - 70) * 25);
  }
}
