import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, email, phone, topic, start, end } = body;

    if (!name || !email || !start || !end) {
      return NextResponse.json(
        { error: "Name, E-Mail, Start und Ende sind erforderlich." },
        { status: 400 }
      );
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    // 1. Verfügbarkeit prüfen
   const busyCheck = await calendar.freebusy.query({
  requestBody: {
    timeMin: new Date(start).toISOString(),
    timeMax: new Date(end).toISOString(),
    timeZone: "Europe/Berlin",
    items: [{ id: calendarId }],
  },
});

const busySlots = busyCheck.data.calendars?.[calendarId]?.busy || [];

if (busySlots.length > 0) {
  return NextResponse.json(
    {
      success: false,
      available: false,
      message: "Dieser Zeitraum ist bereits belegt.",
    },
    { status: 409 }
  );
}

    // 2. Termin erstellen, wenn Zeitraum frei ist
    const event = {
      summary: `BTDesigns Termin: ${name}`,
      description: `
Neuer Termin über den Chatbot.

Name: ${name}
E-Mail: ${email}
Telefon: ${phone || "Nicht angegeben"}
Thema: ${topic || "Nicht angegeben"}
      `.trim(),
      start: {
        dateTime: start,
        timeZone: "Europe/Berlin",
      },
      end: {
        dateTime: end,
        timeZone: "Europe/Berlin",
      },
    };

    const result = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: "none",
    });

    return NextResponse.json({
      success: true,
      available: true,
      eventId: result.data.id,
      htmlLink: result.data.htmlLink,
    });
  } catch (error: any) {
    console.error("Calendar event error:", error);

    return NextResponse.json(
      {
        error: "Termin konnte nicht erstellt werden.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}