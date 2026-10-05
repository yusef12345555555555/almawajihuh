// ============================================================
// المواجهة | AL MWAJHA — Notification Bell + Center
//
// Icon-only control (per project convention — see ThemeToggle).
// Loads recent notifications, subscribes to Supabase Realtime for
// live inserts (no page refresh needed), shows an unread badge,
// and supports mark-as-read / mark-all-as-read + deep links.
// ============================================================

import { useBackHandler } from '../services/backHandler';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, CheckCheck, Settings2, Trophy, Users, Swords,
  Award, Megaphone, UserCog, X
} from 'lucide-react';
import { AppNotification, NotificationType, UserProfile } from '../types';
import { NotificationService } from '../services/notificationService';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { openRoomInApp, roomIdFromNotificationData } from '../services/friendRoomService';

interface NotificationBellProps {
  user: UserProfile;
  onNavigate?: (screen: string) => void;
}

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
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ user, onNavigate }) => {
  const [open, setOpen] = useState(false);
  useBackHandler(open, () => setOpen(false));
  const [showSettings, setShowSettings] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.isRead).length;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    NotificationService.fetchForUser(user.id).then((list) => {
      if (mounted) {
        setItems(list);
        setLoading(false);
      }
    });

    // Realtime: brand-new notifications appear instantly, no refresh.
    const unsubscribe = NotificationService.subscribe(user.id, (n) => {
      setItems((prev) => [n, ...prev].slice(0, 50));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user.id]);

  useEffect(() => {
    if (!open) return;
    // اللوحة بتتعرض في body (Portal) فلازم نتأكد إن الضغط مش جوّاها ولا على الجرس.
    const handleClick = (e: Event) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || sheetRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open]);

  const handleOpenNotification = async (n: AppNotification) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
      await NotificationService.markAsRead(n.id, user.id);
    }
    if (n.data?.screen && onNavigate) {
      onNavigate(n.data.screen as string);
      setOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    await NotificationService.markAllAsRead(user.id);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        id="notification_bell_btn"
        onClick={() => (onNavigate ? onNavigate('notifications') : setOpen((v) => !v))}
        aria-label="الإشعارات"
        title="الإشعارات"
        className="relative p-1.5 sm:p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-300 hover:border-amber-500/40 transition-colors cursor-pointer"
      >
        <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black shadow-[0_0_6px_rgba(244,63,94,0.6)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[300]" dir="rtl">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div
              ref={sheetRef}
              className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+58px)] max-h-[calc(100dvh-env(safe-area-inset-top)-80px)] sm:inset-x-auto sm:left-6 sm:w-[380px] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
            >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80">
            <span className="text-sm font-black text-white">الإشعارات</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="تحديد الكل كمقروء"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                title="إعدادات الإشعارات"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 transition-colors"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && <div className="p-6 text-center text-xs text-zinc-500">بنجيب إشعاراتك...</div>}

            {!loading && items.length === 0 && (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500 font-bold">مفيش إشعارات لسه</p>
              </div>
            )}

            {items.map((n) => {
              const Icon = TYPE_ICON[n.type] || Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => handleOpenNotification(n)}
                  className={`w-full text-right flex items-start gap-3 px-4 py-3 border-b border-zinc-900 transition-colors hover:bg-zinc-900/60 ${
                    !n.isRead ? 'bg-amber-500/[0.04]' : ''
                  }`}
                >
                  <div
                    className={`shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center ${
                      !n.isRead ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-black truncate ${!n.isRead ? 'text-white' : 'text-zinc-400'}`}>
                        {n.title}
                      </span>
                      {!n.isRead && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                    <span className="text-[10px] text-zinc-600 font-bold mt-1 block">{timeAgoAr(n.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
            </div>
          </div>,
          document.body
        )}
      {showSettings && <NotificationSettingsModal user={user} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

// Re-exported so other flows (friend requests, matchmaking, coach mode,
// admin) can fire real notifications through one entry point.
export { NotificationService };
export type { AppNotification, NotificationType };
