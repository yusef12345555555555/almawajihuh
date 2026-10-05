// ============================================================
// أنت المدرب | نظام الذكاء الاصطناعي والشخصيات التدريبية
// AI Manager Personalities, Difficulty Levels & Tactical Reactions
// ============================================================

import {
  AIDifficulty,
  AIPersonalityType,
  CoachTeam,
  UserTacticalSettings,
  CoachMatchEvent
} from '../types/coachGameTypes';
import { COACH_FORMATIONS } from '../data/coachFormationsAndStyles';

export interface AIPersonalityDetails {
  type: AIPersonalityType;
  titleAr: string;
  badgeAr: string;
  descriptionAr: string;
  defaultFormation: string;
  defaultStyle: string;
  attackingBias: number; // -10 (very defensive) to +10 (all-out attack)
  pressingBias: number;
  comebackFormation: string;
  shutdownFormation: string;
}

export const AI_PERSONALITIES: Record<AIPersonalityType, AIPersonalityDetails> = {
  AGGRESSIVE: {
    type: 'AGGRESSIVE',
    titleAr: 'مدرب هجومي كاسح',
    badgeAr: 'هجوم وضغط عالي ⚡',
    descriptionAr: 'يعتمد على الاندفاع الهجومي والضغط في الثلث الأخير؛ يجازف بفتح المساحات لضمان الفوز.',
    defaultFormation: '4-3-3',
    defaultStyle: 'High Intensity',
    attackingBias: 8,
    pressingBias: 9,
    comebackFormation: '4-2-4',
    shutdownFormation: '4-3-3'
  },
  DEFENSIVE: {
    type: 'DEFENSIVE',
    titleAr: 'مدرب دفاعي وتكتل منخفض',
    badgeAr: 'حافلة دفاعية 🛡️',
    descriptionAr: 'يغلق العمق والأطراف بصلابة (Low Block)، يُرهق الخصم ويقتنص الأهداف من الكرات الثابتة والمرتدات.',
    defaultFormation: '5-3-2',
    defaultStyle: 'Low Block',
    attackingBias: -7,
    pressingBias: 3,
    comebackFormation: '4-4-2',
    shutdownFormation: '5-4-1'
  },
  POSSESSION: {
    type: 'POSSESSION',
    titleAr: 'مدرب تيكي تاكا واستحواذ',
    badgeAr: 'استحواذ وتدوير 🔄',
    descriptionAr: 'يفرض إيقاعه عبر التمريرات القصيرة والمثلثات؛ يتحكم في رتم المباراة ويقلل فرص المنافس.',
    defaultFormation: '4-3-3',
    defaultStyle: 'Possession Football',
    attackingBias: 3,
    pressingBias: 7,
    comebackFormation: '3-4-3',
    shutdownFormation: '4-2-3-1'
  },
  COUNTER: {
    type: 'COUNTER',
    titleAr: 'مدرب هجمات مرتدة سريعة',
    badgeAr: 'مرتدات صاعقة 🚀',
    descriptionAr: 'يترك الكرة للمنافس متعمداً، ثم يشن تحولات هجومية فائقة السرعة تضرب المساحات خلف المدافعين.',
    defaultFormation: '4-2-3-1',
    defaultStyle: 'Counter Attack',
    attackingBias: 2,
    pressingBias: 5,
    comebackFormation: '4-3-3',
    shutdownFormation: '5-3-2'
  },
  BALANCED: {
    type: 'BALANCED',
    titleAr: 'مدرب متوازن ومرن',
    badgeAr: 'توازن وقراءة تكتيكية ⚖️',
    descriptionAr: 'يوازن بين التأمين الدفاعي والنجاعة الهجومية؛ يعدل أسلوبه لحظياً حسب نتيجة اللقاء.',
    defaultFormation: '4-2-3-1',
    defaultStyle: 'Balanced',
    attackingBias: 1,
    pressingBias: 6,
    comebackFormation: '4-3-3',
    shutdownFormation: '4-5-1'
  }
};

export interface AIDifficultyDetails {
  level: AIDifficulty;
  titleAr: string;
  badgeAr: string;
  descriptionAr: string;
  errorRate: number; // 0 to 1
  reactionMinuteRange: [number, number];
  tacticalIQ: number; // 60 to 98
}

export const AI_DIFFICULTIES: Record<AIDifficulty, AIDifficultyDetails> = {
  EASY: {
    level: 'EASY',
    titleAr: 'سهل (Easy)',
    badgeAr: 'مبتدئ 🟢',
    descriptionAr: 'ردود فعل بطيئة وتغييرات تكتيكية محدودة مع ارتكاب هفوات دفاعية تحت الضغط.',
    errorRate: 0.32,
    reactionMinuteRange: [75, 84],
    tacticalIQ: 68
  },
  NORMAL: {
    level: 'NORMAL',
    titleAr: 'متوسط (Normal)',
    badgeAr: 'متوازن 🟡',
    descriptionAr: 'قرارات تكتيكية متوازنة وتبديلات منطقية تتناسب مع نتيجة اللقاء ومستوى الفريق.',
    errorRate: 0.16,
    reactionMinuteRange: [65, 75],
    tacticalIQ: 80
  },
  HARD: {
    level: 'HARD',
    titleAr: 'صعب (Hard)',
    badgeAr: 'محترف 🔴',
    descriptionAr: 'وعي تكتيكي عالٍ، يستغل نقاط ضعف تشكيلتك، ويقوم بتبديلات هجومية حاسمة إذا تأخر.',
    errorRate: 0.06,
    reactionMinuteRange: [60, 68],
    tacticalIQ: 90
  },
  LEGENDARY: {
    level: 'LEGENDARY',
    titleAr: 'أسطوري (Legendary)',
    badgeAr: 'عبقري تكتيكي 🏆',
    descriptionAr: 'أعلى درجات الذكاء التكتيكي والتكيف الفوري؛ ضغط محكم واستغلال فوري للإرهاق، مع الحفاظ على متعة وعدالة اللعبة.',
    errorRate: 0.02,
    reactionMinuteRange: [54, 62],
    tacticalIQ: 97
  }
};

