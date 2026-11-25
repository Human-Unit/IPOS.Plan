import { NextResponse } from "next/server";
import { z } from "zod";
import { JsonBodyError, maxDocumentRequestBytes, readBoundedJson } from "@/lib/http/request-json";
import { recordSecurityEvent } from "@/lib/http/security-event";
import { cleanTitle, parseDocument, PublicationConflictError } from "./server";

export const publicationHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const publicationInput = z.object({ title: z.string(), slug: z.unknown().optional(), document: z.unknown() });

export async function readPublicationInput(request: Request) {
  const value = await readBoundedJson(request, maxDocumentRequestBytes);
  const parsed = publicationInput.safeParse(value);
  if (!parsed.success) throw new JsonBodyError(400, "Проверьте поля публикации.");

  const { title, slug, document } = parsed.data;
  if (!title.trim() || title.length > 140) {
    throw new JsonBodyError(400, "Название должно содержать от 1 до 140 символов.");
  }
  try {
    return {
      title: cleanTitle(title),
      slug: typeof slug === "string" ? slug.slice(0, 140) : title.trim(),
      document: parseDocument(document),
    };
  } catch {
    throw new JsonBodyError(400, "Документ не соответствует формату плана или превышает 1 МБ.");
  }
}

export function publicationWriteError(error: unknown) {
  if (error instanceof JsonBodyError || error instanceof PublicationConflictError) {
    const status = error instanceof JsonBodyError ? error.status : 409;
    return NextResponse.json({ error: error.message }, { status, headers: publicationHeaders });
  }
  recordSecurityEvent("publication_write_failed");
  return NextResponse.json({ error: "Сервис публикаций временно недоступен. Повторите позже." }, {
    status: 503, headers: publicationHeaders,
  });
}
