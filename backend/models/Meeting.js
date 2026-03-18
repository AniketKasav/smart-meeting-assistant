// backend/models/Meeting.js - FIXED VERSION
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
  // ✅ FIXED: Added owner field
  owner: {
    userId: String,
    name: String
  },
  // ✅ FIXED: Added audioPath and transcriptPath
  participants: [{
    userId: String,
    name: String,
    joinedAt: Date,
    audioPath: String,
    transcriptPath: String
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'archived'],
    default: 'in-progress'
  },
  // ✅ FIXED: Changed from startTime/endTime to startedAt/endedAt
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
  
  // AI-Generated Summary (only when user clicks "Generate Summary")
  summary: {
    text: String,                    // Executive summary
    generatedAt: Date,
    model: String,                   // AI model used (e.g., 'llama3.2')
    keyPoints: [String],             // Key discussion points
    decisions: [String],             // Decisions made
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
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    topics: [String],                // Keywords/tags
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    nextSteps: [String],             // Suggested next steps
    customPrompt: String             // If regenerated with custom prompt
  },
  
  // Analytics (for Phase 2)
  analytics: {
    totalWords: Number,
    speakingTime: Map,               // userId -> seconds
    turnsCount: Map,                 // userId -> number of turns
    fillerWordsCount: Map,           // userId -> filler count
    averageWPM: Map,                 // userId -> words per minute
    dominanceScore: Map              // userId -> participation score (0-100)
  }
}, {
  timestamps: true
});

// ✅ FIXED: Added addParticipant method
meetingSchema.methods.addParticipant = function(userId, userName) {
  const exists = this.participants.some(p => p.userId === userId);
  
  if (!exists) {
    this.participants.push({
      userId,
      name: userName,
      joinedAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Index for search
meetingSchema.index({ 
  title: 'text', 
  'summary.text': 'text',
  'summary.keyPoints': 'text',
  'summary.topics': 'text'
});

module.exports = mongoose.model('Meeting', meetingSchema);