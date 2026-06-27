# Stufenportal - Projektkonzept und Designsystem

## Kurzbeschreibung

Das Stufenportal ist eine mobile-first PWA fuer die Selbstorganisation einer Abiturstufe. Es ersetzt verstreute WhatsApp-Chats, Google-Formulare, Tabellen, Kassenlisten, Umfragen und Einzelnotizen durch eine gemeinsame App fuer die ganze Stufe.

Die App ist fuer Abi '27 gedacht und konzentriert sich auf die Dinge, die im Schulalltag wirklich gebraucht werden: Heute-Uebersicht, Events, Eintragungslisten, News, Abstimmungen, Kasse, Abizeitung, Leaderboard und Sprecher-Verwaltung.

Das Produkt funktioniert bewusst ohne klassischen Account. Jede Person bekommt nur eine zufaellige lokale Geraete-ID. Namen werden nur dann abgefragt, wenn eine Funktion sie wirklich braucht, zum Beispiel bei Eintragungen, Kommentaren, Abizeitung-Beitraegen oder anonymen Abstimmungen mit Stufenlisten-Abgleich.

## Produktidee

Die Grundidee ist: Eine Stufe soll sich organisieren koennen, ohne dass wichtige Informationen in Chatverlaeufen verschwinden. Das Stufenportal ist kein soziales Netzwerk und keine Schulplattform im schweren Sinn, sondern ein kompakter, schneller Orga-Hub.

Wichtige Leitlinien:

- Alles Wichtige ist auf dem Handy in wenigen Sekunden erreichbar.
- Die Startseite beantwortet zuerst: Was ist heute wichtig?
- Sprecherinnen und Sprecher koennen verwalten, alle anderen koennen teilnehmen.
- Keine Registrierung, keine E-Mail, kein Passwort.
- Datenschutz durch minimale Identitaet statt durch komplizierte Konto-Logik.
- Oeffentliche Oberflaechen zeigen nur das, was fuer die jeweilige Funktion noetig ist.
- Planung und echte Buchungen bleiben sauber getrennt.
- Abstimmungen sollen einfach wirken, aber fair und missbrauchsarm sein.

## Zielgruppe

Primaere Nutzer:

- Schuelerinnen und Schueler der Abiturstufe.
- Stufensprecher und Orga-Team.
- Kassenwart bzw. Personen mit Sprecher-Rechten.
- Redaktion/Team fuer Abizeitung und Abschlussorga.

Typische Situationen:

- "Was steht heute an?"
- "Bis wann muss ich abstimmen?"
- "Wo trage ich mich ein?"
- "Wie viel Geld ist in der Kasse?"
- "Welche Events sind geplant?"
- "Wo lade ich ein Zitat oder Foto fuer die Abizeitung hoch?"
- "Welche Abstimmung ist offen und habe ich schon abgestimmt?"

## Informationsarchitektur

Die App ist um eine Bottom-Navigation gebaut:

- Heute
- Events
- Votes
- News
- Mehr

Weitere wichtige Bereiche liegen im Mehr-Tab:

- Kasse
- Leaderboard
- Abizeitung
- Einstellungen
- Farbthema
- Onboarding erneut ansehen
- Sprecher-Modus
- Verwaltung

Detailseiten nutzen kontextuelle Topbars mit Zurueck-Button, kleinem Kicker und Titel. Admin-Aktionen erscheinen nicht dauerhaft als laute UI, sondern kontextbezogen ueber kleine Aktionsbuttons und Bottom-Sheets.

## Design Language

### Gesamtgefuehl

Die App soll sich wie ein moderner, freundlicher Stufenplaner anfuehlen: klar, leicht verspielt, aber nicht kindisch. Sie ist bewusst nicht als sterile Admin-Tabelle gestaltet. Gleichzeitig soll sie bei taeglicher Nutzung ruhig genug sein, damit man schnell scannen kann.

Design-Werte:

- mobile-first
- kompakt, aber nicht gequetscht
- klare Hierarchien
- handliche Touch-Ziele
- plakative, aber gezielte Akzente
- viel echte Funktion statt Landingpage-Gefuehl
- keine Emoji-Abhaengigkeit, sondern Icon-System
- keine fake Phone-Statusbar in der Website

### Mobile Shell

