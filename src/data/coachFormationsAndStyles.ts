// ============================================================
// أنت المدرب | Formations (10) & Playing Styles (10)
// ============================================================

import {
  TacticalFormation,
  PlayingStyleInfo,
  TacticalRoleDefinition,
  TacticalCohesionResult,
  CoachPosition,
  CoachTeam,
  CoachSquadPlayer,
  UserTacticalSettings
} from '../types/coachGameTypes';

export const COACH_FORMATIONS: TacticalFormation[] = [
  {
    id: '4-3-3',
    name: '4-3-3',
    nameAr: '4-3-3 هجومي كلاسيكي',
    descriptionAr: 'توزيع مثالي لأطراف الملعب وثلاثي هجومي ضاغط مع خط وسط متوازن.',
    attackBonus: 12,
    defenseBonus: 6,
    midfieldBonus: 8,
    widthBonus: 14,
    counterBonus: 9,
    slots: [
      { slotIndex: 0, position: 'GK', roleAr: 'حارس مرمى', x: 50, y: 88 },
      { slotIndex: 1, position: 'LB', roleAr: 'ظهير أيسر', x: 18, y: 72 },
      { slotIndex: 2, position: 'CB', roleAr: 'قلب دفاع أيسر', x: 38, y: 75 },
      { slotIndex: 3, position: 'CB', roleAr: 'قلب دفاع أيمن', x: 62, y: 75 },
      { slotIndex: 4, position: 'RB', roleAr: 'ظهير أيمن', x: 82, y: 72 },
      { slotIndex: 5, position: 'CDM', roleAr: 'محور ارتكاز', x: 50, y: 56 },
      { slotIndex: 6, position: 'CM', roleAr: 'وسط متقدم أيسر', x: 32, y: 44 },
      { slotIndex: 7, position: 'CM', roleAr: 'وسط متقدم أيمن', x: 68, y: 44 },
      { slotIndex: 8, position: 'LW', roleAr: 'جناح هجومي أيسر', x: 20, y: 22 },
      { slotIndex: 9, position: 'ST', roleAr: 'مهاجم صريح', x: 50, y: 16 },
      { slotIndex: 10, position: 'RW', roleAr: 'جناح هجومي أيمن', x: 80, y: 22 }
    ]
  },
  {
    id: '4-2-3-1',
    name: '4-2-3-1',
    nameAr: '4-2-3-1 المحور المزدوج والـ 10',
    descriptionAr: 'حماية دفاعية عبر ثنائي الارتكاز مع حرية مطلقة لصانع الألعاب والأجنحة.',
    attackBonus: 10,
    defenseBonus: 10,
    midfieldBonus: 12,
    widthBonus: 10,
    counterBonus: 11,
    slots: [
      { slotIndex: 0, position: 'GK', roleAr: 'حارس مرمى', x: 50, y: 88 },
      { slotIndex: 1, position: 'LB', roleAr: 'ظهير أيسر', x: 18, y: 72 },
      { slotIndex: 2, position: 'CB', roleAr: 'قلب دفاع أيسر', x: 38, y: 75 },
      { slotIndex: 3, position: 'CB', roleAr: 'قلب دفاع أيمن', x: 62, y: 75 },
      { slotIndex: 4, position: 'RB', roleAr: 'ظهير أيمن', x: 82, y: 72 },
      { slotIndex: 5, position: 'CDM', roleAr: 'محور أول', x: 38, y: 56 },
      { slotIndex: 6, position: 'CDM', roleAr: 'محور ثانٍ', x: 62, y: 56 },
      { slotIndex: 7, position: 'CAM', roleAr: 'صانع ألعاب 10', x: 50, y: 38 },
      { slotIndex: 8, position: 'LW', roleAr: 'جناح أيسر', x: 22, y: 34 },
      { slotIndex: 9, position: 'RW', roleAr: 'جناح أيمن', x: 78, y: 34 },
      { slotIndex: 10, position: 'ST', roleAr: 'مهاجم هداف', x: 50, y: 16 }
    ]
  },
  {
    id: '4-4-2',
    name: '4-4-2',
    nameAr: '4-4-2 المسطحة الكلاسيكية',
    descriptionAr: 'انضباط خطين متوازيين مع ثنائية هجومية شرسة وتغطية كاملة للأطراف.',
    attackBonus: 9,
    defenseBonus: 9,
    midfieldBonus: 9,
    widthBonus: 12,
    counterBonus: 10,
    slots: [
      { slotIndex: 0, position: 'GK', roleAr: 'حارس مرمى', x: 50, y: 88 },
      { slotIndex: 1, position: 'LB', roleAr: 'ظهير أيسر', x: 18, y: 72 },
      { slotIndex: 2, position: 'CB', roleAr: 'قلب دفاع أيسر', x: 38, y: 75 },
      { slotIndex: 3, position: 'CB', roleAr: 'قلب دفاع أيمن', x: 62, y: 75 },
      { slotIndex: 4, position: 'RB', roleAr: 'ظهير أيمن', x: 82, y: 72 },
      { slotIndex: 5, position: 'LM', roleAr: 'وسط أيسر' as any, x: 20, y: 48 },
      { slotIndex: 6, position: 'CM', roleAr: 'وسط ميدان', x: 40, y: 50 },
      { slotIndex: 7, position: 'CM', roleAr: 'وسط ميدان', x: 60, y: 50 },
      { slotIndex: 8, position: 'RM', roleAr: 'وسط أيمن' as any, x: 80, y: 48 },
      { slotIndex: 9, position: 'ST', roleAr: 'مهاجم أول', x: 38, y: 18 },
      { slotIndex: 10, position: 'ST', roleAr: 'مهاجم ثانٍ', x: 62, y: 18 }
    ]
  },
  {
    id: '4-3-1-2',
    name: '4-3-1-2',
    nameAr: '4-3-1-2 الجوهرة الماسية (Diamond)',
    descriptionAr: 'كثافة حديدية في عمق الملعب وتمريرات بينية بين الخطوط مع مهاجمين اثنين.',
    attackBonus: 11,
    defenseBonus: 8,
    midfieldBonus: 15,
    widthBonus: 4,
    counterBonus: 8,
    slots: [
      { slotIndex: 0, position: 'GK', roleAr: 'حارس مرمى', x: 50, y: 88 },
      { slotIndex: 1, position: 'LB', roleAr: 'ظهير أيسر متقدم', x: 16, y: 68 },
      { slotIndex: 2, position: 'CB', roleAr: 'قلب دفاع أيسر', x: 38, y: 75 },
      { slotIndex: 3, position: 'CB', roleAr: 'قلب دفاع أيمن', x: 62, y: 75 },
      { slotIndex: 4, position: 'RB', roleAr: 'ظهير أيمن متقدم', x: 84, y: 68 },
      { slotIndex: 5, position: 'CDM', roleAr: 'قاعدة الماسة (Regista)', x: 50, y: 58 },
      { slotIndex: 6, position: 'CM', roleAr: 'وسط محوري أيسر', x: 32, y: 46 },
      { slotIndex: 7, position: 'CM', roleAr: 'وسط محوري أيمن', x: 68, y: 46 },
      { slotIndex: 8, position: 'CAM', roleAr: 'قمة الماسة (Trequartista)', x: 50, y: 32 },
      { slotIndex: 9, position: 'ST', roleAr: 'مهاجم أيسر', x: 38, y: 16 },
      { slotIndex: 10, position: 'ST', roleAr: 'مهاجم أيمن', x: 62, y: 16 }
    ]
  },
  {
    id: '3-4-3',
    name: '3-4-3',
    nameAr: '3-4-3 الهجوم الشامل والضغط',
    descriptionAr: 'ثلاثي دفاعي صلب مع أجنحة طرف تلتزم بالرواقين وثلاثي هجومي كاسح.',
    attackBonus: 15,
    defenseBonus: 5,
    midfieldBonus: 10,
    widthBonus: 14,
    counterBonus: 12,
    slots: [
      { slotIndex: 0, position: 'GK', roleAr: 'حارس مرمى', x: 50, y: 88 },
      { slotIndex: 1, position: 'CB', roleAr: 'مدافع أيسر', x: 28, y: 74 },
      { slotIndex: 2, position: 'CB', roleAr: 'قشاش أوسط', x: 50, y: 76 },
      { slotIndex: 3, position: 'CB', roleAr: 'مدافع أيمن', x: 72, y: 74 },
      { slotIndex: 4, position: 'LM', roleAr: 'رواق أيسر' as any, x: 14, y: 50 },
      { slotIndex: 5, position: 'CM', roleAr: 'محور وسط', x: 38, y: 52 },
      { slotIndex: 6, position: 'CM', roleAr: 'محور وسط', x: 62, y: 52 },
      { slotIndex: 7, position: 'RM', roleAr: 'رواق أيمن' as any, x: 86, y: 50 },
      { slotIndex: 8, position: 'LW', roleAr: 'مهاجم جناح أيسر', x: 24, y: 22 },
      { slotIndex: 9, position: 'ST', roleAr: 'مهاجم صريح', x: 50, y: 16 },
      { slotIndex: 10, position: 'RW', roleAr: 'مهاجم جناح أيمن', x: 76, y: 22 }
    ]
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    nameAr: '3-5-2 السيطرة الميدانية الإيطالية',
    descriptionAr: 'خماسي وسط يلتهم خصمه، مع ثنائي هجومي متناغم وظهيرين أجنحة لا يتوقفان.',
    attackBonus: 11,
    defenseBonus: 11,
    midfieldBonus: 14,
    widthBonus: 10,
    counterBonus: 10,
    slots: [
      { slotIndex: 0, position: 'GK', roleAr: 'حارس مرمى', x: 50, y: 88 },
      { slotIndex: 1, position: 'CB', roleAr: 'مدافع أيسر', x: 28, y: 74 },
      { slotIndex: 2, position: 'CB', roleAr: 'قلب دفاع', x: 50, y: 76 },
      { slotIndex: 3, position: 'CB', roleAr: 'مدافع أيمن', x: 72, y: 74 },
      { slotIndex: 4, position: 'LM', roleAr: 'ظهير جناح أيسر' as any, x: 14, y: 50 },
      { slotIndex: 5, position: 'CDM', roleAr: 'ارتكاز دفاعي', x: 50, y: 58 },
      { slotIndex: 6, position: 'CM', roleAr: 'وسط متقدم أيسر', x: 34, y: 44 },
      { slotIndex: 7, position: 'CM', roleAr: 'وسط متقدم أيمن', x: 66, y: 44 },
      { slotIndex: 8, position: 'RM', roleAr: 'ظهير جناح أيمن' as any, x: 86, y: 50 },
      { slotIndex: 9, position: 'ST', roleAr: 'مهاجم أيسر', x: 38, y: 18 },
      { slotIndex: 10, position: 'ST', roleAr: 'مهاجم أيمن', x: 62, y: 18 }
    ]
  },
  {
    id: '5-3-2',
    name: '5-3-2',
    nameAr: '5-3-2 الحائط الدفاعي والمرتدات',
    descriptionAr: 'خط خماسي خلفي متين يحمي المرمى مع سرعة انطلاق في المرتدات السريعة.',
    attackBonus: 7,
    defenseBonus: 15,
    midfieldBonus: 9,
    widthBonus: 9,
    counterBonus: 14,
    slots: [
      { slotIndex: 0, position: 'GK', roleAr: 'حارس مرمى', x: 50, y: 88 },
      { slotIndex: 1, position: 'LB', roleAr: 'ظهير أيسر', x: 15, y: 70 },
      { slotIndex: 2, position: 'CB', roleAr: 'مدافع ثالث', x: 32, y: 75 },
      { slotIndex: 3, position: 'CB', roleAr: 'قلب دفاع أوسط', x: 50, y: 76 },
      { slotIndex: 4, position: 'CB', roleAr: 'مدافع أيمن', x: 68, y: 75 },
      { slotIndex: 5, position: 'RB', roleAr: 'ظهير أيمن', x: 85, y: 70 },
      { slotIndex: 6, position: 'CM', roleAr: 'وسط قتالي', x: 34, y: 50 },
      { slotIndex: 7, position: 'CDM', roleAr: 'محور دفاعي', x: 50, y: 54 },
      { slotIndex: 8, position: 'CM', roleAr: 'وسط ممرر', x: 66, y: 50 },
      { slotIndex: 9, position: 'ST', roleAr: 'مهاجم سريع', x: 38, y: 18 },
      { slotIndex: 10, position: 'ST', roleAr: 'مهاجم هدف', x: 62, y: 18 }
    ]
  },
  {
    id: '4-1-4-1',
    name: '4-1-4-1',
    nameAr: '4-1-4-1 التحصين والسيطرة الفنية',
    descriptionAr: 'ارتكاز فردي قوي يحمي الدفاع وأربعة لاعبي وسط يسيطرون على تدوير الكرة.',
    attackBonus: 9,
    defenseBonus: 12,
    midfieldBonus: 14,
    widthBonus: 11,
    counterBonus: 8,
    slots: [
      { slotIndex: 0, position: 'GK', roleAr: 'حارس مرمى', x: 50, y: 88 },
      { slotIndex: 1, position: 'LB', roleAr: 'ظهير أيسر', x: 18, y: 72 },
      { slotIndex: 2, position: 'CB', roleAr: 'قلب دفاع', x: 38, y: 75 },
      { slotIndex: 3, position: 'CB', roleAr: 'قلب دفاع', x: 62, y: 75 },
      { slotIndex: 4, position: 'RB', roleAr: 'ظهير أيمن', x: 82, y: 72 },
      { slotIndex: 5, position: 'CDM', roleAr: 'ارتكاز محوري صريح', x: 50, y: 60 },
      { slotIndex: 6, position: 'LM', roleAr: 'جناح وسط أيسر' as any, x: 18, y: 42 },
      { slotIndex: 7, position: 'CM', roleAr: 'وسط متقدم', x: 38, y: 44 },
      { slotIndex: 8, position: 'CM', roleAr: 'وسط متقدم', x: 62, y: 44 },
      { slotIndex: 9, position: 'RM', roleAr: 'جناح وسط أيمن' as any, x: 82, y: 42 },
      { slotIndex: 10, position: 'ST', roleAr: 'رأس حربة معزول', x: 50, y: 16 }
    ]
  },
  {
    id: '4-4-1-1',
    name: '4-4-1-1',
    nameAr: '4-4-1-1 المهاجم الخفي والمساحات',
    descriptionAr: 'مهاجم ظل يتحرك بحرية في المساحة بين دفاع ووسط الخصم مع صلابة خطية.',
    attackBonus: 10,
    defenseBonus: 11,
    midfieldBonus: 11,
    widthBonus: 10,
    counterBonus: 11,
    slots: [
      { slotIndex: 0, position: 'GK', roleAr: 'حارس مرمى', x: 50, y: 88 },
      { slotIndex: 1, position: 'LB', roleAr: 'ظهير أيسر', x: 18, y: 72 },
      { slotIndex: 2, position: 'CB', roleAr: 'قلب دفاع', x: 38, y: 75 },
      { slotIndex: 3, position: 'CB', roleAr: 'قلب دفاع', x: 62, y: 75 },
      { slotIndex: 4, position: 'RB', roleAr: 'ظهير أيمن', x: 82, y: 72 },
      { slotIndex: 5, position: 'LM', roleAr: 'وسط طرف أيسر' as any, x: 20, y: 50 },
      { slotIndex: 6, position: 'CM', roleAr: 'وسط محوري', x: 40, y: 52 },
      { slotIndex: 7, position: 'CM', roleAr: 'وسط محوري', x: 60, y: 52 },
      { slotIndex: 8, position: 'RM', roleAr: 'وسط طرف أيمن' as any, x: 80, y: 50 },
      { slotIndex: 9, position: 'CAM', roleAr: 'مهاجم ظل (Second Striker)', x: 50, y: 30 },
      { slotIndex: 10, position: 'ST', roleAr: 'مهاجم صريح', x: 50, y: 16 }
    ]
  },
  {
    id: '5-4-1',
    name: '5-4-1',
    nameAr: '5-4-1 القلعة الحصينة (Catena)',
    descriptionAr: 'تأمين دفاعي قصوى بخمس مدافعين وأربع أوساط لخنق الخصوم ومنع أي اختراق.',
    attackBonus: 5,
    defenseBonus: 18,
    midfieldBonus: 8,
    widthBonus: 8,
    counterBonus: 12,
    slots: [
      { slotIndex: 0, position: 'GK', roleAr: 'حارس مرمى', x: 50, y: 88 },
      { slotIndex: 1, position: 'LB', roleAr: 'ظهير دفاعي أيسر', x: 15, y: 72 },
      { slotIndex: 2, position: 'CB', roleAr: 'مدافع مساك أيسر', x: 32, y: 76 },
      { slotIndex: 3, position: 'CB', roleAr: 'ليبرو / قشاش', x: 50, y: 78 },
      { slotIndex: 4, position: 'CB', roleAr: 'مدافع مساك أيمن', x: 68, y: 76 },
      { slotIndex: 5, position: 'RB', roleAr: 'ظهير دفاعي أيمن', x: 85, y: 72 },
      { slotIndex: 6, position: 'LM', roleAr: 'وسط أيسر دفاعي' as any, x: 20, y: 50 },
      { slotIndex: 7, position: 'CM', roleAr: 'وسط مقاتل', x: 40, y: 52 },
      { slotIndex: 8, position: 'CM', roleAr: 'وسط مقاتل', x: 60, y: 52 },
      { slotIndex: 9, position: 'RM', roleAr: 'وسط أيمن دفاعي' as any, x: 80, y: 50 },
      { slotIndex: 10, position: 'ST', roleAr: 'مهاجم محطة', x: 50, y: 18 }
    ]
  }
];

