// frontend/src/pages/MeetingRoom.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Users,
  FileText,
  X,
  Loader2,
  Copy,
  CheckCircle2,
  Send,
  Sparkles,
  Globe,
  ChevronDown,
} from "lucide-react";
import io from "socket.io-client";
import SimplePeer from "simple-peer";
import VideoTile from "../components/VideoCall/VideoTile";
import LiveSubtitles from "../components/LiveSubtitles";
import { meetingsAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useVoiceCommand } from "../contexts/VoiceCommandContext";
import { micLock } from "../utils/micLock";

const SOCKET_URL = "https://smart-meeting-assistant-olcl.onrender.com";

// ─── Language options (English, Hindi, Marathi) ─────────────────────────────
const LANGUAGES = [
  { deepgramCode: "en", browserCode: "en-IN", label: "English", flag: "🇺🇸" },
  { deepgramCode: "hi", browserCode: "hi-IN", label: "Hindi", flag: "🇮🇳" },
  { deepgramCode: "mr", browserCode: "mr-IN", label: "Marathi", flag: "🇮🇳" },
];

let globalSocket = null;
let globalStream = null;
let isInitializing = false;

// ─── Language Selector Component ─────────────────────────────────────────────
const LanguageSelector = ({ selectedCode, onChange, disabled, label }) => {
  return (
    <div className="flex items-center gap-1.5">
      <Globe className="w-4 h-4 text-blue-400" />
      {label && (
        <span className="text-gray-300 text-xs font-medium hidden md:inline">
          {label}
        </span>
      )}
      <select
        value={selectedCode}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-gray-700 border border-gray-500 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm disabled:opacity-50"
        title="Transcription language (what you speak)"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.deepgramCode} value={lang.deepgramCode}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const MeetingRoom = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { suspendWakeWord, resumeWakeWord, fridayAwake } = useVoiceCommand();

  const userId = useRef(
    user?._id || user?.userId || `user_${Date.now()}`,
  ).current;
  const userName = useRef(user?.name || "Guest User").current;

  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [meeting, setMeeting] = useState(null);

  // UI panels
  const [showChat, setShowChat] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Transcription
  const [liveTranscript, setLiveTranscript] = useState([]);
  const [isLiveTranscriptionEnabled, setIsLiveTranscriptionEnabled] =
    useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [partialText, setPartialText] = useState("");
  const [liveTranslations, setLiveTranslations] = useState({});
  const [translateTarget, setTranslateTarget] = useState("en");
  const translateTargetRef = useRef("en");

  const handleTranslateTargetChange = (lang) => {
    setTranslateTarget(lang);
    translateTargetRef.current = lang;
  };

  const liveTranscriptionEnabledRef = useRef(false);

  // ── Language state ──────────────────────────────────────────────────────────
  const [transcriptionLanguage, setTranscriptionLanguage] = useState("en");
  const transcriptionLanguageRef = useRef("en");

  const isTranslationNeeded = transcriptionLanguage !== translateTarget;

  const isRecordingRef = useRef(false);
  const audioContextRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const peersRef = useRef({});
  const hasInitialized = useRef(false);
  const chatEndRef = useRef(null);
  const speechRecRef = useRef(null);

  // ── Web Speech API: Start/Stop/Restart ────────────────────────────────────
  const startSpeechRecognition = (langCode) => {
    // ✅ FIX: If wakeword/FRIDAY owns the mic, suspend it and force-release
    // so the meeting can take over immediately instead of deferring forever.
    if (!micLock.canAcquire("meeting")) {
      if (micLock.owner === "wakeword" || micLock.owner === "friday") {
        console.log(
          "[MeetingRoom] Suspending FRIDAY/wakeword to acquire mic for meeting",
        );
        suspendWakeWord();
        micLock.forceRelease();
        // Small delay for wakeword process to actually stop before we start
        setTimeout(() => startSpeechRecognition(langCode), 300);
        return;
      }
      // Some other owner — wait for release normally
      console.log(
        "[MeetingRoom] Mic locked by",
        micLock.owner,
        "— deferring transcription start",
      );
      const unsub = micLock.subscribe((newOwner) => {
        if (newOwner === null) {
          unsub();
          if (liveTranscriptionEnabledRef.current) {
            startSpeechRecognition(langCode);
          }
        }
      });
      return;
    }

    // ⏸️ Suspend FRIDAY passive listener — meeting mic takes priority
    suspendWakeWord();
    micLock.acquire("meeting");

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("❌ Web Speech API not supported");
      micLock.release("meeting");
      return;
    }

    // ✅ Stop old instance BEFORE creating the new one
    if (speechRecRef.current) {
      const old = speechRecRef.current;
      speechRecRef.current = null;
      try {
        old.abort();
      } catch (_) {}
    }

    const lang = LANGUAGES.find((l) => l.deepgramCode === langCode);
    const browserCode = lang?.browserCode || "en-IN";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = browserCode;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      if (speechRecRef.current !== recognition) return;

      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }

      if (interimTranscript) {
        setPartialText(interimTranscript);
        setIsTranscribing(true);
      }
      if (finalTranscript?.trim()) {
        setPartialText("");
        setIsTranscribing(false);
        const segment = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: finalTranscript.trim(),
          timestamp: Date.now(),
          language: langCode,
        };
        setLiveTranscript((prev) => [...prev, segment]);

        if (globalSocket?.connected) {
          globalSocket.emit("save-live-segment", {
            meetingId,
            text: finalTranscript.trim(),
            language: langCode,
            userName,
            timestamp: Date.now(),
            translateTarget: translateTargetRef.current,
          });
        }
      }
    };

    recognition.onend = () => {
      // ✅ Only restart if THIS instance is still active AND mic is still ours
      if (
        liveTranscriptionEnabledRef.current &&
        speechRecRef.current === recognition &&
        micLock.canAcquire("meeting")
      ) {
        try {
          recognition.start();
        } catch (_) {}
      } else if (
        liveTranscriptionEnabledRef.current &&
        speechRecRef.current === recognition &&
        !micLock.canAcquire("meeting")
      ) {
        // FRIDAY or WakeWord grabbed the mic — wait for release
        console.log(
          "[MeetingRoom] Mic taken by",
          micLock.owner,
          "— waiting to restart transcription",
        );
        const unsub = micLock.subscribe((newOwner) => {
          if (newOwner === null) {
            unsub();
            if (
              liveTranscriptionEnabledRef.current &&
              speechRecRef.current === recognition
            ) {
              micLock.acquire("meeting");
              try {
                recognition.start();
              } catch (_) {}
            }
          }
        });
      }
    };

    recognition.onerror = (event) => {
      if (speechRecRef.current !== recognition) return;
      // Suppress noisy aborted errors — these are expected when FRIDAY takes the mic
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.warn(
        `🎤 Speech recognition error: ${event.error} (lang: ${browserCode})`,
      );
      if (event.error === "language-not-available") {
        console.error(
          `❌ Language "${browserCode}" not available — falling back to en-IN`,
        );
        setTimeout(() => startSpeechRecognition("en"), 500);
        return;
      }
      if (event.error === "not-allowed") {
        alert("Microphone access denied.");
      }
    };

    speechRecRef.current = recognition;
    liveTranscriptionEnabledRef.current = true;
    setIsLiveTranscriptionEnabled(true);

    try {
      recognition.start();
      console.log(`🎤 Web Speech API started — lang: ${browserCode}`);
    } catch (err) {
      console.error("❌ Failed to start speech recognition:", err);
      speechRecRef.current = null;
      micLock.release("meeting");
    }
  };

  const stopSpeechRecognition = () => {
    liveTranscriptionEnabledRef.current = false;
    setIsLiveTranscriptionEnabled(false);
    if (speechRecRef.current) {
      try {
        speechRecRef.current.abort();
      } catch (_) {}
      speechRecRef.current = null;
    }
    micLock.release("meeting");
    // ▶️ Meeting mic released — resume FRIDAY wake-word listener
    resumeWakeWord();
  };

  // ── Handle language change mid-meeting ──────────────────────────────────────
  const handleLanguageChange = (newLang) => {
    setTranscriptionLanguage(newLang);
    transcriptionLanguageRef.current = newLang;
    setTranslateTarget(newLang);
    translateTargetRef.current = newLang;
    if (liveTranscriptionEnabledRef.current) {
      startSpeechRecognition(newLang);
    }
  };

  // ── Mid-meeting FRIDAY activation ──────────────────────────────────────────
  const meetingWasSpeechActive = useRef(false);

  useEffect(() => {
    if (fridayAwake && liveTranscriptionEnabledRef.current) {
      console.log(
        "⏸️ [MeetingRoom] FRIDAY activated — pausing transcription mic",
      );
      meetingWasSpeechActive.current = true;
      if (speechRecRef.current) {
        const old = speechRecRef.current;
        speechRecRef.current = null;
        try {
          old.abort();
        } catch (_) {}
      }
      micLock.release("meeting");
    } else if (!fridayAwake && meetingWasSpeechActive.current) {
      meetingWasSpeechActive.current = false;
      console.log("▶️ [MeetingRoom] FRIDAY done — resuming transcription mic");
      setTimeout(() => {
        if (liveTranscriptionEnabledRef.current) {
          startSpeechRecognition(transcriptionLanguageRef.current);
        }
      }, 600);
    }
  }, [fridayAwake]);

  useEffect(() => {
    if (hasInitialized.current || isInitializing) return;
    if (!meetingId) return;

    hasInitialized.current = true;
    isInitializing = true;

    const initializeWebRTC = async () => {
      try {
        if (!globalStream) {
          globalStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 1,
            },
          });
        }

        setLocalStream(globalStream);
        setIsConnecting(false);
        setIsLiveTranscriptionEnabled(true);
        liveTranscriptionEnabledRef.current = true;
        startRecording();

        if (!globalSocket || !globalSocket.connected) {
          globalSocket = io(SOCKET_URL, {
            transports: ["websocket"],
            reconnection: false,
          });

          globalSocket.on("connect", () => {
            console.log("✅ Socket connected:", globalSocket.id);

            globalSocket.emit("webrtc-join-meeting", {
              meetingId,
              userId,
              userName,
              isAudioEnabled: true,
              isVideoEnabled: true,
            });

            // ✅ FIX: Suspend FRIDAY and force-release mic lock BEFORE starting
            // speech recognition. Wakeword may still own the lock at this point.
            suspendWakeWord();
            micLock.forceRelease();
            setTimeout(
              () => startSpeechRecognition(transcriptionLanguageRef.current),
              400,
            );
          });

          globalSocket.on("connect_error", (err) => {
            console.error("❌ Socket error:", err);
            setError("Connection failed");
          });

          globalSocket.on("existing-participants", (participants) => {
            participants.forEach((p) => createPeer(p, true));
          });

          globalSocket.on("existing-participants", (participants) => {
            participants.forEach((participant) => {
              createPeer(participant, true);
            });
          });
          globalSocket.on("user-joined", (participant) => {
            createPeer(participant, false);
          });

          globalSocket.on("offer", ({ from, offer }) => {
            const p = peersRef.current[from];
            if (p) p.signal(offer);
          });
          globalSocket.on("answer", ({ from, answer }) => {
            const p = peersRef.current[from];
            if (p) p.signal(answer);
          });
          globalSocket.on("ice-candidate", ({ from, candidate }) => {
            const p = peersRef.current[from];
            if (p) p.signal(candidate);
          });

          globalSocket.on("user-left", ({ socketId }) => {
            if (peersRef.current[socketId]) {
              peersRef.current[socketId].destroy();
              delete peersRef.current[socketId];
              setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
            }
          });

          globalSocket.on("meeting-ended", ({ message }) => {
            alert(message || "The meeting has ended");
            cleanupAndNavigate();
          });

          globalSocket.on("force-leave", () => cleanupAndNavigate());

          globalSocket.on("live-transcript-translation", (data) => {
            console.log("🌐 Live translation received:", data);
            setLiveTranslations((prev) => ({
              ...prev,
              [data.originalText]: data.translatedText,
            }));
          });

          globalSocket.on("chat-message", (msg) => {
            setChatMessages((prev) => [...prev, msg]);
          });
        }

        isInitializing = false;
      } catch (err) {
        console.error("❌ WebRTC initialization error:", err);
        setError(err.message);
        setIsConnecting(false);
        isInitializing = false;
        hasInitialized.current = false;
      }
    };

    initializeWebRTC();

    return () => {
      if (globalSocket) {
        globalSocket.off("meeting-ended");
        globalSocket.off("force-leave");
      }
      Object.values(peersRef.current).forEach((p) => {
        try {
          p.destroy();
        } catch (_) {}
      });
      peersRef.current = {};
    };
  }, [meetingId, userId, userName]);

  const cleanupAndNavigate = () => {
    if (globalStream) globalStream.getTracks().forEach((t) => t.stop());
    Object.values(peersRef.current).forEach((p) => {
      try {
        p.destroy();
      } catch (_) {}
    });
    peersRef.current = {};
    if (globalSocket) {
      globalSocket.disconnect();
    }
    globalSocket = null;
    globalStream = null;
    hasInitialized.current = false;
    isInitializing = false;
    navigate("/dashboard");
  };

  const createPeer = (participant, initiator) => {
    if (peersRef.current[participant.socketId]) return;
    if (!globalStream) {
      console.warn('Stream not ready, retrying in 1s...');
      setTimeout(() => createPeer(participant, initiator), 1000);
      return;
    }

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream: globalStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
      },
    });

    peer.on("signal", (signal) => {
      if (!globalSocket) return;
      if (signal.type === "offer")
        globalSocket.emit("offer", { to: participant.socketId, offer: signal });
      else if (signal.type === "answer")
        globalSocket.emit("answer", {
          to: participant.socketId,
          answer: signal,
        });
      else
        globalSocket.emit("ice-candidate", {
          to: participant.socketId,
          candidate: signal,
        });
    });

    peer.on("stream", (remoteStream) => {
      setPeers((prev) => {
        const exists = prev.find((p) => p.socketId === participant.socketId);
        if (exists)
          return prev.map((p) =>
            p.socketId === participant.socketId
              ? { ...p, stream: remoteStream }
              : p,
          );
        return [...prev, { ...participant, stream: remoteStream, peer }];
      });
    });

    peer.on("error", (err) => console.error("Peer error:", err));
    peersRef.current[participant.socketId] = peer;
    setPeers((prev) =>
      prev.find((p) => p.socketId === participant.socketId)
        ? prev
        : [...prev, { ...participant, stream: null, peer }],
    );
  };

  useEffect(() => {
    const cleanup = () => {
      if (globalSocket?.connected) {
        globalSocket.emit("leave-meeting");
        globalSocket.disconnect();
      }
      if (globalStream) globalStream.getTracks().forEach((t) => t.stop());
      globalSocket = null;
      globalStream = null;
      isInitializing = false;
      hasInitialized.current = false;
    };
    window.addEventListener("beforeunload", cleanup);
    return () => window.removeEventListener("beforeunload", cleanup);
  }, []);

  useEffect(() => {
    if (meetingId) {
      meetingsAPI
        .getMeeting(meetingId)
        .then((res) => res.data.success && setMeeting(res.data.meeting))
        .catch((err) => console.error("Failed to load meeting:", err));
    }
  }, [meetingId]);

  // Ensure wake word resumes and mic lock is released on unmount
  useEffect(() => {
    return () => {
      micLock.release("meeting");
      resumeWakeWord();
    };
  }, []);

  const toggleAudio = () => {
    if (!globalStream) return;
    const track = globalStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsAudioEnabled(track.enabled);
    if (globalSocket)
      globalSocket.emit("media-state-change", {
        isAudioEnabled: track.enabled,
        isVideoEnabled,
      });
  };

  const toggleVideo = () => {
    if (!globalStream) return;
    const track = globalStream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsVideoEnabled(track.enabled);
    if (globalSocket)
      globalSocket.emit("media-state-change", {
        isAudioEnabled,
        isVideoEnabled: track.enabled,
      });
  };

  const checkAudioLevel = (buffer) => {
    let sum = 0,
      peaks = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
      if (Math.abs(buffer[i]) > 0.1) peaks++;
    }
    const rms = Math.sqrt(sum / buffer.length);
    return { hasSpeech: rms > 0.03 && peaks / buffer.length > 0.01 };
  };

  const audioBufferToWav = (audioBuffer) => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const data = [];
    for (let i = 0; i < numChannels; i++)
      data.push(audioBuffer.getChannelData(i));
    const interleaved = new Float32Array(audioBuffer.length * numChannels);
    for (let src = 0, dst = 0; src < audioBuffer.length; src++)
      for (let ch = 0; ch < numChannels; ch++)
        interleaved[dst++] = data[ch][src];
    const dataLength = interleaved.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const ws = (offset, str) => {
      for (let i = 0; i < str.length; i++)
        view.setUint8(offset + i, str.charCodeAt(i));
    };
    ws(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    ws(8, "WAVE");
    ws(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    ws(36, "data");
    view.setUint32(40, dataLength, true);
    let offset = 44;
    for (let i = 0; i < interleaved.length; i++) {
      let s = Math.max(-1, Math.min(1, interleaved[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, s, true);
      offset += 2;
    }
    return new Blob([buffer], { type: "audio/wav" });
  };

  const startRecording = () => {
    if (!globalStream) return;
    try {
      isRecordingRef.current = true;
      let chunkIndex = 0;

      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const audioStream = new MediaStream(globalStream.getAudioTracks());
      const source = audioContext.createMediaStreamSource(audioStream);

      const hpf = audioContext.createBiquadFilter();
      hpf.type = "highpass";
      hpf.frequency.value = 100;
      hpf.Q.value = 0.7;
      const lpf = audioContext.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 7000;
      lpf.Q.value = 0.7;
      const comp = audioContext.createDynamicsCompressor();
      comp.threshold.value = -40;
      comp.knee.value = 30;
      comp.ratio.value = 8;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;

      const processor = audioContext.createScriptProcessor(512, 1, 1);
      audioProcessorRef.current = processor;

      let recordingBuffer = [],
        recordingLength = 0;
      const samplesPerChunk = audioContext.sampleRate * 2;

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        recordingBuffer.push(new Float32Array(inputData));
        recordingLength += inputData.length;
        if (recordingLength >= samplesPerChunk) processAudioChunk();
      };

      const processAudioChunk = async () => {
        if (recordingLength === 0) return;
        const currentChunkIndex = chunkIndex++;
        try {
          const combined = new Float32Array(recordingLength);
          let offset = 0;
          for (const buf of recordingBuffer) {
            combined.set(buf, offset);
            offset += buf.length;
          }
          if (!checkAudioLevel(combined).hasSpeech) {
            chunkIndex--;
            recordingBuffer = [];
            recordingLength = 0;
            return;
          }

          const ab = audioContext.createBuffer(
            1,
            combined.length,
            audioContext.sampleRate,
          );
          ab.getChannelData(0).set(combined);
          const wavBlob = audioBufferToWav(ab);

          const formData = new FormData();
          formData.append("file", wavBlob, `chunk_${currentChunkIndex}.wav`);
          formData.append("meetingId", meetingId);
          formData.append("chunkIndex", currentChunkIndex);
          formData.append("userName", userName);
          formData.append("userId", userId);

          const res = await fetch("https://smart-meeting-assistant-olcl.onrender.com/api/upload-chunk", {
            method: "POST",
            body: formData,
          });
          const result = await res.json();
          if (result.success)
            console.log(`✅ WAV chunk ${currentChunkIndex} uploaded`);

          recordingBuffer = [];
          recordingLength = 0;
        } catch (err) {
          console.error(`❌ Error processing chunk ${currentChunkIndex}:`, err);
        }
      };

      source.connect(hpf);
      hpf.connect(lpf);
      lpf.connect(comp);
      comp.connect(processor);
      processor.connect(audioContext.destination);

      window.meetingAudioContext = audioContext;
      window.meetingProcessor = processor;
      window.meetingSource = source;
      window.processRemainingAudio = processAudioChunk;

      console.log("✅ Recording started for user:", userName);
    } catch (err) {
      console.error("❌ Recording initialization error:", err);
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
    if (globalSocket?.connected) globalSocket.emit("stop-live-transcription");
  };

  const startLiveTranscription = () => {
    if (!globalSocket?.connected) return;
    setIsLiveTranscriptionEnabled(true);
    liveTranscriptionEnabledRef.current = true;
    globalSocket.emit("start-live-transcription", {
      meetingId: meeting?.meetingId || meetingId,
      language: transcriptionLanguageRef.current,
    });
    globalSocket.emit("toggle-live-transcription", {
      meetingId: meeting?.meetingId || meetingId,
      enabled: true,
    });
  };

  const stopLiveTranscription = () => {
    setIsLiveTranscriptionEnabled(false);
    liveTranscriptionEnabledRef.current = false;
    if (globalSocket?.connected) {
      globalSocket.emit("stop-live-transcription");
      globalSocket.emit("toggle-live-transcription", {
        meetingId: meeting?.meetingId || meetingId,
        enabled: false,
      });
    }
  };

  const handleLeaveMeeting = () => {
    if (!window.confirm("Leave meeting?")) return;
    if (globalSocket?.connected) {
      globalSocket.emit("leave-meeting");
      globalSocket.disconnect();
    }
    cleanupAndNavigate();
  };

  const handleEndMeeting = async () => {
    if (!window.confirm("End meeting for all participants?")) return;
    try {
      const mid = meeting?.meetingId || meetingId;

      stopRecording();
      stopSpeechRecognition();

      if (window.meetingProcessor) {
        try {
          window.meetingProcessor.disconnect();
        } catch (_) {}
      }
      if (window.meetingSource) {
        try {
          window.meetingSource.disconnect();
        } catch (_) {}
      }
      if (
        window.meetingAudioContext &&
        window.meetingAudioContext.state !== "closed"
      ) {
        try {
          await window.meetingAudioContext.close();
        } catch (_) {}
      }
      if (window.processRemainingAudio) {
        try {
          await window.processRemainingAudio();
        } catch (_) {}
      }

      // ✅ Wait for any in-flight chunk uploads to finish before ending
      await new Promise((r) => setTimeout(r, 2500));

      if (globalSocket?.connected)
        globalSocket.emit("end-meeting", { meetingId: mid });

      fetch(`https://smart-meeting-assistant-olcl.onrender.com/api/meetings/${mid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", endedAt: new Date() }),
      }).catch(() => {});

      // ✅ Fire process-recording — don't await (Whisper runs in background)
      // MeetingDetail polls every 10s so transcript appears when Whisper finishes
      fetch("https://smart-meeting-assistant-olcl.onrender.com/api/process-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: mid, userName }),
      }).catch(() => {});

      cleanupAndNavigate();
    } catch (err) {
      console.error("❌ Failed to end meeting:", err);
      cleanupAndNavigate();
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !globalSocket) return;
    const msg = {
      id: Date.now(),
      userName,
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, msg]);
    globalSocket.emit("chat-message", {
      meetingId,
      message: chatInput.trim(),
      userName,
    });
    setChatInput("");
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/meeting/${meetingId}`,
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const totalParticipants = peers.length + 1;
  const getGridCols = () => {
    if (totalParticipants === 1) return "grid-cols-1";
    if (totalParticipants === 2) return "grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    if (totalParticipants <= 6) return "grid-cols-3";
    return "grid-cols-4";
  };

  const selectedLangObj =
    LANGUAGES.find((l) => l.deepgramCode === transcriptionLanguage) ||
    LANGUAGES[0];

  if (isConnecting) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Connecting to meeting...</p>
          <p className="text-gray-400 text-sm mt-2">
            Please allow camera and microphone
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Connection Error
          </h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-6 py-3 flex items-center justify-between relative z-50"
        style={{ overflow: "visible" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">
              {meeting?.title || "Meeting Room"}
            </h1>
            <p className="text-gray-400 text-xs">
              {totalParticipants} participant
              {totalParticipants !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector
            selectedCode={transcriptionLanguage}
            onChange={handleLanguageChange}
            disabled={false}
            label="Speak:"
          />

          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-xs font-medium hidden md:inline">
              →
            </span>
            <select
              id="translate-target-select"
              value={translateTarget}
              onChange={(e) => handleTranslateTargetChange(e.target.value)}
              className={`bg-gray-700 border text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm ${
                transcriptionLanguage === translateTarget
                  ? "border-gray-600 opacity-60"
                  : "border-blue-500"
              }`}
              title="Translate live transcript to..."
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.deepgramCode} value={lang.deepgramCode}>
                  {lang.flag} {lang.label}
                  {lang.deepgramCode === transcriptionLanguage ? " (same)" : ""}
                </option>
              ))}
            </select>
            {transcriptionLanguage !== translateTarget && (
              <span className="text-blue-400 text-xs hidden md:inline">
                translating
              </span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-gray-300">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            {userName}
          </div>

          <button
            onClick={copyMeetingLink}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
          >
            {copiedLink ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-auto relative">
          <LiveSubtitles
            partialText={partialText}
            liveTranscript={liveTranscript}
            liveTranslations={liveTranslations}
            isEnabled={isLiveTranscriptionEnabled}
          />
          <div className={`grid ${getGridCols()} gap-3 h-full auto-rows-fr`}>
            <VideoTile
              stream={localStream}
              userName={userName}
              isLocal={true}
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
            />
            {peers.map((peer) => (
              <VideoTile
                key={peer.socketId}
                stream={peer.stream}
                userName={peer.userName}
                isLocal={false}
                isAudioEnabled={peer.isAudioEnabled}
                isVideoEnabled={peer.isVideoEnabled}
              />
            ))}
          </div>
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="flex border-b border-gray-800">
              <button className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gray-800 border-b-2 border-blue-500">
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Chat
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {msg.userName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-white">
                          {msg.userName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-gray-800"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send a message..."
                  className="flex-1 bg-gray-800 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white p-2.5 rounded-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transcript panel */}
        {showTranscript && (
          <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Live Transcription
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedLangObj.flag} {selectedLangObj.label}
                </p>
              </div>
              <button
                onClick={
                  isLiveTranscriptionEnabled
                    ? stopLiveTranscription
                    : startLiveTranscription
                }
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  isLiveTranscriptionEnabled
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isLiveTranscriptionEnabled ? "Pause" : "Resume"}
              </button>
            </div>

            {isLiveTranscriptionEnabled && (
              <div className="px-4 py-3 border-b border-gray-800">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div
                    className={`w-2 h-2 rounded-full ${isTranscribing ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
                  />
                  <span>
                    {isTranscribing ? "Transcribing..." : "Listening"}
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4">
              <div className="live-transcript-content bg-gray-800/50 rounded-lg p-4 max-h-full overflow-y-auto">
                {liveTranscript.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      {isLiveTranscriptionEnabled
                        ? "Waiting for speech..."
                        : "Enable live transcription to see text in real-time"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {liveTranscript.map((segment, idx) => {
                      const translation = liveTranslations[segment.text];
                      return (
                        <div key={segment.id} className="transcript-segment">
                          <div className="flex items-start gap-3 p-2 rounded hover:bg-gray-700/30 transition-colors">
                            <div className="flex items-center gap-2 min-w-[80px]">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {userName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-purple-400 text-xs font-medium truncate">
                                {userName}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-100 text-base leading-relaxed">
                                {segment.text}
                                {idx === liveTranscript.length - 1 &&
                                  isTranscribing && (
                                    <span className="inline-flex ml-2">
                                      <span className="animate-pulse text-blue-400">
                                        ●
                                      </span>
                                    </span>
                                  )}
                              </p>
                              {translation && translation !== segment.text && (
                                <p className="text-blue-300 text-sm italic mt-1 leading-relaxed opacity-90">
                                  🌐 {translation}
                                </p>
                              )}
                              {segment.language &&
                                segment.language !== "auto" &&
                                segment.language !== "en" && (
                                  <span className="text-xs text-gray-500 mt-0.5 block">
                                    {LANGUAGES.find(
                                      (l) =>
                                        l.deepgramCode === segment.language,
                                    )?.flag || "🌐"}{" "}
                                    {LANGUAGES.find(
                                      (l) =>
                                        l.deepgramCode === segment.language,
                                    )?.label || segment.language}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls bar ────────────────────────────────────────────────────── */}
      <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full shadow-lg ${isAudioEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"}`}
            >
              {isAudioEnabled ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full shadow-lg ${isVideoEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"}`}
            >
              {isVideoEnabled ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={handleEndMeeting}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              End Meeting
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-3 rounded-lg ${showChat ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`p-3 rounded-lg ${showTranscript ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"}`}
              title="Live Transcription"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={`relative p-3 rounded-lg ${showParticipants ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              <Users className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalParticipants}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;







