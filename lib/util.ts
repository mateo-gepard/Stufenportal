import crypto from "node:crypto";

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

/** Liest und validiert einen JSON-Body; gibt {} bei leerem Body. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text) return {};
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function trimmed(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function int(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Math.round(Number(v));
  return null;
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
