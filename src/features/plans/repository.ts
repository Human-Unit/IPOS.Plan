import { db, type Activity, type Revision } from "@/lib/db/database";
import { bindingKey, bindingSchema, type CloudBinding } from "@/lib/ai-workspace/binding";
import { activityChanges } from "./activity-changes";
import { toPortable, type Plan, type PortablePlan } from "@/lib/schema/plan";
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export function newPlan(data?: PortablePlan): Plan {
  const date = now();
  return {
    schemaVersion: 1,
    title: "Новый контент-план",
    blocks: [],
    tasks: {},
    ...data,
    id: uid(),
    createdAt: date,
    updatedAt: date,
    version: 1,
  };
}
export function event(planId: string, type: string, message: string): Activity {
  return { id: uid(), planId, type, message, createdAt: now() };
}
function revision(plan: Plan, title: string): Revision {
  return {
    id: uid(),
    planId: plan.id,
    createdAt: now(),
    title,
    snapshot: structuredClone(plan),
  };
}
export async function saveCloudBinding(localId: string, binding: CloudBinding) {
  const key = bindingKey(localId);
  await db.transaction("rw", db.plans, db.settings, async () => {
    const current = bindingSchema.safeParse((await db.settings.get(key))?.value).data;
    if (!(await db.plans.get(localId)) || (current && (current.id !== binding.id || current.version > binding.version)))
      throw new Error("Локальная привязка изменилась. Откройте план снова.");
    await db.settings.put({ key, value: binding });
  });
}

export async function createPlan(data?: PortablePlan, type = "PLAN_CREATED", binding?: CloudBinding) {
  const plan = newPlan(data ? toPortable(data) : undefined);
  await db.transaction("rw", db.plans, db.activity, db.settings, async () => {
    await db.plans.add(plan);
    if (binding) await saveCloudBinding(plan.id, binding);
    await db.activity.add(
      event(
        plan.id,
        type,
        type === "PLAN_IMPORTED" ? "План импортирован" : "План создан",
      ),
    );
  });
  return plan;
}
export async function savePlan(plan: Plan): Promise<Plan> {
  const portable = toPortable(plan);
  return db.transaction("rw", db.plans, db.activity, async () => {
    const previous = await db.plans.get(plan.id);
    if (!previous) throw new Error("План удалён. Экспортируйте текущую копию.");
    if (previous.version !== plan.version)
      throw new Error(
        "План изменён в другой вкладке. Экспортируйте текущую копию и перезагрузите страницу.",
      );
    const saved = {
      ...plan,
      ...portable,
      version: plan.version + 1,
      updatedAt: now(),
    };
    const events = activityChanges(toPortable(previous), portable).map(
      ({ type, message, metadata }) => ({
        ...event(plan.id, type, message),
        metadata,
      }),
    );
    await db.plans.put(saved);
    if (events.length) await db.activity.bulkAdd(events);
    return saved;
  });
}
export async function saveRevision(plan: Plan, title = "Сохранённая версия") {
  const item = revision(plan, title);
  await db.revisions.add(item);
  return item;
}
export async function replacePlan(
  plan: Plan,
  data: PortablePlan,
  type: "PLAN_IMPORTED" | "PLAN_RESTORED",
  binding?: CloudBinding,
) {
  const portable = toPortable(data);
  return db.transaction("rw", db.plans, db.revisions, db.activity, db.settings, async () => {
    const current = await db.plans.get(plan.id);
    if (!current || current.version !== plan.version)
      throw new Error("План изменился. Перезагрузите страницу перед заменой.");
    await db.revisions.add(
      revision(
        current,
        type === "PLAN_IMPORTED" ? "До импорта" : "До восстановления",
      ),
    );
    const next = {
      ...current,
      ...portable,
      version: current.version + 1,
      updatedAt: now(),
    };
    await db.plans.put(next);
    if (binding) await saveCloudBinding(next.id, binding);
    await db.activity.add(
      event(
        plan.id,
        type,
        type === "PLAN_IMPORTED"
          ? "Применён JSON-импорт"
          : "Восстановлена версия",
      ),
    );
    return next;
  });
}
export async function deletePlan(id: string) {
  await db.transaction("rw", db.plans, db.activity, db.revisions, async () => {
    await db.plans.delete(id);
    await db.activity.where({ planId: id }).delete();
    await db.revisions.where({ planId: id }).delete();
  });
}
export async function duplicatePlan(plan: Plan) {
  return createPlan({ ...toPortable(plan), title: `${plan.title} — копия` });
}
