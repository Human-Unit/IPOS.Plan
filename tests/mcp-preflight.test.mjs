import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizedEndpoint, resourceMetadataUrl, inspectMetadata, runPreflight,
} from "../scripts/mcp-preflight.mjs";

const endpoint = "https://ipos.personal.example/api/mcp";
const metadataUrl = "https://ipos.personal.example/.well-known/oauth-protected-resource";
const metadata = {
  resource: endpoint,
  authorization_servers: ["https://id.personal.example/"],
  scopes_supported: ["plans:read", "plans:write"],
};

test("normalizes only an exact credential-free HTTPS MCP endpoint", () => {
  assert.equal(normalizedEndpoint(endpoint), endpoint);
  assert.equal(resourceMetadataUrl(endpoint), metadataUrl);
  for (const bad of [
    "http://ipos.personal.example/api/mcp",
    "https://user:password@ipos.personal.example/api/mcp",
    "https://ipos.personal.example/api/mcp?token=secret",
    "https://ipos.personal.example/api/mcp#secret",
    "https://ipos.personal.example/api/not-mcp",
    "",
  ]) {
    assert.throws(() => normalizedEndpoint(bad));
  }
});

test("OAuth metadata must bind the exact resource and scopes", () => {
  assert.deepEqual(inspectMetadata(metadata, endpoint), {
    resource: endpoint, issuers: ["https://id.personal.example/"],
  });
  assert.throws(() => inspectMetadata({ ...metadata, resource: "https://different.example/api/mcp" }, endpoint));
  assert.throws(() => inspectMetadata({ ...metadata, authorization_servers: ["http://insecure.invalid"] }, endpoint));
  assert.throws(() => inspectMetadata({ ...metadata, scopes_supported: ["plans:read"] }, endpoint));
});

test("preflight checks only metadata and an anonymous 401 challenge", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method, headers: options.headers, body: options.body });
    if (String(url) === metadataUrl) {
      return Response.json(metadata);
    }
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}"` },
    });
  };
  try {
    const result = await runPreflight(endpoint);
    assert.equal(result.status, "PASS");
    assert.equal(result.anonymousMcpStatus, 401);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, metadataUrl);
    assert.equal(calls[1].url, endpoint);
    assert.equal(calls[1].method, "POST");
    assert.equal(calls[1].headers.Authorization, undefined);
    assert.equal(JSON.parse(calls[1].body).method, "tools/list");
  } finally {
    globalThis.fetch = original;
  }
});

test("preflight rejects an endpoint that unexpectedly permits anonymous MCP", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => String(url) === metadataUrl
    ? Response.json(metadata)
    : Response.json({ tools: [] });
  try {
    await assert.rejects(() => runPreflight(endpoint), /ожидали HTTP 401/);
  } finally {
    globalThis.fetch = original;
  }
});
