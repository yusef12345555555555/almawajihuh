// ============================================================
// العبها صح | EL3BHA SA7 - Desktop & Tablet Sidebar Navigation
// Provides seamless, always-accessible side navigation on medium/large screens
// ============================================================

import React, { useState } from "react";
import { PlayerAvatarBadge } from "./PlayerAvatarBadge";
import {
  Home,
  Swords,
  Users,
  Trophy,
  UserCheck,
  MessageSquare,
  Award,
  Shield,
  BookOpen,
  Settings,
  Volume2,
  VolumeX,
  Coins,
  Play,
  Flame,
  ChevronLeft,
  Info,
  FileText,
  ShoppingBag,
} from "lucide-react";
import { UserProfile } from "../types";
import { audioManager } from "../services/audioManager";
import { PlayerCosmeticName } from "./PlayerCosmeticName";

interface SidebarNavigationProps {
  user: UserProfile;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenDocs?: () => void;
  onUpdateUser: (user: UserProfile) => void;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenDocs,
  onUpdateUser,
}) => {
  const [muted, setMuted] = useState(audioManager.getIsMuted());

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audioManager.setMuted(next);
    if (!next) audioManager.playClick();
    onUpdateUser({ ...user, soundEnabled: !next });
  };

  const navItems = [
    { id: "home", label: "الرئيسية", icon: Home, badge: null },
    {
      id: "you_are_the_coach",
      label: "أنت المدرب",
      icon: Trophy,
      badge: "⭐ إدارة",
    },
    { id: "games", label: "ساحة الألعاب", icon: Swords, badge: "🔥" },
    {
      id: "market",
      label: "السوق",
      icon: ShoppingBag,
      badge: "✨ متجر",
    },
    { id: "rooms", label: "غرف اللعب", icon: Users, badge: null },
    { id: "friends", label: "الأصدقاء", icon: UserCheck, badge: null },
    { id: "chat", label: "الدردشة", icon: MessageSquare, badge: null },
    {
      id: "tournament",
      label: "البطولات والكؤوس",
      icon: Trophy,
      badge: "🏆 كؤوس",
    },
    { id: "leaderboard", label: "لوحة المتصدرين", icon: Award, badge: null },
    {
      id: "achievements",
      label: "الإنجازات والأوسمة",
      icon: Shield,
      badge: null,
    },
    { id: "about", label: "من نحن", icon: Info, badge: null },
    { id: "privacy", label: "سياسة الخصوصية", icon: FileText, badge: null },
  ];

  return (
    <aside
      id="desktop_sidebar_navigation"
      className="hidden lg:flex flex-col w-64 xl:w-72 bg-zinc-950/90 backdrop-blur-2xl border-l border-zinc-800/80 p-4 sticky top-0 h-screen overflow-y-auto select-none flex-shrink-0 z-30 shadow-2xl justify-between relative"
      dir="rtl"
    >
      <div
        className="absolute top-0 bottom-0 right-0 w-[2px] opacity-60 pointer-events-none"
        style={{
          background: "var(--gradient-aurora)",
          backgroundSize: "220% 220%",
          animation: "auroraDrift 12s ease infinite",
        }}
      />
      {/* Top: User Profile (brand mark already shown once in the top header) */}
      <div className="space-y-4">
        <div className="border-b border-zinc-800/80 pb-3" />

        {/* User Mini Profile Card */}
        <div
          onClick={() => {
            audioManager.playClick();
            onTabChange("friends");
          }}
          className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <PlayerAvatarBadge
              avatar={user.avatar}
              size="sm"
              ring={false}
              className="!w-10 !h-10 border border-amber-400/80 group-hover:scale-105 transition-transform"
            />
            <div>
              <PlayerCosmeticName
                name={user.nameAr || user.username}
                equipped={user.equippedCosmetics}
                showTitle={false}
              />
              <div className="text-[10px] text-amber-400 font-bold">
                Lv.{user.level} • {user.rating} ELO
              </div>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
        </div>

        {/* Currencies & Points Widget */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-zinc-900/90 border border-amber-500/20 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-[9px] text-zinc-400 font-bold">الكوينز</div>
              <div className="text-xs font-black text-amber-400 font-mono">
                {user.coins.toLocaleString("ar-EG")}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items List */}
        <nav className="space-y-1 pt-2">
          <div className="text-[10px] font-black text-zinc-500 px-2.5 mb-1.5">
            أقسام المنصة والتحديات
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar_nav_${item.id}`}
                onClick={() => {
                  audioManager.playClick();
                  onTabChange(item.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-300 border border-amber-500/40 font-black shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${isActive ? "text-amber-400 stroke-[2.5]" : "text-zinc-400"}`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sidebar Actions: Sound, Quick Play & Version */}
      <div className="pt-4 border-t border-zinc-800/80 space-y-2.5">
        <button
          id="sidebar_quick_play_cta"
          onClick={() => {
            audioManager.playClick();
            onTabChange("games");
          }}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-zinc-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>العب دلوقتي</span>
        </button>

        <button
          onClick={toggleMute}
          className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          {muted ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>
            {muted ? "المؤثرات الصوتية: مغلقة" : "المؤثرات الصوتية: مفعلة"}
          </span>
        </button>

        <div className="text-center text-[10px] text-zinc-500 pt-1">
          المواجهة © 2026 • إصدار المحترفين
        </div>
      </div>
    </aside>
  );
};
