import { NextResponse } from "next/server";
import { z } from "zod";

import { JsonBodyError, maxDocumentRequestBytes, readBoundedJson } from "@/lib/http/request-json";

export const maxRequestBytes = maxDocumentRequestBytes;
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
  let value: unknown;
  try {
    value = await readBoundedJson(request, maxRequestBytes);
  } catch (error) {
    if (error instanceof JsonBodyError) throw new WorkspaceError(error.status, error.message);
    throw error;
  }
  const result = schema.safeParse(value);
  if (!result.success) throw new WorkspaceError(400, "Проверьте поля запроса.");
  return result.data;
}
