// ديل أور نو ديل — مكونات العرض: شنطة الصندوق الواقعية، أرضية الملعب، التشكيلة، لوحة الكشف.
import React, { useId, useState } from 'react';
import { Coach, FootballPlayer } from '../types';
import { DND_CARD_INFO, DND_STAGES, DndBox, DndCardType, DndItem } from '../types/dealOrNoDealTypes';
import { itemName, itemRating } from '../services/dealOrNoDealEngine';
import { PlayerCard } from './PlayerCard';
import { pitchSkinUrl, useMarketCatalog } from '../services/marketCatalog';
import { usePitchRatio } from '../services/pitchRatio';
import { EquippedCosmetics } from '../types';
import { CoachCard } from './CoachCard';


const CARD_THEME: Record<DndCardType, { title: string; micro: string; frame: string; glow: string; image: string }> = {
  SHIELD: {
    title: 'درع الحماية',
    micro: 'يحمي لاعبك من السرقة',
    frame: 'from-sky-950 via-slate-950 to-sky-900 border-sky-300/80',
    glow: 'shadow-[0_0_24px_rgba(56,189,248,0.34)]',
    image: '/cards/shield.png'
  },
  STEAL: {
    title: 'كرت السرقة',
    micro: 'خد لاعب الخصم في نفس المركز',
    frame: 'from-fuchsia-950 via-slate-950 to-rose-950 border-fuchsia-300/80',
    glow: 'shadow-[0_0_24px_rgba(217,70,239,0.30)]',
    image: '/cards/steal.png'
  },
  SWAP: {
    title: 'لبس صحبك',
    micro: 'لبّسه أضعف وافتح صندوق كمان',
    frame: 'from-amber-950 via-slate-950 to-orange-950 border-amber-300/90',
    glow: 'shadow-[0_0_24px_rgba(245,158,11,0.32)]',
    image: '/cards/swap.png'
  }
};

export const GameCardMini: React.FC<{
  type: DndCardType;
  compact?: boolean;
  showMicro?: boolean;
  className?: string;
}> = ({ type, compact = false, showMicro = true, className = '' }) => {
  const theme = CARD_THEME[type];
  return (
    <div dir="rtl" className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${theme.frame} ${theme.glow} ${compact ? 'w-[58px]' : 'w-[120px]'} aspect-[175/245] ${className}`}>
      <img src={theme.image} alt={theme.title} draggable={false} className="absolute inset-0 h-full w-full object-contain" loading="eager" />
      {showMicro && !compact && (
        <div className="absolute bottom-1.5 left-1.5 right-1.5 rounded-lg border border-white/10 bg-black/65 px-1.5 py-1 text-center text-[7px] font-black leading-tight text-white backdrop-blur-sm">
          {theme.micro}
        </div>
      )}
    </div>
  );
};

export const GameCardReveal: React.FC<{ type: DndCardType; className?: string }> = ({ type, className = '' }) => (
  <div className="relative" dir="rtl">
    <div className="absolute -inset-3 rounded-3xl bg-white/5 blur-xl" />
    <GameCardMini type={type} showMicro className={`w-[160px] sm:w-[178px] p-3 rounded-2xl ${className}`} />
  </div>
);

export const itemPhoto = (it: DndItem): string =>
  it.kind === 'PLAYER' ? it.player.photoUrl : it.kind === 'COACH' ? it.coach.photoUrl : '';

/** صورة دايرية بفولباك لو الصورة ماحملتش. */
export const Photo: React.FC<{ src: string; className?: string }> = ({ src, className = '' }) => {
  const [bad, setBad] = useState(false);
  if (bad || !src) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-b from-zinc-600 to-zinc-800 text-zinc-300 ${className}`}>
        <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="currentColor">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
        </svg>
      </div>
    );
  }
  return <img src={src} alt="" referrerPolicy="no-referrer" draggable={false} onError={() => setBad(true)} className={`object-contain bg-black/20 ${className}`} />;
};

