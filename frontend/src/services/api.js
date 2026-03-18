// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // ✅ IMPORTANT: Send cookies with requests
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } 
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/refresh-token`, {
          refreshToken
        });
        
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return api(originalRequest);
      } catch (err) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// ==================
// MEETINGS API
// ==================

export const meetingsAPI = {
  // Get all meetings
  getAllMeetings: (params = {}) => {
    return api.get('/meetings', { params });
  },

  // Get single meeting
  getMeeting: (meetingId) => {
    return api.get(`/meetings/${meetingId}`);
  },

  // Update meeting
  updateMeeting: (meetingId, data) => {
    return api.put(`/meetings/${meetingId}`, data);
  },

  // Delete meeting
  deleteMeeting: (meetingId) => {
    return api.delete(`/meetings/${meetingId}`);
  },

  // Get meeting transcripts
  getMeetingTranscripts: (meetingId) => {
    return api.get(`/meetings/${meetingId}/transcripts`);
  },

  // Search transcripts
  searchTranscripts: (query, meetingId = null) => {
    return api.get('/transcripts/search', {
      params: { q: query, meetingId }
    });
  },

  // Manual transcription trigger
  triggerTranscription: (meetingId, userId) => {
    return api.post('/transcribe', null, {
      params: { meetingId, userId }
    });
  },

  // AI Summary functions
  generateSummary: (meetingId) => 
    api.post(`/meetings/${meetingId}/summary`),

  regenerateSummary: (meetingId, customPrompt) => 
    api.put(`/meetings/${meetingId}/summary/regenerate`, { customPrompt }),

  deleteSummary: (meetingId) => 
    api.delete(`/meetings/${meetingId}/summary`),

  updateActionItem: (meetingId, itemIndex, updates) => 
    api.patch(`/meetings/${meetingId}/summary/action-items/${itemIndex}`, updates),
};

// ==================
// ACTION ITEMS API
// ==================

export const actionItemsAPI = {
  // Get all action items with filters
  getAllActionItems: (params = {}) => {
    return api.get('/action-items', { params });
  },

  // Get list of assignees
  getAssignees: () => {
    return api.get('/action-items/assignees');
  },

  // Update action item
  updateActionItem: (meetingId, itemId, updates) => {
    return api.put(`/action-items/${meetingId}/${itemId}`, updates);
  },

  // Delete action item
  deleteActionItem: (meetingId, itemId) => {
    return api.delete(`/action-items/${meetingId}/${itemId}`);
  },
};

// ==================
// SEARCH API
// ==================

export const searchAPI = {
  // Search across meetings and transcripts
  search: (params = {}) => {
    return api.get('/search', { params });
  },

  // Get search suggestions
  getSuggestions: (query) => {
    return api.get('/search/suggestions', { params: { q: query } });
  },

  // Get recent searches
  getRecentSearches: () => {
    return api.get('/search/recent');
  },
};

// ==================
// EXPORT API
// ==================

export const exportAPI = {
  // Export as PDF
  exportPDF: (meetingId, includeTranscript = false) => {
    const url = `/export/${meetingId}/pdf?includeTranscript=${includeTranscript}`;
    return { url: `${api.defaults.baseURL}${url}` };
  },

  // Export as JSON
  exportJSON: (meetingId, includeTranscript = true) => {
    const url = `/export/${meetingId}/json?includeTranscript=${includeTranscript}`;
    return { url: `${api.defaults.baseURL}${url}` };
  },

  // Export as TXT
  exportTXT: (meetingId) => {
    const url = `/export/${meetingId}/txt`;
    return { url: `${api.defaults.baseURL}${url}` };
  },

  // Generate share link
  generateShareLink: (meetingId, options) => {
    return api.post(`/export/${meetingId}/share`, options);
  },
};

// ==================
// ANALYTICS API
// ==================

export const analyticsAPI = {
  // Get overview statistics
  getOverview: (params = {}) => {
    return api.get('/analytics/overview', { params });
  },

  // Get meeting activity over time
  getMeetingsOverTime: (days = 30, userId = null) => {
    return api.get('/analytics/meetings-over-time', { 
      params: { days, userId } 
    });
  },

  // Get speaking time distribution
  getSpeakingTime: (meetingId = null, userId = null) => {
    return api.get('/analytics/speaking-time', { 
      params: { meetingId, userId } 
    });
  },

  // Get action items analytics
  getActionItems: (status = null, userId = null) => {
    return api.get('/analytics/action-items', { 
      params: { status, userId } 
    });
  },

  // Get sentiment trends
  getSentimentTrends: (days = 30, userId = null) => {
    return api.get('/analytics/sentiment-trends', { 
      params: { days, userId } 
    });
  },

  // Get individual user performance
  getUserPerformance: (userId) => {
    return api.get(`/analytics/user-performance/${userId}`);
  },

  // Get list of all participants (for filter dropdown)
  getAllParticipants: async () => {
    try {
      const response = await api.get('/meetings');
      const meetings = response.data.meetings || [];
      
      // Extract unique participants
      const participantsSet = new Set();
      meetings.forEach(meeting => {
        meeting.participants?.forEach(p => {
          if (p.userId && p.name) {
            participantsSet.add(JSON.stringify({ 
              userId: p.userId, 
              name: p.name 
            }));
          }
        });
      });
      
      return Array.from(participantsSet)
        .map(p => JSON.parse(p))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Failed to fetch participants:', error);
      return [];
    }
  },

  // Export analytics as JSON
  exportAnalyticsJSON: async (timeRange = 30, userId = null) => {
    try {
      const [overview, trends, speaking, actions, sentiment] = await Promise.all([
        analyticsAPI.getOverview({ userId, days: timeRange }),
        analyticsAPI.getMeetingsOverTime(timeRange, userId),
        analyticsAPI.getSpeakingTime(null, userId),
        analyticsAPI.getActionItems(null, userId),
        analyticsAPI.getSentimentTrends(timeRange, userId)
      ]);

      const analyticsData = {
        exportDate: new Date().toISOString(),
        timeRange: `${timeRange} days`,
        userId: userId || 'all',
        overview: overview.data.data,
        meetingsOverTime: trends.data.data,
        speakingTime: speaking.data.data,
        actionItems: actions.data.data,
        sentimentTrends: sentiment.data.data
      };

      // Create download
      const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { 
        type: 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, error: error.message };
    }
  }
};

// ==================
// HEALTH CHECK
// ==================

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;