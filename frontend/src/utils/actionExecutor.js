// frontend/src/utils/actionExecutor.js — FRIDAY Action Executor
// Handles every INTENT from commandPatterns.js and navigates / acts accordingly.
//
// FIXES vs original:
//   1. Added missing SEARCH_FOR case (was hitting default → error)
//   2. Added missing CHATBOT_SHORTCUT case
//   3. SHOW_MEETING_REPORT now correctly uses params.keyword (extracted by fixed intentMatcher)

const API = "https://smart-meeting-assistant-olcl.onrender.com/api";

// ── Tiny API helper ────────────────────────────────────────────────────────────
const apiFetch = async (path) => {
  const res = await fetch(`${API}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
};

// ── Dispatch a time-filter event so analytics pages can react ──────────────────
const dispatchFilterEvent = (period) =>
  window.dispatchEvent(
    new CustomEvent("friday:filter", { detail: { period } }),
  );

// ── Dispatch a tab-switch event so performance page can react ──────────────────
const dispatchTabEvent = (tab) =>
  window.dispatchEvent(new CustomEvent("friday:tab", { detail: { tab } }));

class ActionExecutor {
  constructor() {
    this._navigate = null;
  }

  setNavigate(navigate) {
    this._navigate = navigate;
  }

  _nav(path, message) {
    this._navigate?.(path);
    return { success: true, message };
  }

  async execute(intent, params = {}) {
    if (!this._navigate)
      return { success: false, message: "Navigation not available." };
    try {
      return await this._dispatch(intent, params);
    } catch (err) {
      console.error("[ActionExecutor]", err);
      return {
        success: false,
        message: "Something went wrong. Please try again.",
      };
    }
  }

  // ── Fetch helpers ────────────────────────────────────────────────────────────
  async _latestMeetingId() {
    try {
      const data = await apiFetch("/meetings?limit=1&sort=-createdAt");
      return data.meetings?.[0]?._id || data[0]?._id || null;
    } catch {
      return null;
    }
  }

  async _findMeetingByKeyword(keyword) {
    try {
      const data = await apiFetch(
        `/meetings?search=${encodeURIComponent(keyword)}&limit=1`,
      );
      return data.meetings?.[0]?._id || data[0]?._id || null;
    } catch {
      return null;
    }
  }

  // ── Main dispatch ────────────────────────────────────────────────────────────
  async _dispatch(intent, params) {
    const currentPath = window.location.pathname;

    switch (intent) {
      // ── Dashboard ────────────────────────────────────────────────────────────
      case "SHOW_DASHBOARD":
        return this._nav("/dashboard", "Opening the dashboard.");

      // ── Meetings ─────────────────────────────────────────────────────────────
      case "SHOW_MEETINGS":
        return this._nav("/meetings", "Opening all meetings.");

      case "SHOW_LATEST_MEETING": {
        const id = await this._latestMeetingId();
        if (id)
          return this._nav(`/meetings/${id}`, "Opening your latest meeting.");
        return this._nav(
          "/meetings",
          "Opening meetings — could not find the latest one.",
        );
      }

      case "SHOW_TODAY_MEETINGS":
        return this._nav("/meetings?filter=today", "Showing today's meetings.");

      case "SHOW_UPCOMING_MEETINGS":
        return this._nav(
          "/meetings?filter=upcoming",
          "Showing upcoming meetings.",
        );

      case "CREATE_MEETING":
        return this._nav(
          "/meetings",
          "Taking you to meetings to create a new one.",
        );

      case "JOIN_MEETING":
        return this._nav("/meeting-room", "Opening the meeting room.");

      case "SEARCH_MEETINGS": {
        const q = params.query || params.keyword || "";
        if (q)
          return this._nav(
            `/search?q=${encodeURIComponent(q)}`,
            `Searching for "${q}".`,
          );
        return this._nav("/search", "Opening search.");
      }

      // ── Meeting detail sub-sections ──────────────────────────────────────────
      case "SHOW_MEETING_TRANSCRIPT": {
        const id = await this._latestMeetingId();
        if (id)
          return this._nav(
            `/meetings/${id}?tab=transcript`,
            "Opening the transcript for the latest meeting.",
          );
        return this._nav(
          "/meetings",
          "Could not find a meeting to show the transcript for.",
        );
      }

      case "SHOW_MEETING_SUMMARY": {
        const id = await this._latestMeetingId();
        if (id)
          return this._nav(
            `/meetings/${id}?tab=summary`,
            "Opening the summary for the latest meeting.",
          );
        return this._nav("/meetings", "Could not find a meeting to summarize.");
      }

      case "SHOW_MEETING_ACTION_ITEMS": {
        const id = await this._latestMeetingId();
        if (id)
          return this._nav(
            `/meetings/${id}?tab=action-items`,
            "Opening action items for the latest meeting.",
          );
        return this._nav("/action-items", "Opening action items.");
      }

      // ── Performance ──────────────────────────────────────────────────────────
      case "SHOW_PERFORMANCE": {
        if (currentPath.startsWith("/performance")) {
          dispatchTabEvent("overview");
          return { success: true, message: "Showing overall performance." };
        }
        return this._nav("/performance", "Opening performance overview.");
      }

      case "SHOW_PERFORMANCE_PER_MEETING": {
        if (currentPath.startsWith("/performance")) {
          dispatchTabEvent("per-meeting");
          return {
            success: true,
            message: "Switching to performance per meeting.",
          };
        }
        return this._nav(
          "/performance?view=per-meeting",
          "Opening performance per meeting.",
        );
      }

      case "SHOW_PERFORMANCE_PER_USER": {
        if (currentPath.startsWith("/performance")) {
          dispatchTabEvent("per-user");
          return {
            success: true,
            message: "Switching to performance per user.",
          };
        }
        return this._nav(
          "/performance?view=per-user",
          "Opening performance per user.",
        );
      }

      // ── Reports ──────────────────────────────────────────────────────────────
      case "SHOW_REPORTS":
        return this._nav("/reports", "Opening reports.");

      case "SHOW_LATEST_REPORT":
      case "SHOW_NEW_MEETING_REPORT": {
        const id = await this._latestMeetingId();
        if (id)
          return this._nav(
            `/meetings/${id}`,
            "Opening the report for the latest meeting.",
          );
        return this._nav(
          "/reports",
          "Opening reports — could not find the latest meeting.",
        );
      }

      case "SHOW_MEETING_REPORT": {
        const keyword = params.keyword || params.title || "";
        if (keyword) {
          const id = await this._findMeetingByKeyword(keyword);
          if (id)
            return this._nav(
              `/meetings/${id}`,
              `Opening the report for "${keyword}".`,
            );
          return this._nav(
            "/reports",
            `Could not find a meeting matching "${keyword}". Opening reports.`,
          );
        }
        return this._nav("/reports", "Opening reports.");
      }

      // ── Tasks / Action Items ─────────────────────────────────────────────────
      case "SHOW_TASKS":
      case "MY_TASKS":
        return this._nav("/action-items", "Opening your action items.");

      case "SHOW_PENDING_TASKS":
        return this._nav(
          "/action-items?filter=pending",
          "Showing pending tasks.",
        );

      case "SHOW_OVERDUE_TASKS":
        return this._nav(
          "/action-items?filter=overdue",
          "Showing overdue tasks.",
        );

      case "SHOW_HIGH_PRIORITY_TASKS":
        return this._nav(
          "/action-items?filter=high-priority",
          "Showing high-priority tasks.",
        );

      case "SHOW_COMPLETED_TASKS":
        return this._nav(
          "/action-items?filter=completed",
          "Showing completed tasks.",
        );

      case "SHOW_ALL_TASKS":
        return this._nav("/action-items?filter=all", "Showing all tasks.");

      case "CREATE_TASK":
        return this._nav(
          "/action-items",
          "Taking you to action items to create a new task.",
        );

      case "ASSIGN_TASK":
        return this._nav(
          "/action-items",
          "Taking you to action items to assign a task.",
        );

      case "COMPLETE_TASK":
        return {
          success: true,
          message: "To mark a task complete, head to action items.",
        };

      // ── Time filters ─────────────────────────────────────────────────────────
      case "FILTER_THIS_WEEK":
        dispatchFilterEvent("week");
        return { success: true, message: "Filtering to this week." };

      case "FILTER_THIS_MONTH":
        dispatchFilterEvent("month");
        return { success: true, message: "Filtering to this month." };

      case "FILTER_THIS_QUARTER":
        dispatchFilterEvent("quarter");
        return { success: true, message: "Filtering to this quarter." };

      case "FILTER_THIS_YEAR":
        dispatchFilterEvent("year");
        return { success: true, message: "Filtering to this year." };

      // ── Search ───────────────────────────────────────────────────────────────
      case "SHOW_SEARCH":
        return this._nav("/search", "Opening search.");

      // ✅ FIX: was missing entirely — fell to default → error message
      case "SEARCH_FOR": {
        const q = params.query || params.keyword || "";
        if (q)
          return this._nav(
            `/search?q=${encodeURIComponent(q)}`,
            `Searching for "${q}".`,
          );
        return this._nav("/search", "Opening search.");
      }

      // ── Export ───────────────────────────────────────────────────────────────
      case "EXPORT_DATA":
        window.dispatchEvent(
          new CustomEvent("friday:export", { detail: params }),
        );
        return {
          success: true,
          message: "Triggering export. Check the export options on screen.",
        };

      // ── Settings / Profile ───────────────────────────────────────────────────
      case "SHOW_SETTINGS":
        return this._nav("/settings", "Opening settings.");

      case "SHOW_PROFILE":
        return this._nav("/settings?tab=profile", "Opening your profile.");

      // ── Navigation helpers ────────────────────────────────────────────────────
      case "GO_BACK":
        window.history.back();
        return { success: true, message: "Going back." };

      case "REFRESH_PAGE":
        setTimeout(() => window.location.reload(), 500);
        return { success: true, message: "Refreshing the page." };

      // ── FRIDAY meta ───────────────────────────────────────────────────────────
      case "SHOW_HELP":
        return {
          success: true,
          message: `I can navigate your app, manage tasks, and answer questions.
            Try: "open dashboard", "show performance per meeting", "latest meeting report",
            "pending tasks", "show performance per user", "this week", or ask me anything.`,
        };

      case "FRIDAY_WHO_ARE_YOU":
        return {
          success: true,
          message: `I'm FRIDAY, your AI meeting assistant. I can navigate pages, manage tasks,
            pull up reports and analytics, and answer questions about your meetings.`,
        };

      case "FRIDAY_STATUS":
        return {
          success: true,
          message: "FRIDAY online. All systems go — what do you need?",
        };

      case "MUTE_FRIDAY":
        localStorage.setItem("tts_enabled", "false");
        return { success: true, message: "" };

      case "UNMUTE_FRIDAY":
        localStorage.setItem("tts_enabled", "true");
        return { success: true, message: "Voice enabled." };

      case "STOP_LISTENING":
        return { success: true, message: "Okay, going back to sleep." };

      // ✅ FIX: was missing entirely
      case "CHATBOT_SHORTCUT":
        // VoiceCommandContext handles chatbot routing before actionExecutor is called,
        // so this case is a safety net only.
        return { success: true, message: "Let me look that up." };

      // ── Auth ──────────────────────────────────────────────────────────────────
      case "LOGOUT":
        try {
          await apiFetch("/auth/logout");
        } catch (_) {}
        return this._nav("/login", "Logging you out. See you soon.");

      default:
        return {
          success: false,
          message: `I'm not sure how to handle that. Try saying "help" for a list of commands.`,
        };
    }
  }
}

export const actionExecutor = new ActionExecutor();
export default actionExecutor;

