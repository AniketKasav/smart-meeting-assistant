// frontend/src/pages/MeetingDetail.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Download,
  Clock,
  Users,
  Calendar,
  FileText,
  Share2,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Loader2,
  Video,
  UserCircle,
  PieChart,
  RefreshCw,
  Globe,
  ChevronDown,
  Languages,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { meetingsAPI } from "../services/api";
import MeetingSummary from "../components/MeetingSummary";
import ExportModal from "../components/ExportModal";
import ShareModal from "../components/ShareModal";
import AudioPlayer from "../components/AudioPlayer";
import { useAuth } from "../contexts/AuthContext";

// ─── All supported translation languages ─────────────────────────────────────
const TRANSLATION_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "te", name: "Telugu", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", flag: "🇮🇳" },
  { code: "pa", name: "Punjabi", flag: "🇮🇳" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "id", name: "Indonesian", flag: "🇮🇩" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
];

// ─── Translation Language Selector ───────────────────────────────────────────
const TranslationSelector = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected =
    TRANSLATION_LANGUAGES.find((l) => l.code === value) ||
    TRANSLATION_LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-sm text-slate-200 transition-colors min-w-[160px]"
      >
        <span className="text-base">{selected.flag}</span>
        <span className="flex-1 text-left">{selected.name}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800">
            <p className="text-xs text-slate-400 font-medium">
              Translate to...
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {TRANSLATION_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onChange(lang.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  lang.code === value
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.name}</span>
                {lang.code === value && (
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MeetingDetail = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const { user, getToken } = useAuth();

  const [meeting, setMeeting] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  // AI Summary states
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Speaker diarization states
  const [runningDiarization, setRunningDiarization] = useState(false);
  const [showSpeakerAnalytics, setShowSpeakerAnalytics] = useState(false);
  const [speakerNames, setSpeakerNames] = useState({});
  const [editingSpeaker, setEditingSpeaker] = useState(null);

  // ── Translation states ──────────────────────────────────────────────────────
  const [translationLanguage, setTranslationLanguage] = useState("en");
  const [translatedTranscripts, setTranslatedTranscripts] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  // Cache: { "hi": [...], "fr": [...] }
  const translationCache = useRef({});

  const isHost = meeting?.host?.userId === user?.userId;

  // ── Deduplicate & merge transcripts by userName ─────────────────────────────
  const mergedTranscripts = React.useMemo(() => {
    if (transcripts.length === 0) return [];

    const byUser = {};
    transcripts.forEach((t) => {
      const key = t.userName || "Unknown";
      if (!byUser[key]) {
        byUser[key] = t;
      } else {
        const existing = byUser[key];
        // Prefer live/web-speech segments (no audioPath) over Whisper (has audioPath)
        // Live segments have correct text; Whisper garbles Indian languages
        const existingIsWhisper = !!existing.audioPath;
        const newIsWhisper = !!t.audioPath;

        if (existingIsWhisper && !newIsWhisper) {
          // New one is live — prefer it
          byUser[key] = t;
        } else if (!existingIsWhisper && newIsWhisper) {
          // Existing is live — keep it
          // do nothing
        } else {
          // Both same type — keep longer fullText
          const existingLen = (existing.fullText || "").length;
          const newLen = (t.fullText || "").length;
          if (newLen > existingLen) byUser[key] = t;
        }
      }
    });

    return Object.values(byUser);
  }, [transcripts]);

  useEffect(() => {
    if (!meetingId) return;

    let cancelled = false;
    let intervalId = null;

    const fetchData = async ({ withLoading = false } = {}) => {
      try {
        if (withLoading) setLoading(true);
        const response = await meetingsAPI.getMeeting(meetingId);
        if (!response?.data?.success || cancelled) return false;

        setMeeting(response.data.meeting);
        const nextTranscripts = response.data.transcripts || [];
        setTranscripts(nextTranscripts);
        setEditedTitle(response.data.meeting?.title || "");
        return nextTranscripts.length > 0;
      } catch (err) {
        if (!cancelled) {
          console.error("❌ Failed to fetch meeting:", err);
          setError("Failed to load meeting details");
        }
        return false;
      } finally {
        if (withLoading && !cancelled) setLoading(false);
      }
    };

    fetchData({ withLoading: true });

    // Poll every 10s while transcript is missing (Whisper is still processing)
    intervalId = setInterval(async () => {
      const hasTranscripts = await fetchData();
      if (hasTranscripts && intervalId) {
        clearInterval(intervalId);
      }
    }, 10000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [meetingId]);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);
      const response = await meetingsAPI.getMeeting(meetingId);
      setMeeting(response.data.meeting);
      setTranscripts(response.data.transcripts || []);
      setEditedTitle(response.data.meeting.title);
    } catch (err) {
      console.error("❌ Failed to fetch meeting:", err);
      setError("Failed to load meeting details");
    } finally {
      setLoading(false);
    }
  };

  // ── Translation handler ─────────────────────────────────────────────────────
  const handleTranslate = async () => {
    if (!translationLanguage) return;

    // Check cache first
    if (translationCache.current[translationLanguage]) {
      setTranslatedTranscripts(translationCache.current[translationLanguage]);
      setShowTranslation(true);
      return;
    }

    // Check if it's the original language
    const originalLang = (mergedTranscripts[0]?.language || "en").split("-")[0];
    if (originalLang === translationLanguage) {
      setTranslatedTranscripts(mergedTranscripts);
      setShowTranslation(true);
      return;
    }

    try {
      setIsTranslating(true);
      setTranslationError(null);

      const token = getToken();
      const response = await fetch(
        `https://smart-meeting-assistant-olcl.onrender.com/api/translate/${meetingId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ targetLanguage: translationLanguage }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Translation failed");
      }

      const data = await response.json();

      // Cache the result
      translationCache.current[translationLanguage] = data.transcripts;
      setTranslatedTranscripts(data.transcripts);
      setShowTranslation(true);
    } catch (err) {
      console.error("❌ Translation error:", err);
      setTranslationError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCloseTranslation = () => {
    setShowTranslation(false);
    setTranslatedTranscripts(null);
  };

  // Download translated transcript
  const downloadTranslatedTranscript = () => {
    if (!translatedTranscripts) return;
    const langName =
      TRANSLATION_LANGUAGES.find((l) => l.code === translationLanguage)?.name ||
      translationLanguage;

    const text = translatedTranscripts
      .map((t) => {
        const header = `=== ${t.userName} ===\n\n`;
        const segments = t.segments
          .map(
            (s) =>
              `[${formatTime(s.start)} - ${formatTime(s.end)}]\n${s.text}\n`,
          )
          .join("\n");
        return header + segments;
      })
      .join("\n\n");

    const blob = new Blob([`[Translated to ${langName}]\n\n${text}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${meetingId}-${translationLanguage}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Speaker name auto-mapping ───────────────────────────────────────────────
  useEffect(() => {
    if (!meeting || mergedTranscripts.length === 0) return;
    const orderedNames = [];
    if (meeting.host?.name) orderedNames.push(meeting.host.name);
    meeting.participants?.forEach((p) => {
      if (
        p.name &&
        p.name !== meeting.host?.name &&
        !orderedNames.includes(p.name)
      )
        orderedNames.push(p.name);
    });
    const speakerLabels = new Set();
    mergedTranscripts.forEach((t) =>
      t.segments?.forEach((seg) => {
        if (seg.speaker && seg.speaker !== "Unknown")
          speakerLabels.add(seg.speaker);
      }),
    );
    const sortedLabels = [...speakerLabels].sort();
    const autoMap = {};
    sortedLabels.forEach((label, idx) => {
      if (orderedNames[idx]) autoMap[label] = orderedNames[idx];
    });
    setSpeakerNames((prev) => (Object.keys(prev).length > 0 ? prev : autoMap));
  }, [meeting, mergedTranscripts]);

  // ── Audio player ────────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    if (mergedTranscripts.length === 0) return;
    const allSegments = mergedTranscripts.flatMap((t) =>
      t.segments.map((s) => ({ ...s, userName: t.userName })),
    );
    const current = allSegments.find(
      (seg) => currentTime >= seg.start && currentTime <= seg.end,
    );
    setActiveSegment(current);
  }, [currentTime, mergedTranscripts]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const handleUpdateTitle = async () => {
    if (!isHost) return;
    try {
      await meetingsAPI.updateMeeting(meetingId, { title: editedTitle });
      setMeeting({ ...meeting, title: editedTitle });
      setIsEditing(false);
    } catch (err) {
      alert("Failed to update title");
    }
  };

  const handleDelete = async () => {
    if (!isHost) return;
    if (!confirm("Delete this meeting? This cannot be undone.")) return;
    try {
      await meetingsAPI.deleteMeeting(meetingId);
      navigate("/dashboard");
    } catch (err) {
      alert("Failed to delete meeting");
    }
  };

  const downloadTranscript = () => {
    if (mergedTranscripts.length === 0) return;
    const text = mergedTranscripts
      .map((t) => {
        const header = `=== ${t.userName} ===\n\n`;
        const segments = t.segments
          .map(
            (s) =>
              `[${formatTime(s.start)} - ${formatTime(s.end)}]\n${s.text}\n`,
          )
          .join("\n");
        return header + segments;
      })
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${meetingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateSummary = async () => {
    if (!isHost) return;
    try {
      setGeneratingSummary(true);
      setSummaryError(null);
      const response = await meetingsAPI.generateSummary(meetingId);
      setMeeting((prev) => ({ ...prev, summary: response.data.summary }));
    } catch (err) {
      setSummaryError(
        err.response?.data?.message || "Failed to generate summary",
      );
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleRegenerateSummary = async () => {
    if (!isHost) return;
    const customPrompt = prompt("Enter custom instructions (optional):");
    try {
      setGeneratingSummary(true);
      setSummaryError(null);
      const response = await meetingsAPI.regenerateSummary(
        meetingId,
        customPrompt,
      );
      setMeeting((prev) => ({ ...prev, summary: response.data.summary }));
    } catch (err) {
      setSummaryError("Failed to regenerate summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleDeleteSummary = async () => {
    if (!isHost) return;
    if (!confirm("Delete this summary? You can regenerate it later.")) return;
    try {
      await meetingsAPI.deleteSummary(meetingId);
      setMeeting((prev) => ({ ...prev, summary: undefined }));
    } catch (err) {
      alert("Failed to delete summary");
    }
  };

  const handleRunDiarization = async () => {
    if (!isHost) return;
    try {
      setRunningDiarization(true);
      const response = await fetch(
        `https://smart-meeting-assistant-olcl.onrender.com/api/diarization/${meeting.meetingId}/run`,
        { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Diarization failed");
      }
      await fetchMeetingData();
      alert("✅ Speaker diarization completed!");
    } catch (err) {
      alert(`Failed to run speaker diarization: ${err.message}`);
    } finally {
      setRunningDiarization(false);
    }
  };

  const getSpeakerStats = () => {
    if (mergedTranscripts.length === 0) return [];
    const stats = {};
    mergedTranscripts.forEach((transcript) => {
      transcript.segments?.forEach((segment) => {
        const speaker = segment.speaker || "Unknown";
        if (!stats[speaker]) {
          stats[speaker] = {
            speaker,
            segments: 0,
            duration: 0,
            displayName: speakerNames[speaker] || speaker,
          };
        }
        stats[speaker].segments++;
        stats[speaker].duration += segment.end - segment.start;
      });
    });
    return Object.values(stats).sort((a, b) => b.duration - a.duration);
  };

  const updateSpeakerName = (originalSpeaker, newName) => {
    setSpeakerNames((prev) => ({ ...prev, [originalSpeaker]: newName }));
    setEditingSpeaker(null);
  };

  const handleUpdateActionItem = async (itemIndex, updates) => {
    try {
      await meetingsAPI.updateActionItem(meetingId, itemIndex, updates);
      setMeeting((prev) => {
        const newSummary = { ...prev.summary };
        newSummary.actionItems[itemIndex] = {
          ...newSummary.actionItems[itemIndex],
          ...updates,
        };
        return { ...prev, summary: newSummary };
      });
    } catch (err) {
      alert("Failed to update action item");
    }
  };

  // ── Transcript renderer (shared for original + translated) ──────────────────
  const renderTranscriptSegments = (
    transcriptList,
    isTranslatedView = false,
  ) => (
    <div className="space-y-6">
      {transcriptList.map((transcript, idx) => (
        <div key={idx}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
              {transcript.userName?.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold">{transcript.userName}</span>
            <span className="text-xs text-slate-500">
              ({transcript.segments?.length || 0} segments)
            </span>
            {isTranslatedView && transcript.originalLanguage && (
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                translated from {transcript.originalLanguage}
              </span>
            )}
          </div>

          <div className="space-y-2 pl-10">
            {transcript.segments?.map((segment, segIdx) => {
              const speaker = segment.speaker || "Unknown";
              const displayName = speakerNames[speaker] || speaker;
              const speakerIndex = getSpeakerStats().findIndex(
                (s) => s.speaker === speaker,
              );
              const gradients = [
                "from-purple-500 to-pink-500",
                "from-blue-500 to-cyan-500",
                "from-green-500 to-emerald-500",
                "from-orange-500 to-red-500",
              ];

              return (
                <div
                  key={segIdx}
                  onClick={() => !isTranslatedView && seekTo(segment.start)}
                  className={`p-3 rounded-lg transition-all ${
                    !isTranslatedView ? "cursor-pointer" : ""
                  } ${
                    !isTranslatedView &&
                    activeSegment?.start === segment.start &&
                    activeSegment?.end === segment.end
                      ? "bg-blue-500/20 border border-blue-500/50"
                      : "bg-slate-800/50 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-slate-500 font-mono mt-1 min-w-[100px]">
                      {formatTime(segment.start)} – {formatTime(segment.end)}
                    </span>

                    {speaker !== "Unknown" && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br ${gradients[speakerIndex] || gradients[3]}`}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-slate-400">
                          {displayName}
                        </span>
                      </div>
                    )}

                    <div className="flex-1">
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {segment.text}
                      </p>
                      {/* Show original text below if in translation view */}
                      {isTranslatedView && segment.originalText && (
                        <p className="text-xs text-slate-500 mt-1 italic">
                          Original: {segment.originalText}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Meeting Not Found
          </h2>
          <p className="text-slate-400 mb-6">
            {error || "This meeting does not exist"}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const audioUrl =
    mergedTranscripts?.[0]?.audioPath || meeting.transcripts?.[0]?.audioPath;
  const originalLangCode = (
    mergedTranscripts[0]?.spokenLanguage ||
    mergedTranscripts[0]?.language ||
    "en"
  ).split("-")[0];
  const originalLangName =
    TRANSLATION_LANGUAGES.find((l) => l.code === originalLangCode)?.name ||
    originalLangCode;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            {meeting.status === "in-progress" && (
              <button
                onClick={() => navigate(`/meeting/${meetingId}`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                Join Video Call
              </button>
            )}
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {isHost && (
              <button
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}
            <button
              onClick={downloadTranscript}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2"
              disabled={mergedTranscripts.length === 0}
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            {isHost && (
              <button
                onClick={handleRunDiarization}
                disabled={runningDiarization || mergedTranscripts.length === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50"
              >
                {runningDiarization ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCircle className="w-4 h-4" />
                )}
                {runningDiarization ? "Analyzing..." : "ID Speakers"}
              </button>
            )}
            {isHost && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Meeting Info Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            {isEditing && isHost ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg"
                  autoFocus
                />
                <button
                  onClick={handleUpdateTitle}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTitle(meeting.title);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-white">
                    {meeting.title}
                  </h1>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${isHost ? "bg-purple-500/20 text-purple-300" : "bg-slate-600/50 text-slate-400"}`}
                  >
                    {isHost ? "Host" : "Member"}
                  </span>
                </div>
                <p className="text-slate-400 text-sm font-mono">
                  ID: {meeting.meetingId}
                </p>
              </div>
            )}
            {!isEditing && isHost && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-slate-800 rounded-lg"
              >
                <Edit className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                icon: Calendar,
                color: "blue",
                label: "Started",
                value: meeting.startedAt
                  ? format(new Date(meeting.startedAt), "MMM dd, HH:mm")
                  : "N/A",
              },
              {
                icon: Clock,
                color: "green",
                label: "Duration",
                value: formatTime(meeting.duration || 0),
              },
              {
                icon: Users,
                color: "purple",
                label: "Participants",
                value: new Set([
                  meeting.host?.userId,
                  ...(meeting.participants?.map((p) => p.userId) || []),
                ]).size,
              },
              {
                icon: FileText,
                color: "orange",
                label: "Status",
                value: meeting.status?.replace("-", " "),
              },
            ].map(({ icon: Icon, color, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`p-2 bg-${color}-500/20 rounded-lg`}>
                  <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-medium capitalize">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <div className="mb-6">
            <AudioPlayer
              audioUrl={`https://smart-meeting-assistant-olcl.onrender.com${audioUrl}`}
              meetingTitle={meeting.title}
              duration={meeting.transcripts?.[0]?.duration || meeting.duration}
            />
          </div>
        )}

        {/* AI Summary */}
        {mergedTranscripts.length > 0 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            {!meeting.summary ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  AI Summary
                </h3>
                {isHost ? (
                  <>
                    <p className="text-slate-400 mb-6">
                      Get instant insights, action items, and key points
                    </p>
                    {summaryError && (
                      <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                        {summaryError}
                      </div>
                    )}
                    <button
                      onClick={handleGenerateSummary}
                      disabled={generatingSummary}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-semibold flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                      {generatingSummary ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate AI Summary
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <p className="text-slate-400">
                    No summary available yet. The host can generate one.
                  </p>
                )}
              </div>
            ) : (
              <MeetingSummary
                summary={meeting.summary}
                onRegenerate={isHost ? handleRegenerateSummary : undefined}
                onDelete={isHost ? handleDeleteSummary : undefined}
                onUpdateActionItem={handleUpdateActionItem}
                isRegenerating={generatingSummary}
                isHost={isHost}
              />
            )}
          </div>
        )}

        {/* Speaker Analytics */}
        {mergedTranscripts.length > 0 &&
          getSpeakerStats().length > 0 &&
          getSpeakerStats()[0].speaker !== "Unknown" && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <PieChart className="w-6 h-6 text-purple-400" />
                  Speaker Analytics
                </h2>
                <button
                  onClick={() => setShowSpeakerAnalytics(!showSpeakerAnalytics)}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  {showSpeakerAnalytics ? "Hide" : "Show"} Details
                </button>
              </div>
              {showSpeakerAnalytics && (
                <div className="space-y-4">
                  {getSpeakerStats().map((stat, idx) => {
                    const totalDuration = getSpeakerStats().reduce(
                      (sum, s) => sum + s.duration,
                      0,
                    );
                    const percentage = (
                      (stat.duration / totalDuration) *
                      100
                    ).toFixed(1);
                    const gradients = [
                      "from-purple-500 to-pink-500",
                      "from-blue-500 to-cyan-500",
                      "from-green-500 to-emerald-500",
                      "from-orange-500 to-red-500",
                    ];
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${gradients[idx] || gradients[3]}`}
                            >
                              {stat.displayName.charAt(0).toUpperCase()}
                            </div>
                            {editingSpeaker === stat.speaker ? (
                              <input
                                type="text"
                                defaultValue={stat.displayName}
                                onBlur={(e) =>
                                  updateSpeakerName(
                                    stat.speaker,
                                    e.target.value,
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    updateSpeakerName(
                                      stat.speaker,
                                      e.target.value,
                                    );
                                  if (e.key === "Escape")
                                    setEditingSpeaker(null);
                                }}
                                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm"
                                autoFocus
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {stat.displayName}
                                </span>
                                {isHost && (
                                  <button
                                    onClick={() =>
                                      setEditingSpeaker(stat.speaker)
                                    }
                                    className="text-xs text-slate-500 hover:text-slate-300"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-white">
                              {percentage}%
                            </div>
                            <div className="text-xs text-slate-400">
                              {formatTime(stat.duration)} • {stat.segments}{" "}
                              segments
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${gradients[idx] || gradients[3]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        {/* ── TRANSCRIPT + TRANSLATION ────────────────────────────────────────── */}
        {mergedTranscripts.length > 0 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            {/* Header row */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Transcript
                {originalLangCode && (
                  <span className="text-sm font-normal text-slate-400 ml-1">
                    ({originalLangName})
                  </span>
                )}
              </h2>

              {/* Translation controls */}
              <div className="flex items-center gap-3 flex-wrap">
                {showTranslation && (
                  <button
                    onClick={downloadTranslatedTranscript}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm"
                    title="Download translated transcript"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}

                <TranslationSelector
                  value={translationLanguage}
                  onChange={setTranslationLanguage}
                  disabled={isTranslating}
                />

                <button
                  onClick={
                    showTranslation ? handleCloseTranslation : handleTranslate
                  }
                  disabled={isTranslating}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    showTranslation
                      ? "bg-slate-700 hover:bg-slate-600 text-white"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                  }`}
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Translating...
                    </>
                  ) : showTranslation ? (
                    <>
                      <X className="w-4 h-4" />
                      Show Original
                    </>
                  ) : (
                    <>
                      <Languages className="w-4 h-4" />
                      Translate
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Translation error */}
            {translationError && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {translationError}
              </div>
            )}

            {/* Translation progress note */}
            {isTranslating && (
              <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-medium">
                    Translating with Ollama AI...
                  </span>
                </div>
                <p className="text-blue-400 text-xs">
                  This may take 30–90 seconds depending on transcript length.
                  Translation runs locally on your machine.
                </p>
              </div>
            )}

            {/* Translation banner */}
            {showTranslation && translatedTranscripts && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-300 text-sm">
                  <Globe className="w-4 h-4" />
                  <span>
                    Showing translation:{" "}
                    <strong>
                      {
                        TRANSLATION_LANGUAGES.find(
                          (l) => l.code === translationLanguage,
                        )?.flag
                      }{" "}
                      {
                        TRANSLATION_LANGUAGES.find(
                          (l) => l.code === translationLanguage,
                        )?.name
                      }
                    </strong>
                    {" · "}Original text shown in grey below each line
                  </span>
                </div>
                <button
                  onClick={handleCloseTranslation}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Transcript content */}
            {showTranslation && translatedTranscripts
              ? renderTranscriptSegments(translatedTranscripts, true)
              : renderTranscriptSegments(mergedTranscripts, false)}
          </div>
        )}

        {/* Empty transcript state */}
        {mergedTranscripts.length === 0 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Transcript
            </h2>
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No transcript available yet</p>
              <p className="text-sm text-slate-500 mt-2">
                {meeting.status === "in-progress"
                  ? "Stop the recording to generate transcript"
                  : "Transcript will appear here after processing"}
              </p>
            </div>
          </div>
        )}
      </div>

      {showExportModal && (
        <ExportModal
          meeting={meeting}
          isHost={isHost}
          onClose={() => setShowExportModal(false)}
        />
      )}
      {showShareModal && (
        <ShareModal
          meeting={meeting}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default MeetingDetail;

