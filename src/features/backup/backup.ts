import { z } from "zod";
import {
  ACTIVIST_PREFIX,
  activistEntrySchema,
} from "@/features/activists/directory";
import {
  PERSON_PREFIX,
  migrateLegacyPeople,
  peopleFromRows,
} from "@/features/activists/people-repository";
import { personSchema } from "@/lib/schema/person";
import {
  db,
  type Activity,
  type Revision,
  type Setting,
} from "@/lib/db/database";
import {
  planSchema,
  portablePlanSchema,
  MAX_JSON_BYTES,
  type Plan,
} from "@/lib/schema/plan";

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
export const templateValueSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    createdAt: z.iso.datetime(),
    plan: portablePlanSchema,
  })
  .strict();
const id = z.string().min(1).max(100);
const settingSchema = z.union([
  z.object({ key: z.literal("demo-seeded-v1"), value: z.boolean() }).strict(),
  z
    .object({
      key: z.string().regex(/^task-template:[a-zA-Z0-9-]{1,100}$/),
      value: templateValueSchema,
    })
    .strict(),
  z
    .object({
      key: z.string().regex(/^activist:[a-zA-Z0-9-]{1,100}$/),
      value: activistEntrySchema,
    })
    .strict(),
]);
const revisionSchema = z
  .object({
    id,
    planId: id,
    createdAt: z.iso.datetime(),
    title: z.string().max(500),
    snapshot: planSchema,
  })
  .strict();
const activitySchema = z
  .object({
    id,
    planId: id,
    createdAt: z.iso.datetime(),
    type: z.string().min(1).max(200),
    message: z.string().max(20000),
    metadata: z.record(z.string().max(100), z.json()).optional(),
  })
  .strict();
const backupFields = {
  app: z.literal("IPOS.Plan"),
  createdAt: z.iso.datetime(),
  plans: z.array(planSchema).max(1000),
  revisions: z.array(revisionSchema).max(10000),
  activity: z.array(activitySchema).max(50000),
  settings: z.array(settingSchema).max(1501),
};
const backupV1Schema = z
  .object({
    ...backupFields,
    formatVersion: z.literal(1),
    schemas: z
      .object({ database: z.literal(1), portable: z.literal(1) })
      .strict(),
  })
  .strict();
const backupV2Schema = z
  .object({
    ...backupFields,
    formatVersion: z.literal(2),
    schemas: z
      .object({
        database: z.literal(1),
        portable: z.literal(1),
        people: z.literal(1),
      })
      .strict(),
    people: z.array(personSchema).max(1000),
  })
  .strict();
const backupSchema = z.discriminatedUnion("formatVersion", [
  backupV1Schema,
  backupV2Schema,
]);
export type LibraryBackup = z.infer<typeof backupV2Schema>;
export type RestoreStrategy = "copies" | "skip";

