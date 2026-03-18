import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import axios from 'axios';
import { Sparkles, ExternalLink, Calendar } from 'lucide-react';
import AIResponseDisplay from './AIResponseDisplay';

const API_BASE_URL = 'http://localhost:4000';

function AssistantBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text:
        "Hi 👋 I'm your AI meeting assistant!\n\n" +
        "I can answer questions like:\n\n" +
        "👤 **About Participants:**\n" +
        "• What did [Name] say in the last meeting?\n" +
        "• What did [Name] mention about [topic]?\n\n" +
        "✅ **Action Items & Tasks:**\n" +
        "• What are my action items?\n" +
        "• What tasks were assigned yesterday?\n" +
        "• Show action items from last meeting\n\n" +
        "📅 **Meeting Information:**\n" +
        "• Summarize yesterday's meeting\n" +
        "• What was discussed this week?\n" +
        "• Show meetings from last week\n\n" +
        "Ask me anything about your meetings!",
      intent: "GENERAL_HELP",
      confidence: 1.0,
      userMessage: "Hello", // Add default user message for welcome message
      timestamp: new Date().toISOString()
    },
  ]);
  const [sources, setSources] = useState([]);
  const [currentUserMessage, setCurrentUserMessage] = useState(""); // ✅ NEW: Track current user message

  const messagesEndRef = useRef(null);

  /* Auto-scroll when new message arrives */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  /* Close on ESC */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || typing) return;

    // ✅ FIXED: Store the user message BEFORE clearing input
    const userMessageText = trimmed;
    setCurrentUserMessage(userMessageText);

    // Add user message
    const userMessage = { 
      from: "user", 
      text: userMessageText,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSources([]);

    // Show typing indicator
    setTyping(true);

    try {
      // Call backend AI chatbot
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        message: userMessageText,
        conversationHistory: messages.slice(-6) // Send last 6 messages for context
      });

      if (response.data.success) {
        // ✅ FIXED: Store the user's original message for feedback
        const botMessage = {
          from: "bot",
          text: response.data.response,
          intent: response.data.intent || "GENERAL_HELP",
          confidence: response.data.confidence || 0.8,
          params: response.data.params || {},
          userMessage: userMessageText, // ✅ Now correctly stores user's question
          timestamp: new Date().toISOString()
        };
        
        setMessages((prev) => [...prev, botMessage]);
        
        // Store sources if available
        if (response.data.sources && response.data.sources.length > 0) {
          setSources(response.data.sources);
        }
        
        toast.success("Response generated");
      } else {
        throw new Error(response.data.error || 'Failed to get response');
      }

    } catch (error) {
      console.error('❌ Chat error:', error);
      
      let errorMessage = "Sorry, I couldn't process your request. ";
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage += "Make sure the backend server is running on port 4000.";
      } else if (error.response?.data?.message?.includes('Ollama')) {
        errorMessage += "Please make sure Ollama is running (http://localhost:11434).";
      } else {
        errorMessage += error.response?.data?.message || error.message || "Please try again.";
      }

      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: errorMessage,
          intent: "ERROR",
          confidence: 0,
          userMessage: userMessageText, // ✅ Also store for error messages
          timestamp: new Date().toISOString()
        }
      ]);
      
      toast.error("Failed to get response");
    } finally {
      setTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleAssistant = () => {
    setIsOpen((prev) => {
      const newState = !prev;
      toast(newState ? "Assistant opened" : "Assistant closed");
      return newState;
    });
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
    // Auto-send after a brief delay
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleAssistant}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/50 flex items-center justify-center text-sm font-semibold transition-all duration-150 hover:scale-105 group z-50"
        title="AI Meeting Assistant"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 w-[450px] bg-slate-900/95 border border-slate-700/50 rounded-2xl shadow-2xl shadow-purple-900/40 flex flex-col text-sm backdrop-blur-xl ring-1 ring-white/10 overflow-hidden max-h-[600px] z-50">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-base text-white">AI Meeting Assistant</h3>
                <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Powered by Ollama AI • Searches your meetings
              </p>
            </div>
            <button
              className="text-slate-400 hover:text-white transition-colors p-1"
              onClick={toggleAssistant}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-900/60 to-slate-950/80 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {messages.map((msg, i) => (
              <AIResponseDisplay
                key={i}
                message={msg.text}
                isUser={msg.from === "user"}
                intent={msg.intent}
                confidence={msg.confidence}
                userMessage={msg.userMessage} // ✅ Now correctly passes user's question
                params={msg.params || {}}
                messageIndex={i}
              />
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/50 text-xs text-slate-300 flex items-center gap-2 rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>AI is thinking...</span>
                </div>
              </div>
            )}

            {/* Sources */}
            {sources.length > 0 && !typing && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="font-medium">Sources:</span>
                </div>
                {sources.map((source, idx) => (
                  <div key={idx} className="text-xs bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {source.meetingTitle || source.title || 'Meeting'}
                        </p>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          {formatDate(source.meetingDate || source.date)}
                        </p>
                        {source.text && (
                          <p className="text-slate-400 text-[10px] mt-1 line-clamp-2">
                            {source.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Buttons */}
          {messages.length <= 2 && (
            <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50">
              <p className="text-xs text-slate-400 mb-2 font-medium">Quick Questions:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickQuestion("What are my action items?")}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg transition-colors text-left border border-slate-700/50"
                >
                  📋 My action items
                </button>
                <button
                  onClick={() => handleQuickQuestion("Summarize last meeting")}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg transition-colors text-left border border-slate-700/50"
                >
                  📝 Last meeting
                </button>
                <button
                  onClick={() => handleQuickQuestion("What was discussed yesterday?")}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg transition-colors text-left border border-slate-700/50"
                >
                  📅 Yesterday's meeting
                </button>
                <button
                  onClick={() => handleQuickQuestion("Show meetings this week")}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg transition-colors text-left border border-slate-700/50"
                >
                  🗓️ This week
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-800 px-4 py-3 bg-slate-950/80">
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs px-3 py-2 resize-none outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all text-white placeholder-slate-500"
              rows={2}
              placeholder='Ask me about your meetings... (e.g., "What were my action items?")'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={typing}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-slate-500">
                Press Enter to send, Shift+Enter for new line
              </p>
              <button
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg shadow-purple-900/30"
                disabled={!input.trim() || typing}
                onClick={handleSend}
              >
                {typing ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AssistantBubble;