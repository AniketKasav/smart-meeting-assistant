// frontend/src/services/meetingHandlers.js - ENHANCED for Phase 6
import api from './api';

export const meetingHandlers = {
  // Show latest meeting
  showLatestMeeting: async (navigate) => {
    try {
      const response = await api.get('/meetings', {
        params: { limit: 1, sort: '-createdAt' }
      });
      
      if (response.data.meetings && response.data.meetings.length > 0) {
        const latestMeeting = response.data.meetings[0];
        navigate(`/meetings/${latestMeeting._id}`);
        return { success: true, message: `Opening ${latestMeeting.title}` };
      }
      
      navigate('/meetings');
      return { success: true, message: 'No meetings found' };
    } catch (error) {
      console.error('Show latest meeting error:', error);
      navigate('/meetings');
      return { success: false, message: 'Failed to open latest meeting' };
    }
  },

  // Create new meeting with AI-extracted params
  createMeeting: async (navigate, params = {}) => {
    try {
      const { title, description, date, time, participants, duration } = params;
      
      // If we have all required params, create meeting directly
      if (title && (date || time)) {
        const meetingData = {
          title,
          description: description || '',
          scheduledDate: date || new Date().toISOString(),
          scheduledTime: time || '',
          duration: duration || 60,
          participants: participants || [],
          status: 'scheduled'
        };
        
        const response = await api.post('/meetings', meetingData);
        
        if (response.data.success) {
          navigate(`/meetings/${response.data.meeting._id}`);
          return { 
            success: true, 
            message: `Meeting "${title}" scheduled successfully`,
            data: response.data.meeting
          };
        }
      }
      
      // Otherwise, open modal with pre-filled data
      navigate('/dashboard');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openCreateMeeting', { 
          detail: params 
        }));
      }, 300);
      
      return { success: true, message: 'Opening create meeting form' };
    } catch (error) {
      console.error('Create meeting error:', error);
      return { success: false, message: 'Failed to create meeting' };
    }
  },

  // Search meetings with advanced filters
  searchMeetings: async (navigate, params = {}) => {
    try {
      const { keyword, participant, timeRange, startDate, endDate } = params;
      
      const queryParams = new URLSearchParams();
      if (keyword) queryParams.append('search', keyword);
      if (participant) queryParams.append('participant', participant);
      if (timeRange) queryParams.append('timeRange', timeRange);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      navigate(`/meetings?${queryParams.toString()}`);
      
      let message = 'Searching meetings';
      if (keyword) message += ` for "${keyword}"`;
      if (participant) message += ` with ${participant}`;
      if (timeRange) message += ` from ${timeRange.replace('_', ' ')}`;
      
      return { success: true, message };
    } catch (error) {
      console.error('Search meetings error:', error);
      return { success: false, message: 'Failed to search meetings' };
    }
  },

  // Show specific meeting by title/ID
  showMeeting: async (navigate, params = {}) => {
    try {
      const { title, id, meetingId } = params;
      
      // Direct ID navigation
      if (id) {
        navigate(`/meetings/${id}`);
        return { success: true, message: 'Opening meeting' };
      }
      
      if (meetingId) {
        navigate(`/meetings/${meetingId}`);
        return { success: true, message: 'Opening meeting' };
      }
      
      // Search by title
      if (title) {
        const response = await api.get('/meetings');
        const meetings = response.data.meetings || [];
        
        const meeting = meetings.find(m => 
          m.title?.toLowerCase().includes(title.toLowerCase())
        );
        
        if (meeting) {
          navigate(`/meetings/${meeting._id}`);
          return { success: true, message: `Opening "${meeting.title}"` };
        }
        
        return { success: false, message: `Meeting "${title}" not found` };
      }
      
      navigate('/meetings');
      return { success: false, message: 'No meeting specified' };
    } catch (error) {
      console.error('Show meeting error:', error);
      return { success: false, message: 'Failed to open meeting' };
    }
  },

  // Show transcript for meeting
  showTranscript: async (navigate, params = {}) => {
    try {
      const { meetingId, title } = params;
      
      if (meetingId) {
        navigate(`/meetings/${meetingId}#transcript`);
        return { success: true, message: 'Showing transcript' };
      }
      
      if (title) {
        const response = await api.get('/meetings');
        const meetings = response.data.meetings || [];
        
        const meeting = meetings.find(m => 
          m.title?.toLowerCase().includes(title.toLowerCase())
        );
        
        if (meeting) {
          navigate(`/meetings/${meeting._id}#transcript`);
          return { success: true, message: `Showing transcript for "${meeting.title}"` };
        }
        
        return { success: false, message: `Meeting "${title}" not found` };
      }
      
      navigate('/meetings');
      return { success: false, message: 'No meeting specified' };
    } catch (error) {
      console.error('Show transcript error:', error);
      return { success: false, message: 'Failed to show transcript' };
    }
  },

  // Show summary for meeting
  showSummary: async (navigate, params = {}) => {
    try {
      const { meetingId, title } = params;
      
      if (meetingId) {
        navigate(`/meetings/${meetingId}#summary`);
        return { success: true, message: 'Showing summary' };
      }
      
      if (title) {
        const response = await api.get('/meetings');
        const meetings = response.data.meetings || [];
        
        const meeting = meetings.find(m => 
          m.title?.toLowerCase().includes(title.toLowerCase())
        );
        
        if (meeting) {
          navigate(`/meetings/${meeting._id}#summary`);
          return { success: true, message: `Showing summary for "${meeting.title}"` };
        }
        
        return { success: false, message: `Meeting "${title}" not found` };
      }
      
      navigate('/meetings');
      return { success: false, message: 'No meeting specified' };
    } catch (error) {
      console.error('Show summary error:', error);
      return { success: false, message: 'Failed to show summary' };
    }
  },

  // Generate summary for meeting
  generateSummary: async (params = {}) => {
    try {
      const { meetingId } = params;
      
      if (!meetingId) {
        return { success: false, message: 'No meeting ID provided' };
      }
      
      const response = await api.post(`/meetings/${meetingId}/summary`);
      
      if (response.data.success) {
        return { 
          success: true, 
          message: 'Summary generated successfully',
          data: response.data.summary
        };
      }
      
      return { success: false, message: 'Failed to generate summary' };
    } catch (error) {
      console.error('Generate summary error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Failed to generate summary' 
      };
    }
  },

  // Start recording (LiveMeeting)
  startRecording: (navigate) => {
    navigate('/live-meeting');
    
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('startRecording'));
    }, 500);
    
    return { success: true, message: 'Starting recording' };
  },

  // Stop recording
  stopRecording: () => {
    window.dispatchEvent(new CustomEvent('stopRecording'));
    return { success: true, message: 'Stopping recording' };
  },

  // Search transcript content
  searchTranscriptContent: async (navigate, params = {}) => {
    try {
      const { keyword } = params;
      
      if (!keyword) {
        return { success: false, message: 'No search keyword provided' };
      }
      
      const response = await api.get('/transcripts/search', {
        params: { q: keyword }
      });
      
      if (response.data.success && response.data.transcripts.length > 0) {
        // Navigate to search results page
        navigate(`/search?type=transcripts&q=${encodeURIComponent(keyword)}`);
        
        return { 
          success: true, 
          message: `Found ${response.data.count} results for "${keyword}"`,
          data: response.data.transcripts
        };
      }
      
      return { 
        success: true, 
        message: `No results found for "${keyword}"`,
        data: [] 
      };
    } catch (error) {
      console.error('Search transcript error:', error);
      return { success: false, message: 'Failed to search transcripts' };
    }
  },

  // Get meeting analytics
  getMeetingAnalytics: async (params = {}) => {
    try {
      const { timeRange = 'this_month' } = params;
      
      const response = await api.get('/analytics/meetings', {
        params: { timeRange }
      });
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.analytics 
        };
      }
      
      return { success: false, message: 'Failed to get analytics' };
    } catch (error) {
      console.error('Get analytics error:', error);
      return { success: false, message: 'Failed to get meeting analytics' };
    }
  }
};