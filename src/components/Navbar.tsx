// ============================================================
// العبها صح | EL3BHA SA7 - Header & Navigation Bar
// ============================================================

import React, { useState } from "react";
import { UserProfile } from "../types";
import { audioManager } from "../services/audioManager";
import { BrandLogo } from "./BrandLogo";
import { PlayerAvatarBadge } from "./PlayerAvatarBadge";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import {
  Trophy,
  Coins,
  Ticket,
  Volume2,
  VolumeX,
  BookOpen,
  Settings,
  Shield,
  Flame,
  UserCheck,
  MessageSquare,
  Home,
  Users,
  Award,
  Swords,
  ShoppingBag,
} from "lucide-react";
import { PlayerCosmeticName } from "./PlayerCosmeticName";

interface NavbarProps {
  user: UserProfile;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenDocs?: () => void;
  onUpdateUser: (user: UserProfile) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenDocs,
  onUpdateUser,
}) => {
  const navItems = [
    { id: "home", labelAr: "الرئيسية (HQ)", icon: Home },
    { id: "games", labelAr: "الألعاب", icon: Swords },
    { id: "market", labelAr: "السوق", icon: ShoppingBag },
    { id: "rooms", labelAr: "الغرف والمواجهات", icon: Users },
    { id: "profile", labelAr: "ملفي الشخصي", icon: UserCheck },
    { id: "friends", labelAr: "الأصدقاء", icon: Users },
    { id: "chat", labelAr: "الدردشة", icon: MessageSquare },
    { id: "tournament", labelAr: "البطولات", icon: Trophy },
    { id: "leaderboard", labelAr: "المتصدرين", icon: Award },
    { id: "achievements", labelAr: "الإنجازات", icon: Shield },
  ];

  return (
    <header
      data-app-header
      className="sticky top-0 z-50 w-full border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur-xl shadow-2xl relative"
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-70"
        style={{
          background: "var(--gradient-aurora)",
          backgroundSize: "220% 220%",
          animation: "auroraDrift 12s ease infinite",
        }}
      />
      {/* Top Banner: Compact Mobile & Full Desktop Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
        {/* Left: Brand Logo */}
        <div
          id="brand_logo_header"
          onClick={() => {
            audioManager.playClick();
            onTabChange("home");
          }}
          className="cursor-pointer select-none flex items-center gap-2 group flex-shrink-0"
        >
          <BrandLogo variant="main" size="sm" glow={true} />
        </div>

        {/* Right: العملات + الإشعارات + الثيم (بدون صورة الملف/الصوت/الكأس) */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Coins */}
          <div
            id="user_coins_pill"
            className="flex items-center gap-1 bg-zinc-900/90 border border-amber-500/30 px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-black text-amber-400 shadow-inner"
          >
            <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span>{user.coins.toLocaleString("ar-EG")}</span>
          </div>

          <NotificationBell user={user} onNavigate={onTabChange} />

          <ThemeToggle />
        </div>
      </div>

      {/* Sub Navigation Bar: All Dedicated Pages (Hidden on small mobile screens to prioritize the sleek bottom bar) */}
      <nav className="hidden sm:block border-t border-zinc-800/80 bg-zinc-950/80 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-1 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav_tab_${item.id}`}
                onClick={() => {
                  audioManager.playClick();
                  onTabChange(item.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-black shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-zinc-400"}`}
                />
                <span>{item.labelAr}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
