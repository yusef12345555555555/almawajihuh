// ============================================================
// المواجهة | التشكيلتان تحت بعض (الخصم فوق ثم أنت) — كل تشكيلة فوقها مدربها، بدون أزرار تبديل ولا مربعات.
// ============================================================

import React from 'react';
import { Coach, EquippedCosmetics, FootballPlayer } from '../types';
import { FootballPitch } from './FootballPitch';
import { PlayerCosmeticName } from './PlayerCosmeticName';

interface Side {
  name: string;
  coach: Coach | null;
  squad: FootballPlayer[];
  equipped?: EquippedCosmetics;
  isUser: boolean;
}

// رأس التشكيلة: صورة المدرب كبيرة وواضحة جنب اسم اللاعب (صاحب التشكيلة)
const LineupHeader: React.FC<{ coach: Coach | null; label: string; name: string; equipped?: EquippedCosmetics }> = ({ coach, label, name, equipped }) => (
  <div className="flex items-center justify-center gap-3">
    {coach && (
      <img
        src={coach.photoUrl}
        alt={coach.nameAr}
        draggable={false}
        referrerPolicy="no-referrer"
        decoding="async"
        className="w-28 h-28 object-contain shrink-0"
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.7))' }}
      />
    )}
    <div className="min-w-0 text-center">
      <div className="flex justify-center">
        <PlayerCosmeticName name={name} equipped={equipped} size="md" />
      </div>
      {coach && (
        <div className="mt-1">
          <div className="text-[10px] font-black text-amber-300">{label}</div>
          <div className="text-base font-black text-white leading-tight">{coach.nameAr}</div>
          <div className="text-[10px] text-zinc-200">{coach.styleAr}</div>
          <div className="flex justify-center gap-2 text-[10px] font-black mt-0.5">
            <span className="text-emerald-300">هجوم +{coach.attackBonus}</span>
            <span className="text-sky-300">دفاع +{coach.defenseBonus}</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

export const StackedLineups: React.FC<{ top: Side; bottom: Side; squadSize: 5 | 11; highlightPlayerIds?: string[] }> = ({ top, bottom, squadSize, highlightPlayerIds }) => (
  <div className="space-y-4 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
    {[top, bottom].map((side, i) => (
      <div key={i} className="space-y-1.5">
        <LineupHeader coach={side.coach} label={side.isUser ? 'مدربك (اختاره النظام)' : 'مدرب الخصم'} name={side.name} equipped={side.equipped} />
        <div className="max-w-sm mx-auto">
          <FootballPitch
            mode={squadSize === 5 ? 'CLASSIC' : 'PRO'}
            squad={side.squad}
            teamName={side.name}
            isUser={side.isUser}
            showOwnership={false}
            ratioOverride={squadSize === 5 ? 0.78 : 0.7}
            equipped={side.equipped}
            highlightPlayerIds={side.isUser ? highlightPlayerIds : undefined}
          />
        </div>
      </div>
    ))}
  </div>
);
