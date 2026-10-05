// ============================================================
// أنت المدرب | Complete 5 Major European Leagues Database
// Premier League (20), La Liga (20), Bundesliga (18), Serie A (20), Ligue 1 (18)
// ============================================================

import { CoachLeague, CoachTeam, CoachSquadPlayer, CoachPosition } from '../types/coachGameTypes';

export function makePlayer(
  id: string,
  name: string,
  nameAr: string,
  position: CoachPosition,
  rating: number,
  age: number,
  attack: number,
  defense: number,
  passing: number,
  pace: number,
  physical: number,
  potential: number = rating + 3,
  preferredFoot: 'LEFT' | 'RIGHT' | 'BOTH' = 'RIGHT'
): CoachSquadPlayer {
  return {
    id,
    name,
    nameAr,
    position,
    rating,
    potential: Math.min(99, potential),
    age,
    fitness: 95 + Math.floor(Math.random() * 5),
    morale: 85 + Math.floor(Math.random() * 15),
    form: 7 + Math.floor(Math.random() * 3),
    attack,
    defense,
    passing,
    dribbling: Math.round((attack + passing) / 2),
    shooting: Math.round(attack * 0.95),
    pace,
    physical,
    preferredPosition: position,
    preferredFoot,
    marketValue: Math.round(Math.max(5, (rating - 68) * 4.5 + (28 - Math.min(age, 28)) * 1.5)),
    wageWeekly: Math.round(Math.max(15, (rating - 70) * 8)),
    contractYears: 2 + (id.charCodeAt(0) % 3),
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    matchesPlayed: 0
  };
}

export function buildSquad(prefix: string, baseRating: number, starName: string, starNameAr: string, starPos: CoachPosition): CoachSquadPlayer[] {
  // Real-style player names (first + last name pools) used to fill the
  // 18 non-marquee squad slots, so every player has an actual name
  // instead of a generic job-title placeholder like "الحارس الأساسي".
  // Names are picked deterministically per club (seeded by the club's
  // own prefix) so results are stable across reloads but vary from
  // club to club.
  const FIRST_NAMES: { en: string; ar: string }[] = [
    { en: 'Lucas', ar: 'لوكاس' },
    { en: 'Mateo', ar: 'ماتيو' },
    { en: 'Kevin', ar: 'كيفن' },
    { en: 'Diego', ar: 'دييغو' },
    { en: 'Thomas', ar: 'توماس' },
    { en: 'Marco', ar: 'ماركو' },
    { en: 'Andre', ar: 'أندريه' },
    { en: 'Bruno', ar: 'برونو' },
    { en: 'Carlos', ar: 'كارلوس' },
    { en: 'Daniel', ar: 'دانيال' },
    { en: 'Erik', ar: 'إريك' },
    { en: 'Fabio', ar: 'فابيو' },
    { en: 'Hugo', ar: 'هوغو' },
    { en: 'Ivan', ar: 'إيفان' },
    { en: 'Jules', ar: 'جول' },
    { en: 'Karim', ar: 'كريم' },
    { en: 'Leon', ar: 'ليون' },
    { en: 'Mario', ar: 'ماريو' },
    { en: 'Nicolas', ar: 'نيكولاس' },
    { en: 'Oscar', ar: 'أوسكار' },
    { en: 'Pedro', ar: 'بيدرو' },
    { en: 'Rafael', ar: 'رافاييل' },
    { en: 'Samir', ar: 'سمير' },
    { en: 'Tomas', ar: 'توماش' }
  ];

  const LAST_NAMES: { en: string; ar: string }[] = [
    { en: 'Silva', ar: 'سيلفا' },
    { en: 'Costa', ar: 'كوستا' },
    { en: 'Fernandez', ar: 'فيرنانديز' },
    { en: 'Rossi', ar: 'روسي' },
    { en: 'Muller', ar: 'مولر' },
    { en: 'Dubois', ar: 'دوبوا' },
    { en: 'Santos', ar: 'سانتوس' },
    { en: 'Novak', ar: 'نوفاك' },
    { en: 'Petrov', ar: 'بيتروف' },
    { en: 'Almeida', ar: 'ألميدا' },
    { en: 'Larsson', ar: 'لارسون' },
    { en: 'Van Dijk', ar: 'فان دايك' },
    { en: 'Moreno', ar: 'مورينو' },
    { en: 'Kovac', ar: 'كوفاتش' },
    { en: 'Haddad', ar: 'حداد' },
    { en: 'Rahman', ar: 'رحمن' },
    { en: 'Okafor', ar: 'أوكافور' },
    { en: 'Diallo', ar: 'دياللو' },
    { en: 'Nakamura', ar: 'ناكامورا' },
    { en: 'Andersen', ar: 'أندرسن' },
    { en: 'Marchetti', ar: 'ماركيتي' },
    { en: 'Lindgren', ar: 'ليندغرين' },
    { en: 'Duarte', ar: 'دوارتي' },
    { en: 'Osei', ar: 'أوسي' }
  ];

  const seed = prefix.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const positions: { pos: CoachPosition; att: number; def: number; pass: number; pace: number; phys: number }[] = [
    { pos: 'GK', att: 18, def: baseRating + 2, pass: 68, pace: 55, phys: 78 },
    { pos: 'CB', att: 32, def: baseRating + 2, pass: 70, pace: 72, phys: 84 },
    { pos: 'CB', att: 30, def: baseRating + 1, pass: 68, pace: 70, phys: 82 },
    { pos: 'RB', att: 65, def: baseRating, pass: 76, pace: 82, phys: 76 },
    { pos: 'LB', att: 68, def: baseRating, pass: 76, pace: 84, phys: 74 },
    { pos: 'CDM', att: 68, def: baseRating + 1, pass: 79, pace: 72, phys: 82 },
    { pos: 'CM', att: 76, def: baseRating - 2, pass: baseRating + 1, pace: 76, phys: 77 },
    { pos: 'CAM', att: baseRating + 1, def: 55, pass: baseRating + 2, pace: 78, phys: 70 },
    { pos: 'RW', att: baseRating + 1, def: 48, pass: 78, pace: 88, phys: 72 },
    { pos: 'LW', att: baseRating + 2, def: 45, pass: 76, pace: 90, phys: 72 },
    { pos: 'ST', att: baseRating + 3, def: 40, pass: 72, pace: 84, phys: 80 },
    // Bench
    { pos: 'GK', att: 15, def: baseRating - 4, pass: 62, pace: 50, phys: 74 },
    { pos: 'CB', att: 28, def: baseRating - 3, pass: 65, pace: 68, phys: 80 },
    { pos: 'LB', att: 62, def: baseRating - 4, pass: 72, pace: 78, phys: 72 },
    { pos: 'CM', att: 72, def: baseRating - 5, pass: baseRating - 3, pace: 74, phys: 74 },
    { pos: 'RW', att: baseRating - 3, def: 42, pass: 72, pace: 84, phys: 68 },
    { pos: 'ST', att: baseRating - 2, def: 38, pass: 68, pace: 80, phys: 76 },
    { pos: 'CAM', att: baseRating - 3, def: 45, pass: 74, pace: 76, phys: 68 }
  ];

  const commonNames = Array.from({ length: 18 }, (_, idx) => {
    const first = FIRST_NAMES[(seed + idx * 7) % FIRST_NAMES.length];
    const last = LAST_NAMES[(seed * 3 + idx * 11) % LAST_NAMES.length];
    return { en: `${first.en} ${last.en}`, ar: `${first.ar} ${last.ar}` };
  });

  return positions.map((cfg, idx) => {
    const isStar = idx === (cfg.pos === starPos ? idx : 10);
    const pName = isStar ? starName : commonNames[idx].en;
    const pNameAr = isStar ? starNameAr : commonNames[idx].ar;
    const pRating = isStar ? Math.min(94, baseRating + 4) : baseRating + (idx < 11 ? Math.floor(Math.random() * 3) : -Math.floor(Math.random() * 4 + 2));

    return makePlayer(
      `${prefix}_p${idx + 1}`,
      pName,
      pNameAr,
      cfg.pos,
      pRating,
      21 + (idx % 12),
      cfg.att,
      cfg.def,
      cfg.pass,
      cfg.pace,
      cfg.phys,
      pRating + (idx > 11 ? 5 : 2),
      idx % 3 === 0 ? 'LEFT' : 'RIGHT'
    );
  });
}

