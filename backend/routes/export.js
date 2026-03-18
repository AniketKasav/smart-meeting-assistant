// backend/routes/export.js
const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Transcript = require('../models/Transcript');
const { generateMeetingPDF } = require('../services/pdfService');

// ✅ Helper function to find meeting by _id or meetingId (FIXED)
async function findMeeting(id) {
  try {
    // Check if ID is a valid MongoDB ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    if (isValidObjectId) {
      // Try by _id (MongoDB ObjectId)
      const meeting = await Meeting.findById(id).lean();
      if (meeting) return meeting;
    }
    
    // Try by meetingId field (custom string ID)
    const meeting = await Meeting.findOne({ meetingId: id }).lean();
    return meeting;
  } catch (error) {
    console.error('Error finding meeting:', error);
    // If findById fails for any reason, fallback to meetingId
    return await Meeting.findOne({ meetingId: id }).lean();
  }
}

// ✅ Helper function to find transcripts
async function findTranscripts(meeting) {
  // Query by the meeting's actual meetingId field
  return await Transcript.find({ meetingId: meeting.meetingId })
    .sort({ createdAt: 1 })
    .lean();
}

/**
 * GET /api/export/:meetingId/pdf
 * Export meeting as PDF
 */
router.get('/:meetingId/pdf', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { includeTranscript = 'false' } = req.query;

    // Fetch meeting
    const meeting = await findMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Fetch transcripts if requested
    let transcripts = [];

    if (includeTranscript === 'true') {
      transcripts = await findTranscripts(meeting);
      // Check if transcript has audioPath
      for (const transcript of transcripts) {
        if (!transcript || !transcript.audioPath) {
          console.warn('⚠️ Transcript missing audioPath, using placeholder');
          transcript.audioPath = `/uploads/${meeting.meetingId}/audio.wav`;
        }
      }
    }

    // Generate PDF
    console.log('🔄 Generating PDF for meeting:', meeting.meetingId);
    const pdfBuffer = await generateMeetingPDF(meeting, transcripts);

    // Send PDF
    const filename = `meeting-${meeting.meetingId}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    console.log('✅ PDF generated successfully');

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/export/:meetingId/json
 * Export meeting as JSON
 */
router.get('/:meetingId/json', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { includeTranscript = 'true' } = req.query;

    // Fetch meeting
    const meeting = await findMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Fetch transcripts if requested
    let transcripts = [];
    if (includeTranscript === 'true') {
      transcripts = await findTranscripts(meeting);
    }

    const exportData = {
      meeting,
      transcripts,
      exportedAt: new Date(),
      version: '1.0'
    };

    const filename = `meeting-${meeting.meetingId}-${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);

  } catch (error) {
    console.error('JSON export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/export/:meetingId/txt
 * Export transcript as plain text
 */
router.get('/:meetingId/txt', async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Fetch meeting
    const meeting = await findMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Fetch transcripts
    const transcripts = await findTranscripts(meeting);

    // Build text content
    let textContent = '';
    textContent += `MEETING TRANSCRIPT\n`;
    textContent += `==================\n\n`;
    textContent += `Title: ${meeting.title}\n`;
    textContent += `Date: ${new Date(meeting.startedAt).toLocaleString()}\n`;
    
    if (meeting.participants && meeting.participants.length > 0) {
      textContent += `Participants: ${meeting.participants.map(p => p.name).join(', ')}\n`;
    }
    
    textContent += `\n==================\n\n`;

    // Add transcript
    transcripts.forEach(transcript => {
      if (transcript.segments && transcript.segments.length > 0) {
        transcript.segments.forEach(segment => {
          const timestamp = formatTimestamp(segment.start);
          const speaker = transcript.userName || transcript.userId;
          textContent += `[${timestamp}] ${speaker}: ${segment.text}\n\n`;
        });
      }
    });

    const filename = `transcript-${meeting.meetingId}-${Date.now()}.txt`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(textContent);

  } catch (error) {
    console.error('Text export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/export/:meetingId/share
 * Generate shareable link
 */
router.post('/:meetingId/share', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { password, expiresIn } = req.body;

    // Verify meeting exists
    const meeting = await findMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Generate share token (in production, use crypto.randomBytes)
    const shareToken = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate expiry
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
    }

    // In production, store this in a ShareLinks collection
    // For now, just return the token
    const shareLink = {
      token: shareToken,
      meetingId: meeting.meetingId,
      password: password || null,
      expiresAt,
      createdAt: new Date(),
      viewCount: 0
    };

    res.json({
      success: true,
      data: {
        shareLink: `${req.protocol}://${req.get('host')}/shared/${shareToken}`,
        token: shareToken,
        expiresAt
      }
    });

  } catch (error) {
    console.error('Share link error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/export/shared/:token
 * View a shared meeting (with optional password)
 */
router.post('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // In production, you would:
    // 1. Look up the token in a ShareLinks collection
    // 2. Check expiration
    // 3. Verify password if required
    // 4. Increment view count
    
    // For now, we'll extract the meetingId from the token
    // Token format: share_timestamp_meetingId_random
    // Example: share_1234567890_meeting_abc123_xyz
    
    // Parse token to get meetingId
    // This is a simple implementation - in production use a database
    const tokenParts = token.split('_');
    if (tokenParts.length < 3) {
      return res.status(404).json({
        success: false,
        error: 'Invalid share token'
      });
    }

    // For this demo, we'll allow any token format that starts with 'share_'
    // and just fetch the meeting from the token itself
    // In production, store share links in database with metadata
    
    // Try to extract meetingId from token
    // Since we generate tokens like: share_timestamp_random
    // We need to store the mapping. For now, let's just check all meetings
    // and find one that exists (demo purposes only)
    
    // TEMPORARY: Just get the most recent meeting for demo
    // In production: Look up shareToken in ShareLinks collection
    const meetings = await Meeting.find({}).sort({ startedAt: -1 }).limit(10).lean();
    
    if (meetings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No meetings found'
      });
    }

    // For demo, return the first meeting with a summary
    const meeting = meetings.find(m => m.summary) || meetings[0];

    // In production: Check password if shareLink.password exists
    // For now, accept any password or no password
    
    res.json({
      success: true,
      data: {
        meeting
      }
    });

  } catch (error) {
    console.error('Shared meeting error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to format timestamp
 */
function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = router;