Auf Desktop wird die App in einem Device-Frame angezeigt, damit das mobile Produkt sichtbar bleibt. Auf echten mobilen Viewports fuellt sie den gesamten Screen:

- Desktop: zentrierter App-Frame mit weichem Schatten.
- Mobile: 100dvh, keine Aussenraender, keine Geraete-Rundung.
- Bottom-Nav bleibt konstant erreichbar.
- Inhalt scrollt nur im App-Content, nicht im gesamten Browserlayout.
- Onboarding ist fullscreen und sperrt Body-Scroll.

### Farben

Light Mode ist Standard. Dark Mode bleibt erhalten, wenn er gespeichert wurde.

Die App nutzt CSS-Variablen statt fest verdrahteter Farben. Dadurch koennen Farbthemen live gewechselt werden.

Aktuelle Farbthemen:

- Stufe: warmes Papier, dunkles Petrol, roter Akzent, gelber Pop.
- Tinte: helles Blau-Grau, dunkle Tinte, roter Akzent, cyanfarbener Pop.
- Beere: sanftes rosa Papier, dunkles Beeren-Ink, gruenlicher Akzent, pinker Pop.
- Hain: gruenlich-warmes Papier, Wald-Ink, rostiger Akzent, lindgruener Pop.

Farbrollen:

- `--paper`: App-Hintergrund.
- `--card`: Kartenflaechen.
- `--soft`: subtile Flaechen.
- `--ink`: Primaertext und Konturen.
- `--muted`: sekundaerer Text.
- `--line`: Grenzen und feine Trennung.
- `--accent`: Hauptaktion, aktive States, Dringlichkeit.
- `--pop`: plakative Hervorhebung, Labels, Datumspins.
- `--dark` und `--dark2`: dunkle Hero-/KPI-Flaechen.

### Typografie

Die App nutzt zwei typografische Ebenen:

- UI-Schrift fuer Navigation, Tabellen, Inputs und kleine Labels.
- Display-Schrift fuer Seitentitel, grosse Zahlen, Hero-Titel und starke Karten.

Regeln:

- Grosse Display-Typo nur fuer echte Titel, KPIs und Heroes.
- Kompakte Panels verwenden kleinere, dichtere Hierarchien.
- Keine negative Letter-Spacing.
- Lange Texte duerfen umbrechen und sollen nicht abgeschnitten werden.
- Labels und Kicker sind uppercase, klein und mit mehr Letter-Spacing.

### Layout-Muster

Wiederkehrende Patterns:

- KPI-Hero auf Heute mit drei klaren Zahlen.
- Date-Bubbles fuer Fristen und Events.
- Karten mit sichtbarer Funktion, nicht als reine Deko.
- Bottom-Sheets fuer Erstellen, Bearbeiten, Admin-Aktionen und schnelle Formulare.
- Chips fuer Status, Kategorien und Poll-Methoden.
- Fortschrittssegmente fuer Events und Abstimmungen.
- Podium plus Liste fuer Leaderboard.
- Masonry-/Scrapbook-Anmutung fuer Abizeitung.
- Finance-Dashboard fuer Kasse.

Karten sind abgerundet, aber nicht beliebig weich. Es gibt keine verschachtelten Karten als Standardlayout. Sektionen sollen eher wie eigenstaendige Flaechen oder Listen wirken.

### Icons statt Emojis

Die Website soll keine Emojis als UI-Elemente nutzen. Funktionen, Tabs, Admin-Aktionen und Statusanzeigen verwenden das bestehende Icon-System. Das macht die UI konsistenter, klarer und weniger zufaellig.

### Bewegung

Animationen sind subtil:

- sanftes Einblenden von Seiteninhalten
- Bottom-Sheet-Slide
- kleine Active-Scale-States bei Buttons
- Theme-/Step-Transitions im Onboarding
- keine aufdringlichen Bounce-Effekte

## Onboarding

Das Onboarding ist fullscreen, mobile-first und nicht scrollbasiert. Es nutzt eine feste untere Weiter-Aktion, einen Fortschrittsindikator oben und klare kurze Texte pro Schritt.

Aktuelle Struktur:

1. Alles auf einen Blick  
   Erklaert die Heute-Seite als zentrale Startansicht fuer Fristen, Events und offene Abstimmungen.

