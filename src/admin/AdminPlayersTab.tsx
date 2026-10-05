import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import { getAllPlayers, invalidatePlayerCache, deriveAttributesFromRating } from '../services/playerRepository';
import { loadOcrWorker, readCardInfo, OcrWorker } from '../services/cardOcr';
import { compressImageForUpload } from '../services/imageCompression';
import { Upload, X, CheckCircle2, Loader2, ImagePlus, ScanEye } from 'lucide-react';

const MAX_PLAYERS_PER_BATCH = 50;

// تبسيط المراكز: مفيش تفرقة بين مدافع أول/تاني/باك يمين/شمال ولا بين الأنواع
// المختلفة لخط الوسط أو الهجوم — كله بيتحط تحت 4 مسميات واسعة بس، وكل مجموعة
// بتترجم لمركز تفصيلي واحد ثابت (canonical) عشان باقي محرك اللعبة (اللي شغال
// بمراكز تفصيلية زي CB/CM/ST في حساب التشكيلة والمزاد) يفهمها صح من غير أي
// تغيير فيه، وعشان توزيع اللاعبين على التشكيلة (4 مدافعين / 3 وسط / 3 هجوم في
// الحادي عشر، ومدافع واحد / 2 وسط / مهاجم واحد في الخماسي) يشتغل صح دايمًا.
const POSITION_GROUPS: { id: string; labelAr: string; canonical: string }[] = [
  { id: 'GK', labelAr: 'حراسة المرمى', canonical: 'GK' },
  { id: 'DEF', labelAr: 'المدافعين', canonical: 'CB' },
  { id: 'MID', labelAr: 'خط الوسط', canonical: 'CM' },
  { id: 'ATT', labelAr: 'المهاجمين', canonical: 'ST' }
];
const POSITIONS = POSITION_GROUPS.map((g) => g.id);
const positionGroupOf = (pos: string): string => {
  if (pos === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'DEF'].includes(pos)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'MID'].includes(pos)) return 'MID';
  return 'ATT';
};
const canonicalPositionOf = (groupId: string): string =>
  POSITION_GROUPS.find((g) => g.id === groupId)?.canonical || 'ST';
const groupLabelOf = (groupId: string): string =>
  POSITION_GROUPS.find((g) => g.id === groupId)?.labelAr || groupId;
const RARITIES = ['Normal', 'Rare', 'Elite', 'Legend', 'Icon'];

interface DraftPlayer {
  file: File;
  previewUrl: string;
  nameAr: string;
  name: string;
  position: string; // group id: GK/DEF/MID/ATT
  overallRating: number;
  clubAr: string;
  nationalityAr: string;
  rarity: string;
  ratingSource: 'default' | 'ocr' | 'manual'; // عشان نعرف نوريه إن الرقم اتقرا من الصورة فعلاً
  nameSource: 'default' | 'ocr' | 'manual';
  reading: boolean; // بنقرا الصورة دلوقتي (اسم + تقييم مع بعض)
}

