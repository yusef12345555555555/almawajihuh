// ============================================================
// العبها صح | EL3BHA SA7 - Tactical Coach Card
// ============================================================

import React from 'react';
import { Coach } from '../types';
import { Shield, Flame, Activity, Zap, Check } from 'lucide-react';

interface CoachCardProps {
  coach: Coach;
  selected?: boolean;
  onSelect?: () => void;
}

export const CoachCard: React.FC<CoachCardProps> = ({ coach, selected = false, onSelect }) => {
  return (
    <div
      id={`coach_card_${coach.id}`}
      onClick={onSelect}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 p-4 cursor-pointer select-none bg-gradient-to-b from-zinc-900 via-zinc-950 to-black ${
        selected
          ? 'border-amber-400 ring-4 ring-amber-400/30 shadow-[0_0_25px_rgba(245,158,11,0.4)] scale-[1.02]'
          : 'border-zinc-800 hover:border-zinc-700 hover:scale-[1.01]'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-400/60 shrink-0">
          <img
            src={coach.photoUrl}
            alt={coach.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-black text-white truncate">{coach.nameAr}</h4>
            <span className="text-sm font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
              {coach.rating}
            </span>
          </div>

          <div className="text-xs font-semibold text-emerald-400 mt-0.5">{coach.styleAr}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">{coach.nationalityAr}</div>
        </div>
      </div>

      <p className="text-xs text-zinc-300 mt-3 line-clamp-2 leading-relaxed bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/60">
        {coach.descriptionAr}
      </p>

      {/* Bonus Multipliers */}
      <div className="grid grid-cols-3 gap-1.5 mt-3 text-center text-xs">
        <div className="bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
          <div className="text-[10px] text-zinc-400">الهجوم</div>
          <div className="font-black text-amber-400">+{coach.attackBonus}</div>
        </div>
        <div className="bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
          <div className="text-[10px] text-zinc-400">الدفاع</div>
          <div className="font-black text-emerald-400">+{coach.defenseBonus}</div>
        </div>
        <div className="bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
          <div className="text-[10px] text-zinc-400">التناغم</div>
          <div className="font-black text-purple-400">+{coach.chemistryBonus}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
        <div className="text-[11px] text-zinc-400">
          الخطط المفضلة: <span className="text-zinc-200 font-mono">{coach.preferredFormations.join(', ')}</span>
        </div>
        {selected && (
          <span className="flex items-center gap-1 text-amber-400 text-xs font-bold">
            <Check className="w-3.5 h-3.5" /> تم الاختيار
          </span>
        )}
      </div>
    </div>
  );
};
