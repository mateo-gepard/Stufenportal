import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// --- Sprecher-/Admin-Modus -------------------------------------------------
// Kein User-Login. "Admin" ist ein erhöhter Modus, freigeschaltet per Code.
// Der Beweis dafür ist ein signiertes httpOnly-Cookie, das jede schreibende
// Route serverseitig prüft (RLS-Äquivalent: Rechte nah an den Daten, nicht im UI).

const SECRET = process.env.SP_SECRET || "dev-insecure-secret-change-me";
const ADMIN_CODE = process.env.ADMIN_CODE || "stufe2026";
export const ADMIN_COOKIE = "sp_admin";

function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

export function adminToken(): string {
  // Statisches Claim; Gültigkeit = korrekte Signatur. Logout löscht das Cookie.
  return `admin.${sign("admin")}`;
}

export function checkAdminCode(code: string): boolean {
  if (!code) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(ADMIN_CODE);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function isAdmin(): boolean {
  const raw = cookies().get(ADMIN_COOKIE)?.value;
  return !!raw && raw === adminToken();
}

/** Wirft eine 403-Antwort, wenn nicht Admin. Gibt sonst null zurück. */
export function requireAdmin(): NextResponse | null {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Nur im Sprecher-Modus." }, { status: 403 });
  }
  return null;
}

// --- Anonyme Geräte-Identität ---------------------------------------------
// Der Client schickt eine zufällige Geräte-ID (localStorage) als Header mit.
// Sie dient nur der Doppel-Vermeidung (eine Stimme / ein Listen-Eintrag je Gerät)
// und der Eigentümerschaft eigener Einträge — keine Personendaten.

export function deviceId(req: Request): string | null {
  const id = req.headers.get("x-device-id");
  if (!id || id.length < 8 || id.length > 100) return null;
  return id;
}

/** Anonymer, nicht rückrechenbarer Stimm-Hash pro Poll. */
export function voterHash(pollSecret: string, device: string): string {
  return crypto.createHmac("sha256", pollSecret).update(device).digest("hex");
}
