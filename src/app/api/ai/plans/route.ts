import { NextRequest, NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/admin/auth";
import {
  aiWorkspaceConfigured, createCloudPlan, listCloudPlans,
} from "@/lib/ai-workspace/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 1_500_000;

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Нужен вход в админку." }, { status: 401, headers: noStore });
  if (!aiWorkspaceConfigured()) return NextResponse.json({ error: "Облачное хранилище не настроено." }, { status: 503, headers: noStore });
  try {
    const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
    if (cursor && cursor.length > 2000)
      return NextResponse.json({ error: "Некорректный cursor." }, { status: 400, headers: noStore });
    return NextResponse.json(await listCloudPlans(cursor), { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Не удалось получить список планов." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Нужен вход в админку." }, { status: 401, headers: noStore });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Недопустимое происхождение запроса." }, { status: 403, headers: noStore });
  if (!aiWorkspaceConfigured()) return NextResponse.json({ error: "Облачное хранилище не настроено." }, { status: 503, headers: noStore });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    return NextResponse.json({ error: "Ожидается JSON." }, { status: 415, headers: noStore });
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES)
    return NextResponse.json({ error: "План слишком большой." }, { status: 413, headers: noStore });
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES)
      return NextResponse.json({ error: "План слишком большой." }, { status: 413, headers: noStore });
    const body = JSON.parse(raw) as { document?: unknown };
    const record = await createCloudPlan(body.document);
    return NextResponse.json(record, { status: 201, headers: noStore });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Не удалось сохранить план.",
    }, { status: 400, headers: noStore });
  }
}
