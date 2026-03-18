// backend/routes/search.js
const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Transcript = require('../models/Transcript');

/**
 * GET /api/search
 * Search across meetings and transcripts
 */
router.get('/', async (req, res) => {
  try {
    const {
      q,                    // Search query
      meetingId,            // Filter by specific meeting
      participant,          // Filter by participant
      sentiment,            // Filter by sentiment
      fromDate,             // Start date
      toDate,               // End date
      limit = 50,           // Results limit
      page = 1              // Pagination
    } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          results: [],
          total: 0,
          query: q
        }
      });
    }

    const searchQuery = q.trim();
    const skip = (page - 1) * limit;

    // Build meeting filter
    let meetingFilter = {};
    
    if (meetingId) {
      meetingFilter.meetingId = meetingId;
    }

    if (fromDate || toDate) {
      meetingFilter.startedAt = {};
      if (fromDate) meetingFilter.startedAt.$gte = new Date(fromDate);
      if (toDate) meetingFilter.startedAt.$lte = new Date(toDate);
    }

    if (sentiment) {
      meetingFilter.$or = [
        { 'summary.sentiment': sentiment },
        { 'autoSentiment.sentiment': sentiment }
      ];
    }

    // Search in transcripts
    const transcriptFilter = {
      ...meetingFilter,
      $text: { $search: searchQuery }
    };

    if (participant) {
      transcriptFilter.$or = [
        { userName: { $regex: participant, $options: 'i' } },
        { userId: { $regex: participant, $options: 'i' } }
      ];
    }

    // Execute search
    const transcripts = await Transcript.find(transcriptFilter)
      .select('meetingId userId userName segments createdAt')
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const totalResults = await Transcript.countDocuments(transcriptFilter);

    // Get meeting details for each transcript
    const meetingIds = [...new Set(transcripts.map(t => t.meetingId))];
    const meetings = await Meeting.find({ meetingId: { $in: meetingIds } })
      .select('meetingId title startedAt summary.sentiment autoSentiment')
      .lean();

    const meetingMap = {};
    meetings.forEach(m => {
      meetingMap[m.meetingId] = m;
    });

    // Process results with context
    const results = [];
    const searchRegex = new RegExp(searchQuery.split(' ').join('|'), 'gi');

    transcripts.forEach(transcript => {
      const meeting = meetingMap[transcript.meetingId];
      if (!meeting) return;

      // Find matching segments
      const matchingSegments = transcript.segments.filter(seg => 
        searchRegex.test(seg.text)
      );

      matchingSegments.forEach(segment => {
        // Extract context (text around the match)
        const text = segment.text;
        const matches = [...text.matchAll(searchRegex)];
        
        matches.forEach(match => {
          const matchIndex = match.index;
          const contextStart = Math.max(0, matchIndex - 50);
          const contextEnd = Math.min(text.length, matchIndex + match[0].length + 50);
          
          let context = text.substring(contextStart, contextEnd);
          if (contextStart > 0) context = '...' + context;
          if (contextEnd < text.length) context = context + '...';

          // Highlight the match
          const highlightedContext = context.replace(
            searchRegex,
            '<mark>$&</mark>'
          );

          results.push({
            meetingId: transcript.meetingId,
            meetingTitle: meeting.title,
            meetingDate: meeting.startedAt,
            sentiment: meeting.summary?.sentiment || meeting.autoSentiment?.sentiment || 'neutral',
            speaker: transcript.userName || transcript.userId,
            timestamp: segment.start,
            text: segment.text,
            context: highlightedContext,
            matchedText: match[0]
          });
        });
      });
    });

    // Sort by relevance (most recent first for now)
    results.sort((a, b) => new Date(b.meetingDate) - new Date(a.meetingDate));

    res.json({
      success: true,
      data: {
        results: results.slice(0, limit),
        total: results.length,
        totalTranscripts: totalResults,
        query: searchQuery,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: results.length > limit
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions based on recent searches and popular terms
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    // Get meetings with titles matching the query
    const meetings = await Meeting.find({
      title: { $regex: q, $options: 'i' }
    })
      .select('title')
      .limit(5)
      .lean();

    // Get participants matching the query
    const participants = await Transcript.distinct('userName', {
      userName: { $regex: q, $options: 'i' }
    }).limit(5);

    // Get common topics from summaries
    const topicsAgg = await Meeting.aggregate([
      { $match: { 'summary.topics': { $exists: true } } },
      { $unwind: '$summary.topics' },
      { $match: { 'summary.topics': { $regex: q, $options: 'i' } } },
      { $group: { _id: '$summary.topics', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const suggestions = [
      ...meetings.map(m => ({ type: 'meeting', text: m.title })),
      ...participants.map(p => ({ type: 'participant', text: p })),
      ...topicsAgg.map(t => ({ type: 'topic', text: t._id }))
    ];

    res.json({
      success: true,
      data: { suggestions }
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/search/recent
 * Get recent searches (would typically store in user preferences)
 */
router.get('/recent', async (req, res) => {
  try {
    // For now, return empty - implement user-specific storage later
    res.json({
      success: true,
      data: { recent: [] }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;