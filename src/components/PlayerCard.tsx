// ============================================================
// المواجهة | بطاقة لاعب — صورة أصلية + الاسم فقط
// لا نعرض تقييمات أو مركز أو إحصائيات أو قيمة سوقية على البطاقة.
// ============================================================

import React from 'react';
import { FootballPlayer } from '../types';
import { useImageRatio } from '../services/pitchRatio';

interface PlayerCardProps {
  player: FootballPlayer;
  isMystery?: boolean;
  isRevealed?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'fluid';
  showDetails?: boolean;
  onClick?: () => void;
  selected?: boolean;
  transparent?: boolean;
}

const SIZE = {
  xs: { card: 'w-12 h-[4.5rem]', image: 'h-[75%]', name: 'text-[7px]', pad: 'p-1' },
  sm: { card: 'w-36 h-52', image: 'h-[75%]', name: 'text-xs', pad: 'p-1.5' },
  md: { card: 'w-52 h-72', image: 'h-[76%]', name: 'text-sm', pad: 'p-2' },
  lg: { card: 'w-64 h-[350px]', image: 'h-[77%]', name: 'text-base', pad: 'p-2.5' },
  // يملأ عرض الحاوية بنسبة بطاقة ثابتة (2:3) — مناسب لعرض البطاقات على الملعب بدون تداخل
  fluid: { card: 'w-full aspect-[2/3]', image: 'h-[75%]', name: 'text-[8px]', pad: 'p-1' }
} as const;

const POSITION_LABELS_AR: Record<string, string> = {
  GK: 'حراسة مرمى',
  CB: 'مدافع',
  LB: 'مدافع',
  RB: 'مدافع',
  CDM: 'ارتكاز',
  CM: 'وسط',
  CAM: 'وسط',
  LM: 'وسط',
  RM: 'وسط',
  LW: 'مهاجم',
  RW: 'مهاجم',
  ST: 'مهاجم',
  CF: 'مهاجم'
};

