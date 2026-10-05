// ============================================================
// المواجهة | شاشة «اسمح بالإشعارات» — بتظهر بعد انتهاء الانترو (وتسجيل اللاعب) لو الإذن لسه ماتحددش.
// زر «اسمح» بيطلب إذن النظام الحقيقي (أندرويد/متصفح) ويسجّل الجهاز، فالإشعارات تكون فعلية مش شكل بس.
// ============================================================

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { askNotificationPermissionAndRegister, notificationPermissionState } from '../services/pushService';

const DISMISS_KEY = 'mw_notif_prompt_dismissed_at';
const REASK_AFTER_MS = 1000 * 60 * 60 * 24 * 2;

export const NotificationPermissionPrompt: React.FC<{ playerRowId: string }> = ({ playerRowId }) => {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const st = await notificationPermissionState();
      if (!alive || st === 'granted') return;
      if (st === 'denied') setDenied(true);
      try {
        const at = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
        if (at && Date.now() - at < REASK_AFTER_MS) return;
      } catch {
        /* ignore */
      }
      setTimeout(() => alive && setShow(true), 400);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  const allow = async () => {
    setBusy(true);
    const ok = await askNotificationPermissionAndRegister(playerRowId);
    setBusy(false);
    if (ok || !denied) setShow(false);
    else setShow(true);
  };
  const later = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <div className="w-full max-w-sm rounded-3xl border border-amber-300/30 bg-gradient-to-b from-zinc-900 to-zinc-950 p-5 text-center shadow-[0_24px_70px_rgba(0,0,0,.8)]">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 border border-amber-300/40">
          <Bell className="h-8 w-8 text-amber-300" />
        </div>
        <h2 className="text-lg font-black text-white">اسمح بالإشعارات</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-300">
          عشان توصلك رسائل صحابك ودعوات اللعب والألعاب والبطولات لحظة بلحظة، حتى لو التطبيق مقفول.
        </p>
        {denied && (
          <p className="mt-2 text-[11px] font-bold text-amber-300">
            الإشعارات متقفلة من إعدادات الجهاز/المتصفح — افتح إعدادات الموقع أو التطبيق وفعّل «الإشعارات» وبعدها ارجع.
          </p>
        )}
        <button
          onClick={allow}
          disabled={busy}
          className="mt-4 w-full rounded-full bg-gradient-to-l from-amber-400 to-yellow-300 py-3 text-sm font-black text-zinc-950 shadow-[0_0_20px_rgba(251,191,36,.4)] active:scale-95 transition-transform disabled:opacity-60"
        >
          {busy ? '...' : 'اسمح بالإشعارات'}
        </button>
        <button onClick={later} className="mt-2 w-full py-2 text-xs font-bold text-zinc-400">
          مش دلوقتي
        </button>
      </div>
    </div>
  );
};
