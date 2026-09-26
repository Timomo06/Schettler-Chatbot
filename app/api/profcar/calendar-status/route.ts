import { NextResponse } from "next/server";
import { CalendarBookingError, inspectCalendarAccess } from "@/lib/calendar/apple-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  try {
    const status = await inspectCalendarAccess("profcar");
    return NextResponse.json({ ok: true, ...status }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof CalendarBookingError) {
      return NextResponse.json(
        { ok: false, readable: false, writable: false, code: error.code, error: error.message },
        { status: error.status, headers: noStoreHeaders },
      );
    }
    return NextResponse.json(
      { ok: false, readable: false, writable: false, code: "CALENDAR_CONNECTION_FAILED" },
      { status: 502, headers: noStoreHeaders },
    );
  }
}
