// frontend/src/pages/Reports.jsx
import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  TableProperties,
  BarChart3,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Filter,
  Search,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  FileDown,
  Share2,
  Eye,
  Loader2,
  RefreshCw,
  FileJson,
  AlignLeft,
  X,
  Copy,
  CheckCheck,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { meetingsAPI, exportAPI, analyticsAPI } from "../services/api";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  blue: "#3b82f6",
  purple: "#8b5cf6",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  cyan: "#06b6d4",
  pink: "#ec4899",
};

const AVATAR_COLORS = [
  C.blue,
  C.purple,
  C.green,
  C.amber,
  C.cyan,
  C.pink,
  C.red,
];
const avatarColor = (name = "") =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const fmt = (s) => {
  if (!s && s !== 0) return "—";
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = "blue" }) {
  const colors = {
    blue: [C.blue, "#1d4ed822"],
    purple: [C.purple, "#6d28d922"],
    green: [C.green, "#05966922"],
    amber: [C.amber, "#d9770622"],
  };
  const [color, bg] = colors[accent] || colors.blue;
  return (
    <div
      style={{
        background: "#0a0f1e",
        border: "1px solid #1e293b",
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#334155")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e293b")}
    >
      <div
        style={{ padding: 10, borderRadius: 12, background: bg, flexShrink: 0 }}
      >
        <Icon size={18} color={color} />
      </div>
      <div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#f8fafc",
            letterSpacing: "-0.5px",
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Toast({ message, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: "12px 18px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        animation: "slideUp 0.2s ease",
      }}
    >
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <CheckCheck size={16} color={C.green} />
      <span style={{ fontSize: 13, color: "#f1f5f9" }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "#64748b",
          cursor: "pointer",
          marginLeft: 8,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ShareModal({ meeting, onClose, onToast }) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState("24");

  const generate = async () => {
    setLoading(true);
    try {
      const res = await exportAPI.generateShareLink(meeting.meetingId, {
        expiresIn: parseInt(expiresIn),
      });
      setShareUrl(res.data.data.shareLink);
    } catch {
      // fallback to frontend share URL
      setShareUrl(`${window.location.origin}/meetings/${meeting.meetingId}`);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onToast("Link copied to clipboard!");
  };

  const nativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: meeting.title || "Meeting Report",
        url: shareUrl,
      });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0a0f1e",
          border: "1px solid #1e293b",
          borderRadius: 20,
          padding: 28,
          width: 440,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
            Share Meeting
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "#1e293b",
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div
          style={{
            background: "#0f172a",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            border: "1px solid #1e293b",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
            {meeting.title || "Untitled Meeting"}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
            {fmtDate(meeting.startedAt)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 12,
              color: "#64748b",
              display: "block",
              marginBottom: 6,
            }}
          >
            Link expires in
          </label>
          <select
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            style={{
              width: "100%",
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 8,
              color: "#94a3b8",
              padding: "8px 12px",
              fontSize: 13,
            }}
          >
            <option value="24">24 hours</option>
            <option value="72">3 days</option>
            <option value="168">7 days</option>
            <option value="">Never</option>
          </select>
        </div>

        {!shareUrl ? (
          <button
            onClick={generate}
            disabled={loading}
            style={{
              width: "100%",
              background: C.purple,
              border: "none",
              borderRadius: 10,
              color: "#fff",
              padding: "10px 0",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <Loader2
                size={16}
                style={{ animation: "spin 0.8s linear infinite" }}
              />
            ) : (
              <Share2 size={16} />
            )}
            {loading ? "Generating…" : "Generate Share Link"}
          </button>
        ) : (
          <div>
            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 12,
                color: "#64748b",
                wordBreak: "break-all",
                marginBottom: 12,
              }}
            >
              {shareUrl}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={copy}
                style={{
                  flex: 1,
                  background: copied ? C.green : "#1e293b",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {copied ? <CheckCheck size={14} /> : <Copy size={14} />}{" "}
                {copied ? "Copied!" : "Copy"}
              </button>
              {navigator.share && (
                <button
                  onClick={nativeShare}
                  style={{
                    flex: 1,
                    background: C.purple,
                    border: "none",
                    borderRadius: 10,
                    color: "#fff",
                    padding: "10px 0",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Share2 size={14} /> Share via…
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tooltip style for recharts ─────────────────────────────────────────────────
const ttStyle = {
  contentStyle: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 10,
    color: "#f1f5f9",
    fontSize: 13,
  },
  labelStyle: { color: "#94a3b8" },
};

// ── Main Component ─────────────────────────────────────────────────────────────
function Reports() {
  const [activeTab, setActiveTab] = useState("meetings");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [shareModal, setShareModal] = useState(null);

  // Real data
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [actionItems, setActionItems] = useState(null);
  const [sentimentTrends, setSentimentTrends] = useState([]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch real meetings from backend ─────────────────────────────────────────
  // Source: GET /api/meetings  →  meetingsAPI.getAllMeetings()
  useEffect(() => {
    meetingsAPI
      .getAllMeetings()
      .then((res) => {
        const all = res.data.meetings || [];
        setMeetings(all.filter((m) => m.status === "completed"));
      })
      .catch((err) => {
        console.error("Failed to load meetings:", err);
        setMeetings([]);
      })
      .finally(() => setLoadingMeetings(false));
  }, []);

  // ── Fetch analytics from backend ──────────────────────────────────────────────
  // Sources:
  //   GET /api/analytics/overview        → analyticsAPI.getOverview()
  //   GET /api/analytics/action-items    → analyticsAPI.getActionItems()
  //   GET /api/analytics/sentiment-trends → analyticsAPI.getSentimentTrends()
  useEffect(() => {
    Promise.all([
      analyticsAPI.getOverview(),
      analyticsAPI.getActionItems(),
      analyticsAPI.getSentimentTrends(30),
    ])
      .then(([ovRes, actRes, sentRes]) => {
        setAnalytics(ovRes.data.data);
        setActionItems(actRes.data.data);
        setSentimentTrends(sentRes.data.data || []);
      })
      .catch((err) => console.error("Analytics fetch failed:", err))
      .finally(() => setLoadingAnalytics(false));
  }, []);

  // ── Download helpers ──────────────────────────────────────────────────────────
  // PDF Source: GET /api/export/:meetingId/pdf   → exportAPI.exportPDF()
  const handleDownload = async (type, meeting) => {
    const key = `${type}-${meeting.meetingId}`;
    setExporting(key);
    try {
      let url, filename;
      const token = localStorage.getItem("accessToken");
      const baseURL = import.meta.env.VITE_API_URL;

      if (type === "pdf") {
        // GET /api/export/:meetingId/pdf?includeTranscript=true
        url = `${baseURL}/api/export/${meeting.meetingId}/pdf?includeTranscript=true`;
        filename = `${meeting.title || "meeting"}-report.pdf`;
      } else if (type === "txt") {
        // GET /api/export/:meetingId/txt
        url = `${baseURL}/api/export/${meeting.meetingId}/txt`;
        filename = `${meeting.title || "meeting"}-transcript.txt`;
      } else if (type === "json") {
        // GET /api/export/:meetingId/json
        url = `${baseURL}/api/export/${meeting.meetingId}/json`;
        filename = `${meeting.title || "meeting"}-data.json`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objUrl);
      showToast(`${type.toUpperCase()} downloaded successfully!`);
    } catch {
      showToast("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  // ── CSV export (built in browser from meetings data, no backend needed) ───────
  const handleCSVExport = () => {
    setExporting("csv");
    try {
      // Build CSV from real meetings data fetched from /api/meetings
      const headers = [
        "Title",
        "Date",
        "Duration",
        "Participants",
        "Status",
        "Sentiment",
      ];
      const rows = meetings.map((m) => [
        `"${(m.title || "Untitled").replace(/"/g, '""')}"`,
        fmtDate(m.startedAt),
        fmt(m.duration),
        m.participants?.length || 0,
        m.status,
        m.summary?.sentiment || "N/A",
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meetings-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("CSV exported successfully!");
    } catch {
      showToast("CSV export failed.");
    } finally {
      setTimeout(() => setExporting(null), 600);
    }
  };

  // ── Filtered meetings ─────────────────────────────────────────────────────────
  const filtered = meetings.filter((m) =>
    (m.title || "").toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = [
    { id: "meetings", label: "Meeting Reports", icon: FileText },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  // ── Sentiment pie data ────────────────────────────────────────────────────────
  const sentimentPie = analytics?.sentiment
    ? [
        {
          name: "Positive",
          value: analytics.sentiment.positive || 0,
          color: C.green,
        },
        {
          name: "Neutral",
          value: analytics.sentiment.neutral || 0,
          color: C.amber,
        },
        {
          name: "Negative",
          value: analytics.sentiment.negative || 0,
          color: C.red,
        },
      ].filter((d) => d.value > 0)
    : [];

  // ── Action items for CSV (from analytics/action-items endpoint) ───────────────
  const taskStatusData = actionItems
    ? [
        {
          label: "Open",
          count: actionItems.byStatus?.open || 0,
          color: C.blue,
          pct: actionItems.total
            ? Math.round(
                ((actionItems.byStatus?.open || 0) / actionItems.total) * 100,
              )
            : 0,
        },
        {
          label: "In Progress",
          count: actionItems.byStatus?.["in-progress"] || 0,
          color: C.amber,
          pct: actionItems.total
            ? Math.round(
                ((actionItems.byStatus?.["in-progress"] || 0) /
                  actionItems.total) *
                  100,
              )
            : 0,
        },
        {
          label: "Completed",
          count: actionItems.byStatus?.completed || 0,
          color: C.green,
          pct: actionItems.total
            ? Math.round(
                ((actionItems.byStatus?.completed || 0) / actionItems.total) *
                  100,
              )
            : 0,
        },
      ]
    : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#f1f5f9",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        paddingBottom: 40,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {shareModal && (
        <ShareModal
          meeting={shareModal}
          onClose={() => setShareModal(null)}
          onToast={showToast}
        />
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.blue,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              Reports & Export
            </p>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#f8fafc",
                letterSpacing: "-0.5px",
              }}
            >
              Data & Insights
            </h2>
            <p style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
              Export meeting reports, transcripts, and analytics — all connected
              to your real data.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCSVExport}
              disabled={exporting === "csv" || loadingMeetings}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 16px",
                borderRadius: 10,
                background: "#0f172a",
                border: "1px solid #1e293b",
                color: "#94a3b8",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <FileSpreadsheet size={14} />
              {exporting === "csv" ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>

        {/* ── Stat Cards — data from GET /api/analytics/overview ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <StatCard
            icon={FileText}
            label="Completed Meetings"
            value={loadingMeetings ? "…" : meetings.length}
            sub="From your account"
            accent="blue"
          />
          <StatCard
            icon={CheckCircle2}
            label="Total Action Items"
            value={loadingAnalytics ? "…" : actionItems?.total || 0}
            sub={`${actionItems?.byStatus?.completed || 0} completed`}
            accent="green"
          />
          <StatCard
            icon={Users}
            label="Completion Rate"
            value={
              loadingAnalytics
                ? "…"
                : `${analytics?.actionItems?.completionRate || 0}%`
            }
            sub="Tasks closed"
            accent="amber"
          />
          <StatCard
            icon={TrendingUp}
            label="Total Duration"
            value={loadingAnalytics ? "…" : fmt(analytics?.totalDuration || 0)}
            sub={`Avg ${fmt(analytics?.avgDuration || 0)}`}
            accent="purple"
          />
        </div>

        {/* ── Tabs ── */}
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "#0a0f1e",
            border: "1px solid #1e293b",
            borderRadius: 12,
            padding: 4,
            width: "fit-content",
            marginBottom: 20,
          }}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.15s",
                background: activeTab === id ? C.blue : "transparent",
                color: activeTab === id ? "#fff" : "#64748b",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ════════ MEETINGS TAB ════════ */}
        {activeTab === "meetings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Search */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#475569",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search meetings…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#0a0f1e",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                    color: "#f1f5f9",
                    padding: "9px 12px 9px 36px",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <span style={{ fontSize: 12, color: "#334155" }}>
                {filtered.length} meeting{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Loading */}
            {loadingMeetings && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 48,
                  gap: 12,
                  color: "#475569",
                }}
              >
                <Loader2
                  size={20}
                  style={{ animation: "spin 0.8s linear infinite" }}
                />
                <span style={{ fontSize: 13 }}>
                  Loading meetings from backend…
                </span>
              </div>
            )}

            {/* Empty */}
            {!loadingMeetings && filtered.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: 48,
                  color: "#334155",
                  fontSize: 13,
                }}
              >
                {meetings.length === 0
                  ? "No completed meetings found in your account."
                  : "No meetings match your search."}
              </div>
            )}

            {/* Meeting cards — data from GET /api/meetings */}
            {filtered.map((m) => (
              <div
                key={m._id}
                style={{
                  background: "#0a0f1e",
                  border: "1px solid #1e293b",
                  borderRadius: 16,
                  padding: "18px 20px",
                  transition: "border-color 0.2s",
                  animation: "fadeIn 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#334155")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#1e293b")
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Left info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        marginBottom: 8,
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${avatarColor(m.title)}, ${avatarColor(m.title)}88)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        {(m.title || "U")[0].toUpperCase()}
                      </div>
                      <h3
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#f1f5f9",
                        }}
                      >
                        {m.title || "Untitled Meeting"}
                      </h3>
                      {/* Sentiment badge */}
                      {m.summary?.sentiment && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontWeight: 700,
                            background:
                              m.summary.sentiment === "positive"
                                ? C.green + "22"
                                : m.summary.sentiment === "negative"
                                  ? C.red + "22"
                                  : C.amber + "22",
                            color:
                              m.summary.sentiment === "positive"
                                ? C.green
                                : m.summary.sentiment === "negative"
                                  ? C.red
                                  : C.amber,
                          }}
                        >
                          {m.summary.sentiment}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          color: "#475569",
                        }}
                      >
                        <Calendar size={11} />
                        {fmtDate(m.startedAt)}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          color: "#475569",
                        }}
                      >
                        <Clock size={11} />
                        {fmt(m.duration)}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          color: "#475569",
                        }}
                      >
                        <Users size={11} />
                        {m.participants?.length || 0} participants
                      </span>
                      {m.transcripts?.length > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: C.green + "18",
                            color: C.green,
                          }}
                        >
                          ✓ Transcript
                        </span>
                      )}
                      {m.summary?.text && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: C.blue + "18",
                            color: C.blue,
                          }}
                        >
                          ✓ Summary
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Preview — opens /meetings/:meetingId */}
                    <button
                      onClick={() =>
                        window.open(`/meetings/${m.meetingId}`, "_blank")
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "7px 12px",
                        borderRadius: 8,
                        background: "#0f172a",
                        border: "1px solid #1e293b",
                        color: "#94a3b8",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <Eye size={12} /> Preview
                    </button>

                    {/* Share — POST /api/export/:meetingId/share */}
                    <button
                      onClick={() => setShareModal(m)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "7px 12px",
                        borderRadius: 8,
                        background: "#0f172a",
                        border: `1px solid ${C.purple}40`,
                        color: C.purple,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <Share2 size={12} /> Share
                    </button>

                    {/* TXT — GET /api/export/:meetingId/txt */}
                    <button
                      onClick={() => handleDownload("txt", m)}
                      disabled={!!exporting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "7px 12px",
                        borderRadius: 8,
                        background: "#0f172a",
                        border: `1px solid ${C.cyan}40`,
                        color: C.cyan,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <AlignLeft size={12} />
                      {exporting === `txt-${m.meetingId}` ? "…" : "TXT"}
                    </button>

                    {/* JSON — GET /api/export/:meetingId/json */}
                    <button
                      onClick={() => handleDownload("json", m)}
                      disabled={!!exporting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "7px 12px",
                        borderRadius: 8,
                        background: "#0f172a",
                        border: `1px solid ${C.amber}40`,
                        color: C.amber,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <FileJson size={12} />
                      {exporting === `json-${m.meetingId}` ? "…" : "JSON"}
                    </button>

                    {/* PDF — GET /api/export/:meetingId/pdf?includeTranscript=true */}
                    <button
                      onClick={() => handleDownload("pdf", m)}
                      disabled={!!exporting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "7px 12px",
                        borderRadius: 8,
                        background: C.blue,
                        border: "none",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <FileDown size={12} />
                      {exporting === `pdf-${m.meetingId}` ? "…" : "PDF"}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Bulk CSV export row */}
            {!loadingMeetings && meetings.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  paddingTop: 4,
                }}
              >
                <button
                  onClick={handleCSVExport}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "1px dashed #334155",
                    background: "transparent",
                    color: "#475569",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <Download size={13} /> Export all {meetings.length} meetings
                  as CSV
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════ ANALYTICS TAB ════════ */}
        {activeTab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {loadingAnalytics && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 60,
                  gap: 12,
                  color: "#475569",
                }}
              >
                <Loader2
                  size={20}
                  style={{ animation: "spin 0.8s linear infinite" }}
                />
                <span style={{ fontSize: 13 }}>
                  Loading analytics from backend…
                </span>
              </div>
            )}

            {!loadingAnalytics && (
              <>
                {/* Row 1: Sentiment pie + Task breakdown */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 18,
                  }}
                >
                  {/* Sentiment — from GET /api/analytics/overview */}
                  <div
                    style={{
                      background: "#0a0f1e",
                      border: "1px solid #1e293b",
                      borderRadius: 16,
                      padding: 24,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#f1f5f9",
                        marginBottom: 20,
                      }}
                    >
                      Meeting Sentiment
                    </h3>
                    {sentimentPie.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={sentimentPie}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={40}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={{ stroke: "#334155" }}
                          >
                            {sentimentPie.map((d, i) => (
                              <Cell key={i} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip {...ttStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 220,
                          color: "#334155",
                          fontSize: 13,
                        }}
                      >
                        No sentiment data yet
                      </div>
                    )}
                  </div>

                  {/* Task breakdown — from GET /api/analytics/action-items */}
                  <div
                    style={{
                      background: "#0a0f1e",
                      border: "1px solid #1e293b",
                      borderRadius: 16,
                      padding: 24,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#f1f5f9",
                        marginBottom: 20,
                      }}
                    >
                      Action Items Breakdown
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 10,
                        marginBottom: 20,
                      }}
                    >
                      {taskStatusData.map(({ label, count, color }) => (
                        <div
                          key={label}
                          style={{
                            background: "#0f172a",
                            borderRadius: 10,
                            padding: "14px 10px",
                            textAlign: "center",
                            border: `1px solid ${color}22`,
                          }}
                        >
                          <div style={{ fontSize: 26, fontWeight: 800, color }}>
                            {count}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#475569",
                              marginTop: 4,
                            }}
                          >
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                    {taskStatusData.map(({ label, color, pct }) => (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ color: "#64748b" }}>{label}</span>
                          <span style={{ color, fontWeight: 700 }}>{pct}%</span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            background: "#1e293b",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: color,
                              borderRadius: 3,
                              transition: "width 0.8s ease",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {actionItems?.overdue > 0 && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "8px 12px",
                          background: C.red + "15",
                          border: `1px solid ${C.red}30`,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <AlertCircle size={13} color={C.red} />
                        <span style={{ fontSize: 12, color: C.red }}>
                          {actionItems.overdue} overdue items
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Sentiment trend — from GET /api/analytics/sentiment-trends */}
                <div
                  style={{
                    background: "#0a0f1e",
                    border: "1px solid #1e293b",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#f1f5f9",
                      marginBottom: 20,
                    }}
                  >
                    Sentiment Trends Over Time
                  </h3>
                  {sentimentTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={sentimentTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                        <XAxis
                          dataKey="date"
                          stroke="#334155"
                          tick={{ fill: "#475569", fontSize: 11 }}
                        />
                        <YAxis
                          stroke="#334155"
                          tick={{ fill: "#475569", fontSize: 11 }}
                        />
                        <Tooltip {...ttStyle} />
                        <Legend
                          wrapperStyle={{ fontSize: 12, color: "#64748b" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="positive"
                          stroke={C.green}
                          strokeWidth={2}
                          name="Positive"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="neutral"
                          stroke={C.amber}
                          strokeWidth={2}
                          name="Neutral"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="negative"
                          stroke={C.red}
                          strokeWidth={2}
                          name="Negative"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 220,
                        color: "#334155",
                        fontSize: 13,
                      }}
                    >
                      No trend data yet — complete more meetings to see trends.
                    </div>
                  )}
                </div>

                {/* Row 3: Export analytics JSON */}
                <div
                  style={{
                    background: "#0a0f1e",
                    border: "1px dashed #1e293b",
                    borderRadius: 16,
                    padding: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#f1f5f9",
                      }}
                    >
                      Export Full Analytics Report
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#475569", marginTop: 2 }}
                    >
                      Downloads all analytics data as JSON — overview,
                      sentiment, action items
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      analyticsAPI.exportAnalyticsJSON(30);
                      showToast("Analytics JSON downloaded!");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "9px 18px",
                      borderRadius: 10,
                      background: C.purple,
                      border: "none",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <FileJson size={14} /> Export JSON
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;

