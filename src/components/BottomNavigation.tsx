// ============================================================
// العبها صح | EL3BHA SA7 - Glassmorphic Bottom Navigation Bar & Mobile Drawer Hub
// With: Home, Leaderboard, Games, Profile/Squad, Tournaments, and "المزيد" Drawer
// ============================================================

import React, { useState, useEffect } from "react";
import {
  Home,
  Award,
  Swords,
  User,
  Trophy,
  Menu,
  X,
  Settings,
  Shield,
  BookOpen,
  Users,
  UserCheck,
  MessageSquare,
  Volume2,
  VolumeX,
  ChevronLeft,
  Flame,
  Sparkles,
  Coins,
  HelpCircle,
  LogOut,
  Sliders,
  ShoppingBag,
} from "lucide-react";
import { UserProfile } from "../types";
import { audioManager } from "../services/audioManager";
import { PlayerAvatarBadge } from "./PlayerAvatarBadge";

interface BottomNavigationProps {
  user: UserProfile;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenDocs?: () => void;
  onUpdateUser: (user: UserProfile) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenDocs,
  onUpdateUser,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(audioManager.getIsMuted());
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Lock background body scroll when drawer or profile modal is open
  useEffect(() => {
    if (isDrawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isDrawerOpen]);

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    audioManager.setMuted(next);
    if (!next) audioManager.playClick();
    onUpdateUser({ ...user, soundEnabled: !next });
  };

  const handleTabClick = (tabId: string) => {
    audioManager.playClick();
    onTabChange(tabId);
    setIsDrawerOpen(false);
  };

  // Nav Items definition for the Bottom Glass Bar
  const navTabs = [
    { id: "home", label: "الرئيسية", icon: Home },
    { id: "leaderboard", label: "التصنيف", icon: Award },
    { id: "games", label: "الألعاب", icon: Swords, highlight: true },
    { id: "tournament", label: "البطولات", icon: Trophy },
    { id: "friends", label: "الأصدقاء", icon: UserCheck },
  ];

