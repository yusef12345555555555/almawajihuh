// ============================================================
// العبها صح | EL3BHA SA7 - Deterministic Match Simulation Engine
// ============================================================

import { FootballPlayer, Coach, MatchEvent, MatchStats, MatchSimulationResult } from '../types';

// Pseudo-Random Number Generator (Mulberry32) for strict determinism
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TeamRatings {
  attack: number;
  midfield: number;
  defense: number;
  goalkeeper: number;
  overall: number;
  chemistry: number;
}

export function calculateTeamRatings(squad: FootballPlayer[], coach: Coach | null): TeamRatings {
  if (!squad || squad.length === 0) {
    return { attack: 50, midfield: 50, defense: 50, goalkeeper: 50, overall: 50, chemistry: 50 };
  }

  let atkSum = 0, atkCount = 0;
  let midSum = 0, midCount = 0;
  let defSum = 0, defCount = 0;
  let gkRating = 75;

  squad.forEach((p) => {
    if (p.position === 'ST' || p.position === 'RW' || p.position === 'LW') {
      atkSum += (p.attributes.shooting * 0.5 + p.attributes.pace * 0.3 + p.attributes.dribbling * 0.2);
      atkCount++;
    } else if (p.position === 'CAM' || p.position === 'CM' || p.position === 'CDM') {
      midSum += (p.attributes.passing * 0.4 + p.attributes.dribbling * 0.3 + p.attributes.defending * 0.3);
      midCount++;
    } else if (p.position === 'CB' || p.position === 'LB' || p.position === 'RB') {
      defSum += (p.attributes.defending * 0.5 + p.attributes.physical * 0.3 + p.attributes.pace * 0.2);
      defCount++;
    } else if (p.position === 'GK') {
      gkRating = p.overallRating;
    }
  });

  let attack = atkCount > 0 ? Math.round(atkSum / atkCount) : 70;
  let midfield = midCount > 0 ? Math.round(midSum / midCount) : 70;
  let defense = defCount > 0 ? Math.round(defSum / defCount) : 70;

  // Coach bonuses
  if (coach) {
    attack += coach.attackBonus;
    defense += coach.defenseBonus;
    midfield += Math.round((coach.possessionBonus + coach.pressingBonus) / 2);
  }

  // Chemistry calculation based on shared clubs or nationalities
  let chemistryPoints = 70;
  const nationalities = new Set(squad.map((p) => p.nationality));
  if (nationalities.size <= 3) chemistryPoints += 15;
  const clubs = new Set(squad.map((p) => p.club));
  if (clubs.size <= 4) chemistryPoints += 15;
  const chemistry = Math.min(100, chemistryPoints + (coach ? coach.chemistryBonus : 0));

  const overall = Math.round((attack + midfield + defense + gkRating) / 4);

  return { attack, midfield, defense, goalkeeper: gkRating, overall, chemistry };
}

