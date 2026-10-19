import { describe, expect, it } from "vitest";
import { portablePlanSchema, planSchema, toPortable } from "@/lib/schema/plan";
import { taskSchema } from "@/lib/schema/task";
import { parseImport } from "@/lib/schema/import";
import { demoPlan } from "@/features/plans/demo";
import { newPlan } from "@/features/plans/repository";
describe("external schema", () => {
  it("exports only referenced tasks without losing in-memory undo entities", () => {
    const p = structuredClone(demoPlan);
    p.blocks = p.blocks.filter(
      (b) => b.type !== "task" || b.props.taskId !== "demo-photo",
    );
    const portable = toPortable(p);
    expect(portable.tasks).not.toHaveProperty("demo-photo");
    expect(p.tasks).toHaveProperty("demo-photo");
  });
  it("never exports a file too large for the importer", () => {
    const p = structuredClone(demoPlan);
    p.blocks = Array.from({ length: 22 }, () => ({
      type: "paragraph" as const,
      content: [{ type: "text" as const, text: "a".repeat(50000), styles: {} }],
    }));
    expect(() => toPortable(p)).toThrow("1 МБ");
  });
  it("validates a realistic portable plan and local metadata", () => {
    expect(portablePlanSchema.parse(demoPlan)).toEqual(demoPlan);
    expect(planSchema.parse(newPlan(demoPlan)).version).toBe(1);
  });
  it("validates task fields, statuses and real dates", () => {
    const task = demoPlan.tasks["demo-photo"];
    expect(taskSchema.safeParse(task).success).toBe(true);
    for (const patch of [
      { status: "unknown" },
      { priority: "urgent" },
      { deadline: "2026-02-30" },
      { id: "" },
    ])
      expect(taskSchema.safeParse({ ...task, ...patch }).success).toBe(false);
  });
  it("rejects unsupported versions and blocks", () => {
    expect(() =>
      parseImport(JSON.stringify({ ...demoPlan, schemaVersion: 2 })),
    ).toThrow();
    expect(() =>
      parseImport(
        JSON.stringify({ ...demoPlan, blocks: [{ type: "script" }] }),
      ),
    ).toThrow();
  });
  it("rejects orphan task blocks and mismatching task keys", () => {
    expect(
      portablePlanSchema.safeParse({ ...demoPlan, tasks: {} }).success,
    ).toBe(false);
    expect(
      portablePlanSchema.safeParse({
        ...demoPlan,
        tasks: { ...demoPlan.tasks, wrong: demoPlan.tasks["demo-photo"] },
      }).success,
    ).toBe(false);
  });
  it("rejects duplicate block IDs", () => {
    expect(
      portablePlanSchema.safeParse({
        ...demoPlan,
        blocks: [
          { id: "same", type: "paragraph" },
          { id: "same", type: "paragraph" },
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects executable URLs, binary images and unsupported props", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:image/png;base64,aaa",
      "blob:https://example.com/123",
      "https://user:pass@example.com/",
    ])
      expect(
        portablePlanSchema.safeParse({
          ...demoPlan,
          blocks: [{ type: "image", props: { url, caption: "" } }],
        }).success,
      ).toBe(false);
    expect(
      portablePlanSchema.safeParse({
        ...demoPlan,
        blocks: [
          {
            type: "task",
            props: { taskId: "demo-photo", title: "Duplicated" },
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("roundtrips public external font URLs without binaries", () => {
    const withFont = {
      ...demoPlan,
      fontSources: [{ family: "NT Somin", url: "https://assets.example.org/nt-somin.woff2" }],
    };
    expect(portablePlanSchema.safeParse(withFont).success).toBe(true);
    expect(parseImport(JSON.stringify(toPortable(withFont))).fontSources).toEqual(withFont.fontSources);
  });
  it("rejects unsafe remote font definitions", () => {
    for (const fontSources of [
      [{ family: "NT Somin", url: "http://assets.example.org/font.woff2" }],
      [{ family: "Broken", url: "javascript:alert(1)" }],
      [{ family: "Wrong; CSS", url: "https://assets.example.org/font.woff2" }],
      [{ family: "NT Somin", url: "https://example.org/a.woff2" },
       { family: "nt somin", url: "https://example.org/b.woff2" }],
    ]) expect(portablePlanSchema.safeParse({ ...demoPlan, fontSources }).success).toBe(false);
  });
  it("imports exported JSON and leaves input unchanged", () => {
    const local = newPlan(demoPlan);
    const before = structuredClone(local);
    const portable = toPortable(local);
    expect(parseImport(JSON.stringify(portable))).toEqual(demoPlan);
    expect(portable).not.toHaveProperty("id");
    expect(portable).not.toHaveProperty("version");
    expect(local).toEqual(before);
  });
  it("reports malformed JSON", () => {
    expect(() => parseImport("{oops")).toThrow("Некорректный JSON");
  });
  it("bounds file size and nested JSON before recursion", () => {
    expect(() => parseImport("x".repeat(1_000_001))).toThrow("1 МБ");
    expect(() => parseImport("[".repeat(45) + "0" + "]".repeat(45))).toThrow(
      "вложенный",
    );
  });
});
