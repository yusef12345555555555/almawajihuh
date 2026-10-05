// ============================================================
// المواجهة | شاشة تجهيز اللعبة الموحّدة (مزاد • ديل أور نو ديل • تاخد اللاعب ده ولا الخفي)
//  كل الاختيارات في شاشة واحدة بالترتيب: حجم التشكيلة ← (الكروت) ← المدة ← «تلعب مع مين؟»
//  بعد الاختيار اللعبة بتبدأ مرة واحدة على طول من غير أي شاشة اختيارات تانية.
// ============================================================

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { PlayerSnapshot, UserProfile } from '../types';
import { audioManager } from '../services/audioManager';
import { FriendRoomModal } from './FriendRoomModal';
import { StartMatchModal } from './StartMatchModal';
import { FriendRoomService, RoomSettings, openRoomInApp } from '../services/friendRoomService';

type OppKind = 'FRIEND' | 'RANDOM' | 'AI' | 'LOCAL' | 'REFEREE';

interface GameCaps {
  format: boolean;
  cards: boolean;
  durations: number[] | null;
  defaultDuration: number;
  durationLabel: string;
  opps: OppKind[];
}

const CAPS: Record<string, GameCaps> = {
  PLAYER_OR_HIDDEN: { format: true, cards: false, durations: [5, 10, 15, 20, 25, 30, 35], defaultDuration: 15, durationLabel: 'مدة الجولة (ثانية)', opps: ['FRIEND', 'RANDOM', 'AI', 'LOCAL', 'REFEREE'] },
  AUCTION: { format: true, cards: true, durations: [10, 15, 20, 30], defaultDuration: 15, durationLabel: 'مدة المزايدة (ثانية)', opps: ['FRIEND', 'RANDOM', 'AI'] },
  DEAL_OR_NO_DEAL: { format: false, cards: false, durations: null, defaultDuration: 15, durationLabel: '', opps: ['FRIEND', 'RANDOM', 'AI', 'REFEREE'] }
};

const OPP_META: Record<OppKind, { emoji: string; title: string; sub: string }> = {
  FRIEND: { emoji: '🤝', title: 'مع صحبك', sub: 'دعوة / كود غرفة' },
  RANDOM: { emoji: '🌍', title: 'لاعب عشوائي', sub: 'أونلاين' },
  AI: { emoji: '🤖', title: 'ضد AI', sub: 'العب لوحدك' },
  LOCAL: { emoji: '📱', title: 'التطبيق حكم', sub: 'على موبايل واحد' },
  REFEREE: { emoji: '🎙️', title: 'حكم بشري', sub: 'صديق يحكّم' }
};

interface Props {
  user: UserProfile;
  gameId: string;
  titleAr: string;
  bgUrl?: string;
  onClose: () => void;
  /** بدء اللعبة: setup = كل الاختيارات، opponent لو لاعب حقيقي، method = طريقة اللعب */
  onLaunch: (setup: RoomSettings, opponent: PlayerSnapshot | null, method: 'ai' | 'quick' | 'referee') => void;
  /** وضع الحكم البشري في ديل أور نو ديل بيحتاج بيانات اللاعبين الأول */
  onDndReferee?: (setup: RoomSettings) => void;
}

