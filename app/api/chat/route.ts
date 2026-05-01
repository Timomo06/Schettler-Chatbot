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
];

const redis = Redis.fromEnv();

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL fehlt");
}

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
  },
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

    const { success } = await ratelimit.limit(`chat:${ip}`);

    if (!success) {
      return NextResponse.json(
        { ok: false, reply: "Zu viele Anfragen. Bitte kurz warten." },
        { status: 429, headers: corsHeaders(origin) }
      );
    }

    const body = (await req.json()) as ChatBody;

    const messages = body.messages ?? [];

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { ok: false, reply: "Ungültiges Nachrichtenformat." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (messages.length > 10) {
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
    const knowledgeText = await loadTenantKnowledge(tenant.id);
    const systemPrompt = buildSystemPrompt(tenant, knowledgeText);
    const sessionId = body.sessionId || crypto.randomUUID();

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

    const { error } = await supabase.from("chat_logs").insert({
      tenant: tenant.id,
      session_id: sessionId,
      user_message: lastUserMessage,
      assistant_message: cleanReply,
    });

    if (error) {
      console.error("SUPABASE INSERT ERROR:", error);

      return NextResponse.json(
        {
          ok: true,
          reply: cleanReply,
          sessionId,
        },
        { headers: corsHeaders(origin) }
      );
    }

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