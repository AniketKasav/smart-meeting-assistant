// backend/services/learningService.js
const Feedback = require('../models/Feedback');

class LearningService {
  /**
   * Get comprehensive analytics dashboard data
   */
  async getAnalytics(days = 7) {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      // Overall success rate
      const successRate = await Feedback.getSuccessRate(days);

      // Intent accuracy breakdown
      const intentAccuracy = await Feedback.getIntentAccuracy();

      // Problem areas (most dislikes)
      const problemAreas = await Feedback.getProblemAreas();

      // Recent feedback
      const recentFeedback = await Feedback.getRecentFeedback(10);

      // Trend over time
      const trend = await this.getFeedbackTrend(days);

      // Common corrections
      const corrections = await this.getCommonCorrections();

      return {
        success: true,
        data: {
          overview: {
            totalFeedback: successRate.total,
            likes: successRate.likes,
            dislikes: successRate.total - successRate.likes,
            successRate: Math.round(successRate.successRate),
            period: `Last ${days} days`
          },
          intentAccuracy,
          problemAreas,
          recentFeedback,
          trend,
          corrections,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Analytics error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get feedback trend over time
   */
  async getFeedbackTrend(days = 7) {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const trend = await Feedback.aggregate([
        { $match: { createdAt: { $gte: cutoff } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            total: { $sum: 1 },
            likes: {
              $sum: { $cond: [{ $eq: ['$feedbackType', 'like'] }, 1, 0] }
            },
            dislikes: {
              $sum: { $cond: [{ $eq: ['$feedbackType', 'dislike'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.date': 1 } },
        {
          $project: {
            date: '$_id.date',
            total: 1,
            likes: 1,
            dislikes: 1,
            successRate: {
              $multiply: [
                { $divide: ['$likes', '$total'] },
                100
              ]
            }
          }
        }
      ]);

      return trend;
    } catch (error) {
      console.error('Trend calculation error:', error);
      return [];
    }
  }

  /**
   * Get common user corrections
   */
  async getCommonCorrections() {
    try {
      const corrections = await Feedback.find({
        feedbackType: 'correction',
        expectedIntent: { $exists: true }
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Group by intent mismatch
      const grouped = corrections.reduce((acc, curr) => {
        const key = `${curr.intent} → ${curr.expectedIntent}`;
        if (!acc[key]) {
          acc[key] = {
            from: curr.intent,
            to: curr.expectedIntent,
            count: 0,
            examples: []
          };
        }
        acc[key].count++;
        if (acc[key].examples.length < 3) {
          acc[key].examples.push({
            userMessage: curr.userMessage,
            aiResponse: curr.aiResponse
          });
        }
        return acc;
      }, {});

      return Object.values(grouped).sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Corrections analysis error:', error);
      return [];
    }
  }

  /**
   * Get improvement suggestions based on feedback
   */
  async getImprovementSuggestions() {
    try {
      const problemAreas = await Feedback.getProblemAreas();
      const corrections = await this.getCommonCorrections();

      const suggestions = [];

      // Suggest based on problem areas
      problemAreas.forEach(area => {
        if (area.count > 5) {
          suggestions.push({
            type: 'accuracy',
            priority: 'high',
            intent: area.intent,
            issue: `${area.count} dislikes with avg confidence ${area.avgConfidence}`,
            suggestion: `Review and improve ${area.intent} intent detection. Consider adding more training examples.`,
            examples: area.examples
          });
        }
      });

      // Suggest based on common corrections
      corrections.forEach(correction => {
        if (correction.count > 3) {
          suggestions.push({
            type: 'misclassification',
            priority: 'medium',
            issue: `Users correcting ${correction.from} to ${correction.to} (${correction.count} times)`,
            suggestion: `Add disambiguation rules or update prompts to better distinguish between ${correction.from} and ${correction.to}`,
            examples: correction.examples
          });
        }
      });

      return {
        success: true,
        suggestions,
        count: suggestions.length
      };
    } catch (error) {
      console.error('Improvement suggestions error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process unprocessed feedback for learning
   */
  async processFeedback() {
    try {
      const unprocessed = await Feedback.find({ processed: false })
        .limit(100)
        .lean();

      console.log(`📚 Processing ${unprocessed.length} feedback items...`);

      // Analyze patterns
      const patterns = this.analyzeFeedbackPatterns(unprocessed);

      // Mark as processed
      await Feedback.updateMany(
        { processed: false },
        { $set: { processed: true } }
      );

      console.log('✅ Feedback processed successfully');

      return {
        success: true,
        processed: unprocessed.length,
        patterns
      };
    } catch (error) {
      console.error('Feedback processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze feedback patterns
   */
  analyzeFeedbackPatterns(feedbackItems) {
    const patterns = {
      lowConfidenceFailures: [],
      highConfidenceFailures: [],
      multiTurnIssues: [],
      parameterErrors: []
    };

    feedbackItems.forEach(item => {
      if (item.feedbackType === 'dislike') {
        // Low confidence failures
        if (item.confidence < 0.6) {
          patterns.lowConfidenceFailures.push({
            intent: item.intent,
            confidence: item.confidence,
            message: item.userMessage
          });
        }

        // High confidence failures (unexpected)
        if (item.confidence > 0.8) {
          patterns.highConfidenceFailures.push({
            intent: item.intent,
            confidence: item.confidence,
            message: item.userMessage,
            response: item.aiResponse
          });
        }

        // Multi-turn issues
        if (item.multiTurn) {
          patterns.multiTurnIssues.push({
            intent: item.intent,
            step: item.step,
            message: item.userMessage
          });
        }

        // Parameter extraction errors
        if (item.comment && item.comment.includes('wrong')) {
          patterns.parameterErrors.push({
            intent: item.intent,
            params: item.params,
            message: item.userMessage,
            issue: item.comment
          });
        }
      }
    });

    return patterns;
  }

  /**
   * Get intent performance comparison
   */
  async compareIntentPerformance() {
    try {
      const intentStats = await Feedback.getIntentAccuracy();

      // Calculate averages
      const avgAccuracy = intentStats.reduce((sum, stat) => sum + stat.accuracy, 0) / intentStats.length || 0;
      const avgConfidence = intentStats.reduce((sum, stat) => sum + stat.avgConfidence, 0) / intentStats.length || 0;

      // Identify best and worst performers
      const best = intentStats.filter(stat => stat.accuracy > avgAccuracy).slice(0, 5);
      const worst = intentStats.filter(stat => stat.accuracy < avgAccuracy).slice(0, 5);

      return {
        success: true,
        data: {
          all: intentStats,
          averages: {
            accuracy: Math.round(avgAccuracy),
            confidence: Math.round(avgConfidence * 100) / 100
          },
          bestPerformers: best,
          worstPerformers: worst
        }
      };
    } catch (error) {
      console.error('Intent comparison error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export feedback data for analysis
   */
  async exportFeedbackData(format = 'json') {
    try {
      const feedback = await Feedback.find()
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();

      if (format === 'csv') {
        // Convert to CSV
        const csv = this.convertToCSV(feedback);
        return {
          success: true,
          data: csv,
          format: 'csv'
        };
      }

      return {
        success: true,
        data: feedback,
        format: 'json',
        count: feedback.length
      };
    } catch (error) {
      console.error('Export error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert feedback to CSV format
   */
  convertToCSV(data) {
    const headers = ['Date', 'User ID', 'Intent', 'Confidence', 'Feedback', 'Message', 'Response'];
    const rows = data.map(item => [
      new Date(item.createdAt).toISOString(),
      item.userId,
      item.intent,
      item.confidence,
      item.feedbackType,
      item.userMessage.replace(/,/g, ';'),
      item.aiResponse.replace(/,/g, ';')
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

module.exports = new LearningService();