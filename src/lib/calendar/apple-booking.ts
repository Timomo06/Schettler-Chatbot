import "server-only";

import { createHash } from "crypto";
import { createDAVClient, type DAVCalendar } from "tsdav";

type CalendarClient = Awaited<ReturnType<typeof createDAVClient>>;

export const BUSINESS_TIME_ZONE = "Europe/Berlin";

export class CalendarBookingError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CalendarBookingError";
  }
}

type BookingWindow = { startMinutes: number; endMinutes: number };
export type WeeklyBookingWindows = Record<number, BookingWindow[]>;

export type CalendarTenantConfig = {
  tenant: "profcar" | "mm-wartung" | "btdesigns";
  businessName: string;
  defaultService: string;
  source: string;
  uidDomain: string;
  prodId: string;
  timeZone: string;
  username: string;
  password: string;
  calendarName: string;
  strictRules: boolean;
  durationMinutes: number;
  bufferMinutes: number;
  slotStepMinutes: number;
  bookingHorizonDays: number;
  windows: WeeklyBookingWindows | null;
};

export type CalendarBookingInput = {
  tenant?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  service?: unknown;
  message?: unknown;
  vehicle?: unknown;
  start?: unknown;
  end?: unknown;
  checkOnly?: unknown;
  idempotencyKey?: unknown;
};

export type AvailableSlot = { start: string; end: string };

