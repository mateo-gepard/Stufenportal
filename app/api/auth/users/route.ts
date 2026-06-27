import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const users = await getDb()
    .prepare("SELECT roster_key, display_name, sort_name FROM users ORDER BY sort_name")
    .all<{ roster_key: string; display_name: string; sort_name: string }>();
  return NextResponse.json({ users });
}
