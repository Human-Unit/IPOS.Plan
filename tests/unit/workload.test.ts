import { describe, expect, it } from "vitest";
import { blankPerson, type Person } from "@/lib/schema/person";
import type { Plan } from "@/lib/schema/plan";
import type { Activity } from "@/lib/db/database";
import { newPlan } from "@/features/plans/repository";
import {
  assignmentRows,
  emptyWorkloadFilter,
  filterAssignmentRows,
  personEvents,
  suggestPeople,
  workSummary,
} from "@/features/activists/workload";
import {
  makeAssignment,
  setTaskAssignment,
  taskHref,
} from "@/features/activists/task-assignments";
const person = (displayName: string, aliases: string[] = []): Person => ({
  ...blankPerson,
  displayName,
  aliases,
  id: crypto.randomUUID(),
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  version: 1,
});
const islam = person("Ислом", ["Ислам"]),
  maruf = person("Маруф");
function fixture() {
  let p: Plan = newPlan({
    schemaVersion: 1,
    title: "Осенняя неделя",
    blocks: [
      { id: "b1", type: "task", props: { taskId: "one" } },
      { id: "duplicate", type: "task", props: { taskId: "one" } },
      { id: "b2", type: "task", props: { taskId: "two" } },
      { id: "b3", type: "task", props: { taskId: "raw" } },
    ],
    tasks: {
      one: {
        id: "one",
        title: "Reels",
        status: "in_progress",
        priority: "high",
        deadline: "2026-10-21",
      },
      two: {
        id: "two",
        title: "Карусель",
        status: "done",
        priority: "medium",
        deadline: "2020-01-01",
      },
      raw: {
        id: "raw",
        title: "Старый текст",
        status: "review",
        priority: "low",
        assignee: "Ислом, Маруф",
      },
      orphan: {
        id: "orphan",
        title: "Удалено, осталось для undo",
        status: "done",
        priority: "low",
      },
    },
  });
  p = setTaskAssignment(p, "one", makeAssignment([islam, maruf]));
  p = setTaskAssignment(p, "two", makeAssignment([islam]));
  return p;
}
describe("derived people workload", () => {
  it("counts unique live tasks and each explicit contributor; matching legacy text never attributes work", () => {
    const plan = fixture(),
      before = JSON.stringify(plan),
      rows = assignmentRows([plan]);
    expect(rows).toHaveLength(3);
    expect(
      workSummary(
        rows.filter((r) => r.personIds.includes(islam.id)),
        "2026-10-22",
      ),
    ).toEqual({
      total: 2,
      unfinished: 1,
      overdue: 1,
      upcoming: 0,
      completed: 1,
      inProgress: 1,
      review: 0,
    });
    expect(
      workSummary(
        rows.filter((r) => r.personIds.includes(maruf.id)),
        "2026-10-22",
      ).total,
    ).toBe(1);
    expect(rows.find((r) => r.task.id === "raw")!.personIds).toEqual([]);
    expect(JSON.stringify(plan)).toBe(before);
  });
  it("same task ID in another plan is a separate assignment and responds to completion", () => {
    const p = fixture(),
      copy = {
        ...p,
        id: crypto.randomUUID(),
        tasks: { ...p.tasks, one: { ...p.tasks.one, status: "done" as const } },
      };
    const rows = assignmentRows([p, copy]).filter((r) =>
      r.personIds.includes(maruf.id),
    );
    expect(workSummary(rows, "2026-10-22")).toMatchObject({
      total: 2,
      completed: 1,
      overdue: 1,
    });
  });
  it("combines person/status/plan/deadline filters and clears without changes", () => {
    const p = fixture(),
      rows = assignmentRows([p]);
    expect(
      filterAssignmentRows(
        rows,
        {
          ...emptyWorkloadFilter,
          personId: maruf.id,
          status: "in_progress",
          planId: p.id,
          deadline: "overdue",
        },
        "2026-10-22",
      ),
    ).toHaveLength(1);
    expect(
      filterAssignmentRows(
        rows,
        { ...emptyWorkloadFilter, status: "done", deadline: "overdue" },
        "2026-10-22",
      ),
    ).toEqual([]);
    expect(
      filterAssignmentRows(rows, emptyWorkloadFilter, "2026-10-22"),
    ).toHaveLength(3);
  });
  it("deadline date windows are inclusive and never treated as completion dates", () => {
    const rows = assignmentRows([fixture()]);
    expect(
      filterAssignmentRows(
        rows,
        { ...emptyWorkloadFilter, from: "2026-10-21", to: "2026-10-21" },
        "2026-10-22",
      ).map((r) => r.task.id),
    ).toEqual(["one"]);
    expect(
      filterAssignmentRows(
        rows,
        { ...emptyWorkloadFilter, from: "2026-10-23", to: "2026-10-21" },
        "2026-10-22",
      ),
    ).toEqual([]);
    expect(
      filterAssignmentRows(
        rows,
        { ...emptyWorkloadFilter, from: "2020-01-01", to: "2020-01-01" },
        "2026-10-22",
      ).map((r) => r.task.id),
    ).toEqual(["two"]);
  });
  it("only attributes persisted ID-based activity, including an explicit unlink", () => {
    const common = {
      planId: "plan",
      createdAt: "2026-10-22T00:00:00Z",
      message: "Ислом",
    };
    const events: Activity[] = [
      { ...common, id: "legacy", type: "TASK_ASSIGNED" },
      {
        ...common,
        id: "linked",
        type: "TASK_PEOPLE_CHANGED",
        metadata: { personIds: [islam.id] },
      },
      {
        ...common,
        id: "removed",
        type: "TASK_PEOPLE_CHANGED",
        metadata: { personIds: [], previousPersonIds: [islam.id] },
      },
      {
        ...common,
        id: "other",
        type: "TASK_STATUS_CHANGED",
        metadata: { personIds: [maruf.id] },
      },
    ];
    expect(personEvents(events, islam.id).map((e) => e.id)).toEqual([
      "linked",
      "removed",
    ]);
  });
  it("suggests aliases and similar/duplicate names without merging identities or splitting groups", () => {
    const duplicate = person("Ислом");
    expect(suggestPeople("ИСЛАМ", [islam, duplicate]).map((p) => p.id)).toEqual(
      [islam.id, duplicate.id],
    );
    expect(
      suggestPeople("Съёмочная группа, редакторы", [islam, maruf]),
    ).toEqual([]);
    expect(duplicate.id).not.toBe(islam.id);
    expect(taskHref("plan", "съёмка/1")).toBe(
      "/plan/plan#task=%D1%81%D1%8A%D1%91%D0%BC%D0%BA%D0%B0%2F1",
    );
  });
});