export const GameSetupSheet: React.FC<Props> = ({ user, gameId, titleAr, onClose, onLaunch, onDndReferee }) => {
  const caps = CAPS[gameId] || CAPS.PLAYER_OR_HIDDEN;
  const [format, setFormat] = useState<5 | 11>(5);
  const [auctionCard, setAuctionCard] = useState<'NONE' | 'LAST_BID' | 'WILD_CARD' | 'NO_RISK'>('NONE');
  const [duration, setDuration] = useState(caps.defaultDuration);
  const [showFriend, setShowFriend] = useState(false);
  const [showRandom, setShowRandom] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeErr, setCodeErr] = useState('');

  const setup = (mode?: RoomSettings['mode']): RoomSettings => ({
    format: caps.format ? format : 5,
    cards: caps.cards ? auctionCard !== 'NONE' : false,
    auctionCard: caps.cards ? auctionCard : undefined,
    duration: caps.durations ? duration : undefined,
    mode
  });

  const pick = (k: OppKind) => {
    audioManager.playClick();
    if (k === 'FRIEND') return setShowFriend(true);
    if (k === 'RANDOM') return setShowRandom(true);
    if (k === 'AI') return onLaunch(setup('AI'), null, 'ai');
    if (k === 'LOCAL') return onLaunch(setup('LOCAL'), null, 'ai');
    if (k === 'REFEREE') {
      if (gameId === 'DEAL_OR_NO_DEAL') return onDndReferee?.(setup('REFEREE'));
      return onLaunch(setup('REFEREE'), null, 'referee');
    }
  };

  const joinByCode = async () => {
    if (codeBusy) return;
    setCodeBusy(true);
    setCodeErr('');
    const room = await FriendRoomService.getByCode(code);
    setCodeBusy(false);
    if (!room || room.expiresAt < Date.now()) {
      setCodeErr('الكود ده غلط أو الغرفة خلصت');
      return;
    }
    onClose();
    openRoomInApp(room.id);
  };

  const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; className?: string }> = ({ active, onClick, children, className = '' }) => (
    <button
      type="button"
      onClick={() => {
        audioManager.playClick();
        onClick();
      }}
      className={`rounded-xl border-2 py-2 px-1 text-center text-[12px] font-black backdrop-blur-[2px] transition-all active:scale-95 ${
        active ? 'border-amber-300 bg-amber-400 text-zinc-950' : 'border-white/25 bg-black/45 text-white'
      } ${className}`}
    >
      {children}
    </button>
  );

  return (
    <>
      <div dir="rtl" className="fixed inset-0 z-[400] flex items-end justify-center bg-black/55 backdrop-blur-[2px]" onClick={onClose}>
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-x border-white/15 bg-gradient-to-b from-zinc-900/95 to-zinc-950/98 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-20px_60px_rgba(0,0,0,.6)]"
        >
          <button onClick={onClose} className="absolute top-3 left-3 p-1.5 rounded-full bg-black/40 text-white/80" aria-label="إغلاق">
            <X className="w-4 h-4" />
          </button>
          <div className="text-center mb-3">
            <h2 className="text-base font-black text-amber-300">{titleAr}</h2>
            <p className="text-[10px] text-white/60">اختار الإعدادات وبعدين تلعب مع مين</p>
          </div>

          {caps.format && (
            <div className="mb-3">
              <div className="text-[11px] font-black text-amber-200 mb-1.5">1) حجم التشكيلة</div>
              <div className="grid grid-cols-2 gap-2">
                <Chip active={format === 5} onClick={() => setFormat(5)}>خماسي ⚽ <span className="block text-[9px] font-bold opacity-70">5 مراكز + مدرب</span></Chip>
                <Chip active={format === 11} onClick={() => setFormat(11)}>11 كاملة 🏟️ <span className="block text-[9px] font-bold opacity-70">11 مركز + مدرب</span></Chip>
              </div>
            </div>
          )}

          {caps.cards && (
            <div className="mb-3">
              <div className="text-[11px] font-black text-amber-200 mb-1.5 text-center">الكروت الخاصة (اختار كارت واحد بس أو عادي)</div>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { key: 'NONE', src: '', name: 'عادي', desc: 'من غير كروت' },
                  { key: 'LAST_BID', src: '/cards/auction-last-bid.png', name: 'لاست بيد', desc: 'مفيش مجاني' },
                  { key: 'WILD_CARD', src: '/cards/auction-wild-card.png', name: 'وايلد كارد', desc: 'بدّل لاعب' },
                  { key: 'NO_RISK', src: '/cards/auction-no-risk.png', name: 'خاطر وبدّل', desc: 'خاطر' }
                ] as const).map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => {
                      audioManager.playClick();
                      setAuctionCard(card.key);
                    }}
                    className={`rounded-xl border-2 p-1 text-center backdrop-blur-[2px] transition-all ${auctionCard === card.key ? 'border-amber-300 bg-amber-950/60 scale-[1.03]' : 'border-white/25 bg-black/35'}`}
                  >
                    <div className="relative h-14 overflow-hidden rounded-lg flex items-center justify-center">
                      {card.src ? <img src={card.src} alt={card.name} className="absolute inset-0 h-full w-full object-contain" draggable={false} /> : <span className="text-amber-300 text-lg font-black">∅</span>}
                    </div>
                    <div className="mt-0.5 text-[9px] font-black text-white leading-tight truncate">{card.name}</div>
                    <div className="text-[8px] text-zinc-200 leading-tight truncate">{card.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {caps.durations && (
            <div className="mb-3">
              <div className="text-[11px] font-black text-amber-200 mb-1.5">{caps.format ? (caps.cards ? '3)' : '2)') : '1)'} {caps.durationLabel}</div>
              <div className={`grid gap-1.5 ${caps.durations.length > 4 ? 'grid-cols-7' : 'grid-cols-4'}`}>
                {caps.durations.map((sec) => (
                  <Chip key={sec} active={duration === sec} onClick={() => setDuration(sec)}>{sec}</Chip>
                ))}
              </div>
            </div>
          )}

          <div className="mb-1">
            <div className="text-[11px] font-black text-amber-200 mb-1.5">تلعب مع مين؟</div>
            <div className="grid grid-cols-2 gap-2">
              {caps.opps.map((k, i) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pick(k)}
                  className={`flex items-center gap-2 rounded-2xl border border-white/25 bg-black/45 px-3 py-2.5 text-right active:scale-95 transition-transform ${
                    caps.opps.length % 2 === 1 && i === caps.opps.length - 1 ? 'col-span-2 justify-center' : ''
                  }`}
                >
                  <span className="text-2xl leading-none">{OPP_META[k].emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-black text-white leading-tight">{OPP_META[k].title}</span>
                    <span className="block text-[9px] text-white/60 leading-tight">{OPP_META[k].sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            {!codeOpen ? (
              <button onClick={() => setCodeOpen(true)} className="w-full rounded-full border border-sky-300/50 bg-sky-500/10 py-2 text-[12px] font-black text-sky-200 active:scale-95 transition-transform">
                🔑 عندي كود غرفة
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2" dir="ltr">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    placeholder="XXXXXX"
                    className="flex-1 rounded-xl bg-black/50 border border-white/20 px-3 py-2 text-center text-lg font-black tracking-[0.3em] text-white placeholder:text-white/25 focus:outline-none focus:border-sky-300"
                  />
                  <button
                    onClick={joinByCode}
                    disabled={code.length < 4 || codeBusy}
                    className="rounded-xl bg-gradient-to-l from-sky-500 to-cyan-400 px-4 text-sm font-black text-zinc-950 disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    {codeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ادخل'}
                  </button>
                </div>
                {codeErr && <div className="text-center text-[11px] font-black text-rose-300">{codeErr}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {showFriend && (
        <FriendRoomModal
          user={user}
          mode={{ kind: 'host', gameMode: gameId, gameLabelAr: titleAr, preset: setup() }}
          onClose={() => setShowFriend(false)}
          onStart={(opp, roomSettings) => {
            setShowFriend(false);
            onLaunch(roomSettings, opp, 'quick');
          }}
        />
      )}

      {showRandom && (
        <StartMatchModal
          user={user}
          gameMode={gameId}
          gameLabelAr={titleAr}
          onClose={() => setShowRandom(false)}
          onFriendRoom={() => {
            setShowRandom(false);
            setShowFriend(true);
          }}
          onPlayAi={() => {
            setShowRandom(false);
            onLaunch(setup('AI'), null, 'ai');
          }}
          onRealOpponentReady={(opp) => {
            setShowRandom(false);
            onLaunch(setup(), opp, 'quick');
          }}
        />
      )}
    </>
  );
};
