import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { BlobPreconditionFailedError, get, list, put } from "@vercel/blob";
import { z } from "zod";
import { parseImport } from "@/lib/schema/import";
import type { PortablePlan } from "@/lib/schema/plan";
import { cloudPlanId, cloudPlanRecordSchema, type CloudPlanRecord } from "./model";
import { WorkspaceError } from "./http";

const prefix = "ai-workspace/v1/";
const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const storedPlanSchema = cloudPlanRecordSchema.extend({
  creationHash: fingerprint.optional(),
  taskRequests: z.record(z.string().regex(/^mcp-[a-f0-9]{32}$/), fingerprint).optional(),
});
type StoredPlan = z.infer<typeof storedPlanSchema>;
type Stored = { record: StoredPlan; etag: string };

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const privateToken = () => process.env.IPOS_AI_BLOB_READ_WRITE_TOKEN;
export const aiWorkspaceConfigured = () => Boolean(privateToken());
function storageOptions() {
  const token = privateToken();
  if (!token) throw new WorkspaceError(503, "Облачное хранилище не настроено.");
  return { token };
}
const pathFor = (id: string) => `${prefix}${cloudPlanId.parse(id)}.json`;

function validate(data: unknown): PortablePlan {
  try {
    const raw = JSON.stringify(data);
    if (!raw) throw new Error("Нужен документ schemaVersion 1.");
    return parseImport(raw);
  } catch {
    throw new WorkspaceError(400, "Проверьте документ schemaVersion 1 и лимит JSON в 1 МБ.");
  }
}

export function publicPlan(record: StoredPlan): CloudPlanRecord {
  const { id, version, createdAt, updatedAt, document } = record;
  return { id, version, createdAt, updatedAt, document };
}

export async function getCloudPlan(id: string): Promise<Stored | null> {
  const response = await get(pathFor(id), { ...storageOptions(), access: "private", useCache: false });
  if (!response?.stream) return null;
  const record = storedPlanSchema.parse(await new Response(response.stream).json());
  if (record.id !== id || !response.blob.etag) throw new Error("Invalid workspace record.");
  return { record, etag: response.blob.etag };
}

function creationId(key: string) {
  const digest = hash("ipos-plan-create-v1:" + key);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-8${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

export async function createCloudPlan(document: unknown, key?: string): Promise<CloudPlanRecord> {
  const portable = validate(document);
  const id = key ? creationId(key) : randomUUID();
  const creationHash = key ? hash(JSON.stringify(portable)) : undefined;
  const timestamp = new Date().toISOString();
  const record: StoredPlan = {
    id, version: 1, createdAt: timestamp, updatedAt: timestamp, document: portable, creationHash,
  };
  async function replay() {
    const existing = await getCloudPlan(id);
    if (!existing) return;
    if (existing.record.creationHash !== creationHash)
      throw new WorkspaceError(409, "Ключ создания уже использован для другого документа.");
    return publicPlan(existing.record);
  }
  if (key) {
    const existing = await replay();
    if (existing) return existing;
  }
  try {
    await put(pathFor(id), JSON.stringify(record), {
      ...storageOptions(), access: "private", contentType: "application/json",
      addRandomSuffix: false, allowOverwrite: false,
    });
  } catch (error) {
    // A concurrent create or a lost acknowledgement may already have saved the record.
    if (key) {
      const existing = await replay();
      if (existing) return existing;
    }
    throw error;
  }
  return publicPlan(record);
}

export class CloudPlanConflict extends WorkspaceError {
  constructor() {
    super(409, "Серверный план изменился. Проверьте новую версию перед сохранением.");
    this.name = "CloudPlanConflict";
  }
}

export async function updateCloudPlan(
  id: string,
  expectedVersion: number,
  document: unknown,
  taskRequest?: { id: string; hash: string },
): Promise<CloudPlanRecord | null> {
  const portable = validate(document);
  const current = await getCloudPlan(id);
  if (!current) return null;
  if (current.record.version !== expectedVersion) throw new CloudPlanConflict();

  const next: StoredPlan = {
    ...current.record,
    version: current.record.version + 1,
    updatedAt: new Date().toISOString(),
    document: portable,
  };
  if (taskRequest) {
    const requests = current.record.taskRequests ?? {};
    if (Object.keys(requests).length >= 1000)
      throw new WorkspaceError(409, "Достигнут лимит операций добавления задач в этот план.");
    next.taskRequests = { ...requests, [taskRequest.id]: taskRequest.hash };
  }
  try {
    await put(pathFor(id), JSON.stringify(next), {
      ...storageOptions(), access: "private", contentType: "application/json",
      addRandomSuffix: false, allowOverwrite: true, ifMatch: current.etag,
    });
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError || (
      error instanceof Error && /etag mismatch|precondition failed/i.test(error.message)
    )) throw new CloudPlanConflict();
    throw error;
  }
  return publicPlan(next);
}

export async function listCloudPlans(cursor?: string) {
  const page = await list({ ...storageOptions(), prefix, limit: 50, ...(cursor ? { cursor } : {}) });
  type Summary = Pick<CloudPlanRecord, "id" | "version" | "updatedAt"> & { title: string };
  const plans = new Array<Summary | undefined>(page.blobs.length);
  let nextIndex = 0;
  let failed = false;

  // Refill each read slot as it finishes. A slow Blob must not delay the
  // next batch of independent reads. Store results at provider-list indexes.
  async function readNextPlans() {
    try {
      while (!failed && nextIndex < page.blobs.length) {
        const index = nextIndex++;
        const { pathname } = page.blobs[index];
        const id = pathname.slice(prefix.length, -5);
        if (!pathname.startsWith(prefix) || !pathname.endsWith(".json") || !cloudPlanId.safeParse(id).success)
          continue;
        const stored = await getCloudPlan(id);
        if (!stored) continue;
        const { version, updatedAt, document } = stored.record;
        plans[index] = { id, version, updatedAt, title: document.title };
      }
    } catch (error) {
      failed = true;
      throw error;
    }
  }

  await Promise.all(Array.from({ length: Math.min(5, page.blobs.length) }, readNextPlans));
  return { plans: plans.filter((plan) => plan !== undefined), nextCursor: page.hasMore ? page.cursor : null };
}
