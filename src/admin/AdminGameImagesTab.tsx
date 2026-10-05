import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import { invalidateGameImagesCache } from '../services/gameImagesRepository';
import { ImagePlus, Loader2, CheckCircle2 } from 'lucide-react';

const SLOT_LABELS: Record<number, string> = {
  1: '1 — المزاد',
  2: '2 — تاخد اللاعب ولا الخفي',
  3: '3 — الحوارتجي',
  4: '4 — خمن اللاعب',
  5: '5 — تصفية سريعة',
  6: '6 — أنت المدرب',
  7: '7 — ديل أور نو ديل'
};

export const AdminGameImagesTab: React.FC = () => {
  const [slots, setSlots] = useState<Record<number, string | null>>({});
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [savedSlot, setSavedSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }
    client
      .from('game_images')
      .select('slot, image_url')
      .then(({ data }) => {
        const map: Record<number, string | null> = {};
        (data || []).forEach((row: { slot: number; image_url: string | null }) => {
          map[row.slot] = row.image_url;
        });
        setSlots(map);
        setLoading(false);
      });
  }, []);

  const handleUpload = async (slot: number, file: File) => {
    const client = getSupabaseClient();
    if (!client) return;

    setUploadingSlot(slot);
    setSavedSlot(null);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `slot_${slot}_${Date.now()}.${ext}`;
      const { error: uploadError } = await client.storage.from('game-images').upload(path, file, {
        cacheControl: '31536000',
        upsert: false
      });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = client.storage.from('game-images').getPublicUrl(path);

      const { error: upsertError } = await client
        .from('game_images')
        .upsert({ slot, image_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() });
      if (upsertError) throw upsertError;

      setSlots((prev) => ({ ...prev, [slot]: publicUrlData.publicUrl }));
      invalidateGameImagesCache();
      setSavedSlot(slot);
    } catch {
      // Non-fatal — the admin can just retry the upload.
    } finally {
      setUploadingSlot(null);
    }
  };

  if (loading) {
    return <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mt-10" />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-black text-white">صور الألعاب</h2>
        <p className="text-xs text-zinc-500">كل صورة بتستبدل الشكل الافتراضي لهذه اللعبة في الصفحة الرئيسية فورًا.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7].map((slot) => (
          <div key={slot} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-black text-amber-400">{SLOT_LABELS[slot]}</div>
            <div className="w-full h-32 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">
              {slots[slot] ? (
                <img src={slots[slot] as string} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] text-zinc-600">لسه مفيش صورة</span>
              )}
            </div>
            <label className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer transition-colors">
              {uploadingSlot === slot ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedSlot === slot ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              <span>{slots[slot] ? 'استبدال الصورة' : 'رفع صورة'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(slot, file);
                }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
