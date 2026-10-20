import { describe, expect, it } from "vitest";
import { taskCompanions } from "../../src/components/editor/document-structure";
import type { Block } from "../../src/lib/schema/plan";

describe("editorial presentation preserves document structure", () => {
  it("groups a brief until its divider without changing persisted order or properties", () => {
    const blocks: Block[] = [
      { id: "task", type: "task", props: { taskId: "external-task" } },
      {
        id: "ref",
        type: "reference",
        props: { url: "https://example.org", title: "Brief", note: "" },
      },
      {
        id: "image",
        type: "image",
        props: { url: "https://example.org/photo.jpg", caption: "Portrait" },
      },
      {
        id: "text",
        type: "paragraph",
        content: [{ type: "text", text: "Separate section", styles: {} }],
      },
      { id: "standalone", type: "image", props: { url: "", caption: "" } },
      { id: "boundary", type: "divider" },
      { id: "outside", type: "image", props: { url: "", caption: "Outside" } },
    ];
    const before = JSON.stringify(blocks);
    const layout = taskCompanions(blocks);
    expect(layout.companions.task.map((block) => block.id)).toEqual([
      "ref",
      "image",
      "text",
      "standalone",
    ]);
    expect([...layout.embeddedIds]).toEqual(["ref", "image", "standalone"]);
    expect(layout.sectionById.text).toBe("task");
    expect(layout.sectionById.outside).toBeUndefined();
    expect(layout.endIds.has("text")).toBe(true);
    expect(JSON.stringify(blocks)).toBe(before);
    expect(taskCompanions(blocks.slice(1)).embeddedIds.size).toBe(0);
  });
  it("keeps media with nested text visible, and handles tasks in nested groups", () => {
    const blocks: Block[] = [
      {
        type: "paragraph",
        children: [
          { id: "task", type: "task", props: { taskId: "nested" } },
          {
            id: "image",
            type: "image",
            props: { url: "", caption: "" },
            children: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Must remain visible", styles: {} },
                ],
              },
            ],
          },
        ],
      },
    ];
    expect(
      taskCompanions(blocks).companions.task.map((block) => block.id),
    ).toEqual(["image"]);
    expect(taskCompanions(blocks).embeddedIds.size).toBe(0);
  });
});
