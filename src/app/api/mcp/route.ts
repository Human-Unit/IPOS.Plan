import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cloudPlanId } from "@/lib/ai-workspace/model";
import { mcpAuthorized, mcpOriginAllowed } from "@/lib/ai-workspace/mcp-auth";
import { createCloudPlan, getCloudPlan, listCloudPlans, updateCloudPlan, CloudPlanConflict, aiWorkspaceConfigured } from "@/lib/ai-workspace/server";
import { toPortable, webUrl } from "@/lib/schema/plan";
import { taskSchema } from "@/lib/schema/task";
import type { PortablePlan } from "@/lib/schema/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});
const problem = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});
const rpc = (id: string | number | null, result: unknown) =>
  NextResponse.json({ jsonrpc: "2.0", id, result }, { headers });
const fail = (id: string | number | null, code: number, message: string, status = 200) =>
  NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status, headers });

const listInput = z.object({ cursor: z.string().max(2000).optional() }).strict();
const getInput = z.object({ planId: cloudPlanId }).strict();
const createInput = z.object({ title: z.string().trim().min(1).max(500) }).strict();
const addInput = z.object({
  planId: cloudPlanId,
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(100),
  title: z.string().trim().min(1).max(500),
  description: z.string().max(10000).optional(),
  assignee: z.string().max(200).optional(),
  deadline: z.iso.date().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  referenceUrl: webUrl.optional(),
}).strict();
const taskPatch = taskSchema.pick({
  title: true, description: true, status: true, assignee: true,
  deadline: true, priority: true,
}).partial().refine((value) => Object.keys(value).length > 0, "Нужно указать изменение.");
const updateInput = z.object({
  planId: cloudPlanId, taskId: z.string().min(1).max(100),
  expectedVersion: z.number().int().positive(), patch: taskPatch,
}).strict();
const replaceInput = z.object({
  planId: cloudPlanId, expectedVersion: z.number().int().positive(),
  document: z.unknown(),
}).strict();

