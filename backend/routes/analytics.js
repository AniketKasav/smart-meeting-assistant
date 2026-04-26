// backend/routes/analytics.js
const express = require("express");
const router = express.Router();
const Meeting = require("../models/Meeting");
const Transcript = require("../models/Transcript");
const authenticateToken = require("../middleware/authenticateToken");

router.use(authenticateToken);

function userMeetingQuery(userId, extra = {}) {
  return {
    $or: [{ "host.userId": userId }, { "participants.userId": userId }],
    ...extra,
  };
}

// ── Overview ──────────────────────────────────────────────────────────────────
router.get("/overview", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    const query = userMeetingQuery(userId);
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate);
      if (endDate) query.startedAt.$lte = new Date(endDate);
    }

    const meetings = await Meeting.find(query);
    const totalMeetings = meetings.length;
    const completedMeetings = meetings.filter(
      (m) => m.status === "completed",
    ).length;
    const totalDuration = meetings.reduce(
      (sum, m) => sum + (m.duration || 0),
      0,
    );
    const avgDuration = totalMeetings > 0 ? totalDuration / totalMeetings : 0;

    const allParticipants = new Set();
    meetings.forEach((m) =>
      m.participants.forEach((p) => allParticipants.add(p.userId)),
    );

    let totalActionItems = 0,
      completedActionItems = 0,
      overdueActionItems = 0;
    const now = new Date();
    meetings.forEach((m) => {
      if (!m.summary?.actionItems) return;
      totalActionItems += m.summary.actionItems.length;
      m.summary.actionItems.forEach((item) => {
        if (item.status === "completed") completedActionItems++;
        if (
          item.dueDate &&
          new Date(item.dueDate) < now &&
          item.status !== "completed"
        )
          overdueActionItems++;
      });
    });

    const sentimentCounts = {
      positive: meetings.filter(
        (m) =>
          (m.summary?.sentiment || m.autoSentiment?.sentiment) === "positive",
      ).length,
      neutral: meetings.filter(
        (m) =>
          (m.summary?.sentiment || m.autoSentiment?.sentiment) === "neutral",
      ).length,
      negative: meetings.filter(
        (m) =>
          (m.summary?.sentiment || m.autoSentiment?.sentiment) === "negative",
      ).length,
    };

    res.json({
      success: true,
      data: {
        totalMeetings,
        completedMeetings,
        totalDuration,
        avgDuration,
        totalParticipants: allParticipants.size,
        actionItems: {
          total: totalActionItems,
          completed: completedActionItems,
          overdue: overdueActionItems,
          completionRate:
            totalActionItems > 0
              ? Math.round((completedActionItems / totalActionItems) * 100)
              : 0,
        },
        sentiment: sentimentCounts,
      },
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ── Meetings over time ────────────────────────────────────────────────────────
router.get("/meetings-over-time", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const meetings = await Meeting.find(
      userMeetingQuery(userId, { startedAt: { $gte: startDate } }),
    ).sort({ startedAt: 1 });

    const byDate = {};
    meetings.forEach((m) => {
      const date = m.startedAt.toISOString().split("T")[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });

    res.json({
      success: true,
      data: Object.entries(byDate).map(([date, count]) => ({ date, count })),
    });
  } catch (error) {
    console.error("Meetings over time error:", error);
    res.status(500).json({ error: "Failed to fetch meeting trends" });
  }
});

// ── Speaking time ─────────────────────────────────────────────────────────────
router.get("/speaking-time", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetingId } = req.query;

    const query = {};
    if (meetingId) {
      const meeting = await Meeting.findOne({ meetingId });
      if (!meeting) return res.status(404).json({ error: "Meeting not found" });
      query.meetingId = meetingId;
    } else {
      const meetings = await Meeting.find(userMeetingQuery(userId)).select(
        "meetingId",
      );
      query.meetingId = { $in: meetings.map((m) => m.meetingId) };
    }

    const transcripts = await Transcript.find({
      ...query,
      processingStatus: { $in: ["completed", "live"] },
    });

    const speakingTime = {};
    transcripts.forEach((t) => {
      const name = t.userName || t.userId || "Unknown";
      const duration = t.segments.reduce(
        (sum, seg) => sum + Math.max(0, (seg.end || 0) - (seg.start || 0)),
        0,
      );
      speakingTime[name] = (speakingTime[name] || 0) + duration;
    });

    const total = Object.values(speakingTime).reduce((s, v) => s + v, 0);
    const data = Object.entries(speakingTime)
      .map(([name, duration]) => ({
        name,
        duration,
        percentage: total > 0 ? Math.round((duration / total) * 100) : 0,
      }))
      .sort((a, b) => b.duration - a.duration);

    res.json({ success: true, data });
  } catch (error) {
    console.error("Speaking time error:", error);
    res.status(500).json({ error: "Failed to fetch speaking time data" });
  }
});

