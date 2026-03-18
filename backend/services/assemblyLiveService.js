// backend/services/assemblyLiveService.js
// Updated for AssemblyAI Streaming STT (Universal Model)

const WebSocket = require("ws");

function startAssemblyLive(socket, meetingId) {
  console.log("🎤 Initializing AssemblyAI Streaming STT for meeting:", meetingId);

  // ✅ Check API key
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    console.error("❌ ASSEMBLYAI_API_KEY not found in .env");
    socket.emit("live-transcript-error", { 
      message: "AssemblyAI API key not configured" 
    });
    return null;
  }

  // ✅ CORRECT: New Streaming STT endpoint (replaces deprecated v2/realtime)
  const ws = new WebSocket(
    "wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&word_boost=[]&encoding=pcm_s16le",
    {
      headers: {
        Authorization: apiKey,
      },
    }
  );

  let sessionActive = false;

  ws.on("open", () => {
    console.log("🟢 AssemblyAI Streaming STT connected");
    sessionActive = true;
    
    // Notify frontend
    socket.emit("assembly-ready", { 
      status: "connected",
      meetingId 
    });
  });

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // Session begins
      if (data.message_type === "SessionBegins") {
        console.log("🟢 AssemblyAI session started");
        console.log("   Session ID:", data.session_id);
        console.log("   Expires at:", data.expires_at);
        return;
      }

      // Partial transcript (live typing preview)
      if (data.message_type === "PartialTranscript") {
        if (data.text && data.text.trim()) {
          // Only log occasionally to reduce spam
          if (Math.random() < 0.1) {
            console.log("📝 Partial:", data.text.substring(0, 50));
          }
          
          socket.emit("live-transcript", {
            type: "partial",
            text: data.text,
            confidence: data.confidence,
            audio_start: data.audio_start,
            audio_end: data.audio_end,
          });
        }
        return;
      }

      // Final transcript (confirmed words)
      if (data.message_type === "FinalTranscript") {
        if (data.text && data.text.trim()) {
          console.log("✅ Final:", data.text);
          socket.emit("live-transcript", {
            type: "final",
            text: data.text,
            confidence: data.confidence,
            audio_start: data.audio_start,
            audio_end: data.audio_end,
            words: data.words, // Word-level timestamps
          });
        }
        return;
      }

      // Session information
      if (data.message_type === "SessionInformation") {
        console.log("ℹ️ Session info received");
        return;
      }

      // Errors
      if (data.error) {
        console.error("❌ AssemblyAI error:", data.error);
        socket.emit("live-transcript-error", { 
          message: data.error 
        });
        return;
      }

      // Log unknown messages for debugging
      console.log("⚠️ Unknown message:", data.message_type || "no type");

    } catch (err) {
      console.error("❌ Error parsing AssemblyAI message:", err.message);
    }
  });

  ws.on("close", (code, reason) => {
    sessionActive = false;
    console.log("🔴 AssemblyAI WebSocket closed");
    console.log("   Code:", code);
    console.log("   Reason:", reason.toString() || "No reason provided");
    
    socket.emit("assembly-disconnected", { 
      code, 
      reason: reason.toString() 
    });
  });

  ws.on("error", (err) => {
    console.error("❌ AssemblyAI WebSocket error:", err.message);
    socket.emit("live-transcript-error", { 
      message: err.message 
    });
  });

  return ws;
}

module.exports = { startAssemblyLive };