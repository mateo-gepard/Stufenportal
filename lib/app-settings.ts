import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/util";

const LEADERBOARD_ACTIVE_KEY = "leaderboard_active";

async function getBooleanSetting(key: string, fallback: boolean): Promise<boolean> {
  const row = await getDb()
    .prepare("SELECT setting_value FROM app_settings WHERE setting_key = ?")
    .get<{ setting_value: string }>(key);
  if (!row) return fallback;
  return row.setting_value === "1" || row.setting_value === "true";
}

async function setBooleanSetting(key: string, value: boolean): Promise<void> {
  await getDb()
    .prepare(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         updated_at = excluded.updated_at`
    )
    .run(key, value ? "1" : "0", nowIso());
}

export function leaderboardIsActive(): Promise<boolean> {
  return getBooleanSetting(LEADERBOARD_ACTIVE_KEY, true);
}

export function setLeaderboardActive(active: boolean): Promise<void> {
  return setBooleanSetting(LEADERBOARD_ACTIVE_KEY, active);
}
