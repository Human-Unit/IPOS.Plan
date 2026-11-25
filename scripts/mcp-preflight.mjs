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
export async function runPreflight(rawEndpoint) {
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
    message: "Метаданные и OAuth challenge готовы. Реальный вход и инструменты ещё не проверены.",
  };
}

export async function cli(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Проверка MCP OAuth без ключей и доступа к планам:");
    console.log("  npm run mcp:preflight -- --url https://YOUR_PERSONAL_IPOS_DOMAIN/api/mcp");
    return 0;
  }
  const index = argv.indexOf("--url");
  if (index === -1 || !argv[index + 1]) {
    console.error("Требуется --url https://YOUR_PERSONAL_IPOS_DOMAIN/api/mcp");
    return 2;
  }
  try {
    const result = await runPreflight(argv[index + 1]);
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
