// backend/routes/actionItems.js
const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');

/**
 * GET /api/action-items
 * Get all action items with filters
 */
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      assignee, 
      meetingId,
      fromDate,
      toDate,
      overdue
    } = req.query;

    // Fetch ALL meetings (we'll filter action items after)
    let meetings = await Meeting.find({})
      .select('meetingId title startedAt summary.actionItems')
      .sort({ startedAt: -1 })
      .lean();

    // Flatten action items and add meeting context
    let actionItems = [];
    meetings.forEach(meeting => {
      if (meeting.summary && meeting.summary.actionItems && meeting.summary.actionItems.length > 0) {
        meeting.summary.actionItems.forEach((item, index) => {
          actionItems.push({
            ...item,
            _id: item._id || `${meeting.meetingId}-${index}`,
            meetingId: meeting.meetingId,
            meetingTitle: meeting.title,
            meetingDate: meeting.startedAt
          });
        });
      }
    });

    console.log(`📊 Found ${actionItems.length} total action items from ${meetings.length} meetings`);

    // Apply filters
    if (status) {
      actionItems = actionItems.filter(item => item.status === status);
    }

    if (priority) {
      actionItems = actionItems.filter(item => item.priority === priority);
    }

    if (assignee) {
      actionItems = actionItems.filter(item => 
        item.assignee && item.assignee.toLowerCase().includes(assignee.toLowerCase())
      );
    }

    if (meetingId) {
      actionItems = actionItems.filter(item => item.meetingId === meetingId);
    }

    if (fromDate) {
      const from = new Date(fromDate);
      actionItems = actionItems.filter(item => new Date(item.meetingDate) >= from);
    }

    if (toDate) {
      const to = new Date(toDate);
      actionItems = actionItems.filter(item => new Date(item.meetingDate) <= to);
    }

    if (overdue === 'true') {
      const now = new Date();
      actionItems = actionItems.filter(item => 
        item.dueDate && new Date(item.dueDate) < now && item.status !== 'completed'
      );
    }

    // Calculate statistics
    const stats = {
      total: actionItems.length,
      open: actionItems.filter(i => i.status === 'open').length,
      inProgress: actionItems.filter(i => i.status === 'in-progress').length,
      completed: actionItems.filter(i => i.status === 'completed').length,
      overdue: actionItems.filter(i => {
        if (!i.dueDate || i.status === 'completed') return false;
        return new Date(i.dueDate) < new Date();
      }).length,
      byPriority: {
        high: actionItems.filter(i => i.priority === 'high').length,
        medium: actionItems.filter(i => i.priority === 'medium').length,
        low: actionItems.filter(i => i.priority === 'low').length
      }
    };

    res.json({
      success: true,
      data: {
        actionItems,
        stats
      },
      debug: {
        totalMeetings: meetings.length,
        totalActionItems: actionItems.length,
        filteredActionItems: actionItems.length
      }
    });

  } catch (error) {
    console.error('Error fetching action items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/action-items/:meetingId/:itemId
 * Update a specific action item
 */
router.put('/:meetingId/:itemId', async (req, res) => {
  try {
    const { meetingId, itemId } = req.params;
    const updates = req.body;

    const meeting = await Meeting.findOne({ meetingId });
    
    if (!meeting || !meeting.summary || !meeting.summary.actionItems) {
      return res.status(404).json({
        success: false,
        error: 'Meeting or action items not found'
      });
    }

    // Find and update the action item
    const itemIndex = meeting.summary.actionItems.findIndex(
      item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Action item not found'
      });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      meeting.summary.actionItems[itemIndex][key] = updates[key];
    });

    await meeting.save();

    res.json({
      success: true,
      data: meeting.summary.actionItems[itemIndex]
    });

  } catch (error) {
    console.error('Error updating action item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/action-items/:meetingId/:itemId
 * Delete a specific action item
 */
router.delete('/:meetingId/:itemId', async (req, res) => {
  try {
    const { meetingId, itemId } = req.params;

    const meeting = await Meeting.findOne({ meetingId });
    
    if (!meeting || !meeting.summary || !meeting.summary.actionItems) {
      return res.status(404).json({
        success: false,
        error: 'Meeting or action items not found'
      });
    }

    // Remove the action item
    meeting.summary.actionItems = meeting.summary.actionItems.filter(
      item => item._id.toString() !== itemId
    );

    await meeting.save();

    res.json({
      success: true,
      message: 'Action item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting action item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/action-items/assignees
 * Get list of all assignees
 */
router.get('/assignees', async (req, res) => {
  try {
    const meetings = await Meeting.find({
      'summary.actionItems': { $exists: true, $ne: [] }
    }).select('summary.actionItems').lean();

    const assignees = new Set();
    
    meetings.forEach(meeting => {
      if (meeting.summary && meeting.summary.actionItems) {
        meeting.summary.actionItems.forEach(item => {
          if (item.assignee && item.assignee !== 'Unassigned') {
            assignees.add(item.assignee);
          }
        });
      }
    });

    res.json({
      success: true,
      data: Array.from(assignees).sort()
    });

  } catch (error) {
    console.error('Error fetching assignees:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;