import { NextResponse } from "next/server";
import { adminToken, checkAdminCode, ADMIN_COOKIE } from "@/lib/auth";
import { readJson, str } from "@/lib/util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!checkAdminCode(str(body.code))) {
    return NextResponse.json({ error: "Falscher Code." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
