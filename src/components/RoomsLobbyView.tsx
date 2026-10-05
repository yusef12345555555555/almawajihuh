// ============================================================
// العبها صح | EL3BHA SA7 - Comprehensive 1v1 Rooms Lobby & Game Filtering
// ============================================================

import React, { useState, useEffect } from "react";
import {
  Room,
  RoomParticipant,
  UserProfile,
  AuctionRoomSettings,
} from "../types";
import { SupportedGameType, GAME_REGISTRY } from "../services/gameRegistry";
import { audioManager } from "../services/audioManager";
import { GamePreparingView } from "./GamePreparingView";
import {
  Users,
  Plus,
  Lock,
  Unlock,
  Play,
  Copy,
  Check,
  Sparkles,
  Bot,
  Search,
  Flame,
  Shield,
  ArrowRight,
  Swords,
  Globe,
  Share2,
  AlertCircle,
  CheckCircle2,
  Clock,
  LogOut,
  UserCheck,
  Gavel,
  EyeOff,
  BrainCircuit,
  Filter,
} from "lucide-react";

export type RoomGameFilter = "ALL" | SupportedGameType;

export interface RoomsLobbyViewProps {
  user: UserProfile;
  initialGameFilter?: RoomGameFilter;
  onLaunchActiveGame: (
    gameType: SupportedGameType,
    mode: string,
    settings?: AuctionRoomSettings,
  ) => void;
}

export interface DynamicRoom {
  id: string;
  code: string;
  title: string;
  gameType: SupportedGameType;
  gameMode: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  isPrivate: boolean;
  maxParticipants: 2;
  currentParticipants: number;
  status: "LOBBY" | "IN_GAME" | "FULL";
  settings: AuctionRoomSettings;
  createdAt: number;
}

const INITIAL_PUBLIC_1V1_ROOMS: DynamicRoom[] = [];

