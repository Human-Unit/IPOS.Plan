import type { Plan } from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";
import type { Person } from "@/lib/schema/person";
import type { Activity } from "@/lib/db/database";
import {
  deadlineInfo,
  normalizeSearch,
  taskStats,
} from "@/features/plans/productivity";
import { confirmedAssignment, liveTasks } from "./task-assignments";

export type AssignmentRow = {
  planId: string;
  planTitle: string;
  blockId?: string;
  task: Task;
  personIds: string[];
};
export function assignmentRows(plans: Plan[]): AssignmentRow[] {
  return plans.flatMap((plan) =>
    liveTasks(plan).map(({ task, blockId }) => ({
      planId: plan.id,
      planTitle: plan.title,
      blockId,
      task,
      personIds:
        confirmedAssignment(plan, task.id)?.people.map((p) => p.personId) ?? [],
    })),
  );
}
export const emptyWorkloadFilter = {
  personId: "all",
  status: "all",
  planId: "all",
  deadline: "all",
  from: "",
  to: "",
};
export type WorkloadFilter = typeof emptyWorkloadFilter;
export function filterAssignmentRows(
  rows: AssignmentRow[],
  filter: WorkloadFilter,
  today: string,
) {
  if (filter.from && filter.to && filter.from > filter.to) return [];
  return rows.filter((row) => {
    if (filter.personId !== "all" && !row.personIds.includes(filter.personId))
      return false;
    if (filter.status !== "all" && row.task.status !== filter.status)
      return false;
    if (filter.planId !== "all" && row.planId !== filter.planId) return false;
    if (filter.from && (!row.task.deadline || row.task.deadline < filter.from))
      return false;
    if (filter.to && (!row.task.deadline || row.task.deadline > filter.to))
      return false;
    const info = deadlineInfo(row.task, today);
    if (filter.deadline === "week")
      return info.days !== undefined && info.days >= 0 && info.days <= 7;
    return filter.deadline === "all" || info.kind === filter.deadline;
  });
}
export function workSummary(rows: AssignmentRow[], today: string) {
  return {
    total: rows.length,
    ...taskStats(
      rows.map((r) => r.task),
      today,
    ),
    inProgress: rows.filter((r) => r.task.status === "in_progress").length,
    review: rows.filter((r) => r.task.status === "review").length,
  };
}
export function personEvents(activity: Activity[], personId: string) {
  return activity
    .filter(
      (a) =>
        a.type.startsWith("TASK_") &&
        a.metadata?.identityVersion === 1 &&
        [a.metadata?.personIds, a.metadata?.previousPersonIds].some(
          (ids) => Array.isArray(ids) && ids.includes(personId),
        ),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function workloadByPerson(rows: AssignmentRow[], today: string) {
  const groups = new Map<string, AssignmentRow[]>();
  for (const row of rows)
    for (const id of new Set(row.personIds)) {
      const group = groups.get(id);
      if (group) group.push(row);
      else groups.set(id, [row]);
    }
  return new Map(
    [...groups].map(([id, group]) => [id, workSummary(group, today)]),
  );
}
/** Suggestions are presentation only. No link, merge or text rewrite occurs here. */
export function suggestPeople(text: string, people: Person[]) {
  const label = normalizeSearch(text);
  if (!label || label.length > 80) return [];
  const near = (a: string, b: string) => {
    if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 3)
      return false;
    let i = 0,
      j = 0,
      edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        i++;
        j++;
        continue;
      }
      if (++edits > 1) return false;
      if (a.length <= b.length) j++;
      if (a.length >= b.length) i++;
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
  };
  return people
    .filter((p) =>
      [p.displayName, ...p.aliases].some((name) => {
        const candidate = normalizeSearch(name);
        return candidate === label || near(candidate, label);
      }),
    )
    .slice(0, 5);
}
