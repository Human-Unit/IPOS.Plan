import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, sameOrigin } from "@/lib/admin/auth";
import { aiWorkspaceConfigured, createCloudPlan, listCloudPlans } from "@/lib/ai-workspace/server";
import { httpError, privateHeaders, readJson, requestKey, WorkspaceError } from "@/lib/ai-workspace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createInput = z.strictObject({
  document: z.record(z.string(), z.unknown()),
  idempotencyKey: requestKey.optional(),
});

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) throw new WorkspaceError(401, "Нужен вход в админку.");
    if (!aiWorkspaceConfigured()) throw new WorkspaceError(503, "Облачное хранилище не настроено.");
    const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
    if (cursor && cursor.length > 2000) throw new WorkspaceError(400, "Некорректный курсор.");
    return NextResponse.json(await listCloudPlans(cursor), { headers: privateHeaders });
  } catch (error) {
    return httpError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) throw new WorkspaceError(401, "Нужен вход в админку.");
    if (!sameOrigin(request)) throw new WorkspaceError(403, "Недопустимое происхождение запроса.");
    if (!aiWorkspaceConfigured()) throw new WorkspaceError(503, "Облачное хранилище не настроено.");
    const { document, idempotencyKey } = await readJson(request, createInput);
    const record = await createCloudPlan(document, idempotencyKey ? "browser:" + idempotencyKey : undefined);
    return NextResponse.json(record, { status: 201, headers: privateHeaders });
  } catch (error) {
    return httpError(error);
  }
}
