// backend/services/deepgramLiveService.js
// Real-time transcription with Deepgram — Multi-language support

const WebSocket = require("ws");
const Transcript = require("../models/Transcript");

// ─── Language → Deepgram model routing ───────────────────────────────────────
// nova-2 supports: en, es, fr, de, it, pt, nl, hi, ja, ko, zh, ru, sv, tr, pl, id
// nova-2-general supports detect_language (auto mode)
// Some Indian languages need nova-2 with explicit language code
//
// Deepgram language code reference:
// https://developers.deepgram.com/docs/languages

const NOVA2_SUPPORTED = new Set([
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "nl",
  "hi",
  "ja",
  "ko",
  "zh",
  "ru",
  "sv",
  "tr",
  "pl",
  "id",
  "en-US",
  "en-GB",
  "en-AU",
  "en-IN",
  "hi-IN",
  "pt-BR",
  "pt-PT",
  "es-419",
]);

// Languages that nova-2 does NOT support — fall back to enhanced or base model
const ENHANCED_SUPPORTED = new Set([
  "mr",
  "ta",
  "te",
  "bn",
  "gu",
  "kn",
  "ml",
  "pa",
  "ar",
]);

function getModelForLanguage(language) {
  if (language === "auto") return "nova-2-general";
  if (language === "multi") return "nova-2";
  if (NOVA2_SUPPORTED.has(language)) return "nova-2";
  if (ENHANCED_SUPPORTED.has(language)) return "enhanced"; // Deepgram enhanced model
  return "nova-2"; // default fallback
}

