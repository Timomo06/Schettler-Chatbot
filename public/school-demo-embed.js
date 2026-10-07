/* Gemeinsames Widget mit Website-Einstieg für ProfCar und R-Drive. */
(function () {
  "use strict";
  const script = document.currentScript;
  if (!script || document.getElementById("bt-school-demo-frame")) return;
  const tenants = {"fahrschule-rathje.de":"fahrschule-rathje","fsaz.de":"fsaz","campus-b27.de":"campus-b27","fahrschule-hopla.de":"fahrschule-hopla","fahrschule-chioa.de":"fahrschule-chioa","r-drive.info":"r-drive","profcar.com":"profcar"};
  const host = window.location.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  const tenant = tenants[host];
  if (!tenant) return;
  const origin = new URL(script.src, window.location.href).origin;
  const src = new URL("/widget", origin);
  src.searchParams.set("tenant", tenant);
  src.searchParams.set("host", host);
  src.searchParams.set("embed", "1");
  const frame = document.createElement("iframe");
  frame.id = "bt-school-demo-frame";
  const titles = {"fsaz":"Simulator-Assistent der Fahrschule Rathje","campus-b27":"Campus B27 Ausbildungs-Assistent","fahrschule-hopla":"Fahrschule Hopla Führerschein-Assistent","fahrschule-chioa":"Fahrschule Chioa Führerschein-Assistent","fahrschule-rathje":"Fahrschule Rathje Führerschein-Assistent","r-drive":"R-DRIVE Führerschein-Assistent","profcar":"ProfCar digitaler Fahrzeugberater"};
  frame.title = titles[tenant] || "Digitaler Führerschein-Assistent";
  frame.allow = "microphone";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.style.cssText = "position:fixed;right:8px;bottom:8px;width:190px;height:190px;border:0;background:transparent;z-index:2147483000;color-scheme:light;transition:width 850ms cubic-bezier(.16,1,.3,1),height 850ms cubic-bezier(.16,1,.3,1);";

  const introEnabled = tenant === "profcar" || tenant === "r-drive";
  const theme = tenant === "profcar" ? {
    name: "ProfCar", subtitle: "Fahrzeuge, Finanzierung und Probefahrt – direkt hier.", color: "211,34,65",
    cards: [["Fahrzeuge","car",9,18],["Vergleich","compare",42,12],["Finanzierung","card",75,21],["Inzahlungnahme","trade",12,69],["Probefahrt","calendar",48,70],["Service","tool",79,62]]
  } : {
    name: "R-DRIVE", subtitle: "Dein Führerschein, deine Fragen, dein nächster Schritt.", color: "219,37,50",
    cards: [["Führerschein","car",9,18],["Preise","card",42,12],["Anmeldung","form",75,21],["Termine","calendar",12,69],["Lernhilfe","book",48,70],["Simulator","route",79,62]]
  };
  const paths = {
    car: '<path d="M5 11l2-5h10l2 5M4 11h16v7H4zM6 18v2m12-2v2M7 14h2m6 0h2"/>',
    compare: '<rect x="3" y="7" width="8" height="11" rx="2"/><rect x="13" y="7" width="8" height="11" rx="2"/><path d="M5 11h4m6 0h4M8 4h8"/>',
    card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
    trade: '<path d="M4 8h14l2 5v5H4zM6 8l2-3h8l2 3M7 15h2m6 0h2M5 20h14M18 3l3 2-3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5l2 2 4-4"/>',
    tool: '<path d="M14 6a5 5 0 0 0-6 6L3 17l4 4 5-5a5 5 0 0 0 6-6l-3 3-4-4z"/>',
    form: '<path d="M7 3h9l3 3v15H7zM16 3v4h3M10 11h6m-6 4h6M4 7v12"/>',
    book: '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1zM12 6v14"/>',
    route: '<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h5a4 4 0 0 0 0-8h-1a4 4 0 0 1 0-8h6"/>'
  };
  let width = 190, height = 190, ready = false, done = false, running = false;
  let timer = null, retry = null, openRetry = null, layer = null;

  function fadeLayer() {
    if (!layer) return;
    const old = layer;
    layer = null;
    old.style.transition = "opacity 500ms ease";
    old.style.opacity = "0";
    window.setTimeout(function () { old.remove(); }, 520);
  }
  function finish() {
    done = true;
    running = false;
    window.clearTimeout(timer);
    window.clearTimeout(retry);
    window.clearTimeout(openRetry);
    timer = retry = openRetry = null;
    fadeLayer();
  }
  function consentVisible() {
    const banner = document.getElementById("ccm-widget");
    if (!banner) return false;
    const style = window.getComputedStyle(banner);
    return banner.getClientRects().length > 0 && style.display !== "none" &&
      style.visibility !== "hidden" && Number(style.opacity) !== 0;
  }
  function requestOpen() {
    if (done) return;
    frame.contentWindow?.postMessage({type:"bt-chat-open"}, origin);
    openRetry = window.setTimeout(function () {
      if (!done) frame.contentWindow?.postMessage({type:"bt-chat-open"}, origin);
    }, 900);
  }
  function card(item, index, targetX, targetY) {
    const el = document.createElement("div");
    const small = window.innerWidth < 720;
    const size = small ? 82 : 108;
    const x = Math.max(8, Math.min(window.innerWidth - size - 8, window.innerWidth * item[2] / 100));
    const y = Math.max(8, Math.min(window.innerHeight - size - 8, window.innerHeight * item[3] / 100));
    el.style.cssText = "position:fixed;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border-radius:25px;border:1px solid rgba(255,255,255,.72);background:linear-gradient(145deg,rgba(255,255,255,.91),rgba(255,255,255,.48));box-shadow:0 22px 65px rgba(20,30,45,.17),0 0 32px rgba(" + theme.color + ",.16);backdrop-filter:blur(18px) saturate(170%);-webkit-backdrop-filter:blur(18px) saturate(170%);color:#18324d;font:700 " + (small ? 10 : 12) + "px/1.1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;will-change:transform,opacity;";
    el.style.width = size + "px"; el.style.height = size + "px";
    el.style.left = x + "px"; el.style.top = y + "px";
    el.innerHTML = '<svg viewBox="0 0 24 24" width="' + (small ? 25 : 30) + '" height="' + (small ? 25 : 30) + '" fill="none" stroke="rgb(' + theme.color + ')" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[item[1]] + '</svg><span>' + item[0] + '</span>';
    layer.appendChild(el);
    const dx = targetX - x - size / 2, dy = targetY - y - size / 2;
    el.animate?.([
      {opacity:0,transform:"translate3d(0,20px,0) scale(.7) rotate(-7deg)"},
      {opacity:1,transform:"translate3d(0,0,0) scale(1)",offset:.22},
      {opacity:1,transform:"translate3d(" + dx*.56 + "px," + (dy*.48-22) + "px,0) scale(1.06) rotate(4deg)",offset:.68},
      {opacity:0,transform:"translate3d(" + dx + "px," + dy + "px,0) scale(.18) rotate(9deg)"}
    ],{duration:2450+index*70,delay:250+index*120,easing:"cubic-bezier(.16,1,.3,1)",fill:"forwards"});
  }
  function runIntro() {
    if (done || running) return;
    running = true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      timer = window.setTimeout(requestOpen, 300);
      return;
    }
    layer = document.createElement("div");
    layer.id = "bt-interface-intro";
    layer.setAttribute("aria-hidden","true");
    layer.style.cssText = "position:fixed;inset:0;z-index:2147482999;pointer-events:none;overflow:hidden;opacity:1;background:radial-gradient(circle at 78% 76%,rgba(" + theme.color + ",.20),transparent 36%),linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,.06));backdrop-filter:blur(5px) saturate(125%);-webkit-backdrop-filter:blur(5px) saturate(125%);";
    document.body.appendChild(layer);
    const copy = document.createElement("div");
    copy.style.cssText = "position:fixed;left:50%;top:43%;width:min(85vw,620px);transform:translate(-50%,-50%);padding:20px 26px;border:1px solid rgba(255,255,255,.68);border-radius:25px;background:rgba(255,255,255,.68);box-shadow:0 22px 70px rgba(18,30,48,.15);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18324d;";
    const headline = document.createElement("div");
    headline.style.cssText = "font-size:clamp(21px,3vw,37px);font-weight:750;letter-spacing:-.03em;";
    headline.textContent = "Willkommen bei " + theme.name;
    const sub = document.createElement("div");
    sub.style.cssText = "margin-top:7px;font-size:clamp(12px,1.2vw,16px);font-weight:500;line-height:1.35;";
    sub.textContent = theme.subtitle;
    copy.appendChild(headline); copy.appendChild(sub); layer.appendChild(copy);
    copy.animate?.([
      {opacity:0,transform:"translate(-50%,-46%) scale(.96)"},
      {opacity:1,transform:"translate(-50%,-50%) scale(1)",offset:.2},
      {opacity:1,transform:"translate(-50%,-50%) scale(1)",offset:.7},
      {opacity:0,transform:"translate(-50%,-54%) scale(.98)"}
    ],{duration:3400,fill:"forwards",easing:"cubic-bezier(.16,1,.3,1)"});
    const rect = frame.getBoundingClientRect();
    const targetX = rect.right - 62, targetY = rect.bottom - 62;
    const ring = document.createElement("div");
    ring.style.cssText = "position:fixed;width:124px;height:124px;border-radius:50%;border:1px solid rgba(" + theme.color + ",.5);box-shadow:0 0 65px rgba(" + theme.color + ",.2);";
    ring.style.left = targetX - 62 + "px"; ring.style.top = targetY - 62 + "px";
    layer.appendChild(ring);
    ring.animate?.([{opacity:0,transform:"scale(.7)"},{opacity:1,transform:"scale(1.1)",offset:.3},{opacity:.8,transform:"scale(1)",offset:.72},{opacity:0,transform:"scale(.8)"}],{duration:3700,fill:"forwards",easing:"cubic-bezier(.16,1,.3,1)"});
    theme.cards.forEach(function (item,index) { card(item,index,targetX,targetY); });
    timer = window.setTimeout(function () {
      timer = null;
      fadeLayer();
      requestOpen();
    },3800);
  }
  function scheduleIntro() {
    if (!introEnabled || !ready || done || running || timer) return;
    if (document.visibilityState !== "visible" || consentVisible()) {
      window.clearTimeout(retry);
      retry = window.setTimeout(scheduleIntro,1000);
      return;
    }
    window.clearTimeout(retry); retry = null;
    timer = window.setTimeout(function () {
      timer = null;
      if (document.visibilityState !== "visible" || consentVisible()) scheduleIntro();
      else runIntro();
    },500);
  }
  function size() {
    const viewport = window.visualViewport;
    frame.style.width = Math.max(1,Math.min(width,(viewport?.width || window.innerWidth)-16))+"px";
    frame.style.height = Math.max(1,Math.min(height,(viewport?.height || window.innerHeight)-16))+"px";
    frame.style.bottom = (8+Math.max(0,window.innerHeight-(viewport?.height || window.innerHeight)-(viewport?.offsetTop || 0)))+"px";
  }
  window.addEventListener("message",function (event) {
    if (event.origin !== origin || event.source !== frame.contentWindow || !event.data) return;
    if (event.data.type === "bt-chat-ready") { ready = true; scheduleIntro(); return; }
    if (event.data.type !== "bt-chat-resize") return;
    const w = Number(event.data.width), h = Number(event.data.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    if (introEnabled && (w > 190 || h > 190)) finish();
    width = Math.min(w,1200); height = Math.min(h,1100); size();
  });
  window.addEventListener("resize",size);
  document.addEventListener("visibilitychange",scheduleIntro);
  window.visualViewport?.addEventListener("resize",size);
  window.visualViewport?.addEventListener("scroll",size);
  frame.addEventListener("load",function () { ready = true; scheduleIntro(); });
  function mount() { frame.src = src.toString(); document.body.appendChild(frame); size(); }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded",mount,{once:true});
})();
