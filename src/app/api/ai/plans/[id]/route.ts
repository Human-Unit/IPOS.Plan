import { NextRequest, NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/admin/auth";
import { cloudPlanId } from "@/lib/ai-workspace/model";
import {
  aiWorkspaceConfigured, CloudPlanConflict, getCloudPlan, updateCloudPlan,
} from "@/lib/ai-workspace/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const noStore = { "Cache-Control": "no-store" };

export async function GET(_request: NextRequest, { params }: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Нужен вход в админку." }, { status: 401, headers: noStore });
  if (!aiWorkspaceConfigured()) return NextResponse.json({ error: "Облачное хранилище не настроено." }, { status: 503, headers: noStore });
  const { id } = await params;
  if (!cloudPlanId.safeParse(id).success)
    return NextResponse.json({ error: "Неверный ID плана." }, { status: 400, headers: noStore });
  try {
    const plan = await getCloudPlan(id);
    return plan
      ? NextResponse.json(plan.record, { headers: noStore })
      : NextResponse.json({ error: "План не найден." }, { status: 404, headers: noStore });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить план." }, { status: 500, headers: noStore });
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Нужен вход в админку." }, { status: 401, headers: noStore });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Недопустимое происхождение запроса." }, { status: 403, headers: noStore });
  if (!aiWorkspaceConfigured()) return NextResponse.json({ error: "Облачное хранилище не настроено." }, { status: 503, headers: noStore });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    return NextResponse.json({ error: "Ожидается JSON." }, { status: 415, headers: noStore });
  if (Number(request.headers.get("content-length") || 0) > 1_500_000)
    return NextResponse.json({ error: "План слишком большой." }, { status: 413, headers: noStore });
  const { id } = await params;
  if (!cloudPlanId.safeParse(id).success)
    return NextResponse.json({ error: "Неверный ID плана." }, { status: 400, headers: noStore });
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1_500_000)
      return NextResponse.json({ error: "План слишком большой." }, { status: 413, headers: noStore });
    const body = JSON.parse(raw) as { expectedVersion?: number; document?: unknown };
    const updated = await updateCloudPlan(id, body.expectedVersion!, body.document);
    return updated
      ? NextResponse.json(updated, { headers: noStore })
      : NextResponse.json({ error: "План не найден." }, { status: 404, headers: noStore });
  } catch (error) {
    if (error instanceof CloudPlanConflict)
      return NextResponse.json({ error: error.message }, { status: 409, headers: noStore });
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Не удалось обновить план.",
    }, { status: 400, headers: noStore });
  }
}
