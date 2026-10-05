// ============================================================
// المواجهة | AL MWAJHA — السوق
// العناصر بتتضاف من لوحة الإدارة (4 أنواع). بتظهر كما اتضافت، 4 جنب بعض، وبالضغط على العنصر
// بتشوف معاينة كبيرة على صورتك واسمك (الإطار بيتضبط بالمقاس تلقائياً).
// ============================================================

import React, { useState } from 'react';
import { ArrowRight, Coins, CheckCircle2, ShoppingBag, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, MarketCategory, MarketItem, EquippedCosmetics } from '../types';
import { MarketService } from '../services/marketService';
import { useMarketCatalog, CATEGORY_LABEL, EQUIP_KEY, pitchSkinUrl } from '../services/marketCatalog';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';
import { PlayerCosmeticName } from './PlayerCosmeticName';
import { audioManager } from '../services/audioManager';
import { useBackHandler } from '../services/backHandler';

interface MarketViewProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onBack: () => void;
}

const TABS: MarketCategory[] = ['AVATAR_FRAME', 'NAME_FRAME', 'ENTRANCE', 'PITCH_SKIN'];
const SHORT: Record<MarketCategory, string> = { AVATAR_FRAME: 'الصورة', NAME_FRAME: 'الاسم', ENTRANCE: 'الدخلة', PITCH_SKIN: 'التشكيلة' };

const only = (item: MarketItem): EquippedCosmetics =>
  item.category === 'AVATAR_FRAME' ? { avatarFrame: item.id } : item.category === 'NAME_FRAME' ? { nameFrame: item.id } : item.category === 'PITCH_SKIN' ? { pitchSkin: item.id } : { entrance: item.id };

export const MarketView: React.FC<MarketViewProps> = ({ user, onUpdateUser, onBack }) => {
  const items = useMarketCatalog();
  const [tab, setTab] = useState<MarketCategory>('AVATAR_FRAME');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<MarketItem | null>(null);
  useBackHandler(true, () => (preview ? setPreview(null) : onBack()));

  const list = items.filter((i) => i.category === tab);
  const inventory = user.inventory || [];
  const equipped = user.equippedCosmetics || {};

  const run = (fn: () => { success: boolean; message: string; updatedUser?: UserProfile }, celebrate = false) => {
    const r = fn();
    setMsg({ ok: r.success, text: r.message });
    if (r.success && r.updatedUser) {
      onUpdateUser(r.updatedUser);
      audioManager.playGoal();
      if (celebrate) {
        try {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
        } catch {
          /* ignore */
        }
      }
    }
    window.setTimeout(() => setMsg(null), 2500);
  };

  const actionBtn = (it: MarketItem, big = false) => {
    const owned = inventory.includes(it.id);
    const on = equipped[EQUIP_KEY[it.category]] === it.id;
    const base = `w-full rounded-lg font-black active:scale-95 transition-transform ${big ? 'py-2.5 text-xs' : 'py-1 text-[9px]'}`;
    if (owned) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            run(() => (on ? MarketService.unequipCategory(user, it.category) : MarketService.equipItem(user, it.id)));
          }}
          className={`${base} ${on ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50' : 'bg-amber-400 text-zinc-950'}`}
        >
          {on ? 'راكب ✓' : 'استخدم'}
        </button>
      );
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          run(() => MarketService.purchaseItem(user, it.id), true);
        }}
        className={`${base} bg-gradient-to-l from-amber-500 to-yellow-300 text-zinc-950`}
      >
        <span className="inline-flex items-center justify-center gap-0.5">
          <Coins className={big ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} /> {it.price.toLocaleString('ar-EG')}
        </span>
      </button>
    );
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[40] overflow-y-auto"
      style={{
        backgroundImage: "linear-gradient(rgba(3,7,18,.3), rgba(3,7,18,.6)), url('/market/market-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="max-w-md mx-auto px-2 pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+110px)] space-y-2.5">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-[11px] font-black text-white bg-black/45 border border-white/15 rounded-full px-3 py-1.5">
            <ArrowRight className="w-3.5 h-3.5" /> رجوع
          </button>
          <div className="flex items-center gap-1.5 text-white font-black text-sm drop-shadow">
            <ShoppingBag className="w-4 h-4 text-amber-400" /> السوق
          </div>
          <div className="flex items-center gap-1 bg-black/50 border border-amber-400/40 rounded-full px-2.5 py-1 text-xs font-black text-amber-300">
            <Coins className="w-3.5 h-3.5" /> {user.coins.toLocaleString('ar-EG')}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl py-2 text-[11px] font-black border ${tab === t ? 'bg-amber-400 text-zinc-950 border-amber-200' : 'bg-black/50 text-white border-white/20'}`}
            >
              {SHORT[t]}
            </button>
          ))}
        </div>
        <div className="text-center text-[11px] font-black text-amber-200 drop-shadow">{CATEGORY_LABEL[tab]}</div>

        {msg && (
          <div className={`rounded-xl px-3 py-1.5 text-center text-[11px] font-black ${msg.ok ? 'bg-emerald-500/30 text-emerald-100' : 'bg-rose-500/30 text-rose-100'}`}>{msg.text}</div>
        )}

        {list.length === 0 ? (
          <div className="text-center text-sm font-bold text-white/85 py-10 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            مفيش عناصر في «{CATEGORY_LABEL[tab]}» لسه — هتتضاف قريب ✨
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {list.map((it) => {
              const on = equipped[EQUIP_KEY[it.category]] === it.id;
              return (
                <div key={it.id} onClick={() => setPreview(it)} className={`rounded-xl p-1 bg-black/45 border cursor-pointer ${on ? 'border-emerald-400/70' : 'border-white/15'}`}>
                  <div className="aspect-square flex items-center justify-center overflow-hidden rounded-lg">
                    <img
                      src={it.category === 'PITCH_SKIN' ? pitchSkinUrl(only(it), 11) : it.imageUrl}
                      alt={it.nameAr}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="mt-0.5 text-center text-[9px] font-black text-white truncate leading-tight">{it.nameAr}</div>
                  <div className="mt-0.5">{actionBtn(it)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative w-full max-w-xs rounded-3xl bg-zinc-950/90 border border-white/15 p-4 space-y-3 text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="absolute top-2 left-2 text-zinc-400">
              <X className="w-5 h-5" />
            </button>
            <div className="text-sm font-black text-white">{preview.nameAr}</div>
            <div className="min-h-[150px] flex items-center justify-center">
              {preview.category === 'AVATAR_FRAME' && <PlayerAvatarBadge avatar={user.avatar} size="xl" ring={false} equipped={only(preview)} />}
              {preview.category === 'NAME_FRAME' && <PlayerCosmeticName name={user.nameAr || user.username} equipped={only(preview)} size="lg" />}
              {preview.category === 'ENTRANCE' && (
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <img src={preview.imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                  <div className="relative z-10 scale-75">
                    <PlayerAvatarBadge avatar={user.avatar} size="lg" ring={false} />
                  </div>
                </div>
              )}
              {preview.category === 'PITCH_SKIN' && <img src={pitchSkinUrl(only(preview), 11)} alt="" className="max-h-72 w-auto object-contain" draggable={false} />}
            </div>
            {actionBtn(preview, true)}
            {inventory.includes(preview.id) && equipped[EQUIP_KEY[preview.category]] === preview.id && (
              <div className="flex items-center justify-center gap-1 text-[11px] font-black text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> العنصر ده راكب دلوقتي
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
