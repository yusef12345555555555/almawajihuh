// ============================================================
// العبها صح | EL3BHA SA7 - Dedicated Games Discovery & 1v1 Arena
// ============================================================

import { useBackHandler } from '../services/backHandler';
import React, { useState, useEffect } from 'react';
import { GameModeInfo, AuctionRoomSettings, UserProfile, PlayerSnapshot } from '../types';
import { GAME_MODES } from '../data/footballData';
import { getGameImageSlots, GAME_SLOT_BY_ID, BUNDLED_GAME_IMAGES } from '../services/gameImagesRepository';
import { loadDndMatch } from '../services/dealOrNoDealPersistence';
import { refreshPlayersInBackground } from '../services/playerRepository';
import { RefereeSetupModal } from './RefereeSetupModal';

/** صورة اللعبة كاملة بدون قص: خلفية مموهة من نفس الصورة + الصورة الأصلية contain فوقها. */
const GameCover: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden bg-zinc-950 ${className}`}>
    <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-xl" loading="lazy" draggable={false} />
    <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-contain" loading="lazy" draggable={false} />
  </div>
);
import { audioManager } from '../services/audioManager';
import {
  Gavel,
  Flame,
  EyeOff,
  CheckCircle2,
  Crown,
  Swords,
  ShieldAlert,
  LayoutGrid,
  Trophy,
  BrainCircuit,
  Users,
  Bot,
  Sparkles,
  Lock,
  Globe,
  ArrowRight,
  ChevronLeft,
  Timer,
  Coins,
  ShieldCheck,
  Zap,
  Play,
  Dice5
} from 'lucide-react';
import { StartMatchModal } from './StartMatchModal';
import { FriendRoomModal } from './FriendRoomModal';
import { GameSetupSheet } from './GameSetupSheet';
import { RoomSettings } from '../services/friendRoomService';

interface GamesDiscoveryViewProps {
  user: UserProfile;
  onStart1v1Match: (
    gameId: string,
    mode: '100M' | '200M' | 'standard',
    playMethod: 'quick' | 'public' | 'private' | 'ai' | 'resume' | 'referee',
    opponent?: PlayerSnapshot,
    setup?: RoomSettings
  ) => void;
  onNavigateToRooms: () => void;
  onUserUpdated: (user: UserProfile) => void;
}

export const GamesDiscoveryView: React.FC<GamesDiscoveryViewProps> = ({
  user,
  onStart1v1Match,
  onNavigateToRooms,
  onUserUpdated
}) => {
  const [selectedGame, setSelectedGame] = useState<GameModeInfo | null>(null);
  const [selectedMode, setSelectedMode] = useState<'100M' | '200M' | 'BLITZ' | 'STANDARD'>('100M');
  const [step, setStep] = useState<'DISCOVERY' | 'DETAILS' | 'METHOD_SELECT'>('DISCOVERY');
  const [showStartMatchModal, setShowStartMatchModal] = useState(false);
  const [showFriendRoom, setShowFriendRoom] = useState(false);
  const [showSetupSheet, setShowSetupSheet] = useState(false);
  const [pendingDndSetup, setPendingDndSetup] = useState<RoomSettings | null>(null);
  const [gameImageSlots, setGameImageSlots] = useState<Record<number, string | null>>({});
  const [showReferee, setShowReferee] = useState(false);
  useBackHandler(showStartMatchModal, () => setShowStartMatchModal(false));
  useBackHandler(showReferee, () => setShowReferee(false));
  useBackHandler(step !== 'DISCOVERY', () => setStep('DISCOVERY'));
  const [hasDndResume] = useState<boolean>(() => !!loadDndMatch());

  useEffect(() => {
    let cancelled = false;
    // Nudge a fresh players fetch every time the games list is opened, so any
    // player photos/cards the admin just published reach the app almost
    // instantly instead of waiting for a full app reload.
    refreshPlayersInBackground();
    // Admin-uploaded cover images are a pure enhancement — if this
    // fails or Supabase isn't configured, the existing artwork cards
    // just keep showing exactly as before.
    getGameImageSlots()
      .then((slots) => {
        if (!cancelled) setGameImageSlots(slots);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const getGameIcon = (iconName: string) => {
    switch (iconName) {
      case 'Gavel':
        return Gavel;
      case 'Dice5':
        return Dice5;
      case 'Sparkles':
        return Sparkles;
      case 'Flame':
        return Flame;
      case 'EyeOff':
        return EyeOff;
      case 'CheckCircle2':
        return CheckCircle2;
      case 'Crown':
        return Crown;
      case 'Swords':
        return Swords;
      case 'ShieldAlert':
        return ShieldAlert;
      case 'LayoutGrid':
        return LayoutGrid;
      default:
        return Flame;
    }
  };

  // 1. Step 1: Discover and Explore Games Universe
  if (step === 'DISCOVERY' || !selectedGame) {
    return (
      <div className="space-y-8 pb-16">
        {/* Cinematic Header — matches the HQ hero treatment */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/30 bg-gradient-to-b from-zinc-950 via-[#0a0e17] to-zinc-950 p-4 sm:p-7 shadow-[0_0_35px_rgba(245,158,11,0.15)]">
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:22px_22px] opacity-10 pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                <span>الرئيسية</span>
                <span>&gt;</span>
                <span className="text-white">ألعاب كورة</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                اختار لعبتك ويلا
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                اختار لعبة وابدأ
              </p>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/80 border border-amber-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-amber-300 flex-shrink-0">
              <Swords className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>1 ضد 1</span>
            </div>
          </div>
        </div>

        {hasDndResume && (
          <button
            type="button"
            onClick={() => {
              audioManager.playClick();
              onStart1v1Match('DEAL_OR_NO_DEAL', 'standard', 'resume');
            }}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-amber-400/60 bg-amber-500/10 px-4 py-3 text-right"
          >
            <span className="min-w-0 break-words text-sm font-black text-amber-200">عندك ماتش ديل أور نو ديل شغال — كمّله من نفس النقطة</span>
            <span className="shrink-0 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-black">كمّل</span>
          </button>
        )}

        {/* Games Grid with Thematic Creative Card Artworks - 2 columns on mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {GAME_MODES.map((game) => {
            const IconComp = getGameIcon(game.iconName);

            // Custom Thematic Visual Identity for each game card
            const getGameVisualTheme = (id: string) => {
              switch (id) {
                case 'AUCTION':
                case 'auction':
                  return {
                    borderGlow: 'hover:border-amber-400 group-hover:shadow-[0_0_35px_rgba(245,158,11,0.35)]',
                    cardBg: 'from-zinc-950 via-[#181102] to-zinc-950',
                    headerBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    accentColor: 'text-amber-400',
                    bannerGraphic: 'AUCTION_SILHOUETTES',
                    themeTag: 'زايد واكسب'
                  };
                case 'PLAYER_OR_HIDDEN':
                  return {
                    borderGlow: 'hover:border-purple-400 group-hover:shadow-[0_0_35px_rgba(168,85,247,0.35)]',
                    cardBg: 'from-zinc-950 via-[#160a26] to-zinc-950',
                    headerBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                    accentColor: 'text-purple-400',
                    bannerGraphic: 'MYSTERY_QUESTION_DUO',
                    themeTag: 'خد ولا تخاطر'
                  };
                case 'HOARTAGY_HUNTER':
                  return {
                    borderGlow: 'hover:border-rose-400 group-hover:shadow-[0_0_35px_rgba(244,63,94,0.35)]',
                    cardBg: 'from-zinc-950 via-[#200a12] to-zinc-950',
                    headerBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                    accentColor: 'text-rose-400',
                    bannerGraphic: 'DETECTOR_FIRE_SEARCH',
                    themeTag: 'اسأل واكشف'
                  };
                case 'PLAYER_GUESS':
                  return {
                    borderGlow: 'hover:border-blue-400 group-hover:shadow-[0_0_35px_rgba(59,130,246,0.35)]',
                    cardBg: 'from-zinc-950 via-[#0a152e] to-zinc-950',
                    headerBadge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                    accentColor: 'text-blue-400',
                    bannerGraphic: 'THIRTY_GRID_TARGET',
                    themeTag: 'صفّي واكسب'
                  };
                case 'YOU_ARE_THE_COACH':
                  return {
                    borderGlow: 'hover:border-amber-400 group-hover:shadow-[0_0_35px_rgba(245,158,11,0.4)]',
                    cardBg: 'from-zinc-950 via-[#181a10] to-zinc-950',
                    headerBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    accentColor: 'text-amber-400',
                    bannerGraphic: 'COACH_TACTICS_BANNER',
                    themeTag: 'درب فريقك'
                  };
                case 'DEAL_OR_NO_DEAL':
                  return {
                    borderGlow: 'hover:border-fuchsia-400 group-hover:shadow-[0_0_35px_rgba(217,70,239,0.35)]',
                    cardBg: 'from-zinc-950 via-[#1a0f22] to-zinc-950',
                    headerBadge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
                    accentColor: 'text-fuchsia-400',
                    bannerGraphic: 'MYSTERY_BOXES_BANNER',
                    themeTag: 'صناديق ومخاطرة'
                  };
                case 'SAFI':
                default:
                  return {
                    borderGlow: 'hover:border-emerald-400 group-hover:shadow-[0_0_35px_rgba(16,185,129,0.35)]',
                    cardBg: 'from-zinc-950 via-[#061e14] to-zinc-950',
                    headerBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    accentColor: 'text-emerald-400',
                    bannerGraphic: 'SWORDS_PITCH_BATTLE',
                    themeTag: 'مبارزة وإقصاء'
                  };
              }
            };

            const theme = getGameVisualTheme(game.id);

            return (
              <div
                key={game.id}
                id={`game_card_${game.id}`}
                onClick={() => {
                  audioManager.playClick();
                  setSelectedGame(game);
                  setStep('DETAILS');
                }}
                className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b ${theme.cardBg} border border-zinc-800/90 ${theme.borderGlow} p-2.5 sm:p-5 shadow-xl sm:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between min-w-0 hover:scale-[1.02]`}
              >
                {/* Signature gold-foil hover accent, ties every game card to the app's identity */}
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 foil-sweep" />
                {/* Visual Graphic Banner Layer Inside The Card */}
                <div className="relative w-full aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden mb-2.5 sm:mb-4 bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-center">
                  {/* Subtle Light Beam */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                  {/* Admin-uploaded cover image takes over the whole banner
                      when present; otherwise the original artwork below
                      renders exactly as it always has. */}
                  {(gameImageSlots[GAME_SLOT_BY_ID[game.id]] || BUNDLED_GAME_IMAGES[game.id]) ? (
                    <GameCover src={(gameImageSlots[GAME_SLOT_BY_ID[game.id]] || BUNDLED_GAME_IMAGES[game.id]) as string} alt={game.titleAr} />
                  ) : (
                    <>
                  {/* Graphic Artwork Variations based on game nature */}
                  {theme.bannerGraphic === 'AUCTION_SILHOUETTES' && (
                    <div className="relative w-full h-full flex items-center justify-center gap-1.5 sm:gap-3 bg-gradient-to-tr from-amber-950/40 to-black scale-90 sm:scale-100">
                      <div className="flex -space-x-3 sm:-space-x-4 items-center">
                        <div className="w-10 sm:w-14 h-14 sm:h-20 rounded-lg sm:rounded-xl bg-zinc-900 border sm:border-2 border-zinc-700/80 shadow-lg rotate-[-12deg] flex items-center justify-center text-zinc-600 font-black text-xs sm:text-base">
                          ?
                        </div>
                        <div className="w-12 sm:w-16 h-18 sm:h-24 rounded-lg sm:rounded-xl bg-gradient-to-b from-amber-500/30 to-black border sm:border-2 border-amber-400 shadow-2xl z-10 flex flex-col items-center justify-center">
                          <Gavel className="w-4 sm:w-6 h-4 sm:h-6 text-amber-400 mb-0.5 sm:mb-1" />
                          <span className="text-[7px] sm:text-[9px] font-black text-amber-300">BID</span>
                        </div>
                        <div className="w-10 sm:w-14 h-14 sm:h-20 rounded-lg sm:rounded-xl bg-zinc-900 border sm:border-2 border-zinc-700/80 shadow-lg rotate-[12deg] flex items-center justify-center text-zinc-600 font-black text-xs sm:text-base">
                          ?
                        </div>
                      </div>
                    </div>
                  )}

                  {theme.bannerGraphic === 'MYSTERY_QUESTION_DUO' && (
                    <div className="relative w-full h-full flex items-center justify-center gap-2 sm:gap-4 bg-gradient-to-tr from-purple-950/40 to-black scale-90 sm:scale-100">
                      <div className="w-11 sm:w-16 h-16 sm:h-22 rounded-lg sm:rounded-xl bg-zinc-800 border border-zinc-600 p-0.5 sm:p-1 flex flex-col items-center justify-center text-center">
                        <span className="text-[7px] sm:text-[9px] font-bold text-zinc-300">المعلن</span>
                        <div className="w-5 sm:w-7 h-5 sm:h-7 rounded-full bg-zinc-950 text-amber-400 text-[9px] sm:text-xs font-black flex items-center justify-center mt-0.5 sm:mt-1">
                          92
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-purple-400">VS</span>
                      <div className="w-11 sm:w-16 h-16 sm:h-22 rounded-lg sm:rounded-xl bg-purple-950/80 border sm:border-2 border-purple-400/90 p-0.5 sm:p-1 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-pulse">
                        <span className="text-base sm:text-xl font-black text-purple-300">?</span>
                        <span className="text-[7px] sm:text-[8px] font-black text-purple-300">الخفي</span>
                      </div>
                    </div>
                  )}

                  {theme.bannerGraphic === 'DETECTOR_FIRE_SEARCH' && (
                    <div className="relative w-full h-full flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-tr from-rose-950/40 to-black scale-90 sm:scale-100">
                      <div className="w-8 sm:w-12 h-8 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                        <Flame className="w-4 sm:w-6 h-4 sm:h-6 animate-bounce" />
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] sm:text-xs font-black text-rose-300">5 أسئلة</div>
                        <div className="text-[8px] sm:text-[10px] text-zinc-400">بيحور؟</div>
                      </div>
                    </div>
                  )}

                  {theme.bannerGraphic === 'THIRTY_GRID_TARGET' && (
                    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-950/40 to-black p-1.5 sm:p-3">
                      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 opacity-70 scale-90 sm:scale-100">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <div
                            key={n}
                            className={`w-4 sm:w-6 h-5 sm:h-7 rounded border flex items-center justify-center text-[7px] sm:text-[9px] font-black ${
                              n === 7
                                ? 'bg-amber-400 text-zinc-950 border-amber-300 ring-1 sm:ring-2 ring-amber-400 scale-110 z-10'
                                : n % 2 === 0
                                ? 'bg-zinc-900 border-zinc-800 text-zinc-600 line-through'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                            }`}
                          >
                            {n === 7 ? '★' : 'P'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {theme.bannerGraphic === 'MYSTERY_BOXES_BANNER' && (
                    <div className="relative w-full h-full flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-tr from-fuchsia-950/40 to-black p-2">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="w-10 sm:w-14 h-12 sm:h-16 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-950 border-2 border-fuchsia-500/40 flex items-center justify-center shadow-lg"
                        >
                          <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-fuchsia-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {theme.bannerGraphic === 'SWORDS_PITCH_BATTLE' && (
                    <div className="relative w-full h-full flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-tr from-emerald-950/40 to-black scale-90 sm:scale-100">
                      <Swords className="w-6 sm:w-8 h-6 sm:h-8 text-emerald-400 animate-pulse" />
                      <div className="text-right">
                        <div className="text-[10px] sm:text-xs font-black text-emerald-300">تصفية</div>
                        <div className="text-[8px] sm:text-[10px] text-zinc-400">إقصاء</div>
                      </div>
                    </div>
                  )}

                  {theme.bannerGraphic === 'COACH_TACTICS_BANNER' && (
                    <div className="relative w-full h-full flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-tr from-amber-950/40 via-zinc-950 to-emerald-950/40 scale-90 sm:scale-100">
                      <Trophy className="w-6 sm:w-8 h-6 sm:h-8 text-amber-400 animate-bounce" />
                      <div className="text-right">
                        <div className="text-[10px] sm:text-xs font-black text-amber-300">أنت المدرب</div>
                        <div className="text-[8px] sm:text-[10px] text-emerald-400 font-bold">5 دوريات و4 كؤوس</div>
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>

                <div>
                  {/* Top Badge & 1v1 Pill */}
                  <div className="flex items-center justify-between gap-1 flex-wrap mb-2">
                    <div className="flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] sm:text-[11px] font-black text-amber-400">
                      <Swords className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                      <span>تنافسي</span>
                    </div>

                    <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${theme.headerBadge} text-[9px] sm:text-[10px] font-black break-words`}>
                      {game.badge}
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="mb-1">
                    <h3 className="text-[13px] sm:text-xl font-black text-white group-hover:text-amber-400 transition-colors break-words leading-snug min-h-[2.2rem] sm:min-h-0">
                      {game.titleAr}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium break-words leading-snug">{game.subtitleAr}</p>
                  </div>

                  <p className="text-[10px] sm:text-xs text-zinc-300 leading-relaxed line-clamp-1 sm:line-clamp-2 mb-2 sm:mb-4 hidden sm:block">
                    {game.descriptionAr}
                  </p>
                </div>

                {/* Footer Metrics */}
                <div className="pt-2 sm:pt-3.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] sm:text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <span className="flex items-center gap-0.5 sm:gap-1 font-mono text-amber-400 font-bold text-[10px] sm:text-xs">
                      <Coins className="w-3 sm:w-3.5 h-3 sm:h-3.5" />+{game.rewardCoins}
                    </span>
                    <span className="hidden sm:flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5" />
                      {game.durationMinutes} د
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 text-amber-400 font-black text-[10px] sm:text-xs group-hover:translate-x-[-4px] transition-transform">
                    <span>العب</span>
                    <ChevronLeft className="w-3 sm:w-4 h-3 sm:h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const detailBackgroundByGame: Record<string, string> = {
    AUCTION: '/games/backgrounds/auction-bg.png',
    auction: '/games/backgrounds/auction-bg.png',
    PLAYER_OR_HIDDEN: '/games/backgrounds/hidden-player-bg.png',
    HOARTAGY_HUNTER: '/games/backgrounds/hoartagy-hunter-bg.png',
    SAFI: '/games/backgrounds/safi-bg.png',
    YOU_ARE_THE_COACH: '/games/backgrounds/you-are-the-coach-bg.png',
    DEAL_OR_NO_DEAL: '/games/backgrounds/deal-or-no-deal-bg.png'
  };

  // 2. Step 2: Game Details & Mode Selection
  // شاشة شفافة: الخلفية واضحة والأوضاع فوقها بدون مربعات كبيرة، والثلاثة جنب بعض.
  if (step === 'DETAILS') {
    const IconComp = getGameIcon(selectedGame.iconName);
    const modeBtn =
      'flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-3 text-center backdrop-blur-[2px] active:scale-95 transition-transform';
    return (
      <div
        className="fixed inset-0 z-[60] overflow-y-auto"
        dir="rtl"
        style={{
          backgroundImage: `linear-gradient(rgba(3,7,18,.18), rgba(3,7,18,.42)), url(${detailBackgroundByGame[selectedGame.id] || '/brand/home-bg.jpg'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="min-h-full w-full max-w-md mx-auto px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+14px)] flex flex-col">
          <button
            onClick={() => setStep('DISCOVERY')}
            className="self-start flex items-center gap-1.5 text-[11px] font-black text-white bg-black/45 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1.5"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>الألعاب</span>
          </button>

          <div className="flex-1" />

          <div className="text-center mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            <div className="inline-flex w-11 h-11 rounded-2xl bg-black/40 border border-amber-400/60 items-center justify-center text-amber-400 mb-1.5">
              <IconComp className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-white leading-tight">{selectedGame.titleAr}</h1>
            <p className="text-[11px] font-bold text-amber-200 mt-0.5">اختار وضع اللعب</p>
            <p className="text-[10px] text-zinc-200 mt-1 leading-snug px-4 line-clamp-2">{selectedGame.descriptionAr}</p>
          </div>

          {['DEAL_OR_NO_DEAL', 'AUCTION', 'PLAYER_OR_HIDDEN'].includes(selectedGame.id) ? (
            <button
              type="button"
              onClick={() => {
                audioManager.playClick();
                setShowSetupSheet(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-base shadow-[0_0_28px_rgba(245,158,11,.45)] active:scale-95 transition-transform"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>يلا نلعب</span>
            </button>
          ) : selectedGame.id === 'YOU_ARE_THE_COACH' ? (
            <button
              onClick={() => {
                audioManager.playClick();
                onStart1v1Match('YOU_ARE_THE_COACH', 'standard', 'quick');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500 text-zinc-950 font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95 transition-transform"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>ابدأ مسيرتك كمدرب</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  audioManager.playClick();
                  setShowStartMatchModal(true);
                }}
                className={`${modeBtn} border border-amber-300/80 bg-amber-950/55`}
              >
                <span className="text-xl leading-none">🤝</span>
                <span className="text-[12px] font-black text-amber-200">العب</span>
                <span className="text-[9px] text-zinc-200 leading-tight">ضد لاعب حقيقي</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioManager.playClick();
                  onStart1v1Match(selectedGame.id, selectedMode as any, 'ai');
                }}
                className={`${modeBtn} border border-emerald-300/70 bg-emerald-950/55`}
              >
                <span className="text-xl leading-none">🤖</span>
                <span className="text-[12px] font-black text-emerald-200">تحدّي AI</span>
                <span className="text-[9px] text-zinc-200 leading-tight">العب لوحدك</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioManager.playClick();
                  onNavigateToRooms();
                }}
                className={`${modeBtn} border border-sky-300/70 bg-sky-950/55`}
              >
                <span className="text-xl leading-none">👥</span>
                <span className="text-[12px] font-black text-sky-200">الغرف</span>
                <span className="text-[9px] text-zinc-200 leading-tight">غرف نشطة</span>
              </button>
            </div>
          )}
        </div>

        {showReferee && (
          <RefereeSetupModal
            user={user}
            onClose={() => setShowReferee(false)}
            onStart={(players) => {
              try {
                localStorage.setItem('dnd_referee_players_v1', JSON.stringify(players));
              } catch {
                /* ignore */
              }
              setShowReferee(false);
              onStart1v1Match('DEAL_OR_NO_DEAL', selectedMode as any, 'referee', undefined, pendingDndSetup || undefined);
            }}
          />
        )}

        {showSetupSheet && (
          <GameSetupSheet
            user={user}
            gameId={selectedGame.id}
            titleAr={selectedGame.titleAr}
            onClose={() => setShowSetupSheet(false)}
            onDndReferee={(setup) => {
              setPendingDndSetup(setup);
              setShowSetupSheet(false);
              setShowReferee(true);
            }}
            onLaunch={(setup, opponent, method) => {
              setShowSetupSheet(false);
              onStart1v1Match(selectedGame.id, selectedMode as any, method, opponent || undefined, setup);
            }}
          />
        )}

        {showStartMatchModal && (
          <StartMatchModal
            user={user}
            gameMode={selectedGame.id}
            gameLabelAr={selectedGame.titleAr}
            onClose={() => setShowStartMatchModal(false)}
            onFriendRoom={() => {
              setShowStartMatchModal(false);
              setShowFriendRoom(true);
            }}
            onPlayAi={() => {
              setShowStartMatchModal(false);
              onStart1v1Match(selectedGame.id, selectedMode as any, 'ai');
            }}
            onRealOpponentReady={(foundOpponent) => {
              setShowStartMatchModal(false);
              onStart1v1Match(selectedGame.id, selectedMode as any, 'quick', foundOpponent);
            }}
          />
        )}

        {showFriendRoom && (
          <FriendRoomModal
            user={user}
            mode={{ kind: 'host', gameMode: selectedGame.id, gameLabelAr: selectedGame.titleAr }}
            onClose={() => setShowFriendRoom(false)}
            onStart={(foundOpponent) => {
              setShowFriendRoom(false);
              onStart1v1Match(selectedGame.id, selectedMode as any, 'quick', foundOpponent);
            }}
          />
        )}
      </div>
    );
  }

  // 3. Step 3: Choose Play Method (Quick 1v1 Match / Public Room / Private Room / AI)
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Breadcrumb */}
      <button
        onClick={() => setStep('DETAILS')}
        className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-amber-400 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>الرجوع لتفاصيل اللعبة</span>
      </button>

      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-4xl font-black text-white">اختار طريقة اللعب (1 VS 1)</h2>
        <p className="text-xs sm:text-sm text-zinc-400">
          حدد كيفية بدء مواجهتك في لعبة <span className="text-amber-400 font-bold">"{selectedGame.titleAr}"</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {/* 1. Quick Match (Exact 1v1) */}
        <div
          onClick={() => {
            audioManager.playClick();
            onStart1v1Match(selectedGame.id, selectedMode as any, 'quick');
          }}
          className="group p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-400/80 shadow-xl cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">
              مباراة سريعة
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              بحث تلقائي فوري عن خصم بشري حقيقي متكافئ وبدء المواجهة الفردية على طول.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs font-bold text-amber-400">
            <span>البحث عن خصم</span>
            <ChevronLeft className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Public Room 1v1 */}
        <div
          onClick={() => {
            audioManager.playClick();
            onStart1v1Match(selectedGame.id, selectedMode as any, 'public');
          }}
          className="group p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-400/80 shadow-xl cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
              غرفة عامة
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              تظهر في قائمة الغرف العامة لأي لاعب لينضم (الحد الأقصى لاعبان فقط 2/2).
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs font-bold text-emerald-400">
            <span>إنشاء غرفة عامة</span>
            <ChevronLeft className="w-4 h-4" />
          </div>
        </div>

        {/* 3. Private Room 1v1 */}
        <div
          onClick={() => {
            audioManager.playClick();
            onStart1v1Match(selectedGame.id, selectedMode as any, 'private');
          }}
          className="group p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-400/80 shadow-xl cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-purple-400 transition-colors">
              غرفة خاصة (VIP)
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              مش هتظهر لحد. بس اللي معاه اللينك أو الكود يقدر يدخل.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs font-bold text-purple-400">
            <span>توليد رابط وكود خاص</span>
            <ChevronLeft className="w-4 h-4" />
          </div>
        </div>

        {/* 4. Play vs AI */}
        <div
          onClick={() => {
            audioManager.playClick();
            onStart1v1Match(selectedGame.id, selectedMode as any, 'ai');
          }}
          className="group p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 hover:border-blue-400/80 shadow-xl cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">
              مواجهة الذكاء الاصطناعي (Vs AI)
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              تدريب فردي تنافسي ضد مدرب آلي ذكي يتبع نفس القوانين والميزانيات بحرية تامة.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs font-bold text-blue-400">
            <span>بدء التحدي الفردي</span>
            <ChevronLeft className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
