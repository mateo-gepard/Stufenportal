import { NextResponse } from "next/server";
import { generatePassword, hashPassword, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { nowIso, readJson, trimmed } from "@/lib/util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const userId = trimmed(body.user_id);
  if (!userId) return NextResponse.json({ error: "Account fehlt." }, { status: 400 });

  const user = await getDb().prepare("SELECT id, display_name FROM users WHERE id = ?").get<{ id: string; display_name: string }>(userId);
  if (!user) return NextResponse.json({ error: "Account unbekannt." }, { status: 404 });

  const password = generatePassword();
  await getDb()
    .prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
    .run(hashPassword(password), nowIso(), user.id);

  return NextResponse.json({ user_id: user.id, display_name: user.display_name, password });
}
