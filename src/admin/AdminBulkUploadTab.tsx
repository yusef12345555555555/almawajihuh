// رفع الصور دفعة واحدة: اختار لحد 50 صورة من الموبايل واضغط "رفع" — مفيش أسماء ولا بطاقات ولا أي حقول.
// الاسم المكتوب جوه الصورة بيتقرا تلقائي (OCR عربي + إنجليزي) وبيتقارن بأسماء اللاعبين؛ لو اتطابق بتظهر الصورة
// عند كل اللاعبين. اسم الملف بيتجرب الأول كاحتياطي. اللي ما اتطابقش بيتحفظ في المكتبة.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { FOOTBALL_PLAYERS } from '../data/footballData';
import { getAllPlayers, invalidatePlayerCache } from '../services/playerRepository';

const MAX_FILES = 50;
const BUCKET = 'player-photos';

export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/\(\d+\)|[-_ ]copy|\bimg[-_ ]?\d+\b|whatsapp image.*$/gi, '')
    .replace(/[\u064B-\u065F\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, '');

/** مفتاح اسم → id اللاعب (المفاتيح المتكررة بين أكتر من لاعب بتتشال عشان ما نغلطش). */
function buildKeyMap(players: { id: string; name: string; nameAr: string }[]): Map<string, string> {
  const seen = new Map<string, Set<string>>();
  const add = (k: string, id: string) => {
    if (k.length < 3) return;
    if (!seen.has(k)) seen.set(k, new Set());
    seen.get(k)!.add(id);
  };
  for (const p of players) {
    add(normalize(p.id), p.id);
    add(normalize(p.name), p.id);
    add(normalize(p.nameAr), p.id);
    const en = p.name.split(/\s+/);
    if (en.length > 1) add(normalize(en[en.length - 1]), p.id);
    const ar = p.nameAr.split(/\s+/);
    if (ar.length > 1) add(normalize(ar[ar.length - 1]), p.id);
  }
  const map = new Map<string, string>();
  seen.forEach((ids, k) => {
    if (ids.size === 1) map.set(k, [...ids][0]);
  });
  return map;
}

const lev = (a: string, b: string): number => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
};

/** هل الكلمة موجودة في نص الـ OCR (مع تسامح حرف واحد للكلمات الطويلة)؟ */
function containsFuzzy(hay: string, needle: string): boolean {
  if (hay.includes(needle)) return true;
  if (needle.length < 5) return false;
  for (let len = needle.length - 1; len <= needle.length + 1; len++)
    for (let i = 0; i + len <= hay.length; i++) if (lev(hay.slice(i, i + len), needle) <= 1) return true;
  return false;
}

