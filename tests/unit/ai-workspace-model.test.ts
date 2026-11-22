import { describe, expect, it } from "vitest";
import { cloudPlanId, cloudPlanRecordSchema, assertVersion } from "@/lib/ai-workspace/model";

const base = {
  id: "af9ccb80-b216-4c60-86f4-3f12ea9895cf",
  version: 1,
  createdAt: "2026-11-22T11:00:00.000Z",
  updatedAt: "2026-11-22T11:00:00.000Z",
  document: { schemaVersion: 1, title: "Два Reels", blocks: [], tasks: {} },
};

describe("private AI workspace records", () => {
  it("accepts a valid versioned portable plan", () => {
    const result = cloudPlanRecordSchema.parse(base);
    expect(result.document.title).toBe("Два Reels");
    expect(cloudPlanId.safeParse(result.id).success).toBe(true);
  });
  it("rejects arbitrary metadata and malformed IDs", () => {
    expect(cloudPlanRecordSchema.safeParse({ ...base, secret: "leak" }).success).toBe(false);
    expect(cloudPlanRecordSchema.safeParse({ ...base, id: "../publications" }).success).toBe(false);
    expect(cloudPlanRecordSchema.safeParse({
      ...base, document: { ...base.document, schemaVersion: 9 },
    }).success).toBe(false);
  });
  it("enforces optimistic locking", () => {
    expect(() => assertVersion(2, 2)).not.toThrow();
    expect(() => assertVersion(1, 2)).toThrow(/CONFLICT/);
    expect(() => assertVersion(0, 1)).toThrow(/корректную версию/);
  });
});
