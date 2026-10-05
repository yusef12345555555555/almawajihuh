// ============================================================
// المواجهة | إعداد المزاد — شاشة شفافة بالكامل فوق خلفية اللعبة.
// كل الاختيارات صغيرة وبجانب بعض لتناسب الهاتف: النظام (2)، الكروت (4)،
// مدة المزايدة (صف واحد). لا مربعات كبيرة تغطي الخلفية.
// ============================================================

import React, { useState } from 'react';
import { AuctionRoomSettings, UserProfile } from '../types';
import { audioManager } from '../services/audioManager';
import { ArrowRight, CheckCircle2, Swords } from 'lucide-react';
import { useBackHandler } from '../services/backHandler';

interface AuctionModeStrategySelectionProps {
  user: UserProfile;
  onLaunchAuction: (settings: AuctionRoomSettings) => void;
  onBack: () => void;
  /** إعدادات متفق عليها في غرفة اللعب مع الصحاب — لو موجودة المزاد بيبدأ بيها مباشرة */
  roomSettings?: { format: 5 | 11; cards: boolean; duration?: number; auctionCard?: 'NONE' | 'LAST_BID' | 'WILD_CARD' | 'NO_RISK' } | null;
}

const TIMERS = [5, 10, 15, 20, 25, 30, 35];

