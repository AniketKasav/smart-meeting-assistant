// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Transcript = require('../models/Transcript');
// const analyticsService = require('../services/analyticsService');

/**
 * GET /api/analytics/overview
 * Get overall meeting statistics
 */
router.get('/overview', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    // Build query
    const query = {};
    if (userId) {
      query.$or = [
        { 'owner.userId': userId },
        { 'participants.userId': userId }
      ];
    }
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate);
      if (endDate) query.startedAt.$lte = new Date(endDate);
    }

    // Get all meetings
    const meetings = await Meeting.find(query);

    // Calculate statistics
    const totalMeetings = meetings.length;
    const completedMeetings = meetings.filter(m => m.status === 'completed').length;
    const totalDuration = meetings.reduce((sum, m) => sum + (m.duration || 0), 0);
    const avgDuration = totalMeetings > 0 ? totalDuration / totalMeetings : 0;

    // Unique participants
    const allParticipants = new Set();
    meetings.forEach(m => {
      m.participants.forEach(p => allParticipants.add(p.userId));
    });

    // Action items stats
    let totalActionItems = 0;
    let completedActionItems = 0;
    let overdueActionItems = 0;
    const now = new Date();

    meetings.forEach(m => {
      if (m.summary?.actionItems) {
        totalActionItems += m.summary.actionItems.length;
        m.summary.actionItems.forEach(item => {
          if (item.status === 'completed') {
            completedActionItems++;
          }
          if (item.dueDate && new Date(item.dueDate) < now && item.status !== 'completed') {
            overdueActionItems++;
          }
        });
      }
    });

    const actionItemCompletionRate = totalActionItems > 0 
      ? (completedActionItems / totalActionItems) * 100 
      : 0;

    // Sentiment distribution (use autoSentiment if summary doesn't exist)
    const sentimentCounts = {
      positive: meetings.filter(m => 
        (m.summary?.sentiment === 'positive') || 
        (!m.summary && m.autoSentiment?.sentiment === 'positive')
      ).length,
      neutral: meetings.filter(m => 
        (m.summary?.sentiment === 'neutral') || 
        (!m.summary && m.autoSentiment?.sentiment === 'neutral')
      ).length,
      negative: meetings.filter(m => 
        (m.summary?.sentiment === 'negative') || 
        (!m.summary && m.autoSentiment?.sentiment === 'negative')
      ).length
    };

    res.json({
      success: true,
      data: {
        totalMeetings,
        completedMeetings,
        totalDuration, // Keep precise value
        avgDuration, // Keep precise value
        totalParticipants: allParticipants.size,
        actionItems: {
          total: totalActionItems,
          completed: completedActionItems,
          overdue: overdueActionItems,
          completionRate: Math.round(actionItemCompletionRate)
        },
        sentiment: sentimentCounts
      }
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/meetings-over-time
 * Get meeting count grouped by date
 */
router.get('/meetings-over-time', async (req, res) => {
  try {
    const { userId, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const query = { startedAt: { $gte: startDate } };
    if (userId) {
      query.$or = [
        { 'owner.userId': userId },
        { 'participants.userId': userId }
      ];
    }

    const meetings = await Meeting.find(query).sort({ startedAt: 1 });

    // Group by date
    const meetingsByDate = {};
    meetings.forEach(m => {
      const date = m.startedAt.toISOString().split('T')[0];
      meetingsByDate[date] = (meetingsByDate[date] || 0) + 1;
    });

    // Convert to array format for charts
    const data = Object.entries(meetingsByDate).map(([date, count]) => ({
      date,
      count
    }));

    res.json({ success: true, data });

  } catch (error) {
    console.error('Meetings over time error:', error);
    res.status(500).json({ error: 'Failed to fetch meeting trends' });
  }
});

/**
 * GET /api/analytics/speaking-time
 * Get speaking time distribution for meetings
 */
router.get('/speaking-time', async (req, res) => {
  try {
    const { userId, meetingId } = req.query;

    const query = {};
    if (meetingId) {
      query.meetingId = meetingId;
    } else if (userId) {
      // Get all meetings where user participated
      const meetings = await Meeting.find({
        $or: [
          { 'owner.userId': userId },
          { 'participants.userId': userId }
        ]
      }).select('meetingId');
      
      query.meetingId = { $in: meetings.map(m => m.meetingId) };
    }

    const transcripts = await Transcript.find(query);

    // Calculate speaking time per user
    const speakingTime = {};
    transcripts.forEach(t => {
      const userName = t.userName || t.userId;
      const duration = t.segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
      
      speakingTime[userName] = (speakingTime[userName] || 0) + duration;
    });

    // Convert to array and sort (keep precise decimal values, don't round yet)
    const data = Object.entries(speakingTime)
      .map(([name, duration]) => ({
        name,
        duration: duration, // Keep precise value
        percentage: 0 // Will calculate after total
      }))
      .sort((a, b) => b.duration - a.duration);

    // Calculate percentages
    const total = data.reduce((sum, item) => sum + item.duration, 0);
    data.forEach(item => {
      item.percentage = total > 0 ? Math.round((item.duration / total) * 100) : 0;
    });

    res.json({ success: true, data });

  } catch (error) {
    console.error('Speaking time error:', error);
    res.status(500).json({ error: 'Failed to fetch speaking time data' });
  }
});

/**
 * GET /api/analytics/action-items
 * Get action items statistics
 */
router.get('/action-items', async (req, res) => {
  try {
    const { userId, status } = req.query;

    const query = {};
    if (userId) {
      query.$or = [
        { 'owner.userId': userId },
        { 'participants.userId': userId }
      ];
    }

    const meetings = await Meeting.find(query);

    // Collect all action items
    const allActionItems = [];
    meetings.forEach(m => {
      if (m.summary?.actionItems) {
        m.summary.actionItems.forEach(item => {
          allActionItems.push({
            ...item.toObject(),
            meetingId: m.meetingId,
            meetingTitle: m.title
          });
        });
      }
    });

    // Filter by status if provided
    const filteredItems = status 
      ? allActionItems.filter(item => item.status === status)
      : allActionItems;

    // Group by status
    const byStatus = {
      open: allActionItems.filter(i => i.status === 'open').length,
      'in-progress': allActionItems.filter(i => i.status === 'in-progress').length,
      completed: allActionItems.filter(i => i.status === 'completed').length
    };

    // Group by priority
    const byPriority = {
      high: allActionItems.filter(i => i.priority === 'high').length,
      medium: allActionItems.filter(i => i.priority === 'medium').length,
      low: allActionItems.filter(i => i.priority === 'low').length
    };

    // Get overdue items
    const now = new Date();
    const overdueItems = allActionItems.filter(item => 
      item.dueDate && new Date(item.dueDate) < now && item.status !== 'completed'
    );

    res.json({
      success: true,
      data: {
        total: allActionItems.length,
        byStatus,
        byPriority,
        overdue: overdueItems.length,
        items: filteredItems.slice(0, 50) // Return first 50 items
      }
    });

  } catch (error) {
    console.error('Action items analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch action items data' });
  }
});

/**
 * GET /api/analytics/sentiment-trends
 * Get sentiment analysis over time
 */
router.get('/sentiment-trends', async (req, res) => {
  try {
    const { userId, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const query = { 
      startedAt: { $gte: startDate },
      $or: [
        { 'summary.sentiment': { $exists: true } },
        { 'autoSentiment.sentiment': { $exists: true } }
      ]
    };
    
    if (userId) {
      query.$or = [
        { 'owner.userId': userId },
        { 'participants.userId': userId }
      ];
    }

    const meetings = await Meeting.find(query).sort({ startedAt: 1 });

    // Group by date and sentiment (use autoSentiment as fallback)
    const sentimentByDate = {};
    meetings.forEach(m => {
      const date = m.startedAt.toISOString().split('T')[0];
      if (!sentimentByDate[date]) {
        sentimentByDate[date] = { positive: 0, neutral: 0, negative: 0 };
      }
      
      // Use summary sentiment if available, otherwise use autoSentiment
      const sentiment = m.summary?.sentiment || m.autoSentiment?.sentiment || 'neutral';
      sentimentByDate[date][sentiment]++;
    });

    // Convert to array format
    const data = Object.entries(sentimentByDate).map(([date, sentiments]) => ({
      date,
      ...sentiments,
      total: sentiments.positive + sentiments.neutral + sentiments.negative
    }));

    res.json({ success: true, data });

  } catch (error) {
    console.error('Sentiment trends error:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment trends' });
  }
});

/**
 * GET /api/analytics/user-performance
 * Get detailed performance metrics for a user
 */
router.get('/user-performance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get meetings where user participated
    const meetings = await Meeting.find({
      $or: [
        { 'owner.userId': userId },
        { 'participants.userId': userId }
      ]
    });

    // Get transcripts for this user
    const transcripts = await Transcript.find({ userId });

    // Calculate metrics
    const totalMeetings = meetings.length;
    const totalSpeakingTime = transcripts.reduce((sum, t) => 
      sum + t.segments.reduce((s, seg) => s + (seg.end - seg.start), 0), 0
    );
    const totalWords = transcripts.reduce((sum, t) => 
      sum + (t.stats?.totalWords || 0), 0
    );
    const avgWPM = totalSpeakingTime > 0 ? (totalWords / (totalSpeakingTime / 60)) : 0;

    // Action items assigned to user
    let assignedActionItems = 0;
    let completedActionItems = 0;
    
    meetings.forEach(m => {
      if (m.summary?.actionItems) {
        m.summary.actionItems.forEach(item => {
          if (item.assignee.toLowerCase().includes(userId.toLowerCase())) {
            assignedActionItems++;
            if (item.status === 'completed') {
              completedActionItems++;
            }
          }
        });
      }
    });

    const completionRate = assignedActionItems > 0 
      ? (completedActionItems / assignedActionItems) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        userId,
        metrics: {
          totalMeetings,
          totalSpeakingTime: Math.round(totalSpeakingTime),
          totalWords,
          avgWordsPerMinute: Math.round(avgWPM),
          assignedActionItems,
          completedActionItems,
          completionRate: Math.round(completionRate)
        }
      }
    });

  } catch (error) {
    console.error('User performance error:', error);
    res.status(500).json({ error: 'Failed to fetch user performance' });
  }
});


/**
 * GET /api/analytics/:userId - NEW ROUTE
 * Get comprehensive analytics (uses service)
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange } = req.query;

    const analytics = await analyticsService.getUserAnalytics(
      userId, 
      timeRange || 'month'
    );

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/:userId/insights - NEW ROUTE
 */
router.get('/:userId/insights', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange } = req.query;

    const insights = await analyticsService.getMeetingInsights(
      userId,
      timeRange || 'month'
    );

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;