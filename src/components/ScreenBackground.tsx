// ============================================================
// العبها صح | EL3BHA SA7 - Immersive Screen Background System
// ============================================================

import React, { useEffect } from 'react';
import { audioManager } from '../services/audioManager';
import { VersusAtmosphereScene } from './scenes/VersusAtmosphereScene';

export type ScreenAtmosphere =
  | 'home'
  | 'games'
  | 'game_details'
  | 'auction'
  | 'deal_or_no_deal'
  | 'hidden_player'
  | 'safi'
  | 'truth_or_lie'
  | 'judge'
  | 'coach_challenge'
  | 'squad'
  | 'match'
  | 'result_win'
  | 'result_loss'
  | 'ranking'
  | 'profile'
  | 'tournament'
  | 'rooms_public'
  | 'rooms_private'
  | 'versus_lobby';

interface ScreenBackgroundProps {
  atmosphere: ScreenAtmosphere;
  children: React.ReactNode;
  showParticles?: boolean;
  intensity?: 'subtle' | 'medium' | 'high';
  className?: string;
}

const GAME_BACKGROUND_BY_ATMOSPHERE: Partial<Record<ScreenAtmosphere, string>> = {
  auction: '/games/backgrounds/auction-bg.png',
  hidden_player: '/games/backgrounds/hidden-player-bg.png',
  safi: '/games/backgrounds/player-guess-bg.png',
  truth_or_lie: '/games/backgrounds/hoartagy-hunter-bg.png',
  coach_challenge: '/games/backgrounds/you-are-the-coach-bg.png',
  deal_or_no_deal: '/games/backgrounds/deal-or-no-deal-bg.png',
};

