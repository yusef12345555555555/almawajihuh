// ============================================================
// العبها صح | EL3BHA SA7 — Game Entrance Gate
// Wraps ANY real 1v1 game (never the Coach modes) so that whatever entrance
// effect the player equipped from the Market actually plays before the game
// starts — instead of being bought and never shown, as it silently was before.
// ============================================================

import React, { useState } from "react";
import { UserProfile, EquippedCosmetics } from "../types";
import { PlayerEntranceEffect } from "./PlayerEntranceEffect";

const DEFAULT_OPPONENT_AVATAR = "av_bot";
const ENTRANCE_MS = 2800;

// حارس ضد تكرار الانترو: لو نفس اللعبة اتركّبت تاني (إعادة تركيب من React/تنقل) وهي لسه بتعرض الانترو
// أو خلّصته من أقل من 20 ثانية → نكمّل المتبقي بس أو نتخطاه بدل ما يبدأ من الأول.
const guard: { title: string; startedAt: number; finishedAt: number } = { title: "", startedAt: 0, finishedAt: 0 };

interface GameEntranceGateProps {
  user: UserProfile;
  gameTitle: string;
  opponentName?: string;
  opponentAvatar?: string;
  opponentEquipped?: EquippedCosmetics;
  children: React.ReactNode;
}

/** Shows the entrance cinematic once, then mounts the real game underneath it. */
export const GameEntranceGate: React.FC<GameEntranceGateProps> = ({
  user,
  gameTitle,
  opponentName = "فريق AI",
  opponentAvatar = DEFAULT_OPPONENT_AVATAR,
  opponentEquipped,
  children,
}) => {
  const [{ showEntrance, remaining }] = useState(() => {
    const now = Date.now();
    if (guard.title === gameTitle) {
      if (guard.finishedAt && now - guard.finishedAt < 20000) return { showEntrance: false, remaining: 0 };
      if (!guard.finishedAt && guard.startedAt && now - guard.startedAt < ENTRANCE_MS - 300) {
        return { showEntrance: true, remaining: ENTRANCE_MS - (now - guard.startedAt) };
      }
    }
    guard.title = gameTitle;
    guard.startedAt = now;
    guard.finishedAt = 0;
    return { showEntrance: true, remaining: ENTRANCE_MS };
  });
  const [show, setShowEntrance] = useState(showEntrance);

  if (show) {
    return (
      <PlayerEntranceEffect
        playerName={user.nameAr || user.username || "أنت"}
        playerAvatar={user.avatar}
        playerEquipped={user.equippedCosmetics}
        opponentName={opponentName}
        opponentAvatar={opponentAvatar}
        opponentEquipped={opponentEquipped}
        gameTitle={gameTitle}
        durationMs={Math.max(700, remaining)}
        onAnimationComplete={() => {
          guard.finishedAt = Date.now();
          setShowEntrance(false);
        }}
      />
    );
  }

  return <>{children}</>;
};
