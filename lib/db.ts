import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Single shared SQLite connection. The schema below is the v1 subset of the
// project.md data model. Every "mutable" row carries deleted_at for soft-delete.
// Permissions are enforced in the route handlers (see lib/auth.ts) — never only
// in the frontend.

let db: Database.Database | null = null;

function init(): Database.Database {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const conn = new Database(path.join(dir, "stufenportal.db"));
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  migrate(conn);
  // Beispieldaten nur, wenn ausdrücklich gewünscht (SP_SEED=true). Standard: leer starten.
  if (process.env.SP_SEED === "true") seedIfEmpty(conn);
  return conn;
}

export function getDb(): Database.Database {
  if (!db) db = init();
  return db;
}

function migrate(c: Database.Database) {
  c.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type        TEXT NOT NULL DEFAULT 'event',
      status      TEXT NOT NULL DEFAULT 'planning', -- idea|planning|active|done|cancelled
      start_at    TEXT,
      end_at      TEXT,
      cover_url   TEXT,
      created_at  TEXT NOT NULL,
      deleted_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id         TEXT PRIMARY KEY,
      event_id   TEXT NOT NULL REFERENCES events(id),
      title      TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      assignee   TEXT,
      due_at     TEXT,
      ord        INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS signup_lists (
      id         TEXT PRIMARY KEY,
      event_id   TEXT NOT NULL REFERENCES events(id),
      title      TEXT NOT NULL,
      overflow   TEXT NOT NULL DEFAULT 'block', -- block|waitlist
      ord        INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS slots (
      id        TEXT PRIMARY KEY,
      list_id   TEXT NOT NULL REFERENCES signup_lists(id),
      label     TEXT NOT NULL,
      capacity  INTEGER, -- NULL = unbegrenzt
      ord       INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS signups (
      id           TEXT PRIMARY KEY,
      slot_id      TEXT NOT NULL REFERENCES slots(id),
      device_id    TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT 'Anonym',
      status       TEXT NOT NULL DEFAULT 'confirmed', -- confirmed|waitlist
      created_at   TEXT NOT NULL,
      UNIQUE(slot_id, device_id)
    );

    CREATE TABLE IF NOT EXISTS news (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      body           TEXT NOT NULL DEFAULT '',
      category       TEXT NOT NULL DEFAULT 'Allgemein',
      priority       TEXT NOT NULL DEFAULT 'normal', -- normal|wichtig|dringend
      status         TEXT NOT NULL DEFAULT 'published', -- draft|published|hidden|archived
      featured       INTEGER NOT NULL DEFAULT 0,
      featured_until TEXT,
      created_at     TEXT NOT NULL,
      published_at   TEXT,
      deleted_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS polls (
      id                    TEXT PRIMARY KEY,
      question              TEXT NOT NULL,
      method                TEXT NOT NULL DEFAULT 'single', -- single|approval|ranked
      anonymous             INTEGER NOT NULL DEFAULT 0,
      reveal                TEXT NOT NULL DEFAULT 'live', -- live|after_close
      quorum                INTEGER,
      result_visibility_min INTEGER NOT NULL DEFAULT 5,
      tie_break             TEXT NOT NULL DEFAULT 'admin',
      poll_secret           TEXT NOT NULL,
      closes_at             TEXT,
      status                TEXT NOT NULL DEFAULT 'open', -- open|closed|invalid
      created_at            TEXT NOT NULL,
      deleted_at            TEXT
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id      TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id),
      label   TEXT NOT NULL,
      ord     INTEGER NOT NULL DEFAULT 0
    );

    -- One ballot per device per poll (the integrity unit). For anonymous polls
    -- we store voter_hash = HMAC(poll_secret, device_id) and NO device_id.
    CREATE TABLE IF NOT EXISTS ballots (
      id         TEXT PRIMARY KEY,
      poll_id    TEXT NOT NULL REFERENCES polls(id),
      device_id  TEXT,
      voter_hash TEXT,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ballot_device ON ballots(poll_id, device_id) WHERE device_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ballot_hash   ON ballots(poll_id, voter_hash) WHERE voter_hash IS NOT NULL;

    CREATE TABLE IF NOT EXISTS vote_items (
      id        TEXT PRIMARY KEY,
      ballot_id TEXT NOT NULL REFERENCES ballots(id),
      option_id TEXT NOT NULL REFERENCES poll_options(id),
      rank      INTEGER -- nur Ranked
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id          TEXT PRIMARY KEY,
      kind        TEXT NOT NULL, -- income|expense
      amount      INTEGER NOT NULL, -- Cent
      description TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'Allgemein',
      occurred_at TEXT NOT NULL,
      paid_by     TEXT, -- nur Admin/Kassenwart sichtbar
      created_at  TEXT NOT NULL,
      deleted_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          TEXT PRIMARY KEY,
      target_type TEXT NOT NULL, -- event|news
      target_id   TEXT NOT NULL,
      device_id   TEXT NOT NULL,
      author_name TEXT NOT NULL DEFAULT 'Anonym',
      body        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      deleted_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         TEXT PRIMARY KEY,
      endpoint   TEXT NOT NULL UNIQUE,
      p256dh     TEXT NOT NULL,
      auth       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Passwortlose, lokale Identität: anonyme Geräte-ID + selbstgewählter Name.
    -- Kein Konto, kein Login. Leaderboard-Sichtbarkeit ist opt-in (Default aus).
    CREATE TABLE IF NOT EXISTS members (
      device_id           TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      show_on_leaderboard INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL
    );

    -- Punkte fürs Mitmachen. Sprecher vergeben sie mit Grund (transparent).
    CREATE TABLE IF NOT EXISTS point_events (
      id         TEXT PRIMARY KEY,
      device_id  TEXT NOT NULL,             -- Empfänger
      points     INTEGER NOT NULL,
      reason     TEXT NOT NULL DEFAULT '',
      source     TEXT NOT NULL DEFAULT 'sprecher', -- sprecher|system
      created_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_points_recipient ON point_events(device_id);
  `);
}

function seedIfEmpty(c: Database.Database) {
  const n = c.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number };
  if (n.n > 0) return;
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const inDays = (days: number) => iso(new Date(now.getTime() + days * 864e5));
  const id = () => crypto.randomUUID();

  // --- Event: Kuchenverkauf ---
  const evId = id();
  c.prepare(
    `INSERT INTO events (id,title,description,type,status,start_at,created_at)
     VALUES (?,?,?,?,?,?,?)`
  ).run(
    evId,
    "Kuchenverkauf am Elternsprechtag",
    "Wir verkaufen Kuchen in der Aula. Erlös geht in die Abikasse. Bitte tragt euch für Backen und Standdienst ein.",
    "event",
    "planning",
    inDays(9),
    iso(now)
  );
  const ms = c.prepare(
    `INSERT INTO milestones (id,event_id,title,done,assignee,due_at,ord) VALUES (?,?,?,?,?,?,?)`
  );
  ms.run(id(), evId, "Standplatz mit Schule klären", 1, "Mia", inDays(-2), 0);
  ms.run(id(), evId, "Backliste füllen", 0, null, inDays(4), 1);
  ms.run(id(), evId, "Wechselgeld besorgen", 0, "Jonas", inDays(7), 2);
  ms.run(id(), evId, "Auf- und Abbau planen", 0, null, inDays(8), 3);

  const listId = id();
  c.prepare(
    `INSERT INTO signup_lists (id,event_id,title,overflow,ord) VALUES (?,?,?,?,?)`
  ).run(listId, evId, "Standdienst", "waitlist", 0);
  const slot = c.prepare(`INSERT INTO slots (id,list_id,label,capacity,ord) VALUES (?,?,?,?,?)`);
  slot.run(id(), listId, "1. Schicht · 8–10 Uhr", 3, 0);
  slot.run(id(), listId, "2. Schicht · 10–12 Uhr", 3, 1);
  slot.run(id(), listId, "Abbau · ab 12 Uhr", 2, 2);

  // --- Event: Abiball ---
  const ev2 = id();
  c.prepare(
    `INSERT INTO events (id,title,description,type,status,start_at,created_at) VALUES (?,?,?,?,?,?,?)`
  ).run(
    ev2,
    "Abiball-Orga",
    "Location, Catering, Programm. Das große Ding für nächstes Jahr — wir fangen jetzt an.",
    "event",
    "active",
    inDays(120),
    iso(now)
  );
  ms.run(id(), ev2, "Location-Optionen sammeln", 1, null, null, 0);
  ms.run(id(), ev2, "Abstimmung Location", 0, null, null, 1);
  ms.run(id(), ev2, "Catering anfragen", 0, null, null, 2);

  // --- News ---
  const news = c.prepare(
    `INSERT INTO news (id,title,body,category,priority,status,featured,featured_until,created_at,published_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  news.run(
    id(),
    "Rückmeldung Abimotto bis Freitag",
    "Tragt eure Vorschläge in die Abstimmung ein. Am Freitag schließen wir die Sammlung und stimmen dann ab.",
    "Abi",
    "wichtig",
    "published",
    1,
    inDays(3),
    iso(now),
    iso(now)
  );
  news.run(
    id(),
    "Kassenstand aktualisiert",
    "Nach dem letzten Kuchenverkauf stehen wir gut da. Details in der Kasse.",
    "Kasse",
    "normal",
    "published",
    0,
    null,
    iso(new Date(now.getTime() - 2 * 864e5)),
    iso(new Date(now.getTime() - 2 * 864e5))
  );

  // --- Poll: Abimotto (ranked) ---
  const pollId = id();
  c.prepare(
    `INSERT INTO polls (id,question,method,anonymous,reveal,result_visibility_min,tie_break,poll_secret,closes_at,status,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    pollId,
    "Welches Abimotto?",
    "ranked",
    1,
    "after_close",
    5,
    "admin",
    crypto.randomBytes(16).toString("hex"),
    inDays(5),
    "open",
    iso(now)
  );
  const opt = c.prepare(`INSERT INTO poll_options (id,poll_id,label,ord) VALUES (?,?,?,?)`);
  ["ABInce ohne Geld", "ABIginn war alles besser", "ABIza Hut", "Game of ABI"].forEach((l, i) =>
    opt.run(id(), pollId, l, i)
  );

  // --- Poll: Abiball-Termin (single) ---
  const poll2 = id();
  c.prepare(
    `INSERT INTO polls (id,question,method,anonymous,reveal,poll_secret,closes_at,status,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    poll2,
    "Wann passt der Abiball am besten?",
    "single",
    0,
    "live",
    crypto.randomBytes(16).toString("hex"),
    inDays(10),
    "open",
    iso(now)
  );
  ["Freitag 03.07.", "Samstag 04.07.", "Freitag 10.07."].forEach((l, i) =>
    opt.run(id(), poll2, l, i)
  );

  // --- Ledger ---
  const led = c.prepare(
    `INSERT INTO ledger (id,kind,amount,description,category,occurred_at,paid_by,created_at) VALUES (?,?,?,?,?,?,?,?)`
  );
  led.run(id(), "income", 18750, "Kuchenverkauf September", "Aktion", inDays(-20), null, iso(now));
  led.run(id(), "income", 9000, "Pfandsammeln", "Aktion", inDays(-12), null, iso(now));
  led.run(id(), "expense", 4230, "Backzutaten", "Material", inDays(-21), "Mia", iso(now));
  led.run(id(), "expense", 2500, "Plakate & Druck", "Material", inDays(-10), "Jonas", iso(now));
}
