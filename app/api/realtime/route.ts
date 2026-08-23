import { NextRequest, NextResponse } from "next/server";

import { getTenant } from "@/lib/tenants";
import { buildSystemPrompt } from "@/lib/prompt";
import { loadTenantKnowledge } from "@/lib/loadTenantKnowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TENANT_KNOWLEDGE_TTL_MS = 5 * 60 * 1000;
const tenantKnowledgeCache = new Map<
  string,
  { value: string; expiresAt: number }
>();

const FAHRWERK_TENANT_ALIASES = [
  "fahrwerk-b",
  "fahrwerkb",
  "fahrwerk_b",
  "fahrwerk-b.de",
  "fahrwerkbde",
  "fahrwerk",
] as const;

function isFahrwerkTenant(tenantId: string) {
  return FAHRWERK_TENANT_ALIASES.includes(
    tenantId
      .trim()
      .toLowerCase() as (typeof FAHRWERK_TENANT_ALIASES)[number],
  );
}

function normalizeTenantParam(tenantId: string) {
  const normalized = tenantId.trim().toLowerCase();

  if (
    FAHRWERK_TENANT_ALIASES.includes(
      normalized as (typeof FAHRWERK_TENANT_ALIASES)[number],
    )
  ) {
    return "fahrwerk-b";
  }

  return tenantId.trim() || "demo";
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

async function buildRealtimeInstructions(rawTenantId: string) {
  const normalizedTenantId = normalizeTenantParam(rawTenantId);
  const tenant = getTenant(normalizedTenantId);

  // Fahrwerk B wird wie in /api/chat bewusst ohne Cache geladen, damit
  // aktualisierte Preise, Kurse und Informationen sofort im Sprachmodus gelten.
  const knowledgeText = isFahrwerkTenant(tenant.id)
    ? await loadTenantKnowledge(tenant.id)
    : await getCachedTenantKnowledge(tenant.id);

  const tenantIdentityPrompt = isFahrwerkTenant(tenant.id)
    ? `
Feste Identität:
- Du bist das digitale Führerschein-Cockpit der Fahrschule Fahrwerk B.
- Du arbeitest ausschließlich für Fahrwerk B.
- Wenn du gefragt wirst, für wen du arbeitest, antworte eindeutig: Fahrwerk B.
- Verwende im Text- und Sprachmodus immer dasselbe Fahrwerk-B-Wissen und dieselben Regeln.
- Erfinde keine anderen Fahrschulen, Standorte, Preise, Öffnungszeiten oder Leistungen.
- Wenn ein Preis im Fahrwerk-B-Wissen hinterlegt ist, darfst und sollst du diesen konkreten Preis nennen.
- Sage niemals pauschal, dass du keine Preise nennen kannst, wenn für die Frage passende Preise im Fahrwerk-B-Wissen vorhanden sind.
- Wenn nach dem Gesamtpreis eines Führerscheins gefragt wird, erfinde keine garantierte Gesamtsumme. Erkläre stattdessen kurz, dass die Gesamtkosten unter anderem von der benötigten Zahl der Fahrstunden abhängen, und nenne die bekannten Einzelpreise aus dem Fahrwerk-B-Wissen.
- Bei Fragen zu Klasse BE oder Anhängerführerschein verwende die dafür hinterlegten BE-Preise aus dem Fahrwerk-B-Wissen.
- Wenn eine Information nicht im Fahrwerk-B-Wissen steht, sage das offen und verweise auf Fahrwerk B.
`.trim()
    : "";

  const realtimeConversationPrompt = `
Sprachmodus:
- Führe ein echtes, natürliches Gespräch auf Deutsch.
- Antworte sofort und direkt auf die konkrete Frage.
- Nutze das hinterlegte Wissen des aktuellen Unternehmens als verbindliche Grundlage.
- Bei einfachen und normalen Fragen reichen meistens ein bis zwei kurze gesprochene Sätze.
- Bleibe möglichst unter 45 Wörtern, solange eine längere Erklärung nicht wirklich nötig oder ausdrücklich gewünscht ist.
- Verwende keine Listen, Überschriften, Tabellen oder Markdown-Zeichen in gesprochenen Antworten.
- Beginne nicht ständig mit Floskeln wie „Gerne“, „Natürlich“, „Kein Problem“ oder „Ich helfe dir gerne“.
- Stelle nur dann eine kurze Rückfrage, wenn sie für die nächste sinnvolle Antwort wirklich nötig ist.
- Wiederhole keine Informationen, die im Gespräch bereits klar sind.
- Wenn der Nutzer dich unterbricht, gehe sofort auf die neue Aussage ein und führe den alten Gedanken nicht weiter aus.
- Reagiere auf kurze Bestätigungen wie „okay“, „alles klar“ oder „danke“ ebenfalls sehr kurz und natürlich.
- Erfinde keine Informationen. Wenn etwas nicht im Wissen steht, sage es offen.
`.trim();

  const instructions = [
    buildSystemPrompt(tenant, knowledgeText),
    tenantIdentityPrompt,
    realtimeConversationPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    tenantId: tenant.id,
    instructions,
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY fehlt." },
        { status: 500 },
      );
    }

    const rawTenantId =
      req.nextUrl.searchParams.get("tenant") ||
      req.headers.get("x-tenant") ||
      req.headers.get("x-tenant-id") ||
      "demo";
    const { tenantId, instructions } =
      await buildRealtimeInstructions(rawTenantId);

    // Das SDP kommt absichtlich roh als application/sdp.
    const sdp = await req.text();

    if (!sdp || !sdp.trimStart().startsWith("v=0")) {
      console.error("Ungültiges SDP empfangen:", {
        tenant: tenantId,
        length: sdp?.length || 0,
        beginning: sdp?.slice(0, 100) || "",
      });

      return NextResponse.json(
        { error: "Kein gültiges SDP Offer empfangen." },
        { status: 400 },
      );
    }

    console.log("🎙️ Gültiges SDP empfangen:", {
      tenant: tenantId,
      length: sdp.length,
      beginning: sdp.slice(0, 40),
    });

    const sessionConfig = JSON.stringify({
      type: "realtime",
      model: "gpt-realtime-2.1",
      instructions,
      audio: {
        output: {
          voice: "marin",
        },
      },
    });

    const formData = new FormData();
    formData.set("sdp", sdp);
    formData.set("session", sessionConfig);

    const realtimeResponse = await fetch(
      "https://api.openai.com/v1/realtime/calls",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        cache: "no-store",
      },
    );

    const responseText = await realtimeResponse.text();

    if (!realtimeResponse.ok) {
      console.error("❌ OpenAI Realtime Fehler:", {
        tenant: tenantId,
        details: responseText,
      });

      return NextResponse.json(
        {
          error: "Realtime Session konnte nicht gestartet werden.",
          details: responseText,
        },
        { status: realtimeResponse.status },
      );
    }

    if (!responseText.trimStart().startsWith("v=0")) {
      console.error(
        "❌ OpenAI hat kein gültiges SDP Answer geliefert:",
        responseText.slice(0, 300),
      );

      return NextResponse.json(
        { error: "OpenAI hat kein gültiges SDP Answer geliefert." },
        { status: 502 },
      );
    }

    console.log("✅ OpenAI Realtime Session erstellt:", {
      tenant: tenantId,
      answerLength: responseText.length,
    });

    return new NextResponse(responseText, {
      status: 200,
      headers: {
        "Content-Type": "application/sdp",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("❌ Realtime Route Fehler:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Realtime-Verbindung fehlgeschlagen.",
      },
      { status: 500 },
    );
  }
}