export function simulateDeterministicMatch(
  homeTeamName: string,
  awayTeamName: string,
  homeSquad: FootballPlayer[],
  awaySquad: FootballPlayer[],
  homeCoach: Coach | null,
  awayCoach: Coach | null,
  seed: number = Date.now()
): MatchSimulationResult {
  const rand = mulberry32(seed);
  const gameVersion = 'v2.0.0-dynamic';

  const homeRatings = calculateTeamRatings(homeSquad, homeCoach);
  const awayRatings = calculateTeamRatings(awaySquad, awayCoach);

  // "Match day" form/luck factor — the same two squads facing off
  // again will NOT produce the same match. Every team, no matter how
  // strong on paper, has a bad day sometimes; every underdog has a
  // day where everything clicks. This is rolled ONCE per match and
  // applied on top of the raw squad ratings.
  const homeDayFactor = 0.78 + rand() * 0.44; // 0.78 – 1.22
  const awayDayFactor = 0.78 + rand() * 0.44;

  // Possession calculation
  const midDiff = homeRatings.midfield * homeDayFactor - awayRatings.midfield * awayDayFactor;
  let homePoss = Math.round(50 + midDiff * 0.6 + (rand() * 6 - 3));
  homePoss = Math.max(35, Math.min(65, homePoss));

  const events: MatchEvent[] = [];
  let homeScore = 0;
  let awayScore = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeShotsOnTarget = 0;
  let awayShotsOnTarget = 0;
  let homeCorners = Math.floor(rand() * 6) + 2;
  let awayCorners = Math.floor(rand() * 6) + 2;
  let homeFouls = Math.floor(rand() * 8) + 4;
  let awayFouls = Math.floor(rand() * 8) + 4;
  let homeYellows = 0;
  let awayYellows = 0;
  let homeRedCards = 0;
  let awayRedCards = 0;
  let homeInjuries = 0;
  let awayInjuries = 0;
  const homeActiveIds = new Set(homeSquad.map((p) => p.id));
  const awayActiveIds = new Set(awaySquad.map((p) => p.id));
  const yellowedIds = new Set<string>();

  // Tracks real contributions so the Man of the Match is picked from
  // actual events in THIS match, not always "the first player in the
  // squad list".
  const goalTally = new Map<string, { player: FootballPlayer; count: number; team: 'home' | 'away' }>();
  const saveTally = new Map<string, { player: FootballPlayer; count: number; team: 'home' | 'away' }>();

  // Kickoff Event
  events.push({
    minute: 1,
    type: 'KICKOFF',
    teamId: 'home',
    playerName: homeSquad[0]?.nameAr || homeTeamName,
    descriptionAr: `صافرة البداية! انطلاق قمة العبها صح بين ${homeTeamName} و ${awayTeamName}`,
    scoreHome: 0,
    scoreAway: 0,
    highlightLevel: 'low'
  });

  // لحظات المباراة: موزّعة بشكل غير منتظم (مش كل 8 دقائق بالظبط) مع تركيز أكبر على آخر 20 دقيقة
  // عشان تطلع ريمونتادات وأهداف متأخرة. نفس الـ seed = نفس التوزيع على جهاز الطرفين.
  const baseMinutes = [7, 14, 21, 29, 37, 45, 52, 59, 66, 72, 77, 82, 86, 90];
  const minutesToCheck: number[] = [];
  baseMinutes.forEach((m, i) => {
    if (m === 45 || m === 90) {
      minutesToCheck.push(m);
      return;
    }
    const jitter = Math.floor(rand() * 5) - 2; // -2..+2
    const prev = minutesToCheck[i - 1] ?? 0;
    minutesToCheck.push(Math.min(89, Math.max(prev + 1, m + jitter)));
  });

  minutesToCheck.forEach((min) => {
    if (min === 45) {
      events.push({
        minute: 45,
        type: 'HALFTIME',
        teamId: 'home',
        playerName: 'الحكم',
        descriptionAr: `نهاية الشوط الأول بنتيجة [ ${homeScore} - ${awayScore} ]`,
        scoreHome: homeScore,
        scoreAway: awayScore,
        highlightLevel: 'medium'
      });
      return;
    }

    const homeLiveFactor = homeDayFactor * Math.max(0.55, 1 - homeRedCards * 0.14 - homeInjuries * 0.06);
    const awayLiveFactor = awayDayFactor * Math.max(0.55, 1 - awayRedCards * 0.14 - awayInjuries * 0.06);
    const liveHomeMid = homeRatings.midfield * homeLiveFactor;
    const liveAwayMid = awayRatings.midfield * awayLiveFactor;
    homePoss = Math.round(50 + (liveHomeMid - liveAwayMid) * 0.6 + (rand() * 6 - 3));
    homePoss = Math.max(25, Math.min(75, homePoss));

    const isHomeAttack = rand() < homePoss / 100;
    const attackingTeam = isHomeAttack ? 'home' : 'away';
    const attackingIds = isHomeAttack ? homeActiveIds : awayActiveIds;
    const defendingIds = isHomeAttack ? awayActiveIds : homeActiveIds;
    const attackingSquad = (isHomeAttack ? homeSquad : awaySquad).filter((p) => attackingIds.has(p.id));
    const defendingSquad = (isHomeAttack ? awaySquad : homeSquad).filter((p) => defendingIds.has(p.id));
    const atkRating = (isHomeAttack ? homeRatings.attack * homeLiveFactor : awayRatings.attack * awayLiveFactor);
    const defRating = (isHomeAttack ? awayRatings.defense * awayLiveFactor : homeRatings.defense * homeLiveFactor);
    const gkRating = (isHomeAttack ? awayRatings.goalkeeper * awayLiveFactor : homeRatings.goalkeeper * homeLiveFactor);

    // حارس المرمى ممنوع يسجل أو يصنع في اللعب العادي — المسجل من لاعبي الميدان فقط.
    // (الحارس ممكن يسجل في حالة نادرة جدًا في آخر دقائق المباراة، شوف بلوك «هدف الحارس» تحت.)
    const attackingOutfield = attackingSquad.filter((p) => p.position !== 'GK');
    const scorerPool = attackingOutfield.length ? attackingOutfield : attackingSquad;
    const playerIndex = Math.floor(rand() * Math.max(1, scorerPool.length));
    const starPlayer = scorerPool[playerIndex] || { nameAr: 'المهاجم', photoUrl: '' };
    // التصدي يتسجل باسم حارس الفريق المدافع (مش أي مدافع عشوائي).
    const defendingKeeper = defendingSquad.find((p) => p.position === 'GK');
    const defender = defendingKeeper || defendingSquad[Math.floor(rand() * Math.max(1, defendingSquad.length))] || { nameAr: 'المدافع' };

    const shotChance = rand();

    if (shotChance > 0.30) {
      // Chance created
      if (isHomeAttack) homeShots++;
      else awayShots++;

      const onTarget = rand() > 0.30;
      if (onTarget) {
        if (isHomeAttack) homeShotsOnTarget++;
        else awayShotsOnTarget++;

        // Goal check: Attack strength vs Defense + GK. Clamped so that
        // NO team — however dominant on paper — ever becomes a "sure
        // thing", and NO team — however weak — is ever completely
        // without a chance. The result must come from the dice, not
        // from the rating gap alone.
        const rawProbability = (atkRating * 1.1) / (atkRating + defRating * 0.8 + gkRating * 0.5);
        // أفضلية طفيفة جداً للأقوى (مش حاسمة) + اندفاع المتأخر في النتيجة آخر المباراة = ريمونتادات حقيقية.
        const attackerTrailing = isHomeAttack ? homeScore < awayScore : awayScore < homeScore;
        const lateBoost = min >= 70 ? (attackerTrailing ? 0.09 : 0.02) : 0;
        const goalProbability = Math.max(0.28, Math.min(0.68, 0.5 + (rawProbability - 0.5) * 0.5 + lateBoost));
        const isGoal = rand() < goalProbability;

        if (isGoal) {
          if (isHomeAttack) homeScore++;
          else awayScore++;

          if ('id' in starPlayer) {
            const scorerKey = starPlayer.id || starPlayer.nameAr;
            const existing = goalTally.get(scorerKey);
            goalTally.set(scorerKey, {
              player: starPlayer,
              count: (existing?.count || 0) + 1,
              team: attackingTeam
            });
          }

          const assistPlayer = scorerPool[(playerIndex + 1) % scorerPool.length];
          events.push({
            minute: min,
            type: 'GOAL',
            teamId: attackingTeam,
            playerName: starPlayer.nameAr,
            playerPhoto: starPlayer.photoUrl,
            descriptionAr: `⚽ جوووووول! هدف ساحر من ${starPlayer.nameAr} بعد تمريرة حريرية من ${assistPlayer?.nameAr || 'صانع الألعاب'}!`,
            scoreHome: homeScore,
            scoreAway: awayScore,
            highlightLevel: 'goal'
          });
        } else {
          // Goalkeeper Save
          const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';
          const saveKey = 'id' in defender && defender.id ? defender.id : defender.nameAr;
          const existingSave = saveTally.get(saveKey);
          if ('id' in defender) {
            saveTally.set(saveKey, {
              player: defender,
              count: (existingSave?.count || 0) + 1,
              team: defendingTeam
            });
          }

          events.push({
            minute: min,
            type: 'SAVE',
            teamId: attackingTeam === 'home' ? 'away' : 'home',
            playerName: defender.nameAr,
            descriptionAr: `قفاز الأمان! تصدٍ خيالي يحرم ${starPlayer.nameAr} من هز الشباك`,
            scoreHome: homeScore,
            scoreAway: awayScore,
            highlightLevel: 'medium'
          });
        }
      } else {
        // Woodwork or missed shot
        const isWoodwork = rand() < 0.2;
        events.push({
          minute: min,
          type: isWoodwork ? 'WOODWORK' : 'SHOT',
          teamId: attackingTeam,
          playerName: starPlayer.nameAr,
          descriptionAr: isWoodwork
            ? `💥 القائم يتعاطف! قذيفة صاروخية من ${starPlayer.nameAr} ترتطم بالعارضة الأفقية`
            : `تسديدة قوية من ${starPlayer.nameAr} تمر بمحاذاة القائم الخارجي`,
          scoreHome: homeScore,
          scoreAway: awayScore,
          highlightLevel: 'low'
        });
      }
    } else if (shotChance < 0.012) {
      // Injuries are rare but meaningful: the affected player leaves the
      // active pool and the team's live strength drops for the rest of the match.
      const injuredTeam: 'home' | 'away' = isHomeAttack ? 'away' : 'home';
      const injuredSet = injuredTeam === 'home' ? homeActiveIds : awayActiveIds;
      const injuredPool = (injuredTeam === 'home' ? homeSquad : awaySquad).filter((p) => injuredSet.has(p.id) && p.position !== 'GK');
      const injured = injuredPool[Math.floor(rand() * Math.max(1, injuredPool.length))];
      if (injured) {
        injuredSet.delete(injured.id);
        if (injuredTeam === 'home') homeInjuries++; else awayInjuries++;
        events.push({
          minute: min,
          type: 'INJURY',
          teamId: injuredTeam,
          playerName: injured.nameAr,
          playerPhoto: injured.photoUrl,
          descriptionAr: `🚑 إصابة مؤثرة! ${injured.nameAr} خرج من الملعب، والنقص البدني بدأ يفتح مساحات للخصم.`,
          scoreHome: homeScore,
          scoreAway: awayScore,
          highlightLevel: 'high'
        });
      }
    } else if (shotChance < 0.045) {
      // Fouls / cards. Second yellow or a rare direct red sends the player off
      // and immediately reduces that team's live strength for the rest of the match.
      const victimTeam: 'home' | 'away' = isHomeAttack ? 'away' : 'home';
      const victimSet = victimTeam === 'home' ? homeActiveIds : awayActiveIds;
      const victimPool = (victimTeam === 'home' ? homeSquad : awaySquad).filter((p) => victimSet.has(p.id));
      const outfield = victimPool.filter((p) => p.position !== 'GK');
      const victim = (outfield.length ? outfield : victimPool)[Math.floor(rand() * Math.max(1, (outfield.length ? outfield : victimPool).length))] || { id: `unknown-${victimTeam}-${min}`, nameAr: 'اللاعب', photoUrl: '' };
      const alreadyYellow = yellowedIds.has(victim.id);
      const directRed = rand() < 0.08;
      const becomesRed = alreadyYellow || directRed;

      if (becomesRed) {
        if (victimTeam === 'home') homeRedCards++;
        else awayRedCards++;
        victimSet.delete(victim.id);
        const newHomePoss = Math.round(50 + (homeRatings.midfield * (homeDayFactor * Math.max(0.62, 1 - homeRedCards * 0.14)) - awayRatings.midfield * (awayDayFactor * Math.max(0.62, 1 - awayRedCards * 0.14))) * 0.6);
        homePoss = Math.max(25, Math.min(75, newHomePoss));
        events.push({
          minute: min,
          type: 'RED_CARD',
          teamId: victimTeam,
          playerName: victim.nameAr,
          playerPhoto: victim.photoUrl,
          descriptionAr: `🟥 طرد! ${victim.nameAr} خرج بالبطاقة الحمراء — العدد نقص والملعب مال فوراً ناحية ${victimTeam === 'home' ? awayTeamName : homeTeamName}.`,
          scoreHome: homeScore,
          scoreAway: awayScore,
          highlightLevel: 'high'
        });
      } else {
        if (victimTeam === 'home') homeYellows++;
        else awayYellows++;
        yellowedIds.add(victim.id);
        events.push({
          minute: min,
          type: 'YELLOW_CARD',
          teamId: victimTeam,
          playerName: victim.nameAr,
          playerPhoto: victim.photoUrl,
          descriptionAr: `🟨 بطاقة صفراء وإنذار شديد اللهجة ضد ${victim.nameAr} بعد تدخل تكتيكي خطير.`,
          scoreHome: homeScore,
          scoreAway: awayScore,
          highlightLevel: 'medium'
        });
      }
    }
  });

  // حسم متأخر عشوائي عند التعادل: يمنع محرك المباراة من أن يطلع
  // بتعادل ثابت كل مرة، مع بقاء فرصة الفوز للجانبين. تأثير الطرد
  // يدخل في القوة الحية قبل حسم اللحظة الأخيرة، لذلك النقص العددي
  // ممكن فعلاً يغيّر الأفضلية والنتيجة.
  // A red card cannot magically end in an equalized advantage-neutral result:
  // the team with the extra man gets a late-pressure check. Otherwise draws
  // remain possible, but are much less common than wins.
  if (homeScore === awayScore && (homeRedCards > 0 || awayRedCards > 0 || rand() < 0.84)) {
    const forcedByRedCard = homeRedCards > 0 || awayRedCards > 0;
    const homeLiveFactor = homeDayFactor * Math.max(0.55, 1 - homeRedCards * 0.14 - homeInjuries * 0.06);
    const awayLiveFactor = awayDayFactor * Math.max(0.55, 1 - awayRedCards * 0.14 - awayInjuries * 0.06);
    const homeLateStrength = homeRatings.attack * homeLiveFactor + homeRatings.midfield * homeLiveFactor + homeRatings.defense * homeLiveFactor;
    const awayLateStrength = awayRatings.attack * awayLiveFactor + awayRatings.midfield * awayLiveFactor + awayRatings.defense * awayLiveFactor;
    const rawHomeLateChance = 0.5 + (homeLateStrength - awayLateStrength) / 260;
    let homeLateChance = Math.max(0.32, Math.min(0.68, rawHomeLateChance));
    if (forcedByRedCard) {
      if (homeRedCards > awayRedCards) homeLateChance = Math.min(0.18, homeLateChance);
      if (awayRedCards > homeRedCards) homeLateChance = Math.max(0.82, homeLateChance);
    }
    const lateWinner = rand() < homeLateChance ? 'home' : 'away';
    const winnerSquad = lateWinner === 'home' ? homeSquad.filter((p) => homeActiveIds.has(p.id)) : awaySquad.filter((p) => awayActiveIds.has(p.id));
    const winnerOutfield = winnerSquad.filter((p) => p.position !== 'GK');
    const scorer = winnerOutfield.find((p) => ['ST', 'RW', 'LW', 'CF'].includes(p.position)) || winnerOutfield[0] || winnerSquad[0];
    if (lateWinner === 'home') homeScore++;
    else awayScore++;
    if (scorer) {
      const scorerKey = scorer.id;
      const existing = goalTally.get(scorerKey);
      goalTally.set(scorerKey, { player: scorer, count: (existing?.count || 0) + 1, team: lateWinner });
      events.push({
        minute: 90,
        type: 'GOAL',
        teamId: lateWinner,
        playerName: scorer.nameAr,
        playerPhoto: scorer.photoUrl,
        descriptionAr: `⚡ لحظة الحسم! ${scorer.nameAr} خطف هدفاً متأخراً وحوّل نتيجة المباراة في الثانية الأخيرة.`,
        scoreHome: homeScore,
        scoreAway: awayScore,
        highlightLevel: 'goal'
      });
    }
  }

  // هدف الحارس: حالة نادرة جدًا (تقريبًا مرة كل 5–10 ماتشات، مش مضمونة).
  // الشرط: الوقت بدل الضايع (الدقيقة 90 أو 91)، والفريق متعادل أو مغلوب بفارق هدفين
  // بالكتير — الحارس بيطلع على ركنية أخيرة ويسجل. غير كده الحارس مستحيل يسجل.
  // الرميات العشوائية بتتسحب دايمًا (حتى لو مفيش هدف) عشان الماتش يفضل ثابت لنفس الـ seed.
  const gkRoll = rand();
  const gkTeamRoll = rand();
  const gkMinuteRoll = rand();
  let lastMinute = 90;
  {
    const homeKeeper = homeSquad.find((p) => p.position === 'GK' && homeActiveIds.has(p.id));
    const awayKeeper = awaySquad.find((p) => p.position === 'GK' && awayActiveIds.has(p.id));
    const gap = homeScore - awayScore; // موجب = الهوم متقدم
    const homeCandidate = !!homeKeeper && gap <= 0 && gap >= -2;
    const awayCandidate = !!awayKeeper && gap >= 0 && gap <= 2;
    let gkTeam: 'home' | 'away' | null = null;
    if (homeCandidate && awayCandidate) gkTeam = gkTeamRoll < 0.5 ? 'home' : 'away'; // تعادل
    else if (homeCandidate) gkTeam = 'home';
    else if (awayCandidate) gkTeam = 'away';

    if (gkTeam) {
      const deficit = gkTeam === 'home' ? -gap : gap; // 0 = تعادل، 1/2 = متأخر
      const chance = deficit === 0 ? 0.14 : deficit === 1 ? 0.19 : 0.1;
      if (gkRoll < chance) {
        const keeper = (gkTeam === 'home' ? homeKeeper : awayKeeper) as FootballPlayer;
        const gkMinute = gkMinuteRoll < 0.5 ? 90 : 91;
        if (gkTeam === 'home') homeScore++;
        else awayScore++;
        if (gkTeam === 'home') homeShots++;
        else awayShots++;
        if (gkTeam === 'home') homeShotsOnTarget++;
        else awayShotsOnTarget++;
        goalTally.set(keeper.id, { player: keeper, count: 1, team: gkTeam });
        lastMinute = gkMinute;
        events.push({
          minute: gkMinute,
          type: 'GOAL',
          teamId: gkTeam,
          playerName: keeper.nameAr,
          playerPhoto: keeper.photoUrl,
          descriptionAr: `🧤⚽ مفاجأة مدوية! حارس المرمى ${keeper.nameAr} صعد لركنية الدقيقة الأخيرة وسجّل هدفًا تاريخيًا!`,
          scoreHome: homeScore,
          scoreAway: awayScore,
          highlightLevel: 'goal'
        });
      }
    }
  }

  // Fulltime Event
  events.push({
    minute: lastMinute,
    type: 'FULLTIME',
    teamId: 'home',
    playerName: 'صافرة النهاية',
    descriptionAr: `صافرة نهاية الملحمة الكروية! النتيجة النهائية: ${homeTeamName} [ ${homeScore} - ${awayScore} ] ${awayTeamName}`,
    scoreHome: homeScore,
    scoreAway: awayScore,
    highlightLevel: 'high'
  });

  // xG estimation
  const awayPoss = 100 - homePoss;

  const homeXG = +(homeShotsOnTarget * 0.32 + (homeShots - homeShotsOnTarget) * 0.06).toFixed(2);
  const awayXG = +(awayShotsOnTarget * 0.32 + (awayShots - awayShotsOnTarget) * 0.06).toFixed(2);

  // MVP Selection — based on REAL contributions in this specific match
  // (top scorer, or best goalkeeper/defender on a clean sheet), never
  // just "the first player in the squad list".
  let mvpPlayer: FootballPlayer | undefined;
  let mvpName = homeSquad[0]?.nameAr || 'النجم';
  let mvpRating = 8.0;

  const topScorer = [...goalTally.values()].sort((a, b) => b.count - a.count)[0];
  const topKeeper = [...saveTally.values()].sort((a, b) => b.count - a.count)[0];

  if (topScorer && (homeScore !== awayScore ? topScorer.team === (homeScore > awayScore ? 'home' : 'away') : true)) {
    // Prefer the top scorer from the winning side; on a draw, the top
    // scorer overall still stands out as MVP.
    mvpPlayer = topScorer.player;
    mvpName = topScorer.player.nameAr;
    mvpRating = +(8.2 + topScorer.count * 0.4 + rand() * 0.4).toFixed(1);
  } else if (topScorer) {
    // The losing side's best scorer can still occasionally be judged
    // the standout performer in a losing effort.
    mvpPlayer = topScorer.player;
    mvpName = topScorer.player.nameAr;
    mvpRating = +(7.6 + topScorer.count * 0.3 + rand() * 0.3).toFixed(1);
  } else if (topKeeper) {
    // No goals at all for anyone — reward the busiest/best goalkeeper.
    mvpPlayer = topKeeper.player;
    mvpName = topKeeper.player.nameAr;
    mvpRating = +(7.8 + topKeeper.count * 0.25 + rand() * 0.4).toFixed(1);
  } else {
    // Truly uneventful match — fall back to the highest-rated player
    // on the side that didn't lose.
    const fallbackSquad = homeScore >= awayScore ? homeSquad : awaySquad;
    const best = [...fallbackSquad].sort((a, b) => b.overallRating - a.overallRating)[0];
    if (best) {
      mvpPlayer = best;
      mvpName = best.nameAr;
      mvpRating = +(7.2 + rand() * 0.6).toFixed(1);
    }
  }
  mvpRating = Math.min(9.8, mvpRating);

  // AI Tactical Analysis Generation based on real data
  const tacticalAnalysisAr: string[] = [];

  if (homeRatings.attack > awayRatings.defense + 10) {
    tacticalAnalysisAr.push(`• القوة الهجومية الضاربة لفريق (${homeTeamName}) شكلت ضغطاً كاسحاً على دفاعات الخصم.`);
  } else if (awayRatings.defense > homeRatings.attack + 5) {
    tacticalAnalysisAr.push(`• التنظيم الدفاعي الحديدي لفريق (${awayTeamName}) أغلق المساحات أمام المهاجمين.`);
  }

  if (homeCoach) {
    tacticalAnalysisAr.push(`• أسلوب المدرب ${homeCoach.nameAr} (${homeCoach.styleAr}) منح فريقه أفضلية واضحة في التحولات.`);
  }

  if (homePoss > 55) {
    tacticalAnalysisAr.push(`• التفوق في معركة خط الوسط حسم الاستحواذ بنسبة ${homePoss}% وخلق ${homeShots} محاولة هجومية.`);
  } else if (awayPoss > 55) {
    tacticalAnalysisAr.push(`• الاعتماد على تدوير الكرة السريع مكن (${awayTeamName}) من التحكم في إيقاع المباراة.`);
  }

  if (homeRedCards || awayRedCards) {
    tacticalAnalysisAr.push(`• الطرد غيّر كثافة المباراة وأعاد توزيع الأفضلية بسبب النقص العددي.`);
  }

  if (homeXG > 2.0 || awayXG > 2.0) {
    tacticalAnalysisAr.push(`• نسبة الأهداف المتوقعة (xG) عكست شراسة الفرص الخطيرة المصنوعة داخل منطقة الجزاء.`);
  }

  const winner: 'home' | 'away' | 'draw' = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';

  const stats: MatchStats = {
    homeScore,
    awayScore,
    homePossession: homePoss,
    awayPossession: awayPoss,
    homeShots: Math.max(homeShots, homeScore),
    awayShots: Math.max(awayShots, awayScore),
    homeShotsOnTarget: Math.max(homeShotsOnTarget, homeScore),
    awayShotsOnTarget: Math.max(awayShotsOnTarget, awayScore),
    homeXG,
    awayXG,
    homeCorners,
    awayCorners,
    homeFouls,
    awayFouls,
    homeYellowCards: homeYellows,
    awayYellowCards: awayYellows,
    homeRedCards,
    awayRedCards,
    mvpPlayerName: mvpName,
    mvpPlayer,
    mvpRating,
    tacticalAnalysisAr: [] as string[]
  };

  return {
    matchId: `match_${seed}_${Date.now()}`,
    homeTeamName,
    awayTeamName,
    homeSquad,
    awaySquad,
    homeCoach,
    awayCoach,
    events,
    stats,
    winner,
    randomSeed: seed,
    gameVersion
  };
}
