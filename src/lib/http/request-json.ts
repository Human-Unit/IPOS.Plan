export const maxDocumentRequestBytes = 1_500_000;

export class JsonBodyError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "JsonBodyError";
  }
}

export async function readBoundedJson(request: Request, limit: number): Promise<unknown> {
  const mediaType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json")
    throw new JsonBodyError(415, "Ожидается application/json.");
  if (Number(request.headers.get("content-length")) > limit)
    throw new JsonBodyError(413, "Запрос слишком большой.");
  const reader = request.body?.getReader();
  if (!reader) throw new JsonBodyError(400, "Нужно передать JSON.");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let raw = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        void reader.cancel().catch(() => undefined);
        throw new JsonBodyError(413, "Запрос слишком большой.");
      }
      raw += decoder.decode(value, { stream: true });
    }
    return JSON.parse(raw + decoder.decode());
  } catch (error) {
    if (error instanceof JsonBodyError) throw error;
    void reader.cancel().catch(() => undefined);
    throw new JsonBodyError(400, "Некорректный JSON.");
  } finally {
    reader.releaseLock();
  }
}
