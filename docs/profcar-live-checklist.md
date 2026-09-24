# ProfCar Live-Checkliste

## 1. Regeln mit Michi bestätigen

- Exakter Name des Zielkalenders in Apple Kalender
- Dauer einer Probefahrt in Minuten
- Abstand zwischen angebotenen Startzeiten (mindestens so lang wie die Termindauer)
- Buchbare Wochentage und Zeitfenster
- Wie viele Tage im Voraus gebucht werden darf

## 2. Geheimnisse lokal eintragen

Im Projektordner in VS Code:

```sh
umask 077
touch .env.local
code .env.local
```

Dann die Namen aus `docs/profcar-env.example` übernehmen und die Werte ausschließlich direkt in VS Code eintragen. Für Apple wird ein separates App-spezifisches Passwort verwendet, nicht Michis normales Apple-Passwort.

## 3. Datenbank vorbereiten

Status 24.09.2026: Beide Migrationen wurden erfolgreich in der produktiven Supabase ausgeführt. Die vier geschützten ProfCar-Bereiche sind erreichbar.

Reihenfolge für weitere Umgebungen:

1. `supabase/migrations/202609170001_profcar_inventory.sql`
2. `supabase/migrations/202609240001_profcar_live_sync.sql`

## 4. mobile.de read-only prüfen

Status 24.09.2026: erfolgreich geprüft. `ProfCar-M.Profft`, Seller-ID `464113`. Die Seller API ist lesend freigeschaltet, enthält aber 729 aktive und historische Datensätze ohne Veröffentlichungsstatus. Die Search API ist für diese Zugangsdaten nicht freigeschaltet (`401`). Die öffentliche mobile.de-Händlerseite bestätigt 11 aktuelle Angebote (10 Pkw und 1 Transporter); diese IDs werden mit den vollständigen Seller-API-Daten abgeglichen.

```sh
npm run dev -- --hostname 127.0.0.1
```

Danach im Browser öffnen:

`http://127.0.0.1:3000/api/profcar/mobile-test`

Erwartet werden `ok: true`, der richtige Händler, die bestätigte Seller-ID, mindestens drei Musterfahrzeuge sowie Bilder und Preise. Der Endpunkt schreibt keine Daten.

## 5. Vollbestand synchronisieren

Status 24.09.2026: Nach Korrektur der Aktiv-Erkennung war der vollständige Lauf erfolgreich. Für Seller-ID `464113` sind 11 aktuelle Inserate gelistet und 718 historische Datensätze inaktiv; `/api/profcar/inventory` liefert `mode: live`, 11 Fahrzeuge sowie Preise und Bilder.

Weitere Läufe werden über den geschützten `/api/profcar/sync`-Endpunkt mit dem Bearer-Secret aus der Serverumgebung ausgelöst. Das Secret niemals in Shell-History, Screenshots oder Chatnachrichten kopieren.

## 6. Ende-zu-Ende-Test

- Fahrzeug aus mobile.de im Widget auswählen
- freien Kalenderslot anzeigen
- Probefahrt buchen
- Buchungs-ID im Interface sehen
- Termin in Michis Zielkalender kontrollieren
- denselben Request wiederholen: kein zweiter Termin
- belegten Slot wählen: Konflikt statt Bestätigung
- mobile.de-Zugriff vorübergehend fehlschlagen lassen: Bestand wird als `stale`, nicht als aktuell angezeigt
- CalDAV-Zugriff vorübergehend fehlschlagen lassen: keine Buchungsbestätigung anzeigen
