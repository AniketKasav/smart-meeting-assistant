import { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertCircle, CheckCircle, ThumbsUp, ThumbsDown, Filter } from 'lucide-react';
import api from '../services/api';

const FeedbackAnalytics = () => {
  const [feedbackData, setFeedbackData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [filterIntent, setFilterIntent] = useState('');

  useEffect(() => {
    fetchFeedback();
  }, [days, filterIntent]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      // ✅ FIXED: Use the correct endpoint
      const response = await api.get('/assistant/feedback', {
        params: { 
          days, 
          limit: 100,
          intent: filterIntent || undefined
        }
      });
      
      if (response.data.success) {
        setFeedbackData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="flex items-center justify-center h-64">
          <Brain className="w-8 h-8 animate-spin text-purple-500" />
          <span className="ml-3 text-slate-300">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!feedbackData || !feedbackData.feedbacks) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">Feedback Analytics</h1>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No feedback data available</p>
            <p className="text-slate-500 text-sm mt-2">Start chatting with the AI assistant to generate feedback data</p>
          </div>
        </div>
      </div>
    );
  }

  const { stats, feedbacks } = feedbackData;
  const { total, likes, dislikes, successRate, intentBreakdown } = stats;

  // Get unique intents for filter
  const uniqueIntents = Object.keys(intentBreakdown);

  // Sort intents by accuracy (worst first for problem areas)
  const intentAccuracyList = Object.entries(intentBreakdown).map(([intent, data]) => ({
    intent,
    accuracy: data.total > 0 ? (data.likes / data.total) * 100 : 0,
    likes: data.likes,
    dislikes: data.dislikes,
    total: data.total
  })).sort((a, b) => b.total - a.total);

  // Find problem areas (< 70% accuracy)
  const problemAreas = intentAccuracyList
    .filter(item => item.accuracy < 70 && item.total >= 3)
    .sort((a, b) => a.accuracy - b.accuracy);

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            AI Feedback Analytics
          </h1>
          <p className="text-slate-400">
            Monitor AI performance and user feedback
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Time Range Selector */}
          <div className="flex space-x-2">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  days === d
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>

          {/* Intent Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filterIntent}
              onChange={(e) => setFilterIntent(e.target.value)}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
            >
              <option value="">All Intents</option>
              {uniqueIntents.map(intent => (
                <option key={intent} value={intent}>{intent}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Feedback</span>
              <Brain className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-white">{total}</div>
            <p className="text-xs text-slate-500 mt-1">Last {days} days</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Success Rate</span>
              {successRate >= 80 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className={`text-3xl font-bold ${
              successRate >= 80 ? 'text-green-500' : 
              successRate >= 60 ? 'text-yellow-500' : 
              'text-red-500'
            }`}>
              {successRate}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {likes} likes, {dislikes} dislikes
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Likes</span>
              <ThumbsUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-500">{likes}</div>
            <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all"
                style={{ width: total > 0 ? `${(likes / total) * 100}%` : '0%' }}
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Dislikes</span>
              <ThumbsDown className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-500">{dislikes}</div>
            <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all"
                style={{ width: total > 0 ? `${(dislikes / total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>

        {/* Intent Accuracy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Intent Accuracy</h2>
          {intentAccuracyList.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No intent data available</p>
          ) : (
            <div className="space-y-4">
              {intentAccuracyList.map((intent, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-48 text-sm font-medium text-slate-300 truncate">
                    {intent.intent}
                  </div>
                  <div className="flex-1">
                    <div className="relative h-10 bg-slate-800 rounded-lg overflow-hidden">
                      <div
                        className={`absolute h-full transition-all ${
                          intent.accuracy >= 80
                            ? 'bg-green-500'
                            : intent.accuracy >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${intent.accuracy}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-semibold">
                        <span className="text-white drop-shadow-lg">
                          {Math.round(intent.accuracy)}%
                        </span>
                        <span className="text-slate-300 drop-shadow-lg">
                          {intent.likes}👍 / {intent.dislikes}👎 ({intent.total} total)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Problem Areas */}
        {problemAreas.length > 0 && (
          <div className="bg-slate-900 border border-red-900/50 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              Problem Areas ({problemAreas.length})
            </h2>
            <div className="space-y-4">
              {problemAreas.map((area, idx) => {
                const examples = feedbacks.filter(
                  f => f.intent === area.intent && f.feedbackType === 'dislike'
                ).slice(0, 2);

                return (
                  <div key={idx} className="border border-red-900/50 bg-red-950/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-red-400">{area.intent}</span>
                      <span className="text-sm text-red-400">
                        {Math.round(area.accuracy)}% accuracy ({area.dislikes} dislikes)
                      </span>
                    </div>
                    {examples.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-red-400">Recent Examples:</p>
                        {examples.map((ex, i) => (
                          <div key={i} className="text-xs bg-slate-900/50 rounded p-3 border border-slate-800">
                            <p className="text-slate-300 mb-1">
                              <strong>User:</strong> {ex.userMessage}
                            </p>
                            <p className="text-slate-400">
                              <strong>AI:</strong> {ex.aiResponse?.substring(0, 150)}...
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Feedback */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Feedback</h2>
          {feedbacks.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No feedback yet</p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {feedbacks.map((feedback, idx) => (
                <div key={idx} className="border border-slate-800 bg-slate-800/50 rounded-lg p-4 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white px-2 py-1 bg-slate-700 rounded">
                        {feedback.intent}
                      </span>
                      <span className="text-xs text-slate-500">
                        Confidence: {Math.round((feedback.confidence || 0.5) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {feedback.feedbackType === 'like' ? (
                        <div className="flex items-center gap-1 text-green-500">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-xs font-medium">Positive</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500">
                          <ThumbsDown className="w-4 h-4" />
                          <span className="text-xs font-medium">Negative</span>
                        </div>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(feedback.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300">
                      <strong className="text-purple-400">User:</strong> {feedback.userMessage}
                    </p>
                    <p className="text-sm text-slate-400">
                      <strong className="text-blue-400">AI:</strong> {feedback.aiResponse?.substring(0, 200)}
                      {feedback.aiResponse?.length > 200 && '...'}
                    </p>
                    {feedback.comment && (
                      <p className="text-sm text-slate-500 italic pl-4 border-l-2 border-slate-700">
                        "{feedback.comment}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackAnalytics;