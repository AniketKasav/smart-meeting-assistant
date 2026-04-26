// backend/services/assemblyLiveService.js
const WebSocket = require("ws");
const Transcript = require("../models/Transcript");

// ── Ollama config (same as translate.js) ────────────────────────────────────
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:latest";

// Language display names (used for both source and target in prompts)
const LANG_NAMES = {
  en: "English", hi: "Hindi", mr: "Marathi", ta: "Tamil", te: "Telugu",
  bn: "Bengali", gu: "Gujarati", kn: "Kannada", ml: "Malayalam",
  pa: "Punjabi", ur: "Urdu", or: "Odia", as: "Assamese",
  es: "Spanish", fr: "French", de: "German", it: "Italian",
  pt: "Portuguese", ru: "Russian", zh: "Chinese", ja: "Japanese",
  ko: "Korean", ar: "Arabic", tr: "Turkish",
};

// ── Quick async Ollama translate ─────────────────────────────────────────────
async function translateText(text, sourceLangName, targetLangName) {
  try {
    const prompt = `Translate the following ${sourceLangName} text to ${targetLangName}.
Output ONLY the ${targetLangName} translation with no explanation, no preamble, no quotes.
Preserve meaning exactly. Keep proper nouns, names, and numbers as-is.

Text: ${text}`;

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 512 },
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!res.ok) return null;
    const data = await res.json();
    return (data.response || "").trim() || null;
  } catch {
    return null; // silently skip if Ollama is slow/unavailable
  }
}

