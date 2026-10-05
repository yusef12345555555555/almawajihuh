// ============================================================
// المواجهة | صفحة الإشعارات
// نفس الإشعارات اللي بتظهر في الجرس/البانر بتتجمع هنا. دعوات الغرف عليها «يلا نلعب» و«فكك».
// ============================================================

import React, { useEffect, useState } from 'react';
import { ArrowRight, Bell, CheckCheck, Settings2, Swords, Users, Trophy, Megaphone, UserCog } from 'lucide-react';
import { AppNotification, NotificationType, UserProfile } from '../types';
import { NotificationService } from '../services/notificationService';
import { openRoomInApp, FriendRoomService, roomIdFromNotificationData } from '../services/friendRoomService';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { useBackHandler } from '../services/backHandler';

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  MATCH_RESULT: Swords,
  OPPONENT_FOUND: Users,
  FRIEND_REQUEST: Users,
  FRIEND_ACCEPTED: Users,
  GAME_INVITE: Swords,
  TOURNAMENT_UPDATE: Trophy,
  COACH_EVENT: UserCog,
  SYSTEM_UPDATE: Bell,
  ANNOUNCEMENT: Megaphone,
  ADMIN: Megaphone
};

function timeAgoAr(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

export const NotificationsView: React.FC<{ user: UserProfile; onBack: () => void; onNavigate: (screen: string) => void }> = ({ user, onBack, onNavigate }) => {
  useBackHandler(true, onBack);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [handled, setHandled] = useState<Record<string, 'accepted' | 'declined'>>({});

  useEffect(() => {
    let alive = true;
    NotificationService.fetchForUser(user.id, 100).then((list) => {
      if (!alive) return;
      setItems(list);
      setLoading(false);
    });
    const unsub = NotificationService.subscribe(user.id, (n) => setItems((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, 100))));
    return () => {
      alive = false;
      unsub();
    };
  }, [user.id]);

  const markRead = async (n: AppNotification) => {
    if (n.isRead) return;
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
    await NotificationService.markAsRead(n.id, user.id);
  };

  const open = async (n: AppNotification) => {
    await markRead(n);
    const d = n.data as Record<string, any>;
    if (roomIdFromNotificationData(d)) {
      // دعوة لعب: الضغط على الإشعار يفتح شاشة الجاهزية على طول
      openRoomInApp(roomIdFromNotificationData(d) as string);
      return;
    }
    if (d?.screen && d.screen !== 'notifications') onNavigate(String(d.screen));
  };

  const accept = async (n: AppNotification) => {
    await markRead(n);
    setHandled((h) => ({ ...h, [n.id]: 'accepted' }));
    openRoomInApp(roomIdFromNotificationData(n.data) as string);
  };

  const decline = async (n: AppNotification) => {
    await markRead(n);
    setHandled((h) => ({ ...h, [n.id]: 'declined' }));
    await FriendRoomService.setStatus(roomIdFromNotificationData(n.data) as string, 'DECLINED');
  };

  const markAll = async () => {
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    await NotificationService.markAllAsRead(user.id);
  };

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div dir="rtl" className="min-h-full w-full max-w-md mx-auto px-3 pt-3 pb-24">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] font-black text-white bg-black/45 border border-white/15 rounded-full px-3 py-1.5">
          <ArrowRight className="w-3.5 h-3.5" /> رجوع
        </button>
        <h1 className="text-base font-black text-white flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-amber-300" /> الإشعارات {unread > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10px]">{unread}</span>}
        </h1>
        <div className="flex gap-1">
          {unread > 0 && (
            <button onClick={markAll} className="p-1.5 rounded-lg bg-black/40 text-zinc-300" aria-label="تحديد الكل كمقروء">
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg bg-black/40 text-zinc-300" aria-label="إعدادات الإشعارات">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && <div className="p-8 text-center text-xs text-zinc-400">بنجيب إشعاراتك...</div>}
      {!loading && items.length === 0 && (
        <div className="p-10 text-center">
          <Bell className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-400 font-bold">مفيش إشعارات لسه</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((n) => {
          const Icon = TYPE_ICON[n.type] || Bell;
          const d = n.data as Record<string, any>;
          const isRoom = n.type === 'GAME_INVITE' && !!roomIdFromNotificationData(d);
          const state = handled[n.id];
          return (
            <div key={n.id} className={`rounded-2xl border p-3 ${!n.isRead ? 'border-amber-400/40 bg-amber-500/[0.07]' : 'border-white/10 bg-zinc-900/70'}`}>
              <button onClick={() => open(n)} className="w-full text-right flex items-start gap-3">
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${!n.isRead ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-800 text-zinc-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-black truncate ${!n.isRead ? 'text-white' : 'text-zinc-300'}`}>{n.title}</span>
                    {!n.isRead && <span className="shrink-0 w-2 h-2 rounded-full bg-amber-400" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{n.body}</p>
                  <span className="text-[10px] text-zinc-500 font-bold mt-1 block">{timeAgoAr(n.createdAt)}</span>
                </div>
              </button>
              {isRoom && (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {state ? (
                    <div className="col-span-2 text-center text-[11px] font-black text-zinc-400">{state === 'accepted' ? 'دخلت الغرفة' : 'رفضت الدعوة'}</div>
                  ) : (
                    <>
                      <button onClick={() => accept(n)} className="rounded-xl bg-gradient-to-l from-emerald-500 to-teal-400 py-2 text-xs font-black text-zinc-950 active:scale-95 transition-transform">
                        يلا نلعب
                      </button>
                      <button onClick={() => decline(n)} className="rounded-xl border border-zinc-600 bg-zinc-900 py-2 text-xs font-black text-zinc-200 active:scale-95 transition-transform">
                        فكك
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showSettings && <NotificationSettingsModal user={user} onClose={() => setShowSettings(false)} />}
    </div>
  );
};
