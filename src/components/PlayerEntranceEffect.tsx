// ============================================================
// المواجهة | AL MWAJHA — Player Entrance Cinematic Effect
// Displays an entrance animation for both players before a match
// ============================================================

import React, { useEffect, useRef, useState } from "react";
import { Swords, Sparkles, Trophy } from "lucide-react";
import { EquippedCosmetics } from "../types";
import { getMarketItem, useMarketCatalog } from "../services/marketCatalog";
import { PlayerCosmeticName } from "./PlayerCosmeticName";
import { PlayerAvatarBadge } from "./PlayerAvatarBadge";
import { audioManager } from "../services/audioManager";

interface PlayerEntranceEffectProps {
  playerName: string;
  playerAvatar: string;
  playerEquipped?: EquippedCosmetics;
  opponentName: string;
  opponentAvatar: string;
  opponentEquipped?: EquippedCosmetics;
  gameTitle?: string;
  onAnimationComplete: () => void;
  durationMs?: number;
}

export const PlayerEntranceEffect: React.FC<PlayerEntranceEffectProps> = ({
  playerName,
  playerAvatar,
  playerEquipped,
  opponentName,
  opponentAvatar,
  opponentEquipped,
  gameTitle = "ساحة المواجهة",
  onAnimationComplete,
  durationMs = 2800,
}) => {
  const [stage, setStage] = useState<"ENTRANCE" | "VS_CLASH" | "FADE_OUT">(
    "ENTRANCE",
  );

  useMarketCatalog();
  const playerEntrance = getMarketItem(playerEquipped?.entrance);
  const oppEntrance = getMarketItem(opponentEquipped?.entrance);

  const doneRef = useRef(onAnimationComplete);
  doneRef.current = onAnimationComplete;
  useEffect(() => {
    audioManager.playWhistle();

    const t1 = setTimeout(() => {
      setStage("VS_CLASH");
      audioManager.playBid();
    }, 1200);

    const t2 = setTimeout(() => {
      setStage("FADE_OUT");
    }, durationMs - 400);

    const t3 = setTimeout(() => {
      doneRef.current();
    }, durationMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [durationMs]);

  const p1EffectClass = "animate-in slide-in-from-right-12 duration-500";
  const p2EffectClass = "animate-in slide-in-from-left-12 duration-500";
  // صورة الدخلة (من السوق): تظهر خلف الصورة والاسم لصاحبها فقط
  const entranceImg = (it?: { imageUrl: string }) =>
    it ? (
      <img
        src={it.imageUrl}
        alt=""
        draggable={false}
        className="absolute -inset-8 w-[calc(100%+4rem)] h-[calc(100%+4rem)] object-contain pointer-events-none select-none animate-in zoom-in-50 fade-in duration-700"
      />
    ) : null;

  const particles = React.useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2.5 + Math.random() * 2,
        size: 3 + Math.random() * 5,
      })),
    [],
  );

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 overflow-hidden transition-opacity duration-300 ${stage === "FADE_OUT" ? "opacity-0" : "opacity-100"}`}
    >
      {/* Premium cinematic backdrop: radial glow + rising particles + sweeping light */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(245,158,11,0.08),transparent_35%)] animate-[spin_8s_linear_infinite]" />
        <div className="absolute -inset-x-1/2 top-0 h-full w-[200%] bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-[pulse_3s_ease-in-out_infinite]" />
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute bottom-0 rounded-full bg-amber-300/70 shadow-[0_0_8px_rgba(245,158,11,0.9)]"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `entranceFloatUp ${p.duration}s ease-in ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes entranceFloatUp {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(-110vh) scale(1.1); opacity: 0; }
        }
      `}</style>

      {/* Game Context */}
      <div className="relative z-10 mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black animate-pulse shadow-[0_0_25px_rgba(245,158,11,0.35)]">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span>{gameTitle}</span>
      </div>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 text-center">
        {/* Player 1 Card */}
        <div
          className={`relative p-6 rounded-3xl bg-zinc-950/90 border-2 border-amber-500/60 shadow-2xl flex flex-col items-center space-y-3 ${p1EffectClass}`}
        >
          {entranceImg(playerEntrance)}
          <div className="relative z-10">
            <PlayerAvatarBadge avatar={playerAvatar} size="xl" ring={false} equipped={playerEquipped} className="border-2 border-amber-400 shadow-xl" />
            <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-black">
              أنت
            </span>
          </div>

          <PlayerCosmeticName
            name={playerName}
            equipped={playerEquipped}
            size="lg"
            className="items-center"
          />
        </div>

        {/* VS Badge */}
        <div className="flex flex-col items-center justify-center">
          <div
            className={`w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-zinc-950 flex items-center justify-center font-black text-xl shadow-[0_0_40px_rgba(245,158,11,0.8)] ${stage === "VS_CLASH" ? "scale-125 animate-pulse" : "animate-bounce"} transition-transform duration-300`}
          >
            <Swords className="w-8 h-8" />
          </div>
          <span className="text-xs font-black text-amber-400 tracking-widest mt-2">
            VS
          </span>
        </div>

        {/* Player 2 / Opponent Card */}
        <div
          className={`relative p-6 rounded-3xl bg-zinc-950/90 border-2 border-blue-500/60 shadow-2xl flex flex-col items-center space-y-3 ${p2EffectClass}`}
        >
          {entranceImg(oppEntrance)}
          <div className="relative z-10">
            <PlayerAvatarBadge avatar={opponentAvatar} size="xl" ring={false} equipped={opponentEquipped} className="border-2 border-blue-400 shadow-xl" />
            <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black">
              المنافس
            </span>
          </div>

          <PlayerCosmeticName
            name={opponentName}
            equipped={opponentEquipped}
            size="lg"
            className="items-center"
            isOpponent
          />
        </div>
      </div>
    </div>
  );
};
