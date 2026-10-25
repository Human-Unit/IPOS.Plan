import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { del, get, put } from "@vercel/blob";
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

export function slugify(value: string) {
  const letters: Record<string, string> = {
    а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ё:"yo", ж:"zh", з:"z",
    и:"i", й:"y", к:"k", л:"l", м:"m", н:"n", о:"o", п:"p", р:"r",
    с:"s", т:"t", у:"u", ф:"f", х:"h", ц:"ts", ч:"ch", ш:"sh",
    щ:"sch", ъ:"", ы:"y", ь:"", э:"e", ю:"yu", я:"ya",
  };
  const latin = [...value.toLowerCase()].map((c) => letters[c] ?? c).join("");
  return latin.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "") || "plan";
}

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
  return managerKeyPattern.test(secret) && matches(secret, record.managerHash);
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

export async function updatePublication(record: StoredPublication, etag: string, title: string, document: PortablePlan) {
  const next: StoredPublication = { ...record, title, document, updatedAt: new Date().toISOString() };
  await put(pathFor(record.id), JSON.stringify(next), { access: "private", contentType: "application/json", allowOverwrite: true, ifMatch: etag, addRandomSuffix: false });
  return publicData(next);
}

export async function removePublication(id: string) {
  await del(pathFor(id));
}