function startDeepgramLive(socket, meetingId, language = "en") {
  console.log(
    `🎤 Initializing Deepgram streaming for meeting: ${meetingId} | Language: ${language}`,
  );

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.error("❌ DEEPGRAM_API_KEY not found in .env");
    socket.emit("live-transcript-error", {
      message:
        "Deepgram API key not configured. Get one free at https://deepgram.com",
    });
    return null;
  }

  const model = getModelForLanguage(language);

  // ─── Build query params ────────────────────────────────────────────────────
  const params = {
    encoding: "linear16",
    sample_rate: "16000",
    channels: "1",
    punctuate: "true",
    interim_results: "true",
    endpointing: "300",
    utterance_end_ms: "1000",
    vad_events: "true",
    model,
    smart_format: "true",
    profanity_filter: "false",
    diarize: "false",
  };

  // ─── Language routing ──────────────────────────────────────────────────────
  // 'auto'  → nova-2-general + detect_language=true (Deepgram picks per-utterance)
  // 'multi' → nova-2 + language=multi (EN+ES bilingual)
  // 'hi', 'mr', 'fr', etc. → set language= directly, model chosen above
  if (language === "auto") {
    params.detect_language = "true";
    // Do NOT set params.language — nova-2-general handles detection
  } else if (language === "multi") {
    params.language = "multi";
  } else {
    params.language = language;
  }

  const url =
    "wss://api.deepgram.com/v1/listen?" +
    new URLSearchParams(params).toString();

  console.log(
    `🔗 Connecting to Deepgram... (language: ${language}, model: ${model})`,
  );
  console.log(
    `🔗 URL params: language=${params.language || "detect"}, detect_language=${params.detect_language || "false"}, model=${model}`,
  );

  const ws = new WebSocket(url, {
    headers: { Authorization: `Token ${apiKey}` },
  });

  let isReady = false;
  let liveTranscriptDoc = null;
  let segmentStartTime = 0;
  let lastSaveTime = Date.now();
  const SAVE_INTERVAL = 3000;

  // Keep-alive ping every 5 seconds to prevent Deepgram timeout
  let keepAliveInterval = null;

  ws.on("open", () => {
    console.log(
      `🟢 Deepgram WebSocket connected | language: ${language} | model: ${model}`,
    );
    isReady = true;

    socket.emit("deepgram-ready", {
      status: "connected",
      meetingId,
      service: `deepgram-${model}`,
      language,
    });

    // Send keep-alive KeepAlive messages every 5s to avoid net0001 timeout
    keepAliveInterval = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "KeepAlive" }));
      }
    }, 5000);
  });

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.channel?.alternatives?.length > 0) {
        const alternative = data.channel.alternatives[0];
        const transcript = alternative.transcript;
        const confidence = alternative.confidence;
        const isFinal = data.is_final;
        const speechFinal = data.speech_final;

        // Deepgram returns detected language when detect_language=true
        const detectedLanguage =
          data.channel?.detected_language ||
          (language === "auto" ? "detected" : language);

        if (!transcript || transcript.trim().length === 0) return;

        if (!isFinal) {
          socket.emit("live-transcript", {
            type: "partial",
            text: transcript,
            confidence,
            detectedLanguage,
            timestamp: Date.now(),
          });
          if (Math.random() < 0.1) {
            console.log(
              `📝 Partial (${detectedLanguage}): ${transcript.substring(0, 60)}`,
            );
          }
        }

        if (isFinal || speechFinal) {
          console.log(`✅ Final (${detectedLanguage}): ${transcript}`);

          socket.emit("live-transcript", {
            type: "final",
            text: transcript,
            confidence,
            words: alternative.words || [],
            detectedLanguage,
            timestamp: Date.now(),
          });

          // ── Save to DB ──────────────────────────────────────────────────────
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
                  language: language === "auto" ? detectedLanguage : language,
                  processingStatus: "live",
                  duration: 0,
                  userName: socket.data?.userName || "Unknown",
                });
                console.log("📝 Created new live transcript document");
              }
            }

            const now = Date.now();
            const segmentDuration = (now - lastSaveTime) / 1000;
            const segmentEnd = segmentStartTime + segmentDuration;

            liveTranscriptDoc.segments.push({
              start: segmentStartTime,
              end: segmentEnd,
              text: transcript,
              speaker: socket.data?.userName || "Unknown",
              confidence: confidence || 0.9,
              words: alternative.words || [],
              language: detectedLanguage,
            });

            liveTranscriptDoc.fullText = liveTranscriptDoc.segments
              .map((s) => s.text)
              .join(" ");
            liveTranscriptDoc.duration = segmentEnd;
            liveTranscriptDoc.language =
              language === "auto" ? detectedLanguage : language;

            if (now - lastSaveTime >= SAVE_INTERVAL) {
              await liveTranscriptDoc.save();
              console.log(
                `💾 Saved transcript segment (${liveTranscriptDoc.segments.length} segments)`,
              );
              lastSaveTime = now;
            }

            segmentStartTime = segmentEnd;
          } catch (dbErr) {
            console.error("❌ Error saving transcript to DB:", dbErr.message);
          }
        }
      }

      if (data.metadata) {
        console.log("ℹ️ Deepgram metadata:", JSON.stringify(data.metadata));
      }

      if (data.error) {
        console.error("❌ Deepgram error:", data.error);
        socket.emit("live-transcript-error", { message: data.error });
      }
    } catch (err) {
      console.error("❌ Failed to parse Deepgram message:", err.message);
    }
  });

  ws.on("close", async (code, reason) => {
    isReady = false;
    if (keepAliveInterval) clearInterval(keepAliveInterval);

    const reasonStr = reason?.toString() || "none";
    console.log(
      `🔴 Deepgram WebSocket closed | Code: ${code} | Reason: ${reasonStr}`,
    );

    if (liveTranscriptDoc?.segments?.length > 0) {
      try {
        liveTranscriptDoc.processingStatus = "completed";
        await liveTranscriptDoc.save();
        console.log(
          `✅ Final transcript saved: ${liveTranscriptDoc.segments.length} segments`,
        );
      } catch (err) {
        console.error("❌ Failed to save final transcript:", err.message);
      }
    }

    if (code === 1008) {
      console.error("❌ Authentication failed — check DEEPGRAM_API_KEY");
    } else if (code === 1011) {
      console.error(
        "❌ Deepgram internal error — possibly unsupported language/model combo.",
      );
      console.error(
        `   language="${language}", model="${model}" — try a different language code.`,
      );
      // Inform the frontend so the user knows to switch language
      socket.emit("live-transcript-error", {
        message: `Deepgram error: language "${language}" may not be supported. Try selecting a specific language.`,
        code,
      });
    }

    socket.emit("deepgram-disconnected", { code, reason: reasonStr });
  });

  ws.on("error", (err) => {
    console.error("❌ Deepgram WebSocket error:", err.message);
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    socket.emit("live-transcript-error", { message: err.message });
  });

  return ws;
}

module.exports = { startDeepgramLive };
