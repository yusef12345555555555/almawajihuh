// ============================================================
// المواجهة | رقم الإعادة (Reset Epoch)
// لما تشغّل RESET_USERS.sql بيتسجل رقم جديد في app_meta. أول ما أي جهاز يفتح التطبيق بيقارن الرقم
// بالمخزّن عنده؛ لو مختلف بيمسح بياناته المحلية (البروفايل/الـ ID القديم) ويبدأ لاعب جديد.
// لو الجدول مش موجود أو النت مقطوع: مفيش أي تأثير.
// ============================================================

import { getSupabaseClient } from './supabaseClient';

const KEY = 'mw_reset_epoch';

export async function applyResetEpoch(timeoutMs = 2500): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const q = client.from('app_meta').select('value').eq('key', 'reset_epoch').maybeSingle();
    const res = await Promise.race([q, new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))]);
    const value = (res as any)?.data?.value as string | undefined;
    if (!value) return false;
    const mine = localStorage.getItem(KEY);
    if (mine === value) return false;
    // أول مرة بعد إعادة: نمسح كل شيء محلي ونسجّل الرقم الجديد
    try {
      await client.auth.signOut();
    } catch {
      /* ignore */
    }
    const keepTheme = localStorage.getItem('el3bha_sa7_theme_v2');
    localStorage.clear();
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    if (keepTheme) localStorage.setItem('el3bha_sa7_theme_v2', keepTheme);
    localStorage.setItem(KEY, value);
    return true;
  } catch {
    return false;
  }
}