export class CoachAiIntelligence {
  /**
   * Automatically derives AI Personality for any team manager
   */
  public static getTeamPersonality(team: CoachTeam): AIPersonalityDetails {
    if (team.aiPersonality && AI_PERSONALITIES[team.aiPersonality]) {
      return AI_PERSONALITIES[team.aiPersonality];
    }

    const style = (team.playingStyle || '').toLowerCase();
    const formation = team.formation || '4-3-3';

    if (style.includes('possession') || style.includes('tiki')) {
      return AI_PERSONALITIES.POSSESSION;
    }
    if (style.includes('counter') || style.includes('direct') || style.includes('wing')) {
      return AI_PERSONALITIES.COUNTER;
    }
    if (style.includes('block') || style.includes('defensive') || formation.startsWith('5')) {
      return AI_PERSONALITIES.DEFENSIVE;
    }
    if (style.includes('high') || style.includes('press') || style.includes('intensity') || style.includes('fast')) {
      return AI_PERSONALITIES.AGGRESSIVE;
    }

    return AI_PERSONALITIES.BALANCED;
  }

  /**
   * Generates in-match tactical reaction by the AI manager
   * Called during second-half simulation if AI is trailing or protecting a slender lead
   */
  public static evaluateInMatchReaction(params: {
    team: CoachTeam;
    opponentTeam: CoachTeam;
    aiScore: number;
    opponentScore: number;
    difficulty: AIDifficulty;
    personality: AIPersonalityDetails;
    minute: number;
  }): CoachMatchEvent | null {
    const { team, aiScore, opponentScore, difficulty, personality, minute } = params;
    const diffInfo = AI_DIFFICULTIES[difficulty];

    // Check if within reaction minute window
    if (minute < diffInfo.reactionMinuteRange[0] || minute > diffInfo.reactionMinuteRange[1]) {
      return null;
    }

    // Easy AI might make a mistake and skip reacting
    if (Math.random() < diffInfo.errorRate) {
      return null;
    }

    const goalDiff = aiScore - opponentScore;

    // CASE 1: AI is losing (تأخر في النتيجة) -> Attacking comeback shift
    if (goalDiff < 0) {
      const newFormation = personality.comebackFormation;
      const managerName = team.currentManager?.nameAr || team.nameAr;
      const benchAttackers = team.squad.filter(
        (p) => !team.startingXI.includes(p.id) && ['ST', 'RW', 'LW', 'CAM'].includes(p.position)
      );
      const subIn = benchAttackers[0] || team.squad[11] || team.squad[0];

      return {
        minute,
        type: 'TACTICAL_REACTION',
        teamId: team.id,
        teamName: team.nameAr,
        playerName: subIn.nameAr,
        descriptionAr: `🤖 قرار تكتيكي من مدرب الخصم ${managerName}: تحول إلى خطة (${newFormation}) والضغط الشامل وإشراك ${subIn.nameAr} لتعويض التأخر!`,
        tacticalShift: {
          previousFormation: team.formation,
          newFormation,
          managerName,
          reasonAr: 'هجوم شامل ومحاولة العودة في النتيجة'
        }
      };
    }

    // CASE 2: AI is leading by 1 goal (د. 72+) -> Defensive shutdown shift
    if (goalDiff === 1 && minute >= 72) {
      const newFormation = personality.shutdownFormation;
      const managerName = team.currentManager?.nameAr || team.nameAr;
      const benchDefenders = team.squad.filter(
        (p) => !team.startingXI.includes(p.id) && ['CB', 'CDM', 'LB', 'RB'].includes(p.position)
      );
      const subIn = benchDefenders[0] || team.squad[12] || team.squad[0];

      return {
        minute,
        type: 'TACTICAL_REACTION',
        teamId: team.id,
        teamName: team.nameAr,
        playerName: subIn.nameAr,
        descriptionAr: `🛡️ تدخل دفاعي من مدرب الخصم ${managerName}: التحول إلى (${newFormation}) والدفع بالمدافع ${subIn.nameAr} لغلق المساحات وتأمين الفوز.`,
        tacticalShift: {
          previousFormation: team.formation,
          newFormation,
          managerName,
          reasonAr: 'تأمين النتيجة وغلق المنافذ الدفاعية'
        }
      };
    }

    return null;
  }
}
