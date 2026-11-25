import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readBoundedJson } from "@/lib/http/request-json";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/publications/server", async (original) => ({
  ...await original<typeof import("@/lib/publications/server")>(),
  isConfigured: () => true,
  isPublisher: (key: string) => key === "synthetic-test-key",
  createPublication: vi.fn(),
}));

import { POST as publish } from "@/app/api/publications/route";
import { sameOrigin } from "@/lib/admin/auth";
import { createPublication } from "@/lib/publications/server";

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("bounded JSON transport", () => {
  it("measures actual UTF-8 bytes instead of relying on declared size", async () => {
    const body = '{"title":"План"}';
    const request = new Request("https://test.example", {
      method: "POST", body, headers: { "content-type": "application/json", "content-length": "12" },
    });
    await expect(readBoundedJson(request, 17)).rejects.toMatchObject({ status: 413 });
  });

  it("accepts valid JSON independently of media-type casing", async () => {
    const request = new Request("https://test.example", {
      method: "POST", body: '{"title":"План"}', headers: { "content-type": "Application/JSON; charset=utf-8" },
    });
    await expect(readBoundedJson(request, 100)).resolves.toEqual({ title: "План" });
  });

  it("maps malformed and unsupported input to safe client errors", async () => {
    for (const [type, body, status] of [["application/json", "{", 400], ["text/plain", "{}", 415]] as const) {
      const request = new Request("https://test.example", { method: "POST", body, headers: { "content-type": type } });
      await expect(readBoundedJson(request, 100)).rejects.toMatchObject({ status });
    }
  });
});

describe("admin origin binding", () => {
  const createRequest = (base: string, authority: string, origin: string) =>
    new NextRequest(base + "/api/admin/session", { headers: { host: authority, origin } });

  it("uses the exact visible loopback authority when the server normalizes it", () => {
    expect(sameOrigin(createRequest("http://localhost:3105", "127.0.0.1:3105", "http://127.0.0.1:3105"))).toBe(true);
    expect(sameOrigin(createRequest("http://localhost:3105", "127.0.0.1:3105", "http://localhost:3105"))).toBe(false);
    expect(sameOrigin(createRequest("http://localhost:3105", "127.0.0.1:3106", "http://127.0.0.1:3106"))).toBe(false);
  });

  it("preserves the application origin requirement outside loopback", () => {
    const base = "https://ipos.example";
    expect(sameOrigin(createRequest(base, "ipos.example", base))).toBe(true);
    expect(sameOrigin(createRequest(base, "ipos.example", "https://other.example"))).toBe(false);
  });
});

describe("publication write responses", () => {
  const request = (payload: unknown, key = "synthetic-test-key") => new NextRequest("https://ipos.example/api/publications", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json", "x-ipos-publish-key": key },
  });
  const valid = { title: "Example", document: { schemaVersion: 1, title: "Example", blocks: [], tasks: {} } };

  it("does not attempt a write when credentials or the document are invalid", async () => {
    expect((await publish(request(valid, "wrong"))).status).toBe(403);
    expect((await publish(request({ title: "Example", document: null }))).status).toBe(400);
    expect(createPublication).not.toHaveBeenCalled();
  });

  it("hides backend diagnostics from both the HTTP response and security event", async () => {
    vi.mocked(createPublication).mockRejectedValueOnce(new Error("fixture-only private storage diagnostic"));
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await publish(request(valid));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).not.toContain("fixture-only private storage diagnostic");
    expect(log).toHaveBeenCalledExactlyOnceWith('{"component":"ipos.security","event":"publication_write_failed"}');
  });
});
