// backend/services/deepgramLiveService.js
// Real-time transcription with Deepgram (200-400ms latency)

const WebSocket = require("ws");

function startDeepgramLive(socket, meetingId) {
  console.log("🎤 Initializing Deepgram streaming for meeting:", meetingId);

  // Check API key
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.error("❌ DEEPGRAM_API_KEY not found in .env");
    socket.emit("live-transcript-error", { 
      message: "Deepgram API key not configured. Get one free at https://deepgram.com" 
    });
    return null;
  }

  // ✅ Deepgram Streaming API endpoint
  const url = "wss://api.deepgram.com/v1/listen?" + new URLSearchParams({
    encoding: "linear16",
    sample_rate: "16000",
    channels: "1",
    punctuate: "true",           // Auto-add punctuation
    interim_results: "true",     // Get partial results (like typing preview)
    endpointing: "300",          // Finalize after 300ms of silence
    utterance_end_ms: "1000",    // End utterance after 1s of silence
    vad_events: "true",          // Voice activity detection
    model: "nova-2",             // Latest & most accurate model
    smart_format: "true",        // Auto-capitalize, format numbers
    profanity_filter: "false",   // Keep original speech
    diarize: "false"             // Speaker diarization (set true if needed)
  }).toString();

  console.log("🔗 Connecting to Deepgram...");

  const ws = new WebSocket(url, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  });

  let isReady = false;
  let transcriptBuffer = "";

  ws.on("open", () => {
    console.log("🟢 Deepgram WebSocket connected");
    isReady = true;

    socket.emit("deepgram-ready", { 
      status: "connected",
      meetingId,
      service: "deepgram-nova-2"
    });
  });

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // Check if this is a transcript response
      if (data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
        const alternative = data.channel.alternatives[0];
        const transcript = alternative.transcript;
        const confidence = alternative.confidence;
        const isFinal = data.is_final;
        const speechFinal = data.speech_final;

        // Skip empty transcripts
        if (!transcript || transcript.trim().length === 0) {
          return;
        }

        // ✅ PARTIAL TRANSCRIPT (typing preview - updates in real-time)
        if (!isFinal) {
          socket.emit("live-transcript", {
            type: "partial",
            text: transcript,
            confidence: confidence,
            timestamp: Date.now()
          });
          
          // Log occasionally to avoid spam
          if (Math.random() < 0.1) {
            console.log("📝 Partial:", transcript.substring(0, 50));
          }
        }

        // ✅ FINAL TRANSCRIPT (confirmed text)
        if (isFinal || speechFinal) {
          console.log("✅ Final:", transcript);
          
          socket.emit("live-transcript", {
            type: "final",
            text: transcript,
            confidence: confidence,
            words: alternative.words || [],  // Word-level timestamps
            timestamp: Date.now()
          });

          transcriptBuffer = ""; // Clear buffer
        }
      }

      // Handle metadata
      if (data.metadata) {
        console.log("ℹ️ Deepgram metadata:", data.metadata);
      }

      // Handle errors
      if (data.error) {
        console.error("❌ Deepgram error:", data.error);
        socket.emit("live-transcript-error", { 
          message: data.error 
        });
      }

    } catch (err) {
      console.error("❌ Failed to parse Deepgram message:", err.message);
    }
  });

  ws.on("close", (code, reason) => {
    isReady = false;
    console.log("🔴 Deepgram WebSocket closed");
    console.log("   Code:", code);
    console.log("   Reason:", reason.toString() || "No reason provided");

    // Common error codes
    if (code === 1008) {
      console.error("❌ Authentication failed - check your API key");
    } else if (code === 1011) {
      console.error("❌ Internal error - contact Deepgram support");
    }

    socket.emit("deepgram-disconnected", { 
      code, 
      reason: reason.toString() 
    });
  });

  ws.on("error", (err) => {
    console.error("❌ Deepgram WebSocket error:", err.message);
    socket.emit("live-transcript-error", { 
      message: err.message 
    });
  });

  return ws;
}

module.exports = { startDeepgramLive };