// ============================================================
// أنت المدرب | Complete Tournaments Database
// UEFA Champions League 2026/27 (36 Teams - League Phase)
// FIFA World Cup 2026 (48 Teams - 12 Groups)
// Africa Cup of Nations Morocco 2025 (24 Teams - 6 Groups)
// ============================================================

import { CoachTournament, CoachTeam } from '../types/coachGameTypes';
import {
  createClub,
  buildSquad,
  PREMIER_LEAGUE_TEAMS,
  LA_LIGA_TEAMS,
  BUNDESLIGA_TEAMS,
  SERIE_A_TEAMS,
  LIGUE_1_TEAMS
} from './coachClubsData';

// Helper to grab existing club or create extra European club
function getClubOrMake(
  id: string,
  name: string,
  nameAr: string,
  shortName: string,
  country: string,
  rating: number,
  starName: string,
  starNameAr: string,
  managerName: string,
  managerNameAr: string
): CoachTeam {
  const allExisting = [
    ...PREMIER_LEAGUE_TEAMS,
    ...LA_LIGA_TEAMS,
    ...BUNDESLIGA_TEAMS,
    ...SERIE_A_TEAMS,
    ...LIGUE_1_TEAMS
  ];
  const found = allExisting.find((t) => t.id === id);
  if (found) {
    return { ...found, leagueId: 'ucl_2026' };
  }

  return createClub(
    id,
    name,
    nameAr,
    shortName,
    'ucl_2026',
    `${name} Arena`,
    '#0A1128',
    '#001F54',
    rating,
    rating + 1,
    rating,
    rating - 1,
    managerName,
    managerNameAr,
    country,
    country,
    '4-3-3',
    'Balanced',
    40,
    'تقديم أفضل أداء في مرحلة الدوري لدوري أبطال أوروبا',
    buildSquad(id, rating, starName, starNameAr, 'ST')
  );
}

