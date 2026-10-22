import {
  assignmentText,
  taskAssignmentSchema,
  type LocalAssignments,
  type TaskAssignment,
} from "@/lib/schema/task-assignment";
import {
  flattenBlocks,
  type LocalPlanContent,
  type Plan,
} from "@/lib/schema/plan";
import type { Person } from "@/lib/schema/person";
import { getPerson } from "./people-repository";

export function liveTasks(plan: LocalPlanContent) {
  const seen = new Set<string>();
  return flattenBlocks(plan.blocks).flatMap((block) => {
    if (
      block.type !== "task" ||
      seen.has(block.props.taskId) ||
      !plan.tasks[block.props.taskId]
    )
      return [];
    seen.add(block.props.taskId);
    return [{ blockId: block.id, task: plan.tasks[block.props.taskId] }];
  });
}
export function canonicalAssignments(
  plan: LocalPlanContent,
): LocalAssignments | undefined {
  const assignments = Object.fromEntries(
    liveTasks(plan).flatMap(({ task }) => {
      const value = plan.assignments?.[task.id];
      if (!value || assignmentText(value) !== (task.assignee ?? "")) return [];
      return [[task.id, taskAssignmentSchema.parse(value)]];
    }),
  );
  return Object.keys(assignments).length ? assignments : undefined;
}
export function confirmedAssignment(
  plan: LocalPlanContent,
  taskId: string,
): TaskAssignment | undefined {
  const task = plan.tasks[taskId],
    value = plan.assignments?.[taskId];
  return value && task && assignmentText(value) === (task.assignee ?? "")
    ? value
    : undefined;
}
export function makeAssignment(
  people: Person[],
  legacyText = "",
): TaskAssignment | undefined {
  return people.length
    ? taskAssignmentSchema.parse({
        legacyText,
        people: people.map((p) => ({ personId: p.id, name: p.displayName })),
      })
    : undefined;
}
export function setTaskAssignment(
  plan: Plan,
  taskId: string,
  value: TaskAssignment | undefined,
  textWhenEmpty = "",
): Plan {
  if (!plan.tasks[taskId]) throw new Error("Задача не найдена.");
  const assignments = { ...plan.assignments };
  if (value) assignments[taskId] = taskAssignmentSchema.parse(value);
  else delete assignments[taskId];
  const text = value ? assignmentText(value) : textWhenEmpty;
  if (text.length > 200)
    throw new Error("Текст назначения превышает 200 символов.");
  return {
    ...plan,
    tasks: {
      ...plan.tasks,
      [taskId]: { ...plan.tasks[taskId], assignee: text || undefined },
    },
    assignments: Object.keys(assignments).length ? assignments : undefined,
  };
}
export async function validateAssignmentPeople(assignments?: LocalAssignments) {
  const ids = new Set(
    Object.values(assignments ?? {}).flatMap((v) =>
      v.people.map((p) => p.personId),
    ),
  );
  for (const id of ids)
    if (!(await getPerson(id)))
      throw new Error(
        "Человек из назначения не найден в локальном справочнике. Проверьте назначение.",
      );
}
export function assignmentEvents(
  previous: LocalPlanContent,
  next: LocalPlanContent,
) {
  const old = canonicalAssignments(previous) ?? {},
    current = canonicalAssignments(next) ?? {};
  return [...new Set([...Object.keys(old), ...Object.keys(current)])].flatMap(
    (taskId) => {
      if (JSON.stringify(old[taskId]) === JSON.stringify(current[taskId]))
        return [];
      return [
        {
          type: "TASK_PEOPLE_CHANGED",
          message: `Привязки людей к задаче «${next.tasks[taskId]?.title || previous.tasks[taskId]?.title || "Без названия"}»: ${current[taskId]?.people.map((p) => p.name).join(", ") || "сняты"}`,
          metadata: {
            taskId,
            personIds: current[taskId]?.people.map((p) => p.personId) ?? [],
            previousPersonIds: old[taskId]?.people.map((p) => p.personId) ?? [],
          },
        },
      ];
    },
  );
}
export const taskHref = (planId: string, taskId: string) =>
  `/plan/${encodeURIComponent(planId)}#task=${encodeURIComponent(taskId)}`;