export const COACH_PLAYING_STYLES: PlayingStyleInfo[] = [
  {
    id: 'possession',
    name: 'Possession Football',
    nameAr: 'الاستحواذ وبناء اللعب (Tiki-Taka)',
    descriptionAr: 'تمرير قصير صبور وتحكم مطلق في وتيرة اللقاء لحرمان الخصم من الكرة.',
    keyStrengthAr: 'نسبة استحواذ عالية جداً وتحكم تام بنسق المباراة.',
    weaknessAr: 'عرضة للمرتدات السريعة في حال فقدان الكرة في مناطق متقدمة.',
    possessionModifier: 14,
    chanceCreationModifier: 8,
    counterVulnerability: 8,
    fatigueModifier: 5,
    pressingModifier: 6,
    suitableFormations: ['4-3-3', '4-2-3-1', '4-3-1-2']
  },
  {
    id: 'counter_attack',
    name: 'Counter Attack',
    nameAr: 'الهجمات المرتدة السريعة',
    descriptionAr: 'استدراج المنافس للأمام ثم ضرب دفاعاته في ثوانٍ معدودة عبر تحولات خاطفة.',
    keyStrengthAr: 'فعالية فائقة في الفرص المحققة وسرعة إنهاء الهجمات.',
    weaknessAr: 'تنازل عن الاستحواذ والضغط المستمر على خط الدفاع.',
    possessionModifier: -10,
    chanceCreationModifier: 12,
    counterVulnerability: -10,
    fatigueModifier: 6,
    pressingModifier: 4,
    suitableFormations: ['5-3-2', '4-4-2', '5-4-1', '4-4-1-1']
  },
  {
    id: 'high_press',
    name: 'High Press',
    nameAr: 'الضغط العالي الشامل (Gegenpressing)',
    descriptionAr: 'استعادة الكرة فور فقدانها في الثلث الأخير وخنق حامل الكرة بضراوة.',
    keyStrengthAr: 'إجبار الخصم على أخطاء قاتلة أمام مرماه وتهديد هجومي مباشر.',
    weaknessAr: 'استنزاف بدني هائل ومساحات شاسعة خلف خط الدفاع العالي.',
    possessionModifier: 6,
    chanceCreationModifier: 14,
    counterVulnerability: 10,
    fatigueModifier: 15,
    pressingModifier: 18,
    suitableFormations: ['4-3-3', '3-4-3', '4-2-3-1']
  },
  {
    id: 'low_block',
    name: 'Low Block',
    nameAr: 'التكتل الدفاعي المحكم (Park the Bus)',
    descriptionAr: 'إغلاق كل المنافذ حول منطقة الجزاء وحرمان الخصم من التسديد الصريح.',
    keyStrengthAr: 'استقبال أقل عدد من التسديدات ونظافة الشباك.',
    weaknessAr: 'صعوبة صناعة الفرص وقلة الكثافة الهجومية.',
    possessionModifier: -14,
    chanceCreationModifier: -4,
    counterVulnerability: -14,
    fatigueModifier: 3,
    pressingModifier: -8,
    suitableFormations: ['5-4-1', '5-3-2', '4-4-2']
  },
  {
    id: 'fast_buildup',
    name: 'Fast Build-Up',
    nameAr: 'التحضير السريع المباشر',
    descriptionAr: 'تمريرات عمودية سريعة ومباشرة نحو المرمى دون إبطاء اللعب.',
    keyStrengthAr: 'هجمات مباغتة قبل أن يرتب دفاع الخصم صفوفه.',
    weaknessAr: 'فقدان دقة التمرير وسهولة اعتراض الكرات العمودية.',
    possessionModifier: -2,
    chanceCreationModifier: 11,
    counterVulnerability: 4,
    fatigueModifier: 8,
    pressingModifier: 8,
    suitableFormations: ['4-3-3', '4-2-3-1', '3-4-3']
  },
  {
    id: 'direct_football',
    name: 'Direct Football',
    nameAr: 'الكرة المباشرة والطويلة',
    descriptionAr: 'تجاوز خط الوسط بكرات طولية دقيقة نحو رؤوس المهاجمين وصراع الكرات الثانية.',
    keyStrengthAr: 'قوة هائلة في الكرات الهوائية واستغلال الضعف البدني للخصم.',
    weaknessAr: 'تراجع الإبداع التكتيكي ونسبة الاستحواذ الأرضي.',
    possessionModifier: -8,
    chanceCreationModifier: 7,
    counterVulnerability: -4,
    fatigueModifier: 7,
    pressingModifier: 6,
    suitableFormations: ['4-4-2', '5-3-2', '4-4-1-1']
  },
  {
    id: 'wing_play',
    name: 'Wing Play',
    nameAr: 'اللعب عبر الأطراف والعرضيات',
    descriptionAr: 'توسيع رقعة الملعب إلى أقصى حد وتكثيف العرضيات الدقيقة لقلب الصندوق.',
    keyStrengthAr: 'تفكيك التكتلات الدفاعية العميقة وغزارة التهديد الرأسي.',
    weaknessAr: 'ترك عمق الملعب مكشوفاً عند ارتداد الكرات الثانية.',
    possessionModifier: 3,
    chanceCreationModifier: 10,
    counterVulnerability: 6,
    fatigueModifier: 9,
    pressingModifier: 7,
    suitableFormations: ['4-3-3', '4-4-2', '3-4-3']
  },
  {
    id: 'balanced',
    name: 'Balanced',
    nameAr: 'الأسلوب المتوازن المتكامل',
    descriptionAr: 'مزيج مرن يتكيف مع أطوار اللقاء ومستوى الخصم دون إفراط هجومي أو دفاعي.',
    keyStrengthAr: 'استقرار تكتيكي وثبات بدني طوال التسعين دقيقة.',
    weaknessAr: 'غياب عنصر المفاجأة المتطرفة ضد الفرق الكبرى.',
    possessionModifier: 0,
    chanceCreationModifier: 4,
    counterVulnerability: 0,
    fatigueModifier: 4,
    pressingModifier: 4,
    suitableFormations: ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2']
  },
  {
    id: 'defensive_football',
    name: 'Defensive Football',
    nameAr: 'الواقعية الدفاعية الصارمة',
    descriptionAr: 'الانتصار بنتيجة 1-0 والحفاظ على النتيجة بالأولويات التكتيكية المنضبطة.',
    keyStrengthAr: 'صعوبة بالغة في اختراق خطوطه والحفاظ على التقدم.',
    weaknessAr: 'قلة الأهداف المسجلة وضغط متزايد في الدقائق الأخيرة.',
    possessionModifier: -6,
    chanceCreationModifier: 2,
    counterVulnerability: -8,
    fatigueModifier: 5,
    pressingModifier: 2,
    suitableFormations: ['5-3-2', '4-1-4-1', '5-4-1']
  },
  {
    id: 'high_intensity',
    name: 'High Intensity',
    nameAr: 'الكثافة البدنية العالية والالتحامات',
    descriptionAr: 'ركض مستمر، قوة في الالتحامات الثنائية، وفرض وتيرة بدنية قاسية.',
    keyStrengthAr: 'تكسير إيقاع الفرق المهارية والتفوق في الصراعات البدنية.',
    weaknessAr: 'كثرة الأخطاء والبطاقات الملونة والإجهاد في الشوط الثاني.',
    possessionModifier: 2,
    chanceCreationModifier: 9,
    counterVulnerability: 2,
    fatigueModifier: 16,
    pressingModifier: 14,
    suitableFormations: ['4-4-2', '3-5-2', '4-3-1-2']
  }
];

