// ============================================================
// العبها صح | EL3BHA SA7 - Player Headquarters & Profile View
// ============================================================

import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { audioManager } from '../services/audioManager';
import {
  Trophy,
  Coins,
  Ticket,
  Flame,
  Shield,
  Award,
  Play,
  Users,
  Sparkles,
  Zap,
  Target,
  Clock,
  Swords,
  ChevronLeft,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';
import { SocialService } from '../services/socialService';
import { getMatchHistory, getDailyChallenges, msUntilCairoMidnight } from '../services/dailyService';

interface HomeViewProps {
  user: UserProfile;
  onSelectGame: (gameId: string) => void;
  onQuickAuction: (mode: '100M' | '200M') => void;
  onNavigateTab: (tab: string) => void;
  onOpenDocs?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  onSelectGame,
  onQuickAuction,
  onNavigateTab,
  onOpenDocs
}) => {
  const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;
  // بيانات فعلية: آخر مباراة للاعب + أصدقاؤه المتصلين فعلاً
  const lastMatch = getMatchHistory()[0];
  const dailyList = getDailyChallenges();
  const dailyDone = dailyList.filter((c) => c.completed).length;
  const dailyNext = dailyList.find((c) => !c.completed) || dailyList[0];
  const hoursLeft = Math.max(1, Math.ceil(msUntilCairoMidnight() / 3600000));
  const [friends, setFriends] = useState(() => SocialService.getFriends());
  useEffect(() => {
    const unsub = SocialService.subscribe(() => setFriends(SocialService.getFriends()));
    void SocialService.pull();
    return unsub;
  }, []);
  const onlineFriends = friends.filter((f) => f.status === 'ONLINE' || f.status === 'IN_MATCH');
  const ago = (t: number) => {
    const m = Math.max(1, Math.round((Date.now() - t) / 60000));
    if (m < 60) return `منذ ${m} دقيقة`;
    const h = Math.round(m / 60);
    if (h < 24) return `منذ ${h} ساعة`;
    return `منذ ${Math.round(h / 24)} يوم`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Cinematic Compact Hero Arena Experience */}
      <section
        id="player_headquarters_hero"
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-zinc-950 p-3.5 sm:p-8 shadow-[0_0_40px_rgba(245,158,11,0.15)] surface-aurora"
      >
        <img src="/brand/home-bg.jpg" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-80" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/45 to-zinc-950/30" />
        {/* Dynamic Light Sweep & Stadium Floodlight Cones */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />
        <div
          className="absolute -inset-1/2 opacity-[0.07] pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, transparent, #f59e0b, transparent 30%)',
            animation: 'es-ring-spin 18s linear infinite'
          }}
        />

        <div className="relative z-10 space-y-3 sm:space-y-6">
          {/* Player Identity Strip */}
          <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-zinc-800/80">
            <button type="button" onClick={() => onNavigateTab('profile')} className="shrink-0 active:scale-95 transition-transform" aria-label="الملف الشخصي">
              <PlayerAvatarBadge avatar={user.avatar} size="lg" equipped={user.equippedCosmetics} className="!w-12 !h-12 sm:!w-16 sm:!h-16" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-black text-white truncate">{user.nameAr}</h2>
                <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30 font-bold">
                  {user.rankTier}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-zinc-500 font-mono">
                <span className="text-amber-400 font-bold">@{user.username}</span>
                <span className="text-zinc-700">•</span>
                <span>{user.playerId}</span>
              </div>
            </div>
          </div>

          {/* Top Row: Mini Badge & Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-transparent border border-amber-400/40 text-amber-300 text-[10px] sm:text-xs font-black">
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>مواجهة 1 ضد 1</span>
            </div>
            
            <span className="text-[10px] sm:text-xs text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              جاهز للعب
            </span>
          </div>

          {/* Main Title & Action CTAs Grid */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                جاهز للمواجهة؟
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 line-clamp-1 sm:line-clamp-none">
                العب، نافس، واكسب.
              </p>
            </div>

            {/* Main Action CTAs - Mobile Compact Grid */}
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
              <button
                id="hero_play_now_cta"
                onClick={() => {
                  audioManager.playClick();
                  onNavigateTab('games');
                }}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>العب دلوقتي</span>
              </button>

              <button
                id="hero_tournaments_cta"
                onClick={() => {
                  audioManager.playClick();
                  onNavigateTab('tournament');
                }}
                className="flex items-center justify-center gap-1 px-2.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-zinc-900 border border-amber-400/50 hover:border-amber-400 text-amber-300 font-black text-[11px] sm:text-xs active:scale-95 transition-all cursor-pointer"
              >
                <Trophy className="w-3 h-3 text-amber-400 fill-current" />
                <span>البطولات 🏆</span>
              </button>

              <button
                id="hero_create_room_cta"
                onClick={() => {
                  audioManager.playClick();
                  onNavigateTab('rooms');
                }}
                className="flex items-center justify-center gap-1 px-2.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-[11px] sm:text-xs active:scale-95 transition-all cursor-pointer"
              >
                <Users className="w-3 h-3 text-amber-400" />
                <span>الغرف</span>
              </button>
            </div>
          </div>

          {/* Player Mini Stats Strip */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 pt-2 border-t border-zinc-800/80">
            <div className="bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 text-center">
              <div className="text-[9px] text-zinc-400 font-bold">الانتصارات</div>
              <div className="text-xs sm:text-sm font-black text-white">{user.wins} فوز</div>
            </div>
            <div className="bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 text-center">
              <div className="text-[9px] text-zinc-400 font-bold">نسبة الفوز</div>
              <div className="text-xs sm:text-sm font-black text-emerald-400">{winRate}%</div>
            </div>
            <div className="bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 text-center">
              <div className="text-[9px] text-zinc-400 font-bold">التقييم (ELO)</div>
              <div className="text-xs sm:text-sm font-black text-amber-400">{user.rating}</div>
            </div>
            <div className="bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 text-center">
              <div className="text-[9px] text-zinc-400 font-bold">سلسلة الفوز</div>
              <div className="text-xs sm:text-sm font-black text-purple-400">{user.currentStreak} 🔥</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HQ Sections Grid: Daily Mission + Recent Match + Friends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
        {/* Daily Challenge */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-black text-amber-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                تحدي اليوم اليومي
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {hoursLeft} ساعة
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">{dailyNext?.titleAr}</h4>
            <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed">{dailyNext?.descriptionAr}</p>

            <div className="mt-2.5 space-y-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-zinc-400">التقدم • اكتمل {dailyDone}/{dailyList.length} تحديات</span>
                <span className="text-amber-400">{dailyNext?.progress} / {dailyNext?.total}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" style={{ width: `${dailyNext ? Math.min(100, (dailyNext.progress / dailyNext.total) * 100) : 0}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-400">+{dailyNext?.rewardCoins} 🪙 • +{dailyNext?.rewardXP} XP</span>
            <button
              onClick={() => onNavigateTab('achievements')}
              className="text-[11px] sm:text-xs font-black text-white hover:text-amber-400 flex items-center gap-0.5 cursor-pointer"
            >
              <span>ابدأ</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* آخر مواجهة — بيانات فعلية */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-black text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                آخر مواجهة
              </span>
              {lastMatch && <span className="text-[9px] sm:text-[10px] text-zinc-500">{ago(lastMatch.at)}</span>}
            </div>

            {lastMatch ? (
              <>
                <div className="bg-zinc-950/80 rounded-xl p-2 border border-zinc-800/80 flex items-center justify-between my-1">
                  <span className="text-[11px] font-bold text-white truncate">{user.nameAr}</span>
                  <div className="font-mono text-xs sm:text-sm font-black text-amber-400" dir="ltr">
                    {lastMatch.scoreFor} - {lastMatch.scoreAgainst}
                  </div>
                  <span className="text-[11px] font-bold text-zinc-300 truncate">{lastMatch.opponentName}</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  {lastMatch.gameLabelAr} • {lastMatch.result === 'WIN' ? 'فوز' : lastMatch.result === 'LOSS' ? 'خسارة' : 'تعادل'}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-zinc-500 py-3 text-center">لسه مالعبتش أي مواجهة — ابدأ أول ماتش!</p>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-400">{user.gamesPlayed} مباراة • {winRate}% فوز</span>
            <button
              onClick={() => onNavigateTab('leaderboard')}
              className="text-[11px] sm:text-xs font-black text-white hover:text-amber-400 flex items-center gap-0.5 cursor-pointer"
            >
              <span>الترتيب</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* الأصدقاء المتصلون فعلاً */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-black text-blue-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                المتصلون دلوقتي
              </span>
              <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold">{onlineFriends.length} متصل</span>
            </div>

            <div className="space-y-1.5">
              {onlineFriends.length === 0 && (
                <p className="text-[11px] text-zinc-500 py-3 text-center">مفيش أصدقاء متصلين دلوقتي</p>
              )}
              {onlineFriends.slice(0, 3).map((f) => (
                <div key={f.id} className="flex items-center justify-between bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/80">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[11px] font-bold text-white truncate">{f.nameAr || f.username}</span>
                  </div>
                  <button
                    onClick={() => onNavigateTab('friends')}
                    className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[9px] font-black hover:bg-amber-500 hover:text-zinc-950 transition-colors cursor-pointer"
                  >
                    تحدي
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400">غرف اللعب الخاصة</span>
            <button
              onClick={() => onNavigateTab('rooms')}
              className="text-[11px] sm:text-xs font-black text-amber-400 hover:underline cursor-pointer"
            >
              إنشاء غرفة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
