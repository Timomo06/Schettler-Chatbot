// app/widget/page.tsx
"use client";

import {
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getTenant } from "@/lib/tenants";
import { MessageCircle } from "lucide-react";

type Msg = {
  role: "user" | "assistant";
  content: string;
  imagePreviewUrl?: string;
  imageName?: string;
};

type VoicePhase =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "ready"
  | "error";

type SendTextOptions = { fromVoice?: boolean; signal?: AbortSignal };

type StartCard = {
  icon: string;
  title: string;
  description: string;
  message?: string;
  action?:
    | "photo"
    | "voice"
    | "booking"
    | "fahrwerkSignup"
    | "fahrwerkLiveSignup"
    | "fahrwerkPanel"
    | "abgefahrenPanel"
    | "hohenbadenPanel";
  fahrwerkPanel?: FahrwerkPanel;
  abgefahrenPanel?: AbgefahrenPanel;
  hohenbadenPanel?: HohenbadenPanel;
  prefillLicenseClass?: string;
  prefillStartWish?: string;
};

type BookingFormState = {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  durationMinutes: string;
  message: string;
};

type FahrwerkSignupFormState = {
  licenseClass: string;
  startWish: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  privacyAccepted: boolean;
};

type FahrwerkPanel =
  | "dashboard"
  | "start"
  | "documents"
  | "theory"
  | "practice"
  | "exam"
  | "student"
  | "contact";

type FahrwerkStageId =
  | "new"
  | "registered"
  | "documents"
  | "theory"
  | "theory_exam"
  | "practice"
  | "practical_exam";

type FahrwerkDocumentItem = { id: string; label: string; hint: string };

type FahrwerkStage = {
  id: FahrwerkStageId;
  label: string;
  next: string;
  detail: string;
};

const DEFAULT_BOOKING_FORM: BookingFormState = {
  name: "",
  email: "",
  phone: "",
  service: "Website Beratung",
  date: "",
  time: "",
  durationMinutes: "30",
  message: "",
};

const DEFAULT_FAHRWERK_SIGNUP_FORM: FahrwerkSignupFormState = {
  licenseClass: "Klasse B",
  startWish: "Schnell starten",
  name: "",
  email: "",
  phone: "",
  message: "",
  privacyAccepted: false,
};

const FAHRWERK_LIVE_SIGNUP_URL =
  "https://start.fahrschule.live/WTd4L0ZsYzRRbkcycmRzV3gxczFGQT09OjrLg1cp9dg7zbbiRX6Flixr/st/reg";

const FAHRWERK_LICENSE_CLASSES = [
  "Klasse B",
  "B197",
  "BF17",
  "BE Anhänger",
  "Ich bin noch unsicher",
];

const FAHRWERK_START_WISHES = [
  "Schnell starten",
  "Erstmal beraten lassen",
  "Theorie-Einstieg finden",
  "Rückruf von Fahrwerk B",
];

const FAHRWERK_DOCUMENT_ITEMS: FahrwerkDocumentItem[] = [
  {
    id: "ausweis",
    label: "Ausweis",
    hint: "Personalausweis oder Reisepass bereitlegen.",
  },
  {
    id: "sehtest",
    label: "Sehtest",
    hint: "Für Klasse B/B197/BF17 nötig. Gültigkeit beachten.",
  },
  {
    id: "erstehilfe",
    label: "Erste-Hilfe-Kurs",
    hint: "Bescheinigung für den Antrag sichern.",
  },
  {
    id: "passbild",
    label: "Biometrisches Passbild",
    hint: "Wird für den Führerscheinantrag benötigt.",
  },
  {
    id: "antrag",
    label: "Antrag beim Amt",
    hint: "Erst danach kann die Prüfung später sauber laufen.",
  },
  {
    id: "bf17",
    label: "BF17-Begleitpersonen",
    hint: "Nur relevant, wenn begleitetes Fahren ab 17 geplant ist.",
  },
];

const FAHRWERK_STAGES: FahrwerkStage[] = [
  {
    id: "new",
    label: "Noch nicht angemeldet",
    next: "Passende Klasse finden oder direkt online anmelden.",
    detail:
      "Starte mit Klasse B, B197, BF17 oder BE. Wenn du unsicher bist, führt dich das Interface über wenige Fragen zur passenden Richtung.",
  },
  {
    id: "registered",
    label: "Angemeldet",
    next: "Unterlagen vollständig machen.",
    detail:
      "Sehtest, Erste-Hilfe-Kurs, Passbild und Antrag sind meistens die nächsten Baustellen.",
  },
  {
    id: "documents",
    label: "Unterlagen laufen",
    next: "Theorie sauber starten und Antrag im Blick behalten.",
    detail:
      "Wenn Unterlagen fehlen, dauert später oft die Prüfungsfreigabe länger. Deshalb zuerst den Dokumenten-Check erledigen.",
  },
  {
    id: "theory",
    label: "Theorie läuft",
    next: "Regelmäßig lernen und Theorieprüfung planen.",
    detail:
      "Das Interface kann dir erklären, was in der Theoriephase wichtig ist. Konkrete Kurszeiten bleiben bei Fahrschule.live.",
  },
  {
    id: "theory_exam",
    label: "Theorieprüfung bestanden",
    next: "Praxisphase und Fahrstunden fokussieren.",
    detail:
      "Jetzt geht es stärker um Fahrpraxis, Sonderfahrten und Vorbereitung auf die praktische Prüfung.",
  },
  {
    id: "practice",
    label: "Praxis läuft",
    next: "Fahrstunden, Sonderfahrten und Prüfungsreife klären.",
    detail:
      "Wenn du unsicher bist, kann das Interface deine Frage vorstrukturieren, bevor Fahrwerk B sie prüft.",
  },
  {
    id: "practical_exam",
    label: "Prüfung steht an",
    next: "Prüfungs-Checkliste durchgehen und ruhig bleiben.",
    detail:
      "Kurz vor der Prüfung helfen klare Checklisten mehr als lange Texte. Nutze den Prüfungsmodus im Interface.",
  },
];

const DEFAULT_FAHRWERK_CHECKLIST = FAHRWERK_DOCUMENT_ITEMS.reduce<
  Record<string, boolean>
>((acc, item) => {
  acc[item.id] = false;
  return acc;
}, {});

const BTDESIGNS_BOOKING_SERVICES = [
  "Website Beratung",
  "Social Media Beratung",
  "AI Interface Beratung",
  "Werbemittel Anfrage",
  "Foto/Video Anfrage",
  "Allgemeines Erstgespräch",
];

const MM_WARTUNG_BOOKING_SERVICES = [
  "Werkstatt Termin",
  "Ölwechsel / Wartung",
  "Fehlerdiagnose",
  "Ersatzteil Anfrage",
  "Ultraschallreinigung",
  "Landmaschinen / alte Technik",
  "Allgemeine Rückfrage",
];

const TXBIKES_BOOKING_SERVICES = [
  "Werkstatttermin",
  "Inspektion / Wartung",
  "E-Bike Diagnose",
  "Reparatur Anfrage",
  "Kaufberatung Fahrrad / E-Bike",
  "Zubehör Beratung",
  "Allgemeine Rückfrage",
];

const WILLI_BOOKING_SERVICES = [
  "Beratung",
  "Termin / Rückruf",
  "Service Anfrage",
  "Angebot anfragen",
  "Projekt besprechen",
  "Allgemeine Rückfrage",
];

const TXBIKES_START_CARDS: StartCard[] = [
  {
    icon: "📷",
    title: "Problem mit Foto",
    description: "Foto machen oder hochladen",
    action: "photo",
  },
  {
    icon: "🎙️",
    title: "Problem erzählen",
    description: "Sprich direkt ins Interface",
    action: "voice",
  },
  {
    icon: "🛠️",
    title: "Problem am Fahrrad",
    description: "Geräusche, Defekte oder Fehler eingrenzen",
    message:
      "Ich habe ein Problem mit meinem Fahrrad und möchte den Fehler eingrenzen.",
  },
  {
    icon: "📅",
    title: "Termin buchen",
    description: "Werkstatttermin direkt anfragen",
    action: "booking",
  },
  {
    icon: "🚴",
    title: "Kaufberatung",
    description: "E-Bike, Fahrrad oder Zubehör passend finden",
    message: "Ich brauche Beratung zu einem Fahrrad, E-Bike oder Zubehör.",
  },
  {
    icon: "🔧",
    title: "Wartung & Service",
    description: "Inspektion, Kette, Bremsen oder Pflege planen",
    message:
      "Ich möchte wissen, welche Wartung oder welcher Service für mein Fahrrad sinnvoll ist.",
  },
];

const WILLI_START_CARDS: StartCard[] = [
  {
    icon: "✨",
    title: "Beratung",
    description: "Kurz schildern, worum es geht",
    message: "Ich möchte mich beraten lassen und mein Anliegen kurz schildern.",
  },
  {
    icon: "📅",
    title: "Termin buchen",
    description: "Termin oder Rückruf direkt anfragen",
    action: "booking",
  },
  {
    icon: "🛠️",
    title: "Service Anfrage",
    description: "Problem, Wunsch oder Auftrag vorbereiten",
    message:
      "Ich habe eine Service-Anfrage und möchte mein Anliegen vorbereiten.",
  },
  {
    icon: "💬",
    title: "Kurz erzählen",
    description: "Sprich deine Anfrage direkt ein",
    action: "voice",
  },
  {
    icon: "📷",
    title: "Bild zeigen",
    description: "Foto, Screenshot oder Beispiel hochladen",
    action: "photo",
  },
  {
    icon: "📋",
    title: "Angebot anfragen",
    description: "Infos sammeln und Anfrage formulieren",
    message:
      "Ich möchte ein Angebot anfragen und die wichtigsten Informationen sammeln.",
  },
];

const BTDESIGNS_START_CARDS: StartCard[] = [
  {
    icon: "✨",
    title: "Social Media",
    description: "Pakete, Reels oder Betreuung einschätzen",
    message:
      "Ich möchte wissen, welches Social-Media-Paket für mein Unternehmen sinnvoll ist.",
  },
  {
    icon: "🌐",
    title: "Website",
    description: "Neue Website, Relaunch oder Shop besprechen",
    message:
      "Ich interessiere mich für eine Website oder einen Online-Shop von BTDesigns.",
  },
  {
    icon: "🤖",
    title: "AI Interface",
    description: "LINA, Website-KI oder Automatisierung planen",
    message:
      "Ich möchte wissen, wie ein AI Interface von BTDesigns meinem Unternehmen helfen kann.",
  },
  {
    icon: "🧢",
    title: "Werbemittel",
    description: "Textilien, Drucksachen oder Giveaways anfragen",
    message:
      "Ich interessiere mich für Werbemittel von BTDesigns und möchte eine Anfrage stellen.",
  },
  {
    icon: "📅",
    title: "Termin buchen",
    description: "Beratung direkt in deinen Apple Kalender eintragen",
    action: "booking",
  },
  {
    icon: "💬",
    title: "Kurz erzählen",
    description: "Sprich deine Anfrage direkt ein",
    action: "voice",
  },
  {
    icon: "📷",
    title: "Beispiel zeigen",
    description: "Bild, Screenshot oder Idee hochladen",
    action: "photo",
  },
];

const MM_WARTUNG_START_CARDS: StartCard[] = [
  {
    icon: "🔧",
    title: "Fahrzeugproblem",
    description: "Geräusch, Warnlampe, Startproblem oder Aussetzer",
    message: "Ich habe ein Problem mit meinem Fahrzeug.",
  },
  {
    icon: "🚗",
    title: "Ersatzteil anfragen",
    description: "Teil gesucht? Anfrage für Moritz vorbereiten",
    message: "Ich suche ein bestimmtes Ersatzteil.",
  },
  {
    icon: "📅",
    title: "Termin anfragen",
    description: "Prüfung, Service oder Rückmeldung planen",
    action: "booking",
  },
  {
    icon: "⚙️",
    title: "Spezialleistung",
    description: "Ultraschallreinigung, alte Technik oder Landmaschinen",
    message: "Ich habe eine Frage zu einer Spezialleistung von MM Wartung.",
  },
  {
    icon: "📷",
    title: "Foto zeigen",
    description: "Bild vom Fahrzeug, Teil oder Problem hochladen",
    action: "photo",
  },
  {
    icon: "🎙️",
    title: "Kurz erzählen",
    description: "Sprich dein Anliegen direkt ein",
    action: "voice",
  },
];

const ABGEFAHREN_START_CARDS: StartCard[] = [
  {
    icon: "🔗",
    title: "Als Fahrschüler verbinden",
    description: "Persönlichen Stand, Termine und Fortschritt öffnen",
    action: "abgefahrenPanel",
    abgefahrenPanel: "connect",
  },
  {
    icon: "⚡",
    title: "Nächsten Kurs buchen",
    description: "Freie Kurse nach Startwunsch und Zeitplan finden",
    action: "abgefahrenPanel",
    abgefahrenPanel: "courses",
  },
  {
    icon: "🪪",
    title: "Mein Führerschein",
    description: "Persönliches Cockpit mit den nächsten Schritten",
    action: "abgefahrenPanel",
    abgefahrenPanel: "dashboard",
  },
  {
    icon: "📅",
    title: "Fahrstunden planen",
    description: "Freie Zeiten sehen und einen passenden Slot vormerken",
    action: "abgefahrenPanel",
    abgefahrenPanel: "schedule",
  },
  {
    icon: "✅",
    title: "Unterlagen & Status",
    description: "Dokumente hochladen und den Antragsstand verfolgen",
    action: "abgefahrenPanel",
    abgefahrenPanel: "documents",
  },
  {
    icon: "✨",
    title: "Persönlicher Begleiter",
    description: "Antworten passend zu deinem aktuellen Ausbildungsstand",
    action: "abgefahrenPanel",
    abgefahrenPanel: "coach",
  },
  {
    icon: "🧭",
    title: "Führerschein finden",
    description: "Mit wenigen Fragen zur passenden Führerscheinklasse",
    message:
      "Ich weiß noch nicht genau, welche Führerscheinklasse zu mir passt. Bitte finde sie mit mir gemeinsam heraus.",
  },
  {
    icon: "🎙️",
    title: "Frage einsprechen",
    description: "Anliegen einfach erzählen statt tippen",
    action: "voice",
  },
];

const HOHENBADEN_START_CARDS: StartCard[] = [
  {
    icon: "🔗",
    title: "Als Fahrschüler verbinden",
    description: "Lernstand, Termine und Ausbildungsfortschritt öffnen",
    action: "hohenbadenPanel",
    hohenbadenPanel: "connect",
  },
  {
    icon: "⚡",
    title: "Intensivkurs finden",
    description: "Freie in7Days-Kurse passend zu Urlaub und Standort",
    action: "hohenbadenPanel",
    hohenbadenPanel: "courses",
  },
  {
    icon: "🪪",
    title: "Mein Führerschein",
    description: "Persönliches Cockpit mit den nächsten Schritten",
    action: "hohenbadenPanel",
    hohenbadenPanel: "dashboard",
  },
  {
    icon: "📅",
    title: "Fahrstunden planen",
    description: "Freie Zeiten sehen und passend zum Kurs vormerken",
    action: "hohenbadenPanel",
    hohenbadenPanel: "schedule",
  },
  {
    icon: "📱",
    title: "THEO-Lernbegleiter",
    description: "Lernstand, Prüfungssimulation und Tagesplan bündeln",
    action: "hohenbadenPanel",
    hohenbadenPanel: "coach",
  },
  {
    icon: "✅",
    title: "Unterlagen & Behörde",
    description: "Dokumente hochladen und Freigabestatus verfolgen",
    action: "hohenbadenPanel",
    hohenbadenPanel: "documents",
  },
  {
    icon: "🌍",
    title: "Führerschein umschreiben",
    description: "Ausländischen Führerschein und Sprache einordnen",
    message:
      "Ich möchte meinen ausländischen Führerschein umschreiben lassen. Bitte führe mich durch die nächsten Schritte und frage nach Herkunftsland, Führerscheinklasse und gewünschter Sprache.",
  },
  {
    icon: "🎙️",
    title: "Frage einsprechen",
    description: "Anliegen einfach erzählen statt tippen",
    action: "voice",
  },
];

const FAHRWERK_B_START_CARDS: StartCard[] = [
  {
    icon: "🚀",
    title: "Online anmelden",
    description:
      "Offizielle Anmeldung bei Fahrwerk B über Fahrschule.live öffnen",
    action: "fahrwerkLiveSignup",
  },
  {
    icon: "🧭",
    title: "Beratung & Start",
    description: "Klasse finden, Fragen klären und nächsten Schritt sehen",
    action: "fahrwerkPanel",
    fahrwerkPanel: "start",
  },
  {
    icon: "✅",
    title: "Unterlagen prüfen",
    description: "Sehtest, Erste Hilfe, Passbild, Antrag und BF17-Check",
    action: "fahrwerkPanel",
    fahrwerkPanel: "documents",
  },
  {
    icon: "📚",
    title: "Theorie begleiten",
    description: "Theorie-Einstieg, Lernen und Prüfung besser einordnen",
    action: "fahrwerkPanel",
    fahrwerkPanel: "theory",
  },
  {
    icon: "🚘",
    title: "Praxisphase",
    description: "Fahrstunden, Sonderfahrten und praktische Prüfung verstehen",
    action: "fahrwerkPanel",
    fahrwerkPanel: "practice",
  },
  {
    icon: "🎯",
    title: "Prüfungsmodus",
    description: "Theorie- oder Praxisprüfung mit Checkliste vorbereiten",
    action: "fahrwerkPanel",
    fahrwerkPanel: "exam",
  },
  {
    icon: "👤",
    title: "Ich bin Fahrschüler",
    description: "Stand auswählen und den nächsten sinnvollen Schritt sehen",
    action: "fahrwerkPanel",
    fahrwerkPanel: "student",
  },
];

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  return `${r}, ${g}, ${b}`;
}

const FAHRWERK_EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function ensureFahrwerkEmoji(content: string) {
  if (!content || FAHRWERK_EMOJI_PATTERN.test(content)) return content;

  const normalized = content.toLowerCase();
  let emoji = "🚗";

  if (/\b(hi|hallo|willkommen)\b/.test(normalized)) {
    emoji = "👋";
  } else if (/\b(fehler|problem|nicht möglich|technisch)\b/.test(normalized)) {
    emoji = "⚠️";
  } else if (
    /\b(anmeld|klasse b|b197|bf17|führerschein starten)\b/.test(normalized)
  ) {
    emoji = "📝";
  } else if (
    /\b(unterlagen|dokument|sehtest|erste hilfe|passbild|antrag)\b/.test(
      normalized,
    )
  ) {
    emoji = "📄";
  } else if (/\b(theorie|lernen|prüfungsfragen)\b/.test(normalized)) {
    emoji = "📚";
  } else if (/\b(praxis|fahrstunde|sonderfahrt)\b/.test(normalized)) {
    emoji = "🚘";
  } else if (/\b(prüfung|checkliste|prüfungsangst)\b/.test(normalized)) {
    emoji = "🎯";
  } else if (/\b(rückruf|kontakt|telefon|erreichen)\b/.test(normalized)) {
    emoji = "📞";
  } else if (/\b(erledigt|perfekt|alles klar|okay)\b/.test(normalized)) {
    emoji = "✅";
  }

  return `${emoji} ${content}`;
}

const VOICE_SILENCE_MS = 600;
const VOICE_FILLER_DELAY_MS = 850;
const VOICE_MAX_SPEECH_TEXT = 900;

const VOICE_FILLER_PHRASES = [
  "Alles klar, ich habe deine Frage verstanden. Lass mich das kurz mit den hinterlegten Informationen abgleichen, damit ich dir direkt passend antworten kann.",
  "Verstanden. Ich ordne deine Frage gerade ein und prüfe kurz die wichtigsten Informationen für deine Situation.",
  "Einen kleinen Moment bitte. Ich gehe deine Frage kurz Schritt für Schritt durch und schaue nach, welche Antwort am besten passt.",
  "Danke, ich habe dich verstanden. Ich prüfe gerade die wichtigsten Informationen und formuliere dir direkt eine kurze und klare Antwort.",
  "Alles klar, ich schaue mir das kurz genauer an und gleiche deine Frage mit den vorhandenen Informationen ab. Gleich habe ich die passende Antwort für dich.",
] as const;

const VOICE_FILLER_CONTINUATIONS = [
  "Ich bin gleich soweit. Ich prüfe nur noch einen letzten Punkt, dann bekommst du direkt die Antwort.",
  "Einen kurzen Augenblick noch. Ich gleiche die Antwort gerade noch einmal sauber ab.",
  "Fast geschafft. Ich prüfe noch kurz, ob alle wichtigen Informationen für dich enthalten sind.",
] as const;
const SILENT_AUDIO_DATA_URI =
  "data:audio/wav;base64,UklGRqQCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYACAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";


type AbgefahrenPanel =
  | "home"
  | "connect"
  | "dashboard"
  | "courses"
  | "schedule"
  | "documents"
  | "coach";

type AbgefahrenCourse = {
  id: string;
  title: string;
  location: string;
  start: string;
  time: string;
  seats: number;
  tag: string;
  match: string;
};

type AbgefahrenFutureDemoProps = {
  panel: AbgefahrenPanel;
  onPanelChange: (panel: AbgefahrenPanel) => void;
  accent: string;
  accentRgb: string;
  textPrimary: string;
  textSecondary: string;
  isMobile: boolean;
  onAsk: (message: string) => void;
};

const ABGEFAHREN_DEMO_COURSES: AbgefahrenCourse[] = [
  {
    id: "theorie-12-08",
    title: "7-Tage-Theoriekurs",
    location: "Schwerin",
    start: "12. August 2026",
    time: "17:30–20:30 Uhr",
    seats: 3,
    tag: "Nächster freier Kurs",
    match: "Passt zu: werktags ab 16 Uhr",
  },
  {
    id: "ferien-18-08",
    title: "Ferien-Intensivkurs",
    location: "Schwerin",
    start: "18. August 2026",
    time: "09:00–12:00 Uhr",
    seats: 5,
    tag: "Schnellster Abschluss",
    match: "Passt zu: vormittags verfügbar",
  },
  {
    id: "sternberg-25-08",
    title: "7-Tage-Theoriekurs",
    location: "Sternberg",
    start: "25. August 2026",
    time: "17:30–20:30 Uhr",
    seats: 6,
    tag: "Standort-Alternative",
    match: "Passt zu: Sternberg möglich",
  },
];

const ABGEFAHREN_DEMO_DOCUMENTS = [
  { id: "ausweis", label: "Ausweis", detail: "Geprüft", initial: true },
  { id: "sehtest", label: "Sehtest", detail: "Gültig bis 03/2028", initial: true },
  { id: "erstehilfe", label: "Erste-Hilfe-Kurs", detail: "Bescheinigung vorhanden", initial: true },
  { id: "passbild", label: "Biometrisches Passbild", detail: "Noch hochladen", initial: false },
  { id: "antrag", label: "Führerscheinantrag", detail: "Digital vorbereitet", initial: true },
] as const;