export const AdminPlayersTab: React.FC = () => {
  const [drafts, setDrafts] = useState<DraftPlayer[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  // لازم يتحدد مركز اللاعب الأول قبل ما يقدر يرفع أي صورة أصلاً.
  const [pendingPosition, setPendingPosition] = useState<string>('');
  // عدد البطاقات الموجودة فعلاً لكل مركز — يتحدث كل مرة ينشر فيها دفعة جديدة.
  const [positionCounts, setPositionCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);

  const loadPositionCounts = async () => {
    setCountsLoading(true);
    try {
      const all = await getAllPlayers(true);
      const counts: Record<string, number> = {};
      for (const p of all) {
        const g = positionGroupOf(p.position);
        counts[g] = (counts[g] || 0) + 1;
      }
      setPositionCounts(counts);
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    loadPositionCounts();
  }, []);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    setResult(null);
    setGlobalError(null);

    if (!pendingPosition) {
      setGlobalError('لازم تختار مركز اللاعب الأول قبل رفع أي صورة.');
      return;
    }

    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const room = MAX_PLAYERS_PER_BATCH - drafts.length;

    if (incoming.length > room) {
      setGlobalError(`أقصى حد ${MAX_PLAYERS_PER_BATCH} صورة في المرة الواحدة — اتقبل أول ${room} بس من الصور اللي اخترتها.`);
    }

    const accepted = incoming.slice(0, Math.max(0, room));
    const newDrafts: DraftPlayer[] = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      nameAr: '',
      name: '',
      position: pendingPosition,
      overallRating: 75,
      clubAr: '',
      nationalityAr: '',
      rarity: 'Rare',
      ratingSource: 'default',
      nameSource: 'default',
      reading: accepted.length > 0
    }));

    setDrafts((prev) => [...prev, ...newDrafts]);
    if (newDrafts.length > 0) readCardsFromPhotos(accepted);
  };

  /**
   * Reads the rating number AND the player's printed name off every card
   * photo via OCR — one pass per image — and fills both in automatically.
   * Never blocks the UI, never overwrites anything the admin already typed
   * by hand, and silently leaves the manual fields untouched if OCR can't
   * find a confident answer. Runs a few images at a time so a 50-photo
   * batch doesn't take forever, but never so many at once that it could
   * crash the tab.
   */
  const readCardsFromPhotos = async (files: File[]) => {
    const worker: OcrWorker | null = await loadOcrWorker();
    const markDone = (file: File) => {
      setDrafts((prev) => prev.map((d) => (d.file === file ? { ...d, reading: false } : d)));
    };
    if (!worker) {
      files.forEach(markDone);
      return;
    }

    const readOne = async (file: File) => {
      try {
        const { rating, name } = await readCardInfo(worker, file);
        setDrafts((prev) =>
          prev.map((d) => {
            if (d.file !== file) return d;
            const next = { ...d, reading: false };
            if (rating && d.ratingSource !== 'manual') {
              next.overallRating = rating;
              next.ratingSource = 'ocr';
            }
            if (name && d.nameSource !== 'manual') {
              next.name = name;
              next.nameAr = name; // مفيش ترجمة أوتوماتيكية متاحة — نفس الاسم اللي في الصورة يتحط في الحقلين
              next.nameSource = 'ocr';
            }
            return next;
          }),
        );
      } catch {
        markDone(file);
      }
    };

    // Sequential reads: each image needs a couple of focused OCR passes
    // (rating region, name region, and a fallback pass), so one worker
    // processes them one at a time — safer than trying to parallelize a
    // single Tesseract worker instance.
    try {
      for (const file of files) {
        await readOne(file);
      }
    } finally {
      try {
        await worker.terminate();
      } catch {
        /* ignore */
      }
    }
  };

  const updateDraft = (index: number, patch: Partial<DraftPlayer>) => {
    // أي تعديل يدوي بيقفل عليه — بلاش القراءة التلقائية تدوس فوقه لو وصلت متأخرة.
    setDrafts((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const next = { ...d, ...patch };
        if (patch.overallRating !== undefined) next.ratingSource = 'manual';
        if (patch.nameAr !== undefined || patch.name !== undefined) next.nameSource = 'manual';
        return next;
      }),
    );
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePublishAll = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setGlobalError('تعذر الاتصال بقاعدة البيانات.');
      return;
    }
    const incomplete = drafts.some((d) => !d.nameAr.trim());
    if (incomplete) {
      setGlobalError('في بطاقات لسه من غير اسم — الاسم مفروض يتقرا تلقائيًا، لو مايتقراش اكتبه يدويًا قبل النشر.');
      return;
    }
    const badRating = drafts.some((d) => !d.overallRating || d.overallRating < 40 || d.overallRating > 99);
    if (badRating) {
      setGlobalError('في بطاقات التقييم فيها فاضي أو غلط — لازم يكون رقم من 40 لحد 99 قبل النشر.');
      return;
    }

    setPublishing(true);
    setGlobalError(null);
    let ok = 0;
    let failed = 0;

    // Upload + insert every draft. Each one is independent, so a single
    // failure never blocks the rest of the batch. Runs several uploads at
    // once (instead of one-by-one) so a 50-photo batch publishes in
    // seconds instead of minutes.
    const publishOne = async (draft: DraftPlayer) => {
      try {
        const uploadFile = await compressImageForUpload(draft.file);
        const fileExt = uploadFile.name.split('.').pop() || 'jpg';
        const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

        const { error: uploadError } = await client.storage.from('player-photos').upload(path, uploadFile, {
          cacheControl: '31536000',
          upsert: false
        });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = client.storage.from('player-photos').getPublicUrl(path);
        const canonicalPosition = canonicalPositionOf(draft.position);

        const { error: insertError } = await client.from('players').insert({
          name: draft.name.trim() || draft.nameAr.trim(),
          name_ar: draft.nameAr.trim(),
          position: canonicalPosition,
          overall_rating: draft.overallRating,
          club_ar: draft.clubAr.trim(),
          nationality_ar: draft.nationalityAr.trim(),
          rarity: draft.rarity,
          photo_url: publicUrlData.publicUrl,
          // الصورة نفسها بتفضل صورة اللاعب بس — التطبيق هو اللي بيرسم التقييم/المركز/الاسم
          // فوقها بشكل موحّد وحديث، مش الصورة المرفوعة نفسها.
          card_image_url: null,
          // بيانات دقيقة لكل لاعب بحسب تقييمه — عشان محرك المحاكاة يحسب قوة
          // الفريق ورجل المباراة والهدافين بدقة عالية من غير ما يعتمد على قيم
          // فاضية ممكن توقع اللعبة في خطأ وقت المحاكاة.
          attributes: deriveAttributesFromRating(draft.overallRating, canonicalPosition),
          is_published: true
        });
        if (insertError) throw insertError;

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

    invalidatePlayerCache();
    setResult({ ok, failed });
    setPublishing(false);
    if (failed === 0) {
      drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      setDrafts([]);
      setPendingPosition('');
    }
    loadPositionCounts();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-white">إضافة بطاقات لاعبين</h2>
          <p className="text-xs text-zinc-500">
            حد أقصى {MAX_PLAYERS_PER_BATCH} صورة في المرة الواحدة. الاسم والتقييم بيتقروا تلقائيًا من الصورة نفسها (OCR) —
            راجعهم قبل النشر لو حابب. دوس "نشر" وتوصل لكل اللاعبين فورًا.
          </p>
        </div>
      </div>

      {/* الخطوة 1: اختيار المركز — إجباري قبل فتح رفع الصور */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <label className="text-xs font-black text-white flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center text-[11px]">1</span>
          اختار مركز اللاعب أولاً
        </label>
        <select
          value={pendingPosition}
          onChange={(e) => setPendingPosition(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white font-bold"
        >
          <option value="">— اختار المركز —</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {groupLabelOf(p)} {countsLoading ? '' : `(${positionCounts[p] || 0} بطاقة حالياً)`}
            </option>
          ))}
        </select>
        {pendingPosition && (
          <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            عندك حاليًا <span className="font-black">{countsLoading ? '...' : positionCounts[pendingPosition] || 0}</span> بطاقة
            في مركز <span className="font-black">{groupLabelOf(pendingPosition)}</span>. أي صورة هترفعها دلوقتي هتتسجل في نفس
            المركز ده.
          </div>
        )}

        <label
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black transition-colors ${
            pendingPosition && drafts.length < MAX_PLAYERS_PER_BATCH
              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-zinc-950/30 flex items-center justify-center text-[11px]">2</span>
          <ImagePlus className="w-4 h-4" />
          <span>اختيار الصور ({drafts.length}/{MAX_PLAYERS_PER_BATCH})</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={!pendingPosition || drafts.length >= MAX_PLAYERS_PER_BATCH}
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </label>
        {!pendingPosition && (
          <p className="text-[10px] text-zinc-500">لازم تختار المركز فوق الأول قبل ما يتفعّل زرار رفع الصور.</p>
        )}
      </div>

      {globalError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl p-3">{globalError}</div>
      )}
      {result && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>
            اتنشر {result.ok} لاعب بنجاح{result.failed > 0 ? `، وفشل ${result.failed}` : ''}. هيظهروا للاعبين على طول.
          </span>
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-sm">
          اختار صور اللاعبين اللي عايز تضيفهم (لحد {MAX_PLAYERS_PER_BATCH} صورة).
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((draft, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 relative">
              <button
                onClick={() => removeDraft(i)}
                className="absolute top-2 left-2 p-1 rounded-lg bg-zinc-950/80 text-zinc-400 hover:text-rose-400 cursor-pointer z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <img src={draft.previewUrl} alt="" className="w-full h-64 object-contain bg-black rounded-xl" />

              {draft.reading && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> جاري قراءة الاسم والتقييم من الصورة...
                </div>
              )}

              <div>
                <input
                  placeholder="اسم اللاعب *"
                  value={draft.nameAr}
                  onChange={(e) => updateDraft(i, { nameAr: e.target.value, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600"
                />
                {!draft.reading && (
                  <span className={`text-[10px] flex items-center gap-1 mt-1 ${draft.nameSource === 'ocr' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {draft.nameSource === 'ocr' && <ScanEye className="w-3 h-3" />}
                    {draft.nameSource === 'ocr'
                      ? 'اتقرا من الصورة تلقائيًا — راجعه لو مختلف'
                      : 'ما اتقراش من الصورة — اكتبه يدويًا'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={draft.position}
                  onChange={(e) => updateDraft(i, { position: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-white"
                >
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {groupLabelOf(p)}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.rarity}
                  onChange={(e) => updateDraft(i, { rarity: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-white"
                >
                  {RARITIES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 shrink-0">التقييم</span>
                <input
                  type="range"
                  min={40}
                  max={99}
                  value={draft.overallRating || 75}
                  onChange={(e) => updateDraft(i, { overallRating: Number(e.target.value) })}
                  className="w-full"
                />
                <input
                  type="number"
                  min={40}
                  max={99}
                  value={draft.overallRating === 0 ? '' : draft.overallRating}
                  onChange={(e) =>
                    updateDraft(i, { overallRating: e.target.value === '' ? 0 : Number(e.target.value) })
                  }
                  placeholder="—"
                  className="w-14 bg-zinc-950 border border-zinc-800 rounded-lg px-1.5 py-1 text-xs font-black text-amber-400 text-center"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                {draft.reading ? (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> جاري القراءة...
                  </span>
                ) : draft.ratingSource === 'ocr' ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ScanEye className="w-3 h-3" /> اتقرا من الصورة تلقائيًا — راجعه لو مختلف
                  </span>
                ) : draft.overallRating === 0 ? (
                  <span className="text-rose-400">اكتب التقييم يدويًا (ما اتقراش من الصورة)</span>
                ) : (
                  <span className="text-zinc-500">حدد التقييم يدويًا (ما اتقراش من الصورة)</span>
                )}
              </div>

              <input
                placeholder="النادي (اختياري)"
                value={draft.clubAr}
                onChange={(e) => updateDraft(i, { clubAr: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600"
              />
              <input
                placeholder="الجنسية (اختياري)"
                value={draft.nationalityAr}
                onChange={(e) => updateDraft(i, { nationalityAr: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600"
              />
            </div>
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <button
          onClick={handlePublishAll}
          disabled={publishing}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black transition-colors cursor-pointer"
        >
          {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span>{publishing ? 'جاري النشر...' : `نشر ${drafts.length} لاعب للجميع الآن`}</span>
        </button>
      )}
    </div>
  );
};
