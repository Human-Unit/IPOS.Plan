import type { Task } from "@/lib/schema/task";
import { flattenBlocks, type Plan } from "@/lib/schema/plan";
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
export type PlanFilter = "all" | "unfinished" | "overdue" | "upcoming" | "completed" | "recent";
export function tasksInPlan(plan: Plan) {
  const ids = new Set(flattenBlocks(plan.blocks)
    .filter(block => block.type === "task")
    .map(block => block.props.taskId));
  return Array.from(ids, id => plan.tasks[id]).filter(Boolean);
}

// null means the plan is hidden. An empty list is a plan-level match.
export function dashboardMatches(plan: Plan, tasks: Task[], query: string, filter: PlanFilter, today: string): Task[] | null {
  if (filter === "recent") {
    const age = ordinal(today) - ordinal(localDate(new Date(plan.updatedAt)));
    if (age < 0 || age > 6) return null;
  }
  const term = normalizeSearch(query);
  const titleMatches = normalizeSearch(plan.title).includes(term);
  const taskFilter = filter !== "all" && filter !== "recent";
  if (!taskFilter && titleMatches) return [];
  const matches = tasks.filter(task => {
    if (!titleMatches && !normalizeSearch([task.title, task.description, task.assignee].join(" ")).includes(term)) return false;
    switch (filter) {
      case "unfinished": return unfinished(task);
      case "completed": return task.status === "done";
      case "overdue": return deadlineInfo(task, today).kind === "overdue";
      case "upcoming": {
        const { days } = deadlineInfo(task, today);
        return days !== undefined && days >= 0 && days <= 7;
      }
      default: return true;
    }
  });
  return matches.length ? matches : null;
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
