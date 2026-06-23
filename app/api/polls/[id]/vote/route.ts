import { NextResponse } from "next/server";
import { getDb, tx } from "@/lib/db";
import { deviceId, voterHash, isAdmin } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed } from "@/lib/util";
import { autoClose, buildPollDetail, normalizeRankLimit, rankedMaxPriorities } from "@/lib/polls";
import { findRosterEntryForName } from "@/lib/stufenliste";

export const runtime = "nodejs";

class VoteError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

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
  // Auswahl je Methode normalisieren -> [{option_id, rank}]
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
    const vetoOption = typeof body.veto_option_id === "string" ? body.veto_option_id : "";
    const vetoEnabled = !!poll.ranked_veto_enabled;
    const maxRankLimit = rankedMaxPriorities(validOptions.size, vetoEnabled);
    const requiredRankLimit =
      normalizeRankLimit(poll.rank_limit, validOptions.size, vetoEnabled) ?? (vetoEnabled ? maxRankLimit : null);
    if (uniq.length < 1 || uniq.some((o) => !validOptions.has(o)))
      return NextResponse.json({ error: "Ungültige Reihenfolge." }, { status: 400 });
    if (uniq.length > maxRankLimit) {
      return NextResponse.json({ error: `Bitte maximal ${maxRankLimit} Prioritäten setzen.` }, { status: 400 });
    }
    if (requiredRankLimit !== null && uniq.length !== requiredRankLimit) {
      return NextResponse.json(
        { error: `Bitte genau ${requiredRankLimit} ${requiredRankLimit === 1 ? "Priorität" : "Prioritäten"} setzen.` },
        { status: 400 }
      );
    }
    items = uniq.map((o, i) => ({ option_id: o, rank: i + 1 }));
    if (vetoEnabled) {
      if (!validOptions.has(vetoOption)) {
        return NextResponse.json({ error: "Bitte ein Veto wählen." }, { status: 400 });
      }
      if (uniq.includes(vetoOption)) {
        return NextResponse.json({ error: "Veto darf nicht gleichzeitig priorisiert sein." }, { status: 400 });
      }
      items.push({ option_id: vetoOption, rank: 0 });
    }
  }

  const ballotId = newId();
  const anon = !!poll.anonymous;
  const voterName = trimmed(body.voter_name);
  let submitted = false;

  try {
    await tx(async (t) => {
      let rosterEntryId: string | null = null;
      if (anon) {
        const match = await findRosterEntryForName(t, poll.id, voterName);
        if (!match.ok) {
          if (match.reason === "missing") throw new VoteError("Bitte gib deinen Namen zur Prüfung ein.");
          if (match.reason === "ambiguous") {
            throw new VoteError("Name ist nicht eindeutig. Bitte Vor- und Nachname eingeben.");
          }
          throw new VoteError("Name ist nicht auf der Stufenliste.");
        }
        if (match.used) throw new VoteError("Mit diesem Namen wurde schon abgestimmt.", 409);
        rosterEntryId = match.entryId;
      }

      const now = nowIso();
      await t.execute({
        sql: "INSERT INTO ballots (id,poll_id,device_id,voter_hash,created_at) VALUES (?,?,?,?,?)",
        args: [
          ballotId,
          poll.id,
          anon ? null : device,
          anon && rosterEntryId ? voterHash(poll.poll_secret, `roster:${rosterEntryId}`) : null,
          now,
        ],
      });

      for (const it of items) {
        await t.execute({
          sql: "INSERT INTO vote_items (id,ballot_id,option_id,rank) VALUES (?,?,?,?)",
          args: [newId(), ballotId, it.option_id, it.rank],
        });
      }

      if (anon && rosterEntryId) {
        const update = await t.execute({
          sql: "UPDATE poll_roster_entries SET used_at = ?, ballot_id = ? WHERE id = ? AND poll_id = ? AND used_at IS NULL",
          args: [now, ballotId, rosterEntryId, poll.id],
        });
        if (update.rowsAffected === 0) throw new VoteError("Mit diesem Namen wurde schon abgestimmt.", 409);
      }
    });
    submitted = true;
  } catch (err: unknown) {
    if (err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = String((err as Error).message || "");
    if (/UNIQUE|constraint/i.test(msg)) {
      return NextResponse.json({ error: "Du hast schon abgestimmt." }, { status: 409 });
    }
    throw err;
  }

  const detail = await buildPollDetail(poll, device, isAdmin());
  return NextResponse.json({ poll: { ...detail, voted: submitted, my_choice: items } }, { status: 201 });
}
