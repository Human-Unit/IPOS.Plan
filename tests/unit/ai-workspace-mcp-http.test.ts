import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai-workspace/mcp-auth", () => ({
  mcpAuthorized: (header: string | null) => header === "Bearer test",
  mcpOriginAllowed: () => true,
}));
vi.mock("@/lib/ai-workspace/server", () => ({
  aiWorkspaceConfigured: () => true,
  getCloudPlan: vi.fn(),
  createCloudPlan: vi.fn(),
  updateCloudPlan: vi.fn(),
  listCloudPlans: vi.fn().mockResolvedValue({ plans: [], nextCursor: null }),
  CloudPlanConflict: class CloudPlanConflict extends Error {},
}));

import { POST } from "@/app/api/mcp/route";

const rpc = (input: unknown, authorization = "Bearer test") => new NextRequest("http://localhost/api/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: authorization },
  body: JSON.stringify(input),
});

describe("MCP wire protocol preview", () => {
  it("rejects missing authorization before parsing requests", async () => {
    vi.stubEnv("IPOS_MCP_API_TOKEN", "x".repeat(64));
    const response = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, ""));
    expect(response.status).toBe(401);
    vi.unstubAllEnvs();
  });
  it("supports initialize and tool discovery", async () => {
    vi.stubEnv("IPOS_MCP_API_TOKEN", "x".repeat(64));
    const init = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25" } }));
    expect(init.status).toBe(200);
    expect((await init.json()).result.serverInfo.name).toBe("ipos-plan");
    const response = await POST(rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }));
    const body = await response.json();
    expect(body.result.tools).toHaveLength(6);
    expect(body.result.tools.some((tool: { name: string }) => tool.name === "ipos_add_task")).toBe(true);
    vi.unstubAllEnvs();
  });
});
