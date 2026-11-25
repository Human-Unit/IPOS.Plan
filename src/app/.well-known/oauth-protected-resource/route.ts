import { NextResponse } from "next/server";
import { isOAuthMode, oauthConfiguration } from "@/lib/ai-workspace/oauth";
import { privateHeaders } from "@/lib/ai-workspace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 9728 protected resource metadata. The OAuth authorization server
 * is external to IPOS.Plan and MUST support Authorization Code + PKCE S256. */
export function GET() {
  if (!isOAuthMode()) return new Response(null, { status: 404, headers: privateHeaders });
  const config = oauthConfiguration();
  if (!config) return new Response(null, { status: 503, headers: privateHeaders });
  return NextResponse.json({
    resource: config.resource,
    authorization_servers: [config.issuer],
    scopes_supported: ["plans:read", "plans:write"],
    bearer_methods_supported: ["header"],
  }, { headers: { ...privateHeaders, "Content-Type": "application/json" } });
}
