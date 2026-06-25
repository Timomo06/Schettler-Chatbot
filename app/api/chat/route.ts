import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getTenant } from "@/lib/tenants";
import { buildSystemPrompt } from "@/lib/prompt";
import { loadTenantKnowledge } from "@/lib/loadTenantKnowledge";
import { getTenantFromPath } from "@/lib/getTenant";

export const runtime = "nodejs";

const allowedOrigins = [
  "https://btdesigns.de",
  "https://www.btdesigns.de",
  "https://mm-wartung.de",
  "https://www.mm-wartung.de",
  "https://schettlers-chatbot-lca3.vercel.app",
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL fehlt");
if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatBody = {
  tenant?: string;
  sessionId?: string;
  messages?: ChatMessage[];
};

type BookingExtraction = {
  bookingIntent: boolean;
  confirmed: boolean;
  name: string | null;
  email: string | null;
  phone: string | null;
  topic: string | null;
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
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
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
  const { error } = await supabase.from("chat_logs").insert({
    tenant: params.tenantId,
    session_id: params.sessionId,
    user_message: params.userMessage,
    assistant_message: params.assistantMessage,
  });

  if (error) console.error("SUPABASE INSERT ERROR:", error);
}

async function extractBookingData(
  history: ChatMessage[]
): Promise<BookingExtraction> {
  const today = new Date().toISOString().slice(0, 10);

  const completion = await openai.chat.completions.create({
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
      start: null,
      end: null,
      missing: [],
    };
  }
}

async function checkSlot(origin: string, start: string, end: string) {
  const response = await fetch(`${origin}/api/create-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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

    const check = await checkSlot(origin, nextStart, nextEnd);

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

    const tenant = getTenant(tenantParam);
    const sessionId = body.sessionId || crypto.randomUUID();

    const calendarBookingEnabled = ["btdesigns", "demo", "lina", "mm-wartung"].includes(
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
        typeof booking.start === "string" &&
        typeof booking.end === "string";

      if (hasAllBookingData) {
        const bookingStart = booking.start;
        const bookingEnd = booking.end;

        const eventResponse = await fetch(`${requestOrigin}/api/create-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: booking.name,
            email: booking.email || "",
            phone: booking.phone || "",
            topic:
              booking.topic ||
              (tenant.id === "mm-wartung"
                ? "Werkstatttermin über MM-Doc"
                : "Beratung über den Chatbot"),
            start: bookingStart,
            end: bookingEnd,
            checkOnly: false,
          }),
        });

        const eventData = await eventResponse.json();

        let reply = "";

        if (eventResponse.ok && eventData.success) {
          reply =
            tenant.id === "mm-wartung"
              ? `Perfekt, ich habe den Termin bei MM Wartung verbindlich eingetragen: ${formatGermanTime(
                  booking.start!
                )}. Moritz sieht sich das dann vor Ort genauer an. ✅`
              : `Perfekt, ich habe den Termin verbindlich eingetragen: ${formatGermanTime(
                  booking.start!
                )}. ✅`;
        } else if (eventResponse.status === 409) {
          const alternative = await findNextFreeSlotSameDay(
            requestOrigin,
            booking.start!,
            booking.end!
          );

          reply = alternative
            ? `Der gewünschte Zeitraum ist leider bereits belegt. Am gleichen Tag wäre ${formatGermanTime(
                alternative.start
              )} noch frei. Passt dir dieser Termin? 📅`
            : "Der gewünschte Zeitraum ist leider bereits belegt. Am gleichen Tag habe ich keinen passenden freien Alternativtermin gefunden. Bitte nenne mir einen anderen Tag. 📅";
        } else {
          console.error("CREATE EVENT ERROR:", eventData);
          reply =
            "Der Termin konnte gerade technisch nicht eingetragen werden. Bitte versuche es noch einmal oder kontaktiere uns direkt. ⚠️";
        }

        await logChat({
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
        const bookingStart = booking.start as string;
        const bookingEnd = booking.end as string;

        const checkResponse = await checkSlot(
          requestOrigin,
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
          await logChat({
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

    const knowledgeText = await loadTenantKnowledge(tenant.id);

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

    const systemPrompt =
      buildSystemPrompt(tenant, knowledgeText) + "\n\n" + bookingPromptAddOn;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      temperature: 0.4,
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

    await logChat({
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