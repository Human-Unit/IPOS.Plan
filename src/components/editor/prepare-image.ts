import {
  MAX_INLINE_IMAGE_BYTES,
  inlineRasterSchema,
} from "@/lib/schema/image-source";

/** Decode and re-encode user pixels, never store an SVG or a temporary Blob URL. */
export async function prepareImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Выберите PNG, JPEG или WebP.");
  if (file.size > 8_000_000)
    throw new Error("Исходное изображение должно быть меньше 8 МБ.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 25_000_000)
      throw new Error("Изображение слишком большое: максимум 25 мегапикселей.");
    const canvas = document.createElement("canvas");
    for (const edge of [1280, 960, 720, 480]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx)
        throw new Error("Браузер не поддерживает обработку изображений.");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.65, 0.45]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (blob && blob.size <= MAX_INLINE_IMAGE_BYTES) {
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let binary = "";
          for (const byte of bytes) binary += String.fromCharCode(byte);
          return inlineRasterSchema.parse(
            `data:${blob.type};base64,${btoa(binary)}`,
          );
        }
      }
    }
    throw new Error(
      "Не удалось уменьшить изображение до 64 КБ. Выберите меньший файл или внешний URL.",
    );
  } finally {
    bitmap.close();
  }
}
