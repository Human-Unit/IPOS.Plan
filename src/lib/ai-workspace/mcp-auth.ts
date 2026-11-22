import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/** Single-owner MVP. Upgrade to scoped OAuth before sharing access with a team. */
export function mcpAuthorized(value: string | null): boolean {
  const expected = process.env.IPOS_MCP_API_TOKEN;
  if (!expected || expected.length < 40 || !value || value.length > 300) return false;
  const provided = value.match(/^Bearer ([A-Za-z0-9_\-]{40,256})$/)?.[1];
  if (!provided) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

/** Deny browser cross-origin requests unless origins are explicitly configured. */
export function mcpOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Server-to-server MCP clients normally send no Origin.
  const allowed = (process.env.IPOS_MCP_ALLOWED_ORIGINS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin);
}
