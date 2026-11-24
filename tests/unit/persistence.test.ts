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
  it("records task fields once per persisted save and preserves historical messages", async () => {
    const p = await createPlan(demoPlan);
    await db.activity.add({
      id: "legacy-event",
      planId: p.id,
      type: "OLD_CUSTOM_EVENT",
      message: "Историческая запись без нового формата",
      createdAt: "2020-01-01T00:00:00Z",
      metadata: { original: true },
    });
    const historical = await db.activity.toArray();
    const old = p.tasks["demo-photo"];
    const saved = await savePlan({
      ...p,
      tasks: {
        ...p.tasks,
        [old.id]: {
          ...old,
          title: "UX audit task",
          description: "Private description that must not appear in activity",
          status: "review",
          deadline: "2026-11-01",
          priority: "high",
          assignee: "Новый редактор",
        },
      },
    });
    const events = await db.activity.toArray();
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining([
        "TASK_RENAMED",
        "TASK_DESCRIPTION_CHANGED",
        "TASK_STATUS_CHANGED",
        "TASK_DEADLINE_CHANGED",
        "TASK_PRIORITY_CHANGED",
        "TASK_ASSIGNED",
      ]),
    );
    expect(events.find((e) => e.type === "TASK_RENAMED")?.message).toBe(
      `Задача переименована: «${old.title}» → «UX audit task»`,
    );
    expect(
      events.find((e) => e.type === "TASK_DESCRIPTION_CHANGED")?.message,
    ).toBe("Изменено описание задачи «UX audit task»");
    expect(JSON.stringify(events)).not.toContain("Private description");
    expect(events.filter((e) => historical.some((h) => h.id === e.id))).toEqual(
      historical,
    );
    await savePlan(await savePlan(saved));
    expect(await db.activity.count()).toBe(events.length);
  });
  it("records deletion of referenced task entities even if editor undo retains them in memory", async () => {
    const p = await createPlan(demoPlan);
    const task = p.tasks["demo-photo"];
    const saved = await savePlan({
      ...p,
      blocks: p.blocks.filter(
        (b) => b.type !== "task" || b.props.taskId !== task.id,
      ),
    });
    expect(saved.tasks[task.id]).toBeUndefined();
    expect(
      await db.activity.filter((e) => e.type === "TASK_DELETED").count(),
    ).toBe(1);
    const repeated = await savePlan(saved);
    expect(
      await db.activity.filter((e) => e.type === "TASK_DELETED").count(),
    ).toBe(1);
    const restored = await savePlan({
      ...repeated,
      blocks: p.blocks,
      tasks: p.tasks,
    });
    expect(restored.tasks[task.id]).toEqual(task);
    expect(
      await db.activity.filter((e) => e.type === "TASK_CREATED").count(),
    ).toBe(1);
  });
  it("records nested reference creation, rename, URL, notes and deletion at save boundaries", async () => {
    const p = await createPlan(demoPlan);
    const block = {
      id: "nested-reference",
      type: "reference" as const,
      props: { title: "", url: "", note: "" },
    };
    const created = await savePlan({
      ...p,
      blocks: [
        ...p.blocks,
        { id: "parent", type: "paragraph", content: [], children: [block] },
      ],
    });
    expect(
      await db.activity.filter((e) => e.type === "REFERENCE_ADDED").count(),
    ).toBe(1);
    const before = await db.activity.toArray();
    const renamed = await savePlan({
      ...created,
      blocks: [
        ...p.blocks,
        {
          id: "parent",
          type: "paragraph",
          content: [],
          children: [
            {
              ...block,
              props: { ...block.props, title: "Название референса" },
            },
          ],
        },
      ],
    });
    const renamedEvent = (await db.activity.toArray()).find(
      (e) => e.type === "REFERENCE_CHANGED",
    )!;
    expect(renamedEvent.message).toBe(
      "Изменён референс: «без названия» → «Название референса»",
    );
    expect(renamedEvent.metadata?.changedFields).toEqual(["title"]);
    const updated = await savePlan({
      ...renamed,
      blocks: [
        ...p.blocks,
        {
          id: "parent",
          type: "paragraph",
          content: [],
          children: [
            {
              ...block,
              props: {
                title: "Название референса",
                url: "https://example.org/reference",
                note: "Private notes",
              },
            },
          ],
        },
      ],
    });
    const edits = await db.activity
      .filter((e) => e.type === "REFERENCE_CHANGED")
      .toArray();
    expect(edits).toHaveLength(2);
    expect(
      edits.find((e) => e.metadata?.changedFields?.toString() === "url,note")
        ?.message,
    ).toBe("Изменён референс «Название референса»");
    expect(JSON.stringify(edits)).not.toContain("Private notes");
    const repeated = await savePlan(updated);
    expect(
      await db.activity.filter((e) => e.type === "REFERENCE_CHANGED").count(),
    ).toBe(2);
    await savePlan({ ...repeated, blocks: p.blocks });
    expect(
      await db.activity.filter((e) => e.type === "REFERENCE_REMOVED").count(),
    ).toBe(1);
    for (const entry of before)
      expect(await db.activity.get(entry.id)).toEqual(entry);
  });
  it("clears optional task fields without text spam", async () => {
    const p = await createPlan(demoPlan);
    const task = p.tasks["demo-photo"];
    const initial = await savePlan({
      ...p,
      tasks: {
        ...p.tasks,
        [task.id]: {
          ...task,
          description: "text",
          deadline: "2026-10-23",
          assignee: "Редактор",
        },
      },
    });
    await db.activity.clear();
    await savePlan({
      ...initial,
      tasks: {
        ...initial.tasks,
        [task.id]: {
          ...initial.tasks[task.id],
          description: undefined,
          deadline: undefined,
          assignee: undefined,
        },
      },
    });
    expect((await db.activity.toArray()).map((e) => e.type).sort()).toEqual([
      "TASK_ASSIGNED",
      "TASK_DEADLINE_CHANGED",
      "TASK_DESCRIPTION_CHANGED",
    ]);
  });
  it("rolls back plan and all activity on autosave failure", async () => {
    const p = await createPlan(demoPlan);
    const before = await db.activity.toArray();
    const hook = () => {
      throw new Error("simulated activity failure");
    };
    db.activity.hook("creating", hook);
    try {
      await expect(
        savePlan({
          ...p,
          title: "Must not persist",
          tasks: {
            ...p.tasks,
            "demo-photo": {
              ...p.tasks["demo-photo"],
              title: "Failed name",
              description: "Failed edit",
            },
          },
        }),
      ).rejects.toThrow("simulated activity failure");
    } finally {
      db.activity.hook("creating").unsubscribe(hook);
    }
    expect(await db.plans.get(p.id)).toEqual(p);
    expect(await db.activity.toArray()).toEqual(before);
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

it("imports and applies a cloud plan with one binding update and the former local revision", async () => {
  const binding = { id: crypto.randomUUID(), version: 1 };
  const old = await createPlan(demoPlan, "PLAN_IMPORTED", binding);
  const key = "ai-sync:plan:" + old.id;
  expect((await db.settings.get(key))?.value).toEqual(binding);

  const otherTab = await savePlan({ ...old, title: "Правка в другой вкладке" });
  const incoming = { ...demoPlan, title: "Вариант из GPT" };
  const next = { ...binding, version: 2 };
  await expect(replacePlan(old, incoming, "PLAN_IMPORTED", next)).rejects.toThrow(/изменился/);
  expect(await db.plans.get(old.id)).toEqual(otherTab);
  expect((await db.settings.get(key))?.value).toEqual(binding);
  expect(await db.revisions.where({ planId: old.id }).count()).toBe(0);

  await replacePlan(otherTab, incoming, "PLAN_IMPORTED", next);
  expect((await db.settings.get(key))?.value).toEqual(next);
  expect((await db.plans.get(old.id))?.title).toBe(incoming.title);
  expect((await db.revisions.where({ planId: old.id }).first())?.snapshot).toEqual(otherTab);
});