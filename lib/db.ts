import { createClient, type Client, type InValue, type Transaction } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

// Datenschicht auf libsql (SQLite-kompatibel). Lokal gegen eine Datei, auf Vercel
// gegen Turso — dieselbe Codebasis, gesteuert über Env-Variablen:
//   TURSO_DATABASE_URL=libsql://<db>.turso.io   (lokal: file:./data/stufenportal.db)
//   TURSO_AUTH_TOKEN=<token>                     (nur für Turso nötig)
// Der Wrapper unten bildet die von better-sqlite3 gewohnte API nach, nur async.

let client: Client | null = null;
function raw(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || "file:./data/stufenportal.db";
    const authToken = process.env.TURSO_AUTH_TOKEN;
    // Lokale Datei-DB: Zielordner sicherstellen (Turso-URLs brauchen das nicht).
    if (url.startsWith("file:")) {
      const dir = path.dirname(url.slice("file:".length));
      if (dir) fs.mkdirSync(dir, { recursive: true });
    }
    client = createClient(authToken ? { url, authToken } : { url });
  }
  return client;
}

let initPromise: Promise<void> | null = null;
async function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = migrate();
  await initPromise;
}

export interface Stmt {
  get<T = any>(...args: InValue[]): Promise<T | undefined>;
  all<T = any>(...args: InValue[]): Promise<T[]>;
  run(...args: InValue[]): Promise<void>;
}

function prepare(sql: string): Stmt {
  return {
    async get<T>(...args: InValue[]) {
      await ensureInit();
      const r = await raw().execute({ sql, args });
      return (r.rows[0] as unknown as T) ?? undefined;
    },
    async all<T>(...args: InValue[]) {
      await ensureInit();
      const r = await raw().execute({ sql, args });
      return r.rows as unknown as T[];
    },
    async run(...args: InValue[]) {
      await ensureInit();
      await raw().execute({ sql, args });
    },
  };
}

export function getDb(): { prepare: (sql: string) => Stmt } {
  return { prepare };
}

/** Atomare Transaktion für mehrere unabhängige Schreib-Statements. */
export async function batch(statements: { sql: string; args?: InValue[] }[]): Promise<void> {
  await ensureInit();
  await raw().batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write"
  );
}

