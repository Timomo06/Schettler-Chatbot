/* Dasselbe Script auf allen angebundenen Fahrschul-Websites einsetzen. */
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
  frame.style.cssText = "position:fixed;right:8px;bottom:8px;width:190px;height:190px;border:0;background:transparent;z-index:2147483000;color-scheme:light;";
  let width=190, height=190;
  const introEnabled = tenant === "profcar" || tenant === "r-drive";
  const introKey = "bt-chat-intro-v1:" + host;
  let introReady = false;
  let introDone = false;
  let introTimer = null;
  let introRetry = null;
  try { introDone = !!window.sessionStorage.getItem(introKey); } catch (_) {}
  function finishIntro() {
    introDone = true;
    window.clearTimeout(introTimer);
    window.clearTimeout(introRetry);
    introTimer = introRetry = null;
    try { window.sessionStorage.setItem(introKey, "1"); } catch (_) {}
  }
  function consentVisible() {
    const banner = document.getElementById("ccm-widget");
    if (!banner) return false;
    const style = window.getComputedStyle(banner);
    return banner.getClientRects().length > 0 &&
      style.display !== "none" && style.visibility !== "hidden" &&
      Number(style.opacity) !== 0;
  }
  function scheduleIntro() {
    if (!introEnabled || !introReady || introDone || introTimer) return;
    if (document.visibilityState !== "visible" || consentVisible()) {
      window.clearTimeout(introRetry);
      introRetry = window.setTimeout(scheduleIntro, 1200);
      return;
    }
    window.clearTimeout(introRetry);
    introRetry = null;
    introTimer = window.setTimeout(function () {
      introTimer = null;
      if (document.visibilityState !== "visible" || consentVisible()) {
        scheduleIntro();
        return;
      }
      finishIntro();
      frame.contentWindow?.postMessage({type:"bt-chat-open"}, origin);
    }, 3600);
  }
  function size() {
    const viewport = window.visualViewport;
    frame.style.width = Math.max(1,Math.min(width,(viewport?.width || window.innerWidth)-16))+"px";
    frame.style.height = Math.max(1,Math.min(height,(viewport?.height || window.innerHeight)-16))+"px";
    frame.style.bottom = (8 + Math.max(0,window.innerHeight-(viewport?.height || window.innerHeight)-(viewport?.offsetTop || 0)))+"px";
  }
  window.addEventListener("message",function(event){
    if(event.origin!==origin || event.source!==frame.contentWindow || !event.data) return;
    if(event.data.type==="bt-chat-ready") {introReady=true;scheduleIntro();return;}
    if(event.data.type!=="bt-chat-resize") return;
    const w=Number(event.data.width), h=Number(event.data.height);
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0) return;
    if(introEnabled && (w>190 || h>190)) finishIntro();
    width=Math.min(w,1200);height=Math.min(h,1100);size();
  });
  window.addEventListener("resize",size);
  document.addEventListener("visibilitychange",scheduleIntro);
  window.visualViewport?.addEventListener("resize",size);
  window.visualViewport?.addEventListener("scroll",size);
  frame.addEventListener("load",function(){introReady=true;scheduleIntro();});
  function mount(){frame.src=src.toString();document.body.appendChild(frame);size();}
  if(document.body) mount(); else document.addEventListener("DOMContentLoaded",mount,{once:true});
})();
