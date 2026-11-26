import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/database";
import { blankPerson } from "@/lib/schema/person";
import {
  createPerson,
  listPeople,
} from "@/features/activists/people-repository";
import {
  exportLibrary,
  parseBackup,
  restoreLibrary,
} from "@/features/backup/backup";
import {
  createPlan,
  savePlan,
  saveRevision,
} from "@/features/plans/repository";
import {
  makeAssignment,
  setTaskAssignment,
} from "@/features/activists/task-assignments";
import { encodeShare, decodeShare } from "@/lib/share/codec";
import { buildPlanDocx } from "@/features/export/docx";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});
async function fixture() {
  const a = await createPerson({
    ...blankPerson,
    displayName: "Ислом",
    aliases: ["Ислам"],
    membershipStatus: "active",
    specializations: ["video"],
    notes: "private-note-do-not-share",
  });
  const b = await createPerson({
    ...blankPerson,
    displayName: "Ислом",
    membershipStatus: "candidate",
    role: "Монтажёр",
  });
  const plan = await createPlan({
    schemaVersion: 1,
    title: "Совместная работа",
    blocks: [{ id: "brief", type: "task", props: { taskId: "t" } }],
    tasks: {
      t: {
        id: "t",
        title: "Reels",
        status: "review",
        priority: "high",
        deadline: "2026-10-21",
      },
    },
  });
  const linked = await savePlan(
    setTaskAssignment(plan, "t", makeAssignment([a, b])),
  );
  await saveRevision(linked);
  return { a, b, plan: linked, backup: await exportLibrary() };
}
describe("people-aware library backup v2", () => {
  it("copies same-name people without merging and remaps plans, revisions and persisted person events", async () => {
    const { a, b, plan, backup } = await fixture();
    expect(backup.formatVersion).toBe(2);
    expect(backup.schemas).toEqual({ database: 1, portable: 1, people: 1 });
    expect(backup.people).toHaveLength(2);
    const result = await restoreLibrary(backup, "copies");
    expect(result).toMatchObject({ plans: 1, people: 2, revisions: 1 });
    expect(await listPeople()).toHaveLength(4);
    const copied = (await db.plans.toArray()).find((p) => p.id !== plan.id)!;
    const ids = copied.assignments!.t.people.map((p) => p.personId);
    expect(ids).not.toContain(a.id);
    expect(ids).not.toContain(b.id);
    expect(ids[0]).not.toBe(ids[1]);
    const people = await listPeople();
    expect(people.find((p) => p.id === ids[0])).toMatchObject({
      displayName: a.displayName,
      aliases: a.aliases,
      notes: a.notes,
      membershipStatus: "active",
      specializations: ["video"],
    });
    expect(
      (await db.revisions.where({ planId: copied.id }).first())!.snapshot
        .assignments,
    ).toEqual(copied.assignments);
    const event = await db.activity
      .where({ planId: copied.id })
      .filter((a) => a.type === "TASK_PEOPLE_CHANGED")
      .first();
    expect(event!.metadata?.personIds).toEqual(ids);
    expect(await db.plans.get(plan.id)).toEqual(plan);
    expect(
      parseBackup(JSON.stringify(await exportLibrary())).people,
    ).toHaveLength(4);
  });
  it("round-trips a full library into empty storage and preserves identity metadata", async () => {
    const { backup } = await fixture();
    await Promise.all(db.tables.map((t) => t.clear()));
    await restoreLibrary(backup, "skip");
    const restored = await exportLibrary();
    expect(restored.plans[0].id).toBe(backup.plans[0].id);
    expect(restored.plans[0].tasks).toEqual(backup.plans[0].tasks);
    expect(
      restored.plans[0].assignments!.t.people.map((p) => p.personId),
    ).toEqual(expect.arrayContaining(restored.people.map((p) => p.id)));
    expect(restored.revisions[0].snapshot.assignments).toEqual(
      restored.plans[0].assignments,
    );
  });
  it("skip-conflict mode leaves original plans/people intact and explicitly creates separate profile copies", async () => {
    const { a, plan, backup } = await fixture();
    expect(await restoreLibrary(backup, "skip")).toMatchObject({
      plans: 0,
      skipped: 1,
      revisions: 0,
      activity: 0,
      people: 2,
    });
    expect(await db.plans.get(plan.id)).toEqual(plan);
    expect((await listPeople()).find((p) => p.id === a.id)).toEqual(a);
    expect(await listPeople()).toHaveLength(4);
  });
  it("accepts v1 backups and migrates saved labels as distinct candidates without linking or splitting", async () => {
    const empty = await exportLibrary();
    const { people: _people, ...rest } = empty;
    void _people;
    const old = {
      ...rest,
      formatVersion: 1,
      schemas: { database: 1, portable: 1 },
      settings: [
        {
          key: "activist:one",
          value: {
            name: "Съёмочная группа, Ислом",
            createdAt: empty.createdAt,
            source: "assignment",
          },
        },
        {
          key: "activist:two",
          value: {
            name: "Съёмочная группа, Ислом",
            createdAt: empty.createdAt,
            source: "assignment",
          },
        },
      ],
    };
    const result = await restoreLibrary(
      parseBackup(JSON.stringify(old)),
      "copies",
    );
    expect(result.people).toBe(2);
    const people = await listPeople();
    expect(people).toHaveLength(2);
    expect(
      people.every(
        (p) =>
          p.displayName === "Съёмочная группа, Ислом" &&
          p.membershipStatus === "candidate",
      ),
    ).toBe(true);
    expect(
      await db.settings.filter((s) => s.key.startsWith("activist:")).count(),
    ).toBe(2);
    const exported = await exportLibrary();
    expect(exported.people).toHaveLength(2);
  });
  it("rejects duplicate identities, missing current/snapshot/event references and unknown schema versions before writing", async () => {
    const { backup } = await fixture();
    for (const invalid of [
      { ...backup, people: [backup.people[0], backup.people[0]] },
      { ...backup, people: [] },
      { ...backup, schemas: { ...backup.schemas, people: 99 } },
      {
        ...backup,
        activity: [
          ...backup.activity,
          {
            id: "bad",
            planId: backup.plans[0].id,
            type: "TASK_PEOPLE_CHANGED",
            createdAt: backup.createdAt,
            message: "bad",
            metadata: { identityVersion: 1, personIds: [crypto.randomUUID()] },
          },
        ],
      },
      {
        ...backup,
        revisions: [
          {
            ...backup.revisions[0],
            snapshot: {
              ...backup.revisions[0].snapshot,
              assignments: {
                t: {
                  legacyText: "",
                  people: [
                    { personId: crypto.randomUUID(), name: "Ислом" },
                    { personId: backup.people[0].id, name: "Ислом" },
                  ],
                },
              },
            },
          },
        ],
      },
    ])
      expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
    expect(await db.plans.count()).toBe(1);
    expect(await listPeople()).toHaveLength(2);
  });
  it("rolls all tables back when a copied person cannot be written", async () => {
    const { backup } = await fixture();
    const fail = (_key: unknown, row: unknown) => {
      if ((row as { key?: string }).key?.startsWith("person:"))
        throw new DOMException("quota", "QuotaExceededError");
    };
    db.settings.hook("creating", fail);
    try {
      await expect(restoreLibrary(backup, "copies")).rejects.toThrow();
    } finally {
      db.settings.hook("creating").unsubscribe(fail);
    }
    expect(await exportLibrary()).toMatchObject({
      plans: backup.plans,
      people: backup.people,
      revisions: backup.revisions,
      activity: backup.activity,
      settings: backup.settings,
    });
  });
  it("portable snapshots and DOCX expose responsible names without local IDs, membership or private notes", async () => {
    const { a, plan } = await fixture();
    const shared = await decodeShare(await encodeShare(plan));
    expect(shared.tasks.t.assignee).toBe("Ислом, Ислом");
    const json = JSON.stringify(shared);
    for (const value of [
      a.id,
      "personId",
      "assignments",
      "private-note-do-not-share",
      "membershipStatus",
    ])
      expect(json).not.toContain(value);
    const docx = buildPlanDocx(plan);
    const raw = new TextDecoder().decode(docx.bytes);
    expect(raw).toContain("Ислом, Ислом");
    expect(raw).not.toContain(a.id);
    expect(raw).not.toContain("private-note-do-not-share");
  });
});
