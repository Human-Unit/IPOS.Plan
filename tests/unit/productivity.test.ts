import { describe, expect, it } from "vitest";
import { deadlineInfo, emptyTaskFilter, matchesTask, matchesPlan, taskStats, localDate } from "@/features/plans/productivity";
import { newPlan } from "@/features/plans/repository";
import type { Task } from "@/lib/schema/task";
const task: Task = { id: "a", title: "Рилс — СТУДЕНТЫ", description: "Съёмка жизни кампуса", assignee: "Амина", status: "review", priority: "high", deadline: "2026-10-23" };
describe("local date-only deadline intelligence", () => {
  it.each([
    ["2026-10-20", "2026-10-22", "overdue", -2],
    ["2026-10-22", "2026-10-22", "today", 0],
    ["2026-10-23", "2026-10-22", "tomorrow", 1],
    ["2026-10-29", "2026-10-22", "week", 7],
    ["2026-10-30", "2026-10-22", "later", 8],
    ["2027-01-01", "2026-12-31", "tomorrow", 1],
    ["2028-03-01", "2028-02-28", "week", 2],
    ["2026-11-01", "2026-10-31", "tomorrow", 1],
    ["2026-03-09", "2026-03-08", "tomorrow", 1],
  ])("classifies %s relative to %s", (deadline, today, kind, days) => {
    expect(deadlineInfo({ ...task, deadline }, today)).toMatchObject({ kind, days });
  });
  it("excludes completed/cancelled tasks with old dates and distinguishes missing dates", () => {
    expect(deadlineInfo({ ...task, deadline: "2020-01-01", status: "done" }, "2026-10-22").kind).toBe("completed");
    expect(deadlineInfo({ ...task, deadline: "2020-01-01", status: "cancelled" }, "2026-10-22").kind).toBe("cancelled");
    expect(deadlineInfo({ ...task, deadline: undefined }, "2026-10-22").kind).toBe("none");
    expect(localDate(new Date(2026, 0, 1, 0, 1))).toBe("2026-01-01");
  });
  it("keeps calendar week distinct from rolling seven days; Sundays include today", () => {
    expect(matchesTask({ ...task, deadline: "2026-10-26" }, { ...emptyTaskFilter, deadline: "thisWeek" }, "2026-10-22")).toBe(false);
    expect(matchesTask({ ...task, deadline: "2026-10-26" }, { ...emptyTaskFilter, deadline: "week" }, "2026-10-22")).toBe(true);
    expect(matchesTask({ ...task, deadline: "2026-10-25" }, { ...emptyTaskFilter, deadline: "thisWeek" }, "2026-10-25")).toBe(true);
    expect(matchesTask({ ...task, deadline: "2026-10-26" }, { ...emptyTaskFilter, deadline: "thisWeek" }, "2026-10-25")).toBe(false);
  });
  it("derives counts without counting cancelled work as unfinished, overdue or completed", () => {
    const tasks = [task, { ...task, deadline: "2026-10-21" }, { ...task, status: "done" as const, deadline: "2020-01-01" }, { ...task, status: "cancelled" as const, deadline: "2020-01-01" }];
    expect(taskStats(tasks, "2026-10-22")).toEqual({ unfinished: 2, overdue: 1, upcoming: 1, completed: 1 });
  });
});
describe("derived search and filters", () => {
  it.each(["СТУДЕНТЫ", "рилс", "съемка", "АМИНА", "На проверке", "Высокий", "23.10.2026", "2026-10-23"])("matches Russian text/metadata: %s", query => {
    expect(matchesTask(task, { ...emptyTaskFilter, query }, "2026-10-22")).toBe(true);
  });
  it("combines status, priority and responsible filters, clears and returns empty results", () => {
    expect(matchesTask(task, { ...emptyTaskFilter, status: "review", priority: "high", assignee: "Амина" }, "2026-10-22")).toBe(true);
    for (const filter of [{ status: "done" }, { priority: "low" }, { assignee: "Никита" }, { query: "Нет совпадений" }]) expect(matchesTask(task, { ...emptyTaskFilter, ...filter }, "2026-10-22")).toBe(false);
    expect(matchesTask(task, emptyTaskFilter, "2026-10-22")).toBe(true);
  });
  it("finds plan/task titles, descriptions and assignees and respects dashboard filters", () => {
    const p = { ...newPlan(), title: "Контент-план осени", tasks: { a: task }, updatedAt: "2026-10-20T07:00:00Z" };
    for (const query of ["ОСЕНИ", "студенты", "СЪЁМКА", "амина"]) expect(matchesPlan(p, query, "all", "2026-10-22")).toBe(true);
    expect(matchesPlan(p, "", "unfinished", "2026-10-22")).toBe(true);
    expect(matchesPlan(p, "", "overdue", "2026-10-22")).toBe(false);
    expect(matchesPlan(p, "", "recent", "2026-10-22")).toBe(true);
    expect(matchesPlan(p, "", "recent", "2026-10-30")).toBe(false);
    expect(p.tasks.a).toEqual(task);
  });
});
