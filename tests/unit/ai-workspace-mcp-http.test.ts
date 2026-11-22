import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const blobs = vi.hoisted(() => new Map<string, { body: string; etag: string }>());
vi.mock("@vercel/blob", () => {
  class BlobPreconditionFailedError extends Error {}
  return {
    BlobPreconditionFailedError,
    get: vi.fn(async (path: string) => {
      const blob = blobs.get(path);
      return blob && { stream: new Response(blob.body).body, blob: { etag: blob.etag } };
    }),
    put: vi.fn(async (path: string, body: string, options: { ifMatch?: string; allowOverwrite: boolean; access: string }) => {
      expect(options.access).toBe("private");
      const current = blobs.get(path);
      if (current && (options.allowOverwrite === false || options.ifMatch !== current.etag))
        throw new BlobPreconditionFailedError();
      blobs.set(path, { body, etag: crypto.randomUUID() });
    }),
    list: vi.fn(async ({ prefix }: { prefix: string }) => ({
      blobs: [...blobs.keys()].filter((path) => path.startsWith(prefix)).map((pathname) => ({ pathname })),
      hasMore: false,
    })),
  };
});
const admin = vi.hoisted(() => ({ signedIn: false }));
vi.mock("@/lib/admin/auth", () => ({
  isAdmin: () => Promise.resolve(admin.signedIn),
  sameOrigin: (request: NextRequest) => request.headers.get("origin") === request.nextUrl.origin,
}));

import { get } from "@vercel/blob";
import { POST } from "@/app/api/mcp/route";
import { POST as create, GET as list } from "@/app/api/ai/plans/route";
import { PUT as update } from "@/app/api/ai/plans/[id]/route";

const readToken = "r".repeat(64);
const writeToken = "w".repeat(64);
const base = "http://localhost";
const planDoc = { schemaVersion: 1, title: "Два Reels", blocks: [], tasks: {} };

function rpc(input: unknown, token = writeToken, headers: Record<string, string> = {}) {
  return new Request(base + "/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: "Bearer " + token,
      ...headers,
    },
    body: JSON.stringify(input),
  });
}

async function jsonRpc(response: Response) {
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const stream = await response.text();
    const results = stream.split(/\r?\n/).filter((line) => line.startsWith("data: ") && line.slice(6).trim());
    return JSON.parse(results.at(-1)!.slice(6));
  }
  return response.json();
}

async function call(name: string, args: unknown, token?: string) {
  const response = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, token));
  const wire = await jsonRpc(response);
  const content = wire.result?.content?.[0]?.text;
  let data: unknown;
  try { data = JSON.parse(content); } catch { data = content; }
  return { wire, data } as { wire: typeof wire; data: Record<string, unknown> };
}

beforeEach(() => {
  blobs.clear();
  admin.signedIn = false;
  vi.clearAllMocks();
  vi.stubEnv("IPOS_MCP_API_TOKEN", readToken);
  vi.stubEnv("IPOS_MCP_WRITE_TOKEN", writeToken);
  vi.stubEnv("IPOS_AI_BLOB_READ_WRITE_TOKEN", "mock-only");
});

afterEach(() => vi.unstubAllEnvs());

