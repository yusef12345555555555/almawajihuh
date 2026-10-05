// ============================================================
// Native (OS-level) notification permission + delivery.
// Wrapped as an APK, requesting this maps to Android's real runtime
// notification permission — this is the "يظهرلي رسالة إنه تسمح بالإشعارات"
// prompt the very first time the app opens.
// ============================================================

const ASKED_KEY = 'el3bha_notif_permission_asked_v1';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : 'denied';
}

/**
 * Shows the OS "Allow notifications?" prompt once per install. Safe to call
 * on every app boot — it only actually asks the very first time; after
 * that it just reads whatever the person already decided.
 */
export async function requestNotificationPermissionOnce(): Promise<void> {
  if (!notificationsSupported()) return;
  let askedBefore = false;
  try {
    askedBefore = localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    /* ignore */
  }
  if (askedBefore || Notification.permission !== 'default') return;
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    /* ignore */
  }
  try {
    await Notification.requestPermission();
  } catch {
    /* ignore — not fatal, the in-app bell still works either way */
  }
}

/**
 * Fires a real OS notification for something that just happened in-app
 * (a friend invite, a friend request, a tournament update...). No-op if
 * permission was never granted — the in-app bell still shows it either way.
 */
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // الـ SW بيشتغل على https أو localhost فقط
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}

export function fireNativeNotification(title: string, body: string, onClick?: () => void, data?: Record<string, unknown>): void {
  // أندرويد (Capacitor): إشعار الجهاز الحقيقي
  void import('./pushService').then((m) => m.showLocalNotification(title, body)).catch(() => undefined);
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const tag = `mw-${Date.now()}`;
  // الأفضل عبر الـ Service Worker (بيشتغل على موبايل وفي الخلفية)؛ new Notification مش مدعوم على أندرويد كروم
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, { body, icon: '/brand/icon-192.png', badge: '/brand/icon-192.png', tag, data: data || {} }))
      .catch(() => fallback());
    return;
  }
  fallback();
  function fallback() {
    try {
      const n = new Notification(title, { body, icon: '/brand/icon-192.png', badge: '/brand/icon-192.png', tag });
      if (onClick) {
        n.onclick = () => {
          window.focus();
          onClick();
          n.close();
        };
      }
    } catch {
      /* never let a notification failure affect the app */
    }
  }
}
