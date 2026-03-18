// backend/services/meetingService.js
const Meeting = require('../models/Meeting');
const Transcript = require('../models/Transcript');
const Task = require('../models/Task');

class MeetingService {
  /**
   * Search meetings with advanced filters
   */
  async searchMeetings(userId, filters = {}) {
    try {
      const query = {
        $or: [
          { 'owner.userId': userId },
          { 'participants.userId': userId }
        ]
      };

      // Keyword search (title, description, transcript)
      if (filters.keyword) {
        query.$text = { $search: filters.keyword };
      }

      // Participant filter
      if (filters.participant) {
        query['participants.name'] = new RegExp(filters.participant, 'i');
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        query.scheduledDate = {};
        if (filters.startDate) {
          query.scheduledDate.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.scheduledDate.$lte = new Date(filters.endDate);
        }
      }

      // Time range shortcuts
      if (filters.timeRange) {
        const now = new Date();
        switch (filters.timeRange) {
          case 'today':
            query.scheduledDate = {
              $gte: new Date(now.setHours(0, 0, 0, 0)),
              $lte: new Date(now.setHours(23, 59, 59, 999))
            };
            break;
          case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            query.scheduledDate = {
              $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
              $lte: new Date(yesterday.setHours(23, 59, 59, 999))
            };
            break;
          case 'this_week':
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            query.scheduledDate = { $gte: new Date(weekStart.setHours(0, 0, 0, 0)) };
            break;
          case 'last_week':
            const lastWeekEnd = new Date(now);
            lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
            const lastWeekStart = new Date(lastWeekEnd);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            query.scheduledDate = {
              $gte: lastWeekStart,
              $lte: lastWeekEnd
            };
            break;
          case 'this_month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            query.scheduledDate = { $gte: monthStart };
            break;
          case 'last_month':
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            query.scheduledDate = {
              $gte: lastMonthStart,
              $lte: lastMonthEnd
            };
            break;
        }
      }

      // Status filter
      if (filters.status) {
        query.status = filters.status;
      }

      const meetings = await Meeting.find(query)
        .sort({ scheduledDate: -1 })
        .limit(filters.limit || 50);

      return {
        success: true,
        meetings,
        count: meetings.length
      };
    } catch (error) {
      console.error('Meeting search error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get meeting with full details
   */
  async getMeetingDetails(meetingId) {
    try {
      const meeting = await Meeting.findOne({ meetingId });

      if (!meeting) {
        return {
          success: false,
          error: 'Meeting not found'
        };
      }

      // Get transcripts
      const transcripts = await Transcript.find({
        meetingId: meeting.meetingId,
        processingStatus: 'completed'
      });

      // Get related tasks
      const tasks = await Task.find({
        meetingId: meeting._id
      });

      return {
        success: true,
        meeting,
        transcripts,
        tasks
      };
    } catch (error) {
      console.error('Get meeting details error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create meeting with AI-extracted parameters
   */
  async createMeeting(userId, userName, params) {
    try {
      const {
        title,
        description,
        date,
        time,
        participants = [],
        duration = 60
      } = params;

      const meeting = new Meeting({
        meetingId: `meeting_${Date.now()}`,
        title: title || 'Untitled Meeting',
        description: description || '',
        scheduledDate: date || new Date(),
        scheduledTime: time || '',
        duration,
        owner: {
          userId,
          name: userName
        },
        participants: participants.map((name, idx) => ({
          userId: `user_${Date.now()}_${idx}`,
          name: name.trim(),
          joinedAt: null
        })),
        status: 'scheduled'
      });

      await meeting.save();

      return {
        success: true,
        meeting,
        message: `Meeting "${title}" scheduled`
      };
    } catch (error) {
      console.error('Create meeting error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search transcript content
   */
  async searchTranscripts(userId, keyword) {
    try {
      // Get user's meetings
      const meetings = await Meeting.find({
        $or: [
          { 'owner.userId': userId },
          { 'participants.userId': userId }
        ]
      }).select('meetingId title');

      const meetingIds = meetings.map(m => m.meetingId);

      // Search transcripts
      const transcripts = await Transcript.find({
        meetingId: { $in: meetingIds },
        $text: { $search: keyword },
        processingStatus: 'completed'
      }).limit(20);

      // Match with meetings
      const results = transcripts.map(t => {
        const meeting = meetings.find(m => m.meetingId === t.meetingId);
        return {
          meeting: {
            id: meeting._id,
            title: meeting.title,
            meetingId: meeting.meetingId
          },
          transcript: t,
          relevantSegments: t.segments
            .filter(s => s.text.toLowerCase().includes(keyword.toLowerCase()))
            .slice(0, 3)
        };
      });

      return {
        success: true,
        results,
        count: results.length
      };
    } catch (error) {
      console.error('Transcript search error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get meeting analytics
   */
  async getMeetingAnalytics(userId, timeRange = 'this_month') {
    try {
      const query = {
        $or: [
          { 'owner.userId': userId },
          { 'participants.userId': userId }
        ]
      };

      // Apply time range
      const now = new Date();
      switch (timeRange) {
        case 'this_week':
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          query.scheduledDate = { $gte: weekStart };
          break;
        case 'this_month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          query.scheduledDate = { $gte: monthStart };
          break;
        case 'this_year':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          query.scheduledDate = { $gte: yearStart };
          break;
      }

      const meetings = await Meeting.find(query);

      const analytics = {
        totalMeetings: meetings.length,
        totalDuration: meetings.reduce((sum, m) => sum + (m.duration || 0), 0),
        byStatus: {
          scheduled: meetings.filter(m => m.status === 'scheduled').length,
          inProgress: meetings.filter(m => m.status === 'in-progress').length,
          completed: meetings.filter(m => m.status === 'completed').length
        },
        participants: {},
        averageDuration: 0
      };

      // Calculate average
      if (meetings.length > 0) {
        analytics.averageDuration = Math.round(analytics.totalDuration / meetings.length);
      }

      // Count participants
      meetings.forEach(meeting => {
        meeting.participants.forEach(p => {
          if (p.name) {
            analytics.participants[p.name] = (analytics.participants[p.name] || 0) + 1;
          }
        });
      });

      return {
        success: true,
        analytics
      };
    } catch (error) {
      console.error('Meeting analytics error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new MeetingService();