// ============================================================
// المواجهة | AL MWAJHA — تسجيل اللاعب لأول مرة
//
// مودال واحد فقط: الاسم + اللقب (فاضيين) + صورة اختيارية أو الأيقونة
// الافتراضية + زر "يلا نشوف الألعاب". مفيش إيميل ولا باسورد.
// رقم اللاعب (ELM1, ELM2 ...) بيتولد من السيرفر بالتسلسل.
// ============================================================

import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, WifiOff } from 'lucide-react';
import { UserProfile } from '../types';
import { StorageService } from '../services/storageService';
import { registerPlayerOnServer } from '../services/playerRegistration';
import { fileToAvatarDataUrl } from '../services/imageCompression';
import { DEFAULT_AVATAR_ID } from '../data/avatarPresets';
import { BrandLogo } from './BrandLogo';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';

interface PlayerOnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export const PlayerOnboarding: React.FC<PlayerOnboardingProps> = ({ onComplete }) => {
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // معرّف داخلي ثابت طول الجلسة عشان إعادة المحاولة ما تعملش لاعبين مكررين
  const internalId = useRef(`user_${Date.now().toString(36)}${Math.floor(Math.random() * 100000).toString(36)}`);

  const avatar = uploadedPhoto || DEFAULT_AVATAR_ID;

  const handlePhotoPick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('اختار صورة صح بس');
      return;
    }
    try {
      setUploadedPhoto(await fileToAvatarDataUrl(file));
      setError(null);
    } catch {
      setError('معرفناش نقرا الصورة دي، جرّب صورة تانية');
    }
  };

  const submit = async () => {
    if (busy) return;
    if (fullName.trim().length < 2) {
      setError('اكتب اسمك الأول');
      return;
    }
    if (nickname.trim().length < 2) {
      setError('اكتب لقبك داخل اللعبة');
      return;
    }
    setError(null);
    setOffline(false);
    setBusy(true);
    const res = await registerPlayerOnServer({
      id: internalId.current,
      username: nickname.trim(),
      nameAr: fullName.trim(),
      avatar
    });
    if (res.ok !== true) {
      setBusy(false);
      if ((res as { reason?: string }).reason === 'OFFLINE') setOffline(true);
      else setError('حصلت مشكلة في التسجيل، جرّب تاني');
      return;
    }
    const okRes = res as { id: string; playerId: string };
    const profile = StorageService.createPlayerProfile({
      id: okRes.id,
      playerId: okRes.playerId,
      username: nickname,
      nameAr: fullName,
      avatar
    });
    setBusy(false);
    onComplete(profile);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto px-4 py-6"
      style={{
        backgroundImage: "linear-gradient(rgba(3,7,18,.35), rgba(3,7,18,.7)), url('/brand/home-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-3">
          <BrandLogo variant="main" size="lg" />
        </div>

        <div className="rounded-3xl border border-amber-400/30 bg-zinc-950/70 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-5">
          <div className="absolute inset-x-6 top-[calc(100%-0px)]" />

          {/* الصورة: افتراضية أو مرفوعة */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <PlayerAvatarBadge avatar={avatar} size="lg" />
            <div className="flex flex-col gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handlePhotoPick(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 bg-zinc-900 border border-dashed border-zinc-600 hover:border-amber-400 text-zinc-200 text-xs font-black px-3 py-2 rounded-xl"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadedPhoto ? 'غيّر الصورة' : 'ارفع صورتك'}
              </button>
              {uploadedPhoto && (
                <button
                  type="button"
                  onClick={() => setUploadedPhoto(null)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-rose-400"
                >
                  <X className="w-3 h-3" />
                  استخدم الأيقونة الافتراضية
                </button>
              )}
            </div>
          </div>

          <label className="block text-[11px] font-black text-zinc-300 mb-1">الاسم</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={30}
            autoComplete="off"
            className="w-full mb-3 bg-zinc-950/80 border border-zinc-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white outline-none transition-colors"
          />

          <label className="block text-[11px] font-black text-zinc-300 mb-1">اللقب</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={16}
            autoComplete="off"
            className="w-full mb-2 bg-zinc-950/80 border border-zinc-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white outline-none transition-colors"
          />

          {error && <p className="text-xs font-bold text-rose-400 mt-1">{error}</p>}
          {offline && (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-2 mt-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              محتاجين نت عشان نسجّلك ونديك رقمك. اتأكد من الاتصال وجرّب تاني.
            </div>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-l from-amber-600 via-amber-500 to-yellow-400 text-zinc-950 font-black py-3 rounded-xl shadow-[0_10px_30px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                بنسجّلك...
              </>
            ) : offline ? (
              'حاول تاني'
            ) : (
              'يلا نشوف الألعاب'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
