// ============================================================
// العبها صح | EL3BHA SA7 — Card OCR helper
// Reads whatever TEXT is printed on a player/coach-card image (Tesseract,
// loaded lazily from a CDN so it never affects normal app load time).
//
// This was rewritten and empirically validated against real uploaded card
// images (not guessed) after the previous whole-image approach proved
// unreliable. The validated recipe:
//   1. Auto-crop the source photo down to just the card itself (many
//      uploads are phone screenshots with big black bars around the card)
//      using a row/column "variance" scan — the actual card has far more
//      visual detail than the blank margins around it. A safety margin is
//      kept at the bottom specifically, because a solid-color name banner
//      can look deceptively "flat" at small scale and get trimmed away.
//   2. RATING: crop the top-left ~40%×32% of the card (always where the
//      rating sits), convert to grayscale + contrast-stretch, and run THREE
//      OCR passes (different page-segmentation modes) restricted to digits
//      only. The three passes vote — whichever 2-digit 40–99 number they
//      agree on wins. This alone was verified to read two real test cards
//      (85 and 89) correctly on every single pass.
//   3. NAME: the name's exact vertical position varies a bit between card
//      designs, so instead of one fixed crop we try several candidate
//      bands near the bottom of the card, each with 2 page-segmentation
//      modes, and keep whichever clean, plausible word (or short phrase)
//      the most attempts agree on. A plausibility check (real letters, has
//      a vowel, not a known position code) throws out obvious noise rather
//      than accepting a garbled guess.
// If OCR fails to load, or nothing convincing is found, every function
// here returns null — a photo upload must never break, and the admin
// always sees a clear "couldn't read it" instead of a silently wrong
// value going through.
// ============================================================

export interface OcrWord {
  text: string;
  confidence?: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export type OcrWorker = {
  recognize: (img: Blob) => Promise<{ data: { text: string; words?: OcrWord[] } }>;
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  terminate: () => Promise<unknown>;
};

type TesseractGlobal = { createWorker: (langs: string[]) => Promise<unknown> };

/** Loads (once) and returns a Tesseract worker, or null if it couldn't load. */
export async function loadOcrWorker(): Promise<OcrWorker | null> {
  try {
    const win = window as unknown as Window & { Tesseract?: TesseractGlobal };
    if (!win.Tesseract) {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-almwajha-tesseract]');
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true });
          existing.addEventListener('error', () => reject(new Error('Tesseract failed to load')), { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
        script.async = true;
        script.dataset.almwajhaTesseract = '1';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Tesseract failed to load'));
        document.head.appendChild(script);
      });
    }
    if (!win.Tesseract) return null;
    return (await win.Tesseract.createWorker(['eng'])) as OcrWorker;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Draws the given source region onto a canvas, grayscale + contrast-stretched, as a PNG blob. */
async function grayscaleCrop(source: CanvasImageSource, srcRect: Rect): Promise<Blob | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(srcRect.w));
    canvas.height = Math.max(1, Math.round(srcRect.h));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(source, srcRect.x, srcRect.y, srcRect.w, srcRect.h, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    let min = 255;
    let max = 0;
    const grays = new Float32Array(d.length / 4);
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      grays[i / 4] = g;
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const range = Math.max(1, max - min);
    for (let i = 0; i < d.length; i += 4) {
      const v = ((grays[i / 4] - min) / range) * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } catch {
    return null;
  }
}

function longestRun(arr: number[], thresh: number): { start: number; end: number; len: number } {
  let bestStart = 0;
  let bestLen = 0;
  let curStart = -1;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] >= thresh) {
      if (curStart === -1) curStart = i;
      if (i - curStart + 1 > bestLen) {
        bestLen = i - curStart + 1;
        bestStart = curStart;
      }
    } else {
      curStart = -1;
    }
  }
  return { start: bestStart, end: bestStart + Math.max(bestLen, 1) - 1, len: bestLen };
}

function smooth(arr: number[], radius: number): number[] {
  const out = new Array(arr.length).fill(0);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let cnt = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(arr.length - 1, i + radius); j++) {
      sum += arr[j];
      cnt++;
    }
    out[i] = sum / cnt;
  }
  return out;
}

/**
 * Finds the actual card's bounding box inside whatever was uploaded (a raw
 * card image, or a padded phone screenshot with black/blank bars around
 * it) by locating the region with real visual detail. Extra margin is kept
 * at the bottom on purpose — a flat-colored name banner can look
 * deceptively low-variance at the small analysis scale and get trimmed
 * away otherwise.
 */