// ── Meeting users performance ─────────────────────────────────────────────────
// Returns per-user performance stats for a specific meeting
router.get("/meeting-users", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetingId } = req.query;

    if (!meetingId)
      return res.status(400).json({ error: "meetingId required" });

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const transcripts = await Transcript.find({
      meetingId,
      processingStatus: { $in: ["completed", "live"] },
    });

    // Build per-user stats
    const userStats = {};

    // Seed from participants list
    meeting.participants.forEach((p) => {
      const name = p.name || p.userId;
      userStats[name] = {
        name,
        userId: p.userId,
        role: p.role || "member",
        speakingTime: 0,
        wordCount: 0,
        segmentCount: 0,
        assignedTasks: 0,
        completedTasks: 0,
      };
    });

    // Add host if not already there
    if (meeting.host?.name) {
      const hostName = meeting.host.name;
      if (!userStats[hostName]) {
        userStats[hostName] = {
          name: hostName,
          userId: meeting.host.userId,
          role: "host",
          speakingTime: 0,
          wordCount: 0,
          segmentCount: 0,
          assignedTasks: 0,
          completedTasks: 0,
        };
      }
    }

    // Fill speaking time from transcripts
    transcripts.forEach((t) => {
      const name = t.userName || t.userId || "Unknown";
      if (!userStats[name]) {
        userStats[name] = {
          name,
          userId: t.userId,
          role: "member",
          speakingTime: 0,
          wordCount: 0,
          segmentCount: 0,
          assignedTasks: 0,
          completedTasks: 0,
        };
      }
      const duration = t.segments.reduce(
        (sum, seg) => sum + Math.max(0, (seg.end || 0) - (seg.start || 0)),
        0,
      );
      userStats[name].speakingTime += duration;
      userStats[name].wordCount +=
        t.stats?.totalWords ||
        t.fullText?.split(/\s+/).filter(Boolean).length ||
        0;
      userStats[name].segmentCount += t.segments.length;
    });

    // Fill tasks from meeting summary
    if (meeting.summary?.actionItems) {
      meeting.summary.actionItems.forEach((item) => {
        const assignee = item.assignee;
        if (!assignee) return;
        const match = Object.values(userStats).find(
          (u) =>
            u.name.toLowerCase().includes(assignee.toLowerCase()) ||
            assignee.toLowerCase().includes(u.name.toLowerCase()),
        );
        if (match) {
          match.assignedTasks++;
          if (item.status === "completed") match.completedTasks++;
        }
      });
    }

    // Compute performance score per user
    const totalSpk = Object.values(userStats).reduce(
      (s, u) => s + u.speakingTime,
      0,
    );
    const users = Object.values(userStats)
      .map((u) => {
        const spkPct = totalSpk > 0 ? (u.speakingTime / totalSpk) * 100 : 0;
        // Score breakdown:
        // Speaking contribution: 40 pts
        const speakingScore = Math.min(40, spkPct * 1.5);
        // Task completion: 35 pts
        const taskScore =
          u.assignedTasks > 0
            ? Math.min(35, (u.completedTasks / u.assignedTasks) * 35)
            : 20; // neutral if no tasks assigned
        // Participation (word density): 25 pts
        const wpm =
          u.speakingTime > 0 ? u.wordCount / (u.speakingTime / 60) : 0;
        const engagementScore = Math.min(
          25,
          wpm > 0 ? Math.min(25, wpm / 6) : 15,
        );

        const performanceScore = Math.round(
          speakingScore + taskScore + engagementScore,
        );

        return {
          ...u,
          spkPct: Math.round(spkPct),
          wpm: Math.round(wpm),
          performanceScore: Math.min(100, Math.max(0, performanceScore)),
          taskCompletionRate:
            u.assignedTasks > 0
              ? Math.round((u.completedTasks / u.assignedTasks) * 100)
              : null,
        };
      })
      .sort((a, b) => b.performanceScore - a.performanceScore);

    res.json({
      success: true,
      data: {
        meetingId,
        title: meeting.title,
        duration: meeting.duration,
        totalSpeakingTime: totalSpk,
        users,
      },
    });
  } catch (error) {
    console.error("Meeting users error:", error);
    res.status(500).json({ error: "Failed to fetch meeting user performance" });
  }
});