export function createClub(
  id: string,
  name: string,
  nameAr: string,
  shortName: string,
  leagueId: string,
  stadiumName: string,
  primaryColor: string,
  secondaryColor: string,
  overallRating: number,
  attackRating: number,
  midfieldRating: number,
  defenseRating: number,
  managerName: string,
  managerNameAr: string,
  managerNationality: string,
  managerNatAr: string,
  formation: string,
  playingStyle: string,
  transferBudgetM: number,
  boardObjectiveAr: string,
  squad: CoachSquadPlayer[]
): CoachTeam {
  const starters = squad.slice(0, 11).map((p) => p.id);
  const bench = squad.slice(11).map((p) => p.id);

  return {
    id,
    name,
    nameAr,
    shortName,
    leagueId,
    stadiumName,
    primaryColor,
    secondaryColor,
    logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80',
    overallRating,
    attackRating,
    midfieldRating,
    defenseRating,
    currentManager: {
      name: managerName,
      nameAr: managerNameAr,
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      nationality: managerNationality,
      nationalityAr: managerNatAr,
      preferredFormation: formation,
      preferredStyle: playingStyle,
      tacticalMindset: 90,
      isCustom: false
    },
    squad,
    startingXI: starters,
    bench,
    formation,
    playingStyle,
    isNationalTeam: false,
    controllerType: 'AI',
    budget: {
      transfer: transferBudgetM,
      wage: Math.round(transferBudgetM * 8)
    },
    boardExpectations: {
      leagueObjective: boardObjectiveAr,
      leagueObjectiveAr: boardObjectiveAr,
      cupObjective: 'Reach Quarterfinals',
      cupObjectiveAr: 'الوصول لربع نهائي الكأس على الأقل',
      minPointsTarget: Math.round(overallRating * 0.85)
    },
    boardConfidence: 85,
    fanConfidence: 85,
    seasonObjectivesAr: [
      boardObjectiveAr,
      'تطوير وتصعيد المواهب الشابة للمشاركة',
      'الحفاظ على التوازن المالي وتجنب عجز الميزانية'
    ],
    captainId: starters[1] || starters[0],
    penaltyTakerId: starters[10] || starters[9],
    freeKickTakerId: starters[7] || starters[9],
    cornerTakerId: starters[8] || starters[6]
  };
}

// -----------------------------------------------------------------------------------
// 1. PREMIER LEAGUE (20 CLUBS)
// -----------------------------------------------------------------------------------
export const PREMIER_LEAGUE_TEAMS: CoachTeam[] = [
  createClub('ars', 'Arsenal', 'أرسنال', 'ARS', 'premier_league', 'Emirates Stadium', '#EF0107', '#063672', 88, 88, 89, 88, 'Mikel Arteta', 'ميكيل أرتيتا', 'Spain', 'إسبانيا', '4-3-3', 'High Press', 110, 'المنافسة الشرسة على لقب الدوري الممتاز والتتويج', buildSquad('ars', 87, 'Bukayo Saka', 'بوكايو ساكا', 'RW')),
  createClub('mci', 'Manchester City', 'مانشستر سيتي', 'MCI', 'premier_league', 'Etihad Stadium', '#6CABDD', '#1C2C5B', 89, 91, 91, 88, 'Pep Guardiola', 'بيب غوارديولا', 'Spain', 'إسبانيا', '4-3-3', 'Possession Football', 140, 'التتويج بلقب الدوري الإنجليزي الممتاز والرباعية', buildSquad('mci', 89, 'Erling Haaland', 'إيرلينغ هالاند', 'ST')),
  createClub('liv', 'Liverpool FC', 'ليفربول', 'LIV', 'premier_league', 'Anfield', '#C8102E', '#00B2A9', 88, 89, 87, 88, 'Arne Slot', 'آرني سلوت', 'Netherlands', 'هولندا', '4-2-3-1', 'Fast Build-Up', 105, 'التتويج بلقب الدوري الممتاز والوصول لأبعد نقطة قارياً', buildSquad('liv', 88, 'Mohamed Salah', 'محمد صلاح', 'RW')),
  createClub('che', 'Chelsea FC', 'تشيلسي', 'CHE', 'premier_league', 'Stamford Bridge', '#034694', '#EE242C', 84, 85, 85, 83, 'Enzo Maresca', 'إنزو ماريسكا', 'Italy', 'إيطاليا', '4-2-3-1', 'Possession Football', 95, 'ضمان مقعد مؤهل لدوري أبطال أوروبا (المربع الذهبي)', buildSquad('che', 84, 'Cole Palmer', 'كول بالمر', 'CAM')),
  createClub('mun', 'Manchester United', 'مانشستر يونايتد', 'MUN', 'premier_league', 'Old Trafford', '#DA291C', '#FBE122', 84, 84, 84, 83, 'Ruben Amorim', 'روبن أموريم', 'Portugal', 'البرتغال', '3-4-3', 'High Intensity', 90, 'العودة للمربع الذهبي ومنافسة الكبار', buildSquad('mun', 84, 'Bruno Fernandes', 'برونو فيرنانديز', 'CAM')),
  createClub('tot', 'Tottenham Hotspur', 'توتنهام هوتسبير', 'TOT', 'premier_league', 'Tottenham Stadium', '#132257', '#FFFFFF', 83, 85, 83, 82, 'Ange Postecoglou', 'أنجي بوستيكوغلو', 'Australia', 'أستراليا', '4-3-3', 'High Press', 80, 'حجز مقعد أوروبي وتقديم كرة هجومية ممتعة', buildSquad('tot', 83, 'Son Heung-min', 'سون هيونغ مين', 'LW')),
  createClub('new', 'Newcastle United', 'نيوكاسل يونايتد', 'NEW', 'premier_league', "St James' Park", '#241F20', '#FFFFFF', 83, 84, 83, 83, 'Eddie Howe', 'إيدي هاو', 'England', 'إنجلترا', '4-3-3', 'Direct Football', 85, 'التأهل للبطولات الأوروبية وإنهاء الموسم في التوب 6', buildSquad('new', 83, 'Alexander Isak', 'ألكسندر إيزاك', 'ST')),
  createClub('avl', 'Aston Villa', 'أستون فيلا', 'AVL', 'premier_league', 'Villa Park', '#670E36', '#95BFE5', 83, 83, 84, 82, 'Unai Emery', 'أوناي إيمري', 'Spain', 'إسبانيا', '4-2-3-1', 'Counter Attack', 75, 'المنافسة على التوب 4 ومواصلة التألق القاري', buildSquad('avl', 83, 'Ollie Watkins', 'أولي واتكينز', 'ST')),
  createClub('bha', 'Brighton & Hove Albion', 'برايتون', 'BHA', 'premier_league', 'Amex Stadium', '#0057B8', '#FFFFFF', 81, 82, 81, 80, 'Fabian Hurzeler', 'فابيان هورزلر', 'Germany', 'ألمانيا', '4-2-3-1', 'Possession Football', 60, 'إنهاء الدوري في النصف الأول من الجدول (Top 8)', buildSquad('bha', 81, 'Kaoru Mitoma', 'كاورو ميتوما', 'LW')),
  createClub('whu', 'West Ham United', 'وست هام يونايتد', 'WHU', 'premier_league', 'London Stadium', '#7A263A', '#1BB1E7', 81, 82, 81, 80, 'Julen Lopetegui', 'خولين لوبيتيغي', 'Spain', 'إسبانيا', '4-2-3-1', 'Balanced', 65, 'القتال لحجز بطاقة مؤهلة لدوري المؤتمر الأوروبي', buildSquad('whu', 81, 'Jarrod Bowen', 'جارود بوين', 'RW')),
  createClub('ful', 'Fulham FC', 'فولهام', 'FUL', 'premier_league', 'Craven Cottage', '#000000', '#CC0000', 80, 80, 80, 79, 'Marco Silva', 'ماركو سيلفا', 'Portugal', 'البرتغال', '4-2-3-1', 'Wing Play', 50, 'الاستقرار في منتصف الترتيب وتفادي صراع الهبوط', buildSquad('ful', 80, 'Rodrigo Muniz', 'رودريغو مونيز', 'ST')),
  createClub('bre', 'Brentford FC', 'برينتفورد', 'BRE', 'premier_league', 'Gtech Community Stadium', '#E30613', '#000000', 79, 81, 78, 78, 'Thomas Frank', 'توماس فرانك', 'Denmark', 'الدنمارك', '3-5-2', 'Direct Football', 45, 'البقاء في الدوري الممتاز وجمع 40 نقطة مبكراً', buildSquad('bre', 79, 'Bryan Mbeumo', 'بريان مبيومو', 'RW')),
  createClub('bou', 'AFC Bournemouth', 'بورنموث', 'BOU', 'premier_league', 'Vitality Stadium', '#DA291C', '#000000', 79, 80, 79, 78, 'Andoni Iraola', 'أندوني إيراولا', 'Spain', 'إسبانيا', '4-2-3-1', 'High Press', 45, 'تأكيد الوجود بالبريميرليغ وتقديم عروض قوية أمام الكبار', buildSquad('bou', 79, 'Antoine Semenyo', 'أنطوان سيمنيو', 'RW')),
  createClub('cry', 'Crystal Palace', 'كريستال بالاس', 'CRY', 'premier_league', 'Selhurst Park', '#1B458F', '#C4122E', 79, 80, 79, 79, 'Oliver Glasner', 'أوليفر غلاسنر', 'Austria', 'النمسا', '3-4-2-1', 'Counter Attack', 45, 'الوصول لمنتصف الترتيب والابتعاد عن مراكز الخطر', buildSquad('cry', 79, 'Jean-Philippe Mateta', 'ماتيتا', 'ST')),
  createClub('nfo', 'Nottingham Forest', 'نوتينغهام فورست', 'NFO', 'premier_league', 'City Ground', '#DD0000', '#FFFFFF', 80, 80, 80, 79, 'Nuno Espirito Santo', 'نونو سانتو', 'Portugal', 'البرتغال', '4-2-3-1', 'Low Block', 45, 'المنافسة على مراكز وسط الجدول وتفادي شبح الهبوط', buildSquad('nfo', 80, 'Chris Wood', 'كريس وود', 'ST')),
  createClub('eve', 'Everton FC', 'إيفرتون', 'EVE', 'premier_league', 'Goodison Park', '#003399', '#FFFFFF', 78, 78, 78, 79, 'Sean Dyche', 'شون دايش', 'England', 'إنجلترا', '4-4-1-1', 'Low Block', 40, 'ضمان البقاء في الدوري الممتاز بدون معاناة الجولات الأخيرة', buildSquad('eve', 78, 'Dwight McNeil', 'دوايت ماكنيل', 'LM')),
  createClub('wol', 'Wolverhampton Wanderers', 'وولفرهامبتون', 'WOL', 'premier_league', 'Molineux Stadium', '#FDB913', '#231F20', 78, 79, 78, 78, 'Gary O\'Neil', 'غاري أونيل', 'England', 'إنجلترا', '3-4-2-1', 'Counter Attack', 40, 'البقاء في الدوري الإنجليزي الممتاز والوصول لمنتصف الجدول', buildSquad('wol', 78, 'Matheus Cunha', 'ماتيوس كونيا', 'ST')),
  createClub('lei', 'Leicester City', 'ليستر سيتي', 'LEI', 'premier_league', 'King Power Stadium', '#003090', '#FDBE11', 77, 78, 77, 77, 'Steve Cooper', 'ستيف كوبر', 'Wales', 'ويلز', '4-3-3', 'Counter Attack', 35, 'تثبيت الأقدام وتفادي الهبوط لدوري الدرجة الأولى', buildSquad('lei', 77, 'Jamie Vardy', 'جيمي فاردّي', 'ST')),
  createClub('ips', 'Ipswich Town', 'إبسويتش تاون', 'IPS', 'premier_league', 'Portman Road', '#004488', '#FFFFFF', 76, 76, 76, 76, 'Kieran McKenna', 'كيران ماكينا', 'Northern Ireland', 'أيرلندا الشمالية', '4-2-3-1', 'Fast Build-Up', 30, 'البقاء التاريخي بين أندية الصفوة في البريميرليغ', buildSquad('ips', 76, 'Liam Delap', 'ليام ديلاب', 'ST')),
  createClub('sou', 'Southampton FC', 'ساوثهامبتون', 'SOU', 'premier_league', "St Mary's Stadium", '#D71920', '#130C0E', 76, 76, 76, 75, 'Russell Martin', 'راسل مارتن', 'Scotland', 'اسكتلندا', '3-5-2', 'Possession Football', 30, 'القتال حتى الرمق الأخير لتفادي الهبوط والنجاة', buildSquad('sou', 76, 'Adam Armstrong', 'آدم أرمسترونغ', 'ST'))
];

