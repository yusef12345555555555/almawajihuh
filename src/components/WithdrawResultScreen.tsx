// ============================================================
// المواجهة | AL MWAJHA — شاشة نتيجة الانسحاب
//
// القاعدة الثابتة: أي انسحاب في أي لعبة = فوز 1-0 للطرف اللي ما انسحبش.
// الشاشة شفافة فوق خلفية اللعبة (من غير مربع كبير)، والصور بتتعرض
// بمكوّن الصورة الصحيح (مش كنص) فمفيش روابط مكسورة.
// ============================================================

import React from 'react';
import { LogOut } from 'lucide-react';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';

interface Props {
  /** true when the person looking at this screen is the one who left. */
  didWithdraw: boolean;
  myName: string;
  myAvatar: string;
  opponentName: string;
  opponentAvatar: string;
  onBack: () => void;
}

/** أي قيمة مش صورة صالحة (زي إيموجي 🤖) تتحول لأيقونة الـ AI بدل ما تتعرض كنص. */
const safeOpponentAvatar = (a: string) => (a && (a.startsWith('av_') || /^(https?:|data:image|blob:|\/)/.test(a)) ? a : 'av_bot');

export const WithdrawResultScreen: React.FC<Props> = ({
  didWithdraw,
  myName,
  myAvatar,
  opponentName,
  opponentAvatar,
  onBack
}) => {
  return (
    <div dir="rtl" className="fixed inset-0 z-[9999] bg-black/55 flex items-center justify-center px-5 overflow-hidden">
      <div className="w-full max-w-xs text-center space-y-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
        <div className="w-12 h-12 rounded-full bg-rose-500/25 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-300">
          <LogOut className="w-6 h-6 rotate-180" />
        </div>

        <h2 className="text-lg font-black text-white leading-snug">
          {didWithdraw ? 'انسحبت — النتيجة 0 - 1' : 'الخصم انسحب — النتيجة 1 - 0'}
        </h2>

        {/* الخصم يمين — النتيجة في النص — أنت شمال */}
        <div className="flex items-center justify-center gap-4" dir="rtl">
          <div className="text-center w-20">
            <PlayerAvatarBadge avatar={safeOpponentAvatar(opponentAvatar)} size="md" className="mx-auto" />
            <div className="text-[11px] text-white font-black truncate mt-1.5">{opponentName}</div>
          </div>
          <div className="text-3xl font-black text-white tabular-nums" dir="ltr">
            {didWithdraw ? '0 - 1' : '1 - 0'}
          </div>
          <div className="text-center w-20">
            <PlayerAvatarBadge avatar={myAvatar} size="md" className="mx-auto" />
            <div className="text-[11px] text-white font-black truncate mt-1.5">{myName}</div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black text-sm active:scale-95 transition-transform"
        >
          رجوع
        </button>
      </div>
    </div>
  );
};
