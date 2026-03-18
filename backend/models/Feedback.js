// backend/models/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  // User who gave feedback
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Reference to conversation message
  messageId: {
    type: String,
    index: true
  },
  
  // What the user said
  userMessage: {
    type: String,
    required: true
  },
  
  // What AI responded
  aiResponse: {
    type: String,
    required: true
  },
  
  // AI intent detected
  intent: {
    type: String,
    required: true,
    index: true
  },
  
  // Parameters extracted
  params: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Feedback type: 'like' (thumbs up) or 'dislike' (thumbs down)
  feedbackType: {
    type: String,
    enum: ['like', 'dislike', 'correction'],
    required: true,
    index: true
  },
  
  // Optional user comment/correction
  comment: {
    type: String,
    default: ''
  },
  
  // What the user expected (for corrections)
  expectedIntent: {
    type: String
  },
  
  expectedParams: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // AI confidence score (0-1)
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Was this a multi-turn conversation?
  multiTurn: {
    type: Boolean,
    default: false
  },
  
  // Multi-turn step number
  step: {
    type: Number,
    default: 1
  },
  
  // Session info
  sessionId: {
    type: String,
    index: true
  },
  
  // Metadata
  metadata: {
    userAgent: String,
    platform: String,
    responseTime: Number, // ms
    timestamp: Date
  },
  
  // Learning status
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  appliedToLearning: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Indexes for analytics
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ intent: 1, feedbackType: 1 });
feedbackSchema.index({ createdAt: -1, processed: 1 });

// Methods
feedbackSchema.methods.markProcessed = async function() {
  this.processed = true;
  return this.save();
};

// Statics for analytics
feedbackSchema.statics.getIntentAccuracy = async function(intent = null) {
  const match = intent ? { intent } : {};
  
  const results = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$intent',
        total: { $sum: 1 },
        likes: {
          $sum: { $cond: [{ $eq: ['$feedbackType', 'like'] }, 1, 0] }
        },
        dislikes: {
          $sum: { $cond: [{ $eq: ['$feedbackType', 'dislike'] }, 1, 0] }
        },
        avgConfidence: { $avg: '$confidence' }
      }
    },
    {
      $project: {
        intent: '$_id',
        total: 1,
        likes: 1,
        dislikes: 1,
        accuracy: {
          $multiply: [
            { $divide: ['$likes', '$total'] },
            100
          ]
        },
        avgConfidence: { $round: ['$avgConfidence', 2] }
      }
    },
    { $sort: { total: -1 } }
  ]);
  
  return results;
};

feedbackSchema.statics.getRecentFeedback = async function(limit = 20) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .lean();
};

feedbackSchema.statics.getProblemAreas = async function() {
  return this.aggregate([
    { $match: { feedbackType: 'dislike' } },
    {
      $group: {
        _id: '$intent',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        examples: { $push: { userMessage: '$userMessage', aiResponse: '$aiResponse' } }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $project: {
        intent: '$_id',
        count: 1,
        avgConfidence: { $round: ['$avgConfidence', 2] },
        examples: { $slice: ['$examples', 3] }
      }
    }
  ]);
};

feedbackSchema.statics.getSuccessRate = async function(days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const results = await this.aggregate([
    { $match: { createdAt: { $gte: cutoff } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        likes: {
          $sum: { $cond: [{ $eq: ['$feedbackType', 'like'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        total: 1,
        likes: 1,
        successRate: {
          $multiply: [
            { $divide: ['$likes', '$total'] },
            100
          ]
        }
      }
    }
  ]);
  
  return results[0] || { total: 0, likes: 0, successRate: 0 };
};

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;