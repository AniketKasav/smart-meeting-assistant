// frontend/src/pages/Performance.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  BarChart3,
  Calendar,
  Target,
  Smile,
  Meh,
  Frown,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  Award,
  Zap,
  Mic,
  Star,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  X,
  MessageSquare,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const API_BASE = "http://localhost:4000/api";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  blue: "#3b82f6",
  blueDim: "#1d4ed8",
  purple: "#8b5cf6",
  purpleDim: "#6d28d9",
  green: "#10b981",
  greenDim: "#059669",
  amber: "#f59e0b",
  amberDim: "#d97706",
  red: "#ef4444",
  redDim: "#dc2626",
  cyan: "#06b6d4",
  cyanDim: "#0891b2",
  pink: "#ec4899",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (s) => {
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};

const scoreColor = (n) => (n >= 80 ? C.green : n >= 55 ? C.amber : C.red);
const scoreLabel = (n) =>
  n >= 80 ? "Excellent" : n >= 55 ? "Good" : "Needs Work";

const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ─── Score ring component ──────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 80, stroke = 7 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#1e293b"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={size * 0.22}
        fontWeight="700"
        style={{
          transform: "rotate(90deg)",
          transformOrigin: `${size / 2}px ${size / 2}px`,
        }}
      >
        {score}
      </text>
    </svg>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <div
    style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      border: "1px solid #1e293b",
      borderRadius: 16,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: color + "18",
      }}
    />
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: color + "22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={18} color={color} />
      </div>
      {trend !== undefined && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: trend > 0 ? C.green : trend < 0 ? C.red : "#94a3b8",
          }}
        >
          {trend > 0 ? (
            <ArrowUp size={12} />
          ) : trend < 0 ? (
            <ArrowDown size={12} />
          ) : (
            <Minus size={12} />
          )}
          {Math.abs(trend)}%
        </div>
      )}
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
      {sub && (
        <div style={{ fontSize: 11, color: color, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  </div>
);

// ─── User performance card ────────────────────────────────────────────────────
const UserCard = ({ user: u, rank, onClick, selected }) => {
  const score = u.performanceScore || 0;
  const color = avatarColor(u.name);
  return (
    <div
      onClick={onClick}
      style={{
        background: selected
          ? "linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)"
          : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        border: `1px solid ${selected ? C.blue + "60" : "#1e293b"}`,
        borderRadius: 14,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: selected ? `0 0 0 1px ${C.blue}40` : "none",
      }}
    >
      {/* Rank */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background:
            rank <= 3
              ? [C.amber + "33", "#94a3b833", "#cd7c2433"][rank - 1]
              : "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color:
            rank <= 3 ? [C.amber, "#94a3b8", "#cd7c24"][rank - 1] : "#475569",
        }}
      >
        {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
      </div>

      {/* Avatar */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${color}, ${color}88)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {initials(u.name)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            color: "#f1f5f9",
            fontSize: 14,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {u.name}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {u.meetings} meeting{u.meetings !== 1 ? "s" : ""} · {fmt(u.speakingSeconds || u.speakingTime || 0)} speaking · {u.speakingPct ?? "—"}% contribution
        </div>
      </div>

      {/* Score ring */}
      <ScoreRing score={score} size={52} stroke={5} />
    </div>
  );
};

// ─── Tooltip style ────────────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 10,
    color: "#f1f5f9",
    fontSize: 13,
  },
  labelStyle: { color: "#94a3b8" },
};

// ─── Main component ───────────────────────────────────────────────────────────
const Performance = () => {
  const { user, getToken } = useAuth();

  const [tab, setTab] = useState("overview"); // 'overview' | 'meetings' | 'users'
  const [timeRange, setTimeRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [overview, setOverview] = useState(null);
  const [meetingsOverTime, setMeetingsOverTime] = useState([]);
  const [speakingTime, setSpeakingTime] = useState([]);
  const [actionItems, setActionItems] = useState(null);
  const [sentimentTrends, setSentimentTrends] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingDetail, setMeetingDetail] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPerf, setUserPerf] = useState(null);
  const [allUsersPerf, setAllUsersPerf] = useState([]);

  const authH = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

  useEffect(() => {
    if (user?.userId) fetchAll();
  }, [timeRange, user?.userId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ovRes, trendRes, spkRes, actRes, sentRes, mtgRes, usersRes] =
        await Promise.all([
          axios.get(`${API_BASE}/analytics/overview`, authH()),
          axios.get(
            `${API_BASE}/analytics/meetings-over-time?days=${timeRange}`,
            authH(),
          ),
          axios.get(`${API_BASE}/analytics/speaking-time`, authH()),
          axios.get(`${API_BASE}/analytics/action-items`, authH()),
          axios.get(
            `${API_BASE}/analytics/sentiment-trends?days=${timeRange}`,
            authH(),
          ),
          axios.get(`${API_BASE}/meetings`, authH()),
          axios.get(`${API_BASE}/analytics/all-users-performance`, authH()),
        ]);

      setOverview(ovRes.data.data);
      setMeetingsOverTime(trendRes.data.data);
      setSpeakingTime(spkRes.data.data);
      setActionItems(actRes.data.data);
      setSentimentTrends(sentRes.data.data);

      const mtgs = mtgRes.data.meetings || [];
      setMeetings(mtgs.filter((m) => m.status === "completed").slice(0, 20));

      // Use real per-user performance from backend (already scored)
      setAllUsersPerf(usersRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const computeScore = (user, acts, totalSpk) => {
    let score = 0;
    // Speaking contribution (40 pts)
    const spkPct = totalSpk > 0 ? (user.duration / totalSpk) * 100 : 0;
    score += Math.min(40, spkPct * 1.2);
    // Task completion (40 pts) — placeholder
    const completed = acts?.byStatus?.completed ?? 0;
    const total = acts?.total ?? 0;
    const compRate = total > 0 ? (completed / total) * 100 : 0;
    score += Math.min(40, compRate * 0.4);
    // Participation bonus (20 pts)
    score += 20;
    const result = Math.round(Math.min(100, score));
    return isNaN(result) ? 0 : result;
  };

  const fetchMeetingDetail = async (mtg) => {
    setSelectedMeeting(mtg);
    try {
      const [spkRes, actRes] = await Promise.all([
        axios.get(
          `${API_BASE}/analytics/speaking-time?meetingId=${mtg.meetingId}`,
          authH(),
        ),
        axios.get(
          `${API_BASE}/analytics/meeting-users?meetingId=${mtg.meetingId}`,
          authH(),
        ),
      ]);
      const spk = spkRes.data.data || [];
      const totalSpk = spk.reduce((s, u) => s + u.duration, 0);
      const users = spk
        .map((u) => ({
          ...u,
          performanceScore: computeScore(u, actRes.data?.data, totalSpk),
          meetings: 1,
        }))
        .sort((a, b) => b.performanceScore - a.performanceScore);
      setMeetingDetail({ speakingTime: spk, users, totalSpk });
    } catch {
      // fallback
      setMeetingDetail(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const sentimentIcon = (s) =>
    s === "positive" ? (
      <Smile size={14} color={C.green} />
    ) : s === "negative" ? (
      <Frown size={14} color={C.red} />
    ) : (
      <Meh size={14} color={C.amber} />
    );

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#020617",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 16px",
              borderRadius: "50%",
              border: `3px solid ${C.blue}`,
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading analytics...</p>
        </div>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#f1f5f9",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* ── Header ── */}
      <div
        style={{
          borderBottom: "1px solid #0f172a",
          background: "#020617",
          padding: "24px 32px",
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Activity size={18} color="#fff" />
              </div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  background: `linear-gradient(90deg, #f8fafc, ${C.blue})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Performance Hub
              </h1>
            </div>
            <p style={{ color: "#475569", fontSize: 13 }}>
              Meeting intelligence · Individual & team analytics
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 8,
                color: "#94a3b8",
                padding: "8px 12px",
                fontSize: 13,
              }}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 8,
                color: "#64748b",
                padding: "8px 14px",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: refreshing ? "spin 0.8s linear infinite" : "none",
                }}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div
          style={{
            maxWidth: 1280,
            margin: "16px auto 0",
            display: "flex",
            gap: 4,
          }}
        >
          {[
            { key: "overview", label: "Overview", icon: BarChart3 },
            { key: "meetings", label: "Per Meeting", icon: Calendar },
            { key: "users", label: "Per User", icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s",
                background: tab === key ? C.blue : "transparent",
                color: tab === key ? "#fff" : "#64748b",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>
        {/* ════════════════ OVERVIEW TAB ════════════════ */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* KPI row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <StatCard
                icon={Calendar}
                label="Total Meetings"
                value={overview?.totalMeetings || 0}
                sub={`${overview?.completedMeetings || 0} completed`}
                color={C.blue}
              />
              <StatCard
                icon={Clock}
                label="Total Duration"
                value={fmt(overview?.totalDuration || 0)}
                sub={`Avg ${fmt(overview?.avgDuration || 0)}`}
                color={C.purple}
              />
              <StatCard
                icon={Users}
                label="Participants"
                value={overview?.totalParticipants || 0}
                sub="unique people"
                color={C.green}
              />
              <StatCard
                icon={Target}
                label="Task Completion"
                value={`${overview?.actionItems?.completionRate || 0}%`}
                sub={`${overview?.actionItems?.completed || 0}/${overview?.actionItems?.total || 0} done`}
                color={C.amber}
              />
              <StatCard
                icon={CheckCircle}
                label="Open Tasks"
                value={actionItems?.byStatus?.open || 0}
                sub={
                  actionItems?.overdue > 0
                    ? `${actionItems.overdue} overdue`
                    : "on track"
                }
                color={actionItems?.overdue > 0 ? C.red : C.cyan}
              />
            </div>

            {/* Charts row 1 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              {/* Meeting activity */}
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
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <TrendingUp size={16} color={C.blue} /> Meeting Activity
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={meetingsOverTime}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={C.blue}
                          stopOpacity={0.3}
                        />
                        <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                    <Tooltip {...tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={C.blue}
                      strokeWidth={2.5}
                      dot={{ fill: C.blue, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Sentiment pie */}
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
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Smile size={16} color={C.amber} /> Meeting Sentiment
                </h3>
                {overview?.sentiment?.positive +
                  overview?.sentiment?.neutral +
                  overview?.sentiment?.negative >
                0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Positive",
                            value: overview?.sentiment?.positive || 0,
                          },
                          {
                            name: "Neutral",
                            value: overview?.sentiment?.neutral || 0,
                          },
                          {
                            name: "Negative",
                            value: overview?.sentiment?.negative || 0,
                          },
                        ].filter((d) => d.value > 0)}
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
                        {[C.green, C.amber, C.red].map((c, i) => (
                          <Cell key={i} fill={c} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 220,
                    }}
                  >
                    <p style={{ color: "#334155", fontSize: 13 }}>
                      No sentiment data yet
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Charts row 2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              {/* Speaking time */}
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
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Mic size={16} color={C.purple} /> Speaking Time
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={speakingTime.slice(0, 8)} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#0f172a"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="#334155"
                      tick={{ fill: "#475569", fontSize: 11 }}
                      tickFormatter={(v) => fmt(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#334155"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v) => [fmt(v), "Speaking"]}
                    />
                    <Bar dataKey="duration" radius={[0, 4, 4, 0]}>
                      {speakingTime.slice(0, 8).map((_, i) => (
                        <Cell
                          key={i}
                          fill={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Task status */}
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
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CheckCircle size={16} color={C.green} /> Action Items
                  Breakdown
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                    marginBottom: 24,
                  }}
                >
                  {[
                    {
                      label: "Open",
                      val: actionItems?.byStatus?.open || 0,
                      color: C.blue,
                    },
                    {
                      label: "In Progress",
                      val: actionItems?.byStatus?.["in-progress"] || 0,
                      color: C.amber,
                    },
                    {
                      label: "Completed",
                      val: actionItems?.byStatus?.completed || 0,
                      color: C.green,
                    },
                  ].map(({ label, val, color }) => (
                    <div
                      key={label}
                      style={{
                        background: "#0f172a",
                        borderRadius: 12,
                        padding: "16px 12px",
                        textAlign: "center",
                        border: `1px solid ${color}22`,
                      }}
                    >
                      <div style={{ fontSize: 28, fontWeight: 800, color }}>
                        {val}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#475569", marginTop: 4 }}
                      >
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                {[
                  { label: "High", key: "high", color: C.red },
                  { label: "Medium", key: "medium", color: C.amber },
                  { label: "Low", key: "low", color: C.green },
                ].map(({ label, key, color }) => {
                  const val = actionItems?.byPriority?.[key] || 0;
                  const pct =
                    actionItems?.total > 0
                      ? (val / actionItems.total) * 100
                      : 0;
                  return (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ color: "#64748b" }}>
                          {label} priority
                        </span>
                        <span style={{ color, fontWeight: 700 }}>{val}</span>
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
                  );
                })}
                {actionItems?.overdue > 0 && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: "10px 14px",
                      background: C.red + "15",
                      border: `1px solid ${C.red}30`,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={14} color={C.red} />
                    <span style={{ fontSize: 12, color: C.red }}>
                      {actionItems.overdue} overdue items need attention
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sentiment trends */}
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
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Activity size={16} color={C.cyan} /> Sentiment Trends Over Time
              </h3>
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
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
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
            </div>
          </div>
        )}

        {/* ════════════════ PER MEETING TAB ════════════════ */}
        {tab === "meetings" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: selectedMeeting ? "340px 1fr" : "1fr",
              gap: 20,
            }}
          >
            {/* Meeting list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                Completed Meetings
              </h3>
              {meetings.length === 0 && (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "#334155",
                    fontSize: 13,
                  }}
                >
                  No completed meetings found
                </div>
              )}
              {meetings.map((m) => (
                <div
                  key={m._id}
                  onClick={() => fetchMeetingDetail(m)}
                  style={{
                    background:
                      selectedMeeting?._id === m._id ? "#1e3a5f" : "#0a0f1e",
                    border: `1px solid ${selectedMeeting?._id === m._id ? C.blue + "60" : "#1e293b"}`,
                    borderRadius: 12,
                    padding: "14px 18px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#f1f5f9",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.title || "Untitled Meeting"}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#475569", marginTop: 3 }}
                      >
                        {m.startedAt
                          ? new Date(m.startedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {fmt(m.duration || 0)}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {m.summary?.sentiment &&
                          sentimentIcon(m.summary.sentiment)}
                        <Users size={11} color="#475569" />
                        <span style={{ fontSize: 11, color: "#475569" }}>
                          {m.participants?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Meeting detail */}
            {selectedMeeting && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <div
                  style={{
                    background: "#0a0f1e",
                    border: "1px solid #1e293b",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: "#f8fafc",
                        }}
                      >
                        {selectedMeeting.title || "Untitled Meeting"}
                      </h2>
                      <p
                        style={{ fontSize: 12, color: "#475569", marginTop: 4 }}
                      >
                        {selectedMeeting.startedAt
                          ? new Date(selectedMeeting.startedAt).toLocaleString(
                              "en-IN",
                            )
                          : "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMeeting(null);
                        setMeetingDetail(null);
                      }}
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

                  {/* Meeting KPIs */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 12,
                      marginBottom: 24,
                    }}
                  >
                    {[
                      {
                        label: "Duration",
                        value: fmt(selectedMeeting.duration || 0),
                        color: C.blue,
                      },
                      {
                        label: "Participants",
                        value: selectedMeeting.participants?.length || 0,
                        color: C.purple,
                      },
                      {
                        label: "Segments",
                        value: selectedMeeting.transcripts?.length || "—",
                        color: C.green,
                      },
                      {
                        label: "Sentiment",
                        value: selectedMeeting.summary?.sentiment || "N/A",
                        color: C.amber,
                      },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        style={{
                          background: "#0f172a",
                          borderRadius: 10,
                          padding: "12px 16px",
                          border: `1px solid ${color}22`,
                        }}
                      >
                        <div style={{ fontSize: 18, fontWeight: 800, color }}>
                          {value}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#475569",
                            marginTop: 2,
                          }}
                        >
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  {selectedMeeting.summary?.text && (
                    <div
                      style={{
                        background: "#0f172a",
                        borderRadius: 10,
                        padding: 16,
                        marginBottom: 20,
                        border: "1px solid #1e293b",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#3b82f6",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 8,
                        }}
                      >
                        Executive Summary
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#94a3b8",
                          lineHeight: 1.6,
                        }}
                      >
                        {selectedMeeting.summary.text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Per-user performance in this meeting */}
                {meetingDetail && (
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
                        marginBottom: 16,
                      }}
                    >
                      Participant Performance
                    </h3>

                    {meetingDetail.speakingTime.length === 0 ? (
                      <p style={{ color: "#334155", fontSize: 13 }}>
                        No transcript data for this meeting yet.
                      </p>
                    ) : (
                      <>
                        {/* Speaking time chart */}
                        <div style={{ marginBottom: 20 }}>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={meetingDetail.speakingTime}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#0f172a"
                              />
                              <XAxis
                                dataKey="name"
                                stroke="#334155"
                                tick={{ fill: "#475569", fontSize: 11 }}
                              />
                              <YAxis
                                stroke="#334155"
                                tick={{ fill: "#475569", fontSize: 11 }}
                                tickFormatter={(v) => fmt(v)}
                              />
                              <Tooltip
                                {...tooltipStyle}
                                formatter={(v) => [fmt(v), "Speaking Time"]}
                              />
                              <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                                {meetingDetail.speakingTime.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={
                                      AVATAR_COLORS[i % AVATAR_COLORS.length]
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* User cards */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          {meetingDetail.users.map((u, i) => {
                            const spkPct =
                              meetingDetail.totalSpk > 0
                                ? Math.round(
                                    (u.duration / meetingDetail.totalSpk) * 100,
                                  )
                                : 0;
                            return (
                              <div
                                key={u.name}
                                style={{
                                  background: "#0f172a",
                                  borderRadius: 12,
                                  padding: "14px 18px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 16,
                                  border: "1px solid #1e293b",
                                }}
                              >
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    background: `linear-gradient(135deg, ${avatarColor(u.name)}, ${avatarColor(u.name)}88)`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#fff",
                                    flexShrink: 0,
                                  }}
                                >
                                  {initials(u.name)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 14,
                                      color: "#f1f5f9",
                                    }}
                                  >
                                    {u.name}
                                  </div>
                                  <div style={{ marginTop: 6 }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: 11,
                                        marginBottom: 4,
                                      }}
                                    >
                                      <span style={{ color: "#475569" }}>
                                        {fmt(u.duration)} speaking · {spkPct}%
                                        of meeting
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        height: 4,
                                        background: "#1e293b",
                                        borderRadius: 2,
                                        overflow: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          height: "100%",
                                          width: `${spkPct}%`,
                                          background: avatarColor(u.name),
                                          borderRadius: 2,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <ScoreRing
                                  score={u.performanceScore}
                                  size={48}
                                  stroke={4}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Action items for this meeting */}
                {selectedMeeting.summary?.actionItems?.length > 0 && (
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
                        marginBottom: 16,
                      }}
                    >
                      Action Items
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {selectedMeeting.summary.actionItems.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            background: "#0f172a",
                            borderRadius: 10,
                            padding: "12px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            border: "1px solid #1e293b",
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              flexShrink: 0,
                              background:
                                item.status === "completed"
                                  ? C.green
                                  : item.priority === "high"
                                    ? C.red
                                    : C.amber,
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 13,
                                color:
                                  item.status === "completed"
                                    ? "#475569"
                                    : "#f1f5f9",
                                textDecoration:
                                  item.status === "completed"
                                    ? "line-through"
                                    : "none",
                              }}
                            >
                              {item.task || item.description}
                            </div>
                            {item.assignee && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#475569",
                                  marginTop: 2,
                                }}
                              >
                                → {item.assignee}
                              </div>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 20,
                              background:
                                item.status === "completed"
                                  ? C.green + "22"
                                  : "#1e293b",
                              color:
                                item.status === "completed"
                                  ? C.green
                                  : "#64748b",
                              fontWeight: 600,
                            }}
                          >
                            {item.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ PER USER TAB ════════════════ */}
        {tab === "users" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: selectedUser ? "320px 1fr" : "1fr",
              gap: 20,
            }}
          >
            {/* User list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                All Participants · Ranked by Score
              </h3>
              {allUsersPerf.length === 0 && (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "#334155",
                    fontSize: 13,
                  }}
                >
                  No participant data yet
                </div>
              )}
              {allUsersPerf.map((u, i) => (
                <UserCard
                  key={u.name}
                  user={u}
                  rank={i + 1}
                  selected={selectedUser?.name === u.name}
                  onClick={() => setSelectedUser(u)}
                />
              ))}
            </div>

            {/* User detail */}
            {selectedUser && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                {/* Header card */}
                <div
                  style={{
                    background: "#0a0f1e",
                    border: "1px solid #1e293b",
                    borderRadius: 16,
                    padding: 28,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${avatarColor(selectedUser.name)}, ${avatarColor(selectedUser.name)}88)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        fontWeight: 800,
                        color: "#fff",
                      }}
                    >
                      {initials(selectedUser.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: "#f8fafc",
                        }}
                      >
                        {selectedUser.name}
                      </h2>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontWeight: 700,
                            background:
                              scoreColor(selectedUser.performanceScore) + "22",
                            color: scoreColor(selectedUser.performanceScore),
                          }}
                        >
                          {scoreLabel(selectedUser.performanceScore)}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <ScoreRing
                        score={selectedUser.performanceScore}
                        size={80}
                        stroke={7}
                      />
                      <div
                        style={{ fontSize: 11, color: "#475569", marginTop: 4 }}
                      >
                        Performance Score
                      </div>
                    </div>
                  </div>

                  {/* Stats grid — real data from backend */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 12,
                    }}
                  >
                    {[
                      {
                        label: "Speaking Time",
                        value: fmt(selectedUser.speakingSeconds || selectedUser.speakingTime || 0),
                        icon: Mic,
                        color: C.purple,
                      },
                      {
                        label: "Contribution %",
                        value: `${selectedUser.speakingPct ?? 0}%`,
                        icon: TrendingUp,
                        color: C.blue,
                      },
                      {
                        label: "Meetings",
                        value: selectedUser.meetings || 0,
                        icon: Calendar,
                        color: C.green,
                      },
                      {
                        label: "Tasks Assigned",
                        value: selectedUser.assignedTasks ?? "—",
                        icon: CheckCircle,
                        color: C.amber,
                      },
                      {
                        label: "Completion Rate",
                        value: selectedUser.taskCompletionRate != null ? `${selectedUser.taskCompletionRate}%` : "—",
                        icon: Target,
                        color: C.green,
                      },
                      {
                        label: "On-Time Rate",
                        value: selectedUser.onTimeRate != null ? `${selectedUser.onTimeRate}%` : "—",
                        icon: Zap,
                        color: selectedUser.onTimeRate >= 80 ? C.green : selectedUser.onTimeRate >= 50 ? C.amber : C.red,
                      },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div
                        key={label}
                        style={{
                          background: "#0f172a",
                          borderRadius: 12,
                          padding: 16,
                          border: `1px solid ${color}22`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <Icon size={14} color={color} />
                          <span style={{ fontSize: 11, color: "#475569" }}>
                            {label}
                          </span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Radar chart — real score breakdown from backend */}
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
                      marginBottom: 4,
                    }}
                  >
                    Performance Breakdown
                  </h3>
                  <p style={{ fontSize: 11, color: "#475569", marginBottom: 20 }}>
                    Score = Speaking (30) + Tasks (35) + On-Time (20) + Attendance (15)
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart
                      data={[
                        {
                          metric: "Speaking",
                          value: Math.round(((selectedUser.scoreBreakdown?.speakingContribution ?? 0) / 30) * 100),
                          max: 100,
                        },
                        {
                          metric: "Tasks Done",
                          value: Math.round(((selectedUser.scoreBreakdown?.taskCompletion ?? 0) / 35) * 100),
                          max: 100,
                        },
                        {
                          metric: "On-Time",
                          value: Math.round(((selectedUser.scoreBreakdown?.onTimeDelivery ?? 0) / 20) * 100),
                          max: 100,
                        },
                        {
                          metric: "Attendance",
                          value: Math.round(((selectedUser.scoreBreakdown?.attendance ?? 0) / 15) * 100),
                          max: 100,
                        },
                      ]}
                    >
                      <PolarGrid stroke="#1e293b" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: "#334155", fontSize: 10 }}
                      />
                      <Radar
                        name={selectedUser.name}
                        dataKey="value"
                        stroke={avatarColor(selectedUser.name)}
                        fill={avatarColor(selectedUser.name)}
                        fillOpacity={0.25}
                      />
                    </RadarChart>
                  </ResponsiveContainer>

                  {/* Score bar breakdown */}
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Speaking Contribution", pts: selectedUser.scoreBreakdown?.speakingContribution ?? 0, max: 30, color: C.purple },
                      { label: "Task Completion", pts: selectedUser.scoreBreakdown?.taskCompletion ?? 0, max: 35, color: C.green },
                      { label: "On-Time Delivery", pts: selectedUser.scoreBreakdown?.onTimeDelivery ?? 0, max: 20, color: C.amber },
                      { label: "Attendance", pts: selectedUser.scoreBreakdown?.attendance ?? 0, max: 15, color: C.blue },
                    ].map(({ label, pts, max, color }) => (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: "#94a3b8" }}>{label}</span>
                          <span style={{ color, fontWeight: 700 }}>{pts}/{max} pts</span>
                        </div>
                        <div style={{ height: 6, background: "#0f172a", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.round((pts / max) * 100)}%`,
                            background: color,
                            borderRadius: 4,
                            transition: "width 0.8s ease",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Speaking share bar */}
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
                      marginBottom: 16,
                    }}
                  >
                    Speaking Share vs Others
                  </h3>
                  {speakingTime.map((u, i) => {
                    const isSelected = u.name === selectedUser.name;
                    return (
                      <div key={u.name} style={{ marginBottom: 10 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              color: isSelected ? "#f1f5f9" : "#64748b",
                              fontWeight: isSelected ? 700 : 400,
                            }}
                          >
                            {u.name}
                          </span>
                          <span
                            style={{
                              color: isSelected
                                ? avatarColor(u.name)
                                : "#475569",
                            }}
                          >
                            {fmt(u.duration)} · {u.percentage}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: isSelected ? 8 : 5,
                            background: "#0f172a",
                            borderRadius: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${u.percentage}%`,
                              background: isSelected
                                ? avatarColor(u.name)
                                : "#1e293b",
                              borderRadius: 4,
                              transition: "width 0.8s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedUser(null)}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                    color: "#64748b",
                    padding: "10px 0",
                    fontSize: 13,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Close
                </button>
              </div>
            )}

            {/* If no user selected, show leaderboard grid */}
            {!selectedUser && allUsersPerf.length > 0 && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
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
                    Speaking Time Comparison
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={allUsersPerf.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                      <XAxis
                        dataKey="name"
                        stroke="#334155"
                        tick={{ fill: "#475569", fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#334155"
                        tick={{ fill: "#475569", fontSize: 11 }}
                        tickFormatter={(v) => fmt(v)}
                      />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(v) => [fmt(v), "Speaking Time"]}
                      />
                      <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                        {allUsersPerf.slice(0, 10).map((u, i) => (
                          <Cell key={i} fill={avatarColor(u.name)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

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
                      marginBottom: 16,
                    }}
                  >
                    Performance Score Board
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {allUsersPerf.map((u, i) => (
                      <div
                        key={u.name}
                        onClick={() => setSelectedUser(u)}
                        style={{
                          background: "#0f172a",
                          borderRadius: 12,
                          padding: "16px",
                          border: `1px solid ${avatarColor(u.name)}22`,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 10,
                          transition: "border-color 0.2s",
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${avatarColor(u.name)}, ${avatarColor(u.name)}88)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 15,
                            fontWeight: 800,
                            color: "#fff",
                          }}
                        >
                          {initials(u.name)}
                        </div>
                        <ScoreRing
                          score={u.performanceScore}
                          size={56}
                          stroke={5}
                        />
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#f1f5f9",
                            }}
                          >
                            {u.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#475569",
                              marginTop: 2,
                            }}
                          >
                            {fmt(u.duration)} speaking
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Performance;
