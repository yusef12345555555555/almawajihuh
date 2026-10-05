// ============================================================
// المواجهة | زر/إيماءة الرجوع في الهاتف
//
// أي شاشة فرعية أو نافذة (مودال) تسجّل "معالج رجوع". لما اللاعب يضغط رجوع
// (زر الهاتف أو الإيماءة) بيتنفّذ آخر معالج متسجّل (الأحدث) بدل ما يطلع من التطبيق.
// لو مفيش معالجات، التطبيق نفسه بيرجع للشاشة السابقة (App.tsx).
// ============================================================

import { useEffect, useRef } from 'react';

type Handler = () => void;
const stack: Handler[] = [];

export function registerBackHandler(fn: Handler): () => void {
  stack.push(fn);
  return () => {
    const i = stack.lastIndexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** يرجّع true لو فيه معالج اتنفّذ. */
export function runTopBackHandler(): boolean {
  const fn = stack[stack.length - 1];
  if (!fn) return false;
  try {
    fn();
  } catch {
    /* ignore */
  }
  return true;
}

/** استخدمه داخل أي مكوّن: لما active = true بيرجّع زر الهاتف يقفل النافذة/الخطوة دي أولاً. */
export function useBackHandler(active: boolean, handler: Handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    return registerBackHandler(() => ref.current());
  }, [active]);
}
