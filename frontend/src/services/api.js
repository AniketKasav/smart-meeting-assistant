// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (for future auth tokens)
api.interceptors.request.use(
  (config) => {
    // Add auth token here when implemented
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==================
// MEETINGS API
// ==================

export const meetingsAPI = {
  // Get all meetings
  getAllMeetings: (params = {}) => {
    return api.get('/api/meetings', { params });
  },

  // Get single meeting
  getMeeting: (meetingId) => {
    return api.get(`/api/meetings/${meetingId}`);
  },

  // Update meeting
  updateMeeting: (meetingId, data) => {
    return api.put(`/api/meetings/${meetingId}`, data);
  },

  // Delete meeting
  deleteMeeting: (meetingId) => {
    return api.delete(`/api/meetings/${meetingId}`);
  },

  // Get meeting transcripts
  getMeetingTranscripts: (meetingId) => {
    return api.get(`/api/meetings/${meetingId}/transcripts`);
  },

  // Search transcripts
  searchTranscripts: (query, meetingId = null) => {
    return api.get('/api/transcripts/search', {
      params: { q: query, meetingId }
    });
  },

  // Manual transcription trigger
  triggerTranscription: (meetingId, userId) => {
    return api.post('/api/transcribe', null, {
      params: { meetingId, userId }
    });
  },
};

// ==================
// HEALTH CHECK
// ==================

export const healthAPI = {
  check: () => api.get('/api/health'),
};

export default api;