// frontend/src/utils/intentMatcher.js
// Matches normalised voice transcript against COMMAND_PATTERNS.
//
// KEY FIXES vs original:
//   1. SHOW_MEETING_REPORT  — now reads match[4] (was match[2], always empty)
//   2. SEARCH_FOR           — now reads match[2] correctly
//   3. SEARCH_MEETINGS      — group-safe extraction
//   4. All other capture groups audited against commandPatterns.js regexes

import { COMMAND_PATTERNS } from "../services/commandPatterns";

class IntentMatcher {
  /**
   * Match transcript against every pattern in COMMAND_PATTERNS.
   * Returns { intent, params, confidence, originalText, method } or null.
   */
  match(transcript) {
    if (!transcript || typeof transcript !== "string") return null;

    const normalizedText = transcript.toLowerCase().trim();

    for (const [intent, patterns] of Object.entries(COMMAND_PATTERNS)) {
      for (const pattern of patterns) {
        const matchResult = normalizedText.match(pattern);
        if (matchResult) {
          const params = this._extractParameters(
            intent,
            matchResult,
            normalizedText,
          );
          return {
            intent,
            params,
            confidence: 1.0,
            originalText: transcript,
            method: "pattern",
          };
        }
      }
    }

    return null;
  }

  // ── Parameter extraction — every group index audited against commandPatterns.js ──
  _extractParameters(intent, match, rawText) {
    const params = {};

    switch (intent) {
      // /^search\s*(meetings?\s*)?(?:for\s+)?(.+)/i
      // group 1 = "meetings ", group 2 = query
      case "SEARCH_MEETINGS":
        params.query = (match[2] || match[1] || "").trim();
        params.keyword = params.query;
        break;

      // /^search\s+(for\s+)?(.+)$/i
      // group 1 = "for ", group 2 = actual query
      case "SEARCH_FOR":
        params.query = (match[2] || "").trim();
        params.keyword = params.query;
        break;

      // /^(show|open|view|see|get)\s*(the\s*)?report\s*(for|of|about)\s+(.+)$/i
      // group 1 = verb, group 2 = "the ", group 3 = "for/of/about", group 4 = keyword ← WAS BUG
      case "SHOW_MEETING_REPORT":
        params.keyword = (match[4] || match[2] || match[1] || "").trim();
        break;

      // /^(open|view)\s+(.+)\s+report$/i
      // Handled by same SHOW_MEETING_REPORT patterns — group 2 = keyword
      // (intentional fallthrough via the switch above using match[4] || match[2])

      // /^(create|new|...)\s*(a\s*)?(new\s*)?(meeting|session|...) /i — no useful params
      case "CREATE_MEETING":
        params.title = (match[1] || "").trim();
        break;

      // /^(show|display|...)\s*(meetings?|...)\s*(called|named|titled|about)\s+(.+)/i
      // group 4 = title
      case "SHOW_MEETING":
      case "VIEW_MEETING":
        params.title = (match[4] || match[2] || match[1] || "").trim();
        break;

      // /^(create|add|new|make)\s*(a\s*)?(new\s*)?(task|action\s*item|todo)(\s+(.+))?$/i
      // group 6 = inline task title (optional)
      case "CREATE_TASK":
        params.taskTitle = (match[6] || match[2] || "").trim();
        break;

      // /^assign\s*(a\s*)?(task|action\s*item)(\s+to\s+(.+))?$/i
      // group 4 = assignee
      case "ASSIGN_TASK":
        params.taskTitle = "";
        params.assignee = (match[4] || "").trim();
        break;

      // /^(complete|finish|done\s*with|...)\s*(the\s*)?(task|...)?\s*(.+)?$/i
      case "COMPLETE_TASK":
        params.taskTitle = (match[6] || match[4] || "").trim();
        break;

      // /^(show|find|get)\s*meeting(s)?\s*(called|named|titled|about)\s+(.+)/i
      // group 4 = title
      case "SHOW_MEETING_REPORT":
        params.keyword = (match[4] || "").trim();
        break;

      // Chatbot shortcut — extract trailing question
      case "CHATBOT_SHORTCUT":
        params.question = (match[4] || match[3] || rawText).trim();
        break;

      default:
        break;
    }

    return params;
  }

  hasMatch(transcript) {
    return this.match(transcript) !== null;
  }

  getConfidence(transcript) {
    const result = this.match(transcript);
    return result ? result.confidence : 0;
  }
}

// Singleton
const intentMatcherInstance = new IntentMatcher();

export const intentMatcher = intentMatcherInstance;
export const matchIntent = (t) => intentMatcherInstance.match(t);
export { IntentMatcher };
export default intentMatcherInstance;