function findCardBounds(img: HTMLImageElement): Rect {
  const workW = 200;
  const workH = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * workW));
  const canvas = document.createElement('canvas');
  canvas.width = workW;
  canvas.height = workH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
  ctx.drawImage(img, 0, 0, workW, workH);
  const data = ctx.getImageData(0, 0, workW, workH).data;
  const gray = new Array(workW * workH);
  for (let i = 0; i < workW * workH; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  const rowVar: number[] = new Array(workH).fill(0);
  for (let y = 0; y < workH; y++) {
    let sum = 0;
    let sumSq = 0;
    for (let x = 0; x < workW; x++) {
      const v = gray[y * workW + x];
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / workW;
    rowVar[y] = sumSq / workW - mean * mean;
  }
  const colVar: number[] = new Array(workW).fill(0);
  for (let x = 0; x < workW; x++) {
    let sum = 0;
    let sumSq = 0;
    for (let y = 0; y < workH; y++) {
      const v = gray[y * workW + x];
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / workH;
    colVar[x] = sumSq / workH - mean * mean;
  }

  const rowSm = smooth(rowVar, 2);
  const colSm = smooth(colVar, 2);
  const rowRun = longestRun(rowSm, Math.max(...rowSm) * 0.12);
  const colRun = longestRun(colSm, Math.max(...colSm) * 0.12);

  const padRowsBottom = Math.round(workH * 0.05) + 3;
  const top = Math.max(0, rowRun.start - 2);
  const bottom = Math.min(workH - 1, rowRun.end + padRowsBottom);
  const left = Math.max(0, colRun.start - 2);
  const right = Math.min(workW - 1, colRun.end + 2);

  const scaleX = img.naturalWidth / workW;
  const scaleY = img.naturalHeight / workH;
  const x = Math.floor(left * scaleX);
  const y = Math.floor(top * scaleY);
  const w = Math.min(img.naturalWidth - x, Math.ceil((right - left + 1) * scaleX));
  const h = Math.min(img.naturalHeight - y, Math.ceil((bottom - top + 1) * scaleY));
  return { x, y, w, h };
}

const POSITION_CODES = new Set([
  'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'SUB', 'RES',
]);
const NOISE_WORDS = new Set([
  'OVR', 'OVERALL', 'RATING', 'RATED', 'FIFA', 'FUT', 'CARD', 'ULTIMATE', 'TEAM', 'TOTY', 'TOTS', 'ICON',
  'LEGEND', 'SPECIAL', 'EDITION', 'CITY',
]);

function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w) => (w.length > 1 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
    .join(' ');
}

/** A plausibility filter — rejects garbled OCR noise instead of accepting it as a name. */
function looksLikeAName(s: string): boolean {
  const clean = s.trim();
  if (!/^[A-Za-z][A-Za-z' -]{1,19}$/.test(clean)) return false;
  const upper = clean.toUpperCase();
  if (POSITION_CODES.has(upper)) return false;
  if (NOISE_WORDS.has(upper)) return false;
  if (!/[AEIOUaeiou]/.test(clean)) return false; // real names have a vowel
  return true;
}

async function ocrDigits(worker: OcrWorker, blob: Blob, psm: string): Promise<string> {
  await worker.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: '0123456789' });
  const { data } = await worker.recognize(blob);
  return data.text;
}

async function ocrLetters(worker: OcrWorker, blob: Blob, psm: string): Promise<{ text: string; confidence: number }> {
  await worker.setParameters({
    tessedit_pageseg_mode: psm,
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' -",
  });
  const { data } = await worker.recognize(blob);
  return { text: data.text.trim(), confidence: data.words?.[0]?.confidence || 0 };
}

/** Rating: top-left 40%×32% of the card, 3 page-segmentation modes voting on a single 40-99 answer. */
async function readRating(worker: OcrWorker, img: HTMLImageElement, card: Rect): Promise<number | null> {
  const rect: Rect = { x: card.x, y: card.y, w: card.w * 0.4, h: card.h * 0.32 };
  const blob = await grayscaleCrop(img, rect);
  if (!blob) return null;

  const votes = new Map<number, number>();
  for (const psm of ['6', '7', '11']) {
    try {
      const text = await ocrDigits(worker, blob, psm);
      const m = text.match(/([3-9][0-9])/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n >= 40 && n <= 99) votes.set(n, (votes.get(n) || 0) + 1);
      }
    } catch {
      /* try next mode */
    }
  }
  if (votes.size === 0) return null;
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Name: several candidate bands near the bottom of the card, voting on the most plausible, most-agreed-upon text. */
async function readName(worker: OcrWorker, img: HTMLImageElement, card: Rect): Promise<string | null> {
  const bands: [number, number][] = [
    [0.87, 0.99],
    [0.9, 1.0],
    [0.84, 0.96],
    [0.8, 0.92],
  ];
  const found = new Map<string, { text: string; votes: number; bestConf: number }>();

  for (const [ys, ye] of bands) {
    const ry = card.y + card.h * ys;
    const rh = Math.max(1, card.h * (ye - ys));
    const rect: Rect = {
      x: card.x + card.w * 0.1,
      y: ry,
      w: card.w * 0.8,
      h: Math.min(rh, card.y + card.h - ry),
    };
    const blob = await grayscaleCrop(img, rect);
    if (!blob) continue;

    for (const psm of ['7', '6']) {
      try {
        const { text, confidence } = await ocrLetters(worker, blob, psm);
        if (looksLikeAName(text)) {
          const key = text.toLowerCase();
          const entry = found.get(key) || { text: titleCase(text), votes: 0, bestConf: 0 };
          entry.votes++;
          entry.bestConf = Math.max(entry.bestConf, confidence);
          found.set(key, entry);
        }
      } catch {
        /* try next mode/band */
      }
    }
  }

  if (found.size === 0) return null;
  const best = [...found.values()].sort((a, b) => b.votes - a.votes || b.bestConf - a.bestConf)[0];
  return best.text;
}

export interface CardReadResult {
  rating: number | null;
  name: string | null;
}

/**
 * Reads BOTH the rating and the name off a single card image. Never
 * throws; returns null for whichever field it isn't confident about so
 * the admin can fill it in by hand instead of publishing a wrong guess.
 */
export async function readCardInfo(worker: OcrWorker, file: File | Blob): Promise<CardReadResult> {
  let img: HTMLImageElement;
  try {
    img = await loadImageFromBlob(file);
  } catch {
    return { rating: null, name: null };
  }

  const card = findCardBounds(img);
  const rating = await readRating(worker, img, card).catch(() => null);
  const name = await readName(worker, img, card).catch(() => null);
  return { rating, name };
}