export const AuctionModeStrategySelection: React.FC<AuctionModeStrategySelectionProps> = ({ user: _user, onLaunchAuction, onBack, roomSettings }) => {
  useBackHandler(true, onBack);
  const roomLaunchedRef = React.useRef(false);
  React.useEffect(() => {
    if (!roomSettings || roomLaunchedRef.current) return;
    roomLaunchedRef.current = true;
    const big = roomSettings.format === 11;
    const ac = roomSettings.auctionCard || (roomSettings.cards ? 'WILD_CARD' : 'NONE');
    const lb = ac === 'LAST_BID';
    const wc = ac === 'WILD_CARD';
    const nr = ac === 'NO_RISK';
    onLaunchAuction({
      budgetMode: big ? '200M' : '100M',
      initialBudget: big ? 200 : 100,
      squadSize: big ? 11 : 5,
      bidTimerSeconds: roomSettings.duration || 15,
      bidTimeLimitSeconds: roomSettings.duration || 15,
      bidIncrement: 1,
      fastBidConfirm: false,
      allowBots: true,
      mysteryPlayerChance: 0.2,
      auctionStrategyMode: ac !== 'NONE' ? 'CUSTOM' : 'STANDARD',
      standardSkipEnabled: !lb,
      lastBidEnabled: lb,
      wildCardEnabled: wc,
      noRiskEnabled: nr
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [format, setFormat] = useState<'100M' | '200M'>('100M');
  const [lastBidEnabled, setLastBidEnabled] = useState(false);
  const [wildCardEnabled, setWildCardEnabled] = useState(false);
  const [noRiskEnabled, setNoRiskEnabled] = useState(false);
  const [bidTimerSeconds, setBidTimerSeconds] = useState<number>(15);

  const noCards = !lastBidEnabled && !wildCardEnabled && !noRiskEnabled;

  const launch = () => {
    const settings: AuctionRoomSettings = {
      budgetMode: format,
      initialBudget: format === '100M' ? 100 : 200,
      squadSize: format === '100M' ? 5 : 11,
      bidTimerSeconds,
      bidTimeLimitSeconds: bidTimerSeconds,
      bidIncrement: 1,
      fastBidConfirm: false,
      allowBots: true,
      mysteryPlayerChance: 0.2,
      auctionStrategyMode: lastBidEnabled || wildCardEnabled || noRiskEnabled ? 'CUSTOM' : 'STANDARD',
      standardSkipEnabled: !lastBidEnabled,
      lastBidEnabled,
      wildCardEnabled,
      noRiskEnabled
    };
    audioManager.playWhistle();
    onLaunchAuction(settings);
  };

  const cards = [
    { key: 'none', active: noCards, toggle: () => { setLastBidEnabled(false); setWildCardEnabled(false); setNoRiskEnabled(false); }, src: '', name: 'عادي', desc: 'من غير كروت' },
    { key: 'last', active: lastBidEnabled, toggle: () => { setLastBidEnabled(true); setWildCardEnabled(false); setNoRiskEnabled(false); }, src: '/cards/auction-last-bid.png', name: 'لاست بيد', desc: 'مفيش مجاني' },
    { key: 'wild', active: wildCardEnabled, toggle: () => { setLastBidEnabled(false); setWildCardEnabled(true); setNoRiskEnabled(false); }, src: '/cards/auction-wild-card.png', name: 'وايلد كارد', desc: 'بدّل لاعب' },
    { key: 'norisk', active: noRiskEnabled, toggle: () => { setLastBidEnabled(false); setWildCardEnabled(false); setNoRiskEnabled(true); }, src: '/cards/auction-no-risk.png', name: 'خاطر وبدّل', desc: 'خاطر' }
  ];

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[60] overflow-y-auto select-none"
      style={{
        backgroundImage: "linear-gradient(rgba(3,7,18,.15), rgba(3,7,18,.5)), url('/games/backgrounds/auction-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="min-h-full w-full max-w-md mx-auto px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+14px)] flex flex-col gap-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-[11px] font-black text-white bg-black/45 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1.5"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>رجوع</span>
          </button>
          <h1 className="text-base font-black text-white">المزاد • اختار النظام</h1>
          <div className="w-14" />
        </div>

        <div className="flex-1" />

        {/* النظام */}
        <div>
          <div className="text-[11px] font-black text-amber-200 mb-1.5 text-center">حجم المزاد</div>
          <div className="grid grid-cols-2 gap-2">
            {(['100M', '200M'] as const).map((m) => {
              const active = format === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFormat(m)}
                  className={`relative rounded-2xl border-2 px-2 py-2 text-center backdrop-blur-[2px] transition-all ${active ? 'border-amber-300 bg-amber-950/60' : 'border-white/25 bg-black/35'}`}
                >
                  {active && <CheckCircle2 className="absolute top-1 left-1 w-3.5 h-3.5 text-amber-300" />}
                  <div className="text-sm font-black text-amber-300 leading-tight">{m === '100M' ? 'خماسي • عادي' : '11 كاملة • برو'}</div>
                  <div className="text-[11px] font-black text-white">{m} €</div>
                  <div className="text-[9px] text-zinc-200">{m === '100M' ? '5 لاعبين' : '11 لاعب'}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* الكروت: 4 في صف واحد */}
        <div>
          <div className="text-[11px] font-black text-amber-200 mb-1.5 text-center">الكروت الخاصة</div>
          <div className="grid grid-cols-4 gap-1.5">
            {cards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={card.toggle}
                className={`rounded-xl border-2 p-1 text-center backdrop-blur-[2px] transition-all ${card.active ? 'border-amber-300 bg-amber-950/60 scale-[1.03]' : 'border-white/25 bg-black/35'}`}
              >
                <div className="relative h-14 overflow-hidden rounded-lg flex items-center justify-center">
                  {card.src ? (
                    <img src={card.src} alt={card.name} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
                  ) : (
                    <span className="text-amber-300 text-lg font-black">∅</span>
                  )}
                </div>
                <div className="mt-0.5 text-[9px] font-black text-white leading-tight truncate">{card.name}</div>
                <div className="text-[8px] text-zinc-200 leading-tight truncate">{card.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* مدة المزايدة: صف واحد */}
        <div>
          <div className="text-[11px] font-black text-amber-200 mb-1.5 text-center">مدة المزايدة (ثانية)</div>
          <div className="grid grid-cols-7 gap-1">
            {TIMERS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setBidTimerSeconds(sec)}
                className={`rounded-lg py-2 text-[11px] font-black border backdrop-blur-[2px] transition-all ${
                  bidTimerSeconds === sec ? 'bg-amber-400 text-zinc-950 border-amber-200' : 'bg-black/40 text-white border-white/25'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={launch}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 py-3 text-base font-black text-zinc-950 shadow-[0_0_28px_rgba(245,158,11,.4)] active:scale-[.98] transition-transform"
        >
          <span className="inline-flex items-center gap-2"><Swords className="w-4 h-4" />يلا نلعب</span>
        </button>
      </div>
    </div>
  );
};
