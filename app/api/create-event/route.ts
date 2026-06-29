import { NextResponse } from "next/server";
import { createDAVClient } from "tsdav";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function cleanEnv(value?: string) {
  return (value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\u00A0/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[‐-‒–—―−]/g, "-");
}

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(text: string) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function isValidDate(date: Date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function parseEventDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return isValidDate(date) ? date : null;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function parseIcsDate(value: string) {
  // Unterstützt UTC-Format wie 20260629T155200Z
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
  );

  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  );
}

function getEventTimesFromIcs(ics: string) {
  const dtStartMatch = ics.match(/DTSTART(?:;[^:]*)?:(\d{8}T\d{6}Z)/);
  const dtEndMatch = ics.match(/DTEND(?:;[^:]*)?:(\d{8}T\d{6}Z)/);

  if (!dtStartMatch || !dtEndMatch) return null;

  const start = parseIcsDate(dtStartMatch[1]);
  const end = parseIcsDate(dtEndMatch[1]);

  if (!start || !end) return null;

  return { start, end };
}

async function getIcloudCalendar() {
  const username = cleanEnv(process.env.ICLOUD_CALDAV_USER);
  const password = cleanEnv(process.env.ICLOUD_CALDAV_PASSWORD);
  const calendarName = cleanEnv(
    process.env.ICLOUD_CALENDAR_NAME || "BTDesigns Termine"
  );

  if (!username || !password) {
    throw new Error(
      "ICLOUD_CALDAV_USER oder ICLOUD_CALDAV_PASSWORD fehlt in .env.local oder Vercel."
    );
  }

  const client = await createDAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: {
      username,
      password,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  const calendars = await client.fetchCalendars();

  const calendar = calendars.find((cal: any) => {
    const displayName =
      typeof cal.displayName === "string"
        ? cal.displayName
        : String(cal.displayName || "");

    return displayName.trim() === calendarName.trim();
  });

  if (!calendar) {
    throw new Error(
      `Kalender "${calendarName}" wurde nicht gefunden. Gefunden: ${calendars
        .map((cal: any) => cal.displayName)
        .join(", ")}`
    );
  }

  return { client, calendar, calendarName };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const service = String(body.service || "BTDesigns Beratung").trim();
    const message = String(body.message || "").trim();

    const start = parseEventDate(body.start);
    const end = parseEventDate(body.end);

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Name fehlt." },
        { status: 400 }
      );
    }

    if (!start || !end) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Start oder Ende fehlt oder ist ungültig. Nutze ISO-Format, z. B. 2026-06-30T10:00:00.000Z",
        },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { ok: false, error: "Endzeit muss nach Startzeit liegen." },
        { status: 400 }
      );
    }

    const { client, calendar, calendarName } = await getIcloudCalendar();

    // Bestehende Termine für den Zeitraum laden
    const existingObjects = await client.fetchCalendarObjects({
      calendar,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });

    const hasConflict = existingObjects.some((object: any) => {
      const ics = String(object.data || "");
      const eventTimes = getEventTimesFromIcs(ics);

      if (!eventTimes) return false;

      return overlaps(start, end, eventTimes.start, eventTimes.end);
    });

    if (hasConflict) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Der Zeitraum ist bereits belegt. Bitte wähle eine andere Uhrzeit.",
        },
        { status: 409 }
      );
    }

    const uid = `${randomUUID()}@btdesigns.de`;
    const now = new Date();

    const title = `BTDesigns Anfrage – ${service} – ${name}`;

    const description = [
      `Name: ${name}`,
      email ? `E-Mail: ${email}` : "",
      phone ? `Telefon: ${phone}` : "",
      service ? `Leistung: ${service}` : "",
      "",
      "Nachricht:",
      message || "Keine Nachricht angegeben.",
      "",
      "Quelle: BTDesigns Website / AI Interface",
    ]
      .filter(Boolean)
      .join("\n");

    const iCalString = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BTDesigns//Website Booking//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toIcsDate(now)}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      "STATUS:CONFIRMED",
      `SUMMARY:${escapeIcsText(title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const result = await client.createCalendarObject({
      calendar,
      filename: `${uid}.ics`,
      iCalString,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "iCloud hat den Termin abgelehnt.",
          status: result.status,
          statusText: result.statusText,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Termin wurde erstellt.",
      calendar: calendarName,
      event: {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        name,
        email,
        phone,
        service,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}