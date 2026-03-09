// app/widget/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getTenant } from "@/lib/tenants";
import { MessageCircle } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export default function WidgetPage() {
  // --- Hydration fix: Tenant erst im Client bestimmen ---
  const [mounted, setMounted] = useState(false);
  const [tenantId, setTenantId] = useState("demo");
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    setMounted(true);

    const params = new URLSearchParams(window.location.search);

    const t = params.get("tenant") || "demo";
    const embedded = params.get("embed") === "1";

    setTenantId(t);
    setIsEmbedded(embedded);
  }, []);

  const cfg = useMemo(() => getTenant(tenantId), [tenantId]);
  const theme = cfg.theme;

  const [open, setOpen] = useState(false);

  // Messages erst NACH mount initialisieren (sonst wieder Mismatch über cfg.assistantName)
  const [msgs, setMsgs] = useState<Msg[]>([]);
  useEffect(() => {
    if (!mounted) return;
    setMsgs([{ role: "assistant", content: `Hi — ich bin ${cfg.assistantName}. Worum geht’s?` }]);
  }, [mounted, cfg.assistantName]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Launcher attention (dock-like bounce) + badge
  const [attention, setAttention] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const isEmbedClosed = isEmbedded && !open;

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  useEffect(() => {
    const t = setTimeout(() => setShowBadge(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Unregelmäßiges Bounce, wenn Chat geschlossen ist (wie Dock-Icons)
  useEffect(() => {
    if (open) return;

    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      const nextInMs = 5500 + Math.floor(Math.random() * 9000);
      t = setTimeout(() => {
        setAttention(true);
        setTimeout(() => setAttention(false), 920);
        schedule();
      }, nextInMs);
    };

    schedule();
    return () => {
      if (t) clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!isEmbedded) return;

    const size = open
      ? { type: "bt-chat-resize", width: 390, height: 700 }
      : { type: "bt-chat-resize", width: 76, height: 76 };

    window.parent.postMessage(size, "*");
  }, [open, isEmbedded]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/chat?tenant=${encodeURIComponent(tenantId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant: tenantId, messages: next }),
      });

      const data = await res.json();
      const assistantMsg: Msg = { role: "assistant", content: data?.reply || "Okay." };
      setMsgs([...next, assistantMsg]);
    } catch {
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: "Kurz ein technisches Problem — versuch’s nochmal.",
        } as Msg,
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMsgs([{ role: "assistant", content: `Alles klar — womit kann ich dir helfen?` }]);
    setInput("");
  }

  const panelW = 520;
  const panelH = 720;
  const panelRadius = 28;

  // Globales Logo (für alle Tenants gleich)
  // Wenn deine Datei NICHT in /public/brand liegt, ändere auf "/BtAI%20Logo.png"
  const GLOBAL_LOGO_SRC = "/brand/btai-logo.png";

  // Wenn noch nicht gemounted: nichts rendern -> verhindert Hydration-Error komplett
  if (!mounted) return null;

  const launcherOffset = isEmbedded ? 10 : 18;
  const panelOffsetBottom = launcherOffset + 80;
  const wrapperBackground = isEmbedded
    ? "transparent"
    : `
          radial-gradient(1200px 900px at 70% 12%, ${theme.accent}38 0%, transparent 60%),
          radial-gradient(900px 700px at 12% 78%, ${theme.accent}22 0%, transparent 62%),
          radial-gradient(700px 520px at 55% 55%, rgba(255,255,255,0.05) 0%, transparent 72%),
          linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)),
          ${theme.bg}
        `;

  const launcherButton = (
    <button
      className={`bt-launcher ${attention ? "bt-bouncing" : ""}`}
      onClick={() => {
        setOpen((v) => !v);
        setShowBadge(false);
      }}
      style={{
        width: 64,
        height: 64,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.28)",
        background: `
          radial-gradient(140px 80px at 35% 25%, ${theme.accent}50 0%, transparent 65%),
          linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.10))
        `,
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        boxShadow: `0 18px 52px rgba(0,0,0,0.28), 0 0 0 1px ${theme.accent}20 inset`,
        cursor: "pointer",
        color: "#ffffff",
        display: "grid",
        placeItems: "center",
      }}
      aria-label="Chat öffnen"
      title={`${cfg.brandName} Chat`}
    >
      {open ? (
        <span style={{ fontSize: 20, lineHeight: "20px" }}>×</span>
      ) : (
        <MessageCircle size={28} strokeWidth={2.5} />
      )}
    </button>
  );

  return (
    <div
      style={{
        minHeight: isEmbedded ? "auto" : "100vh",
        background: wrapperBackground,
        color: "#163126",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <style>{`
        html, body {
          background: transparent !important;
        }

        @keyframes bt-pulse {
          0% { transform: scale(1); opacity: .85; }
          70% { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }

        @keyframes bt-dock-bounce {
          0%   { transform: translateY(0) scale(1); }
          10%  { transform: translateY(-12px) scale(1.04); }
          22%  { transform: translateY(0) scale(0.99); }
          34%  { transform: translateY(-7px) scale(1.025); }
          46%  { transform: translateY(0) scale(1); }
          100% { transform: translateY(0) scale(1); }
        }

        @keyframes bt-badge-in {
          0% { opacity: 0; transform: translateY(6px) scale(.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bt-badge-out {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(6px) scale(.98); }
        }
        @keyframes bt-liquid {
          0% { transform: translate3d(-6%, -4%, 0) scale(1); opacity: .50; }
          50% { transform: translate3d(6%, 3%, 0) scale(1.03); opacity: .62; }
          100% { transform: translate3d(-6%, -4%, 0) scale(1); opacity: .50; }
        }

        .bt-launcher {
          position: relative;
          overflow: visible;
          will-change: transform;
          transform: translateZ(0);
        }
        .bt-launcher::before {
          content: "";
          position: absolute;
          inset: -10px;
          border-radius: 999px;
          background: radial-gradient(circle, ${theme.accent}28 0%, ${theme.accent}10 42%, transparent 72%);
          filter: blur(2px);
          opacity: 0.9;
          pointer-events: none;
        }
        .bt-launcher::after {
          content: "";
          position: absolute;
          inset: -14px;
          border-radius: 999px;
          border: 1px solid ${theme.accent}30;
          animation: bt-pulse 2.4s ease-out infinite;
          pointer-events: none;
        }
        .bt-bouncing { animation: bt-dock-bounce 920ms cubic-bezier(.2,.9,.2,1) 1; }

        .bt-badge {
          position: absolute;
          right: 72px;
          bottom: 10px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.20);
          background: linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.18));
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          box-shadow: 0 16px 50px rgba(0,0,0,0.16);
          color: #163126;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          animation: bt-badge-in 260ms ease-out;
        }
        .bt-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: ${theme.accent};
          box-shadow: 0 0 0 6px ${theme.accent}22;
        }
        .bt-badge-hide { animation: bt-badge-out 240ms ease-in forwards; }

        .bt-panel {
          border-radius: ${panelRadius}px;
          overflow: hidden;
          transform: translateZ(0);
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          isolation: isolate;
        }
        .bt-panel-layer { border-radius: ${panelRadius}px; }

        @media (prefers-reduced-motion: reduce) {
          .bt-bouncing { animation: none !important; }
          .bt-launcher::after { animation: none !important; }
          .bt-panel-liquid { animation: none !important; }
        }
      `}</style>

      {isEmbedClosed ? (
        <div
          style={{
            position: "fixed",
            right: launcherOffset,
            bottom: launcherOffset,
            zIndex: 999999,
          }}
        >
          {launcherButton}
        </div>
      ) : (
        <>
          {/* Floating Launcher + Badge */}
          <div style={{ position: "fixed", right: launcherOffset, bottom: launcherOffset, zIndex: 999999 }}>
            {!open && showBadge && !isEmbedded && (
              <div className={`bt-badge ${!showBadge ? "bt-badge-hide" : ""}`}>
                <span className="bt-badge-dot" />
                <span>Fragen? Chatte mit {cfg.assistantName}</span>
              </div>
            )}

            {launcherButton}
          </div>

          {/* Panel */}
          {open && (
            <div
              className="bt-panel"
              style={{
                position: "fixed",
                right: launcherOffset,
                bottom: panelOffsetBottom,
                width: panelW,
                maxWidth: "calc(100vw - 36px)",
                height: panelH,
                maxHeight: "calc(100vh - 150px)",
                border: "1px solid rgba(255,255,255,0.26)",
                background: `
                  radial-gradient(900px 480px at 18% -10%, ${theme.accent}55 0%, transparent 62%),
                  radial-gradient(700px 460px at 95% 10%, rgba(255,255,255,0.10) 0%, transparent 55%),
                  linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.58))
                `,
                backdropFilter: "blur(28px) saturate(155%)",
                WebkitBackdropFilter: "blur(28px) saturate(155%)",
                boxShadow: "0 30px 120px rgba(0,0,0,0.22)",
                zIndex: 999999,
              }}
            >
              {/* Liquid layer */}
              <div
                className="bt-panel-layer bt-panel-liquid"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  filter: "blur(24px)",
                  animation: "bt-liquid 8.5s ease-in-out infinite",
                  background: `
                    radial-gradient(520px 220px at 18% 12%, ${theme.accent}55 0%, transparent 72%),
                    radial-gradient(520px 240px at 80% 20%, ${theme.accent}32 0%, transparent 75%),
                    radial-gradient(520px 320px at 42% 78%, rgba(255,255,255,0.10) 0%, transparent 70%)
                  `,
                  mixBlendMode: "screen",
                  opacity: 0.42,
                }}
              />

              {/* Glass shine */}
              <div
                className="bt-panel-layer"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "linear-gradient(120deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 34%, rgba(255,255,255,0.10) 70%, rgba(255,255,255,0.02) 100%)",
                  opacity: 0.22,
                  mixBlendMode: "screen",
                }}
              />

              {/* Accent top line */}
              <div
                className="bt-panel-layer"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
                  opacity: 0.7,
                  pointerEvents: "none",
                }}
              />

              {/* Layout */}
              <div
                style={{
                  position: "relative",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                {/* HEADER */}
                <div
                  style={{
                    padding: "20px 16px 18px",
                    borderBottom: "1px solid rgba(22,49,38,0.10)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    minHeight: 92,
                    flex: "0 0 auto",
                    background: `
                      radial-gradient(520px 180px at 18% 0%, ${theme.accent}32 0%, transparent 72%),
                      linear-gradient(180deg, rgba(255,255,255,0.20), rgba(255,255,255,0.08))
                    `,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: loading ? "#f5c542" : "#2ee59d",
                        boxShadow: `0 0 0 7px ${
                          loading ? "rgba(245,197,66,0.16)" : "rgba(46,229,157,0.16)"
                        }`,
                        flex: "0 0 auto",
                      }}
                    />
                    <div style={{ lineHeight: 1.2 }}>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          letterSpacing: 0.3,
                          opacity: 0.96,
                          color: "#163126",
                        }}
                      >
                        {cfg.brandName} – {cfg.assistantName}
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2, color: "#2d5a49" }}>
                        {loading ? "Tippt…" : "Online verfügbar"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* Globales Logo */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 64,
                        padding: "10px 18px",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.22)",
                        background: "rgba(30,40,34,0.30)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                      }}
                      title="Powered"
                    >
                      <img
                        src={GLOBAL_LOGO_SRC}
                        alt="Logo"
                        height={22}
                        style={{
                          height: 52,
                          width: "auto",
                          display: "block",
                          objectFit: "contain",
                          filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.35))",
                        }}
                      />
                    </div>
                    {cfg.primaryCta?.url && (
                      <a
                        href={cfg.primaryCta.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12,
                          padding: "10px 11px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: `linear-gradient(180deg, ${theme.accent}D9, ${theme.accent}88)`,
                          color: "#ffffff",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                        }}
                        title={cfg.primaryCta.label}
                      >
                        {cfg.primaryCta.label}
                      </a>
                    )}

                    <button
                      onClick={resetChat}
                      style={{
                        fontSize: 12,
                        padding: "10px 11px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(255,255,255,0.55)",
                        color: "#163126",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      title="Chat neu starten"
                    >
                      Neu
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={listRef}
                  style={{
                    flex: "1 1 auto",
                    minHeight: 0,
                    overflowY: "auto",
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {msgs.map((m, i) => {
                    const isUser = m.role === "user";
                    return (
                      <div
                        key={i}
                        style={{
                          alignSelf: isUser ? "flex-end" : "flex-start",
                          maxWidth: "86%",
                        }}
                      >
                        <div
                          style={{
                            padding: "12px 14px",
                            borderRadius: 16,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.4,
                            fontSize: 15,
                            border: isUser
                              ? "1px solid rgba(255,255,255,0.18)"
                              : "1px solid rgba(22,49,38,0.08)",
                            background: isUser
                              ? `linear-gradient(180deg, ${theme.accent}D9, ${theme.accent}99)`
                              : `linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.68))`,
                            boxShadow: isUser
                              ? `0 12px 30px rgba(0,0,0,0.16), 0 0 0 1px ${theme.accent}14 inset`
                              : "0 8px 22px rgba(0,0,0,0.08)",
                            backdropFilter: "blur(12px) saturate(145%)",
                            WebkitBackdropFilter: "blur(12px) saturate(145%)",
                            color: isUser ? "#ffffff" : "#163126",
                          }}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })}

                  {loading && (
                    <div style={{ alignSelf: "flex-start", maxWidth: "86%" }}>
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 16,
                          border: "1px solid rgba(22,49,38,0.08)",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.68))",
                          fontSize: 15,
                          opacity: 0.88,
                          backdropFilter: "blur(12px) saturate(145%)",
                          WebkitBackdropFilter: "blur(12px) saturate(145%)",
                          color: "#163126",
                        }}
                      >
                        <span style={{ letterSpacing: 3 }}>•••</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div
                  style={{
                    padding: 16,
                    paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
                    borderTop: "1px solid rgba(22,49,38,0.08)",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
                    flex: "0 0 auto",
                  }}
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") send();
                    }}
                    placeholder="Schreib eine Frage…"
                    style={{
                      flex: 1,
                      height: 50,
                      padding: "0 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.24)",
                      background: "rgba(255,255,255,0.72)",
                      backdropFilter: "blur(14px) saturate(150%)",
                      WebkitBackdropFilter: "blur(14px) saturate(150%)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                      color: "#163126",
                      outline: "none",
                      caretColor: "#163126",
                    }}
                  />

                  <button
                    onClick={send}
                    disabled={!input.trim() || loading}
                    style={{
                      height: 50,
                      padding: "0 18px",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: input.trim()
                        ? `linear-gradient(180deg, ${theme.accent}ff, ${theme.accent}55)`
                        : "rgba(255,255,255,0.22)",
                      color: input.trim() ? "#ffffff" : "#5c7a6d",
                      cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                      opacity: loading ? 0.72 : 1,
                      boxShadow: input.trim()
                        ? `0 18px 46px rgba(0,0,0,0.16), 0 0 0 1px ${theme.accent}18 inset`
                        : "none",
                    }}
                  >
                    Senden
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}