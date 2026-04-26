// frontend/src/components/VoiceButton.jsx — FRIDAY Voice Orb
//
// Hidden entirely when inside a MeetingRoom (/meeting/:id routes)
// to avoid mic conflicts with live transcription.

import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Zap,
  History,
  ChevronDown,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useVoiceCommand } from "../contexts/VoiceCommandContext";
import { useLocation } from "react-router-dom";

const ORBS_CSS = `
  @keyframes fri-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes fri-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.18)} }
  @keyframes fri-ripple { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.2);opacity:0} }
  @keyframes fri-spin   { to{transform:rotate(360deg)} }
  @keyframes fri-wave   { 0%,100%{height:6px} 50%{height:22px} }
  @keyframes fri-in     { from{opacity:0;transform:scale(.85) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes fri-slide  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fri-blink  { 0%,100%{opacity:1} 50%{opacity:.3} }

  .fri-idle    { animation: fri-float 3.5s ease-in-out infinite; }
  .fri-wake    { animation: fri-pulse  .9s ease-in-out infinite; }
  .fri-listen  { animation: fri-pulse  .6s ease-in-out infinite; }
  .fri-process { animation: fri-pulse 1.2s ease-in-out infinite; }
  .fri-speak   { animation: fri-pulse  .8s ease-in-out infinite; }
  .fri-muted   { animation: fri-float  4s ease-in-out infinite; opacity:.7; }

  .fri-ring1 { animation: fri-ripple 1.4s ease-out infinite; }
  .fri-ring2 { animation: fri-ripple 1.4s .5s ease-out infinite; }
  .fri-arc   { animation: fri-spin 1.2s linear infinite; }

  .fri-bar   { animation: fri-wave 1s ease-in-out infinite; }
  .fri-bar:nth-child(2) { animation-delay:.15s }
  .fri-bar:nth-child(3) { animation-delay:.3s }
  .fri-bar:nth-child(4) { animation-delay:.45s }
  .fri-bar:nth-child(5) { animation-delay:.6s }

  .fri-blink { animation: fri-blink .8s ease-in-out infinite; }
  .fri-panel { animation: fri-in .25s cubic-bezier(.16,1,.3,1); }
  .fri-item  { animation: fri-slide .2s ease-out; }

  .fri-scroll::-webkit-scrollbar { width:3px }
  .fri-scroll::-webkit-scrollbar-thumb { background:#312e81; border-radius:4px }

  .fri-btn { transition: all .18s ease; }
  .fri-btn:hover { transform: scale(1.08); filter: brightness(1.15); }
  .fri-btn:active { transform: scale(.95); }
`;

const COLORS = {
  idle: {
    bg: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    glow: "rgba(79,70,229,.55)",
    label: "#a5b4fc",
  },
  wake: {
    bg: "linear-gradient(135deg,#d97706,#f59e0b)",
    glow: "rgba(245,158,11,.65)",
    label: "#fde68a",
  },
  listen: {
    bg: "linear-gradient(135deg,#059669,#10b981)",
    glow: "rgba(16,185,129,.65)",
    label: "#6ee7b7",
  },
  process: {
    bg: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    glow: "rgba(79,70,229,.55)",
    label: "#c7d2fe",
  },
  speak: {
    bg: "linear-gradient(135deg,#0ea5e9,#6366f1)",
    glow: "rgba(14,165,233,.6)",
    label: "#bae6fd",
  },
  muted: {
    bg: "linear-gradient(135deg,#374151,#4b5563)",
    glow: "rgba(75,85,99,.35)",
    label: "#9ca3af",
  },
};

function WaveBars({ color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="fri-bar"
          style={{
            width: 3,
            borderRadius: 3,
            background: color,
            height: 6,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      ))}
    </div>
  );
}

function SpinArc({ color }) {
  return (
    <div
      className="fri-arc"
      style={{
        width: 28,
        height: 28,
        border: "2.5px solid transparent",
        borderTopColor: color,
        borderRightColor: color,
        borderRadius: "50%",
      }}
    />
  );
}

