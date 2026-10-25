import { NextRequest, NextResponse } from "next/server";
import { cleanTitle, createPublication, isConfigured, isPublisher, parseDocument } from "@/lib/publications/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isConfigured()) return NextResponse.json({ error: "Публикация на сервере не настроена." }, { status: 503 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return NextResponse.json({ error: "Требуется JSON." }, { status: 415 });
  if (Number(request.headers.get("content-length") || 0) > 1_500_000) return NextResponse.json({ error: "Снимок слишком большой." }, { status: 413 });
  const accessKey = request.headers.get("x-ipos-publish-key") ?? "";
  if (!isPublisher(accessKey)) return NextResponse.json({ error: "Неверный код публикации." }, { status: 403 });
  try {
    const body = await request.json();
    const title = cleanTitle(body.title);
    const document = parseDocument(body.document);
    const result = await createPublication(title, typeof body.slug === "string" ? body.slug.slice(0, 140) : title, document);
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось опубликовать документ.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
