// ============================================================
// العبها صح | EL3BHA SA7 - Realistic Interactive Football Pitch
// ============================================================

import React from 'react';
import { FootballPlayer, EquippedCosmetics } from '../types';
import { pitchSkinUrl, useMarketCatalog } from '../services/marketCatalog';
import { usePitchRatio } from '../services/pitchRatio';
import { StorageService } from '../services/storageService';
import { Shield, Sparkles, User, Check, DollarSign } from 'lucide-react';
import { PlayerCard } from './PlayerCard';

export interface PitchPlayerNode {
  slotId: string;
  positionCategory: 'GK' | 'DEF' | 'MID' | 'ATT';
  positionLabel: string;
  gridX: number; // percentage from left 0 - 100
  gridY: number; // percentage from top 0 - 100
  player: FootballPlayer | null;
  acquisitionCost?: number;
  isFree?: boolean;
  owner?: 'YOU' | 'OPPONENT';
}

interface FootballPitchProps {
  mode: 'CLASSIC' | 'PRO' | '100M' | '200M' | 5 | 11;
  squad: FootballPlayer[];
  teamName: string;
  teamAvatar?: string;
  isUser: boolean;
  totalBudget?: number;
  budgetRemaining?: number;
  activeTargetPosition?: string;
  onSelectPlayer?: (player: FootballPlayer) => void;
  compact?: boolean;
  highlightSlotId?: string;
  /** لاعيبة نزلوا التشكيلة بكرت (وايلد كارد / خاطر وبدل) — بيتظلّلوا بإطار متوهج وشارة «جديد». */
  highlightPlayerIds?: string[];
  showOwnership?: boolean;
  /** العناصر المجهزة لصاحب الأرضية (أرضية التشكيلة من السوق). لو isUser وملهاش قيمة بتتاخد من لاعبنا. */
  equipped?: EquippedCosmetics;
  /** نسبة عرض/ارتفاع ثابتة — بتخلي تشكيلتين جنب/فوق بعض بنفس الطول بالظبط مهما كانت أرضية كل واحد. */
  ratioOverride?: number;
}

