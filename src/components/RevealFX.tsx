// ============================================================
// المواجهة | AL MWAJHA — Signature "Wow Moment" FX
//
// ADDITION ONLY. Two small, dependency-free effects used to make
// the two most emotional moments in every game — a card reveal
// and a match win — feel genuinely premium instead of a flat
// state swap. Pure CSS/SVG (see the FX keyframes in index.css),
// so there's zero bundle cost and it works instantly everywhere.
// ============================================================

import React, { useMemo } from 'react';

const RARITY_COLORS: Record<string, string> = {
  Icon: '#fbbf24',
  Legend: '#a78bfa',
  Elite: '#34d399',
  Normal: '#38bdf8',
  Rare: '#38bdf8'
};

/** A radial ring of light that bursts outward once, e.g. the instant a mystery box opens. */
export const RadialGlowBurst: React.FC<{ active: boolean; rarity?: string }> = ({ active, rarity = 'Rare' }) => {
  if (!active) return null;
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.Rare;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
      <div
        className="w-24 h-24 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}cc 0%, ${color}55 40%, transparent 70%)`,
          animation: 'radialBurstFX 0.7s ease-out forwards'
        }}
      />
    </div>
  );
};

/** Gold confetti rain + slowly rotating light rays behind a winner announcement. */
export const WinCelebrationFX: React.FC<{ active: boolean }> = ({ active }) => {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.2 + Math.random() * 1.6,
        drift: `${Math.round((Math.random() - 0.5) * 160)}px`,
        color: [
          '#fbbf24', // gold
          '#fde68a',
          '#34d399', // emerald
          '#818cf8', // indigo
          '#ffffff'
        ][i % 5],
        size: 6 + Math.round(Math.random() * 6)
      })),
    []
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {/* Rotating light rays */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vmax] h-[140vmax] opacity-40"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, rgba(251,191,36,0.25) 8deg, transparent 16deg, transparent 40deg, rgba(52,211,153,0.18) 48deg, transparent 56deg)',
          animation: 'rayRotateFX 16s linear infinite'
        }}
      />
      {/* Confetti */}
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              backgroundColor: p.color,
              '--drift': p.drift,
              animation: `confettiFallFX ${p.duration}s ease-in ${p.delay}s forwards`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
