// frontend/src/components/VoiceToast.jsx
// Minimal toast shown when FRIDAY performs an action silently (muted mode).
// Auto-dismisses. No annoying suggestions — just the result.

import { useEffect, useRef } from "react";
import { CheckCircle, XCircle, VolumeX } from "lucide-react";

const TOAST_CSS = `
  @keyframes vt-in  { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes vt-out { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(24px)} }
  .vt-enter { animation: vt-in  .22s cubic-bezier(.16,1,.3,1) forwards; }
  .vt-exit  { animation: vt-out .18s ease-in forwards; }
`;

let styleInjected = false;

/**
 * Props:
 *   message  string   — text to show
 *   type     "success" | "error" | "info" | "muted"
 *   onClose  fn       — called when toast expires
 *   duration number   — ms before auto-close (default 2800)
 */
const VoiceToast = ({ message, type = "info", onClose, duration = 2800 }) => {
  const exitRef = useRef(null);
  const elRef = useRef(null);

  // Inject CSS once
  useEffect(() => {
    if (styleInjected) return;
    styleInjected = true;
    const el = document.createElement("style");
    el.textContent = TOAST_CSS;
    document.head.appendChild(el);
  }, []);

  // Auto-dismiss with exit animation
  useEffect(() => {
    const exitTimer = setTimeout(() => {
      elRef.current?.classList.replace("vt-enter", "vt-exit");
      exitRef.current = setTimeout(onClose, 180);
    }, duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(exitRef.current);
    };
  }, [duration, onClose]);

  const config = {
    success: {
      icon: <CheckCircle size={14} color="#10b981" />,
      border: "rgba(16,185,129,.3)",
      accent: "#10b981",
      label: "Done",
    },
    error: {
      icon: <XCircle size={14} color="#ef4444" />,
      border: "rgba(239,68,68,.3)",
      accent: "#ef4444",
      label: "Error",
    },
    muted: {
      icon: <VolumeX size={14} color="#9ca3af" />,
      border: "rgba(156,163,175,.2)",
      accent: "#9ca3af",
      label: "Silent",
    },
    info: {
      icon: <CheckCircle size={14} color="#6366f1" />,
      border: "rgba(99,102,241,.3)",
      accent: "#6366f1",
      label: "Info",
    },
  };

  const c = config[type] ?? config.info;

  return (
    <div
      ref={elRef}
      className="vt-enter"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: "linear-gradient(160deg,#0d1117,#161b27)",
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.accent}`,
        borderRadius: 12,
        padding: "10px 14px",
        minWidth: 220,
        maxWidth: 320,
        boxShadow: "0 8px 32px rgba(0,0,0,.55)",
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={onClose}
    >
      <div style={{ marginTop: 1, flexShrink: 0 }}>{c.icon}</div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: c.accent,
            marginBottom: 3,
            textTransform: "uppercase",
          }}
        >
          {c.label}
        </div>
        <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.45 }}>
          {message}
        </div>
      </div>
    </div>
  );
};

export default VoiceToast;

/* ─── VoiceToastContainer ────────────────────────────────────────────────────
 * Drop this once anywhere near the root (e.g. inside App.jsx) and it will
 * automatically show toasts when FRIDAY completes commands silently.
 *
 * Usage:
 *   import { VoiceToastContainer } from "./components/VoiceToast";
 *   // inside App.jsx JSX:
 *   <VoiceToastContainer />
 *
 * It watches lastCommand from the VoiceCommandContext and shows a toast
 * whenever a command completes while muted.
 * ─────────────────────────────────────────────────────────────────────────── */
import { useState, useCallback } from "react";
import { useVoiceCommand } from "../contexts/VoiceCommandContext";

let _toastId = 0;

export const VoiceToastContainer = () => {
  const { lastCommand, isMuted } = useVoiceCommand();
  const [toasts, setToasts] = useState([]);
  const lastCmdRef = useRef(null);

  // Watch for new commands and show toast when muted
  useEffect(() => {
    if (!lastCommand) return;
    if (lastCommand === lastCmdRef.current) return; // same object, skip
    lastCmdRef.current = lastCommand;

    // Always show toast for mute/unmute toggle (user needs visual feedback)
    const isSystemCmd =
      lastCommand.intent === "MUTE_FRIDAY" ||
      lastCommand.intent === "UNMUTE_FRIDAY";

    // Show toast when muted (no audio feedback) OR for system commands
    if (!isMuted && !isSystemCmd) return;

    const id = ++_toastId;
    const type =
      lastCommand.intent === "MUTE_FRIDAY"
        ? "muted"
        : lastCommand.intent === "UNMUTE_FRIDAY"
          ? "info"
          : lastCommand.success
            ? "success"
            : "error";

    setToasts((prev) => [...prev, { id, message: lastCommand.response, type }]);
  }, [lastCommand, isMuted]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <VoiceToast
            message={t.message}
            type={t.type}
            onClose={() => dismiss(t.id)}
            duration={t.type === "muted" ? 2200 : 2800}
          />
        </div>
      ))}
    </div>
  );
};

