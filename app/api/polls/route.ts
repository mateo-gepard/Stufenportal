import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { requireAdmin, deviceId, voterHash } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed, str, int, oneOf } from "@/lib/util";
import { autoClose } from "@/lib/polls";
import type { PollMethod } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METHODS = ["single", "approval", "ranked"] as const;

export async function GET(req: Request) {
  const db = getDb();
  const device = deviceId(req);
  const polls = db
    .prepare("SELECT * FROM polls WHERE deleted_at IS NULL ORDER BY (status != 'open'), created_at DESC")
    .all() as any[];

  const out = polls.map((p) => {
    autoClose(db, p);
    const total = (db.prepare("SELECT COUNT(*) AS n FROM ballots WHERE poll_id = ?").get(p.id) as { n: number }).n;
    let voted = false;
    if (device) {
      const col = p.anonymous ? "voter_hash" : "device_id";
      const val = p.anonymous ? voterHash(p.poll_secret, device) : device;
      voted = !!db.prepare(`SELECT 1 FROM ballots WHERE poll_id = ? AND ${col} = ?`).get(p.id, val);
    }
    return {
      id: p.id,
      question: p.question,
      method: p.method as PollMethod,
      anonymous: !!p.anonymous,
      status: p.status,
      closes_at: p.closes_at,
      total_ballots: total,
      voted,
    };
  });
  return NextResponse.json({ polls: out });
}

export async function POST(req: Request) {
  const forbidden = requireAdmin();
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const question = trimmed(body.question);
  if (!question) return NextResponse.json({ error: "Frage fehlt." }, { status: 400 });

  const rawOptions = Array.isArray(body.options) ? body.options : [];
  const labels = rawOptions.map((o) => trimmed(o)).filter(Boolean);
  if (labels.length < 2) return NextResponse.json({ error: "Mindestens 2 Optionen." }, { status: 400 });

  const db = getDb();
  const id = newId();
  const method = oneOf<PollMethod>(body.method, METHODS, "single");

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO polls (id,question,method,anonymous,reveal,quorum,result_visibility_min,tie_break,poll_secret,closes_at,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?, 'open', ?)`
    ).run(
      id,
      question,
      method,
      body.anonymous ? 1 : 0,
      oneOf(body.reveal, ["live", "after_close"], "live"),
      int(body.quorum),
      int(body.result_visibility_min) ?? 5,
      oneOf(body.tie_break, ["runoff", "random", "earliest", "admin"], "admin"),
      crypto.randomBytes(16).toString("hex"),
      str(body.closes_at) || null,
      nowIso()
    );
    labels.forEach((label, i) =>
      db.prepare("INSERT INTO poll_options (id,poll_id,label,ord) VALUES (?,?,?,?)").run(newId(), id, label, i)
    );
  });
  tx();

  return NextResponse.json({ id }, { status: 201 });
}
