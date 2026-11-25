import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isOAuthMode, oauthConfiguration, validateOAuthBearer, oauthChallenge,
} from "@/lib/ai-workspace/oauth";
import { GET as metadata } from "@/app/.well-known/oauth-protected-resource/route";

const baseConfig = {
  issuer: "https://login.personal.example/",
  resource: "https://ipos.personal.example/api/mcp",
  introspectionUrl: "https://login.personal.example/oauth/introspect",
  clientId: "ipos-personal",
  clientSecret: "super-secret-test-value",
  ownerSubject: "owner-personal-uid",
};

afterEach(() => vi.unstubAllEnvs());

function setup() {
  vi.stubEnv("IPOS_MCP_AUTH_MODE", "oauth");
  vi.stubEnv("IPOS_MCP_OAUTH_ISSUER", baseConfig.issuer);
  vi.stubEnv("IPOS_MCP_RESOURCE_URL", baseConfig.resource);
  vi.stubEnv("IPOS_MCP_OAUTH_INTROSPECTION_URL", baseConfig.introspectionUrl);
  vi.stubEnv("IPOS_MCP_OAUTH_CLIENT_ID", baseConfig.clientId);
  vi.stubEnv("IPOS_MCP_OAUTH_CLIENT_SECRET", baseConfig.clientSecret);
  vi.stubEnv("IPOS_MCP_OAUTH_OWNER_SUB", baseConfig.ownerSubject);
}

function claims(overrides: Record<string, unknown> = {}) {
  return {
    active: true, iss: baseConfig.issuer, sub: baseConfig.ownerSubject,
    aud: baseConfig.resource, exp: Math.floor(Date.now() / 1000) + 120,
    client_id: "chatgpt-personal-client",
    scope: "plans:read plans:write",
    ...overrides,
  };
}

function response(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

describe("OAuth resource server, no live provider calls", () => {
  it("publishes resource discovery only with a complete, explicitly selected OAuth configuration", async () => {
    expect(isOAuthMode()).toBe(false);
    expect((await metadata()).status).toBe(404);
    setup();
    expect(isOAuthMode()).toBe(true);
    expect(oauthConfiguration()).toEqual(baseConfig);
    const res = await metadata();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      resource: baseConfig.resource,
      authorization_servers: [baseConfig.issuer],
      scopes_supported: ["plans:read", "plans:write"],
    });
    vi.stubEnv("IPOS_MCP_OAUTH_OWNER_SUB", "");
    expect(oauthConfiguration()).toBeUndefined();
    expect((await metadata()).status).toBe(503);
  });

  it("rejects insecure configuration instead of falling back to bearer keys", () => {
    setup();
    vi.stubEnv("IPOS_MCP_OAUTH_INTROSPECTION_URL", "http://localhost:3000/introspect");
    expect(oauthConfiguration()).toBeUndefined();
    vi.stubEnv("IPOS_MCP_OAUTH_INTROSPECTION_URL", baseConfig.introspectionUrl);
    vi.stubEnv("IPOS_MCP_RESOURCE_URL", "https://ipos.personal.example/other");
    expect(oauthConfiguration()).toBeUndefined();
  });

  it("authorizes only an active, correctly scoped and audience-bound personal owner", async () => {
    const received: Array<{ url: string; token: string }> = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
      const token = new URLSearchParams(String(options?.body)).get("token") ?? "";
      received.push({ url: String(url), token });
      return response(claims());
    }) as unknown as typeof fetch;
    const access = await validateOAuthBearer("Bearer personal-mock-token.123", baseConfig, fetcher);
    expect(access).toEqual({
      token: "personal-mock-token.123", clientId: "chatgpt-personal-client",
      scopes: ["plans:read", "plans:write"], subject: baseConfig.ownerSubject,
    });
    expect(received).toEqual([{
      url: baseConfig.introspectionUrl, token: "personal-mock-token.123",
    }]);
  });

  it.each([
    ["inactive", { active: false }],
    ["wrong issuer", { iss: "https://another.example/" }],
    ["wrong subject", { sub: "someone-else" }],
    ["wrong audience", { aud: "https://elsewhere.invalid/api" }],
    ["expired", { exp: Math.floor(Date.now() / 1000) - 1 }],
    ["future nbf", { nbf: Math.floor(Date.now() / 1000) + 200 }],
    ["missing scope", { scope: "profile" }],
    ["missing client", { client_id: "" }],
  ])("rejects %s response", async (_, patch) => {
    const fetcher = vi.fn(async () => response(claims(patch))) as unknown as typeof fetch;
    expect(await validateOAuthBearer("Bearer valid-test-token-123", baseConfig, fetcher)).toBeUndefined();
  });

  it("fails closed on provider errors, malformed tokens or invalid JSON", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("secret remote error");
    }) as unknown as typeof fetch;
    expect(await validateOAuthBearer("Bearer valid-test-token-123", baseConfig, fetcher)).toBeUndefined();
    expect(await validateOAuthBearer("Bearer invalid token", baseConfig, fetcher)).toBeUndefined();
    const broken = vi.fn(async () => new Response("{broken", { headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;
    expect(await validateOAuthBearer("Bearer valid-test-token-123", baseConfig, broken)).toBeUndefined();
    expect(oauthChallenge(baseConfig.resource, "https://ipos.personal.example/.well-known/oauth-protected-resource")).toContain('resource_metadata="https://ipos.personal.example/.well-known/oauth-protected-resource"');
  });
});
