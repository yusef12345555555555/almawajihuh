// ============================================================
// المواجهة | غرفة اللعب مع الصحاب
//  المضيف:  اختيار (خماسي/11) + (بكروت/من غير) ← إنشاء الغرفة ← لينك + بحث عن صاحب
//  الضيف:   يشوف تفاصيل الغرفة ← «يلا نلعب» أو «فكك»
//  الاتنين: زر «أنا جاهز» + زر «اطلع» + عدّاد دقيقة. لو الخصم ماجهزش → الغرفة تتلغي.
//  لما الاتنين يجهزوا → الماتش يبدأ بنفس إعدادات صاحب الغرفة عند الاتنين.
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check, Share2, X, Loader2, LogOut, CheckCircle2, Users, Layers, Link2 } from 'lucide-react';
import { FriendUser, PlayerSnapshot, UserProfile } from '../types';
import { UnifiedPlayerPicker } from './UnifiedPlayerPicker';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';
import { SocialService } from '../services/socialService';
import { audioManager } from '../services/audioManager';
import { useOnlineStatus } from '../services/connectivity';
import {
  FriendRoom,
  FriendRoomService,
  RoomSettings,
  ROOM_READY_SECONDS,
  parseRoomRef,
  roomLink,
  setPendingRoomSettings
} from '../services/friendRoomService';

interface Props {
  user: UserProfile;
  /** host: إنشاء غرفة جديدة — guest: دخول غرفة موجودة */
  mode: { kind: 'host'; gameMode: string; gameLabelAr: string; /** إعدادات جاهزة من شاشة الاختيار: الغرفة بتتعمل على طول */ preset?: RoomSettings } | { kind: 'guest'; roomId: string };
  onClose: () => void;
  onStart: (opponent: PlayerSnapshot, settings: RoomSettings, gameMode: string) => void;
}

const toSnapshot = (u: UserProfile): PlayerSnapshot => ({
  playerId: u.playerId || '',
  id: u.id,
  name: u.username,
  nameAr: u.nameAr,
  avatar: u.avatar,
  rating: u.rating,
  equippedCosmetics: u.equippedCosmetics
});

const GAME_LABELS: Record<string, string> = {
  AUCTION: 'ساحة المزاد',
  DEAL_OR_NO_DEAL: 'ديل أور نو ديل',
  PLAYER_OR_HIDDEN: 'تاخد اللاعب ده ولا الخفي؟'
};

/** إيه الإعدادات اللي كل لعبة بتدعمها فعلاً */
const capsFor = (gameMode: string) => {
  const g = (gameMode || '').toUpperCase();
  if (g.includes('AUCTION')) return { format: true, cards: true };
  if (g === 'PLAYER_OR_HIDDEN') return { format: true, cards: false };
  return { format: false, cards: false };
};

type Phase = 'LOADING' | 'SETTINGS' | 'ROOM' | 'GUEST_INTRO' | 'ENDED';

