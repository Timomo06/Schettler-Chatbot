import { NextRequest, NextResponse } from "next/server";
import { CalendarBookingError, listAvailableCalendarSlots } from "@/lib/calendar/apple-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date") || "";
    const result = await listAvailableCalendarSlots("profcar", date);
    return NextResponse.json({
      ok: true,
      date: result.date,
      durationMinutes: result.config.durationMinutes,
      timeZone: result.config.timeZone,
      slots: result.slots,
    }, { headers });
  } catch (error) {
    if (error instanceof CalendarBookingError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status, headers });
    }
    return NextResponse.json({ ok: false, code: "CALENDAR_CONNECTION_FAILED", error: "Der Kalender ist gerade nicht erreichbar." }, { status: 502, headers });
  }
}
