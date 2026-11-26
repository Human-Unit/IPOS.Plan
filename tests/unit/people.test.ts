import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/database";
import { blankPerson, personSchema } from "@/lib/schema/person";
import {
  createPerson,
  getPerson,
  listPeople,
  migrateLegacyPeople,
  updatePerson,
} from "@/features/activists/people-repository";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});
describe("local people identities", () => {
  it("persists stable UUID identities and never merges duplicate names or aliases", async () => {
    const a = await createPerson({
      ...blankPerson,
      displayName: "Ислом",
      aliases: ["Ислам"],
    });
    const b = await createPerson({ ...blankPerson, displayName: "Ислом" });
    expect(a.id).not.toBe(b.id);
    expect(personSchema.safeParse(a).success).toBe(true);
    db.close();
    await db.open();
    expect(await getPerson(a.id)).toEqual(a);
    expect(await listPeople()).toHaveLength(2);
  });
  it("defaults new candidates and changes membership only via explicit version-checked edits", async () => {
    const a = await createPerson({ ...blankPerson, displayName: "Амина" });
    expect(a.membershipStatus).toBe("candidate");
    const { displayName, aliases, role, specializations, notes } = a;
    const draft = {
      displayName,
      aliases,
      role,
      specializations,
      notes,
      membershipStatus: "active" as const,
    };
    const next = await updatePerson(a.id, draft, a.version);
    expect(next.membershipStatus).toBe("active");
    expect(next.version).toBe(2);
    await expect(
      updatePerson(
        a.id,
        { ...draft, displayName: "Устаревшая правка" },
        a.version,
      ),
    ).rejects.toThrow(/другой вкладке/);
    expect(await getPerson(a.id)).toEqual(next);
  });
  it("migrates each saved row once, preserves ambiguous/group labels and does not activate or link", async () => {
    const date = "2026-01-01T00:00:00Z";
    await db.settings.bulkAdd([
      {
        key: "activist:one",
        value: { name: "Ислом", createdAt: date, source: "assignment" },
      },
      {
        key: "activist:two",
        value: { name: "Ислом", createdAt: date, source: "assignment" },
      },
      {
        key: "activist:group",
        value: {
          name: "Съёмочная группа, редакторы",
          createdAt: date,
          source: "assignment",
        },
      },
    ]);
    expect(await migrateLegacyPeople()).toEqual({ created: 3, invalid: 0 });
    const people = await listPeople();
    expect(people).toHaveLength(3);
    expect(people.every((p) => p.membershipStatus === "candidate")).toBe(true);
    expect(people.map((p) => p.displayName)).toContain(
      "Съёмочная группа, редакторы",
    );
    expect(
      await db.settings.filter((r) => r.key.startsWith("activist:")).count(),
    ).toBe(3);
    expect(await migrateLegacyPeople()).toEqual({ created: 0, invalid: 0 });
    expect(await listPeople()).toEqual(people);
  });
  it("validates bounded fields and rejects unsupported personal attributes", async () => {
    await expect(
      createPerson({ ...blankPerson, displayName: "" }),
    ).rejects.toThrow();
    await expect(
      createPerson({
        ...blankPerson,
        displayName: "Имя",
        phone: "private",
      } as never),
    ).rejects.toThrow();
    await expect(
      createPerson({
        ...blankPerson,
        displayName: "Имя",
        aliases: ["Alias", "Alias"],
      }),
    ).rejects.toThrow();
    expect(await listPeople()).toEqual([]);
  });
  it("rolls migration back on storage failure without changing saved names", async () => {
    await db.settings.add({
      key: "activist:one",
      value: {
        name: "Азиз",
        createdAt: new Date().toISOString(),
        source: "assignment",
      },
    });
    const fail = (_key: unknown, value: unknown) => {
      if ((value as { key?: string }).key?.startsWith("person:"))
        throw new DOMException("quota", "QuotaExceededError");
    };
    db.settings.hook("creating", fail);
    try {
      await expect(migrateLegacyPeople()).rejects.toThrow();
    } finally {
      db.settings.hook("creating").unsubscribe(fail);
    }
    expect(await listPeople()).toEqual([]);
    expect(await db.settings.count()).toBe(1);
  });
});
