import { createClient } from "@libsql/client";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ROTATE = process.argv.includes("--rotate");
const OUT = path.join(ROOT, "data", "account-passwords.csv");
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_SPEAKER_NAMES = [
  "Boege, Mio",
  "Seitz, Luzia",
  "Hattig, Carlotta",
  "Siebel, Marietta",
  "Kriegel, Sven",
  "Zimmermann, Elias",
  "Pfingstgraf, Olivia",
];

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function normalizeRosterName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function unique(values) {
  return Array.from(new Set(values.map(normalizeRosterName).filter((v) => v.length >= 2)));
}

const NAME_PARTICLES = new Set(["de", "del", "den", "der", "el", "van", "von"]);

function aliasesFor(person) {
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

function roster() {
  const source = fs.readFileSync(path.join(ROOT, "lib", "stufenliste.ts"), "utf8");
  const match = source.match(/const STUFENLISTE: StufenPerson\[] = (\[[\s\S]*?\n\]);/);
  if (!match) throw new Error("Konnte STUFENLISTE nicht aus lib/stufenliste.ts lesen.");
  const people = Function(`"use strict"; return (${match[1]});`)();
  return people.map((person, ord) => {
    const first = person.first || "";
    return {
      roster_key: normalizeRosterName(`${person.last} ${first}`),
      display_name: first ? `${first} ${person.last}` : person.last,
      sort_name: first ? `${person.last}, ${first}` : person.last,
      aliases: aliasesFor(person),
      ord,
    };
  });
}

function password() {
  let out = "";
  for (let i = 0; i < 6; i += 1) out += PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)];
  return out;
}

function hashPassword(value) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(value, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function voterHash(pollSecret, subject) {
  return crypto.createHmac("sha256", pollSecret).update(subject).digest("hex");
}

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function createDb() {
  const url = process.env.TURSO_DATABASE_URL || "file:./data/stufenportal.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url.startsWith("file:")) {
    fs.mkdirSync(path.dirname(path.join(ROOT, url.slice("file:".length))), { recursive: true });
  }
  return createClient(authToken ? { url, authToken } : { url });
}

