import {
  taskEditorialSchema,
  type Editorial,
  type TaskEditorial,
} from "@/lib/schema/editorial";
import type { LocalPlanContent, Plan } from "@/lib/schema/plan";
import { liveTasks } from "@/features/activists/task-assignments";

export function taskEditorial(plan: LocalPlanContent, taskId: string): TaskEditorial | undefined {
  return plan.editorial && Object.hasOwn(plan.editorial, taskId)
    ? plan.editorial[taskId]
    : undefined;
}

function meaningfulDetails(details: TaskEditorial | undefined) {
  return details && Object.values(details).some(value => value !== undefined);
}

export function canonicalEditorial(plan: LocalPlanContent): Editorial | undefined {
  if (!plan.editorial) return undefined;
  const editorial = Object.fromEntries(liveTasks(plan).flatMap(({ task }) => {
    const details = taskEditorial(plan, task.id);
    return meaningfulDetails(details) ? [[task.id, taskEditorialSchema.parse(details)]] : [];
  }));
  return Object.keys(editorial).length ? editorial : undefined;
}

export function setTaskEditorial(plan: Plan, taskId: string, change: Partial<TaskEditorial>): Plan {
  if (!Object.hasOwn(plan.tasks, taskId)) throw new Error("Задача не найдена.");
  const details = taskEditorialSchema.parse({ ...taskEditorial(plan, taskId), ...change });
  const editorial = { ...plan.editorial, [taskId]: details };
  if (!meaningfulDetails(details)) delete editorial[taskId];
  return { ...plan, editorial: Object.keys(editorial).length ? editorial : undefined };
}
