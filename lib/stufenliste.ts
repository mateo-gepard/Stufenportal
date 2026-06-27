import type { InValue, Transaction } from "@libsql/client";
import { newId, nowIso } from "./util";

interface StufenPerson {
  last: string;
  first?: string;
  aliases?: string[];
}

// Server-seitige Stufenliste fuer anonyme Abstimmungen. Die Liste wird beim
// Erstellen einer anonymen Abstimmung in eine eigene Poll-Liste kopiert.
const STUFENLISTE: StufenPerson[] = [
  { last: "Bajramovic", first: "Melika", aliases: ["Sajramovic Melika"] },
  { last: "Basöz", first: "Baris" },
  { last: "Bastian", first: "Julia", aliases: ["Bastan Julia"] },
  { last: "Bauer", first: "Victor" },
  { last: "Beligny", first: "Esther" },
  { last: "Bielinski", first: "Theo" },
  { last: "Bitter", first: "Mina" },
  { last: "Boege", first: "Mio" },
  { last: "Böhme", first: "Livia", aliases: ["Boehme Livia", "Bähme"] },
  { last: "Boekel", first: "Emilia" },
  { last: "Brückner", first: "Bastian" },
  { last: "Castiglia", first: "Samuele" },
  { last: "Crusius", first: "Maximilian" },
  { last: "Damm", first: "Sonia" },
  { last: "Decker", first: "Laura" },
  { last: "El Imam", first: "Mohamed" },
  { last: "Engel", first: "Mathilda" },
  { last: "Forkel", first: "Ebba" },
  { last: "Forster", first: "Aurelia" },
  { last: "Fröschl", first: "Annika" },
  { last: "Gallitz", first: "Leon" },
  { last: "Geishauser", first: "Simon" },
  { last: "Genc", first: "Ali", aliases: ["Genc All", "All Genc"] },
  { last: "Hahn", first: "Mona" },
  { last: "Hartmann", first: "Tobias" },
  { last: "Hashemi", first: "Shams" },
  { last: "Hattig", first: "Carlotta" },
  { last: "Heinrichs", first: "Ada" },
  { last: "Herschbach", first: "Jasper" },
  { last: "Heske", first: "Clara" },
  { last: "Heydenreich", first: "Lorenz" },
  { last: "Hippert", first: "Jakob" },
  { last: "Kamber", first: "Ana-Marija" },
  { last: "Kern", first: "Greta" },
  { last: "Kessler", first: "Yannick" },
  { last: "Kitzinger", first: "Lucia" },
  { last: "Kriegel", first: "Sven" },
  { last: "Krück", first: "Lily" },
  { last: "Kubisa", first: "Mattis", aliases: ["Kubisa Maltis"] },
  { last: "Lam", first: "Max" },
  { last: "Landerer", first: "Keanu" },
  { last: "Lin", first: "Kai" },
  { last: "Lindner", first: "Marlene" },
  { last: "Liu", first: "Christian" },
  { last: "Lusskandi", first: "Emma", aliases: ["Lusskandl Emma"] },
  { last: "Mahmood", first: "Nerjes" },
  { last: "Maier", first: "Christophe" },
  { last: "Mamaladze", first: "Mateo" },
  { last: "Massinger", first: "Corbinian", aliases: ["Issinger Corbinian"] },
  { last: "Militaru", first: "David" },
  { last: "Neagos", first: "Iulia", aliases: ["Julia Neagos", "Lulia Neagos", "Neagos Lulia"] },
  { last: "Nickel", first: "Tom" },
  { last: "Oppitz", first: "Nikolas" },
  { last: "Ostmann", first: "Jonathan" },
  { last: "Ould El Moustapha", first: "Ahmed" },
  { last: "Peerenboom", first: "Valentin" },
  { last: "Pfingstgraf", first: "Olivia" },
  { last: "Poppert", first: "Sarina" },
  { last: "Preisenberger", first: "Laurin" },
  { last: "Raison", first: "Nanouk" },
  { last: "Regler", first: "Ylva" },
  { last: "Reindell", first: "Elly" },
  { last: "Rivoli", first: "Andrea" },
  { last: "Roch", first: "Yannick" },
  { last: "Röttinger", first: "Rosa" },
  { last: "Sarkar", first: "Raatri" },
  { last: "Scheible", first: "Nikolai" },
  { last: "Schmidt", first: "Alexander" },
  { last: "Schub", first: "Mathilda" },
  { last: "Schulze", first: "Johanna" },
  { last: "Schwedler", first: "Alma" },
  { last: "Seitz", first: "Luzia" },
  { last: "Senf", first: "Tilman" },
  { last: "Siebel", first: "Marietta" },
  { last: "Sondermann", first: "Martin" },
  { last: "Sparwasser", first: "Janek" },
  { last: "Steinecker", first: "Ben" },
  { last: "Steininger", first: "Louie" },
  { last: "Stendahl", first: "Simon" },
  { last: "Straßmair", first: "Luzia", aliases: ["Strassmair Luzia"] },
  { last: "Teuber", first: "Josefine" },
  { last: "Trampler Alejo", first: "Juliana" },
  { last: "Umlauf", first: "Cuan" },
  { last: "Vettoretti", first: "Matilda" },
  { last: "Voltsi", first: "Ioanna", aliases: ["Ioanna Voltsi", "Loanna Voltsi", "Voltsi Loanna"] },
  { last: "von Willich", first: "Fabiola", aliases: ["von Willich Fabiola von", "Fabiola von Willich"] },
  { last: "Vorderbrügge", first: "Sophie", aliases: ["Vorderbrūgge Sophie"] },
  { last: "Walch", first: "Georg" },
  { last: "Wernecke", first: "Nick" },
  { last: "Wetzel", first: "Miya" },
  { last: "Wildauer", first: "Ava" },
  { last: "William", first: "Valentin" },
  { last: "Wind", first: "William" },
  { last: "Winde", first: "Justus" },
  { last: "Witte", first: "Meline" },
  { last: "Yesiloglu", first: "Mahir", aliases: ["Yeşiloğlu Mahir"] },
  { last: "Zimmermann", first: "Elias" },
  { last: "Zinchenko", first: "Glib" },
  { last: "Zipperling", first: "Jonas" },
];