function AbgefahrenFutureDemo({
  panel,
  onPanelChange,
  accent,
  accentRgb,
  textPrimary,
  textSecondary,
  isMobile,
  onAsk,
}: AbgefahrenFutureDemoProps) {
  const [studentCode, setStudentCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [courseMode, setCourseMode] = useState<"fast" | "time">("fast");
  const [coursePreference, setCoursePreference] = useState(
    "Werktags ab 16 Uhr",
  );
  const [reservedCourseId, setReservedCourseId] = useState<string | null>(null);
  const [selectedDrivingSlot, setSelectedDrivingSlot] = useState<string | null>(
    null,
  );
  const [drivingSlotReserved, setDrivingSlotReserved] = useState(false);
  const [documents, setDocuments] = useState<Record<string, boolean>>(() =>
    ABGEFAHREN_DEMO_DOCUMENTS.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.id] = item.initial;
      return acc;
    }, {}),
  );

  if (panel === "home") return null;

  const completedDocuments = ABGEFAHREN_DEMO_DOCUMENTS.filter(
    (item) => documents[item.id],
  ).length;
  const documentProgress = Math.round(
    (completedDocuments / ABGEFAHREN_DEMO_DOCUMENTS.length) * 100,
  );
  const reservedCourse = ABGEFAHREN_DEMO_COURSES.find(
    (course) => course.id === reservedCourseId,
  );

  const glassCard: CSSProperties = {
    borderRadius: isMobile ? 22 : 26,
    border: "1px solid rgba(255,255,255,0.52)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.66))",
    boxShadow:
      "0 18px 54px rgba(34,18,27,0.10), inset 0 1px 0 rgba(255,255,255,0.70)",
    backdropFilter: "blur(22px) saturate(170%)",
    WebkitBackdropFilter: "blur(22px) saturate(170%)",
  };

  const softCard: CSSProperties = {
    borderRadius: 20,
    border: `1px solid rgba(${accentRgb}, 0.16)`,
    background: `linear-gradient(145deg, rgba(${accentRgb}, 0.10), rgba(255,255,255,0.66))`,
  };

  const primaryButton: CSSProperties = {
    minHeight: 46,
    border: "1px solid rgba(255,255,255,0.34)",
    borderRadius: 15,
    background: `linear-gradient(180deg, ${accent}, ${accent}C7)`,
    color: "#fff",
    padding: "0 17px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: `0 12px 30px rgba(${accentRgb}, 0.23), inset 0 1px 0 rgba(255,255,255,0.24)`,
  };

  const secondaryButton: CSSProperties = {
    minHeight: 43,
    border: `1px solid rgba(${accentRgb}, 0.18)`,
    borderRadius: 14,
    background: "rgba(255,255,255,0.66)",
    color: textPrimary,
    padding: "0 15px",
    fontWeight: 850,
    cursor: "pointer",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    height: 48,
    borderRadius: 14,
    border: `1px solid rgba(${accentRgb}, 0.20)`,
    background: "rgba(255,255,255,0.78)",
    color: textPrimary,
    padding: "0 14px",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const navItems: Array<{ id: AbgefahrenPanel; label: string; icon: string }> = [
    { id: "dashboard", label: "Cockpit", icon: "🪪" },
    { id: "courses", label: "Kurse", icon: "⚡" },
    { id: "schedule", label: "Fahrstunden", icon: "📅" },
    { id: "documents", label: "Unterlagen", icon: "✅" },
    { id: "coach", label: "Begleiter", icon: "✨" },
  ];

  function connectDemoStudent(useDemoData = false) {
    if (connecting) return;

    if (useDemoData) {
      setStudentCode("ABG-2048");
      setBirthDate("2007-06-12");
    }

    setConnecting(true);
    window.setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      onPanelChange("dashboard");
    }, 720);
  }

  function reserveCourse(courseId: string) {
    setReservedCourseId(courseId);
  }

  return (
    <section
      style={{
        ...glassCard,
        alignSelf: "stretch",
        padding: isMobile ? 14 : 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        color: textPrimary,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 280,
          height: 280,
          borderRadius: 999,
          right: -100,
          top: -145,
          background: `rgba(${accentRgb}, 0.13)`,
          filter: "blur(6px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => onPanelChange("home")}
          style={{
            ...secondaryButton,
            minHeight: 38,
            padding: "0 12px",
            fontSize: 12.5,
          }}
        >
          ← Übersicht
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            border: `1px solid rgba(${accentRgb}, 0.18)`,
            background: `rgba(${accentRgb}, 0.08)`,
            padding: "8px 11px",
            color: textSecondary,
            fontSize: 11.5,
            fontWeight: 900,
            letterSpacing: 0.35,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: accent,
              boxShadow: `0 0 0 5px rgba(${accentRgb}, 0.10)`,
            }}
          />
          BETA-VORSCHAU · BEISPIELDATEN
        </div>
      </div>

      {connected && (
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPanelChange(item.id)}
              style={{
                borderRadius: 999,
                border: `1px solid rgba(${accentRgb}, ${panel === item.id ? 0.34 : 0.14})`,
                background:
                  panel === item.id
                    ? `rgba(${accentRgb}, 0.15)`
                    : "rgba(255,255,255,0.54)",
                color: textPrimary,
                padding: "9px 12px",
                fontSize: 12.5,
                fontWeight: 850,
                cursor: "pointer",
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}

      {panel === "connect" && (
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
            gap: 16,
          }}
        >
          <div
            style={{
              ...softCard,
              padding: isMobile ? 18 : 24,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 330,
              gap: 22,
            }}
          >
            <div>
              <div
                style={{
                  width: 58,
                  height: 58,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 20,
                  background: `rgba(${accentRgb}, 0.15)`,
                  fontSize: 28,
                  marginBottom: 18,
                }}
              >
                🔗
              </div>
              <div style={{ fontSize: isMobile ? 25 : 31, fontWeight: 950 }}>
                Mit deiner Fahrschule verbinden
              </div>
              <div
                style={{
                  marginTop: 9,
                  color: textSecondary,
                  fontSize: 14.5,
                  lineHeight: 1.55,
                }}
              >
                Nach der Verknüpfung wird das Interface zu deinem persönlichen
                Führerscheinbegleiter. Es kennt deinen Ausbildungsstand,
                Unterlagen, Termine und die nächsten sinnvollen Schritte.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {[
                ["62 %", "Fortschritt"],
                ["4/5", "Unterlagen"],
                ["2", "Termine"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.60)",
                    border: "1px solid rgba(255,255,255,0.62)",
                    padding: "12px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 950 }}>{value}</div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 10.5,
                      color: textSecondary,
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              ...glassCard,
              padding: isMobile ? 18 : 24,
              display: "flex",
              flexDirection: "column",
              gap: 13,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 950 }}>
              Fahrschüler-Zugang
            </div>
            <div style={{ fontSize: 13.5, color: textSecondary }}>
              Später per Fahrschülernummer, QR-Code oder Fahrschul-App.
            </div>

            <label style={{ fontSize: 12.5, fontWeight: 850 }}>
              Fahrschülernummer
            </label>
            <input
              value={studentCode}
              onChange={(event) => setStudentCode(event.target.value)}
              placeholder="z. B. ABG-2048"
              style={inputStyle}
            />

            <label style={{ fontSize: 12.5, fontWeight: 850 }}>
              Geburtsdatum
            </label>
            <input
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              type="date"
              style={inputStyle}
            />

            <button
              type="button"
              onClick={() => connectDemoStudent(false)}
              style={primaryButton}
            >
              {connecting ? "Wird sicher verbunden…" : "Persönliches Cockpit öffnen"}
            </button>
            <button
              type="button"
              onClick={() => connectDemoStudent(true)}
              style={secondaryButton}
            >
              Demo-Zugang verwenden
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: textSecondary,
                fontSize: 11.5,
                lineHeight: 1.4,
              }}
            >
              <span>🔒</span>
              Die echte Version kann mit der Fahrschulsoftware verbunden werden.
            </div>
          </div>
        </div>
      )}

      {panel === "dashboard" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {!connected && (
            <div
              style={{
                ...softCard,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 950 }}>Demo-Fahrschüler aktiv</div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 12.5,
                    marginTop: 3,
                  }}
                >
                  Hier wird gezeigt, wie das persönliche Cockpit später aussieht.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPanelChange("connect")}
                style={secondaryButton}
              >
                Eigenen Zugang verbinden
              </button>
            </div>
          )}

          <div
            style={{
              ...softCard,
              padding: isMobile ? 18 : 22,
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: textSecondary,
                  fontWeight: 900,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                Persönlicher Führerscheinbegleiter
              </div>
              <div
                style={{
                  fontSize: isMobile ? 25 : 32,
                  fontWeight: 950,
                  marginTop: 4,
                }}
              >
                Moin Max, du bist auf Kurs.
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginTop: 7,
                }}
              >
                Dein nächster sinnvoller Schritt: Passbild hochladen und danach
                die Theorieprüfung vormerken.
              </div>
            </div>

            <div
              style={{
                width: 116,
                height: 116,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: `conic-gradient(${accent} 0 62%, rgba(${accentRgb}, 0.12) 62% 100%)`,
                boxShadow: `0 18px 38px rgba(${accentRgb}, 0.18)`,
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,255,255,0.92)",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 24, fontWeight: 950 }}>62 %</div>
                  <div style={{ fontSize: 10.5, color: textSecondary }}>
                    Gesamtstand
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {[
              ["📚", "Theorie", "10 von 14 Themen", "71 %"],
              ["✅", "Unterlagen", "4 von 5 vollständig", "80 %"],
              ["🚘", "Praxis", "8 Fahrstunden", "Im Plan"],
            ].map(([icon, title, detail, value]) => (
              <button
                key={title}
                type="button"
                onClick={() =>
                  onPanelChange(title === "Unterlagen" ? "documents" : "coach")
                }
                style={{
                  ...glassCard,
                  padding: 16,
                  color: textPrimary,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div style={{ fontWeight: 950, marginTop: 8 }}>{title}</div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 12.5,
                    marginTop: 4,
                  }}
                >
                  {detail}
                </div>
                <div
                  style={{
                    color: accent,
                    fontSize: 12.5,
                    fontWeight: 950,
                    marginTop: 9,
                  }}
                >
                  {value} →
                </div>
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.15fr 0.85fr",
              gap: 12,
            }}
          >
            <div style={{ ...glassCard, padding: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>
                    Dein nächster Termin
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: textSecondary,
                      marginTop: 3,
                    }}
                  >
                    Automatisch aus deinem Fahrschulkalender
                  </div>
                </div>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "7px 10px",
                    background: `rgba(${accentRgb}, 0.11)`,
                    color: accent,
                    fontSize: 11,
                    fontWeight: 950,
                  }}
                >
                  MORGEN
                </span>
              </div>

              <div
                style={{
                  ...softCard,
                  padding: 16,
                  marginTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 950 }}>🚘 Fahrstunde · Stadtverkehr</div>
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: 13,
                      marginTop: 5,
                    }}
                  >
                    Mittwoch, 5. August · 16:30–17:15 Uhr
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onPanelChange("schedule")}
                  style={secondaryButton}
                >
                  Termin verwalten
                </button>
              </div>
            </div>

            <div
              style={{
                ...glassCard,
                padding: 18,
                background: `linear-gradient(145deg, rgba(${accentRgb}, 0.18), rgba(255,255,255,0.74))`,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                ✨ Dein Begleiter empfiehlt
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  marginTop: 8,
                }}
              >
                Heute noch 15 Minuten Vorfahrt und Geschwindigkeit üben. Das
                passt zu deiner nächsten Fahrstunde.
              </div>
              <button
                type="button"
                onClick={() => onPanelChange("coach")}
                style={{ ...primaryButton, width: "100%", marginTop: 14 }}
              >
                Persönlichen Plan öffnen
              </button>
            </div>
          </div>
        </div>
      )}

      {panel === "courses" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: isMobile ? 25 : 31, fontWeight: 950 }}>
              In wenigen Klicks zum passenden Kurs
            </div>
            <div
              style={{
                color: textSecondary,
                fontSize: 14,
                lineHeight: 1.5,
                marginTop: 6,
              }}
            >
              Das Interface gleicht Klasse, Standort und freie Zeit automatisch
              mit den nächsten Kursen ab.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {[
              ["1", "Klasse", "B / B197"],
              ["2", "Deine Zeit", coursePreference],
              ["3", "Kurs", reservedCourse ? "Vorgemerkt" : "Auswählen"],
            ].map(([number, label, value]) => (
              <div key={number} style={{ ...softCard, padding: 13 }}>
                <div
                  style={{
                    color: accent,
                    fontSize: 11,
                    fontWeight: 950,
                    textTransform: "uppercase",
                  }}
                >
                  Schritt {number}
                </div>
                <div style={{ fontWeight: 950, marginTop: 4 }}>{label}</div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 11.5,
                    marginTop: 3,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...glassCard, padding: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 950 }}>Wie möchtest du starten?</div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 12.5,
                    marginTop: 3,
                  }}
                >
                  Die Vorschläge sortieren sich sofort neu.
                </div>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setCourseMode("fast")}
                  style={{
                    ...secondaryButton,
                    background:
                      courseMode === "fast"
                        ? `rgba(${accentRgb}, 0.16)`
                        : "rgba(255,255,255,0.62)",
                  }}
                >
                  ⚡ So schnell wie möglich
                </button>
                <button
                  type="button"
                  onClick={() => setCourseMode("time")}
                  style={{
                    ...secondaryButton,
                    background:
                      courseMode === "time"
                        ? `rgba(${accentRgb}, 0.16)`
                        : "rgba(255,255,255,0.62)",
                  }}
                >
                  🕒 Nach meiner Zeit
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 14,
              }}
            >
              {[
                "Werktags ab 16 Uhr",
                "Ferien vormittags",
                "Nur Schwerin",
                "Sternberg möglich",
              ].map((preference) => (
                <button
                  key={preference}
                  type="button"
                  onClick={() => setCoursePreference(preference)}
                  style={{
                    borderRadius: 999,
                    border: `1px solid rgba(${accentRgb}, ${coursePreference === preference ? 0.34 : 0.14})`,
                    background:
                      coursePreference === preference
                        ? `rgba(${accentRgb}, 0.14)`
                        : "rgba(255,255,255,0.54)",
                    color: textPrimary,
                    padding: "9px 12px",
                    fontSize: 12.5,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  {preference}
                </button>
              ))}
            </div>
          </div>

          {reservedCourse ? (
            <div
              style={{
                ...softCard,
                padding: isMobile ? 18 : 22,
                border: `1px solid rgba(${accentRgb}, 0.30)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    background: `rgba(${accentRgb}, 0.17)`,
                    fontSize: 23,
                  }}
                >
                  ✓
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 950 }}>
                    Platz ist vorgemerkt
                  </div>
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      marginTop: 5,
                    }}
                  >
                    {reservedCourse.title} in {reservedCourse.location} · Start
                    am {reservedCourse.start}. In der echten Version würde der
                    Platz jetzt kurz reserviert und die Anmeldung direkt
                    abgeschlossen.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onPanelChange("connect")}
                      style={primaryButton}
                    >
                      Anmeldung in 60 Sekunden abschließen
                    </button>
                    <button
                      type="button"
                      onClick={() => setReservedCourseId(null)}
                      style={secondaryButton}
                    >
                      Anderen Kurs wählen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 11,
              }}
            >
              {ABGEFAHREN_DEMO_COURSES.map((course, index) => (
                <div
                  key={course.id}
                  style={{
                    ...glassCard,
                    padding: 17,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    border:
                      index === 0
                        ? `1px solid rgba(${accentRgb}, 0.34)`
                        : glassCard.border,
                  }}
                >
                  <div
                    style={{
                      alignSelf: "flex-start",
                      borderRadius: 999,
                      background:
                        index === 0
                          ? `rgba(${accentRgb}, 0.15)`
                          : "rgba(17,24,39,0.06)",
                      color: index === 0 ? accent : textSecondary,
                      padding: "7px 9px",
                      fontSize: 10.5,
                      fontWeight: 950,
                    }}
                  >
                    {course.tag}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>
                      {course.title}
                    </div>
                    <div
                      style={{
                        color: textSecondary,
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        marginTop: 6,
                      }}
                    >
                      📍 {course.location}
                      <br />📆 {course.start}
                      <br />🕒 {course.time}
                    </div>
                  </div>
                  <div
                    style={{
                      ...softCard,
                      padding: 11,
                      fontSize: 11.5,
                      color: textSecondary,
                    }}
                  >
                    ✓ {course.match}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginTop: "auto",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        color: course.seats <= 3 ? accent : textSecondary,
                        fontWeight: 900,
                      }}
                    >
                      {course.seats} Beispielplätze frei
                    </span>
                    <button
                      type="button"
                      onClick={() => reserveCourse(course.id)}
                      style={{
                        ...primaryButton,
                        minHeight: 40,
                        padding: "0 13px",
                        fontSize: 12,
                      }}
                    >
                      Auswählen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {panel === "schedule" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: isMobile ? 25 : 31, fontWeight: 950 }}>
              Fahrstunden passend zu deinem Alltag
            </div>
            <div
              style={{
                color: textSecondary,
                fontSize: 14,
                lineHeight: 1.5,
                marginTop: 6,
              }}
            >
              Freie Zeiten werden später automatisch mit deinem Fahrlehrer,
              Ausbildungsstand und deinen Verfügbarkeiten abgeglichen.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "0.75fr 1.25fr",
              gap: 12,
            }}
          >
            <div style={{ ...glassCard, padding: 17 }}>
              <div style={{ fontWeight: 950 }}>Deine Verfügbarkeit</div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 12.5,
                  marginTop: 4,
                }}
              >
                Einmal hinterlegen, automatisch berücksichtigen.
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {[
                  "Mo–Fr ab 16:00 Uhr",
                  "Mittwoch ab 14:00 Uhr",
                  "Samstag flexibel",
                ].map((time, index) => (
                  <label
                    key={time}
                    style={{
                      ...softCard,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 12.5,
                      fontWeight: 800,
                    }}
                  >
                    <input type="checkbox" defaultChecked={index < 2} />
                    {time}
                  </label>
                ))}
              </div>
              <button
                type="button"
                style={{ ...secondaryButton, width: "100%", marginTop: 13 }}
              >
                Verfügbarkeit bearbeiten
              </button>
            </div>

            <div style={{ ...glassCard, padding: 17 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 950 }}>Passende freie Zeiten</div>
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: 12.5,
                      marginTop: 4,
                    }}
                  >
                    Sortiert nach deiner Verfügbarkeit
                  </div>
                </div>
                <span
                  style={{
                    color: accent,
                    fontSize: 11.5,
                    fontWeight: 950,
                  }}
                >
                  LIVE-ANSICHT ALS DEMO
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {[
                  ["Heute", "17:15", "Grundfahraufgaben"],
                  ["Mittwoch", "16:30", "Stadtverkehr"],
                  ["Freitag", "18:00", "Überlandfahrt"],
                ].map(([day, time, topic]) => {
                  const slotId = `${day}-${time}`;
                  const selected = selectedDrivingSlot === slotId;
                  return (
                    <button
                      key={slotId}
                      type="button"
                      onClick={() => {
                        setSelectedDrivingSlot(slotId);
                        setDrivingSlotReserved(false);
                      }}
                      style={{
                        ...softCard,
                        padding: 14,
                        color: textPrimary,
                        textAlign: "left",
                        cursor: "pointer",
                        border: `1px solid rgba(${accentRgb}, ${selected ? 0.40 : 0.14})`,
                        background: selected
                          ? `rgba(${accentRgb}, 0.16)`
                          : softCard.background,
                      }}
                    >
                      <div
                        style={{
                          color: textSecondary,
                          fontSize: 11.5,
                          fontWeight: 850,
                        }}
                      >
                        {day}
                      </div>
                      <div
                        style={{
                          fontSize: 23,
                          fontWeight: 950,
                          marginTop: 2,
                        }}
                      >
                        {time}
                      </div>
                      <div
                        style={{
                          color: textSecondary,
                          fontSize: 11.5,
                          marginTop: 5,
                        }}
                      >
                        {topic}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDrivingSlot && (
                <div
                  style={{
                    ...softCard,
                    padding: 14,
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 950 }}>
                      {drivingSlotReserved
                        ? "✓ Fahrstunde vorgemerkt"
                        : "Zeit passt zu deinem Profil"}
                    </div>
                    <div
                      style={{
                        color: textSecondary,
                        fontSize: 12.5,
                        marginTop: 3,
                      }}
                    >
                      {drivingSlotReserved
                        ? "In der echten Version folgt direkt die Bestätigung."
                        : "Ein Klick würde den Slot verbindlich anfragen."}
                    </div>
                  </div>
                  {!drivingSlotReserved && (
                    <button
                      type="button"
                      onClick={() => setDrivingSlotReserved(true)}
                      style={primaryButton}
                    >
                      Fahrstunde vormerken
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {panel === "documents" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: isMobile ? 25 : 31, fontWeight: 950 }}>
                Unterlagen ohne Papierchaos
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginTop: 6,
                }}
              >
                Hochladen, prüfen lassen und jederzeit sehen, was noch fehlt.
              </div>
            </div>
            <div style={{ minWidth: 150 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11.5,
                  fontWeight: 900,
                  marginBottom: 7,
                }}
              >
                <span>Vollständigkeit</span>
                <span>{documentProgress} %</span>
              </div>
              <div
                style={{
                  height: 9,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: `rgba(${accentRgb}, 0.10)`,
                }}
              >
                <div
                  style={{
                    width: `${documentProgress}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: accent,
                    transition: "width 220ms ease",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr",
              gap: 12,
            }}
          >
            <div
              style={{
                ...glassCard,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {ABGEFAHREN_DEMO_DOCUMENTS.map((item) => {
                const done = documents[item.id];
                return (
                  <div
                    key={item.id}
                    style={{
                      ...softCard,
                      padding: 13,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 11,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background: done
                            ? `rgba(${accentRgb}, 0.15)`
                            : "rgba(17,24,39,0.06)",
                          fontWeight: 950,
                          color: done ? accent : textSecondary,
                        }}
                      >
                        {done ? "✓" : "!"}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 950 }}>
                          {item.label}
                        </div>
                        <div
                          style={{
                            color: textSecondary,
                            fontSize: 11.5,
                            marginTop: 3,
                          }}
                        >
                          {done ? item.detail : "Wird noch benötigt"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDocuments((current) => ({
                          ...current,
                          [item.id]: !current[item.id],
                        }))
                      }
                      style={{
                        ...secondaryButton,
                        minHeight: 36,
                        padding: "0 11px",
                        fontSize: 11.5,
                      }}
                    >
                      {done ? "Öffnen" : "Hochladen"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                ...glassCard,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 13,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                🏛️ Antrag & Behörde
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                }}
              >
                Das Interface könnte den Antrag vorbereiten, fehlende Angaben
                erkennen und den Status bis zur Prüfungsfreigabe anzeigen.
              </div>
              <div style={{ ...softCard, padding: 14 }}>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 11.5,
                    fontWeight: 850,
                  }}
                >
                  AKTUELLER DEMO-STATUS
                </div>
                <div style={{ fontWeight: 950, marginTop: 5 }}>
                  Antrag vorbereitet
                </div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Noch nicht an die Behörde übermittelt
                </div>
              </div>
              <button type="button" style={primaryButton}>
                Antrag digital vervollständigen
              </button>
            </div>
          </div>
        </div>
      )}

      {panel === "coach" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              ...softCard,
              padding: isMobile ? 18 : 24,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.15fr 0.85fr",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: accent,
                  fontSize: 11.5,
                  fontWeight: 950,
                  letterSpacing: 0.5,
                }}
              >
                DEIN PERSÖNLICHER BEGLEITER
              </div>
              <div
                style={{
                  fontSize: isMobile ? 26 : 34,
                  fontWeight: 950,
                  marginTop: 5,
                }}
              >
                Er kennt deinen Stand – nicht nur deine Frage.
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 14,
                  lineHeight: 1.55,
                  marginTop: 9,
                }}
              >
                Antworten, Lernempfehlungen und nächste Schritte werden passend
                zu deiner Klasse, deinem Fortschritt und deinen Terminen
                vorbereitet.
              </div>
            </div>
            <div
              style={{
                width: isMobile ? 150 : 180,
                height: isMobile ? 150 : 180,
                margin: "0 auto",
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.90), rgba(${accentRgb}, 0.24) 48%, rgba(${accentRgb}, 0.10) 72%)`,
                boxShadow: `0 24px 70px rgba(${accentRgb}, 0.24), inset 0 1px 0 rgba(255,255,255,0.80)`,
                fontSize: 54,
              }}
            >
              ✨
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "0.85fr 1.15fr",
              gap: 12,
            }}
          >
            <div style={{ ...glassCard, padding: 17 }}>
              <div style={{ fontWeight: 950 }}>Was der Begleiter weiß</div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 13,
                }}
              >
                {[
                  ["🪪", "Klasse B197"],
                  ["📚", "10 von 14 Theoriethemen"],
                  ["✅", "Passbild fehlt noch"],
                  ["📅", "Nächste Fahrstunde morgen"],
                ].map(([icon, value]) => (
                  <div
                    key={value}
                    style={{
                      ...softCard,
                      padding: 11,
                      fontSize: 12.5,
                      fontWeight: 850,
                    }}
                  >
                    {icon} {value}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...glassCard, padding: 17 }}>
              <div style={{ fontWeight: 950 }}>Direkt ausprobieren</div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 12.5,
                  marginTop: 4,
                }}
              >
                Die Frage wird in den normalen Chat übernommen.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 8,
                  marginTop: 13,
                }}
              >
                {[
                  "Was soll ich heute für die Theorie lernen?",
                  "Was fehlt mir noch für die Prüfungsfreigabe?",
                  "Bin ich bereit für die Theorieprüfung?",
                  "Welche Fahrstunde passt als Nächstes zu mir?",
                ].map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onAsk(question)}
                    style={{
                      ...softCard,
                      color: textPrimary,
                      padding: 13,
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 12.5,
                      lineHeight: 1.4,
                      fontWeight: 850,
                    }}
                  >
                    {question} →
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              ...glassCard,
              padding: 17,
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 950 }}>Dein Plan für heute</div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 12.5,
                  marginTop: 4,
                }}
              >
                15 Minuten Vorfahrt · 10 Prüfungsfragen · Passbild hochladen
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAsk("Erstelle mir meinen persönlichen Lernplan für heute.")}
              style={primaryButton}
            >
              Tagesplan starten
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

type HohenbadenPanel =
  | "home"
  | "connect"
  | "dashboard"
  | "courses"
  | "schedule"
  | "documents"
  | "coach";

type HohenbadenCourse = {
  id: string;
  title: string;
  location: string;
  start: string;
  time: string;
  seats: number;
  tag: string;
  match: string;
};

type HohenbadenFutureDemoProps = {
  panel: HohenbadenPanel;
  onPanelChange: (panel: HohenbadenPanel) => void;
  accent: string;
  accentRgb: string;
  textPrimary: string;
  textSecondary: string;
  isMobile: boolean;
  onAsk: (message: string) => void;
};

const HOHENBADEN_DEMO_COURSES: HohenbadenCourse[] = [
  {
    id: "intensiv-17-08",
    title: "Klasse B / B197 Intensiv",
    location: "Baden-Baden",
    start: "17. August 2026",
    time: "Mo.–Fr. nach Intensivplan",
    seats: 3,
    tag: "Nächster Intensivstart",
    match: "Passt zu: etwa 2 Wochen Urlaub",
  },
  {
    id: "intensiv-31-08",
    title: "Klasse B / B197 Intensiv",
    location: "Bühl",
    start: "31. August 2026",
    time: "Theorie und Praxis kompakt",
    seats: 4,
    tag: "Standort-Alternative",
    match: "Passt zu: Bühl und flexible Zeiten",
  },
  {
    id: "motorrad-14-09",
    title: "Motorrad Intensiv A / A2 / A1",
    location: "Baden-Baden",
    start: "14. September 2026",
    time: "7–10 Tage · wetterabhängig",
    seats: 2,
    tag: "Motorrad-Intensiv",
    match: "Passt zu: frühzeitig geplant",
  },
];

const HOHENBADEN_DEMO_DOCUMENTS = [
  { id: "ausweis", label: "Ausweiskopie", detail: "Geprüft", initial: true },
  { id: "sehtest", label: "Sehtest", detail: "Gültig bis 03/2028", initial: true },
  { id: "erstehilfe", label: "Erste-Hilfe-Kurs", detail: "Bei in7Days absolviert", initial: true },
  { id: "passbild", label: "Biometrisches Passbild", detail: "Noch hochladen", initial: false },
  { id: "antrag", label: "Fahrerlaubnisantrag", detail: "Digital vorbereitet", initial: true },
] as const;

function HohenbadenFutureDemo({
  panel,
  onPanelChange,
  accent,
  accentRgb,
  textPrimary,
  textSecondary,
  isMobile,
  onAsk,
}: HohenbadenFutureDemoProps) {
  const [studentCode, setStudentCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [courseMode, setCourseMode] = useState<"fast" | "time">("fast");
  const [coursePreference, setCoursePreference] = useState(
    "Etwa 2 Wochen Urlaub",
  );
  const [reservedCourseId, setReservedCourseId] = useState<string | null>(null);
  const [selectedDrivingSlot, setSelectedDrivingSlot] = useState<string | null>(
    null,
  );
  const [drivingSlotReserved, setDrivingSlotReserved] = useState(false);
  const [documents, setDocuments] = useState<Record<string, boolean>>(() =>
    HOHENBADEN_DEMO_DOCUMENTS.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.id] = item.initial;
      return acc;
    }, {}),
  );

  if (panel === "home") return null;

  const completedDocuments = HOHENBADEN_DEMO_DOCUMENTS.filter(
    (item) => documents[item.id],
  ).length;
  const documentProgress = Math.round(
    (completedDocuments / HOHENBADEN_DEMO_DOCUMENTS.length) * 100,
  );
  const reservedCourse = HOHENBADEN_DEMO_COURSES.find(
    (course) => course.id === reservedCourseId,
  );

  const glassCard: CSSProperties = {
    borderRadius: isMobile ? 22 : 26,
    border: "1px solid rgba(255,255,255,0.52)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.66))",
    boxShadow:
      "0 18px 54px rgba(34,18,27,0.10), inset 0 1px 0 rgba(255,255,255,0.70)",
    backdropFilter: "blur(22px) saturate(170%)",
    WebkitBackdropFilter: "blur(22px) saturate(170%)",
  };

  const softCard: CSSProperties = {
    borderRadius: 20,
    border: `1px solid rgba(${accentRgb}, 0.16)`,
    background: `linear-gradient(145deg, rgba(${accentRgb}, 0.10), rgba(255,255,255,0.66))`,
  };

  const primaryButton: CSSProperties = {
    minHeight: 46,
    border: "1px solid rgba(255,255,255,0.34)",
    borderRadius: 15,
    background: `linear-gradient(180deg, ${accent}, ${accent}C7)`,
    color: "#fff",
    padding: "0 17px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: `0 12px 30px rgba(${accentRgb}, 0.23), inset 0 1px 0 rgba(255,255,255,0.24)`,
  };

  const secondaryButton: CSSProperties = {
    minHeight: 43,
    border: `1px solid rgba(${accentRgb}, 0.18)`,
    borderRadius: 14,
    background: "rgba(255,255,255,0.66)",
    color: textPrimary,
    padding: "0 15px",
    fontWeight: 850,
    cursor: "pointer",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    height: 48,
    borderRadius: 14,
    border: `1px solid rgba(${accentRgb}, 0.20)`,
    background: "rgba(255,255,255,0.78)",
    color: textPrimary,
    padding: "0 14px",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const navItems: Array<{ id: HohenbadenPanel; label: string; icon: string }> = [
    { id: "dashboard", label: "Cockpit", icon: "🪪" },
    { id: "courses", label: "Kurse", icon: "⚡" },
    { id: "schedule", label: "Fahrstunden", icon: "📅" },
    { id: "documents", label: "Unterlagen", icon: "✅" },
    { id: "coach", label: "Begleiter", icon: "✨" },
  ];

  function connectDemoStudent(useDemoData = false) {
    if (connecting) return;

    if (useDemoData) {
      setStudentCode("HOB-2048");
      setBirthDate("2007-06-12");
    }

    setConnecting(true);
    window.setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      onPanelChange("dashboard");
    }, 720);
  }

  function reserveCourse(courseId: string) {
    setReservedCourseId(courseId);
  }

  return (
    <section
      style={{
        ...glassCard,
        alignSelf: "stretch",
        padding: isMobile ? 14 : 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        color: textPrimary,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 280,
          height: 280,
          borderRadius: 999,
          right: -100,
          top: -145,
          background: `rgba(${accentRgb}, 0.13)`,
          filter: "blur(6px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => onPanelChange("home")}
          style={{
            ...secondaryButton,
            minHeight: 38,
            padding: "0 12px",
            fontSize: 12.5,
          }}
        >
          ← Übersicht
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            border: `1px solid rgba(${accentRgb}, 0.18)`,
            background: `rgba(${accentRgb}, 0.08)`,
            padding: "8px 11px",
            color: textSecondary,
            fontSize: 11.5,
            fontWeight: 900,
            letterSpacing: 0.35,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: accent,
              boxShadow: `0 0 0 5px rgba(${accentRgb}, 0.10)`,
            }}
          />
          BETA-VORSCHAU · BEISPIELDATEN
        </div>
      </div>

      {connected && (
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPanelChange(item.id)}
              style={{
                borderRadius: 999,
                border: `1px solid rgba(${accentRgb}, ${panel === item.id ? 0.34 : 0.14})`,
                background:
                  panel === item.id
                    ? `rgba(${accentRgb}, 0.15)`
                    : "rgba(255,255,255,0.54)",
                color: textPrimary,
                padding: "9px 12px",
                fontSize: 12.5,
                fontWeight: 850,
                cursor: "pointer",
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}

      {panel === "connect" && (
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
            gap: 16,
          }}
        >
          <div
            style={{
              ...softCard,
              padding: isMobile ? 18 : 24,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 330,
              gap: 22,
            }}
          >
            <div>
              <div
                style={{
                  width: 58,
                  height: 58,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 20,
                  background: `rgba(${accentRgb}, 0.15)`,
                  fontSize: 28,
                  marginBottom: 18,
                }}
              >
                🔗
              </div>
              <div style={{ fontSize: isMobile ? 25 : 31, fontWeight: 950 }}>
                Mit deiner Fahrschule verbinden
              </div>
              <div
                style={{
                  marginTop: 9,
                  color: textSecondary,
                  fontSize: 14.5,
                  lineHeight: 1.55,
                }}
              >
                Nach der Verknüpfung wird das Interface zu deinem persönlichen
                Führerscheinbegleiter. Es kennt deinen Ausbildungsstand,
                Unterlagen, Termine und die nächsten sinnvollen Schritte.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {[
                ["62 %", "Fortschritt"],
                ["4/5", "Unterlagen"],
                ["2", "Termine"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.60)",
                    border: "1px solid rgba(255,255,255,0.62)",
                    padding: "12px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 950 }}>{value}</div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 10.5,
                      color: textSecondary,
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              ...glassCard,
              padding: isMobile ? 18 : 24,
              display: "flex",
              flexDirection: "column",
              gap: 13,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 950 }}>
              Fahrschüler-Zugang
            </div>
            <div style={{ fontSize: 13.5, color: textSecondary }}>
              Später per Fahrschülernummer, QR-Code oder Verknüpfung mit Fahrschulsoftware und THEO App.
            </div>

            <label style={{ fontSize: 12.5, fontWeight: 850 }}>
              Fahrschülernummer
            </label>
            <input
              value={studentCode}
              onChange={(event) => setStudentCode(event.target.value)}
              placeholder="z. B. HOB-2048"
              style={inputStyle}
            />

            <label style={{ fontSize: 12.5, fontWeight: 850 }}>
              Geburtsdatum
            </label>
            <input
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              type="date"
              style={inputStyle}
            />

            <button
              type="button"
              onClick={() => connectDemoStudent(false)}
              style={primaryButton}
            >
              {connecting ? "Wird sicher verbunden…" : "Persönliches Cockpit öffnen"}
            </button>
            <button
              type="button"
              onClick={() => connectDemoStudent(true)}
              style={secondaryButton}
            >
              Demo-Zugang verwenden
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: textSecondary,
                fontSize: 11.5,
                lineHeight: 1.4,
              }}
            >
              <span>🔒</span>
              Die echte Version kann Fahrschulsoftware, THEO-Lernstand und Kursplanung verbinden.
            </div>
          </div>
        </div>
      )}

      {panel === "dashboard" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {!connected && (
            <div
              style={{
                ...softCard,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 950 }}>Demo-Fahrschüler aktiv</div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 12.5,
                    marginTop: 3,
                  }}
                >
                  Hier wird gezeigt, wie das persönliche Cockpit später aussieht.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPanelChange("connect")}
                style={secondaryButton}
              >
                Eigenen Zugang verbinden
              </button>
            </div>
          )}

          <div
            style={{
              ...softCard,
              padding: isMobile ? 18 : 22,
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: textSecondary,
                  fontWeight: 900,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                Persönlicher in7Days Führerscheinbegleiter
              </div>
              <div
                style={{
                  fontSize: isMobile ? 25 : 32,
                  fontWeight: 950,
                  marginTop: 4,
                }}
              >
                Hallo Max, dein Intensivkurs ist vorbereitet.
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginTop: 7,
                }}
              >
                Dein nächster sinnvoller Schritt: Passbild hochladen, den THEO-Lernstand prüfen und anschließend deinen Intensivplatz bestätigen.
              </div>
            </div>

            <div
              style={{
                width: 116,
                height: 116,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: `conic-gradient(${accent} 0 62%, rgba(${accentRgb}, 0.12) 62% 100%)`,
                boxShadow: `0 18px 38px rgba(${accentRgb}, 0.18)`,
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,255,255,0.92)",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 24, fontWeight: 950 }}>62 %</div>
                  <div style={{ fontSize: 10.5, color: textSecondary }}>
                    Gesamtstand
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {[
              ["📱", "THEO App", "72 % Lernstand", "Im Plan"],
              ["✅", "Unterlagen", "4 von 5 vollständig", "80 %"],
              ["🚘", "Praxis", "6 Fahrstunden geplant", "Intensiv"],
            ].map(([icon, title, detail, value]) => (
              <button
                key={title}
                type="button"
                onClick={() =>
                  onPanelChange(title === "Unterlagen" ? "documents" : "coach")
                }
                style={{
                  ...glassCard,
                  padding: 16,
                  color: textPrimary,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div style={{ fontWeight: 950, marginTop: 8 }}>{title}</div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 12.5,
                    marginTop: 4,
                  }}
                >
                  {detail}
                </div>
                <div
                  style={{
                    color: accent,
                    fontSize: 12.5,
                    fontWeight: 950,
                    marginTop: 9,
                  }}
                >
                  {value} →
                </div>
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.15fr 0.85fr",
              gap: 12,
            }}
          >
            <div style={{ ...glassCard, padding: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>
                    Dein nächster Termin
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: textSecondary,
                      marginTop: 3,
                    }}
                  >
                    Automatisch aus deinem Fahrschulkalender
                  </div>
                </div>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "7px 10px",
                    background: `rgba(${accentRgb}, 0.11)`,
                    color: accent,
                    fontSize: 11,
                    fontWeight: 950,
                  }}
                >
                  MORGEN
                </span>
              </div>

              <div
                style={{
                  ...softCard,
                  padding: 16,
                  marginTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 950 }}>🚘 Fahrstunde · Stadtverkehr</div>
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: 13,
                      marginTop: 5,
                    }}
                  >
                    Mittwoch, 5. August · 16:30–17:15 Uhr
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onPanelChange("schedule")}
                  style={secondaryButton}
                >
                  Termin verwalten
                </button>
              </div>
            </div>

            <div
              style={{
                ...glassCard,
                padding: 18,
                background: `linear-gradient(145deg, rgba(${accentRgb}, 0.18), rgba(255,255,255,0.74))`,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                ✨ Dein Begleiter empfiehlt
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  marginTop: 8,
                }}
              >
                Heute noch 15 Minuten Vorfahrt und Geschwindigkeit üben. Das
                passt zu deiner nächsten Fahrstunde.
              </div>
              <button
                type="button"
                onClick={() => onPanelChange("coach")}
                style={{ ...primaryButton, width: "100%", marginTop: 14 }}
              >
                Persönlichen Plan öffnen
              </button>
            </div>
          </div>
        </div>
      )}

      {panel === "courses" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: isMobile ? 25 : 31, fontWeight: 950 }}>
              In wenigen Klicks zum passenden Intensivkurs
            </div>
            <div
              style={{
                color: textSecondary,
                fontSize: 14,
                lineHeight: 1.5,
                marginTop: 6,
              }}
            >
              Das Interface gleicht Klasse, Standort, Urlaubszeit und Bearbeitungsstand automatisch mit den nächsten Intensivkursen ab.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {[
              ["1", "Klasse", "B / B197 / A"],
              ["2", "Deine Zeit", coursePreference],
              ["3", "Kurs", reservedCourse ? "Vorgemerkt" : "Auswählen"],
            ].map(([number, label, value]) => (
              <div key={number} style={{ ...softCard, padding: 13 }}>
                <div
                  style={{
                    color: accent,
                    fontSize: 11,
                    fontWeight: 950,
                    textTransform: "uppercase",
                  }}
                >
                  Schritt {number}
                </div>
                <div style={{ fontWeight: 950, marginTop: 4 }}>{label}</div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 11.5,
                    marginTop: 3,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...glassCard, padding: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 950 }}>Wie möchtest du starten?</div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 12.5,
                    marginTop: 3,
                  }}
                >
                  Die Vorschläge sortieren sich sofort neu.
                </div>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setCourseMode("fast")}
                  style={{
                    ...secondaryButton,
                    background:
                      courseMode === "fast"
                        ? `rgba(${accentRgb}, 0.16)`
                        : "rgba(255,255,255,0.62)",
                  }}
                >
                  ⚡ So schnell wie möglich
                </button>
                <button
                  type="button"
                  onClick={() => setCourseMode("time")}
                  style={{
                    ...secondaryButton,
                    background:
                      courseMode === "time"
                        ? `rgba(${accentRgb}, 0.16)`
                        : "rgba(255,255,255,0.62)",
                  }}
                >
                  🕒 Nach meiner Zeit
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 14,
              }}
            >
              {[
                "Etwa 2 Wochen Urlaub",
                "Start im August",
                "Nur Baden-Baden",
                "Bühl möglich",
              ].map((preference) => (
                <button
                  key={preference}
                  type="button"
                  onClick={() => setCoursePreference(preference)}
                  style={{
                    borderRadius: 999,
                    border: `1px solid rgba(${accentRgb}, ${coursePreference === preference ? 0.34 : 0.14})`,
                    background:
                      coursePreference === preference
                        ? `rgba(${accentRgb}, 0.14)`
                        : "rgba(255,255,255,0.54)",
                    color: textPrimary,
                    padding: "9px 12px",
                    fontSize: 12.5,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  {preference}
                </button>
              ))}
            </div>
          </div>

          {reservedCourse ? (
            <div
              style={{
                ...softCard,
                padding: isMobile ? 18 : 22,
                border: `1px solid rgba(${accentRgb}, 0.30)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    background: `rgba(${accentRgb}, 0.17)`,
                    fontSize: 23,
                  }}
                >
                  ✓
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 950 }}>
                    Platz ist vorgemerkt
                  </div>
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      marginTop: 5,
                    }}
                  >
                    {reservedCourse.title} in {reservedCourse.location} · Start
                    am {reservedCourse.start}. In der echten Version würde der
                    Platz jetzt kurz reserviert und die Anmeldung direkt
                    abgeschlossen.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onPanelChange("connect")}
                      style={primaryButton}
                    >
                      Intensivplatz in 60 Sekunden anfragen
                    </button>
                    <button
                      type="button"
                      onClick={() => setReservedCourseId(null)}
                      style={secondaryButton}
                    >
                      Anderen Kurs wählen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 11,
              }}
            >
              {HOHENBADEN_DEMO_COURSES.map((course, index) => (
                <div
                  key={course.id}
                  style={{
                    ...glassCard,
                    padding: 17,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    border:
                      index === 0
                        ? `1px solid rgba(${accentRgb}, 0.34)`
                        : glassCard.border,
                  }}
                >
                  <div
                    style={{
                      alignSelf: "flex-start",
                      borderRadius: 999,
                      background:
                        index === 0
                          ? `rgba(${accentRgb}, 0.15)`
                          : "rgba(17,24,39,0.06)",
                      color: index === 0 ? accent : textSecondary,
                      padding: "7px 9px",
                      fontSize: 10.5,
                      fontWeight: 950,
                    }}
                  >
                    {course.tag}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>
                      {course.title}
                    </div>
                    <div
                      style={{
                        color: textSecondary,
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        marginTop: 6,
                      }}
                    >
                      📍 {course.location}
                      <br />📆 {course.start}
                      <br />🕒 {course.time}
                    </div>
                  </div>
                  <div
                    style={{
                      ...softCard,
                      padding: 11,
                      fontSize: 11.5,
                      color: textSecondary,
                    }}
                  >
                    ✓ {course.match}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginTop: "auto",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        color: course.seats <= 3 ? accent : textSecondary,
                        fontWeight: 900,
                      }}
                    >
                      {course.seats} Beispielplätze frei
                    </span>
                    <button
                      type="button"
                      onClick={() => reserveCourse(course.id)}
                      style={{
                        ...primaryButton,
                        minHeight: 40,
                        padding: "0 13px",
                        fontSize: 12,
                      }}
                    >
                      Auswählen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {panel === "schedule" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: isMobile ? 25 : 31, fontWeight: 950 }}>
              Fahrstunden passend zu deinem Intensivplan
            </div>
            <div
              style={{
                color: textSecondary,
                fontSize: 14,
                lineHeight: 1.5,
                marginTop: 6,
              }}
            >
              Freie Zeiten werden später automatisch mit deinem Fahrlehrer,
              Ausbildungsstand und deinen Verfügbarkeiten abgeglichen.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "0.75fr 1.25fr",
              gap: 12,
            }}
          >
            <div style={{ ...glassCard, padding: 17 }}>
              <div style={{ fontWeight: 950 }}>Deine Verfügbarkeit</div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 12.5,
                  marginTop: 4,
                }}
              >
                Einmal hinterlegen, automatisch berücksichtigen.
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {[
                  "Mo–Fr ab 16:00 Uhr",
                  "Mittwoch ab 14:00 Uhr",
                  "Samstag flexibel",
                ].map((time, index) => (
                  <label
                    key={time}
                    style={{
                      ...softCard,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 12.5,
                      fontWeight: 800,
                    }}
                  >
                    <input type="checkbox" defaultChecked={index < 2} />
                    {time}
                  </label>
                ))}
              </div>
              <button
                type="button"
                style={{ ...secondaryButton, width: "100%", marginTop: 13 }}
              >
                Verfügbarkeit bearbeiten
              </button>
            </div>

            <div style={{ ...glassCard, padding: 17 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 950 }}>Passende freie Zeiten</div>
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: 12.5,
                      marginTop: 4,
                    }}
                  >
                    Sortiert nach deiner Verfügbarkeit
                  </div>
                </div>
                <span
                  style={{
                    color: accent,
                    fontSize: 11.5,
                    fontWeight: 950,
                  }}
                >
                  LIVE-ANSICHT ALS DEMO
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {[
                  ["Heute", "17:15", "Grundfahraufgaben"],
                  ["Mittwoch", "16:30", "Stadtverkehr"],
                  ["Freitag", "18:00", "Überlandfahrt"],
                ].map(([day, time, topic]) => {
                  const slotId = `${day}-${time}`;
                  const selected = selectedDrivingSlot === slotId;
                  return (
                    <button
                      key={slotId}
                      type="button"
                      onClick={() => {
                        setSelectedDrivingSlot(slotId);
                        setDrivingSlotReserved(false);
                      }}
                      style={{
                        ...softCard,
                        padding: 14,
                        color: textPrimary,
                        textAlign: "left",
                        cursor: "pointer",
                        border: `1px solid rgba(${accentRgb}, ${selected ? 0.40 : 0.14})`,
                        background: selected
                          ? `rgba(${accentRgb}, 0.16)`
                          : softCard.background,
                      }}
                    >
                      <div
                        style={{
                          color: textSecondary,
                          fontSize: 11.5,
                          fontWeight: 850,
                        }}
                      >
                        {day}
                      </div>
                      <div
                        style={{
                          fontSize: 23,
                          fontWeight: 950,
                          marginTop: 2,
                        }}
                      >
                        {time}
                      </div>
                      <div
                        style={{
                          color: textSecondary,
                          fontSize: 11.5,
                          marginTop: 5,
                        }}
                      >
                        {topic}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDrivingSlot && (
                <div
                  style={{
                    ...softCard,
                    padding: 14,
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 950 }}>
                      {drivingSlotReserved
                        ? "✓ Fahrstunde vorgemerkt"
                        : "Zeit passt zu deinem Profil"}
                    </div>
                    <div
                      style={{
                        color: textSecondary,
                        fontSize: 12.5,
                        marginTop: 3,
                      }}
                    >
                      {drivingSlotReserved
                        ? "In der echten Version folgt direkt die Bestätigung."
                        : "Ein Klick würde den Slot verbindlich anfragen."}
                    </div>
                  </div>
                  {!drivingSlotReserved && (
                    <button
                      type="button"
                      onClick={() => setDrivingSlotReserved(true)}
                      style={primaryButton}
                    >
                      Fahrstunde vormerken
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {panel === "documents" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: isMobile ? 25 : 31, fontWeight: 950 }}>
                Unterlagen ohne Papierchaos
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginTop: 6,
                }}
              >
                Hochladen, prüfen lassen und jederzeit sehen, was noch fehlt.
              </div>
            </div>
            <div style={{ minWidth: 150 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11.5,
                  fontWeight: 900,
                  marginBottom: 7,
                }}
              >
                <span>Vollständigkeit</span>
                <span>{documentProgress} %</span>
              </div>
              <div
                style={{
                  height: 9,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: `rgba(${accentRgb}, 0.10)`,
                }}
              >
                <div
                  style={{
                    width: `${documentProgress}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: accent,
                    transition: "width 220ms ease",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr",
              gap: 12,
            }}
          >
            <div
              style={{
                ...glassCard,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {HOHENBADEN_DEMO_DOCUMENTS.map((item) => {
                const done = documents[item.id];
                return (
                  <div
                    key={item.id}
                    style={{
                      ...softCard,
                      padding: 13,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 11,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background: done
                            ? `rgba(${accentRgb}, 0.15)`
                            : "rgba(17,24,39,0.06)",
                          fontWeight: 950,
                          color: done ? accent : textSecondary,
                        }}
                      >
                        {done ? "✓" : "!"}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 950 }}>
                          {item.label}
                        </div>
                        <div
                          style={{
                            color: textSecondary,
                            fontSize: 11.5,
                            marginTop: 3,
                          }}
                        >
                          {done ? item.detail : "Wird noch benötigt"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDocuments((current) => ({
                          ...current,
                          [item.id]: !current[item.id],
                        }))
                      }
                      style={{
                        ...secondaryButton,
                        minHeight: 36,
                        padding: "0 11px",
                        fontSize: 11.5,
                      }}
                    >
                      {done ? "Öffnen" : "Hochladen"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                ...glassCard,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 13,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                🏛️ Antrag & Behörde
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                }}
              >
                Das Interface könnte den Fahrerlaubnisantrag vorbereiten, fehlende Angaben erkennen und die behördliche Bearbeitung bis zur Prüfungsfreigabe anzeigen.
              </div>
              <div style={{ ...softCard, padding: 14 }}>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 11.5,
                    fontWeight: 850,
                  }}
                >
                  AKTUELLER DEMO-STATUS
                </div>
                <div style={{ fontWeight: 950, marginTop: 5 }}>
                  Antrag vorbereitet
                </div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Noch nicht an die Behörde übermittelt
                </div>
              </div>
              <button type="button" style={primaryButton}>
                Antrag digital vervollständigen
              </button>
            </div>
          </div>
        </div>
      )}

      {panel === "coach" && (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              ...softCard,
              padding: isMobile ? 18 : 24,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.15fr 0.85fr",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: accent,
                  fontSize: 11.5,
                  fontWeight: 950,
                  letterSpacing: 0.5,
                }}
              >
                DEIN PERSÖNLICHER BEGLEITER
              </div>
              <div
                style={{
                  fontSize: isMobile ? 26 : 34,
                  fontWeight: 950,
                  marginTop: 5,
                }}
              >
                Er kennt deinen Stand – nicht nur deine Frage.
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 14,
                  lineHeight: 1.55,
                  marginTop: 9,
                }}
              >
                Antworten, THEO-Lernempfehlungen und nächste Schritte werden passend zu deiner Klasse, deinem Lernstand, deiner Sprache und deinem Intensivplan vorbereitet.
              </div>
            </div>
            <div
              style={{
                width: isMobile ? 150 : 180,
                height: isMobile ? 150 : 180,
                margin: "0 auto",
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.90), rgba(${accentRgb}, 0.24) 48%, rgba(${accentRgb}, 0.10) 72%)`,
                boxShadow: `0 24px 70px rgba(${accentRgb}, 0.24), inset 0 1px 0 rgba(255,255,255,0.80)`,
                fontSize: 54,
              }}
            >
              ✨
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "0.85fr 1.15fr",
              gap: 12,
            }}
          >
            <div style={{ ...glassCard, padding: 17 }}>
              <div style={{ fontWeight: 950 }}>Was der Begleiter weiß</div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 13,
                }}
              >
                {[
                  ["🪪", "Klasse B197"],
                  ["📱", "THEO App: 72 % Lernstand"],
                  ["✅", "Passbild fehlt noch"],
                  ["🌍", "Lernsprache: Englisch"],
                ].map(([icon, value]) => (
                  <div
                    key={value}
                    style={{
                      ...softCard,
                      padding: 11,
                      fontSize: 12.5,
                      fontWeight: 850,
                    }}
                  >
                    {icon} {value}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...glassCard, padding: 17 }}>
              <div style={{ fontWeight: 950 }}>Direkt ausprobieren</div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 12.5,
                  marginTop: 4,
                }}
              >
                Die Frage wird in den normalen Chat übernommen.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 8,
                  marginTop: 13,
                }}
              >
                {[
                  "Was soll ich heute in der THEO App lernen?",
                  "Passt mein Urlaub zum nächsten Intensivkurs?",
                  "Bin ich bereit für die Theorieprüfung?",
                  "Welche Fahrstunde passt als Nächstes zu mir?",
                ].map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onAsk(question)}
                    style={{
                      ...softCard,
                      color: textPrimary,
                      padding: 13,
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 12.5,
                      lineHeight: 1.4,
                      fontWeight: 850,
                    }}
                  >
                    {question} →
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              ...glassCard,
              padding: 17,
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 950 }}>Dein Plan für heute</div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 12.5,
                  marginTop: 4,
                }}
              >
                20 Minuten THEO App · Kursplatz bestätigen · Passbild hochladen
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAsk("Erstelle mir meinen persönlichen in7Days-Lernplan für heute.")}
              style={primaryButton}
            >
              Tagesplan starten
            </button>
          </div>
        </div>
      )}
    </section>
  );
}


