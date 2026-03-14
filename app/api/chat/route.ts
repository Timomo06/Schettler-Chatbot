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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatBody = {
  tenant?: string;
  sessionId?: string;
  messages: ChatMessage[];
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

    const history = Array.isArray(body.messages) ? body.messages.slice(-10) : [];

    const lastUserMessage =
      [...history].reverse().find((m) => m.role === "user")?.content?.trim() || "";

    if (!lastUserMessage) {
      return NextResponse.json(
        {
          ok: false,
          reply: "Es wurde keine gültige Nachricht übergeben.",
        },
        { status: 400 }
      );
    }

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

    const payload = {
      tenant: tenant.id,
      session_id: sessionId,
      user_message: lastUserMessage,
      assistant_message: cleanReply,
    };

    console.log("SUPABASE INSERT PAYLOAD:", payload);

    const { data, error } = await supabase
      .from("chat_logs")
      .insert(payload)
      .select();

    if (error) {
      console.error("SUPABASE INSERT ERROR FULL:", JSON.stringify(error, null, 2));

      return NextResponse.json(
        {
          ok: false,
          reply: cleanReply,
          debug: {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          },
        },
        { status: 500 }
      );
    }

    console.log("SUPABASE INSERT SUCCESS:", data);

    return NextResponse.json({
      ok: true,
      reply: cleanReply,
      sessionId,
    });
  } catch (err: any) {
    console.error("Chat API Error:", err);

    return NextResponse.json(
      {
        ok: false,
        reply:
          "Es gab kurz ein technisches Problem. Bitte stell deine Frage noch einmal.",
        debug: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}