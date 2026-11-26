import { expect, it } from "vitest";
import type { Activity } from "@/lib/db/database";
import type { Plan } from "@/lib/schema/plan";
import { newPlan } from "@/features/plans/repository";
import { activityDays, activityPeriod, editorialMetrics } from "@/features/editorial/analytics";

it("derives workload, queues and stages from unique saved task references", () => {
  const plan = newPlan();
  const a = crypto.randomUUID(), b = crypto.randomUUID();
  const active = { id: "active", title: "Интервью", status: "in_progress", deadline: "2026-11-21", priority: "medium", assignee: "Амина, Амина" } as const;
  const completed = { id: "completed", title: "Фото", status: "done", priority: "medium" } as const;
  const cancelled = { id: "cancelled", title: "Анонс", status: "cancelled", priority: "medium" } as const;
  const scheduled = { id: "scheduled", title: "Рилс", status: "review", priority: "medium" } as const;
  const published = { id: "published", title: "Статья", status: "done", priority: "medium" } as const;
  const source: Plan = {
    ...plan,
    blocks: ["active", "active", "completed", "cancelled", "scheduled", "published"].map(
      (taskId) => ({ type: "task", id: crypto.randomUUID(), props: { taskId } }),
    ),
    tasks: { active, completed, cancelled, scheduled, published, orphan: { ...active, id: "orphan" } },
    assignments: { active: { legacyText: "", people: [a, b].map(personId => ({ personId, name: "Амина" })) } },
    editorial: {
      active: { stage: "editing" },
      cancelled: { publicationDate: "2026-11-25" },
      scheduled: { publicationDate: "2026-11-27" },
      published: { stage: "published", publicationDate: "2026-11-28" },
    },
  };
  const totals = editorialMetrics([source], "2026-11-24");
  expect(totals.total).toBe(5);
  expect(totals.stats).toMatchObject({ completed: 2, unfinished: 2, overdue: 1 });
  expect(totals.upcoming.map(({ row }) => row.task.id)).toEqual(["scheduled"]);
  expect(totals.late.map(row => row.task.id)).toEqual(["active"]);
  expect(totals.legacyDone).toBe(1);
  expect(totals.stages.find(stage => stage.id === "published")?.count).toBe(2);
  expect(totals.workload.get(a)).toMatchObject({ total: 1, unfinished: 1 });
  expect(totals.workload.get(b)).toEqual(totals.workload.get(a));
});

it("counts recorded task events on seven local calendar dates without inferring completion times", () => {
  const record = (day: number, type: string): Activity => ({
    id: crypto.randomUUID(), planId: "plan", type, message: "", createdAt: new Date(2026, 10, day, 12).toISOString(),
  });
  const events = [
    record(17, "TASK_STATUS_CHANGED"), record(18, "TASK_STAGE_CHANGED"),
    record(23, "TASK_PEOPLE_CHANGED"), record(23, "TASK_REVIEW_CHANGED"),
    record(24, "PLAN_CREATED"), record(25, "TASK_STATUS_CHANGED"),
  ];
  expect(activityDays(events, "2026-11-24")).toEqual([
    { day: "2026-11-18", count: 1 }, { day: "2026-11-19", count: 0 }, { day: "2026-11-20", count: 0 },
    { day: "2026-11-21", count: 0 }, { day: "2026-11-22", count: 0 }, { day: "2026-11-23", count: 2 },
    { day: "2026-11-24", count: 0 },
  ]);
  expect(activityPeriod("2026-11-24")).toEqual({
    from: new Date(2026, 10, 18).toISOString(), to: new Date(2026, 10, 25).toISOString(),
  });
});