// -------------------------------------------------------------
// 1. UEFA CHAMPIONS LEAGUE 2026/27 (EXACT 36 CLUBS)
// -------------------------------------------------------------
export const UCL_36_TEAMS: CoachTeam[] = [
  getClubOrMake('aek', 'AEK Athens', 'أيك أثينا', 'AEK', 'Greece', 77, 'Levi Garcia', 'ليفي غارسيا', 'Matias Almeyda', 'ماتياس ألميدا'),
  getClubOrMake('ars', 'Arsenal', 'أرسنال', 'ARS', 'England', 88, 'Bukayo Saka', 'بوكايو ساكا', 'Mikel Arteta', 'ميكيل أرتيتا'),
  getClubOrMake('avl', 'Aston Villa', 'أستون فيلا', 'AVL', 'England', 83, 'Ollie Watkins', 'أولي واتكينز', 'Unai Emery', 'أوناي إيمري'),
  getClubOrMake('atm', 'Atlético de Madrid', 'أتلتيكو مدريد', 'ATM', 'Spain', 86, 'Julian Alvarez', 'جوليان ألفاريز', 'Diego Simeone', 'دييغو سيميوني'),
  getClubOrMake('bar', 'Barcelona', 'برشلونة', 'BAR', 'Spain', 88, 'Lamine Yamal', 'لامين يامال', 'Hansi Flick', 'هانزي فليك'),
  getClubOrMake('bay', 'Bayern München', 'بايرن ميونخ', 'BAY', 'Germany', 89, 'Harry Kane', 'هاري كين', 'Vincent Kompany', 'فينسنت كومباني'),
  getClubOrMake('bod', 'Bodø/Glimt', 'بودو/غليمت', 'BOD', 'Norway', 77, 'Patrick Berg', 'باتريك بيرغ', 'Kjetil Knutsen', 'كيتييل كنوتسن'),
  getClubOrMake('bvb', 'Borussia Dortmund', 'بوروسيا دورتموند', 'BVB', 'Germany', 85, 'Serhou Guirassy', 'سيرهو غيراسي', 'Nuri Sahin', 'نوري شاهين'),
  getClubOrMake('bru', 'Club Brugge', 'كلوب بروج', 'BRU', 'Belgium', 79, 'Hans Vanaken', 'هانز فاناكن', 'Nicky Hayen', 'نيكي هاين'),
  getClubOrMake('com', 'Como', 'كومو', 'COM', 'Italy', 79, 'Nico Paz', 'نيكو باز', 'Cesc Fabregas', 'سيسك فابريغاس'),
  getClubOrMake('fen', 'Fenerbahçe', 'فنربخشة', 'FEN', 'Turkey', 81, 'Edin Dzeko', 'إيدين دجيكو', 'Jose Mourinho', 'جوزيه مورينيو'),
  getClubOrMake('fey', 'Feyenoord', 'فينورد', 'FEY', 'Netherlands', 80, 'Santiago Gimenez', 'سانتياغو خيمينيز', 'Brian Priske', 'برايان بريسك'),
  getClubOrMake('gal', 'Galatasaray', 'غلطة سراي', 'GAL', 'Turkey', 82, 'Victor Osimhen', 'فيكتور أوسيمين', 'Okan Buruk', 'أوكان بوروك'),
  getClubOrMake('int', 'Inter', 'إنتر ميلان', 'INT', 'Italy', 88, 'Lautaro Martinez', 'لاوتارو مارتينيز', 'Simone Inzaghi', 'سيموني إنزاغي'),
  getClubOrMake('las', 'LASK', 'لاسك لينتس', 'LASK', 'Austria', 76, 'Robert Zulj', 'روبرت زولي', 'Markus Schopp', 'ماركوس شوب'),
  getClubOrMake('rbl', 'RB Leipzig', 'آر بي لايبزيغ', 'RBL', 'Germany', 84, 'Benjamin Sesko', 'بينجامين سيسكو', 'Marco Rose', 'ماركو روزه'),
  getClubOrMake('rcl', 'Lens', 'لانس', 'RCL', 'France', 81, 'Florian Sotoca', 'فلوريان سوتوكا', 'Will Still', 'ويل ستيل'),
  getClubOrMake('los', 'Lille', 'ليل', 'LOSC', 'France', 83, 'Jonathan David', 'جوناثان ديفيد', 'Bruno Genesio', 'برونو جينيسيو'),
  getClubOrMake('liv', 'Liverpool', 'ليفربول', 'LIV', 'England', 88, 'Mohamed Salah', 'محمد صلاح', 'Arne Slot', 'آرني سلوت'),
  getClubOrMake('mci', 'Manchester City', 'مانشستر سيتي', 'MCI', 'England', 89, 'Erling Haaland', 'إيرلينغ هالاند', 'Pep Guardiola', 'بيب غوارديولا'),
  getClubOrMake('mun', 'Manchester United', 'مانشستر يونايتد', 'MUN', 'England', 84, 'Bruno Fernandes', 'برونو فيرنانديز', 'Ruben Amorim', 'روبن أموريم'),
  getClubOrMake('nap', 'Napoli', 'نابولي', 'NAP', 'Italy', 86, 'Khvicha Kvaratskhelia', 'خفيتشا كفاراتسخيليا', 'Antonio Conte', 'أنطونيو كونتي'),
  getClubOrMake('psg', 'Paris Saint-Germain', 'باريس سان جيرمان', 'PSG', 'France', 88, 'Ousmane Dembele', 'عثمان ديمبيلي', 'Luis Enrique', 'لويس إنريكي'),
  getClubOrMake('por', 'Porto', 'بورتو', 'POR', 'Portugal', 82, 'Samu Omorodion', 'سامو أوموروديون', 'Vitor Bruno', 'فيتور برونو'),
  getClubOrMake('psv', 'PSV Eindhoven', 'بي إس في آيندهوفن', 'PSV', 'Netherlands', 82, 'Luuk de Jong', 'لوك دي يونغ', 'Peter Bosz', 'بيتر بوش'),
  getClubOrMake('bet', 'Real Betis', 'ريال بيتيس', 'BET', 'Spain', 82, 'Isco Alarcon', 'إيسكو ألاركون', 'Manuel Pellegrini', 'مانويل بيليغريني'),
  getClubOrMake('rma', 'Real Madrid', 'ريال مدريد', 'RMA', 'Spain', 89, 'Kylian Mbappe', 'كيليان مبابي', 'Carlo Ancelotti', 'كارلو أنشيلوتي'),
  getClubOrMake('rom', 'Roma', 'روما', 'ROM', 'Italy', 83, 'Artem Dovbyk', 'أرتيم دوفبيك', 'Claudio Ranieri', 'كلاوديو رانييري'),
  getClubOrMake('sbh', 'Sabah', 'صباح الأذربيجاني', 'SBH', 'Azerbaijan', 74, 'Joy-Lance Mickels', 'ميكلز', 'Murad Musaev', 'مراد موساييف'),
  getClubOrMake('shk', 'Shakhtar Donetsk', 'شاختار دونيتسك', 'SHK', 'Ukraine', 79, 'Georgiy Sudakov', 'سوداكوف', 'Marino Pusic', 'مارينو بوشيتش'),
  getClubOrMake('sla', 'Slavia Praha', 'سلافيا براغ', 'SLA', 'Czech Republic', 78, 'Tomas Chory', 'توماس خوري', 'Jindrich Trpisovsky', 'تربيشوفسكي'),
  getClubOrMake('slv', 'Slovan Bratislava', 'سلوفان براتيسلافا', 'SLV', 'Slovakia', 76, 'David Strelec', 'ديفيد ستريليتش', 'Vladimir Weiss', 'فلاديمير فايس'),
  getClubOrMake('scp', 'Sporting CP', 'سبورتينغ لشبونة', 'SCP', 'Portugal', 84, 'Viktor Gyokeres', 'فيكتور غيوكيريس', 'Joao Pereira', 'جواو بيريرا'),
  getClubOrMake('vfb', 'Stuttgart', 'شتوتغارت', 'VFB', 'Germany', 83, 'Deniz Undav', 'دينيز أونداف', 'Sebastian Hoeness', 'سيباستيان هونيس'),
  getClubOrMake('vik', 'Viking', 'فايكنغ النرويجي', 'VIK', 'Norway', 75, 'Zlatko Tripic', 'تريبيتش', 'Bjarte Lunde Aarsheim', 'بيارتي أرسيم'),
  getClubOrMake('vil', 'Villarreal', 'فياريال', 'VIL', 'Spain', 82, 'Ayoze Perez', 'أيوزي بيريز', 'Marcelino', 'مارسيلينو')
];

