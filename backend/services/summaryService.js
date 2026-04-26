// backend/services/summaryService.js - Groq (replaces Gemini)
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-8b-instant";

console.log("✅ Using Groq for AI summaries");

// ── Filter garbage text from failed Vosk/browser recognition ─────────────────
function cleanTranscriptText(transcriptText) {
  const garbagePattern = /[ğχ÷ùÙâÞğ=\"#Verfüg]/;

  const cleaned = transcriptText
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length < 4) return false;
      if (garbagePattern.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .trim();

  if (!cleaned) {
    console.warn(
      "⚠️ All transcript lines were garbage — nothing clean to summarize",
    );
  } else {
    console.log(
      `✅ Clean transcript: ${cleaned.length} chars (original: ${transcriptText.length})`,
    );
  }

  return cleaned;
}

// ── Shared helper: call Groq and parse JSON response ───────────────────────
async function callGemini(prompt) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const text = completion.choices[0]?.message?.content || "";

  // Strip markdown fences if present
  const clean = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Extract first {...} block
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in Groq response");

  return JSON.parse(match[0]);
}

// ── generateSummary ───────────────────────────────────────────────────────────
async function generateSummary(transcriptText, participants = []) {
  try {
    console.log("🤖 Starting AI summary generation with Groq...");

    const cleanedText = cleanTranscriptText(transcriptText);

    if (!cleanedText) {
      console.warn("⚠️ No clean transcript text — returning empty summary");
      return {
        executiveSummary:
          "Transcript could not be processed. The audio may have been in an unsupported language or the recording quality was too low.",
        keyPoints: [],
        decisions: [],
        actionItems: [],
        topics: [],
        sentiment: "neutral",
        nextSteps: [],
        generatedAt: new Date(),
        model: MODEL,
        provider: "groq",
        skipped: true,
      };
    }

    const truncatedText = cleanedText.slice(0, 6000);

    const prompt = `Analyze this meeting transcript and provide a comprehensive summary in JSON format.

TRANSCRIPT:
${truncatedText}

PARTICIPANTS: ${participants.join(", ") || "Unknown"}

Please respond with ONLY a valid JSON object (no markdown, no explanations) with this exact structure:
{
  "executiveSummary": "2-3 sentence overview of the meeting",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "decisions": ["decision 1", "decision 2"],
  "actionItems": [
    {
      "title": "Task title",
      "description": "Task description",
      "assignee": "Person's name or 'Unassigned'",
      "priority": "high|medium|low",
      "dueDate": null
    }
  ],
  "topics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive|neutral|negative",
  "nextSteps": ["step 1", "step 2"]
}

Important:
- Keep executiveSummary under 100 words
- Extract 3-7 key discussion points
- Identify concrete decisions made
- List actionable tasks with clear owners
- Tag 3-8 main topics discussed
- Assess overall meeting sentiment
- Suggest logical next steps

Respond with ONLY the JSON object, no other text.`;

    const summaryData = await callGemini(prompt);

    summaryData.generatedAt = new Date();
    summaryData.model = MODEL;
    summaryData.provider = "groq";

    console.log("✅ Summary generated successfully");
    console.log(
      `📊 Stats: ${summaryData.keyPoints?.length || 0} key points, ${summaryData.actionItems?.length || 0} action items`,
    );

    return summaryData;
  } catch (error) {
    console.error("❌ Error generating summary:", error);

    return {
      executiveSummary: "Summary generation failed. Please try again.",
      keyPoints: [],
      decisions: [],
      actionItems: [],
      topics: [],
      sentiment: "neutral",
      nextSteps: [],
      generatedAt: new Date(),
      model: MODEL,
      provider: "groq",
      error: error.message,
    };
  }
}

// ── regenerateSummary ─────────────────────────────────────────────────────────
async function regenerateSummary(transcriptText, participants, customPrompt) {
  try {
    console.log("🔄 Regenerating summary with custom prompt...");

    const cleanedText = cleanTranscriptText(transcriptText);
    const truncatedText = (cleanedText || transcriptText).slice(0, 6000);

    const prompt = `${customPrompt}

TRANSCRIPT:
${truncatedText}

PARTICIPANTS: ${participants.join(", ") || "Unknown"}

Respond with a JSON object following this structure:
{
  "executiveSummary": "summary text",
  "keyPoints": ["point 1", "point 2"],
  "decisions": ["decision 1"],
  "actionItems": [{"title": "task", "description": "desc", "assignee": "name", "priority": "medium", "dueDate": null}],
  "topics": ["topic1", "topic2"],
  "sentiment": "neutral",
  "nextSteps": ["step 1"]
}

Respond with ONLY the JSON object.`;

    const summaryData = await callGemini(prompt);

    summaryData.generatedAt = new Date();
    summaryData.model = MODEL;
    summaryData.provider = "groq";
    summaryData.customPrompt = customPrompt;

    console.log("✅ Summary regenerated successfully");

    return summaryData;
  } catch (error) {
    console.error("❌ Error regenerating summary:", error);
    throw error;
  }
}

// ── analyzeSentimentOnly ──────────────────────────────────────────────────────
async function analyzeSentimentOnly(transcriptText) {
  try {
    console.log("🎭 Analyzing sentiment automatically...");

    const cleanedText = cleanTranscriptText(transcriptText);
    const truncatedText = (cleanedText || transcriptText).slice(0, 3000);

    const prompt = `Analyze the sentiment of this meeting transcript. Consider the tone, language, and overall mood.

TRANSCRIPT:
${truncatedText}

Respond with ONLY a JSON object in this exact format (no markdown, no explanations):
{
  "sentiment": "positive|neutral|negative",
  "confidence": 0.0,
  "reason": "brief explanation"
}

Rules:
- "positive": upbeat, productive, collaborative, optimistic tone
- "neutral": factual, informational, balanced discussion
- "negative": tense, frustrated, critical, pessimistic tone

Respond with ONLY the JSON object.`;

    const sentimentData = await callGemini(prompt);

    console.log(
      `✅ Sentiment analyzed: ${sentimentData.sentiment} (confidence: ${sentimentData.confidence})`,
    );

    return {
      sentiment: sentimentData.sentiment || "neutral",
      confidence: sentimentData.confidence || 0.5,
      reason: sentimentData.reason || "Auto-analyzed",
      analyzedAt: new Date(),
      model: MODEL,
    };
  } catch (error) {
    console.error("❌ Error analyzing sentiment:", error);
    return {
      sentiment: "neutral",
      confidence: 0.5,
      reason: "Error during analysis",
      analyzedAt: new Date(),
      model: MODEL,
      error: error.message,
    };
  }
}

// ── checkGroqStatus ───────────────────────────────────────────────────────────
async function checkGeminiStatus() {
  try {
    await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
    });
    console.log("✅ Groq is reachable");
    return true;
  } catch (error) {
    console.log("❌ Groq unreachable:", error.message);
    return false;
  }
}

checkGeminiStatus();

module.exports = {
  generateSummary,
  regenerateSummary,
  analyzeSentimentOnly,
  // keep old export name so nothing in server.js breaks
  checkOllamaStatus: checkGeminiStatus,
};