// ============================================================
// أدوار اللاعبين التكتيكية التفصيلية (Tactical Player Roles)
// ============================================================
export const COACH_TACTICAL_ROLES: TacticalRoleDefinition[] = [
  // --- 1. STRIKER ROLES ---
  {
    id: 'primary_striker',
    category: 'STRIKER',
    name: 'Primary Striker',
    nameAr: 'مهاجم أول (صريح)',
    shortDescAr: 'يهاجم منطقة الجزاء وينهي الفرص ويبقى في أعلى نقطة بالملعب لتهديد قلبي الدفاع.',
    tacticalImpactAr: 'تركيز على الإنهاء المباشر، زيادة نسبة تحويل التسديدات لأهداف (+15%).',
    suitablePositions: ['ST'],
    staminaDrainModifier: 1.0,
    possessionModifier: -2,
    chanceModifier: 14
  },
  {
    id: 'secondary_striker',
    category: 'STRIKER',
    name: 'Secondary Striker',
    nameAr: 'مهاجم ثاني',
    shortDescAr: 'يسقط للخلف للمساهمة في بناء الهجمة، الربط مع خط الوسط وخلق مساحات للقادمين من الخلف.',
    tacticalImpactAr: 'يربط بين خطوط الفريق، زيادة الاستحواذ وصناعة الأهداف بنسبة (+10%).',
    suitablePositions: ['ST', 'CAM', 'LW', 'RW'],
    staminaDrainModifier: 1.1,
    possessionModifier: 3,
    chanceModifier: 9
  },
  {
    id: 'false_nine',
    category: 'STRIKER',
    name: 'False Nine',
    nameAr: 'مهاجم وهمي (False 9)',
    shortDescAr: 'يسقط إلى خط الوسط لسحب قلبي الدفاع وخلق كثافة عددية في العمق ومساحات للأجنحة السريعة.',
    tacticalImpactAr: 'يمنح الفريق تفوقاً عددياً في الوسط (+6% استحواذ) وتمريرات بينية خلف الدفاع.',
    suitablePositions: ['ST', 'CAM'],
    staminaDrainModifier: 1.15,
    possessionModifier: 6,
    chanceModifier: 8
  },
  {
    id: 'second_striker',
    category: 'STRIKER',
    name: 'Second Striker (SS)',
    nameAr: 'SS — مهاجم ظل / ثاني',
    shortDescAr: 'يتمركز خلف المهاجم الصريح، يستغل المساحات الناتجة عن تشتيت الدفاع ويسدد من الحافة.',
    tacticalImpactAr: 'خطورة كبرى في الكرات المرتدة والكرات الثانية على حدود منطقة الجزاء.',
    suitablePositions: ['ST', 'CAM'],
    staminaDrainModifier: 1.05,
    possessionModifier: 1,
    chanceModifier: 12
  },
  {
    id: 'playmaker_striker',
    category: 'STRIKER',
    name: 'Playmaker Forward',
    nameAr: 'صانع لعب هجومي',
    shortDescAr: 'مهاجم مبتكر يستلم الكرة بين الخطوط الدفاعية، يوزع كرات حاسمة ويخلق فرصاً بالجملة.',
    tacticalImpactAr: 'يزيد التمريرات الحاسمة وخلق الفرص الكبرى (+12%) مع نسبة تسديد أقل.',
    suitablePositions: ['ST', 'CAM', 'LW', 'RW'],
    staminaDrainModifier: 1.05,
    possessionModifier: 4,
    chanceModifier: 10
  },

  // --- 2. MIDFIELD ROLES ---
  {
    id: 'anchor',
    category: 'MIDFIELD',
    name: 'Defensive Anchor',
    nameAr: 'ارتكاز دفاعي (Anchor)',
    shortDescAr: 'حائط صد أمام قلبي الدفاع، يغلق زوايا التمرير ولا يتقدم أبداً للحفاظ على العمق.',
    tacticalImpactAr: 'يقلل خطورة المرتدات بنسبة (-20%) ويحمي الخط الخلفي من الانكشاف.',
    suitablePositions: ['CDM', 'CM'],
    staminaDrainModifier: 0.95,
    possessionModifier: 1,
    chanceModifier: -3
  },
  {
    id: 'defensive_midfielder',
    category: 'MIDFIELD',
    name: 'Ball-Winning Midfielder',
    nameAr: 'وسط مدافع (Ball Winner)',
    shortDescAr: 'ضغط مستمر وافتكاك عنيف للكرات في منتصف الملعب لإفساد هجمات الخصم في مهدها.',
    tacticalImpactAr: 'استرجاع فوري للكرة وقطع التمريرات، مع احتمالية ارتكاب أخطاء وتلقي إنذارات.',
    suitablePositions: ['CDM', 'CM'],
    staminaDrainModifier: 1.2,
    possessionModifier: 2,
    chanceModifier: 2
  },
  {
    id: 'central_midfielder',
    category: 'MIDFIELD',
    name: 'Central Midfielder',
    nameAr: 'لاعب وسط متكامل',
    shortDescAr: 'محرك الفريق المتوازن، يشارك في التمرير والبناء الدفاعي والهجومي بهدوء وثبات.',
    tacticalImpactAr: 'استقرار تام لخط الوسط وتوزيع هادئ للكرات في كل أرجاء الملعب.',
    suitablePositions: ['CM'],
    staminaDrainModifier: 1.0,
    possessionModifier: 3,
    chanceModifier: 4
  },
  {
    id: 'advanced_midfielder',
    category: 'MIDFIELD',
    name: 'Advanced Midfielder',
    nameAr: 'لاعب وسط متقدم',
    shortDescAr: 'ينطلق بالكرة نحو الثلث الهجومي ويدعم المهاجمين بتمريرات بينية متقنة وتسديدات قوية.',
    tacticalImpactAr: 'يزيد الفاعلية الهجومية والتهديد المباشر للمرمى مع إسناد هجومي متواصل.',
    suitablePositions: ['CM', 'CAM'],
    staminaDrainModifier: 1.15,
    possessionModifier: 2,
    chanceModifier: 10
  },
  {
    id: 'classic_playmaker',
    category: 'MIDFIELD',
    name: 'Classic Playmaker',
    nameAr: 'صانع ألعاب كلاسيكي (#10)',
    shortDescAr: 'العقل المدبر في صناعة اللعب، رؤية خيالية وتمريرات سحرية تكسر التكتلات.',
    tacticalImpactAr: 'رفع نسبة التمريرات المفتاحية والفرص الذهبية (+18%)، دون أدوار دفاعية.',
    suitablePositions: ['CAM', 'CM'],
    staminaDrainModifier: 0.9,
    possessionModifier: 5,
    chanceModifier: 13
  },
  {
    id: 'box_to_box',
    category: 'MIDFIELD',
    name: 'Box-to-Box Midfielder',
    nameAr: 'لاعب بوكس تو بوكس (من الصندوق للصندوق)',
    shortDescAr: 'حركة ديناميكية مستمرة بين منطقتي الجزاء، يدافع بشراسة ويسجل الأهداف في الهجوم.',
    tacticalImpactAr: 'حضور كثيف في الهجوم والدفاع، لكنه يستهلك طاقة بدنية مضاعفة (Stamina x1.35).',
    suitablePositions: ['CM', 'CDM'],
    staminaDrainModifier: 1.35,
    possessionModifier: 2,
    chanceModifier: 8
  },
  {
    id: 'attacking_midfielder',
    category: 'MIDFIELD',
    name: 'Attacking Midfielder',
    nameAr: 'خط نص مهاجم',
    shortDescAr: 'ينشط في المساحة بين خط الوسط والدفاع، يتحول بسرعة نحو الصندوق لصناعة وإنهاء الهجمات.',
    tacticalImpactAr: 'تسريع وتيرة الهجمات وتشكيل زيادة عددية سريعة داخل منطقة الجزاء.',
    suitablePositions: ['CAM', 'CM', 'LW', 'RW'],
    staminaDrainModifier: 1.1,
    possessionModifier: 2,
    chanceModifier: 11
  },

  // --- 3. DEFENSIVE ROLES ---
  {
    id: 'center_back',
    category: 'DEFENSE',
    name: 'Central Defender',
    nameAr: 'قلب دفاع كلاسيكي',
    shortDescAr: 'مدافع صارم، يلتزم بمركزه، يراقب المهاجم، ويشتت العرضيات بأمان.',
    tacticalImpactAr: 'حماية كلاسيكية للمرمى وقوة في الكرات الهوائية والالتحامات داخل الصندوق.',
    suitablePositions: ['CB'],
    staminaDrainModifier: 0.95,
    possessionModifier: 0,
    chanceModifier: -2
  },
  {
    id: 'advanced_cb',
    category: 'DEFENSE',
    name: 'Ball-Playing Defender',
    nameAr: 'قلب دفاع متقدم (بناء اللعب)',
    shortDescAr: 'يتقدم خطوة للأمام بالكرة، يكسر خط الضغط الأول للخصم بتمريرات دقيقة للأمام.',
    tacticalImpactAr: 'يساعد في بناء اللعب من الخلف (+4% استحواذ)، لكنه يخاطر بترك مساحة خلفه.',
    suitablePositions: ['CB'],
    staminaDrainModifier: 1.05,
    possessionModifier: 4,
    chanceModifier: 2
  },
  {
    id: 'covering_cb',
    category: 'DEFENSE',
    name: 'Covering Defender (Sweeper)',
    nameAr: 'مدافع تغطية',
    shortDescAr: 'يتمركز أعمق من زملائه لقراءة التمريرات الطولية والتغطية السريعة خلف الأظهرة.',
    tacticalImpactAr: 'يمنع انفرادات الخصم السريعة ويفسد الكرات البينية الماكرة في ظهر الدفاع.',
    suitablePositions: ['CB'],
    staminaDrainModifier: 1.0,
    possessionModifier: 0,
    chanceModifier: -1
  },
  {
    id: 'defensive_fullback',
    category: 'DEFENSE',
    name: 'Defensive Fullback',
    nameAr: 'ظهير دفاعي متأخر',
    shortDescAr: 'يلتزم بالخط الخلفي ولا يتقدم للهجوم، يغلق المساحة تماماً أمام أجنحة الخصم السريعة.',
    tacticalImpactAr: 'شل حركة أجنحة الخصم ومنع العرضيات بنسبة كبيرة، دون مساهمة هجومية.',
    suitablePositions: ['LB', 'RB'],
    staminaDrainModifier: 0.95,
    possessionModifier: -1,
    chanceModifier: -2
  },
  {
    id: 'attacking_fullback',
    category: 'DEFENSE',
    name: 'Attacking Fullback',
    nameAr: 'ظهير متقدم (هجومي)',
    shortDescAr: 'ينطلق على الخط باستمرار، يرسل عرضيات متقنة ويشكل خطورة هجومية مضاعفة.',
    tacticalImpactAr: 'زيادة العرضيات وصناعة الفرص (+14%) مع ترك مساحات خلفه قد يستغلها المنافس.',
    suitablePositions: ['LB', 'RB'],
    staminaDrainModifier: 1.25,
    possessionModifier: 2,
    chanceModifier: 7
  },
  {
    id: 'wing_back',
    category: 'DEFENSE',
    name: 'Wing Back',
    nameAr: 'Wing Back (جناح خلفي)',
    shortDescAr: 'يهيمن على الرواق بأكمله دفاعاً وهجوماً، ركض شاق في خطط 3 أو 5 مدافعين.',
    tacticalImpactAr: 'تغطية متكاملة للطرف، يوفر كثافة هجومية وتأميناً دفاعياً مع استهلاك بدني حاد.',
    suitablePositions: ['LB', 'RB', 'LM', 'RM'],
    staminaDrainModifier: 1.3,
    possessionModifier: 2,
    chanceModifier: 6
  },
  {
    id: 'inverted_fullback',
    category: 'DEFENSE',
    name: 'Inverted Fullback',
    nameAr: 'ظهير عكسي (يدخل للعمق)',
    shortDescAr: 'يدخل إلى عمق خط الوسط عند امتلاك الكرة بدلاً من الجري على الطرف ليخلق زيادة عددية.',
    tacticalImpactAr: 'سيطرة فائقة على منتصف الملعب، دقة تمرير عالية، وحرمان الخصم من مرتدات العمق.',
    suitablePositions: ['LB', 'RB', 'CDM', 'CM'],
    staminaDrainModifier: 1.15,
    possessionModifier: 5,
    chanceModifier: 4
  }
];

