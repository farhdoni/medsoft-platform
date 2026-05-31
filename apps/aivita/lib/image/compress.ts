'use client';

/**
 * On-device image compression. Runs entirely in the browser/WebView via canvas,
 * so full-resolution camera photos (often 3–12 MB) are resized and re-encoded
 * before upload — cutting bandwidth and server/AI processing by ~20–40×.
 * Any failure or non-image input falls back to the original, so callers are safe.
 */

export interface CompressOptions {
  /** Longest edge in pixels (image is scaled down to fit). */
  maxSide?: number;
  /** JPEG quality, 0..1. */
  quality?: number;
  /** Output MIME type. */
  mimeType?: string;
}

const DEFAULTS = { maxSide: 1280, quality: 0.72, mimeType: 'image/jpeg' };

/** Compress + resize an image File to a data URL. Non-images / failures return the original as a data URL. */
export function compressImageToDataUrl(file: File, opts: CompressOptions = {}): Promise<string> {
  const { maxSide, quality, mimeType } = { ...DEFAULTS, ...opts };
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      readAsDataUrl(file).then(resolve).catch(() => resolve(''));
      return;
    }
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        if (width >= height) { height = Math.round((height * maxSide) / width); width = maxSide; }
        else { width = Math.round((width * maxSide) / height); height = maxSide; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { readAsDataUrl(file).then(resolve).catch(() => resolve('')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      try { resolve(canvas.toDataURL(mimeType, quality)); }
      catch { readAsDataUrl(file).then(resolve).catch(() => resolve('')); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); readAsDataUrl(file).then(resolve).catch(() => resolve('')); };
    img.src = url;
  });
}

/** Compress + resize an image File and return a new (smaller) File. Non-images, failures, or already-smaller results return the original File. */
export async function compressImageFile(file: File, opts: CompressOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  const { mimeType } = { ...DEFAULTS, ...opts };
  try {
    const dataUrl = await compressImageToDataUrl(file, opts);
    if (!dataUrl) return file;
    const blob = await (await fetch(dataUrl)).blob();
    if (blob.size === 0 || blob.size >= file.size) return file;
    const name = file.name.replace(/\.\w+$/, '') + '.jpg';
    return new File([blob], name, { type: mimeType, lastModified: Date.now() });
  } catch {
    return file;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
