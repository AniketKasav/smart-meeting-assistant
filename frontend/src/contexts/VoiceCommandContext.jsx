// frontend/src/contexts/VoiceCommandContext.jsx — FRIDAY VOICE ASSISTANT
//
// BEHAVIOUR:
// ┌──────────────────────────────────────────────────────────────────────────┐
// │  WAKE WORD "friday"          → mic opens, waits for ONE command, closes  │
// │  "friday open dashboard"     → runs command immediately, mic stays closed │
// │  Logo / orb click / Space    → mic opens, waits for ONE command, closes  │
// │  "stop" / Esc                → everything stops immediately              │
// │  "mute" / "unmute"           → toggles TTS voice                        │
// │                                                                          │
// │  MIC IS NEVER ALWAYS-ON — it opens only on explicit trigger,            │
// │  captures ONE phrase, then closes. Wake word listener resumes.           │
// │                                                                          │
// │  Uses global micLock to prevent conflicts with MeetingRoom mic.          │
// └──────────────────────────────────────────────────────────────────────────┘

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { intentMatcher } from "../utils/intentMatcher";
import { actionExecutor } from "../utils/actionExecutor";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import useTextToSpeech from "../hooks/useTextToSpeech";
import { useWakeWord } from "../hooks/useWakeWord";
import { useNavigate } from "react-router-dom";
import { micLock } from "../utils/micLock";

const VoiceCommandContext = createContext();

export const useVoiceCommand = () => {
  const ctx = useContext(VoiceCommandContext);
  if (!ctx)
    throw new Error("useVoiceCommand must be used within VoiceCommandProvider");
  return ctx;
};

const STOP_PATTERN =
  /\b(stop|cancel|abort|quit|exit|shut\s*up|never\s*mind|dismiss|enough|bye|goodbye|sleep)\b/i;
const MUTE_PATTERN =
  /\b(mute|mute\s*friday|mute\s*voice|disable\s*voice|stop\s*(talking|speaking))\b/i;
const UNMUTE_PATTERN =
  /\b(unmute|unmute\s*friday|enable\s*voice|start\s*speaking|voice\s*on|speak\s*again)\b/i;

const UNKNOWN_REPLIES = [
  "I didn't catch that.",
  "Sorry, didn't understand.",
  "Could you rephrase that?",
  "Try saying 'help' for commands.",
];
const randomUnknown = () =>
  UNKNOWN_REPLIES[Math.floor(Math.random() * UNKNOWN_REPLIES.length)];