// -------------------------------------------------------------
// Helper for National Teams
// -------------------------------------------------------------
function makeNationalTeam(
  id: string,
  name: string,
  nameAr: string,
  shortName: string,
  rating: number,
  starName: string,
  starNameAr: string,
  managerName: string,
  managerNameAr: string,
  groupName: string,
  groupNameAr: string,
  primaryColor: string = '#003366',
  secondaryColor: string = '#FFFFFF'
): CoachTeam {
  const startersSquad = buildSquad(id, rating, starName, starNameAr, 'ST');
  const starters = startersSquad.slice(0, 11).map((p) => p.id);
  const bench = startersSquad.slice(11).map((p) => p.id);

  return {
    id,
    name,
    nameAr,
    shortName,
    leagueId: 'world_cup_2026',
    stadiumName: `${name} National Stadium`,
    primaryColor,
    secondaryColor,
    logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80',
    overallRating: rating,
    attackRating: rating + 1,
    midfieldRating: rating,
    defenseRating: rating - 1,
    currentManager: {
      name: managerName,
      nameAr: managerNameAr,
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      nationality: name,
      nationalityAr: nameAr,
      preferredFormation: '4-3-3',
      preferredStyle: 'Balanced',
      tacticalMindset: 92,
      isCustom: false
    },
    squad: startersSquad,
    startingXI: starters,
    bench,
    formation: '4-3-3',
    playingStyle: 'Balanced',
    isNationalTeam: true,
    controllerType: 'AI',
    budget: { transfer: 0, wage: 0 },
    boardExpectations: {
      leagueObjective: `التأهل من ${groupNameAr} والمنافسة بقوة`,
      leagueObjectiveAr: `التأهل من ${groupNameAr} والمنافسة بقوة`,
      cupObjective: 'Reach Knockout Stage',
      cupObjectiveAr: 'الوصول للأدوار الإقصائية وتمثيل الوطن بشرف',
      minPointsTarget: 5
    },
    boardConfidence: 90,
    fanConfidence: 90,
    seasonObjectivesAr: [
      `العبور بنجاح من دور المجموعات (${groupNameAr})`,
      'إسعاد الجماهير وتقديم ملحمة وطنية كروية'
    ],
    captainId: starters[1] || starters[0],
    penaltyTakerId: starters[10] || starters[9],
    freeKickTakerId: starters[7] || starters[9],
    cornerTakerId: starters[8] || starters[6]
  };
}

