// frontend/src/utils/intentMatcher.js - FIXED WITH CORRECT EXPORTS
import { COMMAND_PATTERNS } from '../services/commandPatterns';

/**
 * Intent Matcher Class
 * Matches user input against predefined command patterns
 */
class IntentMatcher {
  /**
   * Match user input against command patterns
   */
  match(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return null;
    }

    const normalizedText = transcript.toLowerCase().trim();

    // Try to match against all command patterns
    for (const [intent, patterns] of Object.entries(COMMAND_PATTERNS)) {
      for (const pattern of patterns) {
        const match = normalizedText.match(pattern);
        
        if (match) {
          // Extract parameters based on intent
          const params = this.extractParameters(intent, match);
          
          return {
            intent,
            params,
            confidence: 1.0,
            originalText: transcript,
            method: 'pattern'
          };
        }
      }
    }

    // No match found
    return null;
  }

  /**
   * Extract parameters from regex matches
   */
  extractParameters(intent, match) {
    const params = {};

    switch (intent) {
      case 'SEARCH_MEETINGS':
      case 'FIND_MEETINGS':
      case 'SEARCH':
        params.keyword = match[2] || match[1] || '';
        params.query = params.keyword;
        break;

      case 'SHOW_MEETING':
      case 'VIEW_MEETING':
        params.title = match[2] || match[1] || '';
        break;

      case 'SHOW_QUARTER_PERFORMANCE':
        const quarter = match[2] || match[1];
        // Convert word numbers to digits
        const quarterMap = { 
          'one': '1', 'two': '2', 'three': '3', 'four': '4',
          '1': '1', '2': '2', '3': '3', '4': '4',
          'q1': '1', 'q2': '2', 'q3': '3', 'q4': '4'
        };
        params.quarter = quarterMap[quarter?.toLowerCase()] || quarter;
        break;

      case 'SHOW_USER_PERFORMANCE':
        params.user = match[2] || match[1] || '';
        break;

      case 'ASSIGN_TASK':
        if (match[2]) {
          params.taskTitle = match[1];
          params.assignee = match[2];
        } else {
          params.assignee = match[1];
        }
        break;

      case 'CREATE_TASK':
        params.taskTitle = match[2] || match[1] || '';
        break;

      case 'COMPLETE_TASK':
      case 'DELETE_TASK':
        params.taskTitle = match[2] || match[1] || '';
        break;

      case 'SCHEDULE_MEETING':
      case 'CREATE_MEETING':
        // Will be handled by AI for complex scheduling
        params.title = match[1] || '';
        break;

      default:
        // No specific parameters to extract
        break;
    }

    return params;
  }

  /**
   * Check if text matches any pattern (quick check)
   */
  hasMatch(transcript) {
    return this.match(transcript) !== null;
  }

  /**
   * Get confidence score for a match
   */
  getConfidence(transcript) {
    const match = this.match(transcript);
    return match ? match.confidence : 0;
  }
}

// Create singleton instance
const intentMatcherInstance = new IntentMatcher();

// Export as named export 'intentMatcher' (matches VoiceCommandContext import)
export const intentMatcher = intentMatcherInstance;

// Also export 'matchIntent' for backwards compatibility
export const matchIntent = (transcript) => intentMatcherInstance.match(transcript);

// Export as default
export default intentMatcherInstance;

// Also export the class if needed
export { IntentMatcher };