export default function WidgetPage() {
  const [mounted, setMounted] = useState(false);
  const [tenantId, setTenantId] = useState("demo");
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    setMounted(true);

    const params = new URLSearchParams(window.location.search);
    const t = params.get("tenant") || "demo";
    const embedded = params.get("embed") === "1";

    setTenantId(t);
    setIsEmbedded(embedded);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const updateViewportMode = () => {
      const screenWidth = window.screen?.width || window.innerWidth;
      const visualWidth = window.visualViewport?.width || window.innerWidth;
      const narrowScreen = Math.min(screenWidth, visualWidth) <= 700;
      const compactTouchDevice =
        window.matchMedia("(pointer: coarse)").matches && screenWidth <= 900;

      setIsMobileViewport(narrowScreen || compactTouchDevice);
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    window.addEventListener("orientationchange", updateViewportMode);
    window.visualViewport?.addEventListener("resize", updateViewportMode);

    return () => {
      window.removeEventListener("resize", updateViewportMode);
      window.removeEventListener("orientationchange", updateViewportMode);
      window.visualViewport?.removeEventListener("resize", updateViewportMode);
    };
  }, [mounted]);

  const cfg = useMemo(() => {
    try {
      return getTenant(tenantId);
    } catch {
      return getTenant("demo");
    }
  }, [tenantId]);
  const theme = cfg.theme;
  const normalizedTenantId = tenantId.toLowerCase();
  const isTxbikesInterface = [
    "txbikesv2",
    "txbikes",
    "tx-bikes",
    "tx_bikes",
    "txbikes.de",
    "txbikesde",
  ].includes(normalizedTenantId);
  const isWilliInterface = [
    "willi",
    "willi-ai",
    "willi-interface",
    "williinterface",
    "willis",
  ].includes(normalizedTenantId);
  const isLinaInterface = [
    "btdesigns",
    "lina",
    "btai",
    "btdesigns-lina",
  ].includes(normalizedTenantId);
  const isMmWartungInterface = [
    "mm-wartung",
    "mmwartung",
    "mm_wartung",
    "mm-wartung.de",
    "mmwartungde",
    "mm",
  ].includes(normalizedTenantId);
  const isFahrwerkBInterface = [
    "fahrwerk-b",
    "fahrwerkb",
    "fahrwerk_b",
    "fahrwerk-b.de",
    "fahrwerkbde",
    "fahrwerk",
  ].includes(normalizedTenantId);
  const isAbgefahrenInterface = [
    "fahrschule-abgefahren",
    "abgefahren",
    "abgefahren-schwerin",
    "abgefahrenschwerin",
    "abgefahren-schwerin.de",
    "abgefahren-schwerinde",
  ].includes(normalizedTenantId);
  const isHohenbadenInterface = [
    "fahrschule-hohenbaden",
    "hohenbaden",
    "fahrschule-in7days",
    "in7days",
    "in7-days",
    "fahrschule-hohenbaden.de",
    "fahrschulehohenbaden",
  ].includes(normalizedTenantId);
  const isEnhancedInterface =
    isTxbikesInterface ||
    isWilliInterface ||
    isLinaInterface ||
    isMmWartungInterface ||
    isFahrwerkBInterface ||
    isAbgefahrenInterface ||
    isHohenbadenInterface;
  const isBookingInterface =
    isLinaInterface ||
    isMmWartungInterface ||
    isTxbikesInterface ||
    isWilliInterface;
  const bookingBusinessName = isMmWartungInterface
    ? "MM Wartung"
    : isTxbikesInterface
      ? "TXBikes"
      : isWilliInterface
        ? "Willi"
        : "BTDesigns";
  const bookingDefaultService = isMmWartungInterface
    ? "Werkstatt Termin"
    : isTxbikesInterface
      ? "Werkstatttermin"
      : isWilliInterface
        ? "Termin / Rückruf"
        : "Website Beratung";
  const bookingDefaultDuration =
    isMmWartungInterface || isTxbikesInterface ? "60" : "30";
  const bookingCalendarLabel = isMmWartungInterface
    ? "Arbeit"
    : isTxbikesInterface
      ? "TXBikes Termine"
      : isWilliInterface
        ? "Willi Termine"
        : "BTDesigns Termine";
  const bookingServices = isMmWartungInterface
    ? MM_WARTUNG_BOOKING_SERVICES
    : isTxbikesInterface
      ? TXBIKES_BOOKING_SERVICES
      : isWilliInterface
        ? WILLI_BOOKING_SERVICES
        : BTDESIGNS_BOOKING_SERVICES;
  const displayBrandName = isHohenbadenInterface
    ? "Fahrschule Hohenbaden · in7Days"
    : isAbgefahrenInterface
      ? "Fahrschule Abgefahren"
      : isFahrwerkBInterface
      ? "Fahrwerk B"
      : isTxbikesInterface
      ? "TXBikes"
      : isWilliInterface
        ? "Willi"
        : cfg.brandName;
  const displayAssistantName = isHohenbadenInterface
    ? "Führerschein-Assistent"
    : isAbgefahrenInterface
      ? "Führerschein-Assistent"
      : isFahrwerkBInterface
      ? "Führerschein-Cockpit"
      : isTxbikesInterface
      ? "Bike-Service Interface"
      : isWilliInterface
        ? "AI Interface"
        : cfg.assistantName;
  const embedClosedSize = isEnhancedInterface ? 190 : 120;
  const launcherFrameSize = isEnhancedInterface ? 124 : 96;
  const launcherButtonSize = isEnhancedInterface ? 74 : 60;
  const launcherIconSize = isEnhancedInterface ? 32 : 26;
  const launcherXIconSize = isEnhancedInterface ? 24 : 19;
  const widgetAccent = isTxbikesInterface
    ? "#8b5cf6"
    : isWilliInterface
      ? theme.accent || "#2563eb"
      : isMmWartungInterface
        ? theme.accent || "#ff751f"
        : isHohenbadenInterface
          ? "#e31e24"
          : isAbgefahrenInterface
            ? theme.accent || "#e11d48"
            : isFahrwerkBInterface
            ? "#c8102e"
            : theme.accent;
  const widgetBackground = isTxbikesInterface
    ? "#f6f2ff"
    : isWilliInterface
      ? "#f8fbff"
      : isLinaInterface
        ? "#f7fbff"
        : isMmWartungInterface
          ? "#fff7ed"
          : isHohenbadenInterface
            ? "#fff8f7"
            : isAbgefahrenInterface
              ? "#fff7fb"
              : isFahrwerkBInterface
              ? "#0b0f16"
              : theme.bg;
  const textPrimary = isTxbikesInterface
    ? "#1f1636"
    : isWilliInterface
      ? "#172033"
      : isLinaInterface
        ? "#182536"
        : isMmWartungInterface
          ? "#2b1f18"
          : isHohenbadenInterface
            ? "#171717"
            : isAbgefahrenInterface
              ? "#24141b"
              : isFahrwerkBInterface
              ? "#111827"
              : "#163126";
  const textSecondary = isTxbikesInterface
    ? "#6a5f8d"
    : isWilliInterface
      ? "#59667a"
      : isLinaInterface
        ? "#566477"
        : isMmWartungInterface
          ? "#705a4a"
          : isHohenbadenInterface
            ? "#6b5555"
            : isAbgefahrenInterface
              ? "#765463"
              : isFahrwerkBInterface
              ? "#4b5563"
              : "#355f52";
  const accentRgb = useMemo(() => hexToRgb(widgetAccent), [widgetAccent]);

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attention, setAttention] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const isListening = voicePhase === "listening";
  const isVoiceActive = voicePhase !== "idle";
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingForm, setBookingForm] =
    useState<BookingFormState>(DEFAULT_BOOKING_FORM);
  const [fahrwerkSignupOpen, setFahrwerkSignupOpen] = useState(false);
  const [fahrwerkSignupForm, setFahrwerkSignupForm] =
    useState<FahrwerkSignupFormState>(DEFAULT_FAHRWERK_SIGNUP_FORM);
  const [fahrwerkPanel, setFahrwerkPanel] =
    useState<FahrwerkPanel>("dashboard");
  const [fahrwerkStage, setFahrwerkStage] = useState<FahrwerkStageId>("new");
  const [fahrwerkChecklist, setFahrwerkChecklist] = useState<
    Record<string, boolean>
  >(DEFAULT_FAHRWERK_CHECKLIST);
  const [abgefahrenPanel, setAbgefahrenPanel] =
    useState<AbgefahrenPanel>("home");
  const [hohenbadenPanel, setHohenbadenPanel] =
    useState<HohenbadenPanel>("home");

  const isEmbedClosed = isEmbedded && !open;
  const listRef = useRef<HTMLDivElement | null>(null);
  const fahrwerkPanelRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const voiceAnimationFrameRef = useRef<number | null>(null);
  const voiceStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const voiceStartedAtRef = useRef(0);
  const voiceDetectedRef = useRef(false);
  const silenceStartedAtRef = useRef<number | null>(null);
  const cancelVoiceRef = useRef(false);
  const voiceAbortControllerRef = useRef<AbortController | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioUrlRef = useRef<string | null>(null);
  const voiceAudioUnlockedRef = useRef(false);
  const voiceFillerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const voiceFillerLoopPromiseRef = useRef<Promise<void> | null>(null);
  const voiceFillerStopRef = useRef(false);
  const voiceAnswerReadyRef = useRef(false);
  const lastVoiceFillerRef = useRef("");
  const voiceStageRef = useRef<HTMLDivElement | null>(null);
  const voiceConversationActiveRef = useRef(false);
  const voiceRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const msgsRef = useRef<Msg[]>([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!mounted || !isFahrwerkBInterface) return;

    try {
      const savedStage = window.localStorage.getItem(
        "fahrwerk-b-stage",
      ) as FahrwerkStageId | null;
      const savedChecklist = window.localStorage.getItem(
        "fahrwerk-b-checklist",
      );

      if (
        savedStage &&
        FAHRWERK_STAGES.some((stage) => stage.id === savedStage)
      ) {
        setFahrwerkStage(savedStage);
      }

      if (savedChecklist) {
        const parsed = JSON.parse(savedChecklist) as Record<string, boolean>;
        setFahrwerkChecklist({ ...DEFAULT_FAHRWERK_CHECKLIST, ...parsed });
      }
    } catch {
      // Lokaler Fortschritt ist Komfort. Wenn localStorage blockiert ist, läuft das Interface trotzdem.
    }
  }, [mounted, isFahrwerkBInterface]);

  useEffect(() => {
    if (!mounted || !isFahrwerkBInterface) return;

    try {
      window.localStorage.setItem("fahrwerk-b-stage", fahrwerkStage);
      window.localStorage.setItem(
        "fahrwerk-b-checklist",
        JSON.stringify(fahrwerkChecklist),
      );
    } catch {
      // Ignorieren, damit das Interface auch ohne lokalen Speicher nutzbar bleibt.
    }
  }, [mounted, isFahrwerkBInterface, fahrwerkStage, fahrwerkChecklist]);

  useEffect(() => {
    if (!mounted) return;

    const firstMessage = isHohenbadenInterface
      ? "Hallo! Ich bin der digitale Führerschein-Assistent der Fahrschule Hohenbaden · in7Days. Ich helfe dir beim Intensivkurs, der THEO App, der Anmeldung und den Standorten Baden-Baden oder Bühl. Womit möchtest du starten?"
      : isAbgefahrenInterface
        ? "Moin! Ich bin der digitale Führerschein-Assistent der Fahrschule Abgefahren. Ich helfe dir bei Führerscheinklassen, Theorie, Anmeldung und den Standorten Schwerin oder Sternberg. Womit möchtest du starten?"
        : isFahrwerkBInterface
        ? "Hi — ich bin dein Fahrwerk B Führerschein-Cockpit. Wähle aus, wo du gerade stehst, und ich zeige dir den nächsten sinnvollen Schritt."
        : isLinaInterface
        ? `Hi — ich bin ${displayAssistantName}. Wobei soll ich dir bei BTDesigns helfen?`
        : isMmWartungInterface
          ? `Hi — ich bin ${displayAssistantName}. Was möchtest du bei MM Wartung machen?`
          : isTxbikesInterface
            ? `Hi — ich bin das ${displayAssistantName}. Was möchtest du bei TXBikes machen?`
            : isWilliInterface
              ? `Hi — ich bin das ${displayAssistantName} von Willi. Wobei soll ich helfen?`
              : `Hi — ich bin ${displayAssistantName}. Worum geht’s?`;

    setMsgs([{ role: "assistant", content: firstMessage }]);

    const hasGetUserMedia =
      typeof navigator.mediaDevices !== "undefined" &&
      typeof navigator.mediaDevices.getUserMedia === "function";

    const hasMediaRecorder = typeof window.MediaRecorder !== "undefined";

    setVoiceSupported(hasGetUserMedia && hasMediaRecorder);
  }, [
    mounted,
    displayAssistantName,
    isAbgefahrenInterface,
    isHohenbadenInterface,
    isFahrwerkBInterface,
    isLinaInterface,
    isMmWartungInterface,
    isTxbikesInterface,
    isWilliInterface,
  ]);

  useEffect(() => {
    msgsRef.current = msgs;
  }, [msgs]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    return () => {
      releaseVoiceResources();
    };
  }, []);

  useEffect(() => {
    if (!open && isVoiceActive) {
      cancelVoiceMode();
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [msgs, loading, voicePhase]);

  useEffect(() => {
    const t = setTimeout(() => setShowBadge(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) return;

    let t: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      const nextInMs = 5500 + Math.floor(Math.random() * 9000);
      t = setTimeout(() => {
        setAttention(true);
        setTimeout(() => setAttention(false), 920);
        schedule();
      }, nextInMs);
    };

    schedule();

    return () => {
      if (t) clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!isEmbedded) return;

    const mobileWidth = Math.max(
      320,
      Math.min(window.screen?.width || 430, 560),
    );
    const mobileHeight = Math.max(
      560,
      Math.min((window.screen?.height || 820) - 12, 900),
    );

    const size = open
      ? isMobileViewport
        ? {
            type: "bt-chat-resize",
            width: mobileWidth,
            height: mobileHeight,
          }
        : {
            type: "bt-chat-resize",
            width: isBookingInterface
              ? 1080
              : isTxbikesInterface || isFahrwerkBInterface || isAbgefahrenInterface || isHohenbadenInterface
                ? 980
                : 500,
            height: isBookingInterface
              ? 920
              : isTxbikesInterface || isFahrwerkBInterface || isAbgefahrenInterface || isHohenbadenInterface
                ? 880
                : 760,
          }
      : {
          type: "bt-chat-resize",
          width: embedClosedSize,
          height: embedClosedSize,
        };

    window.parent.postMessage(size, "*");
  }, [
    open,
    isEmbedded,
    isMobileViewport,
    isBookingInterface,
    isTxbikesInterface,
    isFahrwerkBInterface,
    isAbgefahrenInterface,
    isHohenbadenInterface,
    embedClosedSize,
  ]);

  useEffect(() => {
    if (!mounted) return;

    window.parent?.postMessage(
      {
        type: "bt-chat-ready",
        tenant: tenantId,
        interface: isHohenbadenInterface
          ? "fahrschule-hohenbaden"
          : isAbgefahrenInterface
            ? "fahrschule-abgefahren"
            : isFahrwerkBInterface
            ? "fahrwerk-b"
            : isLinaInterface
            ? "btai"
            : isTxbikesInterface
              ? "txbikes"
              : isWilliInterface
                ? "willi"
                : isMmWartungInterface
                  ? "mm-wartung"
                  : "default",
      },
      "*",
    );

    const handleBtAiMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "bt-chat-open" ||
        event.data?.type === "btai-open"
      ) {
        setOpen(true);
        setShowBadge(false);
      }

      if (
        event.data?.type === "bt-chat-close" ||
        event.data?.type === "btai-close"
      ) {
        setOpen(false);
      }

      if (
        event.data?.type === "bt-chat-toggle" ||
        event.data?.type === "btai-toggle"
      ) {
        setOpen((current) => !current);
        setShowBadge(false);
      }
    };

    window.addEventListener("message", handleBtAiMessage);

    return () => {
      window.removeEventListener("message", handleBtAiMessage);
    };
  }, [
    mounted,
    tenantId,
    isAbgefahrenInterface,
    isHohenbadenInterface,
    isFahrwerkBInterface,
    isLinaInterface,
    isTxbikesInterface,
    isWilliInterface,
    isMmWartungInterface,
  ]);

  async function sendText(
    rawText: string,
    options: SendTextOptions = {},
  ): Promise<string | null> {
    const text = rawText.trim();
    if (!text || loadingRef.current) return null;

    const wantsBooking =
      isBookingInterface &&
      /\b(termin|werkstatttermin|beratungsgespräch|erstgespräch|gespräch|meeting|call|buchen|anrufen|vereinbaren|rückruf|reparatur|inspektion|wartung|service)\b/i.test(
        text,
      );

    if (wantsBooking) {
      setBookingOpen(true);
    }

    if (isFahrwerkBInterface) {
      if (
        /\b(unterlagen|sehtest|erste hilfe|passbild|antrag|dokumente)\b/i.test(
          text,
        )
      ) {
        setFahrwerkPanel("documents");
      } else if (
        /\b(theorie|theorieprüfung|lernen|app|prüfungsfragen)\b/i.test(text)
      ) {
        setFahrwerkPanel("theory");
      } else if (
        /\b(praxis|fahrstunde|sonderfahrt|praktische prüfung|prüfungsangst)\b/i.test(
          text,
        )
      ) {
        setFahrwerkPanel("practice");
      } else if (
        /\b(prüfung|prüfungsvorbereitung|durchgefallen)\b/i.test(text)
      ) {
        setFahrwerkPanel("exam");
      } else if (
        /\b(angemeldet|fahrschüler|bin schon|mein stand)\b/i.test(text)
      ) {
        setFahrwerkPanel("student");
      } else if (
        /\b(anmelden|starten|b197|bf17|klasse b|anhänger|be)\b/i.test(text)
      ) {
        setFahrwerkPanel("start");
      }
    }

    const next: Msg[] = [...msgsRef.current, { role: "user", content: text }];
    msgsRef.current = next;
    setMsgs(next);
    setInput("");
    loadingRef.current = true;
    setLoading(true);

    try {
      const activeTenantId = isHohenbadenInterface
        ? "fahrschule-hohenbaden"
        : isAbgefahrenInterface
          ? "fahrschule-abgefahren"
          : cfg.id;

      const res = await fetch(
        `/api/chat?tenant=${encodeURIComponent(activeTenantId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant: activeTenantId,
            voiceMode: options.fromVoice === true,
            messages: next.map(({ role, content }) => ({ role, content })),
          }),
          signal: options.signal,
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || "Die Antwort konnte nicht geladen werden.",
        );
      }

      const assistantMsg: Msg = {
        role: "assistant",
        content: data?.reply || "Okay.",
      };
      const completedConversation = [...next, assistantMsg];
      msgsRef.current = completedConversation;
      setMsgs(completedConversation);
      return assistantMsg.content;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }

      const failedConversation: Msg[] = [
        ...next,
        {
          role: "assistant",
          content: "Kurz ein technisches Problem — versuch’s nochmal.",
        },
      ];
      msgsRef.current = failedConversation;
      setMsgs(failedConversation);
      return null;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  function openFahrwerkLiveSignup() {
    if (!isFahrwerkBInterface || loading || isVoiceActive) return;

    setShowBadge(false);

    setMsgs((current) => {
      const alreadyHasLiveSignupHint = current.some(
        (msg) =>
          msg.role === "assistant" &&
          msg.content.includes("offizielle Online-Anmeldung"),
      );

      if (alreadyHasLiveSignupHint) return current;

      return [
        ...current,
        {
          role: "assistant",
          content:
            "Ich öffne jetzt die offizielle Online-Anmeldung von Fahrwerk B über Fahrschule.live in einem neuen Tab.",
        },
      ];
    });

    const signupWindow = window.open(FAHRWERK_LIVE_SIGNUP_URL, "_blank");

    if (signupWindow) {
      signupWindow.opener = null;
      signupWindow.focus();
      return;
    }

    // Falls der Browser neue Tabs blockiert, wird die Anmeldung im aktuellen Fenster geöffnet.
    window.location.assign(FAHRWERK_LIVE_SIGNUP_URL);
  }

  function openFahrwerkSignupForm(licenseClass?: string, startWish?: string) {
    if (!isFahrwerkBInterface || loading || isVoiceActive) return;

    setFahrwerkSignupOpen(true);
    setShowBadge(false);
    setFahrwerkSignupForm((current) => ({
      ...current,
      licenseClass: licenseClass || current.licenseClass,
      startWish: startWish || current.startWish,
    }));

    setMsgs((current) => {
      const alreadyHasSignupHint = current.some(
        (msg) =>
          msg.role === "assistant" &&
          msg.content.includes("Anmeldevorbereitung"),
      );

      if (alreadyHasSignupHint) return current;

      return [
        ...current,
        {
          role: "assistant",
          content:
            "Alles klar — ich öffne dir die Beratungs- und Anfragevorbereitung. Für die verbindliche Anmeldung kannst du jederzeit direkt die offizielle Fahrschule.live-Anmeldung öffnen.",
        },
      ];
    });
  }

  function updateFahrwerkSignupForm(
    field: keyof FahrwerkSignupFormState,
    value: string | boolean,
  ) {
    setFahrwerkSignupForm((current) => ({ ...current, [field]: value }));
  }

  function submitFahrwerkSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = fahrwerkSignupForm.name.trim();
    const email = fahrwerkSignupForm.email.trim();
    const phone = fahrwerkSignupForm.phone.trim();

    if (!name) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Für die Anfragevorbereitung brauche ich mindestens deinen Namen.",
        },
      ]);
      return;
    }

    if (!email && !phone) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Bitte gib mindestens eine E-Mail-Adresse oder Telefonnummer an, damit Fahrwerk B dich erreichen kann.",
        },
      ]);
      return;
    }

    if (!fahrwerkSignupForm.privacyAccepted) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Bitte bestätige kurz den Datenschutz-Hinweis. Erst danach sollte eine Anfrage an Fahrwerk B vorbereitet werden.",
        },
      ]);
      return;
    }

    setMsgs((current) => [
      ...current,
      {
        role: "user",
        content: `Anfragevorbereitung ausgefüllt:\nKlasse: ${fahrwerkSignupForm.licenseClass}\nWunsch: ${fahrwerkSignupForm.startWish}\nName: ${name}`,
      },
      {
        role: "assistant",
        content:
          "Die Anfrage ist im Interface vorbereitet. Die offizielle Online-Anmeldung ist bereits angebunden und kann über den Button „Online anmelden“ geöffnet werden. Der automatische Versand dieser Anfrage an Fahrwerk B folgt später.",
      },
    ]);

    setFahrwerkSignupOpen(false);
    setFahrwerkSignupForm(DEFAULT_FAHRWERK_SIGNUP_FORM);
    setFahrwerkPanel("dashboard");
  }

  function scrollFahrwerkPanelIntoView() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scrollContainer = listRef.current;
        const panelElement = fahrwerkPanelRef.current;

        if (!scrollContainer || !panelElement) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const panelRect = panelElement.getBoundingClientRect();
        const targetTop =
          scrollContainer.scrollTop + panelRect.top - containerRect.top - 12;

        scrollContainer.scrollTo({
          top: Math.max(0, targetTop),
          behavior: "smooth",
        });
      });
    });
  }

  function openFahrwerkPanel(panel: FahrwerkPanel) {
    if (!isFahrwerkBInterface || loading || isVoiceActive) return;

    setFahrwerkPanel(panel);
    setFahrwerkSignupOpen(false);
    setShowBadge(false);
    scrollFahrwerkPanelIntoView();
  }

  function openAbgefahrenPanel(panel: AbgefahrenPanel) {
    if (!isAbgefahrenInterface || loading || isVoiceActive) return;

    setAbgefahrenPanel(panel);
    setShowBadge(false);

    window.requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function openHohenbadenPanel(panel: HohenbadenPanel) {
    if (!isHohenbadenInterface || loading || isVoiceActive) return;

    setHohenbadenPanel(panel);
    setShowBadge(false);

    window.requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function toggleFahrwerkChecklistItem(itemId: string) {
    setFahrwerkChecklist((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  }

  function updateFahrwerkStage(stageId: FahrwerkStageId) {
    setFahrwerkStage(stageId);
    setFahrwerkPanel("student");
  }

  function sendFahrwerkGuidedMessage(message: string) {
    if (loading || isVoiceActive) return;
    void sendText(message);
  }

  function resetFahrwerkProgress() {
    setFahrwerkStage("new");
    setFahrwerkChecklist(DEFAULT_FAHRWERK_CHECKLIST);
    setFahrwerkPanel("dashboard");

    try {
      window.localStorage.removeItem("fahrwerk-b-stage");
      window.localStorage.removeItem("fahrwerk-b-checklist");
    } catch {
      // Lokaler Speicher ist optional.
    }
  }

  function openBookingForm() {
    if (loading || isVoiceActive || bookingSubmitting) return;

    setBookingOpen(true);
    setShowBadge(false);
    setBookingForm((current) => {
      const currentServiceStillFits = bookingServices.includes(current.service);

      return {
        ...current,
        service: currentServiceStillFits
          ? current.service
          : bookingDefaultService,
        durationMinutes:
          current.durationMinutes === DEFAULT_BOOKING_FORM.durationMinutes
            ? bookingDefaultDuration
            : current.durationMinutes || bookingDefaultDuration,
      };
    });

    setMsgs((current) => {
      const alreadyHasBookingHint = current.some(
        (msg) =>
          msg.role === "assistant" && msg.content.includes("Termindaten"),
      );

      if (alreadyHasBookingHint) return current;

      return [
        ...current,
        {
          role: "assistant",
          content: `Klar — trag kurz die Termindaten ein. Danach wird der Termin direkt in den Apple Kalender von ${bookingBusinessName} geschrieben.`,
        },
      ];
    });
  }

  function updateBookingForm(field: keyof BookingFormState, value: string) {
    setBookingForm((current) => ({ ...current, [field]: value }));
  }

  function buildLocalDate(dateValue: string, timeValue: string) {
    const [year, month, day] = dateValue.split("-").map(Number);
    const [hour, minute] = timeValue.split(":").map(Number);

    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }

    const date = new Date(year, month - 1, day, hour, minute, 0, 0);

    if (Number.isNaN(date.getTime())) return null;

    return date;
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (bookingSubmitting) return;

    const name = bookingForm.name.trim();
    const email = bookingForm.email.trim();
    const phone = bookingForm.phone.trim();
    const service = bookingForm.service.trim() || bookingDefaultService;
    const date = bookingForm.date.trim();
    const time = bookingForm.time.trim();
    const durationMinutes = Number(
      bookingForm.durationMinutes || bookingDefaultDuration,
    );
    const message = bookingForm.message.trim();

    if (!name || !date || !time) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Für die Terminbuchung brauche ich mindestens Name, Datum und Uhrzeit.",
        },
      ]);
      return;
    }

    if (!email && !phone) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content: `Bitte gib mindestens eine E-Mail-Adresse oder Telefonnummer an, damit ${bookingBusinessName} dich erreichen kann.`,
        },
      ]);
      return;
    }

    const startDate = buildLocalDate(date, time);

    if (!startDate) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Datum oder Uhrzeit konnte ich nicht lesen. Bitte prüfe die Eingabe nochmal.",
        },
      ]);
      return;
    }

    const safeDurationMinutes =
      Number.isFinite(durationMinutes) && durationMinutes > 0
        ? durationMinutes
        : 30;
    const endDate = new Date(
      startDate.getTime() + safeDurationMinutes * 60 * 1000,
    );

    setBookingSubmitting(true);

    try {
      const res = await fetch("/api/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: isMmWartungInterface
            ? "mm-wartung"
            : isTxbikesInterface
              ? "txbikesv2"
              : isWilliInterface
                ? "willi"
                : tenantId,
          name,
          email,
          phone,
          service,
          message,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsgs((current) => [
          ...current,
          {
            role: "assistant",
            content:
              data?.error ||
              "Der Termin konnte gerade nicht eingetragen werden. Bitte wähle eine andere Uhrzeit oder versuch es nochmal.",
          },
        ]);
        return;
      }

      const confirmedStart = data?.event?.start
        ? new Date(data.event.start)
        : startDate;
      const confirmedEnd = data?.event?.end
        ? new Date(data.event.end)
        : endDate;

      const readableDate = confirmedStart.toLocaleString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const readableEnd = confirmedEnd.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const calendarText = isMmWartungInterface
        ? "Apple Kalender von MM Wartung"
        : isTxbikesInterface
          ? "TXBikes Kalender"
          : isWilliInterface
            ? "Willi Kalender"
            : "BTDesigns Kalender";

      const alternativeText =
        data?.wasAlternative && isBookingInterface
          ? `\n\nDie gewünschte Zeit war nicht möglich. ${
              data?.alternativeReason ||
              "Ich habe automatisch den nächsten passenden freien Termin gewählt."
            }`
          : "";

      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content: `Erledigt — der Termin wurde in den ${calendarText} eingetragen.${alternativeText}\n\n${readableDate}–${readableEnd}\nLeistung: ${service}`,
        },
      ]);

      setBookingOpen(false);
      setBookingForm({
        ...DEFAULT_BOOKING_FORM,
        service: bookingDefaultService,
        durationMinutes: bookingDefaultDuration,
      });
    } catch {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Technischer Fehler beim Kalendereintrag. Bitte versuch es nochmal.",
        },
      ]);
    } finally {
      setBookingSubmitting(false);
    }
  }

  function openPhotoPicker() {
    if (loading || isVoiceActive) return;
    photoInputRef.current?.click();
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || loading) return;

    if (!file.type.startsWith("image/")) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Bitte lade ein normales Bild hoch, zum Beispiel ein Foto aus der Kamera oder Galerie.",
        },
      ]);
      return;
    }

    const imagePreviewUrl = URL.createObjectURL(file);

    setMsgs((current) => [
      ...current,
      {
        role: "user",
        content: isHohenbadenInterface
          ? "📷 Bild zur Anfrage bei Hohenbaden · in7Days hinzugefügt"
          : isAbgefahrenInterface
            ? "📷 Bild zur Anfrage bei Abgefahren hinzugefügt"
            : isFahrwerkBInterface
            ? "📷 Bild zur Führerschein-Anfrage hinzugefügt"
            : isLinaInterface
            ? "📷 Beispiel oder Projektbild hinzugefügt"
            : isMmWartungInterface
              ? "📷 Foto zum Fahrzeug oder Ersatzteil hinzugefügt"
              : isTxbikesInterface
                ? "📷 Foto vom Fahrradproblem hinzugefügt"
                : isWilliInterface
                  ? "📷 Bild zur Anfrage hinzugefügt"
                  : "📷 Foto hinzugefügt",
        imagePreviewUrl,
        imageName: file.name,
      },
      {
        role: "assistant",
        content: isHohenbadenInterface
          ? "Danke, das Bild ist jetzt sichtbar. Schreib kurz dazu, ob es um einen Intensivkurs, die Anmeldung, eine Umschreibung oder deine Unterlagen geht."
          : isAbgefahrenInterface
            ? "Danke, das Bild ist jetzt sichtbar. Schreib kurz dazu, ob es um eine Führerscheinklasse, die Anmeldung oder eine andere Frage geht."
            : isFahrwerkBInterface
            ? "Danke, das Bild ist jetzt in der Anfrage sichtbar. Schreib kurz dazu, ob es um Anmeldung, Beratung oder Unterlagen geht."
            : isLinaInterface
            ? "Danke, das Bild ist jetzt in der Anfrage sichtbar. Schreib kurz, worum es geht, dann ordne ich es besser ein."
            : isMmWartungInterface
              ? "Danke, das Foto ist jetzt in der Anfrage sichtbar. Schreib kurz dazu, ob es um ein Fahrzeugproblem, einen Termin oder ein Ersatzteil geht."
              : isTxbikesInterface
                ? "Danke, das Foto ist jetzt in der Anfrage sichtbar. Beschreib kurz, was genau am Fahrrad passiert, damit ich das Problem besser eingrenzen kann."
                : isWilliInterface
                  ? "Danke, das Bild ist jetzt in der Anfrage sichtbar. Schreib kurz dazu, worum es geht."
                  : "Danke, das Foto ist jetzt in der Anfrage sichtbar. Schreib kurz dazu, worum es geht.",
      },
    ]);
  }

  function setVoiceEnergy(level: number) {
    const safeLevel = Math.max(0, Math.min(1, level));
    const stage = voiceStageRef.current;

    if (!stage) return;

    stage.style.setProperty("--voice-scale", (1 + safeLevel * 0.34).toFixed(3));
    stage.style.setProperty("--voice-energy", safeLevel.toFixed(3));
    stage.style.setProperty(
      "--voice-glow",
      (0.24 + safeLevel * 0.68).toFixed(3),
    );
  }

  function stopVoiceAnimation() {
    if (voiceAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(voiceAnimationFrameRef.current);
      voiceAnimationFrameRef.current = null;
    }

    analyserRef.current = null;
    setVoiceEnergy(0.08);
  }

  function closeVoiceAudioContext() {
    const context = audioContextRef.current;
    audioContextRef.current = null;

    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
  }

  function stopMicrophoneTracks() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function clearVoiceStopTimeout() {
    if (voiceStopTimeoutRef.current) {
      clearTimeout(voiceStopTimeoutRef.current);
      voiceStopTimeoutRef.current = null;
    }
  }

  function clearVoiceRestartTimeout() {
    if (voiceRestartTimeoutRef.current) {
      clearTimeout(voiceRestartTimeoutRef.current);
      voiceRestartTimeoutRef.current = null;
    }
  }

  function revokeVoiceAudioUrl() {
    if (voiceAudioUrlRef.current) {
      URL.revokeObjectURL(voiceAudioUrlRef.current);
      voiceAudioUrlRef.current = null;
    }
  }

  function getOrCreateVoiceAudio() {
    if (voiceAudioRef.current) return voiceAudioRef.current;

    const audio = new Audio();
    audio.preload = "auto";
    audio.autoplay = false;
    voiceAudioRef.current = audio;
    return audio;
  }

  async function unlockVoiceAudio() {
    if (voiceAudioUnlockedRef.current) return;

    const audio = getOrCreateVoiceAudio();

    try {
      audio.src = SILENT_AUDIO_DATA_URI;
      audio.volume = 0.001;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      voiceAudioUnlockedRef.current = true;
    } catch {
      // Der normale Wiedergabeversuch folgt später.
    } finally {
      audio.removeAttribute("src");
      audio.load();
      audio.volume = 1;
    }
  }

  function createVoiceSpeechUrl(text: string) {
    return `/api/voice/speak?text=${encodeURIComponent(
      text,
    )}&stream=${Date.now()}`;
  }

  function pickVoiceFiller(
    phrases: readonly string[],
  ) {
    const alternatives = phrases.filter(
      (phrase) => phrase !== lastVoiceFillerRef.current,
    );
    const pool = alternatives.length > 0 ? alternatives : [...phrases];
    const fallback =
      phrases[0] ||
      "Einen kleinen Moment bitte. Ich prüfe deine Frage gerade kurz.";
    const selected =
      pool[Math.floor(Math.random() * pool.length)] || fallback;

    lastVoiceFillerRef.current = selected;
    return selected;
  }

  function clearVoiceFiller() {
    if (voiceFillerTimeoutRef.current) {
      clearTimeout(voiceFillerTimeoutRef.current);
      voiceFillerTimeoutRef.current = null;
    }

    voiceFillerStopRef.current = true;
    voiceFillerLoopPromiseRef.current = null;
    voiceAnswerReadyRef.current = false;
  }

  function stopCurrentVoiceAudio() {
    const audio = voiceAudioRef.current;

    if (!audio) return;

    audio.onended = null;
    audio.onerror = null;
    audio.onplaying = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  async function playVoiceClipAndWait(
    source: string,
    signal: AbortSignal,
    phase: "thinking" | "speaking",
  ) {
    if (signal.aborted) return;

    const audio = getOrCreateVoiceAudio();

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
        audio.onplaying = null;
        signal.removeEventListener("abort", handleAbort);
      };

      const finish = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const handleAbort = () => {
        audio.pause();
        finish();
      };

      audio.onplaying = () => {
        setVoicePhase(phase);
        setVoiceError("");
        startPlaybackVisualization(audio);
      };

      audio.onended = () => {
        stopVoiceAnimation();
        finish();
      };

      audio.onerror = () => {
        fail(new Error("Die Sprachausgabe konnte nicht geladen werden."));
      };

      signal.addEventListener("abort", handleAbort, { once: true });

      audio.preload = "auto";
      audio.autoplay = true;
      audio.src = source;
      audio.load();

      void audio.play().catch(fail);
    });
  }

  async function runVoiceFillerLoop(signal: AbortSignal) {
    voiceFillerStopRef.current = false;
    let firstFiller = true;

    try {
      while (
        !signal.aborted &&
        !voiceFillerStopRef.current &&
        !voiceAnswerReadyRef.current &&
        voiceConversationActiveRef.current
      ) {
        const fillerText = pickVoiceFiller(
          firstFiller
            ? VOICE_FILLER_PHRASES
            : VOICE_FILLER_CONTINUATIONS,
        );

        firstFiller = false;

        await playVoiceClipAndWait(
          createVoiceSpeechUrl(fillerText),
          signal,
          "thinking",
        );
      }
    } catch (error) {
      if (
        !(error instanceof DOMException && error.name === "NotAllowedError")
      ) {
        console.warn("ElevenLabs-Füllsatz konnte nicht abgespielt werden:", error);
      }
    } finally {
      voiceFillerLoopPromiseRef.current = null;
      stopVoiceAnimation();
    }
  }

  function scheduleVoiceFiller(signal: AbortSignal) {
    clearVoiceFiller();
    voiceFillerStopRef.current = false;
    voiceAnswerReadyRef.current = false;

    voiceFillerTimeoutRef.current = setTimeout(() => {
      voiceFillerTimeoutRef.current = null;

      if (
        signal.aborted ||
        cancelVoiceRef.current ||
        !voiceConversationActiveRef.current ||
        voiceAnswerReadyRef.current
      ) {
        return;
      }

      const fillerLoop = runVoiceFillerLoop(signal);
      voiceFillerLoopPromiseRef.current = fillerLoop;
    }, VOICE_FILLER_DELAY_MS);
  }

  function stopVoicePlayback() {
    clearVoiceFiller();
    stopCurrentVoiceAudio();
    revokeVoiceAudioUrl();
    stopVoiceAnimation();
    closeVoiceAudioContext();
  }

  function releaseVoiceResources() {
    cancelVoiceRef.current = true;
    voiceConversationActiveRef.current = false;
    clearVoiceStopTimeout();
    clearVoiceRestartTimeout();
    voiceAbortControllerRef.current?.abort();
    voiceAbortControllerRef.current = null;

    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Der Recorder wurde eventuell bereits beendet.
      }
    }

    stopMicrophoneTracks();
    stopVoicePlayback();
    voiceAudioRef.current = null;
    voiceAudioUnlockedRef.current = false;
    audioChunksRef.current = [];
  }

  function finishVoiceMode(delay = 220) {
    clearVoiceRestartTimeout();

    voiceRestartTimeoutRef.current = setTimeout(() => {
      voiceRestartTimeoutRef.current = null;

      if (voiceConversationActiveRef.current && !cancelVoiceRef.current) {
        setVoiceTranscript("");
        setVoiceError("");
        void beginVoiceRecording();
        return;
      }

      setVoicePhase("idle");
      setVoiceTranscript("");
      setVoiceError("");
      setVoiceEnergy(0.08);
    }, delay);
  }

  function showVoiceFailure(message: string) {
    clearVoiceFiller();
    cancelVoiceRef.current = true;
    voiceConversationActiveRef.current = false;
    clearVoiceStopTimeout();
    clearVoiceRestartTimeout();
    voiceAbortControllerRef.current?.abort();
    voiceAbortControllerRef.current = null;

    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Der Recorder wurde eventuell bereits beendet.
      }
    }

    stopMicrophoneTracks();
    stopVoicePlayback();
    audioChunksRef.current = [];
    setVoiceError(message);
    setVoicePhase("error");
  }

  async function getOrCreateVoiceStream() {
    const existingStream = mediaStreamRef.current;
    const hasLiveAudioTrack = existingStream
      ?.getAudioTracks()
      .some((track) => track.readyState === "live");

    if (existingStream && hasLiveAudioTrack) {
      return existingStream;
    }

    stopMicrophoneTracks();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });

    mediaStreamRef.current = stream;
    return stream;
  }

  function getRecordingFormat() {
    const formats = [
      { mimeType: "audio/webm;codecs=opus", extension: "webm" },
      { mimeType: "audio/mp4", extension: "m4a" },
      { mimeType: "audio/webm", extension: "webm" },
      { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
    ];

    return (
      formats.find((format) =>
        MediaRecorder.isTypeSupported(format.mimeType),
      ) || { mimeType: "", extension: "webm" }
    );
  }

  function startMicrophoneVisualization(stream: MediaStream) {
    stopVoiceAnimation();
    closeVoiceAudioContext();

    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.76;
    const timeData = new Uint8Array(analyser.fftSize);
    source.connect(analyser);

    audioContextRef.current = context;
    analyserRef.current = analyser;

    const draw = () => {
      const activeRecorder = mediaRecorderRef.current;

      if (!activeRecorder || activeRecorder.state === "inactive") {
        stopVoiceAnimation();
        return;
      }

      analyser.getByteTimeDomainData(timeData);

      let sum = 0;
      for (let i = 0; i < timeData.length; i += 1) {
        const sample = (timeData[i] - 128) / 128;
        sum += sample * sample;
      }

      const rms = Math.sqrt(sum / timeData.length);
      const normalizedLevel = Math.min(1, Math.max(0.04, rms * 7.6));
      const now = performance.now();
      const elapsed = now - voiceStartedAtRef.current;

      setVoiceEnergy(normalizedLevel);

      if (rms > 0.03) {
        voiceDetectedRef.current = true;
        silenceStartedAtRef.current = null;
      } else if (voiceDetectedRef.current && elapsed > 550) {
        if (silenceStartedAtRef.current === null) {
          silenceStartedAtRef.current = now;
        }

        if (now - silenceStartedAtRef.current > VOICE_SILENCE_MS) {
          stopVoiceRecording();
          return;
        }
      }

      voiceAnimationFrameRef.current = window.requestAnimationFrame(draw);
    };

    voiceAnimationFrameRef.current = window.requestAnimationFrame(draw);
  }

  function startPlaybackVisualization(audio: HTMLAudioElement) {
    stopVoiceAnimation();
    closeVoiceAudioContext();

    const draw = () => {
      if (audio.paused || audio.ended) {
        setVoiceEnergy(0.08);
        return;
      }

      const wave = (Math.sin(performance.now() / 115) + 1) / 2;
      setVoiceEnergy(0.24 + wave * 0.26);
      voiceAnimationFrameRef.current = window.requestAnimationFrame(draw);
    };

    voiceAnimationFrameRef.current = window.requestAnimationFrame(draw);
  }

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") return;

    clearVoiceStopTimeout();
    setVoicePhase("transcribing");
    stopVoiceAnimation();

    try {
      recorder.requestData();
      recorder.stop();
    } catch {
      showVoiceFailure(
        "Die Aufnahme konnte nicht beendet werden. Versuch es bitte nochmal.",
      );
    }
  }

  async function playPreparedVoiceResponse() {
    const audio = voiceAudioRef.current;

    if (!audio) {
      showVoiceFailure(
        "Die Sprachantwort ist nicht mehr verfügbar. Versuch es bitte nochmal.",
      );
      return;
    }

    try {
      setVoicePhase("speaking");
      setVoiceError("");
      startPlaybackVisualization(audio);
      await audio.play();
    } catch (error) {
      stopVoiceAnimation();

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setVoicePhase("ready");
        setVoiceError(
          "Der Browser hat die automatische Wiedergabe blockiert. Tippe einmal auf die Kugel.",
        );
        return;
      }

      showVoiceFailure("Die Sprachantwort konnte nicht abgespielt werden.");
    }
  }

  async function prepareVoiceResponseAudio(
    text: string,
    signal: AbortSignal,
  ) {
    const safeText = text.trim().slice(0, VOICE_MAX_SPEECH_TEXT);

    const response = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: safeText }),
      signal,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(
        data?.error || "Die Sprachantwort konnte nicht erzeugt werden.",
      );
    }

    const audioBlob = await response.blob();

    if (!audioBlob.size) {
      throw new Error("Die Sprachantwort war leer.");
    }

    revokeVoiceAudioUrl();

    const audioUrl = URL.createObjectURL(audioBlob);
    voiceAudioUrlRef.current = audioUrl;
    voiceAnswerReadyRef.current = true;

    return audioUrl;
  }

  async function speakVoiceResponse(text: string, signal: AbortSignal) {
    if (signal.aborted) return;

    const answerAudioUrl = await prepareVoiceResponseAudio(text, signal);

    if (voiceFillerTimeoutRef.current) {
      clearTimeout(voiceFillerTimeoutRef.current);
      voiceFillerTimeoutRef.current = null;
    }

    voiceAnswerReadyRef.current = true;

    const runningFiller = voiceFillerLoopPromiseRef.current;

    if (runningFiller) {
      await runningFiller;
    }

    if (signal.aborted || cancelVoiceRef.current) return;

    voiceFillerStopRef.current = true;

    const audio = getOrCreateVoiceAudio();

    const handleAbort = () => {
      stopVoicePlayback();
    };

    signal.addEventListener("abort", handleAbort, { once: true });

    audio.preload = "auto";
    audio.autoplay = true;
    audio.src = answerAudioUrl;
    audio.load();

    audio.onplaying = () => {
      setVoicePhase("speaking");
      setVoiceError("");
      startPlaybackVisualization(audio);
    };

    audio.onended = () => {
      signal.removeEventListener("abort", handleAbort);
      stopVoicePlayback();
      finishVoiceMode(90);
    };

    audio.onerror = () => {
      signal.removeEventListener("abort", handleAbort);
      showVoiceFailure("Die Sprachantwort konnte nicht abgespielt werden.");
    };

    try {
      await audio.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setVoicePhase("ready");
        setVoiceError(
          "Der Browser hat die automatische Wiedergabe blockiert. Tippe einmal auf die Kugel.",
        );
        return;
      }

      throw error;
    }
  }

  async function processVoiceRecording(audioBlob: Blob, extension: string) {
    const abortController = new AbortController();
    voiceAbortControllerRef.current?.abort();
    voiceAbortControllerRef.current = abortController;

    try {
      setVoicePhase("transcribing");
      setVoiceError("");
      scheduleVoiceFiller(abortController.signal);

      const formData = new FormData();
      formData.append("audio", audioBlob, `aufnahme.${extension}`);

      const transcriptionResponse = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });

      const transcriptionData = await transcriptionResponse
        .json()
        .catch(() => null);

      if (!transcriptionResponse.ok) {
        throw new Error(
          transcriptionData?.error ||
            "Deine Sprache konnte nicht verarbeitet werden.",
        );
      }

      const transcript = String(transcriptionData?.text || "").trim();

      if (!transcript) {
        throw new Error("Ich konnte keinen gesprochenen Text erkennen.");
      }

      setVoiceTranscript(transcript);
      setInput(transcript);
      setVoicePhase("thinking");
      setVoiceEnergy(0.12);

      const reply = await sendText(transcript, {
        fromVoice: true,
        signal: abortController.signal,
      });

      if (!reply) {
        if (!abortController.signal.aborted) {
          throw new Error("Die Antwort konnte nicht erstellt werden.");
        }
        return;
      }

      await speakVoiceResponse(reply, abortController.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      const message =
        error instanceof Error
          ? error.message
          : "Bei der Sprachverarbeitung ist ein technischer Fehler aufgetreten.";

      showVoiceFailure(message);
    } finally {
      if (abortController.signal.aborted) {
        clearVoiceFiller();
      }

      if (voiceAbortControllerRef.current === abortController) {
        voiceAbortControllerRef.current = null;
      }
    }
  }

  async function beginVoiceRecording() {
    if (
      !voiceConversationActiveRef.current ||
      cancelVoiceRef.current ||
      mediaRecorderRef.current?.state === "recording"
    ) {
      return;
    }

    clearVoiceStopTimeout();
    clearVoiceRestartTimeout();
    stopVoicePlayback();
    setVoiceTranscript("");
    setVoiceError("");
    setInput("");
    setVoicePhase("listening");
    setVoiceEnergy(0.08);

    try {
      const stream = await getOrCreateVoiceStream();

      if (!voiceConversationActiveRef.current || cancelVoiceRef.current) {
        return;
      }

      const format = getRecordingFormat();
      const recorder = format.mimeType
        ? new MediaRecorder(stream, { mimeType: format.mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      voiceStartedAtRef.current = performance.now();
      voiceDetectedRef.current = false;
      silenceStartedAtRef.current = null;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        showVoiceFailure(
          "Das Mikrofon konnte die Aufnahme nicht sauber verarbeiten.",
        );
      };

      recorder.onstop = () => {
        clearVoiceStopTimeout();
        stopVoiceAnimation();
        closeVoiceAudioContext();
        mediaRecorderRef.current = null;

        if (cancelVoiceRef.current || !voiceConversationActiveRef.current) {
          audioChunksRef.current = [];
          return;
        }

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        const blob = new Blob(chunks, {
          type: recorder.mimeType || format.mimeType || "audio/webm",
        });

        if (blob.size < 900 || !voiceDetectedRef.current) {
          setVoiceTranscript("");
          setVoiceError("");
          finishVoiceMode(180);
          return;
        }

        void processVoiceRecording(blob, format.extension);
      };

      startMicrophoneVisualization(stream);
      recorder.start(120);

      voiceStopTimeoutRef.current = setTimeout(() => {
        stopVoiceRecording();
      }, 25_000);
    } catch (error) {
      const message =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError")
          ? "Das Mikrofon ist blockiert. Erlaube den Mikrofonzugriff im Browser und versuch es erneut."
          : "Das Mikrofon konnte nicht gestartet werden. Versuch es bitte nochmal.";

      showVoiceFailure(message);
    }
  }

  async function startVoiceInput() {
    const unlockPromise = unlockVoiceAudio();

    if (loadingRef.current || ["transcribing", "thinking"].includes(voicePhase))
      return;

    if (voicePhase === "listening") {
      stopVoiceRecording();
      return;
    }

    if (voicePhase === "speaking") {
      stopVoicePlayback();
      voiceConversationActiveRef.current = true;
      cancelVoiceRef.current = false;
      await beginVoiceRecording();
      return;
    }

    if (voicePhase === "ready") {
      await unlockPromise;
      await playPreparedVoiceResponse();
      return;
    }

    if (!voiceSupported) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Die Audioaufnahme wird auf diesem Gerät oder in diesem Browser nicht unterstützt. Schreib deine Frage bitte als Text.",
        },
      ]);
      return;
    }

    await unlockPromise;

    voiceConversationActiveRef.current = true;
    cancelVoiceRef.current = false;
    voiceAbortControllerRef.current?.abort();
    voiceAbortControllerRef.current = null;
    clearVoiceRestartTimeout();

    await beginVoiceRecording();
  }

  function cancelVoiceMode() {
    clearVoiceFiller();

    if (!isVoiceActive && !mediaRecorderRef.current && !voiceAudioRef.current)
      return;

    cancelVoiceRef.current = true;
    voiceConversationActiveRef.current = false;
    clearVoiceStopTimeout();
    clearVoiceRestartTimeout();
    voiceAbortControllerRef.current?.abort();
    voiceAbortControllerRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Ignorieren und Ressourcen unten freigeben.
      }
    }

    mediaRecorderRef.current = null;
    stopMicrophoneTracks();
    stopVoicePlayback();
    audioChunksRef.current = [];
    setVoicePhase("idle");
    setVoiceTranscript("");
    setVoiceError("");
  }

  async function send() {
    await sendText(input);
  }

  function resetChat() {
    cancelVoiceMode();
    setBookingOpen(false);
    setBookingSubmitting(false);
    setBookingForm({
      ...DEFAULT_BOOKING_FORM,
      service: bookingDefaultService,
      durationMinutes: bookingDefaultDuration,
    });
    setFahrwerkSignupOpen(false);
    setFahrwerkSignupForm(DEFAULT_FAHRWERK_SIGNUP_FORM);
    setFahrwerkPanel("dashboard");
    setAbgefahrenPanel("home");
    setHohenbadenPanel("home");
    setMsgs([
      {
        role: "assistant",
        content: isHohenbadenInterface
          ? "Alles klar — wobei soll ich dir rund um Intensivkurs, THEO App oder Führerschein bei Hohenbaden helfen?"
          : isAbgefahrenInterface
            ? "Alles klar — wobei soll ich dir rund um deinen Führerschein bei Abgefahren helfen?"
            : isFahrwerkBInterface
            ? "Alles klar — wo stehst du gerade bei deinem Führerschein?"
            : isLinaInterface
            ? "Alles klar — wobei soll ich dir bei BTDesigns helfen?"
            : isMmWartungInterface
              ? "Alles klar — was möchtest du bei MM Wartung machen?"
              : isTxbikesInterface
                ? "Alles klar — was möchtest du bei TXBikes machen?"
                : isWilliInterface
                  ? "Alles klar — wobei soll ich dir bei Willi helfen?"
                  : "Alles klar — womit kann ich dir helfen?",
      },
    ]);
    setInput("");
  }

  const panelW = isBookingInterface
    ? 1040
    : isTxbikesInterface || isFahrwerkBInterface || isAbgefahrenInterface || isHohenbadenInterface
      ? 940
      : isEmbedded
        ? 460
        : 500;
  const panelH = isBookingInterface
    ? 840
    : isTxbikesInterface || isFahrwerkBInterface || isAbgefahrenInterface || isHohenbadenInterface
      ? 820
      : isEmbedded
        ? 660
        : 720;
  const panelRadius = isEnhancedInterface
    ? isMobileViewport
      ? 28
      : 38
    : 28;
  // Das BTDesigns-/BTAI-Logo wird in allen Interfaces einheitlich angezeigt.
  const GLOBAL_LOGO_SRC = "/brand/btai-logo.png";
  const headerPrimaryCta = isHohenbadenInterface
    ? { label: "Website", url: "https://fahrschule-hohenbaden.de" }
    : isAbgefahrenInterface
      ? { label: "Website", url: "https://abgefahren-schwerin.de" }
      : cfg.primaryCta;

  if (!mounted) return null;

  const launcherOffset = isEmbedded ? (isEnhancedInterface ? 0 : 10) : 16;
  const panelOffsetBottom = launcherOffset + (isEnhancedInterface ? 104 : 78);

  const showStartCards =
    isEnhancedInterface &&
    msgs.length === 1 &&
    msgs[0]?.role === "assistant" &&
    !loading &&
    !isVoiceActive &&
    (!isAbgefahrenInterface || abgefahrenPanel === "home") &&
    (!isHohenbadenInterface || hohenbadenPanel === "home");

  const startCards = isHohenbadenInterface
    ? HOHENBADEN_START_CARDS
    : isAbgefahrenInterface
      ? ABGEFAHREN_START_CARDS
      : isFahrwerkBInterface
      ? FAHRWERK_B_START_CARDS
      : isTxbikesInterface
      ? TXBIKES_START_CARDS
      : isWilliInterface
        ? WILLI_START_CARDS
        : isMmWartungInterface
          ? MM_WARTUNG_START_CARDS
          : BTDESIGNS_START_CARDS;

  const fahrwerkActiveStage =
    FAHRWERK_STAGES.find((stage) => stage.id === fahrwerkStage) ||
    FAHRWERK_STAGES[0];
  const fahrwerkCompletedDocuments = FAHRWERK_DOCUMENT_ITEMS.filter((item) =>
    Boolean(fahrwerkChecklist[item.id]),
  ).length;
  const fahrwerkDocumentProgress = Math.round(
    (fahrwerkCompletedDocuments / FAHRWERK_DOCUMENT_ITEMS.length) * 100,
  );

  const voiceTitle =
    voicePhase === "listening"
      ? "Ich höre zu"
      : voicePhase === "transcribing"
        ? "Ich verstehe dich"
        : voicePhase === "thinking"
          ? "Einen Moment"
          : voicePhase === "speaking"
            ? `${displayBrandName} antwortet`
            : voicePhase === "ready"
              ? "Deine Antwort ist bereit"
              : voicePhase === "error"
                ? "Das hat nicht geklappt"
                : "";

  const voiceEyebrow =
    voicePhase === "listening"
      ? "Sprachmodus aktiv"
      : voicePhase === "transcribing"
        ? "ElevenLabs erkennt deine Sprache"
        : voicePhase === "thinking"
          ? "Das Interface bereitet die Antwort vor"
          : voicePhase === "speaking"
            ? "Gesprochene Antwort"
            : voicePhase === "ready"
              ? "Einmal tippen"
              : voicePhase === "error"
                ? "Sprachmodus"
                : "";

  const voiceDescription =
    voicePhase === "listening"
      ? isFahrwerkBInterface
        ? "Sprich einfach los. Nach einer kurzen Pause antworte ich automatisch."
        : "Sprich einfach los. Nach einer kurzen Pause wird deine Anfrage automatisch gesendet."
      : voicePhase === "transcribing"
        ? "Deine Aufnahme wird gerade sicher in Text umgewandelt."
        : voicePhase === "thinking"
          ? voiceTranscript || "Deine Anfrage wird verarbeitet."
          : voicePhase === "speaking"
            ? voiceTranscript ||
              "Die Antwort wird jetzt vorgelesen. Danach höre ich automatisch wieder zu."
            : voicePhase === "ready"
              ? voiceError || "Tippe auf die Kugel, um die Antwort zu hören."
              : voicePhase === "error"
                ? voiceError || "Versuch es bitte noch einmal."
                : "";

  const wrapperBackground = isEmbedded
    ? "transparent"
    : `radial-gradient(1200px 900px at 70% 12%, ${widgetAccent}18 0%, transparent 60%),radial-gradient(900px 700px at 12% 78%, ${widgetAccent}10 0%, transparent 62%),radial-gradient(700px 520px at 55% 55%, rgba(255,255,255,0.04) 0%, transparent 72%),linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)),${widgetBackground}`;

  const launcherButton = (
    <button
      className={`bt-launcher ${attention ? "bt-bouncing" : ""}`}
      onClick={() => {
        setOpen((v) => !v);
        setShowBadge(false);
      }}
      style={{
        width: launcherButtonSize,
        height: launcherButtonSize,
        borderRadius: 999,
        border: open
          ? `1px solid rgba(${accentRgb}, 0.34)`
          : `1px solid rgba(${accentRgb}, 0.56)`,
        background: open
          ? `radial-gradient(150px 96px at 35% 25%, rgba(${accentRgb}, 0.34) 0%, transparent 65%), linear-gradient(180deg, rgba(255,255,255,0.28), rgba(${accentRgb}, 0.16))`
          : `radial-gradient(150px 96px at 35% 25%, rgba(${accentRgb}, 0.72) 0%, transparent 65%), linear-gradient(180deg, rgba(255,255,255,0.30), rgba(${accentRgb}, 0.26))`,
        backdropFilter: "blur(18px) saturate(175%)",
        WebkitBackdropFilter: "blur(18px) saturate(175%)",
        boxShadow: open
          ? `0 18px 52px rgba(0,0,0,0.22), 0 0 0 1px rgba(${accentRgb}, 0.20) inset, 0 0 26px rgba(${accentRgb}, 0.16)`
          : `0 18px 52px rgba(0,0,0,0.20), 0 0 0 1px rgba(${accentRgb}, 0.34) inset, 0 0 42px rgba(${accentRgb}, 0.30)`,
        cursor: "pointer",
        color: "#ffffff",
        display: "grid",
        placeItems: "center",
        position: "relative",
        zIndex: 2,
        pointerEvents: "auto",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
      }}
      aria-label="Chat öffnen"
      title={`${displayBrandName} Chat`}
    >
      {open ? (
        <span
          style={{
            fontSize: launcherXIconSize,
            lineHeight: `${launcherXIconSize}px`,
            textShadow: `0 0 12px rgba(${accentRgb}, 0.20)`,
          }}
        >
          ×
        </span>
      ) : (
        <MessageCircle
          size={launcherIconSize}
          strokeWidth={2.5}
          style={{
            filter: `drop-shadow(0 0 10px rgba(${accentRgb}, 0.16))`,
          }}
        />
      )}
    </button>
  );

  return (
    <div
      className={`${isMobileViewport ? "bt-mobile-viewport" : ""} ${
        isVoiceActive ? "bt-voice-mode-open" : ""
      }`.trim()}
      style={{
        minHeight: isEmbedded ? embedClosedSize : "100vh",
        width: isEmbedded && !open ? embedClosedSize : undefined,
        height: isEmbedded && !open ? embedClosedSize : undefined,
        background: wrapperBackground,
        color: textPrimary,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        overflow: "visible",
        pointerEvents: isEmbedClosed ? "none" : "auto",
      }}
    >
      <style>{`html, body {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  overscroll-behavior: none;
}

body::before,
body::after {
  display: none !important;
  content: none !important;
}

.bt-hidden-file-input {
  display: none !important;
}

.bt-round-action-button {
  height: ${isEnhancedInterface ? "56px" : "46px"};
  width: ${isEnhancedInterface ? "56px" : "46px"};
  border-radius: ${isEnhancedInterface ? "18px" : "14px"};
  border: 1px solid rgba(255,255,255,0.26);
  background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58));
  color: ${textPrimary};
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: ${isEnhancedInterface ? "22px" : "19px"};
  box-shadow: 0 10px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.26);
  backdrop-filter: blur(14px) saturate(145%);
  -webkit-backdrop-filter: blur(14px) saturate(145%);
  flex: 0 0 auto;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
  position: relative;
  overflow: hidden;
}

