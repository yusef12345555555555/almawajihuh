// ============================================================
// العبها صح | EL3BHA SA7 - Cinematic App Boot Intro
//
// Cinematic one-time intro: logo only + stadium light effects +
// Egyptian loading phrase + progress bar → app. No football/ball
// visual appears in the intro.
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { INTRO_LOGO_SRC } from './BrandLogo';

interface AppIntroSplashProps {
  onFinished: () => void;
  minDurationMs?: number;
  /** Resolves once the real app data (players/coaches catalog) has loaded — the intro
   *  won't dismiss before this settles, so the app is actually ready right when it appears. */
  waitFor?: Promise<void>;
}

type Stage = 'grid' | 'emblem' | 'title' | 'progress' | 'wipe';

const APP_TITLE = 'المواجهة';

// Never wait longer than this past the minimum animation, even if the
// network is down — the app must always be able to open.
const MAX_EXTRA_WAIT_MS = 6000;

export const AppIntroSplash: React.FC<AppIntroSplashProps> = ({ onFinished, minDurationMs = 6000, waitFor }) => {
  const [stage, setStage] = useState<Stage>('grid');
  // تقدم التحميل الفعلي (0..1): كتالوج اللاعبين + الخطوط + الصور الأساسية.
  const [progress, setProgress] = useState(0);

  // Randomized once per mount so the embers don't look mechanically identical.
  const embers = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 3200),
        duration: 3200 + Math.round(Math.random() * 2200),
        size: 2 + Math.round(Math.random() * 3),
        drift: Math.round((Math.random() - 0.5) * 60)
      })),
    []
  );

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage('emblem'), 220));
    timers.push(setTimeout(() => setStage('title'), 700));
    timers.push(setTimeout(() => setStage('progress'), 1200));

    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const startedAt = Date.now();

    // مهام التحميل الحقيقية — كل مهمة منتهية تزوّد نسبة التقدم.
    const preloadImg = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });
    const capped = (p: Promise<unknown>, ms: number) =>
      Promise.race([p.catch(() => undefined), sleep(ms)]).then(() => undefined);
    const tasks: Promise<unknown>[] = [
      capped(waitFor ?? Promise.resolve(), 9000),
      capped((document as any).fonts?.ready ?? Promise.resolve(), 5000),
      capped(preloadImg('/brand/home-bg.jpg'), 6000),
      capped(preloadImg('/brand/icon-192.png'), 6000),
      capped(Promise.all(['/games/game-auction.png', '/games/game-dond.png', '/games/game-coach.png'].map(preloadImg)), 7000)
    ];
    let done = 0;
    tasks.forEach((t) =>
      t.then(() => {
        done += 1;
      })
    );
    // الشريط = أقل قيمة بين التحميل الفعلي والوقت المنقضي (حتى 6 ثواني) — فمايوصلش 100% قبل ما التحميل يخلص فعلاً.
    const tick = setInterval(() => {
      if (cancelled) return;
      const real = done / tasks.length;
      const timeFloor = Math.min(1, (Date.now() - startedAt) / minDurationMs);
      setProgress(Math.min(real, timeFloor));
    }, 80);
    timers.push(tick as unknown as ReturnType<typeof setTimeout>);

    const finishWhenReady = async () => {
      // لازم يعدّي الحد الأدنى للوقت + يخلص التحميل الفعلي (بحد أقصى حتى لا يعلق التطبيق أبداً).
      await Promise.race([Promise.all(tasks), sleep(MAX_EXTRA_WAIT_MS + minDurationMs)]);
      const remaining = minDurationMs - (Date.now() - startedAt);
      if (remaining > 0) await sleep(remaining);
      if (cancelled) return;
      setProgress(1);
      setStage('wipe');
      await sleep(350);
      if (!cancelled) onFinished();
    };
    void finishWhenReady();

    return () => {
      cancelled = true;
      timers.forEach((t) => {
        clearTimeout(t);
        clearInterval(t as unknown as number);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emblemVisible = stage === 'emblem' || stage === 'title' || stage === 'progress' || stage === 'wipe';
  const titleVisible = stage === 'title' || stage === 'progress' || stage === 'wipe';
  const progressVisible = stage === 'progress' || stage === 'wipe';
  const isWiping = stage === 'wipe';

  return (
    <div
      className={`fixed inset-0 z-[999] bg-[#030711] flex items-center justify-center overflow-hidden select-none ${
        isWiping ? 'pointer-events-none' : ''
      }`}
      style={{
        opacity: isWiping ? 0 : 1,
        transform: isWiping ? 'scale(1.08)' : 'scale(1)',
        transition: isWiping ? 'opacity 450ms ease-in, transform 450ms ease-in' : 'none'
      }}
    >
      <style>{`
        @keyframes es-grid-fade { from { opacity: 0; } to { opacity: 0.22; } }
        @keyframes es-beam-sweep {
          0% { transform: translateX(-60%) rotate(18deg); opacity: 0; }
          15% { opacity: 0.35; }
          50% { opacity: 0.18; }
          100% { transform: translateX(160%) rotate(18deg); opacity: 0; }
        }
        @keyframes es-ember-float {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.5; }
          100% { transform: translate(var(--drift), -120vh) scale(1.1); opacity: 0; }
        }
        @keyframes es-impact-flash {
          0% { opacity: 0; transform: scale(0.4); }
          25% { opacity: 1; transform: scale(1.3); }
          100% { opacity: 0; transform: scale(2.6); }
        }
        @keyframes es-emblem-burst {
          0% { opacity: 0; transform: scale(0.25) rotate(-20deg); filter: blur(8px); }
          55% { opacity: 1; transform: scale(1.14) rotate(3deg); filter: blur(0); }
          75% { transform: scale(0.95) rotate(-1.5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes es-crest-draw {
          from { stroke-dashoffset: 300; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes es-ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes es-ring-spin-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes es-glow-pulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.95; transform: scale(1.18); } }
        @keyframes es-letter-in {
          0% { opacity: 0; transform: translateY(22px) rotateX(-60deg); }
          100% { opacity: 1; transform: translateY(0) rotateX(0deg); }
        }
        @keyframes es-shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes es-underline-grow {
          from { width: 0; } to { width: 100%; }
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_55%_45%,rgba(251,191,36,.32),transparent_58%),linear-gradient(135deg,#160b00_0%,#6b3b05_42%,#f59e0b_100%)]" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_45%_45%,rgba(37,99,235,.38),transparent_58%),linear-gradient(225deg,#020617_0%,#0b2d6b_48%,#2563eb_100%)]" />
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/25 shadow-[0_0_30px_rgba(255,255,255,.35)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,.58)_82%)]" />
      </div>

      {/* Stadium floodlight sweeps */}
      <div
        className="absolute top-0 left-0 w-[40vw] h-[220vh] bg-gradient-to-b from-amber-300/40 via-amber-300/5 to-transparent"
        style={{ animation: 'es-beam-sweep 2.6s ease-in-out 0.2s 1 forwards', transformOrigin: 'top' }}
      />
      <div
        className="absolute top-0 left-0 w-[25vw] h-[220vh] bg-gradient-to-b from-white/25 via-white/5 to-transparent"
        style={{ animation: 'es-beam-sweep 2.6s ease-in-out 1.1s 1 forwards', transformOrigin: 'top' }}
      />

      {/* Drifting embers — alive from frame one */}
      {embers.map((e, i) => (
        <div
          key={i}
          className="absolute bottom-0 rounded-full bg-amber-400"
          style={
            {
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              opacity: 0,
              boxShadow: '0 0 6px 1px rgba(245,158,11,0.8)',
              animation: `es-ember-float ${e.duration}ms ease-in ${e.delay}ms infinite`,
              ['--drift' as string]: `${e.drift}px`
            } as React.CSSProperties
          }
        />
      ))}

      {/* Tactical pitch grid backdrop */}
      <div
        className="absolute inset-0 opacity-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,158,11,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.5) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          animation: 'es-grid-fade 900ms ease-out forwards'
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 w-[1px] h-[70vmin] opacity-0"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(245,158,11,0.4), transparent)',
          animation: 'es-grid-fade 900ms ease-out forwards'
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 w-[36vmin] h-[36vmin] rounded-full border border-amber-500/30 opacity-0"
        style={{ transform: 'translate(-50%,-50%)', animation: 'es-grid-fade 900ms ease-out forwards' }}
      />

      {/* الشعار فقط — بدون أي شكل كرة */}

      <div className="relative flex flex-col items-center justify-center px-6">
        {/* Impact flash right as the ball "hits" and the emblem appears */}
        {stage === 'emblem' && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ animation: 'es-impact-flash 550ms ease-out forwards' }}
          >
            <div className="w-40 h-40 rounded-full bg-white blur-2xl" />
          </div>
        )}

        {/* Emblem */}
        <div
          className="relative mb-7"
          style={{
            opacity: emblemVisible ? 1 : 0,
            animation: emblemVisible ? 'es-emblem-burst 650ms cubic-bezier(0.34,1.56,0.64,1) forwards' : undefined
          }}
        >
          {/* Two counter-rotating rings for extra depth */}
          <div
            className="absolute -inset-4 rounded-[2.4rem] border-2 border-dashed border-amber-500/40"
            style={{ animation: 'es-ring-spin 9s linear infinite' }}
          />
          <div
            className="absolute -inset-8 rounded-[2.8rem] border border-amber-300/20"
            style={{ animation: 'es-ring-spin-rev 14s linear infinite' }}
          />
          {/* Glow aura */}
          <div
            className="absolute -inset-6 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-[2.5rem] blur-3xl"
            style={{ animation: 'es-glow-pulse 2.2s ease-in-out infinite' }}
          />

          {/* شعار الانترو الرسمي — الشعار فقط */}
          <div className="relative w-[76vw] max-w-[420px] sm:max-w-[500px] aspect-square rounded-[2.4rem] overflow-hidden ring-2 ring-white/20 shadow-[0_0_90px_rgba(59,130,246,0.28),0_0_90px_rgba(245,158,11,0.24)] bg-black/70 backdrop-blur-sm">
            <img
              src={INTRO_LOGO_SRC}
              alt="المواجهة"
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain select-none"
            />
          </div>
        </div>
        {/* Intro phrase: logo only + Egyptian tagline. */}
        <div
          className="mt-2 text-center"
          style={{ opacity: titleVisible ? 1 : 0, transition: 'opacity 400ms ease 300ms' }}
        >
          <div className="text-base sm:text-lg font-black text-amber-300" dir="rtl">بنجهز الملعب ليك</div>
          {titleVisible && (
            <div
              className="h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-2"
              style={{ animation: 'es-underline-grow 700ms ease-out 400ms forwards', width: 0 }}
            />
          )}
        </div>

        {/* شريط تقدم مرتبط بالتحميل الفعلي */}
        <div
          className="mt-8 w-52 sm:w-64 transition-opacity duration-300"
          style={{ opacity: progressVisible ? 1 : 0 }}
        >
          <div className="h-1.5 rounded-full bg-zinc-800/80 overflow-hidden relative">
            <div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-amber-600 via-amber-400 to-yellow-300 rounded-full"
              style={{ width: `${Math.round(progress * 100)}%`, transition: 'width 120ms linear' }}
            />
          </div>
          <div className="mt-1.5 text-center text-[10px] font-black text-amber-200/80" dir="ltr">
            {Math.round(progress * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};
