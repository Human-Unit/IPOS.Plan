import { createMcpHandler } from "@modelcontextprotocol/server";
import { mcpAccess, mcpConfigured, mcpOriginAllowed } from "@/lib/ai-workspace/mcp-auth";
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
  if (!mcpConfigured())
    return Response.json({ error: "MCP не настроен." }, { status: 503, headers: privateHeaders });
  const access = mcpAccess(request.headers.get("authorization"));
  if (!access)
    return Response.json({ error: "Требуется авторизация MCP." }, {
      status: 401, headers: { ...privateHeaders, "WWW-Authenticate": 'Bearer realm="IPOS.Plan MCP"' },
    });
  if (!aiWorkspaceConfigured())
    return Response.json({ error: "Облачное хранилище не настроено." }, { status: 503, headers: privateHeaders });

  const response = await handler.fetch(request, {
    authInfo: {
      token: request.headers.get("authorization")!.slice(7),
      clientId: "ipos-owner",
      scopes: access === "write" ? ["plans:read", "plans:write"] : ["plans:read"],
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
