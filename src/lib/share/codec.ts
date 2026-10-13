import {
  MAX_JSON_BYTES,
  toPortable,
  type PortablePlan,
} from "@/lib/schema/plan";
import { parseImport } from "@/lib/schema/import";
const MAX_TOKEN = 180_000;
async function readLimited(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > MAX_JSON_BYTES) throw new Error("Снимок больше 1 МБ.");
      chunks.push(item.value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function encodeShare(plan: PortablePlan): Promise<string> {
  if (typeof CompressionStream === "undefined")
    throw new Error(
      "Этот браузер не поддерживает сжатие. Экспортируйте JSON или обновите браузер.",
    );
  const raw = JSON.stringify(toPortable(plan));
  if (new TextEncoder().encode(raw).length > MAX_JSON_BYTES)
    throw new Error("План больше 1 МБ.");
  const bytes = await readLimited(
    new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip")),
  );
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const token = btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  if (token.length > MAX_TOKEN)
    throw new Error("Ссылка слишком длинная. Передайте план файлом JSON.");
  return token;
}
export async function decodeShare(token: string): Promise<PortablePlan> {
  if (typeof DecompressionStream === "undefined")
    throw new Error("Обновите браузер для открытия сжатого снимка.");
  if (!token || token.length > MAX_TOKEN || !/^[A-Za-z0-9_-]+$/.test(token))
    throw new Error("Некорректная или слишком длинная ссылка.");
  try {
    const bytes = Uint8Array.from(
      atob(token.replaceAll("-", "+").replaceAll("_", "/")),
      (c) => c.charCodeAt(0),
    );
    const raw = await readLimited(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
    );
    return parseImport(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  } catch (error) {
    throw new Error(
      `Не удалось открыть снимок: ${error instanceof Error ? error.message : "повреждённые данные"}`,
    );
  }
}
