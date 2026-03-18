// frontend/src/components/MeetingSummary.jsx
import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Clock, 
  User, 
  TrendingUp,
  Lightbulb,
  Tag,
  Smile,
  Meh,
  Frown,
  Trash2,
  RefreshCw,
  Download
} from 'lucide-react';

const MeetingSummary = ({ summary, onRegenerate, onDelete, onUpdateActionItem, isRegenerating }) => {
  const [editingItem, setEditingItem] = useState(null);

  if (!summary) {
    return null;
  }

  // Sentiment icon mapper
  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-5 h-5 text-green-500" />;
      case 'negative': return <Frown className="w-5 h-5 text-red-500" />;
      default: return <Meh className="w-5 h-5 text-yellow-500" />;
    }
  };

  // Priority color mapper
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // Toggle action item status
  const toggleActionItem = (index, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'open' : 'completed';
    onUpdateActionItem(index, { status: newStatus });
  };

  // Download summary as text
  const downloadSummary = () => {
    let content = `MEETING SUMMARY\n`;
    content += `Generated: ${new Date(summary.generatedAt).toLocaleString()}\n\n`;
    content += `EXECUTIVE SUMMARY\n${summary.text}\n\n`;
    
    if (summary.keyPoints?.length > 0) {
      content += `KEY POINTS\n${summary.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n`;
    }
    
    if (summary.decisions?.length > 0) {
      content += `DECISIONS MADE\n${summary.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\n`;
    }
    
    if (summary.actionItems?.length > 0) {
      content += `ACTION ITEMS\n`;
      summary.actionItems.forEach((item, i) => {
        content += `${i + 1}. [${item.status.toUpperCase()}] ${item.title}\n`;
        content += `   Assignee: ${item.assignee}\n`;
        content += `   Priority: ${item.priority}\n\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-summary-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">AI-Generated Summary</h3>
            <p className="text-sm text-slate-400">
              Generated on {new Date(summary.generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={downloadSummary}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h4 className="text-lg font-semibold text-white mb-3">Executive Summary</h4>
        <p className="text-slate-300 leading-relaxed">{summary.text}</p>
      </div>

      {/* Sentiment & Topics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sentiment */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            {getSentimentIcon(summary.sentiment)}
            <div>
              <p className="text-sm text-slate-400">Meeting Sentiment</p>
              <p className="text-lg font-semibold text-white capitalize">{summary.sentiment}</p>
            </div>
          </div>
        </div>

        {/* Topics */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-5 h-5 text-blue-400" />
            <p className="text-sm text-slate-400">Topics Discussed</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.topics?.map((topic, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm border border-blue-500/30"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Key Points */}
      {summary.keyPoints?.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Key Discussion Points
          </h4>
          <ul className="space-y-3">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-sm font-semibold border border-green-500/30">
                  {i + 1}
                </span>
                <p className="text-slate-300 flex-1">{point}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decisions Made */}
      {summary.decisions?.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
            Decisions Made
          </h4>
          <ul className="space-y-3">
            {summary.decisions.map((decision, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 flex-1">{decision}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {summary.actionItems?.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" />
            Action Items
          </h4>
          <div className="space-y-3">
            {summary.actionItems.map((item, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  item.status === 'completed'
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-slate-700/50 border-slate-600'
                } transition-all`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleActionItem(i, item.status)}
                    className="flex-shrink-0 mt-1"
                  >
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 hover:text-slate-300" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h5 className={`font-semibold ${
                        item.status === 'completed' 
                          ? 'text-slate-400 line-through' 
                          : 'text-white'
                      }`}>
                        {item.title}
                      </h5>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-slate-400 mb-2">{item.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-slate-400">
                        <User className="w-4 h-4" />
                        <span>{item.assignee}</span>
                      </div>
                      {item.dueDate && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {summary.nextSteps?.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Suggested Next Steps
          </h4>
          <ul className="space-y-2">
            {summary.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-yellow-400 font-bold">→</span>
                <p className="text-slate-300">{step}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MeetingSummary;