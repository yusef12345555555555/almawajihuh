// ============================================================
// المواجهة | جسر الإشعارات الفعلية
//  - بيشترك لحظياً في إشعارات اللاعب (في أي شاشة) ويطلّع إشعار نظام حقيقي لما التطبيق في الخلفية.
//  - ضغطة على إشعار النظام: دعوة غرفة → شاشة الجاهزية، غير كده → صفحة الإشعارات.
// ============================================================

import { useEffect } from 'react';
import { NotificationService } from '../services/notificationService';
import { fireNativeNotification, registerServiceWorker } from '../services/notificationPermissions';
import { openRoomInApp, roomIdFromNotificationData } from '../services/friendRoomService';

export const NativeNotificationBridge: React.FC<{ userId: string; onOpenNotifications: () => void }> = ({ userId, onOpenNotifications }) => {
  useEffect(() => {
    registerServiceWorker();
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== 'mw-notification-click') return;
      const room = roomIdFromNotificationData(e.data.data);
      if (room) openRoomInApp(room);
      else onOpenNotifications();
    };
    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsub = NotificationService.subscribe(userId, (n) => {
      // التطبيق قدامك → البانر الداخلي كفاية. في الخلفية/مقفول التبويب → إشعار نظام
      const hidden = document.visibilityState === 'hidden' || !document.hasFocus();
      if (!hidden) return;
      fireNativeNotification(
        n.title,
        n.body,
        () => {
          const room = roomIdFromNotificationData(n.data);
          if (room) openRoomInApp(room);
          else onOpenNotifications();
        },
        (n.data || {}) as Record<string, unknown>
      );
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
};
