import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarObjectFilename,
  extractCalendarIntervals,
  getCalendarTenantConfig,
  parseBookingWindows,
  parseEventDate,
  validateBookingRules,
} from "./apple-booking";

test("ProfCar rules are explicit and timezone-safe", () => {
  const previous = {
    duration: process.env.PROFCAR_BOOKING_DURATION_MINUTES,
    windows: process.env.PROFCAR_BOOKING_WINDOWS_JSON,
    calendar: process.env.ICLOUD_CALENDAR_NAME_PROFCAR,
  };
  process.env.PROFCAR_BOOKING_DURATION_MINUTES = "60";
  process.env.PROFCAR_BOOKING_WINDOWS_JSON = JSON.stringify({ 1: [["08:00", "18:00"]], 6: [["08:00", "15:00"]] });
  process.env.ICLOUD_CALENDAR_NAME_PROFCAR = "ProfCar Termine";
  try {
    const config = getCalendarTenantConfig("profcar");
    const start = parseEventDate("2026-09-28T10:00:00", "Europe/Berlin");
    assert.equal(start?.toISOString(), "2026-09-28T08:00:00.000Z");
    const end = new Date(start!.getTime() + 60 * 60_000);
    assert.doesNotThrow(() => validateBookingRules(start!, end, config, new Date("2026-09-24T08:00:00Z")));
    assert.throws(
      () => validateBookingRules(start!, new Date(start!.getTime() + 30 * 60_000), config, new Date("2026-09-24T08:00:00Z")),
      { message: "ProfCar-Termine dauern 60 Minuten." },
    );
  } finally {
    if (previous.duration === undefined) delete process.env.PROFCAR_BOOKING_DURATION_MINUTES;
    else process.env.PROFCAR_BOOKING_DURATION_MINUTES = previous.duration;
    if (previous.windows === undefined) delete process.env.PROFCAR_BOOKING_WINDOWS_JSON;
    else process.env.PROFCAR_BOOKING_WINDOWS_JSON = previous.windows;
    if (previous.calendar === undefined) delete process.env.ICLOUD_CALENDAR_NAME_PROFCAR;
    else process.env.ICLOUD_CALENDAR_NAME_PROFCAR = previous.calendar;
  }
});

test("booking windows reject malformed configuration", () => {
  assert.deepEqual(parseBookingWindows('{"1":[["08:00","18:00"]]}'), {
    1: [{ startMinutes: 480, endMinutes: 1080 }],
  });
  assert.throws(() => parseBookingWindows('{"1":[["18:00","08:00"]]}'));
});

test("the same slot uses one atomic CalDAV resource name", () => {
  const start = new Date("2026-09-28T08:00:00.000Z");
  const end = new Date("2026-09-28T09:00:00.000Z");
  assert.equal(
    calendarObjectFilename({ tenant: "profcar" }, start, end),
    calendarObjectFilename({ tenant: "profcar" }, start, end),
  );
  assert.notEqual(
    calendarObjectFilename({ tenant: "profcar" }, start, end),
    calendarObjectFilename({ tenant: "profcar" }, new Date("2026-09-28T09:00:00.000Z"), new Date("2026-09-28T10:00:00.000Z")),
  );
});

test("calendar parser handles expanded events, duration and transparency", () => {
  const intervals = extractCalendarIntervals([
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:first@profcar.com",
    "X-PROFCAR-BOOKING-ID:PC-ONE",
    "DTSTART:20260928T080000Z",
    "DTEND:20260928T090000Z",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:second@profcar.com",
    "DTSTART;TZID=Europe/Berlin:20260928T120000",
    "DURATION:PT30M",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:free@profcar.com",
    "DTSTART:20260928T100000Z",
    "DTEND:20260928T110000Z",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n"), "Europe/Berlin");
  assert.equal(intervals.length, 2);
  assert.equal(intervals[0].bookingId, "PC-ONE");
  assert.equal(intervals[1].start.toISOString(), "2026-09-28T10:00:00.000Z");
  assert.equal(intervals[1].end.toISOString(), "2026-09-28T10:30:00.000Z");
});