/** Interaktive Transaktion für Lesen-dann-Schreiben. */
export async function tx<T>(fn: (t: Transaction) => Promise<T>): Promise<T> {
  await ensureInit();
  const t = await raw().transaction("write");
  try {
    const out = await fn(t);
    await t.commit();
    return out;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function migrate(): Promise<void> {
  // executeMultiple führt mehrere durch ; getrennte Statements aus (ohne Args).
  await raw().executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id                   TEXT PRIMARY KEY,
      roster_key           TEXT NOT NULL UNIQUE,
      display_name         TEXT NOT NULL,
      sort_name            TEXT NOT NULL,
      password_hash        TEXT NOT NULL,
      role                 TEXT NOT NULL DEFAULT 'student',
      show_on_leaderboard  INTEGER NOT NULL DEFAULT 1,
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
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS user_seen_items (
      user_id  TEXT NOT NULL,
      section  TEXT NOT NULL,
      item_key TEXT NOT NULL,
      seen_at  TEXT NOT NULL,
      PRIMARY KEY (user_id, section, item_key)
    );
    CREATE INDEX IF NOT EXISTS idx_user_seen_items_user_section ON user_seen_items(user_id, section);

    CREATE TABLE IF NOT EXISTS events (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type        TEXT NOT NULL DEFAULT 'event',
      status      TEXT NOT NULL DEFAULT 'planning',
      start_at    TEXT,
      end_at      TEXT,
      cover_url   TEXT,
      money_goal_cents INTEGER,
      money_goal_note  TEXT,
      created_at  TEXT NOT NULL,
      deleted_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id                TEXT PRIMARY KEY,
      event_id          TEXT NOT NULL,
      title             TEXT NOT NULL,
      done              INTEGER NOT NULL DEFAULT 0,
      assignee          TEXT,
      assignee_ids      TEXT,
      points            INTEGER NOT NULL DEFAULT 0,
      points_awarded_at TEXT,
      due_at            TEXT,
      ord               INTEGER NOT NULL DEFAULT 0,
      deleted_at        TEXT
    );

    CREATE TABLE IF NOT EXISTS signup_lists (
      id         TEXT PRIMARY KEY,
      event_id   TEXT NOT NULL,
      title      TEXT NOT NULL,
      overflow   TEXT NOT NULL DEFAULT 'block',
      ord        INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS slots (
      id        TEXT PRIMARY KEY,
      list_id   TEXT NOT NULL,
      label     TEXT NOT NULL,
      capacity  INTEGER,
      ord       INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS signups (
      id           TEXT PRIMARY KEY,
      slot_id      TEXT NOT NULL,
      device_id    TEXT NOT NULL,
      user_id      TEXT,
      display_name TEXT NOT NULL DEFAULT 'Anonym',
      status       TEXT NOT NULL DEFAULT 'confirmed',
      created_at   TEXT NOT NULL,
      UNIQUE(slot_id, device_id)
    );

    CREATE TABLE IF NOT EXISTS news (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      body           TEXT NOT NULL DEFAULT '',
      category       TEXT NOT NULL DEFAULT 'Allgemein',
      priority       TEXT NOT NULL DEFAULT 'normal',
      status         TEXT NOT NULL DEFAULT 'published',
      featured       INTEGER NOT NULL DEFAULT 0,
      featured_until TEXT,
      created_at     TEXT NOT NULL,
      published_at   TEXT,
      deleted_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS polls (
      id                    TEXT PRIMARY KEY,
      question              TEXT NOT NULL,
      method                TEXT NOT NULL DEFAULT 'single',
      anonymous             INTEGER NOT NULL DEFAULT 0,
      reveal                TEXT NOT NULL DEFAULT 'live',
      rank_limit            INTEGER,
      ranked_veto_enabled   INTEGER NOT NULL DEFAULT 0,
      quorum                INTEGER,
      result_visibility_min INTEGER NOT NULL DEFAULT 5,
      tie_break             TEXT NOT NULL DEFAULT 'admin',
      poll_secret           TEXT NOT NULL,
      closes_at             TEXT,
      status                TEXT NOT NULL DEFAULT 'open',
      created_at            TEXT NOT NULL,
      deleted_at            TEXT
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id      TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      label   TEXT NOT NULL,
      ord     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ballots (
      id         TEXT PRIMARY KEY,
      poll_id    TEXT NOT NULL,
      device_id  TEXT,
      user_id    TEXT,
      voter_hash TEXT,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ballot_device ON ballots(poll_id, device_id) WHERE device_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ballot_hash   ON ballots(poll_id, voter_hash) WHERE voter_hash IS NOT NULL;

    CREATE TABLE IF NOT EXISTS vote_items (
      id        TEXT PRIMARY KEY,
      ballot_id TEXT NOT NULL,
      option_id TEXT NOT NULL,
      rank      INTEGER
    );

    CREATE TABLE IF NOT EXISTS poll_roster_entries (
      id           TEXT PRIMARY KEY,
      poll_id      TEXT NOT NULL,
      roster_key   TEXT NOT NULL,
      display_name TEXT NOT NULL,
      ord          INTEGER NOT NULL DEFAULT 0,
      used_at      TEXT,
      ballot_id    TEXT,
      created_at   TEXT NOT NULL,
      UNIQUE(poll_id, roster_key)
    );

    CREATE TABLE IF NOT EXISTS poll_roster_aliases (
      poll_id          TEXT NOT NULL,
      entry_id         TEXT NOT NULL,
      normalized_alias TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_poll_roster_alias ON poll_roster_aliases(poll_id, normalized_alias);

    CREATE TABLE IF NOT EXISTS anonymous_vote_name_flags (
      id              TEXT PRIMARY KEY,
      poll_id         TEXT NOT NULL,
      device_id       TEXT NOT NULL,
      voter_name      TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'open',
      created_at      TEXT NOT NULL,
      resolved_at     TEXT,
      UNIQUE(poll_id, device_id, normalized_name)
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id          TEXT PRIMARY KEY,
      kind        TEXT NOT NULL,
      amount      INTEGER NOT NULL,
      description TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'Allgemein',
      occurred_at TEXT NOT NULL,
      paid_by     TEXT,
      created_at  TEXT NOT NULL,
      deleted_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id   TEXT NOT NULL,
      device_id   TEXT NOT NULL,
      user_id     TEXT,
      author_name TEXT NOT NULL DEFAULT 'Anonym',
      body        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      deleted_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS abizeitung_entries (
      id             TEXT PRIMARY KEY,
      device_id      TEXT NOT NULL,
      user_id        TEXT,
      author_name    TEXT NOT NULL DEFAULT 'Anonym',
      quote          TEXT,
      quoted_name    TEXT,
      caption        TEXT,
      image_path     TEXT,
      image_mime     TEXT,
      image_name     TEXT,
      created_at     TEXT NOT NULL,
      deleted_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         TEXT PRIMARY KEY,
      endpoint   TEXT NOT NULL UNIQUE,
      p256dh     TEXT NOT NULL,
      auth       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Hochgeladene Bilder als BLOB in der DB. Auf Vercel ist das Dateisystem
    -- ephemer/read-only, deshalb landen Uploads hier statt auf der Platte.
    CREATE TABLE IF NOT EXISTS upload_blobs (
      id         TEXT PRIMARY KEY,
      mime       TEXT NOT NULL,
      data       BLOB NOT NULL,
      byte_size  INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Login-Drossel gegen Brute-Force (serverless-sicher, da DB-basiert).
    CREATE TABLE IF NOT EXISTS auth_throttle (
      throttle_key  TEXT PRIMARY KEY,
      fail_count    INTEGER NOT NULL DEFAULT 0,
      first_fail_at TEXT NOT NULL,
      locked_until  TEXT
    );

    CREATE TABLE IF NOT EXISTS members (
      device_id           TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      show_on_leaderboard INTEGER NOT NULL DEFAULT 1,
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS point_events (
      id         TEXT PRIMARY KEY,
      device_id  TEXT NOT NULL,
      user_id    TEXT,
      points     INTEGER NOT NULL,
      reason     TEXT NOT NULL DEFAULT '',
      source     TEXT NOT NULL DEFAULT 'sprecher',
      created_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_points_recipient ON point_events(device_id);
  `);

  await addColumnIfMissing("users", "last_login_at", "TEXT");
  await addColumnIfMissing("signups", "user_id", "TEXT");
  await addColumnIfMissing("ballots", "user_id", "TEXT");
  await addColumnIfMissing("comments", "user_id", "TEXT");
  await addColumnIfMissing("abizeitung_entries", "user_id", "TEXT");
  await addColumnIfMissing("point_events", "user_id", "TEXT");
  await addColumnIfMissing("milestones", "assignee_ids", "TEXT");
  await addColumnIfMissing("milestones", "points", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing("milestones", "points_awarded_at", "TEXT");
  await addColumnIfMissing("polls", "rank_limit", "INTEGER");
  await addColumnIfMissing("polls", "ranked_veto_enabled", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing("events", "money_goal_cents", "INTEGER");
  await addColumnIfMissing("events", "money_goal_note", "TEXT");

  await raw().execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_signup_user ON signups(slot_id, user_id) WHERE user_id IS NOT NULL");
  await raw().execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_ballot_user ON ballots(poll_id, user_id) WHERE user_id IS NOT NULL");
  await raw().execute("CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id)");
  await raw().execute("CREATE INDEX IF NOT EXISTS idx_abizeitung_user ON abizeitung_entries(user_id)");
  await raw().execute("CREATE INDEX IF NOT EXISTS idx_points_user ON point_events(user_id)");
}

async function addColumnIfMissing(table: string, column: string, definition: string): Promise<void> {
  try {
    await raw().execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (e) {
    const msg = String((e as Error).message || "");
    if (/duplicate column|already exists/i.test(msg)) return;
    throw e;
  }
}
