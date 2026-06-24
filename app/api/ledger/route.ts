import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, isAdmin } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed, int, oneOf } from "@/lib/util";
import type { EventGoal } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const admin = isAdmin();
  const rows = await db
    .prepare(
      "SELECT id,kind,amount,description,category,occurred_at,paid_by FROM ledger WHERE deleted_at IS NULL ORDER BY occurred_at DESC, created_at DESC"
    )
    .all<{
      id: string;
      kind: "income" | "expense";
      amount: number;
      description: string;
      category: string;
      occurred_at: string;
      paid_by: string | null;
    }>();

  // Harte Grenze: paid_by nur für Admin/Kassenwart. Sonst entfernen (nicht nur im UI).
  const entries = rows.map((r) => ({ ...r, paid_by: admin ? r.paid_by : null }));

  const income = rows.filter((r) => r.kind === "income").reduce((a, b) => a + b.amount, 0);
  const expense = rows.filter((r) => r.kind === "expense").reduce((a, b) => a + b.amount, 0);
  const eventGoals = await db
    .prepare(
      `SELECT id, title, status, start_at, money_goal_cents, money_goal_note
       FROM events
       WHERE deleted_at IS NULL
         AND status NOT IN ('done','cancelled')
         AND money_goal_cents IS NOT NULL
         AND money_goal_cents > 0
       ORDER BY (start_at IS NULL), start_at ASC, created_at DESC`
    )
    .all<EventGoal>();
  const eventGoalTotal = eventGoals.reduce((sum, goal) => sum + goal.money_goal_cents, 0);

  return NextResponse.json({ entries, balance: income - expense, income, expense, event_goal_total: eventGoalTotal, event_goals: eventGoals });
}

export async function POST(req: Request) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const kind = oneOf(body.kind, ["income", "expense"], "income");
  const amount = int(body.amount); // Cent
  const description = trimmed(body.description);
  if (amount == null || amount <= 0) return NextResponse.json({ error: "Betrag fehlt." }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Beschreibung fehlt." }, { status: 400 });

  const db = getDb();
  const id = newId();
  await db.prepare(
    "INSERT INTO ledger (id,kind,amount,description,category,occurred_at,paid_by,created_at) VALUES (?,?,?,?,?,?,?,?)"
  ).run(
    id,
    kind,
    amount,
    description,
    trimmed(body.category) || "Allgemein",
    trimmed(body.occurred_at) || nowIso(),
    trimmed(body.paid_by) || null,
    nowIso()
  );
  return NextResponse.json({ id }, { status: 201 });
}
