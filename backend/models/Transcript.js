// backend/models/Transcript.js
const mongoose = require('mongoose');

const segmentSchema = new mongoose.Schema({
  start: { type: Number, required: true }, // seconds
  end: { type: Number, required: true },
  text: { type: String, required: true },
  speaker: String, // for future diarization
  confidence: Number,
  words: [{
    word: String,
    start: Number,
    end: Number,
    confidence: Number
  }]
}, { _id: false });

const transcriptSchema = new mongoose.Schema({
  meetingId: { 
    type: String, 
    required: true,
    index: true 
  },
  userId: String, // ✅ Made optional - not required for all transcripts
  userName: String,
  
  // File paths
  audioPath: String,
  transcriptFilePath: String, // path to transcript.json
  
  // Transcript data
  duration: { type: Number, required: true },
  segments: [segmentSchema],
  fullText: String, // concatenated text for search
  language: { type: String, default: 'en' },
  
  // Processing metadata
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'live'], // ✅ ADDED 'live'
    default: 'pending'
  },
  processingError: String,
  
  // Sentiment Analysis
  sentiment: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    confidence: Number,
    reason: String
  },
  
  // Statistics
  stats: {
    totalWords: Number,
    averageConfidence: Number,
    speakingDuration: Number, // seconds of actual speech
    silenceDuration: Number,
  },
  
  // Search optimization
  searchVector: String, // for text search
  
}, {
  timestamps: true
});

// Indexes
transcriptSchema.index({ meetingId: 1, userId: 1 });
transcriptSchema.index({ processingStatus: 1 });
// Add text index for full-text search
transcriptSchema.index({ fullText: 'text', 'segments.text': 'text' });

// Methods
transcriptSchema.methods.updateFromFile = async function(transcriptData) {
  this.duration = transcriptData.duration || 0;
  this.segments = transcriptData.segments || [];
  this.fullText = this.segments.map(s => s.text).join(' ');
  
  // Calculate stats
  this.stats = {
    totalWords: this.fullText.split(/\s+/).length,
    speakingDuration: this.segments.reduce((sum, s) => sum + (s.end - s.start), 0),
    averageConfidence: this.segments.reduce((sum, s) => sum + (s.confidence || 0), 0) / this.segments.length || 0
  };
  
  this.processingStatus = 'completed';
  return this.save();
};

// Static methods
transcriptSchema.statics.findByMeeting = function(meetingId) {
  return this.find({ meetingId, processingStatus: 'completed' })
    .sort({ createdAt: 1 });
};

transcriptSchema.statics.searchTranscripts = function(query, meetingId = null) {
  const searchQuery = {
    $text: { $search: query },
    processingStatus: 'completed'
  };
  
  if (meetingId) {
    searchQuery.meetingId = meetingId;
  }
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
};

module.exports = mongoose.model('Transcript', transcriptSchema);