/** كارت كامل للاعب أو المدرب (بيتعرض في نافذة القرار). */
export const ItemCard: React.FC<{ item: DndItem; size?: 'sm' | 'md' | 'lg' }> = ({ item, size = 'md' }) => {
  if (item.kind === 'PLAYER') return <PlayerCard player={item.player} size={size} transparent />;
  if (item.kind === 'COACH') {
    return (
      <div className="w-64 max-w-[80vw]">
        <CoachCard coach={item.coach} />
      </div>
    );
  }
  return (
    <div className="flex w-full max-w-[82vw] items-center justify-center">
      <GameCardReveal type={item.cardType} />
    </div>
  );
};

export const CardBank: React.FC<{
  cards: DndCardType[];
  label: string;
  active: boolean;
  onUse?: (cardType: DndCardType) => void;
  isUsable?: (cardType: DndCardType) => boolean;
}> = ({ cards, label, active, onUse, isUsable = () => true }) => (
  <div className="rounded-2xl p-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" dir="rtl">
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[11px] font-black text-amber-200">{label}</span>
      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black text-zinc-300">{cards.length} كروت</span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {cards.length === 0 ? (
        <div className="col-span-3 rounded-xl border border-dashed border-zinc-800 bg-black/30 py-3 text-center text-[10px] text-zinc-500">مفيش كروت معاك دلوقتي</div>
      ) : (
        cards.map((type, i) => {
          const info = DND_CARD_INFO[type];
          const usable = active && isUsable(type) && !!onUse;
          return (
            <button
              key={`${type}-${i}`}
              type="button"
              disabled={!usable}
              onClick={() => onUse?.(type)}
              className={`rounded-xl border px-2 py-2 text-center transition ${usable ? 'border-amber-400/70 bg-amber-500/10 hover:bg-amber-500/20 hover:-translate-y-0.5' : 'border-zinc-800 bg-zinc-900/60 opacity-60 cursor-not-allowed'}`}
              title={usable ? info.shortAr : type === 'SWAP' ? 'الكرت ده أثناء اللعب' : 'الكرت بيتفعل بعد اكتمال التشكيلة'}
            >
              <GameCardMini type={type} compact showMicro={false} className="mx-auto w-full max-w-[76px]" />
              {usable ? (
                <div className="mt-1 text-[8px] font-black text-amber-300">تفعيل الكرت</div>
              ) : (
                <div className="mt-1 text-[7px] font-bold text-zinc-500">{type === 'SWAP' ? 'أثناء اللعب' : 'بعد اكتمال التشكيلة'}</div>
              )}
            </button>
          );
        })
      )}
    </div>
  </div>
);

