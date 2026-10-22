import { describe, expect, it } from "vitest";
import {
  projectBriefs,
  serializeBriefs,
  serializeWithSource,
  duplicateBrief,
  moveProjectedBrief,
} from "../../src/components/editor/brief-document";
import {
  portablePlanSchema,
  type PortablePlan,
} from "../../src/lib/schema/plan";

const plan: PortablePlan = {
  schemaVersion: 1,
  title: "План 2026",
  tasks: {
    one: { id: "one", title: "Рилс", status: "todo", priority: "medium" },
  },
  blocks: [
    {
      id: "intro",
      type: "paragraph",
      content: [{ type: "text", text: "Общий текст", styles: { bold: true } }],
    },
    {
      id: "task",
      type: "task",
      props: { taskId: "one" },
      children: [
        {
          id: "child",
          type: "paragraph",
          content: [
            { type: "text", text: "Оригинальные children", styles: {} },
          ],
        },
      ],
    },
    { id: "heading", type: "heading", props: { level: 3 }, content: [] },
    {
      id: "image1",
      type: "image",
      props: { url: "https://example.com/one.jpg", caption: "Один" },
    },
    {
      id: "image2",
      type: "image",
      props: { url: "https://example.com/two.jpg", caption: "Два" },
    },
    {
      id: "list",
      type: "bulletListItem",
      content: [],
      children: [{ id: "nested", type: "paragraph", content: [] }],
    },
    { id: "divider", type: "divider" },
    { id: "free", type: "paragraph", content: [] },
  ],
  typography: { nested: { fontFamily: "Georgia", fontSize: 18 } },
};

describe("editor-only production brief projection", () => {
  it("does not write implicit editor defaults into untouched imported blocks", () => {
    const projected = projectBriefs(plan.blocks);
    const fill = (nodes: typeof projected): typeof projected =>
      nodes.map((node) => ({
        ...node,
        props:
          node.type === "paragraph"
            ? {
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
                ...node.props,
              }
            : node.props,
        children: fill(node.children ?? []),
      }));
    expect(serializeWithSource(fill(projected), plan.blocks)).toEqual(
      plan.blocks,
    );
  });
  it("moves a whole native brief past separators and preserves every original source block", () => {
    const nodes = projectBriefs([
      ...plan.blocks,
      { id: "second", type: "task", props: { taskId: "one" } },
    ]);
    const moved = serializeBriefs(moveProjectedBrief(nodes, "task", "down"));
    expect(
      moved.filter((block) => block.type === "task").map((block) => block.id),
    ).toEqual(["second", "task"]);
    expect(moved.find((block) => block.id === "task")?.children).toEqual(
      plan.blocks[1].children,
    );
    expect(moved.map((block) => block.id).sort()).toEqual(
      [...plan.blocks.map((block) => block.id), "second"].sort(),
    );
  });
  it("round trips every source ID, order, property, child and text style without migration", () => {
    expect(serializeBriefs(projectBriefs(plan.blocks))).toEqual(plan.blocks);
    expect(
      portablePlanSchema.parse({
        ...plan,
        blocks: serializeBriefs(projectBriefs(plan.blocks)),
      }),
    ).toEqual(plan);
  });
  it("uses real containers and keeps original task children separate from following siblings", () => {
    const node = projectBriefs(plan.blocks)[1];
    expect(node.type).toBe("brief");
    expect(node.children?.[0].type).toBe("briefChildren");
    expect(node.children?.some((child) => child.type === "mediaStrip")).toBe(
      true,
    );
    expect(node.children?.map((child) => child.id)).toContain("list");
  });
  it("moves an entire brief with its companions without changing nested data", () => {
    const nodes = projectBriefs(plan.blocks);
    const moved = serializeBriefs([nodes[0], ...nodes.slice(2), nodes[1]]);
    expect(moved.map((block) => block.id)).toEqual([
      "intro",
      "divider",
      "free",
      "task",
      "heading",
      "image1",
      "image2",
      "list",
    ]);
    expect(moved[3].children).toEqual(plan.blocks[1].children);
  });
  it("duplicates all descendant IDs, task entities and typography without mutating the source", () => {
    const before = structuredClone(plan);
    let id = 0;
    const result = duplicateBrief(plan, "task", () => `copy-${++id}`);
    const parsed = portablePlanSchema.parse(result.plan);
    expect(Object.keys(parsed.tasks)).toHaveLength(2);
    expect(parsed.blocks.filter((block) => block.type === "task")).toHaveLength(
      2,
    );
    expect(Object.values(parsed.typography!)).toEqual([
      { fontFamily: "Georgia", fontSize: 18 },
      { fontFamily: "Georgia", fontSize: 18 },
    ]);
    expect(plan).toEqual(before);
    expect(serializeBriefs(projectBriefs(parsed.blocks))).toEqual(
      parsed.blocks,
    );
  });
  it("handles empty and task-only documents, repeated task references and nested tasks", () => {
    for (const blocks of [
      [],
      [{ id: "only", type: "task" as const, props: { taskId: "one" } }],
      [
        {
          id: "outer",
          type: "task" as const,
          props: { taskId: "one" },
          children: plan.blocks,
        },
      ],
    ]) {
      expect(serializeBriefs(projectBriefs(blocks))).toEqual(blocks);
    }
  });
});
