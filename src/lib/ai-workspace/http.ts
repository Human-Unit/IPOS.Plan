import { NextResponse } from "next/server";
import { z } from "zod";

export const maxRequestBytes = 1_500_000;
export const privateHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export const expectedVersion = z.number().int().positive();
export const requestKey = z.string().min(8).max(100);

export class WorkspaceError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export function workspaceError(error: unknown): WorkspaceError {
  return error instanceof WorkspaceError
    ? error
    : new WorkspaceError(503, "Хранилище временно недоступно. Повторите позже.");
}

export function httpError(error: unknown) {
  const { status, message } = workspaceError(error);
  return NextResponse.json({ error: message }, { status, headers: privateHeaders });
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    throw new WorkspaceError(415, "Ожидается application/json.");
  if (Number(request.headers.get("content-length")) > maxRequestBytes)
    throw new WorkspaceError(413, "Запрос слишком большой.");
  const reader = request.body?.getReader();
  if (!reader) throw new WorkspaceError(400, "Нужно передать JSON.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let raw = "";
  let value: unknown;
  try {
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      bytes += chunk.byteLength;
      if (bytes > maxRequestBytes) {
        void reader.cancel().catch(() => undefined);
        throw new WorkspaceError(413, "Запрос слишком большой.");
      }
      raw += decoder.decode(chunk, { stream: true });
    }
    value = JSON.parse(raw + decoder.decode());
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    throw new WorkspaceError(400, "Некорректный JSON.");
  } finally {
    reader.releaseLock();
  }
  const result = schema.safeParse(value);
  if (!result.success) throw new WorkspaceError(400, "Проверьте поля запроса.");
  return result.data;
}
