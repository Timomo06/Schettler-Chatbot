# BauTeam Interface und PDF-Versand

Die BauTeam-Oberfläche liegt unter `/bauteam`. Die BauTeam-Website bindet sie in einem Dialog ein und übergibt die Konzeptkennung als `house`-Parameter. Der Server gleicht diese Kennung mit `src/tenants/bauteam/houses.json` ab. Das verhindert, dass Besucher durch einen frei formulierten Namen das falsche Hauskonzept erhalten.

Der Resend-Versanddienst ist in der Produktionsumgebung von `schettlers-chatbot-lca3` eingerichtet:

- `RESEND_API_KEY` als Produktionsgeheimnis mit Sendeberechtigung nur für `mail.btdesigns.de`
- `BAUTEAM_EMAIL_FROM`: `BauTeam Praktikus <hauskonzept@mail.btdesigns.de>`
- Die Empfängeradresse für Lothars PDF-Kopie ist im Versandcode auf `ruthe@praktikus-bauteam.de` festgelegt. Ein älterer Wert von `BAUTEAM_LOTHAR_EMAIL` darf den Versand nicht mehr auf die falsche Adresse lenken.

Ohne die ersten beiden Werte zeigt das Formular eine ehrliche Fehlermeldung und meldet keinen Versand als erfolgreich. Die PDFs liegen unter `public/bauteam/concepts/` und werden anhand der geprüften Hauskennung ausgewählt. Für drei Modelle fehlen im gelieferten Ordner die Konzept-PDFs; dort wird kein Formular zur automatischen Zusendung angeboten.

Die Absenderdomain ist bei Resend verifiziert. Ein echter Versand an eine Testadresse und die Kopie an Lothar müssen noch geprüft werden. Die Website öffnet die veröffentlichte `/bauteam`-Route.

## Vor dem Livegang zu klären

- **Haus Perlin / BU-130-SD-L:** Ordner und Hauskonzept widersprechen sich bei der Wohnfläche (130 bzw. 150 m²).
- **Haus Gottesgabe / Villa 140:** Zwei Konzeptordner mit unterschiedlicher Dachform, aber keine Dachform in der Preisliste.
- **Haus Wittenburg / DH-260-35-SD:** Die Liste vom 01. Oktober enthält nur noch Wittenburg; das Konzept ist jetzt eindeutig zugeordnet.
- **Haus Ventschow / DH-280-5-FD:** In der ZIP wurde kein passender Konzeptordner gefunden.
- **Haus Zülow / EFH-150-45-SD-ZG:** Preis und Name stehen in der Liste vom 01. Oktober. Die PDF enthält weiterhin eine unplausible Flächenangabe und bleibt für den Versand gesperrt.
- **Haus Selmsdorf, Haus Eldena und Haus Upahl:** Der Preis ist eindeutig, aber die PDF fehlt im jeweiligen gelieferten Ordner. Der automatische Versand bleibt hier aus.
- **Lothars E-Mail:** Für Kontaktlinks, Beratung und PDF-Kopien gilt `ruthe@praktikus-bauteam.de`. Die angelieferten Hauskonzept-PDFs enthalten diese Adresse bereits.
- **Datenschutz und Hosting:** Den konkreten Hoster, Speicherfristen, Auftragsverarbeitung und den endgültigen Absender vor Veröffentlichung juristisch/fachlich prüfen.
