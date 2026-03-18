// backend/routes/suggestions.js
const express = require('express');
const router = express.Router();
const suggestionService = require('../services/suggestionService');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * GET /api/suggestions/briefing/:userId
 * Get morning briefing for user
 */
router.get('/briefing/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const briefing = await suggestionService.getMorningBriefing(userId);
    
    res.json(briefing);
  } catch (error) {
    console.error('Briefing error:', error);
    res.status(500).json({ 
      error: 'Failed to generate briefing',
      message: error.message 
    });
  }
});

/**
 * POST /api/suggestions/action-items/:meetingId
 * Extract action items from meeting transcript
 */
router.post('/action-items/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const result = await suggestionService.extractActionItems(meetingId);
    
    res.json(result);
  } catch (error) {
    console.error('Action item extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract action items',
      message: error.message 
    });
  }
});

/**
 * POST /api/suggestions/check-conflicts
 * Check for scheduling conflicts
 */
router.post('/check-conflicts', authenticateToken, async (req, res) => {
  try {
    const { userId, date, time } = req.body;
    
    if (!userId || !date || !time) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, date, time' 
      });
    }
    
    const result = await suggestionService.detectConflicts(userId, date, time);
    res.json(result);
  } catch (error) {
    console.error('Conflict check error:', error);
    res.status(500).json({ 
      error: 'Failed to check conflicts',
      message: error.message 
    });
  }
});

/**
 * POST /api/suggestions/participants
 * Suggest participants for meeting
 */
router.post('/participants', authenticateToken, async (req, res) => {
  try {
    const { userId, meetingTitle } = req.body;
    
    if (!userId || !meetingTitle) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, meetingTitle' 
      });
    }
    
    const result = await suggestionService.suggestParticipants(userId, meetingTitle);
    res.json(result);
  } catch (error) {
    console.error('Participant suggestion error:', error);
    res.status(500).json({ 
      error: 'Failed to suggest participants',
      message: error.message 
    });
  }
});

/**
 * GET /api/suggestions/reminder/:userId
 * Get upcoming meeting reminders
 */
router.get('/reminder/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { minutesBefore } = req.query;
    
    const result = await suggestionService.getUpcomingReminder(
      userId, 
      parseInt(minutesBefore) || 15
    );
    
    res.json(result);
  } catch (error) {
    console.error('Reminder check error:', error);
    res.status(500).json({ 
      error: 'Failed to check reminders',
      message: error.message 
    });
  }
});

module.exports = router;