function cleanEnv(value?: string) {
  return (value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\u00A0/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[‐-‒–—―−]/g, "-");
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeTenant(value: unknown): CalendarTenantConfig["tenant"] {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
  if (["profcar", "prof-car", "profcar-koeln", "profcar.com", "www.profcar.com"].includes(raw)) {
    return "profcar";
  }
  if (raw.includes("mm-wartung") || raw.includes("mmwartung") || raw.includes("moritz") || raw === "mm") {
    return "mm-wartung";
  }
  return "btdesigns";
}

function parseClock(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function parseBookingWindows(value: string): WeeklyBookingWindows {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new CalendarBookingError(
      "BOOKING_RULES_NOT_CONFIGURED",
      503,
      "Die buchbaren Zeiten für ProfCar sind noch nicht gültig konfiguriert.",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CalendarBookingError("BOOKING_RULES_NOT_CONFIGURED", 503, "Die buchbaren Zeiten für ProfCar fehlen.");
  }
  const windows: WeeklyBookingWindows = {};
  for (const [dayKey, rawWindows] of Object.entries(parsed as Record<string, unknown>)) {
    const day = Number(dayKey);
    if (!Number.isInteger(day) || day < 0 || day > 6 || !Array.isArray(rawWindows)) {
      throw new CalendarBookingError("BOOKING_RULES_NOT_CONFIGURED", 503, "Die buchbaren Zeiten für ProfCar sind ungültig.");
    }
    windows[day] = rawWindows.map(rawWindow => {
      if (!Array.isArray(rawWindow) || rawWindow.length !== 2) {
        throw new CalendarBookingError("BOOKING_RULES_NOT_CONFIGURED", 503, "Die buchbaren Zeiten für ProfCar sind ungültig.");
      }
      const startMinutes = parseClock(rawWindow[0]);
      const endMinutes = parseClock(rawWindow[1]);
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        throw new CalendarBookingError("BOOKING_RULES_NOT_CONFIGURED", 503, "Die buchbaren Zeiten für ProfCar sind ungültig.");
      }
      return { startMinutes, endMinutes };
    });
  }
  if (!Object.values(windows).some(entries => entries.length)) {
    throw new CalendarBookingError("BOOKING_RULES_NOT_CONFIGURED", 503, "Für ProfCar wurden noch keine buchbaren Zeiten festgelegt.");
  }
  return windows;
}

export function getCalendarTenantConfig(value: unknown): CalendarTenantConfig {
  const tenant = normalizeTenant(value);
  if (tenant === "profcar") {
    const durationRaw = process.env.PROFCAR_BOOKING_DURATION_MINUTES;
    const windowsRaw = process.env.PROFCAR_BOOKING_WINDOWS_JSON;
    const calendarName = cleanEnv(process.env.ICLOUD_CALENDAR_NAME_PROFCAR);
    if (!durationRaw || !windowsRaw || !calendarName) {
      throw new CalendarBookingError(
        "BOOKING_RULES_NOT_CONFIGURED",
        503,
        "Terminlänge, buchbare Zeiten oder Zielkalender für ProfCar sind noch nicht vollständig festgelegt.",
      );
    }
    const durationMinutes = positiveInteger(durationRaw, 0);
    if (!durationMinutes) {
      throw new CalendarBookingError("BOOKING_RULES_NOT_CONFIGURED", 503, "Die Terminlänge für ProfCar ist ungültig.");
    }
    const bufferMinutes = positiveInteger(process.env.PROFCAR_BOOKING_BUFFER_MINUTES, 30);
    const slotStepMinutes = positiveInteger(
      process.env.PROFCAR_BOOKING_SLOT_STEP_MINUTES,
      durationMinutes + bufferMinutes,
    );
    if (slotStepMinutes < durationMinutes + bufferMinutes) {
      throw new CalendarBookingError(
        "BOOKING_RULES_NOT_CONFIGURED",
        503,
        "Der Abstand zwischen ProfCar-Terminen muss Terminlänge und Puffer berücksichtigen.",
      );
    }
    return {
      tenant,
      businessName: "ProfCar",
      defaultService: "Probefahrt",
      source: "ProfCar Website / AI Interface",
      uidDomain: "profcar.com",
      prodId: "-//ProfCar//Website Booking//DE",
      timeZone: BUSINESS_TIME_ZONE,
      username: cleanEnv(process.env.ICLOUD_CALDAV_USER_PROFCAR),
      password: cleanEnv(process.env.ICLOUD_CALDAV_PASSWORD_PROFCAR),
      calendarName,
      strictRules: true,
      durationMinutes,
      bufferMinutes,
      slotStepMinutes,
      bookingHorizonDays: positiveInteger(process.env.PROFCAR_BOOKING_HORIZON_DAYS, 60),
      windows: parseBookingWindows(windowsRaw),
    };
  }
  if (tenant === "mm-wartung") {
    return {
      tenant,
      businessName: "MM Wartung",
      defaultService: "Werkstatt Termin",
      source: "MM Wartung Website / AI Interface",
      uidDomain: "mm-wartung.de",
      prodId: "-//MM Wartung//Website Booking//DE",
      timeZone: cleanEnv(process.env.BUSINESS_TIMEZONE_MM_WARTUNG || process.env.BUSINESS_TIMEZONE || BUSINESS_TIME_ZONE),
      username: cleanEnv(process.env.ICLOUD_CALDAV_USER_MM_WARTUNG),
      password: cleanEnv(process.env.ICLOUD_CALDAV_PASSWORD_MM_WARTUNG),
      calendarName: cleanEnv(process.env.ICLOUD_CALENDAR_NAME_MM_WARTUNG || "MM Wartung Termine"),
      strictRules: false,
      durationMinutes: 60,
      bufferMinutes: 0,
      slotStepMinutes: 30,
      bookingHorizonDays: 365,
      windows: null,
    };
  }
  return {
    tenant,
    businessName: "BTDesigns",
    defaultService: "BTDesigns Beratung",
    source: "BTDesigns Website / AI Interface",
    uidDomain: "btdesigns.de",
    prodId: "-//BTDesigns//Website Booking//DE",
    timeZone: cleanEnv(process.env.BUSINESS_TIMEZONE_BTDESIGNS || process.env.BUSINESS_TIMEZONE || BUSINESS_TIME_ZONE),
    username: cleanEnv(process.env.ICLOUD_CALDAV_USER_BTDESIGNS || process.env.ICLOUD_CALDAV_USER),
    password: cleanEnv(process.env.ICLOUD_CALDAV_PASSWORD_BTDESIGNS || process.env.ICLOUD_CALDAV_PASSWORD),
    calendarName: cleanEnv(process.env.ICLOUD_CALENDAR_NAME_BTDESIGNS || process.env.ICLOUD_CALENDAR_NAME || "BTDesigns Termine"),
    strictRules: false,
    durationMinutes: 30,
    bufferMinutes: 0,
    slotStepMinutes: 30,
    bookingHorizonDays: 365,
    windows: null,
  };
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
  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour === "24" ? "0" : values.hour),
    Number(values.minute),
    Number(values.second),
  ) - date.getTime();
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
) {
  let utcTime = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffset(new Date(utcTime), timeZone);
    utcTime = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
  }
  return new Date(utcTime);
}

