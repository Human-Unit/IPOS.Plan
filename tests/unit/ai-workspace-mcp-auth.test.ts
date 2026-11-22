import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { mcpAuthorized, mcpOriginAllowed } from "@/lib/ai-workspace/mcp-auth";

afterEach(() => vi.unstubAllEnvs());

describe("private MCP auth", () => {
  it("requires a strong server-side token and a valid Bearer header", () => {
    const secret = "a".repeat(64);
    vi.stubEnv("IPOS_MCP_API_TOKEN", secret);
    expect(mcpAuthorized(null)).toBe(false);
    expect(mcpAuthorized("Bearer " + secret)).toBe(true);
    expect(mcpAuthorized("Bearer " + "b".repeat(64))).toBe(false);
    expect(mcpAuthorized(secret)).toBe(false);
    vi.stubEnv("IPOS_MCP_API_TOKEN", "weak");
    expect(mcpAuthorized("Bearer weak")).toBe(false);
  });
  it("denies unsolicited web Origins", () => {
    vi.stubEnv("IPOS_MCP_ALLOWED_ORIGINS", "https://chat.example,https://studio.example");
    expect(mcpOriginAllowed(null)).toBe(true);
    expect(mcpOriginAllowed("https://chat.example")).toBe(true);
    expect(mcpOriginAllowed("https://untrusted.example")).toBe(false);
    expect(mcpOriginAllowed("null")).toBe(false);
  });
});