// -----------------------------------------------------------------------------------
// 2. LA LIGA (20 CLUBS)
// -----------------------------------------------------------------------------------
export const LA_LIGA_TEAMS: CoachTeam[] = [
  createClub('rma', 'Real Madrid', 'ريال مدريد', 'RMA', 'la_liga', 'Santiago Bernabeu', '#FFFFFF', '#FEBE10', 89, 92, 90, 88, 'Carlo Ancelotti', 'كارلو أنشيلوتي', 'Italy', 'إيطاليا', '4-3-1-2', 'Counter Attack', 150, 'التتويج بلقب الدوري الإسباني ودوري أبطال أوروبا', buildSquad('rma', 89, 'Kylian Mbappe', 'كيليان مبابي', 'ST')),
  createClub('bar', 'FC Barcelona', 'برشلونة', 'BAR', 'la_liga', 'Camp Nou', '#004D98', '#A50044', 88, 90, 89, 87, 'Hansi Flick', 'هانزي فليك', 'Germany', 'ألمانيا', '4-2-3-1', 'High Press', 120, 'التتويج بلقب الليغا والكوبا دل ري والريادة الأوروبية', buildSquad('bar', 88, 'Lamine Yamal', 'لامين يامال', 'RW')),
  createClub('atm', 'Atletico Madrid', 'أتلتيكو مدريد', 'ATM', 'la_liga', 'Metropolitano', '#CB3524', '#272E61', 86, 86, 85, 87, 'Diego Simeone', 'دييغو سيميوني', 'Argentina', 'الأرجنتين', '5-3-2', 'Low Block', 90, 'كسر هيمنة القطبين والتتويج بالدوري الإسباني', buildSquad('atm', 86, 'Julian Alvarez', 'جوليان ألفاريز', 'ST')),
  createClub('ath', 'Athletic Club Bilbao', 'أتلتيك بيلباو', 'ATH', 'la_liga', 'San Mames', '#EE2524', '#FFFFFF', 83, 84, 82, 83, 'Ernesto Valverde', 'إرنستو فالفيردي', 'Spain', 'إسبانيا', '4-2-3-1', 'Direct Football', 60, 'التأهل لدوري أبطال أوروبا والمنافسة على الكأس', buildSquad('ath', 83, 'Nico Williams', 'نيكو ويليامز', 'LW')),
  createClub('rso', 'Real Sociedad', 'ريال سوسيداد', 'RSO', 'la_liga', 'Reale Arena', '#0067B1', '#FFFFFF', 82, 82, 83, 82, 'Imanol Alguacil', 'إيمانويل ألغواسيل', 'Spain', 'إسبانيا', '4-3-3', 'Balanced', 55, 'حجز مقعد أوروبي وإنهاء الموسم في التوب 6', buildSquad('rso', 82, 'Takefusa Kubo', 'تاكيفوسا كوبو', 'RW')),
  createClub('vil', 'Villarreal CF', 'فياريال', 'VIL', 'la_liga', 'Estadio de la Ceramica', '#FFE600', '#005CA9', 82, 83, 82, 81, 'Marcelino', 'مارسيلينو', 'Spain', 'إسبانيا', '4-4-2', 'Counter Attack', 55, 'التأهل للمسابقات الأوروبية ومقارعة الكبار', buildSquad('vil', 82, 'Ayoze Perez', 'أيوزي بيريز', 'ST')),
  createClub('bet', 'Real Betis', 'ريال بيتيس', 'BET', 'la_liga', 'Benito Villamarin', '#00954C', '#FFFFFF', 82, 82, 82, 81, 'Manuel Pellegrini', 'مانويل بيليغريني', 'Chile', 'تشيلي', '4-2-3-1', 'Possession Football', 50, 'المنافسة على مقعد دوري أبطال أوروبا والدوري الأوروبي', buildSquad('bet', 82, 'Isco Alarcon', 'إيسكو ألاركون', 'CAM')),
  createClub('gir', 'Girona FC', 'جيرونا', 'GIR', 'la_liga', 'Montilivi', '#CD1318', '#FFFFFF', 81, 82, 81, 80, 'Michel', 'ميتشيل', 'Spain', 'إسبانيا', '4-3-3', 'High Intensity', 50, 'تكرار المفاجأة وإنهاء الموسم في المراكز الأوروبية', buildSquad('gir', 81, 'Viktor Tsygankov', 'فيكتور تسيغانكوف', 'RW')),
  createClub('sev', 'Sevilla FC', 'إشبيلية', 'SEV', 'la_liga', 'Ramon Sanchez-Pizjuan', '#D4001F', '#FFFFFF', 80, 80, 81, 80, 'Garcia Pimienta', 'غارسيا بيميينتا', 'Spain', 'إسبانيا', '4-3-3', 'Wing Play', 45, 'إعادة الهيبة للنادي الأندلسي والعودة للنصف الأول', buildSquad('sev', 80, 'Dodi Lukebakio', 'دودي لوكيباكيو', 'RW')),
  createClub('val', 'Valencia CF', 'فالنسيا', 'VAL', 'la_liga', 'Mestalla', '#FFFFFF', '#000000', 79, 79, 79, 80, 'Ruben Baraja', 'روبين باراخا', 'Spain', 'إسبانيا', '4-4-2', 'Defensive Football', 40, 'إعادة بناء الفريق والابتعاد عن مناطق الخطورة', buildSquad('val', 79, 'Hugo Duro', 'هوغو دورو', 'ST')),
  createClub('osa', 'CA Osasuna', 'أوساسونا', 'OSA', 'la_liga', 'El Sadar', '#D01026', '#172744', 79, 80, 79, 79, 'Vicente Moreno', 'فيسنتي مورينو', 'Spain', 'إسبانيا', '4-3-3', 'High Press', 35, 'الاستقرار في منتصف الترتيب وجعل السادار حصناً منيعاً', buildSquad('osa', 79, 'Ante Budimir', 'أنتي بوديمير', 'ST')),
  createClub('cel', 'Celta Vigo', 'سلتا فيغو', 'CEL', 'la_liga', 'Balaidos', '#8AC3EE', '#C61E2E', 79, 80, 79, 78, 'Claudio Giraldez', 'كلاوديو خيرالديز', 'Spain', 'إسبانيا', '3-4-3', 'Fast Build-Up', 35, 'تقديم كرة قدم هجومية سريعة والبقاء المريح', buildSquad('cel', 79, 'Iago Aspas', 'ياغو أسباس', 'ST')),
  createClub('ray', 'Rayo Vallecano', 'رايو فاييكانو', 'RAY', 'la_liga', 'Vallecas', '#FFFFFF', '#E30613', 78, 78, 78, 78, 'Inigo Perez', 'إينيغو بيريز', 'Spain', 'إسبانيا', '4-2-3-1', 'Direct Football', 30, 'حسم البقاء بالليغا مبكراً وإزعاج أندية المقدمة', buildSquad('ray', 78, 'Jorge de Frutos', 'خورخي دي فروتوس', 'RW')),
  createClub('mll', 'RCD Mallorca', 'ريال مايوركا', 'MLL', 'la_liga', 'Son Moix', '#E20613', '#000000', 78, 78, 78, 79, 'Jagoba Arrasate', 'ياغوبا أراساتي', 'Spain', 'إسبانيا', '4-3-3', 'Low Block', 30, 'البقاء في الليغا والوصول إلى النصف الأول من الترتيب', buildSquad('mll', 78, 'Vedat Muriqi', 'فيدات موريكي', 'ST')),
  createClub('ala', 'Deportivo Alaves', 'ديبورتيفو ألافيس', 'ALA', 'la_liga', 'Mendizorroza', '#0055A5', '#FFFFFF', 77, 77, 77, 78, 'Luis Garcia Plaza', 'لويس غارسيا بلازا', 'Spain', 'إسبانيا', '4-2-3-1', 'Counter Attack', 25, 'ضمان النجاة وتجنب الهبوط لدوري الدرجة الثانية', buildSquad('ala', 77, 'Kike Garcia', 'كيكي غارسيا', 'ST')),
  createClub('get', 'Getafe CF', 'خيتافي', 'GET', 'la_liga', 'Coliseum', '#0055A5', '#FFFFFF', 78, 76, 78, 80, 'Jose Bordalas', 'خوسيه بوردالاس', 'Spain', 'إسبانيا', '4-4-2', 'Defensive Football', 25, 'التنظيم الدفاعي الصارم والبقاء بين أندية الأضواء', buildSquad('get', 78, 'Borja Mayoral', 'بورخا مايورال', 'ST')),
  createClub('lpa', 'UD Las Palmas', 'لاس بالماس', 'LPA', 'la_liga', 'Gran Canaria', '#FFE900', '#004899', 77, 77, 77, 76, 'Diego Martinez', 'دييغو مارتينيز', 'Spain', 'إسبانيا', '4-3-3', 'Possession Football', 25, 'النجاة من صراع القاع وتأمين البقاء', buildSquad('lpa', 77, 'Sandro Ramirez', 'ساندرو راميريز', 'ST')),
  createClub('esp', 'RCD Espanyol', 'إسبانيول', 'ESP', 'la_liga', 'RCDE Stadium', '#007FC8', '#FFFFFF', 76, 76, 76, 76, 'Manolo Gonzalez', 'مانولو غونزاليس', 'Spain', 'إسبانيا', '4-4-2', 'Counter Attack', 25, 'تثبيت الأقدام في الليغا وعدم العودة للسيغوندا', buildSquad('esp', 76, 'Javi Puado', 'خافي بوادو', 'ST')),
  createClub('leg', 'CD Leganes', 'ليغانيس', 'LEG', 'la_liga', 'Butarque', '#0055A5', '#FFFFFF', 75, 75, 75, 76, 'Borja Jimenez', 'بورخا خيمينيز', 'Spain', 'إسبانيا', '4-2-3-1', 'Low Block', 20, 'القتال للبقاء وجمع النقاط أمام المنافسين المباشرين', buildSquad('leg', 75, 'Juan Cruz', 'خوان كروز', 'RW')),
  createClub('vld', 'Real Valladolid', 'ريال بلد الوليد', 'VLD', 'la_liga', 'Jose Zorrilla', '#5B2C84', '#FFFFFF', 75, 75, 75, 75, 'Paulo Pezzolano', 'باولو بيزولانو', 'Uruguay', 'أوروغواي', '4-3-3', 'Balanced', 20, 'النجاة من فخ الهبوط وتجنب العودة لدوري الدرجة الثانية', buildSquad('vld', 75, 'Raul Moro', 'راؤول مورو', 'LW'))
];

