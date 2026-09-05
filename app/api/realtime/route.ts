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

const FAHRSCHULE_TENANT_IDS = [
  "fahrwerk-b",
  "fahrschule-hohenbaden",
  "fahrschule-hopla",
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
] as const;

const PROFCAR_TENANT_ALIASES = [
  "profcar",
  "prof-car",
  "profcar-koeln",
  "profcar.com",
  "www.profcar.com",
] as const;

const VOICE_INTERFACE_TENANT_IDS = [
  "profcar",
  "fahrwerk-b",
  "fahrschule-hohenbaden",
  "fahrschule-hopla",
  "fahrschule-alamir",
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
] as const;

const VOICE_INTERFACE_TOOLS = [
  {
    type: "function",
    name: "show_interface_card",
    description:
      "Zeigt passend zum aktuellen Gespräch eine kompakte Karte oder öffnet einen Bereich im Interface des aktiven Tenants. Verwende ausschließlich Informationen aus dessen Knowledge. Für ProfCar sind besonders Fahrzeugbestand, Fahrzeugdetails, Vergleich, Finanzierung, Inzahlungnahme, Probefahrt und Service relevant. Erfinde keine Werte und behaupte keine ausgeführte Reparatur ohne Beleg im Knowledge.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: {
          type: "string",
          enum: [
            "link",
            "price_list",
            "checklist",
            "info",
            "contact",
            "panel",
          ],
          description: "Darstellungsart der Karte.",
        },
        eyebrow: {
          type: "string",
          description: "Kurze Kategorie oder Name der aktuell aktiven Fahrschule.",
        },
        title: {
          type: "string",
          description: "Kurzer, konkreter Titel der Karte.",
        },
        description: {
          type: "string",
          description: "Ein kurzer erklärender Satz.",
        },
        items: {
          type: "array",
          maxItems: 6,
          description:
            "Passende Preise, Schritte oder Fakten. Nur Einträge aufnehmen, die für das aktuelle Thema relevant sind.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: {
                type: "string",
                description: "Bezeichnung des Preises, Schritts oder Fakts.",
              },
              value: {
                type: "string",
                description: "Optionaler Wert, zum Beispiel 59,00 €.",
              },
              detail: {
                type: "string",
                description: "Optionaler sehr kurzer Zusatz.",
              },
            },
            required: ["label"],
          },
        },
        url: {
          type: "string",
          description:
            "Nur bei einer Link- oder Kontaktkarte. Verwende ausschließlich eine im Wissen hinterlegte URL, Telefonnummer als tel: oder E-Mail als mailto:.",
        },
        cta: {
          type: "string",
          description: "Kurzer Text für den Link-Button.",
        },
        panel: {
          type: "string",
          enum: [
            "home",
            "connect",
            "dashboard",
            "start",
            "courses",
            "schedule",
            "documents",
            "theory",
            "practice",
            "exam",
            "student",
            "contact",
            "coach",
            "finder",
            "inventory",
            "compare",
            "finance",
            "tradein",
            "testdrive",
            "service",
          ],
          description: "Optional passender Bereich im Interface der aktuellen Fahrschule.",
        },
      },
      required: ["kind", "title", "description"],
    },
  },
] as const;

