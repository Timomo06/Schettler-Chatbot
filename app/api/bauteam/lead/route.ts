import { NextRequest, NextResponse } from "next/server";
import houses from "@/tenants/bauteam/houses.json";

export const runtime = "nodejs";

const recent = new Map<string, number>();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 60) : "";
    const house = houses.find((item) => item.slug === body.houseSlug);
    if (body.website || !body.consent || name.length < 2 || !emailPattern.test(email) || phone.length < 5 || !house) return NextResponse.json({ error: "Bitte die Angaben prüfen und der Kontaktaufnahme zustimmen." }, { status: 400 });
    if (!house.pdfName || !house.price) return NextResponse.json({ error: "Für dieses Haus ist das Hauskonzept noch nicht eindeutig freigegeben. Bitte kontaktieren Sie Lothar direkt." }, { status: 409 });
    const key = `${request.headers.get("x-forwarded-for")?.split(",")[0] || "local"}:${email}:${house.slug}`;
    if (Date.now() - (recent.get(key) || 0) < 5 * 60_000) return NextResponse.json({ error: "Die Anfrage wurde bereits gesendet. Bitte prüfen Sie Ihr Postfach." }, { status: 429 });
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.BAUTEAM_EMAIL_FROM;
    const lothar = process.env.BAUTEAM_LOTHAR_EMAIL || "ruthe@bauteam-praktikus.de";
    if (!apiKey || !from) return NextResponse.json({ error: "Der PDF-Versand wird gerade eingerichtet. Bitte kontaktieren Sie Lothar direkt." }, { status: 503 });
    const pdfResponse = await fetch(new URL(`/bauteam/concepts/${house.slug}.pdf`, request.url));
    if (!pdfResponse.ok) throw new Error(`Hauskonzept fehlt: ${house.slug}`);
    const pdf = Buffer.from(await pdfResponse.arrayBuffer());
    const text = `Guten Tag ${name},\n\nvielen Dank für Ihr Interesse an ${house.name} (${house.code}). Im Anhang finden Sie das passende Hauskonzept. Der Angebotspreis laut Liste vom 30. September 2026 beträgt ${new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(house.price)} brutto für eine Ausführung mit Putzfassade und ohne Keller. Die konkrete Planung und der Leistungsumfang werden persönlich geprüft.\n\nFür ein Gespräch: Lothar Hans Ruthe, +49 151 15624073, ${lothar}.\n\nIhre angegebenen Kontaktdaten: ${name}, ${email}, ${phone}.\n\nBauTeam Praktikus`;
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ from, to: [email], bcc: [lothar], reply_to: lothar, subject: `Ihr Hauskonzept: ${house.name} (${house.code})`, text, attachments: [{ filename: house.pdfName, content: pdf.toString("base64") }] }),
    });
    if (!result.ok) {
      console.error("BauTeam email provider failed", result.status);
      return NextResponse.json({ error: "Der Versand hat nicht geklappt. Bitte versuchen Sie es später erneut oder kontaktieren Sie Lothar." }, { status: 502 });
    }
    recent.set(key, Date.now());
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("BauTeam lead failed", error);
    return NextResponse.json({ error: "Der Versand hat nicht geklappt. Bitte versuchen Sie es später erneut." }, { status: 500 });
  }
}
