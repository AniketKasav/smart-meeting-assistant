// frontend/src/services/commandPatterns.js - COMPLETE

export const COMMAND_PATTERNS = {
  // Navigation Commands
  SHOW_DASHBOARD: [
    /^(show|open|go to|display)\s*(the\s*)?(main\s*)?(dashboard|home)/i,
    /^dashboard$/i,
    /^home$/i
  ],

  SHOW_MEETINGS: [
    /^(show|open|go to|display)\s*(all\s*)?(meetings?|meeting list)/i,
    /^meetings?$/i
  ],

  SHOW_PERFORMANCE: [
    /^(show|open|go to|display)\s*(performance|analytics)/i,
    /^(performance|analytics)$/i
  ],

  SHOW_REPORTS: [
    /^(show|open|go to|display)\s*reports?/i,
    /^reports?$/i
  ],

  SHOW_PROFILE: [
    /^(show|open|go to|display)\s*(my\s*)?(profile|account)/i,
    /^profile$/i
  ],

  SHOW_SETTINGS: [
    /^(show|open|go to|display)\s*settings?/i,
    /^settings?$/i
  ],

  SHOW_TASKS: [
    /^(show|open|go to|display)\s*(action\s*items?|tasks?)/i,
    /^(action\s*items?|tasks?)$/i
  ],

  GO_BACK: [
    /^go back$/i,
    /^back$/i,
    /^previous$/i
  ],

  GO_HOME: [
    /^go home$/i,
    /^take me home$/i
  ],

  REFRESH_PAGE: [
    /^refresh$/i,
    /^reload$/i,
    /^refresh page$/i
  ],

  // Meeting Commands
  SHOW_LATEST_MEETING: [
    /^(show|open|display)\s*(the\s*)?(latest|recent|last)\s*meeting/i,
    /^latest meeting$/i,
    /^recent meeting$/i
  ],

  CREATE_MEETING: [
    /^(create|new|start|schedule)\s*(a\s*)?(meeting|session)/i,
    /^create meeting$/i,
    /^new meeting$/i
  ],


  SEARCH_MEETINGS: [
    /^search\s*(meetings?\s*)?(?:for\s+)?(.+)/i,
    /^find\s*meeting\s*(.+)/i
  ],

  SUMMARIZE_MEETING: [
    /^summarize\s*(the\s*)?(meeting|last meeting|yesterday's meeting)/i,
    /^(give|show)\s*me\s*(a\s*)?summary/i,
    /^meeting summary$/i
  ],

  SHOW_MEETING: [
    /^(show|open|display)\s*meeting\s*(.+)/i,
    /^open\s*(.+)\s*meeting/i
  ],

  SHOW_TRANSCRIPT: [
    /^(show|open|display)\s*(the\s*)?transcript/i,
    /^transcript$/i
  ],

  SHOW_SUMMARY: [
    /^(show|open|display)\s*(the\s*)?summary/i,
    /^summary$/i
  ],

  START_RECORDING: [
    /^(start|begin)\s*(recording|meeting)/i,
    /^record$/i
  ],

  STOP_RECORDING: [
    /^(stop|end)\s*(recording|meeting)/i,
    /^stop$/i
  ],

  // Task Commands
  CREATE_TASK: [
    /^(create|new|add)\s*task\s*(.+)/i,
    /^create task$/i
  ],

  ASSIGN_TASK: [
    /^assign\s*(?:task\s+)?(?:to\s+)?(.+)/i,
    /^assign\s*(.+)\s*to\s*(.+)/i
  ],

  COMPLETE_TASK: [
    /^(complete|finish|done)\s*(?:task\s+)?(.+)/i,
    /^mark\s*(?:task\s+)?(.+)\s*(?:as\s*)?(complete|done)/i
  ],

  SHOW_ALL_TASKS: [
    /^(show|display|list)\s*all\s*tasks?/i,
    /^all tasks?$/i
  ],

  SHOW_PENDING_TASKS: [
    /^(show|display|list)\s*pending\s*tasks?/i,
    /^pending tasks?$/i
  ],

  SHOW_COMPLETED_TASKS: [
    /^(show|display|list)\s*completed\s*tasks?/i,
    /^completed tasks?$/i
  ],


  DELETE_TASK: [
    /^(delete|remove)\s*(?:task\s+)?(.+)/i
  ],

  BULK_ASSIGN_TASKS: [
    /^assign\s*all\s*tasks?\s+(.+)/i,
    /^assign\s*tasks?\s+from\s+(.+)\s+to\s+(.+)/i
  ],

  BULK_COMPLETE_TASKS: [
    /^(complete|finish|mark)\s*all\s+(.+)/i,
    /^(complete|mark)\s*all\s*tasks?\s+(as\s*)?(complete|done)/i
  ],

  // Analytics Commands
  SHOW_QUARTER_PERFORMANCE: [
    /^(show|display)\s*Q?([1-4])\s*(?:quarter\s*)?(?:performance)?/i,
    /^Q([1-4])$/i
  ],

  SHOW_USER_PERFORMANCE: [
    /^(show|display)\s*(.+?)(?:'s)?\s*performance/i
  ],

  SHOW_WEEK: [
    /^(show|display)\s*(?:this\s*)?week/i,
    /^this week$/i
  ],

  SHOW_MONTH: [
    /^(show|display)\s*(?:this\s*)?month/i,
    /^this month$/i
  ],

  SHOW_YEAR: [
    /^(show|display)\s*(?:this\s*)?year/i,
    /^this year$/i
  ],

  FILTER_BY_DATE: [
    /^filter\s*(?:by\s*)?date/i,
    /^date filter$/i
  ],

  CLEAR_FILTERS: [
    /^clear\s*(?:all\s*)?filters?/i,
    /^reset filters?$/i
  ],

  EXPORT_DATA: [
    /^export\s*(?:data|report)?/i,
    /^download\s*(?:data|report)?/i
  ],

  // System Commands
  SHOW_HELP: [
    /^help$/i,
    /^what can (i|you) (say|do)/i,
    /^(show|display)\s*commands?/i,
    /^commands?$/i
  ],

  STOP_LISTENING: [
    /^stop\s*(?:listening)?$/i,
    /^cancel$/i,
    /^nevermind$/i
  ],

  LOGOUT: [
    /^(logout|log out|sign out)$/i
  ],

  SEARCH: [
    /^search\s*(?:for\s+)?(.+)/i,
    /^find\s*(.+)/i
  ],

  // Gmail & Drive Commands
  SEND_EMAIL: [
    /send email to (.*)/i
  ],
  SEARCH_GMAIL: [
    /search (gmail|email|emails) (.*)/i
  ],
  SEARCH_DRIVE: [
    /search (drive|files) (.*)/i,
    /find (file|document) (.*)/i
  ]
};

// Helper to get all command categories
export const getCommandCategories = () => {
  return {
    Navigation: [
      'show dashboard', 'show meetings', 'show performance', 
      'show reports', 'show settings', 'go back', 'refresh'
    ],
    Meetings: [
      'show latest meeting', 'create meeting', 'search meetings',
      'show transcript', 'start recording', 'stop recording'
    ],
    Tasks: [
      'create task', 'assign task to [name]', 'complete task',
      'show all tasks', 'show pending tasks', 'delete task'
    ],
    Analytics: [
      'show Q1', 'show this week', 'show this month',
      'clear filters', 'export data'
    ],
    System: [
      'help', 'stop', 'logout', 'search [query]'
    ]
  };
};