// ============================================================
// المواجهة | إحصائيات المباراة الحيّة
// كل رقم هنا مشتق من أحداث المباراة الفعلية (أهداف، تصديات، تسديدات، كروت...)
// حتى الدقيقة الحالية — مفيش أرقام ثابتة. الاستحواذ والركنيات والمخالفات بتتوزع
// على مدار الدقايق بنسبة تقدّم المباراة وبتنتهي عند القيم النهائية للمحرك.
// ============================================================

import { MatchEvent, MatchSimulationResult } from '../types';

export interface SideLive {
  goals: number;
  shots: number;
  onTarget: number;
  saves: number;
  woodwork: number;
  yellow: number;
  red: number;
  injuries: number;
  corners: number;
  fouls: number;
  possession: number;
  xg: number;
}

export interface LiveStats {
  home: SideLive;
  away: SideLive;
  /** نسبة الضغط الحالي: -1 (ضغط الضيف) .. +1 (ضغط المضيف) من آخر 15 دقيقة */
  momentum: number;
  /** آخر 6 فترات (15 دقيقة لكل فترة) — عدد المحاولات لكل فريق */
  timeline: { home: number; away: number }[];
  topPerformer: { name: string; label: string } | null;
}

const empty = (): SideLive => ({
  goals: 0,
  shots: 0,
  onTarget: 0,
  saves: 0,
  woodwork: 0,
  yellow: 0,
  red: 0,
  injuries: 0,
  corners: 0,
  fouls: 0,
  possession: 50,
  xg: 0
});

/** حدث "رئيسي" واحد فقط لكل (دقيقة + نوع + لاعب + نص) — يمنع أي تكرار في العرض. */
export function uniqueEvents(events: MatchEvent[]): MatchEvent[] {
  const seen = new Set<string>();
  const out: MatchEvent[] = [];
  for (const e of events) {
    const k = `${e.minute}|${e.type}|${e.teamId}|${e.playerName}|${e.descriptionAr}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

export function computeLiveStats(result: MatchSimulationResult, minute: number): LiveStats {
  const events = uniqueEvents(result.events).filter((e) => e.minute <= minute);
  const home = empty();
  const away = empty();
  const side = (t: 'home' | 'away') => (t === 'home' ? home : away);
  const other = (t: 'home' | 'away') => (t === 'home' ? away : home);
  const progress = Math.max(0, Math.min(1, minute / 90));

  const timeline = Array.from({ length: 6 }, () => ({ home: 0, away: 0 }));
  const perfPoints = new Map<string, { name: string; pts: number; label: string }>();
  const bump = (name: string, pts: number, label: string) => {
    const cur = perfPoints.get(name);
    perfPoints.set(name, { name, pts: (cur?.pts || 0) + pts, label: cur && cur.pts >= pts ? cur.label : label });
  };

  let recentHome = 0;
  let recentAway = 0;

  events.forEach((e) => {
    const s = side(e.teamId);
    const bucket = Math.min(5, Math.floor((Math.max(1, e.minute) - 1) / 15));
    const recent = e.minute > minute - 15;
    switch (e.type) {
      case 'GOAL':
      case 'PENALTY_GOAL':
        s.goals++;
        s.shots++;
        s.onTarget++;
        s.xg += 0.45;
        timeline[bucket][e.teamId]++;
        if (recent) e.teamId === 'home' ? recentHome++ : recentAway++;
        bump(e.playerName, 5, 'هدّاف المباراة');
        break;
      case 'SAVE': {
        // التسديدة بتاعة المهاجم (الفريق المقابل لفريق الحارس)
        const attacker = other(e.teamId);
        attacker.shots++;
        attacker.onTarget++;
        attacker.xg += 0.3;
        s.saves++;
        const atkTeam = e.teamId === 'home' ? 'away' : 'home';
        timeline[bucket][atkTeam]++;
        if (recent) atkTeam === 'home' ? recentHome++ : recentAway++;
        bump(e.playerName, 3, 'حارس المباراة');
        break;
      }
      case 'SHOT':
        s.shots++;
        s.xg += 0.06;
        timeline[bucket][e.teamId]++;
        if (recent) e.teamId === 'home' ? recentHome++ : recentAway++;
        break;
      case 'WOODWORK':
        s.shots++;
        s.woodwork++;
        s.xg += 0.18;
        timeline[bucket][e.teamId]++;
        if (recent) e.teamId === 'home' ? recentHome++ : recentAway++;
        break;
      case 'YELLOW_CARD':
        s.yellow++;
        break;
      case 'RED_CARD':
        s.red++;
        break;
      case 'INJURY':
        s.injuries++;
        break;
      default:
        break;
    }
  });

  const fin = result.stats;
  // توزيع الركنيات والمخالفات على الدقائق (بنسبة الوقت المنقضي) — منتهية عند الأرقام النهائية
  home.corners = Math.round(fin.homeCorners * progress);
  away.corners = Math.round(fin.awayCorners * progress);
  home.fouls = Math.round(fin.homeFouls * progress);
  away.fouls = Math.round(fin.awayFouls * progress);

  // الاستحواذ: يبدأ 50-50 ويتحرك لنسبة المحرك النهائية، مع تأثر لحظي بضغط آخر 15 دقيقة
  const finalHomePoss = fin.homePossession;
  const base = 50 + (finalHomePoss - 50) * Math.min(1, progress * 1.15);
  const swing = Math.max(-6, Math.min(6, (recentHome - recentAway) * 2.2)) * (1 - progress * 0.6);
  let hp = Math.round(minute >= 90 ? finalHomePoss : base + swing);
  hp = Math.max(20, Math.min(80, hp));
  home.possession = hp;
  away.possession = 100 - hp;

  home.xg = +home.xg.toFixed(2);
  away.xg = +away.xg.toFixed(2);
  if (minute >= 90) {
    // عند النهاية: الأرقام الرسمية من المحرك (نفس اللي اتحسب للنتيجة)
    home.shots = fin.homeShots;
    away.shots = fin.awayShots;
    home.onTarget = fin.homeShotsOnTarget;
    away.onTarget = fin.awayShotsOnTarget;
    home.xg = fin.homeXG;
    away.xg = fin.awayXG;
    home.goals = fin.homeScore;
    away.goals = fin.awayScore;
  }

  const total = recentHome + recentAway;
  const momentum = total === 0 ? 0 : (recentHome - recentAway) / total;

  let top: { name: string; label: string } | null = null;
  let topPts = 0;
  perfPoints.forEach((v) => {
    if (v.pts > topPts) {
      topPts = v.pts;
      top = { name: v.name, label: v.label };
    }
  });

  return { home, away, momentum, timeline, topPerformer: top };
}
