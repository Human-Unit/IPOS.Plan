import { NextRequest, NextResponse } from "next/server";
import {
  adminCookieOptions, correctAdminPassword, isAdmin,
  isAdminConfigured, issueAdminSession, sameOrigin,
} from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  return NextResponse.json({ authenticated: await isAdmin(), configured: isAdminConfigured() }, { headers });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Запрос отклонён." }, { status: 403, headers });
  if (!isAdminConfigured()) return NextResponse.json({ error: "Вход администратора пока не настроен." }, { status: 503, headers });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    return NextResponse.json({ error: "Ожидается JSON." }, { status: 415, headers });
  if (Number(request.headers.get("content-length") || 0) > 1000)
    return NextResponse.json({ error: "Недопустимый размер запроса." }, { status: 413, headers });
  let password: unknown;
  try {
    const payload = await request.json();
    password = payload?.password;
  } catch {
    return NextResponse.json({ error: "Некорректные данные." }, { status: 400, headers });
  }
  if (!correctAdminPassword(password))
    return NextResponse.json({ error: "Неверный пароль." }, { status: 401, headers });
  const token = issueAdminSession();
  const response = NextResponse.json({ authenticated: true }, { headers });
  response.cookies.set({ ...adminCookieOptions, value: token.value, maxAge: token.maxAge });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Запрос отклонён." }, { status: 403, headers });
  const response = NextResponse.json({ authenticated: false }, { headers });
  response.cookies.set({ ...adminCookieOptions, value: "", maxAge: 0 });
  return response;
}
