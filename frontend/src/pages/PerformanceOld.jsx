// frontend/src/pages/Performance.jsx
import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Clock, CheckCircle, BarChart3, Calendar,
  Target, Smile, Meh, Frown, AlertCircle, Loader2, RefreshCw,
  Download, Filter, X, Lock
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Performance = () => {
  const { user, getToken } = useAuth(); // ← add getToken

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('30');
  const [selectedParticipant, setSelectedParticipant] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [overview, setOverview] = useState(null);
  const [meetingsOverTime, setMeetingsOverTime] = useState([]);
  const [speakingTime, setSpeakingTime] = useState([]);
  const [actionItems, setActionItems] = useState(null);
  const [sentimentTrends, setSentimentTrends] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [personalPerformance, setPersonalPerformance] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const API_BASE = 'https://smart-meeting-assistant-olcl.onrender.com/api';

  // ── FIXED: use getToken() instead of wrong key ────────────────────────────
  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
  });

  // ── FIXED: re-fetch when user changes (catches logout/login switch) ───────
  useEffect(() => {
    if (user?.userId) fetchAnalytics();
  }, [timeRange, user?.userId]);

  // ── FIXED: reset all state when user changes ──────────────────────────────
  useEffect(() => {
    setOverview(null);
    setMeetingsOverTime([]);
    setSpeakingTime([]);
    setActionItems(null);
    setSentimentTrends([]);
    setParticipants([]);
    setPersonalPerformance(null);
    setIsHost(false);
    setSelectedParticipant('all');
  }, [user?.userId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, trendsRes, speakingRes, actionRes, sentimentRes] = await Promise.all([
        axios.get(`${API_BASE}/analytics/overview`, authHeaders()),
        axios.get(`${API_BASE}/analytics/meetings-over-time?days=${timeRange}`, authHeaders()),
        axios.get(`${API_BASE}/analytics/speaking-time`, authHeaders()),
        axios.get(`${API_BASE}/analytics/action-items`, authHeaders()),
        axios.get(`${API_BASE}/analytics/sentiment-trends?days=${timeRange}`, authHeaders())
      ]);

      setOverview(overviewRes.data.data);
      setMeetingsOverTime(trendsRes.data.data);
      setSpeakingTime(speakingRes.data.data);
      setActionItems(actionRes.data.data);
      setSentimentTrends(sentimentRes.data.data);

      const uniqueParticipants = [...new Set(speakingRes.data.data.map(item => item.name))];
      setParticipants(uniqueParticipants);

      const otherParticipants = uniqueParticipants.filter(
        name => name?.toLowerCase() !== user?.name?.toLowerCase()
      );
      setIsHost(otherParticipants.length > 0);

      if (user?.userId) {
        try {
          const perfRes = await axios.get(
            `${API_BASE}/analytics/user-performance/${user.userId}`,
            authHeaders()
          );
          setPersonalPerformance(perfRes.data.data?.metrics);
        } catch {
          // Non-fatal
        }
      }

    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const handleExportData = () => {
    const exportData = {
      overview,
      meetingsOverTime,
      speakingTime: isHost ? speakingTime : speakingTime.filter(
        s => s.name?.toLowerCase() === user?.name?.toLowerCase()
      ),
      actionItems,
      sentimentTrends,
      exportedAt: new Date().toISOString(),
      timeRange: `Last ${timeRange} days`
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFilteredSpeakingTime = () => {
    if (!isHost) return speakingTime;
    if (selectedParticipant === 'all') return speakingTime.slice(0, 10);
    return speakingTime.filter(item => item.name === selectedParticipant);
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const COLORS = {
    primary: '#3b82f6', success: '#22c55e', warning: '#f59e0b',
    danger: '#ef4444', purple: '#a855f7', cyan: '#06b6d4'
  };

  const SENTIMENT_COLORS = {
    positive: '#22c55e', neutral: '#f59e0b', negative: '#ef4444'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // ── JSX is identical to your original — no changes needed below ──────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Performance Analytics</h1>
            <p className="text-slate-400">
              {isHost ? 'Team meeting insights and performance overview' : 'Your personal meeting performance'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isHost && (
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                    selectedParticipant !== 'all'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  {selectedParticipant !== 'all' && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">1</span>
                  )}
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                    <div className="p-3 border-b border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Filter by Participant</span>
                        <button onClick={() => setShowFilterMenu(false)} className="text-slate-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => { setSelectedParticipant('all'); setShowFilterMenu(false); }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedParticipant === 'all' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        All Participants
                      </button>
                      {participants.map((participant) => (
                        <button
                          key={participant}
                          onClick={() => { setSelectedParticipant(participant); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                            selectedParticipant === participant ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {participant || 'Unknown'}
                        </button>
                      ))}
                    </div>
                    {selectedParticipant !== 'all' && (
                      <div className="p-2 border-t border-slate-700">
                        <button
                          onClick={() => { setSelectedParticipant('all'); setShowFilterMenu(false); }}
                          className="w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          Clear Filter
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {!isHost && (
              <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4" />
                My Performance
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
          </div>
        </div>

        {isHost && selectedParticipant !== 'all' && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400">
              Filtered by: <strong>{selectedParticipant}</strong>
            </span>
            <button onClick={() => setSelectedParticipant('all')} className="ml-auto text-blue-400 hover:text-blue-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg"><Calendar className="w-6 h-6 text-blue-400" /></div>
              <span className="text-2xl font-bold text-white">{overview?.totalMeetings || 0}</span>
            </div>
            <p className="text-slate-400 text-sm">{isHost ? 'Total Meetings' : 'Meetings Participated'}</p>
            <p className="text-xs text-green-400 mt-1">{overview?.completedMeetings || 0} completed</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg"><Clock className="w-6 h-6 text-purple-400" /></div>
              <span className="text-2xl font-bold text-white">
                {(() => {
                  const totalSecs = overview?.totalDuration || 0;
                  const mins = Math.floor(totalSecs / 60);
                  const secs = Math.floor(totalSecs % 60);
                  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                })()}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Total Duration</p>
            <p className="text-xs text-slate-500 mt-1">
              Avg: {(() => {
                const avgSecs = overview?.avgDuration || 0;
                const mins = Math.floor(avgSecs / 60);
                const secs = Math.floor(avgSecs % 60);
                return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
              })()}
            </p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg"><Users className="w-6 h-6 text-green-400" /></div>
              <span className="text-2xl font-bold text-white">
                {isHost ? overview?.totalParticipants || 0 : speakingTime.length || 0}
              </span>
            </div>
            <p className="text-slate-400 text-sm">{isHost ? 'Unique Participants' : 'Meetings with You'}</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/20 rounded-lg"><Target className="w-6 h-6 text-orange-400" /></div>
              <span className="text-2xl font-bold text-white">{overview?.actionItems?.completionRate || 0}%</span>
            </div>
            <p className="text-slate-400 text-sm">Completion Rate</p>
            <p className="text-xs text-slate-500 mt-1">
              {overview?.actionItems?.completed || 0}/{overview?.actionItems?.total || 0} completed
            </p>
          </div>
        </div>

        {personalPerformance && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-white">
                {isHost ? 'Your Personal Stats' : 'My Performance'}
              </h3>
              {!isHost && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Private
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/60 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{personalPerformance.totalMeetings}</p>
                <p className="text-xs text-slate-400 mt-1">Meetings</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-400">{formatDuration(personalPerformance.totalSpeakingTime)}</p>
                <p className="text-xs text-slate-400 mt-1">Speaking Time</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{personalPerformance.avgWordsPerMinute}</p>
                <p className="text-xs text-slate-400 mt-1">Avg WPM</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-400">{personalPerformance.completionRate}%</p>
                <p className="text-xs text-slate-400 mt-1">Task Completion</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Meeting Activity
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={meetingsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="count" stroke={COLORS.primary} strokeWidth={2} dot={{ fill: COLORS.primary, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Smile className="w-5 h-5 text-yellow-400" />
              Meeting Sentiment
            </h3>
            {(overview?.sentiment?.positive + overview?.sentiment?.neutral + overview?.sentiment?.negative) > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Positive', value: overview?.sentiment?.positive || 0 },
                      { name: 'Neutral',  value: overview?.sentiment?.neutral  || 0 },
                      { name: 'Negative', value: overview?.sentiment?.negative || 0 }
                    ].filter(item => item.value > 0)}
                    cx="50%" cy="50%" labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80} dataKey="value"
                  >
                    {[
                      overview?.sentiment?.positive || 0,
                      overview?.sentiment?.neutral  || 0,
                      overview?.sentiment?.negative || 0
                    ].map((value, index) =>
                      value > 0 ? <Cell key={`cell-${index}`} fill={Object.values(SENTIMENT_COLORS)[index]} /> : null
                    )}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px]">
                <div className="text-center">
                  <Meh className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No sentiment data yet</p>
                  <p className="text-slate-500 text-xs mt-1">Complete meetings to see analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              {isHost ? 'Speaking Time Distribution' : 'My Speaking Time'}
              {isHost && selectedParticipant !== 'all' && (
                <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">Filtered</span>
              )}
            </h3>
            {getFilteredSpeakingTime().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getFilteredSpeakingTime()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(value) => {
                      const mins = Math.floor(value / 60);
                      const secs = Math.floor(value % 60);
                      return mins > 0 ? `${mins}m` : `${secs}s`;
                    }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => {
                      const seconds = Math.round(value);
                      const mins = Math.floor(seconds / 60);
                      const secs = seconds % 60;
                      return [mins > 0 ? (secs > 0 ? `${mins}m ${secs}s` : `${mins}m`) : `${secs}s`, 'Speaking Time'];
                    }}
                  />
                  <Bar dataKey="duration" fill={COLORS.purple}>
                    {getFilteredSpeakingTime().map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.purple} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No speaking time data</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {isHost && selectedParticipant !== 'all'
                      ? 'This participant has no speaking time recorded'
                      : 'Complete meetings to see analysis'}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              {isHost ? 'Action Items Status' : 'My Action Items'}
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-1">{actionItems?.byStatus?.open || 0}</div>
                <p className="text-xs text-slate-400">Open</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-1">{actionItems?.byStatus?.['in-progress'] || 0}</div>
                <p className="text-xs text-slate-400">In Progress</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">{actionItems?.byStatus?.completed || 0}</div>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'High Priority', key: 'high', color: 'bg-red-500', text: 'text-red-400' },
                { label: 'Medium Priority', key: 'medium', color: 'bg-yellow-500', text: 'text-yellow-400' },
                { label: 'Low Priority', key: 'low', color: 'bg-green-500', text: 'text-green-400' }
              ].map(({ label, key, color, text }) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className={`${text} font-semibold`}>{actionItems?.byPriority?.[key] || 0}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color}`}
                      style={{ width: `${actionItems?.total > 0 ? (actionItems.byPriority[key] / actionItems.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {actionItems?.overdue > 0 && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400">{actionItems.overdue} overdue action items</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Sentiment Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sentimentTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="positive" stroke={SENTIMENT_COLORS.positive} strokeWidth={2} name="Positive" />
              <Line type="monotone" dataKey="neutral"  stroke={SENTIMENT_COLORS.neutral}  strokeWidth={2} name="Neutral" />
              <Line type="monotone" dataKey="negative" stroke={SENTIMENT_COLORS.negative} strokeWidth={2} name="Negative" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Performance;
