import { createMcpHandler } from "@modelcontextprotocol/server";
import { mcpAccess, mcpConfigured, mcpOriginAllowed } from "@/lib/ai-workspace/mcp-auth";
import {
  isOAuthMode, oauthConfiguration, oauthChallenge, validateOAuthBearer,
} from "@/lib/ai-workspace/oauth";
import { createWorkspaceMcp } from "@/lib/ai-workspace/mcp-tools";
import { aiWorkspaceConfigured } from "@/lib/ai-workspace/server";
import { maxRequestBytes, privateHeaders } from "@/lib/ai-workspace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createMcpHandler(
  ({ authInfo }) => createWorkspaceMcp(authInfo?.scopes.includes("plans:write") === true),
  { legacy: "stateless", maxRequestBodySize: maxRequestBytes },
);

export async function POST(request: Request) {
  if (!mcpOriginAllowed(request.headers.get("origin")))
    return Response.json({ error: "Недопустимый Origin." }, { status: 403, headers: privateHeaders });

  const authMode = process.env.IPOS_MCP_AUTH_MODE;
  if (authMode && authMode !== "oauth" && authMode !== "token")
    return Response.json({ error: "Недопустимая настройка MCP." }, { status: 503, headers: privateHeaders });

  const oauth = isOAuthMode();
  const config = oauth ? oauthConfiguration() : undefined;
  if (oauth ? !config : !mcpConfigured())
    return Response.json({ error: "MCP не настроен." }, { status: 503, headers: privateHeaders });

  // In OAuth mode, no legacy static bearer key can bypass token introspection.
  const metadataUrl = config
    ? new URL("/.well-known/oauth-protected-resource", config.resource).toString()
    : undefined;
  const access = config
    ? await validateOAuthBearer(request.headers.get("authorization"), config)
    : undefined;
  const legacyAccess = !oauth ? mcpAccess(request.headers.get("authorization")) : undefined;

  if (!access && !legacyAccess) {
    const challenge = config
      ? oauthChallenge(config.resource, metadataUrl!)
      : 'Bearer realm="IPOS.Plan MCP"';
    return Response.json({ error: "Требуется авторизация MCP." }, {
      status: 401, headers: { ...privateHeaders, "WWW-Authenticate": challenge },
    });
  }
  if (!aiWorkspaceConfigured())
    return Response.json({ error: "Облачное хранилище не настроено." }, { status: 503, headers: privateHeaders });

  const headerToken = request.headers.get("authorization")!;
  const response = await handler.fetch(request, {
    authInfo: access ? {
      token: access.token,
      clientId: access.clientId,
      scopes: access.scopes,
    } : {
      token: headerToken.slice(7),
      clientId: "ipos-owner",
      scopes: legacyAccess === "write" ? ["plans:read", "plans:write"] : ["plans:read"],
    },
  });
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(privateHeaders)) headers.set(name, value);
  return new Response(response.body, { status: response.status, headers });
}

export function GET() {
  return new Response(null, { status: 405, headers: { ...privateHeaders, Allow: "POST" } });
}

export const DELETE = GET;
