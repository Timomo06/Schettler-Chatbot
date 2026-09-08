export type SchoolDemoId = "fahrschule-rathje" | "fsaz" | "campus-b27";
export type SchoolPanel = "home" | "connect" | "dashboard" | "courses" | "schedule" | "documents" | "coach";
export const SCHOOL_DOMAINS: Record<string, SchoolDemoId> = {
  "fahrschule-rathje.de": "fahrschule-rathje", "fsaz.de": "fsaz", "campus-b27.de": "campus-b27",
};
export function schoolForHost(value: string): SchoolDemoId | null {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!/^https?:$/.test(url.protocol)) return null;
    return SCHOOL_DOMAINS[url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "")] || null;
  } catch { return null; }
}
export function asSchoolDemo(value: string): SchoolDemoId | null {
  const id = value.trim().toLowerCase();
  if (id === "fahrschule-rathje" || id === "fsaz" || id === "campus-b27") return id;
  if (id === "rathje") return "fahrschule-rathje";
  if (id === "rathje-simulator") return "fsaz";
  if (id === "campus") return "campus-b27";
  return schoolForHost(id);
}
// Ein iframe sieht seinen eigenen Host. Das Einbettungsscript übergibt daher
// den Host der Website explizit; Referrer ist nur die Rückfallebene.
export function resolveSchoolTenant(search: string, ownHost: string, referrer: string): string {
  const p = new URLSearchParams(search);
  const requested = p.get("tenant")?.trim() || "";
  const explicit = asSchoolDemo(requested);
  const hostHint = schoolForHost(p.get("host") || "");
  const embedded = p.get("embed") === "1";
  if (embedded && (!requested || explicit || requested === "auto")) {
    return hostHint || schoolForHost(referrer) || schoolForHost(ownHost) || explicit || "demo";
  }
  return explicit || (requested && requested !== "auto" ? requested : hostHint || schoolForHost(ownHost) || schoolForHost(referrer) || "demo");
}
export const SCHOOL_DEMOS = {
  "fahrschule-rathje": {
    companyId: "fahrschule-rathje", brand: "Fahrschule Rathje", assistant: "Führerschein-Assistent",
    accent: "#17736e", website: "https://www.fahrschule-rathje.de", contact: "https://www.fahrschule-rathje.de/kontakt/",
    email: "info@fahrschule-rathje.de", phone: "040 647 62 09", tel: "+49406476209", address: "Alter Zollweg 201 · 22147 Hamburg",
    hours: "Di–Do · 15–18 Uhr (laut FSAZ-Kontaktseite)", code: "RATHJE-2048",
    title: "Dein Führerschein. Schritt für Schritt.", subtitle: "Klasse finden, Anmeldung vorbereiten oder deine nächsten Fahrstunden planen.",
    greeting: "Moin! Ich bin der digitale Assistent der Fahrschule Rathje in Hamburg. Geht es um deinen Führerschein, den Simulator oder bist du schon bei uns angemeldet?",
    placeholder: "Frag z. B. nach B197, Theorie oder dem Fahrstundenplaner …",
    steps: ["1 Ziel klären", "2 Start vorbereiten", "3 Theorie & Simulator", "4 Praxis planen"],
  },
  fsaz: {
    companyId: "fahrschule-rathje", brand: "FSAZ · Fahrschule Rathje", assistant: "Simulator-Assistent",
    accent: "#1e639a", website: "https://www.fsaz.de", contact: "https://www.fsaz.de/kontakt/",
    email: "info@fahrschule-rathje.de", phone: "040 647 62 09", tel: "+49406476209", address: "Alter Zollweg 201 · 22147 Hamburg",
    hours: "Di–Do · 15–18 Uhr", code: "FSAZ-2048",
    title: "Erst Sicherheit gewinnen. Dann losfahren.", subtitle: "Finde dein Simulatortraining – auch wenn du bei einer anderen Fahrschule lernst.",
    greeting: "Moin! Hier ist der Simulator-Assistent von FSAZ, einem Angebot der Fahrschule Rathje. Möchtest du entspannt anfangen, Schalten üben oder dich auf Landstraße und Autobahn vorbereiten?",
    placeholder: "Frag z. B. nach Simulator, Preisen oder Training als externer Schüler …",
    steps: ["1 Erfahrung klären", "2 Trainingsziel", "3 Modul auswählen", "4 Anfrage vorbereiten"],
  },
  "campus-b27": {
    companyId: "campus-b27", brand: "Campus B27", assistant: "Ausbildungs-Assistent",
    accent: "#c45a16", website: "https://www.campus-b27.de", contact: "https://www.campus-b27.de/kontakt/",
    email: "fahrschule@campus-b27.de", phone: "0163 3366992", tel: "+491633366992", address: "Josefstr. 2 · 36088 Hünfeld",
    hours: "Mo, Mi & Do · 15–18 Uhr", code: "CAMPUS-2048",
    title: "Dein Ziel. Deine passende Ausbildung.", subtitle: "Auto, Motorrad, Lkw, Bus oder Spezialkurs: Kläre deinen Einstieg und bereite alles Wichtige vor.",
    greeting: "Hallo bei Campus B27 in Hünfeld! Suchst du einen Führerschein, einen Spezialkurs oder die nächsten Theoriezeiten? Ich helfe dir, die passende Anfrage vorzubereiten.",
    placeholder: "Frag z. B. nach Motorrad, C/CE, BKF oder Theoriezeiten …",
    steps: ["1 Angebot finden", "2 Vorbesitz klären", "3 Zeitwunsch", "4 Beratung vorbereiten"],
  },
} as const;
type SchoolCard = {icon: string; title: string; description: string; action: "hohenbadenPanel"; hohenbadenPanel: SchoolPanel};
const card = (icon: string, title: string, description: string, hohenbadenPanel: SchoolPanel): SchoolCard => ({icon,title,description,action:"hohenbadenPanel",hohenbadenPanel});
export const SCHOOL_START_CARDS: Record<SchoolDemoId, SchoolCard[]> = {
  "fahrschule-rathje": [
    card("🚘", "Führerschein starten", "B, B197, Automatik oder BE: Welcher Weg passt zu dir?", "courses"),
    card("🎮", "Simulator kennenlernen", "Stressfrei üben und deinen Einstieg vorbereiten.", "coach"),
    card("📅", "Theorie & Fahrstunden", "Theorieinfos, Planer-Login und Regeln zur Terminplanung.", "schedule"),
    card("📋", "Anmeldung vorbereiten", "Unterlagen prüfen und Erste Hilfe vor Ort finden.", "documents"),
    card("👤", "Mein Demo-Cockpit", "Beispielzugang zum persönlichen Führerscheinbegleiter.", "connect"),
    card("💬", "Beratung & Preise", "Veröffentlichte Preise ansehen und eine Anfrage vorbereiten.", "dashboard"),
  ],
  fsaz: [
    card("🎮", "Mein Training finden", "Erfahrung, Trainingsziel und Sprache gezielt abstimmen.", "courses"),
    card("🧭", "Module kennenlernen", "Grundausbildung, Überland, Autobahn und Automatik.", "coach"),
    card("💶", "Pakete & Preise", "Einzelmodule, Gesamtpaket und externe Teilnahme.", "dashboard"),
    card("📅", "Training anfragen", "Wunschzeiten und passendes Training gemeinsam vorbereiten.", "schedule"),
    card("👤", "Mein Demo-Trainingsplan", "Beispielzugang: Einheiten und nächste Schritte ansehen.", "connect"),
    card("📍", "Teilnahme & Anfahrt", "Andere Fahrschule? Du kannst trotzdem hier trainieren.", "documents"),
  ],
  "campus-b27": [
    card("🚘", "Führerschein finden", "Auto, Motorrad, Lkw oder Bus: Dein Ziel zuerst.", "courses"),
    card("🎓", "BKF, ASF & MPU", "Den richtigen Kurs und die nötigen Rückfragen klären.", "coach"),
    card("📅", "Theoriezeiten", "Veröffentlichte Termine passend zu deiner Klasse.", "schedule"),
    card("📋", "Meinen Start vorbereiten", "Vorbesitz, Unterlagen und offene Punkte sortieren.", "documents"),
    card("👤", "Mein Demo-Cockpit", "Beispielzugang zum persönlichen Ausbildungsbegleiter.", "connect"),
    card("💬", "Beratung vorbereiten", "Dein Anliegen zusammenfassen und Kontakt aufnehmen.", "dashboard"),
  ],
};
export const CAMPUS_THEORY = [
  ["2026-09-09", "B", "Zusatzstoff B"], ["2026-09-10", "A", "Zusatzstoff A"],
  ["2026-10-05", "alle", "Grundstoff 1 / 2"], ["2026-10-06", "alle", "Grundstoff 3 / 4"],
  ["2026-10-07", "alle", "Grundstoff 5 / 6"], ["2026-10-08", "alle", "Grundstoff 7 / 8"],
  ["2026-10-12", "alle", "Grundstoff 9 / 10"], ["2026-10-13", "alle", "Grundstoff 11 / 12"],
  ["2026-10-14", "A", "Zusatzstoff A"], ["2026-10-15", "B", "Zusatzstoff B"],
] as const;
export function upcomingCampusTheory(group: string, today: string) {
  return CAMPUS_THEORY.filter(([date, kind]) => date >= today && (kind === "alle" || kind === group));
}