export const RoomsLobbyView: React.FC<RoomsLobbyViewProps> = ({
  user,
  initialGameFilter = "ALL",
  onLaunchActiveGame,
}) => {
  const [rooms, setRooms] = useState<DynamicRoom[]>(INITIAL_PUBLIC_1V1_ROOMS);
  const [activeFilter, setActiveFilter] =
    useState<RoomGameFilter>(initialGameFilter);
  const [roomCategory, setRoomCategory] = useState<
    "public" | "private_create" | "private_join"
  >("public");

  // Creation form state
  const [createType, setCreateType] = useState<"public" | "private">("public");
  const [createGameType, setCreateGameType] =
    useState<SupportedGameType>("AUCTION");
  const [createMode, setCreateMode] = useState<string>("كلاسيك 100M");
  const [roomTitle, setRoomTitle] = useState("");
  const [budgetMode, setBudgetMode] = useState<"100M" | "200M">("100M");

  // Private Room Sharing
  const [generatedPrivateRoom, setGeneratedPrivateRoom] = useState<{
    id: string;
    code: string;
    link: string;
    room: DynamicRoom;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Active Waiting Room Lobby State
  const [activeWaitingRoom, setActiveWaitingRoom] = useState<{
    room: DynamicRoom;
    isHost: boolean;
    userReady: boolean;
    opponentReady: boolean;
    opponent: { name: string; avatar: string };
  } | null>(null);

  // Preparing State (Transitions to countdown + gameplay screen)
  const [isPreparingGame, setIsPreparingGame] = useState<boolean>(false);

  // Filter tabs definition
  const filterTabs: {
    id: RoomGameFilter;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: "ALL", label: "الكل", icon: <Globe className="w-3.5 h-3.5" /> },
    { id: "AUCTION", label: "المزاد", icon: <Gavel className="w-3.5 h-3.5" /> },
    {
      id: "PLAYER_OR_HIDDEN",
      label: "اللاعب الخفي",
      icon: <EyeOff className="w-3.5 h-3.5" />,
    },
    {
      id: "HOARTAGY_HUNTER",
      label: "الحوارتجي والصياد",
      icon: <Flame className="w-3.5 h-3.5" />,
    },
    { id: "SAFI", label: "صفّي", icon: <Swords className="w-3.5 h-3.5" /> },
  ];

  // Filter public rooms strictly by active filter and privacy
  const filteredRooms = rooms.filter((r) => {
    if (r.isPrivate) return false;
    if (activeFilter === "ALL") return true;
    return r.gameType === activeFilter;
  });

  const handleEnterLobby = (room: DynamicRoom, isHost: boolean = false) => {
    audioManager.playClick();
    const botOpponent = {
      name: isHost ? "الخصم التكتيكي" : room.hostName,
      avatar: isHost
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
        : room.hostAvatar,
    };

    setActiveWaitingRoom({
      room,
      isHost,
      userReady: false,
      opponentReady: true,
      opponent: botOpponent,
    });
  };

  const handleToggleReady = () => {
    audioManager.playClick();
    if (!activeWaitingRoom) return;

    const nextUserReady = !activeWaitingRoom.userReady;
    setActiveWaitingRoom({
      ...activeWaitingRoom,
      userReady: nextUserReady,
    });

    // If both user and opponent are now ready, auto-trigger match countdown immediately!
    if (nextUserReady && activeWaitingRoom.opponentReady) {
      setTimeout(() => {
        audioManager.playWhistle();
        setIsPreparingGame(true);
      }, 400);
    }
  };

  const handleStartGameFromLobby = () => {
    if (!activeWaitingRoom) return;
    if (!activeWaitingRoom.userReady || !activeWaitingRoom.opponentReady)
      return;

    audioManager.playWhistle();
    setIsPreparingGame(true);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    audioManager.playClick();

    const selectedRegistry = GAME_REGISTRY[createGameType];
    const defaultSettings: AuctionRoomSettings = {
      budgetMode: budgetMode,
      initialBudget: budgetMode === "100M" ? 100 : 200,
      squadSize: budgetMode === "100M" ? 5 : 11,
      bidTimerSeconds: 15,
      bidTimeLimitSeconds: 15,
      bidIncrement: 1,
      fastBidConfirm: false,
      allowBots: false,
      mysteryPlayerChance: 0.3,
    };

    const newRoom: DynamicRoom = {
      id: `room_${Date.now()}`,
      code: `SA7-${Math.floor(100 + Math.random() * 900)}`,
      title:
        roomTitle.trim() ||
        `مواجهة ${selectedRegistry.nameAr} - ${user.nameAr || user.username}`,
      gameType: createGameType,
      gameMode: createMode || selectedRegistry.modes[0].nameAr,
      hostId: user.id,
      hostName: user.nameAr || user.username,
      hostAvatar: user.avatar,
      isPrivate: createType === "private",
      maxParticipants: 2,
      currentParticipants: 1,
      status: "LOBBY",
      settings: defaultSettings,
      createdAt: Date.now(),
    };

    if (createType === "private") {
      const code = `SA7-${Math.floor(1000 + Math.random() * 9000)}`;
      const link = `${window.location.origin}/join/${code}`;
      setGeneratedPrivateRoom({
        id: newRoom.id,
        code,
        link,
        room: { ...newRoom, code },
      });
    } else {
      setRooms([newRoom, ...rooms]);
      handleEnterLobby(newRoom, true);
      setRoomTitle("");
    }
  };

  const handleJoinPrivateByCode = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!joinCodeInput.trim()) return;

    audioManager.playClick();
    const code = joinCodeInput.trim().toUpperCase();

    const dummyPrivateRoom: DynamicRoom = {
      id: `private_${Date.now()}`,
      code,
      title: `غرفة خاصة (${code})`,
      gameType: "AUCTION",
      gameMode: "كلاسيك 100M",
      hostId: "host_vip",
      hostName: "المستضيف الخاص (VIP)",
      hostAvatar:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      isPrivate: true,
      maxParticipants: 2,
      currentParticipants: 1,
      status: "LOBBY",
      settings: {
        budgetMode: "100M",
        initialBudget: 100,
        squadSize: 5,
        bidTimerSeconds: 15,
        bidIncrement: 1,
        fastBidConfirm: false,
      },
      createdAt: Date.now(),
    };
    handleEnterLobby(dummyPrivateRoom, false);
  };

  // If Preparing -> Render authoritative countdown and loading before real game
  if (isPreparingGame && activeWaitingRoom) {
    return (
      <GamePreparingView
        gameType={activeWaitingRoom.room.gameType}
        gameMode={activeWaitingRoom.room.gameMode}
        opponentName={activeWaitingRoom.opponent.name}
        opponentAvatar={activeWaitingRoom.opponent.avatar}
        onReadyToPlay={() => {
          onLaunchActiveGame(
            activeWaitingRoom.room.gameType,
            activeWaitingRoom.room.gameMode,
            activeWaitingRoom.room.settings,
          );
        }}
      />
    );
  }

  // IF INSIDE ACTIVE ROOM WAITING LOBBY
  if (activeWaitingRoom) {
    const { room, isHost, userReady, opponentReady, opponent } =
      activeWaitingRoom;
    const canStart = userReady && opponentReady;
    const gameInfo = GAME_REGISTRY[room.gameType] || GAME_REGISTRY.AUCTION;

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-16 select-none">
        <div className="bg-zinc-950/95 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl surface-aurora">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white">
                    {room.title}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                    {gameInfo.nameAr}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  كود الغرفة:{" "}
                  <span className="font-mono text-amber-400">{room.code}</span>{" "}
                  • النمط: {room.gameMode}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveWaitingRoom(null)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>مغادرة اللوبي</span>
            </button>
          </div>

          {/* Faceoff Waiting Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Player 1 (You) */}
            <div className="bg-zinc-900/90 border-2 border-amber-500/60 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="text-base font-black text-amber-400">
                    {user.nameAr || user.username}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {isHost ? "مستضيف الغرفة (Host)" : "المنافس (Opponent)"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span
                  className={`text-xs font-black ${userReady ? "text-emerald-400" : "text-zinc-500"}`}
                >
                  {userReady ? "✓ أنت جاهز للبدء" : "في انتظار جاهزيتك"}
                </span>

                <button
                  id="toggle_ready_btn"
                  onClick={handleToggleReady}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    userReady
                      ? "bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                      : "bg-zinc-800 hover:bg-zinc-700 text-white"
                  }`}
                >
                  {userReady ? "جاهز (Ready) ✓" : "أنا جاهز (I am Ready)"}
                </button>
              </div>
            </div>

            {/* Player 2 (Opponent) */}
            <div className="bg-zinc-900/90 border-2 border-blue-500/50 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={opponent.avatar}
                  alt={opponent.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-400"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="text-base font-black text-blue-400">
                    {opponent.name}
                  </div>
                  <div className="text-xs text-zinc-400">المنافس التكتيكي</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>الخصم جاهز للمباراة</span>
                </span>

                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                  Ready ✓
                </span>
              </div>
            </div>
          </div>

          {/* Start Button Area (Host Only starts after both ready) */}
          <div className="text-center pt-4 space-y-3">
            <div>
              {!canStart && (
                <p className="text-xs text-amber-300/80 mb-3 font-bold">
                  ⚠️ دوس "أنا جاهز" عشان تقدروا تبدأوا.
                </p>
              )}

              {isHost ? (
                <button
                  id="start_room_match_btn"
                  disabled={!canStart}
                  onClick={handleStartGameFromLobby}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>بدء المباراة 1 VS 1</span>
                </button>
              ) : (
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm mx-auto text-xs text-zinc-400 font-bold">
                  {canStart
                    ? "في انتظار بدء المستضيف للمواجهة..."
                    : "في انتظار اكتمال الجاهزية..."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 select-none">
      {/* Header & Category Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
            <span>الرئيسية</span>
            <span>&gt;</span>
            <span className="text-white">غرف المواجهات المباشرة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            الغرف التنافسية (1 VS 1 Rooms)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            كل غرفة لاعبين بس — مواجهة صريحة من غير زحمة
          </p>
        </div>

        {/* Navigation Mode Selector */}
        <div className="flex bg-zinc-900/90 border border-zinc-800 p-1 rounded-2xl gap-1 text-xs font-bold">
          <button
            onClick={() => {
              audioManager.playClick();
              setRoomCategory("public");
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              roomCategory === "public"
                ? "bg-amber-500 text-zinc-950 font-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>الغرف العامة</span>
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setRoomCategory("private_create");
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              roomCategory === "private_create"
                ? "bg-purple-600 text-white font-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>إنشاء غرفة خاصة</span>
          </button>

          <button
            onClick={() => {
              audioManager.playClick();
              setRoomCategory("private_join");
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              roomCategory === "private_join"
                ? "bg-blue-600 text-white font-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>انضمام بكود</span>
          </button>
        </div>
      </div>

      {roomCategory === "public" && (
        <div className="space-y-5">
          {/* Game Filter Bar */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 p-2 rounded-2xl space-y-2">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <span>تصفية الغرف بحسب اللعبة:</span>
              </span>
              <button
                onClick={() => setRoomCategory("private_create")}
                className="flex items-center gap-1 text-xs font-black text-amber-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إنشاء غرفة جديدة</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`filter_tab_${tab.id}`}
                    onClick={() => {
                      audioManager.playClick();
                      setActiveFilter(tab.id);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                        : "bg-zinc-900/90 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-3">
              <Swords className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">
                لا توجد غرف عامة مفتوحة عندي اللعبة حالياً
              </h3>
              <p className="text-xs text-zinc-400">
                كن أول من ينشئ غرفة ويبدأ التحدي المباشر!
              </p>
              <button
                onClick={() => {
                  if (activeFilter !== "ALL") setCreateGameType(activeFilter);
                  setRoomCategory("private_create");
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs hover:bg-yellow-400 cursor-pointer"
              >
                إنشاء غرفة دلوقتي
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRooms.map((room) => {
                const isFull = room.currentParticipants >= 2;
                const gameInfo =
                  GAME_REGISTRY[room.gameType] || GAME_REGISTRY.AUCTION;

                return (
                  <div
                    key={room.id}
                    className={`bg-zinc-900/90 border p-5 rounded-3xl shadow-xl flex flex-col justify-between transition-all ${
                      isFull
                        ? "border-zinc-800/60 opacity-80"
                        : "border-zinc-800 hover:border-amber-400/60"
                    }`}
                  >
                    <div>
                      {/* Top Header: Badge & Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                            <Swords className="w-3 h-3" />1 VS 1
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold">
                            {gameInfo.nameAr}
                          </span>
                        </div>

                        <span
                          className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold ${
                            isFull
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {room.currentParticipants} / 2 لاعب
                        </span>
                      </div>

                      {/* Title & Host Profile */}
                      <h3 className="text-base font-black text-white">
                        {room.title}
                      </h3>

                      <div className="flex items-center gap-2.5 mt-2">
                        <img
                          src={room.hostAvatar}
                          alt={room.hostName}
                          className="w-6 h-6 rounded-full object-cover border border-amber-400/60"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs text-zinc-400">
                          صاحب الغرفة:{" "}
                          <span className="text-zinc-200 font-bold">
                            {room.hostName}
                          </span>
                        </span>
                      </div>

                      {/* Mode specs */}
                      <div className="flex items-center gap-2 mt-4 text-[11px] text-zinc-300">
                        <span className="bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800 font-bold text-amber-400">
                          النمط: {room.gameMode}
                        </span>
                        {room.settings.initialBudget && (
                          <span className="bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800">
                            الميزانية: {room.settings.initialBudget}M
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer & Join Action */}
                    <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                      <span
                        className={`text-[11px] font-bold ${isFull ? "text-rose-400" : "text-emerald-400"}`}
                      >
                        {isFull
                          ? "● الغرفة مكتملة (2/2)"
                          : "● بانتظار الخصم الثاني (1/2)"}
                      </span>

                      <button
                        disabled={isFull}
                        onClick={() => handleEnterLobby(room, false)}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black text-xs hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isFull ? "الغرفة مكتملة" : "انضمام"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Create Room View */}
      {roomCategory === "private_create" && (
        <div className="max-w-2xl mx-auto bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              إنشاء غرفة مواجهة 1 VS 1
            </h3>
            <p className="text-xs text-zinc-400">
              حدد اللعبة والنمط ونوع الغرفة للمواجهة الفردية الصارمة
            </p>
          </div>

          <form onSubmit={handleCreateRoom} className="space-y-5">
            {/* Visibility */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300">
                نوع الغرفة (Visibility):
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCreateType("public")}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                    createType === "public"
                      ? "bg-emerald-500/10 border-emerald-400 text-white shadow-md"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-sm text-emerald-400 mb-1">
                    <Globe className="w-4 h-4" />
                    <span>🟢 عامة (Public)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    تظهر في قائمة الغرف العامة المباشرة.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateType("private")}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                    createType === "private"
                      ? "bg-purple-500/10 border-purple-400 text-white shadow-md"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-sm text-purple-400 mb-1">
                    <Lock className="w-4 h-4" />
                    <span>🔒 خاصة (VIP)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    الدخول عبر كود أو رابط خاص فقط.
                  </p>
                </button>
              </div>
            </div>

            {/* Game Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300">
                اختار اللعبة الإلزامية:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(GAME_REGISTRY).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setCreateGameType(g.id);
                      setCreateMode(g.modes[0].nameAr);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      createGameType === g.id
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 font-black"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <span className="text-xs">{g.nameAr}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Room Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">
                اسم الغرفة:
              </label>
              <input
                type="text"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder="مثال: ديربي الأساطير"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Budget / Mode if Auction */}
            {createGameType === "AUCTION" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  نمط المزاد:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetMode("100M");
                      setCreateMode("كلاسيك 100M");
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      budgetMode === "100M"
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 font-black"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    كلاسيك 100M (5 لاعبين)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetMode("200M");
                      setCreateMode("برو ماكس 200M");
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      budgetMode === "200M"
                        ? "bg-purple-500/20 border-purple-400 text-purple-300 font-black"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    برو ماكس 200M (11 لاعباً)
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              {createType === "private"
                ? "توليد رابط الغرفة الخاصة 🔒"
                : "إنشاء ودخول اللوبي 🟢"}
            </button>
          </form>

          {/* Generated Private Room Share Box */}
          {generatedPrivateRoom && (
            <div className="mt-6 p-5 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-3 text-right">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-300">
                  تم إنشاء الغرفة الخاصة بنجاح! 🔒
                </span>
                <span className="text-xs font-mono font-black text-amber-400">
                  {generatedPrivateRoom.code}
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                أرسل ده الرابط أو الكود لصديقك ليدخل معك مباشرة في المواجهة:
              </p>

              <div className="flex items-center gap-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                <input
                  type="text"
                  readOnly
                  value={generatedPrivateRoom.link}
                  className="flex-1 bg-transparent text-xs text-zinc-300 font-mono focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPrivateRoom.link);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 cursor-pointer"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedLink ? "تم النسخ" : "نسخ الرابط"}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  handleEnterLobby(generatedPrivateRoom.room, true);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs hover:bg-yellow-400 cursor-pointer"
              >
                الدخول لانتظار الخصم في اللوبي
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Join Private Room by Code */}
      {roomCategory === "private_join" && (
        <div className="max-w-md mx-auto bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mx-auto">
            <Share2 className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-xl font-black text-white">
              الانضمام لغرفة خاصة
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              أدخل كود الدعوة (مثال: SA7-4081) للدخول الفوري للمواجهة
            </p>
          </div>

          <form onSubmit={handleJoinPrivateByCode} className="space-y-4">
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="SA7-XXXX"
              className="w-full bg-zinc-950 border border-zinc-800 text-center font-mono font-black text-lg text-amber-400 tracking-widest rounded-2xl py-3 focus:outline-none focus:border-amber-400"
            />

            {joinError && (
              <p className="text-xs text-rose-400 font-bold">{joinError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              الانضمام للوبي المباراة
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
