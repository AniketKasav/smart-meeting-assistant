// backend/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

async function ensureUserFolder(meetingId, userId) {
  const dir = path.join(__dirname, "uploads", meetingId, userId);
  await fs.ensureDir(dir);
  return dir;
}

const runningConcat = new Map();
function makeKey(m, u) {
  return `${m}:${u}`;
}

// Update ffprobe path to your system
const ffprobePath =
  "C:/Users/anike/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.0.1-full_build/bin/ffprobe.exe";

async function probeDuration(filePath) {
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

    proc.on("error", () => resolve(null));
  });
}

function spawnWithTimeout(command, args, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 180000;

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: opts.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const finish = (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    };

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => finish(code));
    proc.on("error", (err) => reject(err));

    const timer = setTimeout(() => {
      try {
        proc.kill("SIGTERM");
      } catch {}
      reject(new Error("Process timed out"));
    }, timeoutMs);
  });
}

async function runConcat(meetingId, userId) {
  const projectRoot = path.resolve(__dirname);
  const script = path.join(projectRoot, "concat-chunks.js");

  const userDir = path.join(projectRoot, "uploads", meetingId, userId);
  const outWebm = path.join(userDir, "combined.webm");
  const outWav = path.join(userDir, "combined.wav");

  if (!(await fs.pathExists(script))) {
    throw new Error("concat-chunks.js not found");
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    console.log(`Concat attempt ${attempt}...`);

    try {
      const res = await spawnWithTimeout(
        "node",
        [script, meetingId, userId],
        { cwd: projectRoot, timeoutMs: 180000 }
      );

      if (await fs.pathExists(outWebm)) return outWebm;
      if (await fs.pathExists(outWav)) return outWav;

      throw new Error("No combined file produced");
    } catch (e) {
      console.warn("Concat failed:", e.message);
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-meeting", ({ meetingId, userId }) => {
    socket.join(meetingId);
    socket.data.meetingId = meetingId;
    socket.data.userId = userId;
    console.log(`User ${userId} joined meeting ${meetingId}`);
  });

  socket.on("audio-chunk", async (data) => {
    try {
      const { meetingId, userId, seq, base64, mime, timestamp } = data;

      const dir = await ensureUserFolder(meetingId, userId);

      // Determine extension from mime type
      const ext =
        mime?.includes("wav")
          ? "wav"
          : mime?.includes("ogg")
          ? "ogg"
          : "webm";

      const file = `${String(seq).padStart(6, "0")}.${ext}`;
      const full = path.join(dir, file);

      await fs.writeFile(full, Buffer.from(base64, "base64"));

      await fs.writeJson(full + ".json", {
        seq,
        mime,
        timestamp,
        savedAt: Date.now(),
      });

      socket.emit("chunk-saved", { seq, file });
      
      // Quick validation for WAV files
      if (ext === "wav") {
        const stats = await fs.stat(full);
        console.log(`WAV chunk ${seq}: ${stats.size} bytes`);
      }
    } catch (e) {
      console.error("Chunk save error:", e);
      socket.emit("server-error", { message: "chunk save failed" });
    }
  });

  socket.on("recording-stopped", async ({ meetingId, userId }) => {
    const key = makeKey(meetingId, userId);

    try {
      if (runningConcat.has(key)) {
        socket.emit("concat-already-running");
        return;
      }

      // Wait for final chunks to arrive
      await new Promise((r) => setTimeout(r, 2000));

      const userDir = path.join(__dirname, "uploads", meetingId, userId);
      const badDir = path.join(userDir, "bad_chunks");
      await fs.ensureDir(badDir);

      console.log("Checking chunks for corruption:", userDir);
      const files = await fs.readdir(userDir);
      
      // Separate WAV and WebM processing
      const wavFiles = files.filter(f => f.endsWith(".wav"));
      const webmFiles = files.filter(f => f.endsWith(".webm"));

      // WAV files: check size only (ffprobe may not read duration correctly)
      for (const f of wavFiles) {
        const full = path.join(userDir, f);
        const stats = await fs.stat(full);
        
        // WAV header is 44 bytes, so valid files should be bigger
        if (stats.size < 100) {
          console.warn(`❌ Bad WAV chunk removed: ${f} size=${stats.size}`);
          await fs.move(full, path.join(badDir, f), { overwrite: true });

          if (await fs.pathExists(full + ".json")) {
            await fs.move(full + ".json", path.join(badDir, f + ".json"), {
              overwrite: true,
            });
          }
        } else {
          console.log(`✓ WAV chunk OK: ${f} size=${stats.size}`);
        }
      }

      // WebM files: use ffprobe for duration
      for (const f of webmFiles) {
        const full = path.join(userDir, f);
        const dur = await probeDuration(full);

        if (!dur || dur < 0.05) {
          console.warn(`❌ Bad WebM chunk removed: ${f} duration=${dur}`);
          await fs.move(full, path.join(badDir, f), { overwrite: true });

          if (await fs.pathExists(full + ".json")) {
            await fs.move(full + ".json", path.join(badDir, f + ".json"), {
              overwrite: true,
            });
          }
        } else {
          console.log(`✓ WebM chunk OK: ${f} duration=${dur}s`);
        }
      }

      console.log("✓ Chunk cleanup complete.");

      // Check if we have any valid chunks left
      const remainingFiles = await fs.readdir(userDir);
      const validChunks = remainingFiles.filter(f => f.endsWith(".wav") || f.endsWith(".webm"));
      
      if (validChunks.length === 0) {
        socket.emit("server-error", { 
          message: "No valid audio chunks found. Please check microphone and recording format." 
        });
        return;
      }

      console.log(`Found ${validChunks.length} valid chunks to concatenate`);

      runningConcat.set(key, true);
      socket.emit("concat-start");

      let combined;
      try {
        combined = await runConcat(meetingId, userId);
      } catch (e) {
        socket.emit("server-error", { message: "concat failed", detail: e.message });
        return;
      }

      socket.emit("concat-complete", {
        audio: `/uploads/${meetingId}/${userId}/${path.basename(combined)}`,
      });

      // Start transcription
      const python = path.join(__dirname, "venv", "Scripts", "python.exe");
      const script = path.join(__dirname, "transcribe.py");

      console.log("Running transcription:", python, script, combined);

      const proc = spawn(python, [script, combined], {
        cwd: __dirname,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let err = "";
      proc.stderr.on("data", (d) => (err += d.toString()));

      proc.on("close", async (code) => {
        if (code !== 0) {
          socket.emit("server-error", { message: "transcription failed", detail: err });
          return;
        }

        const transcriptFile = path.join(userDir, "transcript.json");
        const data = await fs.readJson(transcriptFile);

        socket.emit("transcription-complete", {
          transcript: data.transcript,
          duration: data.duration,
          file: `/uploads/${meetingId}/${userId}/transcript.json`,
        });
      });
    } catch (e) {
      console.error("recording-stopped error:", e);
      socket.emit("server-error", { message: e.message });
    } finally {
      runningConcat.delete(key);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.post("/api/transcribe", async (req, res) => {
  try {
    const { meetingId, userId } = req.query;

    const userDir = path.join(__dirname, "uploads", meetingId, userId);
    const webm = path.join(userDir, "combined.webm");
    const wav = path.join(userDir, "combined.wav");

    let audio = null;
    if (await fs.pathExists(webm)) audio = webm;
    else if (await fs.pathExists(wav)) audio = wav;

    if (!audio) {
      return res.status(404).json({ error: "combined audio not found" });
    }

    const python = path.join(__dirname, "venv", "Scripts", "python.exe");
    const script = path.join(__dirname, "transcribe.py");

    const proc = spawn(python, [script, audio], { cwd: __dirname });

    let err = "";
    proc.stderr.on("data", (d) => (err += d.toString()));

    proc.on("close", async (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: "transcription fail", detail: err });
      }

      const json = await fs.readJson(path.join(userDir, "transcript.json"));
      res.json({ ok: true, transcript: json });
    });
  } catch (err) {
    res.status(500).json({ error: "server error", detail: err.message });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});