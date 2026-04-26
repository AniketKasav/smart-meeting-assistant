// backend/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignee: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    email: String
  },
  createdBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String
  },
  dueDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  // Link to meeting if task was created from meeting
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },
  meetingTitle: String,
  // Tags for categorization
  tags: [String],
  // Attachments
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Comments/notes
  notes: [{
    content: String,
    author: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Reminder settings
  reminder: {
    enabled: Boolean,
    time: Date,
    sent: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
taskSchema.index({ 'assignee.userId': 1, status: 1 });
taskSchema.index({ 'createdBy.userId': 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ meetingId: 1 });
taskSchema.index({ status: 1, priority: 1 });

// Text search index
taskSchema.index({ 
  title: 'text', 
  description: 'text',
  tags: 'text'
});

// Virtual for checking if overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Method to mark as completed
taskSchema.methods.markComplete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method to assign to user
taskSchema.methods.assignTo = function(userId, userName, userEmail) {
  this.assignee = {
    userId,
    name: userName,
    email: userEmail
  };
  return this.save();
};

// Method to add note
taskSchema.methods.addNote = function(content, authorId, authorName) {
  this.notes.push({
    content,
    author: {
      userId: authorId,
      name: authorName
    },
    createdAt: new Date()
  });
  return this.save();
};

// Static method to get user's tasks with filters
taskSchema.statics.getUserTasks = async function(userId, filters = {}) {
  const query = {
    $or: [
      { 'assignee.userId': userId },
      { 'createdBy.userId': userId }
    ]
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.overdue) {
    query.dueDate = { $lt: new Date() };
    query.status = { $ne: 'completed' };
  }

  return this.find(query).sort({ createdAt: -1 });
};

// Static method to get meeting tasks
taskSchema.statics.getMeetingTasks = async function(meetingId) {
  return this.find({ meetingId }).sort({ priority: -1, dueDate: 1 });
};

module.exports = mongoose.model('Task', taskSchema);
