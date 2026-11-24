#!/usr/bin/env node
/**
 * Read-only MCP OAuth preflight. No credentials are sent and no plan data is accessed.
 * Example: npm run mcp:preflight -- --url https://your-ipos.example/api/mcp
 */
import { pathToFileURL } from "node:url";

export function normalizedEndpoint(raw) {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("Укажите --url с HTTPS адресом MCP.");
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
      parsed.search || parsed.hash || parsed.pathname !== "/api/mcp") {
    throw new Error("Нужен точный HTTPS URL без credentials/query/fragment, путь /api/mcp.");
  }
  return parsed.href;
}

export function resourceMetadataUrl(endpoint) {
  return new URL("/.well-known/oauth-protected-resource", normalizedEndpoint(endpoint)).href;
}

export function inspectMetadata(document, endpoint) {
  const expected = normalizedEndpoint(endpoint);
  if (!document || typeof document !== "object" || Array.isArray(document) ||
      document.resource !== expected ||
      !Array.isArray(document.authorization_servers) ||
      document.authorization_servers.length < 1 ||
      !document.authorization_servers.every((item) => {
        if (typeof item !== "string") return false;
        try {
          const url = new URL(item);
          return url.protocol === "https:" && !url.username && !url.password && !url.hash;
        } catch {
          return false;
        }
      })) {
    throw new Error("OAuth metadata: resource или authorization_servers некорректны.");
  }
  const scopes = document.scopes_supported;
  if (!Array.isArray(scopes) || !scopes.includes("plans:read") || !scopes.includes("plans:write"))
    throw new Error("OAuth metadata: ожидаются scopes plans:read и plans:write.");
  return { resource: document.resource, issuers: document.authorization_servers };
}

function checkedHttps(raw, name) {
  if (typeof raw !== "string") throw new Error(`${name}: нужен HTTPS URL.`);
  let u;
  try { u = new URL(raw); } catch { throw new Error(`${name}: некорректный URL.`); }
  if (u.protocol !== "https:" || u.username || u.password || u.hash || u.search)
    throw new Error(`${name}: нужен HTTPS URL без credentials, fragment и query.`);
  return u.href;
}

/** Check a provider's public Authorization Server metadata without a user token. */
export function inspectAuthorizationServer(document, trustedIssuers) {
  if (!document || typeof document !== "object" || Array.isArray(document))
    throw new Error("OAuth authorization metadata: не JSON-объект.");
  const issuer = checkedHttps(document.issuer, "issuer");
  if (!trustedIssuers.includes(issuer))
    throw new Error("OAuth authorization metadata: issuer не совпадает с доверенным resource metadata.");
  checkedHttps(document.authorization_endpoint, "authorization_endpoint");
  checkedHttps(document.token_endpoint, "token_endpoint");
  if (!Array.isArray(document.response_types_supported) ||
      !document.response_types_supported.includes("code"))
    throw new Error("OAuth AS не поддерживает response_type=code.");
  if (!Array.isArray(document.code_challenge_methods_supported) ||
      !document.code_challenge_methods_supported.includes("S256"))
    throw new Error("OAuth AS не подтверждает PKCE S256.");
  if (Array.isArray(document.grant_types_supported) &&
      !document.grant_types_supported.includes("authorization_code"))
    throw new Error("OAuth AS не поддерживает Authorization Code grant.");
  const registration = document.client_id_metadata_document_supported === true
    ? "CIMD"
    : document.registration_endpoint
      ? (checkedHttps(document.registration_endpoint, "registration_endpoint"), "DCR")
      : undefined;
  if (!registration)
    throw new Error("OAuth AS не объявил ни CIMD, ни DCR.");
  if (registration === "CIMD" &&
    Array.isArray(document.token_endpoint_auth_methods_supported) &&
    !document.token_endpoint_auth_methods_supported.some(method => ["none", "private_key_jwt"].includes(method)))
    throw new Error("OAuth AS CIMD: несовместимый token endpoint authentication.");
  if (Array.isArray(document.scopes_supported) &&
      (!document.scopes_supported.includes("plans:read") || !document.scopes_supported.includes("plans:write")))
    throw new Error("OAuth AS: не объявлены scopes plans:read / plans:write.");
  return { issuer, registration, pkce: "S256" };
}