export const FootballPitch: React.FC<FootballPitchProps> = ({
  mode,
  squad,
  teamName,
  teamAvatar,
  isUser,
  budgetRemaining,
  activeTargetPosition,
  onSelectPlayer,
  compact = false,
  highlightSlotId,
  highlightPlayerIds,
  showOwnership = true,
  equipped,
  ratioOverride
}) => {
  useMarketCatalog();
  const isClassic = mode === 'CLASSIC' || mode === '100M' || mode === 5;

  const skin = pitchSkinUrl(equipped ?? (isUser ? StorageService.getUserProfile().equippedCosmetics : undefined), isClassic ? 5 : 11);

  const skinRatio = usePitchRatio(skin); // نسبة صورة الأرضية الحقيقية (أو 3/4 للافتراضية)
  // التشكيلة دايماً بالطول (portrait) وبنسبة ثابتة لو اتحددت، عشان التشكيلتين يكونوا نفس الشكل والطول.
  const ratio = ratioOverride ?? Math.min(0.85, Math.max(0.6, skinRatio));

  // صفوف التشكيلة من الهجوم (فوق) للحارس (تحت). الحارس بيبدأ من عند خط المرمى (حافة الصورة السفلية)
  // والصفوف بتتوزع بالتساوي لحد الهجوم — بغض النظر عن شكل الأرضية، ومن غير ما كارت يغطي كارت.
  const ROWS: { cat: PitchPlayerNode['positionCategory']; xs: number[]; labels: string[]; ids: string[] }[] = isClassic
    ? [
        { cat: 'ATT', xs: [50], labels: ['ST'], ids: ['c_att'] },
        { cat: 'MID', xs: [27, 73], labels: ['LM', 'RM'], ids: ['c_mid_l', 'c_mid_r'] },
        { cat: 'DEF', xs: [50], labels: ['DEF'], ids: ['c_def'] },
        { cat: 'GK', xs: [50], labels: ['GK'], ids: ['c_gk'] }
      ]
    : [
        { cat: 'ATT', xs: [22, 50, 78], labels: ['LW', 'ST', 'RW'], ids: ['p_lw', 'p_st', 'p_rw'] },
        { cat: 'MID', xs: [22, 50, 78], labels: ['CM', 'CDM', 'CM'], ids: ['p_lcm', 'p_cm', 'p_rcm'] },
        { cat: 'DEF', xs: [14, 38, 62, 86], labels: ['LB', 'CB', 'CB', 'RB'], ids: ['p_lb', 'p_lcb', 'p_rcb', 'p_rb'] },
        { cat: 'GK', xs: [50], labels: ['GK'], ids: ['p_gk'] }
      ];
  const rowCount = ROWS.length;
  const MARGIN = 1.2; // % من ارتفاع الملعب
  const cardHmaxPct = ((100 - MARGIN * 2) / rowCount) * 0.96; // أقصى ارتفاع كارت يخلي الصفوف ما تتلامسش
  const cardWByHeight = cardHmaxPct / (1.5 * ratio);
  const cardWByWidth = isClassic ? 26 : 21.5;
  const cardW = Math.min(cardWByHeight, cardWByWidth);
  const halfH = (cardW * 1.5 * ratio) / 2;
  const yTop = MARGIN + halfH;
  const yBottom = 100 - MARGIN - halfH;

  const slots: PitchPlayerNode[] = React.useMemo(() => {
    const out: PitchPlayerNode[] = [];
    ROWS.forEach((row, ri) => {
      const y = rowCount === 1 ? 50 : yTop + ((yBottom - yTop) * ri) / (rowCount - 1);
      row.xs.forEach((x, i) => out.push({ slotId: row.ids[i], positionCategory: row.cat, positionLabel: row.labels[i], gridX: x, gridY: y, player: null }));
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClassic, yTop, yBottom]);

  // Map squad players into positional slots
  const mappedSlots = React.useMemo(() => {
    const slotsCopy = slots.map((s) => ({ ...s, player: null as FootballPlayer | null }));
    const assignedPlayerIds = new Set<string>();

    // First pass: match exact positions or categories
    slotsCopy.forEach((slot) => {
      const match = squad.find((p) => {
        if (assignedPlayerIds.has(p.id)) return false;
        if (slot.positionCategory === 'GK') return p.position === 'GK';
        if (slot.positionCategory === 'DEF') return ['CB', 'LB', 'RB'].includes(p.position);
        if (slot.positionCategory === 'MID') return ['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(p.position);
        if (slot.positionCategory === 'ATT') return ['ST', 'RW', 'LW', 'CF'].includes(p.position);
        return false;
      });

      if (match) {
        slot.player = match;
        slot.acquisitionCost = match.marketValue;
        slot.owner = isUser ? 'YOU' : 'OPPONENT';
        assignedPlayerIds.add(match.id);
      }
    });

    // Fallback pass for any remaining players
    squad.forEach((p) => {
      if (!assignedPlayerIds.has(p.id)) {
        const emptySlot = slotsCopy.find((s) => !s.player);
        if (emptySlot) {
          emptySlot.player = p;
          emptySlot.acquisitionCost = p.marketValue;
          emptySlot.owner = isUser ? 'YOU' : 'OPPONENT';
          assignedPlayerIds.add(p.id);
        }
      }
    });

    return slotsCopy;
  }, [slots, squad, isUser]);

  const filledCount = squad.length;
  const totalCount = isClassic ? 5 : 11;
  const avgRating =
    filledCount > 0 ? Math.round(squad.reduce((acc, p) => acc + p.overallRating, 0) / filledCount) : 0;

  return (
    <div
      id={isUser ? 'user_pitch_container' : 'opponent_pitch_container'}
      className={`relative w-full rounded-2xl overflow-hidden border ${
        isUser
          ? 'border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
          : 'border-blue-500/40 shadow-[0_0_25px_rgba(59,130,246,0.15)]'
      } bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex flex-col`}
    >
      {/* Header bar of pitch */}
      <div
        className={`px-3 py-2 flex items-center justify-between border-b ${
          isUser ? 'border-emerald-500/30 bg-emerald-950/40' : 'border-blue-500/30 bg-blue-950/40'
        } backdrop-blur-md z-10`}
      >
        <div className="flex items-center gap-2">
          {teamAvatar ? (
            <img
              src={teamAvatar}
              alt={teamName}
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-full border border-white/20 object-cover"
            />
          ) : (
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                isUser ? 'bg-emerald-500 text-zinc-950' : 'bg-blue-500 text-white'
              }`}
            >
              {isUser ? 'أنت' : 'خصم'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">{teamName}</span>
              {showOwnership && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${
                    isUser ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}
                >
                  {teamName || (isUser ? 'فريقك' : 'فريق AI')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {budgetRemaining !== undefined && (
            <div className="flex items-center gap-1 text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <span>الميزانية:</span>
              <span>{budgetRemaining}M €</span>
            </div>
          )}
          <div className="text-zinc-300 font-mono">
            <span className="font-bold text-white">{filledCount}</span>/{totalCount}
          </div>
          {avgRating > 0 && (
            <div className="bg-zinc-800 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[10px] border border-amber-400/30">
              OVR {avgRating}
            </div>
          )}
        </div>
      </div>

      {/* The Football Pitch Canvas Environment */}
      <div
        className="relative w-full select-none overflow-hidden"
        style={{
          aspectRatio: String(ratio),
          ...(skin ? {} : { background: 'radial-gradient(ellipse at center, #15803d 0%, #14532d 55%, #052e16 100%)' })
        }}
      >
        {skin ? (
          <img src={skin} alt="" draggable={false} decoding="async" className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: "cover" }} />
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 32px, transparent 32px, transparent 64px)'
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)] pointer-events-none" />
            <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none" />
          </>
        )}

        {/* Pitch Lines (Regulation markings in SVG) */}
        {!skin && <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {/* Outer Boundary */}
          <rect x="4" y="4" width="92" height="92" fill="none" stroke="#ffffff" strokeWidth="0.8" />

          {/* Halfway Line */}
          <line x1="4" y1="50" x2="96" y2="50" stroke="#ffffff" strokeWidth="0.8" />

          {/* Center Circle & Spot */}
          <circle cx="50" cy="50" r="12" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="1" fill="#ffffff" />

          {/* Top Penalty Box (Opponent Side / Attack) */}
          <rect x="25" y="4" width="50" height="18" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          <rect x="36" y="4" width="28" height="7" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          <path d="M 38 22 A 12 12 0 0 0 62 22" fill="none" stroke="#ffffff" strokeWidth="0.8" />

          {/* Bottom Penalty Box (Our Side / GK) */}
          <rect x="25" y="78" width="50" height="18" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          <rect x="36" y="89" width="28" height="7" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          <path d="M 38 78 A 12 12 0 0 1 62 78" fill="none" stroke="#ffffff" strokeWidth="0.8" />

          {/* Corner Arcs */}
          <path d="M 4 8 A 4 4 0 0 0 8 4" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          <path d="M 92 4 A 4 4 0 0 0 96 8" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          <path d="M 4 92 A 4 4 0 0 0 8 96" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          <path d="M 96 92 A 4 4 0 0 1 92 96" fill="none" stroke="#ffffff" strokeWidth="0.8" />
        </svg>}

        {/* Tactical Nodes / Pitch Players */}
        {mappedSlots.map((slot) => {
          const isSlotHighlighted = highlightSlotId === slot.slotId;
          const isCardSwapped = !!slot.player && !!highlightPlayerIds?.includes(slot.player.id);
          const isTargetPosition =
            activeTargetPosition &&
            slot.positionCategory.toLowerCase().includes(activeTargetPosition.toLowerCase());

          return (
            <div
              key={slot.slotId}
              id={`pitch_node_${slot.slotId}`}
              style={{
                left: `${slot.gridX}%`,
                top: `${slot.gridY}%`,
                transform: 'translate(-50%, -50%)',
                width: slot.player ? `${cardW}%` : undefined
              }}
              onClick={() => {
                if (slot.player && onSelectPlayer) {
                  onSelectPlayer(slot.player);
                }
              }}
              className={`absolute transition-all duration-300 ${
                slot.player ? 'cursor-pointer hover:scale-110 z-20' : 'z-10'
              }`}
            >
              {slot.player ? (
                // FILLED PLAYER NODE WITH REAL PLAYER IMAGE
                <div
                  className={`group relative w-full flex flex-col items-center justify-center animate-in zoom-in-75 duration-300`}
                >
                  {isCardSwapped && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-full bg-emerald-400 text-zinc-950 text-[8px] font-black px-1.5 py-0.5 shadow-[0_0_10px_rgba(52,211,153,0.9)]">🎲 جديد</div>
                  )}
                  {/* بطاقة لاعب صغيرة على النجيلة — نفس تصميم البطاقة الموحّد في كل الألعاب */}
                  <div
                    className={`relative w-full ${
                      isCardSwapped
                        ? 'animate-pulse drop-shadow-[0_0_10px_rgba(52,211,153,0.95)]'
                        : isUser
                          ? ''
                          : ''
                    }`}
                  >
                    <PlayerCard player={slot.player} size="fluid" transparent />
                    {slot.player.paidPrice !== undefined && (slot.player.paidPrice > 0 || slot.player.acquiredFree) && (
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-mono font-black text-amber-300 bg-zinc-950/85 px-1 rounded border border-amber-400/30">
                        {slot.player.paidPrice > 0 ? `${slot.player.paidPrice}M €` : 'مجاني'}
                      </span>
                    )}
                  </div>

                </div>
              ) : (
                // EMPTY TACTICAL SLOT PLACEHOLDER
                <div
                  className={`flex flex-col items-center justify-center transition-transform ${
                    isTargetPosition ? 'scale-110 animate-pulse' : ''
                  }`}
                >
                  <div
                    className={`${
                      compact ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-11 sm:h-11'
                    } rounded-full border-2 border-dashed ${
                      isTargetPosition
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                        : isSlotHighlighted
                        ? 'border-white bg-white/10 text-white'
                        : 'border-white/40 bg-black/30 text-white/70'
                    } flex items-center justify-center font-black text-[10px] sm:text-xs backdrop-blur-sm`}
                  >
                    {slot.positionLabel}
                  </div>
                  <span className="text-[9px] text-white/60 font-mono mt-0.5">
                    {slot.positionCategory}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
