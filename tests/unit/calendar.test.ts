import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/database";
import { toPortable } from "@/lib/schema/plan";
import { duplicateBrief } from "@/components/editor/brief-document";
import { assignmentRows } from "@/features/activists/workload";
import { exportLibrary, restoreLibrary } from "@/features/backup/backup";
import { calendarDays, calendarEvents, deadlineHighlights, moveCalendar } from "@/features/editorial/calendar";
import { setTaskEditorial } from "@/features/editorial/metadata";
import { createPlan, duplicatePlan, replacePlan, savePlan, saveRevision } from "@/features/plans/repository";

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

const fixture = () => createPlan({
  schemaVersion: 1,
  title: "Планы публикаций",
  blocks: [
    { id: "brief", type: "task", props: { taskId: "copy" } },
    { id: "repeated", type: "task", props: { taskId: "copy" } },
    { id: "cancelled", type: "task", props: { taskId: "hold" } },
  ],
  tasks: {
    copy: { id: "copy", title: "Текст", status: "todo", priority: "medium", deadline: "2026-11-23" },
    hold: { id: "hold", title: "Съёмки", status: "cancelled", priority: "medium", deadline: "2026-11-21" },
  },
});

describe("calendar dates and local publication planning", () => {
  it("keeps a Monday-first week across years and a full leap-month grid", () => {
    expect(calendarDays("2026-01-01", "week")).toEqual([
      "2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04",
    ]);
    const days = calendarDays("2024-02-29", "month");
    expect(days[0]).toBe("2024-01-29");
    expect(days.at(-1)).toBe("2024-03-03");
    expect(days).toContain("2024-02-29");
    expect(moveCalendar("2026-01-31", "month", 1)).toBe("2026-02-01");
  });

  it("shows one deadline plus one planned publication for repeated task blocks", async () => {
    const plan = setTaskEditorial(await fixture(), "copy", { publicationDate: "2026-11-27" });
    const entries = calendarEvents(assignmentRows([plan]));
    expect(entries.map((entry) => [entry.kind, entry.day])).toEqual([
      ["deadline", "2026-11-21"], ["deadline", "2026-11-23"], ["publication", "2026-11-27"],
    ]);
    const { overdue, upcoming } = deadlineHighlights(entries, "2026-11-24");
    expect(overdue.map((entry) => entry.row.task.id)).toEqual(["copy"]);
    expect(upcoming).toEqual([]);
  });

  it("preserves planned dates in local copies, revision restore and backup with portable v1 intact", async () => {
    const draft = setTaskEditorial(await fixture(), "copy", { publicationDate: "2026-11-27" });
    const saved = await savePlan(draft);
    expect(toPortable(saved)).not.toHaveProperty("editorial");
    expect(toPortable(saved).tasks.copy.deadline).toBe("2026-11-23");
    expect((await duplicatePlan(saved)).editorial).toEqual(saved.editorial);
    const copied = duplicateBrief(saved, "brief", crypto.randomUUID.bind(crypto));
    expect(Object.values(copied.plan.editorial ?? {})).toEqual([
      { publicationDate: "2026-11-27" }, { publicationDate: "2026-11-27" },
    ]);
    const revision = await saveRevision(saved);
    const imported = await replacePlan(saved, toPortable(saved), "PLAN_IMPORTED");
    expect(imported.editorial).toBeUndefined();
    const restored = await replacePlan(imported, revision.snapshot, "PLAN_RESTORED");
    expect(restored.editorial).toEqual(saved.editorial);
    const backup = await exportLibrary();
    await restoreLibrary(backup, "copies");
    expect((await db.plans.toArray()).filter((plan) => plan.editorial?.copy.publicationDate === "2026-11-27")).toHaveLength(4);
  });
});
