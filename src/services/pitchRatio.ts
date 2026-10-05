// نسبة عرض/ارتفاع صورة أرضية الملعب الحقيقية، عشان تظهر كاملة كما اتضافت (من غير قص ولا حواف).
import { useEffect, useState } from 'react';

const cache = new Map<string, number>();

export function usePitchRatio(url: string | undefined, fallback = 0.75): number {
  const [r, setR] = useState<number>(() => (url && cache.get(url)) || fallback);
  useEffect(() => {
    if (!url) {
      setR(fallback);
      return;
    }
    const hit = cache.get(url);
    if (hit) {
      setR(hit);
      return;
    }
    let alive = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        const v = img.naturalWidth / img.naturalHeight;
        cache.set(url, v);
        if (alive) setR(v);
      }
    };
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url, fallback]);
  return Math.min(1.6, Math.max(0.5, r));
}

// نسبة عرض/ارتفاع أي صورة (كارت لاعب مثلاً) — عشان الإطار يركب على الصورة بالظبط من غير فراغات.
const imgCache = new Map<string, number>();
export function useImageRatio(url: string | undefined, fallback = 2 / 3, min = 0.5, max = 0.95): number {
  const [r, setR] = useState<number>(() => (url && imgCache.get(url)) || fallback);
  useEffect(() => {
    if (!url) {
      setR(fallback);
      return;
    }
    const hit = imgCache.get(url);
    if (hit) {
      setR(hit);
      return;
    }
    let alive = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        const v = img.naturalWidth / img.naturalHeight;
        imgCache.set(url, v);
        if (alive) setR(v);
      }
    };
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url, fallback]);
  return Math.min(max, Math.max(min, r));
}
