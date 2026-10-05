// ============================================================
// المواجهة | لوحة الإدارة — السوق
// 1) اختار نوع العنصر  2) ارفع الصور (حتى 10 في الدفعة)  3) اكتب السعر.
// الأنواع: شكل صورتك • شكل اسمك • شكل دخلتك للجيم • شكل تشكيلتك (أرضية ملعب 11 + نسخة 5 اختيارية).
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ImagePlus, Trash2, Save, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { refreshMarketCatalog } from '../services/marketCatalog';
import { MarketCategory } from '../types';

interface Row {
  id: string;
  category: MarketCategory;
  name_ar: string;
  price: number;
  image_url: string;
  image_url_alt: string | null;
  scale: number;
  is_active: boolean;
  sort_order: number;
}

const CATS: { id: MarketCategory; label: string; hint: string; icon: string }[] = [
  { id: 'AVATAR_FRAME', label: 'شكل صورتك', hint: 'إطار PNG شفاف حوالين صورة اللاعب — بيتكيف تلقائياً مع حجم الصورة', icon: '🖼️' },
  { id: 'NAME_FRAME', label: 'شكل اسمك', hint: 'إطار PNG شفاف بيتمدد ليطابق طول الاسم بالظبط', icon: '🏷️' },
  { id: 'ENTRANCE', label: 'شكل دخلتك للجيم', hint: 'صورة/تأثير PNG أو GIF شفاف بيظهر خلف صورة واسم اللاعب لحظة دخول الماتش', icon: '⚡' },
  { id: 'PITCH_SKIN', label: 'شكل تشكيلتك', hint: 'صورة أرضية الملعب (نسبة 3:4 طولي). ارفع نسخة 11 لاعب، ويمكن تضيف نسخة 5 لاعبين بعد الرفع', icon: '🏟️' }
];

/** تصغير الصورة قبل الرفع (مع الحفاظ على الشفافية) عشان تتحمل بسرعة عند اللاعبين. */
async function optimise(file: File, category: MarketCategory): Promise<File> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = category === 'PITCH_SKIN' ? 1200 : category === 'ENTRANCE' ? 800 : 512;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    const ctx = c.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/webp', 0.9));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

const cleanName = (fn: string) => fn.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'عنصر جديد';

