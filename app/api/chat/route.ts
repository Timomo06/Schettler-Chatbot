import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getTenant } from "@/lib/tenants";
import { buildSystemPrompt } from "@/lib/prompt";
import { loadTenantKnowledge } from "@/lib/loadTenantKnowledge";
import { getTenantFromPath } from "@/lib/getTenant";
import { asSchoolDemo } from "@/lib/schoolDemos";
import { getSchoolDemoKnowledge } from "@/lib/schoolDemoKnowledge";
import { BUSINESS_TIME_ZONE, parseEventDate } from "@/lib/calendar/apple-booking";
import { buildProfCarInventoryPrompt, stripStaticProfCarInventory } from "@/lib/profcar/public-inventory";

export const runtime = "nodejs";

const allowedOrigins = [
  "https://btdesigns.de",
  "https://www.btdesigns.de",
  "https://mm-wartung.de",
  "https://www.mm-wartung.de",
  "https://fahrwerk-b.de",
  "https://www.fahrwerk-b.de",
  "https://profcar.com",
  "https://www.profcar.com",
  "https://schettlers-chatbot-lca3.vercel.app",
  "https://ai.btdesigns.de",
  "http://localhost:3000",
];

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
    })
  : null;

let openaiClient: OpenAI | null = null;
function getOpenAI() {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

let chatLogClient: SupabaseClient | null = null;
function getChatLogClient() {
  if (chatLogClient) return chatLogClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("CHAT_LOG_STORAGE_NOT_CONFIGURED");
  chatLogClient = createClient(url, key, { auth: { persistSession: false } });
  return chatLogClient;
}

const TENANT_KNOWLEDGE_TTL_MS = 5 * 60 * 1000;
const tenantKnowledgeCache = new Map<
  string,
  { value: string; expiresAt: number }
>();

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatBody = {
  tenant?: string;
  sessionId?: string;
  voiceMode?: boolean;
  messages?: ChatMessage[];
};

type BookingExtraction = {
  bookingIntent: boolean;
  confirmed: boolean;
  name: string | null;
  email: string | null;
  phone: string | null;
  topic: string | null;
  vehicle: string | null;
  start: string | null;
  end: string | null;
  missing: string[];
};

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, "").replace(/__/g, "");
}

function isThanksOnly(text: string): boolean {
  const clean = text.toLowerCase().trim();

  return [
    "danke",
    "dankeschön",
    "danke dir",
    "top danke",
    "super danke",
    "alles klar danke",
    "okay danke",
    "ok danke",
  ].some((v) => clean === v || clean.includes(v));
}