// -----------------------------------------------------------------------------------
// 3. BUNDESLIGA (18 CLUBS)
// -----------------------------------------------------------------------------------
export const BUNDESLIGA_TEAMS: CoachTeam[] = [
  createClub('bay', 'Bayern Munich', 'بايرن ميونخ', 'BAY', 'bundesliga', 'Allianz Arena', '#DC052D', '#0066B2', 89, 92, 89, 87, 'Vincent Kompany', 'فينسنت كومباني', 'Belgium', 'بلجيكا', '4-2-3-1', 'High Press', 130, 'استعادة لقب البوندسليغا والتتويج بالثلاثية التاريخية', buildSquad('bay', 89, 'Harry Kane', 'هاري كين', 'ST')),
  createClub('b04', 'Bayer Leverkusen', 'باير ليفركوزن', 'B04', 'bundesliga', 'BayArena', '#E32221', '#000000', 87, 87, 88, 86, 'Xabi Alonso', 'تشابي ألونسو', 'Spain', 'إسبانيا', '3-4-3', 'Possession Football', 90, 'الحفاظ على درع الدوري والمنافسة على الألقاب', buildSquad('b04', 87, 'Florian Wirtz', 'فلوريان فيرتز', 'CAM')),
  createClub('bvb', 'Borussia Dortmund', 'بوروسيا دورتموند', 'BVB', 'bundesliga', 'Signal Iduna Park', '#FDE100', '#000000', 85, 86, 85, 84, 'Nuri Sahin', 'نوري شاهين', 'Turkey', 'تركيا', '4-2-3-1', 'Fast Build-Up', 85, 'المنافسة المباشرة على اللقب وتأمين بطاقة دوري الأبطال', buildSquad('bvb', 85, 'Serhou Guirassy', 'سيرهو غيراسي', 'ST')),
  createClub('rbl', 'RB Leipzig', 'آر بي لايبزيغ', 'RBL', 'bundesliga', 'Red Bull Arena', '#DA291C', '#001D4A', 84, 85, 84, 84, 'Marco Rose', 'ماركو روزه', 'Germany', 'ألمانيا', '4-2-2-2', 'High Press', 75, 'إنهاء الموسم في التوب 4 ومواصلة الإشعاع القاري', buildSquad('rbl', 84, 'Benjamin Sesko', 'بينجامين سيسكو', 'ST')),
  createClub('vfb', 'VfB Stuttgart', 'شتوتغارت', 'VFB', 'bundesliga', 'MHPArena', '#E32219', '#FFFFFF', 83, 84, 83, 82, 'Sebastian Hoeness', 'سيباستيان هونيس', 'Germany', 'ألمانيا', '4-4-2', 'Wing Play', 60, 'تأكيد الوجود بين كبار ألمانيا والتأهل لأوروبا', buildSquad('vfb', 83, 'Deniz Undav', 'دينيز أونداف', 'ST')),
  createClub('sge', 'Eintracht Frankfurt', 'آينتراخت فرانكفورت', 'SGE', 'bundesliga', 'Deutsche Bank Park', '#E1000F', '#000000', 83, 85, 82, 81, 'Dino Toppmoller', 'دينو توبمولر', 'Germany', 'ألمانيا', '3-4-3', 'Counter Attack', 60, 'التأهل لدوري أبطال أوروبا وتقديم كرة هجومية كاسحة', buildSquad('sge', 83, 'Omar Marmoush', 'عمر مرموش', 'ST')),
  createClub('scf', 'SC Freiburg', 'فرايبورغ', 'SCF', 'bundesliga', 'Europa-Park Stadion', '#000000', '#FFFFFF', 80, 80, 80, 81, 'Julian Schuster', 'يوليان شوستر', 'Germany', 'ألمانيا', '4-2-3-1', 'Balanced', 45, 'المنافسة على بطاقات الدوري الأوروبي ودوري المؤتمر', buildSquad('scf', 80, 'Vincenzo Grifo', 'فينتشينزو غريفو', 'LW')),
  createClub('wob', 'VfL Wolfsburg', 'فولفسبورغ', 'WOB', 'bundesliga', 'Volkswagen Arena', '#65B32E', '#FFFFFF', 80, 81, 80, 79, 'Ralph Hasenhuttl', 'رالف هازنهوتل', 'Austria', 'النمسا', '4-2-3-1', 'Direct Football', 45, 'العودة للمسابقات الأوروبية وإنهاء الموسم في التوب 7', buildSquad('wob', 80, 'Jonas Wind', 'يوناس فيند', 'ST')),
  createClub('bmg', 'Borussia Monchengladbach', 'مونشنغلادباخ', 'BMG', 'bundesliga', 'Borussia-Park', '#000000', '#009933', 79, 80, 79, 79, 'Gerardo Seoane', 'جيراردو سيواني', 'Switzerland', 'سويسرا', '4-2-3-1', 'Balanced', 40, 'العودة إلى النصف العلوي من جدول ترتيب البوندسليغا', buildSquad('bmg', 79, 'Tim Kleindienst', 'تيم كلايندينست', 'ST')),
  createClub('svw', 'SV Werder Bremen', 'فيردر بريمن', 'SVW', 'bundesliga', 'Weserstadion', '#1F8244', '#FFFFFF', 79, 79, 79, 79, 'Ole Werner', 'أولي فيرنر', 'Germany', 'ألمانيا', '3-5-2', 'Fast Build-Up', 40, 'الاستقرار في منتصف الترتيب ومفاجأة الكبار على أرضنا', buildSquad('svw', 79, 'Marvin Ducksch', 'مارفين دوكش', 'ST')),
  createClub('m05', '1. FSV Mainz 05', 'ماينز 05', 'M05', 'bundesliga', 'Mewa Arena', '#ED1C24', '#FFFFFF', 78, 79, 78, 78, 'Bo Henriksen', 'بو هنريكسن', 'Denmark', 'الدنمارك', '3-4-2-1', 'High Intensity', 35, 'الحفاظ على الروح القتالية وتجنب صراع الهبوط مبكراً', buildSquad('m05', 78, 'Jonathan Burkardt', 'يوناتان بوركاردت', 'ST')),
  createClub('fcu', '1. FC Union Berlin', 'يونيون برلين', 'FCU', 'bundesliga', 'An der Alten Forsterei', '#EB1923', '#FFEE00', 78, 77, 78, 80, 'Bo Svensson', 'بو سفينسون', 'Denmark', 'الدنمارك', '3-5-2', 'Low Block', 35, 'استعادة الصلابة الدفاعية والتواجد في وسط الجدول', buildSquad('fcu', 78, 'Danilho Doekhi', 'دانيلو دوخي', 'CB')),
  createClub('fca', 'FC Augsburg', 'أوغسبورغ', 'FCA', 'bundesliga', 'WWK Arena', '#BA3733', '#005934', 78, 78, 77, 78, 'Jess Thorup', 'جيس ثوروب', 'Denmark', 'الدنمارك', '3-4-2-1', 'Counter Attack', 35, 'البقاء المريح في البوندسليغا وتفادي الضغوط', buildSquad('fca', 78, 'Phillip Tietz', 'فيليب تيتز', 'ST')),
  createClub('hdh', '1. FC Heidenheim', 'هايدنهايم', 'HDH', 'bundesliga', 'Voith-Arena', '#003366', '#CC0000', 78, 78, 78, 77, 'Frank Schmidt', 'فرانك شميدت', 'Germany', 'ألمانيا', '4-1-4-1', 'Direct Football', 30, 'مواصلة قصة النجاح الخيالية والبقاء مع النخبة', buildSquad('hdh', 78, 'Paul Wanner', 'بول فانر', 'CAM')),
  createClub('tsg', 'TSG Hoffenheim', 'هوفنهايم', 'TSG', 'bundesliga', 'PreZero Arena', '#0055A5', '#FFFFFF', 78, 80, 78, 77, 'Christian Ilzer', 'كريستيان إيلزر', 'Austria', 'النمسا', '3-4-1-2', 'Wing Play', 35, 'تأمين البقاء والعودة للمنافسة على مراكز الوسط', buildSquad('tsg', 78, 'Andrej Kramaric', 'أندري كراماريتش', 'ST')),
  createClub('stp', 'FC St. Pauli', 'سانت باولي', 'STP', 'bundesliga', 'Millerntor-Stadion', '#5C4033', '#FFFFFF', 76, 76, 76, 76, 'Alexander Blessin', 'ألكسندر بليسين', 'Germany', 'ألمانيا', '3-5-2', 'High Intensity', 25, 'تثبيت الأقدام في البوندسليغا وتفادي الهبوط الفوري', buildSquad('stp', 76, 'Johannes Eggestein', 'إيغيشتاين', 'ST')),
  createClub('boc', 'VfL Bochum', 'بوخوم', 'BOC', 'bundesliga', 'Vonovia Ruhrstadion', '#005CA9', '#FFFFFF', 75, 75, 75, 76, 'Dieter Hecking', 'ديتر هيكينغ', 'Germany', 'ألمانيا', '4-4-2', 'Defensive Football', 20, 'القتال في كل مباراة للبقاء وتفادي شبح الهبوط', buildSquad('boc', 75, 'Philipp Hofmann', 'فيليب هوفمان', 'ST')),
  createClub('ksv', 'Holstein Kiel', 'هولشتاين كيل', 'KSV', 'bundesliga', 'Holstein-Stadion', '#0055A5', '#ED1C24', 75, 75, 75, 75, 'Marcel Rapp', 'مارسيل راب', 'Germany', 'ألمانيا', '3-5-2', 'Counter Attack', 20, 'المعافرة التاريخية في أول مواسم النادي بالبوندسليغا', buildSquad('ksv', 75, 'Shuto Machino', 'شوتو ماتشينو', 'ST'))
];

