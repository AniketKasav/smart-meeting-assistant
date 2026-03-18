// backend/routes/assistant.js - PHASE 7 ENHANCED
const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const contextManager = require('../services/contextManager');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * POST /api/assistant/process
 * Process user input with AI (Multi-turn support)
 */
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Get conversation history
    const history = await contextManager.getHistory(userId, 5);

    // Get user context (meetings, tasks, etc.)
    const userContext = await contextManager.getUserContext(userId);

    // Process with AI (includes multi-turn logic)
    const aiResult = await aiService.processUserInput(userId, message, history, userContext);

    if (!aiResult.success) {
      return res.status(500).json({
        success: false,
        error: aiResult.error
      });
    }

    // Save user message to conversation
    await contextManager.addMessage(
      userId,
      'user',
      message,
      aiResult.data.intent,
      aiResult.data.params
    );

    // Save assistant response
    await contextManager.addMessage(
      userId,
      'assistant',
      aiResult.data.response,
      aiResult.data.intent,
      aiResult.data.params
    );

    res.json({
      success: true,
      data: {
        intent: aiResult.data.intent,
        confidence: aiResult.data.confidence,
        action: aiResult.data.action,
        params: aiResult.data.params,
        response: aiResult.data.response,
        suggestion: aiResult.data.suggestion,
        clarification: aiResult.data.clarification,
        needsMoreInfo: aiResult.data.needsMoreInfo,
        multiTurn: aiResult.data.multiTurn,
        isComplete: aiResult.data.isComplete,
        step: aiResult.data.step,
        timestamp: aiResult.data.timestamp
      }
    });
  } catch (error) {
    console.error('Assistant processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
});

/**
 * GET /api/assistant/context
 * Get conversation context and history
 */
router.get('/context', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get conversation history
    const history = await contextManager.getHistory(userId, 20);
    
    // Get current multi-turn context
    const currentContext = await contextManager.getCurrentContext(userId);
    
    // Get user context
    const userContext = await contextManager.getUserContext(userId);

    res.json({
      success: true,
      history,
      currentContext,
      userContext
    });
  } catch (error) {
    console.error('Context retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve context'
    });
  }
});

/**
 * DELETE /api/assistant/context
 * Clear conversation history and context
 */
router.delete('/context', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const cleared = await contextManager.clearConversation(userId);

    res.json({
      success: cleared,
      message: cleared ? 'Conversation cleared' : 'Failed to clear conversation'
    });
  } catch (error) {
    console.error('Context clearing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear context'
    });
  }
});

/**
 * POST /api/assistant/cancel-multiturn
 * Cancel ongoing multi-turn conversation
 */
router.post('/cancel-multiturn', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const cleared = await contextManager.clearContext(userId);

    res.json({
      success: cleared,
      message: 'Multi-turn conversation cancelled'
    });
  } catch (error) {
    console.error('Cancel multi-turn error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel conversation'
    });
  }
});

/**
 * GET /api/assistant/suggestions
 * Get proactive suggestions based on user context
 */
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user context
    const userContext = await contextManager.getUserContext(userId);

    const suggestions = [];
    const currentHour = new Date().getHours();

    // Morning greeting (8-11 AM)
    if (currentHour >= 8 && currentHour < 11) {
      if (userContext.upcomingMeetings?.length > 0) {
        suggestions.push({
          type: 'greeting',
          priority: 'high',
          message: `Good morning! You have ${userContext.upcomingMeetings.length} meeting${userContext.upcomingMeetings.length > 1 ? 's' : ''} today.`,
          action: {
            label: 'View Schedule',
            intent: 'SHOW_MEETINGS'
          }
        });
      }
    }

    // Overdue tasks alert
    if (userContext.overdueTasks > 0) {
      suggestions.push({
        type: 'alert',
        priority: 'high',
        message: `You have ${userContext.overdueTasks} overdue task${userContext.overdueTasks > 1 ? 's' : ''}.`,
        action: {
          label: 'Review Tasks',
          intent: 'LIST_TASKS',
          params: { status: 'overdue' }
        }
      });
    }

    // Pending tasks reminder
    if (userContext.pendingTasks > 0) {
      suggestions.push({
        type: 'reminder',
        priority: 'medium',
        message: `You have ${userContext.pendingTasks} pending task${userContext.pendingTasks > 1 ? 's' : ''}.`,
        action: {
          label: 'View Tasks',
          intent: 'LIST_TASKS',
          params: { status: 'pending' }
        }
      });
    }

    // Recent meetings follow-up
    if (userContext.recentMeetings?.length > 0) {
      const lastMeeting = userContext.recentMeetings[0];
      const hoursSinceLastMeeting = (Date.now() - new Date(lastMeeting.date).getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastMeeting < 24) {
        suggestions.push({
          type: 'follow-up',
          priority: 'medium',
          message: `Would you like to review action items from "${lastMeeting.title}"?`,
          action: {
            label: 'View Meeting',
            intent: 'SHOW_MEETING',
            params: { title: lastMeeting.title }
          }
        });
      }
    }

    res.json({
      success: true,
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Suggestions generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions'
    });
  }
});

