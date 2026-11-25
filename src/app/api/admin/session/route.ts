import { NextRequest, NextResponse } from "next/server";
import { JsonBodyError, readBoundedJson } from "@/lib/http/request-json";
import { recordSecurityEvent } from "@/lib/http/security-event";
import {
  adminCookieOptions, correctAdminPassword, isAdmin,
  isAdminConfigured, issueAdminSession, sameOrigin,
} from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET() {
  return NextResponse.json({ authenticated: await isAdmin(), configured: isAdminConfigured() }, { headers });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Запрос отклонён." }, { status: 403, headers });
  if (!isAdminConfigured()) return NextResponse.json({ error: "Вход администратора пока не настроен." }, { status: 503, headers });
  let payload: unknown;
  try {
    payload = await readBoundedJson(request, 1_000);
  } catch (error) {
    if (!(error instanceof JsonBodyError)) throw error;
    return NextResponse.json({ error: error.message }, { status: error.status, headers });
  }
  if (!payload || typeof payload !== "object" || !("password" in payload))
    return NextResponse.json({ error: "Некорректные данные." }, { status: 400, headers });
  if (!correctAdminPassword(payload.password)) {
    recordSecurityEvent("admin_login_rejected");
    return NextResponse.json({ error: "Неверный пароль." }, { status: 401, headers });
  }
  const token = issueAdminSession();
  recordSecurityEvent("admin_session_created");
  const response = NextResponse.json({ authenticated: true }, { headers });
  response.cookies.set({ ...adminCookieOptions, value: token.value, maxAge: token.maxAge });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Запрос отклонён." }, { status: 403, headers });
  recordSecurityEvent("admin_session_cleared");
  const response = NextResponse.json({ authenticated: false }, { headers });
  response.cookies.set({ ...adminCookieOptions, value: "", maxAge: 0 });
  return response;
}
