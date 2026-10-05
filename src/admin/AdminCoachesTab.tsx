import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import { invalidateCoachCache } from '../services/coachRepository';
import { loadOcrWorker, readCardInfo, OcrWorker } from '../services/cardOcr';
import { compressImageForUpload } from '../services/imageCompression';
import { Upload, X, CheckCircle2, Loader2, ImagePlus, ScanEye, Trash2 } from 'lucide-react';

const MAX_PER_BATCH = 50;
const RARITIES = ['Normal', 'Rare', 'Elite', 'Legend', 'Icon'];

interface DraftCoach {
  file: File;
  previewUrl: string;
  name: string;
  overallRating: number;
  rarity: string;
  nationalityAr: string;
  ratingSource: 'default' | 'ocr' | 'manual';
  nameSource: 'default' | 'ocr' | 'manual';
  reading: boolean;
}

interface ExistingCoach {
  id: string;
  name_ar: string;
  rating: number;
  photo_url: string;
}

/**
 * Coach cards: same idea as player cards — the rating is the biggest number on the image
 * and the name is the biggest text, centered at the bottom. Both are read automatically.
 */
export const AdminCoachesTab: React.FC = () => {
  const [drafts, setDrafts] = useState<DraftCoach[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<ExistingCoach[]>([]);

  const loadExisting = async () => {
    const client = getSupabaseClient();
    if (!client) return;
    const { data } = await client
      .from('coaches')
      .select('id,name_ar,rating,photo_url')
      .order('created_at', { ascending: false });
    setExisting((data as ExistingCoach[]) || []);
  };
  useEffect(() => {
    void loadExisting();
  }, []);

  const readFromPhotos = async (files: File[]) => {
    const worker: OcrWorker | null = await loadOcrWorker();
    const done = (f: File) => setDrafts((p) => p.map((d) => (d.file === f ? { ...d, reading: false } : d)));
    if (!worker) {
      files.forEach(done);
      return;
    }
    const readOne = async (file: File) => {
      try {
        const { rating, name } = await readCardInfo(worker, file);
        setDrafts((prev) =>
          prev.map((d) => {
            if (d.file !== file) return d;
            const n = { ...d, reading: false };
            if (rating && d.ratingSource !== 'manual') {
              n.overallRating = rating;
              n.ratingSource = 'ocr';
            }
            if (name && d.nameSource !== 'manual') {
              n.name = name;
              n.nameSource = 'ocr';
            }
            return n;
          }),
        );
      } catch {
        done(file);
      }
    };
    let cursor = 0;
    const run = async (): Promise<void> => {
      const i = cursor++;
      if (i >= files.length) return;
      await readOne(files[i]);
      return run();
    };
    try {
      await Promise.all(Array.from({ length: Math.min(4, files.length) }, run));
    } finally {
      try {
        await worker.terminate();
      } catch {
        /* ignore */
      }
    }
  };

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    setResult(null);
    setError(null);
    const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'));
    const room = MAX_PER_BATCH - drafts.length;
    if (incoming.length > room) setError(`أقصى حد ${MAX_PER_BATCH} صورة في المرة الواحدة.`);
    const accepted = incoming.slice(0, Math.max(0, room));
    const fresh: DraftCoach[] = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: '',
      overallRating: 75,
      rarity: 'Rare',
      nationalityAr: '',
      ratingSource: 'default',
      nameSource: 'default',
      reading: true
    }));
    setDrafts((p) => [...p, ...fresh]);
    if (fresh.length) void readFromPhotos(accepted);
  };

  const update = (i: number, patch: Partial<DraftCoach>) =>
    setDrafts((prev) =>
      prev.map((d, idx) => {
        if (idx !== i) return d;
        const n = { ...d, ...patch };
        if (patch.overallRating !== undefined) n.ratingSource = 'manual';
        if (patch.name !== undefined) n.nameSource = 'manual';
        return n;
      }),
    );

  const remove = (i: number) =>
    setDrafts((prev) => {
      URL.revokeObjectURL(prev[i].previewUrl);
      return prev.filter((_, idx) => idx !== i);
    });

  const publish = async () => {
    const client = getSupabaseClient();
    if (!client) return setError('تعذر الاتصال بقاعدة البيانات.');
    if (drafts.some((d) => !d.name.trim()))
      return setError('في مدربين لسه من غير اسم — الاسم بيتقرا تلقائيًا، ولو ماتقراش اكتبه يدويًا.');
    setPublishing(true);
    setError(null);
    let ok = 0;
    let failed = 0;
    const publishOne = async (d: DraftCoach) => {
      try {
        const uploadFile = await compressImageForUpload(d.file);
        const ext = uploadFile.name.split('.').pop() || 'jpg';
        const path = `coach_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await client.storage.from('player-photos').upload(path, uploadFile, {
          cacheControl: '31536000',
          upsert: false
        });
        if (upErr) throw upErr;
        const { data: pub } = client.storage.from('player-photos').getPublicUrl(path);
        const { error: insErr } = await client.from('coaches').insert({
          name: d.name.trim(),
          name_ar: d.name.trim(),
          rating: d.overallRating,
          nationality_ar: d.nationalityAr.trim(),
          rarity: d.rarity,
          photo_url: pub.publicUrl,
          is_published: true
        });
        if (insErr) throw insErr;
        ok++;
      } catch {
        failed++;
      }
    };
    const CONCURRENCY = 8;
    let cursor = 0;
    const worker = async (): Promise<void> => {
      const i = cursor++;
      if (i >= drafts.length) return;
      await publishOne(drafts[i]);
      return worker();
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, drafts.length) }, worker));
    invalidateCoachCache();
    setResult({ ok, failed });
    setPublishing(false);
    if (failed === 0) {
      drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      setDrafts([]);
    }
    void loadExisting();
  };

  const deleteExisting = async (id: string) => {
    const client = getSupabaseClient();
    if (!client || !window.confirm('تمسح المدرب ده نهائيًا؟')) return;
    await client.from('coaches').delete().eq('id', id);
    invalidateCoachCache();
    void loadExisting();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-black text-white">إضافة صور المدربين</h2>
        <p className="text-xs text-zinc-500">
          حد أقصى {MAX_PER_BATCH} صورة. الاسم (أكبر نص) والتقييم (أكبر رقم) بيتقروا تلقائيًا من الصورة. دوس "نشر" وتوصل لكل
          اللاعبين فورًا.
        </p>
      </div>

      <label
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black transition-colors ${
          drafts.length < MAX_PER_BATCH
            ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
        }`}
      >
        <ImagePlus className="w-4 h-4" />
        <span>اختيار الصور ({drafts.length}/{MAX_PER_BATCH})</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={drafts.length >= MAX_PER_BATCH}
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>

      {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl p-3">{error}</div>}
      {result && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>
            اتنشر {result.ok} مدرب بنجاح{result.failed > 0 ? `، وفشل ${result.failed}` : ''}.
          </span>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((d, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 relative">
              <button
                onClick={() => remove(i)}
                className="absolute top-2 left-2 p-1 rounded-lg bg-zinc-950/80 text-zinc-400 hover:text-rose-400 cursor-pointer z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <img src={d.previewUrl} alt="" className="w-full h-64 object-contain bg-black rounded-xl" />
              {d.reading && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> جاري قراءة الاسم والتقييم...
                </div>
              )}
              <input
                placeholder="اسم المدرب *"
                value={d.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600"
              />
              {!d.reading && (
                <span className={`text-[10px] flex items-center gap-1 ${d.nameSource === 'ocr' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {d.nameSource === 'ocr' && <ScanEye className="w-3 h-3" />}
                  {d.nameSource === 'ocr' ? 'الاسم اتقرا من الصورة — راجعه' : 'الاسم ماتقراش — اكتبه يدويًا'}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 shrink-0">التقييم</span>
                <input
                  type="range"
                  min={40}
                  max={99}
                  value={d.overallRating}
                  onChange={(e) => update(i, { overallRating: Number(e.target.value) })}
                  className="w-full"
                />
                <span className="text-xs font-black text-amber-400 w-6 text-center">{d.overallRating}</span>
                {d.ratingSource === 'ocr' && <ScanEye className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <select
                value={d.rarity}
                onChange={(e) => update(i, { rarity: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-white"
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <button
          onClick={publish}
          disabled={publishing}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black transition-colors cursor-pointer"
        >
          {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span>{publishing ? 'جاري النشر...' : `نشر ${drafts.length} مدرب للجميع الآن`}</span>
        </button>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-black text-white">المدربين المنشورين حاليًا ({existing.length})</h3>
        {existing.length === 0 ? (
          <div className="text-xs text-zinc-500">لسه مفيش مدربين.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {existing.map((c) => (
              <div key={c.id} className="relative rounded-xl overflow-hidden border border-zinc-800">
                <img src={c.photo_url} alt={c.name_ar} className="w-full h-28 object-cover object-top" />
                <div className="p-1.5 text-center text-[10px] font-bold text-white truncate">
                  {c.name_ar} · {c.rating}
                </div>
                <button
                  onClick={() => deleteExisting(c.id)}
                  className="absolute top-1 left-1 p-1 rounded-lg bg-black/70 text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
