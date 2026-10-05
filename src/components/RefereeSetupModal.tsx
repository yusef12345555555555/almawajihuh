// وضع الحكم: نفس نظام البحث والأصدقاء الموحد المستخدم في كل الألعاب.
import React, { useState } from 'react';
import { X, Gavel } from 'lucide-react';
import { PlayerSnapshot, UserProfile } from '../types';
import { SocialService } from '../services/socialService';
import { UnifiedPlayerPicker } from './UnifiedPlayerPicker';

interface Props {
  user: UserProfile;
  onClose: () => void;
  onStart: (players: [PlayerSnapshot, PlayerSnapshot]) => void;
}

export const RefereeSetupModal: React.FC<Props> = ({ user, onClose, onStart }) => {
  const friends = SocialService.getFriends();
  const [p1, setP1] = useState<PlayerSnapshot | null>(null);
  const [p2, setP2] = useState<PlayerSnapshot | null>(null);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/80 p-3" dir="rtl">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-black text-white"><Gavel className="w-5 h-5 text-amber-400" /> وضع الحكم</div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-zinc-400">اختار لاعبين من أصدقائك أو دور عليهم بالاسم أو اللقب أو ID.</p>
        <UnifiedPlayerPicker
          userId={user.id}
          friends={friends}
          value={p1}
          onSelect={setP1}
          onClear={() => setP1(null)}
          label="اللاعب الأول"
        />
        <UnifiedPlayerPicker
          userId={user.id}
          friends={friends}
          value={p2}
          onSelect={setP2}
          onClear={() => setP2(null)}
          disabledIds={p1 ? [p1.id] : []}
          label="اللاعب التاني"
        />
        <button
          type="button"
          disabled={!p1 || !p2}
          onClick={() => p1 && p2 && onStart([p1, p2])}
          className="w-full rounded-2xl bg-gradient-to-l from-amber-500 to-yellow-400 py-3.5 text-base font-black text-black disabled:opacity-40"
        >
          ابدأ الماتش
        </button>
      </div>
    </div>
  );
};