2. Dein Farbthema  
   Nutzerinnen und Nutzer waehlen ein Farbthema. Eine kleine Startseiten-Vorschau veraendert sich direkt mit der Auswahl.

3. Events & Eintragen  
   Erklaert Events, Meilensteine, Eintragungslisten, Wartelisten und Kommentare.

4. Abstimmen - fair  
   Erklaert Single-, Mehrfach- und Ranking-Abstimmungen sowie den anonymen Stufenlisten-Abgleich.

5. Kein Account noetig  
   Erklaert die lokale Geraete-ID und dass Namen nur funktionsbezogen abgefragt werden.

Prinzipien:

- kein notwendiges Scrollen auf typischen Mobile-Hoehen
- kurze, klare Texte
- visuelle Icons und Theme-Vorschau statt langer Erklaertexte
- jederzeit ueberspringbar
- kann im Mehr-Tab erneut gestartet werden

## Heute

Heute ist die Startseite und das taegliche Dashboard.

Elemente:

- Begruessung mit Datum.
- KPI-Hero mit offenen Votes, Events bald und dringenden Punkten.
- Angepinnte bzw. befoerderte News.
- Dringend-Bereich fuer dringende News und Poll-/Event-Fristen in den naechsten 3 Tagen.
- Offene Abstimmungen mit Stimmzahl, Vote-Chip und Frist, falls vorhanden.
- Kommende Events mit Datum und Fortschritt.

Wichtig:

- Offene Abstimmungen werden unabhaengig von einer Frist angezeigt.
- `dringend` ist kein Synonym fuer alle offenen Votes, sondern fuer echte dringende News und nahe Fristen.
- Wenn nichts ansteht, zeigt Heute einen ruhigen Empty-State.

## Events

Events bilden alles ab, was die Stufe organisiert: Stufenfoto, Mottowoche, Abiball, Bestellungen, Treffen oder andere Orga-Termine.

Uebersicht:

- naechstes Event als prominenter Hero
- Eventkarten mit Datum, Status und Meilensteinfortschritt
- Gruppierung/Sortierung nach Status und Datum
- klare visuelle Trennung von Planung, aktiven Events und abgeschlossenen Events

Detailseite:

- Titel, Beschreibung, Datum, Status
- Meilensteine mit Done-State
- Eintragungslisten
- Slots mit Kapazitaet
- automatische Warteliste
- Kommentare
- optionales Kassenziel

Sprecher-Funktionen:

- Event erstellen
- Event bearbeiten
- Status aendern
- Meilensteine erstellen und abhaken
- Listen und Slots verwalten
- Event loeschen bzw. in Papierkorb legen

## Event-Kassenziele

Events koennen ein optionales ungefaehres Geldziel haben.

Beispiele:

- "Abiball Deko: 400 Euro"
- "Stufenfoto Druck: 250 Euro"
- "Foerderverein-Spendenziel: 1000 Euro"

Regeln:

- Kassenziele sind Planwerte, keine echten Buchungen.
- Sie werden als Cent-Betraege gespeichert.
- Leere oder 0-Werte werden als kein Ziel behandelt.
- Nur Sprecher/Admins koennen Ziele setzen oder aendern.
- Die Detailseite zeigt das Ziel beim Event.
- Die Kasse zeigt alle geplanten Event-Ziele separat.
- Kassenziele beeinflussen Kassenstand, Einnahmen und Ausgaben nicht.

## News

News sind kurze, offizielle Updates fuer die Stufe.

Funktionen:

- Titel
- Text
- Kategorie
- Prioritaet: normal, wichtig, dringend
- Status: Entwurf, veroeffentlicht, versteckt/archiviert
- Auf Heute befoerdern
- Push bei wichtigen oder dringenden News
- Admin-Bearbeitung ueber Bottom-Sheet

Darstellung:

- News-Seite mit Filterchips.
- Dringende News erhalten klare rote Akzente.
- Angepinnte News koennen auf Heute prominent erscheinen.
- Normale News bleiben ruhig und scanbar.

## Abstimmungen

Abstimmungen sind einer der Kernbereiche.

Methoden:

- Single Choice: eine Option.
- Approval/Mehrfach: mehrere Optionen.
- Ranked Voting: Prioritaeten in Reihenfolge.