  return (
    <>
      {/* 1. GLASSMORPHIC BLURRED BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-2 sm:p-3 pointer-events-none flex justify-center">
        <nav className="pointer-events-auto max-w-lg w-full bg-zinc-950/75 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] px-2 sm:px-3 py-1.5 flex items-center justify-between gap-1 transition-all duration-300 ring-1 ring-white/5 relative overflow-hidden">
          <div
            className="absolute top-0 left-3 right-3 h-[1.5px] opacity-60 pointer-events-none"
            style={{ background: "var(--border-aurora)" }}
          />

          {/* Main 5 Tabs */}
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`bottom_nav_${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                className={`group relative flex-1 flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "text-amber-400 font-black"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
              >
                {/* Active Glow Pill */}
                {isActive && (
                  <span className="absolute inset-0 bg-gradient-to-b from-amber-500/20 to-amber-500/5 rounded-xl sm:rounded-2xl border border-amber-400/30 -z-10 shadow-[0_0_15px_rgba(245,158,11,0.25)]" />
                )}

                {/* Center Highlight for Games */}
                {tab.highlight && (
                  <div
                    className={`p-1 rounded-lg ${isActive ? "bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/40" : "bg-zinc-800 text-amber-400"}`}
                  >
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                  </div>
                )}

                {!tab.highlight && (
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${
                      isActive
                        ? "scale-110 text-amber-400 stroke-[2.5]"
                        : "group-hover:scale-105"
                    }`}
                  />
                )}

                <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 tracking-tight truncate max-w-[55px]">
                  {tab.label}
                </span>

                {/* Top Active Dot Indicator */}
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] mt-0.5" />
                )}
              </button>
            );
          })}

          {/* 6. "المزيد" Button (Opens Full Sidebar Drawer & Settings) */}
          <button
            id="bottom_nav_more"
            onClick={() => {
              audioManager.playClick();
              setIsDrawerOpen(true);
            }}
            className={`group relative flex-1 flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer ${
              isDrawerOpen
                ? "text-amber-400 font-black"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            {isDrawerOpen && (
              <span className="absolute inset-0 bg-gradient-to-b from-amber-500/20 to-amber-500/5 rounded-xl sm:rounded-2xl border border-amber-400/30 -z-10 shadow-[0_0_15px_rgba(245,158,11,0.25)]" />
            )}
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:scale-105" />
            <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 tracking-tight truncate">
              المزيد
            </span>
          </button>
        </nav>
      </div>

      {/* 2. FULLSIDEBAR DRAWER (Glassmorphic Blur Side Sheet) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/70 backdrop-blur-md transition-opacity">
          {/* Backdrop dismiss */}
          <div
            className="absolute inset-0"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Side Drawer Body */}
          <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-zinc-950/95 backdrop-blur-2xl border-l border-white/10 p-5 flex flex-col justify-between overflow-y-auto text-white shadow-2xl z-10 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-sm font-black text-white">القائمة</span>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Mini Profile Card in Drawer */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PlayerAvatarBadge
                    avatar={user.avatar}
                    size="md"
                    ring={false}
                    className="!w-11 !h-11 border border-amber-400/60 shadow-md"
                  />
                  <div>
                    <h4 className="text-xs font-black text-white">
                      {user.nameAr || user.username}
                    </h4>
                    <span className="text-[10px] text-amber-400 font-bold block">
                      {user.rankTier} • {user.rating} ELO
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    audioManager.playClick();
                    handleTabClick("profile");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 cursor-pointer border border-zinc-700"
                >
                  تعديل
                </button>
              </div>

              {/* Currencies Bar in Drawer */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-amber-500/20 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-zinc-400 block">
                      الكوينز
                    </span>
                    <span className="font-black text-amber-400">
                      {user.coins.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Options List */}
            <div className="my-4 space-y-1">
              <span className="text-[10px] font-black text-zinc-500 px-2 block mb-1">
                كل الأقسام والصفحات
              </span>

              {[
                { id: "home", label: "الرئيسية (HQ)", icon: Home },
                {
                  id: "you_are_the_coach",
                  label: "أنت المدرب (محاكاة)",
                  icon: Trophy,
                },
                { id: "games", label: "الألعاب", icon: Swords },
                { id: "market", label: "السوق", icon: ShoppingBag },
                { id: "rooms", label: "الغرف والمواجهات", icon: Users },
                { id: "friends", label: "الأصدقاء", icon: UserCheck },
                { id: "chat", label: "الدردشة", icon: MessageSquare },
                { id: "tournament", label: "البطولات والكؤوس", icon: Trophy },
                { id: "leaderboard", label: "قائمة المتصدرين", icon: Award },
                {
                  id: "achievements",
                  label: "الإنجازات والأوسمة",
                  icon: Shield,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-black"
                        : "text-zinc-300 hover:bg-zinc-900/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-zinc-400"}`}
                      />
                      <span>{item.label}</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-zinc-600" />
                  </button>
                );
              })}
            </div>

            {/* Bottom Utilities: Audio, Docs & Quick Settings */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={toggleSound}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold flex items-center justify-center gap-2 text-zinc-300 cursor-pointer"
                >
                  {soundMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{soundMuted ? "الصوت مغلق" : "الصوت مفعل"}</span>
                </button>

              </div>

              <div className="flex items-center justify-center gap-4 pt-1 text-[10px] font-bold text-zinc-500">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onTabChange("about");
                  }}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  من نحن
                </button>
                <span className="text-zinc-700">•</span>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onTabChange("privacy");
                  }}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  سياسة الخصوصية
                </button>
              </div>

              <div className="text-center text-[10px] text-zinc-500 pt-1">
                المواجهة © 2026 • إصدار المحترفين
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