// ── Action items ──────────────────────────────────────────────────────────────
router.get("/action-items", async (req, res) => {
  try {
    const userId = req.user.userId;
    const userName = req.user.name;
    const { status } = req.query;

    const meetings = await Meeting.find(userMeetingQuery(userId));
    const allActionItems = [];
    const now = new Date();

    meetings.forEach((m) => {
      if (!m.summary?.actionItems) return;
      const isHost = m.host?.userId === userId;
      m.summary.actionItems.forEach((item) => {
        if (!isHost && item.assignee?.toLowerCase() !== userName?.toLowerCase())
          return;
        allActionItems.push({
          ...item.toObject(),
          meetingId: m.meetingId,
          meetingTitle: m.title,
        });
      });
    });

    const filtered = status
      ? allActionItems.filter((i) => i.status === status)
      : allActionItems;

    res.json({
      success: true,
      data: {
        total: allActionItems.length,
        byStatus: {
          open: allActionItems.filter((i) => i.status === "open").length,
          "in-progress": allActionItems.filter(
            (i) => i.status === "in-progress",
          ).length,
          completed: allActionItems.filter((i) => i.status === "completed")
            .length,
        },
        byPriority: {
          high: allActionItems.filter((i) => i.priority === "high").length,
          medium: allActionItems.filter((i) => i.priority === "medium").length,
          low: allActionItems.filter((i) => i.priority === "low").length,
        },
        overdue: allActionItems.filter(
          (i) =>
            i.dueDate && new Date(i.dueDate) < now && i.status !== "completed",
        ).length,
        items: filtered.slice(0, 50),
      },
    });
  } catch (error) {
    console.error("Action items analytics error:", error);
    res.status(500).json({ error: "Failed to fetch action items data" });
  }
});

// ── Sentiment trends ──────────────────────────────────────────────────────────
router.get("/sentiment-trends", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const meetings = await Meeting.find(
      userMeetingQuery(userId, { startedAt: { $gte: startDate } }),
    ).sort({ startedAt: 1 });

    const byDate = {};
    meetings.forEach((m) => {
      const date = m.startedAt.toISOString().split("T")[0];
      if (!byDate[date])
        byDate[date] = { positive: 0, neutral: 0, negative: 0 };
      const s = m.summary?.sentiment || m.autoSentiment?.sentiment || "neutral";
      byDate[date][s]++;
    });

    res.json({
      success: true,
      data: Object.entries(byDate).map(([date, s]) => ({
        date,
        ...s,
        total: s.positive + s.neutral + s.negative,
      })),
    });
  } catch (error) {
    console.error("Sentiment trends error:", error);
    res.status(500).json({ error: "Failed to fetch sentiment trends" });
  }
});