// ---------------- شنطة الصندوق (SVG واقعي) ----------------
export const Briefcase: React.FC<{ number: number; open?: boolean; className?: string }> = ({ number, open = false, className = '' }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 140 112" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3420" />
          <stop offset="0.45" stopColor="#2a1c10" />
          <stop offset="1" stopColor="#0d0805" />
        </linearGradient>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#d99a1c" />
          <stop offset="1" stopColor="#8a5a08" />
        </linearGradient>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f5f4" />
          <stop offset="1" stopColor="#8b8b8b" />
        </linearGradient>
        <radialGradient id={`l${id}`} cx="0.5" cy="0" r="0.9">
          <stop offset="0" stopColor="#fff7c2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <pattern id={`t${id}`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="none" />
          <circle cx="1" cy="1" r="0.5" fill="#000" opacity="0.28" />
        </pattern>
      </defs>
      {/* ظل الأرض */}
      <ellipse cx="70" cy="104" rx="52" ry="6" fill="#000" opacity="0.55" />
      {/* المقبض */}
      {!open && (
        <>
          <path d="M46 30 V20 Q46 10 58 10 H82 Q94 10 94 20 V30" fill="none" stroke="#000" strokeWidth="9" strokeLinecap="round" opacity="0.5" />
          <path d="M46 30 V20 Q46 10 58 10 H82 Q94 10 94 20 V30" fill="none" stroke={`url(#g${id})`} strokeWidth="6" strokeLinecap="round" />
        </>
      )}
      {open ? (
        <>
          {/* الجسم مفتوح + ضوء جوه */}
          <path d="M10 58 H130 V92 Q130 100 122 100 H18 Q10 100 10 92 Z" fill={`url(#b${id})`} stroke={`url(#g${id})`} strokeWidth="2.5" />
          <rect x="16" y="58" width="108" height="9" rx="3" fill="#050302" />
          <ellipse cx="70" cy="58" rx="52" ry="30" fill={`url(#l${id})`} />
          {/* الغطا مفتوح لورا */}
          <path d="M16 58 L28 8 Q30 4 36 4 H104 Q110 4 112 8 L124 58 Z" fill={`url(#b${id})`} stroke={`url(#g${id})`} strokeWidth="2.5" />
          <path d="M22 54 L32 14 H108 L118 54 Z" fill="#150e08" opacity="0.85" />
        </>
      ) : (
        <>
          {/* الجسم */}
          <rect x="8" y="28" width="124" height="72" rx="11" fill={`url(#b${id})`} stroke={`url(#g${id})`} strokeWidth="3" />
          <rect x="8" y="28" width="124" height="72" rx="11" fill={`url(#t${id})`} />
          {/* درزة الغطا */}
          <line x1="10" y1="56" x2="130" y2="56" stroke="#000" strokeWidth="1.6" opacity="0.7" />
          <line x1="10" y1="58" x2="130" y2="58" stroke="#fde68a" strokeWidth="0.8" opacity="0.35" />
          {/* أركان معدنية */}
          {[
            [8, 28, 1, 1],
            [132, 28, -1, 1],
            [8, 100, 1, -1],
            [132, 100, -1, -1]
          ].map(([x, y, dx, dy], i) => (
            <path key={i} d={`M${x} ${y + dy * 16} V${y + dy * 4} Q${x} ${y} ${x + dx * 4} ${y} H${x + dx * 16} L${x + dx * 12} ${y + dy * 4} Q${x + dx * 4} ${y + dy * 4} ${x + dx * 4} ${y + dy * 12} Z`} fill={`url(#g${id})`} />
          ))}
          {/* الأقفال */}
          {[24, 96].map((x) => (
            <g key={x}>
              <rect x={x} y="50" width="20" height="14" rx="3" fill={`url(#m${id})`} stroke="#3a3a3a" strokeWidth="1" />
              <rect x={x + 6} y="54" width="8" height="6" rx="1.5" fill="#1c1c1c" />
              <circle cx={x + 3.5} cy="53" r="1" fill="#555" />
              <circle cx={x + 16.5} cy="53" r="1" fill="#555" />
            </g>
          ))}
          {/* لوحة الرقم */}
          <circle cx="70" cy="76" r="15" fill="#000" opacity="0.55" />
          <circle cx="70" cy="75" r="14" fill={`url(#g${id})`} stroke="#fff3b0" strokeWidth="1" />
          <circle cx="70" cy="75" r="10.5" fill="#1a1207" />
          <text x="70" y="80.5" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fde68a" fontFamily="Cairo, system-ui, sans-serif">
            {number}
          </text>
          {/* لمعة */}
          <path d="M12 32 Q70 26 128 32 V44 Q70 38 12 44 Z" fill="#fff" opacity="0.07" />
        </>
      )}
    </svg>
  );
};

// ---------------- أرضية الملعب (نجيلة حقيقية بخطوط قص) ----------------
export const TURF_STYLE: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.14), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.45), transparent 65%), repeating-linear-gradient(90deg, #1d6b34 0px, #1d6b34 34px, #1a5e2e 34px, #1a5e2e 68px)',
  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.08)'
};

export const TurfPanel: React.FC<{ active: boolean; tone: 'emerald' | 'rose'; children: React.ReactNode }> = ({ active, tone, children }) => (
  <div
    className={`relative rounded-2xl p-1.5 transition-all drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
      active ? (tone === 'emerald' ? 'ring-2 ring-emerald-300/80' : 'ring-2 ring-rose-300/80') : 'opacity-95'
    }`}
  >
    <div className="relative">{children}</div>
  </div>
);

// ---------------- الصندوق ----------------
type TileKind = 'closed' | 'pending' | 'chosen' | 'passed' | 'revealed' | 'card';
const kindOf = (b: DndBox): TileKind => (!b.opened ? 'closed' : b.item.kind === 'CARD' || b.role === 'card' ? 'card' : b.role === 'chosen' ? 'chosen' : b.role === 'passed' ? 'passed' : b.role === 'revealed' ? 'revealed' : 'pending');