Ranking:

- Ranked Voting nutzt Borda-Punkte.
- Creator kann festlegen, wie viele Prioritaeten gesetzt werden muessen.
- Maximal sind alle Optionen moeglich.
- Bei aktivem Veto ist das Maximum Optionen minus 1.
- Optionales Veto: pro Person genau ein Veto, wenn aktiviert.
- Vetos werden separat gezaehlt und nicht als Anti-Vote in die Punkte gerechnet.

Ergebnisse:

- Ergebnisbereich zeigt zuerst die Top 3.
- Per Button koennen alle Ergebnisse angezeigt werden.
- Fuehrende Option wird als ruhiger Hero dargestellt.
- Lange Antwortmoeglichkeiten brechen sauber um und werden nicht abgeschnitten.
- Bei anonymen Abstimmungen koennen Ergebnisse ab einer Mindestanzahl sichtbar sein.
- Ergebnisse koennen live oder erst nach Schluss sichtbar sein.

Fristen:

- Polls koennen eine Deadline haben.
- Abgelaufene offene Polls werden serverseitig automatisch geschlossen.
- Quorum kann Polls invalid machen, wenn zu wenige Stimmen eingegangen sind.

## Anonyme Abstimmungen und Stufenlisten-Abgleich

Anonyme Abstimmungen sollen zwei Dinge gleichzeitig schaffen:

- Die Auswahl bleibt anonym.
- Jede Person aus der Stufe kann nur einmal abstimmen.

Dafuer gibt die abstimmende Person ihren Namen ein. Dieser Name wird nicht oeffentlich angezeigt und nicht neben der Auswahl gespeichert. Server-seitig wird er gegen eine Stufenliste geprueft.

Aktuelle Stufenliste:

- 99 Personen.
- Bereinigte Liste statt OCR-Fehlerliste.
- Namen werden mit Vorname, Nachname oder vollem Namen akzeptiert.
- Gross-/Kleinschreibung ist egal.
- Umlaute und Sonderzeichen werden normalisiert.
- Einige offensichtliche OCR-/Tippvarianten sind als Aliase hinterlegt, zum Beispiel Iulia/lulia, Ioanna/loanna, Ali/All.

Technisches Prinzip:

- Jede anonyme Abstimmung bekommt eine eigene Roster-Liste.
- Diese Liste besteht aus `poll_roster_entries` und `poll_roster_aliases`.
- Beim Abstimmen wird der Name zu einem Roster-Eintrag aufgeloest.
- Der Roster-Eintrag wird fuer diese Poll als benutzt markiert.
- Der Ballot speichert keinen Klartextnamen.
- Stattdessen wird ein Hash aus Poll-Secret und Roster-Eintrag genutzt.
- Dadurch ist "ein Name pro Poll nur einmal" garantiert.
- Gleichzeitig bleibt jede Abstimmung individuell: Eine Person kann bei Poll A abstimmen und bei Poll B wieder neu.

Sync fuer bestehende Polls:

- Bestehende anonyme Abstimmungen koennen alte Snapshot-Daten haben.
- Beim naechsten Namensabgleich wird der Poll-Snapshot mit der aktuellen Stufenliste synchronisiert.
- Bereits benutzte Eintraege sollen erhalten bleiben.
- Neue/corrected Namen und Aliase werden nachgezogen.

Namenskonflikte:

- Wenn ein Name schon als benutzt gilt, aber die Person nicht abgestimmt hat, kann sie einen Konflikt melden.
- Die Meldung enthaelt die betroffene Abstimmung und den eingegebenen Namen.
- Die Auswahl bleibt weiterhin privat.
- Sprecher koennen gemeldete Konflikte in der Verwaltung ansehen und bearbeiten.

## Kasse

Die Kasse trennt strikt echte Geldbewegungen von Planwerten.

Echte Werte:

- Kassenstand
- Einnahmen
- Ausgaben
- Kassenbuch
- Kategorie
- Beschreibung
- Datum
- Betrag
- optional `paid_by`

Sichtbarkeit:

- Normale Nutzer sehen Kassenstand und Buchungen ohne sensible Zahlerdetails.
- Sprecher/Kassenwart sieht `paid_by`.
- API entfernt `paid_by` fuer Nicht-Admins serverseitig, nicht nur im UI.

