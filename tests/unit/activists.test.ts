import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/database";
import { createPlan } from "@/features/plans/repository";
import { exportLibrary, restoreLibrary, parseBackup } from "@/features/backup/backup";
import {
  ACTIVIST_PREFIX, assigneeNames, directoryNames,
  rememberAssignees, syncDirectoryFromPlans,
} from "@/features/activists/directory";

const roster = async () => directoryNames(
  await db.settings.filter((row) => row.key.startsWith(ACTIVIST_PREFIX)).toArray(),
);
beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("reusable local assignment names", () => {
  it("splits only intentional separators, normalizes whitespace and removes duplicates", () => {
    expect(assigneeNames("Ислом, Маруф;  Амина\nислом, Гульнамо")).toEqual([
      "Ислом", "Маруф", "Амина", "Гульнамо",
    ]);
    expect(assigneeNames("Александр Петров")).toEqual(["Александр Петров"]);
    expect(assigneeNames(" , ; \n ")).toEqual([]);
    expect(assigneeNames("Семён, Семен")).toEqual(["Семён"]);
  });

  it("persists and reuses names independently of assignment completion", async () => {
    expect(await rememberAssignees("Ислом, Маруф")).toBe(2);
    expect(await rememberAssignees("  ислом ; Амина ")).toBe(1);
    expect(await roster()).toEqual(["Амина", "Ислом", "Маруф"]);
    expect(await rememberAssignees("")).toBe(0);
  });

  it("collects historical saved task assignments and ignores orphan entities", async () => {
    await createPlan({
      schemaVersion: 1,
      title: "Старый контент-план",
      blocks: [{ id: "task-block", type: "task", props: { taskId: "t1" } }],
      tasks: {
        t1: {
          id: "t1", title: "Рилс", status: "todo", priority: "medium",
          assignee: "Назри, Амина",
        },
      },
    });
    expect(await syncDirectoryFromPlans()).toBe(2);
    expect(await syncDirectoryFromPlans()).toBe(0);
    expect(await roster()).toEqual(["Амина", "Назри"]);
  });

  it("includes the directory in full-library backups and restores without duplicate names", async () => {
    await rememberAssignees("Ислом, Амина");
    const backup = await exportLibrary();
    expect(backup.settings.filter((s) => s.key.startsWith(ACTIVIST_PREFIX))).toHaveLength(2);
    await restoreLibrary(backup, "copies");
    expect(await roster()).toEqual(["Амина", "Ислом"]);
    expect(await db.settings.filter((s) => s.key.startsWith(ACTIVIST_PREFIX)).count()).toBe(2);
    await Promise.all(db.tables.map((t) => t.clear()));
    await restoreLibrary(backup, "skip");
    expect(await roster()).toEqual(["Амина", "Ислом"]);
  });

  it("rejects malformed persisted activist settings before restore", async () => {
    const backup = await exportLibrary();
    const invalid = {
      ...backup,
      settings: [{ key: "activist:bad", value: { name: "", createdAt: new Date().toISOString(), source: "assignment" } }],
    };
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
    expect(await roster()).toEqual([]);
  });
});
