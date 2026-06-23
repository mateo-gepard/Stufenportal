import { NextResponse } from "next/server";
import { getDb, batch } from "@/lib/db";
import { deviceId, voterHash, isAdmin } from "@/lib/auth";
import { newId, nowIso, readJson } from "@/lib/util";
import { autoClose, buildPollDetail } from "@/lib/polls";
import type { InValue } from "@libsql/client";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const device = deviceId(req);
  if (!device) return NextResponse.json({ error: "Keine Geräte-ID." }, { status: 400 });

  const db = getDb();
  let poll = await db.prepare("SELECT * FROM polls WHERE id = ? AND deleted_at IS NULL").get<any>(params.id);
  if (!poll) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  poll = await autoClose(poll);
  if (poll.status !== "open") {
    return NextResponse.json({ error: "Abstimmung ist geschlossen." }, { status: 409 });
  }

  const optRows = await db.prepare("SELECT id FROM poll_options WHERE poll_id = ?").all<{ id: string }>(poll.id);
  const validOptions = new Set(optRows.map((o) => o.id));

  const body = await readJson(req);
  // Auswahl je Methode normalisieren → [{option_id, rank}]
  let items: { option_id: string; rank: number | null }[] = [];
  if (poll.method === "single") {
    const opt = typeof body.option_id === "string" ? body.option_id : "";
    if (!validOptions.has(opt)) return NextResponse.json({ error: "Ungültige Option." }, { status: 400 });
    items = [{ option_id: opt, rank: null }];
  } else if (poll.method === "approval") {
    const opts = Array.isArray(body.option_ids) ? body.option_ids.filter((o: unknown) => typeof o === "string") : [];
    const uniq = Array.from(new Set(opts)) as string[];
    if (uniq.length < 1 || uniq.some((o) => !validOptions.has(o)))
      return NextResponse.json({ error: "Ungültige Auswahl." }, { status: 400 });
    items = uniq.map((o) => ({ option_id: o, rank: null }));
  } else {
    const ranking = Array.isArray(body.ranking) ? body.ranking.filter((o: unknown) => typeof o === "string") : [];
    const uniq = Array.from(new Set(ranking)) as string[];
    if (uniq.length < 1 || uniq.some((o) => !validOptions.has(o)))
      return NextResponse.json({ error: "Ungültige Reihenfolge." }, { status: 400 });
    items = uniq.map((o, i) => ({ option_id: o, rank: i + 1 }));
  }

  const ballotId = newId();
  const anon = !!poll.anonymous;
  const stmts: { sql: string; args: InValue[] }[] = [
    {
      sql: "INSERT INTO ballots (id,poll_id,device_id,voter_hash,created_at) VALUES (?,?,?,?,?)",
      args: [ballotId, poll.id, anon ? null : device, anon ? voterHash(poll.poll_secret, device) : null, nowIso()],
    },
    ...items.map((it) => ({
      sql: "INSERT INTO vote_items (id,ballot_id,option_id,rank) VALUES (?,?,?,?)",
      args: [newId(), ballotId, it.option_id, it.rank] as InValue[],
    })),
  ];

  try {
    await batch(stmts);
  } catch (err: unknown) {
    const msg = String((err as Error).message || "");
    if (/UNIQUE|constraint/i.test(msg)) {
      return NextResponse.json({ error: "Du hast schon abgestimmt." }, { status: 409 });
    }
    throw err;
  }

  const detail = await buildPollDetail(poll, device, isAdmin());
  return NextResponse.json({ poll: detail }, { status: 201 });
}
