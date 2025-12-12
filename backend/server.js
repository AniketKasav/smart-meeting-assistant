// backend/server.js
require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");

// Database
const connectDB = require("./config/database");
const Meeting = require("./models/Meeting");
const Transcript = require("./models/Transcript");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: Date.now(), db: 'connected' });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

function probeDuration(filePath) {
  return new Promise((resolve) => {
    const proc = spawn(ffprobePath, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
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

async function runConcatScript(meetingId, userId) {
  const scriptPath = path.join(__dirname, "concat-chunks.js");
  
  if (!(await fs.pathExists(scriptPath))) {
    throw new Error("concat-chunks.js not found");
  }

  return new Promise((resolve, reject) => {
    console.log(`Running: node ${scriptPath} ${meetingId} ${userId}`);
    
    const proc = spawn("node", [scriptPath, meetingId, userId], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
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
      proc.kill('SIGTERM');
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
          owner: { userId, name: userName || userId },
          status: 'in-progress',
          startedAt: new Date()
        });
        await meeting.save();
        console.log(`📝 Created new meeting: ${meetingId}`);
      }

      // Add participant if not exists
      await meeting.addParticipant(userId, userName || userId);
      
      socket.emit("joined-meeting", { 
        meetingId, 
        userId,
        meeting: meeting 
      });

      // Notify others in the room
      socket.to(meetingId).emit("participant-joined", {
        userId,
        userName: userName || userId,
        joinedAt: new Date()
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

      const ext = mime?.includes("wav") ? "wav" : mime?.includes("ogg") ? "ogg" : "webm";
      const filename = `${String(seq).padStart(6, "0")}.${ext}`;
      const filepath = path.join(dir, filename);

      await fs.writeFile(filepath, Buffer.from(base64, "base64"));
      
      await fs.writeJson(filepath + ".json", { 
        meetingId, 
        userId, 
        seq, 
        mime, 
        timestamp, 
        savedAt: Date.now() 
      }, { spaces: 2 });

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

      console.log(`Found ${wavFiles.length} WAV, ${webmFiles.length} WebM chunks`);

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
            await fs.move(jsonFile, path.join(badDir, f + ".json"), { overwrite: true });
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
            await fs.move(jsonFile, path.join(badDir, f + ".json"), { overwrite: true });
          }
        } else {
          validWebm++;
          console.log(`✅ WebM OK: ${f} (${dur}s)`);
        }
      }

      console.log(`✅ Validation complete: ${validWav} WAV, ${validWebm} WebM`);
      socket.emit("processing-log", { msg: `${validWav + validWebm} valid chunks` });

      if (validWav === 0 && validWebm === 0) {
        socket.emit("server-error", { 
          message: "No valid chunks. Check microphone." 
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
          message: "Combined audio not found" 
        });
        return;
      }

      const combinedFilename = path.basename(combinedPath);
      const audioUrl = `/uploads/${meetingId}/${userId}/${combinedFilename}`;
      
      socket.emit("concat-complete", { 
        audio: audioUrl,
        path: combinedPath 
      });

      console.log(`✅ Concat done: ${combinedFilename}`);

      // Update meeting in DB with audio path
      const meeting = await Meeting.findOne({ meetingId });
      if (meeting) {
        const participant = meeting.participants.find(p => p.userId === userId);
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
        processingStatus: 'processing',
        duration: 0, // Initialize with 0
        segments: [] // Initialize with empty array
      });
      await transcript.save();
      console.log(`📝 Created transcript record: ${transcript._id}`);

      // Start transcription
      const pythonExe = process.env.PYTHON_PATH || path.join(__dirname, "venv", "Scripts", "python.exe");
      const transcribeScript = path.join(__dirname, "transcribe.py");
      const pythonToUse = (await fs.pathExists(pythonExe)) ? pythonExe : "python";

      console.log("🎤 Starting transcription...");
      socket.emit("transcription-start", { file: combinedPath });

      const tproc = spawn(pythonToUse, [transcribeScript, combinedPath], {
        cwd: __dirname,
        stdio: ["ignore", "pipe", "pipe"],
      });

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
          transcript.processingStatus = 'failed';
          transcript.processingError = tErr.slice(-500) || 'Transcription process failed';
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
          
          transcript.processingStatus = 'failed';
          transcript.processingError = 'Transcript file not created';
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
            language: transcriptData.language
          });

          // Validate required fields
          if (transcriptData.duration === undefined || transcriptData.duration === null) {
            throw new Error("Duration field missing from transcript");
          }

          if (!transcriptData.transcript || !Array.isArray(transcriptData.transcript)) {
            throw new Error("Transcript segments missing or invalid");
          }

          // Update transcript in database
          transcript.duration = parseFloat(transcriptData.duration) || 0;
          transcript.segments = transcriptData.transcript || [];
          transcript.language = transcriptData.language || 'en';
          transcript.fullText = transcript.segments.map(s => s.text).join(' ');
          
          // Calculate stats
          transcript.stats = {
            totalWords: transcript.fullText.split(/\s+/).filter(w => w.length > 0).length,
            speakingDuration: transcript.segments.reduce((sum, s) => sum + (s.end - s.start), 0),
            averageConfidence: transcript.segments.reduce((sum, s) => sum + (s.confidence || 0), 0) / (transcript.segments.length || 1)
          };
          
          transcript.processingStatus = 'completed';
          await transcript.save();

          console.log("✅ Transcript saved to database:", {
            id: transcript._id,
            duration: transcript.duration,
            segments: transcript.segments.length,
            words: transcript.stats.totalWords
          });
          
          // Update meeting participant with transcript path
          const updatedMeeting = await Meeting.findOne({ meetingId });
          if (updatedMeeting) {
            const participant = updatedMeeting.participants.find(p => p.userId === userId);
            if (participant) {
              participant.transcriptPath = `/uploads/${meetingId}/${userId}/transcript.json`;
            }
            
            // Update meeting status to completed if it was in-progress
            if (updatedMeeting.status === 'in-progress') {
              updatedMeeting.status = 'completed';
              updatedMeeting.endedAt = new Date();
              if (updatedMeeting.startedAt) {
                updatedMeeting.duration = Math.floor((updatedMeeting.endedAt - updatedMeeting.startedAt) / 1000);
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
            stats: transcript.stats
          });

        } catch (parseError) {
          console.error("❌ Error parsing transcript file:", parseError);
          
          transcript.processingStatus = 'failed';
          transcript.processingError = `Failed to parse transcript: ${parseError.message}`;
          await transcript.save();
          
          socket.emit("server-error", {
            message: "Failed to process transcript",
            detail: parseError.message
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
  });
});

