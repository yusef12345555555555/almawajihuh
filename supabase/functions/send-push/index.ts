// Supabase Edge Function: send-push
// تُستدعى من Database Webhook عند كل INSERT في جدول public.notifications
// وترسل إشعار FCM لكل أجهزة اللاعب المستلم — فوراً، حتى لو التطبيق مقفول.
//
// الإعداد (مرة واحدة):
//   1) Firebase Console → Project settings → Service accounts → Generate new private key.
//   2) supabase secrets set FCM_SERVICE_ACCOUNT='{...محتوى ملف الـ JSON كله...}'
//   3) supabase functions deploy send-push --no-verify-jwt
//   4) Supabase → Database → Webhooks → Create: table notifications, event Insert, type Edge Function = send-push
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sa = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT') || '{}');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const b64 = (b: ArrayBuffer | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...new Uint8Array(b))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`));
  const jwt = `${header}.${claim}.${b64(sig)}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  return (await r.json()).access_token;
}

Deno.serve(async (req) => {
  try {
    const { record } = await req.json();
    if (!record?.recipient_id) return new Response('no record');
    const { data: tokens } = await supabase.from('device_tokens').select('token').eq('game_user_id', record.recipient_id);
    if (!tokens?.length) return new Response('no devices');
    const at = await accessToken();
    // بيانات الإشعار (roomId / screen ...) لازم تروح كـ strings عشان ضغطة الإشعار تفتح الغرفة مباشرة
    const extra: Record<string, string> = {};
    for (const [k, v] of Object.entries((record.data || {}) as Record<string, unknown>)) extra[k] = String(v);
    await Promise.all(
      tokens.map(async ({ token }: { token: string }) => {
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: record.title, body: record.body },
              data: { ...extra, type: String(record.type || ''), id: String(record.id || '') },
              android: { priority: 'HIGH', notification: { channel_id: 'default', sound: 'default' } }
            }
          })
        });
        if (res.status === 404) await supabase.from('device_tokens').delete().eq('token', token);
      })
    );
    return new Response('ok');
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