export function parseEventDate(value: unknown, timeZone: string) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const localMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (localMatch) {
    return zonedTimeToUtc(
      Number(localMatch[1]),
      Number(localMatch[2]),
      Number(localMatch[3]),
      Number(localMatch[4]),
      Number(localMatch[5]),
      Number(localMatch[6] || 0),
      timeZone,
    );
  }
  const date = new Date(trimmed);
  return isValidDate(date) ? date : null;
}

function localParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: weekdays[values.weekday],
    minutes: Number(values.hour === "24" ? "0" : values.hour) * 60 + Number(values.minute),
    date: `${values.year}-${values.month}-${values.day}`,
  };
}

function daysBetweenLocalDates(left: string, right: string) {
  const [ly, lm, ld] = left.split("-").map(Number);
  const [ry, rm, rd] = right.split("-").map(Number);
  return Math.round((Date.UTC(ry, rm - 1, rd) - Date.UTC(ly, lm - 1, ld)) / 86_400_000);
}

export function validateBookingRules(start: Date, end: Date, config: CalendarTenantConfig, now = new Date()) {
  if (end <= start) throw new CalendarBookingError("INVALID_TIME_RANGE", 400, "Endzeit muss nach Startzeit liegen.");
  if (!config.strictRules) return;
  const duration = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (duration !== config.durationMinutes) {
    throw new CalendarBookingError("INVALID_DURATION", 400, `ProfCar-Termine dauern ${config.durationMinutes} Minuten.`);
  }
  const startLocal = localParts(start, config.timeZone);
  const endLocal = localParts(end, config.timeZone);
  if (startLocal.date !== endLocal.date) {
    throw new CalendarBookingError("OUTSIDE_BOOKING_HOURS", 400, "Der Termin muss am selben Kalendertag enden.");
  }
  const todayLocal = localParts(now, config.timeZone).date;
  const distance = daysBetweenLocalDates(todayLocal, startLocal.date);
  if (start.getTime() <= now.getTime() || distance < 0 || distance > config.bookingHorizonDays) {
    throw new CalendarBookingError("OUTSIDE_BOOKING_HORIZON", 400, "Dieser Termin liegt außerhalb des buchbaren Zeitraums.");
  }
  if (startLocal.minutes % config.slotStepMinutes !== 0) {
    throw new CalendarBookingError("INVALID_SLOT_STEP", 400, "Bitte wähle eine angebotene Startzeit.");
  }
  const windows = config.windows?.[startLocal.weekday] ?? [];
  const allowed = windows.some(window =>
    startLocal.minutes >= window.startMinutes && endLocal.minutes <= window.endMinutes,
  );
  if (!allowed) throw new CalendarBookingError("OUTSIDE_BOOKING_HOURS", 400, "Diese Zeit ist für ProfCar nicht buchbar.");
}

function unfoldIcs(ics: string) {
  return String(ics || "").replace(/\r?\n[ \t]/g, "");
}

function property(eventBlock: string, name: string) {
  const match = eventBlock.match(new RegExp(`^${name}(?:;([^:]*))?:(.+)$`, "im"));
  return match ? { params: match[1] || "", value: (match[2] || "").trim() } : null;
}

function parseIcsDateValue(value: string, params: string, fallbackTimeZone: string) {
  const utc = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (utc) return new Date(Date.UTC(+utc[1], +utc[2] - 1, +utc[3], +utc[4], +utc[5], +utc[6]));
  const local = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (local) {
    const tzid = params.match(/TZID=(?:"([^"]+)"|([^;:]+))/i);
    return zonedTimeToUtc(+local[1], +local[2], +local[3], +local[4], +local[5], +local[6], tzid?.[1] || tzid?.[2] || fallbackTimeZone);
  }
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  return dateOnly ? zonedTimeToUtc(+dateOnly[1], +dateOnly[2], +dateOnly[3], 0, 0, 0, fallbackTimeZone) : null;
}

