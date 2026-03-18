const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Conversation history
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    intent: String,
    params: mongoose.Schema.Types.Mixed
  }],
  
  // Current context for multi-turn
  currentContext: {
    intent: String,
    pendingParams: mongoose.Schema.Types.Mixed,
    collectedParams: mongoose.Schema.Types.Mixed,
    nextQuestion: String,
    step: {
      type: Number,
      default: 0
    },
    isComplete: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadata
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
}, {
  timestamps: true
});

// Index for cleanup
conversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
conversationSchema.methods.addMessage = function(role, content, intent = null, params = null) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    intent,
    params
  });
  this.lastInteraction = new Date();
  return this.save();
};

conversationSchema.methods.updateContext = function(contextUpdate) {
  this.currentContext = {
    ...this.currentContext,
    ...contextUpdate
  };
  this.lastInteraction = new Date();
  return this.save();
};

conversationSchema.methods.clearContext = function() {
  this.currentContext = {
    intent: null,
    pendingParams: {},
    collectedParams: {},
    nextQuestion: null,
    step: 0,
    isComplete: false
  };
  return this.save();
};

conversationSchema.methods.getRecentMessages = function(limit = 5) {
  return this.messages.slice(-limit);
};

module.exports = mongoose.model('Conversation', conversationSchema);