/**
 * حساب عقوبة المركز الخاطئ للاعب (Wrong Position Penalty)
 */
export function calculatePositionPenalty(
  naturalPosition: CoachPosition,
  slotPosition: string
): {
  penalty: number;
  status: 'NATURAL' | 'COMPATIBLE' | 'OUT_OF_POSITION' | 'SEVERELY_MISPLACED';
  messageAr: string;
} {
  if (naturalPosition === slotPosition) {
    return {
      penalty: 0,
      status: 'NATURAL',
      messageAr: 'المركز طبيعي 100% (أداء مثالي وثقة كاملة)'
    };
  }

  // Goalkeeper constraints
  if (naturalPosition === 'GK' && slotPosition !== 'GK') {
    return {
      penalty: -45,
      status: 'SEVERELY_MISPLACED',
      messageAr: 'كارثة! حارس مرمى يلعب في الميدان!'
    };
  }
  if (slotPosition === 'GK' && naturalPosition !== 'GK') {
    return {
      penalty: -45,
      status: 'SEVERELY_MISPLACED',
      messageAr: 'كارثة! لاعب ميدان يقف في حراسة المرمى!'
    };
  }

  // Highly compatible pairs
  const compatiblePairs: Record<string, string[]> = {
    CB: ['LB', 'RB', 'CDM'],
    LB: ['RB', 'CB', 'LM'],
    RB: ['LB', 'CB', 'RM'],
    CDM: ['CM', 'CB'],
    CM: ['CDM', 'CAM', 'LM', 'RM'],
    CAM: ['CM', 'ST', 'LW', 'RW'],
    LM: ['LW', 'LB', 'CM', 'RM'],
    RM: ['RW', 'RB', 'CM', 'LM'],
    LW: ['RW', 'LM', 'ST', 'CAM'],
    RW: ['LW', 'RM', 'ST', 'CAM'],
    ST: ['CAM', 'LW', 'RW']
  };

  const isCompatible = compatiblePairs[naturalPosition]?.includes(slotPosition);
  if (isCompatible) {
    return {
      penalty: -4,
      status: 'COMPATIBLE',
      messageAr: 'مركز قريب ومتوافق تكتيكياً (تراجع طفيف في الفاعلية -4)'
    };
  }

  // Out of position (different department)
  const isSevere =
    (['CB', 'LB', 'RB'].includes(naturalPosition) && ['ST', 'LW', 'RW'].includes(slotPosition)) ||
    (['ST', 'LW', 'RW'].includes(naturalPosition) && ['CB', 'LB', 'RB'].includes(slotPosition));

  if (isSevere) {
    return {
      penalty: -28,
      status: 'SEVERELY_MISPLACED',
      messageAr: 'خطأ جسيم! لاعب في مركز غير متوافق إطلاقاً مع إمكانياته (-28)'
    };
  }

  return {
    penalty: -12,
    status: 'OUT_OF_POSITION',
    messageAr: 'خارج مركزه المعتاد (تأثير سلبي ملحوظ على التمركز والأداء -12)'
  };
}

