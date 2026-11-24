import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizedEndpoint, resourceMetadataUrl, inspectMetadata, inspectAuthorizationServer, runPreflight,
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

test("OAuth provider supports code + PKCE S256 and Client ID Metadata Documents", () => {
  const trusted = ["https://login.personal.example/"];
  const AS = {
    issuer: trusted[0],
    authorization_endpoint: "https://login.personal.example/authorize",
    token_endpoint: "https://login.personal.example/token",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
    scopes_supported: ["plans:read", "plans:write"],
  };
  assert.deepEqual(inspectAuthorizationServer(AS, trusted), {
    issuer: trusted[0], registration: "CIMD", pkce: "S256",
  });
  const dynamic = { ...AS, client_id_metadata_document_supported: false,
    registration_endpoint: "https://login.personal.example/register" };
  assert.equal(inspectAuthorizationServer(dynamic, trusted).registration, "DCR");
  for (const bad of [
    { ...AS, issuer: "https://wrong.personal.example/" },
    { ...AS, code_challenge_methods_supported: ["plain"] },
    { ...AS, response_types_supported: ["token"] },
    { ...AS, client_id_metadata_document_supported: false },
    { ...AS, scopes_supported: ["plans:read"] },
    { ...AS, token_endpoint: "http://login.personal.example/token" },
    { ...AS, token_endpoint_auth_methods_supported: ["client_secret_basic"] },
  ]) assert.throws(() => inspectAuthorizationServer(bad, trusted));
});

test("live preflight optionally checks provider discovery without credentials", async () => {
  const original = globalThis.fetch;
  const asUrl = "https://login.personal.example/.well-known/oauth-authorization-server";
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url) === metadataUrl) return Response.json(metadata);
    if (String(url) === asUrl) return Response.json({
      issuer: metadata.authorization_servers[0],
      authorization_endpoint: "https://id.personal.example/authorize",
      token_endpoint: "https://id.personal.example/token",
      response_types_supported: ["code"],
      code_challenge_methods_supported: ["S256"],
      client_id_metadata_document_supported: true,
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["plans:read", "plans:write"],
    });
    return new Response(null, { status: 401,
      headers: { "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}"` } });
  };
  try {
    const result = await runPreflight(endpoint, { authorizationMetadataUrl: asUrl });
    assert.equal(result.status, "PASS");
    assert.equal(result.authorizationServer.registration, "CIMD");
    assert.equal(calls.length, 3);
    assert.equal(calls.every(c => !c.options.headers.Authorization), true);
  } finally { globalThis.fetch = original; }
});
