import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 1_200;

function getVoiceId() {
  return (
    process.env.ELEVENLABS_VOICE_ID?.trim() ||
    process.env.ELEVENLABS_VOICE?.trim() ||
    process.env.VOICE_ID?.trim() ||
    ""
  );
}

function cleanSpeechText(value: unknown) {
  return String(value ?? "")
    .replace(/[*_#`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

async function createSpeechResponse(text: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = getVoiceId();

  if (!apiKey || !voiceId) {
    return NextResponse.json(
      {
        error:
          "ELEVENLABS_API_KEY oder ELEVENLABS_VOICE_ID ist serverseitig nicht hinterlegt.",
      },
      { status: 500 },
    );
  }

  if (!text) {
    return NextResponse.json(
      { error: "Es wurde kein Text für die Sprachausgabe übermittelt." },
      { status: 400 },
    );
  }

  const elevenLabsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      voiceId,
    )}/stream?output_format=mp3_22050_32`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        language_code: "de",
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.78,
          style: 0,
          use_speaker_boost: false,
        },
      }),
      cache: "no-store",
    },
  );

  if (!elevenLabsResponse.ok || !elevenLabsResponse.body) {
    const errorText = await elevenLabsResponse.text().catch(() => "");

    console.error(
      "ElevenLabs Text-to-Speech Fehler:",
      elevenLabsResponse.status,
      errorText,
    );

    return NextResponse.json(
      { error: "Die Sprachantwort konnte nicht erzeugt werden." },
      { status: elevenLabsResponse.status || 502 },
    );
  }

  return new Response(elevenLabsResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Disposition": "inline",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const text = cleanSpeechText(request.nextUrl.searchParams.get("text"));
    return await createSpeechResponse(text);
  } catch (error) {
    console.error("Fehler bei der Sprachausgabe:", error);

    return NextResponse.json(
      { error: "Bei der Sprachausgabe ist ein interner Fehler aufgetreten." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { text?: unknown }
      | null;
    const text = cleanSpeechText(body?.text);

    return await createSpeechResponse(text);
  } catch (error) {
    console.error("Fehler bei der Sprachausgabe:", error);

    return NextResponse.json(
      { error: "Bei der Sprachausgabe ist ein interner Fehler aufgetreten." },
      { status: 500 },
    );
  }
}
