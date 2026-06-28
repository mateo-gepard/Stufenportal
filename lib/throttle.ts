import { getDb } from "./db";
import { nowIso } from "./util";

// DB-basierte Login-Drossel. In-Memory funktioniert auf Vercel nicht (jede
// Lambda-Instanz haette ihren eigenen Zaehler), deshalb laeuft alles ueber die DB.

const WINDOW_MS = 15 * 60 * 1000; // Zeitfenster, in dem Fehlversuche zaehlen
const MAX_FAILS = 10; // ab so vielen Fehlversuchen wird gesperrt
const LOCK_MS = 15 * 60 * 1000; // Sperrdauer

interface ThrottleRow {
  fail_count: number;
  first_fail_at: string;
  locked_until: string | null;
}

/** Sekunden bis zur Entsperrung, oder null wenn nicht gesperrt. */
export async function throttleRetryAfter(key: string): Promise<number | null> {
  const row = await getDb()
    .prepare("SELECT fail_count, first_fail_at, locked_until FROM auth_throttle WHERE throttle_key = ?")
    .get<ThrottleRow>(key);
  if (!row?.locked_until) return null;
  const remaining = new Date(row.locked_until).getTime() - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : null;
}

/** Registriert einen Fehlversuch und sperrt bei Ueberschreitung. */
export async function registerFailure(key: string): Promise<void> {
  const db = getDb();
  const now = Date.now();
  const row = await db
    .prepare("SELECT fail_count, first_fail_at, locked_until FROM auth_throttle WHERE throttle_key = ?")
    .get<ThrottleRow>(key);

  // Fenster abgelaufen oder noch kein Eintrag -> frisch starten.
  if (!row || now - new Date(row.first_fail_at).getTime() > WINDOW_MS) {
    await db
      .prepare(
        `INSERT INTO auth_throttle (throttle_key, fail_count, first_fail_at, locked_until)
         VALUES (?,1,?,NULL)
         ON CONFLICT(throttle_key) DO UPDATE SET fail_count = 1, first_fail_at = excluded.first_fail_at, locked_until = NULL`
      )
      .run(key, nowIso());
    return;
  }

  const nextCount = row.fail_count + 1;
  const lockedUntil = nextCount >= MAX_FAILS ? new Date(now + LOCK_MS).toISOString() : null;
  await db
    .prepare("UPDATE auth_throttle SET fail_count = ?, locked_until = ? WHERE throttle_key = ?")
    .run(nextCount, lockedUntil, key);
}

/** Erfolgreicher Login -> Drossel zuruecksetzen. */
export async function clearThrottle(key: string): Promise<void> {
  await getDb().prepare("DELETE FROM auth_throttle WHERE throttle_key = ?").run(key);
}