function parseDuration(value: string) {
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!match) return null;
  return ((Number(match[1] || 0) * 24 * 60 + Number(match[2] || 0) * 60 + Number(match[3] || 0)) * 60 + Number(match[4] || 0)) * 1000;
}

export type CalendarInterval = { start: Date; end: Date; uid: string | null; bookingId: string | null };

export function extractCalendarIntervals(ics: string, timeZone: string): CalendarInterval[] {
  const unfolded = unfoldIcs(ics);
  const blocks = [...unfolded.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gi)].map(match => match[0]);
  return blocks.flatMap(block => {
    if (/^STATUS:CANCELLED$/im.test(block) || /^TRANSP:TRANSPARENT$/im.test(block)) return [];
    const startProperty = property(block, "DTSTART");
    const endProperty = property(block, "DTEND");
    if (!startProperty) return [];
    const start = parseIcsDateValue(startProperty.value, startProperty.params, timeZone);
    let end = endProperty ? parseIcsDateValue(endProperty.value, endProperty.params, timeZone) : null;
    if (!end) {
      const durationProperty = property(block, "DURATION");
      const duration = durationProperty ? parseDuration(durationProperty.value) : null;
      if (start && duration !== null) end = new Date(start.getTime() + duration);
    }
    if (!start || !end || !isValidDate(start) || !isValidDate(end) || end <= start) return [];
    return [{
      start,
      end,
      uid: property(block, "UID")?.value || null,
      bookingId: property(block, "X-PROFCAR-BOOKING-ID")?.value || null,
    }];
  });
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

export function bookingConflictsWithInterval(
  start: Date,
  end: Date,
  intervalStart: Date,
  intervalEnd: Date,
  bufferMinutes: number,
) {
  const bufferMs = Math.max(0, bufferMinutes) * 60_000;
  return overlaps(
    start,
    new Date(end.getTime() + bufferMs),
    intervalStart,
    new Date(intervalEnd.getTime() + bufferMs),
  );
}

function bufferedQueryRange(start: Date, end: Date, bufferMinutes: number) {
  const bufferMs = Math.max(0, bufferMinutes) * 60_000;
  return {
    start: new Date(start.getTime() - bufferMs),
    end: new Date(end.getTime() + bufferMs),
  };
}

async function connect(config: CalendarTenantConfig) {
  if (!config.username || !config.password) {
    throw new CalendarBookingError("CALENDAR_NOT_CONFIGURED", 503, `Der Apple-Kalender für ${config.businessName} ist noch nicht verbunden.`);
  }
  const calendarFetch: typeof fetch = (input, init: RequestInit = {}) => {
    const timeoutSignal = AbortSignal.timeout(12_000);
    const signal = init.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;
    // Keep tsdav's redirect mode intact. Its iCloud discovery deliberately
    // requests manual redirects so it can move from caldav.icloud.com to the
    // account's partition host without forwarding credentials blindly. A
    // forced redirect:error leaves reads on the global proxy, where Apple
    // accepts REPORT requests but rejects object PUTs with 401.
    return fetch(input, { ...init, signal, cache: "no-store" });
  };
  const client = await createDAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username: config.username, password: config.password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
    fetch: calendarFetch,
  });
  const calendars = await client.fetchCalendars();
  const discoveredCalendar = calendars.find(candidate => String(candidate.displayName || "").trim().toLocaleLowerCase("de-DE") === config.calendarName.toLocaleLowerCase("de-DE"));
  if (!discoveredCalendar) {
    throw new CalendarBookingError("CALENDAR_NOT_FOUND", 503, `Der konfigurierte Zielkalender für ${config.businessName} wurde nicht gefunden.`);
  }
  // A CalDAV object URL must be a child of the calendar collection. Without
  // the trailing slash, URL resolution replaces the collection id and Apple
  // answers the resulting PUT with 401 even though reads still succeed.
  const discoveredUrlHadTrailingSlash = discoveredCalendar.url.endsWith("/");
  const calendar = {
    ...discoveredCalendar,
    url: discoveredUrlHadTrailingSlash ? discoveredCalendar.url : `${discoveredCalendar.url}/`,
  };
  return { client, calendar, discoveredUrlHadTrailingSlash };
}

