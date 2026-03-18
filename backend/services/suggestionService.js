// backend/services/suggestionService.js - PROACTIVE AI SUGGESTIONS
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const aiService = require('./aiService');

class SuggestionService {
  /**
   * Get morning briefing for user
   */
  async getMorningBriefing(userId) {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Get today's meetings
      const todaysMeetings = await Meeting.find({
        'owner.userId': userId,
        scheduledDate: todayStr,
        status: { $in: ['scheduled', 'in-progress'] }
      }).sort({ scheduledTime: 1 });

      // Get overdue tasks
      const overdueTasks = await Task.find({
        $or: [
          { 'assignee.userId': userId },
          { 'createdBy.userId': userId }
        ],
        status: { $ne: 'completed' },
        dueDate: { $lt: today }
      });

      // Get pending tasks due today
      const todaysTasks = await Task.find({
        $or: [
          { 'assignee.userId': userId },
          { 'createdBy.userId': userId }
        ],
        status: { $ne: 'completed' },
        dueDate: {
          $gte: new Date(todayStr),
          $lt: new Date(new Date(todayStr).getTime() + 86400000)
        }
      });

      // Build briefing message
      const greeting = this.getGreeting();
      let message = `${greeting}! `;

      if (todaysMeetings.length > 0) {
        message += `You have ${todaysMeetings.length} meeting${todaysMeetings.length > 1 ? 's' : ''} today. `;
      } else {
        message += `No meetings scheduled today. `;
      }

      if (overdueTasks.length > 0) {
        message += `⚠️ ${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} overdue. `;
      }

      if (todaysTasks.length > 0) {
        message += `📋 ${todaysTasks.length} task${todaysTasks.length > 1 ? 's' : ''} due today.`;
      }

      return {
        message,
        data: {
          meetings: todaysMeetings,
          overdueTasks,
          todaysTasks
        },
        suggestions: this.generateSuggestions(todaysMeetings, overdueTasks, todaysTasks)
      };

    } catch (error) {
      console.error('Morning briefing error:', error);
      return {
        message: 'Good morning! Ready to assist you today.',
        data: {},
        suggestions: []
      };
    }
  }

  /**
   * Extract action items from meeting transcript using AI
   */
  async extractActionItems(meetingId) {
    try {
      const meeting = await Meeting.findById(meetingId);
      
      if (!meeting || !meeting.transcriptPath) {
        return { actionItems: [], message: 'No transcript available' };
      }

      // Read transcript
      const fs = require('fs').promises;
      const transcriptData = await fs.readFile(meeting.transcriptPath, 'utf8');
      const transcript = JSON.parse(transcriptData);

      // Use AI to extract action items
      const prompt = `Analyze this meeting transcript and extract action items.

Meeting: ${meeting.title}
Date: ${meeting.scheduledDate}

Transcript:
${transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')}

Extract action items in JSON format:
{
  "actionItems": [
    {
      "title": "brief task title",
      "description": "detailed description",
      "assignee": "person's name or 'Unassigned'",
      "priority": "high|medium|low",
      "suggestedDueDate": "YYYY-MM-DD or null"
    }
  ]
}

Only include clear, actionable tasks. Return valid JSON.`;

      const result = await aiService.callOllama(prompt);
      
      const actionItems = result.actionItems || [];
      
      return {
        actionItems,
        message: actionItems.length > 0 
          ? `Found ${actionItems.length} action item${actionItems.length > 1 ? 's' : ''} in this meeting.`
          : 'No clear action items found.',
        suggestion: actionItems.length > 0 
          ? 'Would you like me to create tasks for these action items?'
          : null
      };

    } catch (error) {
      console.error('Action item extraction error:', error);
      return {
        actionItems: [],
        message: 'Could not extract action items.',
        suggestion: null
      };
    }
  }

  /**
   * Detect scheduling conflicts
   */
  async detectConflicts(userId, proposedDate, proposedTime) {
    try {
      const existingMeetings = await Meeting.find({
        'owner.userId': userId,
        scheduledDate: proposedDate,
        status: { $in: ['scheduled', 'in-progress'] }
      });

      const conflicts = existingMeetings.filter(m => {
        if (!m.scheduledTime) return false;
        
        // Simple time comparison (assuming HH:MM format)
        const existingTime = m.scheduledTime;
        const timeDiff = this.getTimeDifference(existingTime, proposedTime);
        
        // Consider conflict if within 1 hour
        return Math.abs(timeDiff) < 60;
      });

      if (conflicts.length > 0) {
        return {
          hasConflict: true,
          conflicts,
          message: `⚠️ You have ${conflicts.length} meeting${conflicts.length > 1 ? 's' : ''} around that time.`,
          suggestion: 'Would you like to schedule at a different time?'
        };
      }

      return {
        hasConflict: false,
        message: 'No conflicts detected.',
        suggestion: null
      };

    } catch (error) {
      console.error('Conflict detection error:', error);
      return {
        hasConflict: false,
        message: 'Could not check for conflicts.',
        suggestion: null
      };
    }
  }

  /**
   * Suggest participants based on meeting history
   */
  async suggestParticipants(userId, meetingTitle) {
    try {
      // Find similar past meetings
      const pastMeetings = await Meeting.find({
        'owner.userId': userId,
        status: 'completed',
        title: new RegExp(meetingTitle, 'i')
      }).limit(5);

      if (pastMeetings.length === 0) {
        return { participants: [], message: 'No suggestions available.' };
      }

      // Count participant frequency
      const participantFrequency = {};
      pastMeetings.forEach(meeting => {
        meeting.participants.forEach(p => {
          if (p.userId !== userId) {
            participantFrequency[p.name] = (participantFrequency[p.name] || 0) + 1;
          }
        });
      });

      // Sort by frequency
      const suggested = Object.entries(participantFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, frequency: count }));

      return {
        participants: suggested,
        message: suggested.length > 0
          ? `Based on similar meetings, you usually invite: ${suggested.map(p => p.name).join(', ')}`
          : 'No participant suggestions available.'
      };

    } catch (error) {
      console.error('Participant suggestion error:', error);
      return { participants: [], message: 'Could not suggest participants.' };
    }
  }

  /**
   * Get meeting reminder
   */
  async getUpcomingReminder(userId, minutesBefore = 15) {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + minutesBefore * 60000);

      const upcomingMeetings = await Meeting.find({
        'owner.userId': userId,
        scheduledDate: now.toISOString().split('T')[0],
        status: 'scheduled'
      });

      const reminders = upcomingMeetings.filter(meeting => {
        if (!meeting.scheduledTime) return false;
        
        const [hours, minutes] = meeting.scheduledTime.split(':');
        const meetingTime = new Date(now);
        meetingTime.setHours(parseInt(hours), parseInt(minutes), 0);

        return meetingTime > now && meetingTime <= futureTime;
      });

      if (reminders.length > 0) {
        const meeting = reminders[0];
        return {
          hasReminder: true,
          meeting,
          message: `⏰ Reminder: "${meeting.title}" starts in ${minutesBefore} minutes at ${meeting.scheduledTime}.`,
          suggestion: 'Would you like to review the agenda?'
        };
      }

      return { hasReminder: false };

    } catch (error) {
      console.error('Reminder check error:', error);
      return { hasReminder: false };
    }
  }

  /**
   * Helper: Get greeting based on time
   */
  getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  /**
   * Helper: Calculate time difference in minutes
   */
  getTimeDifference(time1, time2) {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h1 * 60 + m1) - (h2 * 60 + m2);
  }

  /**
   * Helper: Generate action suggestions
   */
  generateSuggestions(meetings, overdueTasks, todaysTasks) {
    const suggestions = [];

    if (overdueTasks.length > 0) {
      suggestions.push({
        type: 'urgent',
        icon: '⚠️',
        message: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
        action: 'Review overdue tasks',
        actionType: 'navigate',
        target: '/action-items'
      });
    }

    if (meetings.length > 0) {
      suggestions.push({
        type: 'info',
        icon: '📅',
        message: `${meetings.length} meeting${meetings.length > 1 ? 's' : ''} today`,
        action: 'View schedule',
        actionType: 'navigate',
        target: '/meetings'
      });
    }

    if (todaysTasks.length > 0) {
      suggestions.push({
        type: 'info',
        icon: '✓',
        message: `${todaysTasks.length} task${todaysTasks.length > 1 ? 's' : ''} due today`,
        action: 'View tasks',
        actionType: 'navigate',
        target: '/action-items'
      });
    }

    return suggestions;
  }
}

module.exports = new SuggestionService();