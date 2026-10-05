// ============================================================
// المواجهة | AL MWAJHA — Player Profile (identity editing)
//
// Lets the player view/copy their permanent Player ID and change
// their name/nickname/avatar AFTER onboarding — without ever
// resetting career progress, stats, or achievements (only the
// identity fields are patched onto the existing profile object).
// ============================================================

import React, { useRef, useState } from "react";
import {
  Copy,
  Check,
  Upload,
  Save,
  X,
  Trophy,
  Swords,
  Target,
  Trash2,
  LogIn,
} from "lucide-react";
import { UserProfile } from "../types";
import { AVATAR_PRESETS } from "../data/avatarPresets";
import { getMarketItem, useMarketCatalog } from "../services/marketCatalog";
import { MatchHistoryList } from "./MatchHistoryList";
import { StorageService } from "../services/storageService";
import { PlayerAvatarBadge } from "./PlayerAvatarBadge";
import { PlayerCosmeticName } from "./PlayerCosmeticName";
import {
  computeGlobalStats,
  getCareerTimeline,
} from "../services/careerManagerService";

interface Props {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onLogout?: () => void;
}

export const PlayerProfileView: React.FC<Props> = ({
  user,
  onUpdateUser,
  onLogout,
}) => {
  const [nameAr, setNameAr] = useState(user.nameAr);
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDirty =
    nameAr !== user.nameAr ||
    username !== user.username ||
    avatar !== user.avatar;
  const coachingStats = computeGlobalStats();
  const coachingTimeline = [...getCareerTimeline()].reverse();

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.playerId || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — silently ignore
    }
  };

  const handlePhotoPick = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // Only identity fields change — every stat/achievement/career
    // field on `user` is preserved untouched.
    onUpdateUser({
      ...user,
      nameAr: nameAr.trim() || user.nameAr,
      username: username.trim() || user.username,
      avatar,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-black text-white mb-1">
        ملفي الشخصي
      </h1>
      <p className="text-sm text-zinc-400 mb-6">
        هويتك — غيّرها وقت ما تحب من غير ما تخسر أي حاجة
      </p>

      {/* Player ID card */}
      <div className="flex items-center justify-between gap-3 mb-6 rounded-2xl bg-zinc-900/70 px-5 py-4 relative overflow-hidden">
        <div
          className="absolute top-0 left-4 right-4 h-[1.5px] opacity-60 pointer-events-none"
          style={{ background: "var(--border-aurora)" }}
        />
        <div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
            Player ID
          </span>
          <span className="font-mono font-black text-amber-400 text-lg tracking-widest">
            {user.playerId}
          </span>
        </div>
        <button
          onClick={handleCopyId}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-amber-500/40 hover:text-amber-300 text-xs font-bold transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "اتنسخ!" : "نسخ"}
        </button>
      </div>


      <MatchHistoryList />

      {/* السوق — الحاجات اللي اشتريتها */}
      <div className="mb-6 rounded-3xl border border-amber-400/25 bg-zinc-950/80 p-5 shadow-[0_0_30px_rgba(245,158,11,.10)]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-black text-white">حاجاتك اللي جبتها من السوق 🛍️</h2>
            <p className="text-[11px] text-zinc-500 mt-1">كل حاجة اشتريتها بتفضل عندك هنا ومش بتضيع.</p>
          </div>
          <span className="rounded-full bg-amber-500/15 border border-amber-400/30 px-3 py-1 text-[10px] font-black text-amber-300">
            {(user.inventory || []).length} حاجات
          </span>
        </div>
        {(user.inventory || []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 p-5 text-center text-xs font-bold text-zinc-500">
            لسه مفيش حاجات هنا — خش السوق وهاتلك كام حاجة تظبط بيهم شكلك.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(user.inventory || []).map((id) => {
              const item = getMarketItem(id);
              if (!item) return null;
              const active = Object.values(user.equippedCosmetics || {}).includes(id);
              return (
                <div key={id} className={`rounded-2xl border p-3 text-center ${active ? "border-emerald-400/60 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900/70"}`}>
                  <img src={item.imageUrl} alt="" className="h-14 w-full object-contain mb-1" draggable={false} />
                  <div className="text-[11px] font-black text-white leading-tight">{item.nameAr}</div>
                  <div className="text-[9px] mt-1 font-bold text-zinc-500">{active ? "راكب دلوقتي ✓" : "موجود عندك"}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Professional coaching career — permanent and separate from player-game stats */}
      <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-blue-950/30 p-5 sm:p-6 mb-6 shadow-[0_0_35px_rgba(245,158,11,.08)]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">
              مسيرتي التدريبية الاحترافية
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1">
              النادي • الفترة • المباريات • الأهداف • البطولات
            </p>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-zinc-500">إجمالي المباريات</div>
            <div className="text-xl font-black text-amber-400">
              {coachingStats.totalMatches}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-3 text-center">
            <div className="text-lg font-black text-emerald-400">
              {coachingStats.totalWins}
            </div>
            <div className="text-[9px] text-zinc-500">انتصارات</div>
          </div>
          <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-3 text-center">
            <div className="text-lg font-black text-amber-400">
              {coachingStats.totalDraws}
            </div>
            <div className="text-[9px] text-zinc-500">تعادلات</div>
          </div>
          <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-3 text-center">
            <div className="text-lg font-black text-rose-400">
              {coachingStats.totalLosses}
            </div>
            <div className="text-[9px] text-zinc-500">هزائم</div>
          </div>
          <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-3 text-center">
            <div className="text-lg font-black text-white">
              {coachingStats.totalGoalsFor} / {coachingStats.totalGoalsAgainst}
            </div>
            <div className="text-[9px] text-zinc-500">سجل / استقبل</div>
          </div>
        </div>

        {coachingTimeline.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-5 text-center text-xs text-zinc-500">
            ابدأ لعبة «أنت المدرب» لتظهر أول محطة في مسيرتك.
          </div>
        ) : (
          <div className="space-y-2.5">
            {coachingTimeline.map((job) => {
              const start = new Date(job.startDate).getFullYear();
              const end = job.endDate
                ? new Date(job.endDate).getFullYear()
                : "الآن";
              return (
                <div
                  key={job.jobId}
                  className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-white">
                        {job.teamNameAr}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {start} — {end} • {job.competitionTitleAr}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-black px-2 py-1 rounded-full border ${job.status === "ACTIVE" ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/10" : "text-zinc-400 border-zinc-700 bg-zinc-900"}`}
                    >
                      {job.status === "ACTIVE" ? "حاليًا" : "انتهت المهمة"}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 mt-3">
                    <div className="rounded-xl bg-zinc-900 p-2 text-center">
                      <b className="block text-white text-xs">{job.matches}</b>
                      <span className="text-[8px] text-zinc-500">مباراة</span>
                    </div>
                    <div className="rounded-xl bg-zinc-900 p-2 text-center">
                      <b className="block text-emerald-400 text-xs">
                        {job.wins}
                      </b>
                      <span className="text-[8px] text-zinc-500">فوز</span>
                    </div>
                    <div className="rounded-xl bg-zinc-900 p-2 text-center">
                      <b className="block text-amber-400 text-xs">
                        {job.draws}
                      </b>
                      <span className="text-[8px] text-zinc-500">تعادل</span>
                    </div>
                    <div className="rounded-xl bg-zinc-900 p-2 text-center">
                      <b className="block text-rose-400 text-xs">
                        {job.losses}
                      </b>
                      <span className="text-[8px] text-zinc-500">خسارة</span>
                    </div>
                    <div className="rounded-xl bg-zinc-900 p-2 text-center">
                      <b className="block text-white text-xs">
                        {job.goalsFor}-{job.goalsAgainst}
                      </b>
                      <span className="text-[8px] text-zinc-500">أهداف</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick career stats — read-only, proves nothing resets here */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {[
          { icon: Trophy, label: "النقاط", value: user.points },
          { icon: Swords, label: "المباريات", value: user.gamesPlayed },
          { icon: Target, label: "الفوز", value: user.wins },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-center"
          >
            <Icon className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-sm font-black text-white">
              {(value ?? 0).toLocaleString("ar-EG")}
            </div>
            <div className="text-[10px] text-zinc-500 font-bold">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
        <label className="block text-xs font-bold text-zinc-400 mb-2">
          الاسم الكامل
        </label>
        <input
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          maxLength={30}
          className="w-full mb-4 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white outline-none transition-colors"
        />

        <label className="block text-xs font-bold text-zinc-400 mb-2">
          اللقب داخل اللعبة
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={16}
          className="w-full mb-5 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white outline-none transition-colors"
        />

        <label className="block text-xs font-bold text-zinc-400 mb-2">
          الصورة والشكل في المباريات
        </label>
        <div className="flex flex-col items-center justify-center mb-4 gap-2">
          <PlayerAvatarBadge avatar={avatar} size="xl" equipped={user.equippedCosmetics} />
          <div className="mt-1">
            <PlayerCosmeticName
              name={nameAr || username || "أنت"}
              equipped={user.equippedCosmetics}
              showTitle={true}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoPick(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-950 border border-dashed border-zinc-700 hover:border-amber-500/60 text-zinc-300 hover:text-amber-300 font-bold text-sm py-2.5 rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4" />
            ارفع صورة جديدة
          </button>
          {avatar !== user.avatar && (
            <button
              onClick={() => setAvatar(user.avatar)}
              title="إلغاء"
              className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2.5 mb-2">
          {AVATAR_PRESETS.map((preset) => {
            const isSelected = avatar === preset.id;
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                title={preset.nameAr}
                onClick={() => setAvatar(preset.id)}
                className={`relative flex items-center justify-center aspect-square rounded-xl transition-all duration-200 ${
                  isSelected
                    ? "scale-105 ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-900"
                    : "opacity-80 hover:opacity-100"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                }}
              >
                <Icon
                  className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow"
                  strokeWidth={2.25}
                />
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={!isDirty}
          className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-l from-amber-600 via-amber-500 to-yellow-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-zinc-950 font-black py-3.5 rounded-xl shadow-[0_10px_30px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-[0.98] transition-all"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "اتحفظ!" : "حفظ التغييرات"}
        </button>

        <div className="mt-8 pt-6 border-t border-zinc-800 space-y-3">
          <button
            onClick={() => {
              StorageService.deleteAccount();
              if (onLogout) onLogout();
              else window.location.reload();
            }}
            className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            <LogIn className="w-4 h-4" />
            تسجيل الدخول بحساب تاني
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 font-bold py-3 rounded-xl border border-rose-500/30 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              حذف حسابي
            </button>
          ) : (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 space-y-3 text-center">
              <p className="text-xs text-rose-200 font-bold">
                متأكد؟ هيتمسح كل حاجة ومفيش رجوع.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    StorageService.deleteAccount();
                    if (onLogout) onLogout();
                    else window.location.reload();
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-lg text-xs transition-all"
                >
                  امسح
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-2.5 rounded-lg text-xs transition-all"
                >
                  رجوع
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
