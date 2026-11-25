import { NextRequest, NextResponse } from "next/server";
import {
  isConfigured, mayManage, publicData,
  publicationId, readPublication, removePublication, updatePublication,
} from "@/lib/publications/server";

import { publicationHeaders, publicationWriteError, readPublicationInput } from "@/lib/publications/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

async function load(params: RouteContext["params"]) {
  const { id } = await params;
  if (!publicationId.test(id)) return null;
  return readPublication(id);
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  if (!isConfigured()) return NextResponse.json({ error: "Публикация временно недоступна." }, { status: 503, headers: publicationHeaders });
  try {
    const publication = await load(params);
    if (!publication) return NextResponse.json({ error: "Страница не найдена или снята с публикации." }, { status: 404, headers: publicationHeaders });
    return NextResponse.json(publicData(publication.record), { headers: publicationHeaders });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить публикацию." }, { status: 500, headers: publicationHeaders });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!isConfigured()) return NextResponse.json({ error: "Сервис публикаций недоступен." }, { status: 503, headers: publicationHeaders });
  try {
    const publication = await load(params);
    if (!publication) return NextResponse.json({ error: "Публикация не найдена." }, { status: 404, headers: publicationHeaders });
    if (!mayManage(publication.record, request.headers.get("x-ipos-manager-key") || "")) return NextResponse.json({ error: "Нет прав на изменение." }, { status: 403, headers: publicationHeaders });
    const { title, document } = await readPublicationInput(request);
    const updated = await updatePublication(publication.record, publication.etag, title, document);
    return NextResponse.json(updated, { headers: publicationHeaders });
  } catch (error) {
    return publicationWriteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!isConfigured()) return NextResponse.json({ error: "Сервис публикаций недоступен." }, { status: 503, headers: publicationHeaders });
  try {
    const publication = await load(params);
    if (!publication) return NextResponse.json({ error: "Публикация не найдена." }, { status: 404, headers: publicationHeaders });
    if (!mayManage(publication.record, request.headers.get("x-ipos-manager-key") || "")) return NextResponse.json({ error: "Нет прав на удаление." }, { status: 403, headers: publicationHeaders });
    await removePublication(publication.record.id);
    return new Response(null, { status: 204, headers: publicationHeaders });
  } catch {
    return NextResponse.json({ error: "Не удалось снять с публикации." }, { status: 500, headers: publicationHeaders });
  }
}