/**
 * حساب الانسجام التكتيكي للخطة والتشكيلة الحالية (Tactical Cohesion)
 */
export function calculateTacticalCohesion(
  team: CoachTeam,
  tactics: UserTacticalSettings
): TacticalCohesionResult {
  let score = 85;
  const issuesAr: string[] = [];
  const strengthsAr: string[] = [];

  const starters = team.startingXI.map((id) => team.squad.find((p) => p.id === id)).filter(Boolean);
  const formation = COACH_FORMATIONS.find((f) => f.id === team.formation) || COACH_FORMATIONS[0];

  // 1. Check central defenders
  const cbSlots = formation.slots.filter((s) => s.position === 'CB').length;
  if (cbSlots < 2 && !['5-4-1', '5-3-2', '3-4-3', '3-5-2'].includes(formation.id)) {
    score -= 20;
    issuesAr.push('عمق الدفاع مكشوف: لا يوجد قلبا دفاع على الأقل لتأمين الصندوق');
  } else {
    strengthsAr.push('عمق دفاعي صلب ومتماسك أمام المرمى');
  }

  // 2. Check defensive midfielder / anchor presence
  const hasCDM = formation.slots.some((s) => s.position === 'CDM') ||
    Object.values(tactics.playerRoles || {}).some((r) => ['anchor', 'defensive_midfielder'].includes(r));

  const attackerCount = formation.slots.filter((s) => ['ST', 'LW', 'RW'].includes(s.position)).length;
  if (!hasCDM && attackerCount >= 3) {
    score -= 12;
    issuesAr.push('غياب لاعب ارتكاز دفاعي في الوسط لحماية قلبي الدفاع من المرتدات');
  } else if (hasCDM) {
    strengthsAr.push('تغطية دفاعية جيدة لخط الوسط وحماية لمنطقة الجزاء');
  }

  // 3. Check extreme forward imbalance
  if (attackerCount >= 4) {
    score -= 15;
    issuesAr.push('كثافة هجومية مفرطة تخلق فجوة كبيرة بين خطي الوسط والهجوم');
  }

  // 4. Style & Formation Synergy
  const style = COACH_PLAYING_STYLES.find((s) => s.id === tactics.playingStyle || s.name === tactics.playingStyle);
  if (style) {
    if (style.suitableFormations.includes(team.formation)) {
      score += 8;
      strengthsAr.push(`تناغم مثالي بين خطة ${team.formation} وأسلوب ${style.nameAr}`);
    } else {
      score -= 8;
      issuesAr.push(`الخطة ${team.formation} لا تخدم متطلبات أسلوب ${style.nameAr} بالشكل الأمثل`);
    }
  }

  // 5. Position misplacements
  let misplacedCount = 0;
  formation.slots.forEach((slot, idx) => {
    const player = starters[idx];
    if (player) {
      const penalty = calculatePositionPenalty(player.position, slot.position);
      if (penalty.status === 'SEVERELY_MISPLACED') {
        misplacedCount += 2;
        issuesAr.push(`اللاعب ${player.nameAr} موضوع في مركز كارثي (${slot.position})`);
      } else if (penalty.status === 'OUT_OF_POSITION') {
        misplacedCount += 1;
      }
    }
  });

  score -= misplacedCount * 6;
  score = Math.max(25, Math.min(99, score));

  let level: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'WEAK' | 'POOR' = 'GOOD';
  let levelAr = 'جيد';
  let color = '#10b981';

  if (score >= 85) {
    level = 'EXCELLENT';
    levelAr = 'ممتاز (تناغم تكتيكي متكامل)';
    color = '#10b981';
  } else if (score >= 70) {
    level = 'GOOD';
    levelAr = 'جيد (هيكل تكتيكي متزن)';
    color = '#3b82f6';
  } else if (score >= 55) {
    level = 'AVERAGE';
    levelAr = 'متوسط (توجد شوية الثغرات)';
    color = '#f59e0b';
  } else if (score >= 40) {
    level = 'WEAK';
    levelAr = 'ضعيف (خلل في توزيع المراكز والمهام)';
    color = '#f97316';
  } else {
    level = 'POOR';
    levelAr = 'سيئ (تشكيلة مفككة وثغرات قاتلة)';
    color = '#ef4444';
  }

  return {
    score,
    level,
    levelAr,
    issuesAr,
    strengthsAr,
    color
  };
}