/** Bound recursion before Zod traverses recursive blocks or metadata. No media is fetched. */
function guard(value: unknown) {
  const queue: [unknown, number][] = [[value, 0]];
  let nodes = 0;
  while (queue.length) {
    const [item, depth] = queue.pop()!;
    if (depth > 45 || ++nodes > 2_000_000)
      throw new Error("Слишком сложная резервная копия.");
    if (item && typeof item === "object") {
      for (const [key, child] of Object.entries(item)) {
        if (["__proto__", "constructor", "prototype"].includes(key))
          throw new Error("Недопустимый ключ в резервной копии.");
        queue.push([child, depth + 1]);
      }
    }
  }
}
export function parseBackup(raw: string): LibraryBackup {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES)
    throw new Error("Резервная копия больше 50 МБ.");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Повреждённый JSON резервной копии.");
  }
  guard(value);
  const result = backupSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      "Несовместимая или повреждённая резервная копия: " +
        result.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
    );
  const backup: LibraryBackup =
    result.data.formatVersion === 1
      ? {
          ...result.data,
          formatVersion: 2,
          schemas: { database: 1, portable: 1, people: 1 },
          people: [],
        }
      : result.data;
  for (const rows of [backup.plans, backup.revisions, backup.activity]) {
    const ids = rows.map((r) => r.id);
    if (new Set(ids).size !== ids.length)
      throw new Error("Повторяющиеся ID в резервной копии.");
  }
  if (
    new Set(backup.settings.map((s) => s.key)).size !== backup.settings.length
  )
    throw new Error("Повторяющиеся настройки.");
  const personIds = new Set(backup.people.map((p) => p.id));
  if (personIds.size !== backup.people.length)
    throw new Error("Повторяющиеся ID людей в резервной копии.");
  const legacyKeys = new Set(
    backup.settings
      .filter((s) => s.key.startsWith(ACTIVIST_PREFIX))
      .map((s) => s.key),
  );
  if (backup.people.some((p) => p.sourceKey && !legacyKeys.has(p.sourceKey)))
    throw new Error("Отсутствует исходная запись миграции человека.");

  const plans = new Set(backup.plans.map((p) => p.id));
  for (const p of [
    ...backup.plans,
    ...backup.revisions.map((r) => r.snapshot),
  ]) {
    const portable = {
      schemaVersion: p.schemaVersion,
      title: p.title,
      blocks: p.blocks,
      tasks: p.tasks,
      typography: p.typography,
      fontSources: p.fontSources,
    };
    if (
      p.id.length > 100 ||
      new TextEncoder().encode(JSON.stringify(portable)).length > MAX_JSON_BYTES
    )
      throw new Error("План в копии превышает допустимый размер.");
    for (const assignment of Object.values(p.assignments ?? {}))
      if (assignment.people.some((person) => !personIds.has(person.personId)))
        throw new Error("Назначение ссылается на отсутствующего человека.");
  }
  for (const event of backup.activity) {
    if (
      !event.type.startsWith("TASK_") ||
      event.metadata?.identityVersion !== 1
    )
      continue;
    for (const key of ["personIds", "previousPersonIds"]) {
      const ids = event.metadata[key] ?? [];
      if (
        !Array.isArray(ids) ||
        ids.length > 20 ||
        ids.some((id) => typeof id !== "string" || !personIds.has(id))
      )
        throw new Error("Событие ссылается на отсутствующего человека.");
    }
  }
  for (const setting of backup.settings) {
    if (
      setting.key !== "demo-seeded-v1" &&
      typeof setting.value === "object" &&
      setting.value &&
      "plan" in setting.value &&
      new TextEncoder().encode(JSON.stringify(setting.value.plan)).length >
        MAX_JSON_BYTES
    )
      throw new Error("Шаблон в копии превышает допустимый размер.");
  }
  if (
    backup.activity.some((a) => !plans.has(a.planId)) ||
    backup.revisions.some(
      (r) => !plans.has(r.planId) || r.snapshot.id !== r.planId,
    )
  )
    throw new Error("Нарушены связи планов и истории.");
  return backup;
}
export async function exportLibrary(): Promise<LibraryBackup> {
  await migrateLegacyPeople();
  const data = await db.transaction(
    "r",
    [db.plans, db.revisions, db.activity, db.settings],
    async () => {
      const rows = await db.settings.toArray();
      return {
        plans: await db.plans.toArray(),
        revisions: await db.revisions.toArray(),
        activity: await db.activity.toArray(),
        settings: rows.filter(
          (s) =>
            s.key === "demo-seeded-v1" ||
            s.key.startsWith("task-template:") ||
            s.key.startsWith(ACTIVIST_PREFIX),
        ),
        people: peopleFromRows(rows),
      };
    },
  );
  return parseBackup(
    JSON.stringify({
      app: "IPOS.Plan",
      formatVersion: 2,
      createdAt: new Date().toISOString(),
      schemas: { database: 1, portable: 1, people: 1 },
      ...data,
    }),
  );
}
function remapPlan(plan: Plan, id: string, people: Map<string, string>): Plan {
  return {
    ...plan,
    id,
    ...(plan.assignments
      ? {
          assignments: Object.fromEntries(
            Object.entries(plan.assignments).map(([taskId, value]) => [
              taskId,
              {
                ...value,
                people: value.people.map((p) => ({
                  ...p,
                  personId: people.get(p.personId)!,
                })),
              },
            ]),
          ),
        }
      : {}),
  };
}
function remapActivity(item: Activity, people: Map<string, string>): Activity {
  if (item.type.startsWith("TASK_") && item.metadata?.identityVersion === 1) {
    const metadata = { ...item.metadata };
    for (const key of ["personIds", "previousPersonIds"])
      if (Array.isArray(metadata[key]))
        metadata[key] = (metadata[key] as string[]).map(
          (id) => people.get(id)!,
        );
    return { ...item, metadata };
  }
  return item;
}
export async function restoreLibrary(
  input: LibraryBackup,
  strategy: RestoreStrategy,
) {
  // Revalidate at the write boundary, even for callers other than the confirmation UI.
  const backup = parseBackup(JSON.stringify(input));
  if (!["copies", "skip"].includes(strategy))
    throw new Error("Выберите способ восстановления.");
  return db.transaction(
    "rw",
    [db.plans, db.revisions, db.activity, db.settings],
    async () => {
      const personMapping = new Map(
        backup.people.map((p) => [p.id, crypto.randomUUID()]),
      );
      if (
        (await db.settings
          .filter((r) => r.key.startsWith(PERSON_PREFIX))
          .count()) +
          backup.people.length >
        1000
      )
        throw new Error(
          "Восстановление превысит 1000 профилей. Данные не изменены.",
        );
      const mapping = new Map<string, string>();
      const plans: Plan[] = [];
      for (const plan of backup.plans) {
        if (strategy === "skip" && (await db.plans.get(plan.id))) continue;
        const newId = strategy === "copies" ? crypto.randomUUID() : plan.id;
        mapping.set(plan.id, newId);
        plans.push(remapPlan(plan, newId, personMapping));
      }
      const revisions: Revision[] = backup.revisions
        .filter((r) => mapping.has(r.planId))
        .map((r) => ({
          ...r,
          id: crypto.randomUUID(),
          planId: mapping.get(r.planId)!,
          snapshot: remapPlan(
            r.snapshot,
            mapping.get(r.planId)!,
            personMapping,
          ),
        }));
      const activity: Activity[] = backup.activity
        .filter((a) => mapping.has(a.planId))
        .map((a) => ({
          ...remapActivity(a, personMapping),
          id: crypto.randomUUID(),
          planId: mapping.get(a.planId)!,
        }));
      const settings: Setting[] = [];
      const legacyMapping = new Map<string, string>();
      for (const s of backup.settings) {
        let key =
          strategy === "copies" && s.key.startsWith("task-template:")
            ? `task-template:${crypto.randomUUID()}`
            : s.key;
        if (s.key.startsWith(ACTIVIST_PREFIX)) {
          const existing = await db.settings.get(key);
          if (
            existing &&
            JSON.stringify(existing.value) !== JSON.stringify(s.value)
          )
            key = `${ACTIVIST_PREFIX}${crypto.randomUUID()}`;
          legacyMapping.set(s.key, key);
        }
        if (!(await db.settings.get(key))) settings.push({ ...s, key });
      }
      const people = backup.people.map((p) => ({
        ...p,
        id: personMapping.get(p.id)!,
        ...(p.sourceKey ? { sourceKey: legacyMapping.get(p.sourceKey)! } : {}),
      }));
      const currentSettings = await db.settings.toArray();
      for (const [prefix, cap] of [
        ["task-template:", 500],
        [ACTIVIST_PREFIX, 1000],
      ] as const) {
        if (
          [...currentSettings, ...settings].filter((s) =>
            s.key.startsWith(prefix),
          ).length > cap
        )
          throw new Error(
            "Восстановление превысит лимит локальных шаблонов или исходных имён. Данные не изменены.",
          );
      }
      await db.plans.bulkAdd(plans);
      await db.revisions.bulkAdd(revisions);
      await db.activity.bulkAdd(activity);
      await db.settings.bulkAdd([
        ...settings,
        ...people.map((p) => ({ key: PERSON_PREFIX + p.id, value: p })),
      ]);
      const migration = await migrateLegacyPeople();
      return {
        people: people.length + migration.created,
        plans: plans.length,
        skipped: backup.plans.length - plans.length,
        revisions: revisions.length,
        activity: activity.length,
        settings: settings.length,
      };
    },
  );
}