.bt-round-action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(${accentRgb}, 0.38);
  box-shadow: 0 14px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(${accentRgb}, 0.10) inset;
}

.bt-round-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.bt-round-action-button.bt-listening {
  color: #ffffff;
  border-color: rgba(${accentRgb}, 0.46);
  background:
    radial-gradient(90px 70px at 50% 30%, rgba(255,255,255,0.34), transparent 64%),
    linear-gradient(180deg, ${widgetAccent}F0, ${widgetAccent}A6);
  box-shadow: 0 16px 44px rgba(0,0,0,0.16), 0 0 0 1px rgba(${accentRgb}, 0.16) inset, 0 0 28px rgba(${accentRgb}, 0.28);
}

@keyframes bt-voice-stage-in {
  0% { opacity: 0; transform: scale(1.025); filter: blur(14px); }
  100% { opacity: 1; transform: scale(1); filter: blur(0); }
}

@keyframes bt-voice-ambient-a {
  0%, 100% { transform: translate3d(-8%, -5%, 0) scale(1); }
  50% { transform: translate3d(9%, 8%, 0) scale(1.13); }
}

@keyframes bt-voice-ambient-b {
  0%, 100% { transform: translate3d(8%, 9%, 0) scale(1.08); }
  50% { transform: translate3d(-10%, -7%, 0) scale(0.96); }
}

