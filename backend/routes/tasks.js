// backend/routes/tasks.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * GET /api/tasks
 * Get user's tasks with optional filters
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, priority, overdue, meetingId } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (overdue === 'true') filters.overdue = true;
    if (meetingId) filters.meetingId = meetingId;

    const tasks = await Task.getUserTasks(userId, filters);

    res.json({
      success: true,
      tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
});

/**
 * POST /api/tasks
 * Create new task
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userName = req.user.name;
    const { 
      title, 
      description, 
      priority, 
      dueDate, 
      assignee, 
      meetingId,
      meetingTitle,
      tags 
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Task title is required'
      });
    }

    const task = new Task({
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: {
        userId,
        name: userName
      },
      meetingId,
      meetingTitle,
      tags: tags || []
    });

    // Assign if assignee provided
    if (assignee && assignee.userId) {
      task.assignee = {
        userId: assignee.userId,
        name: assignee.name,
        email: assignee.email
      };
    }

    await task.save();

    res.status(201).json({
      success: true,
      task,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
});

/**
 * GET /api/tasks/:id
 * Get single task
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
});

/**
 * PUT /api/tasks/:id
 * Update task
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, assignee } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Update fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = new Date(dueDate);
    if (assignee) task.assignee = assignee;

    // Auto-set completedAt if status changed to completed
    if (status === 'completed' && task.status !== 'completed') {
      task.completedAt = new Date();
    }

    await task.save();

    res.json({
      success: true,
      task,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
});

/**
 * PATCH /api/tasks/:id/complete
 * Mark task as completed
 */
router.patch('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    await task.markComplete();

    res.json({
      success: true,
      task,
      message: 'Task marked as completed'
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete task'
    });
  }
});

/**
 * PATCH /api/tasks/:id/assign
 * Assign task to user
 */
router.patch('/:id/assign', authenticateToken, async (req, res) => {
  try {
    const { userId, name, email } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        error: 'User ID and name are required'
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    await task.assignTo(userId, name, email);

    res.json({
      success: true,
      task,
      message: `Task assigned to ${name}`
    });
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign task'
    });
  }
});

/**
 * POST /api/tasks/:id/notes
 * Add note to task
 */
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.userId;
    const userName = req.user.name;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Note content is required'
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    await task.addNote(content, userId, userName);

    res.json({
      success: true,
      task,
      message: 'Note added successfully'
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add note'
    });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
});

/**
 * GET /api/tasks/meeting/:meetingId
 * Get tasks for specific meeting
 */
router.get('/meeting/:meetingId', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.getMeetingTasks(req.params.meetingId);

    res.json({
      success: true,
      tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Get meeting tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meeting tasks'
    });
  }
});

/**
 * GET /api/tasks/stats
 * Get task statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [total, pending, inProgress, completed, overdue] = await Promise.all([
      Task.countDocuments({
        $or: [
          { 'assignee.userId': userId },
          { 'createdBy.userId': userId }
        ]
      }),
      Task.countDocuments({
        $or: [
          { 'assignee.userId': userId },
          { 'createdBy.userId': userId }
        ],
        status: 'pending'
      }),
      Task.countDocuments({
        $or: [
          { 'assignee.userId': userId },
          { 'createdBy.userId': userId }
        ],
        status: 'in-progress'
      }),
      Task.countDocuments({
        $or: [
          { 'assignee.userId': userId },
          { 'createdBy.userId': userId }
        ],
        status: 'completed'
      }),
      Task.countDocuments({
        $or: [
          { 'assignee.userId': userId },
          { 'createdBy.userId': userId }
        ],
        dueDate: { $lt: new Date() },
        status: { $ne: 'completed' }
      })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        pending,
        inProgress,
        completed,
        overdue
      }
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task statistics'
    });
  }
});

module.exports = router;