function formatGermanTime(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

function addMinutes(iso: string, minutes: number): string {
  const parsed = parseEventDate(iso, BUSINESS_TIME_ZONE);
  if (!parsed) return iso;
  return new Date(parsed.getTime() + minutes * 60000).toISOString();
}

function tenantFromReferer(req: NextRequest): string | null {
  const ref = req.headers.get("referer");
  if (!ref) return null;

  try {
    const url = new URL(ref);
    return getTenantFromPath(url.pathname);
  } catch {
    return null;
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

async function logChat(params: {
  tenantId: string;
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
}) {
  const { error } = await getChatLogClient().from("chat_logs").insert({
    tenant: params.tenantId,
    session_id: params.sessionId,
    user_message: params.userMessage,
    assistant_message: params.assistantMessage,
  });

  if (error) console.error("SUPABASE INSERT ERROR:", error);
}

function queueChatLog(params: {
  tenantId: string;
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
}) {
  void logChat(params).catch((error) => {
    console.error("SUPABASE INSERT ERROR:", error);
  });
}

async function getCachedTenantKnowledge(
  tenantId: Parameters<typeof loadTenantKnowledge>[0],
) {
  const cached = tenantKnowledgeCache.get(tenantId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await loadTenantKnowledge(tenantId);
  tenantKnowledgeCache.set(tenantId, {
    value,
    expiresAt: Date.now() + TENANT_KNOWLEDGE_TTL_MS,
  });

  return value;
}

const FAHRWERK_TENANT_ALIASES = [
  "fahrwerk-b",
  "fahrwerkb",
  "fahrwerk_b",
  "fahrwerk-b.de",
  "fahrwerkbde",
  "fahrwerk",
] as const;

const FAHRSCHULE_TENANT_IDS = [
  "fahrwerk-b",
  "fahrschule-hohenbaden",
  "fahrschule-hopla",
  "fahrschule-chioa",
  "fahrschule-alamir",
  "fahrschule-abgefahren",
  "petermännchen-fahrschule",
  "schelf-fahrschule",
  "fahrschule-jentsch",
  "asphaltcrew",
  "fahrschule-malik",
  "fahrschule7",
  "fahrschule-niehaus",
  "fahrschule-fritz",
  "fahrschule-fahrtwind",
  "fahrschule-wiesenberg",
  "fahrschule-pawlowski",
  "bootsfahrschule-schwerin",
  "fahrschule-westedt",
  "fahrschule-bollow",
  "fahrschule-hoenemann",
  "fahrschule-jantzen",
  "fahrschule-neptun",
  "bb-fahrschule",
  "hansefahrschule-rennhack",
  "cans-fahrschule",
  "tek-fahrschule",
  "fahrschule-fix",
  "fahrschule-yoendem",
  "fahrschule-rathje",
  "fsaz",
  "campus-b27",
  "r-drive",
] as const;

const PROFCAR_TENANT_ALIASES = [
  "profcar",
  "prof-car",
  "profcar-koeln",
  "profcar.com",
  "www.profcar.com",
] as const;

function isFahrwerkTenant(tenantId: string) {
  return FAHRWERK_TENANT_ALIASES.includes(
    tenantId.trim().toLowerCase() as (typeof FAHRWERK_TENANT_ALIASES)[number],
  );
}

function isFahrschuleTenant(tenantId: string) {
  return FAHRSCHULE_TENANT_IDS.includes(
    tenantId as (typeof FAHRSCHULE_TENANT_IDS)[number],
  );
}

function isProfCarTenant(tenantId: string) {
  return tenantId === "profcar";
}

function normalizeTenantParam(tenantId: string) {
  const normalized = tenantId.trim().toLowerCase();

  // Rathje, FSAZ und Campus B27 haben eigene Demo-IDs.
  // Dadurch landen auch Aliase/Domains immer beim richtigen Tenant.
  const schoolDemoTenant = asSchoolDemo(normalized);
  if (schoolDemoTenant) {
    return schoolDemoTenant;
  }

  if (
    FAHRWERK_TENANT_ALIASES.includes(
      normalized as (typeof FAHRWERK_TENANT_ALIASES)[number],
    )
  ) {
    return "fahrwerk-b";
  }

  if (
    PROFCAR_TENANT_ALIASES.includes(
      normalized as (typeof PROFCAR_TENANT_ALIASES)[number],
    )
  ) {
    return "profcar";
  }

  return tenantId.trim();
}


async function extractBookingData(
  history: ChatMessage[]
): Promise<BookingExtraction> {
  const today = new Date().toISOString().slice(0, 10);

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
Du extrahierst Terminbuchungsdaten aus einem deutschen Chatverlauf.

Heute ist ${today}.
Zeitzone ist Europe/Berlin.

Antworte ausschließlich als JSON:
{
  "bookingIntent": boolean,
  "confirmed": boolean,
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "topic": string | null,
  "vehicle": string | null,
  "start": string | null,
  "end": string | null,
  "missing": string[]
}

Regeln:
- bookingIntent ist true, wenn der Nutzer einen Termin, ein Gespräch, einen Rückruf oder eine Beratung buchen möchte.
- confirmed ist nur true, wenn der Nutzer klar sagt, dass der Termin verbindlich eingetragen/gebucht werden soll.
- Ein reines "Danke" ist keine Bestätigung.
- start und end im Format YYYY-MM-DDTHH:mm:ss.
- Wenn keine Endzeit genannt ist, nutze 30 Minuten Dauer.
- Erfinde keine Namen, Mails, Telefonnummern oder Zeiten.
- vehicle enthält das konkret genannte Fahrzeug bei einer Probefahrt, sonst null.
- Für Werkstatttermine kann die Telefonnummer die E-Mail ersetzen, wenn keine E-Mail genannt wurde.
- Wenn Daten fehlen, liste sie in missing.
        `.trim(),
      },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  try {
    return JSON.parse(completion.choices[0]?.message?.content || "{}");
  } catch {
    return {
      bookingIntent: false,
      confirmed: false,
      name: null,
      email: null,
      phone: null,
      topic: null,
      vehicle: null,
      start: null,
      end: null,
      missing: [],
    };
  }
}

async function checkSlot(origin: string, tenant: string, start: string, end: string) {
  const response = await fetch(`${origin}/api/create-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenant,
      start,
      end,
      checkOnly: true,
    }),
  });

  return {
    ok: response.ok,
    status: response.status,
  };
}

