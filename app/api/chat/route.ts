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

Antworte ausschließlich als JSON mit diesem Schema:
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
- confirmed ist nur true, wenn der Nutzer klar bestätigt hat, dass der Termin verbindlich eingetragen werden soll.
- start und end im Format YYYY-MM-DDTHH:mm:ss.
- Wenn keine Endzeit genannt ist, nutze 30 Minuten Dauer.
- Erfinde keine Namen, Mails, Telefonnummern oder Zeiten.
- Wenn Daten fehlen, liste sie in missing.
        `.trim(),
      },
      ...history.map((m) => ({
        role: m.role,
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

    const calendarBookingEnabled = tenant.id === "btdesigns";

    if (calendarBookingEnabled) {
      const booking = await extractBookingData(history);

      const hasAllBookingData =
        booking.bookingIntent &&
        booking.confirmed &&
        booking.name &&
        booking.email &&
        booking.start &&
        booking.end;

      if (hasAllBookingData) {
        const eventResponse = await fetch(
          `${req.nextUrl.origin}/api/create-event`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: booking.name,
              email: booking.email,
              phone: booking.phone || "",
              topic: booking.topic || "Beratung über den Chatbot",
              start: booking.start,
              end: booking.end,
            }),
          }
        );

        const eventData = await eventResponse.json();

        let reply = "";

        if (eventResponse.ok && eventData.success) {
          reply =
            "Perfekt, ich habe den Termin verbindlich eingetragen. ✅";
        } else if (eventResponse.status === 409) {
          reply =
            "Der gewünschte Zeitraum ist leider bereits belegt. Bitte nenne mir eine andere Uhrzeit oder einen anderen Tag. 📅";
        } else {
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
    }

    const knowledgeText = await loadTenantKnowledge(tenant.id);

    const bookingPromptAddOn = calendarBookingEnabled
      ? `
Zusatzregel Terminbuchung:
Du darfst BTDesigns-Beratungstermine vorbereiten.
Frage nacheinander Name, E-Mail, Telefonnummer optional, Thema sowie Datum und Uhrzeit ab.
Buche niemals ohne klare Bestätigung des Nutzers.
Wenn alle Daten vorliegen, frage: "Soll ich den Termin verbindlich eintragen?"
Erst wenn der Nutzer klar bestätigt, gilt der Termin als freigegeben.
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
          role: m.role,
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