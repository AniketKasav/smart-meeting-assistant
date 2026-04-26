// frontend/src/services/commandPatterns.js — FRIDAY VOICE ASSISTANT
// Complete command pattern library — every navigable route and sub-section.
//
// STRUCTURE:
//   Every key is an INTENT that actionExecutor.js switches on.
//   Patterns are tried in order; first match wins.
//   "friday [command]" prefix is stripped in VoiceCommandContext before matching.

export const COMMAND_PATTERNS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  SHOW_DASHBOARD: [
    /^(show|open|go to|take me to|navigate to|display|load|launch|bring up|view|see)\s*(the\s*)?(main\s*)?(dashboard|home(\s*page)?)/i,
    /^(dashboard|home)$/i,
    /^(go\s*home|back\s*to\s*(home|dashboard)|main\s*page)$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // MEETINGS — list & top-level
  // ═══════════════════════════════════════════════════════════════════════════
  SHOW_MEETINGS: [
    /^(show|open|go to|take me to|navigate to|display|view|see|list|browse)\s*(all\s*)?(my\s*)?(meetings?|meeting\s*(list|page|section|history))/i,
    /^meetings?(\s*(page|list|section))?$/i,
    /^(view|see|check)\s*(all\s*)?meetings?$/i,
    /^open\s+the\s+meetings?$/i,
    /^open\s+meetings?$/i,
    /^show\s+all\s+meetings?$/i,
  ],

  // ── Specific meetings ──────────────────────────────────────────────────────
  SHOW_LATEST_MEETING: [
    /^(show|open|display|view|take\s*me\s*to|go\s*to)\s*(the\s*)?(latest|recent|last|most\s*recent|newest)\s*(meeting|session)/i,
    /^(latest|recent|last|most\s*recent|newest)\s*(meeting|session)$/i,
    /^(show\s*me|open)\s*(the\s*)?(last|latest|most\s*recent)\s*meeting$/i,
    /^open\s+latest\s+meeting$/i,
    /^what\s+was\s+the\s+last\s+meeting$/i,
  ],

  SHOW_TODAY_MEETINGS: [
    /^(any|show|what|do\s*i\s*have|are\s*there|list)\s*(meetings?|sessions?|calls?)\s*(today|for\s*today)/i,
    /^today.?s?\s*(meetings?|sessions?|schedule)$/i,
    /^meetings?\s*today$/i,
    /^(what('s|is)\s*on\s*my\s*(schedule|calendar|agenda)\s*today)$/i,
    /^(schedule|agenda)\s*(for\s*today|today)$/i,
  ],

  SHOW_UPCOMING_MEETINGS: [
    /^(show|what|any|list)\s*(upcoming|next|scheduled|future)\s*(meetings?|sessions?)/i,
    /^upcoming\s*meetings?$/i,
    /^what\s*(meetings?|sessions?)\s*(do\s*i\s*have|are\s*coming|are\s*scheduled)/i,
    /^next\s*meeting$/i,
    /^(my\s*)?schedule$/i,
  ],

  CREATE_MEETING: [
    /^(create|new|start|schedule|set\s*up|book|plan|organize|make|add)\s*(a\s*)?(new\s*)?(meeting|session|call|conference|huddle)$/i,
    /^(i\s*want\s*to|let's|can\s*you)\s*(create|schedule|book|set\s*up)\s*(a\s*)?(meeting|session|call)$/i,
    /^(new\s*meeting|start\s*a?\s*meeting|plan\s*(a\s*)?meeting|book\s*(a\s*)?meeting)$/i,
    /^create\s+new\s+meeting$/i,
  ],

  JOIN_MEETING: [
    /^(join|enter|start|go\s*to|open)\s*(the\s*)?(latest|current|live|active|ongoing|my|a)\s*(meeting|session|room)/i,
    /^(join|enter)\s*(meeting|room|session)$/i,
    /^(go\s*live|start\s*meeting|live\s*meeting)$/i,
    /^take\s*me\s*to\s*(the\s*)?(live\s*)?meeting$/i,
    /^open\s*meeting\s*room$/i,
    /^go\s*to\s*meeting\s*room$/i,
  ],

  SEARCH_MEETINGS: [
    /^search\s*(meetings?\s*)?(?:for\s+)?(.+)/i,
    /^find\s*(a\s*meeting\s*|meeting\s*)?(?:about\s+|for\s+|called\s+|named\s+)?(.+)/i,
    /^look\s*up\s*(meeting\s*)?(.+)/i,
    /^(show|find|get)\s*meeting(s)?\s*(called|named|titled|about)\s+(.+)/i,
  ],

  // ── Meeting detail sub-sections ────────────────────────────────────────────
  SHOW_MEETING_TRANSCRIPT: [
    /^(show|open|view|see|get|display)\s*(the\s*)?(latest\s*|last\s*|recent\s*)?(meeting\s*)?transcript/i,
    /^(transcript|meeting\s*transcript)$/i,
    /^(open|show)\s*transcript\s*(of\s*(the\s*)?(last|latest|recent)\s*meeting)?$/i,
  ],

  SHOW_MEETING_SUMMARY: [
    /^(show|open|view|see|get|display)\s*(the\s*)?(latest\s*|last\s*|recent\s*)?(meeting\s*)?summary/i,
    /^(summary|meeting\s*summary)$/i,
    /^(summarize|give\s*me\s*a\s*summary\s*of|sum\s*up)\s*(the\s*)?(meeting|last\s*meeting|latest\s*meeting)/i,
    /^what\s*(was\s*discussed|happened)\s*(in\s*(the\s*)?(last|latest|recent)\s*meeting)?$/i,
    /^meeting\s*notes$/i,
  ],

  SHOW_MEETING_ACTION_ITEMS: [
    /^(show|open|view|see|get)\s*(the\s*)?(meeting('s)?\s*)?(action\s*items?|tasks?|todos?)/i,
    /^action\s*items?\s*(from|in|of)\s*(the\s*)?(last|latest|recent|this)\s*meeting$/i,
    /^(what\s*(are|were)\s*)?(the\s*)?(action\s*items?|tasks?|todos?)\s*(from|in|of)?\s*(the\s*)?(last|latest|recent)?\s*meeting$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE — top level + all sub-views
  // ═══════════════════════════════════════════════════════════════════════════
  SHOW_PERFORMANCE: [
    /^(show|open|go to|navigate to|take me to|display|view|see|check|load|launch)\s*(the\s*)?(overall\s*)?(performance|analytics|stats|statistics|metrics|insights?)(\s*(page|section|dashboard|panel|tab))?$/i,
    /^(performance|analytics|stats|statistics|metrics|insights?)(\s*(page|dashboard|section))?$/i,
    /^(how\s*am\s*i\s*doing|my\s*(performance|stats|analytics|metrics))$/i,
    /^(show|view)\s*(my\s*)?performance$/i,
    /^open\s+performance$/i,
    /^performance\s+overview$/i,
    /^(show|open)\s+(overall\s+)?analytics$/i,
  ],

  // Performance → Per Meeting tab
  SHOW_PERFORMANCE_PER_MEETING: [
    /^(show|open|go to|view|see|check|navigate to)\s*(the\s*)?(performance|analytics|stats)\s*(per\s*meeting|by\s*meeting|for\s*(each|every)\s*meeting|meeting[\s-]by[\s-]meeting)/i,
    /^(meeting[\s-]level|per[\s-]meeting)\s*(performance|analytics|stats|view|tab)$/i,
    /^performance\s+per\s+meeting$/i,
    /^(show|open)\s+meeting[\s-]level\s+(performance|stats|analytics)$/i,
    /^per\s+meeting\s+(performance|stats|analytics|view)?$/i,
    /^(analytics|performance)\s+by\s+meeting$/i,
    /^meeting\s+(analytics|performance|stats)$/i,
    /^how\s+(did\s+each|were\s+the)\s+meetings?\s+(perform|go|do)$/i,
  ],

  // Performance → Per User tab
  SHOW_PERFORMANCE_PER_USER: [
    /^(show|open|go to|view|see|check|navigate to)\s*(the\s*)?(performance|analytics|stats)\s*(per\s*user|by\s*user|for\s*(each|every)\s*user|user[\s-]by[\s-]user)/i,
    /^(user[\s-]level|per[\s-]user)\s*(performance|analytics|stats|view|tab)$/i,
    /^performance\s+per\s+user$/i,
    /^(show|open)\s+user[\s-]level\s+(performance|stats|analytics)$/i,
    /^per\s+user\s+(performance|stats|analytics|view)?$/i,
    /^(analytics|performance)\s+by\s+user$/i,
    /^(user|team|member)\s+(performance|analytics|stats)(\s+(page|tab|view))?$/i,
    /^(show|open)\s+(the\s+)?(user|team)\s+(performance|stats)$/i,
    /^how\s+(is|are)\s+(the\s+)?(team|everyone|each\s+user)\s+(performing|doing)$/i,
    /^(leaderboard|rankings?|top\s+performers?)(\s+(page|tab|view))?$/i,
    /^(who\s*(is|'s)\s*(the\s*)?(best|top|leading|winning)|show\s*rankings?)$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS — top level + deep meeting reports
  // ═══════════════════════════════════════════════════════════════════════════
  SHOW_REPORTS: [
    /^(show|open|go to|navigate to|display|view)\s*(the\s*)?reports?(\s*(page|section|dashboard))?$/i,
    /^reports?(\s*(page|section))?$/i,
    /^(all\s*)?reports?$/i,
  ],

  // Report → latest meeting
  SHOW_LATEST_REPORT: [
    /^(show|open|view|see|get)\s*(the\s*)?(report\s*(of|for)\s*(the\s*)?)?(latest|last|most\s*recent|newest)\s*(meeting('s)?\s*)?report?/i,
    /^(latest|last|recent|newest)\s*(meeting\s*)?report$/i,
    /^(open|show)\s+latest\s+report$/i,
    /^report\s+(of|for)\s+(the\s+)?(latest|last|recent)\s+meeting$/i,
  ],

  // Report → new meeting (most recent created)
  SHOW_NEW_MEETING_REPORT: [
    /^(show|open|view|see)\s*(the\s*)?report\s*(of|for)\s*(the\s*)?(new|newest|most\s*recent)\s*meeting$/i,
    /^(new\s*meeting|newest\s*meeting)\s*report$/i,
    /^open\s+(new|newest)\s+meeting\s+report$/i,
    /^report\s+for\s+(the\s+)?(new|newest)\s+meeting$/i,
  ],

  // Report → specific meeting by search keyword
  SHOW_MEETING_REPORT: [
    /^(show|open|view|see|get)\s*(the\s*)?report\s*(for|of|about)\s+(.+)$/i,
    /^(open|view)\s+(.+)\s+report$/i,
    /^report\s+(for|of|about)\s+(.+)$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // TASKS / ACTION ITEMS
  // ═══════════════════════════════════════════════════════════════════════════
  SHOW_TASKS: [
    /^(show|open|go to|navigate to|display|view|see|list)\s*(my\s*)?(action\s*items?|tasks?|todos?|to-?do(\s*(list|items?))?|assignments?)/i,
    /^(action\s*items?|tasks?|todos?)(\s*(page|list|section))?$/i,
    /^(what are|show|list|see|check|view)\s*(all\s*)?(my\s*)?(tasks?|action\s*items?|assignments?|todos?)$/i,
  ],
  MY_TASKS: [
    /^(what\s*(do\s*i\s*have|are\s*my)\s*(to\s*do|tasks?|action\s*items?))$/i,
    /^(my\s*tasks?|tasks?\s*assigned\s*to\s*me|my\s*action\s*items?)$/i,
    /^what\s*('?s|\s*is)\s*(on\s*my\s*(list|plate|agenda)|left\s*to\s*do)$/i,
  ],
  SHOW_PENDING_TASKS: [
    /^(show|display|list|view|see|check)\s*(all\s*)?(my\s*)?(pending|incomplete|open|unfinished|not\s*done|in\s*progress|active)\s*(tasks?|action\s*items?|todos?)/i,
    /^(pending|incomplete|open|unfinished|active)\s*(tasks?|action\s*items?|todos?)$/i,
  ],
  SHOW_OVERDUE_TASKS: [
    /^(show|display|list|view|see|check)\s*(all\s*)?(my\s*)?(overdue|late|missed|past\s*due|delayed)\s*(tasks?|action\s*items?|todos?)/i,
    /^(overdue|late|past\s*due|missed)\s*(tasks?|action\s*items?|todos?)$/i,
  ],
  SHOW_HIGH_PRIORITY_TASKS: [
    /^(show|display|list|view|see)\s*(all\s*)?(my\s*)?(high\s*priority|urgent|critical|important)\s*(tasks?|action\s*items?)/i,
    /^(high\s*priority|urgent|critical|important)\s*(tasks?|action\s*items?|todos?)$/i,
    /^what('s|\s+is)\s*(urgent|critical|high\s*priority)(\s+right\s+now)?$/i,
  ],
  SHOW_COMPLETED_TASKS: [
    /^(show|display|list|view|see)\s*(all\s*)?(my\s*)?(completed|done|finished|closed)\s*(tasks?|action\s*items?|todos?)/i,
    /^(completed|done|finished)\s*(tasks?|action\s*items?|todos?)$/i,
  ],
  CREATE_TASK: [
    /^(create|add|new|make)\s*(a\s*)?(new\s*)?(task|action\s*item|todo)(\s+(.+))?$/i,
    /^(i\s*want\s*to|let's|can\s*you)\s*(create|add|make)\s*(a\s*)?(new\s*)?(task|action\s*item|todo)/i,
  ],
  ASSIGN_TASK: [
    /^assign\s*(a\s*)?(task|action\s*item)(\s+to\s+(.+))?$/i,
    /^(i\s*want\s*to|can\s*you)\s*assign\s*(a\s*)?(task|action\s*item)/i,
  ],
  COMPLETE_TASK: [
    /^(complete|finish|done\s*with|mark\s*(as\s*)?(done|complete|completed)|close)\s*(the\s*)?(task|action\s*item)?\s*(.+)?$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME FILTERS (fired on whichever analytics page is currently open)
  // ═══════════════════════════════════════════════════════════════════════════
  FILTER_THIS_WEEK: [
    /^(show|view|filter\s*by|switch\s*to)\s*(this\s*week|weekly)(\s*(data|stats|performance|analytics|view))?$/i,
    /^this\s*week(\s*(stats|data|performance|analytics))?$/i,
    /^weekly\s*(stats|report|data|performance|view)$/i,
    /^(last|past)\s*week(\s*(stats|performance))?$/i,
    /^week\s*(view|filter)$/i,
  ],
  FILTER_THIS_MONTH: [
    /^(show|view|filter\s*by|switch\s*to)\s*(this\s*month|monthly)(\s*(data|stats|performance|analytics|view))?$/i,
    /^this\s*month(\s*(stats|data|performance|analytics))?$/i,
    /^monthly\s*(stats|report|data|performance|view)$/i,
    /^(last|past)\s*month(\s*(stats|performance))?$/i,
    /^month\s*(view|filter)$/i,
  ],
  FILTER_THIS_QUARTER: [
    /^(show|view|filter\s*by|switch\s*to)\s*(this\s*quarter|quarterly)(\s*(data|stats|performance))?$/i,
    /^this\s*quarter(\s*(stats|performance))?$/i,
    /^quarterly\s*(stats|report|performance)$/i,
    /^quarter\s*(view|filter)$/i,
  ],
  FILTER_THIS_YEAR: [
    /^(show|view|filter\s*by|switch\s*to)\s*(this\s*year|yearly|annual)(\s*(data|stats|performance|analytics))?$/i,
    /^this\s*year(\s*(stats|data|performance|analytics))?$/i,
    /^(yearly|annual)\s*(stats|report|data|performance|view)$/i,
    /^year\s*(view|filter)$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════════════════════
  SHOW_SEARCH: [
    /^(open|go to|show)\s*(the\s*)?search(\s*(page|bar))?$/i,
    /^search$/i,
  ],
  SEARCH_FOR: [
    /^search\s+(for\s+)?(.+)$/i,
    /^find\s+(.+)$/i,
    /^look\s+up\s+(.+)$/i,
    /^(search|find|look\s+up)\s+(meetings?|tasks?|transcripts?|reports?)\s+(about|for|related\s+to)\s+(.+)$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════════════════
  EXPORT_DATA: [
    /^(export|download|save)\s*(the\s*)?(data|report|results?|stats|analytics|transcript|summary)(\s*(to|as)\s*(csv|excel|pdf|word))?$/i,
    /^(download|export)\s*(report|data|transcript|summary)$/i,
    /^export\s+(as\s+)?(csv|pdf|excel|word)$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS / PROFILE
  // ═══════════════════════════════════════════════════════════════════════════
  SHOW_SETTINGS: [
    /^(show|open|go to|navigate to|display|view|check)\s*(the\s*)?settings?(\s*(page|section|panel))?$/i,
    /^settings?$/i,
    /^preferences?$/i,
    /^(app|account)\s+settings?$/i,
  ],
  SHOW_PROFILE: [
    /^(show|open|go to|navigate to|display|view)\s*(my\s*)?(profile|account(\s*settings?)?)(\s*(page|section))?$/i,
    /^(profile|my\s*profile)$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  GO_BACK: [
    /^(go\s*back|back|previous(\s*page)?|return|go\s*back\s*please|take\s*me\s*back)$/i,
  ],
  REFRESH_PAGE: [
    /^(refresh(\s*(the\s*)?(page|screen|view))?|reload(\s*(the\s*)?(page|screen|view))?)$/i,
    /^(update\s*(the\s*)?page|refresh\s*now)$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // FRIDAY META COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  SHOW_HELP: [
    /^(help|commands?|what\s*can\s*(i|you)\s*(say|do|ask)|show\s*(me\s*)?(commands?|help)|list\s*commands?|available\s*commands?)$/i,
    /^(how\s*do\s*you\s*work|what\s*(can|do)\s*(i|you))$/i,
    /^what\s+can\s+friday\s+do$/i,
    /^(show|list)\s+(all\s+)?(voice\s+)?(commands?|shortcuts?)$/i,
  ],
  FRIDAY_WHO_ARE_YOU: [
    /^(who\s*are\s*you|what\s*are\s*you|tell\s*me\s*about\s*yourself|introduce\s*yourself|what\s*(is|are)\s*friday)$/i,
    /^(are\s*you\s*an?\s*(ai|bot|assistant)|what\s*kind\s*of\s*(ai|assistant)\s*are\s*you)$/i,
  ],
  FRIDAY_STATUS: [
    /^(are\s*you\s*(there|online|active|ready|working)|status|ping|hello|hey|hi|you\s*(there|online))$/i,
    /^friday\s*(status|online|active)$/i,
  ],
  STOP_LISTENING: [
    /^(stop|cancel|never\s*mind|stop\s*listening|sleep|goodbye\s*friday|bye(\s*friday)?|dismiss|exit|quit|that.?s\s*all|done|enough)$/i,
  ],
  MUTE_FRIDAY: [
    /^(mute|silence|quiet|shut\s*up|stop\s*(talking|speaking|voice)|disable\s*voice|mute\s*friday)$/i,
  ],
  UNMUTE_FRIDAY: [
    /^(unmute|enable\s*voice|speak(\s*again)?|unmute\s*friday|start\s*speaking(\s*again)?)$/i,
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════════════════
  LOGOUT: [/^(logout|log\s*out|sign\s*out|log\s*me\s*out|sign\s*me\s*out)$/i],

  // ═══════════════════════════════════════════════════════════════════════════
  // CHATBOT SHORTCUT — anything that looks like a genuine question
  // ═══════════════════════════════════════════════════════════════════════════
  CHATBOT_SHORTCUT: [
    /^(ask\s*friday|friday\s*(tell\s*me|explain)|friday,?\s+)(.*)/i,
    /^(what\s*(is|are|was|were)|who\s*(is|was|are)|when\s*(did|was|is)|why\s*(is|was|did)|how\s*(do|does|did|can))\s+.{5,}/i,
  ],
};

// ── Human-readable command reference (used by SHOW_HELP) ──────────────────────
export const getCommandCategories = () => ({
  "🏠 Dashboard": ['"dashboard" / "home" / "go home"'],
  "🗓 Meetings": [
    '"meetings" / "open meetings" / "show all meetings"',
    '"latest meeting" / "last meeting" / "open latest meeting"',
    '"today\'s meetings" / "any meetings today"',
    '"upcoming meetings" / "next meeting" / "my schedule"',
    '"create meeting" / "new meeting" / "book a meeting"',
    '"join meeting" / "go live" / "open meeting room"',
    '"search for [topic]" / "find meeting about [topic]"',
    '"show transcript" / "show summary" / "meeting notes"',
    '"action items from last meeting"',
  ],
  "📊 Performance": [
    '"performance" / "analytics" / "show stats"',
    '"performance per meeting" / "meeting-level analytics"',
    '"performance per user" / "user performance" / "leaderboard"',
    '"team performance" / "how is the team doing"',
  ],
  "📋 Reports": [
    '"reports" / "open reports"',
    '"latest report" / "last meeting report"',
    '"new meeting report" / "newest meeting report"',
    '"report for [meeting name]"',
  ],
  "⏱ Time Filters": [
    '"this week" / "weekly view"',
    '"this month" / "monthly view"',
    '"this quarter" / "quarterly"',
    '"this year" / "yearly"',
  ],
  "✅ Tasks": [
    '"action items" / "my tasks" / "show tasks"',
    '"pending tasks" / "overdue tasks"',
    '"high priority tasks" / "urgent tasks"',
    '"completed tasks" / "done tasks"',
    '"create task" → asks name + assignee',
    '"assign task" → asks which task + who',
  ],
  "🔍 Search & Export": [
    '"search for [query]" / "find [topic]"',
    '"export data" / "download report" / "export as PDF"',
  ],
  "⚙️ System": [
    '"settings" / "preferences" / "profile"',
    '"help" / "what can you do" / "list commands"',
    '"mute" / "unmute"',
    '"go back" / "refresh"',
    '"stop" / "cancel" / "goodbye friday"',
    '"logout" / "sign out"',
  ],
  "💬 Ask FRIDAY": [
    '"what is the performance trend?"',
    '"who spoke the most in the last meeting?"',
    '"how many tasks are overdue?"',
    "Any natural question — FRIDAY routes it to the AI chatbot",
  ],
});
