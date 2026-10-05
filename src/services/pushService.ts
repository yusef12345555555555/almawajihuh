// ============================================================
// المواجهة | الإشعارات الفورية (حتى والتطبيق مقفول)
//
// - على أندرويد: بنسجّل الجهاز في FCM ونحفظ التوكن في Supabase (device_tokens).
//   أي طلب صداقة/رسالة/دعوة بيوصل لجدول notifications → دالة send-push ترسله لجهاز اللاعب فوراً.
// - والتطبيق مفتوح/في الخلفية: إشعار محلي فوري (LocalNotifications) بدل Notification API
//   اللي مش بتشتغل في WebView.
// - لو Firebase (google-services.json) مش مضاف: كل ده بيتجاهل بهدوء والتطبيق شغال عادي.
// ============================================================

import { Capacitor } from '@capacitor/core';
import { getSupabaseClient } from './supabaseClient';
import { getDeviceSecret } from './playerRegistration';

const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

let initialised = false;

/** يطلب الإذن ويسجّل الجهاز. استدعيه بعد تسجيل اللاعب. */
let lastOnOpen: ((data: Record<string, string>) => void) | undefined;

/** حالة إذن الإشعارات: 'granted' | 'denied' | 'prompt' — على الويب بنقرا Notification.permission */
export async function notificationPermissionState(): Promise<'granted' | 'denied' | 'prompt'> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const r = await LocalNotifications.checkPermissions();
      if (r.display === 'granted') return 'granted';
      if (r.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission === 'default' ? 'prompt' : (Notification.permission as 'granted' | 'denied');
}

/** بيطلب إذن الإشعارات الفعلي (أندرويد/ويب) ويسجّل الجهاز للإشعارات الخارجية — بيتنده من شاشة «اسمح بالإشعارات». */
export async function askNotificationPermissionAndRegister(playerRowId: string): Promise<boolean> {
  let ok = false;
  if (isNative()) {
    await initPush(playerRowId, lastOnOpen, true);
    ok = (await notificationPermissionState()) === 'granted';
  } else if (typeof Notification !== 'undefined') {
    try {
      ok = (await Notification.requestPermission()) === 'granted';
    } catch {
      ok = false;
    }
  }
  return ok;
}

export async function initPush(playerRowId: string, onOpen?: (data: Record<string, string>) => void, ask = false): Promise<void> {
  if (onOpen) lastOnOpen = onOpen;
  if (!isNative() || initialised || !playerRowId) return;
  try {
    if (!ask && (await notificationPermissionState()) !== 'granted') return; // لسه ماسمحش — هنستنى شاشة الطلب
    initialised = true;
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    try {
      if (ask) await LocalNotifications.requestPermissions();
    } catch {
      /* ignore */
    }
    const perm = ask ? await PushNotifications.requestPermissions() : await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      initialised = false;
      return;
    }

    await PushNotifications.addListener('registration', async (token) => {
      const client = getSupabaseClient();
      if (!client) return;
      try {
        await client.rpc('mw_register_device_token', {
          p_secret: getDeviceSecret(),
          p_id: playerRowId,
          p_token: token.value,
          p_platform: 'android'
        });
      } catch {
        /* ignore */
      }
    });
    await PushNotifications.addListener('registrationError', () => {
      /* google-services.json غير مضاف — الإشعارات الخارجية معطّلة فقط */
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
      onOpen?.((a.notification.data || {}) as Record<string, string>);
    });
    await PushNotifications.register();
  } catch {
    /* never block the app */
  }
}

/** إشعار محلي فوري (التطبيق مفتوح أو في الخلفية). */
export async function showLocalNotification(title: string, body: string): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [{ id: Math.floor(Date.now() % 2147483000), title, body, smallIcon: 'ic_stat_icon_config_sample' }]
    });
  } catch {
    /* ignore */
  }
}