// بطاقة مصمّمة جاهزة (PNG): الحاوية بتاخد نسبة الصورة الحقيقية → الصورة تركب بالظبط (من غير فراغ ولا قص ولا حافة).
const ArtCard: React.FC<{ id: string; nameAr: string; url: string; sizeClass: string; fluid: boolean; selected: boolean; onClick?: () => void }> = ({ id, nameAr, url, sizeClass, fluid, selected, onClick }) => {
  const ratio = useImageRatio(url);
  return (
    <div
      id={`player_card_${id}`}
      onClick={onClick}
      className={`${fluid ? 'w-full' : sizeClass} relative select-none transition-transform duration-300 ${selected ? 'scale-[1.04]' : onClick ? 'hover:scale-[1.03]' : ''}`}
      style={{
        ...(fluid ? { aspectRatio: String(ratio) } : {}),
        // من غير ظل غامق حوالين البطاقة (كان بيطلع كحافة سودة) — التوهج الذهبي بس عند الاختيار
        filter: selected ? 'drop-shadow(0 0 12px rgba(245,158,11,.8))' : 'none'
      }}
    >
      <img src={url} alt={nameAr} draggable={false} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-contain object-center" loading="eager" decoding="async" />
    </div>
  );
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isMystery = false,
  isRevealed = true,
  size = 'md',
  onClick,
  selected = false,
  transparent = false
}) => {
  const s = SIZE[size];
  const frame = player.rarity === 'Icon' ? 'border-amber-300/80 shadow-[0_16px_55px_rgba(245,158,11,.34)]' : player.rarity === 'Legend' ? 'border-violet-300/75 shadow-[0_16px_48px_rgba(139,92,246,.26)]' : player.rarity === 'Elite' ? 'border-cyan-300/70 shadow-[0_16px_42px_rgba(34,211,238,.22)]' : player.rarity === 'Rare' ? 'border-blue-300/65 shadow-[0_16px_40px_rgba(59,130,246,.18)]' : 'border-zinc-500/60 shadow-[0_16px_34px_rgba(0,0,0,.42)]';

  if (isMystery && !isRevealed) {
    return (
      <div
        id={`mystery_card_${player.id}`}
        onClick={onClick}
        className={`${s.card} relative overflow-hidden rounded-[1.35rem] border-2 border-dashed border-amber-400/80 bg-[radial-gradient(circle_at_center,_rgba(245,158,11,.20),_transparent_60%)] text-center transition-transform duration-300 flex items-center justify-center ${onClick ? 'cursor-pointer hover:scale-[1.03]' : ''}`}
      >
        <div className="relative z-10 flex flex-col items-center gap-2 px-3">
          <div className="w-12 h-12 rounded-full border-2 border-amber-300 bg-black/45 flex items-center justify-center text-2xl font-black text-amber-200 shadow-[0_0_28px_rgba(245,158,11,.55)]">?</div>
          <div className="font-black text-amber-300">اللاعب الخفي</div>
          <div className="text-[10px] text-zinc-400">لسه مستخبي… استنى الكشف</div>
        </div>
      </div>
    );
  }

  const cardImage = player.cardImageUrl || player.photoUrl;

  // بطاقة اللاعب المرفوعة (PNG شفاف كامل التصميم): تتعرض كما هي تماماً —
  // بدون خلفية ولا حواف ولا تدرج ولا شارات فوقها، وتنزل على الملعب كبطاقة.
  const isArt = (u?: string) => !!u && /^(https?:|data:image|blob:|\/)/.test(u);
  const artUrl = isArt(player.cardImageUrl) ? player.cardImageUrl : isArt(player.photoUrl) ? player.photoUrl : undefined;
  if (artUrl) {
    return <ArtCard id={player.id} nameAr={player.nameAr} url={artUrl} sizeClass={s.card} fluid={size === 'fluid'} selected={selected} onClick={onClick} />;
  }

  const accent = player.rarity === 'Icon' ? 'from-red-700 via-red-500 to-rose-950' : player.rarity === 'Legend' ? 'from-violet-700 via-fuchsia-500 to-zinc-950' : player.rarity === 'Elite' ? 'from-cyan-700 via-blue-500 to-zinc-950' : player.rarity === 'Rare' ? 'from-blue-700 via-indigo-500 to-zinc-950' : 'from-zinc-800 via-zinc-600 to-zinc-950';

  const ratingColor =
    player.rarity === 'Icon'
      ? 'from-red-600 to-rose-800 text-white'
      : player.rarity === 'Legend'
        ? 'from-violet-600 to-fuchsia-800 text-white'
        : player.rarity === 'Elite'
          ? 'from-cyan-500 to-blue-700 text-white'
          : player.rarity === 'Rare'
            ? 'from-blue-500 to-indigo-700 text-white'
            : 'from-zinc-600 to-zinc-800 text-white';

  const positionLabel = POSITION_LABELS_AR[player.position] || player.position;

  if (transparent) {
    const isXs = size === 'xs';
    return (
      <div
        id={`player_card_${player.id}`}
        onClick={onClick}
        className={`group ${s.card} relative rounded-[1.4rem] overflow-hidden text-white transition-all duration-300 select-none ${selected ? 'scale-[1.03] drop-shadow-[0_0_28px_rgba(245,158,11,.75)]' : onClick ? 'hover:scale-[1.03]' : ''}`}
      >
        {/* الصورة بتاخد المساحة كلها — من غير أي فراغ فوق أو تحت أو على الجنب */}
        <img
          src={cardImage}
          alt={player.nameAr}
          draggable={false}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-contain object-center bg-zinc-950"
          loading="eager" decoding="async" fetchPriority="high"
        />
        {/* تدرج خفيف تحت بس عشان اسم اللاعب يفضل واضح فوق أي خلفية */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

        {/* التقييم أعلى الكارت */}
        <div
          className={`absolute z-10 rounded-xl bg-gradient-to-b ${ratingColor} shadow-lg text-center leading-none ${isXs ? 'top-1 right-1 min-w-[1.4rem] px-1 py-0.5' : 'top-2 right-2 min-w-[2.1rem] px-1.5 py-1'}`}
        >
          <div className={`font-black ${isXs ? 'text-[10px]' : 'text-sm'}`}>{player.overallRating}</div>
        </div>
        {/* المركز تحت التقييم مباشرة — بنخفيه في المقاسات الصغيرة جداً عشان المكان ضيق والمركز أصلاً ظاهر برا الكارت */}
        {!isXs && (
          <div className="absolute top-[2.6rem] right-2 z-10 px-1.5 py-0.5 rounded-lg bg-black/55 backdrop-blur-sm text-[9px] font-bold text-zinc-200">
            {positionLabel}
          </div>
        )}

        {/* اسم اللاعب في النص أسفل الكارت */}
        <div className={`absolute z-10 rounded-xl bg-black/55 backdrop-blur-md text-center ${isXs ? 'bottom-1 inset-x-1 px-1 py-0.5' : 'bottom-2 inset-x-2 px-2 py-1.5'}`}>
          <div className={`${s.name} font-black leading-tight text-white truncate`}>{player.nameAr}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`player_card_${player.id}`}
      onClick={onClick}
      className={`group ${s.card} relative overflow-hidden rounded-[1.45rem] border-2 ${frame} bg-gradient-to-b ${accent} text-white transition-all duration-300 select-none ${selected ? 'ring-4 ring-amber-400 scale-[1.02]' : onClick ? 'hover:scale-[1.03]' : ''}`}
      style={{ clipPath: 'polygon(8% 0,92% 0,100% 7%,100% 93%,92% 100%,8% 100%,0 93%,0 7%)' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,.35),transparent_32%),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.58))] pointer-events-none" />
      <div className="absolute inset-[5px] border border-white/20 rounded-[1.15rem] pointer-events-none" />
      <div className={`${s.pad} relative z-10 h-full flex flex-col`}> 
        <div className={`${s.image} relative w-full rounded-[1rem] overflow-hidden border border-white/20 bg-black/20 flex items-center justify-center`}> 
          <img
            src={cardImage}
            alt={player.nameAr}
            draggable={false}
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full w-full h-full object-contain object-center"
            loading="eager" decoding="async" fetchPriority="high"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        </div>
        <div className="mt-1.5 rounded-xl border border-white/20 bg-black/65 px-2 py-2 text-center backdrop-blur-sm shadow-[0_0_16px_rgba(0,0,0,.35)]">
          <div className={`${s.name} font-black leading-tight text-white break-words`}>{player.nameAr}</div>
        </div>
      </div>
    </div>
  );
};