async function publicJson(url) {
  const response = await request(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`OAuth AS metadata HTTP ${response.status}.`);
  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json"))
    throw new Error("OAuth AS metadata: ответ не JSON.");
  const body = await response.text();
  if (body.length > 20000) throw new Error("OAuth AS metadata: ответ слишком большой.");
  try { return JSON.parse(body); }
  catch { throw new Error("OAuth AS metadata: невалидный JSON."); }
}

async function request(url, options = {}, timeout = 8000) {
  const response = await fetch(url, {
    ...options, redirect: "manual", cache: "no-store",
    signal: AbortSignal.timeout(timeout),
  });
  if (response.status >= 300 && response.status < 400)
    throw new Error(`Неожиданный redirect от ${new URL(url).pathname}. Проверьте защиту preview и HTTPS.`);
  return response;
}

/** Only non-mutating probes: OAuth metadata GET and unauthorized MCP POST. */
export async function runPreflight(rawEndpoint, options = {}) {
  const endpoint = normalizedEndpoint(rawEndpoint);
  const metadataUrl = resourceMetadataUrl(endpoint);
  const metadataResponse = await request(metadataUrl, { method: "GET", headers: { Accept: "application/json" } });
  if (metadataResponse.status !== 200)
    throw new Error(`Metadata HTTP ${metadataResponse.status}. OAuth-режим/деплой пока не готов.`);
  const type = metadataResponse.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) throw new Error("Metadata ответ не JSON.");
  const body = await metadataResponse.text();
  if (body.length > 12000) throw new Error("Metadata ответ слишком большой.");
  let metadata;
  try { metadata = JSON.parse(body); } catch { throw new Error("Metadata ответ невалидный JSON."); }
  const verified = inspectMetadata(metadata, endpoint);
  let authorizationServer;
  if (options.authorizationMetadataUrl) {
    const providerMetadataUrl = checkedHttps(options.authorizationMetadataUrl, "authorizationMetadataUrl");
    authorizationServer = inspectAuthorizationServer(
      await publicJson(providerMetadataUrl), verified.issuers,
    );
  }

  // No bearer token, no JSON document and no write tools.
  const unauthorizedResponse = await request(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  if (unauthorizedResponse.status !== 401)
    throw new Error(`Анонимный MCP: ожидали HTTP 401, получили ${unauthorizedResponse.status}.`);
  const challenge = unauthorizedResponse.headers.get("www-authenticate") ?? "";
  if (!/^Bearer\s/i.test(challenge) || !challenge.includes(`resource_metadata="${metadataUrl}"`))
    throw new Error("MCP 401 не указывает на ожидаемый OAuth resource_metadata URL.");

  return {
    status: "PASS",
    endpoint,
    resourceMetadataUrl: metadataUrl,
    issuerCount: verified.issuers.length,
    scopes: ["plans:read", "plans:write"],
    anonymousMcpStatus: unauthorizedResponse.status,
    ...(authorizationServer ? { authorizationServer } : {}),
    message: "Метаданные и OAuth challenge готовы. Реальный вход и инструменты ещё не проверены.",
  };
}

export async function cli(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Проверка MCP OAuth без ключей и доступа к планам:");
    console.log("  npm run mcp:preflight -- --url https://YOUR_PERSONAL_IPOS_DOMAIN/api/mcp");
    console.log("  npm run mcp:preflight -- --url https://YOUR_PERSONAL_IPOS_DOMAIN/api/mcp --authorization-metadata-url https://YOUR_PERSONAL_OAUTH_PROVIDER/.well-known/oauth-authorization-server");
    return 0;
  }
  const index = argv.indexOf("--url");
  if (index === -1 || !argv[index + 1]) {
    console.error("Требуется --url https://YOUR_PERSONAL_IPOS_DOMAIN/api/mcp");
    return 2;
  }
  try {
    const providerIndex = argv.indexOf("--authorization-metadata-url");
    if (providerIndex !== -1 && !argv[providerIndex + 1]) throw new Error("--authorization-metadata-url требует HTTPS URL.");
    const result = await runPreflight(argv[index + 1], {
      authorizationMetadataUrl: providerIndex === -1 ? undefined : argv[providerIndex + 1],
    });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    console.error("MCP OAuth preflight FAIL: " + (error instanceof Error ? error.message : "Неизвестная ошибка."));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await cli();
}
