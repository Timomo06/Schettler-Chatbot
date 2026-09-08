/* Dasselbe Script auf Rathje, FSAZ und Campus B27 einsetzen. */
(function () {
  "use strict";
  const script = document.currentScript;
  if (!script || document.getElementById("bt-school-demo-frame")) return;
  const tenants = {"fahrschule-rathje.de":"fahrschule-rathje","fsaz.de":"fsaz","campus-b27.de":"campus-b27"};
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
  frame.title = tenant === "fsaz" ? "Simulator-Assistent der Fahrschule Rathje" : tenant === "campus-b27" ? "Campus B27 Ausbildungs-Assistent" : "Fahrschule Rathje Führerschein-Assistent";
  frame.allow = "microphone";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.style.cssText = "position:fixed;right:8px;bottom:8px;width:190px;height:190px;border:0;background:transparent;z-index:2147483000;color-scheme:light;";
  let width=190, height=190;
  function size() {
    const viewport = window.visualViewport;
    frame.style.width = Math.max(1,Math.min(width,(viewport?.width || window.innerWidth)-16))+"px";
    frame.style.height = Math.max(1,Math.min(height,(viewport?.height || window.innerHeight)-16))+"px";
    frame.style.bottom = (8 + Math.max(0,window.innerHeight-(viewport?.height || window.innerHeight)-(viewport?.offsetTop || 0)))+"px";
  }
  window.addEventListener("message",function(event){
    if(event.origin!==origin || event.source!==frame.contentWindow || !event.data || event.data.type!=="bt-chat-resize") return;
    const w=Number(event.data.width), h=Number(event.data.height);
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0) return;
    width=Math.min(w,1200);height=Math.min(h,1100);size();
  });
  window.addEventListener("resize",size);
  window.visualViewport?.addEventListener("resize",size);
  window.visualViewport?.addEventListener("scroll",size);
  function mount(){frame.src=src.toString();document.body.appendChild(frame);size();}
  if(document.body) mount(); else document.addEventListener("DOMContentLoaded",mount,{once:true});
})();
