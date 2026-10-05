// المواجهة | Service Worker — بيعرض إشعارات النظام الحقيقية (حتى لو التبويب في الخلفية) ويفتح الغرفة/الصفحة عند الضغط.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  // جاهز لـ Web Push لو اتفعّل من السيرفر لاحقاً
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_) {}
  const title = d.title || 'المواجهة';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: '/brand/icon-192.png',
    badge: '/brand/icon-192.png',
    data: d.data || {},
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length) {
      const c = all[0];
      try { await c.focus(); } catch (_) {}
      c.postMessage({ type: 'mw-notification-click', data });
      return;
    }
    const room = data.roomId || data.matchInviteId;
    await self.clients.openWindow(room ? '/?room=' + encodeURIComponent(room) : '/');
  })());
});
