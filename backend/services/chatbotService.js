// backend/services/chatbotService.js
const Meeting = require('../models/Meeting');
const Transcript = require('../models/Transcript');

const Groq = require('groq-sdk');
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============================================
// QUERY INTENT DETECTION
// ============================================
function detectIntent(query) {
  const q = query.toLowerCase();

  if (/^(give me |show me |just |only )?(the )?(list|titles?|names?)( only)?$/.test(q.trim()) ||
      q.includes('list only') || q.includes('just titles') || q.includes('names only') ||
      q.includes('just list') || q.includes('only list')) {
    return 'LIST_ONLY';
  }
  if (/how many meeting|count.*meeting|number of meeting|total meeting/.test(q)) return 'COUNT';
  if (/action item|task|todo|assignment/.test(q)) return 'ACTION_ITEMS';
  if (/what did .+ say|what .+ said|what .+ mention|what .+ told/.test(q)) return 'PARTICIPANT_QUOTE';
  if (/summarize|summary|overview|brief/.test(q)) return 'SUMMARY';
  if (/yesterday|today|this week|last week|last meeting|recent|latest/.test(q)) return 'DATE_QUERY';
  if (/show.*all|list.*all|all.*meeting/.test(q)) return 'LIST_ALL';
  if (/transcript|said|spoke|discuss|talk/.test(q)) return 'TRANSCRIPT';

  return 'GENERAL';
}

