// اختبار محرك «اقف ف صفي عشان بصفي».
// التشغيل: npx tsx tests/safiEngine.test.ts
import * as E from '../src/services/safiEngine';
import { FOOTBALL_PLAYERS } from '../src/data/footballData';
import { createSeededRng } from '../src/services/seededRandom';

const N = 1500;
let userWins = 0;
for (let i = 0; i < N; i++) {
  const seed = 5000 + i * 31;
  let g = E.createSafiGame(FOOTBALL_PLAYERS, seed);
  const same = E.createSafiGame(FOOTBALL_PLAYERS, seed);
  if (g.board.map((p) => p.id).join() !== same.board.map((p) => p.id).join()) throw new Error('اللوحة مش ثابتة');
  if (g.board.length !== 30) throw new Error('اللوحة لازم تكون 30 كارت');
  if (g.userSecret.id === g.aiSecret.id) throw new Error('اللاعبين السريين لازم يكونوا مختلفين');
  const aiRng = E.createAiRng(seed);
  const rng = createSeededRng(seed + 1);
  for (let step = 0; g.phase !== 'DONE'; step++) {
    if (step > 100) throw new Error('اللعبة مبتخلصش');
    if (g.phase === 'USER') {
      const free = g.questions.filter((q) => !g.askedByUser.includes(q.id));
      g = free.length ? E.userAsk(g, free[Math.floor(rng() * free.length)].id) : E.userTimeout(g);
    } else if (g.phase === 'AI') g = E.aiPlay(g, aiRng);
    else g = E.userFinalGuess(g, g.board[Math.floor(rng() * 30)].id, aiRng);
    if (g.userTurnsUsed > E.SAFI_TURNS_PER_SIDE || g.aiTurnsUsed > E.SAFI_TURNS_PER_SIDE) throw new Error('أدوار زيادة عن 7');
  }
  if (!g.outcome) throw new Error('مفيش نتيجة');
  if (g.outcome.winner === 'USER') userWins++;
}
console.log(`OK — ${N} لعبة بدون أخطاء (فوز اللاعب العشوائي: ${((userWins / N) * 100).toFixed(1)}%)`);
