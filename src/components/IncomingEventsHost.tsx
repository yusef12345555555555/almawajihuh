// ============================================================
// المواجهة | بانر الطلبات الواردة اللحظي (داخل التطبيق)
// - طلب صداقة:  أشطا (قبول)  /  فكك (رفض)
// - دعوة مباراة/انتقام: ماشي يلا  /  لا فكك
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Swords, UserPlus } from 'lucide-react';
import { FriendRequest, MatchInvite, UserProfile } from '../types';
import { SocialService } from '../services/socialService';
import { MatchmakingService } from '../services/matchmakingService';
import { audioManager } from '../services/audioManager';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';
import { launchGameWithOpponent } from './PostMatchActions';
import { NotificationService } from '../services/notificationService';
import { FriendRoomService, openRoomInApp, roomIdFromNotificationData } from '../services/friendRoomService';

type Item =
  | { kind: 'friend'; key: string; req: FriendRequest }
  | { kind: 'invite'; key: string; invite: MatchInvite }
  | { kind: 'room'; key: string; roomId: string; title: string; body: string };

export const IncomingEventsHost: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [queue, setQueue] = useState<Item[]>([]);
  const seen = useRef<Set<string>>(new Set());

  const push = (it: Item) => {
    if (seen.current.has(it.key)) return;
    seen.current.add(it.key);
    setQueue((q) => [...q, it]);
    try {
      audioManager.playClick();
    } catch {
      /* ignore */
    }
  };

  // الطلبات القديمة المعلّقة وقت الفتح لا تظهر كبانر (تظهر في الإشعارات) — فقط الجديدة اللحظية.
  useEffect(() => {
    SocialService.getRequests().forEach((r) => seen.current.add(`f_${r.id}`));
    const unsubSocial = SocialService.subscribe(() => {
      SocialService.getRequests()
        .filter((r) => r.direction === 'INCOMING' && r.status === 'PENDING')
        .forEach((req) => push({ kind: 'friend', key: `f_${req.id}`, req }));
    });
    const unsubInvites = user.id
      ? MatchmakingService.subscribeToIncomingInvites(user.id, (invite) => push({ kind: 'invite', key: `i_${invite.id}`, invite }))
      : () => {};
    // دعوات الغرف (يلا نلعب / فكك) بتوصل كإشعار لحظي — بتظهر كبانر هنا وبتتسجل في صفحة الإشعارات
    const unsubNotifs = user.id
      ? NotificationService.subscribe(user.id, (n) => {
          const roomId = roomIdFromNotificationData(n.data);
          if (n.type === 'GAME_INVITE' && roomId) push({ kind: 'room', key: `r_${roomId}_${n.id}`, roomId: String(roomId), title: n.title, body: n.body });
        })
      : () => {};
    return () => {
      unsubSocial();
      unsubInvites();
      unsubNotifs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // اختفاء تلقائي بعد 25 ثانية
  useEffect(() => {
    if (!queue.length) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 25000);
    return () => clearTimeout(t);
  }, [queue]);

  const current = queue[0];
  if (!current) return null;
  const done = () => setQueue((q) => q.slice(1));

  const isFriend = current.kind === 'friend';
  const isRoom = current.kind === 'room';
  const name = current.kind === 'friend' ? current.req.senderName : current.kind === 'invite' ? current.invite.senderSnapshot.nameAr || current.invite.senderSnapshot.name : current.title;
  const avatar = current.kind === 'friend' ? current.req.senderAvatar : current.kind === 'invite' ? current.invite.senderSnapshot.avatar : '';

  const accept = async () => {
    if (current.kind === 'room') {
      openRoomInApp(current.roomId);
    } else if (current.kind === 'friend') {
      SocialService.acceptFriendRequest(current.req.id);
    } else {
      await MatchmakingService.respondToInvite(current.invite.id, true);
      launchGameWithOpponent(current.invite.gameMode, current.invite.senderSnapshot);
    }
    done();
  };
  const decline = async () => {
    if (current.kind === 'room') await FriendRoomService.setStatus(current.roomId, 'DECLINED');
    else if (current.kind === 'friend') SocialService.rejectFriendRequest(current.req.id);
    else await MatchmakingService.respondToInvite(current.invite.id, false);
    done();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-x-0 top-0 z-[400] flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+8px)] pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-amber-400/50 bg-zinc-950/95 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,.7)] p-3 animate-in slide-in-from-top-6 duration-300">
        <div className="flex items-center gap-2.5">
          {isRoom ? <div className="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center text-xl">⚔️</div> : <PlayerAvatarBadge avatar={avatar} size="md" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300">
              {isFriend ? <UserPlus className="w-3.5 h-3.5" /> : <Swords className="w-3.5 h-3.5" />}
              {isFriend ? 'طلب صداقة جديد' : isRoom ? 'دعوة للعب' : 'تحدّي جديد'}
            </div>
            <div className="text-sm font-black text-white truncate">{name}</div>
            <div className="text-[10px] text-zinc-400">{isFriend ? 'عايز يبقى صاحبك' : current.kind === 'room' ? current.body : 'عايز يلعبك ماتش تاني'}</div>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button onClick={() => void accept()} className="rounded-xl bg-gradient-to-l from-emerald-500 to-teal-400 py-2 text-xs font-black text-zinc-950 active:scale-95 transition-transform">
            {isFriend ? 'أشطا' : isRoom ? 'يلا نلعب' : 'ماشي يلا'}
          </button>
          <button onClick={() => void decline()} className="rounded-xl border border-zinc-600 bg-zinc-900 py-2 text-xs font-black text-zinc-200 active:scale-95 transition-transform">
            {isFriend ? 'فكك' : isRoom ? 'فكك' : 'لا فكك'}
          </button>
        </div>
      </div>
    </div>
  );
};
