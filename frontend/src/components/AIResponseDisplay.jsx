import { 
  Bot, User, Sparkles, AlertCircle, ThumbsUp, ThumbsDown, 
  XCircle, Volume2, VolumeX, Check 
} from 'lucide-react';
import { useState } from 'react';
import api from '../services/api';

const AIResponseDisplay = ({ 
  message, 
  isUser, 
  intent, 
  confidence,
  suggestion,
  clarification,
  onFeedback,
  messageIndex,
  multiTurn,
  isComplete,
  step,
  userMessage, // NEW: Original user message
  params        // NEW: Extracted parameters
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liked, setLiked] = useState(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const getIntentColor = () => {
    if (intent === 'ERROR') return 'text-red-600';
    if (intent === 'SUCCESS') return 'text-green-600';
    if (confidence && confidence > 0.8) return 'text-green-600';
    if (confidence && confidence > 0.5) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getIntentBg = () => {
    if (intent === 'ERROR') return 'bg-red-50 border-red-200';
    if (intent === 'SUCCESS') return 'bg-green-50 border-green-200';
    return 'bg-blue-50 border-blue-200';
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFeedback = async (type) => {
    setLiked(type);
    
    // Submit feedback to backend
    try {
      const feedbackData = {
        messageId: `msg_${messageIndex}_${Date.now()}`,
        feedbackType: type === 'like' ? 'like' : 'dislike',
        userMessage: userMessage || 'Unknown',
        aiResponse: message,
        intent: intent || 'UNKNOWN',
        params: params || {},
        confidence: confidence || 0.5,
        multiTurn: multiTurn || false,
        step: step || 1,
        comment: '' // Could add a modal for user comments
      };

      const response = await api.post('/assistant/feedback', feedbackData);
      
      if (response.data.success) {
        setFeedbackSubmitted(true);
        console.log('✅ Feedback submitted:', type);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }

    // Also call parent callback if exists
    if (onFeedback) {
      onFeedback(messageIndex, type);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end items-start space-x-3 mb-4 animate-slide-in-right">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-md shadow-md">
          <p className="text-sm">{message}</p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start items-start space-x-3 mb-4 animate-slide-in-left">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
        {multiTurn && !isComplete ? (
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      <div className="flex-1 max-w-2xl">
        <div className={`${getIntentBg()} border rounded-2xl rounded-tl-sm px-4 py-3 shadow-md transition-all duration-300 hover:shadow-lg`}>
          {/* Multi-turn indicator */}
          {multiTurn && (
            <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-gray-200">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">
                {isComplete ? '✓ Complete' : `Step ${step || 1}`}
              </span>
              {!isComplete && (
                <span className="text-xs text-gray-500">Multi-turn conversation</span>
              )}
            </div>
          )}

          {/* Intent badge */}
          {intent && intent !== 'GENERAL_HELP' && (
            <div className="flex items-center space-x-2 mb-2">
              <span className={`text-xs font-semibold ${getIntentColor()}`}>
                {intent.replace(/_/g, ' ')}
              </span>
              {confidence && (
                <span className="text-xs text-gray-500">
                  ({Math.round(confidence * 100)}% confidence)
                </span>
              )}
            </div>
          )}

          {/* Main message */}
          <p className="text-sm text-gray-800 leading-relaxed">{message}</p>

          {/* Clarification */}
          {clarification && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">{clarification}</p>
              </div>
            </div>
          )}

          {/* Suggestion */}
          {suggestion && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800">{suggestion}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              {/* TTS control */}
              <button
                onClick={handleSpeak}
                className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                title={isSpeaking ? "Stop" : "Speak"}
              >
                {isSpeaking ? (
                  <VolumeX className="w-4 h-4 text-gray-600 animate-pulse" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gray-600" />
                )}
              </button>

              {/* Feedback buttons */}
              <button
                onClick={() => handleFeedback('like')}
                disabled={feedbackSubmitted}
                className={`p-1.5 rounded-full transition-colors ${
                  liked === 'like' 
                    ? 'bg-green-100 text-green-600' 
                    : 'hover:bg-gray-200 text-gray-600'
                } ${feedbackSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={feedbackSubmitted ? "Feedback submitted" : "Helpful"}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleFeedback('dislike')}
                disabled={feedbackSubmitted}
                className={`p-1.5 rounded-full transition-colors ${
                  liked === 'dislike' 
                    ? 'bg-red-100 text-red-600' 
                    : 'hover:bg-gray-200 text-gray-600'
                } ${feedbackSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={feedbackSubmitted ? "Feedback submitted" : "Not helpful"}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>

              {/* Feedback confirmation */}
              {feedbackSubmitted && (
                <span className="text-xs text-green-600 ml-2">
                  ✓ Thank you!
                </span>
              )}
            </div>

            {/* Timestamp */}
            <span className="text-xs text-gray-400">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIResponseDisplay;