// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Transcript = require('../models/Transcript');
const authenticateToken = require('../middleware/authenticateToken');

// All routes require authentication
router.use(authenticateToken);

// ── Helper: build meeting query scoped to current user ────────────────────────
// Host   → meetings they own
// Member → meetings they participated in
function userMeetingQuery(userId, extra = {}) {
  return {
    $or: [
      { 'host.userId': userId },
      { 'participants.userId': userId }
    ],
    ...extra
  };
}

/**
 * GET /api/analytics/overview
 * Global stats — scoped to current user's meetings
 */
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    const query = userMeetingQuery(userId);
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate);
      if (endDate)   query.startedAt.$lte = new Date(endDate);
    }

    const meetings = await Meeting.find(query);

    const totalMeetings     = meetings.length;
    const completedMeetings = meetings.filter(m => m.status === 'completed').length;
    const totalDuration     = meetings.reduce((sum, m) => sum + (m.duration || 0), 0);
    const avgDuration       = totalMeetings > 0 ? totalDuration / totalMeetings : 0;

    const allParticipants = new Set();
    meetings.forEach(m => m.participants.forEach(p => allParticipants.add(p.userId)));

    let totalActionItems = 0, completedActionItems = 0, overdueActionItems = 0;
    const now = new Date();

    meetings.forEach(m => {
      if (!m.summary?.actionItems) return;
      totalActionItems += m.summary.actionItems.length;
      m.summary.actionItems.forEach(item => {
        if (item.status === 'completed') completedActionItems++;
        if (item.dueDate && new Date(item.dueDate) < now && item.status !== 'completed') {
          overdueActionItems++;
        }
      });
    });

    const sentimentCounts = {
      positive: meetings.filter(m =>
        m.summary?.sentiment === 'positive' ||
        (!m.summary && m.autoSentiment?.sentiment === 'positive')
      ).length,
      neutral: meetings.filter(m =>
        m.summary?.sentiment === 'neutral' ||
        (!m.summary && m.autoSentiment?.sentiment === 'neutral')
      ).length,
      negative: meetings.filter(m =>
        m.summary?.sentiment === 'negative' ||
        (!m.summary && m.autoSentiment?.sentiment === 'negative')
      ).length
    };

    res.json({
      success: true,
      data: {
        totalMeetings,
        completedMeetings,
        totalDuration,
        avgDuration,
        totalParticipants: allParticipants.size,
        actionItems: {
          total: totalActionItems,
          completed: completedActionItems,
          overdue: overdueActionItems,
          completionRate: totalActionItems > 0
            ? Math.round((completedActionItems / totalActionItems) * 100)
            : 0
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
 * Scoped to current user's meetings
 */
router.get('/meetings-over-time', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const meetings = await Meeting.find(
      userMeetingQuery(userId, { startedAt: { $gte: startDate } })
    ).sort({ startedAt: 1 });

    const meetingsByDate = {};
    meetings.forEach(m => {
      const date = m.startedAt.toISOString().split('T')[0];
      meetingsByDate[date] = (meetingsByDate[date] || 0) + 1;
    });

    const data = Object.entries(meetingsByDate).map(([date, count]) => ({ date, count }));

    res.json({ success: true, data });

  } catch (error) {
    console.error('Meetings over time error:', error);
    res.status(500).json({ error: 'Failed to fetch meeting trends' });
  }
});

/**
 * GET /api/analytics/speaking-time
 * Host   → all participants' speaking time
 * Member → only their own speaking time
 */
router.get('/speaking-time', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetingId } = req.query;

    const query = {};
    if (meetingId) {
      // Verify user is a participant of this meeting
      const meeting = await Meeting.findOne({ meetingId });
      if (!meeting || !meeting.isParticipant(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      query.meetingId = meetingId;
    } else {
      const meetings = await Meeting.find(userMeetingQuery(userId)).select('meetingId');
      query.meetingId = { $in: meetings.map(m => m.meetingId) };
    }

    const transcripts = await Transcript.find(query);
    const isHostSomewhere = await Meeting.findOne({ 'host.userId': userId });

    const speakingTime = {};
    transcripts.forEach(t => {
      // Member: only include their own data
      if (!isHostSomewhere && t.userId !== userId) return;

      const name = t.userName || t.userId;
      const duration = t.segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
      speakingTime[name] = (speakingTime[name] || 0) + duration;
    });

    const total = Object.values(speakingTime).reduce((s, v) => s + v, 0);
    const data = Object.entries(speakingTime)
      .map(([name, duration]) => ({
        name,
        duration,
        percentage: total > 0 ? Math.round((duration / total) * 100) : 0
      }))
      .sort((a, b) => b.duration - a.duration);

    res.json({ success: true, data });

  } catch (error) {
    console.error('Speaking time error:', error);
    res.status(500).json({ error: 'Failed to fetch speaking time data' });
  }
});

/**
 * GET /api/analytics/action-items
 * Host   → all action items from their meetings
 * Member → only items assigned to them
 */
router.get('/action-items', async (req, res) => {
  try {
    const userId   = req.user.userId;
    const userName = req.user.name;
    const { status } = req.query;

    const meetings = await Meeting.find(userMeetingQuery(userId));

    const allActionItems = [];
    meetings.forEach(m => {
      if (!m.summary?.actionItems) return;
      const isHost = m.isHost(userId);

      m.summary.actionItems.forEach(item => {
        // Member: only their assigned items
        if (!isHost && item.assignee?.toLowerCase() !== userName.toLowerCase()) return;

        allActionItems.push({
          ...item.toObject(),
          meetingId: m.meetingId,
          meetingTitle: m.title
        });
      });
    });

    const filtered = status
      ? allActionItems.filter(i => i.status === status)
      : allActionItems;

    const byStatus = {
      open:         allActionItems.filter(i => i.status === 'open').length,
      'in-progress': allActionItems.filter(i => i.status === 'in-progress').length,
      completed:    allActionItems.filter(i => i.status === 'completed').length
    };

    const byPriority = {
      high:   allActionItems.filter(i => i.priority === 'high').length,
      medium: allActionItems.filter(i => i.priority === 'medium').length,
      low:    allActionItems.filter(i => i.priority === 'low').length
    };

    const now = new Date();
    const overdueItems = allActionItems.filter(i =>
      i.dueDate && new Date(i.dueDate) < now && i.status !== 'completed'
    );

    res.json({
      success: true,
      data: {
        total: allActionItems.length,
        byStatus,
        byPriority,
        overdue: overdueItems.length,
        items: filtered.slice(0, 50)
      }
    });

  } catch (error) {
    console.error('Action items analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch action items data' });
  }
});

/**
 * GET /api/analytics/sentiment-trends
 * Scoped to current user's meetings
 */
router.get('/sentiment-trends', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const meetings = await Meeting.find(
      userMeetingQuery(userId, { startedAt: { $gte: startDate } })
    ).sort({ startedAt: 1 });

    const sentimentByDate = {};
    meetings.forEach(m => {
      const date = m.startedAt.toISOString().split('T')[0];
      if (!sentimentByDate[date]) {
        sentimentByDate[date] = { positive: 0, neutral: 0, negative: 0 };
      }
      const sentiment = m.summary?.sentiment || m.autoSentiment?.sentiment || 'neutral';
      sentimentByDate[date][sentiment]++;
    });

    const data = Object.entries(sentimentByDate).map(([date, s]) => ({
      date, ...s, total: s.positive + s.neutral + s.negative
    }));

    res.json({ success: true, data });

  } catch (error) {
    console.error('Sentiment trends error:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment trends' });
  }
});

/**
 * GET /api/analytics/user-performance/:targetUserId
 * Host   → can view any participant's performance
 * Member → can only view their own performance
 */
router.get('/user-performance/:targetUserId', async (req, res) => {
  try {
    const requesterId   = req.user.userId;
    const targetUserId  = req.params.targetUserId;

    // If member trying to view someone else's stats → block
    if (requesterId !== targetUserId) {
      const isHostSomewhere = await Meeting.findOne({ 'host.userId': requesterId });
      if (!isHostSomewhere) {
        return res.status(403).json({ error: 'You can only view your own performance' });
      }
    }

    const meetings    = await Meeting.find(userMeetingQuery(targetUserId));
    const transcripts = await Transcript.find({ userId: targetUserId });

    const totalMeetings      = meetings.length;
    const totalSpeakingTime  = transcripts.reduce((sum, t) =>
      sum + t.segments.reduce((s, seg) => s + (seg.end - seg.start), 0), 0
    );
    const totalWords = transcripts.reduce((sum, t) => sum + (t.stats?.totalWords || 0), 0);
    const avgWPM     = totalSpeakingTime > 0 ? (totalWords / (totalSpeakingTime / 60)) : 0;

    let assignedActionItems = 0, completedActionItems = 0;
    meetings.forEach(m => {
      m.summary?.actionItems?.forEach(item => {
        if (item.assignee?.toLowerCase().includes(targetUserId.toLowerCase())) {
          assignedActionItems++;
          if (item.status === 'completed') completedActionItems++;
        }
      });
    });

    res.json({
      success: true,
      data: {
        userId: targetUserId,
        metrics: {
          totalMeetings,
          totalSpeakingTime: Math.round(totalSpeakingTime),
          totalWords,
          avgWordsPerMinute: Math.round(avgWPM),
          assignedActionItems,
          completedActionItems,
          completionRate: assignedActionItems > 0
            ? Math.round((completedActionItems / assignedActionItems) * 100)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('User performance error:', error);
    res.status(500).json({ error: 'Failed to fetch user performance' });
  }
});

module.exports = router;
