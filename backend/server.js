// backend/server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");
const multer = require("multer");
const WebSocket = require("ws");
const {
  generateSummary,
  regenerateSummary,
} = require("./services/summaryService");
const { generateChatResponse } = require("./services/chatbotService");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const analyticsRoutes = require("./routes/analytics");
const actionItemsRoutes = require("./routes/actionItems");
const searchRoutes = require("./routes/search");
const exportRoutes = require("./routes/export");
const logErrorRouter = require("./routes/logError");
const debugRouter = require("./routes/debug");

// try {
//   const incomingLangBase = (language || "en").split("-")[0].toLowerCase();

//   // ✅ FIX: Store the ACTUAL spoken language in the `language` field.
//   // Previously, non-English codes like "mr" (Marathi) were silently
//   // remapped to "en" via MONGO_SAFE_LANGS, which caused the MongoDB text
//   // index (which was using the document language for stemming) to corrupt
//   // Devanagari tokens. The index is now set to default_language: "none"
//   // in Transcript.js so all scripts are stored as-is.
//   const storedLanguage = incomingLangBase; // "mr", "hi", "en", etc.

//   // Find or create a live transcript document for this meeting+user
//   let doc = await Transcript.findOne({
//     meetingId,
//     userName: segUserName || "Unknown",
//     processingStatus: "live",
//   });

//   if (!doc) {
//     doc = new Transcript({
//       meetingId,
//       segments: [],
//       fullText: "",
//       language: storedLanguage, // ✅ actual language, not forced "en"
//       spokenLanguage: storedLanguage,
//       processingStatus: "live",
//       duration: 0,
//       userName: segUserName || "Unknown",
//     });
//   }

//   // Always keep language fields in sync with what's actually being spoken
//   doc.language = storedLanguage;
//   doc.spokenLanguage = storedLanguage;

//   const segStart = doc.duration || 0;
//   const segDuration = Math.max(
//     3,
//     Math.ceil(trimmedText.split(/\s+/).length / 3),
//   );
//   doc.segments.push({
//     start: segStart,
//     end: segStart + segDuration,
//     text: trimmedText,
//     speaker: segUserName || "Unknown",
//     confidence: 0.95,
//   });
//   doc.fullText = doc.segments.map((s) => s.text).join(" ");
//   doc.duration = segStart + segDuration;

//   await doc.save();
//   console.log(
//     `✅ Live segment saved [${storedLanguage}] (${doc.segments.length} total)`,
//   );
// } catch (err) {
//   // ✅ FIX: Log the FULL error (not just message) so Mongoose validation
//   // errors are visible instead of being swallowed silently.
//   console.error("❌ Failed to save live segment:", err);
// }
// Assistant routes
const assistantRoutes = require("./routes/assistant");
// Google/Gmail/Drive routes
const googleAuthRoutes = require("./routes/googleAuth");
const gmailRoutes = require("./routes/gmail");
const driveRoutes = require("./routes/drive");

// ✅ PERSISTENT PYTHON PROCESS for YouTube-style instant subtitles
let persistentTranscriptionProcess = null;
const transcriptionQueue = new Map();
let transcriptionChunkCounter = 0;

// ✅ VOSK process for fastest live transcription (alternative)
let voskProcess = null;
let voskReady = false;
const voskQueue = new Map();

// Database
const connectDB = require("./config/database");
const Meeting = require("./models/Meeting");
const Transcript = require("./models/Transcript");

// MongoDB text index only supports these languages (ISO 639-1)
const MONGO_SAFE_LANGS = new Set([
  "da",
  "nl",
  "en",
  "fi",
  "fr",
  "de",
  "hu",
  "it",
  "nb",
  "pt",
  "ro",
  "ru",
  "es",
  "sv",
  "tr",
]);

const app = express();

