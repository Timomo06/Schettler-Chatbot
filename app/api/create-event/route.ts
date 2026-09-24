import { NextRequest, NextResponse } from "next/server";
import {
  CalendarBookingError,
  checkCalendarAvailability,
  createCalendarBooking,
  type CalendarBookingInput,
} from "@/lib/calendar/apple-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedOrigins = new Set([
  "https://btdesigns.de",
  "https://www.btdesigns.de",
  "https://mm-wartung.de",
  "https://www.mm-wartung.de",
  "https://profcar.com",
  "https://www.profcar.com",
  "https://schettlers-chatbot-lca3.vercel.app",
  "https://ai.btdesigns.de",
  "http://localhost:3000",
]);

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function errorResponse(error: unknown) {
  if (error instanceof CalendarBookingError) {
    return NextResponse.json(
      { ok: false, success: false, error: error.message, code: error.code },
      { status: error.status, headers: noStoreHeaders },
    );
  }
  return NextResponse.json(
    { ok: false, success: false, error: "Der Kalender ist gerade nicht erreichbar.", code: "CALENDAR_CONNECTION_FAILED" },
    { status: 502, headers: noStoreHeaders },
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    return NextResponse.json({ ok: false, success: false, error: "Forbidden" }, { status: 403, headers: noStoreHeaders });
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 20_000) {
    return NextResponse.json({ ok: false, success: false, error: "Anfrage zu groß." }, { status: 413, headers: noStoreHeaders });
  }
  let body: CalendarBookingInput;
  try {
    body = await request.json() as CalendarBookingInput;
  } catch {
    return NextResponse.json({ ok: false, success: false, error: "Ungültige Anfrage." }, { status: 400, headers: noStoreHeaders });
  }
  try {
    if (body.checkOnly === true) {
      const result = await checkCalendarAvailability(body);
      if (!result.available) {
        return NextResponse.json(
          { ok: false, success: false, available: false, error: "Der Zeitraum ist bereits belegt.", code: "SLOT_CONFLICT" },
          { status: 409, headers: noStoreHeaders },
        );
      }
      return NextResponse.json({
        ok: true,
        success: true,
        available: true,
        start: result.start.toISOString(),
        end: result.end.toISOString(),
      }, { headers: noStoreHeaders });
    }
    const result = await createCalendarBooking(body);
    return NextResponse.json({
      ok: true,
      success: true,
      message: "Termin wurde erstellt.",
      bookingId: result.bookingId,
      tenant: result.config.tenant,
      businessName: result.config.businessName,
      calendar: result.config.calendarName,
      alreadyExisted: result.alreadyExisted,
      event: {
        start: result.start.toISOString(),
        end: result.end.toISOString(),
        service: result.service,
        vehicle: result.vehicle,
      },
    }, { headers: noStoreHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}
