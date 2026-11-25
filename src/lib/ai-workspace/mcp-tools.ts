import "server-only";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { cloudPlanId } from "./model";
import { expectedVersion, requestKey, WorkspaceError, workspaceError } from "./http";
import {
  CloudPlanConflict, createCloudPlan, getCloudPlan, hash, listCloudPlans,
  publicPlan, updateCloudPlan,
} from "./server";
import { webUrl, type PortablePlan } from "@/lib/schema/plan";
import { taskSchema } from "@/lib/schema/task";

const title = z.string().trim().min(1).max(500);
const mutation = { planId: cloudPlanId, expectedVersion };
const addTaskInput = z.strictObject({
  ...mutation,
  idempotencyKey: requestKey,
  title,
  description: taskSchema.shape.description,
  assignee: taskSchema.shape.assignee,
  deadline: taskSchema.shape.deadline,
  priority: taskSchema.shape.priority.optional(),
  referenceUrl: webUrl.optional(),
});
const taskPatch = taskSchema.omit({ id: true }).extend({
  title,
  deadline: z.iso.date().nullable(),
}).partial().refine((patch) => Object.keys(patch).length > 0, "Нужно указать изменение.");

const notFound = () => new WorkspaceError(404, "План не найден.");
async function requirePlan(id: string) {
  const stored = await getCloudPlan(id);
  if (!stored) throw notFound();
  return stored.record;
}

async function result(operation: () => Promise<unknown>) {
  try {
    return { content: [{ type: "text" as const, text: JSON.stringify(await operation()) }] };
  } catch (error) {
    const { status, message } = workspaceError(error);
    return {
      isError: true,
      content: [{ type: "text" as const, text: JSON.stringify({ status, message }) }],
    };
  }
}

async function addTask(input: z.infer<typeof addTaskInput>) {
  const id = "mcp-" + hash(input.idempotencyKey).slice(0, 32);
  const task = taskSchema.parse({
    id, title: input.title, description: input.description, assignee: input.assignee,
    deadline: input.deadline, priority: input.priority ?? "medium", status: "todo",
  });
  const fingerprint = hash(JSON.stringify({ task, referenceUrl: input.referenceUrl }));
  function replay(record: Awaited<ReturnType<typeof requirePlan>>) {
    const previous = record.taskRequests?.[id];
    if (previous && previous !== fingerprint)
      throw new WorkspaceError(409, "Ключ уже использован для другого задания.");
    if (previous || Object.hasOwn(record.document.tasks, id))
      return { id, planId: input.planId, version: record.version, alreadyExists: true };
  }
  const stored = await requirePlan(input.planId);
  const existing = replay(stored);
  if (existing) return existing;
  if (stored.version !== input.expectedVersion) throw new CloudPlanConflict();

  const blocks: PortablePlan["blocks"] = [
    ...stored.document.blocks,
    { id: `block-${id}`, type: "task", props: { taskId: id } },
  ];
  if (input.referenceUrl) blocks.push({
    id: `reference-${id}`,
    type: "reference",
    props: { url: input.referenceUrl, title: "Референс", note: "" },
  });
  try {
    const updated = await updateCloudPlan(input.planId, input.expectedVersion, {
      ...stored.document, blocks, tasks: { ...stored.document.tasks, [id]: task },
    }, { id, hash: fingerprint });
    if (!updated) throw notFound();
    return { id, planId: input.planId, version: updated.version, alreadyExists: false };
  } catch (error) {
    if (error instanceof CloudPlanConflict) {
      const concurrent = replay(await requirePlan(input.planId));
      if (concurrent) return concurrent;
    }
    throw error;
  }
}

export function createWorkspaceMcp(canWrite: boolean) {
  const server = new McpServer({ name: "ipos-plan", version: "0.2.0" });
  const read = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };
  const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
  server.registerTool("ipos_list_plans", {
    description: "List private IPOS.Plan documents. Continue with the opaque nextCursor.",
    inputSchema: z.strictObject({ cursor: z.string().min(1).max(2000).optional() }),
    annotations: read,
  }, ({ cursor }) => result(() => listCloudPlans(cursor)));

  server.registerTool("ipos_get_plan", {
    description: "Read a private schemaVersion 1 plan and its current version before editing.",
    inputSchema: z.strictObject({ planId: cloudPlanId }),
    annotations: read,
  }, ({ planId }) => result(async () => publicPlan(await requirePlan(planId))));

  if (!canWrite) return server;

  server.registerTool("ipos_create_plan", {
    description: "Create an empty private server plan the user requested. Reuse the same key when retrying creation.",
    inputSchema: z.strictObject({ title, idempotencyKey: requestKey }),
    annotations: { ...write, idempotentHint: true },
  }, ({ title, idempotencyKey }) => result(async () => {
    const record = await createCloudPlan({ schemaVersion: 1, title, blocks: [], tasks: {} }, "mcp:" + idempotencyKey);
    return { id: record.id, version: record.version, title: record.document.title };
  }));

  server.registerTool("ipos_add_task", {
    description: "Add one requested task. Put the script in description, responsible names in assignee and a supplied link in referenceUrl. Leave deadline absent unless supplied. Reuse the same idempotencyKey on retry.",
    inputSchema: addTaskInput,
    annotations: { ...write, idempotentHint: true },
  }, (input) => result(() => addTask(input)));

  server.registerTool("ipos_update_task", {
    description: "Change fields on one existing task using the current plan version. Use deadline null only to clear an existing deadline on request.",
    inputSchema: z.strictObject({ ...mutation, taskId: taskSchema.shape.id, patch: taskPatch }),
    annotations: { ...write, destructiveHint: true, idempotentHint: false },
  }, (input) => result(async () => {
    const stored = await requirePlan(input.planId);
    if (stored.version !== input.expectedVersion) throw new CloudPlanConflict();
    if (!Object.hasOwn(stored.document.tasks, input.taskId))
      throw new WorkspaceError(404, "Задача не найдена.");
    const merged = { ...stored.document.tasks[input.taskId], ...input.patch };
    if (merged.deadline === null) delete merged.deadline;
    const task = taskSchema.parse(merged);
    const updated = await updateCloudPlan(input.planId, input.expectedVersion, {
      ...stored.document, tasks: { ...stored.document.tasks, [input.taskId]: task },
    });
    if (!updated) throw notFound();
    return { planId: input.planId, version: updated.version, task };
  }));

  server.registerTool("ipos_replace_plan", {
    description: "Replace every block and task in a private server plan. Read the latest version, show the proposed change and obtain explicit user confirmation first.",
    inputSchema: z.strictObject({
      ...mutation,
      confirmReplace: z.literal(true),
      document: z.record(z.string(), z.unknown()).describe("Complete PortablePlan, schemaVersion 1"),
    }),
    annotations: { ...write, destructiveHint: true, idempotentHint: false },
  }, (input) => result(async () => {
    if (process.env.IPOS_MCP_ALLOW_REPLACE !== "true")
      throw new WorkspaceError(403, "Полная замена через MCP отключена владельцем.");
    const updated = await updateCloudPlan(input.planId, input.expectedVersion, input.document);
    if (!updated) throw notFound();
    return { id: updated.id, version: updated.version, taskCount: Object.keys(updated.document.tasks).length };
  }));

  return server;
}
