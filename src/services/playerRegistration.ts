// ============================================================
// المواجهة | تسجيل اللاعب ومزامنة هويته مع السيرفر
//
// - كل جهاز يولّد "مفتاح سري" عشوائي مرة واحدة (مش بيتبعت غير كبصمة)
//   وده اللي بيثبت إن اللاعب هو صاحب ملفه — من غير إيميل ولا باسورد
//   ومن غير ما نعتمد على Anonymous Auth.
// - رقم اللاعب بيتولد من السيرفر بالتسلسل: ELM1, ELM2, ELM3 ...
// ============================================================

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const SECRET_KEY = 'mwajha_device_secret_v1';

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  try {
    crypto.getRandomValues(arr);
  } catch {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** مفتاح الجهاز السري (بيتولد مرة واحدة ويفضل ثابت). */
export function getDeviceSecret(): string {
  try {
    let s = localStorage.getItem(SECRET_KEY);
    if (!s || s.length < 32) {
      s = randomHex(24);
      localStorage.setItem(SECRET_KEY, s);
    }
    return s;
  } catch {
    // التخزين غير متاح — مفتاح مؤقت للجلسة الحالية
    return randomHex(24);
  }
}

export type RegisterResult =
  | { ok: true; playerId: string; id: string; source: 'server' | 'local' }
  | { ok: false; reason: 'OFFLINE' | 'FAILED' };

const withTimeout = <T,>(p: PromiseLike<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });

const isMissingFunction = (err: any): boolean => {
  const msg = String(err?.message || '').toLowerCase();
  return err?.code === 'PGRST202' || err?.code === '42883' || msg.includes('could not find the function') || msg.includes('does not exist');
};

/** رقم محلي احتياطي في حالة عدم إعداد السيرفر أصلاً (بنفس الشكل ELM#). */
export function localFallbackPlayerId(): string {
  // عدّاد محلي متسلسل (ELM1, ELM2 ...) — مفيش أرقام عشوائية.
  try {
    const n = (parseInt(localStorage.getItem('mw_local_player_seq') || '0', 10) || 0) + 1;
    localStorage.setItem('mw_local_player_seq', String(n));
    return `ELM${n}`;
  } catch {
    return 'ELM1';
  }
}

/** هل الرقم بالشكل الجديد (ELM + رقم)؟ أي شكل قديم (EL3B-xxxx / ELM عشوائي طويل...) يتعامل كقديم. */
export function isValidPlayerId(id: string | undefined | null): boolean {
  return !!id && /^ELM[0-9]{1,7}$/.test(id);
}

/**
 * يسجّل اللاعب على السيرفر ويرجّع رقمه (ELM#).
 * - بدون إعداد Supabase: رقم محلي بنفس الشكل.
 * - بدون إنترنت: يرجّع OFFLINE ليظهر زر "حاول تاني" بدل رقم غير مضمون الفرادة.
 */
export async function registerPlayerOnServer(input: {
  id: string;
  username: string;
  nameAr: string;
  avatar: string;
}): Promise<RegisterResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, playerId: localFallbackPlayerId(), id: input.id, source: 'local' };
  }
  const client = getSupabaseClient();
  if (!client) return { ok: true, playerId: localFallbackPlayerId(), id: input.id, source: 'local' };

  try {
    const { data, error } = await withTimeout(
      client.rpc('mw_register_player', {
        p_secret: getDeviceSecret(),
        p_id: input.id,
        p_username: input.username,
        p_name_ar: input.nameAr,
        p_avatar: input.avatar || ''
      }),
      12000
    );
    if (error) {
      // دالة التسجيل غير مثبتة على السيرفر بعد → لا نمنع اللاعب من اللعب
      if (isMissingFunction(error)) {
        return { ok: true, playerId: localFallbackPlayerId(), id: input.id, source: 'local' };
      }
      return { ok: false, reason: 'FAILED' };
    }
    const res = data as { ok?: boolean; player_id?: string; id?: string; error?: string } | null;
    if (res?.ok && res.player_id) {
      return { ok: true, playerId: res.player_id, id: res.id || input.id, source: 'server' };
    }
    if (res?.error === 'ID_TAKEN') {
      // نادر جداً: تعارض في المعرّف الداخلي — نعيد المحاولة بمعرّف جديد من الاستدعاء الخارجي
      return { ok: false, reason: 'FAILED' };
    }
    return { ok: false, reason: 'FAILED' };
  } catch {
    return { ok: false, reason: 'OFFLINE' };
  }
}
