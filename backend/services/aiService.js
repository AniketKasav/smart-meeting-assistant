// backend/services/aiService.js - FIXED MULTI-TURN ACCURACY
const axios = require('axios');
const { OLLAMA_CONFIG, SYSTEM_PROMPT } = require('../config/ollama.config');
const contextManager = require('./contextManager');

class AIService {
  constructor() {
    this.config = {
      baseUrl: OLLAMA_CONFIG.host,
      model: OLLAMA_CONFIG.model,
      timeout: OLLAMA_CONFIG.timeout,
      options: OLLAMA_CONFIG.options
    };
    this.systemPrompt = SYSTEM_PROMPT;
    console.log('🤖 AI Service initialized:', this.config.baseUrl);
  }

  /**
   * Build dynamic prompt with user context and multi-turn state
   */
  buildPrompt(userMessage, conversationHistory = [], userContext = {}, currentContext = null) {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    let contextInfo = `\nCURRENT DATE: ${currentDate}\nCURRENT TIME: ${currentTime}\n`;
    
    if (userContext.userName) {
      contextInfo += `USER: ${userContext.userName}\n`;
    }
    
    if (userContext.upcomingMeetings) {
      contextInfo += `UPCOMING MEETINGS: ${userContext.upcomingMeetings.length}\n`;
    }
    
    if (userContext.pendingTasks) {
      contextInfo += `PENDING TASKS: ${userContext.pendingTasks}\n`;
    }

    // Add multi-turn context
    let multiTurnContext = '';
    if (currentContext && !currentContext.isComplete) {
      multiTurnContext = `\n🔄 MULTI-TURN CONVERSATION IN PROGRESS:
INTENT: ${currentContext.intent}
COLLECTED PARAMS: ${JSON.stringify(currentContext.collectedParams)}
PENDING PARAMS: ${JSON.stringify(currentContext.pendingParams)}
STEP: ${currentContext.step}
LAST QUESTION: ${currentContext.nextQuestion || 'none'}

INSTRUCTION: Continue collecting missing parameters. Ask ONE question at a time.
`;
    }

    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\nCONVERSATION HISTORY:\n';
      conversationHistory.slice(-5).forEach(msg => {
        conversationContext += `${msg.role}: ${msg.content}\n`;
      });
    }

