// frontend/src/hooks/useWakeWord.js
// Passive wake-word detector. ONLY active when explicitly enabled.
// Hard suspends on wake — no auto-restart until resume() is called.
// Uses global micLock to avoid conflicting with FRIDAY command mic
// and MeetingRoom transcription mic.

import { useRef, useCallback, useEffect, useState } from "react";
import { micLock } from "../utils/micLock";

export const WAKE_PHRASES = [
  "hey friday",
  "ok friday",
  "okay friday",
  "hi friday",
  "yo friday",
  "hello friday",
  "wake up friday",
  "friday",
];

// Words that should never be treated as inline commands
const ECHO_BLACKLIST = new Set([
  "friday",
  "hey friday",
  "ok friday",
  "okay friday",
]);

export function useWakeWord({ onWake, enabled = true } = {}) {
  const recognitionRef = useRef(null);
  const suspendedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const onWakeRef = useRef(onWake);
  const restartTimerRef = useRef(null);
  const cancelledRef = useRef(false);
  const startingRef = useRef(false);

  const [isActive, setIsActive] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [lastWakePhrase, setLastWakePhrase] = useState(null);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    onWakeRef.current = onWake;
  }, [onWake]);

  // ── Destroy current recognition instance completely ────────────────────────
  const destroyRecognition = useCallback(() => {
    clearTimeout(restartTimerRef.current);
    startingRef.current = false;
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try {
        r.onstart = null;
      } catch (_) {}
      try {
        r.onresult = null;
      } catch (_) {}
      try {
        r.onerror = null;
      } catch (_) {}
      try {
        r.onend = null;
      } catch (_) {}
      try {
        r.abort();
      } catch (_) {}
    }
    micLock.release("wakeword");
    setIsActive(false);
  }, []);

  // ── Start the passive listener ─────────────────────────────────────────────
  const startWakeWordListener = useCallback(() => {
    if (
      !("SpeechRecognition" in window) &&
      !("webkitSpeechRecognition" in window)
    )
      return;
    if (suspendedRef.current || !enabledRef.current || cancelledRef.current)
      return;
    if (startingRef.current || recognitionRef.current) return;

    // ── Check mic lock — if someone else owns it, wait and retry ──────────
    if (!micLock.canAcquire("wakeword")) {
      restartTimerRef.current = setTimeout(startWakeWordListener, 800);
      return;
    }

    startingRef.current = true;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      startingRef.current = false;
      micLock.acquire("wakeword");
      setIsActive(true);
    };

    rec.onresult = (event) => {
      if (suspendedRef.current || cancelledRef.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase().trim();

        const matched = WAKE_PHRASES.find(
          (phrase) =>
            text === phrase ||
            text.startsWith(phrase + " ") ||
            text.endsWith(" " + phrase) ||
            text.includes(" " + phrase + " "),
        );
        if (!matched) continue;
        if (window.speechSynthesis?.speaking) continue;

        // Extract inline command text after the wake phrase
        const idx = text.indexOf(matched);
        const commandText = text.slice(idx + matched.length).trim();

        // Ignore echo — if commandText is just the wake word again, skip it
        if (ECHO_BLACKLIST.has(commandText)) continue;

        console.log(
          `[WakeWord] Wake: "${matched}" | cmd: "${commandText || "(none)"}"`,
        );
        setLastWakePhrase(matched);

        // Hard suspend FIRST — prevents any restart
        suspendedRef.current = true;
        setIsSuspended(true);
        destroyRecognition(); // also releases "wakeword" lock

        onWakeRef.current?.(matched, commandText);
        return;
      }
    };

    rec.onerror = (event) => {
      startingRef.current = false;
      if (event.error === "no-speech" || event.error === "aborted") return;

      // Permission denied — release lock and stop retrying entirely
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        console.warn(
          "[WakeWord] Mic permission denied — stopping wake word listener",
        );
        micLock.release("wakeword");
        recognitionRef.current = null;
        setIsActive(false);
        // Mark as cancelled so onend doesn't restart
        cancelledRef.current = true;
        return;
      }

      console.warn("[WakeWord] Error:", event.error);
      micLock.release("wakeword");
      setIsActive(false);
    };

    rec.onend = () => {
      startingRef.current = false;
      setIsActive(false);
      micLock.release("wakeword");
      if (recognitionRef.current === rec) recognitionRef.current = null;
      if (suspendedRef.current || !enabledRef.current || cancelledRef.current)
        return;

      // Only restart if mic is free
      if (micLock.canAcquire("wakeword")) {
        restartTimerRef.current = setTimeout(startWakeWordListener, 600);
      } else {
        // Wait for lock to be released then retry
        const unsub = micLock.subscribe((newOwner) => {
          if (newOwner === null) {
            unsub();
            if (
              !suspendedRef.current &&
              enabledRef.current &&
              !cancelledRef.current
            ) {
              restartTimerRef.current = setTimeout(startWakeWordListener, 600);
            }
          }
        });
      }
    };

    // Acquire lock before starting
    if (!micLock.acquire("wakeword")) {
      // Lost the race — another owner got in between canAcquire and acquire
      startingRef.current = false;
      restartTimerRef.current = setTimeout(startWakeWordListener, 800);
      return;
    }

    try {
      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      startingRef.current = false;
      recognitionRef.current = null;
      micLock.release("wakeword");
      console.warn("[WakeWord] Start failed:", err.message);
      if (
        !cancelledRef.current &&
        enabledRef.current &&
        !suspendedRef.current
      ) {
        restartTimerRef.current = setTimeout(startWakeWordListener, 2000);
      }
    }
  }, [destroyRecognition]);

  // ── suspend: hard stop, no restart ────────────────────────────────────────
  const suspend = useCallback(() => {
    suspendedRef.current = true;
    setIsSuspended(true);
    destroyRecognition();
  }, [destroyRecognition]);

  // ── resume: re-enable and restart listener ─────────────────────────────────
  const resume = useCallback(() => {
    if (!suspendedRef.current) return;
    suspendedRef.current = false;
    setIsSuspended(false);
    // Only start if mic is actually free
    if (micLock.canAcquire("wakeword")) {
      restartTimerRef.current = setTimeout(startWakeWordListener, 800);
    } else {
      const unsub = micLock.subscribe((newOwner) => {
        if (newOwner === null) {
          unsub();
          if (
            !suspendedRef.current &&
            enabledRef.current &&
            !cancelledRef.current
          ) {
            restartTimerRef.current = setTimeout(startWakeWordListener, 800);
          }
        }
      });
    }
  }, [startWakeWordListener]);

  // ── Startup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    cancelledRef.current = false;
    let cleanupInteraction = () => {};

    const doStart = () => {
      if (!cancelledRef.current && !suspendedRef.current)
        restartTimerRef.current = setTimeout(startWakeWordListener, 500);
    };

    const waitForInteraction = () => {
      const h = () => {
        cleanupInteraction();
        doStart();
      };
      document.addEventListener("click", h, { once: true });
      document.addEventListener("keydown", h, { once: true });
      document.addEventListener("touchstart", h, { once: true });
      cleanupInteraction = () => {
        document.removeEventListener("click", h);
        document.removeEventListener("keydown", h);
        document.removeEventListener("touchstart", h);
      };
    };

    (async () => {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          s.getTracks().forEach((t) => t.stop());
          doStart();
        } catch {
          waitForInteraction();
        }
      } else {
        restartTimerRef.current = setTimeout(startWakeWordListener, 1200);
      }
    })();

    return () => {
      cancelledRef.current = true;
      cleanupInteraction();
      destroyRecognition();
    };
  }, [enabled, startWakeWordListener, destroyRecognition]);

  return { isActive, isSuspended, suspend, resume, lastWakePhrase };
}

export default useWakeWord;