@keyframes bt-voice-halo-spin {
  from { transform: rotate(0deg) scale(var(--voice-scale, 1.03)); }
  to { transform: rotate(360deg) scale(var(--voice-scale, 1.03)); }
}

@keyframes bt-voice-halo-reverse {
  from { transform: rotate(360deg) scale(var(--voice-scale, 1.03)); }
  to { transform: rotate(0deg) scale(var(--voice-scale, 1.03)); }
}

@keyframes bt-voice-core-breathe {
  0%, 100% { border-radius: 46% 54% 58% 42% / 44% 46% 54% 56%; }
  33% { border-radius: 58% 42% 45% 55% / 51% 61% 39% 49%; }
  66% { border-radius: 42% 58% 61% 39% / 58% 42% 58% 42%; }
}

@keyframes bt-voice-text-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bt-voice-dot {
  0%, 100% { transform: translateY(0) scale(0.82); opacity: 0.42; }
  50% { transform: translateY(-7px) scale(1); opacity: 1; }
}

.bt-voice-stage {
  --voice-scale: 1.03;
  --voice-energy: 0.08;
  --voice-glow: 0.30;
  position: absolute;
  inset: 0;
  z-index: 80;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: clamp(28px, 5vw, 64px);
  border: 0;
  border-radius: inherit;
  color: #ffffff;
  background:
    radial-gradient(920px 620px at 50% 42%, rgba(${accentRgb}, 0.34), transparent 66%),
    radial-gradient(680px 520px at 14% 4%, rgba(255,255,255,0.16), transparent 64%),
    linear-gradient(145deg, rgba(7,10,17,0.86), rgba(18,9,15,0.90) 52%, rgba(7,10,17,0.92));
  backdrop-filter: blur(32px) saturate(175%);
  -webkit-backdrop-filter: blur(32px) saturate(175%);
  animation: bt-voice-stage-in 420ms cubic-bezier(.16,1,.3,1) both;
  isolation: isolate;
}

