import { db, type Activity, type Revision } from "@/lib/db/database";
import { statusLabels } from "@/lib/labels";
import {
  toPortable,
  type Plan,
  type PortablePlan,
  flattenBlocks,
} from "@/lib/schema/plan";
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
export async function createPlan(data?: PortablePlan, type = "PLAN_CREATED") {
  const plan = newPlan(data ? toPortable(data) : undefined);
  await db.transaction("rw", db.plans, db.activity, async () => {
    await db.plans.add(plan);
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
    const events: Activity[] = [];
    if (previous.title !== plan.title)
      events.push(event(plan.id, "PLAN_RENAMED", `Название: ${plan.title}`));
    for (const task of Object.values(portable.tasks)) {
      const old = previous.tasks[task.id];
      if (!old)
        events.push(
          event(plan.id, "TASK_CREATED", `Создана задача: ${task.title}`),
        );
      else {
        if (old.status !== task.status)
          events.push(
            event(
              plan.id,
              "TASK_STATUS_CHANGED",
              `Статус задачи «${task.title}»: ${statusLabels[task.status]}`,
            ),
          );
        if (old.assignee !== task.assignee)
          events.push(
            event(
              plan.id,
              "TASK_ASSIGNED",
              `Исполнитель «${task.title}»: ${task.assignee || "не указан"}`,
            ),
          );
      }
    }
    const oldRefs = new Set(
      flattenBlocks(previous.blocks)
        .filter((b) => b.type === "reference")
        .map((b) => b.id),
    );
    for (const b of flattenBlocks(plan.blocks))
      if (b.type === "reference" && !oldRefs.has(b.id))
        events.push(
          event(
            plan.id,
            "REFERENCE_ADDED",
            `Референс: ${b.props.title || b.props.url || "без названия"}`,
          ),
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
) {
  const portable = toPortable(data);
  return db.transaction("rw", db.plans, db.revisions, db.activity, async () => {
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