// ============================================
// SMART CONTEXT BUILDER
// ============================================
async function buildMeetingContext(userQuery, intent) {
  try {
    const meetings = await Meeting.find({
      status: { $in: ['completed', 'in-progress'] }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (meetings.length === 0) {
      return { context: 'No meetings found in the database.', sources: [] };
    }

    const meetingIds = meetings.map(m => m.meetingId);

    // Only fetch transcripts when needed
    const needsTranscripts = ['PARTICIPANT_QUOTE', 'TRANSCRIPT', 'GENERAL', 'SUMMARY', 'DATE_QUERY'].includes(intent);

    // Map: meetingId -> { allSegments: [], fullText: '' }
    // We MERGE all transcript docs per meeting so English+Marathi segments all appear.
    let transcriptMap = {};
    if (needsTranscripts) {
      const transcripts = await Transcript.find({
        meetingId: { $in: meetingIds },
        processingStatus: { $in: ['completed', 'live'] }
      }).lean();

      // Group transcripts by meetingId, collecting all segments
      const grouped = {};
      transcripts.forEach(t => {
        if (!grouped[t.meetingId]) grouped[t.meetingId] = [];
        grouped[t.meetingId].push(t);
      });

      // For each meeting, merge all non-Whisper (live/Web Speech) transcripts first,
      // then fall back to Whisper if nothing else has content.
      for (const [mid, docs] of Object.entries(grouped)) {
        // Separate live docs (no audioPath) from Whisper docs (has audioPath)
        const liveDocs  = docs.filter(d => !d.audioPath && (d.segments?.length > 0 || d.fullText));
        const whisperDocs = docs.filter(d =>  d.audioPath && (d.segments?.length > 0 || d.fullText));

        // Prefer live docs; fall back to Whisper if nothing live has content
        const preferredDocs = liveDocs.length > 0 ? liveDocs : whisperDocs;

        if (preferredDocs.length === 0) {
          // Nothing has content — just keep the first doc as a placeholder
          transcriptMap[mid] = { segments: [], fullText: '' };
          continue;
        }

        // Merge all segments from all preferred docs, sorted by start time
        const allSegments = preferredDocs
          .flatMap(d => d.segments || [])
          .sort((a, b) => (a.start || 0) - (b.start || 0));

        const mergedFullText = allSegments.length > 0
          ? allSegments.map(s => s.text).join(' ')
          : preferredDocs.map(d => d.fullText || '').join(' ').trim();

        transcriptMap[mid] = { segments: allSegments, fullText: mergedFullText };
      }
    }

    const sources = [];
    let context = '=== MEETING DATABASE ===\n\n';

    // For LIST_ONLY and COUNT — just titles and dates
    if (intent === 'LIST_ONLY' || intent === 'COUNT') {
      meetings.forEach((meeting, idx) => {
        const date = meeting.scheduledDate || meeting.createdAt || meeting.startedAt;
        context += `${idx + 1}. ${meeting.title || 'Untitled'} — ${date ? new Date(date).toLocaleDateString() : 'Unknown date'} (${meeting.status})\n`;
        sources.push({ meetingId: meeting.meetingId, title: meeting.title, date });
      });
      return { context, sources };
    }

    // Full details for all other intents
    meetings.forEach((meeting, idx) => {
      const transcript = transcriptMap[meeting.meetingId];
      const date = meeting.scheduledDate || meeting.createdAt || meeting.startedAt;

      // Duration is stored in seconds
      const durSec = meeting.duration || 0;
      const durStr = durSec > 0
        ? `${Math.floor(durSec / 60)}m ${Math.floor(durSec % 60)}s`
        : 'Unknown';

      context += `--- MEETING ${idx + 1} ---\n`;
      context += `MeetingID: ${meeting.meetingId}\n`;
      context += `Title: ${meeting.title || 'Untitled'}\n`;
      context += `Date: ${date ? new Date(date).toLocaleString() : 'Unknown'}\n`;
      context += `Status: ${meeting.status}\n`;
      context += `Duration: ${durStr}\n`;

      if (meeting.participants?.length > 0) {
        const names = meeting.participants.map(p => p.name || p.userName || 'Unknown').join(', ');
        context += `Participants: ${names}\n`;
      }

      if (meeting.summary) {
        if (meeting.summary.text) context += `Summary: ${meeting.summary.text}\n`;
        if (meeting.summary.keyPoints?.length > 0) context += `Key Points: ${meeting.summary.keyPoints.join(' | ')}\n`;
        if (meeting.summary.decisions?.length > 0) context += `Decisions: ${meeting.summary.decisions.join(' | ')}\n`;
        if (meeting.summary.actionItems?.length > 0) {
          context += `Action Items:\n`;
          meeting.summary.actionItems.forEach(item => {
            context += `  - ${item.title || item.text || item} (Assigned: ${item.assignee || 'Unassigned'}, Status: ${item.status || 'pending'})\n`;
          });
        }
        if (meeting.summary.nextSteps?.length > 0) context += `Next Steps: ${meeting.summary.nextSteps.join(' | ')}\n`;
        if (meeting.summary.sentiment) context += `Sentiment: ${meeting.summary.sentiment}\n`;
      }

      if (transcript?.segments?.length > 0) {
        // Output plain text without timestamp codes — LLM copies format codes literally
        context += `Transcript:\n`;
        transcript.segments.forEach(seg => {
          const speaker = seg.speaker && seg.speaker !== 'Unknown' ? seg.speaker : 'Speaker';
          context += `  ${speaker}: ${seg.text}\n`;
        });
      } else if (transcript?.fullText) {
        context += `Transcript: ${transcript.fullText.substring(0, 2000)}\n`;
      }

      context += '\n';
      sources.push({ meetingId: meeting.meetingId, title: meeting.title, date });
    });

    return { context, sources };

  } catch (error) {
    console.error('❌ Error building context:', error);
    return { context: 'Error loading meeting data.', sources: [] };
  }
}

// ============================================
// INTENT-SPECIFIC PROMPT BUILDER
// ============================================
function buildPrompt(intent, userQuery, context, historyText) {
  const intentInstructions = {
    LIST_ONLY: `The user wants ONLY a simple numbered list of meeting titles and dates.
DO NOT include summaries, transcripts, action items, or any other details.
Just return a clean numbered list like:
1. Meeting Title — Date
2. Meeting Title — Date`,

    COUNT: `The user wants to know how many meetings there are.
Give a direct, short answer with the count. You can add a brief breakdown by status.`,

    ACTION_ITEMS: `The user is asking about action items or tasks.
List all action items clearly with:
- The task name
- Who it is assigned to
- The status
- Which meeting it came from
Group by meeting if there are multiple.`,

    PARTICIPANT_QUOTE: `The user wants to know what a specific person said.
Search the transcripts carefully and quote their exact words.
Always mention which meeting and approximate time they said it.
If the person is not found, say so clearly.`,

    SUMMARY: `The user wants a summary.
Give a clear, concise summary covering:
- Main topics discussed
- Key decisions made
- Action items
- Overall sentiment
Keep it brief but informative.`,

    DATE_QUERY: `The user is asking about meetings from a specific time period.
Find the relevant meetings and give appropriate details based on context.
If asking what was discussed, summarize the key topics.`,

    TRANSCRIPT: `The user is asking about transcript content.
Quote relevant parts directly from the transcript.
Include the speaker name when showing quotes.
Do NOT add timestamps, codes like [0:57], or extra formatting — just quote the text naturally.`,

    GENERAL: `Answer the user question accurately using the meeting data.
Be conversational and helpful. Cite specific meetings when relevant.
If the transcript contains text in multiple languages (e.g., both English and Marathi), include ALL of it — do not skip any language.`
  };

  const instruction = intentInstructions[intent] || intentInstructions.GENERAL;

  return `You are an intelligent AI meeting assistant. You have complete access to the user meeting database shown below.

${context}
${historyText ? `=== CONVERSATION HISTORY ===\n${historyText}\n` : ''}
=== USER QUESTION ===
${userQuery}

=== YOUR TASK ===
${instruction}

STRICT RULES:
- Only use information from the meeting database above — never make up content
- Do NOT add timestamp codes like [0:00], [0:57] etc. in your response
- Do NOT add "or text number at it" or any meta-commentary
- If transcript has text in multiple languages, show ALL of it
- Be direct and concise
- Do NOT repeat the same answer if user asks a follow-up

=== RESPONSE ===`;
}

// ============================================
// STREAMING RESPONSE (for real-time feel)
// ============================================
async function generateChatResponseStream(userQuery, conversationHistory = [], onChunk) {
  try {
    const intent = detectIntent(userQuery);
    const { context, sources } = await buildMeetingContext(userQuery, intent);

    const historyText = conversationHistory
      .slice(-6)
      .map(msg => `${msg.from === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    const prompt = buildPrompt(intent, userQuery, context, historyText);

    const stream = await groqClient.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 500,
      stream: true,
    });
    let fullResponse = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) { fullResponse += text; if (onChunk) onChunk(text); }
    }
    return { response: fullResponse.trim(), sources: sources.slice(0, 3), hasContext: true };

  } catch (error) {
    console.error('❌ Stream error:', error);
    throw error;
  }
}

// ============================================
// MAIN NON-STREAMING RESPONSE
// ============================================
async function generateChatResponse(userQuery, conversationHistory = []) {
  try {
    const intent = detectIntent(userQuery);
    const { context, sources } = await buildMeetingContext(userQuery, intent);

    const historyText = conversationHistory
      .slice(-6)
      .map(msg => `${msg.from === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    const prompt = buildPrompt(intent, userQuery, context, historyText);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt,
        stream: false,
        options: {
          temperature: 0.5,
          top_p: 0.9,
          num_predict: 500,
          num_ctx: 4096
        }
      })
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

    const data = await response.json();
    const aiResponse = data.response.trim();

    return { response: aiResponse, sources: sources.slice(0, 3), hasContext: true };

  } catch (error) {
    console.error('❌ Chatbot error:', error);
    return {
      response: "I'm having trouble generating a response. Please try again.",
      sources: [],
      hasContext: false,
      error: error.message
    };
  }
}

async function searchRelevantMeetings(query, limit = 5) {
  return Meeting.find({ status: { $in: ['completed', 'in-progress'] } })
    .sort({ createdAt: -1 }).limit(limit).lean();
}

async function getActionItems(assignee = null) {
  const meetings = await Meeting.find({ status: { $in: ['completed', 'in-progress'] } })
    .sort({ createdAt: -1 }).limit(10).lean();
  let items = [];
  meetings.forEach(m => {
    if (m.summary?.actionItems) {
      m.summary.actionItems.forEach(item => {
        items.push({ ...item, meetingTitle: m.title, meetingDate: m.createdAt });
      });
    }
  });
  if (assignee) items = items.filter(i => i.assignee?.toLowerCase().includes(assignee.toLowerCase()));
  return items;
}

async function getParticipantInfo(name) {
  return { participantName: name, meetingsAttended: 0, mentions: [] };
}

module.exports = {
  generateChatResponse,
  generateChatResponseStream,
  searchRelevantMeetings,
  getActionItems,
  getParticipantInfo
};


