import { describe, expect, it } from "vitest";
import { toPortable, type Plan } from "@/lib/schema/plan";
import { parseImport } from "@/lib/schema/import";

describe("published document serialization", () => {
  it("strips IndexedDB plan metadata before strict publication validation", () => {
    const saved: Plan = {
      id: "local-example-id",
      createdAt: "2026-10-25T10:00:00.000Z",
      updatedAt: "2026-10-25T11:00:00.000Z",
      version: 3,
      schemaVersion: 1,
      title: "ИПОС | Медиаплан мероприятий 10–11 ноября 2026",
      blocks: [],
      tasks: {},
    };
    expect(() => parseImport(JSON.stringify(saved))).toThrow(/Unrecognized keys/);

    const snapshot = toPortable(saved);
    const serialized = JSON.stringify(snapshot);
    const parsed = parseImport(serialized);
    expect(parsed.title).toBe(saved.title);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.blocks).toEqual([]);
    expect(parsed.tasks).toEqual({});
    for (const privateField of ["id", "createdAt", "updatedAt", "version"]) {
      expect(Object.prototype.hasOwnProperty.call(JSON.parse(serialized), privateField)).toBe(false);
    }
  });
});