// -------------------------------------------------------------
// 2. FIFA WORLD CUP 2026 (EXACT 48 TEAMS - 12 GROUPS)
// -------------------------------------------------------------
export const WORLD_CUP_48_TEAMS: CoachTeam[] = [
  // Group A
  makeNationalTeam('mex', 'Mexico', 'المكسيك', 'MEX', 81, 'Santiago Gimenez', 'سانتياغو خيمينيز', 'Javier Aguirre', 'خافيير أغيري', 'Group A', 'المجموعة A', '#006847', '#CE1126'),
  makeNationalTeam('rsa_wc', 'South Africa', 'جنوب إفريقيا', 'RSA', 76, 'Percy Tau', 'بيرسي تاو', 'Hugo Broos', 'هوغو بروس', 'Group A', 'المجموعة A', '#007A4D', '#FFB612'),
  makeNationalTeam('kor', 'South Korea', 'كوريا الجنوبية', 'KOR', 82, 'Son Heung-min', 'سون هيونغ مين', 'Hong Myung-bo', 'هونغ ميونغ بو', 'Group A', 'المجموعة A', '#C60C30', '#003478'),
  makeNationalTeam('cze', 'Czech Republic', 'التشيك', 'CZE', 79, 'Patrik Schick', 'باتريك شيك', 'Ivan Hasek', 'إيفان هاشيك', 'Group A', 'المجموعة A', '#ED1B2D', '#11457E'),

  // Group B
  makeNationalTeam('can', 'Canada', 'كندا', 'CAN', 79, 'Alphonso Davies', 'ألفونسو ديفيز', 'Jesse Marsch', 'جيسي مارش', 'Group B', 'المجموعة B', '#FF0000', '#FFFFFF'),
  makeNationalTeam('bih', 'Bosnia and Herzegovina', 'البوسنة والهرسك', 'BIH', 76, 'Edin Dzeko', 'إيدين دجيكو', 'Sergej Barbarez', 'سيرجي بارباريز', 'Group B', 'المجموعة B', '#002F6C', '#FFD100'),
  makeNationalTeam('qat', 'Qatar', 'قطر', 'QAT', 77, 'Akram Afif', 'أكرم عفيف', 'Tintin Marquez', 'تينتين ماركيز', 'Group B', 'المجموعة B', '#8D1B3D', '#FFFFFF'),
  makeNationalTeam('sui', 'Switzerland', 'سويسرا', 'SUI', 83, 'Granit Xhaka', 'غرانيت تشاكا', 'Murat Yakin', 'مراد ياكين', 'Group B', 'المجموعة B', '#FF0000', '#FFFFFF'),

  // Group C
  makeNationalTeam('bra', 'Brazil', 'البرازيل', 'BRA', 88, 'Vinicius Jr', 'فينيسيوس جونيور', 'Dorival Junior', 'دوريفال جونيور', 'Group C', 'المجموعة C', '#FEDF00', '#009739'),
  makeNationalTeam('mar', 'Morocco', 'المغرب', 'MAR', 85, 'Achraf Hakimi', 'أشرف حكيمي', 'Walid Regragui', 'وليد الركراكي', 'Group C', 'المجموعة C', '#C1272D', '#006233'),
  makeNationalTeam('hai', 'Haiti', 'هايتي', 'HAI', 73, 'Duckens Nazon', 'دوكينز نازون', 'Sebastien Migne', 'سيباستيان مينييه', 'Group C', 'المجموعة C', '#00209F', '#D21034'),
  makeNationalTeam('sco', 'Scotland', 'اسكتلندا', 'SCO', 79, 'Scott McTominay', 'سكوت مكتوميناي', 'Steve Clarke', 'ستيف كلارك', 'Group C', 'المجموعة C', '#002B49', '#FFFFFF'),

  // Group D
  makeNationalTeam('usa', 'United States', 'الولايات المتحدة', 'USA', 82, 'Christian Pulisic', 'كريستيان بوليسيتش', 'Mauricio Pochettino', 'ماوريسيو بوكيتينو', 'Group D', 'المجموعة D', '#002868', '#BF0A30'),
  makeNationalTeam('par_wc', 'Paraguay', 'باراغواي', 'PAR', 78, 'Miguel Almiron', 'ميغيل ألميرون', 'Gustavo Alfaro', 'غوستافو ألفارو', 'Group D', 'المجموعة D', '#D52B1E', '#0038A8'),
  makeNationalTeam('aus', 'Australia', 'أستراليا', 'AUS', 78, 'Jackson Irvine', 'جاكسون إيرفين', 'Tony Popovic', 'توني بوبوفيتش', 'Group D', 'المجموعة D', '#00843D', '#FFCD00'),
  makeNationalTeam('tur', 'Türkiye', 'تركيا', 'TUR', 82, 'Arda Guler', 'أردا غولر', 'Vincenzo Montella', 'فينتشينزو مونتيلا', 'Group D', 'المجموعة D', '#E30A17', '#FFFFFF'),

  // Group E
  makeNationalTeam('ger', 'Germany', 'ألمانيا', 'GER', 87, 'Florian Wirtz', 'فلوريان فيرتز', 'Julian Nagelsmann', 'يوليان ناغلسمان', 'Group E', 'المجموعة E', '#000000', '#FFFFFF'),
  makeNationalTeam('cur', 'Curaçao', 'كوراساو', 'CUW', 73, 'Juninho Bacuna', 'جونينيو باكونا', 'Dick Advocaat', 'ديك أدفوكات', 'Group E', 'المجموعة E', '#002B7F', '#F9E814'),
  makeNationalTeam('civ_wc', 'Côte d’Ivoire', 'ساحل العاج', 'CIV', 82, 'Franck Kessie', 'فرانك كيسيه', 'Emerse Fae', 'إيميرس فاييه', 'Group E', 'المجموعة E', '#F77F00', '#009E60'),
  makeNationalTeam('ecu', 'Ecuador', 'الإكوادور', 'ECU', 80, 'Moises Caicedo', 'مويسيس كايسيدو', 'Sebastian Beccacece', 'سيباستيان بيكاسيسي', 'Group E', 'المجموعة E', '#FFD100', '#0033A0'),

  // Group F
  makeNationalTeam('ned', 'Netherlands', 'هولندا', 'NED', 86, 'Virgil van Dijk', 'فيرجيل فان دايك', 'Ronald Koeman', 'رونالد كومان', 'Group F', 'المجموعة F', '#F36C21', '#FFFFFF'),
  makeNationalTeam('jpn', 'Japan', 'اليابان', 'JPN', 83, 'Kaoru Mitoma', 'كاورو ميتوما', 'Hajime Moriyasu', 'هاجيمي مورياسو', 'Group F', 'المجموعة F', '#001489', '#FFFFFF'),
  makeNationalTeam('swe', 'Sweden', 'السويد', 'SWE', 81, 'Viktor Gyokeres', 'فيكتور غيوكيريس', 'Jon Dahl Tomasson', 'يون دال توماسون', 'Group F', 'المجموعة F', '#006AA7', '#FECC00'),
  makeNationalTeam('tun_wc', 'Tunisia', 'تونس', 'TUN', 78, 'Ellyes Skhiri', 'إلياس السخيري', 'Kais Yaakoubi', 'قيس اليعقوبي', 'Group F', 'المجموعة F', '#E70013', '#FFFFFF'),

  // Group G
  makeNationalTeam('bel', 'Belgium', 'بلجيكا', 'BEL', 85, 'Kevin De Bruyne', 'كيفين دي بروين', 'Domenico Tedesco', 'دومينيكو تيديسكو', 'Group G', 'المجموعة G', '#ED2939', '#000000'),
  makeNationalTeam('egy_wc', 'Egypt', 'مصر', 'EGY', 82, 'Mohamed Salah', 'محمد صلاح', 'Hossam Hassan', 'حسام حسن', 'Group G', 'المجموعة G', '#C8102E', '#000000'),
  makeNationalTeam('irn', 'Iran', 'إيران', 'IRN', 79, 'Mehdi Taremi', 'مهدي طارمي', 'Amir Ghalenoei', 'أمير قالينوي', 'Group G', 'المجموعة G', '#239F40', '#DA0000'),
  makeNationalTeam('nzl', 'New Zealand', 'نيوزيلندا', 'NZL', 75, 'Chris Wood', 'كريس وود', 'Darren Bazeley', 'دارين بازيلي', 'Group G', 'المجموعة G', '#000000', '#FFFFFF'),

  // Group H
  makeNationalTeam('esp_wc', 'Spain', 'إسبانيا', 'ESP', 88, 'Lamine Yamal', 'لامين يامال', 'Luis de la Fuente', 'لويس دي لا فوينتي', 'Group H', 'المجموعة H', '#C60B1E', '#FFC400'),
  makeNationalTeam('cpv', 'Cape Verde', 'الرأس الأخضر', 'CPV', 75, 'Ryan Mendes', 'ريان مينديز', 'Bubista', 'بوبيستا', 'Group H', 'المجموعة H', '#003893', '#CF2027'),
  makeNationalTeam('ksa', 'Saudi Arabia', 'السعودية', 'KSA', 79, 'Salem Al-Dawsari', 'سالم الدوسري', 'Herve Renard', 'هيرفي رينارد', 'Group H', 'المجموعة H', '#006C35', '#FFFFFF'),
  makeNationalTeam('uru', 'Uruguay', 'أوروغواي', 'URU', 85, 'Federico Valverde', 'فيديريكو فالفيردي', 'Marcelo Bielsa', 'مارسيلو بيلسا', 'Group H', 'المجموعة H', '#0038A8', '#FFFFFF'),

  // Group I
  makeNationalTeam('fra', 'France', 'فرنسا', 'FRA', 89, 'Kylian Mbappe', 'كيليان مبابي', 'Didier Deschamps', 'ديدييه ديشان', 'Group I', 'المجموعة I', '#002395', '#ED2939'),
  makeNationalTeam('sen_wc', 'Senegal', 'السنغال', 'SEN', 83, 'Sadio Mane', 'ساديو ماني', 'Pape Thiaw', 'باب ثياو', 'Group I', 'المجموعة I', '#00853F', '#FDEF42'),
  makeNationalTeam('irq', 'Iraq', 'العراق', 'IRQ', 77, 'Aymen Hussein', 'أيمن حسين', 'Jesus Casas', 'خيسوس كاساس', 'Group I', 'المجموعة I', '#007A3D', '#000000'),
  makeNationalTeam('nor', 'Norway', 'النرويج', 'NOR', 84, 'Erling Haaland', 'إيرلينغ هالاند', 'Stale Solbakken', 'ستالي سولباكن', 'Group I', 'المجموعة I', '#BA0C2F', '#00205B'),

  // Group J
  makeNationalTeam('arg', 'Argentina', 'الأرجنتين', 'ARG', 89, 'Lionel Messi', 'ليونيل ميسي', 'Lionel Scaloni', 'ليونيل سكالوني', 'Group J', 'المجموعة J', '#74ACDF', '#FFFFFF'),
  makeNationalTeam('alg_wc', 'Algeria', 'الجزائر', 'ALG', 82, 'Riyad Mahrez', 'رياض محرز', 'Vladimir Petkovic', 'فلاديمير بيتكوفيتش', 'Group J', 'المجموعة J', '#006233', '#D21034'),
  makeNationalTeam('aut', 'Austria', 'النمسا', 'AUT', 82, 'Marcel Sabitzer', 'مارسيل سابيتزر', 'Ralf Rangnick', 'رالف رانغنيك', 'Group J', 'المجموعة J', '#ED2939', '#FFFFFF'),
  makeNationalTeam('jor', 'Jordan', 'الأردن', 'JOR', 76, 'Mousa Al-Tamari', 'موسى التعمري', 'Jamal Sellami', 'جمال السلامي', 'Group J', 'المجموعة J', '#000000', '#007A3D'),

  // Group K
  makeNationalTeam('por_wc', 'Portugal', 'البرتغال', 'POR', 88, 'Cristiano Ronaldo', 'كريستيانو رونالدو', 'Roberto Martinez', 'روبرتو مارتينيز', 'Group K', 'المجموعة K', '#DA291C', '#006600'),
  makeNationalTeam('col', 'Colombia', 'كولومبيا', 'COL', 84, 'Luis Diaz', 'لويس دياز', 'Nestor Lorenzo', 'نيستور لورينزو', 'Group K', 'المجموعة K', '#FCD116', '#003893'),
  makeNationalTeam('cod_wc', 'DR Congo', 'جمهورية الكونغو الديمقراطية', 'COD', 78, 'Chancel Mbemba', 'تشانسيل مبيمبا', 'Sebastien Desabre', 'سيباستيان ديسابر', 'Group K', 'المجموعة K', '#007FFF', '#CE1126'),
  makeNationalTeam('uzb', 'Uzbekistan', 'أوزبكستان', 'UZB', 77, 'Eldor Shomurodov', 'إلدور شومورودوف', 'Srecko Katanec', 'سريتشكو كاتانيتش', 'Group K', 'المجموعة K', '#0099B5', '#CE1126'),

  // Group L
  makeNationalTeam('eng', 'England', 'إنجلترا', 'ENG', 88, 'Jude Bellingham', 'جود بيلينغهام', 'Thomas Tuchel', 'توماس توخيل', 'Group L', 'المجموعة L', '#FFFFFF', '#CE1124'),
  makeNationalTeam('cro', 'Croatia', 'كرواتيا', 'CRO', 84, 'Luka Modric', 'لوكا مودريتش', 'Zlatko Dalic', 'زلاتكو داليتش', 'Group L', 'المجموعة L', '#FF0000', '#FFFFFF'),
  makeNationalTeam('gha', 'Ghana', 'غانا', 'GHA', 78, 'Mohammed Kudus', 'محمد قدوس', 'Otto Addo', 'أوتو أدو', 'Group L', 'المجموعة L', '#006B3F', '#FCD116'),
  makeNationalTeam('pan', 'Panama', 'بنما', 'PAN', 76, 'Adalberto Carrasquilla', 'كاراسكيا', 'Thomas Christiansen', 'توماس كريستيانسن', 'Group L', 'المجموعة L', '#005293', '#D21034')
];

