// ============================================================
// المواجهة | اسم اللاعب بإطار السوق — فتحة الإطار بتطابق الاسم بالظبط (مش أكبر ولا أصغر).
// ============================================================

import React from "react";
import { EquippedCosmetics } from "../types";
import { getMarketItem, useMarketCatalog } from "../services/marketCatalog";
import { useFrameFit } from "../services/frameFit";

interface PlayerCosmeticNameProps {
  name: string;
  equipped?: EquippedCosmetics;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** خصائص قديمة متروكة للتوافق */
  showTitle?: boolean;
  showBadge?: boolean;
  isOpponent?: boolean;
}

const SIZE = {
  xs: "text-[10px]",
  sm: "text-xs font-black",
  md: "text-sm sm:text-base font-black",
  lg: "text-base sm:text-lg font-black",
  xl: "text-xl sm:text-2xl font-black"
} as const;

export const PlayerCosmeticName: React.FC<PlayerCosmeticNameProps> = ({ name, equipped, className = "", size = "md" }) => {
  useMarketCatalog();
  const it = getMarketItem(equipped?.nameFrame);
  const frame = it && it.category === "NAME_FRAME" ? it : undefined;
  const fit = useFrameFit(frame?.imageUrl, 1);

  // فتحة الإطار الآمنة (مستطيل جواها بالكامل) — الاسم بيتحط جواها بالظبط.
  const box = fit && fit.detected && fit.inner ? fit.inner : null;

  return (
    <span className={`relative inline-flex max-w-full items-center justify-center ${frame ? "mx-4 my-3 px-3 py-1.5" : ""} ${className}`}>
      {frame && (
        <img
          src={frame.imageUrl}
          alt=""
          draggable={false}
          decoding="async"
          className="absolute pointer-events-none select-none max-w-none"
          style={
            box
              ? { width: `${box.widthPct}%`, height: `${box.heightPct}%`, left: `${box.leftPct}%`, top: `${box.topPct}%`, objectFit: "fill" }
              : { inset: "-25% -14%", width: "128%", height: "150%", objectFit: "fill" }
          }
        />
      )}
      <span className={`relative z-10 text-white tracking-wide whitespace-nowrap max-w-full overflow-hidden text-ellipsis ${SIZE[size]}`}>{name}</span>
    </span>
  );
};
