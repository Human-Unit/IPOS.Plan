import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob", () => ({
  ...storage,
  BlobPreconditionFailedError: class extends Error {},
  put: vi.fn(),
}));

import { listCloudPlans } from "@/lib/ai-workspace/server";

const prefix = "ai-workspace/v1/";
const cursor = "synthetic-provider-cursor";
const time = "2026-01-01T00:00:00.000Z";
const idFor = (index: number) => "00000000-0000-4000-8000-" + String(index).padStart(12, "0");
const pathFor = (index: number) => prefix + idFor(index) + ".json";

let active = 0;
let peak = 0;
let bytes = 0;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("IPOS_AI_BLOB_READ_WRITE_TOKEN", "mock-only");
  storage.list.mockReset();
  storage.get.mockReset();
  active = peak = bytes = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("cloud plan listing", () => {
  it("preserves order and cursor with at most five simultaneous mocked reads", async () => {
    const fixture = Array.from({ length: 15 }, (_, index) => ({
      id: idFor(index),
      version: 1,
      createdAt: time,
      updatedAt: time,
      document: { schemaVersion: 1, title: "Fixture " + index, blocks: [], tasks: {} },
    }));
    storage.list.mockResolvedValue({
      blobs: fixture.map((_, index) => ({ pathname: pathFor(index) })),
      hasMore: true,
      cursor,
    });
    storage.get.mockImplementation(async (pathname: string) => {
      const index = Number(pathname.slice(-17, -5));
      const record = fixture[index];
      active++;
      peak = Math.max(peak, active);
      try {
        // In each old batch one synthetic read takes 120 ms and four take 10 ms.
        await new Promise<void>((resolve) => setTimeout(resolve, index % 5 === 0 ? 120 : 10));
        const body = JSON.stringify(record);
        bytes += Buffer.byteLength(body);
        return { stream: new Response(body).body, blob: { etag: "fixture" } };
      } finally { active--; }
    });
    const start = Date.now();
    const pending = listCloudPlans("request-cursor");
    await vi.runAllTimersAsync();
    const result = await pending;
    const elapsed = Date.now() - start;

    expect(storage.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, cursor: "request-cursor" }));
    expect(storage.get).toHaveBeenCalledTimes(15);
    expect(peak).toBe(5);
    expect(result).toEqual({
      nextCursor: cursor,
      plans: fixture.map(({id,version,updatedAt,document}) => ({ id, version, updatedAt, title: document.title })),
    });
    if (process.env.IPOS_PERF_REPORT === "1") {
      console.log(JSON.stringify({ elapsedVirtualMs: elapsed, reads: storage.get.mock.calls.length, peak, bytes }));
    }
    expect(elapsed).toBeLessThanOrEqual(150);
  });

  it("skips non-plan objects and missing records while preserving cursor semantics", async () => {
    storage.list.mockResolvedValue({
      blobs: [{ pathname: prefix + "not-a-plan.json" }, { pathname: pathFor(0) }],
      hasMore: false,
    });
    storage.get.mockResolvedValue(null);
    await expect(listCloudPlans()).resolves.toEqual({ plans: [], nextCursor: null });
    expect(storage.get).toHaveBeenCalledOnce();
    expect(storage.get.mock.calls[0][0]).toBe(pathFor(0));
  });

  it("stops scheduling reads after a provider failure and surfaces the error", async () => {
    storage.list.mockResolvedValue({
      blobs: Array.from({ length: 8 }, (_, index) => ({ pathname: pathFor(index) })),
      hasMore: false,
    });
    storage.get.mockImplementation(async (pathname: string) => {
      if (pathname === pathFor(0)) throw new Error("fixture provider temporarily unavailable");
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      return null;
    });
    const rejected = expect(listCloudPlans()).rejects.toThrow("fixture provider temporarily unavailable");
    await vi.runAllTimersAsync();
    await rejected;
    expect(storage.get).toHaveBeenCalledTimes(5);
  });
});