// ── All-users performance (used by Per User tab) ─────────────────────────────
router.get("/all-users-performance", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all meetings the requester is part of
    const meetings = await Meeting.find(userMeetingQuery(userId)).lean();
    if (!meetings.length) return res.json({ success: true, data: [] });

    const allMeetingIds = meetings.map((m) => m.meetingId);

    // Get all transcripts for these meetings
    const transcripts = await Transcript.find({
      meetingId: { $in: allMeetingIds },
      processingStatus: { $in: ["completed", "live"] },
    }).lean();

    // ── Accumulate per-user stats ──────────────────────────────────────────────
    const userMap = {}; // keyed by name (lowercase for merging)

    const ensureUser = (name, uid = null) => {
      const key = name.toLowerCase();
      if (!userMap[key]) {
        userMap[key] = {
          name,
          userId: uid,
          meetingSet: new Set(),
          speakingSeconds: 0,
          wordCount: 0,
          segmentCount: 0,
          assignedTasks: 0,
          completedOnTime: 0,   // completed before or on dueDate
          completedLate: 0,     // completed but after dueDate
          completedNoDue: 0,    // completed with no dueDate
          overdueTasks: 0,      // not completed + past dueDate
          openTasks: 0,
        };
      }
      if (uid && !userMap[key].userId) userMap[key].userId = uid;
      return userMap[key];
    };

    // Seed all participants from meetings so users with no transcripts appear
    meetings.forEach((m) => {
      const hostEntry = ensureUser(m.host.name, m.host.userId);
      hostEntry.meetingSet.add(m.meetingId);

      (m.participants || []).forEach((p) => {
        const e = ensureUser(p.name, p.userId);
        e.meetingSet.add(m.meetingId);
      });
    });

    // Fill speaking time from transcripts
    transcripts.forEach((t) => {
      const name = t.userName || "Unknown";
      const e = ensureUser(name, t.userId);
      e.meetingSet.add(t.meetingId);

      t.segments.forEach((seg) => {
        const dur = Math.max(0, (seg.end || 0) - (seg.start || 0));
        e.speakingSeconds += dur;
        const words = (seg.text || "").split(/\s+/).filter(Boolean).length;
        e.wordCount += words;
        e.segmentCount++;
      });
    });

    // Fill task stats from meetings
    const now = new Date();
    meetings.forEach((m) => {
      if (!m.summary?.actionItems?.length) return;
      m.summary.actionItems.forEach((item) => {
        if (!item.assignee || item.assignee === "Unassigned") return;

        // Find matching user entry by name
        const matchKey = Object.keys(userMap).find(
          (k) =>
            k.includes(item.assignee.toLowerCase()) ||
            item.assignee.toLowerCase().includes(k),
        );
        if (!matchKey) return;
        const e = userMap[matchKey];
        e.assignedTasks++;

        if (item.status === "completed") {
          if (!item.dueDate) {
            e.completedNoDue++;
          } else if (new Date(item.proofOfWork?.completedAt || now) <= new Date(item.dueDate)) {
            e.completedOnTime++;
          } else {
            e.completedLate++;
          }
        } else {
          if (item.dueDate && new Date(item.dueDate) < now) {
            e.overdueTasks++;
          } else {
            e.openTasks++;
          }
        }
      });
    });

    // ── Compute total speaking seconds across all users (for contribution %) ──
    const totalSpkSeconds = Object.values(userMap).reduce(
      (s, u) => s + u.speakingSeconds,
      0,
    );

    // ── Score formula (genuine, no randomness) ────────────────────────────────
    // Component 1 – Speaking Contribution  (max 30 pts)
    //   % of total speaking time across all users
    // Component 2 – Task Completion Rate   (max 35 pts)
    //   (completed tasks / assigned tasks) × 35
    // Component 3 – On-Time Delivery       (max 20 pts)
    //   (completedOnTime / completed) × 20; penalise overdue
    // Component 4 – Meeting Attendance     (max 15 pts)
    //   meetings attended relative to the user with most meetings
    const maxMeetings = Math.max(
      ...Object.values(userMap).map((u) => u.meetingSet.size),
      1,
    );

    const result = Object.values(userMap).map((u) => {
      const spkPct = totalSpkSeconds > 0
        ? (u.speakingSeconds / totalSpkSeconds) * 100
        : 0;
      const comp1 = Math.min(30, spkPct * 1.5);

      const totalCompleted = u.completedOnTime + u.completedLate + u.completedNoDue;
      const comp2 = u.assignedTasks > 0
        ? Math.min(35, (totalCompleted / u.assignedTasks) * 35)
        : 17; // neutral 50% if no tasks assigned yet

      const comp3_raw = totalCompleted > 0
        ? (u.completedOnTime / totalCompleted) * 20
        : 10; // neutral if no completed tasks
      // Penalise overdue: -3 per overdue task, floored at 0
      const comp3 = Math.max(0, comp3_raw - u.overdueTasks * 3);

      const comp4 = (u.meetingSet.size / maxMeetings) * 15;

      const score = Math.round(Math.min(100, Math.max(0,
        comp1 + comp2 + comp3 + comp4,
      )));

      const wpm = u.speakingSeconds > 0
        ? Math.round(u.wordCount / (u.speakingSeconds / 60))
        : 0;

      return {
        name: u.name,
        userId: u.userId,
        meetings: u.meetingSet.size,
        speakingSeconds: Math.round(u.speakingSeconds),
        speakingTime: Math.round(u.speakingSeconds), // alias for frontend compat
        speakingPct: Math.round(spkPct),
        wordCount: u.wordCount,
        wpm,
        assignedTasks: u.assignedTasks,
        completedTasks: totalCompleted,
        completedOnTime: u.completedOnTime,
        completedLate: u.completedLate,
        overdueTasks: u.overdueTasks,
        openTasks: u.openTasks,
        taskCompletionRate: u.assignedTasks > 0
          ? Math.round((totalCompleted / u.assignedTasks) * 100)
          : null,
        onTimeRate: totalCompleted > 0
          ? Math.round((u.completedOnTime / totalCompleted) * 100)
          : null,
        performanceScore: score,
        scoreBreakdown: {
          speakingContribution: Math.round(comp1),
          taskCompletion: Math.round(comp2),
          onTimeDelivery: Math.round(comp3),
          attendance: Math.round(comp4),
        },
      };
    });

    result.sort((a, b) => b.performanceScore - a.performanceScore);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("All-users performance error:", error);
    res.status(500).json({ error: "Failed to fetch user performance" });
  }
});

module.exports = router;