async function ensureTables(db) {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id                   TEXT PRIMARY KEY,
      roster_key           TEXT NOT NULL UNIQUE,
      display_name         TEXT NOT NULL,
      sort_name            TEXT NOT NULL,
      password_hash        TEXT NOT NULL,
      role                 TEXT NOT NULL DEFAULT 'student',
      show_on_leaderboard  INTEGER NOT NULL DEFAULT 0,
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL,
      last_login_at        TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_users_sort_name ON users(sort_name);

    CREATE TABLE IF NOT EXISTS user_sessions (
      session_hash TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      expires_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
  `);
}

function speakerKeys(entries) {
  const raw = process.env.INITIAL_SPEAKER_NAMES || "";
  const wanted = unique([...DEFAULT_SPEAKER_NAMES, ...raw.split(";")]);
  const byAlias = new Map();
  for (const entry of entries) {
    byAlias.set(entry.roster_key, entry.roster_key);
    byAlias.set(normalizeRosterName(entry.display_name), entry.roster_key);
    byAlias.set(normalizeRosterName(entry.sort_name), entry.roster_key);
    for (const alias of entry.aliases) byAlias.set(alias, entry.roster_key);
  }
  return new Set(wanted.map((name) => byAlias.get(name)).filter(Boolean));
}

async function seedUsers(db, entries) {
  const speakers = speakerKeys(entries);
  const now = nowIso();
  const csvRows = [["display_name", "sort_name", "password", "role", "status"]];

  for (const entry of entries) {
    const existing = await db.execute({
      sql: "SELECT id, password_hash, role FROM users WHERE roster_key = ?",
      args: [entry.roster_key],
    });
    const nextRole = speakers.has(entry.roster_key) ? "sprecher" : "student";
    const pwd = password();

    if (existing.rows[0]) {
      const userId = String(existing.rows[0].id);
      if (ROTATE) {
        await db.execute({
          sql: `UPDATE users
                SET display_name = ?, sort_name = ?, password_hash = ?, role = ?, updated_at = ?
                WHERE id = ?`,
          args: [entry.display_name, entry.sort_name, hashPassword(pwd), nextRole, now, userId],
        });
        csvRows.push([entry.display_name, entry.sort_name, pwd, nextRole, "rotated"]);
      } else {
        await db.execute({
          sql: "UPDATE users SET display_name = ?, sort_name = ?, role = ?, updated_at = ? WHERE id = ?",
          args: [entry.display_name, entry.sort_name, nextRole, now, userId],
        });
        csvRows.push([entry.display_name, entry.sort_name, "", nextRole, "unchanged"]);
      }
      continue;
    }

    await db.execute({
      sql: `INSERT INTO users (id, roster_key, display_name, sort_name, password_hash, role, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?)`,
      args: [newId(), entry.roster_key, entry.display_name, entry.sort_name, hashPassword(pwd), nextRole, now, now],
    });
    csvRows.push([entry.display_name, entry.sort_name, pwd, nextRole, "created"]);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, csvRows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n", "utf8");
}

async function legacyMigrate(db, entries) {
  const users = await db.execute("SELECT id, roster_key FROM users");
  const userByRoster = new Map(users.rows.map((row) => [String(row.roster_key), String(row.id)]));
  const aliases = new Map();
  for (const entry of entries) {
    const userId = userByRoster.get(entry.roster_key);
    if (!userId) continue;
    for (const alias of [entry.roster_key, normalizeRosterName(entry.display_name), normalizeRosterName(entry.sort_name), ...entry.aliases]) {
      const existing = aliases.get(alias);
      aliases.set(alias, existing && existing !== userId ? null : userId);
    }
  }

  try {
    const members = await db.execute("SELECT device_id, name FROM members");
    for (const member of members.rows) {
      const userId = aliases.get(normalizeRosterName(member.name));
      if (!userId) continue;
      const deviceId = String(member.device_id);
      await db.execute({ sql: "UPDATE point_events SET user_id = ? WHERE device_id = ? AND user_id IS NULL", args: [userId, deviceId] });
      await db.execute({ sql: "UPDATE comments SET user_id = ? WHERE device_id = ? AND user_id IS NULL", args: [userId, deviceId] });
      await db.execute({ sql: "UPDATE abizeitung_entries SET user_id = ? WHERE device_id = ? AND user_id IS NULL", args: [userId, deviceId] });
      await db.execute({
        sql: `UPDATE signups
              SET user_id = ?
              WHERE device_id = ? AND user_id IS NULL
                AND NOT EXISTS (
                  SELECT 1 FROM signups s2 WHERE s2.slot_id = signups.slot_id AND s2.user_id = ?
                )`,
        args: [userId, deviceId, userId],
      });
      await db.execute({
        sql: `UPDATE ballots
              SET user_id = ?
              WHERE device_id = ? AND user_id IS NULL
                AND NOT EXISTS (
                  SELECT 1 FROM ballots b2 WHERE b2.poll_id = ballots.poll_id AND b2.user_id = ?
                )`,
        args: [userId, deviceId, userId],
      });
    }
  } catch {
    // Older local DBs may not have legacy tables yet.
  }

  try {
    const usedRosterBallots = await db.execute(`
      SELECT pre.ballot_id AS ballot_id, pre.roster_key AS roster_key, p.poll_secret AS poll_secret
      FROM poll_roster_entries pre
      JOIN polls p ON p.id = pre.poll_id
      WHERE pre.ballot_id IS NOT NULL
    `);
    for (const row of usedRosterBallots.rows) {
      const userId = userByRoster.get(String(row.roster_key));
      if (!userId) continue;
      const hash = voterHash(String(row.poll_secret), `user:${userId}`);
      await db.execute({
        sql: `UPDATE ballots
              SET voter_hash = ?
              WHERE id = ? AND user_id IS NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM ballots b2
                  WHERE b2.poll_id = (SELECT poll_id FROM ballots WHERE id = ?)
                    AND b2.voter_hash = ?
                    AND b2.id != ?
                )`,
        args: [hash, String(row.ballot_id), String(row.ballot_id), hash, String(row.ballot_id)],
      });
    }
  } catch (err) {
    if (!/UNIQUE|constraint/i.test(String(err?.message || ""))) throw err;
  }
}

const db = createDb();
const entries = roster();
if (entries.length !== 99) throw new Error(`Erwartet 99 Accounts, gefunden: ${entries.length}`);
await ensureTables(db);
await seedUsers(db, entries);
await legacyMigrate(db, entries);

console.log(`${entries.length} Accounts synchronisiert.`);
console.log(`Passwortliste: ${OUT}`);
console.log(ROTATE ? "Passwoerter wurden rotiert." : "Bestehende Passwoerter wurden beibehalten.");
