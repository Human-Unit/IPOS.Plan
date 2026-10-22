import { z } from "zod";
import { db, type Activity, type Revision, type Setting } from "@/lib/db/database";
import { planSchema, portablePlanSchema, MAX_JSON_BYTES, type Plan } from "@/lib/schema/plan";

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
export const templateValueSchema = z.object({
  name: z.string().trim().min(1).max(120),
  createdAt: z.iso.datetime(),
  plan: portablePlanSchema,
}).strict();
const id = z.string().min(1).max(100);
const settingSchema = z.union([
  z.object({ key: z.literal("demo-seeded-v1"), value: z.boolean() }).strict(),
  z.object({ key: z.string().regex(/^task-template:[a-zA-Z0-9-]{1,100}$/), value: templateValueSchema }).strict(),
]);
const revisionSchema = z.object({
  id, planId: id, createdAt: z.iso.datetime(), title: z.string().max(500), snapshot: planSchema,
}).strict();
const activitySchema = z.object({
  id, planId: id, createdAt: z.iso.datetime(), type: z.string().min(1).max(200),
  message: z.string().max(20000), metadata: z.record(z.string().max(100), z.json()).optional(),
}).strict();
const backupSchema = z.object({
  app: z.literal("IPOS.Plan"), formatVersion: z.literal(1), createdAt: z.iso.datetime(),
  schemas: z.object({ database: z.literal(1), portable: z.literal(1) }).strict(),
  plans: z.array(planSchema).max(1000), revisions: z.array(revisionSchema).max(10000),
  activity: z.array(activitySchema).max(50000), settings: z.array(settingSchema).max(501),
}).strict();
export type LibraryBackup = z.infer<typeof backupSchema>;
export type RestoreStrategy = "copies" | "skip";

/** Bound recursion before Zod traverses recursive blocks or metadata. No media is fetched. */
function guard(value: unknown) {
  const queue: [unknown, number][] = [[value, 0]];
  let nodes = 0;
  while (queue.length) {
    const [item, depth] = queue.pop()!;
    if (depth > 45 || ++nodes > 2_000_000) throw new Error("Слишком сложная резервная копия.");
    if (item && typeof item === "object") {
      for (const [key, child] of Object.entries(item)) {
        if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Недопустимый ключ в резервной копии.");
        queue.push([child, depth + 1]);
      }
    }
  }
}
export function parseBackup(raw: string): LibraryBackup {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) throw new Error("Резервная копия больше 50 МБ.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Повреждённый JSON резервной копии."); }
  guard(value);
  const result = backupSchema.safeParse(value);
  if (!result.success) throw new Error("Несовместимая или повреждённая резервная копия: " + result.error.issues.slice(0, 3).map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
  const backup = result.data;
  for (const rows of [backup.plans, backup.revisions, backup.activity]) {
    const ids = rows.map(r => r.id);
    if (new Set(ids).size !== ids.length) throw new Error("Повторяющиеся ID в резервной копии.");
  }
  if (new Set(backup.settings.map(s => s.key)).size !== backup.settings.length) throw new Error("Повторяющиеся настройки.");
  const plans = new Set(backup.plans.map(p => p.id));
  for (const p of [...backup.plans, ...backup.revisions.map(r => r.snapshot)]) {
    if (p.id.length > 100 || new TextEncoder().encode(JSON.stringify(p)).length > MAX_JSON_BYTES + 1000) throw new Error("План в копии превышает допустимый размер.");
  }
  if (backup.activity.some(a => !plans.has(a.planId)) || backup.revisions.some(r => !plans.has(r.planId) || r.snapshot.id !== r.planId)) throw new Error("Нарушены связи планов и истории.");
  return backup;
}
export async function exportLibrary(): Promise<LibraryBackup> {
  const data = await db.transaction("r", [db.plans, db.revisions, db.activity, db.settings], async () => ({
    plans: await db.plans.toArray(), revisions: await db.revisions.toArray(),
    activity: await db.activity.toArray(), settings: (await db.settings.toArray()).filter(s => s.key === "demo-seeded-v1" || s.key.startsWith("task-template:")),
  }));
  return parseBackup(JSON.stringify({ app: "IPOS.Plan", formatVersion: 1, createdAt: new Date().toISOString(), schemas: { database: 1, portable: 1 }, ...data }));
}
export async function restoreLibrary(input: LibraryBackup, strategy: RestoreStrategy) {
  // Revalidate at the write boundary, even for callers other than the confirmation UI.
  const backup = parseBackup(JSON.stringify(input));
  if (!["copies", "skip"].includes(strategy)) throw new Error("Выберите способ восстановления.");
  return db.transaction("rw", [db.plans, db.revisions, db.activity, db.settings], async () => {
    const mapping = new Map<string, string>();
    const plans: Plan[] = [];
    for (const plan of backup.plans) {
      if (strategy === "skip" && await db.plans.get(plan.id)) continue;
      const newId = strategy === "copies" ? crypto.randomUUID() : plan.id;
      mapping.set(plan.id, newId);
      plans.push({ ...plan, id: newId });
    }
    const revisions: Revision[] = backup.revisions.filter(r => mapping.has(r.planId)).map(r => ({
      ...r, id: crypto.randomUUID(), planId: mapping.get(r.planId)!, snapshot: { ...r.snapshot, id: mapping.get(r.planId)! },
    }));
    const activity: Activity[] = backup.activity.filter(a => mapping.has(a.planId)).map(a => ({ ...a, id: crypto.randomUUID(), planId: mapping.get(a.planId)! }));
    const settings: Setting[] = [];
    for (const s of backup.settings) {
      const key = strategy === "copies" && s.key.startsWith("task-template:") ? `task-template:${crypto.randomUUID()}` : s.key;
      if (!await db.settings.get(key)) settings.push({ ...s, key });
    }
    await db.plans.bulkAdd(plans);
    await db.revisions.bulkAdd(revisions);
    await db.activity.bulkAdd(activity);
    await db.settings.bulkAdd(settings);
    return { plans: plans.length, skipped: backup.plans.length - plans.length, revisions: revisions.length, activity: activity.length, settings: settings.length };
  });
}
