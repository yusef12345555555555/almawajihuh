// ============================================================
// المواجهة | AL MWAJHA — Versus / Confrontation Environment
//
// Two opposing energies clashing at the center — this IS the
// brand's core visual idea ("المواجهة" = the confrontation).
// Used for real-player matchmaking ready screens and match intros.
// ============================================================

import React from 'react';

export const VersusAtmosphereScene: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Left side energy (blue) */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-blue-600/15 via-blue-500/5 to-transparent" />
      {/* Right side energy (rose/gold) */}
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-rose-600/15 via-amber-500/5 to-transparent" />

      {/* Clash flash at the center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-white/10 blur-[80px] animate-stadium-pulse" />

      {/* Sharp diagonal "impact" lines radiating from center */}
      <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" width="500" height="500" viewBox="0 0 500 500">
        {[0, 30, 60, 90, 120, 150].map((angle) => (
          <line
            key={angle}
            x1="250" y1="250"
            x2={250 + 240 * Math.cos((angle * Math.PI) / 180)}
            y2={250 + 240 * Math.sin((angle * Math.PI) / 180)}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* Center "VS" glow ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-amber-400/40 shadow-[0_0_40px_rgba(245,158,11,0.35)]" />
    </div>
  );
};