Geplante Event-Ziele:

- Eigener Abschnitt "Geplante Event-Ziele".
- Gesamtbetrag aller offenen/nicht erledigten Ziele.
- Liste der Events mit Zielbetrag und optionaler Notiz.
- Nicht in Kassenstand, Einnahmen oder Ausgaben eingerechnet.

## Abizeitung

Die Abizeitung sammelt Material fuer spaetere Redaktion.

Beitragstypen:

- Zitate
- Schnappschuesse/Fotos
- Bildunterschriften
- kurze Sprueche
- optionaler Autorname
- optionaler zitierter Name

Darstellung:

- Scrapbook-/Masonry-Gefuehl.
- Zitatkarten mit visueller Markierung.
- Bildkarten mit Tape-/Foto-Anmutung.
- Upload-CTA als deutlich sichtbarer Einreichbereich.

Wichtige Regel:

- Lehrernamen bzw. `quoted_name` bleiben in den Daten erhalten.
- Sie werden vorerst nicht oeffentlich unter Zitaten angezeigt.
- Dadurch gehen Daten nicht verloren, aber die oeffentliche UI bleibt vorsichtig.

Rechte:

- Eigene Beitraege koennen entfernt werden.
- Sprecher koennen alle Einreichungen entfernen bzw. moderieren.

## Leaderboard

Das Leaderboard ist freiwillig und opt-in.

Prinzipien:

- Niemand erscheint automatisch.
- Nutzer muessen ihren Namen setzen und Sichtbarkeit aktivieren.
- Sprecher koennen Punkte mit Grund vergeben.
- Personen mit 0 Punkten erscheinen, wenn sie opt-in sind.
- Punktehistorie bleibt nachvollziehbar.

Deduping:

- Doppelte Namen werden zusammengefuehrt.
- Vergleich ist case-insensitive.
- Umlaute/Akzente werden normalisiert.
- Wortreihenfolge wird ignoriert, damit `Max Mueller` und `Mueller Max` zusammenfallen.
- Bei Duplikaten bleibt der Eintrag mit mehr Punkten.
- Bei Gleichstand ist die Auswahl deterministisch; der aktuelle Nutzer kann bevorzugt als `mine` markiert werden.

Darstellung:

- Top 3 als Podium.
- Danach kompakte Rangliste.
- Eigener Eintrag kann markiert werden.

## Mehr

Der Mehr-Tab ist die Werkzeug- und Einstellungsseite.

Enthaelt:

- Kasse
- Leaderboard
- Abizeitung
- Verwaltung
- Farbthema
- Light/Dark Mode
- Name speichern
- Leaderboard opt-in/opt-out
- Push-Benachrichtigungen
- Onboarding erneut starten
- Sprecher-Modus aktivieren oder verlassen

Der Mehr-Tab soll nicht wie ein Restemenue wirken, sondern wie ein klarer Werkzeugbereich.

## Sprecher-Modus und Verwaltung

Sprecher-Modus wird per Code aktiviert und serverseitig geprueft.

Sprecher koennen:

- Events erstellen, bearbeiten und loeschen.
- Meilensteine verwalten.
- Eintragungslisten und Slots verwalten.
- News erstellen, bearbeiten, hervorheben und loeschen.
- Abstimmungen erstellen, schliessen, wieder oeffnen oder loeschen.
- Kassenbuchungen erstellen und loeschen.
- Punkte vergeben.
- Abizeitungseinreichungen moderieren.
- Papierkorb einsehen.
- geloeschte Inhalte wiederherstellen.
- Namenskonflikte bei anonymen Abstimmungen bearbeiten.

Loeschungen sind in der Regel Soft-Deletes. Inhalte verschwinden aus der oeffentlichen UI, bleiben aber fuer Wiederherstellung/Verwaltung erhalten.

## Datenschutz und Identitaet

Die App vermeidet klassische Accounts.

Gespeichert/benutzt:

- zufaellige Geraete-ID
- lokaler Name, wenn gesetzt
- lokale Theme- und Onboarding-Preferences
- funktionsbezogene Namen bei Eintragungen, Kommentaren, Abizeitung oder anonymem Poll-Abgleich

