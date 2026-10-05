// ============================================================
// المواجهة | AL MWAJHA - Visual Identity & Brand Engine
//
// THE MARK — "Ignition Crest":
// A struck ball tears in from the corner trailing a comet of
// sparks, and the same motion resolves into a checkmark as it
// lands — the ball (the game), the streak (the energy), and the
// tick (the "صح" — you played it RIGHT) fused into one gesture,
// set inside a faceted gold crest like a cut medal. Fully
// original geometry — no borrowed crests, no club marks.
// ============================================================

import React from 'react';

export type BrandLogoVariant = 'main' | 'icon' | 'splash' | 'monochrome' | 'badge' | 'compact';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  glow?: boolean;
  animated?: boolean;
}

const sizeMap = {
  sm: { box: 'w-8 h-8', text: 'text-sm', sub: 'text-[9px]', icon: 'w-6 h-6', tile: 'h-9 w-12' },
  md: { box: 'w-11 h-11', text: 'text-lg', sub: 'text-[10px]', icon: 'w-8 h-8', tile: 'h-11 w-14' },
  lg: { box: 'w-14 h-14', text: 'text-2xl', sub: 'text-xs', icon: 'w-10 h-10', tile: 'h-14 w-[4.6rem]' },
  xl: { box: 'w-20 h-20', text: 'text-3xl', sub: 'text-sm', icon: 'w-14 h-14', tile: 'h-20 w-[6.5rem]' },
  hero: { box: 'w-28 h-28', text: 'text-5xl', sub: 'text-base', icon: 'w-20 h-20', tile: 'h-28 w-36' }
};

/** الشعار الداخلي (فضي + أحمر) — بيظهر على الجنب جوه التطبيق (النافبار / القائمة الجانبية / القائمة السفلية). */
export const INNER_LOGO_SRC = '/brand/logo-main.png';
/** شعار الانترو (كورة + تاج ذهبي) — بيظهر في الانترو وشاشة البداية. */
export const INTRO_LOGO_SRC = '/brand/logo-main.png';

const InnerEmblem: React.FC<{ tileClass: string; glow?: boolean; className?: string }> = ({ tileClass, glow = true, className = '' }) => (
  <div
    className={`relative shrink-0 overflow-hidden rounded-xl bg-[#0b1220] ring-1 ring-white/15 ${
      glow ? 'shadow-[0_0_22px_rgba(37,99,235,0.28),0_0_22px_rgba(245,158,11,0.28)]' : ''
    } ${tileClass} ${className}`}
  >
    <img
      src={INNER_LOGO_SRC}
      alt="شعار المواجهة"
      draggable={false}
      className="absolute inset-0 h-full w-full object-contain object-center select-none"
    />
  </div>
);

/**
 * The mark itself — faceted crest, struck ball, comet trail and
 * checkmark flick — as pure SVG so it scales cleanly everywhere
 * the brand appears (header, splash, launcher icon, favicon).
 */
