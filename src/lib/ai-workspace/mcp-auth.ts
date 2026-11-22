import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();
const tokenPattern = /^[A-Za-z0-9_-]{40,256}$/;
const validToken = (value: string | undefined): value is string =>
  typeof value === "string" && tokenPattern.test(value);

export function mcpConfigured(): boolean {
  return validToken(process.env.IPOS_MCP_API_TOKEN) ||
    validToken(process.env.IPOS_MCP_WRITE_TOKEN);
}

export function mcpAccess(value: string | null): "read" | "write" | undefined {
  if (!value || value.length > 263) return;
  const provided = value.match(/^Bearer ([A-Za-z0-9_-]{40,256})$/i)?.[1];
  if (!provided) return;
  const read = process.env.IPOS_MCP_API_TOKEN;
  const write = process.env.IPOS_MCP_WRITE_TOKEN;
  // A key configured for both roles retains only read access.
  if (validToken(read) && timingSafeEqual(digest(provided), digest(read))) return "read";
  if (validToken(write) && timingSafeEqual(digest(provided), digest(write))) return "write";
}

export function mcpAuthorized(value: string | null): boolean {
  return mcpAccess(value) !== undefined;
}

export function mcpOriginAllowed(origin: string | null): boolean {
  if (origin === null) return true;
  if (!origin || origin === "null") return false;
  const allowed = (process.env.IPOS_MCP_ALLOWED_ORIGINS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  return allowed.includes(origin);
}
