// ============================================================
// العبها صح | EL3BHA SA7 - Main Application Root & State Hub
// ============================================================

import React, { lazy, Suspense, useRef, useState, useEffect } from 'react';
import { UserProfile, AuctionRoomSettings, FootballPlayer, Coach, FriendUser, PlayerSnapshot } from './types';
import { StorageService } from './services/storageService';
import { deriveSharedMatchSeed } from './services/sharedMatchSeed';
import { SocialService } from './services/socialService';
import { audioManager } from './services/audioManager';
import { getAllPlayers } from './services/playerRepository';

// Components & Views
import { Navbar } from './components/Navbar';
import { IncomingEventsHost } from './components/IncomingEventsHost';
import { LAUNCH_GAME_EVENT } from './components/PostMatchActions';
import { runTopBackHandler } from './services/backHandler';
import { startMarketCatalog } from './services/marketCatalog';
import { initPush } from './services/pushService';
import { RoomInviteHost } from './components/RoomInviteHost';
import { NativeNotificationBridge } from './components/NativeNotificationBridge';
import { NotificationsView } from './components/NotificationsView';
import { openRoomInApp, peekPendingRoomSettings, clearPendingRoomSettings, RoomSettings } from './services/friendRoomService';
import { SidebarNavigation } from './components/SidebarNavigation';
import { ScreenBackground, ScreenAtmosphere } from './components/ScreenBackground';
import { HomeView } from './components/HomeView';
import { GamesDiscoveryView } from './components/GamesDiscoveryView';
import { AuctionModeStrategySelection } from './components/AuctionModeStrategySelection';
import { MatchSimulationView } from './components/MatchSimulationView';
import { HoartagyHunterGameView } from './components/HoartagyHunterGameView';
import { PlayerGuessGameView } from './components/PlayerGuessGameView';
import { HiddenPlayerGameView } from './components/HiddenPlayerGameView';
import { TruthOrLieGameView } from './components/TruthOrLieGameView';
import { CoachChallengeGameView } from './components/CoachChallengeGameView';
import { GameEntranceGate } from './components/GameEntranceGate';
import { RosterGate } from './components/RosterGate';
import { startCatalogRealtime, catalogReady } from './services/catalogRealtime';
import { NotificationPermissionPrompt } from './components/NotificationPermissionPrompt';
import { DealOrNoDealErrorBoundary } from './components/DealOrNoDealErrorBoundary';
import { FriendsView } from './components/FriendsView';
import { ChatView } from './components/ChatView';
import { TournamentsPage } from './components/TournamentsPage';
import { AchievementsView } from './components/AchievementsView';
import { BottomNavigation } from './components/BottomNavigation';
import { AppIntroSplash } from './components/AppIntroSplash';
import { PlayerOnboarding } from './components/PlayerOnboarding';
import { AboutView } from './components/AboutView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';

// تحميل كسول للشاشات الثقيلة: التطبيق يفتح أسرع والتنقل أخف
const AuctionGameView = lazy(() => import('./components/AuctionGameView').then((m) => ({ default: m.AuctionGameView })));
const TakePlayerOrHiddenGameView = lazy(() => import('./components/TakePlayerOrHiddenGameView').then((m) => ({ default: m.TakePlayerOrHiddenGameView })));
const YouAreTheCoachGameView = lazy(() => import('./components/YouAreTheCoachGameView').then((m) => ({ default: m.YouAreTheCoachGameView })));
const DealOrNoDealGameView = lazy(() => import('./components/DealOrNoDealGameView').then((m) => ({ default: m.DealOrNoDealGameView })));
const RoomsLobbyView = lazy(() => import('./components/RoomsLobbyView').then((m) => ({ default: m.RoomsLobbyView })));
const LeaderboardView = lazy(() => import('./components/LeaderboardView').then((m) => ({ default: m.LeaderboardView })));
const PlayerProfileView = lazy(() => import('./components/PlayerProfileView').then((m) => ({ default: m.PlayerProfileView })));
const MarketView = lazy(() => import('./components/MarketView').then((m) => ({ default: m.MarketView })));

const INTRO_SHOWN_KEY = 'el3bha_intro_shown_session';

