// frontend/src/utils/actionExecutor.js - PHASE 6 COMPLETE
import { meetingHandlers } from '../services/meetingHandlers';
import { taskHandlers } from '../services/taskHandlers';
import { analyticsHandlers } from '../services/analyticsHandlers';

/**
 * Action Executor Class
 * Executes actions based on intent and parameters
 */
class ActionExecutor {
  constructor() {
    this.navigate = null;
  }

  /**
   * Set navigate function (from React Router)
   */
  setNavigate(navigateFn) {
    this.navigate = navigateFn;
  }

  /**
   * Execute action based on intent
   */
  async execute(intent, params = {}, actions = {}) {
    try {
      console.log('🎯 Executing action:', intent, params);

      // Use stored navigate or window navigation as fallback
      const nav = this.navigate || ((path) => window.location.href = path);

      switch (intent) {
        // Navigation commands
        case 'NAVIGATE_DASHBOARD':
        case 'SHOW_DASHBOARD':
          nav('/dashboard');
          return { success: true, message: 'Navigating to dashboard' };

        case 'NAVIGATE_MEETINGS':
        case 'SHOW_MEETINGS':
          nav('/meetings');
          return { success: true, message: 'Navigating to meetings' };

        case 'NAVIGATE_ANALYTICS':
        case 'SHOW_PERFORMANCE':
        case 'SHOW_ANALYTICS':
          nav('/performance');
          return { success: true, message: 'Navigating to analytics' };

        case 'SHOW_REPORTS':
          if (analyticsHandlers?.showReports) {
            analyticsHandlers.showReports(nav);
          } else {
            nav('/reports');
          }
          return { success: true, message: 'Showing reports' };

        case 'NAVIGATE_PROFILE':
        case 'SHOW_PROFILE':
        case 'SHOW_SETTINGS':
          nav('/settings');
          return { success: true, message: 'Navigating to settings' };

        case 'SHOW_TASKS':
        case 'SHOW_ACTION_ITEMS':
          nav('/action-items');
          return { success: true, message: 'Showing tasks' };

        case 'GO_BACK':
          window.history.back();
          return { success: true, message: 'Going back' };

        case 'GO_HOME':
          nav('/dashboard');
          return { success: true, message: 'Going home' };

        case 'REFRESH':
        case 'REFRESH_PAGE':
          window.location.reload();
          return { success: true, message: 'Refreshing page' };

        // Meeting commands
        case 'SHOW_LATEST_MEETING':
          if (meetingHandlers?.showLatestMeeting) {
            await meetingHandlers.showLatestMeeting(nav);
          }
          return { success: true, message: 'Showing latest meeting' };

        case 'CREATE_MEETING':
        case 'SCHEDULE_MEETING':
          if (meetingHandlers?.createMeeting) {
            await meetingHandlers.createMeeting(nav, params);
          }
          return { success: true, message: 'Creating meeting', data: params };

        case 'SEARCH_MEETINGS':
        case 'FIND_MEETINGS':
          if (meetingHandlers?.searchMeetings) {
            await meetingHandlers.searchMeetings(nav, params);
          } else {
            const searchParams = new URLSearchParams();
            if (params.keyword) searchParams.append('q', params.keyword);
            if (params.participants) searchParams.append('participants', params.participants.join(','));
            nav(`/meetings?${searchParams.toString()}`);
          }
          return { success: true, message: 'Searching meetings', data: params };

        case 'VIEW_MEETING':
        case 'SHOW_MEETING':
          if (meetingHandlers?.showMeeting) {
            await meetingHandlers.showMeeting(nav, params);
          }
          return { success: true, message: 'Viewing meeting' };

        case 'SHOW_TRANSCRIPT':
          if (meetingHandlers?.showTranscript) {
            await meetingHandlers.showTranscript(nav, params);
          }
          return { success: true, message: 'Showing transcript' };

        // ✅ PHASE 6: Meeting Summary Support
        case 'SHOW_SUMMARY':
        case 'GENERATE_SUMMARY':
        case 'SUMMARIZE_MEETING':
          if (meetingHandlers?.showSummary) {
            await meetingHandlers.showSummary(nav, params);
          }
          return { success: true, message: 'Generating meeting summary' };

        case 'START_RECORDING':
          if (meetingHandlers?.startRecording) {
            await meetingHandlers.startRecording(nav);
          }
          return { success: true, message: 'Starting recording' };

        case 'STOP_RECORDING':
          if (meetingHandlers?.stopRecording) {
            await meetingHandlers.stopRecording();
          }
          return { success: true, message: 'Stopping recording' };

        // Task commands
        case 'CREATE_TASK':
          if (taskHandlers?.createTask) {
            await taskHandlers.createTask(nav, params);
          }
          return { success: true, message: 'Creating task', data: params };

        case 'ASSIGN_TASK':
          if (taskHandlers?.assignTask) {
            await taskHandlers.assignTask(params);
          }
          return { success: true, message: `Task assigned to ${params.assignee || 'user'}`, data: params };

        case 'COMPLETE_TASK':
        case 'MARK_TASK_COMPLETE':
          if (taskHandlers?.completeTask) {
            await taskHandlers.completeTask(params);
          }
          return { success: true, message: 'Task completed', data: params };

        // ✅ PHASE 6: Task Update Support
        case 'UPDATE_TASK':
        case 'UPDATE_STATUS':
        case 'UPDATE_TASK_STATUS':
          if (taskHandlers?.updateTask) {
            await taskHandlers.updateTask(params);
          }
          return { success: true, message: 'Task updated', data: params };

        // LIST_TASKS handler
        case 'LIST_TASKS':
          const status = params.status || 'all';
          if (taskHandlers?.showTasks) {
            await taskHandlers.showTasks(nav, { status });
          } else {
            // Fallback navigation with status filter
            if (status === 'all') {
              nav('/action-items');
            } else {
              nav(`/action-items?status=${status}`);
            }
          }
          return { 
            success: true, 
            message: `Showing ${status} tasks`,
            data: { status }
          };

        case 'SHOW_ALL_TASKS':
          if (taskHandlers?.showTasks) {
            await taskHandlers.showTasks(nav, { status: 'all' });
          } else {
            nav('/action-items');
          }
          return { success: true, message: 'Showing all tasks' };

        case 'SHOW_PENDING_TASKS':
          if (taskHandlers?.showTasks) {
            await taskHandlers.showTasks(nav, { status: 'pending' });
          } else {
            nav('/action-items?status=pending');
          }
          return { success: true, message: 'Showing pending tasks' };

        case 'SHOW_COMPLETED_TASKS':
          if (taskHandlers?.showTasks) {
            await taskHandlers.showTasks(nav, { status: 'completed' });
          } else {
            nav('/action-items?status=completed');
          }
          return { success: true, message: 'Showing completed tasks' };

        case 'DELETE_TASK':
          if (taskHandlers?.deleteTask) {
            await taskHandlers.deleteTask(params);
          }
          return { success: true, message: 'Task deleted' };

        // Analytics commands
        case 'SHOW_QUARTER_PERFORMANCE':
        case 'ANALYZE_PERFORMANCE':
          if (analyticsHandlers?.showQuarterPerformance) {
            await analyticsHandlers.showQuarterPerformance(nav, params);
          } else {
            nav('/performance');
          }
          return { success: true, message: 'Showing performance analytics' };

        case 'SHOW_USER_PERFORMANCE':
          if (analyticsHandlers?.showUserPerformance) {
            await analyticsHandlers.showUserPerformance(nav, params);
          }
          return { success: true, message: 'Showing user performance' };

        case 'SHOW_WEEK':
          if (analyticsHandlers?.showTimePeriod) {
            await analyticsHandlers.showTimePeriod(nav, { period: 'week' });
          }
          return { success: true, message: 'Showing this week' };

        case 'SHOW_MONTH':
          if (analyticsHandlers?.showTimePeriod) {
            await analyticsHandlers.showTimePeriod(nav, { period: 'month' });
          }
          return { success: true, message: 'Showing this month' };

        case 'SHOW_YEAR':
          if (analyticsHandlers?.showTimePeriod) {
            await analyticsHandlers.showTimePeriod(nav, { period: 'year' });
          }
          return { success: true, message: 'Showing this year' };

        case 'FILTER_BY_DATE':
          if (analyticsHandlers?.filterByDate) {
            await analyticsHandlers.filterByDate(nav, params);
          }
          return { success: true, message: 'Date filter applied', data: params };

        case 'CLEAR_FILTERS':
          if (analyticsHandlers?.clearFilters) {
            await analyticsHandlers.clearFilters(nav);
          }
          return { success: true, message: 'Filters cleared' };

        case 'EXPORT_DATA':
          if (analyticsHandlers?.exportData) {
            await analyticsHandlers.exportData();
          }
          return { success: true, message: 'Exporting data' };

        // System commands
        case 'HELP':
        case 'SHOW_HELP':
        case 'SHOW_COMMANDS':
          if (actions.showHelp) actions.showHelp();
          return { success: true, message: 'Showing help' };

        case 'STOP_LISTENING':
          if (actions.stopListening) actions.stopListening();
          return { success: true, message: 'Stopped listening' };

        case 'LOGOUT':
          localStorage.removeItem('token');
          nav('/login');
          return { success: true, message: 'Logging out' };

        case 'SEARCH':
          nav(`/search?q=${encodeURIComponent(params.query || params.keyword || '')}`);
          return { success: true, message: 'Searching', data: params };

        // ✅ PHASE 6: General help and conversation support
        case 'GENERAL_CONVERSATION':
        case 'QUERY_DATA':
        case 'GENERAL_HELP':
          return { 
            success: true, 
            message: 'Got it! Done!',
            data: params 
          };

        // Gmail/Drive/Email actions
        case 'SEARCH_GMAIL': {
          // Example: params.query, params.label
          if (actions.searchGmail) {
            const result = await actions.searchGmail(params);
            return { success: true, message: 'Gmail search complete', data: result };
          }
          return { success: false, message: 'Gmail search handler not implemented' };
        }

        case 'SEARCH_DRIVE': {
          // Example: params.query, params.type
          if (actions.searchDrive) {
            const result = await actions.searchDrive(params);
            return { success: true, message: 'Drive search complete', data: result };
          }
          return { success: false, message: 'Drive search handler not implemented' };
        }

        case 'SEND_EMAIL': {
          // Example: params.to, params.subject, params.body
          if (actions.sendEmail) {
            const result = await actions.sendEmail(params);
            return { success: true, message: 'Email sent', data: result };
          }
          return { success: false, message: 'Send email handler not implemented' };
        }

        case 'NAVIGATE':
          if (params.path || params.page) {
            const path = params.path || `/${params.page}`;
            nav(path);
            return { success: true, message: `Navigating to ${path}` };
          }
          return { success: false, message: 'No navigation path specified' };

        default:
          console.warn('⚠️ Unknown intent:', intent);
          return { 
            success: false, 
            message: `Unknown command: ${intent}`,
            error: 'Intent not recognized'
          };
      }
    } catch (error) {
      console.error('❌ Command execution error:', error);
      return { 
        success: false, 
        message: 'Failed to execute command',
        error: error.message 
      };
    }
  }

  /**
   * Legacy support for old executeCommand function
   */
  executeCommand(command, navigate, actions = {}) {
    const { intent, params = {} } = command;
    this.setNavigate(navigate);
    return this.execute(intent, params, actions);
  }
}

// Create singleton instance
const actionExecutorInstance = new ActionExecutor();

// Export as named export (for VoiceCommandContext)
export const actionExecutor = actionExecutorInstance;

// Also export as default (for backwards compatibility)
export default actionExecutorInstance;

// Also export the class if needed
export { ActionExecutor };