describe("MCP through the SDK with private storage mocked", () => {
  it("authenticates before storage, rejects unlisted Origin, and separates tool permissions", async () => {
    const input = { jsonrpc: "2.0", id: 1, method: "tools/list" };
    expect((await POST(rpc(input, ""))).status).toBe(401);
    expect((await POST(rpc(input, readToken, { Origin: "https://untrusted.invalid" }))).status).toBe(403);
    const read = await jsonRpc(await POST(rpc(input, readToken)));
    expect(read.result.tools.map((tool: { name: string }) => tool.name)).toEqual(["ipos_list_plans", "ipos_get_plan"]);
    const write = await jsonRpc(await POST(rpc(input)));
    expect(write.result.tools).toHaveLength(6);
    const denied = await call("ipos_create_plan", { title: "A plan", idempotencyKey: "no-write" }, readToken);
    expect(denied.wire.error ?? denied.wire.result?.isError).toBeTruthy();
    expect(blobs.size).toBe(0);
  });

  it("negotiates legacy initialize, acknowledges notifications, and exposes modern discovery", async () => {
    const init = await jsonRpc(await POST(rpc({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "local", version: "1" } },
    })));
    expect(init.result).toMatchObject({ protocolVersion: "2025-11-25", serverInfo: { name: "ipos-plan" } });
    expect((await POST(rpc({ jsonrpc: "2.0", method: "notifications/initialized" }))).status).toBe(202);
    const discovery = await jsonRpc(await POST(rpc({
      jsonrpc: "2.0", id: 2, method: "server/discover",
      params: { _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {},
        "io.modelcontextprotocol/clientInfo": { name: "local", version: "1" },
      } },
    }, writeToken, { "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "server/discover" })));
    expect(discovery.result, JSON.stringify(discovery)).toMatchObject({ supportedVersions: ["2026-07-28"] });
  });

  it("creates the two Reels once, retains names, scripts and references without dates, and supports a versioned edit", async () => {
    const createArgs = { title: "Два Reels", idempotencyKey: "two-reels-request" };
    const created = (await call("ipos_create_plan", createArgs)).data;
    const replay = (await call("ipos_create_plan", createArgs)).data;
    expect(replay.id).toBe(created.id);
    expect(blobs.size).toBe(1);
    const planId = created.id;
    const first = {
      planId, expectedVersion: 1, idempotencyKey: "reel-one-request",
      title: "Reel 1", description: "Кадр 1: вход. Кадр 2: интервью.", assignee: "Ислом",
      referenceUrl: "https://example.org/reel-one",
    };
    const pair = await Promise.all([call("ipos_add_task", first), call("ipos_add_task", first)]);
    expect(pair.map((entry) => entry.data.alreadyExists).sort()).toEqual([false, true]);
    expect((await call("ipos_add_task", { ...first, title: "Другой сценарий" })).data.status).toBe(409);
    const second = {
      ...first, expectedVersion: 2, idempotencyKey: "reel-two-request",
      title: "Reel 2", description: "Кадр 1: общий план. Кадр 2: детали.",
      assignee: "Гулнамо, Шехрона", referenceUrl: "https://example.org/reel-two",
    };
    expect((await call("ipos_add_task", { ...second, expectedVersion: 1 })).data.status).toBe(409);
    expect((await call("ipos_add_task", second)).data.version).toBe(3);
    const taskId = pair[0].data.id;
    const args = { planId, taskId, expectedVersion: 3, patch: { status: "review" } };
    expect((await call("ipos_update_task", args)).data.version).toBe(4);
    expect((await call("ipos_update_task", args)).data.status).toBe(409);
    const read = (await call("ipos_get_plan", { planId }, readToken)).data;
    expect(read).not.toHaveProperty("taskRequests");
    expect(read).not.toHaveProperty("creationHash");
    expect(read.document).toMatchObject({
      schemaVersion: 1,
      blocks: [
        { type: "task" }, { type: "reference", props: { url: first.referenceUrl } },
        { type: "task" }, { type: "reference", props: { url: second.referenceUrl } },
      ],
      tasks: {
        [String(taskId)]: { status: "review", assignee: first.assignee, description: first.description },
      },
    });
    const tasks = Object.values((read.document as { tasks: Record<string, unknown> }).tasks);
    expect(tasks).toHaveLength(2);
    expect(tasks).toContainEqual(expect.objectContaining({ assignee: second.assignee, description: second.description }));
    for (const task of tasks) expect(task).not.toHaveProperty("deadline");
    expect((await call("ipos_add_task", { ...first, deadline: "2026-02-31" })).wire.result?.isError).toBe(true);
    expect((await call("ipos_replace_plan", { planId, expectedVersion: 4, confirmReplace: true, document: planDoc })).data.status).toBe(403);
    vi.stubEnv("IPOS_MCP_ALLOW_REPLACE", "true");
    expect((await call("ipos_replace_plan", { planId, expectedVersion: 4, confirmReplace: true, document: planDoc })).data.version).toBe(5);
    // Whole-document replacement preserves retry history.
    expect((await call("ipos_add_task", first)).data.alreadyExists).toBe(true);
  });

  it("limits the entire body and hides details if storage throws", async () => {
    const large = new Request(base + "/api/mcp", {
      method: "POST", headers: rpc({}).headers, body: "x".repeat(1_500_001),
    });
    expect((await POST(large)).status).toBe(413);
    vi.mocked(get).mockRejectedValueOnce(new Error("mock-secret-provider-detail"));
    const result = await call("ipos_get_plan", { planId: crypto.randomUUID() });
    expect(result.data.status).toBe(503);
    expect(JSON.stringify(result)).not.toContain("mock-secret");
  });
});

describe("browser API with the same mock", () => {
  it("requires a signed session and same-origin writes, then handles invalid input, stale versions and missing storage", async () => {
    const request = (method: string, body: unknown, origin = base, id = "") => new NextRequest(base + "/api/ai/plans" + id, {
      method, body: JSON.stringify(body), headers: { Origin: origin, "Content-Type": "application/json" },
    });
    expect((await list(new NextRequest(base + "/api/ai/plans"))).status).toBe(401);
    expect((await create(request("POST", { document: planDoc }))).status).toBe(401);
    admin.signedIn = true;
    expect((await create(request("POST", { document: planDoc }, "https://untrusted.invalid"))).status).toBe(403);
    expect((await create(request("POST", { document: { ...planDoc, schemaVersion: 2 } }))).status).toBe(400);
    expect((await create(request("POST", { document: planDoc, unknown: true }))).status).toBe(400);
    expect((await create(request("POST", "x".repeat(1_500_001)))).status).toBe(413);
    const created = await create(request("POST", { document: planDoc, idempotencyKey: "browser-retry" }));
    expect(created.status).toBe(201);
    const { id } = await created.json();
    expect((await (await create(request("POST", { document: planDoc, idempotencyKey: "browser-retry" }))).json()).id).toBe(id);
    const context = { params: Promise.resolve({ id }) };
    expect((await update(request("PUT", { document: planDoc, expectedVersion: "1" }, base, "/" + id), context)).status).toBe(400);
    expect((await update(request("PUT", { document: planDoc, expectedVersion: 2 }, base, "/" + id), context)).status).toBe(409);
    vi.stubEnv("IPOS_AI_BLOB_READ_WRITE_TOKEN", "");
    expect((await list(new NextRequest(base + "/api/ai/plans"))).status).toBe(503);
  });
});