/**
 * تقديم تغذية راجعة فورية وواضحة للمدرب عند تغيير الخطة أو الأسلوب
 */
export function getTacticalChangeFeedback(
  prevFormation: string,
  newFormation: string,
  prevStyle?: string,
  newStyle?: string
): string {
  const formationFeedback: Record<string, string> = {
    '4-3-3': 'تحول إلى 4-3-3: توسيع رقعة اللعب على الأجنحة وزيادة الكثافة في الثلث الأخير.',
    '4-2-3-1': 'تحول إلى 4-2-3-1: تعزيز أمان العمق بلاعبي ارتكاز وتحرير صانع الألعاب.',
    '4-4-2': 'تحول إلى 4-4-2: توازن خطي تقليدي، ثنائي هجومي مباشر، وضغط منتظم عبر الخطوط.',
    '3-5-2': 'تحول إلى 3-5-2: هيمنة كاسحة على وسط الملعب وثلاثي دفاعي صلب ضد الكرات العرضية.',
    '3-4-3': 'تحول إلى 3-4-3: ضغط هجومي شرس ومباغت مع الاعتماد الكامل على الأجنحة الخلفية.',
    '4-3-1-2': 'تحول إلى 4-3-1-2: إحكام القبضة على عمق الملعب وتمريرات بينية مكثفة نحو ثنائي الهجوم.',
    '5-3-2': 'تحول إلى 5-3-2: تأمين دفاعي فولاذي بخمسة مدافعين والاعتماد الصارم على التحولات السريعة.',
    '4-1-4-1': 'تحول إلى 4-1-4-1: تكثيف خط الوسط بخمسة لاعبين لمنع الخصم من التمرير في العمق.',
    '4-4-1-1': 'تحول إلى 4-4-1-1: تأمين المساحات بين الخطوط بواسطة مهاجم ظل يربط الهجوم بالوسط.',
    '5-4-1': 'تحول إلى 5-4-1: إغلاق تام لكل المنافذ نحو المرمى وتكتل دفاعي عميق.'
  };

  const styleFeedback: Record<string, string> = {
    possession: 'تفعيل الاستحواذ: تدوير هادئ للكرة وإرهاق الخصم بالتمريرات القصيرة.',
    counter_attack: 'تفعيل المرتدات: ترك الاستحواذ والانقضاض السريع في المساحات الشاغرة.',
    high_press: 'تفعيل الضغط العالي: استرجاع سريع للكرة في مناطق الخصم مع استهلاك لياقة مرتفع.',
    low_block: 'تفعيل التكتل الدفاعي: التراجع لخط المنطقة وإحباط كل محاولات الاختراق.',
    fast_buildup: 'تفعيل التحضير السريع: تمريرات عمودية مباشرة تباغت دفاع الخصم قبل تنظيمه.',
    direct_football: 'تفعيل الكرة المباشرة: إرسال كرات طولية نحو الصندوق والمنافسة على الكرات الثانية.',
    wing_play: 'تفعيل اللعب عبر الأطراف: فتح الملعب وإرسال كرات عرضية متتالية لقلب الصندوق.',
    balanced: 'تفعيل الأسلوب المتوازن: ثبات بدني ومرونة عالية للتكيف مع أطوار المباراة.',
    defensive_football: 'تفعيل الواقعية الدفاعية: أولوية نظافة الشباك والانضباط التكتيكي التام.',
    high_intensity: 'تفعيل الكثافة البدنية: شراسة في الالتحامات وضغط بدني شاق طوال اللقاء.'
  };

  const parts: string[] = [];
  if (prevFormation !== newFormation && formationFeedback[newFormation]) {
    parts.push(formationFeedback[newFormation]);
  }
  if (newStyle && styleFeedback[newStyle]) {
    parts.push(styleFeedback[newStyle]);
  }

  return parts.join(' | ') || 'تم تطبيق التعديلات التكتيكية بنجاح وسيبدأ الفريق في تنفيذها على طول.';
}

