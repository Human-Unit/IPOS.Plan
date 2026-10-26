import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "ipos_admin_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const VERSION = "v1";

function constantTimeMatch(provided: string, expected: string) {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function isAdminConfigured() {
  return Boolean(
    process.env.IPOS_ADMIN_PASSWORD?.length &&
    process.env.IPOS_ADMIN_PASSWORD.length >= 24 &&
    process.env.IPOS_ADMIN_SESSION_SECRET?.length &&
    process.env.IPOS_ADMIN_SESSION_SECRET.length >= 48,
  );
}

export function correctAdminPassword(value: unknown) {
  const configured = process.env.IPOS_ADMIN_PASSWORD;
  return isAdminConfigured() &&
    typeof value === "string" && value.length >= 20 && value.length <= 256 &&
    Boolean(configured && constantTimeMatch(value, configured));
}

function signature(payload: string) {
  return createHmac("sha256", process.env.IPOS_ADMIN_SESSION_SECRET!)
    .update(payload).digest("base64url");
}

export function issueAdminSession() {
  if (!isAdminConfigured()) throw new Error("Admin session is not configured");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${VERSION}.${expiresAt}.${randomBytes(24).toString("base64url")}`;
  return { value: payload + "." + signature(payload), maxAge: SESSION_SECONDS };
}

export function verifyAdminSession(value: string | undefined) {
  if (!value || !isAdminConfigured()) return false;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return false;
  const expires = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expires) || expires <= now ||
      expires > now + SESSION_SECONDS ||
      !/^[A-Za-z0-9_-]{32}$/.test(parts[2]) ||
      !/^[A-Za-z0-9_-]{43}$/.test(parts[3])) return false;
  const payload = parts.slice(0, 3).join(".");
  return constantTimeMatch(parts[3], signature(payload));
}

export async function isAdmin() {
  const jar = await cookies();
  return verifyAdminSession(jar.get(ADMIN_COOKIE)?.value);
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === request.nextUrl.origin);
}

export const adminCookieOptions = {
  name: ADMIN_COOKIE,
  path: "/",
  sameSite: "strict" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  priority: "high" as const,
};
