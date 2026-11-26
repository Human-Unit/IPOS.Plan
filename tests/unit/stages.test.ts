import { beforeEach, expect, it } from "vitest";
import { db } from "@/lib/db/database";
import { toPortable } from "@/lib/schema/plan";
import type { Task } from "@/lib/schema/task";
import { moveTaskToStage, productionStage } from "@/features/editorial/stages";
import { setTaskEditorial } from "@/features/editorial/metadata";
import { createPlan, savePlan } from "@/features/plans/repository";

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

const task: Task = { id: "t", title: "Рилс", status: "todo", priority: "medium" };

it("projects old statuses without creating assignments or asserting a real publication", () => {
  expect(productionStage(task, undefined, false)).toBe("idea");
  expect(productionStage(task, undefined, true)).toBe("assigned");
  expect(productionStage({ ...task, status: "in_progress" }, undefined, false)).toBe("production");
  expect(productionStage({ ...task, status: "review" }, undefined, false)).toBe("review");
  expect(productionStage({ ...task, status: "done" }, undefined, false)).toBe("published");
  expect(productionStage({ ...task, status: "cancelled" }, { stage: "editing" }, false)).toBeNull();
});

it("writes one compatible stage and preserves dates, rejects stale writes and prunes conflicting stage overrides", async () => {
  const plan = await createPlan({
    schemaVersion: 1, title: "Работа редакции",
    blocks: [{ type: "task", id: "brief", props: { taskId: "t" } }],
    tasks: { t: task },
  });
  const scheduled = setTaskEditorial(plan, "t", { publicationDate: "2026-12-02" });
  const production = await savePlan(moveTaskToStage(scheduled, "t", "production"));
  const editing = await savePlan(moveTaskToStage(production, "t", "editing"));
  const value = { stage: "editing", publicationDate: "2026-12-02" };
  expect(editing.editorial?.t).toEqual(value);
  expect(editing.assignments).toBeUndefined();
  expect(toPortable(editing)).not.toHaveProperty("editorial");
  expect(toPortable(editing).tasks.t.status).toBe("in_progress");
  await expect(savePlan(moveTaskToStage(production, "t", "review"))).rejects.toThrow(/другой вкладке/);
  expect(await db.plans.get(plan.id)).toEqual(editing);
  const events = await db.activity.where("planId").equals(plan.id).filter(event => event.type === "TASK_STAGE_CHANGED").toArray();
  expect(events.map(event => event.metadata?.stage)).toEqual(expect.arrayContaining(["production", "editing"]));

  const cancelled = await savePlan({ ...editing, tasks: { t: { ...task, status: "cancelled" } } });
  expect(cancelled.editorial?.t).toEqual({ publicationDate: "2026-12-02" });
  expect(() => moveTaskToStage(cancelled, "t", "review")).toThrow(/отменённой/);
});
