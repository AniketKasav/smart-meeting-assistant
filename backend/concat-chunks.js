// backend/concat-chunks.js
const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");

// Update your ffmpeg path
const ffmpegPath =
  "C:/Users/anike/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.0.1-full_build/bin/ffmpeg.exe";

async function runFFmpeg(args, cwd, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    console.log(`Running ffmpeg with args: ${args.join(' ')}`);
    
    const proc = spawn(ffmpegPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = "";
    let stderr = "";
    let killed = false;

    proc.stdout.on("data", (d) => {
      stdout += d.toString();
      process.stdout.write(d); // Show progress
    });
    
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      process.stderr.write(d); // Show ffmpeg progress
    });

    const timeout = setTimeout(() => {
      if (!killed) {
        killed = true;
        proc.kill('SIGTERM');
        reject(new Error(`FFmpeg timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (killed) return;
      
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}. stderr: ${stderr.slice(-500)}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

async function main() {
  try {
    const [meetingId, userId] = process.argv.slice(2);

    if (!meetingId || !userId) {
      console.error("❌ Usage: node concat-chunks.js <meetingId> <userId>");
      process.exit(1);
    }

    console.log(`📦 Concatenating chunks for meeting=${meetingId}, user=${userId}`);

    const userDir = path.join(__dirname, "uploads", meetingId, userId);

    if (!(await fs.pathExists(userDir))) {
      console.error(`❌ User directory not found: ${userDir}`);
      process.exit(1);
    }

    const files = await fs.readdir(userDir);
    console.log(`Found ${files.length} total files in directory`);

    // Filter for valid chunk files
    const wavFiles = files.filter((f) => /^\d{6}\.wav$/.test(f)).sort();
    const webmFiles = files.filter((f) => /^\d{6}\.webm$/.test(f)).sort();

    console.log(`Found ${wavFiles.length} WAV chunks and ${webmFiles.length} WebM chunks`);

    if (wavFiles.length === 0 && webmFiles.length === 0) {
      console.error("❌ No valid WAV or WebM chunks found (looking for NNNNNN.wav or NNNNNN.webm)");
      process.exit(1);
    }

    // ------------------------------------------
    // CASE 1 — WAV Concatenation (PREFERRED)
    // ------------------------------------------
    if (wavFiles.length > 0) {
      console.log(`🔊 Concatenating ${wavFiles.length} WAV chunks...`);

      const listFile = path.join(userDir, "wav_list.txt");
      const outFile = path.join(userDir, "combined.wav");

      // Create concat list file
      const listContent = wavFiles.map((f) => `file '${f}'`).join("\n");
      await fs.writeFile(listFile, listContent, "utf8");
      console.log(`Created concat list: ${listFile}`);

      // Try copy codec first (fastest)
      try {
        console.log("Attempting fast concat with copy codec...");
        await runFFmpeg(
          ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outFile],
          userDir,
          180000 // 3 minutes timeout
        );

        // Verify output
        const stats = await fs.stat(outFile);
        if (stats.size < 1000) {
          throw new Error("Output file too small, trying re-encode");
        }

        console.log(`✅ WAV concatenation complete (copy codec) → combined.wav (${stats.size} bytes)`);
        process.exit(0);
      } catch (copyErr) {
        console.warn("⚠️  Copy codec failed, trying re-encode:", copyErr.message);

        // Fallback: re-encode (slower but more reliable)
        try {
          console.log("Re-encoding to WAV 16kHz mono...");
          await runFFmpeg(
            [
              "-y",
              "-f", "concat",
              "-safe", "0",
              "-i", listFile,
              "-ar", "16000",
              "-ac", "1",
              "-acodec", "pcm_s16le",
              outFile
            ],
            userDir,
            300000 // 5 minutes timeout
          );

          const stats = await fs.stat(outFile);
          if (stats.size < 1000) {
            throw new Error("Re-encoded output file too small");
          }

          console.log(`✅ WAV concatenation complete (re-encode) → combined.wav (${stats.size} bytes)`);
          process.exit(0);
        } catch (reencodeErr) {
          console.error("❌ Re-encode also failed:", reencodeErr.message);
          throw reencodeErr;
        }
      }
    }

    // ------------------------------------------
    // CASE 2 — WEBM Concatenation
    // ------------------------------------------
    if (webmFiles.length > 0) {
      console.log(`🎥 Concatenating ${webmFiles.length} WebM chunks...`);

      const listFile = path.join(userDir, "webm_list.txt");
      const outWebm = path.join(userDir, "combined.webm");

      const listContent = webmFiles.map((f) => `file '${f}'`).join("\n");
      await fs.writeFile(listFile, listContent, "utf8");
      console.log(`Created concat list: ${listFile}`);

      // Try copy codec
      try {
        console.log("Attempting WebM concat with copy codec...");
        await runFFmpeg(
          ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outWebm],
          userDir,
          180000
        );

        const stats = await fs.stat(outWebm);
        if (stats.size < 1000) {
          throw new Error("WebM output too small, converting to WAV");
        }

        console.log(`✅ WebM concatenation complete → combined.webm (${stats.size} bytes)`);
        process.exit(0);
      } catch (webmErr) {
        console.warn("⚠️  WebM concat failed, converting to WAV:", webmErr.message);

        // Convert to WAV as fallback
        const outWav = path.join(userDir, "combined.wav");
        
        try {
          console.log("Converting WebM to WAV 16kHz mono...");
          await runFFmpeg(
            [
              "-y",
              "-f", "concat",
              "-safe", "0",
              "-i", listFile,
              "-vn",
              "-ar", "16000",
              "-ac", "1",
              "-acodec", "pcm_s16le",
              outWav
            ],
            userDir,
            300000
          );

          const stats = await fs.stat(outWav);
          if (stats.size < 1000) {
            throw new Error("Converted WAV too small");
          }

          console.log(`✅ WebM→WAV conversion complete → combined.wav (${stats.size} bytes)`);
          process.exit(0);
        } catch (convErr) {
          console.error("❌ WebM→WAV conversion failed:", convErr.message);
          throw convErr;
        }
      }
    }

    console.error("❌ No valid chunks to concatenate");
    process.exit(1);

  } catch (err) {
    console.error("❌ FATAL ERROR in concat-chunks.js:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run main
main();