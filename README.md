# Stufenportal

Mobile-first PWA für die Selbstorganisation einer Abiturstufe: **Heute-Digest · Events mit Meilensteinen & Eintragungslisten · eigene Aufgaben · News mit Push · Abstimmungen · transparente Kasse · Abizeitung · Leaderboard**. Account-basiert, ohne offene Registrierung.

Konzept, Designsystem und Funktionsumfang sind in [`PROJECT.md`](PROJECT.md) beschrieben.

## Architektur

- **Next.js App Router + TypeScript**, Route Handler als Backend-API.
- **Datenschicht libSQL/SQLite** (`lib/db.ts`): lokal eine Datei, in Produktion (Vercel) eine Turso-DB — dieselbe Codebasis, gesteuert über Env-Variablen.
- **Zugewiesene Accounts** statt offener Registrierung: jede Person aus der Stufenliste hat genau einen Account, Login per Name + 6-stelligem Startpasswort.
- **Serverseitige Sessions** über httpOnly-Cookie `sp_session`; in der DB liegt nur ein Hash des Tokens.
- **Rollen am Account**: `student` und `sprecher`. Sprecher-Rechte werden in den API-Routen geprüft, das Client-UI ist nur Komfort.
- **Web-Push** selbst gehostet über VAPID (web-push), keine Drittanbieter.
- **Bild-Uploads** liegen als BLOB in der DB (`lib/storage.ts`) und werden über eine API-Route ausgeliefert — funktioniert dadurch auch auf Vercels ephemerem Dateisystem.

## Starten

```bash
npm install
npm run keys            # erzeugt .env.local mit VAPID-Keys — nur beim ersten Mal
npm run seed:accounts   # legt alle Accounts an, schreibt data/account-passwords.csv (lokal)
npm run dev             # http://localhost:3000
```

Die DB wird beim ersten Start automatisch angelegt und startet **leer**. Für Demo-Inhalte
(Events, Abstimmungen, Kasse) `SP_SEED=true` in `.env.local` setzen.

### Accounts & Sprecher

- `npm run seed:accounts` legt alle Accounts idempotent an und schreibt die Klartext-Startpasswörter nach `data/account-passwords.csv` (gitignored, nie committen).
- `npm run seed:accounts -- --rotate` setzt neue Startpasswörter.
- Default-Sprecher sind in [`PROJECT.md`](PROJECT.md) gelistet; weitere lassen sich über `INITIAL_SPEAKER_NAMES="Nachname, Vorname;..."` ergänzen.
- Sprecher können Passwörter pro Person in der **Verwaltung** zurücksetzen und einmalig anzeigen.

Sprecher-Aktionen (Erstellen/Bearbeiten/Löschen, Kasse mit `paid_by`, Punkte, Papierkorb)
erscheinen kontextbezogen, sobald ein Account mit Rolle `sprecher` eingeloggt ist.

## Sicherheit

- Passwörter mit `scrypt` + Salt gehasht; Vergleich timing-safe.
- **Login-Drossel** (DB-basiert, serverless-sicher): ab 10 Fehlversuchen pro Account/IP 15 Minuten Sperre (`lib/throttle.ts`).
- Konstante Antwortzeit bei unbekanntem Namen (kein Account-Enumeration-Leak).
- **Security-Header** (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS) in `next.config.mjs`.
- `paid_by` wird für Nicht-Sprecher serverseitig entfernt, nicht nur im UI.
- Soft-Delete überall (`deleted_at`); endgültiges Löschen nur aus dem Papierkorb.
- Anonyme Polls speichern nur `voter_hash = HMAC(poll_secret, "user:"+id)`, nie den Namen.

## Befehle

```bash
npm run dev             # Entwicklung
npm run build           # Production-Build (führt Lint aus)
npm run start           # Production-Server
npm run lint            # ESLint
npm run keys            # .env.local neu erzeugen (nur wenn nicht vorhanden)
npm run seed:accounts   # Accounts anlegen / Passwörter rotieren
```

## Struktur

```
app/            Seiten (Heute, Events, Polls, Aufgaben, News, Kasse, Mehr, Verwaltung) + API-Routen
components/     UI-Primitive, Bottom-Nav, Onboarding, AppContext
lib/            db.ts (Schema), auth.ts (Sessions, Passwörter, voter_hash), throttle.ts,
                storage.ts (Bild-Blobs), polls.ts (Auszählung), stufenliste.ts, types.ts, push.ts
public/         PWA-Manifest, Service Worker, Icons
data/           lokale SQLite-Datei und Account-Passwortliste (gitignored)
scripts/        genkeys.mjs, seed-accounts.mjs
```

## Deployment (Vercel + Turso)

1. Turso-DB anlegen, `TURSO_DATABASE_URL` und `TURSO_AUTH_TOKEN` als Vercel-Env-Variablen setzen.
2. VAPID-Keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) setzen.
3. `npm run seed:accounts` einmalig gegen die Produktions-DB ausführen (mit gesetzten Turso-Env-Variablen) und die Passwortliste sicher verteilen.

## Hinweise

- **Web-Push** braucht in Produktion HTTPS. Lokal funktioniert es in Chrome auf `localhost`.
- Next.js ist auf **14.2.35** gepinnt.
- DB lokal zurücksetzen: Server stoppen, `data/stufenportal.db*` löschen, neu starten.
