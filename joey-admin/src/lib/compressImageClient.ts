/**
 * Shrinks large photos before upload so Storage + preview load faster.
 * Non-images and tiny files are returned unchanged.
 */
export async function compressImageIfNeeded(file: File, maxSide = 1920, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // Skip very small files (already fast to upload)
  if (file.size < 400_000) return file;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) {
        resolve(file);
        return;
      }
      const scale = Math.min(1, maxSide / Math.max(w, h));
      const tw = Math.round(w * scale);
      const th = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, tw, th);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const base = file.name.replace(/\.[^.]+$/, "") || "image";
          const out = new File([blob], `${base}.jpg`, { type: "image/jpeg" });
          resolve(out);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
