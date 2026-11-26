import { beforeEach, expect, it } from "vitest";
import { db } from "@/lib/db/database";
import { toPortable } from "@/lib/schema/plan";
import { duplicateBrief } from "@/components/editor/brief-document";
import { applyReview, publicationReady } from "@/features/editorial/review";
import { setTaskEditorial } from "@/features/editorial/metadata";
import { createPlan, duplicatePlan, replacePlan, savePlan, saveRevision } from "@/features/plans/repository";

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

function fixture() {
  return createPlan({
    schemaVersion: 1, title: "Тестовый медиаплан",
    blocks: [
      { id: "brief", type: "task", props: { taskId: "t" } },
      { id: "body", type: "paragraph", content: [{ type: "text", text: "Первый сценарий", styles: {} }] },
    ],
    tasks: { t: { id: "t", title: "Интервью", status: "in_progress", priority: "medium" } },
  });
}

it("guards editorial transitions and records real saved feedback in local activity only", async () => {
  let plan = await fixture();
  expect(() => applyReview(plan, "t", "approve")).toThrow(/изменилось/);
  plan = await savePlan(applyReview(plan, "t", "submit"));
  expect(() => applyReview(plan, "t", "request_changes", " ")).toThrow(/Укажите/);
  plan = await savePlan(applyReview(plan, "t", "request_changes", "Добавить цитату"));
  expect(publicationReady(plan.tasks.t, plan.editorial?.t?.review)).toBe(false);
  plan = await savePlan(applyReview(plan, "t", "submit"));
  plan = await savePlan(applyReview(plan, "t", "approve", "Цитата проверена"));
  expect(publicationReady(plan.tasks.t, plan.editorial?.t.review)).toBe(true);
  expect(publicationReady({ ...plan.tasks.t, status: "cancelled" }, plan.editorial?.t.review)).toBe(false);
  expect(JSON.stringify(toPortable(plan))).not.toContain("Цитата проверена");
  const events = await db.activity.where("planId").equals(plan.id).filter((event) => event.type === "TASK_REVIEW_CHANGED").toArray();
  expect(events).toHaveLength(4);
  expect(events.map(event => event.metadata?.action)).toContain("request_changes");
  expect(events.find(event => event.metadata?.action === "request_changes")?.metadata?.feedback).toBe("Добавить цитату");
});

it("resets approval after brief content edits, retains dates, and protects copies and local revisions", async () => {
  let plan = await fixture();
  const scheduled = setTaskEditorial(plan, "t", { publicationDate: "2026-12-01" });
  plan = await savePlan(applyReview(scheduled, "t", "submit"));
  plan = await savePlan(applyReview(plan, "t", "approve"));
  const revision = await saveRevision(plan);
  const copy = await duplicatePlan(plan);
  expect(copy.editorial?.t).toEqual({ publicationDate: "2026-12-01" });
  const briefCopy = duplicateBrief(plan, "brief", crypto.randomUUID.bind(crypto));
  const copiedId = Object.keys(briefCopy.plan.tasks).find(id => id !== "t")!;
  expect(briefCopy.plan.editorial?.[copiedId]?.review).toBeUndefined();
  plan = await savePlan(setTaskEditorial(plan, "t", { publicationDate: "2026-12-03" }));
  expect(plan.editorial?.t.review?.state).toBe("approved");
  const edited = await savePlan({ ...plan, blocks: [plan.blocks[0], {
    id: "body", type: "paragraph", content: [{ type: "text", text: "Изменённый сценарий", styles: {} }],
  }] });
  expect(edited.editorial?.t).toMatchObject({
    publicationDate: "2026-12-03",
    review: { state: "draft", action: "content_changed" },
  });
  const restored = await replacePlan(edited, revision.snapshot, "PLAN_RESTORED");
  expect(restored.editorial?.t.review?.state).toBe("approved");
});
