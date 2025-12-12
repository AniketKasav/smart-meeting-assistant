// backend/models/Meeting.js
const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'participant' }, // 'host', 'participant'
  joinedAt: { type: Date, default: Date.now },
  audioPath: String, // path to user's combined audio
  transcriptPath: String, // path to user's transcript
});

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
  owner: {
    userId: String,
    name: String
  },
  participants: [participantSchema],
  status: { 
    type: String, 
    enum: ['scheduled', 'in-progress', 'completed', 'archived'],
    default: 'scheduled'
  },
  settings: {
    recording: { type: Boolean, default: true },
    autoTranscribe: { type: Boolean, default: true },
    recordingFormat: { type: String, default: 'wav' }
  },
  duration: Number, // in seconds
  startedAt: Date,
  endedAt: Date,
  summary: {
    text: String,
    generatedAt: Date,
    actionItems: [{
      title: String,
      description: String,
      assignee: String,
      dueDate: Date,
      status: { type: String, default: 'open' }, // 'open', 'completed'
      createdAt: { type: Date, default: Date.now }
    }],
    keyTopics: [String],
    sentiment: String // 'positive', 'neutral', 'negative'
  },
  analytics: {
    totalWords: Number,
    speakingTime: Map, // userId -> seconds
    turnsCount: Map, // userId -> number of speaking turns
    fillerWordsCount: Map, // userId -> count
  }
}, {
  timestamps: true // adds createdAt and updatedAt
});

// Indexes for faster queries
meetingSchema.index({ 'owner.userId': 1, createdAt: -1 });
meetingSchema.index({ status: 1, createdAt: -1 });
meetingSchema.index({ 'participants.userId': 1 });

// Methods
meetingSchema.methods.addParticipant = function(userId, name, role = 'participant') {
  const existing = this.participants.find(p => p.userId === userId);
  if (!existing) {
    this.participants.push({ userId, name, role });
  }
  return this.save();
};

meetingSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  if (newStatus === 'in-progress' && !this.startedAt) {
    this.startedAt = new Date();
  } else if (newStatus === 'completed' && !this.endedAt) {
    this.endedAt = new Date();
    if (this.startedAt) {
      this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    }
  }
  return this.save();
};

module.exports = mongoose.model('Meeting', meetingSchema);