import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/database";
import { blankPerson } from "@/lib/schema/person";
import { toPortable, planSchema } from "@/lib/schema/plan";
import { taskAssignmentSchema } from "@/lib/schema/task-assignment";
import { createPerson } from "@/features/activists/people-repository";
import {
  canonicalAssignments,
  liveTasks,
  makeAssignment,
  setTaskAssignment,
} from "@/features/activists/task-assignments";
import {
  createPlan,
  deletePlan,
  duplicatePlan,
  replacePlan,
  savePlan,
  saveRevision,
} from "@/features/plans/repository";
import { duplicateBrief } from "@/components/editor/brief-document";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});
const setup = async () => {
  const people = await Promise.all(
    ["Ислом", "Маруф"].map((displayName) =>
      createPerson({ ...blankPerson, displayName }),
    ),
  );
  const plan = await createPlan({
    schemaVersion: 1,
    title: "Производство",
    tasks: {
      reel: { id: "reel", title: "Reels", status: "todo", priority: "high" },
    },
    blocks: [
      { id: "brief", type: "task", props: { taskId: "reel" } },
      { id: "repeat", type: "task", props: { taskId: "reel" } },
    ],
  });
  return { people, plan };
};
describe("local task/person associations", () => {
  it("saves multiple stable identities and plain portable names while counting a repeated task once", async () => {
    const { people, plan } = await setup();
    const saved = await savePlan(
      setTaskAssignment(plan, "reel", makeAssignment(people)),
    );
    expect(saved.tasks.reel.assignee).toBe("Ислом, Маруф");
    expect(saved.assignments?.reel.people.map((p) => p.personId)).toEqual(
      people.map((p) => p.id),
    );
    expect(liveTasks(saved)).toHaveLength(1);
    expect(planSchema.safeParse(saved).success).toBe(true);
    expect(toPortable(saved)).not.toHaveProperty("assignments");
    expect(JSON.stringify(toPortable(saved))).not.toContain(people[0].id);
    expect(
      (await db.activity
        .filter((a) => a.type === "TASK_PEOPLE_CHANGED")
        .first())!.metadata?.personIds,
    ).toEqual(people.map((p) => p.id));
  });
  it("distinguishes same-name identities even when exported assignment text is identical", async () => {
    const { plan } = await setup();
    const a = await createPerson({ ...blankPerson, displayName: "Азиз" });
    const b = await createPerson({ ...blankPerson, displayName: "Азиз" });
    const first = await savePlan(
      setTaskAssignment(plan, "reel", makeAssignment([a])),
    );
    const second = await savePlan(
      setTaskAssignment(first, "reel", makeAssignment([b])),
    );
    expect(first.tasks.reel.assignee).toBe(second.tasks.reel.assignee);
    const events = await db.activity
      .filter((a) => a.type === "TASK_PEOPLE_CHANGED")
      .toArray();
    expect(events).toHaveLength(2);
    expect(
      events.find((e) => (e.metadata?.personIds as string[]).includes(b.id))!
        .metadata,
    ).toMatchObject({ personIds: [b.id], previousPersonIds: [a.id] });
  });
  it("portable import clears identity assumptions, while revision restore retains explicitly saved links", async () => {
    const { people, plan } = await setup();
    const linked = await savePlan(
      setTaskAssignment(
        plan,
        "reel",
        makeAssignment(people, "Съёмочная группа"),
      ),
    );
    const revision = await saveRevision(linked);
    const imported = await replacePlan(
      linked,
      toPortable(linked),
      "PLAN_IMPORTED",
    );
    expect(imported.assignments).toBeUndefined();
    expect(imported.tasks.reel.assignee).toBe(linked.tasks.reel.assignee);
    const restored = await replacePlan(
      imported,
      revision.snapshot,
      "PLAN_RESTORED",
    );
    expect(restored.assignments).toEqual(linked.assignments);
  });
  it("prunes deleted/detached links at persistence without mutating working-copy undo metadata", async () => {
    const { people, plan } = await setup();
    const working = setTaskAssignment(plan, "reel", makeAssignment(people));
    const deleted = await savePlan({ ...working, blocks: [] });
    expect(deleted.assignments).toBeUndefined();
    expect(working.assignments?.reel.people).toHaveLength(2);
    const undone = await savePlan({ ...working, version: deleted.version });
    expect(undone.assignments).toEqual(working.assignments);
    const rawEdit = await savePlan({
      ...undone,
      tasks: {
        reel: { ...undone.tasks.reel, assignee: "Неоднозначная группа" },
      },
    });
    expect(rawEdit.assignments).toBeUndefined();
  });
  it("whole-plan and native-brief duplication preserve links at their new plan/task IDs", async () => {
    const { people, plan } = await setup();
    const linked = await savePlan(
      setTaskAssignment(plan, "reel", makeAssignment(people)),
    );
    const copy = await duplicatePlan(linked);
    expect(copy.id).not.toBe(linked.id);
    expect(copy.assignments).toEqual(linked.assignments);
    const briefCopy = duplicateBrief(linked, "brief", () =>
      crypto.randomUUID(),
    );
    const newId = Object.keys(briefCopy.plan.tasks).find(
      (id) => id !== "reel",
    )!;
    expect(briefCopy.plan.assignments?.[newId]).toEqual(
      linked.assignments?.reel,
    );
    await deletePlan(copy.id);
    expect(
      await db.settings.filter((r) => r.key.startsWith("person:")).count(),
    ).toBe(2);
    expect(await db.plans.get(linked.id)).toEqual(linked);
  });
  it("rejects stale-tab assignment edits without changing history or linked identities", async () => {
    const { people, plan } = await setup();
    const first = setTaskAssignment(plan, "reel", makeAssignment([people[0]]));
    const stale = setTaskAssignment(plan, "reel", makeAssignment([people[1]]));
    const saved = await savePlan(first);
    const activity = await db.activity.toArray();

    await expect(savePlan(stale)).rejects.toThrow(/другой вкладке/);
    expect(await db.plans.get(plan.id)).toEqual(saved);
    expect(await db.activity.toArray()).toEqual(activity);
  });
  it("rejects missing identities and duplicate/excessive assignment data without partial writes", async () => {
    const { people, plan } = await setup();
    const ghost = { ...people[0], id: crypto.randomUUID() };
    await expect(
      savePlan(setTaskAssignment(plan, "reel", makeAssignment([ghost]))),
    ).rejects.toThrow(/не найден/);
    expect(await db.plans.get(plan.id)).toEqual(plan);
    expect(await db.activity.count()).toBe(1);
    expect(() => makeAssignment([people[0], people[0]])).toThrow();
    expect(
      taskAssignmentSchema.safeParse({
        legacyText: "x".repeat(200),
        people: [{ personId: people[0].id, name: people[0].displayName }],
      }).success,
    ).toBe(false);
    expect(
      canonicalAssignments({
        ...plan,
        assignments: { reel: makeAssignment(people)! },
      }),
    ).toBeUndefined();
  });
});