function startAssemblyLive(socket, meetingId, userName = "Unknown", targetLang = "en", spokenLang = "auto") {
  console.log(
    "🎤 Initializing AssemblyAI Streaming STT for meeting:",
    meetingId,
    "| spoken:", spokenLang, "| translate to:", targetLang
  );

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    console.error("❌ ASSEMBLYAI_API_KEY not found in .env");
    socket.emit("live-transcript-error", {
      message: "AssemblyAI API key not configured",
    });
    return null;
  }

  // ── Common Whisper hallucination phrases ─────────────────────────────────
  // whisper-rt generates these on silence/background noise.
  // Blocklisting them prevents false segments appearing in the transcript.
  const HALLUCINATION_PHRASES = new Set([
    "terima kasih", "thank you", "thanks", "obrigado", "obrigada",
    "gracias", "merci", "danke", "amem", "amen", "shukria",
    "arigato", "xie xie", "spasibo", "tesekkur ederim",
    "transcribing", "...", ".", " ",
  ]);

  // ── AssemblyAI v3 streaming — whisper-rt model for 99+ languages ──────────
  // When the user picks a specific language, pass it so whisper-rt locks to
  // that language instead of auto-detecting (prevents cross-language hallucination)
  const langParam = (spokenLang && spokenLang !== "auto" && spokenLang !== "multi")
    ? `&language=${spokenLang}`
    : "";

  const ws = new WebSocket(
    "wss://streaming.assemblyai.com/v3/ws" +
      "?sample_rate=16000" +
      "&encoding=pcm_s16le" +
      "&speech_model=whisper-rt" +
      "&format_turns=true" +
      langParam,
    { headers: { Authorization: apiKey } },
  );

  // ✅ Queue audio chunks that arrive before the connection is ready
  let isReady = false;
  const audioQueue = [];

  // ✅ DB tracking variables
  let liveTranscriptDoc = null;
  let segmentStartTime = 0;
  let lastSaveTime = Date.now();
  const SAVE_INTERVAL = 3000;

  // ✅ Expose sendAudio so server.js can call it directly
  ws.sendAudio = (buffer) => {
    if (isReady && ws.readyState === 1) {
      ws.send(buffer);
    } else {
      // Queue until ready; cap at 50 frames to avoid memory bloat
      if (audioQueue.length < 50) audioQueue.push(buffer);
    }
  };

  ws.on("open", () => {
    console.log(
      "🟢 AssemblyAI WebSocket open — waiting for Begin confirmation",
    );
    socket.emit("assembly-ready", { status: "connected", meetingId });
  });

  ws.on("message", (msg) => {
    const raw = msg.toString();
    console.log("📨 AssemblyAI →", raw.substring(0, 120));

    try {
      const data = JSON.parse(raw);
      const type = data.type || data.message_type;

      // ── Session confirmation — AssemblyAI v3 sends type: "Begin" ──────────
      if (
        type === "Begin" ||
        type === "session_begins" ||
        type === "SessionBegins"
      ) {
        console.log(
          "🟢 AssemblyAI session active, ID:",
          data.id || data.session_id,
        );
        isReady = true;

        // ✅ Flush any audio that arrived before we were ready
        if (audioQueue.length > 0) {
          console.log(`📤 Flushing ${audioQueue.length} queued audio chunks`);
          for (const chunk of audioQueue) {
            if (ws.readyState === 1) ws.send(chunk);
          }
          audioQueue.length = 0;
        }
        return;
      }

      // ── Turn — this is what v3 actually sends for transcripts ─────────────
      if (type === "Turn") {
        const text = data.transcript;
        if (!text || !text.trim()) return;

        const isFinal = data.end_of_turn === true;
        const detectedLang = data.language || data.detected_language || null;
        const trimmed = text.trim();

        // ── Hallucination filter ──────────────────────────────────────────
        // Block known false-positive phrases whisper-rt emits on silence.
        // Also discard very short single tokens (≤3 chars) on final turns.
        if (isFinal) {
          const lower = trimmed.toLowerCase().replace(/[.,!?。]/g, "").trim();
          if (HALLUCINATION_PHRASES.has(lower)) {
            console.log(`🚫 Hallucination filtered: "${trimmed}"`);
            return;
          }
          if (trimmed.split(/\s+/).length === 1 && trimmed.length <= 3) {
            console.log(`🚫 Too short, likely noise: "${trimmed}"`);
            return;
          }
        }

        console.log(
          `📝 Turn (${isFinal ? "FINAL" : "partial"}) [${detectedLang || "?"}]: ${trimmed.substring(0, 80)}`,
        );

        socket.emit("live-transcript", {
          type: isFinal ? "final" : "partial",
          text: text.trim(),
          confidence: 0.9,
          words: data.words || [],
          timestamp: Date.now(),
          detectedLanguage: detectedLang,
        });

        if (isFinal) {
          saveToDB(text.trim(), 0.9, data.words || []);

          // ── Async live translation ─────────────────────────────────────────
          // Translate when the spoken language differs from the user's chosen
          // translation target language (targetLang, e.g. "en", "hi", "mr")
          const spokenLang = (detectedLang || "").split("-")[0].toLowerCase();
          const targetLangBase = targetLang.split("-")[0].toLowerCase();

          // Skip if spoken language matches the target (nothing to translate)
          const shouldTranslate = spokenLang &&
            spokenLang !== targetLangBase &&
            spokenLang !== "auto";

          if (shouldTranslate) {
            const sourceName = LANG_NAMES[spokenLang] || spokenLang;
            const targetName = LANG_NAMES[targetLangBase] || targetLangBase;
            const timestampId = Date.now();

            console.log(`🌐 Translating ${sourceName} → ${targetName} (async)...`);
            translateText(text.trim(), sourceName, targetName).then((translated) => {
              if (translated && translated !== text.trim()) {
                console.log(`✅ Translation: "${translated.substring(0, 60)}"`);
                socket.emit("live-transcript-translation", {
                  originalText: text.trim(),
                  translatedText: translated,
                  targetLanguage: targetLangBase,
                  sourceLang: spokenLang,
                  timestamp: timestampId,
                });
              }
            });
          }
        }
        return;
      }

      // ── Fallback handlers for older message_type style ───────────────────
      if (type === "PartialTranscript" || type === "partial_transcript") {
        const text = data.text || data.transcript;
        if (text && text.trim()) {
          socket.emit("live-transcript", {
            type: "partial",
            text: text.trim(),
            confidence: data.confidence || 0.8,
            timestamp: Date.now(),
          });
        }
        return;
      }

      if (type === "FinalTranscript" || type === "final_transcript") {
        const text = data.text || data.transcript;
        if (text && text.trim()) {
          console.log("✅ Final:", text);
          socket.emit("live-transcript", {
            type: "final",
            text: text.trim(),
            confidence: data.confidence || 0.9,
            words: data.words || [],
            timestamp: Date.now(),
          });
          saveToDB(text.trim(), data.confidence || 0.9, data.words || []);
        }
        return;
      }

      if (type === "SessionInformation" || type === "session_information")
        return;

      if (type === "SessionTerminated" || type === "session_terminated") {
        console.log("✅ Session terminated cleanly");
        return;
      }

      if (data.error) {
        console.error("❌ AssemblyAI error:", data.error);
        socket.emit("live-transcript-error", { message: data.error });
        return;
      }

      console.warn("⚠️ Unhandled AssemblyAI type:", type);
    } catch (err) {
      console.error(
        "❌ Parse error:",
        err.message,
        "| Raw:",
        raw.substring(0, 100),
      );
    }
  });

  ws.on("close", async (code, reason) => {
    isReady = false;
    audioQueue.length = 0;
    const reasonStr = reason?.toString() || "none";
    console.log(`🔴 AssemblyAI closed | Code: ${code} | Reason: ${reasonStr}`);

    if (liveTranscriptDoc?.segments?.length > 0) {
      try {
        liveTranscriptDoc.processingStatus = "completed";
        await liveTranscriptDoc.save();
        console.log(
          "✅ Final live transcript saved:",
          liveTranscriptDoc.segments.length,
          "segments",
        );
      } catch (err) {
        console.error("❌ Failed to save final transcript:", err.message);
      }
    }

    socket.emit("assembly-disconnected", { code, reason: reasonStr });
  });

  ws.on("error", (err) => {
    console.error("❌ AssemblyAI WebSocket error:", err.message);
    socket.emit("live-transcript-error", { message: err.message });
  });

  // ── DB save helper ─────────────────────────────────────────────────────────
  async function saveToDB(text, confidence, words) {
    try {
      if (!liveTranscriptDoc) {
        liveTranscriptDoc = await Transcript.findOne({
          meetingId,
          processingStatus: "live",
        });

        if (!liveTranscriptDoc) {
          liveTranscriptDoc = new Transcript({
            meetingId,
            segments: [],
            fullText: "",
            language: "en",
            processingStatus: "live",
            duration: 0,
            userName: userName,
          });
        }
      }

      const now = Date.now();
      const segmentEnd = segmentStartTime + (now - lastSaveTime) / 1000;

      liveTranscriptDoc.segments.push({
        start: segmentStartTime,
        end: segmentEnd,
        text,
        speaker: userName,
        confidence,
        words,
      });

      liveTranscriptDoc.fullText = liveTranscriptDoc.segments
        .map((s) => s.text)
        .join(" ");
      liveTranscriptDoc.duration = segmentEnd;

      if (now - lastSaveTime >= SAVE_INTERVAL) {
        await liveTranscriptDoc.save();
        console.log(
          `💾 Live transcript saved: ${liveTranscriptDoc.segments.length} segments`,
        );
        lastSaveTime = now;
      }

      segmentStartTime = segmentEnd;
    } catch (err) {
      console.error("❌ DB save error:", err.message);
    }
  }

  return ws;
}

module.exports = { startAssemblyLive };
