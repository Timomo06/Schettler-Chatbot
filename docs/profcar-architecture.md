# ProfCar: mobile.de-Bestand und Apple-Kalender

Stand: 24.09.2026. Die Supabase-Migrationen sind produktiv angewandt und der erste mobile.de-Vollsync ist erfolgreich. Die Codeänderungen müssen noch veröffentlicht und die fehlenden Servervariablen sowie der Scheduler in der Deployment-Umgebung gesetzt werden.

## Gemeinsamer Fahrzeugbestand

- `src/lib/profcar/mobile-client.ts` liest ausschließlich per `GET`: Händlerliste und vollständige Fahrzeugdaten kommen aus der Seller API. Da dieser Zugang auch alte, nicht veröffentlichte Datensätze ohne Aktivstatus liefert, werden die aktuell sichtbaren IDs fail-closed mit dem stündlich aus der Search API erzeugten Fahrzeugcache der ProfCar-Website abgeglichen. Ist der Cache älter als drei Stunden, schlägt der Abgleich bewusst fehl. Ohne konfigurierte Cache-URL bleibt die öffentliche mobile.de-Händlerseite als Rückfallweg erhalten.
- `src/lib/profcar/mobile-mapper.ts` normalisiert jede Anzeige in das einheitliche `ProfCarVehicle`-Modell. Rohdaten und öffentliche Daten bleiben getrennt.
- `src/lib/profcar/inventory.ts` lehnt unvollständige, fehlerhafte, doppelte oder händlerfremde Snapshots ab. Nur ein vollständiger Lauf darf den Bestand umschalten. Fehlende Inserate werden als inaktiv markiert; ProfCar-eigene Zusatzdaten bleiben erhalten.
- `src/lib/profcar/supabase-repository.ts` und `supabase/migrations/202609240001_profcar_live_sync.sql` speichern den Gesamtbestand atomar mit Revisionsprüfung. Die Migration setzt `202609170001_profcar_inventory.sql` voraus.
- `GET /api/profcar/inventory` liefert nur normalisierte öffentliche Daten. Der Status ist ausdrücklich `live`, `stale` oder `demo`. Bei fehlgeschlagenem Sync darf der vorherige Bestand nicht als aktuell bezeichnet werden.
- Das ProfCar-Widget, der Textchat und die Sprachsession laden denselben serverseitigen Bestand. Freie Inseratstexte dienen nur der serverseitigen Suche und werden wegen möglicher Prompt-Injection nicht an das Modell weitergegeben.
- `GET /api/profcar/mobile-test` ist nur lokal im Development-Modus erreichbar und schreibt nichts. `GET`/`POST /api/profcar/sync` ist mit einem Bearer-Secret geschützt und schreibt nur nach vollständiger Validierung.

Am 24.09.2026 wurde der rein lesende Test mit den vorhandenen lokalen Zugangsdaten wiederholt: Händler `ProfCar-M.Profft`, Seller-ID `464113`, Seller-API-Lesezugriff. Die Seller API liefert 729 aktive und historische Datensätze; die Search API ist für diese Zugangsdaten nicht freigeschaltet (`401`). Die öffentliche Händlerseite zeigt 10 Pkw und einen Transporter. Nach der Gegenprüfung wurde der produktive Bestand auf 11 gelistete und 718 inaktive Fahrzeuge korrigiert; der Status ist `live`, Revision 2. Alle 11 aktuellen Fahrzeuge enthalten Preis und Bilder.

## Gemeinsamer Terminablauf

- `src/lib/calendar/apple-booking.ts` enthält die gemeinsame serverseitige CalDAV-Logik.
- `GET /api/profcar/availability?date=YYYY-MM-DD` liest Michis Zielkalender und liefert nur freie, regelkonforme Zeiten in `Europe/Berlin`.
- `POST /api/create-event` prüft unmittelbar vor dem Schreiben erneut. Erst ein bestätigter CalDAV-Schreibvorgang führt zu einer Erfolgsantwort.
- Jede Buchung erhält eine stabile Buchungs-ID. Der identische Zeitraum verwendet serverübergreifend denselben CalDAV-Ressourcennamen mit `If-None-Match: *`; wiederholte identische Requests sind idempotent, konkurrierende Requests erhalten einen Konflikt.
- Für ProfCar sind Zielkalender, Terminlänge, Puffer und Wochenfenster Pflicht. Eine Probefahrt dauert 60 Minuten; danach bleiben 30 Minuten frei. Name, E-Mail-Adresse und Telefonnummer sind Pflichtangaben.
- Das ProfCar-Formular, Textchat und Sprache verwenden alle `/api/create-event`. `checkOnly` schreibt keinen Termin.

## Noch notwendige Aktivierung

1. Alle Variablen aus `docs/profcar-env.example` direkt in `.env.local` und in der Deployment-Umgebung setzen. Keine Zugangsdaten committen oder in Chats einfügen.
2. Mit Michi Zielkalender, Terminlänge, Startabstand, Buchungshorizont und Wochenzeiten festlegen.
3. Die Codeänderungen veröffentlichen und die Deployment-Umgebung kontrollieren.
4. Eine echte Probefahrt buchen, den Eintrag in Michis Apple-Kalender kontrollieren und anschließend belegten Slot, Wiederholung und simulierten Verbindungsfehler prüfen.
5. Einen Scheduler für `/api/profcar/sync` einrichten. Das Intervall ist mit ProfCar und den mobile.de-Nutzungsgrenzen festzulegen; es wurde absichtlich nicht geraten.

## Lokale Prüfungen

```sh
npx tsc --noEmit --incremental false
npm run build
```

Die Tests werden ohne zusätzliche Testbibliothek kompiliert und mit Node ausgeführt:

```sh
profcar_test_dir=$(mktemp -d /tmp/profcar-tests.XXXXXX)
npx tsc --module commonjs --moduleResolution node --target es2022 --esModuleInterop --skipLibCheck --outDir "$profcar_test_dir" src/lib/profcar/*.ts src/lib/calendar/*.ts
NODE_PATH="$PWD/node_modules:$PWD/node_modules/next/dist/compiled" node --conditions=react-server --test "$profcar_test_dir/profcar/profcar.test.js" "$profcar_test_dir/profcar/mobile-client.test.js" "$profcar_test_dir/calendar/apple-booking.test.js"
```
