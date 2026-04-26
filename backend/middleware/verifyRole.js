// backend/middleware/verifyRole.js
const Meeting = require('../models/Meeting');

// ─── 1. USER-LEVEL ROLE CHECK (e.g. admin vs regular user) ───────────────────
// Usage: router.delete('/route', verifyRole('admin'), handler)
const verifyRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// ─── 2. MEETING HOST CHECK ────────────────────────────────────────────────────
// Usage: router.delete('/:meetingId', verifyMeetingHost, handler)
// Attaches: req.meeting
const verifyMeetingHost = async (req, res, next) => {
  try {
    const meetingId = req.params.meetingId || req.params.id;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    if (!meeting.isHost(userId)) {
      return res.status(403).json({ error: 'Only the host can perform this action' });
    }

    req.meeting = meeting;
    req.meetingRole = 'host';
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// ─── 3. MEETING PARTICIPANT CHECK (host OR member) ───────────────────────────
// Usage: router.get('/:meetingId', verifyMeetingParticipant, handler)
// Attaches: req.meeting, req.meetingRole ('host' | 'member')
const verifyMeetingParticipant = async (req, res, next) => {
  try {
    const meetingId = req.params.meetingId || req.params.id;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const role = meeting.getRole(userId);
    if (!role) {
      return res.status(403).json({ error: 'You are not a participant of this meeting' });
    }

    req.meeting = meeting;
    req.meetingRole = role; // 'host' or 'member'
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// ─── 4. ATTACH ROLE WITHOUT BLOCKING (for routes accessible to all) ──────────
// Usage: router.get('/:meetingId', attachMeetingRole, handler)
// Attaches: req.meeting, req.meetingRole (or null if not a participant)
const attachMeetingRole = async (req, res, next) => {
  try {
    const meetingId = req.params.meetingId || req.params.id;
    const userId = req.user?.userId;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    req.meeting = meeting;
    req.meetingRole = userId ? meeting.getRole(userId) : null;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

module.exports = {
  verifyRole,                 // user-level role check (existing)
  verifyMeetingHost,          // meeting host only
  verifyMeetingParticipant,   // host or member
  attachMeetingRole           // attach role without blocking
};
