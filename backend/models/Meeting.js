// backend/models/Meeting.js
const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    default: 'Untitled Meeting'
  },
  description: String,
  scheduledDate: String,
  scheduledTime: String,

  // ✅ HOST: The user who created/owns the meeting
  host: {
    userId: { type: String, required: true },
    name: { type: String, required: true }
  },

  // ✅ MEMBERS: All participants (including host)
  participants: [{
    userId: String,
    name: String,
    role: {
      type: String,
      enum: ['host', 'member'],
      default: 'member'
    },
    joinedAt: Date,
    audioPath: String,
    transcriptPath: String
  }],

  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'archived'],
    default: 'in-progress'
  },

  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  duration: Number, // in seconds

  audioFormat: {
    type: String,
    enum: ['wav', 'webm'],
    default: 'wav'
  },
  audioPath: String,
  transcriptPath: String,

  // Auto-generated sentiment (runs automatically after transcription)
  autoSentiment: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    confidence: Number,
    reason: String,
    analyzedAt: Date,
    model: String
  },

  // AI-Generated Summary (only host can trigger)
  summary: {
    text: String,
    generatedAt: Date,
    model: String,
    keyPoints: [String],
    decisions: [String],
    actionItems: [{
      title: String,
      description: String,
      assignee: {
        type: String,
        default: 'Unassigned'
      },
      dueDate: Date,
      status: {
        type: String,
        enum: ['open', 'in-progress', 'completed'],
        default: 'open'
      },
      priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
      },
      proofOfWork: {
        note: String,
        link: String,
        completedAt: Date
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    topics: [String],
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    nextSteps: [String],
    customPrompt: String
  },

  // Analytics (per participant)
  analytics: {
    totalWords: Number,
    speakingTime: Map,     // userId -> seconds
    turnsCount: Map,       // userId -> number of turns
    fillerWordsCount: Map, // userId -> filler count
    averageWPM: Map,       // userId -> words per minute
    dominanceScore: Map    // userId -> participation score (0-100)
  }
}, {
  timestamps: true
});

// ✅ Add participant as member (host added separately at creation)
meetingSchema.methods.addParticipant = function(userId, userName) {
  const exists = this.participants.some(p => p.userId === userId);

  if (!exists) {
    this.participants.push({
      userId,
      name: userName,
      role: 'member',
      joinedAt: new Date()
    });
    return this.save();
  }

  return Promise.resolve(this);
};

// ✅ Helper: check if a userId is the host
meetingSchema.methods.isHost = function(userId) {
  return this.host?.userId === userId;
};

// ✅ Helper: check if a userId is a participant (host or member)
meetingSchema.methods.isParticipant = function(userId) {
  return (
    this.host?.userId === userId ||
    this.participants.some(p => p.userId === userId)
  );
};

// ✅ Helper: get role of a userId ('host' | 'member' | null)
meetingSchema.methods.getRole = function(userId) {
  if (this.host?.userId === userId) return 'host';
  const p = this.participants.find(p => p.userId === userId);
  return p ? 'member' : null;
};

meetingSchema.index({
  title: 'text',
  'summary.text': 'text',
  'summary.keyPoints': 'text',
  'summary.topics': 'text'
});

module.exports = mongoose.model('Meeting', meetingSchema);
