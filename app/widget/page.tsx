// app/widget/page.tsx
"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getTenant } from "@/lib/tenants";
import { MessageCircle } from "lucide-react";

type Msg = {
  role: "user" | "assistant";
  content: string;
  imagePreviewUrl?: string;
  imageName?: string;
};

type SpeechRecognitionResultLike = {
  [key: number]: {
    [key: number]: {
      transcript: string;
    };
  };
};

type SpeechRecognitionEventLike = {
  results: SpeechRecognitionResultLike;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

type StartCard = {
  icon: string;
  title: string;
  description: string;
  message?: string;
  action?: "photo" | "voice" | "booking";
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

const BTDESIGNS_BOOKING_SERVICES = [
  "Website Beratung",
  "Social Media Beratung",
  "AI Interface Beratung",
  "Werbemittel Anfrage",
  "Foto/Video Anfrage",
  "Allgemeines Erstgespräch",
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
    message: "Ich habe ein Problem mit meinem Fahrrad und möchte den Fehler eingrenzen.",
  },
  {
    icon: "📅",
    title: "Termin buchen",
    description: "Werkstatttermin oder Rückmeldung anfragen",
    message: "Ich möchte einen Termin bei TXBIKES anfragen.",
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
    message: "Ich möchte wissen, welche Wartung oder welcher Service für mein Fahrrad sinnvoll ist.",
  },
];

const BTDESIGNS_START_CARDS: StartCard[] = [
  {
    icon: "✨",
    title: "Social Media",
    description: "Pakete, Reels oder Betreuung einschätzen",
    message: "Ich möchte wissen, welches Social-Media-Paket für mein Unternehmen sinnvoll ist.",
  },
  {
    icon: "🌐",
    title: "Website",
    description: "Neue Website, Relaunch oder Shop besprechen",
    message: "Ich interessiere mich für eine Website oder einen Online-Shop von BTDesigns.",
  },
  {
    icon: "🤖",
    title: "AI Interface",
    description: "LINA, Website-KI oder Automatisierung planen",
    message: "Ich möchte wissen, wie ein AI Interface von BTDesigns meinem Unternehmen helfen kann.",
  },
  {
    icon: "🧢",
    title: "Werbemittel",
    description: "Textilien, Drucksachen oder Giveaways anfragen",
    message: "Ich interessiere mich für Werbemittel von BTDesigns und möchte eine Anfrage stellen.",
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
    message: "Ich möchte einen Termin bei MM Wartung vereinbaren.",
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

export default function WidgetPage() {
  const [mounted, setMounted] = useState(false);
  const [tenantId, setTenantId] = useState("demo");
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    setMounted(true);

    const params = new URLSearchParams(window.location.search);
    const t = params.get("tenant") || "demo";
    const embedded = params.get("embed") === "1";

    setTenantId(t);
    setIsEmbedded(embedded);
  }, []);

  const cfg = useMemo(() => getTenant(tenantId), [tenantId]);
  const theme = cfg.theme;
  const normalizedTenantId = tenantId.toLowerCase();
  const isTxbikesInterface = normalizedTenantId === "txbikesv2";
  const isLinaInterface = ["btdesigns", "lina", "btai", "btdesigns-lina"].includes(normalizedTenantId);
  const isMmWartungInterface = ["mm-wartung", "mmwartung", "mm_wartung", "mm-wartung.de", "mmwartungde", "mm"].includes(normalizedTenantId);
  const isEnhancedInterface = isTxbikesInterface || isLinaInterface || isMmWartungInterface;
  const embedClosedSize = isEnhancedInterface ? 190 : 120;
  const launcherFrameSize = isEnhancedInterface ? 124 : 96;
  const launcherButtonSize = isEnhancedInterface ? 74 : 60;
  const launcherIconSize = isEnhancedInterface ? 32 : 26;
  const launcherXIconSize = isEnhancedInterface ? 24 : 19;
  const widgetAccent = isTxbikesInterface ? "#8b5cf6" : isMmWartungInterface ? theme.accent || "#ff751f" : theme.accent;
  const widgetBackground = isTxbikesInterface
    ? "#f6f2ff"
    : isLinaInterface
      ? "#f7fbff"
      : isMmWartungInterface
        ? "#fff7ed"
        : theme.bg;
  const textPrimary = isTxbikesInterface
    ? "#1f1636"
    : isLinaInterface
      ? "#182536"
      : isMmWartungInterface
        ? "#2b1f18"
        : "#163126";
  const textSecondary = isTxbikesInterface
    ? "#6a5f8d"
    : isLinaInterface
      ? "#566477"
      : isMmWartungInterface
        ? "#705a4a"
        : "#355f52";
  const accentRgb = useMemo(() => hexToRgb(widgetAccent), [widgetAccent]);

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attention, setAttention] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormState>(DEFAULT_BOOKING_FORM);

  const isEmbedClosed = isEmbedded && !open;
  const listRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (!mounted) return;

    const firstMessage = isLinaInterface
      ? `Hi — ich bin ${cfg.assistantName}. Wobei soll ich dir bei BTDesigns helfen?`
      : isMmWartungInterface
        ? `Hi — ich bin ${cfg.assistantName}. Was möchtest du bei MM Wartung machen?`
        : `Hi — ich bin ${cfg.assistantName}. Worum geht’s?`;

    setMsgs([{ role: "assistant", content: firstMessage }]);

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognitionCtor));
  }, [mounted, cfg.assistantName, isLinaInterface, isMmWartungInterface]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading, isListening]);

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

    const size = open
      ? {
          type: "bt-chat-resize",
          width: isLinaInterface ? 1080 : isTxbikesInterface || isMmWartungInterface ? 980 : 500,
          height: isLinaInterface ? 920 : isTxbikesInterface || isMmWartungInterface ? 880 : 760,
        }
      : { type: "bt-chat-resize", width: embedClosedSize, height: embedClosedSize };

    window.parent.postMessage(size, "*");
  }, [open, isEmbedded, isLinaInterface, isTxbikesInterface, isMmWartungInterface, embedClosedSize]);

  useEffect(() => {
    if (!mounted) return;

    window.parent?.postMessage(
      {
        type: "bt-chat-ready",
        tenant: tenantId,
        interface: isLinaInterface ? "btai" : isTxbikesInterface ? "txbikes" : isMmWartungInterface ? "mm-wartung" : "default",
      },
      "*",
    );

    const handleBtAiMessage = (event: MessageEvent) => {
      if (event.data?.type === "bt-chat-open" || event.data?.type === "btai-open") {
        setOpen(true);
        setShowBadge(false);
      }

      if (event.data?.type === "bt-chat-close" || event.data?.type === "btai-close") {
        setOpen(false);
      }

      if (event.data?.type === "bt-chat-toggle" || event.data?.type === "btai-toggle") {
        setOpen((current) => !current);
        setShowBadge(false);
      }
    };

    window.addEventListener("message", handleBtAiMessage);

    return () => {
      window.removeEventListener("message", handleBtAiMessage);
    };
  }, [mounted, tenantId, isLinaInterface, isTxbikesInterface, isMmWartungInterface]);

  async function sendText(rawText: string) {
    const text = rawText.trim();
    if (!text || loading) return;

    const wantsBooking =
      isLinaInterface &&
      /\b(termin|beratungsgespräch|erstgespräch|gespräch|meeting|call|buchen|anrufen)\b/i.test(text);

    if (wantsBooking) {
      setBookingOpen(true);
    }

    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/chat?tenant=${encodeURIComponent(tenantId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: tenantId,
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await res.json();
      const assistantMsg: Msg = { role: "assistant", content: data?.reply || "Okay." };
      setMsgs([...next, assistantMsg]);
    } catch {
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: "Kurz ein technisches Problem — versuch’s nochmal.",
        } as Msg,
      ]);
    } finally {
      setLoading(false);
    }
  }

  function openBookingForm() {
    if (loading || isListening || bookingSubmitting) return;

    setBookingOpen(true);
    setShowBadge(false);

    setMsgs((current) => {
      const alreadyHasBookingHint = current.some((msg) =>
        msg.role === "assistant" && msg.content.includes("Termindaten")
      );

      if (alreadyHasBookingHint) return current;

      return [
        ...current,
        {
          role: "assistant",
          content:
            "Klar — trag kurz deine Termindaten ein. Danach wird der Termin direkt in den BTDesigns Apple Kalender geschrieben.",
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
    const service = bookingForm.service.trim() || "Website Beratung";
    const date = bookingForm.date.trim();
    const time = bookingForm.time.trim();
    const durationMinutes = Number(bookingForm.durationMinutes || 30);
    const message = bookingForm.message.trim();

    if (!name || !date || !time) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content: "Für die Terminbuchung brauche ich mindestens Name, Datum und Uhrzeit.",
        },
      ]);
      return;
    }

    if (!email && !phone) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content: "Bitte gib mindestens eine E-Mail-Adresse oder Telefonnummer an, damit BTDesigns dich erreichen kann.",
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
          content: "Datum oder Uhrzeit konnte ich nicht lesen. Bitte prüfe die Eingabe nochmal.",
        },
      ]);
      return;
    }

    const safeDurationMinutes = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30;
    const endDate = new Date(startDate.getTime() + safeDurationMinutes * 60 * 1000);

    setBookingSubmitting(true);

    try {
      const res = await fetch("/api/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      const readableDate = startDate.toLocaleString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content: `Erledigt — der Termin wurde in den BTDesigns Kalender eingetragen.\n\n${readableDate}\nLeistung: ${service}`,
        },
      ]);

      setBookingOpen(false);
      setBookingForm(DEFAULT_BOOKING_FORM);
    } catch {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content: "Technischer Fehler beim Kalendereintrag. Bitte versuch es nochmal.",
        },
      ]);
    } finally {
      setBookingSubmitting(false);
    }
  }

  function openPhotoPicker() {
    if (loading || isListening) return;
    photoInputRef.current?.click();
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || loading) return;

    if (!file.type.startsWith("image/")) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content: "Bitte lade ein normales Bild hoch, zum Beispiel ein Foto aus der Kamera oder Galerie.",
        },
      ]);
      return;
    }

    const imagePreviewUrl = URL.createObjectURL(file);

    setMsgs((current) => [
      ...current,
      {
        role: "user",
        content: isLinaInterface
          ? "📷 Beispiel oder Projektbild hinzugefügt"
          : isMmWartungInterface
            ? "📷 Foto zum Fahrzeug oder Ersatzteil hinzugefügt"
            : "📷 Foto vom Fahrradproblem hinzugefügt",
        imagePreviewUrl,
        imageName: file.name,
      },
      {
        role: "assistant",
        content: isLinaInterface
          ? "Danke, das Bild ist jetzt in der Anfrage sichtbar. Schreib kurz, worum es geht, dann ordne ich es besser ein."
          : isMmWartungInterface
            ? "Danke, das Foto ist jetzt in der Anfrage sichtbar. Schreib kurz dazu, ob es um ein Fahrzeugproblem, einen Termin oder ein Ersatzteil geht."
            : "Danke, das Foto ist jetzt in der Anfrage sichtbar. Beschreib kurz, was genau passiert, damit ich das Problem besser eingrenzen kann.",
      },
    ]);
  }

  function startVoiceInput() {
    if (loading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content:
            isLinaInterface
              ? "Spracheingabe wird auf diesem Gerät leider nicht unterstützt. Schreib deine Anfrage kurz als Text oder lade ein Beispielbild hoch."
              : isMmWartungInterface
                ? "Spracheingabe wird auf diesem Gerät leider nicht unterstützt. Schreib dein Anliegen kurz als Text oder nutze ein Foto."
                : "Spracheingabe wird auf diesem Gerät leider nicht unterstützt. Schreib dein Problem kurz als Text oder nutze ein Foto.",
        },
      ]);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;

    recognition.lang = "de-DE";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInput("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);

      const error = event.error || "";
      const message =
        error === "not-allowed" || error === "service-not-allowed"
          ? "Das Mikrofon ist blockiert. Erlaube den Mikrofonzugriff im Browser oder schreibe deine Frage als Text."
          : "Ich konnte dich gerade nicht sauber verstehen. Versuch es nochmal oder schreib dein Problem kurz als Text.";

      setMsgs((current) => [...current, { role: "assistant", content: message }]);
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      setIsListening(false);

      if (!transcript) {
        setMsgs((current) => [
          ...current,
          {
            role: "assistant",
            content: "Ich konnte daraus leider keinen Text erkennen. Versuch es nochmal etwas näher am Mikrofon.",
          },
        ]);
        return;
      }

      setInput(transcript);
      void sendText(transcript);
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setMsgs((current) => [
        ...current,
        {
          role: "assistant",
          content: "Die Spracheingabe konnte nicht gestartet werden. Versuch es bitte nochmal.",
        },
      ]);
    }
  }

  async function send() {
    await sendText(input);
  }

  function resetChat() {
    recognitionRef.current?.stop();
    setIsListening(false);
    setBookingOpen(false);
    setBookingSubmitting(false);
    setBookingForm(DEFAULT_BOOKING_FORM);
    setMsgs([
      {
        role: "assistant",
        content: isLinaInterface
          ? `Alles klar — wobei soll ich dir bei BTDesigns helfen?`
          : isMmWartungInterface
            ? `Alles klar — was möchtest du bei MM Wartung machen?`
            : `Alles klar — womit kann ich dir helfen?`,
      },
    ]);
    setInput("");
  }

  const panelW = isLinaInterface ? 1040 : isTxbikesInterface || isMmWartungInterface ? 940 : isEmbedded ? 460 : 500;
  const panelH = isLinaInterface ? 840 : isTxbikesInterface || isMmWartungInterface ? 820 : isEmbedded ? 660 : 720;
  const panelRadius = isEnhancedInterface ? 38 : 28;
  const GLOBAL_LOGO_SRC = "/brand/btai-logo.png";

  if (!mounted) return null;

  const launcherOffset = isEmbedded ? (isEnhancedInterface ? 0 : 10) : 16;
  const panelOffsetBottom = launcherOffset + (isEnhancedInterface ? 104 : 78);

  const showStartCards =
    isEnhancedInterface &&
    msgs.length === 1 &&
    msgs[0]?.role === "assistant" &&
    !loading &&
    !isListening;

  const startCards = isTxbikesInterface
    ? TXBIKES_START_CARDS
    : isMmWartungInterface
      ? MM_WARTUNG_START_CARDS
      : BTDESIGNS_START_CARDS;

  const wrapperBackground = isEmbedded
    ? "transparent"
    : `
        radial-gradient(1200px 900px at 70% 12%, ${widgetAccent}18 0%, transparent 60%),
        radial-gradient(900px 700px at 12% 78%, ${widgetAccent}10 0%, transparent 62%),
        radial-gradient(700px 520px at 55% 55%, rgba(255,255,255,0.04) 0%, transparent 72%),
        linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)),
        ${widgetBackground}
      `;

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
          ? `
              radial-gradient(150px 96px at 35% 25%, rgba(${accentRgb}, 0.34) 0%, transparent 65%),
              linear-gradient(180deg, rgba(255,255,255,0.28), rgba(${accentRgb}, 0.16))
            `
          : `
              radial-gradient(150px 96px at 35% 25%, rgba(${accentRgb}, 0.72) 0%, transparent 65%),
              linear-gradient(180deg, rgba(255,255,255,0.30), rgba(${accentRgb}, 0.26))
            `,
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
      title={`${cfg.brandName} Chat`}
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
      <style>{`
        html, body {
          background: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
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

        @keyframes bt-voice-orb {
          0% { transform: scale(0.92) rotate(0deg); border-radius: 42% 58% 55% 45%; }
          33% { transform: scale(1.06) rotate(120deg); border-radius: 58% 42% 44% 56%; }
          66% { transform: scale(0.98) rotate(240deg); border-radius: 46% 54% 62% 38%; }
          100% { transform: scale(0.92) rotate(360deg); border-radius: 42% 58% 55% 45%; }
        }

        @keyframes bt-voice-ring {
          0% { transform: scale(0.76); opacity: 0.62; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }

        @keyframes bt-voice-bar {
          0%, 100% { transform: scaleY(0.36); opacity: 0.56; }
          50% { transform: scaleY(1); opacity: 1; }
        }

        .bt-voice-card {
          align-self: center;
          width: ${isEnhancedInterface ? "min(100%, 580px)" : "min(100%, 360px)"};
          border-radius: ${isEnhancedInterface ? "28px" : "22px"};
          padding: ${isEnhancedInterface ? "22px 22px" : "16px 14px"};
          border: 1px solid rgba(255,255,255,0.38);
          background:
            radial-gradient(320px 180px at 20% 0%, rgba(${accentRgb}, 0.26), transparent 72%),
            linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46));
          backdrop-filter: blur(24px) saturate(185%);
          -webkit-backdrop-filter: blur(24px) saturate(185%);
          box-shadow: 0 18px 54px rgba(0,0,0,0.13), inset 0 1px 0 rgba(255,255,255,0.40);
          color: ${textPrimary};
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .bt-voice-visual {
          width: ${isEnhancedInterface ? "82px" : "66px"};
          height: ${isEnhancedInterface ? "82px" : "66px"};
          border-radius: 999px;
          display: grid;
          place-items: center;
          position: relative;
          flex: 0 0 auto;
        }

        .bt-voice-visual::before,
        .bt-voice-visual::after {
          content: "";
          position: absolute;
          inset: 8px;
          border-radius: 999px;
          border: 1px solid rgba(${accentRgb}, 0.36);
          animation: bt-voice-ring 1.55s ease-out infinite;
        }

        .bt-voice-visual::after {
          animation-delay: 0.55s;
        }

        .bt-voice-orb {
          width: ${isEnhancedInterface ? "58px" : "46px"};
          height: ${isEnhancedInterface ? "58px" : "46px"};
          background:
            radial-gradient(circle at 30% 24%, rgba(255,255,255,0.86), transparent 24%),
            radial-gradient(circle at 70% 72%, rgba(${accentRgb}, 0.68), transparent 36%),
            linear-gradient(135deg, rgba(${accentRgb}, 0.96), rgba(255,255,255,0.48));
          filter: drop-shadow(0 12px 20px rgba(0,0,0,0.13));
          animation: bt-voice-orb 2.4s ease-in-out infinite;
          position: relative;
          z-index: 1;
        }

        .bt-voice-bars {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 22px;
          margin-top: 7px;
        }

        .bt-voice-bars span {
          width: 4px;
          height: 18px;
          border-radius: 999px;
          background: rgba(${accentRgb}, 0.82);
          transform-origin: center;
          animation: bt-voice-bar 700ms ease-in-out infinite;
        }

        .bt-voice-bars span:nth-child(2) { animation-delay: 90ms; }
        .bt-voice-bars span:nth-child(3) { animation-delay: 180ms; }
        .bt-voice-bars span:nth-child(4) { animation-delay: 270ms; }
        .bt-voice-bars span:nth-child(5) { animation-delay: 360ms; }

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

        .bt-launcher {
          position: relative;
          overflow: visible;
          will-change: transform;
          transform: translateZ(0);
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
          transform: translateZ(0);
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          isolation: isolate;
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

        @media (prefers-reduced-motion: reduce) {
          .bt-bouncing { animation: none !important; }
          .bt-launcher::after { animation: none !important; }
          .bt-panel-liquid { animation: none !important; }
          .bt-voice-orb,
          .bt-voice-visual::before,
          .bt-voice-visual::after,
          .bt-voice-bars span { animation: none !important; }
        }
      `}</style>

      {isEmbedClosed ? (
        <div
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
                <span>Fragen? Chatte mit {cfg.assistantName}</span>
              </div>
            )}

            {launcherButton}
          </div>

          {open && (
            <div
              className="bt-panel"
              style={{
                position: "fixed",
                right: launcherOffset,
                bottom: panelOffsetBottom,
                width: panelW,
                maxWidth: isEnhancedInterface ? "calc(100vw - 28px)" : "calc(100vw - 28px)",
                height: panelH,
                maxHeight: isEnhancedInterface ? "calc(100vh - 96px)" : "calc(100vh - 122px)",
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
                  opacity: 0.20,
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
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.78), transparent)",
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
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    padding: isEnhancedInterface ? "24px 28px 22px" : "16px 14px 14px",
                    borderBottom: "1px solid rgba(22,49,38,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: isEnhancedInterface ? 16 : 10,
                    minHeight: isEnhancedInterface ? 116 : 86,
                    flex: "0 0 auto",
                    background: `
                      radial-gradient(520px 180px at 18% 0%, ${widgetAccent}14 0%, transparent 72%),
                      linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.14))
                    `,
                    boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: isEnhancedInterface ? 12 : 10 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: loading ? "#f5c542" : widgetAccent,
                        boxShadow: `0 0 0 7px ${
                          loading ? "rgba(245,197,66,0.14)" : `rgba(${accentRgb}, 0.12)`
                        }`,
                        flex: "0 0 auto",
                      }}
                    />
                    <div style={{ lineHeight: 1.2 }}>
                      <div
                        style={{
                          fontSize: isEnhancedInterface ? 20 : 17,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                          opacity: 0.96,
                          color: textPrimary,
                        }}
                      >
                        {cfg.brandName} – {cfg.assistantName}
                      </div>
                      <div style={{ fontSize: isEnhancedInterface ? 14 : 12.5, opacity: 0.9, marginTop: 3, color: textSecondary }}>
                        {loading ? "Tippt…" : isListening ? "Hört zu…" : "Online verfügbar"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div
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

                    {cfg.primaryCta?.url && (
                      <a
                        href={cfg.primaryCta.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: isEnhancedInterface ? 12.5 : 11.5,
                          padding: isEnhancedInterface ? "11px 14px" : "8px 10px",
                          borderRadius: isEnhancedInterface ? 14 : 11,
                          border: "1px solid rgba(255,255,255,0.24)",
                          background: `linear-gradient(180deg, ${widgetAccent}D6, ${widgetAccent}92)`,
                          color: "#ffffff",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                        }}
                        title={cfg.primaryCta.label}
                      >
                        {cfg.primaryCta.label}
                      </a>
                    )}

                    <button
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
                  style={{
                    flex: "1 1 auto",
                    minHeight: 0,
                    overflowY: "auto",
                    padding: isEnhancedInterface ? 26 : 14,
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
                        style={{
                          padding: isEnhancedInterface ? "22px 22px 10px" : "14px 14px 4px",
                          color: textPrimary,
                        }}
                      >
                        <div
                          style={{
                            fontSize: isEnhancedInterface ? 30 : 18,
                            fontWeight: 800,
                            letterSpacing: 0.2,
                            marginBottom: 6,
                          }}
                        >
                          Was möchtest du machen?
                        </div>
                        <div
                          style={{
                            fontSize: isEnhancedInterface ? 16 : 13,
                            lineHeight: 1.5,
                            color: textSecondary,
                          }}
                        >
                          {isLinaInterface
                            ? `Wähle einen Einstieg aus. Danach führt dich ${cfg.assistantName} gezielt zur passenden Lösung.`
                            : isMmWartungInterface
                              ? `Wähle aus, worum es geht. Danach nimmt ${cfg.assistantName} dein Anliegen für Moritz sauber auf.`
                              : `Wähle einen Einstieg aus. Danach führt dich ${cfg.assistantName} gezielt weiter.`}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isEnhancedInterface
                            ? "repeat(3, minmax(0, 1fr))"
                            : "1fr 1fr",
                          gap: isEnhancedInterface ? 16 : 10,
                        }}
                      >
                        {startCards.map((card) => (
                          <button
                            key={card.title}
                            type="button"
                            className="bt-start-card"
                            disabled={loading || isListening}
                            onClick={() => {
                              if (card.action === "photo") {
                                openPhotoPicker();
                                return;
                              }

                              if (card.action === "voice") {
                                startVoiceInput();
                                return;
                              }

                              if (card.action === "booking") {
                                openBookingForm();
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

                  {bookingOpen && isLinaInterface && (
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
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: isEnhancedInterface ? 22 : 17, fontWeight: 850, marginBottom: 4 }}>
                            Termin bei BTDesigns buchen
                          </div>
                          <div style={{ fontSize: isEnhancedInterface ? 14.5 : 13, color: textSecondary, lineHeight: 1.45 }}>
                            Der Termin wird direkt in den Apple Kalender „BTDesigns Termine“ eingetragen.
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
                            cursor: bookingSubmitting ? "not-allowed" : "pointer",
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
                          gridTemplateColumns: isEnhancedInterface ? "repeat(2, minmax(0, 1fr))" : "1fr",
                          gap: 12,
                        }}
                      >
                        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>
                          Name *
                          <input
                            value={bookingForm.name}
                            onChange={(e) => updateBookingForm("name", e.target.value)}
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

                        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>
                          Leistung
                          <select
                            value={bookingForm.service}
                            onChange={(e) => updateBookingForm("service", e.target.value)}
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
                            {BTDESIGNS_BOOKING_SERVICES.map((service) => (
                              <option key={service} value={service}>
                                {service}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>
                          E-Mail
                          <input
                            value={bookingForm.email}
                            onChange={(e) => updateBookingForm("email", e.target.value)}
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

                        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>
                          Telefon
                          <input
                            value={bookingForm.phone}
                            onChange={(e) => updateBookingForm("phone", e.target.value)}
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

                        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>
                          Datum *
                          <input
                            value={bookingForm.date}
                            onChange={(e) => updateBookingForm("date", e.target.value)}
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

                        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>
                          Uhrzeit *
                          <input
                            value={bookingForm.time}
                            onChange={(e) => updateBookingForm("time", e.target.value)}
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

                      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>
                        Nachricht
                        <textarea
                          value={bookingForm.message}
                          onChange={(e) => updateBookingForm("message", e.target.value)}
                          placeholder="Worum soll es gehen?"
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

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 12.5, color: textSecondary, lineHeight: 1.4 }}>
                          * Pflichtfelder. E-Mail oder Telefon muss angegeben werden.
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
                            cursor: bookingSubmitting ? "not-allowed" : "pointer",
                            fontWeight: 800,
                            fontSize: 14.5,
                            boxShadow: `0 14px 34px rgba(0,0,0,0.14), 0 0 0 1px ${widgetAccent}12 inset`,
                            opacity: bookingSubmitting ? 0.68 : 1,
                          }}
                        >
                          {bookingSubmitting ? "Wird eingetragen…" : "Termin eintragen"}
                        </button>
                      </div>
                    </form>
                  )}

                  {isListening && (
                    <div className="bt-voice-card">
                      <div className="bt-voice-visual" aria-hidden="true">
                        <div className="bt-voice-orb" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: isEnhancedInterface ? 18 : 15, fontWeight: 800, marginBottom: 4 }}>
                          Ich höre zu…
                        </div>
                        <div style={{ fontSize: isEnhancedInterface ? 14.5 : 13, lineHeight: 1.45, color: textSecondary }}>
                          {isLinaInterface
                            ? "Erzähl kurz, was du brauchst. Danach wird deine Sprache automatisch als Nachricht gesendet."
                            : isMmWartungInterface
                              ? "Erzähl kurz, ob es um ein Fahrzeugproblem, einen Termin oder ein Ersatzteil geht. Danach wird deine Sprache automatisch gesendet."
                              : "Erzähl kurz, was mit dem Fahrrad los ist. Danach wird deine Sprache automatisch als Nachricht gesendet."}
                        </div>
                        <div className="bt-voice-bars" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
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
                            padding: isEnhancedInterface ? "15px 17px" : "12px 14px",
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
                          {m.content}

                          {m.imagePreviewUrl && (
                            <div className="bt-image-preview-wrap">
                              <img
                                src={m.imagePreviewUrl}
                                alt={isLinaInterface
                                  ? "Hochgeladenes Beispielbild"
                                  : isMmWartungInterface
                                    ? "Hochgeladenes Foto zum Fahrzeug oder Ersatzteil"
                                    : "Hochgeladenes Foto vom Fahrradproblem"}
                              />
                              <div className="bt-image-preview-label">
                                {m.imageName ? `Foto: ${m.imageName}` : "Foto hinzugefügt"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {loading && (
                    <div style={{ alignSelf: "flex-start", maxWidth: isEnhancedInterface ? "78%" : "86%" }}>
                      <div
                        style={{
                          padding: isEnhancedInterface ? "15px 17px" : "12px 14px",
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
                  style={{
                    padding: isEnhancedInterface ? 22 : 14,
                    paddingBottom: isEnhancedInterface ? "calc(22px + env(safe-area-inset-bottom))" : "calc(16px + env(safe-area-inset-bottom))",
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
                    disabled={loading || isListening}
                    title="Foto hinzufügen"
                    aria-label="Foto hinzufügen"
                  >
                    📷
                  </button>

                  <button
                    type="button"
                    className={`bt-round-action-button ${isListening ? "bt-listening" : ""}`}
                    onClick={startVoiceInput}
                    disabled={loading}
                    title={voiceSupported ? "Spracheingabe starten" : "Spracheingabe nicht unterstützt"}
                    aria-label={voiceSupported ? "Spracheingabe starten" : "Spracheingabe nicht unterstützt"}
                  >
                    {isListening ? "■" : "🎙️"}
                  </button>

                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={
                      isListening
                        ? "Sprich jetzt…"
                        : isLinaInterface
                          ? "Schreib kurz, was du brauchst…"
                          : isMmWartungInterface
                            ? "Schreib dein Anliegen…"
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
                    onClick={send}
                    disabled={!input.trim() || loading || isListening}
                    style={{
                      height: isEnhancedInterface ? 60 : 46,
                      padding: isEnhancedInterface ? "0 24px" : "0 18px",
                      borderRadius: isEnhancedInterface ? 18 : 14,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: input.trim()
                        ? `linear-gradient(180deg, ${widgetAccent}F0, ${widgetAccent}A8)`
                        : "rgba(255,255,255,0.26)",
                      color: input.trim() ? "#ffffff" : "#5c7a6d",
                      cursor: input.trim() && !loading && !isListening ? "pointer" : "not-allowed",
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
            </div>
          )}
        </>
      )}
    </div>
  );
}