// backend/routes/actionItems.js
const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { sendActionItemCompletedEmail } = require('../services/emailService');
const authenticateToken = require('../middleware/authenticateToken');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/action-items
 * Host  → sees all action items from their meetings
 * Member → sees only action items assigned to them
 */
router.get("/", async (req, res) => {
  try {
    const { status, priority, assignee, meetingId, fromDate, toDate, overdue } =
      req.query;
    const userId = req.user.userId;
    const userDoc = await User.findById(req.user.userId).select("name").lean();     const userName = userDoc?.name || "Unknown";

    const meetings = await Meeting.find({
      $or: [{ "host.userId": userId }, { "participants.userId": userId }],
    })
      .select("meetingId title startedAt summary.actionItems host participants")
      .sort({ startedAt: -1 })
      .lean();

    // Check if user is host of ANY meeting
    const isHostOfAny = meetings.some((m) => m.host?.userId === userId);

    let actionItems = [];

    meetings.forEach((meeting) => {
      if (!meeting.summary?.actionItems?.length) return;
      const isHost = meeting.host?.userId === userId;

      meeting.summary.actionItems.forEach((item, index) => {
        // Member filter: only items assigned to them
        if (!isHost) {
          const assignedToMe =
            item.assignee &&
            item.assignee.toLowerCase() === userName.toLowerCase();
          if (!assignedToMe) return;
        }

        actionItems.push({
          ...item,
          _id: item._id || `${meeting.meetingId}-${index}`,
          meetingId: meeting.meetingId,
          meetingTitle: meeting.title,
          meetingDate: meeting.startedAt,
        });
      });
    });

    // Apply query filters
    if (status) actionItems = actionItems.filter((i) => i.status === status);
    if (priority)
      actionItems = actionItems.filter((i) => i.priority === priority);
    if (meetingId)
      actionItems = actionItems.filter((i) => i.meetingId === meetingId);

    if (assignee) {
      const effectiveAssignee = isHostOfAny ? assignee : userName;
      actionItems = actionItems.filter((i) =>
        i.assignee?.toLowerCase().includes(effectiveAssignee.toLowerCase()),
      );
    }

    if (fromDate) {
      const from = new Date(fromDate);
      actionItems = actionItems.filter((i) => new Date(i.meetingDate) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      actionItems = actionItems.filter((i) => new Date(i.meetingDate) <= to);
    }
    if (overdue === "true") {
      const now = new Date();
      actionItems = actionItems.filter(
        (i) =>
          i.dueDate && new Date(i.dueDate) < now && i.status !== "completed",
      );
    }

    const stats = {
      total: actionItems.length,
      open: actionItems.filter((i) => i.status === "open").length,
      inProgress: actionItems.filter((i) => i.status === "in-progress").length,
      completed: actionItems.filter((i) => i.status === "completed").length,
      overdue: actionItems.filter((i) => {
        if (!i.dueDate || i.status === "completed") return false;
        return new Date(i.dueDate) < new Date();
      }).length,
      byPriority: {
        high: actionItems.filter((i) => i.priority === "high").length,
        medium: actionItems.filter((i) => i.priority === "medium").length,
        low: actionItems.filter((i) => i.priority === "low").length,
      },
    };

    res.json({ success: true, data: { actionItems, stats, isHostOfAny } });
  } catch (error) {
    console.error("Error fetching action items:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/action-items/assignees
 * Host   → all assignees across their meetings
 * Member → only themselves
 */
router.get("/assignees", async (req, res) => {
  try {
    const userId = req.user.userId;
    const userDoc = await User.findById(req.user.userId).select("name").lean();     const userName = userDoc?.name || "Unknown";

    const hostedMeeting = await Meeting.findOne({ "host.userId": userId });
    const isHostSomewhere = !!hostedMeeting;

    if (!isHostSomewhere) {
      return res.json({ success: true, data: [userName] });
    }

    const meetings = await Meeting.find({ "host.userId": userId })
      .select("summary.actionItems")
      .lean();

    const assignees = new Set();
    meetings.forEach((meeting) => {
      meeting.summary?.actionItems?.forEach((item) => {
        if (item.assignee && item.assignee !== "Unassigned") {
          assignees.add(item.assignee);
        }
      });
    });

    res.json({ success: true, data: Array.from(assignees).sort() });
  } catch (error) {
    console.error("Error fetching assignees:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/action-items/host-meetings
 * Returns all meetings where the current user is the host (for the Add modal dropdown)
 */
router.get("/host-meetings", async (req, res) => {
  try {
    const userId = req.user.userId;

    const meetings = await Meeting.find({ "host.userId": userId })
      .select("meetingId title startedAt participants host")
      .sort({ startedAt: -1 })
      .lean();

    const result = meetings.map((m) => ({
      meetingId: m.meetingId,
      title: m.title || "Untitled Meeting",
      startedAt: m.startedAt,
      // Include participants list for the assignee dropdown
      participants: [
        { name: m.host.name, userId: m.host.userId, role: "host" },
        ...(m.participants || []).map((p) => ({
          name: p.name,
          userId: p.userId,
          role: "member",
        })),
      ].filter(
        (p, idx, self) => idx === self.findIndex((x) => x.userId === p.userId),
      ),
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching host meetings:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/action-items/:meetingId
 * Host only — manually add a new action item to a meeting
 */
router.post("/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.userId;
    const { title, description, assignee, priority, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Title is required" });
    }

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    if (!meeting.isHost(userId)) {
      return res
        .status(403)
        .json({ success: false, error: "Only the host can add action items" });
    }

    // Validate assignee is actually a participant of this meeting
    if (assignee && assignee !== "Unassigned") {
      const validNames = [
        meeting.host.name,
        ...(meeting.participants || []).map((p) => p.name),
      ];
      const isValidAssignee = validNames.some(
        (n) => n.toLowerCase() === assignee.toLowerCase(),
      );
      if (!isValidAssignee) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Assignee must be a meeting participant",
          });
      }
    }

    const newItem = {
      title: title.trim(),
      description: (description || "").trim(),
      assignee: assignee || "Unassigned",
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "open",
      createdAt: new Date(),
    };

    if (!meeting.summary) meeting.summary = {};
    if (!meeting.summary.actionItems) meeting.summary.actionItems = [];

    meeting.summary.actionItems.push(newItem);
    await meeting.save();

    // Return the saved item (with _id assigned by Mongoose)
    const saved =
      meeting.summary.actionItems[meeting.summary.actionItems.length - 1];
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error("Error adding action item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/action-items/:meetingId/:itemId
 * Host   → can update any field
 * Member → can only update status of items assigned to them
 */
router.put("/:meetingId/:itemId", async (req, res) => {
  try {
    const { meetingId, itemId } = req.params;
    const userId = req.user.userId;
    const userDoc = await User.findById(req.user.userId).select("name").lean();     const userName = userDoc?.name || "Unknown";

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting?.summary?.actionItems) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting or action items not found" });
    }

    const isHost = meeting.isHost(userId);
    const isMember = meeting.isParticipant(userId);

    if (!isHost && !isMember) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const itemIndex = meeting.summary.actionItems.findIndex(
      (item) => item._id.toString() === itemId,
    );
    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, error: "Action item not found" });
    }

    const item = meeting.summary.actionItems[itemIndex];

    if (!isHost) {
      const isAssignee =
        item.assignee?.toLowerCase() === userName.toLowerCase();
      if (!isAssignee) {
        return res
          .status(403)
          .json({
            success: false,
            error: "You can only update action items assigned to you",
          });
      }
      if (Object.keys(req.body).some((k) => k !== "status" && k !== "proofOfWork")) {
        return res
          .status(403)
          .json({ success: false, error: "Members can only update status" });
      }
    }

    // ✅ Apply all updates from request body to the item
    Object.keys(req.body).forEach((key) => {
      if (key === 'proofOfWork' && req.body.proofOfWork) {
        // Stamp completedAt on proofOfWork before saving
        meeting.summary.actionItems[itemIndex].proofOfWork = {
          note: req.body.proofOfWork.note || '',
          link: req.body.proofOfWork.link || '',
          completedAt: new Date()
        };
      } else {
        meeting.summary.actionItems[itemIndex][key] = req.body[key];
      }
    });

    const updatedItem = meeting.summary.actionItems[itemIndex];
    await meeting.save(); // single save — no duplicate

    // ✅ Send email to host when task is marked completed
    if (req.body.status === 'completed') {
      // Look up who completed the task
      const assigneeUser = await User.findById(userId).select('name email').lean().catch(() => null);
      const completedByName = assigneeUser?.name || item.assignee || 'A team member';

      try {
        let hostUser = null;

        // Strategy 1: findById (works when userId is a valid ObjectId string)
        try {
          hostUser = await User.findById(meeting.host.userId).select('name email').lean();
        } catch (_) { /* invalid ObjectId format — try next strategy */ }

        // Strategy 2: find by userId field stored as string
        if (!hostUser) {
          hostUser = await User.findOne({ _id: meeting.host.userId }).select('name email').lean().catch(() => null);
        }

        // Strategy 3: find by exact name match
        if (!hostUser) {
          hostUser = await User.findOne({ name: meeting.host.name }).select('name email').lean().catch(() => null);
        }

        // Strategy 4: find by case-insensitive name match
        if (!hostUser) {
          hostUser = await User.findOne({
            name: { $regex: `^${meeting.host.name.trim()}$`, $options: 'i' }
          }).select('name email').lean().catch(() => null);
        }

        if (hostUser?.email) {
          // Fire-and-forget — don't block the HTTP response
          sendActionItemCompletedEmail({
            hostEmail: hostUser.email,
            hostName: hostUser.name,
            assigneeName: completedByName,
            taskTitle: updatedItem.title,
            taskDescription: updatedItem.description,
            meetingTitle: meeting.title,
            meetingId: meeting.meetingId,
            proofOfWork: req.body.proofOfWork || null,
          })
            .then(() => console.log(`✅ Completion email sent to ${hostUser.email}`))
            .catch(err => console.error('❌ Completion email send error:', err.message));
        } else {
          console.warn(`⚠️ Host user not found in DB for meeting "${meeting.title}" — email skipped.`);
          console.warn(`   Tried userId: ${meeting.host.userId} | name: ${meeting.host.name}`);
        }
      } catch (emailErr) {
        console.error('❌ Could not send completion email:', emailErr.message);
      }
    }

    res.json({ success: true, data: updatedItem });
  } catch (error) {
    console.error("Error updating action item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/action-items/:meetingId/:itemId
 * Host only
 */
router.delete("/:meetingId/:itemId", async (req, res) => {
  try {
    const { meetingId, itemId } = req.params;
    const userId = req.user.userId;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting?.summary?.actionItems) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting or action items not found" });
    }

    if (!meeting.isHost(userId)) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only the host can delete action items",
        });
    }

    meeting.summary.actionItems = meeting.summary.actionItems.filter(
      (item) => item._id.toString() !== itemId,
    );

    await meeting.save();
    res.json({ success: true, message: "Action item deleted successfully" });
  } catch (error) {
    console.error("Error deleting action item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

