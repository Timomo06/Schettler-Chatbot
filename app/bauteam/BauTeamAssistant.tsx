"use client";

import { FormEvent, useState } from "react";
import houses from "@/tenants/bauteam/houses.json";

type Message = { role: "user" | "assistant"; content: string };
const formatPrice = (value: number) => `ab ${new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)}`;

export default function BauTeamAssistant({ houseSlug, houseSlugs, siteUrl }: { houseSlug: string; houseSlugs: string[]; siteUrl: string }) {
  const [activeSlug, setActiveSlug] = useState(houseSlug || houseSlugs[0] || "");
  const house = houses.find((item) => item.slug === activeSlug);
  const shortlist = houseSlugs.map((slug) => houses.find((item) => item.slug === slug)).filter((item): item is (typeof houses)[number] => Boolean(item));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [interested, setInterested] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [lead, setLead] = useState({ name: "", email: "", phone: "", consent: false, website: "" });
  const [leadStatus, setLeadStatus] = useState("");
  const [sending, setSending] = useState(false);
  const safeSite = (() => { try { const url = new URL(siteUrl); return url.protocol === "https:" || url.hostname === "localhost" ? url.origin : ""; } catch { return ""; } })();
  const image = house && safeSite ? `${safeSite}${house.image}` : "";

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/bauteam/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ houseSlug: activeSlug, houseSlugs, messages: next }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Antwort nicht verfügbar.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
      if (data.interest) setInterested(true);
    } catch (error) {
      setMessages([...next, { role: "assistant", content: error instanceof Error ? error.message : "Die Beratung ist gerade nicht erreichbar." }]);
    } finally { setBusy(false); }
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!house) return;
    setSending(true);
    setLeadStatus("");
    try {
      const response = await fetch("/api/bauteam/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...lead, houseSlug: house.slug }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Versand fehlgeschlagen.");
      setLeadStatus("Das passende Hauskonzept wurde an Ihre E-Mail-Adresse versendet. Unser Verkäufer hat Ihre Anfrage ebenfalls erhalten.");
      setLeadOpen(false);
    } catch (error) { setLeadStatus(error instanceof Error ? error.message : "Versand fehlgeschlagen."); }
    finally { setSending(false); }
  }

  return <main className="bt-assistant">
    <header className="bt-header"><div className="bt-mark">✦</div><div><small>BTDesigns Interface · BauTeam Praktikus</small><strong>Hausberatung</strong></div><span className="bt-online">Online</span></header>
    <div className="bt-scroll">
      <div className="bt-intro"><span>Guten Tag 👋</span><h1>{house ? `Sie interessieren sich für ${house.name}?` : "Welches Haus passt zu Ihnen?"}</h1><p>Ich helfe bei der Orientierung zu den BauTeam-Hauskonzepten und stelle bei konkreten Fragen den Kontakt zu unserem Verkäufer her.</p></div>
      {shortlist.length > 1 && <div className="bt-shortlist"><small>Ihre Auswahl aus dem Hausberater</small><div>{shortlist.map((item) => <button key={item.slug} className={activeSlug === item.slug ? "active" : ""} onClick={() => { setActiveSlug(item.slug); setInterested(false); }}>{item.name}</button>)}</div></div>}
      {house && <article className="bt-house">{image && <img src={image} alt={house.name} />}<div><small>{house.code}</small><h2>{house.name}</h2><p>{house.category} · ca. {house.area} m² · {house.roof}</p><strong>{house.price ? `${formatPrice(house.price)} brutto` : "Preis wird geprüft"}</strong>{house.price && <small>Brutto-Ab-Preis für Putzfassade, ohne Keller · Stand 30.09.2026</small>}</div></article>}
      <div className="bt-chips"><button onClick={() => send(house ? `Was ist über ${house.name} bekannt?` : "Welche Häuser gibt es?")}>Hausdetails</button><button onClick={() => send("Was ist im Angebotspreis enthalten?")}>Preis & Leistungen</button><button onClick={() => setInterested(true)}>Kontakt zum Verkäufer</button></div>
      <div className="bt-messages" aria-live="polite">{messages.map((message, index) => <div key={index} className={`bt-message ${message.role}`}>{message.content}</div>)}{busy && <div className="bt-message assistant">Einen Moment …</div>}</div>
      {interested && <aside className="bt-interest"><button className="bt-dismiss" onClick={() => setInterested(false)} aria-label="Hinweis schließen">×</button><strong>{house ? `Mehr zu ${house.name}` : "Persönlich weiterkommen"}</strong><p>{house?.pdfName && house.price ? "Erhalten Sie das passende Hauskonzept als PDF und lassen Sie sich auf Wunsch von unserem Verkäufer beraten." : "Unser Verkäufer kann offene Fragen und die passende Planung persönlich klären."}</p><div>{house?.pdfName && house.price && <button onClick={() => setLeadOpen(true)}>Hauskonzept per E-Mail</button>}<a href="tel:+4915115624073">Verkäufer anrufen</a><a href={`mailto:ruthe@bauteam-praktikus.de?subject=${encodeURIComponent(`Interesse an ${house?.name || "einem Hauskonzept"}`)}`}>E-Mail an Verkäufer</a></div></aside>}
      {house && !interested && house.pdfName && house.price && <button className="bt-pdf-button" onClick={() => setLeadOpen(true)}>Passendes Hauskonzept als PDF erhalten →</button>}
      {leadStatus && <p className="bt-status" role="status">{leadStatus}</p>}
      {leadOpen && house && <form className="bt-lead" onSubmit={submitLead}><div className="bt-lead-title"><h2>Hauskonzept anfordern</h2><button type="button" onClick={() => setLeadOpen(false)} aria-label="Formular schließen">×</button></div><p>Sie erhalten genau das Hauskonzept zu <strong>{house.name} ({house.code})</strong>. Unser Verkäufer erhält Ihre Anfrage für eine mögliche persönliche Beratung.</p><label>Name<input required minLength={2} autoComplete="name" value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} /></label><label>E-Mail<input required type="email" autoComplete="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} /></label><label>Telefon<input required type="tel" autoComplete="tel" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} /></label><input className="bt-honeypot" tabIndex={-1} autoComplete="off" value={lead.website} onChange={(e) => setLead({ ...lead, website: e.target.value })} aria-hidden="true" /><label className="bt-consent"><input required type="checkbox" checked={lead.consent} onChange={(e) => setLead({ ...lead, consent: e.target.checked })} /> Ich bin mit dem Versand des Hauskonzepts und der Weitergabe meiner Angaben an BauTeam Praktikus für diese Anfrage einverstanden.</label><button type="submit" disabled={sending}>{sending ? "Wird versendet …" : "PDF anfordern"}</button></form>}
    </div>
    <form className="bt-composer" onSubmit={(event) => { event.preventDefault(); void send(input); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={house ? `Frage zu ${house.name} stellen …` : "Stellen Sie Ihre Frage …"} aria-label="Ihre Nachricht" /><button disabled={busy || !input.trim()} type="submit" aria-label="Nachricht senden">↗</button></form>
    <footer>Beratung durch BTDesigns · Angaben werden von BauTeam persönlich geprüft</footer>
  </main>;
}
