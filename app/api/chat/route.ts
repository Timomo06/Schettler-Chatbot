// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { getTenant } from "@/lib/tenants";
import { buildSystemPrompt } from "@/lib/prompt";
import { loadTenantKnowledge } from "@/lib/loadTenantKnowledge";
import { getTenantFromPath } from "@/lib/getTenant";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatBody = {
  tenant?: string;
  sessionId?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
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

// Stilregeln nur für Schettlers Tenant
const SCHETTLERS_STYLE_PREFIX = `
STIL (SCHE TTLERs):
- Du sprichst als Mitarbeiter von uns (wir/bei uns/unsere), nicht neutral.
- Standardantwort: 1–2 Sätze, klar und sicher.
- Emojis: nutze 0–1 passendes Emoji pro Antwort (nicht jedes Mal, aber regelmäßig).
- Preisfragen ("zu teuer"): ruhig erklären (Ergiebigkeit / Preis pro Anwendung / Probepackung), nicht defensiv.
- Kein Shop-Spam: nur auf Kaufen/Bestellen verweisen, wenn nach Preis/Bestellung/Versand/Verfügbarkeit/wo kaufen gefragt wird.
- Keine Heilversprechen/Diagnosen; bei starken Beschwerden: Zahnarzt-Hinweis.

`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatBody;

    const tenantParam =
      body.tenant ||
      req.nextUrl.searchParams.get("tenant") ||
      req.headers.get("x-tenant-id") ||
      tenantFromReferer(req) ||
      "demo";

    const tenant = getTenant(tenantParam);

    const knowledgeText = await loadTenantKnowledge(tenant.id);

    const baseSystemPrompt = buildSystemPrompt(tenant, knowledgeText);

    const systemPrompt =
      tenant.id === "zahnputzpulver"
        ? `${SCHETTLERS_STYLE_PREFIX}${baseSystemPrompt}`
        : baseSystemPrompt;

    const history = (body.messages || []).slice(-10);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      temperature: 0.4,
      messages: [{ role: "system", content: systemPrompt }, ...history],
    });

    const reply =
      completion.choices[0]?.message?.content ??
      "Entschuldige, darauf kann ich gerade nicht antworten.";

    const cleanReply = stripMarkdown(reply);

    // Letzte User Nachricht herausfinden
    const lastUserMessage =
      [...(body.messages || [])].reverse().find((m) => m.role === "user")
        ?.content || "";

    // CHAT LOG in Supabase speichern
    try {
      await supabaseAdmin.from("chat_logs").insert({
        tenant: tenant.id,
        session_id: body.sessionId ?? null,
        user_message: lastUserMessage,
        assistant_message: cleanReply,
      });
    } catch (logError) {
      console.error("Supabase Log Error:", logError);
    }

    return NextResponse.json({ ok: true, reply: cleanReply });
  } catch (err) {
    console.error("Chat API Error:", err);

    return NextResponse.json({
      ok: false,
      reply:
        "Es gab kurz ein technisches Problem. Bitte stell deine Frage noch einmal.",
    });
  }
}