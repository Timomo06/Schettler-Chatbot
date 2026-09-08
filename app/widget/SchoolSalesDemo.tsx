"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { SCHOOL_DEMOS, upcomingCampusTheory, type SchoolDemoId, type SchoolPanel } from "@/lib/schoolDemos";

type Props = { tenant: SchoolDemoId; panel: SchoolPanel; onPanelChange: (panel: SchoolPanel) => void; onAsk: (message: string) => void };
const RATHJE = "https://www.fahrschule-rathje.de";
const CAMPUS = "https://www.campus-b27.de";
const FSAZ = "https://www.fsaz.de";
const SIM_MODULES = [
  ["Grundausbildung", "Bedienung, Anfahren und sichere Routinen", "Sechs Einheiten à 45 Minuten. Ein ruhiger Einstieg, bevor es ins echte Auto geht."],
  ["Überland", "Landstraße und besondere Situationen", "Unter anderem Überholen und Wildwechsel ohne reales Verkehrsrisiko üben."],
  ["Autobahn", "Auffahren, Spurwechsel und Orientierung", "Auffahrten, Abfahrten und schwierige Situationen gezielt vorbereiten."],
  ["Automatik", "Fahren ohne Kuppeln und Schalten", "Den Blick auf Verkehr, Lenken und Bremsen richten. Passende Konfiguration vorher abstimmen."],
] as const;
function Link({href,children}: {href:string;children:ReactNode}) { return <a className="sd-button sd-secondary" href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>; }
function Select({label,value,onChange,options,required=false}: {label:string;value:string;onChange:(value:string)=>void;options:readonly string[];required?:boolean}) {
  return <label className="sd-field"><span>{label}{required ? " *" : ""}</span><select required={required} value={value} onChange={e=>onChange(e.target.value)}><option value="">Bitte auswählen</option>{options.map(x=><option key={x}>{x}</option>)}</select></label>;
}
export default function SchoolSalesDemo({tenant,panel,onPanelChange,onAsk}:Props) {
  const c = SCHOOL_DEMOS[tenant];
  const campus = tenant === "campus-b27";
  const sim = tenant === "fsaz";
  const [goal,setGoal] = useState("");
  const [prior,setPrior] = useState("");
  const [age,setAge] = useState("");
  const [time,setTime] = useState("");
  const [language,setLanguage] = useState("Deutsch");
  const [notes,setNotes] = useState("");
  const [deadline,setDeadline] = useState("");
  const [step,setStep] = useState(0);
  const [code,setCode] = useState("");
  const [connected,setConnected] = useState(false);
  const [loginError,setLoginError] = useState("");
  const [copied,setCopied] = useState("");
  const [checked,setChecked] = useState<Record<string,boolean>>({});
  const [theoryGroup,setTheoryGroup] = useState("B");
  const [docGroup,setDocGroup] = useState("Auto / BF17 / B197");
  const [module,setModule] = useState("Grundausbildung");
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(()=>{ if(panel !== "home") titleRef.current?.focus({preventScroll:true}); },[panel]);
  const seminar = /BKF|ASF|MPU/.test(goal);
  const actualDocGroup = goal || docGroup;
  const heavy = /Lkw|Bus|C\/CE|Klasse D/.test(actualDocGroup);
  const specialDocs = /BKF|ASF|MPU/.test(actualDocGroup);
  const docItems = sim ? ["Trainingsziel klären", "Aktuelle Fahrschule angeben", "Wunschsprache nennen", "Mögliche Zeiten sammeln"]
    : specialDocs ? ["Gewünschten Kurs benennen", "Vorhandene Fahrerlaubnis notieren", "Frist oder Wunschzeitraum notieren", "Benötigte Unterlagen mit dem Büro abstimmen"]
    : heavy ? ["Ausweis bereithalten", "Vorhandene Fahrerlaubnis notieren", "Gewünschte Klasse und beruflichen Zweck klären", "Klassenabhängige Nachweise mit dem Büro abstimmen"]
    : /BE/.test(actualDocGroup) ? ["Ausweis bereithalten", "Klasse-B-Führerschein bereithalten", "Geplante Anhängernutzung notieren", "Unterlagen für die Erweiterung abstimmen"]
    : ["Ausweis bereithalten", "Biometrisches Passbild vorbereiten", "Sehtest klären", "Erste-Hilfe-Nachweis klären", ...(/BF17/.test(actualDocGroup) ? ["Begleitpersonen und BF17-Unterlagen abstimmen"] : [])];
  const progress = docItems.filter(x=>checked[x]).length;
  const request = [
    `Anfrage an ${c.brand}`, `Website: ${c.website}`, `Anliegen: ${goal || (sim ? "Simulatortraining" : "Persönliche Beratung")}`,
    `Vorbesitz / Erfahrung: ${prior || "Noch zu klären"}`, ...(!sim ? [`Alter: ${age || "Noch zu klären"}`] : []),
    `Zeitwunsch: ${time || "Noch zu klären"}`, ...(sim ? [`Wunschsprache: ${language} (Verfügbarkeit bitte bestätigen)`] : []),
    ...(deadline ? [`Genannte Frist / Wunschdatum: ${deadline}`] : []),
    `Vorbereitet: ${docItems.filter(x=>checked[x]).join(", ") || "Noch keine Punkte abgehakt"}`,
    ...(notes.trim() ? [`Zusatz: ${notes.trim()}`] : []),
    "Bitte bestätigt den passenden Einstieg, die aktuell geltenden Preise und mögliche Termine. Dies ist eine Anfrage, keine Buchung.",
  ].join("\n");
  const mail = `mailto:${c.email}?subject=${encodeURIComponent(`${sim ? "Simulatortraining" : "Ausbildungsberatung"} – ${goal || "Anfrage"}`)}&body=${encodeURIComponent(request)}`;
  const titles: Record<SchoolPanel,string> = {
    home:"", connect: sim ? "Dein Demo-Trainingsplan" : "Dein persönlicher Demo-Begleiter", dashboard:sim ? "Pakete, Preise & Anfrage" : "Deine Beratung vorbereiten",
    courses:sim ? "Welches Training passt zu dir?" : "Finde deinen passenden Einstieg", schedule:sim ? "Dein Training planen" : campus ? "Deine nächsten Theoriezeiten" : "Theorie & Fahrstunden planen",
    documents:sim ? "Teilnahme & Anfahrt" : "Gut vorbereitet zum ersten Gespräch", coach:sim || !campus ? "Sicher starten am Simulator" : "Welcher Spezialkurs passt?",
  };
  function choose(next:string) { const mapped: Record<string,string> = {Grundausbildung:"Ruhig einsteigen / Grundausbildung",Überland:"Landstraße / Überland",Autobahn:"Autobahn",Automatik:"Automatiktraining"}; setGoal(sim ? mapped[next] || next : next); setStep(0); onPanelChange("courses"); }
  async function copy() {
    try { await navigator.clipboard.writeText(request); setCopied("Anfrage kopiert. Du kannst sie jetzt versenden."); }
    catch { setCopied("Bitte den Text im Feld markieren und manuell kopieren."); }
  }
  function resetDemo() {
    setConnected(false);setCode("");setLoginError("");setGoal("");setPrior("");setAge("");setTime("");setNotes("");setDeadline("");setLanguage("Deutsch");setChecked({});setStep(0);setCopied("");setDocGroup("Auto / BF17 / B197");setTheoryGroup("B");setModule("Grundausbildung");
  }
  const dateParts = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const datePart=(name:string)=>dateParts.find(x=>x.type===name)?.value || "";
  const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
  const upcoming = upcomingCampusTheory(theoryGroup,today);
  if(panel === "home") return null;
  const requestBox = <div className="sd-card"><h3>Deine fertige Anfrage</h3><p>Prüfe die Angaben. „E-Mail vorbereiten“ öffnet dein Mailprogramm; versendet wird erst dort.</p><textarea aria-label="Fertiger Anfragetext zum Kopieren" readOnly value={request} rows={9}/><div className="sd-actions"><button className="sd-button" onClick={()=>void copy()}>Anfrage kopieren</button><a className="sd-button sd-secondary" href={mail}>E-Mail vorbereiten</a><Link href={c.contact}>Kontaktseite</Link></div><p role="status" className="sd-small">{copied || "Es wurde noch nichts gesendet oder gebucht."}</p></div>;
  const prices = sim ? <div className="sd-card"><span className="sd-eyebrow">Veröffentlicht auf fsaz.de · geprüft 07.09.2026</span><h3>Dein Simulatortraining</h3><div className="sd-price"><span>Grundausbildung · 6 × 45 Min.</span><strong>180 €</strong></div><div className="sd-price"><span>Überland 1 / Überland 2 / Autobahn</span><strong>je 40 €</strong></div><div className="sd-price"><span>Komplettpaket · 9 × 45 Min.</span><strong>270 €</strong></div><div className="sd-price"><span>Zusätzliche Anmeldung für Externe</span><strong>30 €</strong></div><p className="sd-small">Paketumfang und mögliche weitere Kosten vorher bestätigen lassen. Einzelmodule und Paket haben eigene Preise.</p><Link href={`${FSAZ}/preise/`}>Offizielle Preisseite</Link></div>
    : !campus ? <div className="sd-card"><span className="sd-eyebrow">Website-Stand · 07.09.2026</span><h3>Veröffentlichte Einzelpreise</h3><div className="sd-price"><span>B / B197 / Automatik · 45 Min.</span><strong>70 €</strong></div><div className="sd-price"><span>BE · 45 Min.</span><strong>75 €</strong></div><p>Der Gesamtpreis hängt von deiner Ausbildung ab. Paket- und Büroserviceangaben unterscheiden sich auf der Website und müssen vor einer Zusage bestätigt werden.</p><Link href={`${RATHJE}/preise/`}>Preisliste ansehen</Link></div>
    : <div className="sd-card"><h3>Ein Angebot passend zu deinem Ziel</h3><p>Eine bestätigte Preisliste liegt für diese Demo nicht vor. Mit Klasse, Vorbesitz und Zeitwunsch kann Campus B27 deine Anfrage gezielt beantworten.</p><button className="sd-button sd-secondary" onClick={()=>onPanelChange("courses")}>Angaben vervollständigen</button></div>;
  return <section className="sd-root" style={{"--sd-accent":c.accent} as CSSProperties} aria-label={titles[panel]}>
    <style>{`
      .sd-root{width:100%;color:#182b37;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-width:0}
      .sd-root *{box-sizing:border-box}.sd-root h2{font-size:clamp(23px,3vw,29px);line-height:1.18;letter-spacing:-.6px;margin:5px 0 12px;outline:none}.sd-root h3{font-size:19px;line-height:1.3;margin:4px 0 10px}.sd-root p{margin:8px 0 16px;color:#4b5e6b}.sd-root strong{color:#182b37}
      .sd-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}.sd-nav button,.sd-tab{border:1px solid #d3dfe5;background:#fff9;color:#314c5e;border-radius:99px;padding:9px 14px;font:600 14px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.sd-nav button[aria-current=page],.sd-tab[aria-pressed=true]{background:var(--sd-accent);color:#fff;border-color:var(--sd-accent)}
      .sd-eyebrow{font-size:12px;font-weight:750;letter-spacing:.9px;text-transform:uppercase;color:var(--sd-accent)}.sd-card{background:linear-gradient(145deg,#ffffffeb,#ffffffa8);border:1px solid #ffffffee;box-shadow:0 8px 25px #2340500b;border-radius:22px;padding:22px;margin:14px 0;min-width:0}.sd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px}.sd-grid>.sd-card{margin:0}.sd-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}
      .sd-button{font:650 14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--sd-accent);border:1px solid transparent;color:white;border-radius:13px;padding:12px 16px;cursor:pointer;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;min-height:44px;max-width:100%;white-space:normal;overflow-wrap:anywhere}.sd-button:disabled{opacity:.45;cursor:not-allowed}.sd-secondary{background:#ffffffbd;color:#243d4e;border-color:#d1dce3}.sd-root button:focus-visible,.sd-root a:focus-visible,.sd-root input:focus-visible,.sd-root select:focus-visible,.sd-root textarea:focus-visible{outline:3px solid var(--sd-accent);outline-offset:3px}
      .sd-field{display:flex;flex-direction:column;gap:7px;font-size:14px;font-weight:650;margin:13px 0}.sd-root input:not([type=checkbox]),.sd-root select,.sd-root textarea{width:100%;min-width:0;max-width:100%;border:1px solid #c6d5de;border-radius:12px;padding:12px;background:#fffffff0;color:#182b37;font:400 16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.sd-root textarea{resize:vertical}.sd-small{font-size:13px!important;line-height:1.5}.sd-notice{padding:14px 17px;border-radius:15px;background:#eaf0f6;border:1px solid #d6e1e9;margin:12px 0;font-size:14px}.sd-price{display:flex;justify-content:space-between;align-items:baseline;gap:15px;padding:13px 0;border-bottom:1px solid #dce5ea;font-size:15px}.sd-price strong{white-space:nowrap}.sd-check{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #e0e8ec;font-size:15px;cursor:pointer}.sd-check input{width:20px;height:20px;accent-color:var(--sd-accent);flex-shrink:0;margin-top:3px}.sd-list{padding-left:22px}.sd-list li{padding:6px 0}.sd-meter{height:7px;background:#d9e5eb;border-radius:9px;overflow:hidden}.sd-meter span{display:block;height:100%;background:var(--sd-accent)}.sd-tag{display:inline-block;border-radius:8px;background:#e6edf2;color:#3c5364;font-size:12px;padding:4px 8px;margin-bottom:10px}.sd-module{width:100%;text-align:left}.sd-module[aria-pressed=true]{border-color:var(--sd-accent);box-shadow:inset 0 0 0 1px var(--sd-accent)}.sd-module span{display:block;font-weight:400;font-size:14px;margin-top:6px}.sd-timeline{list-style:none;padding:0}.sd-timeline li{display:flex;gap:12px;align-items:baseline;border-bottom:1px solid #dde6ec;padding:12px 0}.sd-timeline b{flex-shrink:0;color:var(--sd-accent)}
      @media(max-width:520px){.sd-card{padding:17px;border-radius:18px}.sd-root{font-size:16px}.sd-nav{gap:6px}.sd-nav button{padding:8px 11px}.sd-price{font-size:14px}.sd-actions .sd-button{flex-grow:1}}
    `}</style>
    <nav className="sd-nav" aria-label="Bereiche"><button onClick={()=>onPanelChange("home")}>← Übersicht</button>{([["courses",sim?"Training":"Einstieg"],["schedule","Termine"],["documents",sim?"Teilnahme":"Vorbereitung"],["dashboard","Anfrage"]] as const).map(([id,label])=><button key={id} aria-current={panel===id?"page":undefined} onClick={()=>onPanelChange(id)}>{label}</button>)}</nav>
    <span className="sd-eyebrow">{c.brand} · {sim?"Simulatortraining":campus?"Hünfeld":"Hamburg"}</span><h2 ref={titleRef} tabIndex={-1}>{titles[panel]}</h2>

    {panel === "courses" && <>
      <div className="sd-notice">{sim?"Du bleibst bei deiner bisherigen Fahrschule. Für das Simulatortraining ist kein Wechsel zu Rathje nötig.":"Wir sammeln die Angaben, die das Büro für eine passende Beratung braucht. Eine verbindliche Anmeldung erfolgt persönlich mit der Fahrschule."}</div>
      <div className="sd-card"><span className="sd-eyebrow">Schritt {step+1} von 3</span><div className="sd-meter" aria-hidden="true"><span style={{width:`${(step+1)/3*100}%`}}/></div>
        {step===0 && <><h3 style={{marginTop:20}}>{sim?"Was möchtest du üben?":"Was möchtest du machen?"}</h3><Select label={sim?"Trainingsziel":"Dein Ziel"} value={goal} onChange={setGoal} required options={sim?["Ruhig einsteigen / Grundausbildung","Schalten und Anfahren üben","Landstraße / Überland","Autobahn","Automatiktraining","Komplettpaket / 9 Module"]:campus?["Auto / BF17 / B197","Motorrad / AM / A1 / A2 / A","Lkw / C/CE","Bus / Klasse D","BKF-Weiterbildung","ASF-Aufbauseminar","MPU-Kurs / Beratung"]:["Klasse B / Schaltung","B197 / Automatik mit Schaltkompetenz","B78 / nur Automatik","BE / Anhänger","Klassenberatung / noch unsicher"]}/>
          {!sim && <p className="sd-small">{campus?"Die konkrete Klasse und Voraussetzungen klärt das Team anhand deines Alters und Vorbesitzes.":"B197 und B78 sind unterschiedliche Ausbildungswege. Welche Variante für dich passt, klären wir im Beratungsgespräch."}</p>}
          <button className="sd-button" disabled={!goal} onClick={()=>setStep(1)}>Weiter zu deinen Voraussetzungen</button></>}
        {step===1 && <><h3 style={{marginTop:20}}>Wo stehst du gerade?</h3><Select label={sim?"Deine Erfahrung / Fahrschule":"Vorhandener Führerschein"} value={prior} onChange={setPrior} required options={sim?["Noch keine Fahrschule / keine Erfahrung","Schon bei Rathje angemeldet","Bei einer anderen Fahrschule angemeldet","Führerschein vorhanden / auffrischen"]:["Noch kein Führerschein","Klasse B vorhanden","Motorradklasse vorhanden","Lkw- oder Busklasse vorhanden","Andere / im Gespräch klären"]}/>{!sim && <Select label="Dein Alter" value={age} onChange={setAge} required options={["Unter 17","17 Jahre","18–20 Jahre","21–23 Jahre","24 Jahre oder älter"]}/>}
          {sim && <label className="sd-field"><span>Wunschsprache</span><input value={language} maxLength={60} onChange={e=>setLanguage(e.target.value)} placeholder="z. B. Deutsch oder Türkisch"/><span className="sd-small">Die verfügbare Sprache am konkreten Simulator wird vorab bestätigt.</span></label>}
          {!sim && /BE/.test(goal) && prior && prior!=="Klasse B vorhanden" && <div className="sd-notice">Für den BE-Weg muss dein Klasse-B-Vorbesitz geklärt werden. Wir nehmen das als offene Frage auf.</div>}
          <div className="sd-actions"><button className="sd-button sd-secondary" onClick={()=>setStep(0)}>Zurück</button><button className="sd-button" disabled={!prior || (!sim&&!age)} onClick={()=>setStep(2)}>Weiter zu deinem Zeitwunsch</button></div></>}
        {step===2 && <><h3 style={{marginTop:20}}>Wann passt es in deinen Alltag?</h3><Select label="Zeitwunsch" value={time} onChange={setTime} required options={["Möglichst bald","Nachmittags","Abends","In den Ferien","Zeitlich flexibel","Individuell abstimmen"]}/>{seminar && <label className="sd-field"><span>Frist oder Wunschdatum, falls vorhanden</span><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/><span className="sd-small">Bei ASF oder MPU keine Bescheide oder vertraulichen Details hier eingeben. Die Frist persönlich prüfen lassen.</span></label>}<label className="sd-field"><span>Was soll das Team noch wissen? (freiwillig)</span><textarea rows={3} maxLength={600} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={sim?"z. B. Ich möchte vor allem ruhiger anfahren lernen.":"z. B. Welche genaue Klasse oder welcher Kurs ist gemeint?"}/></label><div className="sd-actions"><button className="sd-button sd-secondary" onClick={()=>setStep(1)}>Zurück</button><button className="sd-button" disabled={!time} onClick={()=>onPanelChange("dashboard")}>Meine Anfrage ansehen</button></div></>}
      </div>
    </>}

    {panel === "coach" && <>{campus ? <>
      <p>Wähle das Anliegen. Wir fragen nur das ab, was für die erste Rückmeldung wichtig ist.</p><div className="sd-grid">{[["BKF-Weiterbildung","Vorhandene Fahrerlaubnis, gewünschter Zeitraum und einzelne Person oder Gruppe klären."],["ASF-Aufbauseminar","Eine genannte Frist und deine Erreichbarkeit fürs Büro vorbereiten. Kurstermin und Teilnahme werden bestätigt."],["MPU-Kurs / Beratung","Dein allgemeines Beratungsziel und Zeitwunsch aufnehmen. Umfang und passende Vorbereitung persönlich klären."]].map(([name,detail])=><div key={name} className="sd-card"><h3>{name}</h3><p>{detail}</p><button className="sd-button" onClick={()=>choose(name)}>Anfrage vorbereiten</button></div>)}</div><p className="sd-small">Das Angebot ist auf der Website genannt; konkrete Termine, Preise und Kursumfänge müssen abgestimmt werden.</p>
      </> : <><p>{sim?"Wähle eine Trainingseinheit und erfahre, was du dort üben kannst.":"Das Simulatortraining gehört zur Fahrschule Rathje. Es hilft dir, Abläufe vor den ersten Fahrstunden in Ruhe kennenzulernen."}</p><div className="sd-grid">{SIM_MODULES.map(([name,short])=><button key={name} className="sd-button sd-secondary sd-module" aria-pressed={module===name} onClick={()=>setModule(name)}><div>{name}<span>{short}</span></div></button>)}</div><div className="sd-card"><h3>{module}</h3><p>{SIM_MODULES.find(x=>x[0]===module)?.[2]}</p><p className="sd-small">Simulatortraining ergänzt die Ausbildung im echten Auto. Es wird hier nicht als Ersatz für Pflichtfahrten oder als garantierte Ersparnis angerechnet.</p><div className="sd-actions">{sim?<button className="sd-button" onClick={()=>choose(module)}>Dieses Training anfragen</button>:<Link href={`${FSAZ}/kontakt/`}>Simulatortraining anfragen</Link>}<Link href={`${FSAZ}/vogel-premium-simulator/`}>Premium-Simulator ansehen</Link></div></div></>}</>}

    {panel === "schedule" && <>{campus ? <>
      <div className="sd-notice">Bereits bei Campus B27 angemeldet? Laut Terminseite kannst du den Theorieunterricht ohne Voranmeldung besuchen. Die veröffentlichten Kurszeiten sind 18–21 Uhr.</div>
      <Select label="Passender Theorie-Zusatzstoff" value={theoryGroup} onChange={setTheoryGroup} options={["B","A","C / D – Grundstoff anzeigen"]}/>
      <div className="sd-card"><span className="sd-eyebrow">Veröffentlichte Termine · Stand 07.09.2026</span>{upcoming.length?<ul className="sd-timeline">{upcoming.map(([date,,topic])=><li key={date}><b>{new Date(`${date}T12:00:00`).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}</b><span>{topic}<br/><small>18–21 Uhr</small></span></li>)}</ul>:<p>In der hinterlegten Terminliste gibt es keine bevorstehenden Termine mehr. Bitte die aktuelle Terminseite prüfen.</p>}{theoryGroup.startsWith("C") && <p>Zusatzstofftermine für C/D sind in dieser Liste nicht veröffentlicht. Bitte direkt abstimmen.</p>}<Link href={`${CAMPUS}/theorieunterricht/termine/`}>Aktuellen Kursplan prüfen</Link></div>
    </> : <>
      <div className="sd-card"><h3>{sim?"Schon angemeldet?":"Deine Fahrstunden organisieren"}</h3><p>Buche oder ändere Termine über den vorhandenen Fahrstundenplaner. Hier im Interface wird kein Termin verbindlich gebucht.</p><Link href="https://www.fahrstundenplaner.de/login">Fahrstundenplaner öffnen</Link><ul className="sd-list">{(sim?["Simulator-Termine werden in 45-Minuten-Einheiten geplant.","Zugang noch offen? Erst die Anmeldung mit Rathje abstimmen."]:["Fahrstunden: 90 Minuten, maximal ein Termin täglich und drei pro Woche.","Buchung bis zu vier Wochen im Voraus.","Laut Website Stornierung bis zwei Werktage vor dem Fahrstundentermin; bei kurzfristigen Änderungen direkt Kontakt aufnehmen."]).map(x=><li key={x}>{x}</li>)}</ul><Link href={`${RATHJE}/fahrstundenplaner/`}>Regeln & Anleitung</Link></div>
      {!sim && <div className="sd-card"><h3>Theorieunterricht</h3><p>Die Theorieseite nennt Dienstag bis Donnerstag, 18–19:30 Uhr. Auf der Startseite wird außerdem Blockunterricht genannt. Welcher Ablauf für deinen Start gilt, bestätigt Rathje.</p><Link href={`${RATHJE}/theoriekalender/`}>Theoriekalender prüfen</Link></div>}
    </>}<div className="sd-card"><h3>{sim?"Noch keinen Zugang?":"Dein Zeitwunsch"}</h3><Select label="Wann passt es bei dir?" value={time} onChange={setTime} options={["Nachmittags","Abends","In den Ferien","Zeitlich flexibel","Individuell abstimmen"]}/><button className="sd-button" onClick={()=>onPanelChange("dashboard")}>Anfrage vorbereiten</button></div></>}

    {panel === "documents" && <>
      {sim ? <div className="sd-notice">Auch externe Fahrschüler sind willkommen. Du musst weder zu Rathje wechseln noch dort einen kompletten Führerscheinvertrag abschließen.</div> : <><p>Markiere, was du selbst vorbereitet hast. Das ist deine Checkliste; das Büro hat damit noch keine Unterlagen geprüft.</p>{!goal && <Select label="Wofür bereitest du dich vor?" value={docGroup} onChange={setDocGroup} options={campus?["Auto / BF17 / B197","Motorrad","Lkw / C/CE","Bus / Klasse D","BKF / ASF / MPU"]:["Auto / BF17 / B197","Klasse B / Automatik","BE / Anhänger"]}/>}</>}
      <div className="sd-card"><h3>{sim?"Vor deiner ersten Einheit":"Deine Vorbereitung"}</h3><p>{progress} von {docItems.length} Punkten vorbereitet</p><div className="sd-meter" aria-hidden="true"><span style={{width:`${progress/docItems.length*100}%`}}/></div>{docItems.map(x=><label key={x} className="sd-check"><input type="checkbox" checked={!!checked[x]} onChange={e=>setChecked({...checked,[x]:e.target.checked})}/><span>{x}</span></label>)}<p className="sd-small">{sim?"Sprache, Zugang und passende Einheit werden gemeinsam abgestimmt.":"Welche Nachweise in deinem Fall genau nötig sind, hängt unter anderem von Klasse und Vorbesitz ab. Bitte beim Büro bestätigen lassen."}</p>{!campus&&!sim && <Link href={`${RATHJE}/erste-hilfe-kurs/`}>Erste Hilfe direkt bei Rathje</Link>}<div className="sd-actions"><button className="sd-button" onClick={()=>onPanelChange("dashboard")}>Für meine Anfrage übernehmen</button></div></div>
      <div className="sd-card"><h3>Hier findest du uns</h3><p>{c.address}<br/>{c.hours}</p><div className="sd-actions"><a className="sd-button" href={`tel:${c.tel}`}>{c.phone}</a><Link href={c.contact}>Kontakt & Anfahrt</Link></div></div>
    </>}

    {panel === "connect" && <>
      {!connected ? <form className="sd-card" onSubmit={e=>{e.preventDefault();if(code.trim().toUpperCase()===c.code){setConnected(true);setLoginError("");}else setLoginError(`Für diese Demo lautet der Beispielcode ${c.code}.`);}}><span className="sd-tag">Beispielzugang · keine echten Schülerdaten</span><p>Sieh dir an, wie dein persönlicher Begleiter aussehen kann.</p><label className="sd-field"><span>Demo-Code</span><input autoComplete="off" value={code} maxLength={30} onChange={e=>setCode(e.target.value)} placeholder={c.code}/></label><div className="sd-actions"><button className="sd-button" type="submit">Demo öffnen</button><button className="sd-button sd-secondary" type="button" onClick={()=>{setCode(c.code);setConnected(true);setLoginError("");}}>Beispielzugang verwenden</button></div><p role="status" className="sd-small">{loginError}</p></form> : <>
        <div className="sd-card"><span className="sd-tag">Demo-Profil Alex · sämtliche Fortschritte sind Beispiele</span><h3>{sim?"Dein nächstes Trainingsziel: ruhig anfahren.":campus?"Dein nächster Schritt: Theorie und Start abstimmen.":"Dein nächster Schritt: Theorie und Simulator verbinden."}</h3><p>{sim?"Zwei von sechs Grundeinheiten abgeschlossen – eine Beispielansicht, kein abgerufener Lernstand.":"Beispielziel: B197. Dein Begleiter bündelt die nächsten Schritte und hilft bei offenen Fragen."}</p><ul className="sd-timeline">{(sim?["Erste Bedienung kennenlernen · Demo: erledigt","Anfahren und Schalten üben · Demo: nächstes Ziel","Passende Einheit mit Rathje abstimmen"]:campus?["Ziel und Vorbesitz klären","Unterlagen für das Erstgespräch vorbereiten","Veröffentlichten Theorieplan prüfen","Praxis individuell mit Campus abstimmen"]:["Anmeldung und Unterlagen abstimmen","Theorieablauf prüfen","Simulatortraining vorbereiten","Fahrstunden im bestehenden Planer organisieren"]).map((x,i)=><li key={x}><b>{String(i+1).padStart(2,"0")}</b><span>{x}</span></li>)}</ul><div className="sd-actions"><button className="sd-button" onClick={()=>onPanelChange("schedule")}>Meine nächsten Schritte planen</button><button className="sd-button sd-secondary" onClick={()=>onAsk(sim?"Wie bereite ich mich auf das Anfahren am Simulator vor? Ich frage allgemein, mein Lernstand ist nur Demo.":"Was sollte ich vor meinem ersten Gespräch bei euch vorbereiten? Mein Demo-Profil ist keine echte Schülerakte.")}>Meinen Assistenten fragen</button></div></div><button className="sd-button sd-secondary" onClick={resetDemo}>Demo-Profil zurücksetzen</button>
      </>}<p className="sd-small">Dieser Beispielzugang liest keine Fahrschulsoftware aus und speichert keine Schülerakte.</p>
    </>}

    {panel === "dashboard" && <>{prices}{!goal && <div className="sd-notice">Noch kein Ziel ausgewählt? <button className="sd-button sd-secondary" onClick={()=>onPanelChange("courses")}>Einstieg durchgehen</button></div>}{requestBox}<div className="sd-card"><h3>Direkt mit dem Team sprechen</h3><p>{c.address}<br/>{c.hours}</p><a className="sd-button sd-secondary" href={`tel:${c.tel}`}>{c.phone}</a></div></>}
  </section>;
}
