import type { Task } from "@/lib/schema/task";
import type { Plan } from "@/lib/schema/plan";
import { priorityLabels, statusLabels } from "@/lib/labels";
export const normalizeSearch = (text: string) =>
  text.normalize("NFKC").toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
// UTC is used only as an ordinal for calendar components, never to interpret a local timestamp.
const ordinal = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};
export const unfinished = (task: Task) =>
  !["done", "cancelled"].includes(task.status);
export function nextUnfinishedTask(tasks: Task[]) {
  let next: Task | undefined;
  for (const task of tasks) {
    if (
      unfinished(task) &&
      (!next || (task.deadline && (!next.deadline || task.deadline < next.deadline)))
    ) next = task;
  }
  return next;
}
export type DeadlineKind =
  | "overdue"
  | "today"
  | "tomorrow"
  | "week"
  | "later"
  | "none"
  | "completed"
  | "cancelled";
export function deadlineInfo(
  task: Task,
  today: string,
): { kind: DeadlineKind; days?: number; label: string } {
  if (task.status === "done") return { kind: "completed", label: "Готово" };
  if (task.status === "cancelled")
    return { kind: "cancelled", label: "Отменено" };
  if (!task.deadline || !today) return { kind: "none", label: "Без дедлайна" };
  const days = ordinal(task.deadline) - ordinal(today);
  const plural = (n: number) =>
    n % 10 === 1 && n % 100 !== 11
      ? "день"
      : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
        ? "дня"
        : "дней";
  if (days < 0)
    return {
      kind: "overdue",
      days,
      label: `Просрочено на ${-days} ${plural(-days)}`,
    };
  if (days === 0) return { kind: "today", days, label: "Дедлайн сегодня" };
  if (days === 1) return { kind: "tomorrow", days, label: "Дедлайн завтра" };
  return {
    kind: days <= 7 ? "week" : "later",
    days,
    label: `До дедлайна ${days} ${plural(days)}`,
  };
}
export const deadlineFilters = {
  all: "Любой дедлайн",
  overdue: "Просрочено",
  thisWeek: "На этой неделе",
  today: "Сегодня",
  tomorrow: "Завтра",
  week: "В ближайшие 7 дней",
  later: "Позже",
  none: "Без дедлайна",
  completed: "Готово",
} as const;
export type TaskFilter = {
  query: string;
  status: string;
  priority: string;
  assignee: string;
  deadline: keyof typeof deadlineFilters;
};
export const emptyTaskFilter: TaskFilter = {
  query: "",
  status: "all",
  priority: "all",
  assignee: "all",
  deadline: "all",
};
export function matchesTask(task: Task, filter: TaskFilter, today: string) {
  const haystack = normalizeSearch(
    [
      task.title,
      task.description,
      task.assignee,
      task.deadline,
      task.deadline?.split("-").reverse().join("."),
      statusLabels[task.status],
      priorityLabels[task.priority],
    ].join(" "),
  );
  if (!haystack.includes(normalizeSearch(filter.query))) return false;
  if (filter.status !== "all" && task.status !== filter.status) return false;
  if (filter.priority !== "all" && task.priority !== filter.priority)
    return false;
  if (filter.assignee !== "all" && task.assignee !== filter.assignee)
    return false;
  const info = deadlineInfo(task, today);
  if (filter.deadline === "thisWeek") {
    const [y, m, d] = today.split("-").map(Number);
    const day = new Date(y, m - 1, d).getDay();
    return (
      info.days !== undefined && info.days >= 0 && info.days <= (7 - day) % 7
    );
  }
  if (filter.deadline === "week")
    return info.days !== undefined && info.days >= 0 && info.days <= 7;
  return filter.deadline === "all" || info.kind === filter.deadline;
}
export type PlanFilter = "all" | "unfinished" | "overdue" | "recent";
type PlanSearchMatch = {
  task?: Task;
  field?: "title" | "description" | "assignee";
};

function findPlanSearchMatch(plan: Plan, query: string): PlanSearchMatch | null {
  const needle = normalizeSearch(query);
  if (!needle || normalizeSearch(plan.title).includes(needle)) return {};

  const words = needle.split(/\s+/);
  const tasks = Object.values(plan.tasks);
  for (const task of tasks) {
    const assignees = normalizeSearch(task.assignee ?? "").split(",");
    if (assignees.some((name) => words.every((word) => name.includes(word)))) {
      return { task, field: "assignee" };
    }
    if (normalizeSearch(task.title).includes(needle)) return { task, field: "title" };
    if (normalizeSearch(task.description ?? "").includes(needle)) return { task, field: "description" };
  }

  // Retain contiguous searches that span adjoining fields or tasks.
  const combined = [plan.title, ...tasks.flatMap((task) => [task.title, task.description, task.assignee])];
  return normalizeSearch(combined.join(" ")).includes(needle) ? {} : null;
}

function matchesPlanFilter(plan: Plan, filter: PlanFilter, today: string) {
  if (filter === "all") return true;
  const tasks = Object.values(plan.tasks);
  if (filter === "unfinished") return tasks.some(unfinished);
  if (filter === "overdue")
    return tasks.some((t) => deadlineInfo(t, today).kind === "overdue");
  if (filter === "recent") {
    const age = ordinal(today) - ordinal(localDate(new Date(plan.updatedAt)));
    return age >= 0 && age <= 6;
  }
  return true;
}
export function matchPlan(plan: Plan, query: string, filter: PlanFilter, today: string) {
  return matchesPlanFilter(plan, filter, today) ? findPlanSearchMatch(plan, query) : null;
}

export function taskStats(tasks: Task[], today: string) {
  return tasks.reduce(
    (stats, t) => {
      const info = deadlineInfo(t, today);
      if (unfinished(t)) stats.unfinished++;
      if (info.kind === "overdue") stats.overdue++;
      if (info.days !== undefined && info.days >= 0 && info.days <= 7)
        stats.upcoming++;
      if (t.status === "done") stats.completed++;
      return stats;
    },
    { unfinished: 0, overdue: 0, upcoming: 0, completed: 0 },
  );
}
