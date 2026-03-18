// backend/routes/gmail.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const { requireGoogleAuth } = require('../middleware/googleAuth');
const gmailService = require('../services/gmailService');

/**
 * POST /api/gmail/search
 * Search emails
 */
router.post('/search', authenticateToken, requireGoogleAuth, async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    console.log('🔍 Gmail search:', query);

    const result = await gmailService.searchEmails(query, maxResults);

    res.json(result);
  } catch (error) {
    console.error('Gmail search route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search emails'
    });
  }
});

/**
 * POST /api/gmail/send
 * Send email
 */
router.post('/send', authenticateToken, requireGoogleAuth, async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'To, subject, and body are required'
      });
    }

    console.log('📧 Sending email to:', to);

    const result = await gmailService.sendEmail(to, subject, body);

    res.json(result);
  } catch (error) {
    console.error('Gmail send route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email'
    });
  }
});

/**
 * GET /api/gmail/:emailId
 * Get email by ID
 */
router.get('/:emailId', authenticateToken, requireGoogleAuth, async (req, res) => {
  try {
    const { emailId } = req.params;

    const result = await gmailService.getEmail(emailId);

    res.json(result);
  } catch (error) {
    console.error('Gmail get route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email'
    });
  }
});

module.exports = router;