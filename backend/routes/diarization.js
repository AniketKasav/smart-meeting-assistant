// backend/routes/diarization.js
const express = require("express");
const { spawn } = require("child_process");
const Transcript = require("../models/Transcript");
const Meeting = require("../models/Meeting");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ✅ Pre-check: test if torchaudio/pyannote can load at all
// Cached so we only check once per server restart
let diarizationAvailable = null;

async function checkDiarizationAvailable() {
  if (diarizationAvailable !== null) return diarizationAvailable;

  return new Promise((resolve) => {
    const testProc = spawn("python", ["-c", 'import torchaudio; print("ok")'], {
      env: { ...process.env },
    });

    let output = "";
    testProc.stdout.on("data", (d) => (output += d.toString()));

    testProc.on("close", (code) => {
      diarizationAvailable = code === 0 && output.includes("ok");
      if (!diarizationAvailable) {
        console.warn(
          "[diarization] ⚠️ torchaudio not available — diarization disabled",
        );
      } else {
        console.log(
          "[diarization] ✅ torchaudio available — diarization enabled",
        );
      }
      resolve(diarizationAvailable);
    });

    testProc.on("error", () => {
      diarizationAvailable = false;
      resolve(false);
    });

    // Timeout the check after 10 seconds
    setTimeout(() => {
      testProc.kill();
      diarizationAvailable = false;
      resolve(false);
    }, 10000);
  });
}

router.post("/:meetingId/run", async (req, res) => {
  try {
    const { meetingId } = req.params;
    // ✅ Check availability first — return graceful response if blocked
    const available = await checkDiarizationAvailable();
    if (!available) {
      console.warn(
        "[diarization] Skipping — torchaudio blocked by system policy",
      );
      return res.json({
        success: false,
        skipped: true,
        warning:
          "Diarization is unavailable on this system (Windows Application Control policy is blocking torchaudio). The transcript is still available without speaker labels.",
      });
    }

    // 1️⃣ Fetch transcript from DB
    let transcript = await Transcript.findOne({
      meetingId,
      processingStatus: "completed",
    });

    if (!transcript && /^[0-9a-fA-F]{24}$/.test(meetingId)) {
      const meeting = await Meeting.findById(meetingId);
      if (meeting) {
        transcript = await Transcript.findOne({
          meetingId: meeting.meetingId,
          processingStatus: "completed",
        });
      }
    }

    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    // ✅ Construct audioPath if missing
    let audioPath = transcript.audioPath;

    if (!audioPath) {
      console.log(
        "[diarization] audioPath missing, attempting to construct...",
      );

      const possiblePaths = [
        path.join(__dirname, "../uploads", transcript.meetingId, "audio.wav"),
        path.join(
          __dirname,
          "../uploads",
          transcript.meetingId,
          "recording.wav",
        ),
        path.join(__dirname, "../uploads", transcript.meetingId, "output.wav"),
      ];

      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          audioPath = possiblePath;
          transcript.audioPath = audioPath;
          await transcript.save();
          break;
        }
      }

      if (!audioPath) {
        const uploadsDir = path.join(
          __dirname,
          "../uploads",
          transcript.meetingId,
        );
        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);
          const audioFile = files.find(
            (f) => f.endsWith(".wav") || f.endsWith(".mp3"),
          );
          if (audioFile) {
            audioPath = path.join(uploadsDir, audioFile);
            transcript.audioPath = audioPath;
            await transcript.save();
          }
        }
      }
    }

    if (!audioPath) {
      return res.status(400).json({
        error:
          "Audio file not found. Please ensure the meeting was recorded with audio.",
        meetingId: transcript.meetingId,
      });
    }

    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({
        error: "Audio file not found on disk",
        path: audioPath,
      });
    }

    // 2️⃣ Safely derive transcript.json path
    const transcriptFilePath = path.join(
      path.dirname(audioPath),
      "transcript.json",
    );

    if (!fs.existsSync(transcriptFilePath)) {
      return res
        .status(404)
        .json({ error: "transcript.json not found on disk" });
    }

    // 3️⃣ Run Python diarization
    const py = spawn(
      "python",
      [
        "-u",
        path.join(__dirname, "../services/diarizationService.py"),
        audioPath,
        transcriptFilePath,
      ],
      { env: { ...process.env } },
    );

    let processCompleted = false;
    let outputBuffer = "";
    let errorBuffer = "";

    py.stdout.on("data", (data) => {
      const message = data.toString();
      outputBuffer += message;
    });

    py.stderr.on("data", (data) => {
      const message = data.toString();
      errorBuffer += message;
      console.error("[diarization]", message.trim());
    });

    py.on("error", (error) => {
      console.error("[diarization] Process error:", error);
      if (!processCompleted && !res.headersSent) {
        processCompleted = true;
        // ✅ Graceful — not 500
        return res.json({
          success: false,
          warning: "Failed to start diarization process: " + error.message,
        });
      }
    });

    py.on("close", async (code) => {
      if (processCompleted || res.headersSent) return;
      processCompleted = true;

      if (code !== 0) {
        console.error(
          "[diarization] Process failed:",
          errorBuffer.substring(0, 300),
        );

        // ✅ Check if it's the DLL/policy error specifically
        const isDllBlocked =
          errorBuffer.includes("Application Control policy") ||
          errorBuffer.includes("DLL load failed") ||
          errorBuffer.includes("WinError 4551");

        if (isDllBlocked) {
          // Mark as permanently unavailable so we skip the check next time
          diarizationAvailable = false;
          return res.json({
            success: false,
            skipped: true,
            warning:
              "Diarization blocked by Windows Application Control policy. Transcript is still available without speaker labels.",
          });
        }

        // ✅ Other errors — still graceful, not 500
        return res.json({
          success: false,
          warning:
            "Diarization process failed. Transcript is still available without speaker labels.",
          details: errorBuffer.substring(0, 200),
        });
      }

      try {
        const updatedRaw = fs.readFileSync(transcriptFilePath, "utf-8");
        const updated = JSON.parse(updatedRaw);

        console.log(
          "[diarization] Updated transcript has",
          updated.transcript?.length,
          "segments",
        );

        transcript.segments = updated.transcript;
        await transcript.save();

        res.json({ success: true });
      } catch (err) {
        console.error("[diarization] Error saving results:", err);
        return res.json({
          success: false,
          warning: "Diarization ran but failed to save results: " + err.message,
        });
      }
    });

    // 5 minute timeout
    setTimeout(
      () => {
        if (!processCompleted && !res.headersSent) {
          processCompleted = true;
          py.kill();
          console.error("[diarization] Process timeout");
          res.json({
            success: false,
            warning:
              "Diarization timed out. Transcript is still available without speaker labels.",
          });
        }
      },
      5 * 60 * 1000,
    );
  } catch (err) {
    console.error("[diarization] Fatal error:", err);
    // ✅ Never crash with 500 — always graceful
    if (!res.headersSent) {
      res.json({
        success: false,
        warning: "Diarization unavailable: " + err.message,
      });
    }
  }
});

module.exports = router;
