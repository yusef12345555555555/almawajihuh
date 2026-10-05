// ============================================================
// العبها صح | EL3BHA SA7 - Cinematic Tournament Bracket & Details View
// Left/Right Branches, Center Final Stage, Real-Time Sync & Fast Simulation
// ============================================================

import React, { useState, useEffect } from "react";
import {
  Trophy,
  Crown,
  Swords,
  Users,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Shield,
  Play,
  Share2,
  Lock,
  Flame,
  AlertCircle,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { UserProfile } from "../types";
import {
  TournamentEntity,
  TournamentMatchSlot,
  TournamentParticipant,
} from "../types/tournamentTypes";
import { TournamentEngineService } from "../services/tournamentEngineService";
import { audioManager } from "../services/audioManager";
import confetti from "canvas-confetti";

interface TournamentDetailsBracketViewProps {
  tournament: TournamentEntity;
  user: UserProfile;
  onBack: () => void;
  onEnterMatch: (match: TournamentMatchSlot) => void;
  onTournamentUpdated: (tournament: TournamentEntity) => void;
}

export const TournamentDetailsBracketView: React.FC<
  TournamentDetailsBracketViewProps
> = ({
  tournament: initialTournament,
  user,
  onBack,
  onEnterMatch,
  onTournamentUpdated,
}) => {
  const [tournament, setTournament] =
    useState<TournamentEntity>(initialTournament);
  const [fillLoading, setFillLoading] = useState<boolean>(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] =
    useState<boolean>(false);

  // Sync tournament changes
  useEffect(() => {
    const unsub = TournamentEngineService.subscribe((event) => {
      if (
        event.type === "TOURNAMENT_UPDATED" ||
        event.type === "TOURNAMENT_FULL" ||
        event.type === "TOURNAMENT_MATCH_FINISHED" ||
        event.type === "CHAMPION_DECLARED"
      ) {
        const fresh = TournamentEngineService.getTournamentById(tournament.id);
        if (fresh) {
          setTournament(fresh);
          onTournamentUpdated(fresh);
        }
      }
    });
    return () => unsub();
  }, [tournament.id, onTournamentUpdated]);

  // Fast Test Fill: Fill Remaining with Simulated Participants to complete 8/8 and test the Bracket
  const handleFastFillAndStart = () => {
    setFillLoading(true);
    audioManager.playWhistle();
    setTimeout(() => {
      const updated =
        TournamentEngineService.fillTournamentWithSimulatedParticipants(
          tournament.id,
        );
      if (updated) {
        setTournament(updated);
        onTournamentUpdated(updated);
      }
      setFillLoading(false);
    }, 400);
  };

  const isUserParticipant = tournament.participants.some(
    (p) => p.id === user.id && !p.isWithdrawn,
  );

  const handleWithdraw = () => {
    audioManager.playClick();
    setShowWithdrawConfirm(true);
  };

  const handleConfirmWithdrawAction = () => {
    setShowWithdrawConfirm(false);
    audioManager.playWhistle();
    const res = TournamentEngineService.withdrawFromTournament(
      tournament.id,
      user.id,
    );
    if (res.tournament) {
      setTournament(res.tournament);
      onTournamentUpdated(res.tournament);
    }
  };

  // Generic per-round grouping so the bracket renders correctly no matter
  // the capacity (4/8/16/32) instead of assuming a fixed quarter/semi/final
  // depth. Each branch column just lists its rounds in order; every match
  // already carries its own round label (roundNameAr) from the engine.
  const leftBranchRounds = Array.from(
    new Set(
      tournament.matches.filter((m) => m.branch === "LEFT").map((m) => m.round),
    ),
  ).sort((a, b) => a - b);
  const rightBranchRounds = Array.from(
    new Set(
      tournament.matches.filter((m) => m.branch === "RIGHT").map((m) => m.round),
    ),
  ).sort((a, b) => a - b);
  const grandFinalMatch = tournament.matches.find(
    (m) => !m.nextMatchId || m.id.endsWith("_final") || m.branch === "FINAL",
  );
  const userCurrentMatch = tournament.matches.find(
    (m) =>
      (m.homeParticipant?.id === user.id ||
        m.awayParticipant?.id === user.id) &&
      (m.status === "READY_TO_START" || m.status === "PLAYING"),
  );

  // Render a Single Match Box in the Bracket
  const renderMatchCard = (m?: TournamentMatchSlot) => {
    if (!m) {
      return (
        <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-center text-xs text-zinc-600">
          في انتظار تحديد المتأهلين...
        </div>
      );
    }

    const isUserInThisMatch =
      m.homeParticipant?.id === user.id || m.awayParticipant?.id === user.id;
    const isReadyToPlay =
      m.status === "READY_TO_START" || m.status === "PLAYING";
    const isFinished = m.status === "FINISHED";

    return (
      <div
        className={`p-3.5 rounded-2xl border-2 transition-all space-y-2 relative ${
          isFinished
            ? "bg-zinc-950/80 border-zinc-800"
            : isUserInThisMatch
              ? "bg-amber-500/15 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/30"
              : isReadyToPlay
                ? "bg-zinc-900 border-zinc-700"
                : "bg-zinc-950/60 border-zinc-800/80 opacity-75"
        }`}
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 border-b border-zinc-800/60 pb-1.5">
          <span>{m.roundNameAr}</span>
          {isFinished ? (
            <span className="text-emerald-400">انتهت</span>
          ) : isReadyToPlay ? (
            <span className="text-amber-400 animate-pulse">جاهزة للعب ⚡</span>
          ) : (
            <span className="text-zinc-500">مجدولة</span>
          )}
        </div>

        {/* Participant 1 */}
        <div
          className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
            m.winnerId && m.winnerId === m.homeParticipant?.id
              ? "bg-amber-500/20 text-amber-300 font-black border border-amber-500/40"
              : m.loserId && m.loserId === m.homeParticipant?.id
                ? "line-through opacity-40 text-zinc-500"
                : "text-white"
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {m.homeParticipant ? (
              <>
                <img
                  src={m.homeParticipant.avatar}
                  alt={m.homeParticipant.name}
                  className="w-5 h-5 rounded-full object-cover border border-zinc-700"
                />
                <span className="truncate">{m.homeParticipant.name}</span>
                {m.homeParticipant.id === user.id && (
                  <span className="px-1.5 py-0.2 bg-amber-400 text-zinc-950 rounded text-[9px] font-black">
                    أنت
                  </span>
                )}
              </>
            ) : (
              <span className="text-zinc-600 italic">في الانتظار...</span>
            )}
          </div>
          <span className="font-black">
            {m.homeScore !== null && m.homeScore !== undefined
              ? m.homeScore
              : "-"}
          </span>
        </div>

        {/* Participant 2 */}
        <div
          className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
            m.winnerId && m.winnerId === m.awayParticipant?.id
              ? "bg-amber-500/20 text-amber-300 font-black border border-amber-500/40"
              : m.loserId && m.loserId === m.awayParticipant?.id
                ? "line-through opacity-40 text-zinc-500"
                : "text-white"
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {m.awayParticipant ? (
              <>
                <img
                  src={m.awayParticipant.avatar}
                  alt={m.awayParticipant.name}
                  className="w-5 h-5 rounded-full object-cover border border-zinc-700"
                />
                <span className="truncate">{m.awayParticipant.name}</span>
                {m.awayParticipant.id === user.id && (
                  <span className="px-1.5 py-0.2 bg-amber-400 text-zinc-950 rounded text-[9px] font-black">
                    أنت
                  </span>
                )}
              </>
            ) : (
              <span className="text-zinc-600 italic">في الانتظار...</span>
            )}
          </div>
          <span className="font-black">
            {m.awayScore !== null && m.awayScore !== undefined
              ? m.awayScore
              : "-"}
          </span>
        </div>

        {/* Action Button for User */}
        {!isFinished && isReadyToPlay && (
          <button
            onClick={() => onEnterMatch(m)}
            className={`w-full py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${
              isUserInThisMatch
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-md hover:brightness-110"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {isUserInThisMatch ? "دخول غرفتك والتأكيد 🚀" : "مشاهدة المواجهة"}
            </span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 text-white">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 surface-aurora">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 text-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black">
                {tournament.status === "FINISHED"
                  ? "🏆 منتهية"
                  : "⚡ جارية دلوقتي"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black">
                {tournament.type === "INDIVIDUAL" ? "فردية" : "فرق (Team)"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              {tournament.name}
            </h2>
            <p className="text-xs text-zinc-400">
              اللعبة:{" "}
              <strong className="text-emerald-400">
                {tournament.gameNameAr}
              </strong>{" "}
              • النمط:{" "}
              <strong className="text-amber-300">
                {tournament.gameModeLabelAr}
              </strong>{" "}
              • المنظم: {tournament.creatorName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <span className="text-[11px] text-zinc-400 block">
              جائزة المركز الأول:
            </span>
            <span className="text-sm font-black text-amber-400">
              {tournament.prizePoolCoins.toLocaleString()} كوينز + 100 نقطة 🏆
            </span>
          </div>

          {isUserParticipant && tournament.status !== "FINISHED" && (
            <button
              onClick={handleWithdraw}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 rotate-180" />
              <span>الانسحاب من البطولة</span>
            </button>
          )}

          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
          >
            العودة للبطولات
          </button>
        </div>
      </div>

      {/* User Match Notification Banner (If user has a pending/ready match) */}
      {userCurrentMatch && (
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-4 rounded-2xl text-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-amber-400 flex items-center justify-center font-black">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black">
                عندك مواجهة رسمية في {userCurrentMatch.roundNameAr}!
              </h4>
              <p className="text-xs font-bold opacity-80">
                المنافس:{" "}
                {userCurrentMatch.homeParticipant?.id === user.id
                  ? userCurrentMatch.awayParticipant?.name
                  : userCurrentMatch.homeParticipant?.name}{" "}
                • ادخل الغرفة لتأكيد جاهزيتك.
              </p>
            </div>
          </div>

          <button
            onClick={() => onEnterMatch(userCurrentMatch)}
            className="px-6 py-2.5 rounded-xl bg-black hover:bg-zinc-900 text-amber-400 font-black text-xs shadow-lg transition-all"
          >
            دخول غرفة المباراة دلوقتي 🚀
          </button>
        </div>
      )}

      {/* CHAMPION HERO BANNER IF FINISHED */}
      {tournament.status === "FINISHED" && tournament.champion && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950 via-zinc-950 to-amber-950 p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.4)] space-y-4 surface-aurora">
          <Crown className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
          <span className="px-4 py-1 rounded-full bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider">
            بطل البطولة الرسمي 🏆
          </span>
          <h3 className="text-3xl font-black text-white">
            {tournament.champion.name}
          </h3>
          <p className="text-sm text-zinc-300 max-w-md mx-auto">
            تُوّج بطلاً لكأس {tournament.name} بعد اجتياز كل الأدوار الإقصائية
            في {tournament.gameNameAr}.
          </p>
        </div>
      )}

      {/* If Registration is Still Open (Need to Fill Remaining Slots) */}
      {tournament.status === "OPEN" && tournament.matches.length === 0 && (
        <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 text-center space-y-4">
          <h3 className="text-lg font-black text-white">
            المشتركون الحاليون: {tournament.participants.length} من{" "}
            {tournament.capacity}
          </h3>
          <p className="text-xs text-zinc-400">
            القرعة الإقصائية الثابتة ستبدأ وتُقفل فور اكتمال المقاعد.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleFastFillAndStart}
              disabled={fillLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-black text-xs shadow-lg hover:brightness-110 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {fillLoading
                  ? "جاري السحب..."
                  : "إكمال المقاعد وانطلاق القرعة على طول ⚡"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Symmetrical Cinematic Knockout Bracket (Left Side - Center Final - Right Side) */}
      {tournament.matches.length > 0 && (
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>جدول الأدوار الإقصائية (Knockout Bracket)</span>
            </h3>
            <span className="text-xs text-zinc-500">
              مسار تأهيلي ثابت وغير عشوائي
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* LEFT BRANCH — every round of this branch, earliest first */}
            <div className="space-y-4">
              <div className="text-center text-xs font-bold text-amber-400/80 bg-zinc-900/60 py-1 rounded-lg">
                ⬅️ الفرع الأيسر (Left Branch)
              </div>
              {leftBranchRounds.map((r) => (
                <div key={r} className="space-y-3">
                  {tournament.matches
                    .filter((m) => m.branch === "LEFT" && m.round === r)
                    .map((m) => (
                      <div key={m.id}>{renderMatchCard(m)}</div>
                    ))}
                </div>
              ))}
            </div>

            {/* CENTER STAGE: GRAND FINAL & CHAMPION */}
            <div className="bg-gradient-to-b from-amber-500/10 via-zinc-900/90 to-amber-500/10 border-2 border-amber-500/50 rounded-3xl p-4 sm:p-6 text-center space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center mx-auto font-black shadow-lg">
                <Crown className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-base font-black text-amber-400">
                  النهائي الكبير على الكأس 🏆
                </h4>
                <p className="text-[11px] text-zinc-400">
                  بطل الفرع الأيسر VS بطل الفرع الأيمن
                </p>
              </div>

              {renderMatchCard(grandFinalMatch)}

              {tournament.champion && (
                <div className="p-3 bg-amber-400/20 border border-amber-400/50 rounded-2xl text-xs font-black text-amber-300">
                  🎉 البطل المتوج: {tournament.champion.name}
                </div>
              )}
            </div>

            {/* RIGHT BRANCH — every round of this branch, earliest first */}
            <div className="space-y-4">
              <div className="text-center text-xs font-bold text-purple-400/80 bg-zinc-900/60 py-1 rounded-lg">
                الفرع الأيمن (Right Branch) ➡️
              </div>
              {rightBranchRounds.map((r) => (
                <div key={r} className="space-y-3">
                  {tournament.matches
                    .filter((m) => m.branch === "RIGHT" && m.round === r)
                    .map((m) => (
                      <div key={m.id}>{renderMatchCard(m)}</div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tournament Withdrawal Confirmation Modal */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-rose-500/70 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                هل أنت متأكد من الانسحاب من البطولة؟
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                سيتم تسجيل انسحابك من الكأس واعتبار المنافس فائزاً بالتزكية في
                مواجهتك، بينما{" "}
                <strong className="text-amber-400">
                  تستمر البطولة وباقي المباريات بين سائر المشتركين بشكل طبيعي
                  حتى التتويج النهائي
                </strong>
                .
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleConfirmWithdrawAction}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm transition-all shadow-lg cursor-pointer"
              >
                تأكيد الانسحاب والخروج
              </button>

              <button
                onClick={() => setShowWithdrawConfirm(false)}
                className="py-3 px-5 rounded-2xl bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
              >
                البقاء في البطولة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