// ══════════════════════════════════════════════════════════════════════════════
export const VoiceCommandProvider = ({ children }) => {
  const navigate = useNavigate();

  const [lastCommand, setLastCommand] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [fridayAwake, setFridayAwake] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Stable refs
  const conversationStateRef = useRef(null);
  const isMutedRef = useRef(false);
  const isStoppingRef = useRef(false);
  const micOpenRef = useRef(false);

  const startSpeechRef = useRef(null);
  const stopSpeechRef = useRef(null);
  const resetTranscriptRef = useRef(null);
  const resumeWakeWordRef = useRef(null);
  const suspendWakeWordRef = useRef(null);
  const processCommandRef = useRef(null);

  const tts = useTextToSpeech();

  useEffect(() => {
    actionExecutor.setNavigate(navigate);
  }, [navigate]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // ── TTS helper ─────────────────────────────────────────────────────────────
  const speakText = useCallback((text) => {
    if (!text?.trim() || !("speechSynthesis" in window)) return;
    if (isMutedRef.current) return;
    if (localStorage.getItem("tts_enabled") === "false") return;

    const clean = text
      .replace(/\*/g, "")
      .replace(/[_#]/g, "")
      .replace(/https?:\/\/\S+/g, "link")
      .trim();

    const say = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) {
        setTimeout(say, 100);
        return;
      }
      const u = new SpeechSynthesisUtterance(clean);
      u.voice = voices.find((v) => v.lang.startsWith("en-US")) || voices[0];
      u.rate = 1.0;
      u.pitch = 1.0;
      u.volume = 1.0;
      u.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled")
          console.warn("[TTS]", e.error);
      };
      window.speechSynthesis.speak(u);
    };
    setTimeout(say, 80);
  }, []);

  const speakResponse = speakText;

  // ── Open mic for ONE command then close ────────────────────────────────────
  const openCommandMic = useCallback(() => {
    if (!startSpeechRef.current) return;

    // Only open if mic is free or we already own it
    if (!micLock.canAcquire("friday")) {
      console.warn(
        "[FRIDAY] Mic locked by",
        micLock.owner,
        "— cannot open command mic",
      );
      return;
    }

    micLock.acquire("friday");
    micOpenRef.current = true;
    resetTranscriptRef.current?.();
    startSpeechRef.current();
  }, []);

  // ── emergencyStop ──────────────────────────────────────────────────────────
  const emergencyStop = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    window.speechSynthesis.cancel();
    try {
      stopSpeechRef.current?.();
    } catch (_) {}

    micOpenRef.current = false;
    micLock.release("friday");
    conversationStateRef.current = null;
    setFridayAwake(false);
    setIsProcessing(false);

    setTimeout(() => {
      isStoppingRef.current = false;
      resumeWakeWordRef.current?.();
    }, 800);
  }, []);

  // ── mute / unmute ──────────────────────────────────────────────────────────
  const mute = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsMuted(true);
    isMutedRef.current = true;
    setLastCommand({
      text: "mute",
      intent: "MUTE_FRIDAY",
      response: "Voice muted.",
      success: true,
      method: "system",
    });
  }, []);

  const unmute = useCallback(() => {
    setIsMuted(false);
    isMutedRef.current = false;
    setLastCommand({
      text: "unmute",
      intent: "UNMUTE_FRIDAY",
      response: "Voice on.",
      success: true,
      method: "system",
    });
    speakText("Voice on.");
  }, [speakText]);

  const toggleMute = useCallback(() => {
    isMutedRef.current ? unmute() : mute();
  }, [mute, unmute]);

  // ── normalizeForMatching ───────────────────────────────────────────────────
  const normalizeForMatching = useCallback((text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(
        /^(friday|hey\s*friday|ok\s*friday|okay\s*friday|hi\s*friday|yo\s*friday|hello\s*friday|wake\s*up\s*friday)\s+/i,
        "",
      )
      .replace(
        /\b(open|show|go to|navigate to|view|see|check|display|take me to|bring up)\s+(your|for|a|my)\s+/gi,
        "$1 the ",
      )
      .replace(/^per\s+meetings?$/gi, "meetings")
      .replace(/\bper\s*(formance|form)\b/gi, "performance")
      .replace(/\baction\s*items?\b/gi, "action items")
      .replace(/\b(please|just|quickly|now|again|for\s*me)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }, []);

  const addToHistory = useCallback((cmd) => {
    setCommandHistory((prev) => [...prev, cmd].slice(-20));
  }, []);

  // ── Chatbot bridge ─────────────────────────────────────────────────────────
  const askChatbot = useCallback(async (question) => {
    try {
      const res = await fetch("https://smart-meeting-assistant-olcl.onrender.com/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          conversationHistory: [],
          voiceMode: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "",
        fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === "chunk") fullText += d.text;
          } catch (_) {}
        }
      }
      const spoken = fullText
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/#+\s/g, "")
        .replace(/https?:\/\/\S+/g, "link")
        .replace(/\n+/g, ". ")
        .trim()
        .slice(0, 400);
      return { success: true, text: fullText, spoken };
    } catch (err) {
      return { success: false, spoken: "Couldn't reach the server." };
    }
  }, []);

  // ── processCommand — main brain ────────────────────────────────────────────
  const processCommand = useCallback(
    async (rawText) => {
      if (!rawText?.trim()) return;
      const text = rawText.trim();
      const lower = text.toLowerCase();

      if (STOP_PATTERN.test(lower)) {
        emergencyStop();
        return;
      }

      setIsProcessing(true);
      const normalized = normalizeForMatching(text);
      // System commands
      if (MUTE_PATTERN.test(lower) || MUTE_PATTERN.test(normalized)) {
        mute();
        addToHistory({
          text,
          intent: "MUTE_FRIDAY",
          method: "system",
          success: true,
          timestamp: new Date().toISOString(),
        });
        setIsProcessing(false);
        micLock.release("friday");
        setTimeout(() => resumeWakeWordRef.current?.(), 400);
        return;
      }
      if (UNMUTE_PATTERN.test(lower) || UNMUTE_PATTERN.test(normalized)) {
        unmute();
        addToHistory({
          text,
          intent: "UNMUTE_FRIDAY",
          method: "system",
          success: true,
          timestamp: new Date().toISOString(),
        });
        setIsProcessing(false);
        micLock.release("friday");
        setTimeout(() => resumeWakeWordRef.current?.(), 400);
        return;
      }

      // Pattern match
      const match =
        intentMatcher.match(normalized) || intentMatcher.match(lower);

      if (match && match.confidence > 0.7) {
        if (match.intent === "CREATE_MEETING") {
          conversationStateRef.current = {
            flow: "CREATE_MEETING",
            step: "title",
            data: {},
          };
          setIsProcessing(false);
          speakText("What's the name of the meeting?");
          setTimeout(openCommandMic, 1200);
          return;
        }
        if (match.intent === "CREATE_TASK") {
          conversationStateRef.current = {
            flow: "CREATE_TASK",
            step: "title",
            data: {},
          };
          setIsProcessing(false);
          speakText("What's the task name?");
          setTimeout(openCommandMic, 1000);
          return;
        }
        if (match.intent === "ASSIGN_TASK") {
          conversationStateRef.current = {
            flow: "ASSIGN_TASK",
            step: "task_name",
            data: {},
          };
          setIsProcessing(false);
          speakText("Which task do you want to assign?");
          setTimeout(openCommandMic, 1200);
          return;
        }

        if (match.intent === "CHATBOT_SHORTCUT") {
          const chatResult = await askChatbot(match.params?.question || text);
          addToHistory({
            text,
            intent: "CHATBOT_QUERY",
            method: "chatbot",
            success: chatResult.success,
            timestamp: new Date().toISOString(),
          });
          setLastCommand({
            text,
            intent: "CHATBOT_QUERY",
            response: chatResult.text || chatResult.spoken,
            success: chatResult.success,
            method: "chatbot",
          });
          speakText(chatResult.spoken);
          setIsProcessing(false);
          micLock.release("friday");
          setTimeout(() => resumeWakeWordRef.current?.(), 800);
          return;
        }

        const result = await actionExecutor.execute(match.intent, match.params);
        const msg = result.message || "Done.";
        addToHistory({
          text,
          intent: match.intent,
          method: "pattern",
          success: result.success,
          timestamp: new Date().toISOString(),
        });
        setLastCommand({
          text,
          intent: match.intent,
          response: msg,
          success: result.success,
          method: "pattern",
        });
        setIsProcessing(false);
        micLock.release("friday");
        setTimeout(() => resumeWakeWordRef.current?.(), 600);
        return;
      }

      // Natural question → chatbot
      const isQuestion =
        /^(what|who|when|why|how|which|can|could|would|is|are|was|were|do|does|did|tell me|explain)\b/i.test(
          text,
        );
      if (isQuestion) {
        const chatResult = await askChatbot(text);
        addToHistory({
          text,
          intent: "CHATBOT_QUERY",
          method: "chatbot",
          success: chatResult.success,
          timestamp: new Date().toISOString(),
        });
        setLastCommand({
          text,
          intent: "CHATBOT_QUERY",
          response: chatResult.text || chatResult.spoken,
          success: chatResult.success,
          method: "chatbot",
        });
        speakText(chatResult.spoken);
        setIsProcessing(false);
        micLock.release("friday");
        setTimeout(() => resumeWakeWordRef.current?.(), 800);
        return;
      }

      // Unknown
      const reply = randomUnknown();
      setLastCommand({
        text,
        intent: "UNKNOWN",
        response: reply,
        success: false,
        method: "none",
      });
      addToHistory({
        text,
        intent: "UNKNOWN",
        method: "none",
        success: false,
        timestamp: new Date().toISOString(),
      });
      setIsProcessing(false);
      micLock.release("friday");
      setTimeout(() => resumeWakeWordRef.current?.(), 600);
    },
    [
      emergencyStop,
      mute,
      unmute,
      normalizeForMatching,
      speakText,
      openCommandMic,
      askChatbot,
      addToHistory,
    ],
  );

  useEffect(() => {
    processCommandRef.current = processCommand;
  }, [processCommand]);

  // ── Conversation step handler ──────────────────────────────────────────────
  const handleConversationStep = useCallback(
    async (answer) => {
      if (STOP_PATTERN.test(answer.toLowerCase())) {
        emergencyStop();
        return;
      }

      const state = conversationStateRef.current;
      if (!state) return;

      if (state.flow === "CREATE_MEETING") {
        if (state.step === "title") {
          conversationStateRef.current = {
            flow: "CREATE_MEETING",
            step: "description",
            data: { title: answer },
          };
          speakText("Any description? Say skip to continue.");
          setTimeout(openCommandMic, 1500);
          return;
        }
        if (state.step === "description") {
          conversationStateRef.current = null;
          setFridayAwake(false);
          micLock.release("friday");
          setTimeout(() => navigate("/meetings"), 400);
          setTimeout(() => resumeWakeWordRef.current?.(), 600);
          return;
        }
      }

      if (state.flow === "CREATE_TASK") {
        if (state.step === "title") {
          conversationStateRef.current = {
            flow: "CREATE_TASK",
            step: "assignee",
            data: { title: answer },
          };
          speakText(
            "Who should I assign this to? Say skip to leave unassigned.",
          );
          setTimeout(openCommandMic, 1600);
          return;
        }
        if (state.step === "assignee") {
          conversationStateRef.current = null;
          setFridayAwake(false);
          micLock.release("friday");
          setTimeout(() => navigate("/action-items"), 400);
          setTimeout(() => resumeWakeWordRef.current?.(), 600);
          return;
        }
      }

      if (state.flow === "ASSIGN_TASK") {
        if (state.step === "task_name") {
          conversationStateRef.current = {
            flow: "ASSIGN_TASK",
            step: "assignee",
            data: { task: answer },
          };
          speakText(`Who should I assign "${answer}" to?`);
          setTimeout(openCommandMic, 1500);
          return;
        }
        if (state.step === "assignee") {
          conversationStateRef.current = null;
          setFridayAwake(false);
          micLock.release("friday");
          setTimeout(() => navigate("/action-items"), 400);
          setTimeout(() => resumeWakeWordRef.current?.(), 600);
          return;
        }
      }

      conversationStateRef.current = null;
      await processCommandRef.current?.(answer);
    },
    [emergencyStop, speakText, openCommandMic, navigate],
  );

  // ── Speech recognition callbacks ───────────────────────────────────────────
  const handleResult = useCallback(
    async (finalTranscript) => {
      if (!finalTranscript?.trim()) return;
      if (STOP_PATTERN.test(finalTranscript.toLowerCase())) {
        emergencyStop();
        return;
      }
      window.speechSynthesis.cancel();
      micOpenRef.current = false;

      if (conversationStateRef.current) {
        await handleConversationStep(finalTranscript);
        return;
      }

      setFridayAwake(false);
      await processCommandRef.current?.(finalTranscript);
    },
    [emergencyStop, handleConversationStep],
  );

  const handleError = useCallback((error) => {
    if (error.type === "aborted" || error.type === "no-speech") {
      setIsProcessing(false);
      setFridayAwake(false);
      micOpenRef.current = false;
      micLock.release("friday");
      setTimeout(() => resumeWakeWordRef.current?.(), 400);
      return;
    }
    console.error("[FRIDAY] Speech error:", error);
    setIsProcessing(false);
    setFridayAwake(false);
    micOpenRef.current = false;
    micLock.release("friday");
  }, []);

  const handleEnd = useCallback(() => {
    micOpenRef.current = false;
    micLock.release("friday");
    setIsProcessing(false);
    setFridayAwake(false);
    if (isStoppingRef.current) return;
    if (!conversationStateRef.current) {
      setTimeout(() => resumeWakeWordRef.current?.(), 600);
    }
  }, []);

  // ── Command mic instance (continuous=false — ONE phrase then stops) ─────────
  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported,
    startListening: startSpeech,
    stopListening: stopSpeech,
    resetTranscript,
  } = useSpeechRecognition({
    language: "en-US",
    continuous: false,
    interimResults: true,
    onResult: handleResult,
    onError: handleError,
    onEnd: handleEnd,
  });

  useEffect(() => {
    startSpeechRef.current = startSpeech;
    stopSpeechRef.current = stopSpeech;
    resetTranscriptRef.current = resetTranscript;
  }, [startSpeech, stopSpeech, resetTranscript]);

  // ── handleWakeWord ─────────────────────────────────────────────────────────
  const handleWakeWord = useCallback(
    (phrase, commandText = "") => {
      if (commandText && STOP_PATTERN.test(commandText.toLowerCase())) {
        emergencyStop();
        return;
      }

      // PATH A: inline command — run directly
      if (commandText && commandText.length >= 3) {
        setFridayAwake(false);
        setTimeout(() => processCommandRef.current?.(commandText), 100);
        return;
      }

      // PATH B: bare wake — open mic, wait for command
      // If meeting mic owns the lock, force-release it — MeetingRoom will
      // detect fridayAwake=true and pause itself, then resume when we're done.
      if (micLock.owner === "meeting") {
        micLock.forceRelease();
      }

      setFridayAwake(true);
      setTimeout(() => {
        openCommandMic();
      }, 400);
    },
    [emergencyStop, openCommandMic],
  );

  // ── Wake word hook ─────────────────────────────────────────────────────────
  const {
    isActive: wakeWordActive,
    isSuspended: wakeWordSuspended,
    suspend: suspendWakeWord,
    resume: resumeWakeWord,
    lastWakePhrase,
  } = useWakeWord({ onWake: handleWakeWord, enabled: wakeWordEnabled });

  resumeWakeWordRef.current = resumeWakeWord;
  suspendWakeWordRef.current = suspendWakeWord;

  // ── Public startListening (logo click / Space) ─────────────────────────────
  const startListening = useCallback(() => {
    if (!isSupported) return;
    // If meeting owns the mic, force-release it so FRIDAY can take over.
    // MeetingRoom watches fridayAwake and will pause/resume itself automatically.
    if (micLock.owner === "meeting") {
      micLock.forceRelease();
    }
    suspendWakeWord();
    setFridayAwake(true);
    setTimeout(() => {
      openCommandMic();
    }, 100);
  }, [isSupported, suspendWakeWord, openCommandMic]);

  const stopListening = useCallback(() => {
    emergencyStop();
  }, [emergencyStop]);
  const clearHistory = useCallback(() => setCommandHistory([]), []);

  const value = {
    isListening,
    transcript: transcript || interimTranscript,
    isProcessing,
    isSupported,
    speechError,
    fridayAwake,
    wakeWordActive,
    wakeWordSuspended,
    lastWakePhrase,
    wakeWordEnabled,
    setWakeWordEnabled,
    suspendWakeWord,
    resumeWakeWord,
    isMuted,
    mute,
    unmute,
    toggleMute,
    lastCommand,
    commandHistory,
    processCommand,
    startListening,
    stopListening,
    tts,
    isSpeaking: tts?.isSpeaking ?? false,
    speakResponse,
    cancelSpeech: () => window.speechSynthesis.cancel(),
    toggleTTS: tts?.toggle,
    toggleAI: () => {},
    clearHistory,
  };

  return (
    <VoiceCommandContext.Provider value={value}>
      {children}
    </VoiceCommandContext.Provider>
  );
};

export default VoiceCommandContext;