export function normalizeRosterName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeRosterName).filter((v) => v.length >= 2)));
}

const NAME_PARTICLES = new Set(["de", "del", "den", "der", "el", "van", "von"]);

interface RosterSnapshotEntry {
  rosterKey: string;
  displayName: string;
  aliases: string[];
  ord: number;
}

function aliasesFor(person: StufenPerson): string[] {
  const first = person.first || "";
  const last = person.last;
  const firstParts = normalizeRosterName(first).split(" ").filter((p) => p.length >= 2);
  const lastParts = normalizeRosterName(last)
    .split(" ")
    .filter((p) => p.length >= 2 && !NAME_PARTICLES.has(p));

  return unique([
    last,
    first,
    `${first} ${last}`,
    `${last} ${first}`,
    ...firstParts,
    ...lastParts,
    ...(person.aliases || []),
  ]);
}

function rosterEntries(): RosterSnapshotEntry[] {
  return STUFENLISTE.map((person, ord) => {
    const displayName = person.first ? `${person.last}, ${person.first}` : person.last;
    return {
      rosterKey: normalizeRosterName(`${person.last} ${person.first || ""}`),
      displayName,
      aliases: aliasesFor(person),
      ord,
    };
  });
}

export function stufenlisteSnapshotStatements(pollId: string): { sql: string; args: InValue[] }[] {
  const createdAt = nowIso();
  const statements: { sql: string; args: InValue[] }[] = [];

  rosterEntries().forEach((person) => {
    const entryId = newId();
    const rosterKey = person.rosterKey || entryId;

    statements.push({
      sql: `INSERT INTO poll_roster_entries (id, poll_id, roster_key, display_name, ord, created_at)
            VALUES (?,?,?,?,?,?)`,
      args: [entryId, pollId, rosterKey, person.displayName, person.ord, createdAt],
    });

    person.aliases.forEach((alias) => {
      statements.push({
        sql: "INSERT INTO poll_roster_aliases (poll_id, entry_id, normalized_alias) VALUES (?,?,?)",
        args: [pollId, entryId, alias],
      });
    });
  });

  return statements;
}