// -----------------------------------------------------------------------------------
// 4. SERIE A (20 CLUBS)
// -----------------------------------------------------------------------------------
export const SERIE_A_TEAMS: CoachTeam[] = [
  createClub('int', 'Inter Milan', 'إنتر ميلان', 'INT', 'serie_a', 'San Siro', '#001E62', '#000000', 88, 90, 89, 88, 'Simone Inzaghi', 'سيموني إنزاغي', 'Italy', 'إيطاليا', '3-5-2', 'Possession Football', 110, 'التتويج بلقب السكوديتو والوصول لنهائي دوري أبطال أوروبا', buildSquad('int', 88, 'Lautaro Martinez', 'لاوتارو مارتينيز', 'ST')),
  createClub('nap', 'SSC Napoli', 'نابولي', 'NAP', 'serie_a', 'Diego Armando Maradona', '#0080C8', '#FFFFFF', 86, 87, 86, 86, 'Antonio Conte', 'أنطونيو كونتي', 'Italy', 'إيطاليا', '3-4-2-1', 'High Intensity', 90, 'استعادة لقب الدوري الإيطالي مع كونتي', buildSquad('nap', 86, 'Khvicha Kvaratskhelia', 'خفيتشا كفاراتسخيليا', 'LW')),
  createClub('juv', 'Juventus FC', 'يوفنتوس', 'JUV', 'serie_a', 'Allianz Stadium', '#000000', '#FFFFFF', 85, 86, 85, 86, 'Thiago Motta', 'تياغو موتا', 'Italy', 'إيطاليا', '4-2-3-1', 'Possession Football', 95, 'إعادة البيانكونيري لقمة إيطاليا والمنافسة على اللقب', buildSquad('juv', 85, 'Dusan Vlahovic', 'دوشان فلاهوفيتش', 'ST')),
  createClub('ata', 'Atalanta BC', 'أتالانتا', 'ATA', 'serie_a', 'Gewiss Stadium', '#005CA9', '#000000', 85, 87, 84, 84, 'Gian Piero Gasperini', 'جيان بييرو غاسبيريني', 'Italy', 'إيطاليا', '3-4-1-2', 'High Press', 75, 'المنافسة على اللقب وضمان مقعد دوري الأبطال', buildSquad('ata', 85, 'Ademola Lookman', 'أديمولا لوكمان', 'LW')),
  createClub('mil', 'AC Milan', 'إيه سي ميلان', 'MIL', 'serie_a', 'San Siro', '#AC1224', '#000000', 85, 86, 85, 84, 'Paulo Fonseca', 'باولو فونسيكا', 'Portugal', 'البرتغال', '4-2-3-1', 'Wing Play', 85, 'المنافسة على لقب الدوري الإيطالي والذهاب بعيداً أوروبياً', buildSquad('mil', 85, 'Rafael Leao', 'رافائيل لياو', 'LW')),
  createClub('laz', 'SS Lazio', 'لاتسيو', 'LAZ', 'serie_a', 'Stadio Olimpico', '#87CEEB', '#FFFFFF', 83, 84, 83, 82, 'Marco Baroni', 'ماركو باروني', 'Italy', 'إيطاليا', '4-2-3-1', 'Fast Build-Up', 60, 'التأهل لدوري أبطال أوروبا وإنهاء الموسم في التوب 4', buildSquad('laz', 83, 'Taty Castellanos', 'تاتي كاستيانوس', 'ST')),
  createClub('rom', 'AS Roma', 'روما', 'ROM', 'serie_a', 'Stadio Olimpico', '#8E1F2F', '#F0BC42', 83, 84, 83, 82, 'Claudio Ranieri', 'كلاوديو رانييري', 'Italy', 'إيطاليا', '3-5-2', 'Counter Attack', 65, 'العودة لسباق دوري الأبطال وحصد لقب الكأس', buildSquad('rom', 83, 'Artem Dovbyk', 'أرتيم دوفبيك', 'ST')),
  createClub('fio', 'ACF Fiorentina', 'فيورنتينا', 'FIO', 'serie_a', 'Artemio Franchi', '#4F2683', '#FFFFFF', 82, 83, 82, 81, 'Raffaele Palladino', 'رافاييلي بالادينو', 'Italy', 'إيطاليا', '4-2-3-1', 'Wing Play', 55, 'التأهل للمسابقات الأوروبية والمنافسة على الألقاب', buildSquad('fio', 82, 'Moise Kean', 'مويس كين', 'ST')),
  createClub('bol', 'Bologna FC', 'بولونيا', 'BOL', 'serie_a', 'Renato Dall\'Ara', '#1A2B4C', '#A81E2F', 81, 81, 82, 81, 'Vincenzo Italiano', 'فينتشينزو إيتاليانو', 'Italy', 'إيطاليا', '4-2-3-1', 'High Press', 50, 'المحافظة على المكتسبات وإنهاء الموسم في التوب 7', buildSquad('bol', 81, 'Riccardo Orsolini', 'ريكاردو أورسوليني', 'RW')),
  createClub('tor', 'Torino FC', 'تورينو', 'TOR', 'serie_a', 'Stadio Olimpico Grande Torino', '#8B0000', '#FFFFFF', 80, 80, 80, 80, 'Paolo Vanoli', 'باولو فانولي', 'Italy', 'إيطاليا', '3-5-2', 'Low Block', 40, 'حجز مقعد مؤهل لدوري المؤتمر الأوروبي', buildSquad('tor', 80, 'Duvan Zapata', 'دوفان زاباتا', 'ST')),
  createClub('udi', 'Udinese Calcio', 'أودينيزي', 'UDI', 'serie_a', 'Bluenergy Stadium', '#000000', '#FFFFFF', 79, 80, 79, 79, 'Kosta Runjaic', 'كوستا رونيايتش', 'Germany', 'ألمانيا', '3-5-2', 'Direct Football', 35, 'الاستقرار في منتصف الترتيب وتفادي سيناريوهات القاع', buildSquad('udi', 79, 'Lorenzo Lucca', 'لورينزو لوكا', 'ST')),
  createClub('emp', 'Empoli FC', 'إمبولي', 'EMP', 'serie_a', 'Carlo Castellani', '#0055A5', '#FFFFFF', 78, 77, 78, 79, 'Roberto D\'Aversa', 'روبرتو دافيرسا', 'Italy', 'إيطاليا', '3-5-2', 'Defensive Football', 30, 'الصلابة الدفاعية وحسم البقاء في السيري آ مبكراً', buildSquad('emp', 78, 'Sebastiano Esposito', 'سيباستيانو إسبوزيتو', 'ST')),
  createClub('par', 'Parma Calcio', 'بارما', 'PAR', 'serie_a', 'Ennio Tardini', '#FFCC00', '#003366', 78, 79, 78, 77, 'Fabio Pecchia', 'فابيو بيكيا', 'Italy', 'إيطاليا', '4-2-3-1', 'Fast Build-Up', 35, 'تثبيت الأقدام في السيري آ وتقديم كرة هجومية جريئة', buildSquad('par', 78, 'Dennis Man', 'دينيس مان', 'RW')),
  createClub('com', 'Como 1907', 'كومو', 'COM', 'serie_a', 'Giuseppe Sinigaglia', '#0047AB', '#FFFFFF', 79, 80, 79, 78, 'Cesc Fabregas', 'سيسك فابريغاس', 'Spain', 'إسبانيا', '4-2-3-1', 'Possession Football', 45, 'مشروع طموح للتواجد في النصف الأول من الجدول', buildSquad('com', 79, 'Nico Paz', 'نيكو باز', 'CAM')),
  createClub('ver', 'Hellas Verona', 'هيلاس فيرونا', 'VER', 'serie_a', 'Marcantonio Bentegodi', '#002B49', '#FFD100', 77, 77, 77, 78, 'Paolo Zanetti', 'باولو زانيتي', 'Italy', 'إيطاليا', '4-2-3-1', 'Counter Attack', 25, 'البقاء في الدوري وتجنب فخ الهبوط', buildSquad('ver', 77, 'Casper Tengstedt', 'كاسبر تينغستيدت', 'ST')),
  createClub('cag', 'Cagliari Calcio', 'كالياري', 'CAG', 'serie_a', 'Unipol Domus', '#990000', '#002B49', 77, 77, 77, 77, 'Davide Nicola', 'دافيدي نيكولا', 'Italy', 'إيطاليا', '4-2-3-1', 'Direct Football', 25, 'القتال للبقاء وجعل ملعب سردينيا حصناً صعباً', buildSquad('cag', 77, 'Roberto Piccoli', 'روبرتو بيكولي', 'ST')),
  createClub('gen', 'Genoa CFC', 'جنوى', 'GEN', 'serie_a', 'Luigi Ferraris', '#990000', '#002B49', 77, 77, 77, 78, 'Patrick Vieira', 'باتريك فييرا', 'France', 'فرنسا', '3-5-2', 'Balanced', 30, 'استعادة التوازن وتأمين البقاء المريح', buildSquad('gen', 77, 'Andrea Pinamonti', 'أندريا بينامونتي', 'ST')),
  createClub('lec', 'US Lecce', 'ليتشي', 'LEC', 'serie_a', 'Via del Mare', '#FFD700', '#CC0000', 76, 76, 76, 77, 'Marco Giampaolo', 'ماركو جيامباولو', 'Italy', 'إيطاليا', '4-3-3', 'Defensive Football', 20, 'النجاة من صراع الهبوط وتفادي السقوط للسيري بي', buildSquad('lec', 76, 'Nikola Krstovic', 'نيكولا كرستوفيتش', 'ST')),
  createClub('mon', 'AC Monza', 'مونزا', 'MON', 'serie_a', 'Brianteo', '#E30613', '#FFFFFF', 76, 76, 76, 77, 'Alessandro Nesta', 'أليساندرو نيستا', 'Italy', 'إيطاليا', '3-4-2-1', 'Low Block', 25, 'القتال في كل جولة لضمان البقاء في الأضواء', buildSquad('mon', 76, 'Daniel Maldini', 'دانييل مالديني', 'CAM')),
  createClub('ven', 'Venezia FC', 'فينيزيا', 'VEN', 'serie_a', 'Pier Luigi Penzo', '#000000', '#FF8C00', 75, 75, 75, 75, 'Eusebio Di Francesco', 'أوزيبيو دي فرانشيسكو', 'Italy', 'إيطاليا', '3-4-2-1', 'Counter Attack', 20, 'تحدي الصعاب وتفادي الهبوط والعودة للسيري بي', buildSquad('ven', 75, 'Joel Pohjanpalo', 'جويل بوهيانبالو', 'ST'))
];