/** بيلاقي اللاعب اللي اسمه مكتوب في نص الصورة: أكتر حروف أسماء متطابقة، ولازم يبقى واضح وبفارق عن اللي بعده. */
export function matchByOcr(text: string, players: { id: string; name: string; nameAr: string }[]): string | null {
  const hay = normalize(text);
  if (hay.length < 4) return null;
  const scored: { id: string; score: number }[] = [];
  for (const p of players) {
    const toks = [...p.nameAr.split(/\s+/), ...p.name.split(/\s+/)].map(normalize).filter((t) => t.length >= 3);
    const uniq = [...new Set(toks)];
    let score = 0;
    for (const t of uniq) if (containsFuzzy(hay, t)) score += t.length;
    if (score > 0) scored.push({ id: p.id, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 5) return null;
  if (scored[1] && scored[1].score >= best.score) return null; // مش واضح → المكتبة بدل الغلط
  return best.id;
}

/** بيصغّر صور الموبايل الكبيرة قبل الرفع (أسرع وأوفر) — ولو فشل بيرفع الأصلية. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const max = 1200;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 900_000) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.88));
    return blob || file;
  } catch {
    return file;
  }
}

interface LibItem {
  id: string;
  image_url: string;
  file_name: string | null;
  matched_player_id: string | null;
}

export const AdminBulkUploadTab: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [batchInfo, setBatchInfo] = useState<{ current: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [summary, setSummary] = useState<{ matched: number; stored: number; failed: number } | null>(null);
  const [library, setLibrary] = useState<LibItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const loadLibrary = async () => {
    const client = getSupabaseClient();
    if (!client) return;
    const { data } = await client.from('media_library').select('id,image_url,file_name,matched_player_id').order('created_at', { ascending: false }).limit(60);
    setLibrary((data as LibItem[]) || []);
  };
  useEffect(() => {
    loadLibrary();
  }, []);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith('image/')).slice(0, MAX_FILES);
    setFiles(imgs);
    setSummary(null);
    setDone(0);
  };

  const upload = async () => {
    const client = getSupabaseClient();
    if (!client || files.length === 0 || busy) return;
    setBusy(true);
    setDone(0);
    setBatchInfo(null);
    let matched = 0;
    let stored = 0;
    let failed = 0;
    const all = await getAllPlayers();
    const keys = buildKeyMap(all);
    type Ocr = { recognize: (img: Blob) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown>; setParameters?: (p: Record<string, string>) => Promise<unknown> };
    let ocr: Ocr | null = null;
    try {
      type TesseractGlobal = { createWorker: (langs: string[]) => Promise<unknown> };
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
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
          script.async = true;
          script.dataset.almwajhaTesseract = '1';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Tesseract failed to load'));
          document.head.appendChild(script);
        });
      }
      if (win.Tesseract) {
        ocr = (await win.Tesseract.createWorker(['ara', 'eng'])) as Ocr;
        try {
          await ocr.setParameters?.({ tessedit_pageseg_mode: '6' });
        } catch {
          /* ignore */
        }
      }
    } catch {
      ocr = null; // من غير OCR: بنعتمد على اسم الملف بس
    }

    /** يقرا الاسم من منطقة محددة من الصورة (مقصوصة ومكبّرة وبتباين عالي). */
    const readRegion = async (blob: Blob, y0: number, y1: number): Promise<string> => {
      if (!ocr) return '';
      try {
        const bmp = await createImageBitmap(blob);
        const sy = Math.round(bmp.height * y0);
        const sh = Math.max(20, Math.round(bmp.height * (y1 - y0)));
        const k = Math.min(2, 1100 / bmp.width);
        const c = document.createElement('canvas');
        c.width = Math.round(bmp.width * k);
        c.height = Math.round(sh * k);
        const ctx = c.getContext('2d');
        if (!ctx) return '';
        ctx.filter = 'grayscale(1) contrast(1.5)';
        ctx.drawImage(bmp, 0, sy, bmp.width, sh, 0, 0, c.width, c.height);
        const region: Blob | null = await new Promise((r) => c.toBlob(r, 'image/png'));
        if (!region) return '';
        const { data } = await ocr.recognize(region);
        return data.text || '';
      } catch {
        return '';
      }
    };

    /** يجرّب منطقة الاسم المعتادة أولاً (أسفل البطاقة) ثم الصورة كلها ثم الأعلى. */
    const identify = async (blob: Blob, fileName: string): Promise<string | null> => {
      for (const [y0, y1] of [[0.55, 1], [0, 1], [0, 0.45]] as const) {
        const text = await readRegion(blob, y0, y1);
        const id = text ? matchByOcr(text, all) : null;
        if (id) return id;
      }
      return keys.get(normalize(fileName)) || null;
    };

    const BATCH = 10;
    const totalBatches = Math.ceil(files.length / BATCH);
    for (let bi = 0; bi < totalBatches; bi++) {
      setBatchInfo({ current: bi + 1, total: totalBatches });
      const chunk = files.slice(bi * BATCH, bi * BATCH + BATCH);

      // 1) تصغير + رفع الدفعة بالتوازي (10 صور)
      const prepared = await Promise.all(
        chunk.map(async (file, j) => {
          try {
            const blob = await shrink(file);
            const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `bulk/${Date.now()}_${bi}_${j}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
            const { error } = await client.storage.from(BUCKET).upload(path, blob, { cacheControl: '31536000', upsert: false, contentType: blob.type || undefined });
            if (error) throw error;
            return { file, blob, url: client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
          } catch {
            failed++;
            setDone((d) => d + 1);
            return null;
          }
        })
      );

      // 2) قراءة الأسماء واحدة واحدة بهدوء (عشان كل صورة ياخد وقتها وتتقرا صح) ثم الحفظ
      for (const item of prepared) {
        if (!item) continue;
        try {
          const playerId = await identify(item.blob, item.file.name);
          await client.from('media_library').insert({ image_url: item.url, file_name: item.file.name, matched_player_id: playerId });
          stored++;
          if (playerId) {
            const { error: e2 } = await client.from('player_photo_overrides').upsert({ player_id: playerId, image_url: item.url, source_file: item.file.name, updated_at: new Date().toISOString() });
            if (!e2) matched++;
          }
        } catch {
          failed++;
        } finally {
          setDone((d) => d + 1);
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    try {
      await ocr?.terminate();
    } catch {
      /* ignore */
    }

    invalidatePlayerCache();
    setSummary({ matched, stored, failed });
    setBatchInfo(null);
    setFiles([]);
    if (inputRef.current) inputRef.current.value = '';
    setBusy(false);
    loadLibrary();
  };

  const localCount = FOOTBALL_PLAYERS.length;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-black text-white">رفع الصور</h2>
        <p className="text-xs text-zinc-500 break-words">
          اختار لحد {MAX_FILES} صورة من موبايلك مرة واحدة واضغط "رفع" — مفيش أسماء ولا بطاقات. لو الاسم المكتوب جوه الصورة بيتقرا تلقائي، ولو اتعرف على لاعب من الـ {localCount}+ لاعب بتظهر صورته عند كل اللاعبين. أول مرة بتحمّل مكتبة القراءة (محتاجة إنترنت).
        </p>
      </div>

      <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-500/50 bg-zinc-900 py-8 cursor-pointer hover:bg-zinc-900/70">
        <ImagePlus className="w-8 h-8 text-amber-400" />
        <span className="text-sm font-black text-white">اختار الصور</span>
        <span className="text-[11px] text-zinc-500">{files.length ? `${files.length} / ${MAX_FILES} صورة محددة` : `لحد ${MAX_FILES} صورة`}</span>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      </label>

      {files.length > 0 && (
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
          {previews.map((u, i) => (
            <img key={i} src={u} alt="" className="aspect-square w-full rounded-lg object-cover border border-zinc-800" />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={upload}
        disabled={busy || files.length === 0}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-base font-black text-zinc-950 disabled:opacity-40"
      >
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
        {busy ? `دفعة ${batchInfo?.current ?? 1}/${batchInfo?.total ?? 1} • ${done} / ${files.length}` : 'رفع'}
      </button>

      {summary && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="break-words">
            اترفع {summary.stored} صورة — منهم {summary.matched} اتعرف اسم لاعبهم وبقوا ظاهرين عند الكل
            {summary.failed > 0 ? ` • ${summary.failed} فشلوا (جرّب ترفعهم تاني)` : ''}.
          </div>
        </div>
      )}

      {library.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-white mb-2">آخر الصور المرفوعة</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {library.map((it) => (
              <div key={it.id} className="relative">
                <img src={it.image_url} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover border border-zinc-800" />
                <span className={`absolute bottom-1 right-1 rounded px-1 text-[9px] font-black ${it.matched_player_id ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-200'}`}>
                  {it.matched_player_id ? 'مستخدمة' : 'مكتبة'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
