import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/database";
import {
  createPlan,
  savePlan,
  replacePlan,
  saveRevision,
  deletePlan,
  duplicatePlan,
} from "@/features/plans/repository";
import { demoPlan, seedDemo } from "@/features/plans/demo";
beforeEach(async () => {
  await Promise.all([
    db.plans.clear(),
    db.activity.clear(),
    db.revisions.clear(),
    db.settings.clear(),
  ]);
});
describe("IndexedDB repository", () => {
  it("persists plans across reopening the database", async () => {
    const plan = await createPlan(demoPlan);
    db.close();
    await db.open();
    expect(await db.plans.get(plan.id)).toEqual(plan);
  });
  it("saves content and records structured events", async () => {
    const p = await createPlan(demoPlan);
    const saved = await savePlan({
      ...p,
      title: "Новое название",
      tasks: {
        ...p.tasks,
        "demo-photo": {
          ...p.tasks["demo-photo"],
          status: "review",
          assignee: "Редактор",
        },
      },
    });
    expect(saved.version).toBe(2);
    const events = await db.activity.where({ planId: p.id }).toArray();
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining([
        "PLAN_RENAMED",
        "TASK_STATUS_CHANGED",
        "TASK_ASSIGNED",
      ]),
    );
  });
  it("rejects stale tab saves without overwriting", async () => {
    const p = await createPlan(demoPlan);
    await savePlan({ ...p, title: "First" });
    await expect(savePlan({ ...p, title: "Stale" })).rejects.toThrow(
      "другой вкладке",
    );
    expect((await db.plans.get(p.id))?.title).toBe("First");
  });
  it("atomically snapshots before import and restore", async () => {
    const p = await createPlan(demoPlan);
    const imported = await replacePlan(
      p,
      { ...demoPlan, title: "Импорт" },
      "PLAN_IMPORTED",
    );
    const revisions = await db.revisions.where({ planId: p.id }).toArray();
    expect(revisions[0].snapshot).toEqual(p);
    const restored = await replacePlan(
      imported,
      revisions[0].snapshot,
      "PLAN_RESTORED",
    );
    expect(restored.title).toBe(p.title);
    expect(await db.revisions.where({ planId: p.id }).count()).toBe(2);
  });
  it("rolls back the entire import when activity write fails", async () => {
    const p = await createPlan(demoPlan);
    const hook = () => {
      throw new Error("simulated storage failure");
    };
    db.activity.hook("creating", hook);
    try {
      await expect(
        replacePlan(
          p,
          { ...demoPlan, title: "Must not save" },
          "PLAN_IMPORTED",
        ),
      ).rejects.toThrow("simulated");
    } finally {
      db.activity.hook("creating").unsubscribe(hook);
    }
    expect(await db.plans.get(p.id)).toEqual(p);
    expect(await db.revisions.count()).toBe(0);
  });
  it("invalid import leaves document and history unchanged", async () => {
    const p = await createPlan(demoPlan);
    await expect(
      replacePlan(
        p,
        { ...demoPlan, schemaVersion: 2 } as unknown as typeof demoPlan,
        "PLAN_IMPORTED",
      ),
    ).rejects.toThrow();
    expect(await db.plans.get(p.id)).toEqual(p);
    expect(await db.revisions.count()).toBe(0);
  });
  it("duplicates independently and removes associated local history", async () => {
    const p = await createPlan(demoPlan);
    const copy = await duplicatePlan(p);
    expect(copy.id).not.toBe(p.id);
    await saveRevision(p);
    await deletePlan(p.id);
    expect(await db.plans.get(copy.id)).toBeDefined();
    expect(await db.activity.where({ planId: p.id }).count()).toBe(0);
    expect(await db.revisions.where({ planId: p.id }).count()).toBe(0);
  });
  it("seeds once and respects deleting the demo", async () => {
    await Promise.all([seedDemo(), seedDemo()]);
    expect(await db.plans.count()).toBe(1);
    const p = await db.plans.toCollection().first();
    await deletePlan(p!.id);
    await seedDemo();
    expect(await db.plans.count()).toBe(0);
  });
});