/**
 * POST /api/assistant/feedback
 * Submit feedback on AI response (UPDATED - WITH STORAGE)
 */
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { 
      messageId, 
      feedbackType,     // 'like' or 'dislike'
      comment,          // Optional user comment
      userMessage,      // What user said
      aiResponse,       // What AI responded
      intent,           // Detected intent
      params,           // Extracted parameters
      confidence,       // AI confidence (0-1)
      multiTurn,        // Was multi-turn?
      step,             // Multi-turn step
      expectedIntent,   // User correction (if any)
      expectedParams    // Corrected params (if any)
    } = req.body;
    
    const userId = req.user.userId;

    // Validate feedback type
    if (!feedbackType || !['like', 'dislike', 'correction'].includes(feedbackType)) {
      return res.status(400).json({
        success: false,
        error: 'Valid feedback type is required (like/dislike/correction)'
      });
    }

    // Validate required fields
    if (!userMessage || !aiResponse || !intent) {
      return res.status(400).json({
        success: false,
        error: 'User message, AI response, and intent are required'
      });
    }

    // Create feedback record
    const Feedback = require('../models/Feedback');
    
    const feedback = new Feedback({
      userId,
      messageId: messageId || `msg_${Date.now()}`,
      userMessage,
      aiResponse,
      intent,
      params: params || {},
      feedbackType,
      comment: comment || '',
      expectedIntent,
      expectedParams,
      confidence: confidence || 0.5,
      multiTurn: multiTurn || false,
      step: step || 1,
      metadata: {
        userAgent: req.headers['user-agent'],
        platform: 'web',
        timestamp: new Date()
      }
    });

    await feedback.save();

    console.log('✅ Feedback stored:', {
      userId,
      intent,
      feedbackType,
      confidence
    });

    // If it's a dislike or correction, log for immediate attention
    if (feedbackType === 'dislike' || feedbackType === 'correction') {
      console.log('⚠️ Negative feedback detected:', {
        intent,
        confidence,
        message: userMessage.substring(0, 50),
        comment
      });
    }

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedbackId: feedback._id
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

/**
 * GET /api/assistant/feedback
 * Fetch all feedback records (for analytics dashboard)
 */
router.get('/feedback', authenticateToken, async (req, res) => {
  try {
    const Feedback = require('../models/Feedback');
    
    const { 
      limit = 100, 
      days = 30,
      feedbackType,
      intent 
    } = req.query;

    const filter = {};
    
    if (days) {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(days));
      filter.createdAt = { $gte: dateFrom };
    }
    
    if (feedbackType && ['like', 'dislike', 'correction'].includes(feedbackType)) {
      filter.feedbackType = feedbackType;
    }
    
    if (intent) {
      filter.intent = intent;
    }

    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const totalFeedback = feedbacks.length;
    const likes = feedbacks.filter(f => f.feedbackType === 'like').length;
    const dislikes = feedbacks.filter(f => f.feedbackType === 'dislike').length;
    const successRate = totalFeedback > 0 ? ((likes / totalFeedback) * 100).toFixed(1) : 0;

    const intentStats = {};
    feedbacks.forEach(f => {
      if (!intentStats[f.intent]) {
        intentStats[f.intent] = { likes: 0, dislikes: 0, total: 0 };
      }
      intentStats[f.intent].total++;
      if (f.feedbackType === 'like') intentStats[f.intent].likes++;
      if (f.feedbackType === 'dislike') intentStats[f.intent].dislikes++;
    });

    console.log(`✅ Fetched ${feedbacks.length} feedback records`);

    res.json({
      success: true,
      feedbacks,
      stats: {
        total: totalFeedback,
        likes,
        dislikes,
        successRate: parseFloat(successRate),
        intentBreakdown: intentStats
      },
      filters: {
        days: parseInt(days),
        limit: parseInt(limit),
        feedbackType,
        intent
      }
    });

  } catch (error) {
    console.error('❌ Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback'
    });
  }
});

/**
 * GET /api/assistant/feedback/analytics
 * Get feedback analytics (Admin/Development)
 */
router.get('/feedback/analytics', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const learningService = require('../services/learningService');
    const analytics = await learningService.getAnalytics(parseInt(days));

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate analytics'
      });
    }

    res.json({
      success: true,
      ...analytics.data
    });
  } catch (error) {
    console.error('Analytics retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics'
    });
  }
});

/**
 * GET /api/assistant/feedback/improvements
 * Get AI improvement suggestions based on feedback
 */
router.get('/feedback/improvements', authenticateToken, async (req, res) => {
  try {
    const learningService = require('../services/learningService');
    const suggestions = await learningService.getImprovementSuggestions();

    res.json(suggestions);
  } catch (error) {
    console.error('Improvement suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get improvement suggestions'
    });
  }
});

/**
 * GET /api/assistant/health
 * Check AI service health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await aiService.healthCheck();

    res.json({
      success: health.available,
      ...health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

/**
 * POST /api/assistant/search
 * AI-powered natural language search
 */
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user.userId;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    console.log('🔍 AI Search query:', query);

    // Parse natural language query with AI
    const searchParams = await aiService.parseNaturalLanguageSearch(query);

    if (!searchParams.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse search query'
      });
    }

    // Execute search with parsed parameters
    const Meeting = require('../models/Meeting');
    const Transcript = require('../models/Transcript');

    let meetingFilter = {};

    // Apply date range
    if (searchParams.dateRange) {
      meetingFilter.startedAt = {};
      if (searchParams.dateRange.from) {
        meetingFilter.startedAt.$gte = new Date(searchParams.dateRange.from);
      }
      if (searchParams.dateRange.to) {
        meetingFilter.startedAt.$lte = new Date(searchParams.dateRange.to);
      }
    }

    // Apply participant filter
    if (searchParams.participants && searchParams.participants.length > 0) {
      meetingFilter.participants = {
        $elemMatch: {
          name: { 
            $in: searchParams.participants.map(p => new RegExp(p, 'i')) 
          }
        }
      };
    }

    // Apply topic/keyword search
    let results = [];
    if (searchParams.keywords && searchParams.keywords.length > 0) {
      const searchText = searchParams.keywords.join(' ');
      
      const transcripts = await Transcript.find({
        ...meetingFilter,
        $text: { $search: searchText }
      })
        .limit(20)
        .lean();

      const meetingIds = [...new Set(transcripts.map(t => t.meetingId))];
      const meetings = await Meeting.find({ 
        meetingId: { $in: meetingIds } 
      }).lean();

      results = meetings.map(meeting => ({
        ...meeting,
        relevance: 'high'
      }));
    } else {
      // No keywords - just return meetings matching filters
      results = await Meeting.find(meetingFilter)
        .sort({ startedAt: -1 })
        .limit(20)
        .lean();
    }

    res.json({
      success: true,
      data: {
        results,
        parsedQuery: searchParams,
        total: results.length,
        query
      }
    });

  } catch (error) {
    console.error('AI search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process search'
    });
  }
});

/**
 * POST /api/assistant/summarize
 * Generate AI summary for a meeting
 */
router.post('/summarize', authenticateToken, async (req, res) => {
  try {
    const { meetingId, title } = req.body;
    const userId = req.user.userId;

    if (!meetingId && !title) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID or title is required'
      });
    }

    console.log('📝 Generating summary for:', meetingId || title);

    // Find meeting
    const Meeting = require('../models/Meeting');
    let meeting;

    if (meetingId) {
      meeting = await Meeting.findOne({ meetingId }).lean();
    } else if (title) {
      meeting = await Meeting.findOne({
        title: { $regex: title, $options: 'i' }
      })
        .sort({ startedAt: -1 })
        .lean();
    }

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Check if summary already exists
    if (meeting.summary && meeting.summary.text) {
      return res.json({
        success: true,
        data: {
          summary: meeting.summary.text,
          topics: meeting.summary.topics || [],
          keyPoints: meeting.summary.keyPoints || [],
          sentiment: meeting.summary.sentiment || 'neutral',
          cached: true
        }
      });
    }

    // Generate new summary with AI
    const summaryResult = await aiService.generateMeetingSummary(meeting.meetingId);

    if (!summaryResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate summary'
      });
    }

    // Update meeting with summary
    await Meeting.updateOne(
      { meetingId: meeting.meetingId },
      { 
        $set: { 
          summary: summaryResult.summary 
        } 
      }
    );

    res.json({
      success: true,
      data: {
        summary: summaryResult.summary.text,
        topics: summaryResult.summary.topics || [],
        keyPoints: summaryResult.summary.keyPoints || [],
        sentiment: summaryResult.summary.sentiment || 'neutral',
        cached: false
      }
    });

  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary'
    });
  }
});

/**
 * POST /api/assistant/bulk-tasks
 * Bulk task operations via AI
 */
router.post('/bulk-tasks', authenticateToken, async (req, res) => {
  try {
    const { command } = req.body;
    const userId = req.user.userId;

    if (!command || command.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    console.log('📦 Bulk task command:', command);

    // Parse bulk command with AI
    const parsed = await aiService.parseBulkTaskCommand(command);

    if (!parsed.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse bulk command'
      });
    }

    const Task = require('../models/Task');
    const Meeting = require('../models/Meeting');

    let taskFilter = {};
    let updateData = {};
    let affectedTasks = [];

    // Build task filter based on parsed command
    if (parsed.meetingTitle) {
      const meeting = await Meeting.findOne({
        title: { $regex: parsed.meetingTitle, $options: 'i' }
      })
        .sort({ startedAt: -1 })
        .lean();

      if (meeting) {
        taskFilter.meetingId = meeting.meetingId;
      } else {
        return res.status(404).json({
          success: false,
          error: `Meeting "${parsed.meetingTitle}" not found`
        });
      }
    }

    if (parsed.meetingDate) {
      const meeting = await Meeting.findOne({
        startedAt: {
          $gte: new Date(parsed.meetingDate),
          $lt: new Date(new Date(parsed.meetingDate).getTime() + 86400000)
        }
      })
        .sort({ startedAt: -1 })
        .lean();

      if (meeting) {
        taskFilter.meetingId = meeting.meetingId;
      }
    }

    if (parsed.status) {
      taskFilter.status = parsed.status;
    }

    // Execute bulk operation
    if (parsed.operation === 'assign' && parsed.assignee) {
      updateData = {
        assignee: {
          userId: `user_${Date.now()}`,
          name: parsed.assignee,
          email: ''
        },
        status: 'in-progress'
      };

      const result = await Task.updateMany(taskFilter, { $set: updateData });
      affectedTasks = await Task.find(taskFilter).lean();

      res.json({
        success: true,
        data: {
          operation: 'assign',
          assignee: parsed.assignee,
          affectedCount: result.modifiedCount,
          tasks: affectedTasks,
          message: `Assigned ${result.modifiedCount} task(s) to ${parsed.assignee}`
        }
      });

    } else if (parsed.operation === 'complete') {
      updateData = {
        status: 'completed',
        completedAt: new Date()
      };

      const result = await Task.updateMany(taskFilter, { $set: updateData });
      affectedTasks = await Task.find(taskFilter).lean();

      res.json({
        success: true,
        data: {
          operation: 'complete',
          affectedCount: result.modifiedCount,
          tasks: affectedTasks,
          message: `Marked ${result.modifiedCount} task(s) as complete`
        }
      });

    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid bulk operation'
      });
    }

  } catch (error) {
    console.error('Bulk task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute bulk operation'
    });
  }
});

module.exports = router;