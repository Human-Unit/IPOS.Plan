import { describe, expect, it } from "vitest";
import { taskCompanions, taskVisualGroups } from "../../src/components/editor/document-structure";
import type { Block } from "../../src/lib/schema/plan";

describe("editorial presentation preserves document structure", () => {
  it("groups only adjacent media, without changing the persisted order or properties", () => {
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
    ];
    const before = JSON.stringify(blocks);
    const layout = taskCompanions(blocks);
    expect(layout.companions.task.map((block) => block.id)).toEqual([
      "ref",
      "image",
    ]);
    expect([...layout.embeddedIds]).toEqual(["ref", "image"]);
    expect(JSON.stringify(blocks)).toBe(before);
    expect(taskCompanions(blocks.slice(1)).embeddedIds.size).toBe(0);
  });
  it("gives each task a complete visible section, including requirements and notes", () => {
    const blocks: Block[] = [
      { id: "title", type: "heading", props: { level: 1 }, content: [{ type: "text", text: "План СМИ", styles: {} }] },
      { id: "first", type: "task", props: { taskId: "t1" } },
      { id: "requirements", type: "heading", props: { level: 3 }, content: [{ type: "text", text: "Требования", styles: {} }] },
      { id: "bullet", type: "bulletListItem", content: [{ type: "text", text: "Снять вертикально", styles: {} }] },
      { id: "ref", type: "reference", props: { url: "https://example.org", title: "Видео", note: "" } },
      { id: "note", type: "callout", content: [{ type: "text", text: "Контакт", styles: {} }] },
      { id: "second", type: "task", props: { taskId: "t2" } },
      { id: "second-req", type: "heading", props: { level: 3 }, content: [{ type: "text", text: "Сценарий", styles: {} }] },
      { id: "separator", type: "divider" },
      { id: "free", type: "paragraph", content: [{ type: "text", text: "Обычная заметка", styles: {} }] },
      { id: "third", type: "task", props: { taskId: "t3" } },
      { id: "new-chapter", type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Другое направление", styles: {} }] },
    ];
    const before = JSON.stringify(blocks);
    const embedded = taskCompanions(blocks).embeddedIds;
    expect(embedded.has("ref")).toBe(true);
    expect(taskVisualGroups(blocks, embedded)).toEqual([
      ["first", "requirements", "bullet", "note"],
      ["second", "second-req"],
      ["third"],
    ]);
    expect(JSON.stringify(blocks)).toBe(before);
  });

  it("ignores nested tasks when marking top-level production briefs", () => {
    const blocks: Block[] = [
      {
        id: "outer",
        type: "paragraph",
        content: [],
        children: [{ id: "inner", type: "task", props: { taskId: "nested" } }],
      },
      { id: "root-task", type: "task", props: { taskId: "root" } },
    ];
    expect(taskVisualGroups(blocks, new Set())).toEqual([["root-task"]]);
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
    expect(taskCompanions(blocks).companions.task).toEqual([]);
    expect(taskCompanions(blocks).embeddedIds.size).toBe(0);
  });
});
