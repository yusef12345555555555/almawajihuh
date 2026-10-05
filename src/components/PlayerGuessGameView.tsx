// ============================================================
// العبها صح | EL3BHA SA7 — اقف ف صفي عشان بصفي
// ------------------------------------------------------------
// • 30 كارت ثابتين طول الماتش (الـ seed بيتثبّت مرة واحدة ومبيتغيرش مع أي ضغطة).
// • كل طرف له 7 أدوار (سؤال أو تخمين) ومدة الدور 20 ثانية.
// • تخمين صح = فوز فوري. لو محدش خمّن صح: كل واحد يثبّت تخمين نهائي،
//   يتكشف لاعب كل طرف، والأقرب للاعب السري يكسب.
// المنطق كله في services/safiEngine.ts — الملف ده واجهة بس.
// ============================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FootballPlayer } from "../types";
import { getCombinedPlayersSync, refreshPlayersInBackground } from "../services/playerRepository";
import { audioManager } from "../services/audioManager";
import { StorageService } from "../services/storageService";
import {
  SAFI_TURNS_PER_SIDE,
  SAFI_TURN_SECONDS,
  SafiCategory,
  SafiLogEntry,
  SafiState,
  aiPlay,
  createAiRng,
  createSafiGame,
  userAsk,
  userFinalGuess,
  userGuess,
  userTimeout,
} from "../services/safiEngine";
import { ActiveGameShell } from "./ActiveGameShell";
import { WithdrawResultScreen } from "./WithdrawResultScreen";
import { PlayerCard } from "./PlayerCard";
import { Clock, HelpCircle, Scissors, Target, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

interface PlayerGuessGameViewProps {
  /** النتيجة بتتبعت لما الماتش يخلص فعلاً؛ الانسحاب العادي بيبعت LOSE. */
  onBack: (result?: "WIN" | "LOSE" | "DRAW") => void;
  /** seed مشترك من المطابقة — الاتنين بيشوفوا نفس الـ30 كارت. */
  sharedSeed?: number;
}

const CATEGORY_LABEL: Record<SafiCategory, string> = {
  position: "المركز",
  country: "الجنسية",
  club: "النادي",
  rating: "التقييم",
  other: "أسئلة تانية",
};
const CATEGORY_ORDER: SafiCategory[] = [
  "position",
  "country",
  "club",
  "rating",
  "other",
];

export const PlayerGuessGameView: React.FC<PlayerGuessGameViewProps> = ({
  onBack,
  sharedSeed,
}) => {
  // ⚠️ الـ seed بيتحسب مرة واحدة بس (lazy state). لو اتحسب في الـrender هيتغير مع كل ضغطة
  // واللوحة كلها هتتلخبط — ده كان سبب إن الكروت "بتتغير باستمرار".
  const [seed] = useState<number>(
    () => sharedSeed ?? Math.floor(Math.random() * 0xffffffff),
  );
  const [game, setGame] = useState<SafiState>(() =>
    createSafiGame(getCombinedPlayersSync(), seed),
  );
  useEffect(() => {
    refreshPlayersInBackground();
  }, []);
  const gameRef = useRef<SafiState>(game);
  const aiRng = useRef<() => number>(createAiRng(seed));

  const [eliminated, setEliminated] = useState<Set<string>>(() => new Set());
  const [appliedQuestions, setAppliedQuestions] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<SafiCategory>("position");
  const [turnDuration, setTurnDuration] = useState<
    5 | 10 | 15 | 20 | 25 | 30 | 35
  >(15);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [withdrew, setWithdrew] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const rewardedRef = useRef(false);

  const me = useMemo(() => StorageService.getUserProfile(), []);

  // كل تغيير في اللعبة بيعدي من هنا (مفيش رميات عشوائية جوه setState عشان StrictMode).
  const apply = useCallback((fn: (g: SafiState) => SafiState) => {
    const next = fn(gameRef.current);
    if (next !== gameRef.current) {
      gameRef.current = next;
      setGame(next);
    }
  }, []);

  const isMyTurn = game.phase === "USER";
  const isFinal = game.phase === "FINAL";

  // اختيار تلقائي لو وقت التخمين النهائي خلص
  const autoFinalPickRef = useRef<() => string>(() => game.board[0].id);
  autoFinalPickRef.current = () => {
    const g = gameRef.current;
    if (selectedId && g.board.some((p) => p.id === selectedId))
      return selectedId;
    const free = g.board.find(
      (p) => !eliminated.has(p.id) && !g.wrongUserGuesses.includes(p.id),
    );
    return (free ?? g.board[0]).id;
  };

  // ---------------- عدّاد الوقت المحدد (دورك + التخمين النهائي) ----------------
  const turnKey = `${game.phase}-${game.userTurnsUsed}-${game.aiTurnsUsed}-${turnDuration}`;
  useEffect(() => {
    if (game.phase !== "USER" && game.phase !== "FINAL") return;
    const startedAt = Date.now();
    setTimeLeft(turnDuration);
    let lastSecond: number = turnDuration;
    const id = setInterval(() => {
      const left = Math.max(
        0,
        turnDuration - Math.floor((Date.now() - startedAt) / 1000),
      );
      if (left !== lastSecond) {
        lastSecond = left;
        setTimeLeft(left);
        if (left > 0 && left <= 5) audioManager.playTimerBeep();
      }
      if (left <= 0) {
        clearInterval(id);
        const pick = autoFinalPickRef.current();
        setSelectedId(null);
        apply((g) => {
          if (g.phase === "USER") return userTimeout(g);
          if (g.phase === "FINAL")
            return userFinalGuess(g, pick, aiRng.current);
          return g;
        });
      }
    }, 250);
    return () => clearInterval(id);
  }, [turnKey, turnDuration, apply]);

  // ---------------- دور الخصم (AI) ----------------
  useEffect(() => {
    if (game.phase !== "AI") return;
    const t = setTimeout(() => apply((g) => aiPlay(g, aiRng.current)), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnKey]);

  // ---------------- نهاية الماتش ----------------
  useEffect(() => {
    if (game.phase !== "DONE" || !game.outcome) return;
    if (!rewardedRef.current) {
      rewardedRef.current = true;
      StorageService.awardUniversal10Points(
        "safi",
        `${seed}_${game.userSecret.id}_${game.aiSecret.id}`,
      );
      if (game.outcome.winner === "USER") {
        audioManager.playGoal();
        try {
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        } catch {
          /* الكونفيتي زينة بس */
        }
      } else {
        audioManager.playWhistle();
      }
    }
    const t = setTimeout(() => setShowResult(true), 900);
    return () => clearTimeout(t);
  }, [game.phase, game.outcome, game.userSecret.id, game.aiSecret.id, seed]);

  // ---------------- أفعال اللاعب ----------------
  const handleAsk = (questionId: string) => {
    if (!isMyTurn) return;
    audioManager.playClick();
    setSelectedId(null);
    apply((g) => userAsk(g, questionId));
  };

  const handleGuess = () => {
    if (!selectedId) return;
    const id = selectedId;
    if (isMyTurn) {
      audioManager.playWhistle();
      setSelectedId(null);
      apply((g) => userGuess(g, id));
      // تخمين غلط → الكارت يتشال من اللوحة تلقائيًا
      if (gameRef.current.wrongUserGuesses.includes(id)) {
        setEliminated((prev) => new Set(prev).add(id));
      }
    } else if (isFinal) {
      audioManager.playWhistle();
      setSelectedId(null);
      apply((g) => userFinalGuess(g, id, aiRng.current));
    }
  };

  const toggleEliminate = (playerId: string) => {
    audioManager.playClick();
    setEliminated((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  /** تصفية تلقائية: يشيل كل اللاعيبة اللي إجابتهم عن السؤال مختلفة عن إجابة الخصم. */
  const autoEliminate = (
    entry: Extract<SafiLogEntry, { kind: "QUESTION" }>,
    entryKey: string,
  ) => {
    const q = game.questions.find((x) => x.id === entry.questionId);
    if (!q) return;
    audioManager.playClick();
    setEliminated((prev) => {
      const next = new Set(prev);
      game.board.forEach((p) => {
        if (q.test(p) !== entry.answer) next.add(p.id);
      });
      return next;
    });
    setAppliedQuestions((prev) => new Set(prev).add(entryKey));
  };

  // ---------------- العرض ----------------
  if (withdrew) {
    return (
      <WithdrawResultScreen
        didWithdraw
        myName={me.nameAr}
        myAvatar={me.avatar}
        opponentName="الخصم"
        opponentAvatar="🤖"
        onBack={() => onBack("LOSE")}
      />
    );
  }

  const userTurnsLeft = SAFI_TURNS_PER_SIDE - game.userTurnsUsed;
  const aiTurnsLeft = SAFI_TURNS_PER_SIDE - game.aiTurnsUsed;
  const remaining = game.board.length - eliminated.size;
  const selectedPlayer = game.board.find((p) => p.id === selectedId) || null;
  const questionsByCategory = CATEGORY_ORDER.map((c) => ({
    c,
    list: game.questions.filter((q) => q.category === c),
  })).filter((x) => x.list.length > 0);
  const activeCategory = questionsByCategory.some((x) => x.c === category)
    ? category
    : questionsByCategory[0]?.c;
  const answerOf = (questionId: string) =>
    game.log.find(
      (e) =>
        e.kind === "QUESTION" &&
        e.side === "USER" &&
        e.questionId === questionId,
    ) as Extract<SafiLogEntry, { kind: "QUESTION" }> | undefined;
  const timerPct = Math.max(0, Math.min(100, (timeLeft / turnDuration) * 100));
  const urgent = timeLeft <= 5;

  const statusText = isMyTurn
    ? "🟢 دورك — اسأل سؤال أو خمّن لاعب الخصم"
    : isFinal
      ? "🏁 التخمين النهائي — اختار أقرب لاعب للاعب الخصم السري"
      : game.phase === "AI"
        ? "🤖 دور الخصم... بيفكر"
        : "⏱️ انتهت المباراة";

  return (
    <ActiveGameShell
      user={me}
      gameTitle="اقف ف صفي عشان بصفي"
      backgroundUrl="/games/backgrounds/player-guess-bg.png"
      roundInfo={`دورك ${Math.min(game.userTurnsUsed + (isMyTurn ? 1 : 0), SAFI_TURNS_PER_SIDE)}/${SAFI_TURNS_PER_SIDE}`}
      onWithdraw={() => setWithdrew(true)}
    >
      <div className="max-w-5xl mx-auto space-y-3 py-3 px-2.5 select-none">
        {/* شريط اختيار مدة الدور */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black text-amber-300">
            ⏱️ مدة التفكير لكل دور:
          </span>
          <div className="flex flex-wrap gap-1">
            {[10, 15, 20, 25, 30, 35, 40].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  audioManager.playClick();
                  setTurnDuration(sec as 5 | 10 | 15 | 20 | 25 | 30 | 35);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  turnDuration === sec
                    ? "bg-amber-500 text-black font-black shadow-md scale-105"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                {sec} ث
              </button>
            ))}
          </div>
        </div>

        {/* الحالة + العدّاد */}
        <div
          className={`rounded-2xl border p-3 space-y-2 bg-zinc-900/90 ${isMyTurn || isFinal ? (urgent ? "border-rose-500" : "border-emerald-500/60") : "border-zinc-800"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-black text-white leading-snug">
              {statusText}
            </div>
            {(isMyTurn || isFinal) && (
              <div
                className={`flex items-center gap-1 font-mono font-black text-lg ${urgent ? "text-rose-400 animate-pulse" : "text-amber-300"}`}
              >
                <Clock className="w-4 h-4" />
                {timeLeft}s
              </div>
            )}
          </div>
          {(isMyTurn || isFinal) && (
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${urgent ? "bg-rose-500" : "bg-emerald-400"}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
            <div className="rounded-xl bg-zinc-950/80 border border-amber-400/30 px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-amber-300">أدوارك</span>
              <span className="text-white font-mono">
                {userTurnsLeft} متبقي
              </span>
            </div>
            <div className="rounded-xl bg-zinc-950/80 border border-blue-400/30 px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-blue-300">أدوار الخصم</span>
              <span className="text-white font-mono">{aiTurnsLeft} متبقي</span>
            </div>
          </div>
        </div>

        {/* لاعبك السري */}
        <div className="flex items-center gap-3 bg-zinc-950/80 border border-amber-400/40 p-2.5 rounded-2xl">
          <div className="w-11 h-14 rounded-xl overflow-hidden bg-zinc-900 border border-amber-400/50 flex-shrink-0">
            <img
              src={game.userSecret.photoUrl}
              alt={game.userSecret.nameAr}
              className="w-full h-full object-contain object-center"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-amber-400 font-bold">
              لاعبك السري (الخصم بيحاول يخمنه):
            </div>
            <div className="text-sm font-black text-white truncate">
              {game.userSecret.nameAr}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono truncate">
              {game.userSecret.position} • {game.userSecret.nationalityAr} •{" "}
              {game.userSecret.clubAr}
            </div>
          </div>
        </div>

        {/* اللوحة الثابتة */}
        <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-3xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-zinc-300">
              دوس على كارت لاختياره — ✖ للاستبعاد
            </span>
            <span className="text-amber-400 font-mono">
              المتبقي {remaining}/{game.board.length}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {game.board.map((p) => {
              const isElim = eliminated.has(p.id);
              const wrong = game.wrongUserGuesses.includes(p.id);
              const isSel = selectedId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (game.phase === "DONE" || wrong) return;
                    audioManager.playClick();
                    setSelectedId((cur) => (cur === p.id ? null : p.id));
                  }}
                  className={`relative rounded-2xl border p-1.5 flex flex-col items-center text-center transition-colors duration-200 cursor-pointer ${
                    wrong
                      ? "bg-rose-950/40 border-rose-700/60 opacity-50"
                      : isElim
                        ? "bg-zinc-950/40 border-zinc-800/40 opacity-30 grayscale"
                        : isSel
                          ? "bg-amber-950/40 border-amber-400 ring-2 ring-amber-400"
                          : "bg-zinc-900/90 border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  {!wrong && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEliminate(p.id);
                      }}
                      title={isElim ? "إلغاء الاستبعاد" : "استبعاد اللاعب"}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 z-10"
                    >
                      {isElim ? "↩" : "✖"}
                    </button>
                  )}
                  {wrong && (
                    <div className="absolute top-1 right-1 text-[10px] z-10">
                      ❌
                    </div>
                  )}
                  <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 mb-1">
                    <img
                      src={p.photoUrl}
                      alt={p.nameAr}
                      className="w-full h-full object-contain object-center"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="w-full">
                    <div className="text-[11px] font-black text-white truncate">
                      {p.nameAr}
                    </div>
                    <div className="text-[9px] text-zinc-400 font-mono">
                      {p.position} • {p.overallRating}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* شريط التخمين */}
          {selectedPlayer && (isMyTurn || isFinal) && (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-400/60 bg-amber-950/30 p-2.5">
              <div className="min-w-0 text-xs font-black text-amber-200 truncate">
                {isFinal ? "تخمينك النهائي:" : "تخمين:"} {selectedPlayer.nameAr}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleGuess}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black text-xs flex items-center gap-1"
                >
                  <Target className="w-3.5 h-3.5" />
                  {isFinal ? "ثبّت التخمين" : "خمّن (بياخد دورك)"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-200 font-black text-xs"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>

        {/* الأسئلة */}
        <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-3xl space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>اسأل عن لاعب الخصم السري</span>
          </div>
          {!isMyTurn ? (
            <div className="text-center text-xs text-zinc-400 py-3">
              {isFinal
                ? "الأسئلة خلصت — ثبّت تخمينك النهائي من اللوحة."
                : game.phase === "DONE"
                  ? "المباراة خلصت."
                  : "استنى دورك... تقدر تستبعد كروت في الوقت ده."}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {questionsByCategory.map(({ c }) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${activeCategory === c ? "bg-amber-500 text-zinc-950 border-amber-400" : "bg-zinc-900 text-zinc-300 border-zinc-700"}`}
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                {(
                  questionsByCategory.find((x) => x.c === activeCategory)
                    ?.list ?? []
                ).map((q) => {
                  const asked = game.askedByUser.includes(q.id);
                  const ans = asked ? answerOf(q.id) : undefined;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      disabled={asked}
                      onClick={() => handleAsk(q.id)}
                      className={`text-right px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                        asked
                          ? "bg-zinc-900/60 border-zinc-800 text-zinc-500"
                          : "bg-zinc-900 border-zinc-700 text-white hover:border-amber-400 active:scale-[0.99]"
                      }`}
                    >
                      {q.textAr}
                      {ans && (
                        <span className="mr-2">
                          {ans.answer ? "✅ نعم" : "❌ لا"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* السجل */}
        <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-3xl space-y-2">
          <div className="text-sm font-black text-white">سجل الأسئلة</div>
          {game.log.length === 0 ? (
            <div className="text-center py-4 text-zinc-500 text-xs">
              لسه محدش سأل. ابدأ بسؤال!
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
              {game.log
                .map((e, i) => ({ e, key: `log-${i}` }))
                .reverse()
                .map(({ e, key }) => {
                  if (e.kind === "QUESTION") {
                    const mine = e.side === "USER";
                    return (
                      <div
                        key={key}
                        className={`rounded-xl border p-2 text-xs ${mine ? "bg-zinc-900/90 border-amber-500/30" : "bg-zinc-900/60 border-blue-500/30"}`}
                      >
                        <div
                          className={`font-black ${mine ? "text-amber-300" : "text-blue-300"}`}
                        >
                          {mine ? "❓ سؤالك:" : "🤖 الخصم سأل عن لاعبك:"}{" "}
                          {e.textAr}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-black text-zinc-100">
                            {e.answer ? "✅ نعم" : "❌ لا"}
                          </span>
                          {mine &&
                            !appliedQuestions.has(key) &&
                            game.phase !== "DONE" && (
                              <button
                                type="button"
                                onClick={() => autoEliminate(e, key)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 text-[11px] font-black"
                              >
                                <Scissors className="w-3 h-3" /> صفّي تلقائيًا
                              </button>
                            )}
                        </div>
                      </div>
                    );
                  }
                  if (e.kind === "GUESS") {
                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-2 text-xs font-bold text-zinc-200"
                      >
                        {e.side === "USER" ? "🎯 خمنت" : "🤖 الخصم خمّن"} «
                        {e.playerName}» — {e.correct ? "✅ صح!" : "❌ غلط"}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-2 text-xs font-bold text-zinc-400"
                    >
                      ⏱️{" "}
                      {e.side === "USER"
                        ? "الوقت خلص وضاع دورك"
                        : "الخصم ضيّع دوره"}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* نتيجة المباراة */}
      {showResult && game.outcome && (
        <ResultOverlay game={game} onBack={onBack} />
      )}
    </ActiveGameShell>
  );
};

// ------------------------------------------------------------
// شاشة النتيجة: يتكشف لاعب كل طرف، ونسبة التشابه للأقرب
// ------------------------------------------------------------

const SimilarityBar: React.FC<{ value: number; winner: boolean }> = ({
  value,
  winner,
}) => (
  <div className="w-full">
    <div className="flex items-center justify-between text-[10px] font-black mb-0.5">
      <span className="text-zinc-400">نسبة القرب</span>
      <span className={winner ? "text-emerald-300" : "text-zinc-200"}>
        {value}%
      </span>
    </div>
    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
      <div
        className={`h-full ${winner ? "bg-emerald-400" : "bg-zinc-500"}`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const GuessChip: React.FC<{
  label: string;
  player?: FootballPlayer;
  similarity: number;
  winner: boolean;
  correct: boolean;
}> = ({ label, player, similarity, winner, correct }) => (
  <div className="w-36 space-y-1.5">
    <div className="text-[10px] font-black text-zinc-400 text-center">
      {label}
    </div>
    {player ? (
      <>
        <div
          className={`flex items-center gap-1.5 rounded-xl border p-1.5 ${correct ? "border-emerald-400/70 bg-emerald-950/30" : "border-zinc-700 bg-zinc-900/80"}`}
        >
          <div className="w-8 h-10 rounded-lg overflow-hidden bg-zinc-950 flex-shrink-0">
            <img
              src={player.photoUrl}
              alt={player.nameAr}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-[11px] font-black text-white leading-tight break-words min-w-0">
            {player.nameAr}
          </div>
        </div>
        <SimilarityBar value={similarity} winner={winner} />
      </>
    ) : (
      <div className="text-center text-[11px] text-zinc-500 py-2">
        مفيش تخمين نهائي
      </div>
    )}
  </div>
);

const ResultOverlay: React.FC<{
  game: SafiState;
  onBack: (result?: "WIN" | "LOSE" | "DRAW") => void;
}> = ({ game, onBack }) => {
  const o = game.outcome!;
  const won = o.winner === "USER";
  const draw = o.winner === "DRAW";
  const title = draw ? "🤝 تعادل!" : won ? "🎉 كسبت!" : "❌ خسرت المباراة";
  const reasonText =
    o.reason === "EXACT"
      ? won
        ? "خمّنت لاعب الخصم السري صح!"
        : "الخصم خمّن لاعبك السري صح."
      : o.reason === "BOTH_EXACT"
        ? "الاتنين خمّنوا صح في نفس الوقت."
        : o.reason === "CLOSEST"
          ? won
            ? "محدش خمّن صح — وتخمينك كان الأقرب للاعب السري."
            : "محدش خمّن صح — وتخمين الخصم كان الأقرب."
          : "نفس درجة القرب بالظبط.";
  const result: "WIN" | "LOSE" | "DRAW" = draw ? "DRAW" : won ? "WIN" : "LOSE";
  const userGuessCorrect = o.userGuess?.id === game.aiSecret.id;
  const aiGuessCorrect = o.aiGuess?.id === game.userSecret.id;

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-3">
        <div className="w-full max-w-md rounded-3xl border border-amber-400/40 bg-zinc-950 p-4 space-y-4 text-center shadow-2xl">
          <Trophy
            className={`w-12 h-12 mx-auto ${won ? "text-amber-400 animate-bounce" : "text-zinc-500"}`}
          />
          <div>
            <h2 className="text-2xl font-black text-white">{title}</h2>
            <p className="text-xs text-zinc-300 mt-1">{reasonText}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 justify-items-center">
            <div className="space-y-2 flex flex-col items-center">
              <div className="text-[11px] font-black text-blue-300">
                لاعب الخصم السري
              </div>
              <PlayerCard player={game.aiSecret} size="sm" transparent />
              <GuessChip
                label="تخمينك"
                player={o.userGuess}
                similarity={o.userSimilarity}
                winner={won}
                correct={userGuessCorrect}
              />
            </div>
            <div className="space-y-2 flex flex-col items-center">
              <div className="text-[11px] font-black text-amber-300">
                لاعبك السري
              </div>
              <PlayerCard player={game.userSecret} size="sm" transparent />
              <GuessChip
                label="تخمين الخصم"
                player={o.aiGuess}
                similarity={o.aiSimilarity}
                winner={o.winner === "AI"}
                correct={aiGuessCorrect}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onBack(result)}
            className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black text-sm shadow-xl"
          >
            العودة للألعاب
          </button>
        </div>
      </div>
    </div>
  );
};
