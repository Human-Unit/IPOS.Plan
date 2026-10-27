import { NextRequest, NextResponse } from "next/server";
import {
  cleanTitle, isConfigured, mayManage, parseDocument, publicData,
  publicationId, readPublication, removePublication, updatePublication, PublicationConflictError,
} from "@/lib/publications/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };
const noStore = { "Cache-Control": "no-store" };

async function load(params: RouteContext["params"]) {
  const { id } = await params;
  if (!publicationId.test(id)) return null;
  return readPublication(id);
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  if (!isConfigured()) return NextResponse.json({ error: "Публикация временно недоступна." }, { status: 503, headers: noStore });
  try {
    const publication = await load(params);
    if (!publication) return NextResponse.json({ error: "Страница не найдена или снята с публикации." }, { status: 404, headers: noStore });
    return NextResponse.json(publicData(publication.record), { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить публикацию." }, { status: 500, headers: noStore });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!isConfigured()) return NextResponse.json({ error: "Сервис публикаций недоступен." }, { status: 503 });
  if (Number(request.headers.get("content-length") || 0) > 1_500_000) return NextResponse.json({ error: "Снимок слишком большой." }, { status: 413 });
  try {
    const publication = await load(params);
    if (!publication) return NextResponse.json({ error: "Публикация не найдена." }, { status: 404 });
    if (!mayManage(publication.record, request.headers.get("x-ipos-manager-key") || "")) return NextResponse.json({ error: "Нет прав на изменение." }, { status: 403 });
    const body = await request.json();
    const title = cleanTitle(body.title);
    const document = parseDocument(body.document);
    const updated = await updatePublication(publication.record, publication.etag, title, document);
    return NextResponse.json(updated, { headers: noStore });
  } catch (error) {
    if (error instanceof PublicationConflictError)
      return NextResponse.json({ error: error.message }, { status: 409, headers: noStore });
    const message = error instanceof Error ? error.message : "Не удалось обновить публикацию.";
    if (/etag mismatch|precondition failed/i.test(message))
      return NextResponse.json({ error: "Страница была изменена одновременно с вашим запросом. Проверьте её и попробуйте ещё раз. Локальный план не затронут." }, { status: 409, headers: noStore });
    return NextResponse.json({ error: message }, { status: 400, headers: noStore });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!isConfigured()) return NextResponse.json({ error: "Сервис публикаций недоступен." }, { status: 503 });
  try {
    const publication = await load(params);
    if (!publication) return NextResponse.json({ error: "Публикация не найдена." }, { status: 404 });
    if (!mayManage(publication.record, request.headers.get("x-ipos-manager-key") || "")) return NextResponse.json({ error: "Нет прав на удаление." }, { status: 403 });
    await removePublication(publication.record.id);
    return new Response(null, { status: 204, headers: noStore });
  } catch {
    return NextResponse.json({ error: "Не удалось снять с публикации." }, { status: 500 });
  }
}