.bt-voice-stage::before,
.bt-voice-stage::after {
  content: "";
  position: absolute;
  width: 72%;
  aspect-ratio: 1;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(62px);
  opacity: calc(0.42 + var(--voice-energy, 0.08) * 0.34);
  mix-blend-mode: screen;
}

.bt-voice-stage::before {
  left: -20%;
  top: -34%;
  background: radial-gradient(circle, rgba(${accentRgb}, 0.84), transparent 66%);
  animation: bt-voice-ambient-a 7s ease-in-out infinite;
}

.bt-voice-stage::after {
  right: -24%;
  bottom: -42%;
  background: radial-gradient(circle, rgba(255,102,133,0.52), transparent 65%);
  animation: bt-voice-ambient-b 8.5s ease-in-out infinite;
}

.bt-voice-grid {
  position: absolute;
  inset: -20%;
  pointer-events: none;
  opacity: 0.16;
  background-image:
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at 50% 48%, #000 0%, transparent 67%);
  -webkit-mask-image: radial-gradient(circle at 50% 48%, #000 0%, transparent 67%);
  transform: perspective(700px) rotateX(58deg) translateY(30%);
}

.bt-voice-close {
  position: absolute;
  top: clamp(18px, 3vw, 28px);
  right: clamp(18px, 3vw, 28px);
  z-index: 4;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  color: rgba(255,255,255,0.86);
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 14px 34px rgba(0,0,0,0.18);
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  transition: transform 180ms ease, background 180ms ease;
}

.bt-voice-close:hover {
  transform: scale(1.06);
  background: rgba(255,255,255,0.14);
}

.bt-voice-center {
  position: relative;
  z-index: 2;
  width: min(100%, 720px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.bt-voice-orb-button {
  position: relative;
  width: clamp(230px, 34vw, 330px);
  aspect-ratio: 1;
  border: 0;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  cursor: default;
  display: grid;
  place-items: center;
  -webkit-tap-highlight-color: transparent;
}

.bt-voice-stage--listening .bt-voice-orb-button,
.bt-voice-stage--ready .bt-voice-orb-button,
.bt-voice-stage--error .bt-voice-orb-button {
  cursor: pointer;
}

.bt-voice-halo {
  position: absolute;
  inset: 8%;
  border-radius: 44% 56% 50% 50% / 46% 44% 56% 54%;
  background:
    conic-gradient(from 20deg,
      rgba(255,255,255,0.04),
      rgba(${accentRgb},0.76),
      rgba(255,120,145,0.42),
      rgba(255,255,255,0.12),
      rgba(${accentRgb},0.76),
      rgba(255,255,255,0.04));
  filter: blur(18px);
  opacity: var(--voice-glow, 0.3);
  animation: bt-voice-halo-spin 6.4s linear infinite;
  will-change: transform, opacity;
}

.bt-voice-halo:nth-child(2) {
  inset: 15%;
  filter: blur(11px);
  opacity: calc(var(--voice-glow, 0.3) * 0.78);
  animation: bt-voice-halo-reverse 4.8s linear infinite;
}

.bt-voice-core {
  position: relative;
  width: 52%;
  aspect-ratio: 1;
  transform: scale(var(--voice-scale, 1.03));
  border-radius: 46% 54% 58% 42% / 44% 46% 54% 56%;
  background:
    radial-gradient(circle at 30% 23%, rgba(255,255,255,0.96), transparent 18%),
    radial-gradient(circle at 68% 72%, rgba(255,116,145,0.78), transparent 34%),
    radial-gradient(circle at 34% 70%, rgba(${accentRgb},0.94), transparent 48%),
    linear-gradient(135deg, rgba(255,255,255,0.68), rgba(${accentRgb},0.94) 48%, rgba(98,11,30,0.92));
  box-shadow:
    0 0 34px rgba(${accentRgb}, calc(0.22 + var(--voice-energy, 0.08) * 0.40)),
    0 0 110px rgba(${accentRgb}, calc(0.16 + var(--voice-energy, 0.08) * 0.34)),
    inset 0 1px 0 rgba(255,255,255,0.72),
    inset -18px -20px 46px rgba(40,0,10,0.24);
  animation: bt-voice-core-breathe 3.8s ease-in-out infinite;
  transition: transform 90ms linear, box-shadow 120ms linear;
  will-change: transform, border-radius;
}

.bt-voice-core::before {
  content: "";
  position: absolute;
  inset: 10%;
  border-radius: inherit;
  background: linear-gradient(130deg, rgba(255,255,255,0.24), transparent 44%, rgba(255,255,255,0.08));
  mix-blend-mode: screen;
  filter: blur(5px);
}

.bt-voice-stage--transcribing .bt-voice-core,
.bt-voice-stage--thinking .bt-voice-core {
  transform: scale(0.94);
  animation-duration: 2.1s;
}

.bt-voice-stage--speaking .bt-voice-core {
  animation-duration: 2.7s;
}

.bt-voice-copy {
  width: min(100%, 660px);
  margin-top: clamp(4px, 1vw, 12px);
  animation: bt-voice-text-in 380ms 100ms ease both;
}

.bt-voice-eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.56);
  margin-bottom: 10px;
}

.bt-voice-title {
  font-size: clamp(28px, 4.2vw, 48px);
  line-height: 1.08;
  font-weight: 780;
  letter-spacing: -0.035em;
  text-wrap: balance;
  text-shadow: 0 12px 44px rgba(0,0,0,0.24);
}

.bt-voice-transcript {
  margin: 14px auto 0;
  max-width: 620px;
  min-height: 46px;
  font-size: clamp(15px, 1.9vw, 19px);
  line-height: 1.5;
  color: rgba(255,255,255,0.70);
  text-wrap: balance;
}

.bt-voice-dots {
  height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
}

.bt-voice-dots span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255,255,255,0.82);
  animation: bt-voice-dot 900ms ease-in-out infinite;
}

.bt-voice-dots span:nth-child(2) { animation-delay: 120ms; }
.bt-voice-dots span:nth-child(3) { animation-delay: 240ms; }

.bt-voice-action {
  margin-top: 18px;
  min-height: 46px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  color: #ffffff;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 16px 38px rgba(0,0,0,0.16);
  cursor: pointer;
  font-weight: 750;
  font-size: 14px;
  transition: transform 180ms ease, background 180ms ease;
}

.bt-voice-action:hover {
  transform: translateY(-1px);
  background: rgba(255,255,255,0.18);
}

.bt-voice-footer {
  position: absolute;
  left: 50%;
  bottom: clamp(20px, 3vw, 30px);
  transform: translateX(-50%);
  z-index: 3;
  width: calc(100% - 120px);
  text-align: center;
  color: rgba(255,255,255,0.44);
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
}

@media (max-width: 680px) {
  .bt-voice-stage { padding: 26px 18px 68px; }
  .bt-voice-orb-button { width: min(68vw, 260px); }
  .bt-voice-title { font-size: clamp(27px, 9vw, 40px); }
  .bt-voice-transcript { font-size: 15px; }
  .bt-voice-footer { width: calc(100% - 64px); }
}

.bt-image-preview-wrap {
  margin-top: 10px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.30);
  background: rgba(255,255,255,0.18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18);
}

.bt-image-preview-wrap img {
  display: block;
  width: 100%;
  max-height: ${isEnhancedInterface ? "340px" : "260px"};
  object-fit: cover;
}

.bt-image-preview-label {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.3;
  opacity: 0.9;
}

@keyframes bt-pulse {
  0% { transform: scale(1); opacity: .9; }
  70% { transform: scale(1.26); opacity: 0; }
  100% { transform: scale(1.26); opacity: 0; }
}

@keyframes bt-dock-bounce {
  0%   { transform: translateY(0) scale(1); }
  10%  { transform: translateY(-12px) scale(1.04); }
  22%  { transform: translateY(0) scale(0.99); }
  34%  { transform: translateY(-7px) scale(1.025); }
  46%  { transform: translateY(0) scale(1); }
  100% { transform: translateY(0) scale(1); }
}

@keyframes bt-badge-in {
  0% { opacity: 0; transform: translateY(6px) scale(.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes bt-badge-out {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(6px) scale(.98); }
}

@keyframes bt-liquid {
  0% { transform: translate3d(-6%, -4%, 0) scale(1); opacity: .36; }
  50% { transform: translate3d(6%, 3%, 0) scale(1.03); opacity: .48; }
  100% { transform: translate3d(-6%, -4%, 0) scale(1); opacity: .36; }
}

@keyframes bt-launcher-arrive {
  0% { opacity: 0; transform: translate3d(22px, 26px, 0) scale(0.62); filter: blur(8px); }
  58% { opacity: 1; transform: translate3d(-3px, -5px, 0) scale(1.06); filter: blur(0); }
  78% { transform: translate3d(0, 0, 0) scale(0.97); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
}

@keyframes bt-panel-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes bt-panel-pop-in {
  0% { opacity: 0; transform: translate3d(28px, 34px, 0) scale(0.82); filter: blur(14px); }
  52% { opacity: 1; transform: translate3d(-4px, -6px, 0) scale(1.025); filter: blur(0); }
  72% { transform: translate3d(0, 0, 0) scale(0.988); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
}

.bt-launcher {
  position: relative;
  overflow: visible;
  will-change: transform;
  transform: translateZ(0);
  animation: bt-launcher-arrive 680ms cubic-bezier(.16,1,.3,1) both;
  transform-origin: right bottom;
  background-clip: padding-box;
}

.bt-launcher::before {
  content: "";
  position: absolute;
  inset: -14px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(${accentRgb}, 0.36) 0%, rgba(${accentRgb}, 0.13) 42%, transparent 72%);
  filter: blur(3px);
  opacity: 1;
  pointer-events: none;
}

.bt-launcher::after {
  content: "";
  position: absolute;
  inset: -18px;
  border-radius: 999px;
  border: 1px solid rgba(${accentRgb}, 0.32);
  animation: bt-pulse 2.4s ease-out infinite;
  pointer-events: none;
}

.bt-bouncing {
  animation: bt-dock-bounce 920ms cubic-bezier(.2,.9,.2,1) 1;
}

.bt-badge {
  position: absolute;
  right: 68px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.20);
  background: linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.18));
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  box-shadow: 0 16px 50px rgba(0,0,0,0.16);
  color: ${textPrimary};
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  animation: bt-badge-in 260ms ease-out;
}

.bt-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${widgetAccent};
  box-shadow: 0 0 0 6px rgba(${accentRgb}, 0.16);
}

.bt-badge-hide {
  animation: bt-badge-out 240ms ease-in forwards;
}

.bt-panel {
  border-radius: ${panelRadius}px;
  overflow: hidden;
  animation: bt-panel-fade-in 260ms ease-out both;
  isolation: isolate;
  contain: layout paint;
}

.bt-panel-layer {
  border-radius: ${panelRadius}px;
}

.bt-start-card {
  width: 100%;
  min-height: ${isEnhancedInterface ? "138px" : "auto"};
  border: 1px solid rgba(255,255,255,0.38);
  border-radius: ${isEnhancedInterface ? "24px" : "16px"};
  padding: ${isEnhancedInterface ? "20px" : "12px"};
  text-align: left;
  background:
    radial-gradient(160px 90px at 12% 0%, rgba(${accentRgb}, 0.18), transparent 72%),
    linear-gradient(180deg, rgba(255,255,255,0.74), rgba(255,255,255,0.42));
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  box-shadow: 0 14px 34px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.42);
  cursor: pointer;
  color: ${textPrimary};
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
}

.bt-start-card:hover {
  transform: translateY(-2px);
  border-color: rgba(${accentRgb}, 0.42);
  box-shadow: 0 18px 44px rgba(0,0,0,0.14), 0 0 0 1px rgba(${accentRgb}, 0.10) inset;
  background:
    radial-gradient(180px 110px at 12% 0%, rgba(${accentRgb}, 0.26), transparent 72%),
    linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,255,255,0.52));
}

.bt-start-card:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

@media (max-width: 900px) {
  .bt-start-card {
    min-height: 124px;
  }
}

@media (max-width: 680px) {
  .bt-start-card {
    min-height: auto;
    padding: 14px;
    border-radius: 18px;
  }
}

.bt-panel-scroll {
  position: relative;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  scrollbar-width: thin;
}

.bt-panel-scroll::-webkit-scrollbar {
  width: 8px;
}

.bt-panel-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(${accentRgb}, 0.28);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.bt-panel-scroll::-webkit-scrollbar-track {
  background: transparent;
}

/* Mobile layout is class-driven as well as media-query-driven.
   This is important for embedded iframes that were previously opened at 980px. */
.bt-mobile-viewport {
  min-height: 100dvh !important;
  width: 100% !important;
  height: 100dvh !important;
  overflow: hidden !important;
}

.bt-mobile-viewport .bt-panel {
  left: 8px !important;
  right: 8px !important;
  top: max(8px, env(safe-area-inset-top)) !important;
  bottom: max(8px, env(safe-area-inset-bottom)) !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 28px !important;
  transform-origin: center bottom !important;
}


.bt-mobile-viewport .bt-launcher-shell--open {
  top: calc(max(8px, env(safe-area-inset-top)) + 10px) !important;
  right: 18px !important;
  bottom: auto !important;
  width: 46px !important;
  height: 46px !important;
  z-index: 1000002 !important;
}

.bt-mobile-viewport .bt-launcher-shell--open .bt-launcher {
  width: 44px !important;
  height: 44px !important;
  box-shadow: 0 10px 28px rgba(0,0,0,0.18), 0 0 0 1px rgba(${accentRgb},0.18) inset !important;
}

.bt-mobile-viewport .bt-launcher-shell--open .bt-launcher::before,
.bt-mobile-viewport .bt-launcher-shell--open .bt-launcher::after {
  display: none !important;
}

.bt-mobile-viewport.bt-voice-mode-open .bt-launcher-shell--open {
  display: none !important;
}

.bt-mobile-viewport .bt-panel-header {
  padding: 15px 62px 14px 16px !important;
  min-height: 88px !important;
  gap: 10px !important;
}

.bt-mobile-viewport .bt-brand-block {
  min-width: 0 !important;
  flex: 1 1 auto !important;
}

.bt-mobile-viewport .bt-brand-title {
  max-width: 245px !important;
  font-size: 17px !important;
  line-height: 1.18 !important;
  letter-spacing: -0.01em !important;
  overflow-wrap: anywhere !important;
}

.bt-mobile-viewport .bt-brand-subtitle {
  font-size: 12.5px !important;
  line-height: 1.3 !important;
}

.bt-mobile-viewport .bt-header-actions {
  flex: 0 0 auto !important;
}

.bt-mobile-viewport .bt-powered-logo,
.bt-mobile-viewport .bt-primary-cta {
  display: none !important;
}

.bt-mobile-viewport .bt-reset-button {
  min-width: 44px !important;
  height: 36px !important;
  padding: 0 10px !important;
  border-radius: 12px !important;
  font-size: 12px !important;
}

.bt-mobile-viewport .bt-panel-scroll {
  padding: 12px !important;
  gap: 12px !important;
  overscroll-behavior: contain !important;
  -webkit-overflow-scrolling: touch !important;
  scroll-padding-bottom: 90px !important;
}

.bt-mobile-viewport input:not(.bt-hidden-file-input),
.bt-mobile-viewport select,
.bt-mobile-viewport textarea {
  font-size: 16px !important;
}

.bt-mobile-viewport .bt-start-intro {
  padding: 10px 5px 4px !important;
}

.bt-mobile-viewport .bt-start-title {
  font-size: 24px !important;
  line-height: 1.08 !important;
  letter-spacing: -0.025em !important;
}

.bt-mobile-viewport .bt-start-description {
  font-size: 14px !important;
  line-height: 1.45 !important;
}

.bt-mobile-viewport .bt-fahrwerk-steps {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 7px !important;
  margin-top: 14px !important;
}

.bt-mobile-viewport .bt-fahrwerk-steps > div {
  min-width: 0 !important;
  padding: 8px 6px !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  white-space: normal !important;
}

.bt-mobile-viewport .bt-start-grid {
  grid-template-columns: 1fr !important;
  gap: 10px !important;
}

.bt-mobile-viewport .bt-start-card {
  min-height: 0 !important;
  padding: 14px !important;
  border-radius: 20px !important;
  touch-action: manipulation !important;
}

.bt-mobile-viewport .bt-fahrwerk-panel {
  padding: 15px !important;
  border-radius: 24px !important;
  gap: 13px !important;
}

.bt-mobile-viewport .bt-composer {
  padding: 10px !important;
  padding-bottom: calc(10px + env(safe-area-inset-bottom)) !important;
  gap: 8px !important;
}

.bt-mobile-viewport .bt-round-action-button {
  width: 48px !important;
  height: 48px !important;
  border-radius: 15px !important;
  font-size: 19px !important;
}

.bt-mobile-viewport .bt-message-input {
  min-width: 0 !important;
  height: 50px !important;
  padding: 0 13px !important;
  border-radius: 16px !important;
  font-size: 16px !important;
}

.bt-mobile-viewport .bt-send-button {
  flex: 0 0 50px !important;
  width: 50px !important;
  height: 50px !important;
  padding: 0 !important;
  border-radius: 16px !important;
  font-size: 0 !important;
}

.bt-mobile-viewport .bt-send-button::after {
  content: "↑";
  font-size: 22px;
  line-height: 1;
  font-weight: 900;
}

.bt-mobile-viewport .bt-voice-stage {
  padding: 52px 18px 76px !important;
  border-radius: 28px !important;
}

.bt-mobile-viewport .bt-voice-close {
  top: 14px !important;
  right: 14px !important;
  width: 42px !important;
  height: 42px !important;
}

.bt-mobile-viewport .bt-voice-orb-button {
  width: min(58vw, 220px) !important;
}

.bt-mobile-viewport .bt-voice-title {
  font-size: clamp(28px, 9vw, 36px) !important;
}

.bt-mobile-viewport .bt-voice-transcript {
  font-size: 14px !important;
  line-height: 1.45 !important;
}

.bt-mobile-viewport .bt-voice-footer {
  bottom: calc(14px + env(safe-area-inset-bottom)) !important;
  width: calc(100% - 44px) !important;
  font-size: 11px !important;
}

