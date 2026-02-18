(function () {
  var tenant = window.BT_CHAT_TENANT || "demo";
  var base = window.BT_CHAT_BASE_URL || "";

  var btn = document.createElement("button");
  btn.innerText = "Chat";
  btn.style.position = "fixed";
  btn.style.right = "18px";
  btn.style.bottom = "18px";
  btn.style.zIndex = "999999";
  btn.style.padding = "12px 14px";
  btn.style.borderRadius = "999px";
  btn.style.border = "1px solid rgba(0,0,0,0.15)";
  btn.style.background = "#fff";
  btn.style.cursor = "pointer";

  var frame = document.createElement("iframe");
  frame.src = base + "/widget?tenant=" + encodeURIComponent(tenant);
  frame.style.position = "fixed";
  frame.style.right = "18px";
  frame.style.bottom = "70px";
  frame.style.width = "380px";
  frame.style.height = "520px";
  frame.style.border = "1px solid rgba(0,0,0,0.15)";
  frame.style.borderRadius = "16px";
  frame.style.zIndex = "999999";
  frame.style.background = "#fff";
  frame.style.display = "none";

  btn.onclick = function () {
    frame.style.display = frame.style.display === "none" ? "block" : "none";
  };

  document.body.appendChild(btn);
  document.body.appendChild(frame);
})();
