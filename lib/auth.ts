import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "./db";
import { nowIso } from "./util";

export const SESSION_COOKIE = "sp_session";
export const ADMIN_COOKIE = "sp_admin";

const SESSION_DAYS = 30;
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type UserRole = "student" | "sprecher";

export interface AuthUser {
  id: string;
  roster_key: string;
  display_name: string;
  sort_name: string;
  role: UserRole;
  show_on_leaderboard: boolean;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sessionHash(token: string): string {
  return sha256(`session:${token}`);
}

function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

function normalizeRole(value: unknown): UserRole {
  return value === "sprecher" ? "sprecher" : "student";
}

function mapUser(row: any): AuthUser {
  return {
    id: String(row.id),
    roster_key: String(row.roster_key),
    display_name: String(row.display_name),
    sort_name: String(row.sort_name),
    role: normalizeRole(row.role),
    show_on_leaderboard: !!row.show_on_leaderboard,
  };
}

export function generatePassword(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const actual = crypto.scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function currentUser(): Promise<AuthUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token || token.length < 32 || token.length > 256) return null;
  const row = await getDb()
    .prepare(
      `SELECT u.id, u.roster_key, u.display_name, u.sort_name, u.role, u.show_on_leaderboard
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.session_hash = ? AND s.expires_at > ?`
    )
    .get<any>(sessionHash(token), nowIso());
  return row ? mapUser(row) : null;
}

export async function createSession(userId: string, res: NextResponse): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = sessionExpiry();
  await getDb()
    .prepare("INSERT INTO user_sessions (session_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)")
    .run(sessionHash(token), userId, nowIso(), expires.toISOString());
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function clearSession(res: NextResponse): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb().prepare("DELETE FROM user_sessions WHERE session_hash = ?").run(sessionHash(token));
  }
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function isSpeaker(): Promise<boolean> {
  const user = await currentUser();
  return user?.role === "sprecher";
}

export async function requireUser(): Promise<AuthUser | NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });
  return user;
}

export async function requireSpeaker(): Promise<NextResponse | null> {
  const user = await currentUser();
  if (user?.role !== "sprecher") {
    return NextResponse.json({ error: "Nur fuer Sprecher." }, { status: 403 });
  }
  return null;
}

export const isAdmin = isSpeaker;
export const requireAdmin = requireSpeaker;

// Deprecated compatibility exports for old admin routes; the UI no longer uses
// code-based speaker mode, but keeping these avoids breaking stale clients.
export function adminToken(): string {
  return "";
}

export function checkAdminCode(_code?: string): boolean {
  return false;
}

// Legacy device identity is kept only for old ownership/vote data.
export function deviceId(req: Request): string | null {
  const id = req.headers.get("x-device-id");
  if (!id || id.length < 8 || id.length > 100) return null;
  return id;
}

/** Anonymer, nicht rueckrechenbarer Stimm-Hash pro Poll. */
export function voterHash(pollSecret: string, subject: string): string {
  return crypto.createHmac("sha256", pollSecret).update(subject).digest("hex");
}
