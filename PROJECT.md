# Stufenportal - Projektkonzept

## Kurzbeschreibung

Das Stufenportal ist eine mobile-first PWA fuer die Selbstorganisation einer Abiturstufe. Es buendelt alles, was sonst in Chats, Tabellen, Umfragen und einzelnen Notizen verstreut liegt: Tagesuebersicht, Events, Eintragungslisten, News, Abstimmungen, Kasse, Abizeitung, Leaderboard und Sprecher-Verwaltung.

Die App funktioniert bewusst ohne klassischen Account. Nutzerinnen und Nutzer haben nur eine lokale, zufaellige Geraete-ID. Namen werden nur dort abgefragt, wo sie fuer eine Funktion noetig sind, zum Beispiel bei Eintragungslisten, Kommentaren, Abizeitung-Beitraegen oder anonymen Abstimmungen mit Stufenlisten-Abgleich. Der Sprecher-Modus wird per Code freigeschaltet und serverseitig geprueft.

## Leitidee

- Eine zentrale App statt vieler einzelner Chatverlaeufe und Listen.
- Mobile Nutzung zuerst: schnelle Aktionen, klare Navigation, Bottom-Nav.
- Wenig Huerden: keine Registrierung, keine Mail, kein Passwort.
- Datenschutz durch sparsame Identitaet und serverseitige Rechtepruefung.
- Sprecher-Team kann verwalten, alle anderen koennen mitmachen.
- Light Mode ist Standard, Dark Mode bleibt als gespeicherte Einstellung moeglich.

## Hauptfunktionen

### Heute

- Tages-Digest als Startseite.
- Zeigt befoerderte News, dringende Fristen, kommende Events und offene Abstimmungen.
- Kompakte Kennzahlen fuer Dringendes, Events und Votes.
- Direkte Links zu den relevanten Detailseiten.

### Events

- Event-Uebersicht mit Datum-/Status-Gruppierung.
- Event-Detailseiten mit Beschreibung, Status und Fortschritt.
- Meilensteine koennen im Sprecher-Modus erstellt und abgehakt werden.
- Eintragungslisten mit Slots, Kapazitaeten und Warteliste.
- Wartelisten ruecken automatisch nach, wenn ein Platz frei wird.
- Kommentare pro Event.
- Optionale Kassenziele pro Event als Planwert.
- Kassenziele werden nicht als echte Buchung gerechnet.

### News

- News mit Titel, Text, Kategorie und Prioritaet.
- Status: Entwurf, veroeffentlicht, versteckt, archiviert.
- Wichtige News koennen auf der Heute-Seite hervorgehoben werden.
- Push-Benachrichtigungen fuer wichtige oder dringende News.
- Sprecher koennen News bearbeiten, verstecken, befoerdern oder loeschen.

### Abstimmungen

- Single Choice, Approval und Ranked Voting.
- Ranked Voting nutzt Borda-Punkte.
- Optionales Veto bei Prio-Wahlen, separat gezaehlt.
- Fristen werden serverseitig erzwungen.
- Ergebnisse koennen live oder erst nach Schluss sichtbar sein.
- Ergebnisse zeigen zuerst die Top 3 und koennen erweitert werden.
- Anonyme Abstimmungen nutzen eine eigene Stufenlisten-Kopie pro Abstimmung.
- Bei anonymen Abstimmungen wird ein Name eingegeben, aber nicht oeffentlich angezeigt.
- Der Name wird serverseitig gegen die Stufenliste geprueft.
- Gross-/Kleinschreibung, Vorname, Nachname oder voller Name werden tolerant abgeglichen.
- Ein Name kann pro Abstimmung nur einmal abstimmen.
- Falls ein Name faelschlich als benutzt gilt, kann ein Namenskonflikt gemeldet werden.

### Kasse

- Kassenstand mit echten Einnahmen und Ausgaben.
- Kassenbuch mit Datum, Kategorie, Beschreibung und Betrag.
- `paid_by` ist nur im Sprecher-Modus sichtbar.
- Event-Kassenziele werden separat als geplante Ziele angezeigt.
- Geplante Ziele veraendern den echten Kassenstand nicht.

### Abizeitung

- Beitraege fuer die Abizeitung sammeln.
- Zitate, Bilder, Bildunterschriften und optionale Namen.
- Bilder werden hochgeladen und in der App angezeigt.
- Lehrernamen bzw. `quoted_name` bleiben gespeichert, werden aber vorerst nicht oeffentlich unter Zitaten angezeigt.
- Eigene Beitraege und Sprecher koennen Einreichungen entfernen.

### Leaderboard

- Freiwilliges Opt-in: Niemand erscheint automatisch oeffentlich.
- Sprecher koennen bekannten Mitgliedern Punkte mit Grund vergeben.
- Personen mit 0 Punkten erscheinen, wenn sie opt-in sind.
- Doppelte Namen werden zusammengefuehrt.
- Namensvergleich ist tolerant gegen Gross-/Kleinschreibung, Umlaute und Wortreihenfolge.
- Bei Duplikaten bleibt der Eintrag mit mehr Punkten erhalten.

### Mehr

- Zentrale Werkzeugseite fuer Kasse, Leaderboard, Abizeitung, News und Verwaltung.
- Eigener Name und Leaderboard-Sichtbarkeit koennen verwaltet werden.
- Push-Benachrichtigungen koennen aktiviert werden.
- Light/Dark Mode kann gewechselt werden.
- Onboarding kann erneut gestartet werden.
- Sprecher-Modus kann freigeschaltet oder verlassen werden.

### Onboarding

- Dreiteiliges Onboarding:
  1. Heute, Events und Abstimmungen als Swipe-Karussell.
  2. Mehr-Tab mit den wichtigsten Werkzeugen.
  3. Name, Datenschutz und anonyme Abstimmungen.
- Auf Mobile fullscreen und ohne notwendiges Scrollen.
- Erklaert die App knapp, ohne die Nutzung zu blockieren.

### Sprecher-Verwaltung

- Codebasierter Sprecher-Modus.
- Admin-Aktionen erscheinen kontextbezogen ueber Buttons und Bottom-Sheets.
- Papierkorb mit Soft-Delete und Wiederherstellung.
- Verwaltung von geloeschten Inhalten und gemeldeten Namenskonflikten.

## Datenschutz und Rechte

- Keine klassische Registrierung.
- Keine E-Mail und kein Passwort.
- Lokale Geraete-ID fuer Doppelvermeidung und Besitz eigener Eintraege.
- Admin-Rechte werden serverseitig in API-Routen geprueft.
- Anonyme Abstimmungen speichern keinen Klartextnamen in der Stimme.
- Soft-Delete statt sofortiger harter Loeschung.
- Oeffentliche UI zeigt nur Daten, die fuer die jeweilige Funktion gebraucht werden.

## Technisches Konzept

- Next.js App Router als PWA.
- Route Handler als Backend-API.
- Turso/libSQL bzw. SQLite-kompatible Datenschicht.
- Server-seitige Migrationen beim Start.
- Web Push ueber VAPID.
- Lokale Uploads fuer Abizeitung-Bilder.
- Gemeinsame TypeScript-Typen fuer API und Client.
