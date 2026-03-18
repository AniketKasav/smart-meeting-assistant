// backend/services/summaryService.js - With Automatic Sentiment Analysis
const OLLAMA_URL = 'http://localhost:11434';

console.log('✅ Using Ollama for AI summaries (no API key needed)');

/**
 * Generate meeting summary using Ollama (Local AI)
 * @param {String} transcriptText - Full transcript text
 * @param {Array} participants - List of participant names
 * @returns {Object} - Structured summary with action items, key points, etc.
 */
async function generateSummary(transcriptText, participants = []) {
  try {
    console.log('🤖 Starting AI summary generation with Ollama...');
    
    const prompt = `Analyze this meeting transcript and provide a comprehensive summary in JSON format.

TRANSCRIPT:
${transcriptText}

PARTICIPANTS: ${participants.join(', ') || 'Unknown'}

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
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📄 Raw AI response received');
    
    const text = data.response;

    let summaryData;
    try {
      const cleanText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
      
      summaryData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.log('Raw response:', text);
      
      summaryData = {
        executiveSummary: 'Failed to generate summary. The AI response was not in the correct format.',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        topics: [],
        sentiment: 'neutral',
        nextSteps: [],
        error: 'JSON parse error',
        rawResponse: text
      };
    }

    summaryData.generatedAt = new Date();
    summaryData.model = 'llama3.2';
    summaryData.provider = 'ollama';

    console.log('✅ Summary generated successfully');
    console.log(`📊 Stats: ${summaryData.keyPoints?.length || 0} key points, ${summaryData.actionItems?.length || 0} action items`);
    
    return summaryData;

  } catch (error) {
    console.error('❌ Error generating summary:', error);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      throw new Error('Ollama is not running. Please start Ollama by running "ollama serve" in your terminal.');
    }
    
    throw new Error(`Summary generation failed: ${error.message}`);
  }
}

/**
 * Regenerate summary with custom instructions
 */
async function regenerateSummary(transcriptText, participants, customPrompt) {
  try {
    console.log('🔄 Regenerating summary with custom prompt...');
    
    const prompt = `${customPrompt}

TRANSCRIPT:
${transcriptText}

PARTICIPANTS: ${participants.join(', ') || 'Unknown'}

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
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response;

    // Better JSON extraction and cleaning
    let cleanText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Try to extract JSON object if it's wrapped in other text
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }

    // Additional cleanup for common issues
    cleanText = cleanText
      .replace(/,\s*}/g, '}') // Remove trailing commas before }
      .replace(/,\s*]/g, ']') // Remove trailing commas before ]
      .replace(/(\r\n|\n|\r)/g, ' '); // Remove newlines that might break JSON

    let summaryData;
    try {
      summaryData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error in regenerateSummary. Raw text:', text);
      console.error('❌ Cleaned text:', cleanText);
      
      // Fallback to default structure
      summaryData = {
        executiveSummary: 'Failed to regenerate summary. Please try again.',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        topics: [],
        sentiment: 'neutral',
        nextSteps: [],
        error: 'JSON parse error',
        rawResponse: text
      };
    }

    summaryData.generatedAt = new Date();
    summaryData.model = 'llama3.2';
    summaryData.provider = 'ollama';
    summaryData.customPrompt = customPrompt;

    console.log('✅ Summary regenerated successfully');
    
    return summaryData;

  } catch (error) {
    console.error('❌ Error regenerating summary:', error);
    throw error;
  }
}

/**
 * NEW: Analyze sentiment only (fast, automatic)
 * This runs automatically after transcription without user action
 */
async function analyzeSentimentOnly(transcriptText) {
  try {
    console.log('🎭 Analyzing sentiment automatically...');
    
    const prompt = `Analyze the sentiment of this meeting transcript. Consider the tone, language, and overall mood.

TRANSCRIPT:
${transcriptText}

Respond with ONLY a JSON object in this exact format (no markdown, no explanations):
{
  "sentiment": "positive|neutral|negative",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}

Rules:
- "positive": upbeat, productive, collaborative, optimistic tone
- "neutral": factual, informational, balanced discussion
- "negative": tense, frustrated, critical, pessimistic tone

Respond with ONLY the JSON object.`;

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
          temperature: 0.3, // Lower temperature for more consistent sentiment analysis
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response;

    let sentimentData;
    try {
      const cleanText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
      
      sentimentData = JSON.parse(cleanText);
    } catch (parseError) {
      console.warn('⚠️ Failed to parse sentiment response, defaulting to neutral');
      sentimentData = {
        sentiment: 'neutral',
        confidence: 0.5,
        reason: 'Parse error'
      };
    }

    console.log(`✅ Sentiment analyzed: ${sentimentData.sentiment} (confidence: ${sentimentData.confidence})`);
    
    return {
      sentiment: sentimentData.sentiment || 'neutral',
      confidence: sentimentData.confidence || 0.5,
      reason: sentimentData.reason || 'Auto-analyzed',
      analyzedAt: new Date(),
      model: 'llama3.2'
    };

  } catch (error) {
    console.error('❌ Error analyzing sentiment:', error);
    
    // Fallback to neutral on error
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      reason: 'Error during analysis',
      analyzedAt: new Date(),
      model: 'llama3.2',
      error: error.message
    };
  }
}

/**
 * Check if Ollama is running
 */
async function checkOllamaStatus() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama is running');
      console.log('📦 Available models:', data.models?.map(m => m.name).join(', '));
      return true;
    }
    return false;
  } catch (error) {
    console.log('❌ Ollama is not running. Start it with: ollama serve');
    return false;
  }
}

// Check Ollama status on startup
checkOllamaStatus();

module.exports = {
  generateSummary,
  regenerateSummary,
  analyzeSentimentOnly,  // NEW: Export the new function
  checkOllamaStatus
};