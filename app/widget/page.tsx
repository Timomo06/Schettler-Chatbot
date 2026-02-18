// app/widget/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getTenant } from "@/lib/tenants";

type Msg = { role: "user" | "assistant"; content: string };

export default function WidgetPage() {
  // --- Hydration fix: Tenant erst im Client bestimmen ---
  const [mounted, setMounted] = useState(false);
  const [tenantId, setTenantId] = useState("demo");

  useEffect(() => {
    setMounted(true);
    const t = new URLSearchParams(window.location.search).get("tenant") || "demo";
    setTenantId(t);
  }, []);

  const cfg = useMemo(() => getTenant(tenantId), [tenantId]);
  const theme = cfg.theme;

  const [open, setOpen] = useState(true);

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
  const GLOBAL_LOGO_SRC = "/brand/BtAI%20Logo.png";

  // Wenn noch nicht gemounted: nichts rendern -> verhindert Hydration-Error komplett
  if (!mounted) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(1200px 900px at 70% 12%, ${theme.accent}55 0%, transparent 60%),
          radial-gradient(900px 700px at 12% 78%, ${theme.accent}30 0%, transparent 62%),
          radial-gradient(700px 520px at 55% 55%, rgba(255,255,255,0.08) 0%, transparent 72%),
          linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)),
          ${theme.bg}
        `,
        color: theme.text,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <style>{`
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
          0% { transform: translate3d(-6%, -4%, 0) scale(1); opacity: .58; }
          50% { transform: translate3d(6%, 3%, 0) scale(1.03); opacity: .72; }
          100% { transform: translate3d(-6%, -4%, 0) scale(1); opacity: .58; }
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
          background: radial-gradient(circle, ${theme.accent}40 0%, ${theme.accent}18 42%, transparent 72%);
          filter: blur(2px);
          opacity: 0.9;
          pointer-events: none;
        }
        .bt-launcher::after {
          content: "";
          position: absolute;
          inset: -14px;
          border-radius: 999px;
          border: 1px solid ${theme.accent}44;
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
          border: 1px solid rgba(255,255,255,0.18);
          background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05));
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          box-shadow: 0 16px 50px rgba(0,0,0,0.45);
          color: rgba(234,242,255,0.92);
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
          box-shadow: 0 0 0 6px ${theme.accent}33;
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

      {/* Floating Launcher + Badge */}
      <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 999999 }}>
        {!open && showBadge && (
          <div className={`bt-badge ${!showBadge ? "bt-badge-hide" : ""}`}>
            <span className="bt-badge-dot" />
            <span>Fragen? Chatte mit {cfg.assistantName}</span>
          </div>
        )}

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
            border: "1px solid rgba(255,255,255,0.18)",
            background: `
              radial-gradient(140px 80px at 35% 25%, ${theme.accent}55 0%, transparent 65%),
              linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))
            `,
            backdropFilter: "blur(18px) saturate(160%)",
            WebkitBackdropFilter: "blur(18px) saturate(160%)",
            boxShadow: `0 18px 52px rgba(0,0,0,0.55), 0 0 0 1px ${theme.accent}22 inset`,
            cursor: "pointer",
            color: theme.text,
            display: "grid",
            placeItems: "center",
          }}
          aria-label="Chat öffnen"
          title={`${cfg.brandName} Chat`}
        >
          {open ? (
            <span style={{ fontSize: 20, lineHeight: "20px" }}>×</span>
          ) : (
            <img
              src={cfg.assets.launcherIcon}
              alt={`${cfg.brandName} Chat`}
              width={28}
              height={28}
              style={{ display: "block" }}
            />
          )}
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div
          className="bt-panel"
          style={{
            position: "fixed",
            right: 18,
            bottom: 98,
            width: panelW,
            maxWidth: "calc(100vw - 36px)",
            height: panelH,
            maxHeight: "calc(100vh - 150px)",
            border: "1px solid rgba(255,255,255,0.16)",
            background: `
              radial-gradient(900px 480px at 18% -10%, ${theme.accent}45 0%, transparent 62%),
              radial-gradient(700px 460px at 95% 10%, rgba(255,255,255,0.14) 0%, transparent 55%),
              linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.05))
            `,
            backdropFilter: "blur(28px) saturate(155%)",
            WebkitBackdropFilter: "blur(28px) saturate(155%)",
            boxShadow: "0 30px 120px rgba(0,0,0,0.65)",
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
                radial-gradient(520px 220px at 18% 12%, ${theme.accent}85 0%, transparent 72%),
                radial-gradient(520px 240px at 80% 20%, ${theme.accent}55 0%, transparent 75%),
                radial-gradient(520px 320px at 42% 78%, rgba(255,255,255,0.14) 0%, transparent 70%)
              `,
              mixBlendMode: "screen",
              opacity: 0.62,
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
                "linear-gradient(120deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 34%, rgba(255,255,255,0.14) 70%, rgba(255,255,255,0.03) 100%)",
              opacity: 0.26,
              mixBlendMode: "screen",
            }}
          />

          {/* Accent top line (minimal kräftiger) */}
          <div
            className="bt-panel-layer"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
              opacity: 0.95,
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
            {/* HEADER: größer + Logo statt "BT AI" */}
            <div
              style={{
                padding: "20px 16px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                minHeight: 92,
                flex: "0 0 auto",
                background: `
                  radial-gradient(520px 180px at 18% 0%, ${theme.accent}72 0%, transparent 72%),
                  linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.04))
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
                    }}
                  >
                    {cfg.brandName} – {cfg.assistantName}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>
                    {loading ? "Tippt…" : "Online verfügbar"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Globales Logo (immer gleich, tenant-unabhängig) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.07)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                  title="Powered"
                >
                  <img
                    src={GLOBAL_LOGO_SRC}
                    alt="Logo"
                    height={22}
                    style={{ display: "block", maxHeight: 22, width: "auto" }}
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
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: `linear-gradient(180deg, ${theme.accent}80, ${theme.accent}30)`,
                      color: theme.text,
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
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.05)",
                    color: theme.text,
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
                          : "1px solid rgba(255,255,255,0.10)",
                        background: isUser
                          ? `linear-gradient(180deg, ${theme.accent}85, ${theme.accent}35)`
                          : `linear-gradient(180deg, ${theme.accent}18, rgba(255,255,255,0.06))`,
                        boxShadow: isUser
                          ? `0 12px 30px rgba(0,0,0,0.28), 0 0 0 1px ${theme.accent}18 inset`
                          : "0 8px 22px rgba(0,0,0,0.18)",
                        backdropFilter: "blur(12px) saturate(145%)",
                        WebkitBackdropFilter: "blur(12px) saturate(145%)",
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
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: `linear-gradient(180deg, ${theme.accent}14, rgba(255,255,255,0.06))`,
                      fontSize: 15,
                      opacity: 0.88,
                      backdropFilter: "blur(12px) saturate(145%)",
                      WebkitBackdropFilter: "blur(12px) saturate(145%)",
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
                borderTop: "1px solid rgba(255,255,255,0.10)",
                display: "flex",
                gap: 10,
                alignItems: "center",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
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
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(14px) saturate(150%)",
                  WebkitBackdropFilter: "blur(14px) saturate(150%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                  color: theme.text,
                  outline: "none",
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
                    : "rgba(255,255,255,0.07)",
                  color: theme.text,
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  opacity: loading ? 0.72 : 1,
                  boxShadow: input.trim()
                    ? `0 18px 46px rgba(0,0,0,0.42), 0 0 0 1px ${theme.accent}22 inset`
                    : "none",
                }}
              >
                Senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
