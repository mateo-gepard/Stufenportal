import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb, batch } from "@/lib/db";
import { requireAdmin, deviceId, voterHash } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed, str, int, oneOf } from "@/lib/util";
import { autoClose } from "@/lib/polls";
import { stufenlisteSnapshotStatements } from "@/lib/stufenliste";
import type { PollMethod } from "@/lib/types";
import type { InValue } from "@libsql/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METHODS = ["single", "approval", "ranked"] as const;

export async function GET(req: Request) {
  const db = getDb();
  const device = deviceId(req);
  const polls = await db
    .prepare("SELECT * FROM polls WHERE deleted_at IS NULL ORDER BY (status != 'open'), created_at DESC")
    .all<any>();

  const out = await Promise.all(
    polls.map(async (p) => {
      p = await autoClose(p);
      const totalRow = await db.prepare("SELECT COUNT(*) AS n FROM ballots WHERE poll_id = ?").get<{ n: number }>(p.id);
      const total = totalRow?.n ?? 0;
      let voted = false;
      if (device) {
        const col = p.anonymous ? "voter_hash" : "device_id";
        const val = p.anonymous ? voterHash(p.poll_secret, device) : device;
        voted = !!(await db.prepare(`SELECT 1 AS x FROM ballots WHERE poll_id = ? AND ${col} = ?`).get(p.id, val));
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
    })
  );
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

  const id = newId();
  const method = oneOf<PollMethod>(body.method, METHODS, "single");
  const anonymous = body.anonymous ? 1 : 0;

  const stmts: { sql: string; args: InValue[] }[] = [
    {
      sql: `INSERT INTO polls (id,question,method,anonymous,reveal,quorum,result_visibility_min,tie_break,poll_secret,closes_at,status,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?, 'open', ?)`,
      args: [
        id,
        question,
        method,
        anonymous,
        oneOf(body.reveal, ["live", "after_close"], "live"),
        int(body.quorum),
        int(body.result_visibility_min) ?? 5,
        oneOf(body.tie_break, ["runoff", "random", "earliest", "admin"], "admin"),
        crypto.randomBytes(16).toString("hex"),
        str(body.closes_at) || null,
        nowIso(),
      ],
    },
  ];
  labels.forEach((label, i) =>
    stmts.push({ sql: "INSERT INTO poll_options (id,poll_id,label,ord) VALUES (?,?,?,?)", args: [newId(), id, label, i] })
  );
  if (anonymous) stmts.push(...stufenlisteSnapshotStatements(id));

  await batch(stmts);
  return NextResponse.json({ id }, { status: 201 });
}
