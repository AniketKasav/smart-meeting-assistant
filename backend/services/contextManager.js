// backend/services/contextManager.js - PHASE 7 ENHANCED
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');

class ContextManager {
  /**
   * Get or create conversation for user
   */
  async getOrCreateConversation(userId) {
    try {
      let conversation = await Conversation.findOne({ 
        userId, 
        isActive: true 
      });

      if (!conversation) {
        conversation = new Conversation({
          userId,
          messages: [],
          currentContext: {
            intent: null,
            pendingParams: {},
            collectedParams: {},
            nextQuestion: null,
            step: 0,
            isComplete: false
          }
        });
        await conversation.save();
      }

      return conversation;
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  /**
   * Add message to conversation
   */
  async addMessage(userId, role, content, intent = null, params = null) {
    try {
      const conversation = await this.getOrCreateConversation(userId);
      await conversation.addMessage(role, content, intent, params);
      return conversation;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getHistory(userId, limit = 5) {
    try {
      const conversation = await this.getOrCreateConversation(userId);
      return conversation.getRecentMessages(limit);
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  /**
   * Update multi-turn context
   */
  async updateContext(userId, contextUpdate) {
    try {
      const conversation = await this.getOrCreateConversation(userId);
      await conversation.updateContext(contextUpdate);
      return conversation.currentContext;
    } catch (error) {
      console.error('Error updating context:', error);
      throw error;
    }
  }

  /**
   * Get current context (for multi-turn)
   */
  async getCurrentContext(userId) {
    try {
      const conversation = await this.getOrCreateConversation(userId);
      return conversation.currentContext;
    } catch (error) {
      console.error('Error getting context:', error);
      return null;
    }
  }

  /**
   * Clear multi-turn context
   */
  async clearContext(userId) {
    try {
      const conversation = await this.getOrCreateConversation(userId);
      await conversation.clearContext();
      return true;
    } catch (error) {
      console.error('Error clearing context:', error);
      return false;
    }
  }

  /**
   * Get user context (meetings, tasks, etc.)
   */
  async getUserContext(userId) {
    try {
      const User = mongoose.model('User');
      const Meeting = mongoose.model('Meeting');
      const Task = mongoose.model('Task');

      const user = await User.findById(userId).select('name email');
      
      const upcomingMeetings = await Meeting.find({
        'participants.userId': userId,
        scheduledDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      }).select('title scheduledDate').limit(5);

      const recentMeetings = await Meeting.find({
        'participants.userId': userId,
        scheduledDate: { $lte: new Date() }
      })
      .sort({ scheduledDate: -1 })
      .limit(5)
      .select('title scheduledDate');

      const [pendingTasks, overdueTasks, totalTasks] = await Promise.all([
        Task.countDocuments({
          $or: [
            { 'assignee.userId': userId },
            { 'createdBy.userId': userId }
          ],
          status: 'pending'
        }),
        Task.countDocuments({
          $or: [
            { 'assignee.userId': userId },
            { 'createdBy.userId': userId }
          ],
          dueDate: { $lt: new Date() },
          status: { $ne: 'completed' }
        }),
        Task.countDocuments({
          $or: [
            { 'assignee.userId': userId },
            { 'createdBy.userId': userId }
          ]
        })
      ]);

      return {
        userName: user.name,
        userEmail: user.email,
        upcomingMeetings: upcomingMeetings.map(m => ({
          title: m.title,
          date: m.scheduledDate
        })),
        recentMeetings: recentMeetings.map(m => ({
          title: m.title,
          date: m.scheduledDate
        })),
        pendingTasks,
        overdueTasks,
        totalTasks
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {};
    }
  }

  /**
   * Clear entire conversation (reset)
   */
  async clearConversation(userId) {
    try {
      await Conversation.updateOne(
        { userId, isActive: true },
        { isActive: false }
      );
      return true;
    } catch (error) {
      console.error('Error clearing conversation:', error);
      return false;
    }
  }

  /**
   * Clean up expired conversations
   */
  async cleanupExpiredConversations() {
    try {
      const result = await Conversation.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      console.log(`Cleaned up ${result.deletedCount} expired conversations`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up conversations:', error);
      return 0;
    }
  }
}

module.exports = new ContextManager();