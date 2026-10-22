import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/database";
import {
  builtInTemplates,
  extractTemplate,
  instantiateTemplate,
  loadTemplates,
  saveTemplate,
} from "@/features/templates/templates";
import {
  flattenBlocks,
  portablePlanSchema,
  type PortablePlan,
} from "@/lib/schema/plan";
import { exportLibrary, restoreLibrary } from "@/features/backup/backup";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});
describe("production brief templates", () => {
  for (const template of builtInTemplates)
    it(`instantiates ${template.name} with unique IDs and correct associations`, () => {
      const a = instantiateTemplate(template.plan),
        b = instantiateTemplate(template.plan);
      expect(portablePlanSchema.safeParse(a).success).toBe(true);
      expect(Object.keys(a.tasks)).toHaveLength(1);
      const ids = flattenBlocks(a.blocks).map((block) => block.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(
        flattenBlocks(b.blocks).every((block) => !ids.includes(block.id)),
      ).toBe(true);
      const task = flattenBlocks(a.blocks).find(
        (block) => block.type === "task",
      )!;
      expect(task.type === "task" && a.tasks[task.props.taskId].id).toBe(
        Object.keys(a.tasks)[0],
      );
      expect(
        flattenBlocks(a.blocks).some((block) => block.type === "reference"),
      ).toBe(true);
    });
  const source = (): PortablePlan => ({
    ...builtInTemplates[0].plan,
    tasks: {
      template: {
        id: "template",
        title: "Личный бриф",
        description: "Текст",
        status: "done",
        priority: "high",
        assignee: "Амина",
        deadline: "2020-01-01",
      },
    },
    typography: { "section-0": { fontFamily: "Georgia", fontSize: 18 } },
  });
  it("saves/loads complete custom briefs and backs them up without personal scheduling by default", async () => {
    const extracted = extractTemplate(source(), "brief", true);
    const key = await saveTemplate("Мой Reels", extracted);
    const [loaded] = await loadTemplates();
    expect(loaded.id).toBe(key);
    const t = Object.values(loaded.plan.tasks)[0];
    expect(t).toMatchObject({
      status: "todo",
      priority: "high",
      title: "Личный бриф",
    });
    expect(t.assignee).toBeUndefined();
    expect(t.deadline).toBeUndefined();
    expect(loaded.plan.blocks).toEqual(source().blocks);
    const copy = instantiateTemplate(loaded.plan);
    const heading = flattenBlocks(copy.blocks).find(
      (b) => b.type === "heading",
    )!;
    expect(copy.typography?.[heading.id!]).toEqual({
      fontFamily: "Georgia",
      fontSize: 18,
    });
    const backup = await exportLibrary();
    await db.settings.clear();
    await restoreLibrary(backup, "copies");
    expect((await loadTemplates())[0].plan).toEqual(loaded.plan);
  });
  it("only retains assignee, dates and status on explicit opt-in", () => {
    expect(
      Object.values(instantiateTemplate(source(), true).tasks)[0],
    ).toMatchObject({
      status: "done",
      assignee: "Амина",
      deadline: "2020-01-01",
    });
    const task = Object.values(instantiateTemplate(source()).tasks)[0];
    expect(task.status).toBe("todo");
    expect(task.assignee).toBeUndefined();
    expect(task.deadline).toBeUndefined();
  });
  it("extracts legacy sibling companions without unrelated briefs", () => {
    const plan = source();
    plan.blocks = [
      { id: "b1", type: "task", props: { taskId: "template" } },
      {
        id: "text",
        type: "paragraph",
        content: [{ type: "text", text: "Требования", styles: {} }],
      },
      { id: "b2", type: "task", props: { taskId: "other" } },
    ];
    plan.tasks.other = {
      id: "other",
      title: "Другая",
      status: "todo",
      priority: "low",
    };
    plan.typography = undefined;
    const extracted = extractTemplate(plan, "b1");
    expect(extracted.blocks.map((b) => b.id)).toEqual(["b1", "text"]);
    expect(Object.keys(extracted.tasks)).toEqual(["template"]);
    expect(plan.tasks.template.status).toBe("done");
  });
});
