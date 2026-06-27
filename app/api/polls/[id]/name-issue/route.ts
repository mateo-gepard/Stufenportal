import { NextResponse } from "next/server";
import { getDb, tx } from "@/lib/db";
import { deviceId } from "@/lib/auth";
import { newId, nowIso, readJson, trimmed } from "@/lib/util";
import { findRosterEntryForName, normalizeRosterName } from "@/lib/stufenliste";

export const runtime = "nodejs";

class NameIssueError extends Error {
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
  const poll = await db
    .prepare("SELECT id, anonymous FROM polls WHERE id = ? AND deleted_at IS NULL")
    .get<{ id: string; anonymous: number }>(params.id);
  if (!poll) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  if (!poll.anonymous) return NextResponse.json({ error: "Nur bei anonymen Abstimmungen." }, { status: 400 });

  const body = await readJson(req);
  const voterName = trimmed(body.voter_name).slice(0, 100);
  const normalized = normalizeRosterName(voterName);
  if (!normalized) return NextResponse.json({ error: "Name fehlt." }, { status: 400 });

  try {
    await tx(async (t) => {
      const match = await findRosterEntryForName(t, params.id, voterName);
      if (!match.ok) {
        if (match.reason === "ambiguous") {
          throw new NameIssueError("Name ist nicht eindeutig. Bitte Vor- und Nachname eingeben.");
        }
        throw new NameIssueError(match.reason === "missing" ? "Name fehlt." : "Name ist nicht auf der Stufenliste.");
      }

      await t.execute({
        sql: `INSERT INTO anonymous_vote_name_flags
              (id, poll_id, device_id, voter_name, normalized_name, status, created_at)
              VALUES (?,?,?,?,?, 'open', ?)
              ON CONFLICT(poll_id, device_id, normalized_name)
              DO UPDATE SET voter_name = excluded.voter_name, status = 'open', resolved_at = NULL, created_at = excluded.created_at`,
        args: [newId(), params.id, device, voterName, normalized, nowIso()],
      });
    });
  } catch (err) {
    if (err instanceof NameIssueError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
