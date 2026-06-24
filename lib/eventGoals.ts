import { trimmed } from "./util";

export function parseMoneyGoalCents(value: unknown): number | null | Error {
  if (value === undefined || value === null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return new Error("Kassenziel muss ein nicht-negativer Cent-Betrag sein.");
  }
  return n > 0 ? n : null;
}

export function parseMoneyGoalNote(value: unknown, cents: number | null): string | null {
  if (!cents) return null;
  return trimmed(value).slice(0, 160) || null;
}
