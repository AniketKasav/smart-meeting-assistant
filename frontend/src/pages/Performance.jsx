// frontend/src/pages/Performance.jsx - ENHANCED VERSION
import React, { useState, useEffect } from 'react';
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
  Filter,
  X
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const Performance = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('30');
  const [selectedParticipant, setSelectedParticipant] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // Data states
  const [overview, setOverview] = useState(null);
  const [meetingsOverTime, setMeetingsOverTime] = useState([]);
  const [speakingTime, setSpeakingTime] = useState([]);
  const [actionItems, setActionItems] = useState(null);
  const [sentimentTrends, setSentimentTrends] = useState([]);
  const [participants, setParticipants] = useState([]);

  const API_BASE = 'http://localhost:4000/api';

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all analytics data
      const [overviewRes, trendsRes, speakingRes, actionRes, sentimentRes] = await Promise.all([
        axios.get(`${API_BASE}/analytics/overview`),
        axios.get(`${API_BASE}/analytics/meetings-over-time?days=${timeRange}`),
        axios.get(`${API_BASE}/analytics/speaking-time`),
        axios.get(`${API_BASE}/analytics/action-items`),
        axios.get(`${API_BASE}/analytics/sentiment-trends?days=${timeRange}`)
      ]);

      setOverview(overviewRes.data.data);
      setMeetingsOverTime(trendsRes.data.data);
      setSpeakingTime(speakingRes.data.data);
      setActionItems(actionRes.data.data);
      setSentimentTrends(sentimentRes.data.data);

      // Extract unique participants from speaking time data
      const uniqueParticipants = [...new Set(speakingRes.data.data.map(item => item.name))];
      setParticipants(uniqueParticipants);
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
      speakingTime,
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
    if (selectedParticipant === 'all') {
      return speakingTime.slice(0, 10);
    }
    return speakingTime.filter(item => item.name === selectedParticipant);
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const COLORS = {
    primary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#a855f7',
    cyan: '#06b6d4'
  };

  const SENTIMENT_COLORS = {
    positive: '#22c55e',
    neutral: '#f59e0b',
    negative: '#ef4444'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Performance Analytics</h1>
            <p className="text-slate-400">Track meeting insights and team performance</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Filter Button */}
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

              {/* Filter Dropdown */}
              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                  <div className="p-3 border-b border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Filter by Participant</span>
                      <button
                        onClick={() => setShowFilterMenu(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedParticipant('all');
                        setShowFilterMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedParticipant === 'all'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      All Participants
                    </button>
                    {participants.map((participant) => (
                      <button
                        key={participant}
                        onClick={() => {
                          setSelectedParticipant(participant);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedParticipant === participant
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {participant || 'Unknown'}
                      </button>
                    ))}
                  </div>
                  {selectedParticipant !== 'all' && (
                    <div className="p-2 border-t border-slate-700">
                      <button
                        onClick={() => {
                          setSelectedParticipant('all');
                          setShowFilterMenu(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        Clear Filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Export Button */}
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Time Range Selector */}
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

        {/* Active Filters Display */}
        {selectedParticipant !== 'all' && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400">
              Filtered by: <strong>{selectedParticipant}</strong>
            </span>
            <button
              onClick={() => setSelectedParticipant('all')}
              className="ml-auto text-blue-400 hover:text-blue-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Meetings */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-white">{overview?.totalMeetings || 0}</span>
            </div>
            <p className="text-slate-400 text-sm">Total Meetings</p>
            <p className="text-xs text-green-400 mt-1">
              {overview?.completedMeetings || 0} completed
            </p>
          </div>

          {/* Total Duration */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
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

          {/* Participants */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-white">
                {overview?.totalParticipants || 0}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Unique Participants</p>
          </div>

          {/* Action Items */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Target className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-2xl font-bold text-white">
                {overview?.actionItems?.completionRate || 0}%
              </span>
            </div>
            <p className="text-slate-400 text-sm">Completion Rate</p>
            <p className="text-xs text-slate-500 mt-1">
              {overview?.actionItems?.completed || 0}/{overview?.actionItems?.total || 0} completed
            </p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meetings Over Time */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Meeting Activity
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={meetingsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment Distribution */}
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
                      { name: 'Neutral', value: overview?.sentiment?.neutral || 0 },
                      { name: 'Negative', value: overview?.sentiment?.negative || 0 }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      overview?.sentiment?.positive || 0,
                      overview?.sentiment?.neutral || 0,
                      overview?.sentiment?.negative || 0
                    ].map((value, index) => 
                      value > 0 ? (
                        <Cell key={`cell-${index}`} fill={Object.values(SENTIMENT_COLORS)[index]} />
                      ) : null
                    )}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
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

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Speaking Time Distribution */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Speaking Time Distribution
              {selectedParticipant !== 'all' && (
                <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  Filtered
                </span>
              )}
            </h3>
            {getFilteredSpeakingTime().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getFilteredSpeakingTime()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(value) => {
                      const mins = Math.floor(value / 60);
                      const secs = Math.floor(value % 60);
                      if (mins > 0) return `${mins}m`;
                      return `${secs}s`;
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value) => {
                      const seconds = Math.round(value);
                      const mins = Math.floor(seconds / 60);
                      const secs = seconds % 60;
                      
                      let timeStr = '';
                      if (mins > 0) {
                        timeStr = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
                      } else {
                        timeStr = `${secs}s`;
                      }
                      
                      return [timeStr, 'Speaking Time'];
                    }}
                  />
                  <Bar dataKey="duration" fill={COLORS.purple}>
                    {getFilteredSpeakingTime().map((entry, index) => (
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
                    {selectedParticipant !== 'all' 
                      ? 'This participant has no speaking time recorded' 
                      : 'Complete meetings to see analysis'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Items Status */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Action Items Status
            </h3>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  {actionItems?.byStatus?.open || 0}
                </div>
                <p className="text-xs text-slate-400">Open</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-1">
                  {actionItems?.byStatus?.['in-progress'] || 0}
                </div>
                <p className="text-xs text-slate-400">In Progress</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">
                  {actionItems?.byStatus?.completed || 0}
                </div>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">High Priority</span>
                  <span className="text-red-400 font-semibold">
                    {actionItems?.byPriority?.high || 0}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500"
                    style={{ 
                      width: `${actionItems?.total > 0 ? (actionItems.byPriority.high / actionItems.total) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Medium Priority</span>
                  <span className="text-yellow-400 font-semibold">
                    {actionItems?.byPriority?.medium || 0}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500"
                    style={{ 
                      width: `${actionItems?.total > 0 ? (actionItems.byPriority.medium / actionItems.total) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Low Priority</span>
                  <span className="text-green-400 font-semibold">
                    {actionItems?.byPriority?.low || 0}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ 
                      width: `${actionItems?.total > 0 ? (actionItems.byPriority.low / actionItems.total) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Overdue Warning */}
            {actionItems?.overdue > 0 && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400">
                  {actionItems.overdue} overdue action items
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sentiment Trends Over Time */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Sentiment Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sentimentTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="positive" 
                stroke={SENTIMENT_COLORS.positive} 
                strokeWidth={2}
                name="Positive"
              />
              <Line 
                type="monotone" 
                dataKey="neutral" 
                stroke={SENTIMENT_COLORS.neutral} 
                strokeWidth={2}
                name="Neutral"
              />
              <Line 
                type="monotone" 
                dataKey="negative" 
                stroke={SENTIMENT_COLORS.negative} 
                strokeWidth={2}
                name="Negative"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Performance;