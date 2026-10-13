import { describe, expect, it } from "vitest";
import { encodeShare, decodeShare } from "@/lib/share/codec";
import { demoPlan } from "@/features/plans/demo";
describe("snapshot sharing", () => {
  it("roundtrips Russian content and uses only base64url", async () => {
    const token = await encodeShare(demoPlan);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeShare(token)).toEqual(demoPlan);
  });
  it("remains immutable after the source changes", async () => {
    const plan = structuredClone(demoPlan);
    const token = await encodeShare(plan);
    plan.title = "Другое название";
    plan.tasks["demo-photo"].status = "cancelled";
    expect(await decodeShare(token)).toEqual(demoPlan);
  });
  it("rejects malformed, corrupted and oversized payloads", async () => {
    await expect(decodeShare("!not-valid")).rejects.toThrow();
    await expect(decodeShare("YWJj")).rejects.toThrow();
    await expect(decodeShare("A".repeat(180_001))).rejects.toThrow();
  });
  it("rejects unsupported schemas after decompression", async () => {
    const raw = JSON.stringify({ ...demoPlan, schemaVersion: 99 });
    const bytes = new Uint8Array(
      await new Response(
        new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip")),
      ).arrayBuffer(),
    );
    const token = btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    await expect(decodeShare(token)).rejects.toThrow("schemaVersion");
  });
  it("bounds decompressed size to prevent compressed oversized input", async () => {
    const bytes = new Uint8Array(
      await new Response(
        new Blob(["x".repeat(1_000_001)])
          .stream()
          .pipeThrough(new CompressionStream("gzip")),
      ).arrayBuffer(),
    );
    const token = btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    await expect(decodeShare(token)).rejects.toThrow("1 МБ");
  });
});