// ============================================================
// اختيار التشكيلة تلقائيًا (Automatic Best XI Selection)
//
// This is NOT "pick the 11 highest overall ratings". Every slot is
// filled by the player who scores best FOR THAT SPECIFIC SLOT once
// natural/secondary position fit, current form, fitness and morale
// are taken into account — unavailable players (injured for this
// matchday or suspended) are excluded entirely.
// ============================================================
export function pickAutomaticBestXI(
  team: CoachTeam,
  formation: TacticalFormation
): { startingXI: string[]; bench: string[] } {
  const isAvailable = (p: CoachSquadPlayer): boolean => {
    const suspended = !!p.suspensionStatus && p.suspensionStatus.matchesRemaining > 0;
    const injured = !!p.injuryStatus && (p.injuryStatus.isMatchDayInjured || p.injuryStatus.weeksRemaining > 0);
    return !suspended && !injured;
  };

  const scoreForSlot = (p: CoachSquadPlayer, slotPosition: CoachPosition): number => {
    const naturalPos = p.preferredPosition || p.position;
    const { penalty } = calculatePositionPenalty(naturalPos, slotPosition);
    const fitness = p.fitness ?? 90;
    const form = p.form ?? 75;
    const morale = p.morale ?? 80;
    // Rating is the base, then position suitability, condition and
    // current form/morale all nudge the final score up or down —
    // so a lower-rated but fitter/in-form/naturally-positioned player
    // can legitimately beat a bigger name who is out of position or tired.
    return p.rating + penalty + (fitness - 90) / 4 + (form - 75) / 6 + (morale - 80) / 10;
  };

  const pool = team.squad.filter(isAvailable);
  const orderedSlots = [...formation.slots].sort((a, b) => {
    // Fill goalkeeper first (avoids a rare edge case where the GK slot
    // could otherwise be starved by the greedy outfield assignment).
    if (a.position === 'GK' && b.position !== 'GK') return -1;
    if (b.position === 'GK' && a.position !== 'GK') return 1;
    return a.slotIndex - b.slotIndex;
  });

  const assignedBySlot: Record<number, string> = {};
  const takenIds = new Set<string>();

  for (const slot of orderedSlots) {
    let best: CoachSquadPlayer | null = null;
    let bestScore = -Infinity;
    for (const p of pool) {
      if (takenIds.has(p.id)) continue;
      const s = scoreForSlot(p, slot.position);
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }
    if (best) {
      assignedBySlot[slot.slotIndex] = best.id;
      takenIds.add(best.id);
    }
  }

  const startingXI = [...formation.slots]
    .sort((a, b) => a.slotIndex - b.slotIndex)
    .map((s) => assignedBySlot[s.slotIndex])
    .filter(Boolean);

  const remaining = team.squad.filter((p) => !takenIds.has(p.id));
  // Bench favors fit, available outfield/GK depth by rating; injured/suspended
  // players who can't play are pushed to the very end rather than excluded,
  // so the squad list doesn't silently lose them from view.
  const benchSize = Math.max(7, team.bench?.length || 7);
  const bench = [...remaining]
    .sort((a, b) => {
      const aAvail = isAvailable(a) ? 1 : 0;
      const bAvail = isAvailable(b) ? 1 : 0;
      if (aAvail !== bAvail) return bAvail - aAvail;
      return b.rating - a.rating;
    })
    .slice(0, benchSize)
    .map((p) => p.id);

  return { startingXI, bench };
}
