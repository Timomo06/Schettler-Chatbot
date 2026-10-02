import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import houses from "@/tenants/bauteam/houses.json";

export const runtime = "nodejs";

type Message = { role: "user" | "assistant"; content: string };
type House = (typeof houses)[number];
const offerBasis = "Brutto-Ab-Preise vom 01. Oktober 2026 für Putzfassade und Ausführung ohne Keller. Enthalten: Herstellungskosten Haus, Erdarbeiten bis 30 cm ohne Baustraße, Schmutzwasserleitung unterhalb der Sohlplatte, Statik, Bauantrag, Wärmeschutznachweis, Bodengutachten, Vermessung mit Lageplan. Grundstück und individuelle Änderungen müssen persönlich geprüft werden.";
const sales = "Unser Verkäufer Lothar Hans Ruthe, Telefon +49 151 15624073, E-Mail ruthe@praktikus-bauteam.de.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const messages: Message[] = incoming.slice(-12).filter((item: unknown): item is Message => !!item && typeof item === "object" && "role" in item && "content" in item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.length <= 2000);
    if (!messages.length || messages.at(-1)?.role !== "user") return NextResponse.json({ error: "Nachricht fehlt." }, { status: 400 });
    const house = houses.find((item) => item.slug === body.houseSlug);
    const shortlist: House[] = (Array.isArray(body.houseSlugs) ? body.houseSlugs : []).slice(0, 3).map((slug: unknown) => houses.find((item) => item.slug === slug)).filter((item: House | undefined): item is House => Boolean(item));
    const catalog = houses.map((item) => `${item.code}: ${item.name}; ${item.category}; ca. ${item.area} m²; ${item.roof}; ${item.price ? `ab ${item.price} EUR brutto` : "Preis nicht bestätigt"}; PDF ${item.pdfName ? "vorhanden" : "fehlt"}`).join("\n");
    const selected = house ? `Aktuell betrachtetes Haus: ${JSON.stringify({ code: house.code, name: house.name, category: house.category, area: house.area, roof: house.roof, features: house.features, conceptFacts: house.conceptFacts, price: house.price, priceNote: house.priceNote, pdfName: house.pdfName })}. Beziehe dich bei Fragen zu „diesem Haus“ darauf.` : "Es wurde noch kein einzelnes Haus ausgewählt.";
    const selection = shortlist.length > 1 ? `Vom Hausberater vorgeschlagene Auswahl: ${JSON.stringify(shortlist.map((item) => ({ code: item!.code, name: item!.name, area: item!.area, roof: item!.roof, price: item!.price })))}. Vergleiche nur diese Häuser, wenn der Kunde nach seiner Auswahl fragt.` : "";
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 450,
      messages: [
        { role: "system", content: `Du bist der digitale BauTeam-Berater von BTDesigns für BauTeam Praktikus. Antworte auf Deutsch, freundlich, knapp und sachlich. Verwende ausschließlich die folgenden verifizierten Hausdaten. Erfinde keine Preise, Grundrisse, Ausstattung, Liefertermine oder Zusagen. Sprich nur über die ausdrücklich aufgelisteten Leistungen und ergänze keine weiteren Kostenpositionen oder Prozentsätze. Fragen zu weiteren Kosten beantwortest du mit Verweis auf das individuelle Angebot. Jeder bestätigte Preis ist ein Brutto-Ab-Preis, kein verbindlicher Endpreis. Nenne ihn immer mit „ab“ und erwähne Putzfassade und Ausführung ohne Keller. Bei Preis oder PDF ohne eindeutige Zuordnung: offen sagen, dass die Zuordnung geprüft wird. Die Hauskonzept-PDF wird nach Eingabe von Name, E-Mail und Telefonnummer über das Formular im Interface versandt, falls sie diesem Haus zugeordnet ist. Bei ernsthaftem Interesse biete den Kontakt zu unserem Verkäufer an; überlasse die Entscheidung dem Kunden. Verwende in normalen Antworten „unser Verkäufer“ statt „Lothar meldet sich“. Den Namen nenne nur, wenn der Kunde ausdrücklich nach den Kontaktdaten fragt. Eine Frage pro Antwort genügt. ${offerBasis}\nKontakt: ${sales}\n${selected}\n${selection}\nKatalog:\n${catalog}` },
        ...messages,
      ],
    });
    const reply = completion.choices[0]?.message?.content?.trim() || "Dazu liegen mir noch keine gesicherten Angaben vor. Unser Verkäufer kann das persönlich klären.";
    const last = messages.at(-1)?.content.toLowerCase() || "";
    const interest = Boolean(house && /interess|mehr (infos|informationen)|angebot|besichtig|kontakt|anruf|rückruf|pdf|grundriss|kaufen|bauen|preis|kostet|kosten/.test(last));
    return NextResponse.json({ reply, interest, houseSlug: house?.slug || null });
  } catch (error) {
    console.error("BauTeam chat failed", error);
    return NextResponse.json({ error: "Die Beratung ist gerade nicht erreichbar. Bitte versuchen Sie es später erneut." }, { status: 503 });
  }
}
