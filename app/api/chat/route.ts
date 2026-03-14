import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import { getTenant } from "@/lib/tenants";
import { buildSystemPrompt } from "@/lib/prompt";
import { loadTenantKnowledge } from "@/lib/loadTenantKnowledge";
import { getTenantFromPath } from "@/lib/getTenant";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ChatBody = {
  tenant?: string;
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

    const systemPrompt = buildSystemPrompt(tenant, knowledgeText);

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

    const lastUserMessage =
      history.reverse().find((m) => m.role === "user")?.content || "";

    // CHAT SPEICHERN
    const { error } = await supabase.from("chat_logs").insert({
      tenant: tenant.id,
      session_id: crypto.randomUUID(),
      user_message: lastUserMessage,
      assistant_message: cleanReply,
    });

    if (error) {
      console.error("SUPABASE INSERT ERROR:", error);
    } else {
      console.log("CHAT SAVED");
    }

    return NextResponse.json({
      ok: true,
      reply: cleanReply,
    });
  } catch (err) {
    console.error("Chat API Error:", err);

    return NextResponse.json({
      ok: false,
      reply:
        "Es gab kurz ein technisches Problem. Bitte stell deine Frage noch einmal.",
    });
  }
}