const KIND_LABEL: Record<Exclude<TileKind, 'closed' | 'card'>, string> = {
  pending: 'اللي فتحته',
  chosen: 'نزل التشكيلة ✅',
  passed: 'اللي سبته',
  revealed: 'كان فيه'
};

interface BoxTileProps {
  box: DndBox;
  interactive: boolean;
  dimmed: boolean;
  compact?: boolean;
  /** شاشة الحكم: المحتوى السري للصندوق المقفول ظاهر له. */
  peek?: DndItem;
  peekCardType?: DndCardType;
  showCardOnClosed?: boolean;
  onOpen: () => void;
}

const OpenBoxContent: React.FC<{ box: DndBox; compact?: boolean; refereePeek?: boolean }> = ({ box, compact, refereePeek = false }) => {
  const hidePlayerForCard = !!box.cardType && box.role === 'card' && !refereePeek;
  const visualUrl = box.item.kind === 'PLAYER' ? (box.item.player.photoUrl) : itemPhoto(box.item);
  return (
    <div className="relative w-full">
      <Briefcase number={box.index + 1} open className="w-full h-auto -mb-5" />
      <div className="relative -mt-7 flex flex-col items-center px-0.5 pb-1.5 w-full">
        {box.cardType && (
          <div className={`absolute -top-2 ${compact ? 'right-0' : 'right-1'} z-10`}>
            <GameCardMini type={box.cardType} compact showMicro={false} />
          </div>
        )}
        {!hidePlayerForCard ? (
          <div className={`${compact ? 'w-11 h-14' : 'w-14 h-[76px] sm:w-16 sm:h-[86px]'} rounded-xl border-2 border-amber-300/90 bg-black/20 overflow-hidden shadow-[0_0_12px_rgba(253,224,71,0.4)] flex items-center justify-center`}>
            <img src={visualUrl} alt={box.item.kind === 'PLAYER' ? box.item.player.nameAr : itemName(box.item)} draggable={false} referrerPolicy="no-referrer" className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className={`${compact ? 'w-11 h-14' : 'w-14 h-[76px] sm:w-16 sm:h-[86px]'} rounded-xl border-2 border-dashed border-white/15 bg-black/30 flex items-center justify-center`}>
            <span className="text-[9px] font-black text-zinc-500">مستخبي</span>
          </div>
        )}
        {!hidePlayerForCard && (
          <>
            <div className={`mt-0.5 w-full text-center font-black leading-tight break-words line-clamp-2 text-white ${compact ? 'text-[8px]' : 'text-[10px] sm:text-[11px]'}`}>{itemName(box.item)}</div>
            <div className="text-amber-300 font-black text-xs leading-none">{itemRating(box.item)}</div>
          </>
        )}
        {box.cardType && (
          <div className={`mt-1 rounded-full bg-black/80 border border-white/10 px-1.5 py-0.5 font-black leading-none text-[7px] ${refereePeek ? 'text-amber-200' : 'text-white'}`}>
            {DND_CARD_INFO[box.cardType].nameAr}
          </div>
        )}
      </div>
    </div>
  );
};