export const AdminMarketTab: React.FC = () => {
  const [cat, setCat] = useState<MarketCategory | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState('500');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (c: MarketCategory) => {
    const client = getSupabaseClient();
    if (!client) return;
    setLoading(true);
    const { data, error } = await client.from('market_items').select('*').eq('category', c).order('sort_order').order('created_at');
    if (error) setErr('تعذر تحميل العناصر — اتأكد إنك شغّلت ملف SQL الجديد.');
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (cat) void load(cat);
  }, [cat]);

  const uploadFile = async (rawFile: File, tag: string): Promise<string> => {
    const client = getSupabaseClient();
    if (!client) throw new Error('NO_CLIENT');
    const file = await optimise(rawFile, (cat || 'AVATAR_FRAME') as MarketCategory);
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${tag}_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
    const { error } = await client.storage.from('market-items').upload(path, file, { cacheControl: '31536000', upsert: false });
    if (error) throw error;
    return client.storage.from('market-items').getPublicUrl(path).data.publicUrl;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length || !cat) return;
    const client = getSupabaseClient();
    if (!client) return;
    const p = Math.max(0, Math.round(Number(price) || 0));
    const list = Array.from(files);
    setErr(null);
    setProgress({ done: 0, total: list.length });
    // دفعات من 3 ملفات لتفادي الأخطاء
    for (let i = 0; i < list.length; i += 3) {
      const chunk = list.slice(i, i + 3);
      await Promise.all(
        chunk.map(async (f) => {
          try {
            const url = await uploadFile(f, cat.toLowerCase());
            const { error } = await client.from('market_items').insert({
              category: cat,
              name_ar: cleanName(f.name),
              price: p,
              image_url: url,
              scale: cat === 'AVATAR_FRAME' ? 1.3 : 1,
              sort_order: Date.now() % 1000000
            });
            if (error) throw error;
          } catch {
            setErr('بعض الملفات فشل رفعها — جرّب تاني للملفات دي.');
          } finally {
            setProgress((pr) => (pr ? { ...pr, done: pr.done + 1 } : pr));
          }
        })
      );
    }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = '';
    await load(cat);
    void refreshMarketCatalog();
  };

  const patch = async (id: string, values: Partial<Row>) => {
    const client = getSupabaseClient();
    if (!client || !cat) return;
    setSavingId(id);
    const { error } = await client.from('market_items').update(values).eq('id', id);
    if (error) setErr('فشل الحفظ.');
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...values } : x)));
    setSavingId(null);
    void refreshMarketCatalog();
  };

  const remove = async (id: string) => {
    if (!confirm('تحذف العنصر ده نهائياً؟')) return;
    const client = getSupabaseClient();
    if (!client) return;
    await client.from('market_items').delete().eq('id', id);
    setRows((r) => r.filter((x) => x.id !== id));
    void refreshMarketCatalog();
  };

  const uploadAlt = async (row: Row, file: File) => {
    try {
      setSavingId(row.id);
      const url = await uploadFile(file, 'pitch5');
      await patch(row.id, { image_url_alt: url });
    } catch {
      setErr('فشل رفع نسخة 5 لاعبين.');
      setSavingId(null);
    }
  };

  if (!cat) {
    return (
      <div className="space-y-5" dir="rtl">
        <div>
          <h2 className="text-lg font-black text-white">السوق</h2>
          <p className="text-xs text-zinc-500">اختار نوع العنصر أولاً، وبعدين ارفع الصور وحدد السعر.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATS.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className="text-right bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 rounded-2xl p-5 transition-colors cursor-pointer">
              <div className="text-3xl mb-2">{c.icon}</div>
              <div className="text-sm font-black text-white">{c.label}</div>
              <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{c.hint}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const meta = CATS.find((c) => c.id === cat)!;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => { setCat(null); setErr(null); }} className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 cursor-pointer">
          <ArrowRight className="w-3.5 h-3.5" /> الأنواع
        </button>
        <div>
          <h2 className="text-lg font-black text-white">{meta.icon} {meta.label}</h2>
          <p className="text-[11px] text-zinc-500">{meta.hint}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-zinc-400 mb-1">السعر (كوينز) — بيتطبق على كل الصور المرفوعة الآن</label>
          <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white outline-none" />
        </div>
        <label className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black cursor-pointer ${progress ? 'opacity-60 pointer-events-none' : ''}`}>
          {progress ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          <span>{progress ? `بيترفع ${progress.done}/${progress.total}` : 'ارفع الصور'}</span>
          <input ref={fileRef} type="file" accept="image/png,image/webp,image/gif,image/jpeg" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
        </label>
      </div>

      {err && <div className="text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">{err}</div>}

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mt-8" />
      ) : rows.length === 0 ? (
        <div className="text-center text-xs text-zinc-600 py-10">لسه مفيش عناصر في النوع ده.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <div key={r.id} className={`bg-zinc-900 border rounded-2xl p-3 space-y-2.5 ${r.is_active ? 'border-zinc-800' : 'border-zinc-800 opacity-60'}`}>
              <div className="h-32 rounded-xl bg-[repeating-conic-gradient(#18181b_0%_25%,#27272a_0%_50%)] bg-[length:16px_16px] flex items-center justify-center overflow-hidden">
                <img src={r.image_url} alt="" className={`max-h-full max-w-full ${cat === 'PITCH_SKIN' ? 'object-cover w-full h-full' : 'object-contain'}`} />
              </div>
              <input
                defaultValue={r.name_ar}
                onBlur={(e) => e.target.value !== r.name_ar && void patch(r.id, { name_ar: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
              />
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 shrink-0">السعر</label>
                <input
                  type="number"
                  min={0}
                  defaultValue={r.price}
                  onBlur={(e) => Number(e.target.value) !== r.price && void patch(r.id, { price: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-black outline-none"
                />
              </div>
              {cat === 'AVATAR_FRAME' && (
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-zinc-500 shrink-0">حجم الإطار</label>
                  <input
                    type="number"
                    step="0.05"
                    min={1}
                    max={2}
                    defaultValue={r.scale}
                    onBlur={(e) => patch(r.id, { scale: Math.min(2, Math.max(1, Number(e.target.value) || 1.3)) })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              )}
              {cat === 'PITCH_SKIN' && (
                <label className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 text-[11px] font-bold text-zinc-300 cursor-pointer">
                  <ImagePlus className="w-3.5 h-3.5" />
                  {r.image_url_alt ? 'استبدال نسخة 5 لاعبين ✓' : 'إضافة نسخة 5 لاعبين'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void uploadAlt(r, e.target.files[0])} />
                </label>
              )}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => void patch(r.id, { is_active: !r.is_active })} className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-white cursor-pointer">
                  {r.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} {r.is_active ? 'ظاهر في السوق' : 'مخفي'}
                </button>
                <div className="flex items-center gap-2">
                  {savingId === r.id && <Save className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                  <button onClick={() => void remove(r.id)} className="text-rose-400 hover:text-rose-300 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