Nicht noetig:

- E-Mail
- Passwort
- Login-Konto
- oeffentliche Klarnamen fuer alle Aktionen

Anonyme Abstimmungen:

- Klartextname wird fuer den Abgleich genutzt.
- Auswahl wird nicht mit dem Namen veroeffentlicht.
- Ballot nutzt fuer anonyme Polls einen Hash.
- Pro Poll gibt es eine individuelle Roster-Liste.
- Jede Poll hat dadurch eine eigene "wer hat schon abgestimmt"-Liste.

## Technisches Konzept

Stack:

- Next.js App Router
- TypeScript
- Route Handler als Backend-API
- Turso/libSQL bzw. SQLite-kompatible Datenschicht
- serverseitige Migrationen beim Start
- PWA-Metadaten
- Web Push via VAPID
- lokale Uploads fuer Abizeitung-Bilder
- gemeinsame Typen in `lib/types.ts`

Datenbankbereiche:

- Events
- Milestones
- Signup-Listen
- Slots
- Signups
- News
- Polls
- Poll-Options
- Ballots
- Vote-Items
- Poll-Roster-Entries
- Poll-Roster-Aliases
- Anonymous Vote Name Flags
- Ledger
- Comments
- Abizeitung Entries
- Push Subscriptions
- Members
- Point Events

Migrationsprinzip:

- Tabellen werden per `CREATE TABLE IF NOT EXISTS` angelegt.
- Neue Spalten werden mit `addColumnIfMissing` Turso-sicher nachgezogen.
- Features wie Event-Kassenziele und Ranked-Voting-Konfiguration sind migrationsfaehig eingebaut.

## API- und Rechteprinzipien

Oeffentliche APIs liefern nur Daten, die fuer die normale UI noetig sind.

Admin-geschuetzte Aktionen:

- Content erstellen/bearbeiten/loeschen.
- Kassenbuchungen mit sensiblen Details.
- Punkte vergeben.
- Papierkorb und Wiederherstellung.
- Namenskonflikte verwalten.

Serverseitige Regeln:

- Admin wird in API-Routen geprueft.
- Client-UI ist nur Komfort, keine Sicherheitsgrenze.
- Fristen bei Polls werden serverseitig auto-geschlossen.
- `paid_by` wird fuer Nicht-Admins serverseitig entfernt.
- Anonyme Namen werden serverseitig gegen die Stufenliste validiert.

## Aktueller Funktionsumfang

Aktuell umgesetzt:

- mobile App-Shell mit Bottom-Nav
- Light Mode als Default, Dark Mode persistiert
- Farbthemen: Stufe, Tinte, Beere, Hain
- fullscreen Onboarding mit Theme-Auswahl
- Heute-Dashboard
- Events mit Meilensteinen, Signups, Warteliste und Kommentaren
- Event-Kassenziele
- News mit Prioritaet, Kategorien, Push und Heute-Promotion
- Abstimmungen: Single, Approval, Ranked
- Ranking-Prioritaeten und optionales Veto
- anonyme Polls mit korrekter Stufenliste und Snapshot-Sync
- Namenskonflikt melden
- Ergebnis-Top-3 mit Expand
- Kasse mit echten Buchungen und separaten geplanten Zielen
- Abizeitung mit Zitaten und Bild-Uploads
- oeffentlich versteckte Lehrernamen bei Zitaten
- Leaderboard mit Opt-in, 0-Punkte-Sichtbarkeit und Deduping
- Mehr-Tab als Werkzeug-/Einstellungszentrale
- Sprecher-Modus
- Papierkorb und Restore

## UX-Ziele fuer weitere Iterationen

Naechste sinnvolle Verbesserungen:

- Heute noch staerker nach "muss ich etwas tun?" priorisieren.
- Events weiter Richtung Kalender-/Timeline-Visualisierung schieben.
- News-Detailansicht und Kommentare weiter polishen.
- Poll-Erstellung fuer Sprecher noch gefuehrter machen.
- Abizeitung-Moderation ausbauen.
- Kassen-Export oder Monatsansicht ergaenzen.
- Offline-/Loading-States konsistenter machen.
- Mehr echte Tests fuer Poll-Roster, Leaderboard-Deduping und Ledger-Ziele.
