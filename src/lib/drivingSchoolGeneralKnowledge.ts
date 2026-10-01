// Nur bundesweit anwendbare Fahrschulfragen. Angebote, Preise, Anbieter,
// Prüfstellen, Unterrichtszeiten und interne Abläufe gehören zum Tenant.
export const DRIVING_SCHOOL_GENERAL_KNOWLEDGE = `
# Allgemeine Fahrschulfragen (Deutschland)

Diese Antworten gelten nur für passende deutsche Fahrerlaubnisklassen. Konkrete Angebote, Kosten, Termine und Abläufe der jeweiligen Fahrschule haben Vorrang. Bei Änderungen der Rechtslage oder Sonderfällen die zuständige Fahrerlaubnisbehörde beziehungsweise Fahrschule prüfen lassen.

## Muss ich am Theorieunterricht teilnehmen?
Ja. Die für die beantragte Klasse vorgeschriebene theoretische Ausbildung muss absolviert und nachgewiesen werden. Welche Unterrichtseinheiten nötig sind, hängt unter anderem von Klasse und Vorbesitz ab. Ein Lernbuch ist nicht generell vorgeschrieben; Lernmaterial und App der Fahrschule können beim Üben helfen.

## Kann ich vor der Theorieprüfung bereits Fahrstunden nehmen?
Theoretische und praktische Ausbildung können sich überschneiden. Den Start der Praxis organisiert die jeweilige Fahrschule. Für die praktische Prüfung muss die Theorieprüfung grundsätzlich bestanden sein.

## Wie viele normale Fahrstunden brauche ich und was kostet der Führerschein insgesamt?
Die Zahl der Übungsfahrten richtet sich nach dem individuellen Lernfortschritt; es gibt keine seriöse feste Gesamtsumme für alle. Vorgeschriebene besondere Ausbildungsfahrten, Einzelpreise und Prüfgebühren sind davon zu unterscheiden. Nur die Preise und ausdrücklich als solche gekennzeichneten Erfahrungswerte der betreffenden Fahrschule nennen.

## Kann ich die Fahrschule wechseln?
Ja. Die bisherige Fahrschule muss die bereits absolvierten Theorie- und Praxisteile im Ausbildungsnachweis bestätigen und den Nachweis aushändigen oder elektronisch übermitteln. Die neue Fahrschule und gegebenenfalls die Fahrerlaubnisbehörde klären die weitere Übernahme und mögliche Gebühren.

## Was passiert nach einer nicht bestandenen Prüfung?
Eine theoretische oder praktische Fahrerlaubnisprüfung kann wiederholt werden. Nach einer nicht bestandenen Prüfung gilt in der Regel eine Wartezeit von mindestens zwei Wochen. Neue Prüfungs- und gegebenenfalls Fahrschulkosten können anfallen; Umfang und Termin mit Fahrschule und Prüfstelle klären. Keine unbegrenzte Gültigkeit des Prüfauftrags versprechen.

## Wann kann ich Klasse B/BF17 beantragen und prüfen lassen?
Der Antrag auf Erteilung kann frühestens sechs Monate vor Erreichen des jeweiligen Mindestalters gestellt werden. Die Theorieprüfung ist frühestens drei Monate, die praktische Prüfung frühestens einen Monat vorher möglich. Für BF17 liegt das reguläre Mindestalter bei 17, für Klasse B ohne BF17 bei 18 Jahren. Die praktische Prüfung setzt grundsätzlich die bestandene Theorieprüfung voraus.

## Wie läuft B197 ab?
Bei B197 gehören mindestens zehn Unterrichtseinheiten zu je 45 Minuten auf einem Schaltwagen und eine mindestens 15-minütige Testfahrt mit dem Fahrlehrer zum Schaltkompetenznachweis. Die praktische Prüfung kann auf Automatik stattfinden. Ob und zu welchem Preis eine Fahrschule B197 anbietet, ist schulabhängig.

## Was ist B96?
B96 ist eine Erweiterung der Klasse B für bestimmte Kombinationen mit Anhänger bis 4.250 kg zulässiger Gesamtmasse. Ob B, B96 oder BE passt, hängt von den zulässigen Gesamtmassen des Zugfahrzeugs und Anhängers ab; die konkreten Fahrzeugdaten prüfen.

Rechtsgrundlagen: https://www.gesetze-im-internet.de/fev_2010/__18.html ; https://www.gesetze-im-internet.de/fev_2010/__16.html ; https://www.gesetze-im-internet.de/fev_2010/__17.html ; https://www.gesetze-im-internet.de/fev_2010/__21.html ; https://www.gesetze-im-internet.de/fahrschausbo_2012/__6.html ; https://www.gesetze-im-internet.de/fahrschausbo_2012/__5a.html
`.trim();

export function hasGeneralDrivingSchoolKnowledge(tenantId: string): boolean {
  return tenantId.startsWith("fahrschule-") ||
    tenantId === "fahrschul-demo" ||
    tenantId === "fahrwerk-b" ||
    tenantId === "r-drive" ||
    tenantId === "campus-b27" ||
    tenantId === "asphaltcrew" ||
    tenantId === "fahrschule7" ||
    tenantId === "bb-fahrschule" ||
    tenantId === "hansefahrschule-rennhack" ||
    tenantId === "cans-fahrschule" ||
    tenantId === "tek-fahrschule" ||
    tenantId === "petermaennchen-fahrschule" ||
    tenantId === "schelf-fahrschule";
}
