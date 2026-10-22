import { z } from "zod";
import { db } from "@/lib/db/database";
import { flattenBlocks, type Plan } from "@/lib/schema/plan";

/**
 * A locally collected name is NOT verified membership of the Student Council.
 * Keep the portable task.assignee string unchanged for old plans and exports.
 */
export const activistEntrySchema = z.object({
  name: z.string().trim().min(1).max(80),
  createdAt: z.iso.datetime(),
  source: z.literal("assignment"),
}).strict();
export type ActivistEntry = z.infer<typeof activistEntrySchema>;

export const ACTIVIST_PREFIX = "activist:";
const normalized = (name: string) =>
  name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru").replaceAll("ё", "е");

/** Names are separated by commas, semicolons or newlines; spaces are never separators. */
export function assigneeNames(value?: string): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  return value.split(/[,;\n]+/).map((name) =>
    name.normalize("NFKC").trim().replace(/\s+/g, " "),
  ).filter((name) => {
    const key = normalized(name);
    if (!name || name.length > 80 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export const activistNameKey = normalized;
export function directoryNames(
  rows: readonly { key: string; value: unknown }[],
): string[] {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!row.key.startsWith(ACTIVIST_PREFIX)) continue;
    const parsed = activistEntrySchema.safeParse(row.value);
    if (parsed.success && !map.has(normalized(parsed.data.name)))
      map.set(normalized(parsed.data.name), parsed.data.name);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "ru"));
}

/** Commit names only after an assignment field loses focus, not per keystroke. */
export async function rememberAssignees(value?: string) {
  const names = assigneeNames(value);
  if (!names.length) return 0;
  return db.transaction("rw", db.settings, async () => {
    const existing = directoryNames(
      await db.settings.filter((row) => row.key.startsWith(ACTIVIST_PREFIX)).toArray(),
    );
    const known = new Set(existing.map(normalized));
    const entries = names.filter((name) => {
      const key = normalized(name);
      if (known.has(key)) return false;
      known.add(key);
      return true;
    });
    const remaining = Math.max(0, 500 - existing.length);
    const toSave = entries.slice(0, remaining).map((name) => ({
      key: ACTIVIST_PREFIX + crypto.randomUUID(),
      value: activistEntrySchema.parse({
        name, createdAt: new Date().toISOString(), source: "assignment",
      }),
    }));
    if (toSave.length) await db.settings.bulkAdd(toSave);
    return toSave.length;
  });
}

/** Include old/previously imported plans in the directory without rewriting plans. */
export async function syncDirectoryFromPlans() {
  const plans: Plan[] = await db.plans.toArray();
  const names: string[] = [];
  for (const plan of plans) {
    const active = new Set(
      flattenBlocks(plan.blocks).filter((b) => b.type === "task")
        .map((b) => b.type === "task" ? b.props.taskId : ""),
    );
    for (const task of Object.values(plan.tasks))
      if (active.has(task.id)) names.push(...assigneeNames(task.assignee));
  }
  return rememberAssignees(names.join(", "));
}