app.use((req, res, next) => {
  const allowed = ['https://smart-meeting-assistant-psi.vercel.app','https://smartmeetai.in','https://www.smartmeetai.in'];
  const origin = req.headers.origin;
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://smart-meeting-assistant-psi.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Security headers
// Security headers
// Security headers (relaxed for development)
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP in development
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);

// Cookie parser
app.use(cookieParser());

const { apiLimiter } = require("./middleware/rateLimiter");

// Apply rate limiter with exemptions
app.use("/api/", (req, res, next) => {
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;

  // Skip rate limiting for localhost development
  if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") {
    return next();
  }

  // Skip rate limiting for these endpoints
  if (
    path.startsWith("/auth/") ||
    path.startsWith("/assistant/suggestions") ||
    path === "/health"
  ) {
    return next();
  }
  apiLimiter(req, res, next);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err);
  console.error("Stack:", err.stack);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// ✅ Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads", "temp");
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // ✅ Keep original extension
    const ext = file.originalname.endsWith(".webm") ? "webm" : "wav";
    cb(null, `chunk-${uniqueSuffix}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per chunk
});

// Connect to MongoDB
connectDB();

// ✅ Authentication Routes
console.log("✅ Auth routes loaded");

app.use("/api/auth", authRoutes);
app.use("/api/log-error", logErrorRouter);
app.use("/api/debug", debugRouter);
console.log("✅ Auth routes registered");

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: Date.now(), db: "connected" });
});

// Check WebRTC meeting room status
app.get("/api/meetings/:meetingId/status", (req, res) => {
  const { meetingId } = req.params;
  const room = meetingRooms.get(meetingId);

  if (!room) {
    return res.json({
      success: true,
      data: {
        isActive: false,
        participantCount: 0,
        participants: [],
      },
    });
  }

  const participants = Array.from(room).map((socketId) => {
    const user = socketToUser.get(socketId);
    return {
      userId: user.userId,
      userName: user.userName,
      isAudioEnabled: user.isAudioEnabled,
      isVideoEnabled: user.isVideoEnabled,
    };
  });

  res.json({
    success: true,
    data: {
      isActive: true,
      participantCount: room.size,
      participants,
    },
  });
});

// ✅ Serve uploaded files with proper CORS headers
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  },
  express.static(path.join(__dirname, "uploads")),
);

// Enhanced audio file serving with proper CORS and headers
app.get("/uploads/:meetingId/audio.wav", (req, res) => {
  const { meetingId } = req.params;
  const filePath = path.join(__dirname, "uploads", meetingId, "audio.wav");

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Audio file not found" });
  }

  // Get file stats
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Support range requests for seeking
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "audio/wav",
      "Access-Control-Allow-Origin": "*",
    });

    file.pipe(res);
  } else {
    // No range request - send full file
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "audio/wav",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

app.post("/api/upload-chunk", upload.single("file"), async (req, res) => {
  try {
    const { meetingId, chunkIndex } = req.body;
    const audioFile = req.file;

    if (!audioFile || !meetingId || chunkIndex === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`📦 WAV Chunk ${chunkIndex} received: ${audioFile.size} bytes`);

    // Create meeting directory
    const meetingDir = path.join(__dirname, "uploads", meetingId);
    await fs.ensureDir(meetingDir);

    // Save WAV chunk
    const chunkPath = path.join(meetingDir, `chunk_${chunkIndex}.wav`);
    await fs.move(audioFile.path, chunkPath, { overwrite: true });

    const stats = await fs.stat(chunkPath);
    console.log(`✅ WAV Chunk ${chunkIndex} saved: ${stats.size} bytes`);

    res.json({
      success: true,
      filePath: chunkPath,
      chunkIndex: parseInt(chunkIndex),
      size: stats.size,
      format: "wav",
    });
  } catch (err) {
    console.error("❌ Upload chunk error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/process-recording", async (req, res) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: "meetingId required" });
    }

    console.log(`🔄 Processing recording for meeting ${meetingId}`);

    const meetingDir = path.join(__dirname, "uploads", meetingId);

    if (!(await fs.pathExists(meetingDir))) {
      return res.status(404).json({ error: "No audio files found" });
    }

    // Get all WAV chunks
    const files = await fs.readdir(meetingDir);
    const chunks = files
      .filter((f) => f.startsWith("chunk_") && f.endsWith(".wav"))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)?.[0] || 0);
        const bNum = parseInt(b.match(/\d+/)?.[0] || 0);
        return aNum - bNum;
      });

    if (chunks.length === 0) {
      return res.status(400).json({ error: "No audio chunks found" });
    }

    console.log(`📦 Found ${chunks.length} WAV chunks to combine`);

    const outputWavPath = path.join(meetingDir, "audio.wav");

    try {
      // ✅ Combine WAV chunks (simple binary concatenation)
      console.log("🔗 Combining WAV chunks...");

      const chunkPaths = chunks.map((c) => path.join(meetingDir, c));

      // Read first chunk (includes WAV header)
      const firstChunkData = await fs.readFile(chunkPaths[0]);
      const headerSize = 44; // Standard WAV header size

      // Collect all audio data
      let allAudioData = [firstChunkData];
      let totalDataSize = firstChunkData.length - headerSize;

      // Append remaining chunks (skip their headers)
      for (let i = 1; i < chunkPaths.length; i++) {
        const chunkData = await fs.readFile(chunkPaths[i]);
        const audioOnlyData = chunkData.slice(headerSize);
        allAudioData.push(audioOnlyData);
        totalDataSize += audioOnlyData.length;
      }

      // Combine all data
      const combinedBuffer = Buffer.concat(allAudioData);

      // ✅ CRITICAL: Update WAV header with correct file size
      // ChunkSize (bytes 4-7): file size - 8
      combinedBuffer.writeUInt32LE(combinedBuffer.length - 8, 4);
      // Subchunk2Size (bytes 40-43): data size
      combinedBuffer.writeUInt32LE(totalDataSize, 40);

      // Write combined file
      await fs.writeFile(outputWavPath, combinedBuffer);

      const stats = await fs.stat(outputWavPath);
      console.log(`✅ Combined WAV created: ${stats.size} bytes`);
      console.log(
        `   Duration: ~${Math.floor(totalDataSize / (16000 * 2))} seconds`,
      );
    } catch (combineErr) {
      console.error("❌ WAV combine failed:", combineErr);
      return res.status(500).json({
        error: "Failed to combine audio chunks",
        details: combineErr.message,
      });
    }

    console.log("✅ Audio processing complete, starting transcription...");

    // Start transcription
    console.log("🎯 Starting AssemblyAI transcription...");

    try {
      const { AssemblyAI } = require("assemblyai");
      const aaiClient = new AssemblyAI({
        apiKey: process.env.ASSEMBLYAI_API_KEY,
      });

      console.log("📤 Uploading audio to AssemblyAI...");
      const uploadUrl = await aaiClient.files.upload(outputWavPath);
      console.log("✅ Audio uploaded:", uploadUrl);

      const aaiTranscript = await aaiClient.transcripts.transcribe({
        audio_url: uploadUrl,
        language_detection: true,
      });

      console.log("✅ AssemblyAI transcription complete");
      console.log(`📝 Words: ${aaiTranscript.words?.length || 0}`);

      // Convert AssemblyAI word-level output into segments (same shape as Whisper)
      const whisperSegments = (aaiTranscript.words || []).reduce(
        (segments, word, i) => {
          const segIndex = Math.floor(i / 10);
          if (!segments[segIndex]) {
            segments[segIndex] = {
              start: word.start / 1000,
              end: word.end / 1000,
              text: word.text,
              confidence: word.confidence || 0.9,
            };
          } else {
            segments[segIndex].end = word.end / 1000;
            segments[segIndex].text += " " + word.text;
          }
          return segments;
        },
        [],
      );

      const detectedLang = aaiTranscript.language_code || "en";
      const safeWhisperLang = MONGO_SAFE_LANGS.has(detectedLang)
        ? detectedLang
        : "en";

      // Promote live segments to completed
      await Transcript.updateMany(
        { meetingId, processingStatus: "live" },
        { $set: { processingStatus: "completed" } },
      );
      console.log("✅ Promoted live segments to completed");

      let transcript = null;

      if (whisperSegments.length > 0) {
        transcript = new Transcript({
          meetingId,
          segments: whisperSegments,
          fullText:
            aaiTranscript.text || whisperSegments.map((s) => s.text).join(" "),
          language: safeWhisperLang,
          spokenLanguage: detectedLang,
          audioPath: `/uploads/${meetingId}/audio.wav`,
          duration: whisperSegments[whisperSegments.length - 1]?.end || 0,
          processingStatus: "completed",
          userName: req.body.userName || "Unknown",
        });
        await transcript.save();
        console.log("✅ AssemblyAI transcript saved to database");
      } else {
        console.log(
          "⚠️ AssemblyAI produced no words — live segments are the transcript",
        );
      }

      if (transcript?._id) {
        await Meeting.findOneAndUpdate(
          { meetingId },
          { status: "completed", $push: { transcripts: transcript._id } },
        );
      } else {
        await Meeting.findOneAndUpdate({ meetingId }, { status: "completed" });
      }
      console.log("✅ Meeting status updated to completed");

      console.log("🧹 Cleaning up individual chunks...");
      for (const chunk of chunks) {
        await fs.unlink(path.join(meetingDir, chunk)).catch(() => {});
      }
      console.log("✅ Cleanup complete");

      res.json({
        success: true,
        audioPath: `/uploads/${meetingId}/audio.wav`,
        transcript: transcript,
        chunksProcessed: chunks.length,
      });
    } catch (transcribeErr) {
      console.error("❌ AssemblyAI transcription failed:", transcribeErr);

      await Transcript.updateMany(
        { meetingId, processingStatus: "live" },
        { $set: { processingStatus: "completed" } },
      );
      await Meeting.findOneAndUpdate({ meetingId }, { status: "completed" });

      res.json({
        success: true,
        audioPath: `/uploads/${meetingId}/audio.wav`,
        warning: "Audio saved but transcription failed",
        error: transcribeErr.message,
        chunksProcessed: chunks.length,
      });
    }
  } catch (err) {
    console.error("❌ Process recording error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// AI CHATBOT ENDPOINT
// ============================================

app.post("/api/chat", async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log("💬 Chat request:", message);

    // ✅ Just set SSE headers — global CORS middleware handles the rest
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const { generateChatResponseStream } = require("./services/chatbotService");

    let sources = [];
    let fullText = "";

    try {
      const result = await generateChatResponseStream(
        message,
        conversationHistory || [],
        (chunk) => {
          fullText += chunk;
          // Send each chunk as SSE
          res.write(
            `data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`,
          );
        },
      );

      sources = result.sources || [];
    } catch (streamErr) {
      console.error("Stream error, falling back:", streamErr.message);
      // Fallback to non-streaming
      const { generateChatResponse } = require("./services/chatbotService");
      const result = await generateChatResponse(
        message,
        conversationHistory || [],
      );
      fullText = result.response;
      sources = result.sources || [];
      res.write(
        `data: ${JSON.stringify({ type: "chunk", text: fullText })}\n\n`,
      );
    }

    // Send final done event with sources
    res.write(
      `data: ${JSON.stringify({ type: "done", sources, fullText })}\n\n`,
    );
    res.end();
  } catch (err) {
    console.error("❌ Chat error:", err);
    res.write(
      `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`,
    );
    res.end();
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Config from env
const ffprobePath = process.env.FFPROBE_PATH || "ffprobe";
console.log("Configured ffprobePath =", ffprobePath);

async function ensureUserFolder(meetingId, userId) {
  const dir = path.join(__dirname, "uploads", meetingId, userId);
  await fs.ensureDir(dir);
  return dir;
}

const runningConcat = new Map();
function makeKey(m, u) {
  return `${m}:${u}`;
}

// ============================================
// WEBRTC SIGNALING DATA STRUCTURES
// ============================================
const meetingRooms = new Map(); // meetingId -> Set of socketIds
const socketToUser = new Map(); // socketId -> { userId, userName, meetingId, isAudioEnabled, isVideoEnabled }
const deepgramConnections = new Map(); // meetingId -> Deepgram WebSocket connection

function probeDuration(filePath) {
  return new Promise((resolve) => {
    const proc = spawn(ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);

    let out = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.on("close", () => {
      const dur = parseFloat(out.trim());
      if (!dur || isNaN(dur) || dur <= 0) return resolve(null);
      resolve(dur);
    });
    proc.on("error", (err) => {
      console.warn("probeDuration error:", err.message);
      resolve(null);
    });
  });
}

// ✅ TRANSCRIBE AUDIO FUNCTION
async function transcribeAudio(audioPath, meetingId) {
  return new Promise((resolve, reject) => {
    console.log("🎯 Starting Whisper transcription...");
    console.log("📁 Audio file:", audioPath);

    // Call your Python transcription script
    const pythonProcess = spawn("python", [
      path.join(__dirname, "transcribe.py"),
      audioPath,
      meetingId,
    ]);

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
      console.log("🐍 Python:", data.toString().trim());
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error("🐍 Python Error:", data.toString().trim());
    });

    pythonProcess.on("close", async (code) => {
      if (code === 0) {
        try {
          // Save transcript to database
          const transcriptPath = path.join(
            path.dirname(audioPath),
            "transcript.json",
          );

          if (await fs.pathExists(transcriptPath)) {
            const transcriptData = await fs.readJSON(transcriptPath);

            // Save to MongoDB
            const transcript = new Transcript({
              meetingId,
              segments: transcriptData.segments || [],
              fullText: transcriptData.text || "",
              language: transcriptData.language || "en",
              audioPath,
              duration:
                transcriptData.segments?.[transcriptData.segments.length - 1]
                  ?.end || 0,
              processingStatus: "completed",
            });

            await transcript.save();
            console.log("✅ Transcript saved to database");

            resolve(transcript);
          } else {
            reject(new Error("Transcript file not found"));
          }
        } catch (err) {
          reject(err);
        }
      } else {
        reject(
          new Error(`Transcription failed with code ${code}: ${errorOutput}`),
        );
      }
    });
  });
}

async function runConcatScript(meetingId, userId) {
  const scriptPath = path.join(__dirname, "concat-chunks.js");

  if (!(await fs.pathExists(scriptPath))) {
    throw new Error("concat-chunks.js not found");
  }

  return new Promise((resolve, reject) => {
    console.log(`Running: node ${scriptPath} ${meetingId} ${userId}`);

    const proc = spawn("node", [scriptPath, meetingId, userId], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => {
      const txt = d.toString();
      stdout += txt;
      console.log("[concat]", txt.trim());
    });

    proc.stderr.on("data", (d) => {
      const txt = d.toString();
      stderr += txt;
      console.error("[concat]", txt.trim());
    });

    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("Concat timeout (5 min)"));
    }, 300000);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        console.log("✅ Concat completed");
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Concat failed with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function findCombinedAudio(userDir) {
  const wavPath = path.join(userDir, "combined.wav");
  const webmPath = path.join(userDir, "combined.webm");

  if (await fs.pathExists(wavPath)) {
    const stats = await fs.stat(wavPath);
    console.log(`Found combined.wav (${stats.size} bytes)`);
    return wavPath;
  }

  if (await fs.pathExists(webmPath)) {
    const stats = await fs.stat(webmPath);
    console.log(`Found combined.webm (${stats.size} bytes)`);
    return webmPath;
  }

  return null;
}

// Add these routes AFTER your existing routes (before io.on('connection'))

// ==================== AI SUMMARY ROUTES ====================

// Generate summary for a meeting
app.post("/api/meetings/:meetingId/summary", async (req, res) => {
  try {
    const { meetingId } = req.params;
    console.log(`🤖 Generating summary for meeting: ${meetingId}`);

    // 1. Find the meeting
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // 2. Check if meeting has transcripts
    const transcripts = await Transcript.find({ meetingId }).sort({
      timestamp: 1,
    });
    if (!transcripts || transcripts.length === 0) {
      return res
        .status(400)
        .json({ error: "No transcripts found for this meeting" });
    }

    // 3. Combine all transcript segments into full text
    const transcriptText = transcripts
      .map((t) => t.segments.map((s) => s.text).join(" "))
      .join(" ");

    if (!transcriptText || transcriptText.trim().length < 50) {
      return res
        .status(400)
        .json({ error: "Transcript too short to generate summary" });
    }

    // 4. Extract participant names
    const participants = meeting.participants.map((p) => p.name);

    // 5. Generate AI summary
    const summaryData = await generateSummary(transcriptText, participants);

    // 6. Update meeting with summary
    meeting.summary = {
      text: summaryData.executiveSummary,
      generatedAt: summaryData.generatedAt,
      model: summaryData.model,
      keyPoints: summaryData.keyPoints || [],
      decisions: summaryData.decisions || [],
      actionItems: summaryData.actionItems || [],
      topics: summaryData.topics || [],
      sentiment: summaryData.sentiment || "neutral",
      nextSteps: summaryData.nextSteps || [],
    };

    await meeting.save();

    console.log("✅ Summary saved to database");

    res.json({
      success: true,
      summary: meeting.summary,
    });
  } catch (error) {
    console.error("❌ Error generating summary:", error);
    res.status(500).json({
      error: "Failed to generate summary",
      message: error.message,
    });
  }
});

// Regenerate summary with custom prompt
app.put("/api/meetings/:meetingId/summary/regenerate", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { customPrompt } = req.body;

    console.log(`🔄 Regenerating summary for meeting: ${meetingId}`);

    // Try to find by meetingId field first
    let meeting = await Meeting.findOne({ meetingId });

    // If not found and looks like MongoDB _id, try that
    if (!meeting && /^[0-9a-fA-F]{24}$/.test(meetingId)) {
      meeting = await Meeting.findById(meetingId);
    }

    if (!meeting) {
      console.log("❌ Meeting not found:", meetingId);
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Get transcripts using the meeting's meetingId field
    const transcripts = await Transcript.find({
      meetingId: meeting.meetingId,
    }).sort({ timestamp: 1 });

    if (!transcripts || transcripts.length === 0) {
      return res
        .status(400)
        .json({ error: "No transcripts found for this meeting" });
    }

    const transcriptText = transcripts
      .map((t) => t.segments.map((s) => s.text).join(" "))
      .join(" ");

    const participants = meeting.participants.map((p) => p.name || "Unknown");

    console.log("📝 Generating new summary with custom prompt...");

    // Generate with custom prompt
    const summaryData = await regenerateSummary(
      transcriptText,
      participants,
      customPrompt || "Provide a detailed meeting summary",
    );

    meeting.summary = {
      text: summaryData.executiveSummary,
      generatedAt: summaryData.generatedAt,
      model: summaryData.model,
      keyPoints: summaryData.keyPoints || [],
      decisions: summaryData.decisions || [],
      actionItems: summaryData.actionItems || [],
      topics: summaryData.topics || [],
      sentiment: summaryData.sentiment || "neutral",
      nextSteps: summaryData.nextSteps || [],
      customPrompt: customPrompt,
    };

    await meeting.save();

    console.log("✅ Summary regenerated successfully");

    res.json({
      success: true,
      summary: meeting.summary,
    });
  } catch (error) {
    console.error("❌ Error regenerating summary:", error);
    res.status(500).json({
      error: "Failed to regenerate summary",
      message: error.message,
    });
  }
});

// Delete summary
app.delete("/api/meetings/:meetingId/summary", async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    meeting.summary = undefined;
    await meeting.save();

    res.json({
      success: true,
      message: "Summary deleted",
    });
  } catch (error) {
    console.error("❌ Error deleting summary:", error);
    res.status(500).json({ error: "Failed to delete summary" });
  }
});

// Update action item status
app.patch(
  "/api/meetings/:meetingId/summary/action-items/:itemIndex",
  async (req, res) => {
    try {
      const { meetingId, itemIndex } = req.params;
      const { status, assignee, dueDate, priority } = req.body;

      const meeting = await Meeting.findOne({ meetingId });
      if (!meeting || !meeting.summary || !meeting.summary.actionItems) {
        return res.status(404).json({ error: "Action items not found" });
      }

      const actionItem = meeting.summary.actionItems[itemIndex];
      if (!actionItem) {
        return res.status(404).json({ error: "Action item not found" });
      }

      // Update fields
      if (status) actionItem.status = status;
      if (assignee) actionItem.assignee = assignee;
      if (dueDate) actionItem.dueDate = dueDate;
      if (priority) actionItem.priority = priority;

      await meeting.save();

      res.json({
        success: true,
        actionItem,
      });
    } catch (error) {
      console.error("❌ Error updating action item:", error);
      res.status(500).json({ error: "Failed to update action item" });
    }
  },
);

// Analytics routes
app.use("/api/analytics", analyticsRoutes);
console.log("✅ Analytics routes loaded");

// Action Items routes
app.use("/api/action-items", actionItemsRoutes);

// Search routes
app.use("/api/search", searchRoutes);

// Export routes
app.use("/api/export", exportRoutes);

// Diarization routes
app.use("/api/diarization", require("./routes/diarization"));

const translateRoutes = require("./routes/translate");
app.use("/api/translate", translateRoutes);

// Assistant routes
app.use("/api/assistant", assistantRoutes);

// Task routes
const taskRoutes = require("./routes/tasks");
app.use("/api/tasks", taskRoutes);

// Suggestions routes
const suggestionsRoutes = require("./routes/suggestions");
app.use("/api/suggestions", suggestionsRoutes);
console.log("✅ Suggestions routes loaded");

// Google Auth, Gmail, Drive routes
app.use("/api/auth", googleAuthRoutes);
app.use("/api/gmail", gmailRoutes);
app.use("/api/drive", driveRoutes);

// =====================
// SOCKET.IO HANDLERS
// =====================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-meeting", async ({ meetingId, userId, userName }) => {
    try {
      socket.join(meetingId);
      socket.data.meetingId = meetingId;
      socket.data.userId = userId;
      socket.data.userName = userName || userId;

      console.log(`✅ User ${userName || userId} joined meeting ${meetingId}`);

      // Find or create meeting in DB
      let meeting = await Meeting.findOne({ meetingId });

      if (!meeting) {
        meeting = new Meeting({
          meetingId,
          title: `Meeting ${meetingId}`,
          host: { userId, name: userName || userId },
          participants: [
            {
              userId,
              name: userName || userId,
              role: "host",
              joinedAt: new Date(),
            },
          ],
          status: "in-progress",
          startedAt: new Date(),
        });
        await meeting.save();
        console.log(`📝 Created new meeting: ${meetingId}`);
      } else {
        // ✅ Only add if not already host or participant
        const isHost = meeting.host?.userId === userId;
        const alreadyIn = meeting.participants.some((p) => p.userId === userId);
        if (!isHost && !alreadyIn) {
          await meeting.addParticipant(userId, userName || userId);
        }
      }

      socket.emit("joined-meeting", {
        meetingId,
        userId,
        meeting: meeting,
      });

      // Notify others in the room
      socket.to(meetingId).emit("participant-joined", {
        userId,
        userName: userName || userId,
        joinedAt: new Date(),
      });
    } catch (err) {
      console.error("join-meeting error:", err);
      socket.emit("server-error", { message: "Failed to join meeting" });
    }
  });

  socket.on("audio-chunk", async (data) => {
    try {
      const { meetingId, userId, seq, base64, mime, timestamp } = data;

      if (!meetingId || !userId || base64 === undefined) {
        socket.emit("server-error", { message: "Missing chunk data" });
        return;
      }

      const dir = await ensureUserFolder(meetingId, userId);

      const ext = mime?.includes("wav")
        ? "wav"
        : mime?.includes("ogg")
          ? "ogg"
          : "webm";
      const filename = `${String(seq).padStart(6, "0")}.${ext}`;
      const filepath = path.join(dir, filename);

      await fs.writeFile(filepath, Buffer.from(base64, "base64"));

      await fs.writeJson(
        filepath + ".json",
        {
          meetingId,
          userId,
          seq,
          mime,
          timestamp,
          savedAt: Date.now(),
        },
        { spaces: 2 },
      );

      const stats = await fs.stat(filepath);
      console.log(`💾 Chunk ${seq}: ${filename} (${stats.size} bytes)`);

      socket.emit("chunk-saved", { seq, filename, size: stats.size });
    } catch (err) {
      console.error("❌ Chunk save error:", err);
      socket.emit("server-error", { message: "chunk save failed" });
    }
  });

  socket.on("recording-stopped", async ({ meetingId, userId }) => {
    const key = makeKey(meetingId, userId);

    console.log(`🛑 Recording stopped: ${userId} in meeting ${meetingId}`);

    if (runningConcat.has(key)) {
      socket.emit("concat-already-running");
      return;
    }

    runningConcat.set(key, true);

    try {
      const userName = socket.data.userName || userId;

      // Wait for final chunks
      console.log("⏳ Waiting for final chunks...");
      socket.emit("processing-log", { msg: "Waiting for final chunks..." });
      await new Promise((r) => setTimeout(r, 2000));

      const userDir = path.join(__dirname, "uploads", meetingId, userId);
      const badDir = path.join(userDir, "bad_chunks");
      await fs.ensureDir(badDir);

      console.log("🔍 Validating chunks...");
      socket.emit("processing-log", { msg: "Validating chunks..." });

      const files = await fs.readdir(userDir);
      const wavFiles = files.filter((f) => /^\d{6}\.wav$/.test(f));
      const webmFiles = files.filter((f) => /^\d{6}\.webm$/.test(f));

      console.log(
        `Found ${wavFiles.length} WAV, ${webmFiles.length} WebM chunks`,
      );

      // Validate WAV (size check)
      let validWav = 0;
      for (const f of wavFiles) {
        const full = path.join(userDir, f);
        const st = await fs.stat(full);

        if (st.size < 100) {
          console.warn(`❌ Bad WAV: ${f} (${st.size}b)`);
          await fs.move(full, path.join(badDir, f), { overwrite: true });
          const jsonFile = full + ".json";
          if (await fs.pathExists(jsonFile)) {
            await fs.move(jsonFile, path.join(badDir, f + ".json"), {
              overwrite: true,
            });
          }
        } else {
          validWav++;
          console.log(`✅ WAV OK: ${f} (${st.size}b)`);
        }
      }

      // Validate WebM (duration check)
      let validWebm = 0;
      for (const f of webmFiles) {
        const full = path.join(userDir, f);
        const dur = await probeDuration(full);

        if (!dur || dur < 0.03) {
          console.warn(`❌ Bad WebM: ${f} (dur=${dur})`);
          await fs.move(full, path.join(badDir, f), { overwrite: true });
          const jsonFile = full + ".json";
          if (await fs.pathExists(jsonFile)) {
            await fs.move(jsonFile, path.join(badDir, f + ".json"), {
              overwrite: true,
            });
          }
        } else {
          validWebm++;
          console.log(`✅ WebM OK: ${f} (${dur}s)`);
        }
      }

      console.log(`✅ Validation complete: ${validWav} WAV, ${validWebm} WebM`);
      socket.emit("processing-log", {
        msg: `${validWav + validWebm} valid chunks`,
      });

      if (validWav === 0 && validWebm === 0) {
        socket.emit("server-error", {
          message: "No valid chunks. Check microphone.",
        });
        return;
      }

      // Run concatenation
      socket.emit("concat-start", { chunks: validWav + validWebm });
      console.log("🔗 Starting concat...");

      await runConcatScript(meetingId, userId);

      // Find combined file
      const combinedPath = await findCombinedAudio(userDir);

      if (!combinedPath) {
        socket.emit("server-error", {
          message: "Combined audio not found",
        });
        return;
      }

      const combinedFilename = path.basename(combinedPath);
      const audioUrl = `/uploads/${meetingId}/${userId}/${combinedFilename}`;

      socket.emit("concat-complete", {
        audio: audioUrl,
        path: combinedPath,
      });

      console.log(`✅ Concat done: ${combinedFilename}`);

      // Update meeting in DB with audio path
      const meeting = await Meeting.findOne({ meetingId });
      if (meeting) {
        const participant = meeting.participants.find(
          (p) => p.userId === userId,
        );
        if (participant) {
          participant.audioPath = audioUrl;
        }
        await meeting.save();
      }

      // Create transcript record with initial status
      let transcript = new Transcript({
        meetingId,
        userId,
        userName,
        audioPath: combinedPath,
        transcriptFilePath: path.join(userDir, "transcript.json"),
        processingStatus: "processing",
        duration: 0, // Initialize with 0
        segments: [], // Initialize with empty array
      });
      await transcript.save();
      console.log(`📝 Created transcript record: ${transcript._id}`);

      // Start transcription
      const pythonExe =
        process.env.PYTHON_PATH ||
        path.join(__dirname, "venv", "Scripts", "python.exe");
      const transcribeScript = path.join(__dirname, "transcribe.py");
      const pythonToUse = (await fs.pathExists(pythonExe))
        ? pythonExe
        : "python";

      console.log("🎤 Starting transcription...");
      socket.emit("transcription-start", { file: combinedPath });

      const tproc = spawn(
        pythonToUse,
        [transcribeScript, combinedPath, "auto"],
        {
          cwd: __dirname,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      let tOut = "";
      let tErr = "";

      tproc.stdout.on("data", (d) => {
        const txt = d.toString();
        tOut += txt;
        console.log("[transcribe]", txt.trim());
        socket.emit("transcription-log", { msg: txt.trim() });
      });

      tproc.stderr.on("data", (d) => {
        const txt = d.toString();
        tErr += txt;
        console.error("[transcribe]", txt.trim());
      });

      tproc.on("close", async (code) => {
        console.log(`Transcription exit code: ${code}`);

        const transcriptFile = path.join(userDir, "transcript.json");

        if (code !== 0) {
          console.error("❌ Transcription failed");

          // Update transcript record to failed
          transcript.processingStatus = "failed";
          transcript.processingError =
            tErr.slice(-500) || "Transcription process failed";
          await transcript.save();

          socket.emit("server-error", {
            message: "Transcription failed",
            detail: tErr.slice(-500),
          });
          return;
        }

        // Check if transcript file exists
        if (!(await fs.pathExists(transcriptFile))) {
          console.error("❌ Transcript file not created");

          transcript.processingStatus = "failed";
          transcript.processingError = "Transcript file not created";
          await transcript.save();

          socket.emit("server-error", {
            message: "Transcript file not created",
          });
          return;
        }

        try {
          // Load transcript data from file
          const transcriptData = await fs.readJson(transcriptFile);

          console.log("📄 Transcript data loaded:", {
            duration: transcriptData.duration,
            segments: transcriptData.transcript?.length || 0,
            language: transcriptData.language,
          });

          // Validate required fields
          if (
            transcriptData.duration === undefined ||
            transcriptData.duration === null
          ) {
            throw new Error("Duration field missing from transcript");
          }

          if (
            !transcriptData.transcript ||
            !Array.isArray(transcriptData.transcript)
          ) {
            throw new Error("Transcript segments missing or invalid");
          }

          // Update transcript in database
          transcript.duration = parseFloat(transcriptData.duration) || 0;
          transcript.segments = (transcriptData.transcript || []).map(
            (seg) => ({
              ...seg,
              speaker:
                seg.speaker && seg.speaker !== "Unknown"
                  ? seg.speaker
                  : userName,
            }),
          );
          transcript.language = transcriptData.language || "en";
          transcript.fullText = transcript.segments
            .map((s) => s.text)
            .join(" ");

          // Calculate stats
          transcript.stats = {
            totalWords: transcript.fullText
              .split(/\s+/)
              .filter((w) => w.length > 0).length,
            speakingDuration: transcript.segments.reduce(
              (sum, s) => sum + (s.end - s.start),
              0,
            ),
            averageConfidence:
              transcript.segments.reduce(
                (sum, s) => sum + (s.confidence || 0),
                0,
              ) / (transcript.segments.length || 1),
          };

          transcript.processingStatus = "completed";
          await transcript.save();

          // ✅ NEW: Automatically analyze sentiment after transcription
          console.log("🎭 Starting automatic sentiment analysis...");
          try {
            const {
              analyzeSentimentOnly,
            } = require("./services/summaryService");
            const sentimentResult = await analyzeSentimentOnly(
              transcript.fullText,
            );

            // Update meeting with auto-sentiment
            const sentimentMeeting = await Meeting.findOne({ meetingId });
            if (sentimentMeeting) {
              sentimentMeeting.autoSentiment = sentimentResult;
              await sentimentMeeting.save();
              console.log(
                `✅ Auto-sentiment saved: ${sentimentResult.sentiment}`,
              );
            }
          } catch (sentimentError) {
            console.warn(
              "⚠️ Failed to analyze sentiment, continuing anyway:",
              sentimentError.message,
            );
            // Don't fail the whole process if sentiment analysis fails
          }

          console.log("✅ Transcript saved to database:", {
            id: transcript._id,
            duration: transcript.duration,
            segments: transcript.segments.length,
            words: transcript.stats.totalWords,
          });

          // Update meeting participant with transcript path
          const updatedMeeting = await Meeting.findOne({ meetingId });
          if (updatedMeeting) {
            const participant = updatedMeeting.participants.find(
              (p) => p.userId === userId,
            );
            if (participant) {
              participant.transcriptPath = `/uploads/${meetingId}/${userId}/transcript.json`;
            }

            // Update meeting status to completed if it was in-progress
            if (updatedMeeting.status === "in-progress") {
              updatedMeeting.status = "completed";
              updatedMeeting.endedAt = new Date();
              if (updatedMeeting.startedAt) {
                updatedMeeting.duration = Math.floor(
                  (updatedMeeting.endedAt - updatedMeeting.startedAt) / 1000,
                );
              }
            }

            await updatedMeeting.save();
            console.log("✅ Meeting updated to completed status");
          }

          console.log("✅ Transcription complete!");
          console.log(`   Duration: ${transcriptData.duration}s`);
          console.log(`   Segments: ${transcriptData.transcript?.length || 0}`);
          console.log(`   Words: ${transcript.stats.totalWords}`);

          socket.emit("transcription-complete", {
            transcript: transcriptData.transcript || [],
            duration: transcriptData.duration,
            file: `/uploads/${meetingId}/${userId}/transcript.json`,
            transcriptId: transcript._id,
            stats: transcript.stats,
          });
        } catch (parseError) {
          console.error("❌ Error parsing transcript file:", parseError);

          transcript.processingStatus = "failed";
          transcript.processingError = `Failed to parse transcript: ${parseError.message}`;
          await transcript.save();

          socket.emit("server-error", {
            message: "Failed to process transcript",
            detail: parseError.message,
          });
        }
      });
    } catch (err) {
      console.error("❌ recording-stopped error:", err);
      socket.emit("server-error", { message: err.message });
    } finally {
      runningConcat.delete(key);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    handleUserLeave(socket);
  });

  // ============================================
  // WEBRTC SIGNALING EVENTS
  // ============================================

  // Join meeting room (WebRTC)
  socket.on(
    "webrtc-join-meeting",
    async ({ meetingId, userId, userName, isAudioEnabled, isVideoEnabled }) => {
      console.log(`📹 ${userName} joining meeting ${meetingId} for WebRTC`);

      // Join socket room
      socket.join(meetingId);

      // Initialize room if doesn't exist
      if (!meetingRooms.has(meetingId)) {
        meetingRooms.set(meetingId, new Set());
      }

      // Store user info
      socketToUser.set(socket.id, {
        userId,
        userName,
        meetingId,
        isAudioEnabled,
        isVideoEnabled,
      });
      meetingRooms.get(meetingId).add(socket.id);

      // ✅ Update meeting status to in-progress
      try {
        let meeting = await Meeting.findOne({ meetingId });

        // Try by _id if meetingId doesn't work
        if (!meeting && /^[0-9a-fA-F]{24}$/.test(meetingId)) {
          meeting = await Meeting.findById(meetingId);
        }

        if (meeting) {
          // Only update if currently scheduled
          if (meeting.status === "scheduled") {
            meeting.status = "in-progress";
            meeting.startedAt = new Date();
            await meeting.save();
            console.log(
              `✅ Meeting ${meetingId} status updated to in-progress`,
            );
          }

          const isHost = meeting.host?.userId === userId;
          const alreadyIn = meeting.participants.some(
            (p) => p.userId === userId,
          );
          if (!isHost && !alreadyIn) {
            await meeting.addParticipant(userId, userName);
          }
        }
      } catch (err) {
        console.error("Error updating meeting status:", err);
      }

      // Get all existing participants in the room
      const existingParticipants = Array.from(meetingRooms.get(meetingId))
        .filter((id) => id !== socket.id)
        .map((id) => {
          const user = socketToUser.get(id);
          return {
            socketId: id,
            userId: user.userId,
            userName: user.userName,
            isAudioEnabled: user.isAudioEnabled,
            isVideoEnabled: user.isVideoEnabled,
          };
        });

      // Send existing participants to new user
      socket.emit("existing-participants", existingParticipants);

      // Notify others about new participant
      socket.to(meetingId).emit("user-joined", {
        socketId: socket.id,
        userId,
        userName,
        isAudioEnabled,
        isVideoEnabled,
      });

      console.log(
        `✅ ${userName} joined WebRTC. Room size: ${meetingRooms.get(meetingId).size}`,
      );
    },
  );

  // WebRTC offer
  socket.on("offer", ({ to, offer }) => {
    const from = socketToUser.get(socket.id);
    console.log(`📤 Offer from ${from?.userName} to ${to}`);

    socket.to(to).emit("offer", {
      from: socket.id,
      offer,
    });
  });

  // WebRTC answer
  socket.on("answer", ({ to, answer }) => {
    const from = socketToUser.get(socket.id);
    console.log(`📥 Answer from ${from?.userName} to ${to}`);

    socket.to(to).emit("answer", {
      from: socket.id,
      answer,
    });
  });

  // ICE candidate
  socket.on("ice-candidate", ({ to, candidate }) => {
    socket.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  // Media state changes (mute/unmute, camera on/off)
  socket.on("media-state-change", ({ isAudioEnabled, isVideoEnabled }) => {
    const user = socketToUser.get(socket.id);
    if (user) {
      user.isAudioEnabled = isAudioEnabled;
      user.isVideoEnabled = isVideoEnabled;

      // Broadcast to others in the room
      socket.to(user.meetingId).emit("user-media-state-changed", {
        socketId: socket.id,
        isAudioEnabled,
        isVideoEnabled,
      });

      console.log(
        `🎙️ ${user.userName} - Audio: ${isAudioEnabled}, Video: ${isVideoEnabled}`,
      );
    }
  });

  // Chat message
  socket.on("chat-message", ({ meetingId, message, userName }) => {
    const timestamp = new Date().toISOString();

    // Broadcast to all in room including sender
    io.to(meetingId).emit("chat-message", {
      id: `${socket.id}-${Date.now()}`,
      userName,
      message,
      timestamp,
      socketId: socket.id,
    });

    console.log(`💬 ${userName}: ${message}`);
  });

  // Screen sharing started
  socket.on("start-screen-share", ({ meetingId }) => {
    const user = socketToUser.get(socket.id);
    if (user) {
      socket.to(meetingId).emit("user-started-screen-share", {
        socketId: socket.id,
        userName: user.userName,
      });
      console.log(`🖥️ ${user.userName} started screen sharing`);
    }
  });

  // Screen sharing stopped
  socket.on("stop-screen-share", ({ meetingId }) => {
    const user = socketToUser.get(socket.id);
    if (user) {
      socket.to(meetingId).emit("user-stopped-screen-share", {
        socketId: socket.id,
      });
      console.log(`🖥️ ${user.userName} stopped screen sharing`);
    }
  });

  // ============================================
  // LIVE TRANSCRIPTION HANDLER
  // ============================================

  // ✅ WHISPER LIVE HANDLER (original - kept for compatibility)
  socket.on(
    "live-transcription-chunk",
    async ({ meetingId, audioChunk, chunkIndex }) => {
      try {
        console.log(
          `🎙️ Live chunk ${chunkIndex} for ${meetingId} (${audioChunk.length} bytes base64)`,
        );

        // Create temp directory for live chunks
        const liveDir = path.join(__dirname, "uploads", meetingId, "live");
        await fs.ensureDir(liveDir);

        // Save temporary chunk
        const tempChunkPath = path.join(liveDir, `live_${chunkIndex}.wav`);

        // Convert base64 to buffer and save
        const audioBuffer = Buffer.from(audioChunk, "base64");
        await fs.writeFile(tempChunkPath, audioBuffer);

        console.log(
          `💾 Chunk saved: ${tempChunkPath} (${audioBuffer.length} bytes)`,
        );

        // ✅ START PERSISTENT PROCESS if not running
        if (
          !persistentTranscriptionProcess ||
          persistentTranscriptionProcess.killed
        ) {
          console.log("🚀 Starting persistent transcription service...");

          const pythonExe =
            process.env.PYTHON_PATH ||
            path.join(__dirname, "venv", "Scripts", "python.exe");
          // ✅ Use faster-whisper for real-time transcription
          const streamingScript = path.join(
            __dirname,
            "transcribe-live-realtime.py",
          );
          const pythonToUse = (await fs.pathExists(pythonExe))
            ? pythonExe
            : "python";

          persistentTranscriptionProcess = spawn(
            pythonToUse,
            ["-u", streamingScript],
            {
              cwd: __dirname,
              stdio: ["pipe", "pipe", "pipe"],
            },
          );

          let currentBuffer = "";

          persistentTranscriptionProcess.stdout.on("data", (data) => {
            const text = data.toString();
            console.log("[realtime-raw]", text.substring(0, 100)); // Debug first 100 chars
            currentBuffer += text;

            // Check for complete JSON results
            const lines = currentBuffer.split("\n");
            currentBuffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              // Check for completion marker
              if (trimmed === "---CHUNK_COMPLETE---") {
                continue;
              }

              // Skip non-JSON lines (model loading messages)
              if (!trimmed.startsWith("{")) {
                console.log(`[realtime] ${trimmed}`);
                continue;
              }

              // Parse JSON result
              try {
                const result = JSON.parse(trimmed);

                // Find the pending transcription request
                for (const [
                  pendingChunkId,
                  pendingData,
                ] of transcriptionQueue.entries()) {
                  if (!pendingData.resolved) {
                    pendingData.resolved = true;
                    pendingData.resolve(result);
                    transcriptionQueue.delete(pendingChunkId);
                    break;
                  }
                }
              } catch (parseErr) {
                console.error(
                  "[streaming] JSON parse error:",
                  parseErr,
                  "Line:",
                  trimmed.substring(0, 100),
                );
              }
            }
          });

          persistentTranscriptionProcess.stderr.on("data", (data) => {
            const errText = data.toString().trim();
            if (!errText.includes("[realtime]")) {
              console.error(`[realtime-err] ${errText}`);
            }
          });

          persistentTranscriptionProcess.on("close", (code) => {
            console.log(`[realtime] Process exited with code ${code}`);
            if (code !== 0) {
              console.error(
                "[realtime] Process crashed! Will restart on next chunk.",
              );
            }
            persistentTranscriptionProcess = null;
            transcriptionQueue.clear(); // Clear pending requests
          });

          // Wait for Whisper model to load (takes longer than Vosk)
          await new Promise((resolve) => setTimeout(resolve, 8000));
          console.log(
            "✅ Faster-Whisper TINY ready for real-time transcription!",
          );
        }

        // ✅ SEND CHUNK TO PERSISTENT PROCESS (instant transcription!)
        const startTime = Date.now();
        const pendingChunkId = transcriptionChunkCounter++;

        const transcriptionPromise = new Promise((resolve, reject) => {
          transcriptionQueue.set(pendingChunkId, {
            resolve,
            reject,
            resolved: false,
          });

          // Timeout after 5 seconds
          setTimeout(() => {
            if (transcriptionQueue.has(pendingChunkId)) {
              const pending = transcriptionQueue.get(pendingChunkId);
              if (!pending.resolved) {
                pending.resolved = true;
                transcriptionQueue.delete(pendingChunkId);
                reject(new Error("Transcription timeout"));
              }
            }
          }, 5000);
        });

        // Send file path to persistent process
        persistentTranscriptionProcess.stdin.write(tempChunkPath + "\n");

        try {
          const result = await transcriptionPromise;
          const elapsed = Date.now() - startTime;

          if (result.error) {
            console.error(`❌ Transcription error:`, result.error);
            return;
          }

          // ✅ EMIT WORD-BY-WORD for YouTube-style subtitles
          if (result.words && result.words.length > 0) {
            // Emit individual words for smooth animation
            io.to(meetingId).emit("live-transcript-words", {
              chunkIndex,
              words: result.words,
              text: result.text,
              timestamp: Date.now(),
              transcriptionTime: result.transcription_time,
              speaker: socket.data.userName || "Unknown",
            });

            console.log(
              `✅ Chunk ${chunkIndex}: "${result.text}" (${result.words.length} words, ${elapsed}ms)`,
            );
          } else if (result.text && result.text.trim()) {
            // Fallback: emit full text if no word timestamps
            io.to(meetingId).emit("live-transcript-segment", {
              chunkIndex,
              text: result.text,
              segments: result.segments || [],
              timestamp: Date.now(),
              speaker: socket.data.userName || "Unknown",
            });

            console.log(
              `✅ Chunk ${chunkIndex}: "${result.text.substring(0, 50)}..." (${elapsed}ms)`,
            );
          } else {
            // Check if it's actually silence or an error
            if (result.is_silence) {
              console.log(`⚪ Chunk ${chunkIndex}: silence detected`);
            } else {
              console.log(`⚪ Chunk ${chunkIndex}: no speech (possibly noise)`);
            }
          }

          // Clean up temp file
          setTimeout(() => fs.remove(tempChunkPath).catch(() => {}), 3000);
        } catch (err) {
          console.error(`❌ Chunk ${chunkIndex} failed:`, err.message);
        }
      } catch (err) {
        console.error("❌ Live transcription error:", err);
        socket.emit("live-transcript-error", {
          message: err.message,
        });
      }
    },
  );

  // ============================================
  // VOSK LIVE TRANSCRIPTION HANDLER (NEW)
  // ============================================
  let lastFinalText = ""; // Track previously committed text to prevent duplication

  socket.on(
    "live-transcription-vosk",
    async ({ meetingId, audioChunk, chunkIndex }) => {
      try {
        if (!meetingId || !audioChunk) return;

        // Start VOSK process if not running
        if (!voskProcess || voskProcess.killed) {
          console.log("🎙️ Starting VOSK live transcription service...");

          const pythonExe =
            process.env.PYTHON_PATH ||
            path.join(__dirname, "venv", "Scripts", "python.exe") ||
            "python";

          const voskScript = path.join(__dirname, "vosk-live.py");

          voskProcess = spawn(pythonExe, ["-u", voskScript], {
            cwd: __dirname,
            stdio: ["pipe", "pipe", "pipe"],
          });

          voskReady = false;

          voskProcess.stdout.on("data", (data) => {
            const lines = data.toString().split("\n");

            for (const line of lines) {
              const txt = line.trim();
              if (!txt) continue;

              // Ready signal
              if (txt === "__VOSK_READY__") {
                voskReady = true;
                console.log("✅ VOSK is ready");
                continue;
              }

              // JSON transcript
              if (txt.startsWith("{")) {
                try {
                  const result = JSON.parse(txt);

                  if (result.type === "partial") {
                    // Emit typing preview
                    io.to(meetingId).emit("live-transcript-word", {
                      type: "partial",
                      text: result.text,
                    });
                    console.log(`📝 VOSK (partial): "${result.text}"`);
                  }

                  if (result.type === "final") {
                    // 🔥 Extract ONLY new words (prevent duplication)
                    const newText = result.text
                      .replace(lastFinalText, "")
                      .trim();
                    lastFinalText = result.text;

                    if (newText) {
                      const newWords = newText.split(" ").map((word) => ({
                        word: word,
                        conf:
                          result.words && result.words.length > 0
                            ? result.words[0].conf
                            : 0.9,
                      }));

                      io.to(meetingId).emit("live-transcript-word", {
                        type: "final",
                        words: newWords,
                        text: newText,
                      });

                      console.log(`📝 VOSK (final - new): "${newText}"`);
                    }
                  }
                } catch (err) {
                  console.error("❌ VOSK JSON parse error:", err.message);
                }
              }
            }
          });

          voskProcess.stderr.on("data", (data) => {
            console.error("[VOSK]", data.toString().trim());
          });

          voskProcess.on("close", (code) => {
            console.warn(`⚠️ VOSK exited with code ${code}`);
            voskProcess = null;
            voskReady = false;
          });
        }

        // Wait until model is ready
        if (!voskReady) return;

        // Send raw WAV bytes (base64 decoded)
        const audioBuffer = Buffer.from(audioChunk, "base64");
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeUInt32LE(audioBuffer.length, 0);

        // Send framed message
        voskProcess.stdin.write(lengthBuffer);
        voskProcess.stdin.write(audioBuffer);
      } catch (err) {
        console.error("❌ VOSK live handler error:", err.message);
      }
    },
  );

  // ============================================
  // WEB SPEECH API — SAVE LIVE SEGMENTS
  // ============================================
  // The frontend uses the browser's Web Speech API for live transcription.
  // Final transcript segments are sent here for DB persistence and Ollama translation.
  socket.on(
    "save-live-segment",
    async ({
      meetingId,
      text,
      language,
      userName: segUserName,
      timestamp,
      translateTarget,
    }) => {
      if (!text || !text.trim()) return;
      const trimmedText = text.trim();
      console.log(
        `💾 Live segment [${language}]: "${trimmedText.substring(0, 60)}"`,
      );

      try {
        const incomingLangBase = (language || "en").split("-")[0].toLowerCase();
        const safeIncomingLang = incomingLangBase; // ✅ store actual language, not forced "en"

        // Find or create a live transcript document for this meeting+user
        let doc = await Transcript.findOne({
          meetingId,
          userName: segUserName || "Unknown",
          processingStatus: "live",
        });

        if (!doc) {
          doc = new Transcript({
            meetingId,
            segments: [],
            fullText: "",
            language: "none",
            spokenLanguage: incomingLangBase,
            processingStatus: "live",
            duration: 0,
            userName: segUserName || "Unknown",
          });
        }

        // spokenLanguage stores the actual spoken language (mr, hi, en, etc.)
        // language must be "none" or a MongoDB-supported language — using "none"
        // disables stemming so Devanagari text indexes correctly.
        doc.language = "none";
        doc.spokenLanguage = incomingLangBase;

        const segStart = doc.duration || 0;
        // Use actual timestamp to estimate real speaking duration
        const segDuration = Math.max(
          3,
          Math.ceil(trimmedText.split(/\s+/).length / 3),
        );
        doc.segments.push({
          start: segStart,
          end: segStart + segDuration,
          text: trimmedText,
          speaker: segUserName || "Unknown",
          confidence: 0.95,
        });
        doc.fullText = doc.segments.map((s) => s.text).join(" ");
        doc.duration = segStart + segDuration;
        // ✅ FIX: Mongoose won't detect subdocument array mutations without this
        doc.markModified("segments");
        await doc.save();
        console.log(`✅ Live segment saved (${doc.segments.length} total)`);
      } catch (err) {
        console.error("❌ Failed to save live segment:", err);
      }

      // ── Gemini translation (if spoken language ≠ target) ─────────────────────
      const langBase = (language || "en").split("-")[0].toLowerCase();
      const target = (translateTarget || language || "en")
        .split("-")[0]
        .toLowerCase();

      if (!langBase || langBase === target) {
        console.log(`⏭️ No translation needed (${langBase} = ${target})`);
      } else {
        try {
          const LANG_NAMES = {
            en: "English",
            hi: "Hindi",
            mr: "Marathi",
            ta: "Tamil",
            te: "Telugu",
            bn: "Bengali",
            gu: "Gujarati",
            kn: "Kannada",
            ml: "Malayalam",
            pa: "Punjabi",
            ur: "Urdu",
            or: "Odia",
            as: "Assamese",
            fr: "French",
            de: "German",
            es: "Spanish",
          };
          const targetName = LANG_NAMES[target] || target;
          const sourceName = LANG_NAMES[langBase] || langBase;

          const Groq = require("groq-sdk");
          const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

          const translationResult = await groqClient.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "user",
                content: `You are a translator. Translate the following ${sourceName} text into ${targetName}.\nRules:\n- Output ONLY the translated text.\n- Do NOT include explanations, labels, or the original text.\n- Keep proper nouns, names, and numbers unchanged.\n- Use natural, fluent ${targetName}.\n\nText:\n${trimmedText}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 500,
          });

          const translated = (
            translationResult.choices[0]?.message?.content || ""
          )
            .trim()
            .replace(/^["']|["']$/g, "")
            .replace(/^(Translation|Here is|Here's|Output):?\s*/i, "");

          if (translated && translated !== trimmedText) {
            console.log(
              `🌐 Translated [${langBase}→${target}]: "${translated.substring(0, 60)}"`,
            );
            socket.emit("live-transcript-translation", {
              originalText: trimmedText,
              translatedText: translated,
            });
          }
        } catch (err) {
          console.error("❌ Translation error:", err.message);
        }
      }
    },
  );

  // ============================================
  // ASSEMBLYAI LIVE TRANSCRIPTION (legacy — kept for reference)
  // ============================================
  const { startAssemblyLive } = require("./services/assemblyLiveService");

  let assemblyWS = null;

  socket.on(
    "start-live-transcription",
    ({ meetingId, language, translateTarget }) => {
      console.log(
        `🎤 Starting AssemblyAI live transcription for meeting ${meetingId} | lang=${language || "auto"} | translate→${translateTarget || "en"}`,
      );

      if (assemblyWS && assemblyWS.readyState === 1) {
        console.log("🔄 Closing previous AssemblyAI connection...");
        assemblyWS.close();
      }

      const user = socketToUser.get(socket.id);
      assemblyWS = startAssemblyLive(
        socket,
        meetingId,
        user?.userName || "Unknown",
        translateTarget || "en", // target translation language
        language || "auto", // spoken language (passed to whisper-rt)
      );

      if (assemblyWS) {
        deepgramConnections.set(meetingId, assemblyWS);
      }
    },
  );

  socket.on("change-transcription-language", ({ meetingId, language }) => {
    // AssemblyAI v2 realtime doesn't support mid-session language switching,
    // so just confirm the change to the frontend
    console.log(
      `🌐 Language noted (AssemblyAI handles auto-detect): ${language}`,
    );
    socket.emit("transcription-language-changed", { language });
  });

  socket.on("deepgram-audio", (audioData) => {
    if (!assemblyWS) return;
    try {
      let buffer;
      if (audioData instanceof ArrayBuffer) {
        buffer = Buffer.from(audioData);
      } else if (Buffer.isBuffer(audioData)) {
        buffer = audioData;
      } else {
        buffer = Buffer.from(audioData);
      }

      if (buffer.length > 0) {
        // ✅ Use sendAudio which queues if not ready yet
        assemblyWS.sendAudio(buffer);
      }
    } catch (err) {
      console.error("❌ Error sending audio to AssemblyAI:", err.message);
    }
  });

  socket.on("live-audio-chunk", (pcmChunk) => {
    if (!assemblyWS || assemblyWS.readyState !== 1) return;
    try {
      assemblyWS.send(Buffer.from(pcmChunk));
    } catch (err) {
      console.error("❌ Error sending audio chunk:", err.message);
    }
  });

  socket.on("stop-live-transcription", () => {
    console.log("🛑 Stopping AssemblyAI live transcription");
    if (assemblyWS && assemblyWS.readyState === 1) {
      // ✅ v3: just close directly, no JSON termination message needed
      assemblyWS.close(1000, "Session ended by client");
      deepgramConnections.delete(socket.data?.meetingId);
      assemblyWS = null;
    }
  });

  // ============================================
  // TOGGLE LIVE TRANSCRIPTION
  // ============================================

  socket.on("toggle-live-transcription", ({ meetingId, enabled }) => {
    const user = socketToUser.get(socket.id);
    if (user) {
      console.log(
        `🎙️ ${user.userName} ${enabled ? "enabled" : "disabled"} live transcription`,
      );

      // Notify all participants
      io.to(meetingId).emit("live-transcription-status", {
        enabled,
        userName: user.userName,
      });
    }
  });

  // Leave meeting
  socket.on("leave-meeting", () => {
    handleUserLeave(socket);
  });

  // End meeting (host only)
  socket.on("end-meeting", async ({ meetingId }) => {
    console.log(`🛑 Meeting ${meetingId} ended by host`);

    try {
      // ✅ STEP 1: Check if there are audio chunks to process
      const meetingDir = path.join(__dirname, "uploads", meetingId);
      let hasAudioToProcess = false;

      if (await fs.pathExists(meetingDir)) {
        const files = await fs.readdir(meetingDir);
        const wavChunks = files.filter(
          (f) => f.startsWith("chunk_") && f.endsWith(".wav"),
        );

        // ✅ FIX: Skip processing if audio.wav already exists
        // (means /api/process-recording already handled it)
        const audioAlreadyProcessed = await fs.pathExists(
          path.join(meetingDir, "audio.wav"),
        );

        hasAudioToProcess = wavChunks.length > 0 && !audioAlreadyProcessed;

        if (audioAlreadyProcessed) {
          console.log("⏭️ Audio already processed, skipping re-processing");
        }

        if (hasAudioToProcess) {
          console.log(
            `📦 Found ${wavChunks.length} audio chunks - processing before ending...`,
          );

          // ✅ STEP 2: Trigger audio processing (same as process-recording endpoint)
          try {
            // Combine chunks
            const outputWavPath = path.join(meetingDir, "audio.wav");

            // Read first chunk (includes WAV header)
            const chunkPaths = wavChunks
              .sort((a, b) => {
                const aNum = parseInt(a.match(/\d+/)?.[0] || 0);
                const bNum = parseInt(b.match(/\d+/)?.[0] || 0);
                return aNum - bNum;
              })
              .map((c) => path.join(meetingDir, c));

            const firstChunkData = await fs.readFile(chunkPaths[0]);
            const headerSize = 44;

            let allAudioData = [firstChunkData];
            let totalDataSize = firstChunkData.length - headerSize;

            for (let i = 1; i < chunkPaths.length; i++) {
              const chunkData = await fs.readFile(chunkPaths[i]);
              const audioOnlyData = chunkData.slice(headerSize);
              allAudioData.push(audioOnlyData);
              totalDataSize += audioOnlyData.length;
            }

            const combinedBuffer = Buffer.concat(allAudioData);
            combinedBuffer.writeUInt32LE(combinedBuffer.length - 8, 4);
            combinedBuffer.writeUInt32LE(totalDataSize, 40);

            await fs.writeFile(outputWavPath, combinedBuffer);
            console.log(
              `✅ Combined ${wavChunks.length} chunks into audio.wav`,
            );

            // ✅ STEP 3: Transcription is handled exclusively by /api/process-recording.
            // The frontend calls that endpoint (fire-and-forget) before navigating away.
            // DO NOT delete live transcripts or spawn Whisper here — it causes a race
            // condition where the live doc is deleted before assemblyLiveService saves it,
            // leading to "No document found" errors.
            console.log(
              "✅ Audio combined — /api/process-recording will handle transcription",
            );

            // Cleanup chunks (audio.wav is the combined result, chunks no longer needed)
            for (const chunk of wavChunks) {
              await fs.unlink(path.join(meetingDir, chunk)).catch(() => {});
            }
          } catch (procErr) {
            console.error("❌ Audio processing error:", procErr);
          }
        }
      }

      // ✅ STEP 3.5: Promote live transcripts to completed
      const promotedCount = await Transcript.updateMany(
        { meetingId, processingStatus: "live" },
        { $set: { processingStatus: "completed" } },
      );
      if (promotedCount.modifiedCount > 0) {
        console.log(
          `✅ Promoted ${promotedCount.modifiedCount} live transcript(s) to completed on meeting end`,
        );
      }

      // ✅ STEP 4: Update meeting status
      let meeting = await Meeting.findOne({ meetingId });
      if (!meeting && /^[0-9a-fA-F]{24}$/.test(meetingId)) {
        meeting = await Meeting.findById(meetingId);
      }

      if (meeting) {
        meeting.status = "completed";
        meeting.endedAt = new Date();
        if (meeting.startedAt) {
          meeting.duration = Math.floor(
            (meeting.endedAt - meeting.startedAt) / 1000,
          );
        }
        await meeting.save();
        console.log(`✅ Meeting ${meetingId} marked as completed`);
      }

      // ✅ STEP 5: Notify all participants (AFTER processing)
      io.to(meetingId).emit("meeting-ended", {
        message: "The host has ended the meeting",
        transcriptProcessing: hasAudioToProcess,
      });

      // Force disconnect everyone
      const room = meetingRooms.get(meetingId);
      if (room) {
        room.forEach((socketId) => {
          const peerSocket = io.sockets.sockets.get(socketId);
          if (peerSocket) {
            peerSocket.leave(meetingId);
            peerSocket.emit("force-leave");
          }
        });
        meetingRooms.delete(meetingId);
      }
    } catch (err) {
      console.error("Error ending meeting:", err);
    }
  });
});