// -------------------------------------------------------------
// 3. AFRICA CUP OF NATIONS MOROCCO 2025 (EXACT 24 TEAMS - 6 GROUPS)
// -------------------------------------------------------------
export const AFCON_24_TEAMS: CoachTeam[] = [
  // Group A
  makeNationalTeam('mar_afcon', 'Morocco', 'المغرب', 'MAR', 85, 'Brahim Diaz', 'إبراهيم دياز', 'Walid Regragui', 'وليد الركراكي', 'Group A', 'المجموعة A', '#C1272D', '#006233'),
  makeNationalTeam('mli', 'Mali', 'مالي', 'MLI', 79, 'Yves Bissouma', 'إيف بيسوما', 'Tom Saintfiet', 'توم سانتفيت', 'Group A', 'المجموعة A', '#14B53A', '#FCD116'),
  makeNationalTeam('zam', 'Zambia', 'زامبيا', 'ZAM', 76, 'Patson Daka', 'باتسون داكا', 'Avram Grant', 'أفرام غرانت', 'Group A', 'المجموعة A', '#198A00', '#EF7D00'),
  makeNationalTeam('com_afcon', 'Comoros', 'جزر القمر', 'COM', 74, 'Faiz Selemani', 'فايز سليماني', 'Stefano Cusin', 'ستيفانو كوزين', 'Group A', 'المجموعة A', '#009639', '#FFD100'),

  // Group B
  makeNationalTeam('egy_afcon', 'Egypt', 'مصر', 'EGY', 82, 'Mohamed Salah', 'محمد صلاح', 'Hossam Hassan', 'حسام حسن', 'Group B', 'المجموعة B', '#C8102E', '#000000'),
  makeNationalTeam('rsa_afcon', 'South Africa', 'جنوب إفريقيا', 'RSA', 77, 'Themba Zwane', 'ثيمبا زواني', 'Hugo Broos', 'هوغو بروس', 'Group B', 'المجموعة B', '#007A4D', '#FFB612'),
  makeNationalTeam('ang_afcon', 'Angola', 'أنغولا', 'ANG', 76, 'Gelson Dala', 'غيلسون دالا', 'Pedro Goncalves', 'بيدرو غونكالفيش', 'Group B', 'المجموعة B', '#CC092F', '#000000'),
  makeNationalTeam('zim', 'Zimbabwe', 'زيمبابوي', 'ZIM', 74, 'Marvelous Nakamba', 'مارفيلوس ناكامبا', 'Michael Nees', 'مايكل نيس', 'Group B', 'المجموعة B', '#006400', '#FFD700'),

  // Group C
  makeNationalTeam('nga', 'Nigeria', 'نيجيريا', 'NGA', 84, 'Victor Osimhen', 'فيكتور أوسيمين', 'Augustine Eguavoen', 'أوغسطين إيغوافون', 'Group C', 'المجموعة C', '#008751', '#FFFFFF'),
  makeNationalTeam('tun_afcon', 'Tunisia', 'تونس', 'TUN', 79, 'Hannibal Mejbri', 'حنبعل المجبري', 'Kais Yaakoubi', 'قيس اليعقوبي', 'Group C', 'المجموعة C', '#E70013', '#FFFFFF'),
  makeNationalTeam('uga', 'Uganda', 'أوغندا', 'UGA', 75, 'Denis Onyango', 'دينيس أونيانغو', 'Paul Put', 'بول بوت', 'Group C', 'المجموعة C', '#000000', '#FFD100'),
  makeNationalTeam('tan', 'Tanzania', 'تنزانيا', 'TAN', 74, 'Mbwana Samatta', 'مبوانا ساماتا', 'Hemed Morocco', 'حميد موروكو', 'Group C', 'المجموعة C', '#1EB53A', '#00A3DD'),

  // Group D
  makeNationalTeam('sen_afcon', 'Senegal', 'السنغال', 'SEN', 84, 'Sadio Mane', 'ساديو ماني', 'Pape Thiaw', 'باب ثياو', 'Group D', 'المجموعة D', '#00853F', '#FDEF42'),
  makeNationalTeam('cod_afcon', 'DR Congo', 'الكونغو الديمقراطية', 'COD', 79, 'Yoane Wissa', 'يوان ويسا', 'Sebastien Desabre', 'سيباستيان ديسابر', 'Group D', 'المجموعة D', '#007FFF', '#CE1126'),
  makeNationalTeam('ben', 'Benin', 'بنين', 'BEN', 75, 'Steve Mounie', 'ستيف مونييه', 'Gernot Rohr', 'غيرنوت رور', 'Group D', 'المجموعة D', '#008751', '#FCD116'),
  makeNationalTeam('bot', 'Botswana', 'بوتسوانا', 'BOT', 73, 'Tumisang Orebonye', 'أوريبونيي', 'Morena Ramoreboli', 'راموريبولي', 'Group D', 'المجموعة D', '#00CBFF', '#000000'),

  // Group E
  makeNationalTeam('alg_afcon', 'Algeria', 'الجزائر', 'ALG', 83, 'Riyad Mahrez', 'رياض محرز', 'Vladimir Petkovic', 'فلاديمير بيتكوفيتش', 'Group E', 'المجموعة E', '#006233', '#D21034'),
  makeNationalTeam('bfa', 'Burkina Faso', 'بوركينا فاسو', 'BFA', 78, 'Edmond Tapsoba', 'إدموند تابسوبا', 'Brama Traore', 'براما تراوري', 'Group E', 'المجموعة E', '#EF2B2D', '#009E49'),
  makeNationalTeam('gnq', 'Equatorial Guinea', 'غينيا الاستوائية', 'EQG', 76, 'Emilio Nsue', 'إيميليو إنسوي', 'Juan Micha', 'خوان ميشا', 'Group E', 'المجموعة E', '#3E9A00', '#E32118'),
  makeNationalTeam('sdn', 'Sudan', 'السودان', 'SDN', 75, 'Mohamed Abdelrahman', 'محمد عبد الرحمن الغربال', 'Kwesi Appiah', 'كواسي أبياه', 'Group E', 'المجموعة E', '#D21034', '#007229'),

  // Group F
  makeNationalTeam('civ_afcon', 'Côte d’Ivoire', 'ساحل العاج', 'CIV', 83, 'Simon Adingra', 'سيمون أدينغرا', 'Emerse Fae', 'إيميرس فاييه', 'Group F', 'المجموعة F', '#F77F00', '#009E60'),
  makeNationalTeam('cmr', 'Cameroon', 'الكاميرون', 'CMR', 81, 'Bryan Mbeumo', 'بريان مبيومو', 'Marc Brys', 'مارك بريس', 'Group F', 'المجموعة F', '#007A5E', '#CE1126'),
  makeNationalTeam('gab', 'Gabon', 'الغابون', 'GAB', 77, 'Pierre-Emerick Aubameyang', 'أوباميانغ', 'Thierry Mouyouma', 'تييري مويوما', 'Group F', 'المجموعة F', '#009E60', '#FCD116'),
  makeNationalTeam('moz', 'Mozambique', 'موزمبيق', 'MOZ', 75, 'Geny Catamo', 'جيني كاتامو', 'Chiquinho Conde', 'شيكينيو كوندي', 'Group F', 'المجموعة F', '#006600', '#FFD100')
];

