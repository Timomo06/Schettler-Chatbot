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

function getTimeZoneOffset(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const hour = Number(values.hour === "24" ? "0" : values.hour);
  const minute = Number(values.minute);
  const second = Number(values.second);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  return asUtc - date.getTime();
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
) {
  let utcTime = Date.UTC(year, month - 1, day, hour, minute, second);

  for (let i = 0; i < 3; i++) {
    const offset = getTimeZoneOffset(new Date(utcTime), timeZone);
    utcTime = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
  }

  return new Date(utcTime);
}

function parseLocalDateTimeInTimeZone(value: string, timeZone: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0"] = match;

  return zonedTimeToUtc(
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    timeZone
  );
}

function parseEventDate(value: unknown, timeZone: string) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  // Wenn kein Z oder Offset enthalten ist, behandeln wir die Zeit als lokale Geschäftszeit.
  // Beispiel: 2026-07-06T10:00:00 = 10:00 Uhr Europe/Berlin
  const hasExplicitTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(trimmed);

  if (!hasExplicitTimezone) {
    const localDate = parseLocalDateTimeInTimeZone(trimmed, timeZone);
    if (localDate && isValidDate(localDate)) return localDate;
  }

  const date = new Date(trimmed);
  return isValidDate(date) ? date : null;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function unfoldIcs(ics: string) {
  return String(ics || "").replace(/\r?\n[ \t]/g, "");
}

function getFirstVevent(ics: string) {
  const unfolded = unfoldIcs(ics);
  const match = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/i);
  return match ? match[0] : unfolded;
}

function getIcsProperty(ics: string, propertyName: string) {
  const eventBlock = getFirstVevent(ics);
  const regex = new RegExp(`^${propertyName}(?:;([^:]*))?:(.+)$`, "im");
  const match = eventBlock.match(regex);

  if (!match) return null;

  return {
    params: match[1] || "",
    value: (match[2] || "").trim(),
  };
}

function parseIcsDateValue(
  value: string,
  params: string,
  fallbackTimeZone: string
) {
  const cleanValue = value.trim();

  // UTC, z. B. 20260706T080000Z
  const utcMatch = cleanValue.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
  );

  if (utcMatch) {
    const [, year, month, day, hour, minute, second] = utcMatch;

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

  // Lokale Kalenderzeit, z. B. DTSTART;TZID=Europe/Berlin:20260706T100000
  const localMatch = cleanValue.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/
  );

  if (localMatch) {
    const [, year, month, day, hour, minute, second] = localMatch;
    const tzidMatch = params.match(/TZID=([^;:]+)/i);
    const timeZone = tzidMatch?.[1] || fallbackTimeZone;

    return zonedTimeToUtc(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      timeZone
    );
  }

  // Ganztägiger Termin, z. B. DTSTART;VALUE=DATE:20260706
  const dateOnlyMatch = cleanValue.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;

    return zonedTimeToUtc(
      Number(year),
      Number(month),
      Number(day),
      0,
      0,
      0,
      fallbackTimeZone
    );
  }

  return null;
}

function isBlockingCalendarObject(ics: string) {
  const eventBlock = getFirstVevent(ics);

  if (/^STATUS:CANCELLED$/im.test(eventBlock)) return false;
  if (/^TRANSP:TRANSPARENT$/im.test(eventBlock)) return false;

  return true;
}

function getEventTimesFromIcs(ics: string, timeZone: string) {
  if (!isBlockingCalendarObject(ics)) return null;

  const dtStart = getIcsProperty(ics, "DTSTART");
  const dtEnd = getIcsProperty(ics, "DTEND");

  if (!dtStart || !dtEnd) return null;

  const start = parseIcsDateValue(dtStart.value, dtStart.params, timeZone);
  const end = parseIcsDateValue(dtEnd.value, dtEnd.params, timeZone);

  if (!start || !end) return null;
  if (!isValidDate(start) || !isValidDate(end)) return null;

  return { start, end };
}

function normalizeTenant(value: unknown) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (
    raw.includes("mm-wartung") ||
    raw.includes("mmwartung") ||
    raw.includes("moritz") ||
    raw === "mm"
  ) {
    return "mm-wartung";
  }

  return "btdesigns";
}

