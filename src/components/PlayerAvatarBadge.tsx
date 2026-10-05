// ============================================================
// العبها صح | EL3BHA SA7 - Player Avatar Badge
//
// Renders a player's avatar wherever it appears in the app.
// Handles both cases transparently:
//  - a curated persona preset (id like "av_flame")
//  - a real uploaded photo (data URL) or a legacy image URL
// ============================================================

import React from 'react';
import { EquippedCosmetics } from '../types';
import { getMarketItem } from '../services/marketCatalog';
import { useMarketCatalog } from '../services/marketCatalog';
import { useFrameFit, defaultFit } from '../services/frameFit';
import { getAvatarPresetById, isPresetAvatar, isImageAvatar, DEFAULT_AVATAR_ID } from '../data/avatarPresets';

interface PlayerAvatarBadgeProps {
  avatar: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
  className?: string;
  /** العناصر المجهزة للاعب (إطار الصورة من السوق) */
  equipped?: EquippedCosmetics;
}

const SIZE_MAP = {
  sm: { box: 'w-9 h-9 rounded-xl', icon: 'w-4 h-4' },
  md: { box: 'w-11 h-11 rounded-xl', icon: 'w-5 h-5' },
  lg: { box: 'w-20 h-20 rounded-2xl', icon: 'w-9 h-9' },
  xl: { box: 'w-28 h-28 rounded-3xl', icon: 'w-14 h-14' }
};

export const PlayerAvatarBadge: React.FC<PlayerAvatarBadgeProps> = ({
  avatar,
  size = 'md',
  ring = true,
  className = '',
  equipped
}) => {
  useMarketCatalog();
  const s = SIZE_MAP[size];
  const frameItem = getMarketItem(equipped?.avatarFrame);
  const frame = frameItem && frameItem.category === 'AVATAR_FRAME' ? frameItem : undefined;
  const fit = useFrameFit(frame?.imageUrl, frame?.scale ?? 1.3);
  const f = fit || defaultFit(frame?.scale ?? 1.3);
  const roundHole = !!frame && !!fit?.round;
  // الإطار بيتضبط بحيث فتحته تطابق الصورة بالظبط (مش أكبر ولا أصغر)
  const frameEl = frame ? (
    <img
      src={frame.imageUrl}
      alt=""
      draggable={false}
      decoding="async"
      className="absolute pointer-events-none select-none max-w-none z-10"
      style={{
        width: `${f.widthPct}%`,
        height: `${f.heightPct}%`,
        left: `${f.leftPct}%`,
        top: `${f.topPct}%`,
        objectFit: 'fill'
      }}
    />
  ) : null;
  // أي قيمة فارغة أو غير صالحة تتحول لأيقونة افتراضية بدل صورة مكسورة.
  const resolved = isPresetAvatar(avatar) || isImageAvatar(avatar) ? avatar : DEFAULT_AVATAR_ID;
  const preset = isPresetAvatar(resolved) ? getAvatarPresetById(resolved) || getAvatarPresetById(DEFAULT_AVATAR_ID) : undefined;

  if (preset) {
    const Icon = preset.icon;
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 ${s.box} ${roundHole ? '!rounded-full' : ''} ${
          ring && !frame ? 'ring-2 ring-offset-2' : ''
        } ${className}`}
        style={{
          background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
          boxShadow: `0 0 16px ${preset.from}66`,
          ...(ring
            ? ({
                '--tw-ring-color': `${preset.from}99`,
                '--tw-ring-offset-color': 'var(--color-bg)'
              } as React.CSSProperties)
            : {})
        }}
      >
        <Icon className={`${s.icon} text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)]`} strokeWidth={2.25} />
        {frameEl}
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 ${s.box} ${roundHole ? '!rounded-full' : ''} ${
        ring && !frame ? 'ring-2 ring-amber-400/60 ring-offset-2' : ''
      } ${className}`}
      style={ring ? ({ '--tw-ring-offset-color': 'var(--color-bg)' } as React.CSSProperties) : undefined}
    >
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
        <img src={avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      {frameEl}
    </div>
  );
};