// =====================
// REST API ENDPOINTS
// =====================

// Get all meetings
app.get("/api/meetings", async (req, res) => {
  try {
    const { userId, status } = req.query;
    
    const query = {};
    if (userId) {
      query.$or = [
        { 'owner.userId': userId },
        { 'participants.userId': userId }
      ];
    }
    if (status) {
      query.status = status;
    }

    const meetings = await Meeting.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ 
      success: true, 
      count: meetings.length,
      meetings 
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
    
    const meeting = await Meeting.findOne({ meetingId });
    
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Get transcripts for this meeting
    const transcripts = await Transcript.find({ 
      meetingId,
      processingStatus: 'completed' 
    });

    res.json({ 
      success: true, 
      meeting,
      transcripts 
    });
  } catch (err) {
    console.error("Get meeting error:", err);
    res.status(500).json({ error: err.message });
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
      { new: true, runValidators: true }
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

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Delete transcripts
    await Transcript.deleteMany({ meetingId });

    // Delete files
    const meetingDir = path.join(__dirname, "uploads", meetingId);
    if (await fs.pathExists(meetingDir)) {
      await fs.remove(meetingDir);
    }

    // Delete meeting
    await Meeting.deleteOne({ meetingId });

    res.json({ success: true, message: "Meeting deleted" });
  } catch (err) {
    console.error("Delete meeting error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get transcripts for a meeting
app.get("/api/meetings/:meetingId/transcripts", async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const transcripts = await Transcript.find({ 
      meetingId,
      processingStatus: 'completed' 
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

    const pythonExe = process.env.PYTHON_PATH || path.join(__dirname, "venv", "Scripts", "python.exe");
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
          detail: stderr.slice(-500) 
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