import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 3_000;

type SpeakRequestBody = {
  text?: unknown;
};

function prepareTextForSpeech(value: string) {
  return value
    // Markdown-Links nur als lesbaren Text behalten
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    // Webadressen nicht vorlesen
    .replace(/https?:\/\/\S+/gi, "")
    // Einfache Markdown-Zeichen entfernen
    .replace(/[*_#>`~]/g, "")
    // Zu viele Leerzeichen und Absätze reduzieren
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY fehlt.");

      return NextResponse.json(
        {
          error: "Die ElevenLabs-API ist serverseitig nicht eingerichtet.",
        },
        { status: 500 }
      );
    }

    if (!voiceId) {
      console.error("ELEVENLABS_VOICE_ID fehlt.");

      return NextResponse.json(
        {
          error: "Die ElevenLabs-Stimme ist serverseitig nicht eingerichtet.",
        },
        { status: 500 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as SpeakRequestBody | null;

    if (!body || typeof body.text !== "string") {
      return NextResponse.json(
        {
          error: "Es wurde kein gültiger Text übermittelt.",
        },
        { status: 400 }
      );
    }

    const preparedText = prepareTextForSpeech(body.text);

    if (!preparedText) {
      return NextResponse.json(
        {
          error: "Der übermittelte Text ist leer.",
        },
        { status: 400 }
      );
    }

    // Schützt vor unnötig langen und teuren Sprachausgaben.
    const textForSpeech = preparedText.slice(0, MAX_TEXT_LENGTH);

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        voiceId
      )}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: textForSpeech,
          model_id: "eleven_flash_v2_5",
          language_code: "de",
        }),
        cache: "no-store",
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();

      console.error(
        "ElevenLabs Text-to-Speech Fehler:",
        elevenLabsResponse.status,
        errorText
      );

      return NextResponse.json(
        {
          error:
            elevenLabsResponse.status === 429
              ? "Das Sprachlimit wurde vorübergehend erreicht."
              : "Die gesprochene Antwort konnte nicht erzeugt werden.",
        },
        {
          status: elevenLabsResponse.status === 429 ? 429 : 502,
        }
      );
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        {
          error: "ElevenLabs hat keine Audiodatei zurückgegeben.",
        },
        { status: 502 }
      );
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": 'inline; filename="btai-antwort.mp3"',
      },
    });
  } catch (error) {
    console.error("Fehler bei ElevenLabs Text-to-Speech:", error);

    return NextResponse.json(
      {
        error:
          "Bei der Erstellung der gesprochenen Antwort ist ein technischer Fehler aufgetreten.",
      },
      { status: 500 }
    );
  }
}