// backend/services/aiService.js - Groq (replaces Gemini)
const Groq = require("groq-sdk");
const { SYSTEM_PROMPT } = require("../config/ollama.config");
const contextManager = require("./contextManager");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-8b-instant";

class AIService {
  constructor() {
    this.model = MODEL;
    this.systemPrompt = SYSTEM_PROMPT;
  }

  // ── Shared helper: call Groq and parse JSON response ─────────────────────
  async callGemini(prompt) {
    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const text = completion.choices[0]?.message?.content || "";

      // Strip markdown fences if present
      let clean = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Extract first {...} block
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) clean = jsonMatch[0];

      try {
        return JSON.parse(clean);
      } catch (parseError) {
        console.error("Failed to parse Groq response:", parseError.message);

        return {
          intent: "SCHEDULE_MEETING",
          action: "create",
          params: {
            title: null,
            date: null,
            time: null,
            participants: [],
          },
          response:
            "I understand you want to schedule a meeting. When would you like to schedule it?",
          clarification: "When would you like to schedule the meeting?",
          needsMoreInfo: true,
        };
      }
    } catch (error) {
      console.error("Groq API error:", error.message);
      throw error;
    }
  }

  // ── keeping callOllama as an alias so any code that calls it still works ───
  async callOllama(prompt) {
    return this.callGemini(prompt);
  }

  /**
   * Build dynamic prompt with user context and multi-turn state
   * ── UNCHANGED ──
   */
  buildPrompt(
    userMessage,
    conversationHistory = [],
    userContext = {},
    currentContext = null,
  ) {
    const currentDate = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toLocaleTimeString("en-US", {
      hour12: false,
    });

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
    let multiTurnContext = "";
    if (currentContext && !currentContext.isComplete) {
      multiTurnContext = `\n🔄 MULTI-TURN CONVERSATION IN PROGRESS:
INTENT: ${currentContext.intent}
COLLECTED PARAMS: ${JSON.stringify(currentContext.collectedParams)}
PENDING PARAMS: ${JSON.stringify(currentContext.pendingParams)}
STEP: ${currentContext.step}
LAST QUESTION: ${currentContext.nextQuestion || "none"}

INSTRUCTION: Continue collecting missing parameters. Ask ONE question at a time.
`;
    }

    let conversationContext = "";
    if (conversationHistory.length > 0) {
      conversationContext = "\nCONVERSATION HISTORY:\n";
      conversationHistory.slice(-5).forEach((msg) => {
        conversationContext += `${msg.role}: ${msg.content}\n`;
      });
    }

    return `${SYSTEM_PROMPT}${contextInfo}${multiTurnContext}${conversationContext}\n\nUSER REQUEST: "${userMessage}"\n\nRespond with ONLY valid JSON:`;
  }

  /**
   * ✅ FIXED: Extract parameters - ONLY what was asked for in multi-turn
   * ── UNCHANGED ──
   */
  async extractParameters(userMessage, intent, currentContext = null) {
    const currentDate = new Date().toISOString().split("T")[0];
    const tomorrowDate = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];

    let targetParam = null;
    if (
      currentContext &&
      currentContext.nextQuestion &&
      currentContext.pendingParams
    ) {
      const question = currentContext.nextQuestion.toLowerCase();
      if (question.includes("when") || question.includes("date")) {
        targetParam = "date";
      } else if (question.includes("time") || question.includes("what time")) {
        targetParam = "time";
      } else if (
        question.includes("who") ||
        question.includes("invite") ||
        question.includes("participants")
      ) {
        targetParam = "participants";
      } else if (
        question.includes("about") ||
        question.includes("topic") ||
        question.includes("meeting about")
      ) {
        targetParam = "title";
      } else if (question.includes("assign")) {
        targetParam = "assignee";
      } else if (question.includes("task")) {
        targetParam = "taskTitle";
      } else if (question.includes("deadline") || question.includes("due")) {
        targetParam = "dueDate";
      }
    }

    let extractionPrompt;

    if (targetParam) {
      console.log(
        `🎯 Multi-turn: Extracting ONLY "${targetParam}" from response`,
      );

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
  "title": ${targetParam === "title" ? '"extracted title"' : "null"},
  "date": ${targetParam === "date" ? '"YYYY-MM-DD"' : "null"},
  "time": ${targetParam === "time" ? '"HH:MM"' : "null"},
  "participants": ${targetParam === "participants" ? '["names"]' : "[]"},
  "assignee": ${targetParam === "assignee" ? '"name"' : "null"},
  "taskTitle": ${targetParam === "taskTitle" ? '"task"' : "null"},
  "dueDate": ${targetParam === "dueDate" ? '"YYYY-MM-DD"' : "null"}
}`;
    } else {
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
      const response = await this.callGemini(extractionPrompt);

      const dateParser = require("../utils/dateParser");

      if (response) {
        if (targetParam) {
          if (targetParam === "date" && !response.date) {
            response.date = dateParser.parseDate(userMessage);
          } else if (targetParam === "time" && !response.time) {
            response.time = dateParser.parseTime(userMessage);
          } else if (
            targetParam === "participants" &&
            (!response.participants || response.participants.length === 0)
          ) {
            response.participants = dateParser.parseParticipants(userMessage);
          } else if (targetParam === "title" && !response.title) {
            response.title = dateParser.extractTitle(userMessage);
          } else if (targetParam === "taskTitle" && !response.taskTitle) {
            response.taskTitle = dateParser.extractTitle(userMessage);
          }
        } else {
          if (!response.date) response.date = dateParser.parseDate(userMessage);
          if (!response.time) response.time = dateParser.parseTime(userMessage);
          if (!response.participants || response.participants.length === 0) {
            response.participants = dateParser.parseParticipants(userMessage);
          }
          if (!response.title && !response.taskTitle) {
            const extracted = dateParser.extractTitle(userMessage);
            if (intent === "CREATE_TASK") {
              response.taskTitle = extracted;
            } else {
              response.title = extracted;
            }
          }
        }
      }

      return response || {};
    } catch (error) {
      console.error("Parameter extraction error:", error);

      const dateParser = require("../utils/dateParser");

      if (targetParam) {
        const result = {
          title: null,
          date: null,
          time: null,
          participants: [],
          assignee: null,
          taskTitle: null,
          dueDate: null,
        };

        if (targetParam === "date")
          result.date = dateParser.parseDate(userMessage);
        else if (targetParam === "time")
          result.time = dateParser.parseTime(userMessage);
        else if (targetParam === "participants")
          result.participants = dateParser.parseParticipants(userMessage);
        else if (targetParam === "title")
          result.title = dateParser.extractTitle(userMessage);
        else if (targetParam === "taskTitle")
          result.taskTitle = dateParser.extractTitle(userMessage);

        return result;
      }

      return {
        title: dateParser.extractTitle(userMessage),
        date: dateParser.parseDate(userMessage),
        time: dateParser.parseTime(userMessage),
        participants: dateParser.parseParticipants(userMessage),
        assignee: null,
        taskTitle: null,
        dueDate: null,
      };
    }
  }

  /**
   * Get follow-up question for missing parameter
   * ── UNCHANGED ──
   */
  getFollowUpQuestion(intent, param) {
    const questions = {
      SCHEDULE_MEETING: {
        date: "When would you like to schedule the meeting?",
        time: "What time should the meeting start?",
        participants: "Who should I invite to this meeting?",
        title: "What is the meeting about?",
      },
      CREATE_TASK: {
        taskTitle: "What should the task be?",
        assignee: "Who should I assign this task to?",
        dueDate: "When should this task be completed?",
      },
    };

    return questions[intent]?.[param] || `Please provide: ${param}`;
  }

  /**
   * Get action type for intent
   * ── UNCHANGED ──
   */
  getActionForIntent(intent) {
    const actions = {
      SCHEDULE_MEETING: "create",
      CREATE_TASK: "create",
      SEARCH_MEETINGS: "search",
      LIST_TASKS: "query",
    };
    return actions[intent] || "none";
  }

  /**
   * Get completion message
   * ── UNCHANGED ──
   */
  getCompletionMessage(intent, params) {
    if (intent === "SCHEDULE_MEETING") {
      const parts = [];
      if (params.title) parts.push(`about ${params.title}`);
      if (params.date) parts.push(`on ${params.date}`);
      if (params.time) parts.push(`at ${params.time}`);
      if (params.participants && params.participants.length > 0) {
        parts.push(`with ${params.participants.join(", ")}`);
      }
      return `I'll schedule a meeting ${parts.join(" ")}.`;
    }
    if (intent === "CREATE_TASK") {
      const parts = [];
      if (params.taskTitle) parts.push(`"${params.taskTitle}"`);
      if (params.assignee) parts.push(`for ${params.assignee}`);
      if (params.dueDate) parts.push(`due ${params.dueDate}`);
      return `I'll create a task ${parts.join(" ")}.`;
    }
    return "Done!";
  }

  /**
   * Get missing parameters
   * ── UNCHANGED ──
   */
  getMissingParams(intent, collectedParams) {
    const requiredParams = {
      SCHEDULE_MEETING: ["date", "time", "participants", "title"],
      CREATE_TASK: ["taskTitle", "assignee", "dueDate"],
    };

    const needed = requiredParams[intent] || [];
    return needed.filter((param) => {
      const value = collectedParams[param];
      return !value || (Array.isArray(value) && value.length === 0);
    });
  }

  /**
   * Main processing function with multi-turn support
   * ── UNCHANGED ──
   */
  async processUserInput(
    userId,
    userMessage,
    conversationHistory = [],
    userContext = {},
  ) {
    try {
      const currentContext = await contextManager.getCurrentContext(userId);

      if (
        currentContext &&
        currentContext.intent &&
        !currentContext.isComplete
      ) {
        const multiTurnResult = await this.handleMultiTurn(
          userId,
          userMessage,
          conversationHistory,
          currentContext,
          userContext,
        );

        if (multiTurnResult) {
          multiTurnResult.timestamp = new Date().toISOString();
          return {
            success: true,
            data: multiTurnResult,
          };
        }
      }

      const prompt = this.buildPrompt(
        userMessage,
        conversationHistory,
        userContext,
        currentContext,
      );

      const aiResponse = await this.callGemini(prompt);

      if (!aiResponse || typeof aiResponse !== "object") {
        throw new Error("Invalid AI response format");
      }

      const parsedResponse = {
        intent: aiResponse.intent || "GENERAL_HELP",
        confidence: aiResponse.confidence || 0.5,
        action: aiResponse.action || "none",
        params: aiResponse.params || {},
        response: aiResponse.response || "I can help you with that.",
        suggestion: aiResponse.suggestion || null,
        clarification: aiResponse.clarification || null,
        needsMoreInfo: aiResponse.needsMoreInfo || false,
        multiTurn: false,
        isComplete: true,
        step: 1,
        timestamp: new Date().toISOString(),
      };

      if (parsedResponse.needsMoreInfo && parsedResponse.clarification) {
        const missingParams = this.getMissingParams(
          parsedResponse.intent,
          parsedResponse.params,
        );

        await contextManager.updateContext(userId, {
          intent: parsedResponse.intent,
          collectedParams: parsedResponse.params,
          pendingParams: missingParams,
          nextQuestion: parsedResponse.clarification,
          step: 1,
          isComplete: false,
        });

        parsedResponse.multiTurn = true;
        parsedResponse.isComplete = false;
      }

      return {
        success: true,
        data: parsedResponse,
      };
    } catch (error) {
      console.error("AI Processing Error:", error);
      return {
        success: false,
        error: error.message || "Failed to process input",
        data: {
          intent: "ERROR",
          response: "Sorry, I encountered an error processing your request.",
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * ✅ FIXED: Handle multi-turn conversation continuation
   * ── UNCHANGED ──
   */
  async handleMultiTurn(
    userId,
    userMessage,
    conversationHistory,
    currentContext,
    userContext,
  ) {
    try {
      if (!currentContext || !currentContext.intent) {
        return null;
      }

      const intent = currentContext.intent;
      const collectedParams = { ...(currentContext.collectedParams || {}) };
      const pendingParams = [...(currentContext.pendingParams || [])];

      const extractedParams = await this.extractParameters(
        userMessage,
        intent,
        currentContext,
      );
      // Smart merge - only overwrite non-null new values
      for (const key in extractedParams) {
        const newValue = extractedParams[key];

        if (newValue === null || newValue === undefined || newValue === "") {
          continue;
        }

        if (Array.isArray(newValue)) {
          if (!collectedParams[key]) {
            collectedParams[key] = [];
          }
          if (newValue.length > 0) {
            collectedParams[key] = [
              ...new Set([...collectedParams[key], ...newValue]),
            ];
          }
        } else {
          collectedParams[key] = newValue;
        }
      }

      const stillMissing = this.getMissingParams(intent, collectedParams);
      if (stillMissing.length > 0) {
        const nextParam = stillMissing[0];
        const question = this.getFollowUpQuestion(intent, nextParam);

        await contextManager.updateContext(userId, {
          ...currentContext,
          collectedParams,
          pendingParams: stillMissing,
          step: currentContext.step + 1,
          nextQuestion: question,
          isComplete: false,
        });

        return {
          intent,
          action: this.getActionForIntent(intent),
          params: collectedParams,
          response: "Got it.",
          needsMoreInfo: true,
          clarification: question,
          multiTurn: true,
          isComplete: false,
          step: currentContext.step + 1,
          collectedParams,
          pendingParams: stillMissing,
        };
      }

      await contextManager.clearContext(userId);

      return {
        intent,
        action: this.getActionForIntent(intent),
        params: collectedParams,
        response: `Got it! ${this.getCompletionMessage(intent, collectedParams)}`,
        needsMoreInfo: false,
        multiTurn: true,
        isComplete: true,
      };
    } catch (error) {
      console.error("Multi-turn error:", error);
      await contextManager.clearContext(userId);
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      });
      return {
        available: true,
        models: [MODEL],
        hasRequiredModel: true,
      };
    } catch (error) {
      return {
        available: false,
        models: [],
        hasRequiredModel: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse natural language search query
   * ── UNCHANGED ──
   */
  async parseNaturalLanguageSearch(query) {
    try {
      const currentDate = new Date().toISOString().split("T")[0];

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

Return ONLY valid JSON:
{
  "keywords": ["array"],
  "participants": ["array"],
  "dateRange": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "topics": ["array"]
}`;

      const response = await this.callGemini(prompt);

      const dateParser = require("../utils/dateParser");

      if (!response.dateRange && query.match(/last\s+(week|month|year)/i)) {
        const match = query.match(/last\s+(week|month|year)/i);
        const period = match[1];

        const to = new Date();
        const from = new Date();

        if (period === "week") {
          from.setDate(from.getDate() - 7);
        } else if (period === "month") {
          from.setDate(from.getDate() - 30);
        } else if (period === "year") {
          from.setDate(from.getDate() - 365);
        }

        response.dateRange = {
          from: from.toISOString().split("T")[0],
          to: to.toISOString().split("T")[0],
        };
      }

      return {
        success: true,
        ...response,
      };
    } catch (error) {
      console.error("Search parsing error:", error);

      const keywords = query.split(" ").filter((w) => w.length > 3);

      return {
        success: true,
        keywords,
        participants: [],
        dateRange: null,
        topics: keywords,
      };
    }
  }

  /**
   * Generate meeting summary from transcript
   * ── UNCHANGED ──
   */
  async generateMeetingSummary(meetingId) {
    try {
      const Transcript = require("../models/Transcript");
      const Meeting = require("../models/Meeting");

      const meeting = await Meeting.findOne({ meetingId }).lean();
      const transcripts = await Transcript.find({ meetingId }).lean();

      if (!meeting || transcripts.length === 0) {
        return {
          success: false,
          error: "Meeting or transcript not found",
        };
      }

      let fullText = "";
      transcripts.forEach((transcript) => {
        transcript.segments.forEach((seg) => {
          fullText += `${seg.text} `;
        });
      });

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

      const response = await this.callGemini(prompt);

      return {
        success: true,
        summary: {
          text: response.text || "Meeting summary generated",
          topics: response.topics || [],
          keyPoints: response.keyPoints || [],
          sentiment: response.sentiment || "neutral",
          generatedAt: new Date(),
        },
      };
    } catch (error) {
      console.error("Summary generation error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse bulk task command
   * ── UNCHANGED ──
   */
  async parseBulkTaskCommand(command) {
    try {
      const currentDate = new Date().toISOString().split("T")[0];

      const prompt = `Parse this bulk task operation command.

Current date: ${currentDate}

Command: "${command}"

Extract:
- operation: "assign" or "complete"
- assignee: Name of person (if assigning)
- meetingTitle: Meeting name mentioned (if any)
- meetingDate: Date mentioned (YYYY-MM-DD format)
- status: "pending" | "in-progress" | "completed"

Return ONLY valid JSON:
{
  "operation": "assign|complete",
  "assignee": "name or null",
  "meetingTitle": "title or null",
  "meetingDate": "YYYY-MM-DD or null",
  "status": "pending|in-progress|completed or null"
}`;

      const response = await this.callGemini(prompt);

      return {
        success: true,
        ...response,
      };
    } catch (error) {
      console.error("Bulk command parsing error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new AIService();
