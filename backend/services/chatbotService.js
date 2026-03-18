// backend/services/chatbotService.js - AI Meeting Assistant with RAG
const Meeting = require('../models/Meeting');
const Transcript = require('../models/Transcript');

const OLLAMA_URL = 'http://localhost:11434';

/**
 * Search meetings for relevant context based on user query
 * @param {String} query - User's question
 * @param {Number} limit - Max number of meetings to retrieve
 * @returns {Array} - Relevant meetings with transcripts
 */
async function searchRelevantMeetings(query, limit = 5) {
  try {
    const queryLower = query.toLowerCase();
    
    // Extract potential search terms
    const searchTerms = queryLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Build search query - search in meeting titles, descriptions, and transcript text
    const meetings = await Meeting.find({
      status: { $in: ['completed', 'in_progress'] }
    })
    .sort({ scheduledDate: -1 })
    .limit(limit * 2) // Get more than needed for filtering
    .lean();

    // Get meeting IDs
    const meetingIds = meetings.map(m => m.meetingId);

    // Fetch transcripts for these meetings
    const transcripts = await Transcript.find({
      meetingId: { $in: meetingIds },
      processingStatus: 'completed'
    }).lean();

    // Create a map of transcripts by meetingId
    const transcriptMap = {};
    transcripts.forEach(t => {
      transcriptMap[t.meetingId] = t;
    });

    // Score and filter meetings by relevance
    const scoredMeetings = meetings.map(meeting => {
      let score = 0;
      const transcript = transcriptMap[meeting.meetingId];
      
      // Score based on title match
      searchTerms.forEach(term => {
        if (meeting.title?.toLowerCase().includes(term)) score += 5;
        if (meeting.description?.toLowerCase().includes(term)) score += 3;
        
        // Score based on transcript content
        if (transcript?.fullText?.toLowerCase().includes(term)) score += 2;
      });

      // Boost recent meetings
      const daysAgo = (Date.now() - new Date(meeting.scheduledDate)) / (1000 * 60 * 60 * 24);
      if (daysAgo < 7) score += 3;
      else if (daysAgo < 30) score += 1;

      return {
        ...meeting,
        transcript: transcript || null,
        relevanceScore: score
      };
    });

    // Filter and sort by relevance
    return scoredMeetings
      .filter(m => m.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

  } catch (error) {
    console.error('❌ Error searching meetings:', error);
    return [];
  }
}

/**
 * Extract action items from meetings
 * @param {String} assignee - Optional filter by assignee
 * @returns {Array} - Action items
 */
async function getActionItems(assignee = null) {
  try {
    const query = { status: { $in: ['completed', 'in_progress'] } };
    
    const meetings = await Meeting.find(query)
      .sort({ scheduledDate: -1 })
      .limit(10)
      .lean();

    let allActionItems = [];

    meetings.forEach(meeting => {
      if (meeting.summary?.actionItems) {
        const items = meeting.summary.actionItems.map(item => ({
          ...item,
          meetingTitle: meeting.title,
          meetingDate: meeting.scheduledDate,
          meetingId: meeting.meetingId
        }));
        
        allActionItems = allActionItems.concat(items);
      }
    });

    // Filter by assignee if specified
    if (assignee) {
      const assigneeLower = assignee.toLowerCase();
      allActionItems = allActionItems.filter(item => 
        item.assignee?.toLowerCase().includes(assigneeLower)
      );
    }

    return allActionItems;

  } catch (error) {
    console.error('❌ Error getting action items:', error);
    return [];
  }
}

/**
 * Get participant information from meetings
 * @param {String} participantName - Name to search for
 * @returns {Object} - Participant stats and mentions
 */
async function getParticipantInfo(participantName) {
  try {
    const nameLower = participantName.toLowerCase();
    
    const meetings = await Meeting.find({
      'participants.userName': new RegExp(participantName, 'i')
    })
    .sort({ scheduledDate: -1 })
    .limit(10)
    .lean();

    const meetingIds = meetings.map(m => m.meetingId);
    
    const transcripts = await Transcript.find({
      meetingId: { $in: meetingIds }
    }).lean();

    // Find mentions in transcripts
    const mentions = [];
    transcripts.forEach(transcript => {
      const meeting = meetings.find(m => m.meetingId === transcript.meetingId);
      
      // Search in segments for mentions
      transcript.segments?.forEach(segment => {
        if (segment.text?.toLowerCase().includes(nameLower)) {
          mentions.push({
            text: segment.text,
            meetingTitle: meeting?.title,
            meetingDate: meeting?.scheduledDate,
            timestamp: segment.start
          });
        }
      });
    });

    return {
      participantName,
      meetingsAttended: meetings.length,
      mentions: mentions.slice(0, 10), // Top 10 mentions
      recentMeetings: meetings.slice(0, 5).map(m => ({
        title: m.title,
        date: m.scheduledDate
      }))
    };

  } catch (error) {
    console.error('❌ Error getting participant info:', error);
    return null;
  }
}

/**
 * Generate AI response using Ollama with meeting context
 * @param {String} userQuery - User's question
 * @param {Array} conversationHistory - Previous messages
 * @returns {Object} - AI response with sources
 */
async function generateChatResponse(userQuery, conversationHistory = []) {
  try {
    console.log('🤖 Processing chatbot query:', userQuery);

    // Analyze query type
    const queryLower = userQuery.toLowerCase();
    let context = '';
    let sources = [];

    // ============================================
    // 1. PARTICIPANT-SPECIFIC QUERIES
    // ============================================
    // Pattern: "what did [name] say/tell/mention"
    const participantMatch = queryLower.match(/what (?:did|does) (\w+) (?:say|said|tell|told|mention|mentioned|talk about|discussed?)/i);
    
    if (participantMatch && participantMatch[1]) {
      const participantName = participantMatch[1];
      console.log(`👤 Searching for participant: ${participantName}`);
      
      const participantInfo = await getParticipantInfo(participantName);
      
      if (participantInfo && participantInfo.mentions.length > 0) {
        context = `\n📋 WHAT ${participantName.toUpperCase()} SAID:\n\n`;
        context += `Meetings attended: ${participantInfo.meetingsAttended}\n`;
        context += `Total mentions found: ${participantInfo.mentions.length}\n\n`;
        
        context += 'RECENT STATEMENTS:\n';
        participantInfo.mentions.slice(0, 8).forEach((mention, idx) => {
          context += `\n${idx + 1}. Meeting: "${mention.meetingTitle}" (${new Date(mention.meetingDate).toLocaleDateString()})\n`;
          context += `   Said: "${mention.text}"\n`;
        });
        
        sources = participantInfo.mentions.slice(0, 5).map(m => ({
          type: 'participant_mention',
          meetingTitle: m.meetingTitle,
          meetingDate: m.meetingDate,
          text: m.text.substring(0, 150) + '...'
        }));
      } else {
        context = `\nNo mentions found for "${participantName}" in recent meetings.`;
      }
    }
    
    // ============================================
    // 2. ACTION ITEMS / TASKS QUERIES
    // ============================================
    else if (queryLower.match(/(?:action item|task|todo|assignment|assign)/i)) {
      console.log('📋 Searching for action items...');
      
      // Check if asking about specific person
      let assignee = null;
      if (queryLower.match(/(?:my|me|mine)/i)) {
        assignee = 'you'; // Will need user authentication to map properly
      } else {
        // Try to extract name: "tasks assigned to John"
        const assigneeMatch = queryLower.match(/(?:assigned to|for|to) (\w+)/i);
        if (assigneeMatch) {
          assignee = assigneeMatch[1];
        }
      }
      
      // Check for date filters
      let dateFilter = null;
      if (queryLower.match(/yesterday|last meeting|recent|latest/i)) {
        dateFilter = 'recent';
      }
      
      const actionItems = await getActionItems(assignee);
      
      if (actionItems.length > 0) {
        // Filter by date if needed
        let filteredItems = actionItems;
        if (dateFilter === 'recent') {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          filteredItems = actionItems.filter(item => 
            new Date(item.meetingDate) >= oneDayAgo
          );
        }
        
        context = `\n✅ ACTION ITEMS FOUND: ${filteredItems.length}\n\n`;
        
        filteredItems.slice(0, 10).forEach((item, idx) => {
          context += `${idx + 1}. "${item.title}"\n`;
          context += `   Meeting: ${item.meetingTitle}\n`;
          context += `   Date: ${new Date(item.meetingDate).toLocaleDateString()}\n`;
          context += `   Assigned to: ${item.assignee || 'Unassigned'}\n`;
          context += `   Priority: ${item.priority || 'medium'}\n`;
          if (item.description) {
            context += `   Details: ${item.description}\n`;
          }
          context += '\n';
        });
        
        sources = filteredItems.slice(0, 5).map(item => ({
          type: 'action_item',
          meetingTitle: item.meetingTitle,
          meetingDate: item.meetingDate,
          text: `${item.title} - ${item.assignee}`
        }));
      } else {
        context = '\nNo action items found matching your criteria.';
      }
    }
    
    // ============================================
    // 3. DATE-SPECIFIC QUERIES
    // ============================================
    else if (queryLower.match(/yesterday|last meeting|recent|today|this week|last week/i)) {
      console.log('📅 Date-specific query detected');
      
      let dateFilter = new Date();
      let dateLabel = 'recent';
      
      if (queryLower.includes('yesterday')) {
        dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        dateLabel = 'yesterday';
      } else if (queryLower.includes('today')) {
        dateFilter = new Date();
        dateLabel = 'today';
      } else if (queryLower.includes('this week')) {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dateLabel = 'this week';
      } else if (queryLower.includes('last week')) {
        dateFilter = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        dateLabel = 'last week';
      }
      
      const meetings = await Meeting.find({
        scheduledDate: { $gte: dateFilter },
        status: { $in: ['completed', 'in_progress'] }
      })
      .sort({ scheduledDate: -1 })
      .limit(5)
      .lean();
      
      if (meetings.length > 0) {
        const meetingIds = meetings.map(m => m.meetingId);
        const transcripts = await Transcript.find({
          meetingId: { $in: meetingIds }
        }).lean();
        
        const transcriptMap = {};
        transcripts.forEach(t => {
          transcriptMap[t.meetingId] = t;
        });
        
        context = `\n📅 MEETINGS FROM ${dateLabel.toUpperCase()}:\n\n`;
        
        meetings.forEach((meeting, idx) => {
          const transcript = transcriptMap[meeting.meetingId];
          context += `${idx + 1}. "${meeting.title}"\n`;
          context += `   Date: ${new Date(meeting.scheduledDate).toLocaleString()}\n`;
          context += `   Duration: ${meeting.duration || 'Unknown'} minutes\n`;
          
          if (meeting.summary) {
            context += `   Summary: ${meeting.summary.executiveSummary}\n`;
            
            if (meeting.summary.actionItems?.length > 0) {
              context += `   Action Items:\n`;
              meeting.summary.actionItems.slice(0, 3).forEach(item => {
                context += `     • ${item.title} (${item.assignee})\n`;
              });
            }
          }
          
          if (transcript) {
            context += `   Transcript available: Yes (${transcript.segments?.length || 0} segments)\n`;
          }
          
          context += '\n';
        });
        
        sources = meetings.map(m => ({
          type: 'meeting',
          meetingId: m.meetingId,
          title: m.title,
          date: m.scheduledDate
        }));
      } else {
        context = `\nNo meetings found from ${dateLabel}.`;
      }
    }
    
    // ============================================
    // 4. GENERAL SEARCH
    // ============================================
    else {
      console.log('🔍 General search query');
      const relevantMeetings = await searchRelevantMeetings(userQuery);
      
      if (relevantMeetings.length > 0) {
        const meetingContexts = relevantMeetings.map(m => {
          let info = `\nMEETING: ${m.title}\nDATE: ${new Date(m.scheduledDate).toLocaleDateString()}\n`;
          
          if (m.summary) {
            info += `SUMMARY: ${m.summary.executiveSummary}\n`;
            if (m.summary.keyPoints?.length > 0) {
              info += `KEY POINTS: ${m.summary.keyPoints.join(', ')}\n`;
            }
          }
          
          if (m.transcript?.fullText) {
            // Include relevant excerpt (first 500 chars)
            info += `TRANSCRIPT EXCERPT: ${m.transcript.fullText.substring(0, 500)}...\n`;
          }
          
          return info;
        });

        context = '\nRELEVANT MEETING CONTEXT:\n' + meetingContexts.join('\n---\n');
        sources = relevantMeetings.map(m => ({
          type: 'meeting',
          meetingId: m.meetingId,
          title: m.title,
          date: m.scheduledDate
        }));
      }
    }

    // Build conversation history for context
    const conversationContext = conversationHistory
      .slice(-4) // Last 4 messages
      .map(msg => `${msg.from === 'user' ? 'USER' : 'ASSISTANT'}: ${msg.text}`)
      .join('\n');

    // Create prompt for Ollama
    const prompt = `You are an intelligent meeting assistant with access to meeting data. Answer the user's question based on the provided meeting context.

${conversationContext ? `PREVIOUS CONVERSATION:\n${conversationContext}\n` : ''}
${context || 'No specific meeting context found for this query.'}

USER QUESTION: ${userQuery}

INSTRUCTIONS:
- Answer directly and conversationally
- When listing action items or tasks, format them clearly with bullet points
- When quoting what someone said, use their exact words from the transcript
- Include meeting titles and dates for reference
- If no relevant context is found, say so politely and suggest what you can help with
- Keep responses concise (under 200 words) unless listing multiple items
- Be specific and cite sources

RESPONSE:`;

    console.log('📤 Sending prompt to Ollama...');

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.response.trim();

    console.log('✅ AI response generated');

    return {
      response: aiResponse,
      sources: sources.slice(0, 3), // Top 3 sources
      hasContext: context.length > 0
    };

  } catch (error) {
    console.error('❌ Chatbot error:', error);
    
    // Fallback response
    return {
      response: "I'm having trouble connecting to the AI service right now. Please make sure Ollama is running (http://localhost:11434) and try again.",
      sources: [],
      hasContext: false,
      error: error.message
    };
  }
}

module.exports = {
  generateChatResponse,
  searchRelevantMeetings,
  getActionItems,
  getParticipantInfo
};