    return `${SYSTEM_PROMPT}${contextInfo}${multiTurnContext}${conversationContext}\n\nUSER REQUEST: "${userMessage}"\n\nRespond with ONLY valid JSON:`;
  }

  /**
   * ✅ FIXED: Extract parameters - ONLY what was asked for in multi-turn
   */
  async extractParameters(userMessage, intent, currentContext = null) {
    const currentDate = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    // ✅ FIX: If in multi-turn, ONLY extract the specific parameter we asked for
    let targetParam = null;
    if (currentContext && currentContext.nextQuestion && currentContext.pendingParams) {
      // Determine which parameter we're collecting based on the question
      const question = currentContext.nextQuestion.toLowerCase();
      if (question.includes('when') || question.includes('date')) {
        targetParam = 'date';
      } else if (question.includes('time') || question.includes('what time')) {
        targetParam = 'time';
      } else if (question.includes('who') || question.includes('invite') || question.includes('participants')) {
        targetParam = 'participants';
      } else if (question.includes('about') || question.includes('topic') || question.includes('meeting about')) {
        targetParam = 'title';
      } else if (question.includes('assign')) {
        targetParam = 'assignee';
      } else if (question.includes('task')) {
        targetParam = 'taskTitle';
      } else if (question.includes('deadline') || question.includes('due')) {
        targetParam = 'dueDate';
      }
    }

    // ✅ FIX: Restrictive prompt for multi-turn
    let extractionPrompt;
    
    if (targetParam) {
      // ✅ ONLY extract the specific parameter we asked for
      console.log(`🎯 Multi-turn: Extracting ONLY "${targetParam}" from response`);
      
      extractionPrompt = `Current date: ${currentDate}
Tomorrow's date: ${tomorrowDate}

CONTEXT: You asked the user about "${targetParam}" and they responded.
User's answer: "${userMessage}"

Extract ONLY the "${targetParam}" value. Return null for all other fields.

IMPORTANT:
- If user says "tomorrow", use date: ${tomorrowDate}
- If user says "today", use date: ${currentDate}
- If user says "3pm" or "3:00 pm", convert to "15:00"
- If user says names like "John" or "John and Sarah", extract as ["John"] or ["John", "Sarah"]
- DO NOT extract information that wasn't asked for
- If user's answer is unclear, return null for that field

Return ONLY valid JSON:
{
  "title": ${targetParam === 'title' ? '"extracted title"' : 'null'},
  "date": ${targetParam === 'date' ? '"YYYY-MM-DD"' : 'null'},
  "time": ${targetParam === 'time' ? '"HH:MM"' : 'null'},
  "participants": ${targetParam === 'participants' ? '["names"]' : '[]'},
  "assignee": ${targetParam === 'assignee' ? '"name"' : 'null'},
  "taskTitle": ${targetParam === 'taskTitle' ? '"task"' : 'null'},
  "dueDate": ${targetParam === 'dueDate' ? '"YYYY-MM-DD"' : 'null'}
}`;
    } else {
      // ✅ Initial extraction (not in multi-turn yet)
      extractionPrompt = `Current date: ${currentDate}
Tomorrow's date: ${tomorrowDate}

Extract information from this message for ${intent}:
User message: "${userMessage}"

IMPORTANT EXTRACTION RULES:
- If user says "tomorrow", use date: ${tomorrowDate}
- If user says "today", use date: ${currentDate}
- If user says "3pm" or "3:00 pm", convert to "15:00"
- If user says names like "John" or "John and Sarah", extract as ["John"] or ["John", "Sarah"]
- ONLY extract information that is EXPLICITLY mentioned
- If something is not mentioned, use null or empty array
- Do NOT make assumptions or invent data

Return ONLY valid JSON:
{
  "title": "extracted title or null",
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM (24-hour) or null",
  "participants": ["array of names or empty"],
  "assignee": "name or null",
  "taskTitle": "task description or null",
  "dueDate": "YYYY-MM-DD or null"
}`;
    }

    try {
      const response = await this.callOllama(extractionPrompt);
      
      // Use dateParser as backup/enhancement
      const dateParser = require('../utils/dateParser');
      
      if (response) {
        // ✅ FIX: Only enhance the target parameter in multi-turn
        if (targetParam) {
          // Only enhance the specific parameter we're collecting
          if (targetParam === 'date' && !response.date) {
            response.date = dateParser.parseDate(userMessage);
          } else if (targetParam === 'time' && !response.time) {
            response.time = dateParser.parseTime(userMessage);
          } else if (targetParam === 'participants' && (!response.participants || response.participants.length === 0)) {
            response.participants = dateParser.parseParticipants(userMessage);
          } else if (targetParam === 'title' && !response.title) {
            response.title = dateParser.extractTitle(userMessage);
          } else if (targetParam === 'taskTitle' && !response.taskTitle) {
            response.taskTitle = dateParser.extractTitle(userMessage);
          }
        } else {
          // Initial extraction - enhance all fields
          if (!response.date) response.date = dateParser.parseDate(userMessage);
          if (!response.time) response.time = dateParser.parseTime(userMessage);
          if (!response.participants || response.participants.length === 0) {
            response.participants = dateParser.parseParticipants(userMessage);
          }
          if (!response.title && !response.taskTitle) {
            const extracted = dateParser.extractTitle(userMessage);
            if (intent === 'CREATE_TASK') {
              response.taskTitle = extracted;
            } else {
              response.title = extracted;
            }
          }
        }
      }
      
      console.log('📦 Final extracted params:', response);
      return response || {};
    } catch (error) {
      console.error('Parameter extraction error:', error);
      
      // Fallback to dateParser
      const dateParser = require('../utils/dateParser');
      
      // ✅ FIX: Only extract target param in multi-turn
      if (targetParam) {
        const result = {
          title: null,
          date: null,
          time: null,
          participants: [],
          assignee: null,
          taskTitle: null,
          dueDate: null
        };
        
        if (targetParam === 'date') result.date = dateParser.parseDate(userMessage);
        else if (targetParam === 'time') result.time = dateParser.parseTime(userMessage);
        else if (targetParam === 'participants') result.participants = dateParser.parseParticipants(userMessage);
        else if (targetParam === 'title') result.title = dateParser.extractTitle(userMessage);
        else if (targetParam === 'taskTitle') result.taskTitle = dateParser.extractTitle(userMessage);
        
        return result;
      }
      
      return {
        title: dateParser.extractTitle(userMessage),
        date: dateParser.parseDate(userMessage),
        time: dateParser.parseTime(userMessage),
        participants: dateParser.parseParticipants(userMessage),
        assignee: null,
        taskTitle: null,
        dueDate: null
      };
    }
  }

  /**
   * Get follow-up question for missing parameter
   */
  getFollowUpQuestion(intent, param) {
    const questions = {
      'SCHEDULE_MEETING': {
        'date': 'When would you like to schedule the meeting?',
        'time': 'What time should the meeting start?',
        'participants': 'Who should I invite to this meeting?',
        'title': 'What is the meeting about?'
      },
      'CREATE_TASK': {
        'taskTitle': 'What should the task be?',
        'assignee': 'Who should I assign this task to?',
        'dueDate': 'When should this task be completed?'
      }
    };

    return questions[intent]?.[param] || `Please provide: ${param}`;
  }

  /**
   * Get action type for intent
   */
  getActionForIntent(intent) {
    const actions = {
      'SCHEDULE_MEETING': 'create',
      'CREATE_TASK': 'create',
      'SEARCH_MEETINGS': 'search',
      'LIST_TASKS': 'query'
    };
    return actions[intent] || 'none';
  }

  /**
   * Get completion message
   */
  getCompletionMessage(intent, params) {
    if (intent === 'SCHEDULE_MEETING') {
      const parts = [];
      if (params.title) parts.push(`about ${params.title}`);
      if (params.date) parts.push(`on ${params.date}`);
      if (params.time) parts.push(`at ${params.time}`);
      if (params.participants && params.participants.length > 0) {
        parts.push(`with ${params.participants.join(', ')}`);
      }
      return `I'll schedule a meeting ${parts.join(' ')}.`;
    }
    if (intent === 'CREATE_TASK') {
      const parts = [];
      if (params.taskTitle) parts.push(`"${params.taskTitle}"`);
      if (params.assignee) parts.push(`for ${params.assignee}`);
      if (params.dueDate) parts.push(`due ${params.dueDate}`);
      return `I'll create a task ${parts.join(' ')}.`;
    }
    return 'Done!';
  }

  /**
   * Get missing parameters
   */
  getMissingParams(intent, collectedParams) {
    const requiredParams = {
      SCHEDULE_MEETING: ['date', 'time', 'participants', 'title'], // ✅ Fixed order: date first
      CREATE_TASK: ['taskTitle', 'assignee', 'dueDate']
    };

    const needed = requiredParams[intent] || [];
    return needed.filter(param => {
      const value = collectedParams[param];
      return !value || (Array.isArray(value) && value.length === 0);
    });
  }

  /**
   * Main processing function with multi-turn support
   */
  async processUserInput(userId, userMessage, conversationHistory = [], userContext = {}) {
    try {
      console.log(`📥 Processing input from user ${userId}: "${userMessage}"`);

      const currentContext = await contextManager.getCurrentContext(userId);

      // ✅ Check if in multi-turn conversation
      if (currentContext && currentContext.intent && !currentContext.isComplete) {
        console.log('🔄 Continuing multi-turn conversation');
        const multiTurnResult = await this.handleMultiTurn(
          userId,
          userMessage,
          conversationHistory,
          currentContext,
          userContext
        );

        if (multiTurnResult) {
          multiTurnResult.timestamp = new Date().toISOString();
          return {
            success: true,
            data: multiTurnResult
          };
        }
      }

      // Build prompt with context
      const prompt = this.buildPrompt(userMessage, conversationHistory, userContext, currentContext);

      // Call Ollama
      const aiResponse = await this.callOllama(prompt);

      // Validate response
      if (!aiResponse || typeof aiResponse !== 'object') {
        throw new Error('Invalid AI response format');
      }

      // Parse and validate response
      const parsedResponse = {
        intent: aiResponse.intent || 'GENERAL_HELP',
        confidence: aiResponse.confidence || 0.5,
        action: aiResponse.action || 'none',
        params: aiResponse.params || {},
        response: aiResponse.response || 'I can help you with that.',
        suggestion: aiResponse.suggestion || null,
        clarification: aiResponse.clarification || null,
        needsMoreInfo: aiResponse.needsMoreInfo || false,
        multiTurn: false,
        isComplete: true,
        step: 1,
        timestamp: new Date().toISOString()
      };

      // ✅ Check if this starts a multi-turn conversation
      if (parsedResponse.needsMoreInfo && parsedResponse.clarification) {
        console.log('🔄 Starting multi-turn conversation');
        
        const missingParams = this.getMissingParams(parsedResponse.intent, parsedResponse.params);

        // Initialize multi-turn context
        await contextManager.updateContext(userId, {
          intent: parsedResponse.intent,
          collectedParams: parsedResponse.params,
          pendingParams: missingParams,
          nextQuestion: parsedResponse.clarification,
          step: 1,
          isComplete: false
        });

        parsedResponse.multiTurn = true;
        parsedResponse.isComplete = false;
      }

      console.log('✅ AI processing complete:', parsedResponse.intent);

      return {
        success: true,
        data: parsedResponse
      };

    } catch (error) {
      console.error('AI Processing Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process input',
        data: {
          intent: 'ERROR',
          response: 'Sorry, I encountered an error processing your request.',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * ✅ FIXED: Handle multi-turn conversation continuation
   */
  async handleMultiTurn(userId, userMessage, conversationHistory, currentContext, userContext) {
    try {
      if (!currentContext || !currentContext.intent) {
        console.log('⚠️ No active multi-turn context, starting fresh');
        return null;
      }

      const intent = currentContext.intent;
      const collectedParams = { ...(currentContext.collectedParams || {}) };
      const pendingParams = [...(currentContext.pendingParams || [])];

      console.log(`🔄 Multi-turn for ${intent}, step ${currentContext.step}`);
      console.log('📝 Current collected params:', collectedParams);
      console.log('❓ Pending params:', pendingParams);

      // ✅ FIX: Extract new info - PASS FULL CONTEXT
      const extractedParams = await this.extractParameters(userMessage, intent, currentContext);
      console.log('✨ Newly extracted params:', extractedParams);

      // ✅ FIX: Smart merge - only overwrite non-null new values
      for (const key in extractedParams) {
        const newValue = extractedParams[key];
        
        // Skip if null/undefined/empty
        if (newValue === null || newValue === undefined || newValue === '') {
          continue;
        }
        
        // For arrays, merge unique values
        if (Array.isArray(newValue)) {
          if (!collectedParams[key]) {
            collectedParams[key] = [];
          }
          if (newValue.length > 0) {
            collectedParams[key] = [...new Set([...collectedParams[key], ...newValue])];
          }
        } else {
          // Only update if has actual value
          collectedParams[key] = newValue;
        }
      }

      console.log('✅ Merged params:', collectedParams);

      // Check what's still missing
      const stillMissing = this.getMissingParams(intent, collectedParams);
      console.log('❓ Still missing:', stillMissing);

      if (stillMissing.length > 0) {
        // Ask for next missing parameter
        const nextParam = stillMissing[0];
        const question = this.getFollowUpQuestion(intent, nextParam);

        // Update context
        await contextManager.updateContext(userId, {
          ...currentContext,
          collectedParams,
          pendingParams: stillMissing,
          step: currentContext.step + 1,
          nextQuestion: question,
          isComplete: false
        });

        return {
          intent,
          action: this.getActionForIntent(intent),
          params: collectedParams,
          response: 'Got it.',
          needsMoreInfo: true,
          clarification: question,
          multiTurn: true,
          isComplete: false,
          step: currentContext.step + 1,
          collectedParams,
          pendingParams: stillMissing
        };
      }

      // ✅ All params collected
      console.log('✅ All params collected:', collectedParams);

      await contextManager.clearContext(userId);

      return {
        intent,
        action: this.getActionForIntent(intent),
        params: collectedParams,
        response: `Got it! ${this.getCompletionMessage(intent, collectedParams)}`,
        needsMoreInfo: false,
        multiTurn: true,
        isComplete: true
      };

    } catch (error) {
      console.error('Multi-turn error:', error);
      await contextManager.clearContext(userId);
      return null;
    }
  }

  /**
   * Call Ollama API
   */
  async callOllama(prompt) {
    try {
      console.log('🤖 Calling Ollama at:', this.config.baseUrl);
      
      const response = await axios.post(
        `${this.config.baseUrl}/api/generate`,
        {
          model: this.config.model,
          prompt,
          stream: false,
          format: 'json',
          options: this.config.options
        },
        { timeout: this.config.timeout }
      );

      if (!response.data || !response.data.response) {
        throw new Error('Empty response from Ollama');
      }

      let rawResponse = response.data.response;
      
      if (typeof rawResponse === 'object') {
        return rawResponse;
      }

      rawResponse = rawResponse.trim();
      rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawResponse = jsonMatch[0];
      }

      console.log('🤖 Ollama raw response:', rawResponse.substring(0, 200));

      try {
        return JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError.message);
        
        return {
          intent: 'SCHEDULE_MEETING',
          action: 'create',
          params: {
            title: null,
            date: null,
            time: null,
            participants: []
          },
          response: "I understand you want to schedule a meeting. When would you like to schedule it?",
          clarification: "When would you like to schedule the meeting?",
          needsMoreInfo: true
        };
      }

    } catch (error) {
      console.error('Ollama API error:', error.message);
      throw error;
    }
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
        timeout: 5000
      });
      
      const hasModel = response.data.models.some(m => m.name.includes('llama3.2'));
      
      return {
        available: true,
        models: response.data.models.map(m => m.name),
        hasRequiredModel: hasModel
      };
    } catch (error) {
      return {
        available: false,
        models: [],
        hasRequiredModel: false,
        error: error.message
      };
    }
  }
  /**
   * Parse natural language search query
   */
  async parseNaturalLanguageSearch(query) {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      const prompt = `You are a search query parser for a meeting management system.

Current date: ${currentDate}

User's search query: "${query}"

Extract the following information:
- keywords: Array of important search terms
- participants: Array of people's names mentioned
- dateRange: Object with 'from' and 'to' dates (YYYY-MM-DD format)
  - "last week" = 7 days ago to today
  - "last month" = 30 days ago to today
  - "this month" = first day of current month to today
  - "yesterday" = yesterday's date
- topics: Array of topics/subjects mentioned

Examples:
"meetings about budget last month" → keywords: ["budget"], dateRange: { from: "2024-11-29", to: "${currentDate}" }
"meetings with John from last week" → participants: ["John"], dateRange: { from: "2024-12-22", to: "${currentDate}" }
"Q4 planning meetings" → keywords: ["Q4", "planning"]

Return ONLY valid JSON:
{
  "keywords": ["array"],
  "participants": ["array"],
  "dateRange": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" } or null,
  "topics": ["array"]
}`;

      const response = await this.callOllama(prompt);

      // Enhance with date parser
      const dateParser = require('../utils/dateParser');
      
      if (!response.dateRange && query.match(/last\s+(week|month|year)/i)) {
        const match = query.match(/last\s+(week|month|year)/i);
        const period = match[1];
        
        const to = new Date();
        const from = new Date();
        
        if (period === 'week') {
          from.setDate(from.getDate() - 7);
        } else if (period === 'month') {
          from.setDate(from.getDate() - 30);
        } else if (period === 'year') {
          from.setDate(from.getDate() - 365);
        }
        
        response.dateRange = {
          from: from.toISOString().split('T')[0],
          to: to.toISOString().split('T')[0]
        };
      }

      console.log('🔍 Parsed search params:', response);

      return {
        success: true,
        ...response
      };

    } catch (error) {
      console.error('Search parsing error:', error);
      
      // Fallback to basic keyword extraction
      const keywords = query.split(' ').filter(w => w.length > 3);
      
      return {
        success: true,
        keywords,
        participants: [],
        dateRange: null,
        topics: keywords
      };
    }
  }

  /**
   * Generate meeting summary from transcript
   */
  async generateMeetingSummary(meetingId) {
    try {
      const Transcript = require('../models/Transcript');
      const Meeting = require('../models/Meeting');

      // Get meeting and transcript
      const meeting = await Meeting.findOne({ meetingId }).lean();
      const transcripts = await Transcript.find({ meetingId }).lean();

      if (!meeting || transcripts.length === 0) {
        return {
          success: false,
          error: 'Meeting or transcript not found'
        };
      }

      // Combine all transcript text
      let fullText = '';
      transcripts.forEach(transcript => {
        transcript.segments.forEach(seg => {
          fullText += `${seg.text} `;
        });
      });

      // Limit text to avoid token limits
      fullText = fullText.substring(0, 4000);

      const prompt = `Analyze this meeting transcript and generate a comprehensive summary.

Meeting: "${meeting.title}"
Date: ${meeting.startedAt}

Transcript:
${fullText}

Generate:
1. A concise summary (2-3 sentences)
2. Key topics discussed (array of 3-5 topics)
3. Important points (array of 3-5 bullet points)
4. Overall sentiment (positive/neutral/negative)

Return ONLY valid JSON:
{
  "text": "Summary text here",
  "topics": ["topic1", "topic2", "topic3"],
  "keyPoints": ["point1", "point2", "point3"],
  "sentiment": "positive|neutral|negative"
}`;

      const response = await this.callOllama(prompt);

      console.log('📝 Generated summary for meeting:', meetingId);

      return {
        success: true,
        summary: {
          text: response.text || 'Meeting summary generated',
          topics: response.topics || [],
          keyPoints: response.keyPoints || [],
          sentiment: response.sentiment || 'neutral',
          generatedAt: new Date()
        }
      };

    } catch (error) {
      console.error('Summary generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse bulk task command
   */
  async parseBulkTaskCommand(command) {
    try {
      const currentDate = new Date().toISOString().split('T')[0];

      const prompt = `Parse this bulk task operation command.

Current date: ${currentDate}

Command: "${command}"

Extract:
- operation: "assign" or "complete"
- assignee: Name of person (if assigning)
- meetingTitle: Meeting name mentioned (if any)
- meetingDate: Date mentioned (YYYY-MM-DD format)
  - "yesterday" = ${new Date(Date.now() - 86400000).toISOString().split('T')[0]}
  - "today" = ${currentDate}
  - "last meeting" = most recent
- status: "pending" | "in-progress" | "completed"

Examples:
"Assign all tasks from yesterday's meeting to Sarah" → 
  { operation: "assign", assignee: "Sarah", meetingDate: "yesterday's date" }

"Complete all pending tasks" → 
  { operation: "complete", status: "pending" }

"Assign tasks from Q4 meeting to John" → 
  { operation: "assign", assignee: "John", meetingTitle: "Q4" }

Return ONLY valid JSON:
{
  "operation": "assign|complete",
  "assignee": "name or null",
  "meetingTitle": "title or null",
  "meetingDate": "YYYY-MM-DD or null",
  "status": "pending|in-progress|completed or null"
}`;

      const response = await this.callOllama(prompt);

      console.log('📦 Parsed bulk command:', response);

      return {
        success: true,
        ...response
      };

    } catch (error) {
      console.error('Bulk command parsing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new AIService();