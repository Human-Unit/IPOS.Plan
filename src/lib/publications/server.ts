import "server-only";
import { slugify } from "./slug";
export { slugify };
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { BlobPreconditionFailedError, del, get, head, put } from "@vercel/blob";
import { parseImport } from "@/lib/schema/import";
import { MAX_JSON_BYTES, type PortablePlan } from "@/lib/schema/plan";

export const publicationId = /^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?-[a-f0-9]{16}$/;
const prefix = "publications/";
const managerKeyPattern = /^[A-Za-z0-9_-]{40,90}$/;

export type StoredPublication = {
  version: 1;
  id: string;
  title: string;
  document: PortablePlan;
  managerHash: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicPublication = Omit<StoredPublication, "managerHash">;

export function parseDocument(value: unknown): PortablePlan {
  const source = JSON.stringify(value);
  if (!source || Buffer.byteLength(source) > MAX_JSON_BYTES) throw new Error("План больше 1 МБ.");
  return parseImport(source);
}

function pathFor(id: string) {
  if (!publicationId.test(id)) throw new Error("Некорректный адрес публикации.");
  return prefix + id + ".json";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function matches(a: string, b: string) {
  if (!a || !b) return false;
  const first = Buffer.from(hash(a), "hex"), second = Buffer.from(hash(b), "hex");
  return timingSafeEqual(first, second);
}

export function isPublisher(accessKey: string) {
  const expected = process.env.IPOS_PUBLISH_ACCESS_KEY;
  return Boolean(expected && expected.length >= 20 && matches(accessKey, expected));
}

export function mayManage(record: StoredPublication, secret: string) {
  if (!managerKeyPattern.test(secret) || !/^[a-f0-9]{64}$/.test(record.managerHash)) return false;
  return timingSafeEqual(Buffer.from(hash(secret), "hex"), Buffer.from(record.managerHash, "hex"));
}

export function cleanTitle(title: unknown) {
  if (typeof title !== "string" || !title.trim() || title.length > 140) throw new Error("Название должно содержать от 1 до 140 символов.");
  return title.trim();
}

export function isConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.IPOS_PUBLISH_ACCESS_KEY);
}

export async function readPublication(id: string) {
  const result = await get(pathFor(id), { access: "private", useCache: false });
  if (!result || !result.stream) return null;
  const raw = await new Response(result.stream).text();
  const record = JSON.parse(raw) as StoredPublication;
  if (record.id !== id || record.version !== 1) throw new Error("Некорректный сохранённый снимок.");
  return { record, etag: result.blob.etag };
}

export function publicData(record: StoredPublication): PublicPublication {
  return { version: record.version, id: record.id, title: record.title, document: record.document, createdAt: record.createdAt, updatedAt: record.updatedAt };
}

export async function createPublication(title: string, slug: string, document: PortablePlan) {
  const id = slugify(slug || title) + "-" + randomBytes(8).toString("hex");
  const managerKey = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const record: StoredPublication = { version: 1, id, title, document, managerHash: hash(managerKey), createdAt: now, updatedAt: now };
  await put(pathFor(id), JSON.stringify(record), { access: "private", contentType: "application/json", addRandomSuffix: false });
  return { id, managerKey };
}

/**
 * A conditional write must never silently overwrite another editor's update.
 * The Blob GET response ETag may occasionally lag behind the write metadata.
 * On a 412, re-read the authoritative document and retry at most once using
 * HEAD's current ETag, and only when the published content has not changed.
 */
export class PublicationConflictError extends Error {
  constructor(message = "Страница изменилась на сервере. Проверьте опубликованную версию и повторите обновление. Локальный план сохранён.") {
    super(message);
    this.name = "PublicationConflictError";
  }
}

function preconditionFailed(error: unknown) {
  return error instanceof BlobPreconditionFailedError ||
    (error instanceof Error && /etag mismatch|precondition failed/i.test(error.message));
}

function sameContent(a: StoredPublication, b: StoredPublication) {
  return a.title === b.title && JSON.stringify(a.document) === JSON.stringify(b.document);
}

export async function updatePublication(record: StoredPublication, etag: string, title: string, document: PortablePlan) {
  const next: StoredPublication = { ...record, title, document, updatedAt: new Date().toISOString() };
  const pathname = pathFor(record.id);
  const write = (currentEtag: string) => put(pathname, JSON.stringify(next), {
    access: "private" as const,
    contentType: "application/json",
    allowOverwrite: true,
    ifMatch: currentEtag,
    addRandomSuffix: false,
  });
  try {
    await write(etag);
  } catch (error) {
    if (!preconditionFailed(error)) throw error;

    // Check the actual document, not just its ETag, before attempting a retry.
    const latest = await readPublication(record.id);
    if (!latest) throw new PublicationConflictError("Страница была удалена. Публикуйте новый документ.");

    // Two requests may have raced to publish the same snapshot (double-tap).
    // If one succeeded, treat the second as an idempotent success.
    if (sameContent(latest.record, next)) return publicData(latest.record);

    // A genuine concurrent edit must not be overwritten automatically.
    if (!sameContent(latest.record, record) || latest.record.updatedAt !== record.updatedAt) {
      throw new PublicationConflictError();
    }

    // GET can provide a stale ETag even when its body has not changed.
    // HEAD is the documented source for conditional-write metadata.
    const metadata = await head(pathname);
    if (!metadata?.etag) throw new PublicationConflictError();
    try {
      await write(metadata.etag);
    } catch (retryError) {
      if (preconditionFailed(retryError)) throw new PublicationConflictError();
      throw retryError;
    }
  }
  return publicData(next);
}

export async function removePublication(id: string) {
  await del(pathFor(id));
}
