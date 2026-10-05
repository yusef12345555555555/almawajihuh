// ============================================================
// المواجهة | ضبط الإطار "بالمقاس" تلقائياً
// بنحلّل صورة الإطار ونلاقي الفتحة الشفافة اللي في النص (مكان الصورة/الاسم)،
// وبعدها بنكبّر/نصغّر الإطار بحيث الفتحة تطابق الصورة أو الاسم بالظبط — مهما كان حجم الإطار.
// النتائج بتتخزن، ولو التحليل مش ممكن بنرجع لحجم افتراضي.
// ============================================================

import { useEffect, useState } from 'react';

export interface FrameFit {
  /** عرض الإطار كنسبة % من عرض الصندوق */
  widthPct: number;
  /** ارتفاع الإطار كنسبة % من ارتفاع الصندوق */
  heightPct: number;
  /** موضع الإطار (% من الصندوق) */
  leftPct: number;
  topPct: number;
  detected: boolean;
  /** نفس الضبط لكن على أكبر مستطيل «آمن» جوه الفتحة (للنصوص: بيضمن إن الاسم ما يلمسش زخرفة الإطار) */
  inner?: { widthPct: number; heightPct: number; leftPct: number; topPct: number };
  /** الفتحة دايرية تقريباً (للصور الشخصية) */
  round?: boolean;
}

const cache = new Map<string, FrameFit>();
const pending = new Map<string, Promise<FrameFit>>();

export const defaultFit = (scale = 1.3): FrameFit => ({
  widthPct: scale * 100,
  heightPct: scale * 100,
  leftPct: (1 - scale) * 50,
  topPct: (1 - scale) * 50,
  detected: false
});

function analyse(img: HTMLImageElement, scale: number): FrameFit {
  const W = 320;
  const H = Math.max(40, Math.round((W * img.naturalHeight) / img.naturalWidth));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return defaultFit(scale);
  ctx.drawImage(img, 0, 0, W, H);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, W, H).data;
  } catch {
    return defaultFit(scale); // CORS
  }
  const alphaAt = (x: number, y: number) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= W || yi >= H) return -1; // برّه الصورة
    return data[(yi * W + xi) * 4 + 3];
  };
  const cx = W / 2;
  const cy = H / 2;
  // مركز الفتحة لازم يكون شفاف (الصورة الشخصية/الاسم بيتحطوا هناك)
  if (alphaAt(cx, cy) > 60) return defaultFit(scale);

  // نرمي أشعة من المركز: أول «حلقة صلبة» (سمكها ≥ 4px) بتحدد حد الفتحة.
  // الأشعة اللي بتهرب من الصورة (فجوة في الإطار) بنتجاهلها — ده بيخلي الضبط ثابت حتى لو في ثغرات أو توهج.
  const RAYS = 120;
  const hits: { x: number; y: number; d: number }[] = [];
  for (let i = 0; i < RAYS; i++) {
    const ang = (i / RAYS) * Math.PI * 2;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    for (let t = 2; t < Math.max(W, H); t += 0.5) {
      const x = cx + dx * t;
      const y = cy + dy * t;
      const a0 = alphaAt(x, y);
      if (a0 < 0) break; // هربت
      if (a0 >= 110) {
        let solid = true;
        for (let k = 1; k <= 8; k++) {
          const ak = alphaAt(x + dx * k * 0.5, y + dy * k * 0.5);
          if (ak >= 0 && ak < 70) {
            solid = false;
            break;
          }
        }
        if (solid) {
          hits.push({ x, y, d: t });
          break;
        }
      }
    }
  }
  if (hits.length < RAYS * 0.4) return defaultFit(scale);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  hits.forEach((h) => {
    minX = Math.min(minX, h.x);
    maxX = Math.max(maxX, h.x);
    minY = Math.min(minY, h.y);
    maxY = Math.max(maxY, h.y);
  });
  const bw = maxX - minX;
  const bh = maxY - minY;
  const holeW = bw / W;
  const holeH = bh / H;
  if (holeW < 0.08 || holeH < 0.08 || holeW > 0.98 || holeH > 0.98) return defaultFit(scale);

  const hx = (minX + maxX) / 2 / W;
  const hy = (minY + maxY) / 2 / H;
  const widthPct = 100 / holeW;
  const heightPct = 100 / holeH;

  // الفتحة دايرية؟ (كل الأشعة المسافة بتاعتها تقريباً متساوية، والنسبة 1:1 بالبكسل)
  const mean = hits.reduce((s2, h) => s2 + h.d, 0) / hits.length;
  const sd = Math.sqrt(hits.reduce((s2, h) => s2 + (h.d - mean) ** 2, 0) / hits.length);
  const aspectPx = (bw * img.naturalWidth) / W / (((bh * img.naturalHeight) / H) || 1);
  const round = sd / mean < 0.07 && aspectPx > 0.88 && aspectPx < 1.12;

  // أكبر مستطيل متمركز على الفتحة وكله جوّاها (لضبط النص جوه إطار الاسم)
  const poly = hits.slice().sort((p1, p2) => Math.atan2(p1.y - cy, p1.x - cx) - Math.atan2(p2.y - cy, p2.x - cx));
  const inside = (px: number, py: number) => {
    let ins = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi) ins = !ins;
    }
    return ins;
  };
  const hcx = (minX + maxX) / 2;
  const hcy = (minY + maxY) / 2;
  const rectOk = (k: number) => {
    const hw = (bw * k) / 2;
    const hh = (bh * k) / 2;
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      const xs = hcx - hw + 2 * hw * f;
      const ys = hcy - hh + 2 * hh * f;
      if (!inside(xs, hcy - hh) || !inside(xs, hcy + hh) || !inside(hcx - hw, ys) || !inside(hcx + hw, ys)) return false;
    }
    return true;
  };
  let k = 1;
  while (k > 0.4 && !rectOk(k)) k -= 0.02;
  k = Math.max(0.4, k - 0.03);
  const iw = 100 / (holeW * k);
  const ih = 100 / (holeH * k);
  return {
    widthPct,
    heightPct,
    leftPct: 50 - hx * widthPct,
    topPct: 50 - hy * heightPct,
    detected: true,
    round,
    inner: { widthPct: iw, heightPct: ih, leftPct: 50 - hx * iw, topPct: 50 - hy * ih }
  };
}

export function getFrameFit(url: string, scale = 1.3): Promise<FrameFit> {
  const key = `${url}|${scale}`;
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const p = pending.get(key);
  if (p) return p;
  const job = new Promise<FrameFit>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      let fit: FrameFit;
      try {
        fit = analyse(img, scale);
      } catch {
        fit = defaultFit(scale);
      }
      cache.set(key, fit);
      resolve(fit);
    };
    img.onerror = () => {
      const fit = defaultFit(scale);
      cache.set(key, fit);
      resolve(fit);
    };
    img.src = url;
  }).finally(() => pending.delete(key));
  pending.set(key, job);
  return job;
}

/** hook: يرجّع الضبط (افتراضي فوراً ثم الدقيق بعد التحليل). */
export function useFrameFit(url: string | undefined, scale = 1.3): FrameFit | null {
  const [fit, setFit] = useState<FrameFit | null>(() => (url ? cache.get(`${url}|${scale}`) || null : null));
  useEffect(() => {
    if (!url) {
      setFit(null);
      return;
    }
    let alive = true;
    const hit = cache.get(`${url}|${scale}`);
    if (hit) {
      setFit(hit);
      return;
    }
    void getFrameFit(url, scale).then((f) => alive && setFit(f));
    return () => {
      alive = false;
    };
  }, [url, scale]);
  return fit;
}
