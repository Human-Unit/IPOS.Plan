import "server-only";
import { randomUUID } from "node:crypto";
import { BlobPreconditionFailedError, get, list, put } from "@vercel/blob";
import { parseImport } from "@/lib/schema/import";
import { assertVersion, cloudPlanId, cloudPlanRecordSchema, type CloudPlanRecord } from "./model";
import type { PortablePlan } from "@/lib/schema/plan";

const PREFIX = "ai-workspace/v1/";
const pathFor = (id: string) => {
  if (!cloudPlanId.safeParse(id).success) throw new Error("Неверный ID плана.");
  return `${PREFIX}${id}.json`;
};
export const aiWorkspaceConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const validate = (data: unknown) => parseImport(JSON.stringify(data)) as PortablePlan;

export async function getCloudPlan(id: string): Promise<{ record: CloudPlanRecord; etag: string } | null> {
  const response = await get(pathFor(id), { access: "private", useCache: false });
  if (!response?.stream) return null;
  const value: unknown = JSON.parse(await new Response(response.stream).text());
  const record = cloudPlanRecordSchema.parse(value);
  if (record.id !== id) throw new Error("Повреждённая запись плана.");
  return { record, etag: response.blob.etag };
}

export async function createCloudPlan(document: unknown): Promise<CloudPlanRecord> {
  const portable = validate(document);
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  const record: CloudPlanRecord = {
    id, version: 1, createdAt: timestamp, updatedAt: timestamp, document: portable,
  };
  await put(pathFor(id), JSON.stringify(record), {
    access: "private", contentType: "application/json", addRandomSuffix: false,
  });
  return record;
}

export class CloudPlanConflict extends Error {
  constructor() {
    super("Серверный план изменился. Проверьте новую версию перед сохранением.");
    this.name = "CloudPlanConflict";
  }
}
export async function updateCloudPlan(id: string, expectedVersion: number, document: unknown) {
  const portable = validate(document);
  const current = await getCloudPlan(id);
  if (!current) return null;
  try {
    assertVersion(expectedVersion, current.record.version);
  } catch {
    throw new CloudPlanConflict();
  }
  const next: CloudPlanRecord = {
    ...current.record, version: expectedVersion + 1,
    updatedAt: new Date().toISOString(), document: portable,
  };
  try {
    await put(pathFor(id), JSON.stringify(next), {
      access: "private", contentType: "application/json",
      addRandomSuffix: false, allowOverwrite: true, ifMatch: current.etag,
    });
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError || (
      error instanceof Error && /etag mismatch|precondition failed/i.test(error.message)
    )) throw new CloudPlanConflict();
    throw error;
  }
  return next;
}

export async function listCloudPlans(cursor?: string) {
  const page = await list({ prefix: PREFIX, limit: 50, ...(cursor ? { cursor } : {}) });
  const records = await Promise.all(page.blobs.map(async (blob) => {
    const id = blob.pathname.slice(PREFIX.length).replace(/\.json$/, "");
    if (!cloudPlanId.safeParse(id).success) return null;
    const data = await getCloudPlan(id);
    return data ? {
      id, title: data.record.document.title,
      version: data.record.version, updatedAt: data.record.updatedAt,
    } : null;
  }));
  return {
    plans: records.filter((record): record is NonNullable<typeof record> => Boolean(record)),
    nextCursor: page.hasMore ? page.cursor : null,
  };
}
