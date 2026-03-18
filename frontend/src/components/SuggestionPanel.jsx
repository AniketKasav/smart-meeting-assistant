// frontend/src/components/SuggestionPanel.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle, Info, CheckCircle, Calendar, Clock } from 'lucide-react';

export default function SuggestionPanel({ userId, onClose }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMorningBriefing();
  }, [userId]);

  const fetchMorningBriefing = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/suggestions/briefing/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setBriefing(data);
    } catch (error) {
      console.error('Failed to fetch briefing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.actionType === 'navigate') {
      navigate(suggestion.target);
      if (onClose) onClose();
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'urgent': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-md animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Daily Briefing</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Message */}
      <div className="p-4 bg-blue-50">
        <p className="text-gray-700">{briefing.message}</p>
      </div>

      {/* Suggestions */}
      {briefing.suggestions && briefing.suggestions.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            {briefing.suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <span className="text-2xl">{suggestion.icon}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">{suggestion.message}</p>
                  <p className="text-xs text-blue-600">{suggestion.action}</p>
                </div>
                {getIconForType(suggestion.type)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's Meetings Preview */}
      {briefing.data?.meetings && briefing.data.meetings.length > 0 && (
        <div className="p-4 border-t">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Today's Schedule</h4>
          <div className="space-y-2">
            {briefing.data.meetings.slice(0, 3).map((meeting, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded bg-gray-50"
              >
                <Clock className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                  <p className="text-xs text-gray-500">{meeting.scheduledTime}</p>
                </div>
              </div>
            ))}
            {briefing.data.meetings.length > 3 && (
              <button
                onClick={() => navigate('/meetings')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                +{briefing.data.meetings.length - 3} more meetings
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overdue Tasks Warning */}
      {briefing.data?.overdueTasks && briefing.data.overdueTasks.length > 0 && (
        <div className="p-4 bg-red-50 border-t border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <h4 className="text-sm font-semibold text-red-700">Overdue Tasks</h4>
          </div>
          <div className="space-y-1">
            {briefing.data.overdueTasks.slice(0, 3).map((task, index) => (
              <p key={index} className="text-xs text-red-600">
                • {task.title}
              </p>
            ))}
          </div>
          <button
            onClick={() => navigate('/action-items')}
            className="mt-2 text-xs text-red-700 font-medium hover:text-red-800"
          >
            Review all →
          </button>
        </div>
      )}
    </div>
  );
}