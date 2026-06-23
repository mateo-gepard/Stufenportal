import type Database from "better-sqlite3";
import { voterHash } from "./auth";
import type { PollDetail, PollResultRow } from "./types";

interface PollRow {
  id: string;
  question: string;
  method: "single" | "approval" | "ranked";
  anonymous: number;
  reveal: "live" | "after_close";
  quorum: number | null;
  result_visibility_min: number;
  poll_secret: string;
  closes_at: string | null;
  status: "open" | "closed" | "invalid";
}

/** Schließt offene Polls, deren Frist abgelaufen ist (serverseitig erzwungen). */
export function autoClose(db: Database.Database, p: PollRow): PollRow {
  if (p.status === "open" && p.closes_at && new Date(p.closes_at).getTime() < Date.now()) {
    const quorumOk = p.quorum == null || ballotCount(db, p.id) >= p.quorum;
    const next = quorumOk ? "closed" : "invalid";
    db.prepare("UPDATE polls SET status = ? WHERE id = ?").run(next, p.id);
    return { ...p, status: next };
  }
  return p;
}

function ballotCount(db: Database.Database, pollId: string): number {
  return (
    db.prepare("SELECT COUNT(*) AS n FROM ballots WHERE poll_id = ?").get(pollId) as { n: number }
  ).n;
}

export function buildPollDetail(
  db: Database.Database,
  poll: PollRow,
  device: string | null,
  isAdmin: boolean
): PollDetail {
  const p = autoClose(db, poll);
  const options = db
    .prepare("SELECT id, label, ord FROM poll_options WHERE poll_id = ? ORDER BY ord")
    .all(p.id) as { id: string; label: string; ord: number }[];

  const total = ballotCount(db, p.id);

  // Hat dieses Gerät bereits abgestimmt?
  let myBallotId: string | null = null;
  if (device) {
    const key = p.anonymous ? { col: "voter_hash", val: voterHash(p.poll_secret, device) } : { col: "device_id", val: device };
    const row = db
      .prepare(`SELECT id FROM ballots WHERE poll_id = ? AND ${key.col} = ?`)
      .get(p.id, key.val) as { id: string } | undefined;
    myBallotId = row?.id ?? null;
  }
  const myChoice = myBallotId
    ? (db
        .prepare("SELECT option_id, rank FROM vote_items WHERE ballot_id = ?")
        .all(myBallotId) as { option_id: string; rank: number | null }[])
    : [];

  // Ergebnis-Sichtbarkeit
  let results: PollResultRow[] | null = null;
  let hiddenReason: string | null = null;
  const closed = p.status !== "open";

  if (p.anonymous && total < p.result_visibility_min) {
    hiddenReason = `Noch zu wenige Stimmen (mind. ${p.result_visibility_min}), um anonym auszuwerten.`;
  } else if (p.reveal === "after_close" && !closed && !isAdmin) {
    hiddenReason = "Ergebnis wird erst nach Schluss gezeigt.";
  } else {
    results = computeResults(db, p, options, total);
  }

  return {
    id: p.id,
    question: p.question,
    method: p.method,
    anonymous: !!p.anonymous,
    reveal: p.reveal,
    status: p.status,
    closes_at: p.closes_at,
    quorum: p.quorum,
    result_visibility_min: p.result_visibility_min,
    options,
    total_ballots: total,
    voted: !!myBallotId,
    my_choice: myChoice,
    results,
    results_hidden_reason: hiddenReason,
  };
}

function computeResults(
  db: Database.Database,
  p: PollRow,
  options: { id: string; label: string }[],
  total: number
): PollResultRow[] {
  const values = new Map<string, number>();
  options.forEach((o) => values.set(o.id, 0));

  if (p.method === "single" || p.method === "approval") {
    const rows = db
      .prepare(
        `SELECT vi.option_id AS option_id, COUNT(*) AS n
         FROM vote_items vi JOIN ballots b ON b.id = vi.ballot_id
         WHERE b.poll_id = ? GROUP BY vi.option_id`
      )
      .all(p.id) as { option_id: string; n: number }[];
    rows.forEach((r) => values.set(r.option_id, r.n));
  } else {
    // Ranked → Borda: je Stimmzettel mit K Rängen gibt Rang r → (K - r + 1) Punkte.
    const ballots = db
      .prepare("SELECT id FROM ballots WHERE poll_id = ?")
      .all(p.id) as { id: string }[];
    for (const b of ballots) {
      const items = db
        .prepare("SELECT option_id, rank FROM vote_items WHERE ballot_id = ? ORDER BY rank")
        .all(b.id) as { option_id: string; rank: number | null }[];
      const k = items.length;
      items.forEach((it) => {
        const r = it.rank ?? k;
        values.set(it.option_id, (values.get(it.option_id) || 0) + (k - r + 1));
      });
    }
  }

  const sum = Array.from(values.values()).reduce((a, b) => a + b, 0);
  const denom = p.method === "ranked" ? sum || 1 : total || 1;

  return options
    .map((o) => {
      const value = values.get(o.id) || 0;
      return {
        option_id: o.id,
        label: o.label,
        value,
        pct: Math.round((value / denom) * 100),
      };
    })
    .sort((a, b) => b.value - a.value);
}
