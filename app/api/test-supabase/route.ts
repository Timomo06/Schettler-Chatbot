import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("chat_logs")
      .select("*")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase Verbindung funktioniert",
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}