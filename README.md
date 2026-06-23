# Stufenportal

PWA für die Selbstorganisation einer Schul-Stufe: **Heute-Digest · Events mit Meilensteinen & Eintragungslisten · News mit Push · Abstimmungen · transparente Kasse · Sprecher-/Admin-Kern**. Mobile-first, Dark Mode als Heimat.

Gebaut nach `project.md` / `CLAUDE.md` (v1-Scope) — mit zwei bewussten Anpassungen:

1. **Keine Anmeldung, keine Profile.** Man muss **keinen Namen und keine Mail** angeben. Statt Accounts:
   - **Anonyme Geräte-ID** (zufällig, im `localStorage`) — nur für „eine Stimme / ein Listen-Eintrag pro Gerät" und Eigentümerschaft eigener Einträge. Keine Personendaten.
   - Optionaler **Anzeige-Name pro Aktion** (z. B. beim Listen-Eintrag), Default „Anonym".
   - **Sprecher-Rechte** schaltest du per **Admin-Code** frei (serverseitig geprüft) statt per Rollen-Account.
2. **Backend lokal statt Supabase.** Die Spec will Supabase (EU). Ohne deinen Supabase-Account kann ich kein Projekt anlegen, darum läuft das Backend als **Next.js Route Handler + echte SQLite-DB** (`data/stufenportal.db`). Voll funktionsfähig, persistent, Rechte serverseitig erzwungen. Die Datenschicht ist gekapselt (`lib/db.ts`), ein späterer Umzug auf Supabase/Postgres ist dadurch überschaubar.

## Starten

```bash
npm install
npm run keys     # erzeugt .env.local (Admin-Code + VAPID-Keys) — nur beim ersten Mal
npm run dev      # http://localhost:3000
```

Die DB wird beim ersten Start automatisch angelegt und startet **leer**. Für Demo-Inhalte
(Kuchenverkauf, Abiball, zwei Abstimmungen, Kasse) `SP_SEED=true` in `.env.local` setzen.

### Sprecher-Modus

In der App: **Mehr → Sprecher-Modus → Freischalten**, Code eingeben.
Standard-Code: **`stufe2026`** (in `.env.local` als `ADMIN_CODE` änderbar).
Erst dann erscheinen „+ Neu", die `⋯`-Aktionen, Abhaken, Befördern, Sichtbarkeit, Soft-Delete und die Verwaltung.

## Was funktioniert (echt, kein Mockup)

- **Heute** — priorisierter Digest: beförderte News → Dringendes → kommende Events → offene Polls (gekürzt).
- **Events** — Status & Fortschritt, Meilensteine (abhakbar), Eintragungslisten mit Slots, Kapazität, Warteliste (rückt automatisch nach), Kommentare.
- **News** — Priorität, Status `draft/published/hidden/archived`, „auf Heute befördern" (max. 3), **Web-Push** bei wichtig/dringend.
- **Abstimmungen** — Single Choice, Approval, Ranked (**Borda**). Anonym/offen, reveal live/nach Schluss, Frist (serverseitig erzwungen), `result_visibility_min` (Default 5) gegen De-Anonymisierung. Optionen eingefroren nach erster Stimme.
- **Kasse** — Kassenbuch & großer Kassenstand. `paid_by` ist **nur im Sprecher-Modus** sichtbar (serverseitig, nicht nur im UI).
- **Admin-Kern** — Inline-`⋯`-Bottom-Sheets, Verwaltung mit **Papierkorb** (Soft-Delete → Wiederherstellen / endgültig löschen).
- **Identität & Leaderboard** — kein Login: Name nur inline beim Eintragen/Kommentieren, lokal gemerkt. Wer mitmacht, wird „bekannt" und kann von Sprechern **Punkte** (mit Grund) bekommen. Das **Leaderboard ist opt-in** (Default aus) — nur wer sich sichtbar schaltet, erscheint.

### Datenschutz-Eigenschaften (umgesetzt)

- Anonyme Polls speichern **keinen** `user_id`/Geräte-Bezug, sondern `voter_hash = HMAC(poll_secret, device_id)` → Doppelstimmen verhindert, Identität nicht ableitbar, über Polls hinweg nicht korrelierbar.
- Soft-Delete überall (`deleted_at`), nichts wird hart entfernt.
- Push läuft selbst gehostet über VAPID (web-push), keine Drittanbieter.

## Befehle

```bash
npm run dev      # Entwicklung
npm run build    # Production-Build
npm run start    # Production-Server
npm run keys     # .env.local neu erzeugen (nur wenn nicht vorhanden)
```

## Struktur

```
app/            Seiten (Heute, Events, Polls, News, Kasse, Mehr, Verwaltung) + API-Routen
components/     UI-Primitive (Karte, Bottom-Sheet, Meilenstein-Leiste, …), Bottom-Nav, Kontext
lib/            db.ts (Schema+Seed), auth.ts (Admin-Cookie, Geräte-ID, voter_hash),
                polls.ts (Auszählung), format.ts, types.ts, push.ts, client.ts
public/         PWA-Manifest, Service Worker, Icons
data/           SQLite-Datei (gitignored)
```

## Hinweise

- **Web-Push** braucht in Produktion HTTPS. Lokal funktioniert es in Chrome auf `localhost`. „Push aktivieren" findest du unter **Mehr**.
- Next.js ist auf der gepatchten **14.2.35** gepinnt. Die noch offenen npm-Advisories verlangen einen Sprung auf Next 16 (Breaking) und betreffen v. a. Self-Hosting-DoS/Cache-Themen — bewusst nicht in diesem v1 gemacht.
- DB zurücksetzen: Server stoppen, `data/stufenportal.db*` löschen, neu starten (startet leer; mit `SP_SEED=true` wieder mit Demo-Daten).