function WaitingDots({ color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="fri-blink"
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
            animationDelay: `${i * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}

function HistoryPanel({ history, onClose }) {
  return (
    <div
      className="fri-panel"
      style={{
        position: "absolute",
        bottom: 88,
        right: 0,
        width: 300,
        background: "linear-gradient(160deg,#0b0f1a,#0f1629)",
        border: "1px solid rgba(99,102,241,.25)",
        borderRadius: 16,
        boxShadow: "0 24px 60px rgba(0,0,0,.8)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(99,102,241,.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(79,70,229,.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <History size={12} color="#818cf8" />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#a5b4fc",
              letterSpacing: "0.06em",
            }}
          >
            RECENT COMMANDS
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#4f5b7a",
            padding: 2,
          }}
        >
          <ChevronDown size={13} />
        </button>
      </div>
      <div
        className="fri-scroll"
        style={{ maxHeight: 200, overflowY: "auto", padding: "6px 0" }}
      >
        {history.length === 0 ? (
          <div
            style={{
              padding: 14,
              textAlign: "center",
              fontSize: 11,
              color: "#3d4a6b",
            }}
          >
            No commands yet — say "Friday" or click the orb
          </div>
        ) : (
          [...history]
            .reverse()
            .slice(0, 10)
            .map((cmd, i) => (
              <div
                key={i}
                className="fri-item"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  padding: "7px 14px",
                  borderBottom:
                    i < 9 ? "1px solid rgba(99,102,241,.07)" : "none",
                }}
              >
                {cmd.success ? (
                  <CheckCircle
                    size={12}
                    color="#10b981"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                ) : (
                  <XCircle
                    size={12}
                    color="#ef4444"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#e2e8f0",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {cmd.text}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#3d4a6b",
                      marginTop: 2,
                      display: "flex",
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        padding: "1px 5px",
                        borderRadius: 99,
                        fontSize: 8,
                        background:
                          cmd.method === "chatbot"
                            ? "rgba(99,102,241,.2)"
                            : "rgba(16,185,129,.15)",
                        color: cmd.method === "chatbot" ? "#818cf8" : "#6ee7b7",
                      }}
                    >
                      {cmd.method === "chatbot"
                        ? "💬 ai"
                        : cmd.method === "system"
                          ? "⚙ sys"
                          : "⚡ cmd"}
                    </span>
                    <span>
                      {new Date(cmd.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
const VoiceButton = () => {
  const location = useLocation();

  const isInMeeting = location.pathname.startsWith("/meeting/");

  const {
    isListening,
    isProcessing,
    transcript,
    fridayAwake,
    lastCommand,
    commandHistory,
    isSpeaking,
    isMuted,
    startListening,
    stopListening,
    toggleMute,
  } = useVoiceCommand();

  const [showHistory, setShowHistory] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");
  const styleRef = useRef(false);

  // ── Compute state early so all hooks below can reference it ───────────────
  const state = isMuted
    ? "muted"
    : isProcessing
      ? "process"
      : isListening
        ? "listen"
        : isSpeaking
          ? "speak"
          : fridayAwake
            ? "wake"
            : "idle";
  const C = COLORS[state];

  // Inject CSS once
  useEffect(() => {
    if (styleRef.current) return;
    styleRef.current = true;
    const el = document.createElement("style");
    el.textContent = ORBS_CSS;
    document.head.appendChild(el);
    return () => {
      try {
        document.head.removeChild(el);
      } catch (_) {}
    };
  }, []);

  // Keyboard shortcuts — disabled during meetings
  useEffect(() => {
    if (isInMeeting) return;
    const SKIP = new Set(["INPUT", "TEXTAREA", "SELECT"]);
    const onKey = (e) => {
      if (
        SKIP.has(e.target.tagName?.toUpperCase()) ||
        e.target.isContentEditable
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        if (isListening || isProcessing) stopListening();
        else startListening();
      }
      if (e.code === "Escape" && (isListening || isProcessing)) {
        e.preventDefault();
        stopListening();
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    isInMeeting,
    isListening,
    isProcessing,
    startListening,
    stopListening,
    toggleMute,
  ]);

  // Status label — must be above early return (Rules of Hooks)
  useEffect(() => {
    if (isMuted) setStatusLabel("Voice off");
    else if (state === "wake") setStatusLabel("Say your command…");
    else if (state === "listen")
      setStatusLabel(
        transcript ? `"${transcript.slice(0, 28)}…"` : "Listening…",
      );
    else if (state === "process") setStatusLabel("Processing…");
    else if (state === "speak") setStatusLabel("Speaking…");
    else setStatusLabel("");
  }, [state, transcript, isMuted]);

  // ── All hooks have run — safe to return early now ─────────────────────────
  if (isInMeeting) return null;

  const lastResponse = lastCommand?.response || "";
  const handleOrbClick = () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    if (isListening || isProcessing) {
      stopListening();
      return;
    }
    startListening();
  };

  const orbTitle = isMuted
    ? 'Voice muted — say "unmute" or press M'
    : state === "wake"
      ? "FRIDAY is waiting — say your command now"
      : state === "listen"
        ? "Listening — click or Esc to stop"
        : state === "process"
          ? "Processing…"
          : state === "speak"
            ? "FRIDAY is speaking"
            : 'Click / Space to talk · or say "Friday [command]"';

  return (
    <>
      {showHistory && (
        <HistoryPanel
          history={commandHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {fridayAwake && !isListening && !isProcessing && (
        <div
          className="fri-panel"
          style={{
            position: "absolute",
            bottom: 82,
            right: 0,
            maxWidth: 240,
            background: "linear-gradient(160deg,#1c1400,#2d1f00)",
            border: "1px solid rgba(245,158,11,.25)",
            borderRadius: 13,
            padding: "9px 13px",
            boxShadow: "0 12px 40px rgba(0,0,0,.6)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#f59e0b",
              letterSpacing: "0.08em",
              marginBottom: 4,
            }}
          >
            ⚡ FRIDAY IS READY
          </div>
          <div style={{ fontSize: 11, color: "#fde68a", lineHeight: 1.4 }}>
            Say your command now…
          </div>
        </div>
      )}

      {(isListening || isProcessing) && transcript && !isMuted && (
        <div
          className="fri-panel"
          style={{
            position: "absolute",
            bottom: 82,
            right: 0,
            maxWidth: 280,
            background: "linear-gradient(160deg,#0b0f1a,#0f1629)",
            border: "1px solid rgba(99,102,241,.2)",
            borderRadius: 13,
            padding: "9px 13px",
            boxShadow: "0 12px 40px rgba(0,0,0,.6)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: C.label,
              letterSpacing: "0.08em",
              marginBottom: 3,
            }}
          >
            {isProcessing ? "⚡ PROCESSING" : "🎙 HEARING"}
          </div>
          <div style={{ fontSize: 12, color: "#e2e8f0", lineHeight: 1.4 }}>
            "{transcript.slice(0, 70)}
            {transcript.length > 70 ? "…" : ""}"
          </div>
        </div>
      )}

      {isSpeaking && lastResponse && !isMuted && (
        <div
          className="fri-panel"
          style={{
            position: "absolute",
            bottom: 82,
            right: 0,
            maxWidth: 280,
            background: "linear-gradient(160deg,#0b0f1a,#0f1629)",
            border: "1px solid rgba(14,165,233,.2)",
            borderRadius: 13,
            padding: "9px 13px",
            boxShadow: "0 12px 40px rgba(0,0,0,.6)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#38bdf8",
              letterSpacing: "0.08em",
              marginBottom: 3,
            }}
          >
            🔊 FRIDAY SAYS
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
            {lastResponse.slice(0, 90)}
            {lastResponse.length > 90 ? "…" : ""}
          </div>
        </div>
      )}

      {isMuted && lastCommand && (
        <div
          className="fri-panel"
          style={{
            position: "absolute",
            bottom: 82,
            right: 0,
            maxWidth: 260,
            background: "linear-gradient(160deg,#111827,#1f2937)",
            border: "1px solid rgba(156,163,175,.15)",
            borderRadius: 13,
            padding: "9px 13px",
            boxShadow: "0 12px 40px rgba(0,0,0,.6)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#6b7280",
              letterSpacing: "0.08em",
              marginBottom: 3,
            }}
          >
            🔇 SILENT MODE
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>
            {lastCommand.response?.slice(0, 80)}
          </div>
        </div>
      )}

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {(state === "listen" || state === "wake") && !isMuted && (
          <>
            <div
              className="fri-ring1"
              style={{
                position: "absolute",
                inset: -10,
                borderRadius: "50%",
                border: `1.5px solid ${C.glow.replace(/[\d.]+\)$/, "0.9)")}`,
                pointerEvents: "none",
              }}
            />
            <div
              className="fri-ring2"
              style={{
                position: "absolute",
                inset: -10,
                borderRadius: "50%",
                border: `1.5px solid ${C.glow.replace(/[\d.]+\)$/, "0.5)")}`,
                pointerEvents: "none",
              }}
            />
          </>
        )}

        <button
          onClick={handleOrbClick}
          className={`fri-btn fri-${state}`}
          title={orbTitle}
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: C.bg,
            border: "1.5px solid rgba(255,255,255,.12)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 8px 32px ${C.glow}, 0 0 0 1px rgba(255,255,255,.05)`,
            position: "relative",
            outline: "none",
            transition: "background .4s, box-shadow .4s",
            filter: isMuted ? "grayscale(0.4)" : "none",
          }}
        >
          {state === "process" ? (
            <SpinArc color="#c7d2fe" />
          ) : state === "listen" ? (
            <WaveBars color={C.label} />
          ) : state === "speak" ? (
            <WaveBars color="#38bdf8" />
          ) : state === "wake" ? (
            <WaitingDots color="#fde68a" />
          ) : isMuted ? (
            <MicOff size={22} color="#9ca3af" />
          ) : (
            <Mic size={22} color="white" />
          )}
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: isMuted
                ? "#6b7280"
                : state === "idle"
                  ? "#4ade80"
                  : state === "listen"
                    ? "#10b981"
                    : state === "wake"
                      ? "#f59e0b"
                      : state === "speak"
                        ? "#38bdf8"
                        : "#f59e0b",
              border: "2px solid #0b0f1a",
              boxShadow: `0 0 8px ${isMuted ? "rgba(107,114,128,.6)" : "rgba(74,222,128,.8)"}`,
              transition: "background .3s",
            }}
          />
        </button>

        <div
          style={{
            marginTop: 7,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 900,
              letterSpacing: "0.18em",
              color: C.label,
              userSelect: "none",
              transition: "color .3s",
            }}
          >
            FRIDAY
          </span>
          {statusLabel && (
            <span
              style={{
                fontSize: 9,
                color: state === "wake" ? "#f59e0b" : "#4f5b7a",
                maxWidth: 100,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "center",
                fontWeight: state === "wake" ? 700 : 400,
              }}
            >
              {statusLabel}
            </span>
          )}
        </div>

        {commandHistory.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowHistory((p) => !p);
            }}
            className="fri-btn"
            title="Command history"
            style={{
              marginTop: 5,
              background: showHistory
                ? "rgba(99,102,241,.2)"
                : "rgba(15,22,41,.8)",
              border: "1px solid rgba(99,102,241,.2)",
              borderRadius: 8,
              padding: "2px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: showHistory ? "#818cf8" : "#3d4a6b",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            <History size={9} />
            {commandHistory.length} cmds
          </button>
        )}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: 20,
          zIndex: 50,
          opacity: 0.4,
          transition: "opacity .2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = ".4")}
      >
        <div
          style={{
            background: "rgba(11,15,26,.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(99,102,241,.15)",
            borderRadius: 10,
            padding: "5px 11px",
            fontSize: 10,
            color: "#4f5b7a",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Zap size={10} color="#6366f1" />
          Say <Kbd>Friday</Kbd> then command · or click orb · Space{" "}
          <Kbd>listen</Kbd> · Esc <Kbd>stop</Kbd> · Say <Kbd>mute</Kbd>
          {(isListening || isProcessing) && (
            <span style={{ color: "#10b981", fontWeight: 700 }}>● ACTIVE</span>
          )}
          {fridayAwake && !isListening && (
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>
              ⚡ WAITING
            </span>
          )}
          {isMuted && (
            <span style={{ color: "#f87171", fontWeight: 700 }}>🔇 MUTED</span>
          )}
        </div>
      </div>
    </>
  );
};

function Kbd({ children }) {
  return (
    <span
      style={{
        background: "rgba(99,102,241,.15)",
        border: "1px solid rgba(99,102,241,.3)",
        borderRadius: 5,
        padding: "1px 6px",
        color: "#818cf8",
        fontWeight: 700,
        fontFamily: "monospace",
      }}
    >
      {children}
    </span>
  );
}

export default VoiceButton;