@media (max-width: 680px) {
  .bt-panel {
    left: 8px !important;
    right: 8px !important;
    top: max(8px, env(safe-area-inset-top)) !important;
    bottom: max(8px, env(safe-area-inset-bottom)) !important;
    width: auto !important;
    height: auto !important;
    max-width: none !important;
    max-height: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bt-bouncing { animation: none !important; }
  .bt-launcher { animation: none !important; }
  .bt-panel { animation: none !important; }
  .bt-launcher::after { animation: none !important; }
  .bt-panel-liquid { animation: none !important; }
  .bt-voice-stage,
  .bt-voice-stage::before,
  .bt-voice-stage::after,
  .bt-voice-halo,
  .bt-voice-core,
  .bt-voice-copy,
  .bt-voice-dots span { animation: none !important; }
}

`}</style>

      {isEmbedClosed ? (
        <div
          className="bt-launcher-shell"
          style={{
            position: "fixed",
            right: launcherOffset,
            bottom: launcherOffset,
            width: launcherFrameSize,
            height: launcherFrameSize,
            display: "grid",
            placeItems: "center",
            zIndex: 999999,
            background: "transparent",
            boxShadow: "none",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {launcherButton}
        </div>
      ) : (
        <>
          <div
            className={`bt-launcher-shell ${open ? "bt-launcher-shell--open" : ""}`}
            style={{
              position: "fixed",
              right: launcherOffset,
              bottom: launcherOffset,
              width: launcherFrameSize,
              height: launcherFrameSize,
              display: "grid",
              placeItems: "center",
              zIndex: 999999,
              background: "transparent",
              boxShadow: "none",
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            {!open && showBadge && !isEmbedded && (
              <div className={`bt-badge ${!showBadge ? "bt-badge-hide" : ""}`}>
                <span className="bt-badge-dot" />
                <span>
                  {isHohenbadenInterface
                    ? "Intensivkurs finden?"
                    : isAbgefahrenInterface
                      ? "Führerschein-Frage?"
                      : isFahrwerkBInterface
                      ? "Führerschein starten?"
                      : isTxbikesInterface
                      ? "Fahrrad-Frage?"
                      : isWilliInterface
                        ? "Fragen?"
                        : `Fragen? Chatte mit ${displayAssistantName}`}
                </span>
              </div>
            )}

            {launcherButton}
          </div>

          {open && (
            <div
              className="bt-panel"
              style={{
                position: "fixed",
                right: isMobileViewport ? 8 : launcherOffset,
                left: isMobileViewport ? 8 : undefined,
                top: isMobileViewport ? 8 : undefined,
                bottom: isMobileViewport ? 8 : panelOffsetBottom,
                width: isMobileViewport ? "auto" : panelW,
                maxWidth: isMobileViewport
                  ? "none"
                  : "calc(100vw - 28px)",
                height: isMobileViewport
                  ? "auto"
                  : `min(${panelH}px, calc(100dvh - ${panelOffsetBottom + 12}px))`,
                maxHeight: "none",
                border: "1px solid rgba(255,255,255,0.46)",
                background: `
          radial-gradient(980px 520px at 18% -10%, ${widgetAccent}26 0%, transparent 62%),
          radial-gradient(780px 520px at 95% 8%, rgba(255,255,255,0.18) 0%, transparent 55%),
          radial-gradient(620px 400px at 52% 110%, rgba(${accentRgb}, 0.12) 0%, transparent 72%),
          linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.70))
        `,
                backdropFilter: "blur(34px) saturate(180%)",
                WebkitBackdropFilter: "blur(34px) saturate(180%)",
                boxShadow: `0 28px 110px rgba(17,12,31,0.22), 0 0 0 1px rgba(255,255,255,0.18) inset, 0 0 58px rgba(${accentRgb},0.13)`,
                zIndex: 999999,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                isolation: "isolate",
              }}
            >
              <div
                className="bt-panel-layer bt-panel-liquid"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  filter: "blur(28px)",
                  animation: "bt-liquid 8.5s ease-in-out infinite",
                  background: `
            radial-gradient(520px 220px at 18% 12%, ${widgetAccent}18 0%, transparent 72%),
            radial-gradient(520px 240px at 80% 20%, rgba(255,255,255,0.10) 0%, transparent 75%),
            radial-gradient(520px 320px at 42% 78%, rgba(255,255,255,0.08) 0%, transparent 70%)
          `,
                  mixBlendMode: "screen",
                  opacity: 0.42,
                }}
              />

              <div
                className="bt-panel-layer"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "linear-gradient(120deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 34%, rgba(255,255,255,0.08) 70%, rgba(255,255,255,0.02) 100%)",
                  opacity: 0.2,
                  mixBlendMode: "screen",
                }}
              />

              <div
                className="bt-panel-layer"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.78), transparent)",
                  opacity: 0.9,
                  pointerEvents: "none",
                }}
              />

              <div
                className="bt-panel-layer"
                style={{
                  position: "absolute",
                  inset: 14,
                  borderRadius: panelRadius - 10,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 34%, rgba(255,255,255,0.02) 100%)",
                  pointerEvents: "none",
                  opacity: 0.8,
                }}
              />

              <div
                style={{
                  position: "relative",
                  flex: "1 1 auto",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  className="bt-panel-header"
                  style={{
                    padding: isMobileViewport
                      ? "15px 62px 14px 16px"
                      : isEnhancedInterface
                        ? "24px 28px 22px"
                        : "16px 14px 14px",
                    borderBottom: "1px solid rgba(22,49,38,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: isEnhancedInterface ? 16 : 10,
                    minHeight: isMobileViewport
                      ? 88
                      : isEnhancedInterface
                        ? 116
                        : 86,
                    flex: "0 0 auto",
                    background: `
              radial-gradient(520px 180px at 18% 0%, ${widgetAccent}14 0%, transparent 72%),
              linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.14))
            `,
                    boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset",
                  }}
                >
                  <div
                    className="bt-brand-block"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: isEnhancedInterface ? 12 : 10,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: loading ? "#f5c542" : widgetAccent,
                        boxShadow: `0 0 0 7px ${
                          loading
                            ? "rgba(245,197,66,0.14)"
                            : `rgba(${accentRgb}, 0.12)`
                        }`,
                        flex: "0 0 auto",
                      }}
                    />
                    <div style={{ lineHeight: 1.2 }}>
                      <div
                        className="bt-brand-title"
                        style={{
                          fontSize: isMobileViewport
                            ? 17
                            : isEnhancedInterface
                              ? 20
                              : 17,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                          opacity: 0.96,
                          color: textPrimary,
                        }}
                      >
                        {displayBrandName} – {displayAssistantName}
                      </div>
                      <div
                        className="bt-brand-subtitle"
                        style={{
                          fontSize: isMobileViewport
                            ? 12.5
                            : isEnhancedInterface
                              ? 14
                              : 12.5,
                          opacity: 0.9,
                          marginTop: 3,
                          color: textSecondary,
                        }}
                      >
                        {voicePhase === "listening"
                          ? "Hört zu…"
                          : voicePhase === "transcribing"
                            ? "Versteht dich…"
                            : voicePhase === "thinking"
                              ? "Denkt nach…"
                              : voicePhase === "speaking" ||
                                  voicePhase === "ready"
                                ? "Antwortet…"
                                : loading
                                  ? "Tippt…"
                                  : isHohenbadenInterface
                                    ? "Beta: in7Days Führerscheinbegleiter"
                                    : isAbgefahrenInterface
                                      ? "Beta: persönlicher Führerscheinbegleiter"
                                      : isFahrwerkBInterface
                                      ? "In 1 Minute zum passenden Einstieg"
                                      : "Online verfügbar"}
                      </div>
                    </div>
                  </div>

                  <div
                    className="bt-header-actions"
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <div
                      className="bt-powered-logo"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: isEnhancedInterface ? 64 : 52,
                        height: isEnhancedInterface ? 64 : 52,
                        padding: isEnhancedInterface ? "9px" : "7px",
                        borderRadius: isEnhancedInterface ? 18 : 14,
                        border: "1px solid rgba(255,255,255,0.42)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.62), rgba(255,255,255,0.36))",
                        backdropFilter: "blur(14px) saturate(145%)",
                        WebkitBackdropFilter: "blur(14px) saturate(145%)",
                        boxShadow:
                          "0 10px 30px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.42)",
                        overflow: "hidden",
                        flex: "0 0 auto",
                      }}
                      title="Powered"
                    >
                      <img
                        src={GLOBAL_LOGO_SRC}
                        alt="Logo"
                        style={{
                          height: "100%",
                          width: "100%",
                          objectFit: "contain",
                          display: "block",
                          margin: "auto",
                          transform: "scale(1.04)",
                          transformOrigin: "center",
                          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.10))",
                        }}
                      />
                    </div>

                    {headerPrimaryCta?.url && (
                      <a
                        className="bt-primary-cta"
                        href={headerPrimaryCta.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: isEnhancedInterface ? 12.5 : 11.5,
                          padding: isEnhancedInterface
                            ? "11px 14px"
                            : "8px 10px",
                          borderRadius: isEnhancedInterface ? 14 : 11,
                          border: "1px solid rgba(255,255,255,0.24)",
                          background: `linear-gradient(180deg, ${widgetAccent}D6, ${widgetAccent}92)`,
                          color: "#ffffff",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                        }}
                        title={headerPrimaryCta.label}
                      >
                        {headerPrimaryCta.label}
                      </a>
                    )}

                    <button
                      className="bt-reset-button"
                      onClick={resetChat}
                      style={{
                        fontSize: isEnhancedInterface ? 12.5 : 11.5,
                        padding: isEnhancedInterface ? "11px 14px" : "8px 10px",
                        borderRadius: isEnhancedInterface ? 14 : 11,
                        border: "1px solid rgba(255,255,255,0.24)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.50))",
                        color: textPrimary,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
                      }}
                      title="Chat neu starten"
                    >
                      Neu
                    </button>
                  </div>
                </div>

                <div
                  ref={listRef}
                  className="bt-panel-scroll"
                  onWheelCapture={(event) => {
                    const scrollArea = event.currentTarget;

                    if (scrollArea.scrollHeight <= scrollArea.clientHeight) return;

                    const multiplier = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? scrollArea.clientHeight : 1;
                    scrollArea.scrollTop += event.deltaY * multiplier;
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  style={{
                    position: "relative",
                    zIndex: 3,
                    flex: "1 1 auto",
                    flexBasis: 0,
                    height: "auto",
                    minHeight: 0,
                    maxHeight: "none",
                    overflowY: "auto",
                    overflowX: "hidden",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehaviorY: "contain",
                    touchAction: "pan-y pinch-zoom",
                    scrollbarGutter: "stable",
                    padding: isMobileViewport
                      ? 12
                      : isEnhancedInterface
                        ? 26
                        : 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: isEnhancedInterface ? 16 : 10,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(22,49,38,0.04)",
                  }}
                >
                  {showStartCards && (
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: isEnhancedInterface ? 16 : 10,
                        marginBottom: 2,
                      }}
                    >
                      <div
                        className="bt-start-intro"
                        style={{
                          padding: isMobileViewport
                            ? "12px 6px 4px"
                            : isEnhancedInterface
                              ? "22px 22px 10px"
                              : "14px 14px 4px",
                          color: textPrimary,
                        }}
                      >
                        <div
                          className="bt-start-title"
                          style={{
                            fontSize: isMobileViewport
                              ? 24
                              : isEnhancedInterface
                                ? 30
                                : 18,
                            fontWeight: 800,
                            letterSpacing: 0.2,
                            marginBottom: 6,
                          }}
                        >
                          {isHohenbadenInterface
                            ? "Schneller zum Führerschein. Persönlich begleitet."
                            : isAbgefahrenInterface
                              ? "Dein Führerschein. Ein persönliches Cockpit."
                              : isFahrwerkBInterface
                              ? "Dein Führerschein-Cockpit"
                              : "Was möchtest du machen?"}
                        </div>
                        <div
                          className="bt-start-description"
                          style={{
                            fontSize: isMobileViewport
                              ? 14
                              : isEnhancedInterface
                                ? 16
                                : 13,
                            lineHeight: 1.5,
                            color: textSecondary,
                          }}
                        >
                          {isHohenbadenInterface
                            ? "Verbinde dich als Fahrschüler, finde den nächsten Intensivkurs, verfolge deinen THEO-Lernstand und plane deine Praxis. Diese Beta zeigt, wie in7Days die komplette Ausbildung digital an einem Ort bündeln könnte."
                            : isAbgefahrenInterface
                              ? "Verbinde dich als Fahrschüler, buche den nächsten passenden Kurs oder öffne deinen persönlichen Begleiter. Diese Beta zeigt, wie die komplette Ausbildung später an einem Ort zusammenlaufen kann."
                              : isFahrwerkBInterface
                              ? "Wähle aus, wo du gerade stehst. Das Interface zeigt dir den nächsten Schritt, prüft Unterlagen und bereitet Anfragen sauber vor."
                              : isLinaInterface
                              ? `Wähle einen Einstieg aus. Danach führt dich ${displayAssistantName} gezielt zur passenden Lösung.`
                              : isMmWartungInterface
                                ? `Wähle aus, worum es geht. Danach nimmt ${displayAssistantName} dein Anliegen für Moritz sauber auf.`
                                : isTxbikesInterface
                                  ? `Wähle aus, worum es geht. Danach nimmt ${displayAssistantName} dein Anliegen für TXBikes sauber auf.`
                                  : isWilliInterface
                                    ? `Wähle aus, worum es geht. Danach führt dich ${displayAssistantName} gezielt weiter.`
                                    : `Wähle einen Einstieg aus. Danach führt dich ${displayAssistantName} gezielt weiter.`}
                        </div>

                        {(isFahrwerkBInterface || isAbgefahrenInterface || isHohenbadenInterface) && (
                          <div
                            className="bt-fahrwerk-steps"
                            style={{
                              display: "grid",
                              gridTemplateColumns: isMobileViewport
                                ? "repeat(2, minmax(0, 1fr))"
                                : "repeat(4, minmax(0, 1fr))",
                              gap: 8,
                              marginTop: 18,
                            }}
                          >
                            {(isHohenbadenInterface
                              ? [
                                  "1 Verbinden",
                                  "2 Intensivkurs",
                                  "3 THEO & Praxis",
                                  "4 Persönlich begleiten",
                                ]
                              : isAbgefahrenInterface
                                ? [
                                    "1 Verbinden",
                                    "2 Kurs buchen",
                                    "3 Fortschritt sehen",
                                    "4 Persönlich begleiten",
                                  ]
                                : [
                                  "1 Orientierung",
                                  "2 Unterlagen",
                                  "3 Theorie/Praxis",
                                  "4 Anfrage",
                                ]
                            ).map((step) => (
                              <div
                                key={step}
                                style={{
                                  borderRadius: 999,
                                  border: `1px solid rgba(${accentRgb}, 0.24)`,
                                  background: `rgba(${accentRgb}, 0.10)`,
                                  color: textPrimary,
                                  padding: "8px 10px",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  textAlign: "center",
                                }}
                              >
                                {step}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div
                        className="bt-start-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobileViewport
                            ? "1fr"
                            : isEnhancedInterface
                              ? "repeat(3, minmax(0, 1fr))"
                              : "1fr 1fr",
                          gap: isMobileViewport
                            ? 10
                            : isEnhancedInterface
                              ? 16
                              : 10,
                        }}
                      >
                        {startCards.map((card) => (
                          <button
                            key={card.title}
                            type="button"
                            className="bt-start-card"
                            disabled={loading || isVoiceActive}
                            onClick={() => {
                              if (card.action === "photo") {
                                openPhotoPicker();
                                return;
                              }

                              if (card.action === "voice") {
                                void startVoiceInput();
                                return;
                              }

                              if (card.action === "booking") {
                                openBookingForm();
                                return;
                              }

                              if (card.action === "fahrwerkSignup") {
                                openFahrwerkSignupForm(
                                  card.prefillLicenseClass,
                                  card.prefillStartWish,
                                );
                                return;
                              }

                              if (card.action === "fahrwerkLiveSignup") {
                                openFahrwerkLiveSignup();
                                return;
                              }

                              if (
                                card.action === "fahrwerkPanel" &&
                                card.fahrwerkPanel
                              ) {
                                openFahrwerkPanel(card.fahrwerkPanel);
                                return;
                              }

                              if (
                                card.action === "abgefahrenPanel" &&
                                card.abgefahrenPanel
                              ) {
                                openAbgefahrenPanel(card.abgefahrenPanel);
                                return;
                              }

                              if (
                                card.action === "hohenbadenPanel" &&
                                card.hohenbadenPanel
                              ) {
                                openHohenbadenPanel(card.hohenbadenPanel);
                                return;
                              }

                              if (card.message) {
                                void sendText(card.message);
                              }
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: isEnhancedInterface ? 12 : 10,
                                marginBottom: isEnhancedInterface ? 12 : 8,
                              }}
                            >
                              <span
                                style={{
                                  width: isEnhancedInterface ? 42 : 30,
                                  height: isEnhancedInterface ? 42 : 30,
                                  borderRadius: isEnhancedInterface ? 16 : 12,
                                  display: "grid",
                                  placeItems: "center",
                                  background: `rgba(${accentRgb}, 0.13)`,
                                  boxShadow: `0 0 0 1px rgba(${accentRgb}, 0.10) inset`,
                                  fontSize: isEnhancedInterface ? 22 : 17,
                                  flex: "0 0 auto",
                                }}
                              >
                                {card.icon}
                              </span>
                              <span
                                style={{
                                  fontSize: isEnhancedInterface ? 16.5 : 13,
                                  fontWeight: 800,
                                  lineHeight: 1.18,
                                }}
                              >
                                {card.title}
                              </span>
                            </div>

                            <div
                              style={{
                                fontSize: isEnhancedInterface ? 14.5 : 12,
                                lineHeight: 1.45,
                                color: textSecondary,
                              }}
                            >
                              {card.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isAbgefahrenInterface && abgefahrenPanel !== "home" && (
                    <AbgefahrenFutureDemo
                      panel={abgefahrenPanel}
                      onPanelChange={openAbgefahrenPanel}
                      accent={widgetAccent}
                      accentRgb={accentRgb}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      isMobile={isMobileViewport}
                      onAsk={(message) => void sendText(message)}
                    />
                  )}

                  {isHohenbadenInterface && hohenbadenPanel !== "home" && (
                    <HohenbadenFutureDemo
                      panel={hohenbadenPanel}
                      onPanelChange={openHohenbadenPanel}
                      accent={widgetAccent}
                      accentRgb={accentRgb}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      isMobile={isMobileViewport}
                      onAsk={(message) => void sendText(message)}
                    />
                  )}

                  {isFahrwerkBInterface &&
                    (fahrwerkPanel !== "dashboard" ||
                      fahrwerkCompletedDocuments > 0 ||
                      fahrwerkStage !== "new") && (
                      <div
                        ref={fahrwerkPanelRef}
                        className="bt-fahrwerk-panel"
                        style={{
                          alignSelf: "stretch",
                          borderRadius: isEnhancedInterface ? 30 : 20,
                          border: "1px solid rgba(255,255,255,0.42)",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.68))",
                          boxShadow:
                            "0 18px 54px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.42)",
                          backdropFilter: "blur(24px) saturate(180%)",
                          WebkitBackdropFilter: "blur(24px) saturate(180%)",
                          padding: isEnhancedInterface ? 22 : 16,
                          display: "flex",
                          flexDirection: "column",
                          gap: 16,
                          color: textPrimary,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 14,
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: isEnhancedInterface ? 24 : 18,
                                fontWeight: 900,
                                marginBottom: 4,
                              }}
                            >
                              Führerschein-Begleiter
                            </div>
                            <div
                              style={{
                                fontSize: isEnhancedInterface ? 14.5 : 13,
                                color: textSecondary,
                                lineHeight: 1.45,
                              }}
                            >
                              Aktueller Stand:{" "}
                              <strong>{fahrwerkActiveStage.label}</strong> ·
                              Unterlagen: {fahrwerkCompletedDocuments}/
                              {FAHRWERK_DOCUMENT_ITEMS.length} erledigt
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={resetFahrwerkProgress}
                            style={{
                              border: "1px solid rgba(22,49,38,0.10)",
                              background: "rgba(255,255,255,0.60)",
                              borderRadius: 999,
                              padding: "9px 12px",
                              cursor: "pointer",
                              color: textSecondary,
                              fontSize: 12.5,
                              fontWeight: 800,
                            }}
                          >
                            Fortschritt zurücksetzen
                          </button>
                        </div>

                        <div
                          style={{
                            height: 10,
                            borderRadius: 999,
                            overflow: "hidden",
                            background: "rgba(17,24,39,0.08)",
                            border: "1px solid rgba(255,255,255,0.34)",
                          }}
                          aria-label="Unterlagen-Fortschritt"
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${fahrwerkDocumentProgress}%`,
                              background: `linear-gradient(90deg, ${widgetAccent}, rgba(${accentRgb}, 0.56))`,
                              borderRadius: 999,
                              transition: "width 220ms ease",
                            }}
                          />
                        </div>

                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          {[
                            ["start", "Starten"],
                            ["documents", "Unterlagen"],
                            ["theory", "Theorie"],
                            ["practice", "Praxis"],
                            ["exam", "Prüfung"],
                            ["student", "Mein Stand"],
                            ["contact", "Hilfe"],
                          ].map(([panel, label]) => (
                            <button
                              key={panel}
                              type="button"
                              onClick={() =>
                                openFahrwerkPanel(panel as FahrwerkPanel)
                              }
                              style={{
                                borderRadius: 999,
                                border: `1px solid rgba(${accentRgb}, ${fahrwerkPanel === panel ? 0.4 : 0.16})`,
                                background:
                                  fahrwerkPanel === panel
                                    ? `linear-gradient(180deg, rgba(${accentRgb}, 0.22), rgba(${accentRgb}, 0.10))`
                                    : "rgba(255,255,255,0.50)",
                                color: textPrimary,
                                padding: "9px 12px",
                                fontSize: 12.5,
                                fontWeight: 850,
                                cursor: "pointer",
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {fahrwerkPanel === "start" && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                borderRadius: 22,
                                border: `1px solid rgba(${accentRgb}, 0.28)`,
                                background: `linear-gradient(135deg, rgba(${accentRgb}, 0.18), rgba(255,255,255,0.68))`,
                                padding: 18,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 14,
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ flex: "1 1 360px" }}>
                                <div
                                  style={{
                                    fontSize: 20,
                                    fontWeight: 950,
                                    marginBottom: 5,
                                  }}
                                >
                                  Offizielle Online-Anmeldung
                                </div>
                                <div
                                  style={{
                                    fontSize: 14,
                                    color: textSecondary,
                                    lineHeight: 1.5,
                                  }}
                                >
                                  Die Anmeldung läuft direkt über
                                  Fahrschule.live. Dort werden deine Daten
                                  erfasst; sofern die Mailvorlage eingerichtet
                                  ist, wird anschließend automatisch eine
                                  Bestätigung versendet.
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={openFahrwerkLiveSignup}
                                style={{
                                  height: 48,
                                  padding: "0 18px",
                                  borderRadius: 16,
                                  border: "1px solid rgba(255,255,255,0.24)",
                                  background: `linear-gradient(180deg, ${widgetAccent}F0, ${widgetAccent}A8)`,
                                  color: "#ffffff",
                                  cursor: "pointer",
                                  fontWeight: 950,
                                  whiteSpace: "nowrap",
                                  boxShadow: `0 14px 34px rgba(0,0,0,0.16), 0 0 0 1px rgba(${accentRgb}, 0.14) inset`,
                                }}
                              >
                                Jetzt online anmelden ↗
                              </button>
                            </div>

                            <div
                              style={{
                                fontSize: 13.5,
                                color: textSecondary,
                                lineHeight: 1.45,
                              }}
                            >
                              Noch unsicher? Wähle zuerst eine
                              Führerscheinklasse aus und bereite eine
                              Beratungsanfrage vor.
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  isEnhancedInterface && !isMobileViewport
                                    ? "repeat(2, minmax(0, 1fr))"
                                  : "1fr",
                                gap: 12,
                              }}
                            >
                              {[
                                [
                                  "Klasse B",
                                  "Auto-Führerschein starten",
                                  "Schnell starten",
                                ],
                                [
                                  "B197",
                                  "Schalten lernen, später flexibel fahren",
                                  "Schnell starten",
                                ],
                                [
                                  "BF17",
                                  "Begleitetes Fahren ab 17 vorbereiten",
                                  "Schnell starten",
                                ],
                                [
                                  "BE Anhänger",
                                  "Anhänger-Führerschein anfragen",
                                  "Erstmal beraten lassen",
                                ],
                                [
                                  "Ich bin noch unsicher",
                                  "Interface bereitet eine Beratungsanfrage vor",
                                  "Erstmal beraten lassen",
                                ],
                              ].map(([licenseClass, description, wish]) => (
                                <button
                                  key={licenseClass}
                                  type="button"
                                  onClick={() =>
                                    openFahrwerkSignupForm(licenseClass, wish)
                                  }
                                  className="bt-start-card"
                                  style={{ minHeight: 0 }}
                                >
                                  <div
                                    style={{
                                      fontSize: 16,
                                      fontWeight: 900,
                                      marginBottom: 5,
                                    }}
                                  >
                                    {licenseClass}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 13.5,
                                      color: textSecondary,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {description}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {fahrwerkPanel === "documents" && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 15,
                                color: textSecondary,
                                lineHeight: 1.45,
                              }}
                            >
                              Hake ab, was schon erledigt ist. Der Stand wird
                              nur lokal im Browser gespeichert, bis wir später
                              eine echte Account-/Fahrschule.live-Anbindung
                              bauen.
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  isEnhancedInterface && !isMobileViewport
                                    ? "repeat(2, minmax(0, 1fr))"
                                  : "1fr",
                                gap: 10,
                              }}
                            >
                              {FAHRWERK_DOCUMENT_ITEMS.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() =>
                                    toggleFahrwerkChecklistItem(item.id)
                                  }
                                  style={{
                                    textAlign: "left",
                                    borderRadius: 18,
                                    border: `1px solid rgba(${accentRgb}, ${fahrwerkChecklist[item.id] ? 0.34 : 0.14})`,
                                    background: fahrwerkChecklist[item.id]
                                      ? `rgba(${accentRgb}, 0.12)`
                                      : "rgba(255,255,255,0.54)",
                                    padding: 14,
                                    cursor: "pointer",
                                    color: textPrimary,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 10,
                                      alignItems: "center",
                                      marginBottom: 6,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 999,
                                        display: "grid",
                                        placeItems: "center",
                                        background: fahrwerkChecklist[item.id]
                                          ? widgetAccent
                                          : "rgba(17,24,39,0.08)",
                                        color: fahrwerkChecklist[item.id]
                                          ? "#ffffff"
                                          : textSecondary,
                                        fontWeight: 900,
                                      }}
                                    >
                                      {fahrwerkChecklist[item.id] ? "✓" : ""}
                                    </span>
                                    <strong>{item.label}</strong>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12.5,
                                      color: textSecondary,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {item.hint}
                                  </div>
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                sendFahrwerkGuidedMessage(
                                  "Welche Unterlagen brauche ich für meinen Führerschein bei Fahrwerk B?",
                                )
                              }
                              style={{
                                alignSelf: "flex-start",
                                height: 46,
                                padding: "0 16px",
                                borderRadius: 15,
                                border: "1px solid rgba(255,255,255,0.22)",
                                background: `linear-gradient(180deg, ${widgetAccent}F0, ${widgetAccent}A8)`,
                                color: "#ffffff",
                                cursor: "pointer",
                                fontWeight: 900,
                              }}
                            >
                              Unterlagen kurz erklären
                            </button>
                          </div>
                        )}

                        {fahrwerkPanel === "student" && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                isEnhancedInterface && !isMobileViewport
                                  ? "1fr 1.15fr"
                                : "1fr",
                              gap: 14,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              {FAHRWERK_STAGES.map((stage) => (
                                <button
                                  key={stage.id}
                                  type="button"
                                  onClick={() => updateFahrwerkStage(stage.id)}
                                  style={{
                                    textAlign: "left",
                                    borderRadius: 16,
                                    border: `1px solid rgba(${accentRgb}, ${fahrwerkStage === stage.id ? 0.38 : 0.14})`,
                                    background:
                                      fahrwerkStage === stage.id
                                        ? `rgba(${accentRgb}, 0.14)`
                                        : "rgba(255,255,255,0.48)",
                                    padding: "12px 14px",
                                    cursor: "pointer",
                                    color: textPrimary,
                                    fontWeight: 850,
                                  }}
                                >
                                  {stage.label}
                                </button>
                              ))}
                            </div>
                            <div
                              style={{
                                borderRadius: 22,
                                border: "1px solid rgba(22,49,38,0.10)",
                                background: "rgba(255,255,255,0.58)",
                                padding: 18,
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  color: textSecondary,
                                  fontWeight: 850,
                                }}
                              >
                                Nächster sinnvoller Schritt
                              </div>
                              <div style={{ fontSize: 20, fontWeight: 950 }}>
                                {fahrwerkActiveStage.next}
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: textSecondary,
                                  lineHeight: 1.5,
                                }}
                              >
                                {fahrwerkActiveStage.detail}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  flexWrap: "wrap",
                                  marginTop: 4,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => openFahrwerkPanel("documents")}
                                  style={{
                                    borderRadius: 14,
                                    border: "1px solid rgba(22,49,38,0.10)",
                                    background: "rgba(255,255,255,0.68)",
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    fontWeight: 850,
                                  }}
                                >
                                  Unterlagen prüfen
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openFahrwerkSignupForm(
                                      "Ich bin schon Fahrschüler",
                                      "Rückruf von Fahrwerk B",
                                    )
                                  }
                                  style={{
                                    borderRadius: 14,
                                    border: "1px solid rgba(255,255,255,0.22)",
                                    background: `linear-gradient(180deg, ${widgetAccent}F0, ${widgetAccent}A8)`,
                                    color: "#ffffff",
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    fontWeight: 900,
                                  }}
                                >
                                  Frage vorbereiten
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {fahrwerkPanel === "theory" && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                isEnhancedInterface && !isMobileViewport
                                  ? "repeat(3, minmax(0, 1fr))"
                                : "1fr",
                              gap: 12,
                            }}
                          >
                            {[
                              [
                                "Theorie-Einstieg",
                                "Aktuelle Termine laufen später sauber über Fahrschule.live.",
                                "Ich möchte den passenden Theorie-Einstieg bei Fahrwerk B finden.",
                              ],
                              [
                                "Theorieprüfung",
                                "Ablauf, Vorbereitung und typische Fehler kurz erklären.",
                                "Wie bereite ich mich auf die Theorieprüfung vor?",
                              ],
                              [
                                "Durchgefallen",
                                "Ruhig einordnen und den nächsten Versuch planen.",
                                "Ich bin bei der Theorieprüfung durchgefallen. Was ist jetzt sinnvoll?",
                              ],
                            ].map(([title, description, message]) => (
                              <button
                                key={title}
                                type="button"
                                className="bt-start-card"
                                onClick={() =>
                                  sendFahrwerkGuidedMessage(message)
                                }
                                style={{ minHeight: 0 }}
                              >
                                <div
                                  style={{
                                    fontSize: 16,
                                    fontWeight: 900,
                                    marginBottom: 6,
                                  }}
                                >
                                  {title}
                                </div>
                                <div
                                  style={{
                                    fontSize: 13.5,
                                    color: textSecondary,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {description}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {fahrwerkPanel === "practice" && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                isEnhancedInterface && !isMobileViewport
                                  ? "repeat(2, minmax(0, 1fr))"
                                : "1fr",
                              gap: 12,
                            }}
                          >
                            {[
                              [
                                "Erste Fahrstunde",
                                "Was dich erwartet und wie du dich vorbereitest.",
                                "Was erwartet mich bei der ersten Fahrstunde?",
                              ],
                              [
                                "Sonderfahrten",
                                "Autobahn, Nachtfahrt und Überland verständlich erklärt.",
                                "Was sind Sonderfahrten und wann kommen sie dran?",
                              ],
                              [
                                "Prüfungsangst",
                                "Kurze, praktische Tipps statt langer Theorie.",
                                "Ich habe Angst vor der praktischen Prüfung. Was hilft?",
                              ],
                              [
                                "Fahrstunde klären",
                                "Anfrage an Fahrwerk B vorbereiten.",
                                "Ich habe eine Frage zu meinen Fahrstunden bei Fahrwerk B.",
                              ],
                            ].map(([title, description, message]) => (
                              <button
                                key={title}
                                type="button"
                                className="bt-start-card"
                                onClick={() =>
                                  sendFahrwerkGuidedMessage(message)
                                }
                                style={{ minHeight: 0 }}
                              >
                                <div
                                  style={{
                                    fontSize: 16,
                                    fontWeight: 900,
                                    marginBottom: 6,
                                  }}
                                >
                                  {title}
                                </div>
                                <div
                                  style={{
                                    fontSize: 13.5,
                                    color: textSecondary,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {description}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {fahrwerkPanel === "exam" && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                isEnhancedInterface && !isMobileViewport
                                  ? "repeat(2, minmax(0, 1fr))"
                                : "1fr",
                              gap: 12,
                            }}
                          >
                            <button
                              type="button"
                              className="bt-start-card"
                              onClick={() =>
                                sendFahrwerkGuidedMessage(
                                  "Gib mir eine kurze Checkliste für die Theorieprüfung.",
                                )
                              }
                              style={{ minHeight: 0 }}
                            >
                              <div
                                style={{
                                  fontSize: 16,
                                  fontWeight: 900,
                                  marginBottom: 6,
                                }}
                              >
                                Theorieprüfung-Check
                              </div>
                              <div
                                style={{
                                  fontSize: 13.5,
                                  color: textSecondary,
                                  lineHeight: 1.4,
                                }}
                              >
                                Was du vorher prüfen solltest und wie du ruhig
                                bleibst.
                              </div>
                            </button>
                            <button
                              type="button"
                              className="bt-start-card"
                              onClick={() =>
                                sendFahrwerkGuidedMessage(
                                  "Gib mir eine kurze Checkliste für die praktische Prüfung.",
                                )
                              }
                              style={{ minHeight: 0 }}
                            >
                              <div
                                style={{
                                  fontSize: 16,
                                  fontWeight: 900,
                                  marginBottom: 6,
                                }}
                              >
                                Praktische Prüfung-Check
                              </div>
                              <div
                                style={{
                                  fontSize: 13.5,
                                  color: textSecondary,
                                  lineHeight: 1.4,
                                }}
                              >
                                Ausweis, Ruhe, typische Prüfungsfehler und
                                Ablauf.
                              </div>
                            </button>
                          </div>
                        )}

                        {fahrwerkPanel === "contact" && (
                          <div
                            style={{
                              borderRadius: 22,
                              border: "1px solid rgba(22,49,38,0.10)",
                              background: "rgba(255,255,255,0.58)",
                              padding: 18,
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                            }}
                          >
                            <div style={{ fontSize: 20, fontWeight: 950 }}>
                              Anmeldung und persönliche Hilfe
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                color: textSecondary,
                                lineHeight: 1.5,
                              }}
                            >
                              Die offizielle Online-Anmeldung über
                              Fahrschule.live ist bereits angebunden. Falls du
                              vorher Hilfe brauchst, kann das Interface
                              zusätzlich eine Rückruf- oder Beratungsanfrage
                              vorbereiten.
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                onClick={openFahrwerkLiveSignup}
                                style={{
                                  height: 46,
                                  padding: "0 16px",
                                  borderRadius: 15,
                                  border: "1px solid rgba(255,255,255,0.22)",
                                  background: `linear-gradient(180deg, ${widgetAccent}F0, ${widgetAccent}A8)`,
                                  color: "#ffffff",
                                  cursor: "pointer",
                                  fontWeight: 900,
                                }}
                              >
                                Online anmelden ↗
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openFahrwerkSignupForm(
                                    "Ich bin noch unsicher",
                                    "Rückruf von Fahrwerk B",
                                  )
                                }
                                style={{
                                  height: 46,
                                  padding: "0 16px",
                                  borderRadius: 15,
                                  border: "1px solid rgba(255,255,255,0.22)",
                                  background: `linear-gradient(180deg, ${widgetAccent}F0, ${widgetAccent}A8)`,
                                  color: "#ffffff",
                                  cursor: "pointer",
                                  fontWeight: 900,
                                }}
                              >
                                Rückruf / Anfrage vorbereiten
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  {fahrwerkSignupOpen && isFahrwerkBInterface && (
                    <form
                      onSubmit={submitFahrwerkSignup}
                      style={{
                        alignSelf: "stretch",
                        borderRadius: isEnhancedInterface ? 28 : 20,
                        border: "1px solid rgba(255,255,255,0.42)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.70))",
                        boxShadow:
                          "0 18px 54px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.42)",
                        backdropFilter: "blur(24px) saturate(180%)",
                        WebkitBackdropFilter: "blur(24px) saturate(180%)",
                        padding: isEnhancedInterface ? 22 : 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        color: textPrimary,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: isEnhancedInterface ? 22 : 17,
                              fontWeight: 850,
                              marginBottom: 4,
                            }}
                          >
                            Beratung / Anfrage vorbereiten
                          </div>
                          <div
                            style={{
                              fontSize: isEnhancedInterface ? 14.5 : 13,
                              color: textSecondary,
                              lineHeight: 1.45,
                            }}
                          >
                            Hier kannst du dein Anliegen vorstrukturieren. Die
                            verbindliche Anmeldung läuft direkt über
                            Fahrschule.live.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFahrwerkSignupOpen(false)}
                          style={{
                            border: "1px solid rgba(22,49,38,0.10)",
                            background: "rgba(255,255,255,0.62)",
                            borderRadius: 999,
                            width: 34,
                            height: 34,
                            cursor: "pointer",
                            color: textPrimary,
                            fontSize: 20,
                            lineHeight: "30px",
                          }}
                          aria-label="Anmeldeformular schließen"
                          title="Schließen"
                        >
                          ×
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            isEnhancedInterface && !isMobileViewport
                              ? "repeat(2, minmax(0, 1fr))"
                            : "1fr",
                          gap: 12,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          Führerscheinklasse
                          <select
                            value={fahrwerkSignupForm.licenseClass}
                            onChange={(e) =>
                              updateFahrwerkSignupForm(
                                "licenseClass",
                                e.target.value,
                              )
                            }
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.82)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          >
                            {FAHRWERK_LICENSE_CLASSES.map((licenseClass) => (
                              <option key={licenseClass} value={licenseClass}>
                                {licenseClass}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          Wunsch
                          <select
                            value={fahrwerkSignupForm.startWish}
                            onChange={(e) =>
                              updateFahrwerkSignupForm(
                                "startWish",
                                e.target.value,
                              )
                            }
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.82)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          >
                            {FAHRWERK_START_WISHES.map((wish) => (
                              <option key={wish} value={wish}>
                                {wish}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          Name *
                          <input
                            value={fahrwerkSignupForm.name}
                            onChange={(e) =>
                              updateFahrwerkSignupForm("name", e.target.value)
                            }
                            placeholder="Dein Name"
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.82)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          />
                        </label>

                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          Telefon
                          <input
                            value={fahrwerkSignupForm.phone}
                            onChange={(e) =>
                              updateFahrwerkSignupForm("phone", e.target.value)
                            }
                            placeholder="0176 ..."
                            type="tel"
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.82)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          />
                        </label>

                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          E-Mail
                          <input
                            value={fahrwerkSignupForm.email}
                            onChange={(e) =>
                              updateFahrwerkSignupForm("email", e.target.value)
                            }
                            placeholder="name@example.de"
                            type="email"
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.82)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          />
                        </label>

                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          Nachricht
                          <input
                            value={fahrwerkSignupForm.message}
                            onChange={(e) =>
                              updateFahrwerkSignupForm(
                                "message",
                                e.target.value,
                              )
                            }
                            placeholder="z. B. Ich möchte möglichst schnell anfangen"
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.82)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          />
                        </label>
                      </div>

                      <label
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          borderRadius: 16,
                          border: "1px solid rgba(22,49,38,0.10)",
                          background: "rgba(255,255,255,0.48)",
                          padding: 12,
                          fontSize: 12.5,
                          lineHeight: 1.45,
                          color: textSecondary,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={fahrwerkSignupForm.privacyAccepted}
                          onChange={(e) =>
                            updateFahrwerkSignupForm(
                              "privacyAccepted",
                              e.target.checked,
                            )
                          }
                          style={{ marginTop: 2 }}
                        />
                        <span>
                          Ich bin einverstanden, dass meine Angaben zur
                          Bearbeitung der Anfrage an Fahrwerk B verwendet
                          werden.
                        </span>
                      </label>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12.5,
                            color: textSecondary,
                            lineHeight: 1.4,
                          }}
                        >
                          * Pflichtfeld. E-Mail oder Telefon muss angegeben
                          werden.
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            onClick={openFahrwerkLiveSignup}
                            style={{
                              height: 48,
                              padding: "0 18px",
                              borderRadius: 16,
                              border: `1px solid rgba(${accentRgb}, 0.18)`,
                              background: "rgba(255,255,255,0.72)",
                              color: textPrimary,
                              cursor: "pointer",
                              fontWeight: 900,
                              fontSize: 14,
                            }}
                          >
                            Direkt online anmelden ↗
                          </button>
                          <button
                            type="submit"
                            style={{
                              height: 48,
                              padding: "0 18px",
                              borderRadius: 16,
                              border: "1px solid rgba(255,255,255,0.28)",
                              background: `linear-gradient(180deg, ${widgetAccent}F0, ${widgetAccent}B8)`,
                              color: "#ffffff",
                              cursor: "pointer",
                              fontWeight: 900,
                              fontSize: 14.5,
                              boxShadow: `0 14px 34px rgba(0,0,0,0.16), 0 0 0 1px ${widgetAccent}12 inset`,
                            }}
                          >
                            Anfrage vorbereiten
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {bookingOpen && isBookingInterface && (
                    <form
                      onSubmit={submitBooking}
                      style={{
                        alignSelf: "stretch",
                        borderRadius: isEnhancedInterface ? 28 : 20,
                        border: "1px solid rgba(255,255,255,0.42)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.66))",
                        boxShadow:
                          "0 18px 54px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.40)",
                        backdropFilter: "blur(24px) saturate(180%)",
                        WebkitBackdropFilter: "blur(24px) saturate(180%)",
                        padding: isEnhancedInterface ? 22 : 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        color: textPrimary,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: isEnhancedInterface ? 22 : 17,
                              fontWeight: 850,
                              marginBottom: 4,
                            }}
                          >
                            Termin bei {bookingBusinessName} buchen
                          </div>
                          <div
                            style={{
                              fontSize: isEnhancedInterface ? 14.5 : 13,
                              color: textSecondary,
                              lineHeight: 1.45,
                            }}
                          >
                            Der Termin wird direkt in den Apple Kalender „
                            {bookingCalendarLabel}“ eingetragen.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBookingOpen(false)}
                          disabled={bookingSubmitting}
                          style={{
                            border: "1px solid rgba(22,49,38,0.10)",
                            background: "rgba(255,255,255,0.62)",
                            borderRadius: 999,
                            width: 34,
                            height: 34,
                            cursor: bookingSubmitting
                              ? "not-allowed"
                              : "pointer",
                            color: textPrimary,
                            fontSize: 20,
                            lineHeight: "30px",
                          }}
                          aria-label="Terminformular schließen"
                          title="Schließen"
                        >
                          ×
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            isEnhancedInterface && !isMobileViewport
                              ? "repeat(2, minmax(0, 1fr))"
                            : "1fr",
                          gap: 12,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          Name *
                          <input
                            value={bookingForm.name}
                            onChange={(e) =>
                              updateBookingForm("name", e.target.value)
                            }
                            placeholder="Dein Name"
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.78)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          />
                        </label>

                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          Leistung
                          <select
                            value={bookingForm.service}
                            onChange={(e) =>
                              updateBookingForm("service", e.target.value)
                            }
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.78)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          >
                            {bookingServices.map((service) => (
                              <option key={service} value={service}>
                                {service}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          E-Mail
                          <input
                            value={bookingForm.email}
                            onChange={(e) =>
                              updateBookingForm("email", e.target.value)
                            }
                            placeholder="name@example.de"
                            type="email"
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.78)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          />
                        </label>

                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          Telefon
                          <input
                            value={bookingForm.phone}
                            onChange={(e) =>
                              updateBookingForm("phone", e.target.value)
                            }
                            placeholder="0176 ..."
                            type="tel"
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.78)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          />
                        </label>

                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          Datum *
                          <input
                            value={bookingForm.date}
                            onChange={(e) =>
                              updateBookingForm("date", e.target.value)
                            }
                            type="date"
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.78)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          />
                        </label>

                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          Uhrzeit *
                          <input
                            value={bookingForm.time}
                            onChange={(e) =>
                              updateBookingForm("time", e.target.value)
                            }
                            type="time"
                            step="900"
                            style={{
                              height: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(22,49,38,0.12)",
                              background: "rgba(255,255,255,0.78)",
                              padding: "0 12px",
                              outline: "none",
                              color: textPrimary,
                              fontSize: 14,
                            }}
                          />
                        </label>
                      </div>

                      <label
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          fontSize: 13.5,
                          fontWeight: 700,
                        }}
                      >
                        Nachricht
                        <textarea
                          value={bookingForm.message}
                          onChange={(e) =>
                            updateBookingForm("message", e.target.value)
                          }
                          placeholder={
                            isMmWartungInterface
                              ? "Fahrzeug, Problem oder Wunsch kurz beschreiben"
                              : isTxbikesInterface
                                ? "Fahrrad, E-Bike, Problem oder Wunsch kurz beschreiben"
                                : isWilliInterface
                                  ? "Anliegen, Wunsch oder Rückrufgrund kurz beschreiben"
                                  : "Worum soll es gehen?"
                          }
                          rows={3}
                          style={{
                            borderRadius: 14,
                            border: "1px solid rgba(22,49,38,0.12)",
                            background: "rgba(255,255,255,0.78)",
                            padding: "12px",
                            outline: "none",
                            color: textPrimary,
                            fontSize: 14,
                            resize: "vertical",
                            fontFamily: "inherit",
                          }}
                        />
                      </label>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12.5,
                            color: textSecondary,
                            lineHeight: 1.4,
                          }}
                        >
                          * Pflichtfelder. E-Mail oder Telefon muss angegeben
                          werden.
                        </div>
                        <button
                          type="submit"
                          disabled={bookingSubmitting}
                          style={{
                            height: 48,
                            padding: "0 18px",
                            borderRadius: 16,
                            border: "1px solid rgba(255,255,255,0.22)",
                            background: `linear-gradient(180deg, ${widgetAccent}F0, ${widgetAccent}A8)`,
                            color: "#ffffff",
                            cursor: bookingSubmitting
                              ? "not-allowed"
                              : "pointer",
                            fontWeight: 800,
                            fontSize: 14.5,
                            boxShadow: `0 14px 34px rgba(0,0,0,0.14), 0 0 0 1px ${widgetAccent}12 inset`,
                            opacity: bookingSubmitting ? 0.68 : 1,
                          }}
                        >
                          {bookingSubmitting
                            ? "Wird eingetragen…"
                            : "Termin eintragen"}
                        </button>
                      </div>
                    </form>
                  )}

                  {msgs.map((m, i) => {
                    const isUser = m.role === "user";
                    return (
                      <div
                        key={i}
                        style={{
                          alignSelf: isUser ? "flex-end" : "flex-start",
                          maxWidth: isEnhancedInterface ? "78%" : "86%",
                        }}
                      >
                        <div
                          style={{
                            padding: isEnhancedInterface
                              ? "15px 17px"
                              : "12px 14px",
                            borderRadius: isEnhancedInterface ? 18 : 14,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.45,
                            fontSize: isEnhancedInterface ? 15.5 : 14.5,
                            border: isUser
                              ? "1px solid rgba(255,255,255,0.18)"
                              : "1px solid rgba(22,49,38,0.10)",
                            background: isUser
                              ? `linear-gradient(180deg, ${widgetAccent}D8, ${widgetAccent}A2)`
                              : "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))",
                            boxShadow: isUser
                              ? `0 12px 30px rgba(0,0,0,0.14), 0 0 0 1px ${widgetAccent}10 inset`
                              : "0 10px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.22)",
                            backdropFilter: "blur(18px) saturate(170%)",
                            WebkitBackdropFilter: "blur(18px) saturate(170%)",
                            color: isUser ? "#ffffff" : textPrimary,
                          }}
                        >
                          {(isFahrwerkBInterface || isAbgefahrenInterface || isHohenbadenInterface) &&
                          !isUser
                            ? ensureFahrwerkEmoji(m.content)
                            : m.content}

                          {m.imagePreviewUrl && (
                            <div className="bt-image-preview-wrap">
                              <img
                                src={m.imagePreviewUrl}
                                alt={
                                  isHohenbadenInterface
                                    ? "Hochgeladenes Bild zur Anfrage bei Hohenbaden · in7Days"
                                    : isAbgefahrenInterface
                                      ? "Hochgeladenes Bild zur Anfrage bei Abgefahren"
                                      : isFahrwerkBInterface
                                      ? "Hochgeladenes Bild zur Führerschein-Anfrage"
                                      : isLinaInterface
                                      ? "Hochgeladenes Beispielbild"
                                      : isMmWartungInterface
                                        ? "Hochgeladenes Foto zum Fahrzeug oder Ersatzteil"
                                        : isTxbikesInterface
                                          ? "Hochgeladenes Foto vom Fahrradproblem"
                                          : isWilliInterface
                                            ? "Hochgeladenes Bild zur Anfrage"
                                            : "Hochgeladenes Foto"
                                }
                              />
                              <div className="bt-image-preview-label">
                                {m.imageName
                                  ? `Foto: ${m.imageName}`
                                  : "Foto hinzugefügt"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {loading && (
                    <div
                      style={{
                        alignSelf: "flex-start",
                        maxWidth: isEnhancedInterface ? "78%" : "86%",
                      }}
                    >
                      <div
                        style={{
                          padding: isEnhancedInterface
                            ? "15px 17px"
                            : "12px 14px",
                          borderRadius: isEnhancedInterface ? 18 : 14,
                          border: "1px solid rgba(22,49,38,0.10)",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))",
                          fontSize: isEnhancedInterface ? 16 : 15,
                          opacity: 0.88,
                          backdropFilter: "blur(12px) saturate(145%)",
                          WebkitBackdropFilter: "blur(12px) saturate(145%)",
                          color: textPrimary,
                          boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                        }}
                      >
                        <span style={{ letterSpacing: 3 }}>•••</span>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="bt-composer"
                  style={{
                    padding: isMobileViewport
                      ? 10
                      : isEnhancedInterface
                        ? 22
                        : 14,
                    paddingBottom: isMobileViewport
                      ? "calc(10px + env(safe-area-inset-bottom))"
                      : isEnhancedInterface
                        ? "calc(22px + env(safe-area-inset-bottom))"
                        : "calc(16px + env(safe-area-inset-bottom))",
                    borderTop: "1px solid rgba(22,49,38,0.12)",
                    display: "flex",
                    gap: isEnhancedInterface ? 12 : 10,
                    alignItems: "center",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.12))",
                    boxShadow:
                      "0 -1px 0 rgba(255,255,255,0.26) inset, 0 -12px 30px rgba(255,255,255,0.10)",
                    flex: "0 0 auto",
                  }}
                >
                  <input
                    ref={photoInputRef}
                    className="bt-hidden-file-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                  />

                  <button
                    type="button"
                    className="bt-round-action-button"
                    onClick={openPhotoPicker}
                    disabled={loading || isVoiceActive}
                    title="Foto hinzufügen"
                    aria-label="Foto hinzufügen"
                  >
                    📷
                  </button>

                  <button
                    type="button"
                    className={`bt-round-action-button ${isVoiceActive ? "bt-listening" : ""}`}
                    onClick={() => void startVoiceInput()}
                    disabled={loading && !isVoiceActive}
                    title={
                      isListening
                        ? "Aufnahme beenden"
                        : voicePhase === "ready"
                          ? "Antwort abspielen"
                          : voiceSupported
                            ? "Sprachmodus starten"
                            : "Audioaufnahme nicht unterstützt"
                    }
                    aria-label={
                      isListening
                        ? "Aufnahme beenden"
                        : voicePhase === "ready"
                          ? "Antwort abspielen"
                          : voiceSupported
                            ? "Sprachmodus starten"
                            : "Audioaufnahme nicht unterstützt"
                    }
                  >
                    {isListening ? "■" : "🎙️"}
                  </button>

                  <input
                    className="bt-message-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={
                      isVoiceActive
                        ? "Sprachmodus aktiv…"
                        : isHohenbadenInterface
                          ? "Schreib z. B. Intensivkurs, THEO App oder Umschreibung…"
                          : isAbgefahrenInterface
                            ? "Schreib z. B. B197, 7-Tage-Theorie oder Anmeldung…"
                            : isFahrwerkBInterface
                            ? "Schreib z. B. B197, BF17 oder Beratung…"
                            : isLinaInterface
                            ? "Schreib kurz, was du brauchst…"
                            : isMmWartungInterface
                              ? "Schreib dein Anliegen…"
                              : isTxbikesInterface
                                ? "Schreib z. B. Reparatur, E-Bike oder Termin…"
                                : isWilliInterface
                                  ? "Schreib kurz dein Anliegen…"
                                  : "Schreib eine Frage…"
                    }
                    style={{
                      flex: 1,
                      height: isEnhancedInterface ? 60 : 46,
                      padding: isEnhancedInterface ? "0 16px" : "0 12px",
                      borderRadius: isEnhancedInterface ? 18 : 14,
                      border: "1px solid rgba(22,49,38,0.12)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.72))",
                      backdropFilter: "blur(22px) saturate(180%)",
                      WebkitBackdropFilter: "blur(22px) saturate(180%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.22), 0 1px 0 rgba(255,255,255,0.18)",
                      color: textPrimary,
                      outline: "none",
                      caretColor: textPrimary,
                      fontSize: isEnhancedInterface ? 16 : 14,
                    }}
                  />

                  <button
                    className="bt-send-button"
                    onClick={send}
                    disabled={!input.trim() || loading || isVoiceActive}
                    style={{
                      height: isEnhancedInterface ? 60 : 46,
                      padding: isEnhancedInterface ? "0 24px" : "0 18px",
                      borderRadius: isEnhancedInterface ? 18 : 14,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: input.trim()
                        ? `linear-gradient(180deg, ${widgetAccent}F0, ${widgetAccent}A8)`
                        : "rgba(255,255,255,0.26)",
                      color: input.trim()
                        ? "#ffffff"
                        : isFahrwerkBInterface || isAbgefahrenInterface || isHohenbadenInterface
                          ? "rgba(127,29,29,0.62)"
                          : "#5c7a6d",
                      cursor:
                        input.trim() && !loading && !isVoiceActive
                          ? "pointer"
                          : "not-allowed",
                      opacity: loading ? 0.72 : 1,
                      fontWeight: isEnhancedInterface ? 700 : 500,
                      fontSize: isEnhancedInterface ? 16 : 14,
                      boxShadow: input.trim()
                        ? `0 16px 40px rgba(0,0,0,0.14), 0 0 0 1px ${widgetAccent}12 inset`
                        : "none",
                    }}
                  >
                    Senden
                  </button>
                </div>
              </div>

              {isVoiceActive && (
                <div
                  ref={voiceStageRef}
                  className={`bt-voice-stage bt-voice-stage--${voicePhase}`}
                  role="dialog"
                  aria-modal="true"
                  aria-live="polite"
                  aria-label="Sprachmodus"
                  style={
                    {
                      "--voice-scale": "1.03",
                      "--voice-energy": "0.08",
                      "--voice-glow": "0.30",
                    } as CSSProperties
                  }
                >
                  <div className="bt-voice-grid" aria-hidden="true" />

                  <button
                    type="button"
                    className="bt-voice-close"
                    onClick={cancelVoiceMode}
                    aria-label="Sprachmodus schließen"
                    title="Sprachmodus schließen"
                  >
                    ×
                  </button>

                  <div className="bt-voice-center">
                    <button
                      type="button"
                      className="bt-voice-orb-button"
                      onClick={() => {
                        if (voicePhase === "listening") {
                          stopVoiceRecording();
                        } else if (voicePhase === "speaking") {
                          void startVoiceInput();
                        } else if (voicePhase === "ready") {
                          void playPreparedVoiceResponse();
                        } else if (voicePhase === "error") {
                          void startVoiceInput();
                        }
                      }}
                      disabled={
                        !["listening", "speaking", "ready", "error"].includes(
                          voicePhase,
                        )
                      }
                      aria-label={
                        voicePhase === "listening"
                          ? "Aufnahme beenden"
                          : voicePhase === "speaking"
                            ? "Antwort unterbrechen und weiterreden"
                            : voicePhase === "ready"
                              ? "Antwort abspielen"
                              : voicePhase === "error"
                                ? "Erneut versuchen"
                                : voiceTitle
                      }
                    >
                      <span className="bt-voice-halo" aria-hidden="true" />
                      <span className="bt-voice-halo" aria-hidden="true" />
                      <span className="bt-voice-core" aria-hidden="true" />
                    </button>

                    <div className="bt-voice-copy" key={voicePhase}>
                      <div className="bt-voice-eyebrow">{voiceEyebrow}</div>
                      <div className="bt-voice-title">{voiceTitle}</div>
                      <div className="bt-voice-transcript">
                        {voiceDescription}
                      </div>

                      {["transcribing", "thinking"].includes(voicePhase) && (
                        <div className="bt-voice-dots" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </div>
                      )}

                      {voicePhase === "ready" && (
                        <button
                          type="button"
                          className="bt-voice-action"
                          onClick={() => void playPreparedVoiceResponse()}
                        >
                          Antwort abspielen
                        </button>
                      )}

                      {voicePhase === "error" && (
                        <button
                          type="button"
                          className="bt-voice-action"
                          onClick={() => void startVoiceInput()}
                        >
                          Erneut versuchen
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bt-voice-footer">
                    {voicePhase === "listening"
                      ? "Eine kurze Pause reicht – deine Frage wird automatisch gesendet."
                      : voicePhase === "speaking"
                        ? "Nach der Antwort hört das Interface automatisch wieder zu."
                        : "Der Sprachmodus bleibt aktiv, bis du ihn oben rechts schließt."}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