export default function App() {
  // First-launch identity onboarding (name + nickname + avatar) — no
  // email/password. Shown once, right after the boot intro, until the
  // player actually creates their profile.
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(() => !StorageService.hasProfile());

  const [showIntro, setShowIntro] = useState<boolean>(() => {
    // Show once per browser session (not every navigation/re-render),
    // so it feels like a real app boot rather than a repeated interruption.
    try {
      return !sessionStorage.getItem(INTRO_SHOWN_KEY);
    } catch {
      return true;
    }
  });
  const [user, setUser] = useState<UserProfile>(() => StorageService.getUserProfile());

  // Warm up the admin-published players cache as early as possible so
  // any game the user opens already has the combined roster ready —
  // this never blocks rendering and silently no-ops if Supabase isn't
  // configured.
  useEffect(() => {
    startCatalogRealtime();
  }, []);

  // Publish/refresh this player's own searchable directory row (Player
  // ID + name + nickname) so friends can actually find them — a no-op
  // if Supabase isn't configured.
  useEffect(() => {
    if (!needsOnboarding) {
      SocialService.publishOwnProfile(user)
        .catch(() => {})
        .finally(() => SocialService.startRealtime());
    }
  }, [needsOnboarding, user.id]);

  // فتح لعبة بخصم حقيقي من أي مكان (انتقام / قبول دعوة)
  useEffect(() => {
    const onLaunch = (e: Event) => {
      const d = (e as CustomEvent).detail as { gameId: string; opponent: PlayerSnapshot | null };
      if (d?.gameId) handleStart1v1MatchFromDiscoveryRef.current?.(d.gameId, '100M', 'quick', d.opponent || undefined);
    };
    window.addEventListener(LAUNCH_GAME_EVENT, onLaunch);
    return () => window.removeEventListener(LAUNCH_GAME_EVENT, onLaunch);
  }, []);

  useEffect(() => {
    startMarketCatalog();
  }, []);

  // تسجيل الجهاز للإشعارات الفورية بعد التسجيل
  useEffect(() => {
    if (!needsOnboarding && user.id) void initPush(user.id, (data) => {
      // ضغطة على إشعار النظام: دعوة غرفة → افتح الغرفة، غير كده → صفحة الإشعارات
      if (data && ((data as any).roomId || (data as any).matchInviteId)) openRoomInApp(String((data as any).roomId || (data as any).matchInviteId));
      else setActiveTab('notifications');
    });
  }, [needsOnboarding, user.id]);

  useEffect(() => {
    const reload = () => setUser(StorageService.getUserProfile());
    window.addEventListener('mw:profile-changed', reload);
    return () => window.removeEventListener('mw:profile-changed', reload);
  }, []);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedChatFriend, setSelectedChatFriend] = useState<FriendUser | null>(null);
  const [isCoachMatchSimulating, setIsCoachMatchSimulating] = useState<boolean>(false);

  // Active Auction Match & Simulation Data
  const [dealOrNoDealOpponent, setDealOrNoDealOpponent] = useState<PlayerSnapshot | null>(null);
  // Seed shared with the matched opponent so BOTH devices build the
  // identical card set for whichever game was launched.
  const [sharedMatchSeed, setSharedMatchSeed] = useState<number | undefined>(undefined);
  // إعدادات غرفة اللعب مع الصحاب (خماسي/11 + كروت) لو الماتش جاي من غرفة
  const [roomSettings, setRoomSettings] = useState<RoomSettings | null>(null);
  const [activeOpponent, setActiveOpponent] = useState<PlayerSnapshot | null>(null);

  // لما نرجع للرئيسية/الألعاب: ننسى الخصم السابق (عشان اللعب ضد AI ما يتلخبطش)
  useEffect(() => {
    if (activeTab === 'home' || activeTab === 'games') setActiveOpponent(null);
  }, [activeTab]);

  const handleStart1v1MatchFromDiscoveryRef = useRef<((g: string, m: '100M' | '200M' | 'standard', p: 'quick' | 'public' | 'private' | 'ai' | 'resume' | 'referee', o?: PlayerSnapshot, s?: RoomSettings) => void) | null>(null);
  const [dealOrNoDealPlayMethod, setDealOrNoDealPlayMethod] = useState<'quick' | 'ai' | 'resume' | 'referee'>('quick');
  const [auctionSettings, setAuctionSettings] = useState<AuctionRoomSettings>({
    budgetMode: '100M',
    initialBudget: 100,
    squadSize: 5,
    bidTimerSeconds: 12,
    bidTimeLimitSeconds: 12,
    bidIncrement: 1,
    fastBidConfirm: false,
    allowBots: true,
    mysteryPlayerChance: 0.25,
    standardSkipEnabled: true,
    lastBidEnabled: false,
    wildCardEnabled: false,
    noRiskEnabled: false
  });
  const [acquiredSquad, setAcquiredSquad] = useState<FootballPlayer[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [acquiredOpponentSquad, setAcquiredOpponentSquad] = useState<FootballPlayer[]>([]);
  const [selectedOpponentCoach, setSelectedOpponentCoach] = useState<Coach | null>(null);

  // Sync user profile across actions
  const handleUpdateUser = (updated: UserProfile) => {
    StorageService.saveUserProfile(updated);
    setUser(updated);
    SocialService.publishOwnProfile(updated).catch(() => {});
  };

  const handleOpenAuctionSetup = (_suggestedMode?: '100M' | '200M') => {
    setActiveTab('auction_setup');
  };

  const handleLaunchAuction = (settings: AuctionRoomSettings) => {
    setAuctionSettings(settings);
    setActiveTab('auction');
  };

  const handleStart1v1MatchFromDiscovery = (
    gameId: string,
    mode: '100M' | '200M' | 'standard',
    playMethod: 'quick' | 'public' | 'private' | 'ai' | 'resume' | 'referee',
    opponent?: PlayerSnapshot,
    setup?: RoomSettings
  ) => {
    // A real opponent means both sides must agree on one seed; that seed
    // is what makes their cards identical. Solo/AI play leaves it unset.
    const pendingRoom = opponent ? peekPendingRoomSettings() : null;
    setRoomSettings(setup || pendingRoom);
    clearPendingRoomSettings();
    setActiveOpponent(opponent || null);
    setSharedMatchSeed(
      opponent && user.id
        ? deriveSharedMatchSeed(user.id, opponent.id, gameId)
        : undefined
    );

    if (gameId === 'AUCTION' || gameId === 'auction' || gameId === 'auction_pro' || gameId === 'mode_auction_100m' || gameId === 'mode_auction_200m') {
      setActiveTab('auction_setup');
    } else if (gameId === 'PLAYER_OR_HIDDEN') {
      setActiveTab('take_player_or_hidden');
    } else if (gameId === 'HOARTAGY_HUNTER') {
      setActiveTab('hoartagy_hunter');
    } else if (gameId === 'SAFI' || gameId === 'PLAYER_GUESS') {
      // «تخمين اللاعب» اتدمجت في «اقف ف صفي عشان بصفي» — لعبة واحدة بس.
      setActiveTab('safi');
    } else if (gameId === 'YOU_ARE_THE_COACH' || gameId === 'you_are_the_coach') {
      setActiveTab('you_are_the_coach');
    } else if (gameId === 'DEAL_OR_NO_DEAL') {
      setDealOrNoDealOpponent(opponent || null);
      setDealOrNoDealPlayMethod(playMethod === 'quick' || playMethod === 'ai' || playMethod === 'resume' || playMethod === 'referee' ? playMethod : 'quick');
      setActiveTab('deal_or_no_deal');
    } else {
      handleSelectGame(gameId);
    }
  };

  handleStart1v1MatchFromDiscoveryRef.current = handleStart1v1MatchFromDiscovery;

  const handleSelectGame = (gameId: string) => {
    switch (gameId) {
      case 'AUCTION':
      case 'mode_auction_100m':
      case 'mode_auction_200m':
      case 'auction':
      case 'auction_pro':
        setActiveTab('auction_setup');
        break;
      case 'YOU_ARE_THE_COACH':
      case 'you_are_the_coach':
      case 'mode_you_are_the_coach':
        setActiveTab('you_are_the_coach');
        break;
      case 'PLAYER_OR_HIDDEN':
      case 'take_player_or_hidden':
        setActiveTab('take_player_or_hidden');
        break;
      case 'HOARTAGY_HUNTER':
      case 'hoartagy_hunter':
        setActiveTab('hoartagy_hunter');
        break;
      case 'PLAYER_GUESS':
      case 'player_guess':
      case 'SAFI':
      case 'safi':
        setActiveTab('safi');
        break;
      case 'mode_hidden_player':
      case 'hidden_player':
        setActiveTab('hidden_player');
        break;
      case 'mode_truth_or_lie':
      case 'truth_or_lie':
        setActiveTab('truth_or_lie');
        break;
      case 'mode_coach_challenge':
      case 'coach_challenge':
        setActiveTab('coach_challenge');
        break;
      case 'friends':
        setActiveTab('friends');
        break;
      case 'chat':
        setActiveTab('chat');
        break;
      case 'mode_tournament_bracket':
      case 'tournament':
        setActiveTab('tournament');
        break;
      default:
        setActiveTab('home');
    }
  };

  const handleFinishAuction = (squad: FootballPlayer[], coach: Coach | null, opponentSquad?: FootballPlayer[], opponentCoach?: Coach | null) => {
    setAcquiredSquad([...squad]);
    setSelectedCoach(coach);
    setAcquiredOpponentSquad([...(opponentSquad || [])]);
    setSelectedOpponentCoach(opponentCoach || null);
    setActiveTab('match_simulation');
  };

  // Compute atmosphere per screen
  const getAtmosphereForTab = (): ScreenAtmosphere => {
    switch (activeTab) {
      case 'home':
        return 'home';
      case 'games':
        return 'games';
      case 'auction_setup':
      case 'auction':
        return 'auction';
      case 'deal_or_no_deal':
        return 'deal_or_no_deal';
      case 'match_simulation':
        return 'match';
      case 'take_player_or_hidden':
      case 'hidden_player':
        return 'hidden_player';
      case 'hoartagy_hunter':
      case 'truth_or_lie':
        return 'truth_or_lie';
      case 'safi':
        return 'safi';
      case 'coach_challenge':
      case 'you_are_the_coach':
        return 'coach_challenge';
      case 'notifications':
        return 'home';
      case 'friends':
      case 'chat':
        return 'rooms_public';
      case 'tournament':
        return 'tournament';
      case 'rooms':
        return 'rooms_public';
      case 'leaderboard':
        return 'ranking';
      default:
        return 'home';
    }
  };

  const ACTIVE_GAME_TABS = [
    'auction',
    'match_simulation',
    'take_player_or_hidden',
    'hoartagy_hunter',
    'safi',
    'hidden_player',
    'truth_or_lie',
    'coach_challenge',
    'you_are_the_coach',
    'deal_or_no_deal'
  ];

  const isInActiveGame = ACTIVE_GAME_TABS.includes(activeTab);

  // ------------------------------------------------------------------
  // الرجوع بزر/إيماءة الهاتف: كل تنقّل بين الشاشات بيتسجّل في history
  // فالرجوع يرجّعك للشاشة السابقة (مش يقفل التطبيق).
  // ------------------------------------------------------------------
  const navStack = useRef<string[]>(['home']);
  const navFromPop = useRef(false);
  const navPrevTab = useRef<string>(activeTab);
  const activeTabRef = useRef(activeTab);
  const inGameRef = useRef(isInActiveGame);
  const [leaveAsk, setLeaveAsk] = useState(false);
  activeTabRef.current = activeTab;
  inGameRef.current = isInActiveGame;

  useEffect(() => {
    if (navFromPop.current) {
      navFromPop.current = false;
      navPrevTab.current = activeTab;
      return;
    }
    if (activeTab !== navPrevTab.current) {
      navStack.current.push(activeTab);
      try {
        window.history.pushState({ mw: navStack.current.length }, '');
      } catch {
        /* ignore */
      }
      navPrevTab.current = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    const NO_RETURN = ['auction', 'match_simulation', 'take_player_or_hidden', 'deal_or_no_deal'];
    const repush = () => {
      try {
        window.history.pushState({ mw: navStack.current.length }, '');
      } catch {
        /* ignore */
      }
    };
    const onPop = () => {
      // 1) نافذة/خطوة فرعية مفتوحة؟ اقفلها الأول
      if (runTopBackHandler()) {
        repush();
        return;
      }
      // 2) أثناء مباراة جارية: اسأل قبل الخروج
      if (inGameRef.current && activeTabRef.current !== 'match_simulation') {
        repush();
        setLeaveAsk(true);
        return;
      }
      // 3) رجوع عادي للشاشة السابقة
      if (navStack.current.length > 1) {
        navStack.current.pop();
        let target = navStack.current[navStack.current.length - 1];
        while (NO_RETURN.includes(target) && navStack.current.length > 1) {
          navStack.current.pop();
          target = navStack.current[navStack.current.length - 1];
        }
        if (target !== activeTabRef.current) navFromPop.current = true;
        navPrevTab.current = target;
        setActiveTab(target);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Floating Chat is STRICTLY visible ONLY during live active match gameplay
  const isInActiveGameplayMatch =
    [
      'auction',
      'match_simulation',
      'take_player_or_hidden',
      'hoartagy_hunter',
      'safi',
      'hidden_player',
      'truth_or_lie',
      'coach_challenge'
    ].includes(activeTab) ||
    (activeTab === 'you_are_the_coach' && isCoachMatchSimulating);

  if (showIntro) {
    return (
      <AppIntroSplash
        waitFor={catalogReady()}
        onFinished={() => {
          try {
            sessionStorage.setItem(INTRO_SHOWN_KEY, '1');
          } catch {
            // ignore storage errors (e.g. private browsing) — intro will
            // simply replay next load, which is harmless.
          }
          setShowIntro(false);
        }}
      />
    );
  }

  if (needsOnboarding) {
    return (
      <PlayerOnboarding
        onComplete={(profile) => {
          setUser(profile);
          setNeedsOnboarding(false);
          setActiveTab('games');
        }}
      />
    );
  }

  return (
    <ScreenBackground atmosphere={getAtmosphereForTab()} className="flex flex-col min-h-screen font-sans app-content-safe">
      <IncomingEventsHost user={user} />
      <RoomInviteHost user={user} />
      <NotificationPermissionPrompt playerRowId={user.id} />
      <NativeNotificationBridge userId={user.id} onOpenNotifications={() => setActiveTab('notifications')} />
      <Suspense fallback={<div className="fixed inset-0 z-[40] flex items-center justify-center bg-zinc-950/60"><div className="w-8 h-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" /></div>}>
      {leaveAsk && (
        <div dir="rtl" className="fixed inset-0 z-[500] flex items-end justify-center bg-black/55 px-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <div className="w-full max-w-sm text-center space-y-3 rounded-3xl bg-zinc-950/90 border border-white/15 backdrop-blur-sm p-4">
            <div className="text-base font-black text-white">تخرج من اللعبة؟</div>
            <div className="text-[11px] text-zinc-300">لو خرجت دلوقتي هتتحسب انسحاب.</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setLeaveAsk(false)} className="rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-zinc-950">كمّل اللعب</button>
              <button
                onClick={() => {
                  setLeaveAsk(false);
                  setActiveTab('games');
                }}
                className="rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white"
              >
                اخرج
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top Main Navigation Header - Hidden in Active Game */}
      {!isInActiveGame && (
        <Navbar
          user={user}
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'auction' || tab === 'auction_setup') {
              setActiveTab('auction_setup');
            } else {
              setActiveTab(tab);
            }
          }}
          onUpdateUser={handleUpdateUser}
        />
      )}

      {/* Main App Container: Sidebar on Large Screens + Dynamic Content Viewport */}
      <div className={isInActiveGame ? 'flex-1 w-full flex flex-col' : 'flex-1 flex w-full relative'}>
        {/* Desktop / Tablet Persistent Sidebar Navigation */}
        {!isInActiveGame && (
          <SidebarNavigation
            user={user}
            activeTab={activeTab}
            onTabChange={(tab) => {
              if (tab === 'auction' || tab === 'auction_setup') {
                setActiveTab('auction_setup');
              } else {
                setActiveTab(tab);
              }
            }}
            onUpdateUser={handleUpdateUser}
          />
        )}

        {/* Main Content Viewport */}
        <main className={isInActiveGame ? 'flex-1 w-full' : 'flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 pt-3 sm:pt-6 pb-20 sm:pb-24 min-w-0'}>
        {activeTab === 'home' && (
          <HomeView
            user={user}
            onSelectGame={handleSelectGame}
            onQuickAuction={handleOpenAuctionSetup}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'games' && (
          <GamesDiscoveryView
            user={user}
            onStart1v1Match={handleStart1v1MatchFromDiscovery}
            onNavigateToRooms={() => setActiveTab('rooms')}
            onUserUpdated={handleUpdateUser}
          />
        )}

        {/* Step 1 & 2: Format & Strategy Selection */}
        {activeTab === 'auction_setup' && (
          <AuctionModeStrategySelection
            user={user}
            onLaunchAuction={handleLaunchAuction}
            roomSettings={roomSettings}
            onBack={() => setActiveTab('games')}
          />
        )}

        {/* Active Auction Arena */}
        {activeTab === 'auction' && (
          <RosterGate
            onBack={() => setActiveTab('games')}
            needs={{
              gk: 2,
              def: auctionSettings.squadSize === 5 ? 2 : 8,
              mid: auctionSettings.squadSize === 5 ? 4 : 6,
              att: auctionSettings.squadSize === 5 ? 2 : 6,
              coaches: 2
            }}
          >
          <GameEntranceGate user={user} gameTitle="ساحة المزاد" opponentName={activeOpponent?.nameAr || "فريق AI"} opponentAvatar={activeOpponent?.avatar || "av_bot"} opponentEquipped={activeOpponent?.equippedCosmetics}>
            <AuctionGameView
              user={user}
              settings={auctionSettings}
              opponent={activeOpponent}
              onFinishGame={handleFinishAuction}
              onBackToHome={() => {
                handleUpdateUser(StorageService.getUserProfile());
                setActiveTab('home');
              }}
              onWithdraw={() => {
                handleUpdateUser(StorageService.getUserProfile());
                setActiveTab('home');
              }}
            />
          </GameEntranceGate>
          </RosterGate>
        )}

        {activeTab === 'deal_or_no_deal' && (
          <DealOrNoDealErrorBoundary onBack={() => setActiveTab('games')}>
            <GameEntranceGate user={user} gameTitle="ديل أو نو ديل">
              <DealOrNoDealGameView
                user={user}
                presetOpponent={dealOrNoDealOpponent}
                playMethod={dealOrNoDealPlayMethod}
                onBackToHome={() => {
                  handleUpdateUser(StorageService.getUserProfile());
                  setActiveTab('games');
                }}
                onWithdraw={() => {
                  handleUpdateUser(StorageService.getUserProfile());
                  setActiveTab('games');
                }}
              />
            </GameEntranceGate>
          </DealOrNoDealErrorBoundary>
        )}

        {activeTab === 'match_simulation' && (
          <MatchSimulationView
            userSquad={acquiredSquad}
            userCoach={selectedCoach}
            opponentSquad={acquiredOpponentSquad.length ? acquiredOpponentSquad : undefined}
            opponentCoach={selectedOpponentCoach}
            userAvatar={user.avatar}
            gameId="AUCTION"
            opponentPlayer={activeOpponent}
            opponentName={activeOpponent?.nameAr}
            opponentAvatar={activeOpponent?.avatar}
            sharedSeed={sharedMatchSeed}
            onFinishMatch={() => {
              handleUpdateUser(StorageService.getUserProfile());
              setActiveTab('games');
            }}
            onRematch={() => {
              // إعادة المباراة (ضد AI فقط): جلسة جديدة ببطاقات وseed جديدين
              setActiveTab('auction_setup');
            }}
            onWithdraw={() => {
              handleUpdateUser(StorageService.getUserProfile());
            }}
          />
        )}

        {activeTab === 'take_player_or_hidden' && (
          <RosterGate onBack={() => setActiveTab('games')} needs={{ gk: 2, def: 2, mid: 4, att: 2, coaches: 2 }}>
            <GameEntranceGate user={user} gameTitle="تاخد اللاعب ده ولا الخفي؟" opponentName={activeOpponent?.nameAr || "فريق AI"} opponentAvatar={activeOpponent?.avatar || "av_bot"} opponentEquipped={activeOpponent?.equippedCosmetics}>
              <TakePlayerOrHiddenGameView onBack={() => setActiveTab('games')} sharedSeed={sharedMatchSeed} opponentPlayer={activeOpponent} forcedFormat={roomSettings ? roomSettings.format : undefined} forcedMode={roomSettings ? ((activeOpponent ? 'PVP_1V1_AI' : roomSettings.mode === 'LOCAL' ? 'PVP_1V1_LOCAL' : roomSettings.mode === 'REFEREE' ? 'REFEREE_MODE' : 'PVP_1V1_AI') as any) : undefined} forcedDuration={roomSettings?.duration} />
            </GameEntranceGate>
          </RosterGate>
        )}

        {activeTab === 'hoartagy_hunter' && (
          <GameEntranceGate user={user} gameTitle="هوارتجي هنتر">
            <HoartagyHunterGameView onBack={() => setActiveTab('games')} />
          </GameEntranceGate>
        )}

        {activeTab === 'safi' && (
          <RosterGate onBack={() => setActiveTab('games')} needs={{ total: 30 }}>
            <GameEntranceGate user={user} gameTitle="اقف ف صفي">
              <PlayerGuessGameView onBack={() => setActiveTab('games')} sharedSeed={sharedMatchSeed} />
            </GameEntranceGate>
          </RosterGate>
        )}

        {activeTab === 'hidden_player' && (
          <RosterGate onBack={() => setActiveTab('games')} needs={{ total: 1 }}>
            <GameEntranceGate user={user} gameTitle="اللاعب الخفي">
              <HiddenPlayerGameView onBack={() => setActiveTab('games')} sharedSeed={sharedMatchSeed} />
            </GameEntranceGate>
          </RosterGate>
        )}

        {activeTab === 'truth_or_lie' && (
          <GameEntranceGate user={user} gameTitle="صدق أو كذب">
            <TruthOrLieGameView onBack={() => setActiveTab('games')} />
          </GameEntranceGate>
        )}

        {activeTab === 'coach_challenge' && (
          <CoachChallengeGameView onBack={() => setActiveTab('games')} />
        )}

        {activeTab === 'you_are_the_coach' && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('games')}
              className="fixed top-4 right-4 z-[100] w-12 h-12 rounded-2xl bg-zinc-950/90 border border-amber-400/70 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,.25)] backdrop-blur-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              aria-label="الصفحة الرئيسية"
              title="الصفحة الرئيسية"
            >
              <span className="text-lg">⌂</span>
            </button>
            <YouAreTheCoachGameView
              onBackToDiscovery={() => setActiveTab('games')}
              onMatchSimulationStateChange={setIsCoachMatchSimulating}
            />
          </>
        )}

        {activeTab === 'profile' && (
          <PlayerProfileView
            user={user}
            onUpdateUser={handleUpdateUser}
            onLogout={() => {
              setNeedsOnboarding(true);
              setActiveTab('home');
            }}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView user={user} onBack={() => setActiveTab('home')} onNavigate={(screen) => setActiveTab(screen)} />
        )}

        {activeTab === 'friends' && (
          <FriendsView
            user={user}
            onOpenChatWithFriend={(friend) => {
              setSelectedChatFriend(friend);
              setActiveTab('chat');
            }}
            onNavigateToChat={() => setActiveTab('chat')}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            user={user}
            selectedFriend={selectedChatFriend}
            onBackToFriends={() => setActiveTab('friends')}
          />
        )}

        {activeTab === 'tournament' && (
          <TournamentsPage
            user={user}
            onUpdateUser={handleUpdateUser}
            onBack={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsLobbyView
            user={user}
            onLaunchActiveGame={(gameType, mode, settings) => {
              if (settings) {
                setAuctionSettings(settings);
              }
              if (gameType === 'AUCTION') {
                setActiveTab('auction');
              } else if (gameType === 'PLAYER_OR_HIDDEN') {
                setActiveTab('take_player_or_hidden');
              } else if (gameType === 'HOARTAGY_HUNTER') {
                setActiveTab('hoartagy_hunter');
              } else if (gameType === 'SAFI') {
                setActiveTab('safi');
              } else {
                setActiveTab('auction');
              }
            }}
          />
        )}

        {activeTab === 'market' && (
          <MarketView
            user={user}
            onUpdateUser={handleUpdateUser}
            onBack={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'leaderboard' && <LeaderboardView user={user} />}

        {activeTab === 'achievements' && (
          <AchievementsView user={user} onUpdateUser={handleUpdateUser} />
        )}


        {activeTab === 'about' && <AboutView onBack={() => setActiveTab('home')} />}
        {activeTab === 'privacy' && <PrivacyPolicyView onBack={() => setActiveTab('home')} />}
      </main>
      </div>

      {/* Global Footer - Hidden in Active Game */}
      {!isInActiveGame && (
        <>
          <footer className="border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-md py-6 text-center text-xs text-zinc-500 mb-16 sm:mb-20">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>المواجهة | AL MWAJHA © 2026</div>
              <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                <span>Status: Online & Ready</span>
              </div>
            </div>
          </footer>

          {/* Glassmorphic Bottom Navigation Bar & Drawer */}
          <BottomNavigation
            user={user}
            activeTab={activeTab}
            onTabChange={(tab) => {
              if (tab === 'auction' || tab === 'auction_setup') {
                setActiveTab('auction_setup');
              } else {
                setActiveTab(tab);
              }
            }}
            onUpdateUser={handleUpdateUser}
          />
        </>
      )}
      </Suspense>
    </ScreenBackground>
  );
}
