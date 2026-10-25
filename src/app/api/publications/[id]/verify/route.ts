import { NextRequest, NextResponse } from "next/server";
import { isConfigured, mayManage, publicationId, readPublication } from "@/lib/publications/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) return NextResponse.json({ error: "Сервис недоступен." }, { status: 503 });
  const { id } = await params;
  if (!publicationId.test(id)) return NextResponse.json({ error: "Неверный адрес." }, { status: 400 });
  try {
    const page = await readPublication(id);
    if (!page) return NextResponse.json({ error: "Публикация не найдена." }, { status: 404 });
    if (!mayManage(page.record, request.headers.get("x-ipos-manager-key") || ""))
      return NextResponse.json({ error: "Неверный ключ управления." }, { status: 403 });
    return NextResponse.json({ title: page.record.title }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Проверка ключа не удалась." }, { status: 500 });
  }
}
