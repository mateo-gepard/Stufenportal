import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { nowIso } from "@/lib/util";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  await getDb().prepare("UPDATE ledger SET deleted_at = ? WHERE id = ?").run(nowIso(), params.id);
  return NextResponse.json({ ok: true });
}
