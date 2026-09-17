# ProfCar: vorbereitete Datenebene

## Datenfluss und Erweiterungspunkte

- `src/lib/profcar/model.ts`: gemeinsames `ProfCarVehicle` mit allen Bestandsfeldern und separat ProfCar-eigenen `extras`. Fehlende Werte sind `null`; `listed` bedeutet inseriert, keine garantierte Verfügbarkeit. Preise sind Brutto-Verbraucherpreise mit separater Währung, Kilometer in km, Leistung in kW/PS, Erstzulassung YYYY-MM (Demo ggf. nur Jahr).
- `mobile-mapper.ts`: New-JSON-mobile.de-Anzeige → normalisiertes Modell. Unveränderte Rohdaten bleiben im Repository (`rawAds`/`mobile_raw_data`), nicht im Interface-Modell. Grundlage: [offizielle Search-API-Datenreferenz](https://services.mobile.de/docs/search-api.html). Legacy XML ist kein unterstütztes Eingabeformat. Ausstattung wird derzeit über eine explizite Teil-Allowlist übernommen; diese anhand realer Testantworten erweitern. Enum-Codes bei Bedarf im Präsentationslayer übersetzen.
- `inventory.ts`: `syncProfCarInventory({ sellerId, fetchSnapshot, repository })`. Der zukünftige mobile.de-Client muss sämtliche Seiten und benötigte Einzelinserate laden, Verkäufer/Anzahl prüfen, Warnungen und Abbrüche melden und nur einen unfiltrierten Gesamtbestand als `complete` markieren. Ein HTTP-200 allein reicht nicht. Der Service validiert den gesamten Snapshot vor Änderungen, erhält ProfCar-Zusatzdaten, deaktiviert fehlende Anzeigen und speichert den erfolgreichen Zeitpunkt gemeinsam. Nichts wird gelöscht. Eine erfolgreiche leere Antwort deaktiviert den Bestand; eine unvollständige/fehlgeschlagene Antwort verändert nichts.
- `ProfCarInventoryRepository`: Produktionsadapter noch offen. `commit` muss atomar mit Revision-Prüfung arbeiten (inklusive paralleler ProfCar-Änderungen); einzelne Supabase-Upserts ohne Transaktion erfüllen den Vertrag nicht. Seller-Lock/Revision in einer Transaktion bzw. RPC ergänzen. Bei Konflikten einen neuen vollständigen Lauf starten. Die Memory-Implementierung dient ausschließlich lokalen Tests und ist nicht dauerhaft.
- `demo.ts`: bestehende Demo-Fahrzeuge zentral normalisiert; das Widget nutzt vorerst einen kompatiblen Demo-Präsentationsadapter. Bestehende Monatswerte sind unveränderte Demo-Beispiele. Der künftige Bestandsloader nutzt `selectProfCarInventory`: Demo bis zum ersten vollständig erfolgreichen Test, danach letzter erfolgreicher Live-Bestand auch bei API-Fehlern. Erfolgreich leer bleibt leer. Noch kein Live-Loader aktiviert.
- Fahrzeugakten: `extras.vehicleFiles` und `profcar_vehicle_files` für Dropbox/Drive/manuelle Dateien. Später ausschließlich serverseitig authentifizieren und Dateiberechtigungen prüfen; Dateien beim Laden in `extras` einfügen, nicht doppelt in JSON speichern. Wartung, Reparaturen und Zustand nutzen `VehicleFact` mit verpflichtendem Nachweisstatus. `verified` benötigt geprüfte Belegreferenzen, Inseratsbehauptungen sind höchstens `profcar_reported`.
- Finanzierung: `extras.financing` reserviert Santander/KOSYFA-Referenzen und Entwürfe. Keine Authentifizierung oder Berechnung/Zusage angebunden.
- Kalender: `extras.appointments` reserviert Probefahrt-/Beratungswünsche und externe Referenzen, ausschließlich Entwürfe. Keine Apple-Kalender-Anbindung oder automatische Buchung.
- Chat/Voice: `buildProfCarVehicleAiContext` und `PROFCAR_AI_RULES` gemeinsam verwenden. Nur freigegebene Zustandsangaben, keine privaten Akten-/Kunden-/Termin-/Finanzierungsdaten. Modellprüfpunkte bleiben separat und sind niemals konkrete Defekte. Fehlende geprüfte Belege führen im KI-Kontext zu `unknown`. Freitext bleibt untrusted; JSON als Daten übergeben, Regeln separat als Instruktionen. Die bestehende Knowledge-Anbindung von Textchat/Realtime bleibt bis zur späteren Umstellung aktiv; bei Live-Aktivierung statische Fahrzeugbestände dort entfernen und den gemeinsamen Kontext einbinden, um widersprüchliche Bestände zu verhindern.

## Supabase

`supabase/migrations/202609170001_profcar_inventory.sql` bereitet `profcar_vehicles`, `profcar_vehicle_files`, `profcar_sync_runs` mit RLS ohne Browserfreigaben vor. Rohdaten, normalisierte Daten und Zusätze sind getrennt. Zeit/Verfügbarkeit beim Hydrieren aus den dedizierten Spalten nehmen. Revision dient späterer Nebenläufigkeitskontrolle; der vollständige Transaktionsadapter ist noch anzubinden. Vor Anwendung Schema und Rechte in einer lokalen/Staging-Datenbank prüfen. Diese Migration wurde nicht angewendet.

Kein Cronjob, keine externen Löschungen, keine neuen externen Dienste oder produktiven DB-Zugriffe eingerichtet. Der vorbereitete Mapper benötigt vor Live-Freigabe einen authentifizierten Test mit echten ProfCar-API-Daten.

## Lokale Prüfung

`npx tsc --noEmit --incremental false`

Tests ohne zusätzliche Dependencies in ein temporäres Verzeichnis kompilieren und ausführen:

```sh
npx tsc --module commonjs --moduleResolution node --target es2022 --esModuleInterop --skipLibCheck --outDir /tmp/profcar-tests src/lib/profcar/*.ts
node --test /tmp/profcar-tests/profcar.test.js
```