// -----------------------------------------------------------------------------------
// 5. LIGUE 1 (18 CLUBS)
// -----------------------------------------------------------------------------------
export const LIGUE_1_TEAMS: CoachTeam[] = [
  createClub('psg', 'Paris Saint-Germain', 'باريس سان جيرمان', 'PSG', 'ligue_1', 'Parc des Princes', '#004170', '#DA291C', 88, 90, 88, 87, 'Luis Enrique', 'لويس إنريكي', 'Spain', 'إسبانيا', '4-3-3', 'Possession Football', 160, 'التتويج بالدوري الفرنسي وتحقيق الحلم الأوروبي (دوري الأبطال)', buildSquad('psg', 88, 'Ousmane Dembele', 'عثمان ديمبيلي', 'RW')),
  createClub('asm', 'AS Monaco', 'موناكو', 'ASM', 'ligue_1', 'Stade Louis II', '#E51B24', '#FFFFFF', 84, 85, 84, 83, 'Adi Hutter', 'أدي هوتر', 'Austria', 'النمسا', '4-2-3-1', 'High Intensity', 75, 'منافسة باريس على اللقب والتأهل المباشر لدوري الأبطال', buildSquad('asm', 84, 'Maghnes Akliouche', 'مغنيس أكليوش', 'CAM')),
  createClub('om', 'Olympique de Marseille', 'أولمبيك مارسيليا', 'OM', 'ligue_1', 'Stade Velodrome', '#00A3E0', '#FFFFFF', 84, 85, 84, 83, 'Roberto De Zerbi', 'روبرتو دي زيربي', 'Italy', 'إيطاليا', '4-2-3-1', 'Possession Football', 80, 'إشعال المنافسة على اللقب والعودة لقمة الكرة الفرنسية', buildSquad('om', 84, 'Mason Greenwood', 'ميسون غرينوود', 'RW')),
  createClub('los', 'Lille OSC', 'ليل', 'LOSC', 'ligue_1', 'Decathlon Arena', '#E30613', '#002B49', 83, 84, 83, 82, 'Bruno Genesio', 'برونو جينيسيو', 'France', 'فرنسا', '4-2-3-1', 'Fast Build-Up', 60, 'إنهاء الموسم في التوب 3 ومواصلة الإنجازات الأوروبية', buildSquad('los', 83, 'Jonathan David', 'جوناثان ديفيد', 'ST')),
  createClub('ol', 'Olympique Lyonnais', 'أولمبيك ليون', 'OL', 'ligue_1', 'Groupama Stadium', '#002B49', '#DA291C', 82, 83, 83, 81, 'Pierre Sage', 'بيير ساج', 'France', 'فرنسا', '4-3-3', 'Wing Play', 60, 'العودة لمنصة التتويج والمنافسة على المقاعد الأوروبية', buildSquad('ol', 82, 'Alexandre Lacazette', 'ألكسندر لاكازيت', 'ST')),
  createClub('ogc', 'OGC Nice', 'نيس', 'OGCN', 'ligue_1', 'Allianz Riviera', '#000000', '#DA291C', 82, 82, 82, 82, 'Franck Haise', 'فرانك هايس', 'France', 'فرنسا', '3-4-2-1', 'Counter Attack', 55, 'حجز مقعد مؤهل لدوري أبطال أوروبا أو الدوري الأوروبي', buildSquad('ogc', 82, 'Evann Guessand', 'إيفان غيساند', 'ST')),
  createClub('rcl', 'RC Lens', 'لانس', 'RCL', 'ligue_1', 'Stade Bollaert-Delelis', '#ED1C24', '#FFE800', 81, 81, 82, 82, 'Will Still', 'ويل ستيل', 'Belgium', 'بلجيكا', '3-4-1-2', 'High Press', 50, 'المنافسة على المراكز الأوروبية وسط جماهيرنا العريضة', buildSquad('rcl', 81, 'Florian Sotoca', 'فلوريان سوتوكا', 'ST')),
  createClub('sbr', 'Stade Brestois 29', 'ستاد بريست', 'BRE', 'ligue_1', 'Stade Francis-Le Ble', '#ED1C24', '#FFFFFF', 81, 81, 81, 81, 'Eric Roy', 'إريك روي', 'France', 'فرنسا', '4-3-3', 'Direct Football', 45, 'تأكيد جدارة التواجد الأوروبي وإنهاء الموسم في التوب 6', buildSquad('sbr', 81, 'Ludovic Ajorque', 'لودوفيك أجورك', 'ST')),
  createClub('sre', 'Stade de Reims', 'ستاد ريمس', 'SDR', 'ligue_1', 'Auguste-Delaune', '#DA291C', '#FFFFFF', 79, 80, 79, 79, 'Luka Elsner', 'لوكا إلسنر', 'Slovenia', 'سلوفينيا', '4-2-3-1', 'Fast Build-Up', 40, 'التواجد في النصف الأول من الترتيب وإزعاج الكبار', buildSquad('sre', 79, 'Keito Nakamura', 'كيتو ناكامورا', 'LW')),
  createClub('srf', 'Stade Rennais', 'رين', 'SRFC', 'ligue_1', 'Roazhon Park', '#DA291C', '#000000', 80, 80, 81, 79, 'Jorge Sampaoli', 'خورخي سامباولي', 'Argentina', 'الأرجنتين', '4-3-3', 'High Intensity', 50, 'استعادة المكانة الأوروبية وتصحيح المسار', buildSquad('srf', 80, 'Ludovic Blas', 'لودوفيك بلاس', 'RW')),
  createClub('str', 'RC Strasbourg', 'ستراسبورغ', 'RCSA', 'ligue_1', 'La Meinau', '#009EE0', '#FFFFFF', 79, 80, 79, 78, 'Liam Rosenior', 'ليام روزينيور', 'England', 'إنجلترا', '4-2-3-1', 'Possession Football', 45, 'تطوير المواهب الشابة والابتعاد عن صراع الهبوط', buildSquad('str', 79, 'Andrey Santos', 'أندريه سانتوس', 'CM')),
  createClub('tfc', 'Toulouse FC', 'تولوز', 'TFC', 'ligue_1', 'Stadium de Toulouse', '#4E2C7E', '#FFFFFF', 78, 78, 79, 78, 'Carles Martinez Novell', 'كارليس مارتينيز', 'Spain', 'إسبانيا', '3-4-2-1', 'Balanced', 35, 'الاستقرار في منتصف الترتيب والمنافسة على الكأس', buildSquad('tfc', 78, 'Zakaria Aboukhlal', 'زكريا أبوخلال', 'RW')),
  createClub('aux', 'AJ Auxerre', 'أوكسير', 'AUX', 'ligue_1', 'Abbe-Deschamps', '#002F6C', '#FFFFFF', 77, 78, 77, 77, 'Christophe Pelissier', 'كريستوف بيليسييه', 'France', 'فرنسا', '3-4-2-1', 'Direct Football', 30, 'ضمان البقاء في الليغ 1 ومواصلة العروض القوية', buildSquad('aux', 77, 'Gaetan Perrin', 'غايتان بيران', 'CAM')),
  createClub('fcn', 'FC Nantes', 'نانت', 'FCN', 'ligue_1', 'La Beaujoire', '#FFE900', '#009E60', 77, 77, 77, 78, 'Antoine Kombouare', 'أنطوان كومباريه', 'France', 'فرنسا', '4-2-3-1', 'Defensive Football', 30, 'تجنب الدخول في معمعة الهبوط والبقاء المريح', buildSquad('fcn', 77, 'Moses Simon', 'موسيس سيمون', 'LW')),
  createClub('ang', 'Angers SCO', 'أنجيه', 'ANG', 'ligue_1', 'Raymond Kopa', '#000000', '#FFFFFF', 76, 76, 76, 76, 'Alexandre Dujeux', 'ألكسندر دوجو', 'France', 'فرنسا', '4-2-3-1', 'Counter Attack', 25, 'القتال في كل أسبوع لتأمين النجاة والبقاء', buildSquad('ang', 76, 'Himad Abdelli', 'حيماد عبد اللي', 'CAM')),
  createClub('hac', 'Le Havre AC', 'لوهافر', 'HAC', 'ligue_1', 'Stade Oceane', '#002B49', '#87CEEB', 75, 75, 75, 76, 'Didier Digard', 'ديدييه ديغارد', 'France', 'فرنسا', '3-5-2', 'Low Block', 20, 'التمسك بالبقاء في دوري الأضواء وتجنب الهبوط', buildSquad('hac', 75, 'Yassine Kechta', 'ياسين قشطة', 'CM')),
  createClub('ass', 'AS Saint-Etienne', 'سانت إتيان', 'ASSE', 'ligue_1', 'Geoffroy-Guichard', '#006C35', '#FFFFFF', 75, 75, 75, 75, 'Olivier Dall\'Oglio', 'أوليفييه دالوليو', 'France', 'فرنسا', '4-3-3', 'Direct Football', 25, 'تثبيت الأقدام وتفادي العودة للدرجة الثانية', buildSquad('ass', 75, 'Zuriko Davitashvili', 'زوريكو دافيتاشفيلي', 'LW')),
  createClub('mhs', 'Montpellier HSC', 'مونبلييه', 'MHSC', 'ligue_1', 'Stade de la Mosson', '#002B49', '#E35205', 75, 76, 75, 74, 'Jean-Louis Gasset', 'جان لويس غاسيه', 'France', 'فرنسا', '4-2-3-1', 'Counter Attack', 20, 'إنقاذ الموسم والهروب من قاع الترتيب للبقاء', buildSquad('mhs', 75, 'Akor Adams', 'أكور أدامز', 'ST'))
];