const idSchema = { type: "string", description: "UUID серверного плана" };
const versionSchema = { type: "integer", minimum: 1, description: "Ожидаемая версия сервера (защита от перезаписи)" };
const tools = [
  {
    name: "ipos_list_plans", description: "Use when you need to discover AI-synced IPOS.Plan documents available to this account. Read-only. Up to 50 records per page.",
    inputSchema: { type: "object", properties: { cursor: { type: "string" } }, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "ipos_get_plan", description: "Use when you need to read one private synced IPOS plan and its current version before editing. Read-only.",
    inputSchema: { type: "object", properties: { planId: idSchema }, required: ["planId"], additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "ipos_create_plan", description: "Use when the user asks to create a NEW cloud IPOS content plan. Does not create a browser-local copy. Confirm the plan title.",
    inputSchema: { type: "object", properties: { title: { type: "string", minLength: 1, maxLength: 500 } }, required: ["title"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "ipos_add_task", description: "Use when the user explicitly asks to add a task or Reel to a synced IPOS plan. Provide a stable unique idempotencyKey to avoid duplicate tasks on retry. No deadline unless given.",
    inputSchema: { type: "object", properties: {
      planId: idSchema, expectedVersion: versionSchema,
      idempotencyKey: { type: "string", minLength: 8, maxLength: 100 },
      title: { type: "string", minLength: 1, maxLength: 500 },
      description: { type: "string", maxLength: 10000 },
      assignee: { type: "string", maxLength: 200 },
      deadline: { type: "string", format: "date", description: "Only if the user supplied a specific deadline" },
      priority: { type: "string", enum: ["low", "medium", "high"] },
      referenceUrl: { type: "string", format: "uri" },
    }, required: ["planId", "expectedVersion", "idempotencyKey", "title"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "ipos_update_task", description: "Use when the user asks to change a task's assignee, status, deadline, text or priority. Must use the latest expectedVersion.",
    inputSchema: { type: "object", properties: {
      planId: idSchema, taskId: { type: "string" }, expectedVersion: versionSchema,
      patch: { type: "object", properties: {
        title: { type: "string" }, description: { type: "string" },
        status: { type: "string", enum: ["todo", "in_progress", "review", "done", "cancelled"] },
        assignee: { type: "string" }, deadline: { type: "string", format: "date" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
      }, additionalProperties: false, minProperties: 1 },
    }, required: ["planId", "taskId", "expectedVersion", "patch"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "ipos_replace_plan", description: "Use when the user explicitly requests replacing the entire synced plan document (all blocks/tasks). Risky: ask for confirmation and get the latest version first. The browser copy is never changed automatically.",
    inputSchema: { type: "object", properties: {
      planId: idSchema, expectedVersion: versionSchema,
      document: { type: "object", description: "Complete PortablePlan schemaVersion 1" },
    }, required: ["planId", "expectedVersion", "document"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  },
];

async function callTool(name: string, args: unknown) {
  switch (name) {
    case "ipos_list_plans": {
      const input = listInput.parse(args ?? {});
      return text(await listCloudPlans(input.cursor));
    }
    case "ipos_get_plan": {
      const { planId } = getInput.parse(args);
      const stored = await getCloudPlan(planId);
      if (!stored) throw new Error("План не найден.");
      return text(stored.record);
    }
    case "ipos_create_plan": {
      const { title } = createInput.parse(args);
      const document: PortablePlan = { schemaVersion: 1, title, blocks: [], tasks: {} };
      const record = await createCloudPlan(document);
      return text({ id: record.id, version: record.version, title: record.document.title });
    }
    case "ipos_add_task": {
      const input = addInput.parse(args);
      const stored = await getCloudPlan(input.planId);
      if (!stored) throw new Error("План не найден.");
      const id = "mcp-" + createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 32);
      if (stored.record.document.tasks[id])
        return text({ id, planId: input.planId, version: stored.record.version, alreadyExists: true });
      if (stored.record.version !== input.expectedVersion) throw new CloudPlanConflict();
      const task = taskSchema.parse({
        id, title: input.title, description: input.description,
        status: "todo", priority: input.priority,
        ...(input.assignee ? { assignee: input.assignee } : {}),
        ...(input.deadline ? { deadline: input.deadline } : {}),
      });
      const blocks: PortablePlan["blocks"] = [
        ...stored.record.document.blocks,
        { id: `block-${id}`, type: "task", props: { taskId: id } },
      ];
      if (input.referenceUrl) blocks.push({
        id: `reference-${id}`, type: "reference",
        props: { url: input.referenceUrl, title: "Референс", note: "Ориентир для съёмки" },
      });
      const document: PortablePlan = {
        ...stored.record.document, blocks,
        tasks: { ...stored.record.document.tasks, [id]: task },
      };
      const updated = await updateCloudPlan(input.planId, input.expectedVersion, toPortable(document));
      if (!updated) throw new Error("План не найден.");
      return text({ id, planId: input.planId, version: updated.version, alreadyExists: false });
    }
    case "ipos_update_task": {
      const input = updateInput.parse(args);
      const stored = await getCloudPlan(input.planId);
      if (!stored) throw new Error("План не найден.");
      if (stored.record.version !== input.expectedVersion) throw new CloudPlanConflict();
      const existing = stored.record.document.tasks[input.taskId];
      if (!existing) throw new Error("Задача не найдена.");
      const updatedTask = taskSchema.parse({ ...existing, ...input.patch });
      const document: PortablePlan = {
        ...stored.record.document,
        tasks: { ...stored.record.document.tasks, [input.taskId]: updatedTask },
      };
      const updated = await updateCloudPlan(input.planId, input.expectedVersion, document);
      if (!updated) throw new Error("План не найден.");
      return text({ planId: input.planId, version: updated.version, task: updatedTask });
    }
    case "ipos_replace_plan": {
      const input = replaceInput.parse(args);
      const result = await updateCloudPlan(input.planId, input.expectedVersion, input.document);
      if (!result) throw new Error("План не найден.");
      return text({ id: result.id, version: result.version, taskCount: Object.keys(result.document.tasks).length });
    }
    default: throw new Error("Неизвестный инструмент.");
  }
}

export async function POST(request: NextRequest) {
  if (!aiWorkspaceConfigured() || !process.env.IPOS_MCP_API_TOKEN || process.env.IPOS_MCP_API_TOKEN.length < 40)
    return NextResponse.json({ error: "MCP не настроен." }, { status: 503, headers });
  if (!mcpOriginAllowed(request.headers.get("origin")))
    return NextResponse.json({ error: "Недопустимый Origin." }, { status: 403, headers });
  if (!mcpAuthorized(request.headers.get("authorization")))
    return NextResponse.json({ error: "Требуется авторизация MCP." }, {
      status: 401, headers: { ...headers, "WWW-Authenticate": 'Bearer realm="IPOS.Plan MCP"' },
    });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    return NextResponse.json({ error: "Ожидается application/json." }, { status: 415, headers });
  if (Number(request.headers.get("content-length") || 0) > 1_500_000)
    return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413, headers });
  let body: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1_500_000)
      return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413, headers });
    body = JSON.parse(raw);
  } catch {
    return fail(null, -32700, "Некорректный JSON.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return fail(null, -32600, "Ожидается JSON-RPC объект.", 400);
  const input = body as Record<string, unknown>;
  const id = (typeof input.id === "number" || typeof input.id === "string") ? input.id : null;
  if (input.jsonrpc !== "2.0" || typeof input.method !== "string")
    return fail(id, -32600, "Некорректный JSON-RPC запрос.", 400);
  if (input.method.startsWith("notifications/")) return new Response(null, { status: 202, headers });
  if (id === null) return fail(null, -32600, "ID запроса обязателен.", 400);
  if (input.method === "initialize") {
    const params = (input.params && typeof input.params === "object") ? input.params as Record<string, unknown> : {};
    const requested = params.protocolVersion;
    const supported = ["2025-03-26", "2025-06-18", "2025-11-25"];
    return rpc(id, {
      protocolVersion: typeof requested === "string" && supported.includes(requested) ? requested : "2025-11-25",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "ipos-plan", version: "0.1.0" },
    });
  }
  if (input.method === "ping") return rpc(id, {});
  if (input.method === "tools/list") return rpc(id, { tools });
  if (input.method === "tools/call") {
    const params = input.params && typeof input.params === "object"
      ? input.params as { name?: unknown; arguments?: unknown } : {};
    if (typeof params.name !== "string")
      return fail(id, -32602, "Не указано имя инструмента.");
    try { return rpc(id, await callTool(params.name, params.arguments)); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка выполнения инструмента.";
      return rpc(id, problem(message));
    }
  }
  return fail(id, -32601, "Метод не поддерживается.");
}

export function GET() {
  return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
}
export function DELETE() {
  return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
}
