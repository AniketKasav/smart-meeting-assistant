// frontend/src/pages/SharedMeeting.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  Calendar,
  Clock,
  Users,
  Sparkles,
  CheckCircle2,
  Flag,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

const SharedMeeting = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSharedMeeting();
  }, [token]);

  const loadSharedMeeting = async (enteredPassword = null) => {
    try {
      setLoading(true);
      setPasswordError('');
      setError('');

      const response = await fetch(`http://localhost:4000/api/export/shared/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: enteredPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setRequiresPassword(true);
          if (enteredPassword) {
            setPasswordError('Incorrect password');
          }
        } else if (response.status === 404) {
          setError('This share link is invalid or has expired.');
        } else {
          setError(data.error || 'Failed to load shared meeting');
        }
        return;
      }

      if (data.success) {
        setMeeting(data.data.meeting);
        setRequiresPassword(false);
      }

    } catch (error) {
      console.error('Error loading shared meeting:', error);
      setError('Failed to load shared meeting. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password.trim()) {
      loadSharedMeeting(password);
    }
  };

  const getSentimentEmoji = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading shared meeting...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-900/70 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Meeting</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Password Required State
  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Lock className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Password Protected</h2>
            <p className="text-slate-400">This meeting requires a password to view</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-400">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!password.trim()}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
            >
              View Meeting
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Meeting Display
  if (!meeting) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header Banner */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Eye className="w-5 h-5 text-purple-400" />
          <div className="flex-1">
            <p className="text-purple-400 font-medium">Viewing Shared Meeting</p>
            <p className="text-slate-400 text-sm">This is a read-only view</p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
          >
            Open in App
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Meeting Info */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-4">{meeting.title}</h1>
          
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(new Date(meeting.startedAt), 'MMMM d, yyyy • h:mm a')}
            </div>
            {meeting.duration && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {Math.floor(meeting.duration / 60)}m {Math.floor(meeting.duration % 60)}s
              </div>
            )}
            {meeting.participants && meeting.participants.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* AI Summary */}
        {meeting.summary && (
          <div className="space-y-6">
            {/* Executive Summary */}
            {(meeting.summary.text || meeting.summary.executiveSummary) && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Executive Summary
                </h2>
                <p className="text-slate-300 leading-relaxed">
                  {meeting.summary.text || meeting.summary.executiveSummary}
                </p>
              </div>
            )}

            {/* Sentiment & Topics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sentiment */}
              {meeting.summary.sentiment && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Meeting Sentiment</h3>
                  <div className={`text-2xl font-semibold ${getSentimentColor(meeting.summary.sentiment)}`}>
                    {getSentimentEmoji(meeting.summary.sentiment)} {meeting.summary.sentiment.charAt(0).toUpperCase() + meeting.summary.sentiment.slice(1)}
                  </div>
                </div>
              )}

              {/* Topics */}
              {meeting.summary.topics && meeting.summary.topics.length > 0 && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Topics Discussed</h3>
                  <div className="flex flex-wrap gap-2">
                    {meeting.summary.topics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Key Points */}
            {meeting.summary.keyPoints && meeting.summary.keyPoints.length > 0 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  Key Discussion Points
                </h2>
                <ol className="space-y-3">
                  {meeting.summary.keyPoints.map((point, index) => (
                    <li key={index} className="text-slate-300 flex gap-3">
                      <span className="text-purple-400 font-semibold">{index + 1}.</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Decisions */}
            {meeting.summary.decisions && meeting.summary.decisions.length > 0 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  Decisions Made
                </h2>
                <ol className="space-y-3">
                  {meeting.summary.decisions.map((decision, index) => (
                    <li key={index} className="text-slate-300 flex gap-3">
                      <span className="text-green-400 font-semibold">{index + 1}.</span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Action Items */}
            {meeting.summary.actionItems && meeting.summary.actionItems.length > 0 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  Action Items
                </h2>
                <div className="space-y-4">
                  {meeting.summary.actionItems.map((item, index) => (
                    <div key={index} className="p-4 bg-slate-800/50 rounded-lg">
                      <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-slate-400 text-sm mb-3">{item.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {item.assignee && item.assignee !== 'Unassigned' && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {item.assignee}
                          </span>
                        )}
                        {item.priority && (
                          <span className={`px-2 py-1 rounded border text-xs ${getPriorityColor(item.priority)}`}>
                            {item.priority.toUpperCase()} PRIORITY
                          </span>
                        )}
                        {item.status && (
                          <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                            {item.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {meeting.summary.nextSteps && meeting.summary.nextSteps.length > 0 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Next Steps
                </h2>
                <ol className="space-y-3">
                  {meeting.summary.nextSteps.map((step, index) => (
                    <li key={index} className="text-slate-300 flex gap-3">
                      <span className="text-purple-400 font-semibold">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* No Summary Available */}
        {!meeting.summary && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-12 text-center">
            <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Summary Available</h3>
            <p className="text-slate-400">
              This meeting hasn't been summarized yet.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Powered by Smart Meeting Assistant</p>
        </div>
      </div>
    </div>
  );
};

export default SharedMeeting;