export const BoxTile: React.FC<BoxTileProps> = ({ box, interactive, dimmed, compact, peek, peekCardType, showCardOnClosed = false, onOpen }) => {
  const kind = kindOf(box);

  if (kind === 'closed' && peek) {
    const shown: DndBox = { ...box, item: peek, cardType: peekCardType || box.cardType, opened: true, role: box.cardType ? 'card' : undefined };
    return (
      <div className={`relative rounded-xl border-2 border-amber-300/50 bg-black/25 ${dimmed ? 'opacity-80' : ''}`}>
        <OpenBoxContent box={shown} compact={compact} refereePeek />
      </div>
    );
  }

  if (kind === 'closed') {
    return (
      <button
        type="button"
        disabled={!interactive}
        onClick={onOpen}
        aria-label={`صندوق ${box.index + 1}`}
        className={`relative flex items-center justify-center aspect-[5/4] min-w-0 rounded-xl transition-transform ${
          interactive ? 'cursor-pointer hover:scale-[1.06] active:scale-95' : `cursor-default ${dimmed ? 'opacity-60' : ''}`
        }`}
      >
        <Briefcase number={box.index + 1} className={`w-full h-full ${interactive ? 'dnd-case-live' : 'drop-shadow-[0_5px_5px_rgba(0,0,0,0.6)]'}`} />
        {showCardOnClosed && box.cardType && (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
            <GameCardMini type={box.cardType} compact showMicro={false} />
          </span>
        )}
      </button>
    );
  }

  const ring =
    kind === 'chosen'
      ? 'border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.6)]'
      : kind === 'pending'
      ? 'border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.55)]'
      : kind === 'passed'
      ? 'border-orange-400/80'
      : 'border-white/15';
  const tag =
    kind === 'chosen' ? 'bg-emerald-400 text-black' : kind === 'pending' ? 'bg-amber-400 text-black' : kind === 'passed' ? 'bg-orange-500 text-black' : 'bg-zinc-700 text-zinc-200';

  return (
    <div className={`dnd-pop-in relative flex flex-col items-center min-w-0 rounded-xl border-2 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black overflow-hidden ${ring} ${kind === 'revealed' ? 'opacity-80' : ''}`}>
      <OpenBoxContent box={box} compact={compact} />
      <span className={`mb-1 rounded-full px-1.5 py-0.5 font-black leading-none ${compact ? 'text-[7px]' : 'text-[8px]'} ${tag}`}>
        {kind === 'card' ? 'الكرت جوا الصندوق' : KIND_LABEL[kind]}
      </span>
    </div>
  );
};

// ---------------- لوحة الكشف الكاملة (بعد الصفقة / المجازفة) ----------------
export const RevealBoard: React.FC<{ boxes: DndBox[]; title: string; sub?: string }> = ({ boxes, title, sub }) => (
  <div className="w-full">
    <div className="text-center text-sm font-black text-amber-300 break-words">{title}</div>
    {sub && <div className="text-center text-[11px] text-zinc-300 mt-0.5 mb-2 break-words">{sub}</div>}
    <div className="grid grid-cols-2 gap-2 mt-2" style={TURF_STYLE}>
      {boxes.map((b) => (
        <div key={b.index} className="p-1">
          <BoxTile box={b} interactive={false} dimmed={false} onOpen={() => {}} />
        </div>
      ))}
    </div>
  </div>
);

// ---------------- مؤقت التفكير ----------------
export const TurnTimer: React.FC<{ left: number; total: number; mine: boolean }> = ({ left, total, mine }) => {
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const urgent = left <= 5;
  return (
    <div className="flex items-center gap-2" dir="rtl">
      <div className="h-2 flex-1 rounded-full bg-black/40 overflow-hidden border border-white/10">
        <div className={`h-full rounded-full transition-[width] duration-200 ${urgent ? 'bg-rose-500' : mine ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-8 text-center text-sm font-black tabular-nums ${urgent ? 'text-rose-400 animate-pulse' : 'text-white'}`}>{left}</span>
    </div>
  );
};

// ---------------- شريط المراحل ----------------
export const StageStepper: React.FC<{ current: number; done: boolean }> = ({ current, done }) => (
  <div className="grid grid-cols-5 gap-1.5" dir="rtl">
    {DND_STAGES.map((st, i) => {
      const isDone = done || i < current;
      const isCur = !done && i === current;
      return (
        <div
          key={st.key}
          className={`min-w-0 rounded-xl border px-1 py-1.5 text-center transition-all ${
            isCur ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_14px_rgba(245,158,11,0.4)]' : isDone ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/60'
          }`}
        >
          <div className="text-base leading-none">{isDone ? '✅' : st.emoji}</div>
          <div className={`mt-0.5 text-[9px] sm:text-[11px] font-black leading-tight break-words ${isCur ? 'text-amber-300' : isDone ? 'text-emerald-300' : 'text-zinc-500'}`}>{st.labelAr}</div>
        </div>
      );
    })}
  </div>
);

// ---------------- التشكيلة على ملعب حقيقي ----------------
interface PitchProps {
  title: string;
  slots: { GK: FootballPlayer | null; DEF: FootballPlayer | null; MID: FootballPlayer | null; ATT: FootballPlayer | null };
  coach: Coach | null;
  cards?: DndCardType[];
  accent: 'emerald' | 'rose';
  compact?: boolean;
}

const NODES: { key: 'GK' | 'DEF' | 'MID' | 'ATT'; label: string; top: string }[] = [
  { key: 'ATT', label: 'هجوم', top: '13%' },
  { key: 'MID', label: 'وسط', top: '37.5%' },
  { key: 'DEF', label: 'دفاع', top: '62%' },
  { key: 'GK', label: 'حارس', top: '86.5%' }
];

const PitchSvg: React.FC = () => {
  const id = useId().replace(/:/g, '');
  const stripes = Array.from({ length: 10 }, (_, i) => i);
  return (
    <svg viewBox="0 0 300 480" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <filter id={`n${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="t" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 -0.12" />
        </filter>
        <linearGradient id={`v${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id={`r${id}`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      {stripes.map((i) => (
        <rect key={i} x="0" y={i * 48} width="300" height="48" fill={i % 2 ? '#1c6a33' : '#227a3a'} />
      ))}
      <rect width="300" height="480" filter={`url(#n${id})`} />
      <rect width="300" height="480" fill={`url(#v${id})`} />
      <g fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="2.2">
        <rect x="14" y="14" width="272" height="452" />
        <line x1="14" y1="240" x2="286" y2="240" />
        <circle cx="150" cy="240" r="42" />
        <rect x="64" y="14" width="172" height="72" />
        <rect x="106" y="14" width="88" height="28" />
        <path d="M118 86 A34 34 0 0 0 182 86" />
        <rect x="64" y="394" width="172" height="72" />
        <rect x="106" y="438" width="88" height="28" />
        <path d="M118 394 A34 34 0 0 1 182 394" />
        <path d="M14 22 A8 8 0 0 0 22 14" />
        <path d="M278 14 A8 8 0 0 0 286 22" />
        <path d="M14 458 A8 8 0 0 1 22 466" />
        <path d="M278 466 A8 8 0 0 1 286 458" />
        <rect x="132" y="6" width="36" height="8" strokeOpacity="0.7" />
        <rect x="132" y="466" width="36" height="8" strokeOpacity="0.7" />
      </g>
      <circle cx="150" cy="240" r="3" fill="#fff" />
      <circle cx="150" cy="64" r="2.4" fill="#fff" />
      <circle cx="150" cy="416" r="2.4" fill="#fff" />
      <rect width="300" height="480" fill={`url(#r${id})`} />
    </svg>
  );
};

export const FormationPitch: React.FC<PitchProps & { equipped?: EquippedCosmetics; squadSize?: 5 | 11 }> = ({ title, slots, coach, cards = [], accent, compact = false, equipped, squadSize = 5 }) => {
  useMarketCatalog();
  const skin = pitchSkinUrl(equipped, squadSize);
  // نسبة ثابتة بالطول لكل التشكيلات → الاتنين دايماً بنفس الشكل والطول (مهما كانت أرضية كل واحد).
  const ratio = compact ? 0.72 : 0.64;
  // 4 صفوف (هجوم/وسط/دفاع/حارس): الحارس بيبدأ من حافة الملعب السفلية والصفوف متوزعة بالتساوي من غير تغطية.
  const MARGIN = 1.2;
  const cardHmax = ((100 - MARGIN * 2) / 4) * 0.96;
  const cardPct = Math.min(compact ? 34 : 38, cardHmax / (1.5 * ratio));
  const halfH = (cardPct * 1.5 * ratio) / 2;
  const yTop = MARGIN + halfH;
  const yBot = 100 - MARGIN - halfH;
  const topFor = (i: number) => `${yTop + ((yBot - yTop) * i) / 3}%`;
  return (
  <div dir="rtl" className="min-w-0">
    <div className="flex items-center justify-center gap-2.5 mb-1.5">
      {coach && (
        <img
          src={coach.photoUrl}
          alt={coach.nameAr}
          draggable={false}
          referrerPolicy="no-referrer"
          decoding="async"
          className={`${compact ? 'w-16 h-16' : 'w-24 h-24'} object-contain shrink-0`}
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.7))' }}
        />
      )}
      <div className="min-w-0 text-center">
        <div className={`${compact ? 'text-[11px]' : 'text-sm'} font-black ${accent === 'emerald' ? 'text-emerald-300' : 'text-rose-300'}`}>{title}</div>
        {coach && (
          <>
            <div className="text-[9px] font-black text-amber-300">المدرب</div>
            <div className={`${compact ? 'text-[11px]' : 'text-sm'} font-black text-white leading-tight break-words`}>{coach.nameAr}</div>
          </>
        )}
      </div>
    </div>
    <div style={{ aspectRatio: String(ratio) }} className={`relative w-full ${skin ? '' : 'rounded-2xl border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.6)] bg-[#1c6a33]'} overflow-hidden`}>
      {skin ? <img src={skin} alt="" draggable={false} decoding="async" className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: "cover" }} /> : <PitchSvg />}
      {NODES.map((n, i) => {
        const p = slots[n.key];
        return (
          <div key={n.key} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ top: topFor(i), width: `${cardPct}%` }}>
            {p ? (
              <PlayerCard player={p} size="fluid" transparent />
            ) : (
              <div className="w-full aspect-[2/3] rounded-xl border-2 border-dashed border-white/50 bg-black/25 flex items-center justify-center text-[9px] font-black text-white/70">
                {n.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
    {cards.length > 0 && (
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 rounded-xl bg-black/60 border border-amber-400/35 px-2 py-1.5 min-w-0">
        {cards.map((type, i) => (
          <GameCardMini key={`${type}-${i}`} type={type} compact showMicro={false} />
        ))}
      </div>
    )}
  </div>
  );
};

// ---------------- سجل الجولات (شاشة الحكم) ----------------
import { drawStage } from '../services/dealOrNoDealEngine';
import type { DndEvent, DndPools, DndSide } from '../types/dealOrNoDealTypes';

export const RoundsLog: React.FC<{
  seed: number;
  starter: DndSide;
  pools: DndPools;
  upTo: number;
  events: DndEvent[];
  nameOf: (s: DndSide) => string;
}> = ({ seed, starter, pools, upTo, events, nameOf }) => (
  <div className="rounded-2xl border border-amber-400/40 bg-zinc-950/70 p-3 space-y-4" dir="rtl">
    <div className="text-sm font-black text-amber-300">📋 سجل الجولات — كل الصناديق (للحكم بس)</div>
    {DND_STAGES.slice(0, upTo + 1).map((st, i) => {
      const draw = drawStage(seed, i, starter, pools);
      return (
        <div key={st.key}>
          <div className="text-xs font-black text-white mb-1">
            {st.emoji} الجولة {i + 1}: {st.labelAr}
          </div>
          {(['A', 'B'] as DndSide[]).map((side) => {
            const evs = events.filter((e) => e.stage === i && e.side === side);
            const final = evs.find((e) => e.kind === 'DEAL' || e.kind === 'FORCED');
            const first = evs.find((e) => e.kind === 'OPEN');
            const gambled = evs.some((e) => e.kind === 'GAMBLE');
            return (
              <div key={side} className="mb-1.5">
                <div className="text-[11px] font-bold text-zinc-400 mb-0.5">
                  {nameOf(side)}
                  {final ? ` — ${final.kind === 'DEAL' ? 'خد الصفقة' : 'جازف'}` : evs.length ? ' — لسه بيلعب' : ' — لسه'}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {draw[side].map((b) => {
                    const chosen = final && final.box === b.index;
                    const passed = gambled && first && first.box === b.index && final?.kind === 'FORCED';
                    return (
                      <div
                        key={b.index}
                        className={`rounded-lg border px-1 py-1 text-center min-w-0 ${chosen ? 'border-emerald-400 bg-emerald-500/10' : passed ? 'border-orange-400 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900'}`}
                      >
                        {b.cardType && <div className="mb-1 flex justify-center"><GameCardMini type={b.cardType} compact showMicro={false} /></div>}
                        <div className="text-[9px] font-black text-white leading-tight break-words line-clamp-2">{itemName(b.item)}</div>
                        <div className="text-[10px] font-black text-amber-300">{itemRating(b.item)}</div>
                        <div className="text-[8px] text-zinc-400">{chosen ? '✅ اتاخد' : passed ? 'اتساب' : `صندوق ${b.index + 1}`}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
);
