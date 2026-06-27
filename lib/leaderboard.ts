import type { LeaderboardRow } from "./types";

export interface RawLeaderboardRow {
  user_id: string | null;
  device_id?: string | null;
  name: string;
  points: number;
}

function normalizeNamePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function leaderboardNameKey(name: string): string {
  const parts = normalizeNamePart(name).split(/\s+/).filter(Boolean);
  return Array.from(new Set(parts)).sort((a, b) => a.localeCompare(b, "de-DE")).join(" ");
}

function preferRow(
  next: RawLeaderboardRow & { mine: boolean },
  current: RawLeaderboardRow & { mine: boolean }
): RawLeaderboardRow & { mine: boolean } {
  if (next.points !== current.points) return next.points > current.points ? next : current;
  if (next.mine !== current.mine) return next.mine ? next : current;
  return next.name.localeCompare(current.name, "de-DE") < 0 ? next : current;
}

export function buildLeaderboard(
  rows: RawLeaderboardRow[],
  currentUserId: string | null,
  currentDevice: string | null = null
): LeaderboardRow[] {
  const deduped = new Map<string, RawLeaderboardRow & { mine: boolean }>();

  for (const row of rows) {
    const key = leaderboardNameKey(row.name);
    if (!key) continue;
    const mine =
      (!!currentUserId && row.user_id === currentUserId) ||
      (!!currentDevice && !!row.device_id && row.device_id === currentDevice);
    const next = { ...row, points: row.points ?? 0, mine };
    const current = deduped.get(key);
    if (!current) {
      deduped.set(key, next);
      continue;
    }
    const preferred = preferRow(next, current);
    deduped.set(key, { ...preferred, mine: current.mine || next.mine });
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "de-DE"))
    .map((r, i) => ({
      name: r.name,
      points: r.points,
      rank: i + 1,
      mine: r.mine,
    }));
}
