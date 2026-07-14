import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY ist nicht hinterlegt.");

      return NextResponse.json(
        {
          error: "Die Sprachfunktion ist serverseitig nicht konfiguriert.",
        },
        { status: 500 }
      );
    }

    const incomingFormData = await request.formData();
    const audio = incomingFormData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        {
          error: "Es wurde keine gültige Audioaufnahme übermittelt.",
        },
        { status: 400 }
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        {
          error: "Die Audioaufnahme ist leer.",
        },
        { status: 400 }
      );
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        {
          error: "Die Audioaufnahme ist zu groß.",
        },
        { status: 413 }
      );
    }

    const elevenLabsFormData = new FormData();

    elevenLabsFormData.append(
      "file",
      audio,
      audio.name || "aufnahme.webm"
    );

    elevenLabsFormData.append("model_id", "scribe_v2");
    elevenLabsFormData.append("language_code", "de");
    elevenLabsFormData.append("tag_audio_events", "false");
    elevenLabsFormData.append("diarize", "false");
    elevenLabsFormData.append("timestamps_granularity", "none");

    const elevenLabsResponse = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
        body: elevenLabsFormData,
        cache: "no-store",
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();

      console.error(
        "ElevenLabs Speech-to-Text Fehler:",
        elevenLabsResponse.status,
        errorText
      );

      return NextResponse.json(
        {
          error: "Die Sprache konnte nicht verarbeitet werden.",
        },
        { status: elevenLabsResponse.status }
      );
    }

    const result = (await elevenLabsResponse.json()) as {
      text?: string;
      language_code?: string;
      language_probability?: number;
    };

    const transcript = result.text?.trim();

    if (!transcript) {
      return NextResponse.json(
        {
          error: "Es konnte kein gesprochener Text erkannt werden.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      text: transcript,
      language: result.language_code ?? "de",
    });
  } catch (error) {
    console.error("Fehler bei der Spracherkennung:", error);

    return NextResponse.json(
      {
        error: "Bei der Spracherkennung ist ein interner Fehler aufgetreten.",
      },
      { status: 500 }
    );
  }
}