// -----------------------------------------------------------------------------------
// 5 COMPLETE LEAGUES EXPORT
// -----------------------------------------------------------------------------------
export const ALL_DOMESTIC_LEAGUES: CoachLeague[] = [
  {
    id: 'premier_league',
    name: 'English Premier League',
    nameAr: 'الدوري الإنجليزي الممتاز (Premier League)',
    country: 'England',
    countryAr: 'إنجلترا',
    logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&auto=format&fit=crop&q=80',
    reputation: 5,
    teams: PREMIER_LEAGUE_TEAMS,
    descriptionAr: '20 نادي ومنافسة نار.'
  },
  {
    id: 'la_liga',
    name: 'Spanish La Liga',
    nameAr: 'الدوري الإسباني (La Liga EA Sports)',
    country: 'Spain',
    countryAr: 'إسبانيا',
    logoUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80',
    reputation: 5,
    teams: LA_LIGA_TEAMS,
    descriptionAr: '20 نادي وكلاسيكو نار.'
  },
  {
    id: 'bundesliga',
    name: 'German Bundesliga',
    nameAr: 'الدوري الألماني (Bundesliga)',
    country: 'Germany',
    countryAr: 'ألمانيا',
    logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=1200&auto=format&fit=crop&q=80',
    reputation: 5,
    teams: BUNDESLIGA_TEAMS,
    descriptionAr: '18 نادي وكورة سريعة.'
  },
  {
    id: 'serie_a',
    name: 'Italian Serie A',
    nameAr: 'الدوري الإيطالي (Serie A Enilive)',
    country: 'Italy',
    countryAr: 'إيطاليا',
    logoUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&auto=format&fit=crop&q=80',
    reputation: 5,
    teams: SERIE_A_TEAMS,
    descriptionAr: '20 نادي وتكتيك نار.'
  },
  {
    id: 'ligue_1',
    name: 'French Ligue 1',
    nameAr: 'الدوري الفرنسي (Ligue 1 McDonald\'s)',
    country: 'France',
    countryAr: 'فرنسا',
    logoUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80',
    reputation: 4,
    teams: LIGUE_1_TEAMS,
    descriptionAr: '18 نادي ومواهب كتير.'
  }
];
