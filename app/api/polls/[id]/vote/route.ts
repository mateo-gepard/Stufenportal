import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deviceId, voterHash, isAdmin } from "@/lib/auth";
import { newId, nowIso, readJson } from "@/lib/util";
import { autoClose, buildPollDetail } from "@/lib/polls";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const device = deviceId(req);
  if (!device) return NextResponse.json({ error: "Keine Geräte-ID." }, { status: 400 });

  const db = getDb();
  let poll = db.prepare("SELECT * FROM polls WHERE id = ? AND deleted_at IS NULL").get(params.id) as any;
  if (!poll) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  poll = autoClose(db, poll);
  if (poll.status !== "open") {
    return NextResponse.json({ error: "Abstimmung ist geschlossen." }, { status: 409 });
  }

  const validOptions = new Set(
    (db.prepare("SELECT id FROM poll_options WHERE poll_id = ?").all(poll.id) as { id: string }[]).map((o) => o.id)
  );

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
    // ranked
    const ranking = Array.isArray(body.ranking) ? body.ranking.filter((o: unknown) => typeof o === "string") : [];
    const uniq = Array.from(new Set(ranking)) as string[];
    if (uniq.length < 1 || uniq.some((o) => !validOptions.has(o)))
      return NextResponse.json({ error: "Ungültige Reihenfolge." }, { status: 400 });
    items = uniq.map((o, i) => ({ option_id: o, rank: i + 1 }));
  }

  const ballotId = newId();
  const anon = !!poll.anonymous;
  try {
    const tx = db.transaction(() => {
      db.prepare(
        "INSERT INTO ballots (id,poll_id,device_id,voter_hash,created_at) VALUES (?,?,?,?,?)"
      ).run(ballotId, poll.id, anon ? null : device, anon ? voterHash(poll.poll_secret, device) : null, nowIso());
      const ins = db.prepare("INSERT INTO vote_items (id,ballot_id,option_id,rank) VALUES (?,?,?,?)");
      items.forEach((it) => ins.run(newId(), ballotId, it.option_id, it.rank));
    });
    tx();
  } catch (err: unknown) {
    if (String((err as Error).message).includes("UNIQUE")) {
      return NextResponse.json({ error: "Du hast schon abgestimmt." }, { status: 409 });
    }
    throw err;
  }

  const detail = buildPollDetail(db, poll, device, isAdmin());
  return NextResponse.json({ poll: detail }, { status: 201 });
}