async function findNextFreeSlotSameDay(
  origin: string,
  tenant: string,
  start: string,
  end: string
) {
  const durationMs = new Date(end).getTime() - new Date(start).getTime();
  const durationMinutes = Math.max(30, Math.round(durationMs / 60000));
  const day = start.slice(0, 10);

  for (let i = 1; i <= 12; i++) {
    const nextStart = addMinutes(start, i * 30);
    const nextEnd = addMinutes(nextStart, durationMinutes);

    if (nextStart.slice(0, 10) !== day) break;

    const hour = new Date(nextStart).getHours();
    if (hour < 8 || hour > 19) continue;

    const check = await checkSlot(origin, tenant, nextStart, nextEnd);

    if (check.ok) {
      return { start: nextStart, end: nextEnd };
    }
  }

  return null;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");

  if (!origin || !allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  if (!origin || !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const requestOrigin = new URL(req.url).origin;
    const ip = getClientIp(req);

    if (ratelimit) {
      const { success } = await ratelimit.limit(`chat:${ip}`);

      if (!success) {
        return NextResponse.json(
          { ok: false, reply: "Zu viele Anfragen. Bitte kurz warten." },
          { status: 429, headers: corsHeaders(origin) }
        );
      }
    }

    const body = (await req.json()) as ChatBody;
    const messages = body.messages ?? [];
    const voiceMode = body.voiceMode === true;

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { ok: false, reply: "Ungültiges Nachrichtenformat." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (messages.length > 50) {
      return NextResponse.json(
        { ok: false, reply: "Zu viele Nachrichten im Verlauf." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (JSON.stringify(messages).length > 3000) {
      return NextResponse.json(
        { ok: false, reply: "Die Nachricht ist zu lang." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const history = messages
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .slice(-10);

    const lastUserMessage =
      [...history].reverse().find((m) => m.role === "user")?.content?.trim() ||
      "";

    if (!lastUserMessage) {
      return NextResponse.json(
        { ok: false, reply: "Es wurde keine gültige Nachricht übergeben." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const tenantParam =
      body.tenant ||
      req.nextUrl.searchParams.get("tenant") ||
      req.headers.get("x-tenant-id") ||
      tenantFromReferer(req) ||
      "demo";

    const normalizedTenantParam = normalizeTenantParam(tenantParam);
    const tenant = getTenant(normalizedTenantParam);
    const sessionId = body.sessionId || crypto.randomUUID();

    const calendarBookingEnabled = ["btdesigns", "demo", "lina", "mm-wartung", "profcar"].includes(
      tenant.id
    );

    if (calendarBookingEnabled && !isThanksOnly(lastUserMessage)) {
      const booking = await extractBookingData(history);

      const hasProposedTime =
        booking.bookingIntent &&
        typeof booking.start === "string" &&
        typeof booking.end === "string";

      const hasAllBookingData =
        booking.bookingIntent &&
        booking.confirmed &&
        typeof booking.name === "string" &&
        (typeof booking.email === "string" || typeof booking.phone === "string") &&
        (tenant.id !== "profcar" || typeof booking.vehicle === "string") &&
        typeof booking.start === "string" &&
        typeof booking.end === "string";

      if (hasAllBookingData) {
        const rawBookingStart = booking.start!;
        const rawBookingEnd = booking.end!;
        const bookingStart = parseEventDate(rawBookingStart, BUSINESS_TIME_ZONE)?.toISOString() || rawBookingStart;
        const bookingEnd = parseEventDate(rawBookingEnd, BUSINESS_TIME_ZONE)?.toISOString() || rawBookingEnd;

        const eventResponse = await fetch(`${requestOrigin}/api/create-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant: tenant.id,
            name: booking.name,
            email: booking.email || "",
            phone: booking.phone || "",
            service:
              booking.topic ||
              (tenant.id === "mm-wartung"
                ? "Werkstatttermin über MM-Doc"
                : tenant.id === "profcar"
                  ? "Probefahrt"
                : "Beratung über den Chatbot"),
            vehicle: booking.vehicle || "",
            start: bookingStart,
            end: bookingEnd,
            checkOnly: false,
            idempotencyKey: `chat:${sessionId}:${bookingStart}:${booking.name}:${booking.vehicle || ""}`,
          }),
        });

        const eventData = await eventResponse.json();

        let reply = "";

        if (eventResponse.ok && (eventData.success || eventData.ok)) {
          reply =
            tenant.id === "mm-wartung"
              ? `Perfekt, ich habe den Termin bei MM Wartung verbindlich eingetragen: ${formatGermanTime(
                  bookingStart
                )}. Moritz sieht sich das dann vor Ort genauer an. ✅`
              : tenant.id === "profcar"
                ? `Perfekt, die Probefahrt wurde verbindlich in Michis Apple-Kalender eingetragen: ${formatGermanTime(
                    bookingStart
                  )}. Buchungs-ID: ${eventData.bookingId}. ✅`
              : `Perfekt, ich habe den Termin verbindlich eingetragen: ${formatGermanTime(
                  bookingStart
                )}. ✅`;
        } else if (eventResponse.status === 409) {
          const alternative = await findNextFreeSlotSameDay(
            requestOrigin,
            tenant.id,
            bookingStart,
            bookingEnd
          );

          reply = alternative
            ? `Der gewünschte Zeitraum ist leider bereits belegt. Am gleichen Tag wäre ${formatGermanTime(
                alternative.start
              )} noch frei. Passt dir dieser Termin? 📅`
            : "Der gewünschte Zeitraum ist leider bereits belegt. Am gleichen Tag habe ich keinen passenden freien Alternativtermin gefunden. Bitte nenne mir einen anderen Tag. 📅";
        } else {
          console.error("CREATE EVENT ERROR", { status: eventResponse.status, code: eventData?.code || "UNKNOWN" });
          reply =
            "Der Termin konnte gerade technisch nicht eingetragen werden. Bitte versuche es noch einmal oder kontaktiere uns direkt. ⚠️";
        }

        queueChatLog({
          tenantId: tenant.id,
          sessionId,
          userMessage: lastUserMessage,
          assistantMessage: reply,
        });

        return NextResponse.json(
          { ok: true, reply, sessionId },
          { headers: corsHeaders(origin) }
        );
      }

      if (hasProposedTime && !booking.confirmed) {
        const bookingStart = parseEventDate(booking.start, BUSINESS_TIME_ZONE)?.toISOString() || booking.start as string;
        const bookingEnd = parseEventDate(booking.end, BUSINESS_TIME_ZONE)?.toISOString() || booking.end as string;

        const checkResponse = await checkSlot(
          requestOrigin,
          tenant.id,
          bookingStart,
          bookingEnd
        );

        let reply = "";

        if (checkResponse.ok) {
          reply =
            tenant.id === "mm-wartung"
              ? "Der Zeitraum ist noch frei. Schick mir bitte noch deinen Namen und deine Telefonnummer, dann frage ich dich einmal zur verbindlichen Bestätigung. ✅"
              : "Der Zeitraum ist noch frei. Schick mir bitte noch deinen Namen, deine E-Mail und optional deine Telefonnummer, dann frage ich dich einmal zur verbindlichen Bestätigung. ✅";
        } else if (checkResponse.status === 409) {
          const alternative = await findNextFreeSlotSameDay(
            requestOrigin,
            tenant.id,
            bookingStart,
            bookingEnd
          );

          reply = alternative
            ? `Der gewünschte Zeitraum ist leider schon belegt. Am gleichen Tag wäre ${formatGermanTime(
                alternative.start
              )} noch frei. Passt dir dieser Termin? 📅`
            : "Der gewünschte Zeitraum ist leider schon belegt. Am gleichen Tag habe ich keinen passenden freien Alternativtermin gefunden. Nenne mir bitte einen anderen Tag. 📅";
        }

        if (reply) {
          queueChatLog({
            tenantId: tenant.id,
            sessionId,
            userMessage: lastUserMessage,
            assistantMessage: reply,
          });

          return NextResponse.json(
            { ok: true, reply, sessionId },
            { headers: corsHeaders(origin) }
          );
        }
      }
    }

    // Live-Demos werden bewusst ohne Cache geladen. Damit gelten Änderungen an
    // der jeweiligen Knowledge-Datei ab dem nächsten neuen Chat beziehungsweise Gespräch.
    const schoolDemoTenant = asSchoolDemo(tenant.id);

    // Rathje/FSAZ/Campus nutzen die speziell für diese Verkaufsdemos
    // gebündelte Wissensbasis. Der normale Loader sucht im alten
    // src/tenants/<id>-Schema und würde hier sonst einen 500er auslösen.
    let knowledgeText = schoolDemoTenant
      ? getSchoolDemoKnowledge(schoolDemoTenant)
      : isFahrschuleTenant(tenant.id) || isProfCarTenant(tenant.id)
        ? await loadTenantKnowledge(tenant.id)
        : await getCachedTenantKnowledge(tenant.id);

    if (isProfCarTenant(tenant.id)) {
      const liveInventory = await buildProfCarInventoryPrompt(lastUserMessage);
      knowledgeText = `${stripStaticProfCarInventory(knowledgeText)}\n\n${liveInventory.prompt}`;
    }

    if (isProfCarTenant(tenant.id) && !knowledgeText.trim()) {
      throw new Error(
        'Für "profcar" wurde kein Knowledge geladen. Prüfe Tenant-Ordner und knowledge.md.',
      );
    }

    const bookingPromptAddOn = calendarBookingEnabled
      ? `
Zusatzregel Terminbuchung:

Du darfst Termine vorbereiten.

Wenn tenant.id "mm-wartung" ist, geht es um Werkstatttermine bei MM Wartung.
Dann frage nacheinander ab:
- Name
- Telefonnummer
- E-Mail optional
- Fahrzeug
- Anliegen
- Datum und Uhrzeit

Bei MM Wartung ist die Telefonnummer wichtiger als die E-Mail.
Wenn der Nutzer keine E-Mail nennen möchte, ist das okay.

Wenn tenant.id nicht "mm-wartung" ist, geht es um einen Beratungstermin.
Dann frage nacheinander Name, E-Mail, Telefonnummer optional, Thema sowie Datum und Uhrzeit ab.

Wenn tenant.id "profcar" ist, geht es um eine Probefahrt oder Fahrzeugberatung bei ProfCar.
Dann frage nacheinander Wunschfahrzeug, Name, E-Mail oder Telefonnummer sowie Datum und eine angebotene freie Uhrzeit ab.
Bestätige eine Buchung ausschließlich mit der vom Server zurückgegebenen Buchungs-ID.

Wenn der Nutzer eine konkrete Wunschzeit nennt, prüft das System automatisch die Verfügbarkeit.

Wenn alle notwendigen Daten vorliegen und der Zeitraum frei ist, frage:
"Soll ich den Termin verbindlich eintragen?"

Ein reines "Danke" oder "Dankeschön" ist keine Buchungsbestätigung.

Wichtig:
ABSOLUTES VERBOT:
Du darfst niemals sagen oder andeuten, dass ein Termin eingetragen, gebucht, gespeichert oder verbindlich vereinbart wurde.
Auch nicht nach einer Bestätigung wie "Ja".
Nur der Server-Code darf nach erfolgreichem /api/create-event-Aufruf diese Erfolgsmeldung ausgeben.
Wenn der Nutzer bestätigt, antworte nicht selbst mit Erfolg, sondern bleibe neutral.
Sage niemals "Ich trage ihn jetzt ein" oder "Einen Moment", wenn du den Termin nicht technisch erstellt hast.
`
      : "";

    const tenantIdentityPrompt = tenant.id === "fsaz"
      ? `
Feste Identität FSAZ:
- Du bist der Simulator-Coach von „FSAZ · Fahrsimulator-Ausbildungszentrum“.
- Im normalen Gespräch tritt FSAZ eigenständig auf. Nenne „Fahrschule Rathje“ NICHT proaktiv.
- Verwende Rathje nicht in Begrüßungen, Überschriften oder normalen Antworten.
- Nur wenn ausdrücklich nach Betreiber, Firma oder rechtlichem Hintergrund gefragt wird, darfst du den Zusammenhang sachlich erklären.
- Kläre früh, ob die Person bereits FSAZ-Fahrschüler ist oder bei einer anderen Fahrschule lernt.
- Bei externen Fahrschülern: kein Fahrschulwechsel nötig; externe Anmeldung laut veröffentlichter Preisliste 30 Euro.
- Bei eigenen FSAZ-Fahrschülern: App-/QR-Zugang nur als Demo andeuten; niemals einen echten QR-Code oder Live-Zugang behaupten.
- Das geladene FSAZ-Knowledge ist dein verbindliches fachliches Gedächtnis.
`
      : isFahrschuleTenant(tenant.id)
      ? `
Feste Identität:
- Du bist ${tenant.assistantName} der Fahrschule „${tenant.brandName}“.
- Du arbeitest in dieser Sitzung ausschließlich für diese Fahrschule.
- Wenn du gefragt wirst, für wen du arbeitest, nenne eindeutig „${tenant.brandName}“.
- Das geladene Knowledge dieser Fahrschule ist dein verbindliches fachliches Gedächtnis.
- Vermische niemals Informationen, Preise, Standorte, Personen, Kurse oder Kontaktdaten verschiedener Fahrschulen.
- Verwende im Text- und Sprachmodus dieselben Fakten und Demo-Grenzen.
- Nenne konkrete Preise oder Termine nur, wenn sie im aktuell geladenen Knowledge stehen.
- Erfinde keine garantierte Gesamtsumme, keinen freien Platz und keine bestätigte Buchung.
- Wenn etwas nicht im Knowledge steht, sage das offen und verweise auf ${tenant.brandName}.
${
  isFahrwerkTenant(tenant.id)
    ? "- Für Fahrwerk B darfst und sollst du bekannte Einzelpreise nennen. Bei Klasse BE verwendest du ausschließlich die hinterlegten BE-Preise."
    : "- Kennzeichne alle im Demo-Cockpit gezeigten Schülerstände, Plätze und Termine als Beispiel- oder Demo-Daten."
}
`
      : isProfCarTenant(tenant.id)
        ? `
Feste Identität:
- Du bist ${tenant.assistantName} von „${tenant.brandName}“.
- Du arbeitest ausschließlich als digitaler Fahrzeugberater für ProfCar in Köln.
- Das geladene ProfCar-Knowledge und der serverseitig ergänzte Bestandskontext sind dein verbindliches fachliches Gedächtnis.
- Nutze für Fahrzeugdaten, Preise, Verfügbarkeit und Ausstattung ausschließlich den serverseitig ergänzten Bestandskontext.
- Wenn der Nutzer ein Fahrzeug nennt, ordne genau dieses Fahrzeug aus dem ProfCar-Bestand ein.
- Erkläre bekannte typische Schwachstellen sachlich, aber stelle niemals eine Diagnose aus der Ferne.
- Sage nur dann, dass eine Reparatur oder Prüfung am angebotenen Fahrzeug erledigt wurde, wenn das im Knowledge ausdrücklich als belegt steht.
- Ist ein Punkt nicht dokumentiert, sage klar, dass ProfCar ihn am Fahrzeug beziehungsweise anhand der Unterlagen prüfen muss.
- Verwechsle allgemeine Modellrisiken niemals mit dem tatsächlichen Zustand des konkreten ProfCar-Fahrzeugs.
`
        : "";

    const voicePromptAddOn = voiceMode
      ? `
Sprachmodus:
- Antworte sofort und direkt.
- Höchstens zwei kurze Sätze und möglichst unter 45 Wörtern.
- Keine Listen, Überschriften, Tabellen oder Markdown-Zeichen.
- Beginne nicht mit langen Einleitungen.
- Stelle nur dann eine Rückfrage, wenn sie wirklich nötig ist.
`
      : "";

    const tenantFeaturePrompt = tenant.id === "r-drive"
      ? `
Verbindlicher Funktionsumfang R-DRIVE:
- Unterstütze ausschließlich Führerschein-Finder, Preise und Kursinformationen, persönliche Theorie-/Praxistipps sowie allgemeine Fragen per Text oder Sprache.
- Ein ausgewähltes Foto oder Dokument dient nur als lokale Beta-Vorschau. Behaupte niemals, dass du die Datei empfangen, gelesen, gespeichert oder an R-DRIVE gesendet hast.
- Erfasse keine Kontaktdaten und bereite keine Leads, Anmeldungen, Termine, Rückrufe oder E-Mail-Übergaben vor.
- Buche oder reserviere nichts und behaupte keine Kalender-, Fahrschulsoftware- oder API-Anbindung.
- Biete kein Fahrschüler-Cockpit, keine Statusverfolgung, keine Unterlagen-Checkliste und keinen Fahrschulwechsel an.
- Bei Preisen nenne keine erfundene Zahl. Erkläre das passende Kursmodell und verweise für den aktuellen Kostenvoranschlag oder B96-Festpreis neutral auf R-DRIVE.
`
      : "";

    const systemPrompt =
      buildSystemPrompt(tenant, knowledgeText) +
      "\n\n" +
      tenantIdentityPrompt +
      "\n\n" +
      tenantFeaturePrompt +
      "\n\n" +
      bookingPromptAddOn +
      "\n\n" +
      voicePromptAddOn;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: voiceMode ? 110 : 400,
      temperature: voiceMode ? 0.25 : 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Entschuldige, darauf kann ich gerade nicht antworten.";

    const cleanReply = stripMarkdown(reply);

    queueChatLog({
      tenantId: tenant.id,
      sessionId,
      userMessage: lastUserMessage,
      assistantMessage: cleanReply,
    });

    return NextResponse.json(
      {
        ok: true,
        reply: cleanReply,
        sessionId,
      },
      { headers: corsHeaders(origin) }
    );
  } catch (err) {
    console.error("Chat API Error:", err);

    return NextResponse.json(
      {
        ok: false,
        reply:
          "Es gab kurz ein technisches Problem. Bitte stell deine Frage noch einmal.",
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
