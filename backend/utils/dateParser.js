// backend/utils/dateParser.js - FIXED VERSION
const { addDays, addWeeks, addMonths, format, parse, isValid } = require('date-fns');

class DateParser {
  /**
   * Check if text is primarily a date/time expression
   */
  isDateTimeExpression(text) {
    if (!text) return false;
    
    const normalized = text.toLowerCase().trim();
    
    // Common date/time indicators
    const dateTimePatterns = [
      /\b(today|tomorrow|yesterday)\b/,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
      /\b(next|this|last)\s+(week|month|year)\b/,
      /\b(in\s+\d+\s+(day|days|week|weeks|month|months))\b/,
      /\d{1,2}:\d{2}/,  // Time format
      /\d{1,2}\s*(am|pm|a\.m\.|p\.m\.)/i,  // 12-hour time
      /\bat\s+\d{1,2}/,  // "at 3"
      /\d{1,2}\/\d{1,2}/,  // Date format
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/
    ];
    
    return dateTimePatterns.some(pattern => pattern.test(normalized));
  }

  /**
   * Parse natural language date to ISO string
   */
  parseDate(text) {
    if (!text) return null;

    const normalized = text.toLowerCase().trim();
    const now = new Date();

    // Today/Tomorrow/Yesterday
    if (normalized.includes('today')) return format(now, 'yyyy-MM-dd');
    if (normalized.includes('tomorrow')) return format(addDays(now, 1), 'yyyy-MM-dd');
    if (normalized.includes('yesterday')) return format(addDays(now, -1), 'yyyy-MM-dd');

    // This/Next Week
    if (normalized.includes('this week')) return format(now, 'yyyy-MM-dd');
    if (normalized.includes('next week')) return format(addWeeks(now, 1), 'yyyy-MM-dd');

    // Day of week (next Monday, Friday, etc.)
    const dayMatch = normalized.match(/(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (dayMatch) {
      const targetDay = dayMatch[1].toLowerCase();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayIndex = days.indexOf(targetDay);
      const currentDayIndex = now.getDay();
      let daysToAdd = targetDayIndex - currentDayIndex;
      if (daysToAdd <= 0) daysToAdd += 7;
      return format(addDays(now, daysToAdd), 'yyyy-MM-dd');
    }

    // In X days/weeks/months
    const inMatch = normalized.match(/in\s+(\d+)\s+(day|days|week|weeks|month|months)/i);
    if (inMatch) {
      const amount = parseInt(inMatch[1]);
      const unit = inMatch[2].toLowerCase();
      if (unit.startsWith('day')) return format(addDays(now, amount), 'yyyy-MM-dd');
      if (unit.startsWith('week')) return format(addWeeks(now, amount), 'yyyy-MM-dd');
      if (unit.startsWith('month')) return format(addMonths(now, amount), 'yyyy-MM-dd');
    }

    // Specific date formats
    const dateFormats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'dd/MM/yyyy',
      'MMMM dd, yyyy',
      'MMM dd',
      'MMMM dd'
    ];

    for (const dateFormat of dateFormats) {
      try {
        const parsed = parse(text, dateFormat, now);
        if (isValid(parsed)) {
          return format(parsed, 'yyyy-MM-dd');
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  /**
   * Parse natural language time to HH:MM format
   */
  parseTime(text) {
    if (!text) return null;

    const normalized = text.toLowerCase().trim();

    // 24-hour format (15:00, 09:30)
    const time24Match = normalized.match(/(\d{1,2}):(\d{2})/);
    if (time24Match) {
      const hours = parseInt(time24Match[1]);
      const minutes = parseInt(time24Match[2]);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }

    // 12-hour format with am/pm (3pm, 3:30pm, 3 p.m.)
    const time12Match = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)/i);
    if (time12Match) {
      let hours = parseInt(time12Match[1]);
      const minutes = time12Match[2] ? parseInt(time12Match[2]) : 0;
      const meridiem = time12Match[3].toLowerCase();

      if (meridiem.startsWith('p') && hours !== 12) hours += 12;
      if (meridiem.startsWith('a') && hours === 12) hours = 0;

      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }

    // Just number (assume PM for business hours)
    const numberMatch = normalized.match(/\bat\s+(\d{1,2})\b/);
    if (numberMatch) {
      let hours = parseInt(numberMatch[1]);
      if (hours >= 1 && hours <= 12) {
        // Assume PM for single digit business hours
        if (hours < 8) hours += 12; // 1-7 becomes 13-19
        return `${String(hours).padStart(2, '0')}:00`;
      }
    }

    return null;
  }

  /**
   * Parse participants/names from text
   * FIXED: Don't extract from date/time expressions
   */
  parseParticipants(text) {
    if (!text) return [];
    
    // Don't parse participants from date/time expressions
    if (this.isDateTimeExpression(text)) {
      return [];
    }

    const normalized = text.toLowerCase().trim();
    const participants = [];

    // Remove common words
    const cleaned = normalized
      .replace(/\b(with|and|to|for|invite)\b/g, ',')
      .replace(/\s+/g, ' ')
      .trim();

    // Split by commas or "and"
    const parts = cleaned.split(/,|and/).map(p => p.trim()).filter(p => p.length > 0);

    for (const part of parts) {
      // Skip if it's too short or looks like noise
      if (part.length < 2) continue;
      
      // Capitalize first letter of each word
      const name = part.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Filter out common words and date/time terms
      const excludeWords = [
        'With', 'And', 'To', 'For', 'Invite', 'The', 
        'Tomorrow', 'Today', 'Yesterday', 'At', 'On', 'In'
      ];
      
      if (!excludeWords.includes(name)) {
        participants.push(name);
      }
    }

    return participants;
  }

  /**
   * Extract topic/title from text
   * FIXED: Don't extract from date/time expressions
   */
  extractTitle(text) {
    if (!text) return null;
    
    // Don't extract title from date/time expressions
    if (this.isDateTimeExpression(text)) {
      return null;
    }

    const normalized = text.toLowerCase().trim();

    // Remove common phrases
    const cleaned = normalized
      .replace(/\b(about|regarding|for|on|the topic of|to discuss|discuss)\b/gi, '')
      .trim();

    if (cleaned.length < 3) return null;

    // Capitalize first letter
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
}

module.exports = new DateParser();