// =====================
// WEBRTC HELPER FUNCTIONS
// =====================

// Helper function to handle user leaving
function handleUserLeave(socket) {
  const user = socketToUser.get(socket.id);

  if (user) {
    const { meetingId, userName } = user;

    // Remove from room
    if (meetingRooms.has(meetingId)) {
      meetingRooms.get(meetingId).delete(socket.id);

      // Notify others
      socket.to(meetingId).emit("user-left", {
        socketId: socket.id,
        userName,
      });

      console.log(`👋 ${userName} left meeting ${meetingId}`);

      // Clean up empty rooms
      if (meetingRooms.get(meetingId).size === 0) {
        meetingRooms.delete(meetingId);
        console.log(`🗑️ Room ${meetingId} deleted (empty)`);
      }
    }

    // Clean up
    socketToUser.delete(socket.id);
    socket.leave(meetingId);
  }
}

// =====================
// REST API ENDPOINTS
// =====================

// Get all meetings
app.get("/api/meetings", async (req, res) => {
  try {
    // ── Get authenticated user from token ───────────────────────────────
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let currentUserId;
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      currentUserId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { status } = req.query;

    // ── Only return meetings where user is host OR participant ──────────
    const query = {
      $or: [
        { "host.userId": currentUserId },
        { "participants.userId": currentUserId },
      ],
    };

    if (status) query.status = status;

    const meetings = await Meeting.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (err) {
    console.error("Get meetings error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single meeting
app.get("/api/meetings/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;

    // ── Get authenticated user from token ───────────────────────────────
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let currentUserId;
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      currentUserId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("📥 Fetching meeting:", meetingId);

    let meeting = await Meeting.findOne({ meetingId });

    if (!meeting && /^[0-9a-fA-F]{24}$/.test(meetingId)) {
      meeting = await Meeting.findById(meetingId);
    }

    if (!meeting) {
      console.log("❌ Meeting not found:", meetingId);
      return res.status(404).json({ error: "Meeting not found" });
    }

    // ── Check if user is host or participant ────────────────────────────
    const isHost = meeting.host?.userId === currentUserId;
    const isMember = meeting.participants?.some(
      (p) => p.userId === currentUserId,
    );

    // Only block access on completed meetings — in-progress/scheduled
    // meetings allow entry because the user joins as participant via
    // socket AFTER this HTTP fetch (MeetingRoom flow)
    if (!isHost && !isMember && meeting.status === "completed") {
      return res
        .status(403)
        .json({ error: "You are not a participant of this meeting" });
    }

    const transcripts = await Transcript.find({
      meetingId: meeting.meetingId,
      processingStatus: { $in: ["completed", "live"] },
    });

    const formattedTranscripts = transcripts.map((t) => {
      const transcript = t.toObject();
      if (transcript.audioPath) {
        transcript.audioPath = transcript.audioPath
          .replace(/\\/g, "/")
          .replace(/^.*\/uploads/, "/uploads");
      }
      return transcript;
    });

    console.log("✅ Found meeting:", meeting.title);
    console.log("📝 Found transcripts:", formattedTranscripts.length);

    res.json({
      success: true,
      meeting,
      transcripts: formattedTranscripts,
    });
  } catch (err) {
    console.error("❌ Get meeting error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create new meeting
app.post("/api/meetings", async (req, res) => {
  try {
    const {
      meetingId,
      title,
      description,
      scheduledDate,
      scheduledTime,
      duration,
      participants,
      status,
    } = req.body;

    // ── Get the authenticated user from token ─────────────────────────────
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    let hostUserId = "default_user";
    let hostName = "Guest User";

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const User = require("./models/User");
        const user = await User.findById(decoded.userId).select("name _id");
        if (user) {
          hostUserId = user._id.toString();
          hostName = user.name;
        }
      } catch (e) {
        // Token invalid — fall back to defaults
      }
    }

    // Create new meeting
    const meeting = new Meeting({
      meetingId: meetingId || `meeting_${Date.now()}`,
      title: title || "Untitled Meeting",
      description: description || "",
      scheduledDate: scheduledDate,
      scheduledTime: scheduledTime,
      duration: duration || 60,
      // ── FIXED: use host instead of owner ─────────────────────────────────
      host: {
        userId: hostUserId,
        name: hostName,
      },
      participants: [
        ...(participants
          ? participants.map((name) => ({
              userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: name,
              role: "member",
              joinedAt: new Date(),
            }))
          : []),
      ],
      status: status || "scheduled",
      startedAt: new Date(),
      createdAt: new Date(),
    });

    await meeting.save();

    res.json({
      success: true,
      meeting,
    });
  } catch (err) {
    console.error("Create meeting error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Update meeting
app.put("/api/meetings/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const updates = req.body;

    const meeting = await Meeting.findOneAndUpdate(
      { meetingId },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json({ success: true, meeting });
  } catch (err) {
    console.error("Update meeting error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete meeting
app.delete("/api/meetings/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;

    console.log("🗑️ Deleting meeting:", meetingId);

    let meeting = await Meeting.findOne({ meetingId });

    if (!meeting && /^[0-9a-fA-F]{24}$/.test(meetingId)) {
      meeting = await Meeting.findById(meetingId);
    }

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Delete transcripts
    await Transcript.deleteMany({ meetingId: meeting.meetingId });

    // Delete files
    const meetingDir = path.join(__dirname, "uploads", meeting.meetingId);
    if (await fs.pathExists(meetingDir)) {
      await fs.remove(meetingDir);
    }

    // Delete meeting
    await Meeting.deleteOne({ _id: meeting._id });

    console.log("✅ Meeting deleted:", meeting.meetingId);
    res.json({ success: true, message: "Meeting deleted" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get transcripts for a meeting
app.get("/api/meetings/:meetingId/transcripts", async (req, res) => {
  try {
    const { meetingId } = req.params;

    const transcripts = await Transcript.find({
      meetingId,
      processingStatus: "completed",
    });

    res.json({ success: true, transcripts });
  } catch (err) {
    console.error("Get transcripts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Search transcripts
app.get("/api/transcripts/search", async (req, res) => {
  try {
    const { q, meetingId } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' required" });
    }

    const transcripts = await Transcript.searchTranscripts(q, meetingId);

    res.json({ success: true, count: transcripts.length, transcripts });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Manual transcription trigger
app.post("/api/transcribe", async (req, res) => {
  try {
    const { meetingId, userId } = req.query;

    if (!meetingId || !userId) {
      return res.status(400).json({ error: "meetingId and userId required" });
    }

    const userDir = path.join(__dirname, "uploads", meetingId, userId);
    const combinedPath = await findCombinedAudio(userDir);

    if (!combinedPath) {
      return res.status(404).json({ error: "combined audio not found" });
    }

    const pythonExe =
      process.env.PYTHON_PATH ||
      path.join(__dirname, "venv", "Scripts", "python.exe");
    const transcribeScript = path.join(__dirname, "transcribe.py");
    const pythonToUse = (await fs.pathExists(pythonExe)) ? pythonExe : "python";

    const proc = spawn(pythonToUse, [transcribeScript, combinedPath], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", async (code) => {
      if (code !== 0) {
        return res.status(500).json({
          error: "transcription failed",
          detail: stderr.slice(-500),
        });
      }

      const transcriptFile = path.join(userDir, "transcript.json");

      if (!(await fs.pathExists(transcriptFile))) {
        return res.status(500).json({ error: "transcript file missing" });
      }

      const json = await fs.readJson(transcriptFile);
      res.json({ success: true, transcript: json });
    });
  } catch (err) {
    res.status(500).json({ error: "server error", detail: err.message });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║  Smart Meeting Assistant - Backend Server           ║
  ╠══════════════════════════════════════════════════════╣
  ║  Status: ✅ RUNNING                                  ║
  ║  Port: ${PORT}                                           ║
  ║  Health: http://localhost:${PORT}/api/health          ║
  ║  Database: MongoDB Connected                         ║
  ╚══════════════════════════════════════════════════════╝
    `);
});