const IgnitionCrestGlyph: React.FC<{ mono?: boolean; animated?: boolean }> = ({ mono = false, animated = false }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="crestBezel" x1="12" y1="12" x2="108" y2="108" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef3c7" />
        <stop offset="0.35" stopColor="#f59e0b" />
        <stop offset="0.7" stopColor="#d97706" />
        <stop offset="1" stopColor="#7c3d0a" />
      </linearGradient>
      <linearGradient id="crestBall" x1="42" y1="34" x2="82" y2="74" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fde68a" />
        <stop offset="0.5" stopColor="#f59e0b" />
        <stop offset="1" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="crestTrail" x1="8" y1="96" x2="60" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fbbf24" stopOpacity="0" />
        <stop offset="1" stopColor="#fde68a" />
      </linearGradient>
      <radialGradient id="crestFloodlight" cx="0.5" cy="0.32" r="0.75">
        <stop offset="0%" stopColor="#3a2408" />
        <stop offset="100%" stopColor="#0a0704" />
      </radialGradient>
      <radialGradient id="crestBurst" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
        <stop offset="60%" stopColor="#34d399" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Ambient impact bloom */}
    {!mono && <circle cx="60" cy="60" r="58" fill="url(#crestBurst)" />}

    {/* Outer faceted bezel (cut-medal edge) */}
    <polygon
      points="108,79.9 79.9,108 40.1,108 12,79.9 12,40.1 40.1,12 79.9,12 108,40.1"
      fill={mono ? 'none' : 'url(#crestBezel)'}
      stroke={mono ? 'currentColor' : '#7c3d0a'}
      strokeWidth="1.5"
    />
    {/* Bevel highlight sweep across the top facets */}
    {!mono && (
      <polygon points="79.9,12 108,40.1 96,40.1 74,18" fill="#fff7e0" opacity="0.35" />
    )}

    {/* Inner dark stadium disc */}
    <polygon
      points="102.5,77.6 77.6,102.5 42.4,102.5 17.5,77.6 17.5,42.4 42.4,17.5 77.6,17.5 102.5,42.4"
      fill={mono ? 'none' : 'url(#crestFloodlight)'}
      stroke={mono ? 'currentColor' : '#3a2408'}
      strokeWidth="1"
    />

    {/* Comet trail feeding the strike */}
    <g strokeLinecap="round" fill="none">
      <path d="M14 96 Q34 86 45 71" stroke={mono ? 'currentColor' : 'url(#crestTrail)'} strokeWidth="6" opacity={mono ? 0.25 : 0.9} />
      <path d="M10 88 Q30 80 43 65" stroke={mono ? 'currentColor' : 'url(#crestTrail)'} strokeWidth="4" opacity={mono ? 0.18 : 0.55} />
      <path d="M8 80 Q26 74 41 60" stroke={mono ? 'currentColor' : 'url(#crestTrail)'} strokeWidth="2.5" opacity={mono ? 0.12 : 0.32} />
    </g>
    {!mono && (
      <g fill="#fde68a">
        <circle cx="21" cy="90" r="1.7" opacity="0.85" />
        <circle cx="30" cy="81" r="1.3" opacity="0.6" />
        <circle cx="14" cy="76" r="1.1" opacity="0.5" />
      </g>
    )}

    {/* The struck ball */}
    <g>
      <circle cx="60" cy="56" r="18" fill={mono ? 'currentColor' : 'url(#crestBall)'} />
      {!mono && (
        <>
          <ellipse cx="53" cy="49" rx="5.5" ry="3" fill="#fff7e0" opacity="0.4" transform="rotate(-28 53 49)" />
          <g stroke="#7c3d0a" strokeWidth="1.3" opacity="0.4" fill="none" strokeLinecap="round">
            <path d="M47 46 Q60 56 49 66" />
            <path d="M73 46 Q60 56 71 66" />
            <path d="M56 39 Q60 56 64 73" />
          </g>
        </>
      )}
    </g>

    {/* Checkmark flick — the "صح" resolving out of the strike */}
    <path
      d="M69 60 L76 69 L93 46"
      stroke={mono ? 'currentColor' : '#fff7e0'}
      strokeWidth="6.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={animated ? 'animate-holo-shimmer' : ''}
    />
  </svg>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'main',
  size = 'md',
  className = '',
  glow = true,
  animated = false
}) => {
  const s = sizeMap[size];

  // 1. App Icon / Pure Emblem — for the badge, launcher icon, favicon
  if (variant === 'icon' || variant === 'badge' || variant === 'compact') {
    return <InnerEmblem tileClass={s.tile} glow={glow} className={className} />;
  }

  // 2. Monochrome Variant — print, watermark, dark-on-light contexts
  if (variant === 'monochrome') {
    return (
      <div className={`flex items-center gap-3 select-none text-white ${className}`}>
        <div className={`${s.box} overflow-hidden rounded-xl ring-1 ring-white/10`}>
          <img src={INNER_LOGO_SRC} alt="شعار المواجهة" draggable={false} className="h-full w-full object-contain" />
        </div>
        <div>
          <div className={`font-black tracking-tight text-white ${s.text}`}>المواجهة</div>
          <div className={`text-white/60 font-mono tracking-widest uppercase ${s.sub}`}>AL MWAJHA</div>
        </div>
      </div>
    );
  }

  // 3. Full Splash Logo — الشعار الذهبي (كورة + تاج) بيظهر في الانترو / شاشة البداية
  if (variant === 'splash') {
    return (
      <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
        <div className="relative">
          <div className="absolute -inset-8 rounded-full blur-3xl opacity-50 animate-pulse" style={{ background: 'var(--gradient-aurora)' }} />
          <img
            src={INTRO_LOGO_SRC}
            alt="المواجهة"
            draggable={false}
            className="relative w-64 sm:w-80 max-w-[80vw] h-auto rounded-3xl"
          />
        </div>
      </div>
    );
  }

  // 4. Main Standard Brand Header Logo (default)
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <InnerEmblem tileClass={s.tile} glow={glow} />

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`font-black tracking-tight text-white hover:text-amber-400 transition-colors ${s.text}`}>
            المواجهة
          </span>
        </div>
        <span className={`font-mono text-zinc-400 tracking-wider font-semibold ${s.sub}`}>AL MWAJHA</span>
      </div>
    </div>
  );
};