function isFahrwerkTenant(tenantId: string) {
  return FAHRWERK_TENANT_ALIASES.includes(
    tenantId
      .trim()
      .toLowerCase() as (typeof FAHRWERK_TENANT_ALIASES)[number],
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

function supportsVoiceInterfaceTools(tenantId: string) {
  return VOICE_INTERFACE_TENANT_IDS.includes(
    tenantId as (typeof VOICE_INTERFACE_TENANT_IDS)[number],
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

  if (
    PROFCAR_TENANT_ALIASES.includes(
      normalized as (typeof PROFCAR_TENANT_ALIASES)[number],
    )
  ) {
    return "profcar";
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

  // Live-Demos werden bewusst ohne Cache geladen, damit Änderungen an der
  // jeweiligen Knowledge-Datei beim nächsten Gespräch sofort gelten.
  const knowledgeText =
    isFahrschuleTenant(tenant.id) || isProfCarTenant(tenant.id)
    ? await loadTenantKnowledge(tenant.id)
    : await getCachedTenantKnowledge(tenant.id);

  console.log("🧠 Realtime-Knowledge geprüft:", {
    requestedTenant: rawTenantId,
    resolvedTenant: tenant.id,
    files: tenant.knowledge.files,
    knowledgeLength: knowledgeText.trim().length,
  });

  if (
    (isFahrschuleTenant(tenant.id) || isProfCarTenant(tenant.id)) &&
    !knowledgeText.trim()
  ) {
    throw new Error(
      `Die Sprachsession wurde gestoppt, weil für "${tenant.id}" kein Knowledge geladen wurde. Prüfe Tenant-ID, Tenant-Ordner und knowledge.md.`,
    );
  }

  const tenantIdentityPrompt = isFahrschuleTenant(tenant.id)
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
`.trim()
    : isProfCarTenant(tenant.id)
      ? `
Feste Identität:
- Du bist ${tenant.assistantName} von „${tenant.brandName}“.
- Du arbeitest in dieser Sitzung ausschließlich als digitaler Fahrzeugberater für ProfCar in Köln.
- Das geladene ProfCar-Knowledge ist dein verbindliches fachliches Gedächtnis.
- Nutze für Fahrzeugdaten, Preise, Verfügbarkeit, Ausstattung und Motorhinweise ausschließlich dieses Knowledge.
- Wenn der Nutzer ein Fahrzeug nennt, ordne genau dieses Fahrzeug aus dem ProfCar-Bestand ein.
- Erkläre bekannte typische Schwachstellen sachlich, aber stelle niemals eine Diagnose aus der Ferne.
- Sage nur dann, dass eine Reparatur oder Prüfung am angebotenen Fahrzeug erledigt wurde, wenn das im Knowledge ausdrücklich als belegt steht.
- Ist ein Punkt nicht dokumentiert, sage klar: „Das ist im aktuellen Datensatz nicht belegt und muss ProfCar am Fahrzeug beziehungsweise anhand der Unterlagen prüfen.“
- Weise beim BMW M6 immer auf den dokumentierten Motorschaden und die fehlende Fahrtauglichkeit hin.
- Verwechsle allgemeine Modellrisiken niemals mit dem tatsächlichen Zustand des konkreten ProfCar-Fahrzeugs.
`.trim()
      : "";

  const realtimeConversationPrompt = `
Sprachmodus:
- Führe ein echtes, natürliches Gespräch auf Deutsch.
- Antworte sofort und direkt auf die konkrete Frage.
- Nutze ausschließlich das beim Start dieser Sitzung geladene Knowledge des aktuellen Tenants als verbindliche Grundlage.
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

  const interfacePrompt = !supportsVoiceInterfaceTools(tenant.id)
    ? ""
    : isProfCarTenant(tenant.id)
      ? `
Aktive ProfCar-Oberfläche:
- Nutze show_interface_card, sobald das Gespräch ein konkretes Fahrzeug oder einen ProfCar-Bereich betrifft.
- Wenn ein bestimmtes Fahrzeug genannt wird, öffne panel „inventory“ und nenne den vollständigen Fahrzeugnamen im Titel oder in der Beschreibung. Dadurch öffnet das Interface die zugehörige Fahrzeugmaske mit Bildern.
- Bei der Fahrzeugsuche nutze panel „finder“, beim Vergleich „compare“, bei Finanzierung „finance“, bei Inzahlungnahme „tradein“, bei Probefahrt „testdrive“ und bei Werkstattfragen „service“.
- Zeige bei einem konkreten Fahrzeug höchstens die wichtigsten Fakten und Motorprüfpunkte. Lies die sichtbare Liste nicht vollständig vor.
- Trenne immer zwischen typischen Modell-/Motorproblemen und dem belegten Zustand des konkreten Fahrzeugs.
- Verwende für Karten, Preise, Fahrzeugdaten, Belegstatus und Links ausschließlich Fakten aus dem ProfCar-Knowledge.
- Ein nicht dokumentierter Reparaturpunkt ist offen und darf niemals als erledigt dargestellt werden.
`.trim()
      : `
Aktive Cockpit-Oberfläche:
- Nutze show_interface_card immer dann, wenn sichtbare Informationen dem Nutzer einen konkreten Vorteil geben.
- Bei einer Frage nach Anmeldung oder Anmeldelink: Zeige direkt eine Link-Karte mit dem offiziellen Anmeldelink.
- Bei einer Preisfrage: Zeige eine price_list mit ausschließlich den Preisen, die zum gerade besprochenen Thema gehören.
- Bei Unterlagen oder Prüfungsvorbereitung: Zeige eine kurze checklist und öffne, sofern vorhanden, den passenden Cockpit-Bereich.
- Bei Kontaktdaten, Standort oder Öffnungszeiten: Zeige eine kompakte contact- oder info-Karte.
- Bei Kursen, Theorie, Praxis, Prüfung oder aktuellem Fahrschüler-Stand: Öffne über panel den für dieses Interface passenden Bereich und zeige nur dann zusätzliche Punkte, wenn sie konkret helfen.
- Lies eine längere sichtbare Liste nicht vollständig vor. Sage kurz, dass du die passenden Informationen eingeblendet hast, und beantworte die Kernfrage mündlich.
- Zeige keine allgemeine Karte ohne Mehrwert und wiederhole nicht bei jeder Antwort dieselbe Karte.
- Verwende für Karten ausschließlich Fakten und Links aus dem aktuellen Tenant-Knowledge.
`.trim();

  const instructions = [
    buildSystemPrompt(tenant, knowledgeText),
    tenantIdentityPrompt,
    realtimeConversationPrompt,
    interfacePrompt,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    tenantId: tenant.id,
    instructions,
    tools: supportsVoiceInterfaceTools(tenant.id)
      ? VOICE_INTERFACE_TOOLS
      : [],
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
    const { tenantId, instructions, tools } =
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
      ...(tools.length > 0
        ? {
            tools,
            tool_choice: "auto",
          }
        : {}),
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
