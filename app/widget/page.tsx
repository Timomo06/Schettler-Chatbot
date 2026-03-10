// app/widget/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getTenant } from "@/lib/tenants";
import { MessageCircle } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export default function WidgetPage() {
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
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attention, setAttention] = useState(false);
  const [showBadge, setShowBadge] = useState(true);

  const isEmbedClosed = isEmbedded && !open;
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setMsgs([{ role: "assistant", content: `Hi — ich bin ${cfg.assistantName}. Worum geht’s?` }]);
  }, [mounted, cfg.assistantName]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  useEffect(() => {
    const t = setTimeout(() => setShowBadge(false), 5000);
    return () => clearTimeout(t);
  }, []);

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
      : { type: "bt-chat-resize", width: 96, height: 96 };

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
  const GLOBAL_LOGO_SRC = "/brand/btai-logo.png";

  if (!mounted) return null;

  const launcherOffset = isEmbedded ? 12 : 18;
  const panelOffsetBottom = launcherOffset + 86;

  const wrapperBackground = isEmbedded
    ? "transparent"
    : `
        radial-gradient(1200px 900px at 70% 12%, ${theme.accent}18 0%, transparent 60%),
        radial-gradient(900px 700px at 12% 78%, ${theme.accent}10 0%, transparent 62%),
        radial-gradient(700px 520px at 55% 55%, rgba(255,255,255,0.04) 0%, transparent 72%),
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
        width: 66,
        height: 66,
        borderRadius: 999,
        border: open
          ? "1px solid rgba(117,255,193,0.34)"
          : "1px solid rgba(117,255,193,0.56)",
        background: open
          ? `
              radial-gradient(150px 96px at 35% 25%, rgba(46,229,157,0.34) 0%, transparent 65%),
              linear-gradient(180deg, rgba(255,255,255,0.28), rgba(46,229,157,0.16))
            `
          : `
              radial-gradient(150px 96px at 35% 25%, rgba(46,229,157,0.72) 0%, transparent 65%),
              linear-gradient(180deg, rgba(255,255,255,0.30), rgba(46,229,157,0.26))
            `,
        backdropFilter: "blur(18px) saturate(175%)",
        WebkitBackdropFilter: "blur(18px) saturate(175%)",
        boxShadow: open
          ? "0 18px 52px rgba(0,0,0,0.22), 0 0 0 1px rgba(46,229,157,0.20) inset, 0 0 26px rgba(46,229,157,0.16)"
          : "0 18px 52px rgba(0,0,0,0.20), 0 0 0 1px rgba(46,229,157,0.34) inset, 0 0 42px rgba(46,229,157,0.30)",
        cursor: "pointer",
        color: "#ffffff",
        display: "grid",
        placeItems: "center",
        position: "relative",
        zIndex: 2,
        pointerEvents: "auto",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
      }}
      aria-label="Chat öffnen"
      title={`${cfg.brandName} Chat`}
    >
      {open ? (
        <span
          style={{
            fontSize: 20,
            lineHeight: "20px",
            textShadow: "0 0 12px rgba(46,229,157,0.20)",
          }}
        >
          ×
        </span>
      ) : (
        <MessageCircle
          size={28}
          strokeWidth={2.5}
          style={{
            filter: "drop-shadow(0 0 10px rgba(46,229,157,0.16))",
          }}
        />
      )}
    </button>
  );

  return (
    <div
      style={{
        minHeight: isEmbedded ? 96 : "100vh",
        width: isEmbedded && !open ? 96 : undefined,
        height: isEmbedded && !open ? 96 : undefined,
        background: wrapperBackground,
        color: "#163126",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        overflow: "visible",
        pointerEvents: isEmbedClosed ? "none" : "auto",
      }}
    >
      <style>{`
        html, body {
          background: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        body::before,
        body::after {
          display: none !important;
          content: none !important;
        }

        @keyframes bt-pulse {
          0% { transform: scale(1); opacity: .9; }
          70% { transform: scale(1.26); opacity: 0; }
          100% { transform: scale(1.26); opacity: 0; }
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
          0% { transform: translate3d(-6%, -4%, 0) scale(1); opacity: .36; }
          50% { transform: translate3d(6%, 3%, 0) scale(1.03); opacity: .48; }
          100% { transform: translate3d(-6%, -4%, 0) scale(1); opacity: .36; }
        }

        .bt-launcher {
          position: relative;
          overflow: visible;
          will-change: transform;
          transform: translateZ(0);
          background-clip: padding-box;
        }

        .bt-launcher::before {
          content: "";
          position: absolute;
          inset: -12px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(46,229,157,0.36) 0%, rgba(46,229,157,0.13) 42%, transparent 72%);
          filter: blur(3px);
          opacity: 1;
          pointer-events: none;
        }

        .bt-launcher::after {
          content: "";
          position: absolute;
          inset: -16px;
          border-radius: 999px;
          border: 1px solid rgba(46,229,157,0.32);
          animation: bt-pulse 2.4s ease-out infinite;
          pointer-events: none;
        }

        .bt-bouncing {
          animation: bt-dock-bounce 920ms cubic-bezier(.2,.9,.2,1) 1;
        }

        .bt-badge {
          position: absolute;
          right: 74px;
          bottom: 12px;
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
          box-shadow: 0 0 0 6px rgba(46,229,157,0.16);
        }

        .bt-badge-hide {
          animation: bt-badge-out 240ms ease-in forwards;
        }

        .bt-panel {
          border-radius: ${panelRadius}px;
          overflow: hidden;
          transform: translateZ(0);
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          isolation: isolate;
        }

        .bt-panel-layer {
          border-radius: ${panelRadius}px;
        }

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
            width: 96,
            height: 96,
            display: "grid",
            placeItems: "center",
            zIndex: 999999,
            background: "transparent",
            boxShadow: "none",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {launcherButton}
        </div>
      ) : (
        <>
          <div
            style={{
              position: "fixed",
              right: launcherOffset,
              bottom: launcherOffset,
              width: 96,
              height: 96,
              display: "grid",
              placeItems: "center",
              zIndex: 999999,
              background: "transparent",
              boxShadow: "none",
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            {!open && showBadge && !isEmbedded && (
              <div className={`bt-badge ${!showBadge ? "bt-badge-hide" : ""}`}>
                <span className="bt-badge-dot" />
                <span>Fragen? Chatte mit {cfg.assistantName}</span>
              </div>
            )}

            {launcherButton}
          </div>

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
                border: "1px solid rgba(255,255,255,0.46)",
                background: `
                  radial-gradient(900px 480px at 18% -10%, ${theme.accent}20 0%, transparent 62%),
                  radial-gradient(700px 460px at 95% 10%, rgba(255,255,255,0.12) 0%, transparent 55%),
                  linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.68))
                `,
                backdropFilter: "blur(28px) saturate(150%)",
                WebkitBackdropFilter: "blur(28px) saturate(150%)",
                boxShadow:
                  "0 30px 120px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.12) inset",
                zIndex: 999999,
              }}
            >
              <div
                className="bt-panel-layer bt-panel-liquid"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  filter: "blur(24px)",
                  animation: "bt-liquid 8.5s ease-in-out infinite",
                  background: `
                    radial-gradient(520px 220px at 18% 12%, ${theme.accent}18 0%, transparent 72%),
                    radial-gradient(520px 240px at 80% 20%, rgba(255,255,255,0.10) 0%, transparent 75%),
                    radial-gradient(520px 320px at 42% 78%, rgba(255,255,255,0.08) 0%, transparent 70%)
                  `,
                  mixBlendMode: "screen",
                  opacity: 0.30,
                }}
              />

              <div
                className="bt-panel-layer"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "linear-gradient(120deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 34%, rgba(255,255,255,0.08) 70%, rgba(255,255,255,0.02) 100%)",
                  opacity: 0.20,
                  mixBlendMode: "screen",
                }}
              />

              <div
                className="bt-panel-layer"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.78), transparent)",
                  opacity: 0.9,
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "relative",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    padding: "20px 16px 18px",
                    borderBottom: "1px solid rgba(22,49,38,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    minHeight: 92,
                    flex: "0 0 auto",
                    background: `
                      radial-gradient(520px 180px at 18% 0%, ${theme.accent}14 0%, transparent 72%),
                      linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.14))
                    `,
                    boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset",
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
                          loading ? "rgba(245,197,66,0.14)" : "rgba(46,229,157,0.12)"
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
                      <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2, color: "#355f52" }}>
                        {loading ? "Tippt…" : "Online verfügbar"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 64,
                        padding: "10px 18px",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.42)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.62), rgba(255,255,255,0.36))",
                        backdropFilter: "blur(14px) saturate(145%)",
                        WebkitBackdropFilter: "blur(14px) saturate(145%)",
                        boxShadow:
                          "0 10px 30px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.42)",
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
                          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))",
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
                          border: "1px solid rgba(255,255,255,0.24)",
                          background: `linear-gradient(180deg, ${theme.accent}D6, ${theme.accent}92)`,
                          color: "#ffffff",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
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
                        border: "1px solid rgba(255,255,255,0.24)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.50))",
                        color: "#163126",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
                      }}
                      title="Chat neu starten"
                    >
                      Neu
                    </button>
                  </div>
                </div>

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
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(22,49,38,0.04)",
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
                              : "1px solid rgba(22,49,38,0.10)",
                            background: isUser
                              ? `linear-gradient(180deg, ${theme.accent}D8, ${theme.accent}A2)`
                              : "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))",
                            boxShadow: isUser
                              ? `0 12px 30px rgba(0,0,0,0.14), 0 0 0 1px ${theme.accent}10 inset`
                              : "0 10px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.22)",
                            backdropFilter: "blur(12px) saturate(140%)",
                            WebkitBackdropFilter: "blur(12px) saturate(140%)",
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
                          border: "1px solid rgba(22,49,38,0.10)",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))",
                          fontSize: 15,
                          opacity: 0.88,
                          backdropFilter: "blur(12px) saturate(145%)",
                          WebkitBackdropFilter: "blur(12px) saturate(145%)",
                          color: "#163126",
                          boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                        }}
                      >
                        <span style={{ letterSpacing: 3 }}>•••</span>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: 16,
                    paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
                    borderTop: "1px solid rgba(22,49,38,0.12)",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.12))",
                    boxShadow:
                      "0 -1px 0 rgba(255,255,255,0.26) inset, 0 -12px 30px rgba(255,255,255,0.10)",
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
                      border: "1px solid rgba(22,49,38,0.12)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.72))",
                      backdropFilter: "blur(16px) saturate(145%)",
                      WebkitBackdropFilter: "blur(16px) saturate(145%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.22), 0 1px 0 rgba(255,255,255,0.18)",
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
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: input.trim()
                        ? `linear-gradient(180deg, ${theme.accent}F0, ${theme.accent}A8)`
                        : "rgba(255,255,255,0.26)",
                      color: input.trim() ? "#ffffff" : "#5c7a6d",
                      cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                      opacity: loading ? 0.72 : 1,
                      boxShadow: input.trim()
                        ? `0 16px 40px rgba(0,0,0,0.14), 0 0 0 1px ${theme.accent}12 inset`
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