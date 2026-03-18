// frontend/src/services/taskHandlers.js - ENHANCED for Phase 6
import api from './api';

export const taskHandlers = {
  // Create task with AI-extracted params
  createTask: async (navigate, params = {}) => {
    try {
      const { title, description, assignee, dueDate, priority, meetingId } = params;
      
      // If we have enough info, create task directly
      if (title) {
        const taskData = {
          title,
          description: description || '',
          priority: priority || 'medium',
          dueDate: dueDate || null,
          assignee: assignee ? {
            userId: `user_${Date.now()}`,
            name: assignee,
            email: ''
          } : null,
          meetingId: meetingId || null
        };
        
        const response = await api.post('/tasks', taskData);
        
        if (response.data.success) {
          let message = `Task "${title}" created`;
          if (assignee) message += ` for ${assignee}`;
          if (dueDate) message += ` (due: ${new Date(dueDate).toLocaleDateString()})`;
          
          return { 
            success: true, 
            message,
            data: response.data.task
          };
        }
      }
      
      // Otherwise open create task modal
      navigate('/action-items');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openCreateTask', {
          detail: params
        }));
      }, 300);
      
      return { success: true, message: 'Opening create task form' };
    } catch (error) {
      console.error('Create task error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Failed to create task' 
      };
    }
  },

  // Assign task to user
  assignTask: async (params = {}) => {
    try {
      const { taskId, assignee, title } = params;
      
      if (!assignee) {
        return { success: false, message: 'No assignee specified' };
      }
      
      // If we have taskId, update existing task
      if (taskId) {
        const response = await api.patch(`/tasks/${taskId}/assign`, {
          userId: `user_${Date.now()}`,
          name: assignee,
          email: ''
        });
        
        if (response.data.success) {
          return { 
            success: true, 
            message: `Task assigned to ${assignee}`,
            data: response.data.task
          };
        }
      }
      
      // Find task by title and assign
      if (title) {
        const tasksResponse = await api.get('/tasks');
        const tasks = tasksResponse.data.tasks || [];
        
        const task = tasks.find(t => 
          t.title?.toLowerCase().includes(title.toLowerCase()) &&
          t.status !== 'completed'
        );
        
        if (task) {
          const response = await api.patch(`/tasks/${task._id}/assign`, {
            userId: `user_${Date.now()}`,
            name: assignee,
            email: ''
          });
          
          if (response.data.success) {
            return { 
              success: true, 
              message: `"${task.title}" assigned to ${assignee}`,
              data: response.data.task
            };
          }
        }
        
        return { success: false, message: `Task "${title}" not found` };
      }
      
      // Create new task with assignee
      if (title) {
        return await taskHandlers.createTask(null, { title, assignee });
      }
      
      return { success: false, message: 'No task specified' };
    } catch (error) {
      console.error('Assign task error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Failed to assign task' 
      };
    }
  },

  // Mark task as complete
  completeTask: async (params = {}) => {
    try {
      const { taskId, title } = params;
      
      if (taskId) {
        const response = await api.patch(`/tasks/${taskId}/complete`);
        
        if (response.data.success) {
          return { 
            success: true, 
            message: 'Task marked as complete',
            data: response.data.task
          };
        }
      }
      
      // Find task by title
      if (title) {
        const tasksResponse = await api.get('/tasks', {
          params: { status: 'pending' }
        });
        const tasks = tasksResponse.data.tasks || [];
        
        const task = tasks.find(t => 
          t.title?.toLowerCase().includes(title.toLowerCase())
        );
        
        if (task) {
          const response = await api.patch(`/tasks/${task._id}/complete`);
          
          if (response.data.success) {
            return { 
              success: true, 
              message: `"${task.title}" marked as complete`,
              data: response.data.task
            };
          }
        }
        
        return { success: false, message: `Task "${title}" not found` };
      }
      
      return { success: false, message: 'No task specified' };
    } catch (error) {
      console.error('Complete task error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Failed to complete task' 
      };
    }
  },

  // Update task
  updateTask: async (params = {}) => {
    try {
      const { taskId, title, updates } = params;
      
      if (!taskId && !title) {
        return { success: false, message: 'No task specified' };
      }
      
      let targetTaskId = taskId;
      
      // Find task by title if no ID provided
      if (!targetTaskId && title) {
        const tasksResponse = await api.get('/tasks');
        const tasks = tasksResponse.data.tasks || [];
        
        const task = tasks.find(t => 
          t.title?.toLowerCase().includes(title.toLowerCase())
        );
        
        if (task) {
          targetTaskId = task._id;
        } else {
          return { success: false, message: `Task "${title}" not found` };
        }
      }
      
      const response = await api.put(`/tasks/${targetTaskId}`, updates);
      
      if (response.data.success) {
        return { 
          success: true, 
          message: 'Task updated successfully',
          data: response.data.task
        };
      }
      
      return { success: false, message: 'Failed to update task' };
    } catch (error) {
      console.error('Update task error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Failed to update task' 
      };
    }
  },

  // Show tasks by status
  showTasks: (navigate, params = {}) => {
    const { status = 'all' } = params;
    navigate(`/action-items?status=${status}`);
    
    const statusNames = {
      all: 'all',
      pending: 'pending',
      'in-progress': 'in progress',
      completed: 'completed'
    };
    
    return { 
      success: true, 
      message: `Showing ${statusNames[status] || status} tasks` 
    };
  },

  // Delete task
  deleteTask: async (params = {}) => {
    try {
      const { taskId, title } = params;
      
      let targetTaskId = taskId;
      let taskTitle = title;
      
      // Find task by title if no ID provided
      if (!targetTaskId && title) {
        const tasksResponse = await api.get('/tasks');
        const tasks = tasksResponse.data.tasks || [];
        
        const task = tasks.find(t => 
          t.title?.toLowerCase().includes(title.toLowerCase())
        );
        
        if (task) {
          targetTaskId = task._id;
          taskTitle = task.title;
        } else {
          return { success: false, message: `Task "${title}" not found` };
        }
      }
      
      if (!targetTaskId) {
        return { success: false, message: 'No task specified' };
      }
      
      const response = await api.delete(`/tasks/${targetTaskId}`);
      
      if (response.data.success) {
        return { 
          success: true, 
          message: `Task "${taskTitle}" deleted`
        };
      }
      
      return { success: false, message: 'Failed to delete task' };
    } catch (error) {
      console.error('Delete task error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Failed to delete task' 
      };
    }
  },

  // Get task statistics
  getTaskStats: async () => {
    try {
      const response = await api.get('/tasks/stats');
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.stats 
        };
      }
      
      return { success: false, message: 'Failed to get task stats' };
    } catch (error) {
      console.error('Get task stats error:', error);
      return { success: false, message: 'Failed to get task statistics' };
    }
  },

  // Get tasks for specific meeting
  getMeetingTasks: async (meetingId) => {
    try {
      const response = await api.get(`/tasks/meeting/${meetingId}`);
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.tasks 
        };
      }
      
      return { success: false, message: 'Failed to get meeting tasks' };
    } catch (error) {
      console.error('Get meeting tasks error:', error);
      return { success: false, message: 'Failed to get meeting tasks' };
    }
  },

  // Bulk assign tasks
  bulkAssignTasks: async (params = {}) => {
    try {
      const { command, assignee, meetingTitle, meetingDate } = params;

      if (!assignee && !command) {
        return { success: false, message: 'No assignee specified' };
      }

      // Use AI to parse and execute bulk command
      const response = await api.post('/assistant/bulk-tasks', {
        command: command || `Assign tasks to ${assignee}${meetingTitle ? ` from ${meetingTitle} meeting` : ''}`
      });

      if (response.data.success) {
        return {
          success: true,
          message: response.data.data.message,
          data: response.data.data
        };
      }

      return { success: false, message: 'Failed to bulk assign tasks' };
    } catch (error) {
      console.error('Bulk assign error:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to bulk assign tasks'
      };
    }
  },

  // Bulk complete tasks
  bulkCompleteTasks: async (params = {}) => {
    try {
      const { command, status, meetingTitle } = params;

      // Use AI to parse and execute bulk command
      const response = await api.post('/assistant/bulk-tasks', {
        command: command || `Complete all ${status || 'pending'} tasks${meetingTitle ? ` from ${meetingTitle} meeting` : ''}`
      });

      if (response.data.success) {
        return {
          success: true,
          message: response.data.data.message,
          data: response.data.data
        };
      }

      return { success: false, message: 'Failed to bulk complete tasks' };
    } catch (error) {
      console.error('Bulk complete error:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to bulk complete tasks'
      };
    }
  }
};