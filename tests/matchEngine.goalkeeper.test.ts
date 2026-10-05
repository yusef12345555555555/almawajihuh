// اختبار قواعد حارس المرمى في محرك المباراة.
// التشغيل: npx tsx tests/matchEngine.goalkeeper.test.ts
import { simulateDeterministicMatch } from '../src/services/matchEngine';
import { FOOTBALL_PLAYERS, COACHES } from '../src/data/footballData';

const by = (pos: string[]) => FOOTBALL_PLAYERS.filter((p) => pos.includes(p.position));
const gk = by(['GK']), df = by(['CB', 'LB', 'RB']), md = by(['CM', 'CAM', 'CDM']), at = by(['ST', 'RW', 'LW']);
const pick = <T,>(a: T[], i: number) => a[i % a.length];

const N = 3000;
let gkGoals = 0;
for (let i = 0; i < N; i++) {
  const a = [pick(gk, i), pick(df, i * 3), pick(md, i * 5), pick(md, i * 5 + 7), pick(at, i * 11)];
  const b = [pick(gk, i + 13), pick(df, i * 7 + 2), pick(md, i * 9 + 1), pick(md, i * 9 + 8), pick(at, i * 13 + 5)];
  const seed = 1000 + i * 7919;
  const r = simulateDeterministicMatch('A', 'B', a, b, COACHES[0], COACHES[1], seed);
  const again = simulateDeterministicMatch('A', 'B', a, b, COACHES[0], COACHES[1], seed);
  if (JSON.stringify(r.events) !== JSON.stringify(again.events)) throw new Error('النتيجة مش ثابتة لنفس الـ seed');
  const keepers = new Set([...a, ...b].filter((p) => p.position === 'GK').map((p) => p.nameAr));
  const goals = r.events.filter((e) => e.type === 'GOAL');
  if (goals.length !== r.stats.homeScore + r.stats.awayScore) throw new Error('عدد الأهداف مش مطابق للنتيجة');
  for (const g of goals.filter((e) => keepers.has(e.playerName))) {
    gkGoals++;
    if (g.minute < 90) throw new Error('الحارس سجّل قبل الدقيقة 90');
  }
  for (const s of r.events.filter((e) => e.type === 'SAVE')) {
    if (!keepers.has(s.playerName)) throw new Error('تصدٍّ باسم لاعب غير الحارس');
  }
}
const ratio = gkGoals / N;
if (ratio < 0.05 || ratio > 0.25) throw new Error(`تكرار هدف الحارس غير منطقي: ${ratio}`);
console.log(`OK — هدف الحارس تقريبًا مرة كل ${(1 / ratio).toFixed(1)} ماتش`);
