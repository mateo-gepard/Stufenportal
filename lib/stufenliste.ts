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
  { last: "Sajramovic", first: "Melika" },
  { last: "Basöz", first: "Baris" },
  { last: "Bastan", first: "Jla" },
  { last: "Bauer", first: "Victor" },
  { last: "Beligny", first: "Esthe" },
  { last: "Bielinski", first: "Theo" },
  { last: "Bitter", first: "Mina" },
  { last: "Boege", first: "Mio" },
  { last: "Bähme" },
  { last: "Boekel", first: "E" },
  { last: "Brückner", first: "Bastian" },
  { last: "Castiglia", first: "S" },
  { last: "Crusius", first: "Maximilian" },
  { last: "Damm", first: "Soni" },
  { last: "Cker", first: "Laur" },
  { last: "El Imam", first: "Mohamed" },
  { last: "Engel", first: "Mathilda" },
  { last: "Forkel", first: "Ebba" },
  { last: "Forster", first: "Aurelia" },
  { last: "Fröschl", first: "Annika" },
  { last: "Gallitz", first: "Leon" },
  { last: "Geishauser", first: "Simon" },
  { last: "Genc", first: "Ali" },
  { last: "Hahn", first: "Mona" },
  { last: "Hartmann", first: "Tobias" },
  { last: "Achori", first: "Ue" },
  { last: "Heinrichs", first: "Ada" },
  { last: "Herschbach", first: "Jas" },
  { last: "Heske", first: "Clara" },
  { last: "Heyde" },
  { last: "Hippert", first: "Jakob" },
  { last: "Kamber", first: "Ana-Marija" },
  { last: "Kern", first: "Greta" },
  { last: "Kessler", first: "Yannick" },
  { last: "Kzzinger", first: "Lucia" },
  { last: "Kriegel", first: "Sver" },
  { last: "Krück", first: "Lily" },
  { last: "Kubisa", first: "Maltis" },
  { last: "Lam", first: "Max" },
  { last: "Landerer", first: "Ke" },
  { last: "Lin", first: "Kai" },
  { last: "Lindner", first: "Marlene" },
  { last: "Lu", first: "Christian" },
  { last: "Lusskandl", first: "Em" },
  { last: "Mahmood", first: "Nerjes" },
  { last: "Maier", first: "Christophe" },
  { last: "Dlalduz", first: "Tmilde" },
  { last: "Issinger", first: "Corb" },
  { last: "Ru", first: "David" },
  { last: "Neagos", first: "Iulia", aliases: ["Julia Neagos"] },
  { last: "Nickel", first: "Tom" },
  { last: "Oppitz", first: "Nikola" },
  { last: "Ostmann", first: "Jonath" },
  { last: "Peerenboom", first: "Valentin" },
  { last: "Pfingstgraf" },
  { last: "Poppert", first: "Sarina" },
  { last: "Preisenberger", first: "Laurin" },
  { last: "Raison", first: "Nanouk" },
  { last: "Regler", first: "Ylv" },
  { last: "Reindell", first: "Elly" },
  { last: "Rivoli", first: "And" },
  { last: "Roch", first: "Yannick" },
  { last: "Röttinger", first: "Rosa" },
  { last: "Sarkar", first: "Raatri" },
  { last: "Sche" },
  { last: "Schmidt", first: "Alexander" },
  { last: "Schub", first: "Mathi" },
  { last: "Schulze", first: "Johanna" },
  { last: "Schwedler", first: "Alma" },
  { last: "Seitz", first: "Luzia" },
  { last: "Senf", first: "T" },
  { last: "Siebel", first: "Marietta" },
  { last: "Sondermann", first: "Martin" },
  { last: "Sparw" },
  { last: "Steinecker", first: "Ben" },
  { last: "Staal", first: "Luzia" },
  { last: "Teuber", first: "Josefine" },
  { last: "Trampler Alejo", first: "Juliana" },
  { last: "Voltsi", first: "Ioanna", aliases: ["Ioanna Voltsi"] },
  { last: "Von Willich", first: "Fah" },
  { last: "Vorderbrügge", first: "Sophie", aliases: ["Vorderbrūgge Sophie"] },
  { last: "Walch", first: "Georg" },
  { last: "Wetzel", first: "Miya" },
  { last: "Wildauer", first: "Ava" },
  { last: "William", first: "Valeni" },
  { last: "Winde", first: "Ju" },
  { last: "Zinchenko", first: "Glil" },
  { last: "Zipperling", first: "Jona" },
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

function aliasesFor(person: StufenPerson): string[] {
  const first = person.first || "";
  const last = person.last;
  const firstParts = normalizeRosterName(first).split(" ").filter((p) => p.length >= 2);
  const lastParts = normalizeRosterName(last).split(" ").filter((p) => p.length >= 2);

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

export function stufenlisteSnapshotStatements(pollId: string): { sql: string; args: InValue[] }[] {
  const createdAt = nowIso();
  const statements: { sql: string; args: InValue[] }[] = [];

  STUFENLISTE.forEach((person, ord) => {
    const entryId = newId();
    const displayName = person.first ? `${person.last}, ${person.first}` : person.last;
    const rosterKey = normalizeRosterName(`${person.last} ${person.first || ""}`) || entryId;

    statements.push({
      sql: `INSERT INTO poll_roster_entries (id, poll_id, roster_key, display_name, ord, created_at)
            VALUES (?,?,?,?,?,?)`,
      args: [entryId, pollId, rosterKey, displayName, ord, createdAt],
    });

    aliasesFor(person).forEach((alias) => {
      statements.push({
        sql: "INSERT INTO poll_roster_aliases (poll_id, entry_id, normalized_alias) VALUES (?,?,?)",
        args: [pollId, entryId, alias],
      });
    });
  });

  return statements;
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