async function reusableEntryIdForAliases(t: Transaction, pollId: string, aliases: string[]): Promise<string | null> {
  if (aliases.length === 0) return null;
  const placeholders = aliases.map(() => "?").join(",");
  const result = await t.execute({
    sql: `SELECT DISTINCT entry_id
          FROM poll_roster_aliases
          WHERE poll_id = ? AND normalized_alias IN (${placeholders})`,
    args: [pollId, ...aliases],
  });
  const ids = Array.from(new Set(result.rows.map((row) => String(row.entry_id))));
  return ids.length === 1 ? ids[0] : null;
}

export async function syncStufenlisteForPoll(t: Transaction, pollId: string): Promise<void> {
  const createdAt = nowIso();
  const existing = await t.execute({
    sql: "SELECT id, roster_key FROM poll_roster_entries WHERE poll_id = ?",
    args: [pollId],
  });
  const byKey = new Map<string, string>();
  existing.rows.forEach((row) => byKey.set(String(row.roster_key), String(row.id)));

  const active: { entryId: string; aliases: string[] }[] = [];
  const activeIds = new Set<string>();

  for (const person of rosterEntries()) {
    let entryId = byKey.get(person.rosterKey) ?? null;

    if (!entryId) {
      const reusable = await reusableEntryIdForAliases(t, pollId, person.aliases);
      if (reusable && !activeIds.has(reusable)) {
        entryId = reusable;
        await t.execute({
          sql: "UPDATE poll_roster_entries SET roster_key = ?, display_name = ?, ord = ? WHERE id = ? AND poll_id = ?",
          args: [person.rosterKey, person.displayName, person.ord, entryId, pollId],
        });
      }
    }

    if (!entryId) {
      entryId = newId();
      await t.execute({
        sql: `INSERT INTO poll_roster_entries (id, poll_id, roster_key, display_name, ord, created_at)
              VALUES (?,?,?,?,?,?)`,
        args: [entryId, pollId, person.rosterKey, person.displayName, person.ord, createdAt],
      });
    } else {
      await t.execute({
        sql: "UPDATE poll_roster_entries SET display_name = ?, ord = ? WHERE id = ? AND poll_id = ?",
        args: [person.displayName, person.ord, entryId, pollId],
      });
    }

    active.push({ entryId, aliases: person.aliases });
    activeIds.add(entryId);
  }

  await t.execute({ sql: "DELETE FROM poll_roster_aliases WHERE poll_id = ?", args: [pollId] });
  for (const entry of active) {
    for (const alias of entry.aliases) {
      await t.execute({
        sql: "INSERT INTO poll_roster_aliases (poll_id, entry_id, normalized_alias) VALUES (?,?,?)",
        args: [pollId, entry.entryId, alias],
      });
    }
  }
}

export async function findRosterEntryForName(
  t: Transaction,
  pollId: string,
  rawName: string
): Promise<
  | { ok: true; entryId: string; used: boolean }
  | { ok: false; reason: "missing" | "unknown" | "ambiguous" }
> {
  const normalized = normalizeRosterName(rawName);
  if (!normalized) return { ok: false, reason: "missing" };

  await syncStufenlisteForPoll(t, pollId);

  const result = await t.execute({
    sql: `SELECT e.id AS id, e.used_at AS used_at
          FROM poll_roster_aliases a
          JOIN poll_roster_entries e ON e.id = a.entry_id
          WHERE a.poll_id = ? AND a.normalized_alias = ?`,
    args: [pollId, normalized],
  });

  const byId = new Map<string, boolean>();
  result.rows.forEach((row) => byId.set(String(row.id), row.used_at != null));

  if (byId.size === 0) return { ok: false, reason: "unknown" };
  if (byId.size > 1) return { ok: false, reason: "ambiguous" };

  const [[entryId, used]] = Array.from(byId.entries());
  return { ok: true, entryId, used };
}
