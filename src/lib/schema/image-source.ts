import { z } from "zod";

export const MAX_INLINE_IMAGE_BYTES = 65_536;
export const inlineRasterSchema = z
  .string()
  .max(90_000)
  .refine((value) => {
    const match =
      /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) return false;
    try {
      const bytes = atob(match[2]);
      if (!bytes.length || bytes.length > MAX_INLINE_IMAGE_BYTES) return false;
      return match[1] === "png"
        ? bytes.startsWith("\x89PNG\r\n\x1a\n")
        : match[1] === "jpeg"
          ? bytes.startsWith("\xff\xd8\xff")
          : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
    } catch {
      return false;
    }
  }, "Нужен небольшой PNG, JPEG или WebP до 64 КБ. SVG и временные blob-ссылки не поддерживаются.");

export function isInlineImage(value: string) {
  return value.startsWith("data:image/");
}