export const FriendRoomModal: React.FC<Props> = ({ user, mode, onClose, onStart }) => {
  const online = useOnlineStatus();
  const [phase, setPhase] = useState<Phase>(mode.kind === 'host' && !mode.preset ? 'SETTINGS' : 'LOADING');
  const [settings, setSettings] = useState<RoomSettings>(mode.kind === 'host' && mode.preset ? mode.preset : { format: 5, cards: true });
  const [invited, setInvited] = useState<Record<string, boolean>>({});
  const autoCreatedRef = useRef(false);
  const [room, setRoom] = useState<FriendRoom | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [endedText, setEndedText] = useState('');
  const [friends] = useState<FriendUser[]>(() => SocialService.getFriends());
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null);
  const [linkPaste, setLinkPaste] = useState('');
  const unsubRef = useRef<() => void>(() => {});
  const startedRef = useRef(false);

  const role: 'host' | 'guest' = mode.kind === 'host' ? 'host' : 'guest';
  const me = useMemo(() => toSnapshot(user), [user]);
  const gameMode = room?.gameMode || (mode.kind === 'host' ? mode.gameMode : '');
  const gameLabel = mode.kind === 'host' ? mode.gameLabelAr : GAME_LABELS[gameMode] || 'المواجهة';
  const caps = capsFor(gameMode);

  useEffect(() => () => unsubRef.current(), []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const end = (text: string) => {
    unsubRef.current();
    setEndedText(text);
    setPhase('ENDED');
  };

  // الاشتراك في تحديثات الغرفة
  const watch = (id: string) => {
    unsubRef.current();
    unsubRef.current = FriendRoomService.subscribe(id, (r) => setRoom(r));
  };

  // الضيف: تحميل الغرفة
  useEffect(() => {
    if (mode.kind !== 'guest') return;
    let alive = true;
    (async () => {
      const r = await FriendRoomService.get(mode.roomId);
      if (!alive) return;
      if (!r || r.status === 'CANCELLED' || r.status === 'EXPIRED' || r.status === 'DECLINED' || r.expiresAt < Date.now()) {
        end('الغرفة دي اتلغت أو خلصت');
        return;
      }
      if (r.hostId === user.id) {
        end('دي غرفتك إنت — ابعت اللينك لصاحبك');
        return;
      }
      setRoom(r);
      setPhase('GUEST_INTRO');
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // رد فعل على تغيّر حالة الغرفة
  useEffect(() => {
    if (!room || phase === 'LOADING' || phase === 'SETTINGS' || phase === 'ENDED') return;
    if (room.status === 'CANCELLED' || room.status === 'DECLINED') {
      end(role === 'host' ? 'صاحبك طلع من الغرفة' : 'صاحب الغرفة لغاها');
      return;
    }
    if (room.status === 'EXPIRED') {
      end('الغرفة اتلغت');
      return;
    }
    if (room.hostReady && room.guestReady && room.guest && !startedRef.current) {
      // الاتنين جاهزين → نبدأ فوراً. (قبل كده كان فيه تايمر بيتلغي مع أي تحديث جديد من السيرفر فاللعبة مكانتش بتبدأ)
      startedRef.current = true;
      audioManager.playWhistle?.();
      const opp = role === 'host' ? room.guest : room.host;
      unsubRef.current();
      if (role === 'host') void FriendRoomService.setStatus(room.id, 'STARTED');
      setPendingRoomSettings(room.settings);
      onStart(opp, room.settings, room.gameMode);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, phase]);

  // انتهاء مدة التجهيز
  const secondsLeft = room ? Math.max(0, Math.ceil((room.expiresAt - now) / 1000)) : ROOM_READY_SECONDS;
  useEffect(() => {
    if (!room || (phase !== 'ROOM' && phase !== 'GUEST_INTRO')) return;
    if (secondsLeft <= 0 && !startedRef.current && !(room.hostReady && room.guestReady)) {
      if (role === 'host') void FriendRoomService.setStatus(room.id, 'EXPIRED');
      end(room.hostReady && room.guestReady ? 'تمام' : 'الغرفة اتلغت — الوقت خلص وصاحبك مجاش جاهز');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase, room]);

  const createRoom = async () => {
    if (!online || busy || mode.kind !== 'host') return;
    audioManager.playClick();
    setBusy(true);
    const r = await FriendRoomService.create(me, mode.gameMode, settings);
    setBusy(false);
    if (!r) {
      end('معرفناش نعمل الغرفة — اتأكد من النت وإن تحديث الداتابيز (UPDATE_V4_ROOMS.sql) اتشغّل');
      return;
    }
    setRoom(r);
    setPhase('ROOM');
    watch(r.id);
  };

  // إعدادات جاهزة (من شاشة الاختيار): نعمل الغرفة على طول من غير سؤال تاني
  useEffect(() => {
    if (mode.kind !== 'host' || !mode.preset || autoCreatedRef.current) return;
    autoCreatedRef.current = true;
    void (async () => {
      if (!online) {
        end('لازم نت عشان تعمل غرفة');
        return;
      }
      const r = await FriendRoomService.create(me, mode.gameMode, mode.preset as RoomSettings);
      if (!r) {
        end('معرفناش نعمل الغرفة — اتأكد من النت وإنك شغّلت UPDATE_V4_ROOMS.sql في Supabase');
        return;
      }
      setRoom(r);
      setPhase('ROOM');
      watch(r.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyCode = async () => {
    if (!room?.code) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const copyLink = async () => {
    if (!room) return;
    const link = roomLink(room.id);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const shareLink = async () => {
    if (!room) return;
    const link = roomLink(room.id);
    const text = `تعالى نلعب ${gameLabel} على المواجهة! ${settingsLabel(room.settings)}\n${link}`;
    try {
      if (navigator.share) await navigator.share({ text, title: 'غرفة المواجهة' });
      else await copyLink();
    } catch {
      /* cancelled */
    }
  };

  const invite = async (friend: FriendUser) => {
    if (!room || mode.kind !== 'host') return;
    await FriendRoomService.inviteFriend(room, me, friend.id, friend.playerId, mode.gameLabelAr);
    setInvited((m) => ({ ...m, [friend.id]: true }));
    setInviteSentTo(friend.nameAr || friend.username);
  };

  const guestJoin = async () => {
    if (!room || busy) return;
    audioManager.playClick();
    setBusy(true);
    const res = await FriendRoomService.join(room.id, me);
    setBusy(false);
    if (!res.ok || !res.room) {
      end(res.reason === 'FULL' ? 'الغرفة اتملت' : 'الغرفة دي اتلغت أو خلصت');
      return;
    }
    setRoom(res.room);
    setPhase('ROOM');
    watch(res.room.id);
  };

  const guestDecline = async () => {
    if (room) {
      // الدعوة المباشرة بس تتلغي؛ اللينك المفتوح يفضل متاح لحد ما المضيف يلغيه
      await FriendRoomService.setStatus(room.id, 'DECLINED');
    }
    onClose();
  };

  const myReady = room ? (role === 'host' ? room.hostReady : room.guestReady) : false;
  const otherReady = room ? (role === 'host' ? room.guestReady : room.hostReady) : false;
  const other = room ? (role === 'host' ? room.guest : room.host) : null;

  const toggleReady = async () => {
    if (!room || !room.guest) return;
    audioManager.playClick();
    const next = !myReady;
    setRoom((r) => (r ? { ...r, ...(role === 'host' ? { hostReady: next } : { guestReady: next }) } : r));
    await FriendRoomService.setReady(room.id, role, next);
    // نقرا الغرفة فوراً عشان لو صحبك كان جاهز قبلك نبدأ من غير ما نستنى الـ polling
    const fresh = await FriendRoomService.get(room.id);
    if (fresh) setRoom({ ...fresh, ...(role === 'host' ? { hostReady: next } : { guestReady: next }) });
  };

  const leave = async () => {
    audioManager.playClick();
    if (room) await FriendRoomService.setStatus(room.id, 'CANCELLED');
    onClose();
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const settingsLabel = (s: RoomSettings) => {
    const parts: string[] = [];
    if (caps.format) parts.push(s.format === 5 ? 'خماسي (5 لاعبين)' : '11 لاعب');
    if (caps.cards) parts.push(({ NONE: 'من غير كروت', LAST_BID: 'كارت لاست بيد', WILD_CARD: 'كارت وايلد كارد', NO_RISK: 'كارت خاطر وبدّل' } as Record<string, string>)[s.auctionCard || (s.cards ? 'WILD_CARD' : 'NONE')]);
    return parts.length ? parts.join(' • ') : 'نفس إعدادات اللعبة العادية';
  };

  const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`flex-1 rounded-2xl py-3 text-sm font-black border transition-all active:scale-95 ${
        active ? 'bg-gradient-to-l from-amber-400 to-yellow-300 text-zinc-950 border-amber-200 shadow-[0_0_16px_rgba(251,191,36,.5)]' : 'bg-black/40 text-white/85 border-white/20'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div dir="rtl" className="fixed inset-0 z-[450] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 shadow-[0_24px_70px_rgba(0,0,0,.7)]">
        <div className="relative px-4 py-4">
          <button onClick={onClose} className="absolute top-4 left-4 p-1.5 rounded-full bg-black/40 text-white/80 hover:text-white z-10">
            <X className="w-4 h-4" />
          </button>

          {phase === 'LOADING' && (
            <div className="py-12 text-center text-white/80">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
              <div className="text-sm font-black">بنفتح الغرفة...</div>
            </div>
          )}

          {phase === 'SETTINGS' && mode.kind === 'host' && (
            <div className="space-y-3.5">
              <div className="text-center">
                <h2 className="text-lg font-black text-amber-300">العب مع صحبك</h2>
                <p className="text-[11px] text-white/70">{mode.gameLabelAr}</p>
              </div>
              {!online && <div className="rounded-xl bg-amber-500/15 border border-amber-400/30 px-3 py-2 text-[11px] font-bold text-amber-200">لازم نت عشان تعمل غرفة</div>}

              {!caps.format && !caps.cards && (
                <div className="rounded-xl bg-black/35 border border-white/15 px-3 py-2 text-[11px] font-bold text-white/80 text-center">
                  اللعبة دي ليها نظام واحد ثابت — اعمل الغرفة وابعت اللينك لصحبك
                </div>
              )}

              {caps.format && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black text-white/80 mb-1.5">
                  <Users className="w-3.5 h-3.5" /> نظام التشكيلة
                </div>
                <div className="flex gap-2">
                  <Chip active={settings.format === 5} onClick={() => setSettings({ ...settings, format: 5 })}>
                    خماسي ⚽
                  </Chip>
                  <Chip active={settings.format === 11} onClick={() => setSettings({ ...settings, format: 11 })}>
                    11 لاعب 🏟️
                  </Chip>
                </div>
              </div>
              )}

              {caps.cards && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black text-white/80 mb-1.5">
                  <Layers className="w-3.5 h-3.5" /> الكروت (لاست بيد • وايلد كارد • خاطر وبدّل)
                </div>
                <div className="flex gap-2">
                  <Chip active={settings.cards} onClick={() => setSettings({ ...settings, cards: true })}>
                    بالكروت 🃏
                  </Chip>
                  <Chip active={!settings.cards} onClick={() => setSettings({ ...settings, cards: false })}>
                    من غير كروت
                  </Chip>
                </div>
              </div>
              )}

              <button
                onClick={createRoom}
                disabled={!online || busy}
                className="w-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400 py-3 text-sm font-black text-zinc-950 disabled:opacity-40 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                العب مع صحبك
              </button>
            </div>
          )}

          {phase === 'GUEST_INTRO' && room && (
            <div className="space-y-3.5 text-center">
              <div className="flex justify-center">
                <PlayerAvatarBadge avatar={room.host.avatar} size="lg" equipped={room.host.equippedCosmetics} />
              </div>
              <div>
                <div className="text-sm font-black text-white">{room.host.nameAr || room.host.name}</div>
                <div className="text-[11px] text-amber-300 font-bold">عايز يلعب معاك {GAME_LABELS[room.gameMode] || ''}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-black/35 p-3 text-right space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">اللعبة</span>
                  <span className="font-black text-white">{GAME_LABELS[room.gameMode] || 'المواجهة'}</span>
                </div>
                {caps.format && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">النظام</span>
                    <span className="font-black text-white">{room.settings.format === 5 ? 'خماسي' : '11 لاعب'}</span>
                  </div>
                )}
                {caps.cards && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">الكروت</span>
                    <span className="font-black text-white">{({ NONE: 'من غير كروت', LAST_BID: 'لاست بيد', WILD_CARD: 'وايلد كارد', NO_RISK: 'خاطر وبدّل' } as Record<string, string>)[room.settings.auctionCard || (room.settings.cards ? 'WILD_CARD' : 'NONE')]}</span>
                  </div>
                )}
              </div>
              <div className="text-[11px] font-black text-white/70 tabular-nums">الغرفة هتتلغي بعد {fmtTime(secondsLeft)}</div>
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={guestJoin} disabled={busy} className="rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-400 py-3 text-sm font-black text-zinc-950 active:scale-95 transition-transform disabled:opacity-50">
                  {busy ? '...' : 'يلا نلعب'}
                </button>
                <button onClick={guestDecline} className="rounded-2xl border border-zinc-600 bg-zinc-900 py-3 text-sm font-black text-zinc-200 active:scale-95 transition-transform">
                  فكك
                </button>
              </div>
            </div>
          )}

          {phase === 'ROOM' && room && (
            <div className="space-y-3.5">
              <div className="text-center">
                <h2 className="text-base font-black text-amber-300">غرفة {gameLabel}</h2>
                <p className="text-[11px] text-white/70">{settingsLabel(room.settings)}</p>
              </div>

              {/* اللاعبين */}
              <div className="flex items-center justify-center gap-4">
                <div className="text-center w-24">
                  <div className="relative flex justify-center">
                    <PlayerAvatarBadge avatar={user.avatar} size="lg" equipped={user.equippedCosmetics} />
                    {myReady && <CheckCircle2 className="absolute -bottom-1 right-3 w-6 h-6 text-emerald-400 bg-zinc-950 rounded-full" />}
                  </div>
                  <div className="mt-1.5 text-[11px] font-black text-white truncate">{user.nameAr || user.username}</div>
                  <div className={`text-[10px] font-black ${myReady ? 'text-emerald-300' : 'text-white/50'}`}>{myReady ? 'جاهز ✅' : 'مش جاهز'}</div>
                </div>
                <span className="text-lg font-black text-amber-300">VS</span>
                <div className="text-center w-24">
                  {other ? (
                    <>
                      <div className="relative flex justify-center">
                        <PlayerAvatarBadge avatar={other.avatar} size="lg" equipped={other.equippedCosmetics} />
                        {otherReady && <CheckCircle2 className="absolute -bottom-1 right-3 w-6 h-6 text-emerald-400 bg-zinc-950 rounded-full" />}
                      </div>
                      <div className="mt-1.5 text-[11px] font-black text-white truncate">{other.nameAr || other.name}</div>
                      <div className={`text-[10px] font-black ${otherReady ? 'text-emerald-300' : 'text-white/50'}`}>{otherReady ? 'جاهز ✅' : 'مش جاهز'}</div>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto h-16 w-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                      </div>
                      <div className="mt-1.5 text-[11px] font-black text-white/70">مستنيين صحبك</div>
                    </>
                  )}
                </div>
              </div>

              {/* العدّاد */}
              <div className="rounded-2xl border border-white/15 bg-black/35 px-3 py-2 text-center">
                <div className={`text-2xl font-black tabular-nums ${secondsLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-white'}`} dir="ltr">
                  {fmtTime(secondsLeft)}
                </div>
                <div className="text-[11px] font-bold text-white/70">
                  {other ? (otherReady ? 'صحبك جاهز — اضغط جاهز عشان نبدأ' : 'مستنيين صحبك يجهز.. الغرفة هتتلغي لما العداد يخلص') : 'مستنيين صحبك يدخل.. الغرفة هتتلغي لما العداد يخلص'}
                </div>
              </div>

              {/* لينك الغرفة + بحث (للمضيف قبل ما الضيف يدخل) */}
              {role === 'host' && !room.guest && (
                <div className="space-y-2.5">
                  {room.code && (
                    <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-2.5 text-center">
                      <div className="text-[10px] font-black text-amber-200 mb-0.5">كود الغرفة</div>
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-3xl font-black tracking-[0.3em] text-white tabular-nums" dir="ltr">{room.code}</div>
                        <button onClick={copyCode} className="rounded-lg bg-white/10 p-2 text-white active:scale-90 transition-transform" aria-label="نسخ الكود">
                          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="text-[10px] text-white/60 mt-0.5">صحبك يكتب الكود ده في «عندي كود غرفة»</div>
                    </div>
                  )}

                  {friends.length > 0 && (
                    <div className="rounded-2xl border border-white/15 bg-black/35 p-2.5">
                      <div className="text-[10px] font-black text-white/70 mb-1.5">اختار من صحابك وابعتله دعوة</div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5">
                        {friends.map((f) => (
                          <div key={f.id} className="flex items-center gap-2 rounded-xl bg-black/30 px-2 py-1.5">
                            <PlayerAvatarBadge avatar={f.avatar} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-black text-white truncate">{f.nameAr || f.username}</div>
                              <div className="text-[9px] font-mono text-white/50">{f.playerId}</div>
                            </div>
                            <button
                              onClick={() => invite(f)}
                              disabled={!!invited[f.id]}
                              className={`rounded-full px-3 py-1.5 text-[11px] font-black active:scale-95 transition-transform ${invited[f.id] ? 'bg-zinc-700 text-zinc-300' : 'bg-gradient-to-l from-emerald-500 to-teal-400 text-zinc-950'}`}
                            >
                              {invited[f.id] ? 'اتبعتت ✅' : 'ادعُ'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/15 bg-black/35 p-2.5">
                    <div className="text-[10px] font-black text-white/60 mb-1">لينك الغرفة</div>
                    <div className="flex items-center gap-2" dir="ltr">
                      <div className="flex-1 truncate rounded-lg bg-black/50 px-2 py-1.5 text-[10px] font-mono text-emerald-200">{roomLink(room.id)}</div>
                      <button onClick={copyLink} className="rounded-lg bg-white/10 p-2 text-white active:scale-90 transition-transform" aria-label="نسخ اللينك">
                        {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <button onClick={shareLink} className="mt-2 w-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 py-2 text-xs font-black text-white flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                      <Share2 className="w-3.5 h-3.5" /> ابعت اللينك لصحبك
                    </button>
                  </div>

                  <UnifiedPlayerPicker
                    userId={user.id}
                    friends={friends}
                    label="أو ابعتله دعوة (اسم / لقب / ID)"
                    placeholder="ELM12 أو اسم صحبك"
                    compact
                    onSelect={(player) => {
                      const friend = friends.find((f) => f.id === player.id) || ({ id: player.id, playerId: player.playerId, username: player.name, nameAr: player.nameAr, avatar: player.avatar } as FriendUser);
                      void invite(friend);
                    }}
                  />
                  {inviteSentTo && <div className="text-center text-[11px] font-black text-emerald-300">بعتنا الدعوة لـ {inviteSentTo} ✅</div>}
                </div>
              )}

              {/* لو الضيف عنده لينك لصقه */}
              {role === 'guest' && null}

              {room.guest && (
                <button
                  onClick={toggleReady}
                  className={`w-full rounded-full py-3 text-sm font-black active:scale-95 transition-all ${
                    myReady ? 'bg-zinc-800 text-zinc-200 border border-zinc-600' : 'bg-gradient-to-l from-emerald-500 to-teal-400 text-zinc-950 shadow-[0_0_20px_rgba(52,211,153,.45)]'
                  }`}
                >
                  {myReady ? 'مستنيين صحبك.. (اضغط للإلغاء)' : 'أنا جاهز ✅'}
                </button>
              )}

              <button onClick={leave} className="w-full rounded-full border border-rose-500/50 bg-rose-500/10 py-2.5 text-xs font-black text-rose-300 flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                <LogOut className="w-4 h-4" /> اطلع
              </button>
            </div>
          )}

          {phase === 'ENDED' && (
            <div className="py-8 text-center space-y-4">
              <div className="text-4xl">🚪</div>
              <div className="text-sm font-black text-white leading-relaxed px-2">{endedText}</div>
              <button onClick={onClose} className="rounded-full bg-white/10 border border-white/20 px-8 py-2.5 text-xs font-black text-white active:scale-95 transition-transform">
                تمام
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { parseRoomRef };
