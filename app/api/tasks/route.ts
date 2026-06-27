import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getMyTasks } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });

  return NextResponse.json(await getMyTasks(user), { headers: { "Cache-Control": "no-store, max-age=0" } });
}
