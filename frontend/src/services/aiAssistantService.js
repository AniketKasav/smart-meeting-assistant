// frontend/src/services/aiAssistantService.js 
import api from './api';

class AIAssistantService {
  constructor() {
    this.currentSessionId = null;
  }

  /**
   * Process user message with AI
   */
  async processMessage(message, sessionId = null) {
    try {
      const response = await api.post('/assistant/process', {
        message,
        sessionId: sessionId || this.currentSessionId
      });

      if (response.data.success) {
        // Store session ID for continuity
        this.currentSessionId = response.data.sessionId;
        return {
          success: true,
          ...response.data.data,
          sessionId: response.data.sessionId
        };
      }

      return {
        success: false,
        error: response.data.error || 'Failed to process message'
      };
    } catch (error) {
      console.error('AI processing error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Network error'
      };
    }
  }

  /**
   * Get conversation history
   */
  async getHistory(sessionId = null) {
    try {
      const response = await api.get('/assistant/context', {
        params: { sessionId: sessionId || this.currentSessionId }
      });

      if (response.data.success) {
        return {
          success: true,
          history: response.data.history || [],
          context: response.data.context || {}
        };
      }

      return {
        success: false,
        error: response.data.error
      };
    } catch (error) {
      console.error('History retrieval error:', error);
      return {
        success: false,
        error: 'Failed to get history'
      };
    }
  }

  /**
   * Get active sessions
   */
  async getSessions() {
    try {
      const response = await api.get('/assistant/context');

      if (response.data.success) {
        return {
          success: true,
          sessions: response.data.sessions || []
        };
      }

      return {
        success: false,
        error: response.data.error
      };
    } catch (error) {
      console.error('Sessions retrieval error:', error);
      return {
        success: false,
        sessions: []
      };
    }
  }

  /**
   * Clear conversation
   */
  async clearConversation(sessionId = null) {
    try {
      const response = await api.delete('/assistant/context', {
        data: { sessionId: sessionId || this.currentSessionId }
      });

      if (response.data.success) {
        this.currentSessionId = null;
        return { success: true };
      }

      return {
        success: false,
        error: response.data.error
      };
    } catch (error) {
      console.error('Clear conversation error:', error);
      return {
        success: false,
        error: 'Failed to clear conversation'
      };
    }
  }

  /**
   * Submit feedback
   */
  async submitFeedback(messageIndex, rating, comment = '') {
    try {
      const response = await api.post('/assistant/feedback', {
        sessionId: this.currentSessionId,
        messageIndex,
        rating,
        comment
      });

      return {
        success: response.data.success
      };
    } catch (error) {
      console.error('Feedback submission error:', error);
      return { success: false };
    }
  }

  /**
   * Check AI health
   */
  async checkHealth() {
    try {
      const response = await api.get('/assistant/health');
      return response.data;
    } catch (error) {
      console.error('Health check error:', error);
      return {
        success: false,
        available: false,
        error: 'Health check failed'
      };
    }
  }

  /**
   * Get proactive suggestions
   */
  async getSuggestions() {
    try {
      const response = await api.get('/assistant/suggestions');
      return {
        success: response.data.success,
        suggestions: response.data.suggestions || []
      };
    } catch (error) {
      console.error('Suggestions error:', error);
      return {
        success: false,
        suggestions: []
      };
    }
  }

  /**
   * Cancel multi-turn conversation
   */
  async cancelMultiTurn() {
    try {
      const response = await api.post('/assistant/cancel-multiturn');
      return { success: response.data.success };
    } catch (error) {
      console.error('Cancel multi-turn error:', error);
      return { success: false };
    }
  }

  /**
   * Start new session
   */
  startNewSession() {
    this.currentSessionId = null;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId() {
    return this.currentSessionId;
  }
}

export default new AIAssistantService();