export const ScreenBackground: React.FC<ScreenBackgroundProps> = ({
  atmosphere,
  children,
  showParticles = true,
  intensity = 'medium',
  className = ''
}) => {
  // Atmosphere Configuration Matrix
  const getAtmosphereConfig = () => {
    switch (atmosphere) {
      case 'home':
        return {
          gradient: 'from-zinc-950 via-[#0a0f18] to-zinc-950',
          stadiumLight: 'bg-amber-500/10',
          accentGlow1: 'bg-blue-600/15',
          accentGlow2: 'bg-amber-500/10',
          pitchLines: true,
          floodlights: true,
          themeTone: 'gold-blue'
        };
      case 'games':
        return {
          gradient: 'from-zinc-950 via-[#0e1726] to-[#080c14]',
          stadiumLight: 'bg-purple-600/15',
          accentGlow1: 'bg-amber-500/15',
          accentGlow2: 'bg-emerald-500/10',
          pitchLines: true,
          floodlights: true,
          themeTone: 'multi-arena'
        };
      case 'game_details':
        return {
          gradient: 'from-zinc-950 via-[#151226] to-zinc-950',
          stadiumLight: 'bg-indigo-500/20',
          accentGlow1: 'bg-amber-500/20',
          accentGlow2: 'bg-purple-600/15',
          pitchLines: true,
          floodlights: true,
          themeTone: 'dramatic-arena'
        };
      case 'auction':
        return {
          gradient: 'from-zinc-950 via-[#1a1205] to-zinc-950',
          stadiumLight: 'bg-amber-500/25',
          accentGlow1: 'bg-yellow-500/20',
          accentGlow2: 'bg-red-600/15',
          pitchLines: true,
          floodlights: true,
          themeTone: 'high-tension-gold'
        };
      case 'hidden_player':
        return {
          gradient: 'from-zinc-950 via-[#051717] to-zinc-950',
          stadiumLight: 'bg-emerald-500/20',
          accentGlow1: 'bg-teal-600/25',
          accentGlow2: 'bg-cyan-500/15',
          pitchLines: false,
          floodlights: false,
          fogEffect: true,
          themeTone: 'mystery-fog'
        };
      case 'safi':
        return {
          gradient: 'from-zinc-950 via-[#06152a] to-zinc-950',
          stadiumLight: 'bg-cyan-500/22',
          accentGlow1: 'bg-blue-600/18',
          accentGlow2: 'bg-fuchsia-600/12',
          pitchLines: false,
          floodlights: true,
          themeTone: 'mystery-investigation'
        };
      case 'truth_or_lie':
        return {
          gradient: 'from-zinc-950 via-[#09152e] to-zinc-950',
          stadiumLight: 'bg-blue-600/20',
          accentGlow1: 'bg-cyan-500/20',
          accentGlow2: 'bg-rose-500/15',
          pitchLines: true,
          floodlights: true,
          themeTone: 'dual-blue-red'
        };
      case 'coach_challenge':
        return {
          gradient: 'from-zinc-950 via-[#071724] to-zinc-950',
          stadiumLight: 'bg-cyan-500/20',
          accentGlow1: 'bg-blue-600/25',
          accentGlow2: 'bg-indigo-500/15',
          pitchLines: true,
          floodlights: true,
          themeTone: 'tactical-board'
        };
      case 'deal_or_no_deal':
        return {
          gradient: 'from-zinc-950 via-[#100b08] to-zinc-950',
          stadiumLight: 'bg-amber-500/25',
          accentGlow1: 'bg-fuchsia-600/15',
          accentGlow2: 'bg-blue-600/15',
          pitchLines: false,
          floodlights: true,
          themeTone: 'deal-or-no-deal-stage'
        };
      case 'squad':
        return {
          gradient: 'from-zinc-950 via-[#041a0d] to-zinc-950',
          stadiumLight: 'bg-emerald-500/20',
          accentGlow1: 'bg-green-600/20',
          accentGlow2: 'bg-amber-500/15',
          pitchLines: true,
          floodlights: true,
          themeTone: 'green-pitch'
        };
      case 'match':
        return {
          gradient: 'from-zinc-950 via-[#0a1424] to-zinc-950',
          stadiumLight: 'bg-amber-400/20',
          accentGlow1: 'bg-blue-500/25',
          accentGlow2: 'bg-rose-500/20',
          pitchLines: true,
          floodlights: true,
          themeTone: 'live-stadium'
        };
      case 'result_win':
        return {
          gradient: 'from-zinc-950 via-[#1f1704] to-zinc-950',
          stadiumLight: 'bg-amber-400/30',
          accentGlow1: 'bg-yellow-300/30',
          accentGlow2: 'bg-emerald-500/20',
          pitchLines: true,
          floodlights: true,
          themeTone: 'championship-gold'
        };
      case 'result_loss':
        return {
          gradient: 'from-zinc-950 via-[#1a0a0e] to-zinc-950',
          stadiumLight: 'bg-rose-900/20',
          accentGlow1: 'bg-zinc-800/40',
          accentGlow2: 'bg-purple-900/15',
          pitchLines: true,
          floodlights: false,
          themeTone: 'defeat-somber'
        };
      case 'ranking':
        return {
          gradient: 'from-zinc-950 via-[#181203] to-zinc-950',
          stadiumLight: 'bg-amber-500/25',
          accentGlow1: 'bg-yellow-400/20',
          accentGlow2: 'bg-purple-600/15',
          pitchLines: false,
          floodlights: true,
          themeTone: 'trophy-hall'
        };
      case 'tournament':
        return {
          gradient: 'from-zinc-950 via-[#0e1026] to-zinc-950',
          stadiumLight: 'bg-indigo-500/25',
          accentGlow1: 'bg-amber-500/20',
          accentGlow2: 'bg-blue-600/20',
          pitchLines: true,
          floodlights: true,
          themeTone: 'champions-league'
        };
      case 'rooms_private':
        return {
          gradient: 'from-zinc-950 via-[#150a24] to-zinc-950',
          stadiumLight: 'bg-purple-600/25',
          accentGlow1: 'bg-amber-500/20',
          accentGlow2: 'bg-fuchsia-600/15',
          pitchLines: true,
          floodlights: true,
          themeTone: 'vip-lounge'
        };
      case 'versus_lobby':
      default:
        return {
          gradient: 'from-zinc-950 via-[#140f1a] to-zinc-950',
          stadiumLight: 'bg-amber-500/20',
          accentGlow1: 'bg-rose-600/20',
          accentGlow2: 'bg-blue-600/20',
          pitchLines: true,
          floodlights: true,
          themeTone: 'showdown-vs'
        };
    }
  };

  const config = getAtmosphereConfig();

  useEffect(() => {
    const activeGame = ['auction','deal_or_no_deal','hidden_player','safi','truth_or_lie','coach_challenge'].includes(atmosphere) ? atmosphere : null;
    audioManager.setGameContext(activeGame);
    return () => audioManager.setGameContext(null);
  }, [atmosphere]);

  return (
    <div className={`relative min-h-screen w-full overflow-hidden bg-gradient-to-b ${config.gradient} ${className}`}>
      {/* Layer 0: خلفية الاستاد الرسمية للصفحة الرئيسية (والألعاب بشكل أخف) */}
      {(atmosphere === 'home' || atmosphere === 'games') && (
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <img
            src="/brand/home-bg.jpg"
            alt=""
            draggable={false}
            className={`absolute inset-0 h-full w-full object-cover object-center ${atmosphere === 'home' ? 'opacity-70' : 'opacity-30'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/35 to-zinc-950/90" />
        </div>
      )}
      {/* Layer 0.5: Generated cinematic background INSIDE the active game.
          This is a game backdrop only — it is intentionally separate from
          the player/card artwork so the six game scenes stay immersive. */}
      {GAME_BACKGROUND_BY_ATMOSPHERE[atmosphere] && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <img
            src={GAME_BACKGROUND_BY_ATMOSPHERE[atmosphere]}
            alt=""
            draggable={false}
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.42] scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/68 via-zinc-950/45 to-zinc-950/88" />
          <div className="absolute inset-0 bg-black/15" />
        </div>
      )}

      {/* طبقات الإضاءة الثقيلة (blur-3xl/140px) اتشالت: كانت بتبطّئ التنقل على الموبايل */}
      <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/[0.04] to-transparent" />

      {/* Layer 3: Football Pitch Tactical Overlay Lines */}
      {config.pitchLines && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.035] select-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tacticalGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#ffffff" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tacticalGrid)" />
            {/* Center Circle & Penalty Box Silhouettes */}
            <circle cx="50%" cy="50%" r="180" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="8 8" />
          </svg>
        </div>
      )}

      {/* Layer 3.5: Non-game-lobby bespoke scene. The active game backgrounds above
          are the single source of visual ambience inside each game. */}
      {atmosphere === 'versus_lobby' && <VersusAtmosphereScene />}

      {/* Layer 5: Visual Content */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};
