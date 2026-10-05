// ============================================================
// العبها صح | EL3BHA SA7 - Achievements & Trophy Cabinet
// ============================================================

import React, { useEffect, useState } from 'react';
import { UserProfile, Achievement } from '../types';
import { StorageService } from '../services/storageService';
import { audioManager } from '../services/audioManager';
import {
  DailyChallengeItem,
  DAILY_LOGIN_COINS,
  claimDailyChallenge,
  getDailyChallenges,
  hasClaimedDailyLogin,
  claimDailyLoginReward,
  msUntilCairoMidnight
} from '../services/dailyService';
import {
  Trophy,
  Award,
  CheckCircle2,
  Lock,
  Coins,
  Sparkles,
  Zap,
  Gift,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AchievementsViewProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ user, onUpdateUser }) => {
  const [achievements, setAchievements] = useState<Achievement[]>(() => StorageService.getAchievements());
  const [daily, setDaily] = useState<DailyChallengeItem[]>(() => getDailyChallenges());
  const [loginClaimed, setLoginClaimed] = useState<boolean>(() => hasClaimedDailyLogin());
  const [msLeft, setMsLeft] = useState<number>(() => msUntilCairoMidnight());

  // عدّاد حتى منتصف الليل (توقيت القاهرة) + تجديد التحديات تلقائياً مع تغيّر اليوم
  useEffect(() => {
    const t = setInterval(() => {
      const left = msUntilCairoMidnight();
      setMsLeft(left);
      setLoginClaimed(hasClaimedDailyLogin());
      setDaily(getDailyChallenges());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
  };

  const claimDaily = (id: string) => {
    audioManager.playGoal();
    setDaily(claimDailyChallenge(id));
    onUpdateUser(StorageService.getUserProfile());
    try {
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
    } catch {}
  };

  const handleClaim = (id: string) => {
    const ach = achievements.find((a) => a.id === id);
    if (!ach || ach.claimed) return;

    audioManager.playGoal();
    const updated = StorageService.claimAchievementReward(id);
    setAchievements(updated);

    const updatedUser = StorageService.getUserProfile();
    onUpdateUser(updatedUser);

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch {}
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-zinc-950/80 p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4 surface-aurora">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-black text-white">خزانة الإنجازات والأوسمة (Trophies)</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            أكمل التحديات التكتيكية واحصل على كوينز وتذاكر مجانية لتطوير ناديك
          </p>
        </div>

        <div className="bg-zinc-900 border border-amber-400/30 px-4 py-2 rounded-2xl text-center">
          <div className="text-[10px] text-zinc-400">الإنجازات المكتملة</div>
          <div className="text-xl font-black text-amber-400">
            {unlockedCount} / {achievements.length}
          </div>
        </div>
      </div>

      {/* مكافأة اللعب اليومي */}
      <div className="rounded-3xl border border-amber-400/40 bg-zinc-950/85 p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
          <Gift className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-white">مكافأة اللعب اليومي</div>
          <div className="text-[11px] text-zinc-400">+{DAILY_LOGIN_COINS} كوين مرة واحدة كل يوم بتوقيت مصر</div>
        </div>
        <button
          type="button"
          disabled={loginClaimed}
          onClick={() => {
            if (claimDailyLoginReward()) {
              audioManager.playGoal();
              setLoginClaimed(true);
              onUpdateUser(StorageService.getUserProfile());
            }
          }}
          className={`text-[11px] font-black px-3 py-1.5 rounded-xl ${loginClaimed ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30' : 'bg-amber-400 text-zinc-950 active:scale-95'}`}
        >
          {loginClaimed ? 'اتسلّمت النهاردة ✓' : `استلم +${DAILY_LOGIN_COINS} كوين`}
        </button>
      </div>

      {/* تحديات اليوم: 5 تحديات جديدة كل يوم */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">تحديات النهاردة</h3>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-black text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-full px-2.5 py-1" dir="ltr">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span className="tabular-nums">{fmt(msLeft)}</span>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500">بتتجدد الساعة 12 بالليل بتوقيت القاهرة بـ 5 تحديات جديدة.</p>
        <div className="space-y-2.5">
          {daily.map((c) => {
            const pct = Math.min(100, (c.progress / c.total) * 100);
            return (
              <div key={c.id} className={`rounded-2xl border p-3 ${c.completed ? 'border-emerald-400/40 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white">{c.titleAr}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{c.descriptionAr}</div>
                  </div>
                  <div className="shrink-0 text-[11px] font-black text-amber-300 text-left">
                    <div className="flex items-center gap-1"><Coins className="w-3.5 h-3.5" />+{c.rewardCoins}</div>
                    <div className="text-purple-300">+{c.rewardXP} XP</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-l from-amber-400 to-yellow-300 transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-300">{c.progress}/{c.total}</span>
                  {c.completed && (
                    <button
                      disabled={c.claimed}
                      onClick={() => claimDaily(c.id)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-black ${c.claimed ? 'bg-zinc-900 text-zinc-500 border border-zinc-800' : 'bg-amber-400 text-zinc-950 active:scale-95'}`}
                    >
                      {c.claimed ? 'تم ✓' : 'استلم 🎁'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid of Achievements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
              ach.unlocked
                ? 'bg-zinc-950/90 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'bg-zinc-950/40 border-zinc-900 opacity-60'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="text-3xl p-3 bg-zinc-900 rounded-2xl border border-zinc-800 shrink-0">
                {ach.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white">{ach.titleAr}</h4>
                  {ach.unlocked ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> مكتمل
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> مقفل
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{ach.descriptionAr}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-zinc-500">التقدم:</span>
                <span className="text-amber-400 font-bold">
                  {ach.progress} / {ach.maxProgress}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (ach.progress / ach.maxProgress) * 100)}%` }}
                />
              </div>
            </div>

            {/* Rewards and Claim Action */}
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Coins className="w-4 h-4" />
                <span>+{ach.rewardCoins} كوينز</span>
                <span className="text-purple-400">+{ach.rewardXP} XP</span>
              </div>

              {ach.unlocked && (
                <button
                  disabled={ach.claimed}
                  onClick={() => handleClaim(ach.id)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                    ach.claimed
                      ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                      : 'bg-amber-400 text-zinc-950 hover:bg-amber-300 active:scale-95 shadow'
                  }`}
                >
                  {ach.claimed ? 'تم استلام الجائزة' : 'استلام المكافأة 🎁'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