async function intervalsForRange(
  client: CalendarClient,
  calendar: DAVCalendar,
  start: Date,
  end: Date,
  timeZone: string,
) {
  const objects = await client.fetchCalendarObjects({
    calendar,
    timeRange: { start: start.toISOString(), end: end.toISOString() },
    expand: true,
  });
  return objects.flatMap(object => extractCalendarIntervals(String(object.data || ""), timeZone));
}

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(text: string) {
  return String(text || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function foldIcsLine(line: string) {
  if (Buffer.byteLength(line, "utf8") <= 75) return [line];
  const folded: string[] = [];
  let current = "";
  for (const character of line) {
    if (current && Buffer.byteLength(current + character, "utf8") > 75) {
      folded.push(current);
      current = ` ${character}`;
    } else {
      current += character;
    }
  }
  if (current) folded.push(current);
  return folded;
}

function stableBookingId(config: CalendarTenantConfig, input: CalendarBookingInput, start: Date, end: Date) {
  const explicit = String(input.idempotencyKey || "").trim().slice(0, 200);
  const material = explicit || [
    config.tenant,
    start.toISOString(),
    end.toISOString(),
    String(input.email || "").trim().toLowerCase(),
    String(input.phone || "").replace(/\s+/g, ""),
    String(input.vehicle || "").trim().toLowerCase(),
  ].join("|");
  const digest = createHash("sha256").update(material).digest("hex").slice(0, 14).toUpperCase();
  return `${config.tenant === "profcar" ? "PC" : "BK"}-${digest}`;
}

export function calendarObjectFilename(config: Pick<CalendarTenantConfig, "tenant">, start: Date, end: Date) {
  const digest = createHash("sha256")
    .update(`${config.tenant}|${start.toISOString()}|${end.toISOString()}`)
    .digest("hex")
    .slice(0, 20);
  return `${config.tenant}-slot-${digest}.ics`;
}

export function buildCalendarObject({
  config,
  bookingId,
  uid,
  start,
  end,
  title,
  description,
}: {
  config: Pick<CalendarTenantConfig, "prodId">;
  bookingId: string;
  uid: string;
  start: Date;
  end: Date;
  title: string;
  description: string;
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${config.prodId}`,
    "CALSCALE:GREGORIAN",
    // CalDAV calendar object resources must not contain METHOD. Apple
    // rejects METHOD:PUBLISH on PUT even though calendar reads still work.
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `X-PROFCAR-BOOKING-ID:${bookingId}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // RFC 5545 limits content lines to 75 UTF-8 octets and requires folded
  // continuation lines. Long vehicle names and customer notes otherwise make
  // Apple reject an otherwise valid CalDAV PUT.
  return `${lines.flatMap(foldIcsLine).join("\r\n")}\r\n`;
}

function collectPrivilegeNames(value: unknown, names = new Set<string>()) {
  if (!value || typeof value !== "object") return names;
  if (Array.isArray(value)) {
    value.forEach(entry => collectPrivilegeNames(entry, names));
    return names;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!key.startsWith("_")) names.add(key.toLowerCase().replace(/[^a-z]/g, ""));
    collectPrivilegeNames(entry, names);
  }
  return names;
}

export async function inspectCalendarAccess(tenant: unknown) {
  const config = getCalendarTenantConfig(tenant);
  const { client, calendar, discoveredUrlHadTrailingSlash } = await connect(config);
  const responses = await client.propfind({
    url: calendar.url,
    props: { "d:current-user-privilege-set": {} },
    depth: "0",
  });
  const response = responses.find(entry => entry.ok) ?? responses[0];
  const privilegeSet = response?.props?.currentUserPrivilegeSet;
  const names = collectPrivilegeNames(privilegeSet);
  const writable = names.has("all") || names.has("write") || names.has("writecontent");
  const calendarUrl = new URL(calendar.url);
  return {
    tenant: config.tenant,
    businessName: config.businessName,
    calendarName: config.calendarName,
    readable: true,
    writable,
    privilegeInformationAvailable: privilegeSet !== undefined,
    privileges: [...names].filter(name => ["all", "read", "write", "writecontent", "writeproperties", "bind", "unbind"].includes(name)).sort(),
    collectionHost: calendarUrl.hostname,
    discoveredUrlHadTrailingSlash,
    normalizedCollectionUrlHasTrailingSlash: calendar.url.endsWith("/"),
  };
}

const bookingQueues = new Map<string, Promise<void>>();

async function withBookingLock<T>(key: string, action: () => Promise<T>) {
  const previous = bookingQueues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const queued = previous.then(() => gate);
  bookingQueues.set(key, queued);
  await previous;
  try {
    return await action();
  } finally {
    release();
    if (bookingQueues.get(key) === queued) bookingQueues.delete(key);
  }
}

function parsedRange(input: CalendarBookingInput, config: CalendarTenantConfig) {
  const start = parseEventDate(input.start, config.timeZone);
  const end = parseEventDate(input.end, config.timeZone);
  if (!start || !end) throw new CalendarBookingError("INVALID_TIME_RANGE", 400, "Start oder Ende fehlt oder ist ungültig.");
  validateBookingRules(start, end, config);
  return { start, end };
}

export async function checkCalendarAvailability(input: CalendarBookingInput) {
  const config = getCalendarTenantConfig(input.tenant);
  const { start, end } = parsedRange(input, config);
  const { client, calendar } = await connect(config);
  const query = bufferedQueryRange(start, end, config.bufferMinutes);
  const intervals = await intervalsForRange(client, calendar, query.start, query.end, config.timeZone);
  const available = !intervals.some(interval =>
    bookingConflictsWithInterval(start, end, interval.start, interval.end, config.bufferMinutes),
  );
  return { config, start, end, available };
}

export async function createCalendarBooking(input: CalendarBookingInput) {
  const config = getCalendarTenantConfig(input.tenant);
  const { start, end } = parsedRange(input, config);
  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim();
  const phone = String(input.phone || "").trim();
  const service = String(input.service || config.defaultService).trim();
  const message = String(input.message || "").trim();
  const vehicle = String(input.vehicle || "").trim();
  if (!name) throw new CalendarBookingError("MISSING_NAME", 400, "Name fehlt.");
  if (config.tenant === "profcar" && (!email || !phone)) {
    throw new CalendarBookingError("MISSING_CONTACT", 400, "E-Mail und Telefonnummer fehlen oder sind unvollständig.");
  }
  if (!email && !phone) throw new CalendarBookingError("MISSING_CONTACT", 400, "E-Mail oder Telefonnummer fehlt.");
  if (config.tenant === "profcar" && /probefahrt/i.test(service) && !vehicle) {
    throw new CalendarBookingError("MISSING_VEHICLE", 400, "Für eine Probefahrt fehlt das Wunschfahrzeug.");
  }
  const bookingId = stableBookingId(config, input, start, end);
  const uid = `${bookingId.toLowerCase()}@${config.uidDomain}`;
  return withBookingLock(`${config.tenant}:${start.toISOString().slice(0, 10)}`, async () => {
    const { client, calendar } = await connect(config);
    // This is the authoritative check immediately before the write.
    const query = bufferedQueryRange(start, end, config.bufferMinutes);
    const intervals = await intervalsForRange(client, calendar, query.start, query.end, config.timeZone);
    const existing = intervals.find(interval => interval.bookingId === bookingId || interval.uid === uid);
    if (existing) {
      return { config, bookingId, uid, start, end, service, vehicle, alreadyExisted: true };
    }
    if (intervals.some(interval =>
      bookingConflictsWithInterval(start, end, interval.start, interval.end, config.bufferMinutes),
    )) {
      throw new CalendarBookingError("SLOT_CONFLICT", 409, "Der Zeitraum ist bereits belegt. Bitte wähle eine andere Uhrzeit.");
    }
    const title = `${config.businessName} Termin – ${service} – ${name}`;
    const description = [
      `Buchungs-ID: ${bookingId}`,
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
    ].filter(Boolean).join("\n");
    const iCalString = buildCalendarObject({
      config,
      bookingId,
      uid,
      start,
      end,
      title,
      description,
    });
    const result = await client.createCalendarObject({
      calendar,
      // Same time range always uses the same CalDAV resource. Together with
      // If-None-Match this prevents two app instances from writing the same slot.
      filename: calendarObjectFilename(config, start, end),
      iCalString,
      headers: { "If-None-Match": "*" },
    });
    if (!result.ok) {
      const responseBody = await result.clone().text().catch(() => "");
      console.error("ProfCar CalDAV write failed", {
        tenant: config.tenant,
        status: result.status,
        statusText: result.statusText,
        collectionHost: new URL(calendar.url).hostname,
        collectionUrlHasTrailingSlash: calendar.url.endsWith("/"),
        authenticate: result.headers.get("www-authenticate"),
        responseBody: responseBody.slice(0, 500),
      });
      if (result.status === 401) {
        throw new CalendarBookingError(
          "CALENDAR_WRITE_UNAUTHORIZED",
          503,
          "Apple hat den Schreibzugriff abgelehnt. Der Kalenderzugang muss neu bestätigt werden.",
        );
      }
      if (result.status === 409 || result.status === 412) {
        const afterConflict = await intervalsForRange(client, calendar, query.start, query.end, config.timeZone);
        if (afterConflict.some(interval => interval.bookingId === bookingId || interval.uid === uid)) {
          return { config, bookingId, uid, start, end, service, vehicle, alreadyExisted: true };
        }
        if (afterConflict.some(interval =>
          bookingConflictsWithInterval(start, end, interval.start, interval.end, config.bufferMinutes),
        )) {
          throw new CalendarBookingError("SLOT_CONFLICT", 409, "Der Zeitraum ist bereits belegt. Bitte wähle eine andere Uhrzeit.");
        }
      }
      throw new CalendarBookingError("CALENDAR_WRITE_FAILED", 502, "Der Apple-Kalender hat den Termin nicht bestätigt.");
    }
    return { config, bookingId, uid, start, end, service, vehicle, alreadyExisted: false };
  });
}

export async function listAvailableCalendarSlots(tenant: unknown, dateValue: string) {
  const config = getCalendarTenantConfig(tenant);
  if (!config.strictRules || !config.windows) {
    throw new CalendarBookingError("AVAILABILITY_NOT_SUPPORTED", 400, "Für diesen Kalender ist keine Slot-Liste konfiguriert.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw new CalendarBookingError("INVALID_DATE", 400, "Das Datum ist ungültig.");
  }
  const [year, month, day] = dateValue.split("-").map(Number);
  const midday = zonedTimeToUtc(year, month, day, 12, 0, 0, config.timeZone);
  const parts = localParts(midday, config.timeZone);
  if (parts.date !== dateValue) throw new CalendarBookingError("INVALID_DATE", 400, "Das Datum ist ungültig.");
  const todayLocal = localParts(new Date(), config.timeZone).date;
  const distance = daysBetweenLocalDates(todayLocal, dateValue);
  if (distance < 0 || distance > config.bookingHorizonDays) {
    throw new CalendarBookingError("OUTSIDE_BOOKING_HORIZON", 400, "Dieser Termin liegt außerhalb des buchbaren Zeitraums.");
  }
  const dayWindows = config.windows[parts.weekday] ?? [];
  const slots: AvailableSlot[] = [];
  if (!dayWindows.length) return { config, date: dateValue, slots };
  const rangeStart = zonedTimeToUtc(year, month, day, 0, 0, 0, config.timeZone);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const rangeEnd = zonedTimeToUtc(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate(), 0, 0, 0, config.timeZone);
  const { client, calendar } = await connect(config);
  const intervals = await intervalsForRange(client, calendar, rangeStart, rangeEnd, config.timeZone);
  for (const window of dayWindows) {
    for (let minute = window.startMinutes; minute + config.durationMinutes <= window.endMinutes; minute += config.slotStepMinutes) {
      const start = zonedTimeToUtc(year, month, day, Math.floor(minute / 60), minute % 60, 0, config.timeZone);
      const end = new Date(start.getTime() + config.durationMinutes * 60_000);
      if (start <= new Date()) continue;
      if (!intervals.some(interval =>
        bookingConflictsWithInterval(start, end, interval.start, interval.end, config.bufferMinutes),
      )) {
        slots.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
  }
  return { config, date: dateValue, slots };
}
