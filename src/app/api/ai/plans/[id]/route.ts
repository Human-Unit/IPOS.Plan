import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, sameOrigin } from "@/lib/admin/auth";
import { cloudPlanId } from "@/lib/ai-workspace/model";
import { aiWorkspaceConfigured, getCloudPlan, publicPlan, updateCloudPlan } from "@/lib/ai-workspace/server";
import { expectedVersion, httpError, privateHeaders, readJson, WorkspaceError } from "@/lib/ai-workspace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

const updateInput = z.strictObject({ expectedVersion, document: z.record(z.string(), z.unknown()) });

async function authorizedId(request: NextRequest, context: Context) {
  if (!(await isAdmin())) throw new WorkspaceError(401, "Нужен вход в админку.");
  if (request.method === "PUT" && !sameOrigin(request))
    throw new WorkspaceError(403, "Недопустимое происхождение запроса.");
  if (!aiWorkspaceConfigured()) throw new WorkspaceError(503, "Облачное хранилище не настроено.");
  const { id } = await context.params;
  if (!cloudPlanId.safeParse(id).success) throw new WorkspaceError(400, "Неверный ID плана.");
  return id;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const plan = await getCloudPlan(await authorizedId(request, context));
    if (!plan) throw new WorkspaceError(404, "План не найден.");
    return NextResponse.json(publicPlan(plan.record), { headers: privateHeaders });
  } catch (error) {
    return httpError(error);
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const id = await authorizedId(request, context);
    const { expectedVersion, document } = await readJson(request, updateInput);
    const updated = await updateCloudPlan(id, expectedVersion, document);
    if (!updated) throw new WorkspaceError(404, "План не найден.");
    return NextResponse.json(updated, { headers: privateHeaders });
  } catch (error) {
    return httpError(error);
  }
}
