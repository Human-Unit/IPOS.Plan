import "server-only";

/**
 * Personal-owner OAuth 2 resource-server integration for the MCP endpoint.
 * An external authorization server handles Authorization Code + PKCE S256;
 * this application only validates access tokens via RFC 7662 introspection.
 * Never use corporate credentials or another person's identity provider.
 */

export type OAuthAccess = {
  token: string;
  clientId: string;
  scopes: string[];
  subject: string;
};

export type OAuthConfiguration = {
  issuer: string;
  resource: string;
  introspectionUrl: string;
  clientId: string;
  clientSecret: string;
  ownerSubject: string;
};

export function isOAuthMode() {
  return process.env.IPOS_MCP_AUTH_MODE === "oauth";
}

function httpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username || url.password || url.hash ||
      url.search || !url.hostname
    ) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function oauthConfiguration(): OAuthConfiguration | undefined {
  if (!isOAuthMode()) return undefined;
  const issuer = httpsUrl(process.env.IPOS_MCP_OAUTH_ISSUER);
  const resource = httpsUrl(process.env.IPOS_MCP_RESOURCE_URL);
  const introspectionUrl = httpsUrl(process.env.IPOS_MCP_OAUTH_INTROSPECTION_URL);
  const clientId = process.env.IPOS_MCP_OAUTH_CLIENT_ID;
  const clientSecret = process.env.IPOS_MCP_OAUTH_CLIENT_SECRET;
  const ownerSubject = process.env.IPOS_MCP_OAUTH_OWNER_SUB;
  if (!issuer || !resource || !introspectionUrl ||
    !clientId || !clientSecret || !ownerSubject ||
    clientId.length > 500 || clientSecret.length < 16 ||
    ownerSubject.length > 500 || !ownerSubject.trim()
  ) return undefined;
  if (new URL(resource).pathname !== "/api/mcp") return undefined;
  return {
    issuer, resource, introspectionUrl,
    clientId, clientSecret, ownerSubject,
  };
}

const bearerPattern = /^Bearer ([A-Za-z0-9\-._~+/]{12,8192}={0,})$/i;

export async function validateOAuthBearer(
  authorization: string | null,
  config: OAuthConfiguration,
  fetcher: typeof fetch = fetch,
): Promise<OAuthAccess | undefined> {
  if (!authorization || authorization.length > 8200) return undefined;
  const token = authorization.match(bearerPattern)?.[1];
  if (!token) return undefined;
  try {
    const response = await fetcher(config.introspectionUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(
          encodeURIComponent(config.clientId) + ":" + encodeURIComponent(config.clientSecret),
        ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "Cache-Control": "no-store",
      },
      body: new URLSearchParams({
        token,
        token_type_hint: "access_token",
      }).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("application/json"))
      return undefined;
    if (Number(response.headers.get("content-length") || 0) > 12_000) return undefined;
    const raw = await response.text();
    if (raw.length > 12_000) return undefined;
    const data: unknown = JSON.parse(raw);
    if (!data || Array.isArray(data) || typeof data !== "object") return undefined;
    const d = data as Record<string, unknown>;
    if (d.active !== true) return undefined;
    if (d.iss !== config.issuer || d.sub !== config.ownerSubject) return undefined;
    if (typeof d.exp !== "number" || !Number.isSafeInteger(d.exp) || d.exp <= Math.floor(Date.now() / 1000))
      return undefined;
    if (d.nbf !== undefined && (typeof d.nbf !== "number" || d.nbf > Math.floor(Date.now() / 1000)))
      return undefined;
    if (d.aud !== config.resource &&
      (!Array.isArray(d.aud) || !d.aud.includes(config.resource))) return undefined;
    if (typeof d.client_id !== "string" || d.client_id.length === 0) return undefined;
    if (typeof d.scope !== "string") return undefined;
    const scopes = [...new Set(d.scope.split(/\s+/).filter(Boolean))];
    if (!scopes.includes("plans:read")) return undefined;
    return { token, clientId: d.client_id, scopes, subject: config.ownerSubject };
  } catch {
    // Fail closed on introspection errors and do not leak provider responses.
    return undefined;
  }
}

export function oauthChallenge(resource: string, metadata: string, insufficientScope = false) {
  const parts = [
    `resource_metadata="${metadata}"`,
    `resource="${resource}"`,
  ];
  if (insufficientScope) parts.push('error="insufficient_scope"');
  return "Bearer " + parts.join(", ");
}