function getTenantConfig(tenant: string) {
  const normalizedTenant = normalizeTenant(tenant);

  if (normalizedTenant === "mm-wartung") {
    return {
      tenant: "mm-wartung",
      businessName: "MM Wartung",
      defaultService: "Werkstatt Termin",
      source: "MM Wartung Website / AI Interface",
      uidDomain: "mm-wartung.de",
      prodId: "-//MM Wartung//Website Booking//DE",
      timeZone: cleanEnv(
        process.env.BUSINESS_TIMEZONE_MM_WARTUNG ||
          process.env.BUSINESS_TIMEZONE ||
          "Europe/Berlin"
      ),
      username: cleanEnv(process.env.ICLOUD_CALDAV_USER_MM_WARTUNG),
      password: cleanEnv(process.env.ICLOUD_CALDAV_PASSWORD_MM_WARTUNG),
      calendarName: cleanEnv(
        process.env.ICLOUD_CALENDAR_NAME_MM_WARTUNG || "MM Wartung Termine"
      ),
      missingEnvMessage:
        "ICLOUD_CALDAV_USER_MM_WARTUNG oder ICLOUD_CALDAV_PASSWORD_MM_WARTUNG fehlt in .env.local oder Vercel.",
    };
  }

  return {
    tenant: "btdesigns",
    businessName: "BTDesigns",
    defaultService: "BTDesigns Beratung",
    source: "BTDesigns Website / AI Interface",
    uidDomain: "btdesigns.de",
    prodId: "-//BTDesigns//Website Booking//DE",
    timeZone: cleanEnv(
      process.env.BUSINESS_TIMEZONE_BTDESIGNS ||
        process.env.BUSINESS_TIMEZONE ||
        "Europe/Berlin"
    ),

    // Bestehende BTDesigns-ENV funktioniert weiter.
    // Optional kannst du später auch die _BTDESIGNS-Variante nutzen.
    username: cleanEnv(
      process.env.ICLOUD_CALDAV_USER_BTDESIGNS ||
        process.env.ICLOUD_CALDAV_USER
    ),
    password: cleanEnv(
      process.env.ICLOUD_CALDAV_PASSWORD_BTDESIGNS ||
        process.env.ICLOUD_CALDAV_PASSWORD
    ),
    calendarName: cleanEnv(
      process.env.ICLOUD_CALENDAR_NAME_BTDESIGNS ||
        process.env.ICLOUD_CALENDAR_NAME ||
        "BTDesigns Termine"
    ),
    missingEnvMessage:
      "ICLOUD_CALDAV_USER oder ICLOUD_CALDAV_PASSWORD fehlt in .env.local oder Vercel.",
  };
}

async function getIcloudCalendar(config: ReturnType<typeof getTenantConfig>) {
  const username = config.username;
  const password = config.password;
  const calendarName = config.calendarName;

  if (!username || !password) {
    throw new Error(config.missingEnvMessage);
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

    return displayName.trim().toLowerCase() === calendarName.trim().toLowerCase();
  });

  if (!calendar) {
    throw new Error(
      `Kalender "${calendarName}" wurde für ${config.businessName} nicht gefunden. Gefunden: ${calendars
        .map((cal: any) => cal.displayName)
        .join(", ")}`
    );
  }

  return { client, calendar, calendarName };
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const body = await request.json();

    const tenantFromRequest =
      body.tenant ||
      body.tenantId ||
      body.business ||
      body.company ||
      url.searchParams.get("tenant");

    const config = getTenantConfig(tenantFromRequest);

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const service = String(body.service || config.defaultService).trim();
    const message = String(body.message || "").trim();
    const vehicle = String(body.vehicle || body.car || body.fahrzeug || "").trim();

    const start = parseEventDate(body.start, config.timeZone);
    const end = parseEventDate(body.end, config.timeZone);

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
            "Start oder Ende fehlt oder ist ungültig. Nutze ISO-Format, z. B. 2026-07-06T10:00:00 oder 2026-07-06T08:00:00.000Z",
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

    const { client, calendar, calendarName } = await getIcloudCalendar(config);

    const existingObjects = await client.fetchCalendarObjects({
      calendar,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });

    const hasConflict = existingObjects.some((object: any) => {
      const ics = String(object.data || "");
      const eventTimes = getEventTimesFromIcs(ics, config.timeZone);

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

    const uid = `${randomUUID()}@${config.uidDomain}`;
    const now = new Date();

    const title = `${config.businessName} Termin – ${service} – ${name}`;

    const description = [
      `Unternehmen: ${config.businessName}`,
      `Name: ${name}`,
      email ? `E-Mail: ${email}` : "",
      phone ? `Telefon: ${phone}` : "",
      service ? `Leistung: ${service}` : "",
      vehicle ? `Fahrzeug: ${vehicle}` : "",
      "",
      "Nachricht:",
      message || "Keine Nachricht angegeben.",
      "",
      `Quelle: ${config.source}`,
    ]
      .filter(Boolean)
      .join("\n");

    const iCalString = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:${config.prodId}`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toIcsDate(now)}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
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
      tenant: config.tenant,
      businessName: config.businessName,
      calendar: calendarName,
      event: {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        name,
        email,
        phone,
        service,
        vehicle,
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