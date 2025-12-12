// frontend/src/pages/MeetingRoom.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

function MeetingRoom() {
  const [meetingId, setMeetingId] = useState("123");
  const [userId, setUserId] = useState("Aniket");
  const [isRecording, setIsRecording] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [chunkAckCount, setChunkAckCount] = useState(0);
  const [lastChunkSize, setLastChunkSize] = useState(0);
  const [lastChunkUrlState, setLastChunkUrlState] = useState(null);
  const [lastBlobType, setLastBlobType] = useState("");
  const [recordingMode, setRecordingMode] = useState("wav");
  const [debugInfo, setDebugInfo] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const [transcript, setTranscript] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const seqRef = useRef(0);
  const lastBlobRef = useRef(null);
  const lastChunkUrlRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);

  useEffect(() => {
    socket.on("chunk-saved", (d) => {
      setChunkAckCount((c) => c + 1);
      console.log("✅ Chunk saved:", d);
    });

    socket.on("processing-log", (d) => {
      console.log("📋 Processing:", d.msg);
      setProcessingStatus(d.msg);
    });

    socket.on("concat-start", (d) => {
      console.log("🔗 Concat started:", d);
      setProcessingStatus(`Combining ${d.chunks} audio chunks...`);
    });

    socket.on("concat-complete", (d) => {
      console.log("✅ Concat complete:", d);
      setProcessingStatus("Audio combined! Starting transcription...");
    });

    socket.on("transcription-start", (d) => {
      console.log("🎤 Transcription started:", d);
      setProcessingStatus("Transcribing audio (this may take 1-2 minutes)...");
    });

    socket.on("transcription-log", (d) => {
      console.log("📝 Transcription:", d.msg || d.err);
    });

    socket.on("transcription-complete", (d) => {
      console.log("✅ Transcription complete:", d);
      setProcessingStatus("Complete! ✅");
      setTranscript(d);
      alert(`Transcription complete! Duration: ${d.duration}s, Segments: ${d.transcript.length}`);
    });

    socket.on("server-error", (d) => {
      console.error("❌ Server error:", d);
      setProcessingStatus(`Error: ${d.message}`);
      alert(`Server error: ${d.message}\n\n${d.detail || ''}`);
    });

    socket.on("concat-already-running", () => {
      alert("Processing already in progress. Please wait.");
    });

    return () => {
      socket.off("chunk-saved");
      socket.off("processing-log");
      socket.off("concat-start");
      socket.off("concat-complete");
      socket.off("transcription-start");
      socket.off("transcription-log");
      socket.off("transcription-complete");
      socket.off("server-error");
      socket.off("concat-already-running");
    };
  }, []);

  useEffect(() => {
    async function updateDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const list = await navigator.mediaDevices.enumerateDevices();
        const mics = list.filter((d) => d.kind === "audioinput");
        setDevices(mics);
        if (!selectedDeviceId && mics.length) setSelectedDeviceId(mics[0].deviceId);
        console.log(`🎤 Found ${mics.length} microphones`);
      } catch (err) {
        console.warn("Device enumeration failed:", err);
      }
    }
    updateDevices();
    navigator.mediaDevices.addEventListener?.("devicechange", updateDevices);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", updateDevices);
  }, [selectedDeviceId]);

  const handleJoinMeeting = () => {
    if (!meetingId.trim() || !userId.trim()) {
      alert("Please enter Meeting ID and Your Name");
      return;
    }
    socket.emit("join-meeting", { meetingId, userId });
    console.log(`📞 Joining meeting ${meetingId} as ${userId}`);
  };

  const arrayBufferToBase64 = (buffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, slice);
    }
    return btoa(binary);
  };

  const encodeWAV = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    return buffer;
  };

  const startWAVRecording = async () => {
    try {
      const audioConstraints = {
        deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(16384, 1, 1);
      processorRef.current = processor;

      let recordingBuffer = [];
      const CHUNK_DURATION = 2;
      const SAMPLES_PER_CHUNK = audioContext.sampleRate * CHUNK_DURATION;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        recordingBuffer.push(new Float32Array(inputData));

        const totalSamples = recordingBuffer.reduce((sum, arr) => sum + arr.length, 0);

        if (totalSamples >= SAMPLES_PER_CHUNK) {
          const combined = new Float32Array(totalSamples);
          let offset = 0;
          for (const buf of recordingBuffer) {
            combined.set(buf, offset);
            offset += buf.length;
          }

          const wavBuffer = encodeWAV(combined, audioContext.sampleRate);
          const blob = new Blob([wavBuffer], { type: "audio/wav" });

          sendChunk(blob, "audio/wav");
          recordingBuffer = [];
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      seqRef.current = 0;
      setChunkAckCount(0);
      setLastChunkSize(0);
      setLastBlobType("audio/wav");
      setIsRecording(true);
      setDebugInfo(`🎙️ WAV recording active - 16kHz mono`);
      setProcessingStatus("");
      setTranscript(null);

      console.log("✅ WAV recording started");
    } catch (err) {
      console.error("WAV recording error:", err);
      alert("Failed to start WAV recording: " + err.message);
      setIsRecording(false);
    }
  };

  const startWebMRecording = async () => {
    try {
      const audioConstraints = {
        deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        channelCount: 1,
        sampleRate: 48000,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      streamRef.current = stream;

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];

      let selectedMime = "";
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      if (!selectedMime) {
        throw new Error("No supported audio MIME type found");
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = recorder;
      seqRef.current = 0;
      setChunkAckCount(0);
      setLastChunkSize(0);
      setLastBlobType(selectedMime);
      lastBlobRef.current = null;

      if (lastChunkUrlRef.current) {
        try {
          URL.revokeObjectURL(lastChunkUrlRef.current);
        } catch (e) {}
      }
      lastChunkUrlRef.current = null;
      setLastChunkUrlState(null);

      setIsRecording(true);
      setDebugInfo(`🎙️ WebM recording - ${selectedMime}`);
      setProcessingStatus("");
      setTranscript(null);

      recorder.ondataavailable = async (event) => {
        if (!event.data || event.data.size === 0) {
          console.warn("Empty blob produced");
          return;
        }
        await sendChunk(event.data, event.data.type || selectedMime);
      };

      recorder.onerror = (e) => {
        console.error("Recorder error", e);
        setDebugInfo(`⚠️ Recorder error: ${e.error?.message || "unknown"}`);
      };

      recorder.onstop = () => {
        mediaRecorderRef.current = null;
      };

      recorder.start(2000);
      console.log("✅ WebM recording started");
    } catch (err) {
      console.error("WebM recording error:", err);
      alert("Failed to start WebM recording: " + err.message);
      setIsRecording(false);
    }
  };

  const sendChunk = async (blob, mimeType) => {
    try {
      lastBlobRef.current = blob;
      setLastBlobType(mimeType);
      setLastChunkSize(blob.size);

      if (lastChunkUrlRef.current) {
        try {
          URL.revokeObjectURL(lastChunkUrlRef.current);
        } catch (e) {}
      }

      const url = URL.createObjectURL(blob);
      lastChunkUrlRef.current = url;
      setLastChunkUrlState(url);

      const arrBuf = await blob.arrayBuffer();
      const b64 = arrayBufferToBase64(arrBuf);

      socket.emit("audio-chunk", {
        meetingId,
        userId,
        seq: seqRef.current++,
        mime: mimeType,
        base64: b64,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error("sendChunk error:", e);
      setDebugInfo(`❌ Send error: ${e.message}`);
    }
  };

  const startRecording = async () => {
    if (recordingMode === "wav") {
      await startWAVRecording();
    } else {
      await startWebMRecording();
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.requestData();
        } catch (e) {}
        mediaRecorderRef.current.stop();
      }

      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      socket.emit("recording-stopped", { meetingId, userId });
      console.log("🛑 Recording stopped, processing...");
      setDebugInfo("Processing recording...");
      setProcessingStatus("Processing audio chunks...");
    } catch (e) {
      console.warn("Stop recording error:", e);
    } finally {
      setIsRecording(false);
    }
  };

  const downloadLastChunk = () => {
    try {
      const blob = lastBlobRef.current;
      if (!blob) return alert("No chunk available yet");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = blob.type.includes("wav") ? ".wav" : blob.type.includes("webm") ? ".webm" : ".ogg";
      a.download = `last_chunk${ext}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 2000);
    } catch (e) {
      console.error("Download error:", e);
    }
  };

  useEffect(() => {
    return () => {
      if (lastChunkUrlRef.current) {
        try {
          URL.revokeObjectURL(lastChunkUrlRef.current);
        } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-3xl font-bold">🎙️ Live Meeting Recorder</h2>

      <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl max-w-3xl">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm mb-2 font-medium">Meeting ID</label>
            <input
              className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm"
              placeholder="Enter Meeting ID"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              disabled={isRecording}
            />
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium">Your Name</label>
            <input
              className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm"
              placeholder="Enter Your Name"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isRecording}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2 font-medium">Microphone</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm"
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            disabled={isRecording}
          >
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm mb-2 font-medium">Recording Format</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm"
            value={recordingMode}
            onChange={(e) => setRecordingMode(e.target.value)}
            disabled={isRecording}
          >
            <option value="wav">🎵 WAV (Recommended - Best for Transcription)</option>
            <option value="webm">📦 WebM/Opus (Smaller Files)</option>
          </select>
          <p className="text-xs text-slate-400 mt-2">
            💡 WAV format is more reliable for transcription, especially with Bluetooth devices
          </p>
        </div>

        {debugInfo && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm">
            {debugInfo}
          </div>
        )}

        {processingStatus && (
          <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg text-sm font-medium">
            ⚙️ {processingStatus}
          </div>
        )}

        <div className="flex gap-3 mb-6">
          <button
            onClick={handleJoinMeeting}
            disabled={isRecording}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            📞 Join Meeting
          </button>

          {!isRecording ? (
            <button
              onClick={startRecording}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
            >
              🎙️ Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors animate-pulse"
            >
              ⛔ Stop Recording
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-slate-800/50 rounded-lg">
          <div>
            <div className="text-xs text-slate-400 mb-1">Chunks Saved</div>
            <div className="text-2xl font-bold text-emerald-400">{chunkAckCount}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Last Chunk Size</div>
            <div className="text-lg font-semibold text-emerald-400">
              {(lastChunkSize / 1024).toFixed(1)} KB
            </div>
            <div className="text-xs text-slate-500 mt-1">{lastBlobType}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium mb-2">🔊 Test Last Chunk</div>
          {lastChunkUrlState ? (
            <audio controls src={lastChunkUrlState} className="w-full rounded-lg bg-slate-800" />
          ) : (
            <div className="text-sm text-slate-500 italic p-3 bg-slate-800 rounded-lg">
              No chunk recorded yet. Start recording to see audio chunks.
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={downloadLastChunk}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
          >
            ⬇️ Download Last Chunk
          </button>
          <button
            onClick={() => {
              if (lastChunkUrlRef.current) window.open(lastChunkUrlRef.current, "_blank");
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
          >
            🔗 Open in New Tab
          </button>
        </div>

        {transcript && (
          <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-700 rounded-lg">
            <h3 className="text-lg font-bold mb-3 text-emerald-300">📝 Transcript</h3>
            <div className="text-sm text-slate-300 mb-3">
              Duration: {transcript.duration}s | Segments: {transcript.transcript.length}
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {transcript.transcript.map((seg, i) => (
                <div key={i} className="p-2 bg-slate-800/50 rounded">
                  <span className="text-xs text-slate-400">
                    [{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s]
                  </span>
                  <p className="text-sm mt-1">{seg.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-amber-900/20 border border-amber-700 rounded-lg text-sm">
          <strong className="text-amber-300">💡 Tips for Best Results:</strong>
          <ul className="list-disc ml-5 mt-2 space-y-1.5 text-slate-300">
            <li><strong>Use WAV format</strong> if you're having issues with WebM chunks</li>
            <li><strong>Test audio</strong> by playing back the last chunk before stopping</li>
            <li><strong>Chunks should be 20-50KB+</strong> per second (check the size above)</li>
            <li><strong>Bluetooth issues?</strong> Try a wired microphone or built-in mic</li>
            <li><strong>Silent chunks?</strong> Check browser mic permissions and volume</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default MeetingRoom;