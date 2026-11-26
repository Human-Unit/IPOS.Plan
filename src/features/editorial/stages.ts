import { stageLabels, stageStatus, type ProductionStage, type TaskEditorial } from "@/lib/schema/editorial";
import type { Plan } from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";
import { assignmentRows } from "@/features/activists/workload";
import { setTaskEditorial } from "./metadata";

export function productionStage(task: Task, details: TaskEditorial | undefined, hasParticipants: boolean): ProductionStage | null {
  if (details?.stage && stageStatus[details.stage] === task.status) return details.stage;
  switch (task.status) {
    case "todo": return hasParticipants ? "assigned" : "idea";
    case "in_progress": return "production";
    case "review": return "review";
    case "done": return "published";
    case "cancelled": return null;
  }
}

export function moveTaskToStage(plan: Plan, taskId: string, stage: ProductionStage): Plan {
  if (!Object.hasOwn(plan.tasks, taskId)) throw new Error("Задача не найдена.");
  const task = plan.tasks[taskId];
  if (task.status === "cancelled") throw new Error("Сначала измените статус отменённой задачи в брифе.");
  const updated = setTaskEditorial(plan, taskId, { stage });
  return { ...updated, tasks: { ...updated.tasks, [taskId]: { ...task, status: stageStatus[stage] } } };
}

export function stageEvents(previous: Plan, next: Plan) {
  const hasStage = (plan: Plan) => Object.values(plan.editorial ?? {}).some((entry) => entry.stage);
  if (!hasStage(previous) && !hasStage(next)) return [];
  const before = new Map(assignmentRows([previous]).map((row) => [row.task.id, row]));
  return assignmentRows([next]).flatMap((row) => {
    const old = before.get(row.task.id);
    if (!old || (!old.editorial?.stage && !row.editorial?.stage)) return [];
    const from = productionStage(old.task, old.editorial, old.personIds.length > 0);
    const to = productionStage(row.task, row.editorial, row.personIds.length > 0);
    const explicitChanged = old.editorial?.stage !== row.editorial?.stage;
    if (from === to && !explicitChanged) return [];
    const label = to ? stageLabels[to] : "Отменено";
    return [{
      type: "TASK_STAGE_CHANGED",
      message: "Этап задачи «" + (row.task.title || "Без названия") + "»: " + label,
      metadata: {
        identityVersion: 1,
        taskId: row.task.id,
        personIds: row.personIds,
        previousStage: from,
        stage: to,
      },
    }];
  });
}
