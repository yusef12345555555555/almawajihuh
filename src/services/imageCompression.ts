// ============================================================
// Compresses a photo client-side (resize + re-encode) right before it's
// uploaded. This is what actually fixes two complaints at once:
//   1) publishing a batch in the admin panel being painfully slow (uploading
//      multi-MB originals one by one)
//   2) player cards loading slowly/popping-in mid-game (downloading those
//      same multi-MB originals on every device, every time)
// A 1600×1600 JPEG at 82% quality looks identical on a card and is
// typically 10-30× smaller than a raw phone photo.
// ============================================================

export async function compressImageForUpload(
  file: File,
  maxDim = 1000,
  quality = 0.82,
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
    if (!blob || blob.size === 0) return file;
    // Only use the compressed version if it's actually smaller — never make things worse.
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch {
    // Any failure (unsupported format, decode error) — just upload the original.
    return file;
  }
}


/**
 * يحوّل صورة اللاعب لمربع صغير (افتراضي 192px) بصيغة data URL خفيفة (~10-15KB)
 * عشان تتخزن في ملف اللاعب وتظهر لكل اللاعبين بدون رفع ملفات ولا تقطيع.
 */
export async function fileToAvatarDataUrl(file: File, size = 192, quality = 0.74): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.round((bitmap.width - side) / 2);
  const sy = Math.round((bitmap.height - side) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('NO_CANVAS');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', quality);
}