// -------------------------------------------------------------
// ALL TOURNAMENTS EXPORT
// -------------------------------------------------------------
export const ALL_TOURNAMENTS: CoachTournament[] = [
  {
    id: 'ucl_2026',
    name: 'UEFA Champions League 2026/27',
    nameAr: 'دوري أبطال أوروبا 2026/27 (النظام السويسري الموحد)',
    logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&auto=format&fit=crop&q=80',
    teamsCount: 36,
    teams: UCL_36_TEAMS,
    format: 'GROUPS_KNOCKOUT',
    descriptionAr: '36 نادي ونظام دوري جديد.'
  },
  {
    id: 'world_cup_2026',
    name: 'FIFA World Cup 2026 (USA / Canada / Mexico)',
    nameAr: 'كأس العالم فيفا 2026 (أمريكا / كندا / المكسيك)',
    logoUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=1200&auto=format&fit=crop&q=80',
    teamsCount: 48,
    teams: WORLD_CUP_48_TEAMS,
    format: 'GROUPS_KNOCKOUT',
    descriptionAr: '48 منتخب ومنافسة نار.'
  },
  {
    id: 'afcon_2025',
    name: 'TotalEnergies Africa Cup of Nations Morocco 2025',
    nameAr: 'كأس أمم إفريقيا المغرب 2025 (TotalEnergies AFCON)',
    logoUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80',
    teamsCount: 24,
    teams: AFCON_24_TEAMS,
    format: 'GROUPS_KNOCKOUT',
    descriptionAr: '24 منتخب وكأس أفريقيا.'
  }
];
