import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import aiAssistantService from '../services/aiAssistantService';
import { actionExecutor } from '../utils/actionExecutor';

const AssistantContext = createContext();

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider');
  }
  return context;
};

export const AssistantProvider = ({ children }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isAIAvailable, setIsAIAvailable] = useState(true);
  
  // Multi-turn state
  const [multiTurnActive, setMultiTurnActive] = useState(false);
  const [multiTurnContext, setMultiTurnContext] = useState(null);
  
  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Poll suggestions on mount
  // useEffect(() => {
  //   fetchSuggestions();
  //   const interval = setInterval(fetchSuggestions, 600000); // 10 min
  //   return () => clearInterval(interval);
  // }, []);

  useEffect(() => {
    // Suggestions disabled - fetch manually when needed
  }, []);

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    const result = await aiAssistantService.getSuggestions();
    if (result.success) {
      setSuggestions(result.suggestions);
    }
    setSuggestionsLoading(false);
  }, []);

  const processInput = useCallback(async (message) => {
    try {
      setIsProcessing(true);
      setError(null);

      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      setConversationHistory(prev => [...prev, userMessage]);

      const result = await aiAssistantService.processMessage(message);

      if (!result.success) {
        setError(result.error);
        setIsProcessing(false);
        return { success: false, error: result.error };
      }

      const assistantMessage = {
        role: 'assistant',
        content: result.response,
        intent: result.intent,
        action: result.action,
        confidence: result.confidence,
        suggestion: result.suggestion,
        clarification: result.clarification,
        timestamp: new Date().toISOString()
      };
      setConversationHistory(prev => [...prev, assistantMessage]);
      setCurrentResponse(result);

      // Multi-turn handling
      if (result.multiTurn && !result.isComplete) {
        setMultiTurnActive(true);
        setMultiTurnContext({
          intent: result.intent,
          step: result.step,
          collectedParams: result.params || {}
        });
      } else {
        setMultiTurnActive(false);
        setMultiTurnContext(null);
      }

      // Execute action if complete
      if (!result.needsMoreInfo && result.isComplete !== false) {
        await executeAction(result);
      }

      // Refresh suggestions after action
      fetchSuggestions();

      setIsProcessing(false);
      return { success: true, data: result };
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to process input');
      setIsProcessing(false);
      return { success: false, error: err.message };
    }
  }, []);

  const executeAction = useCallback(async (aiResponse) => {
    try {
      const { intent, action, params } = aiResponse;
      const result = await actionExecutor.execute(intent, params);
      return result;
    } catch (error) {
      console.error('Action execution error:', error);
      throw error;
    }
  }, []);

  const cancelMultiTurn = useCallback(async () => {
    const result = await aiAssistantService.cancelMultiTurn();
    if (result.success) {
      setMultiTurnActive(false);
      setMultiTurnContext(null);
    }
    return result;
  }, []);

  const getHistory = useCallback(async () => {
    try {
      const result = await aiAssistantService.getHistory();
      if (result.success) {
        setConversationHistory(result.history);
      }
      return result;
    } catch (error) {
      console.error('Get history error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const clearConversation = useCallback(async () => {
    try {
      const result = await aiAssistantService.clearConversation();
      if (result.success) {
        setConversationHistory([]);
        setCurrentResponse(null);
        setError(null);
        setMultiTurnActive(false);
        setMultiTurnContext(null);
      }
      return result;
    } catch (error) {
      console.error('Clear conversation error:', error);
      return { success: false };
    }
  }, []);

  const submitFeedback = useCallback(async (messageIndex, rating, comment) => {
    try {
      return await aiAssistantService.submitFeedback(messageIndex, rating, comment);
    } catch (error) {
      console.error('Submit feedback error:', error);
      return { success: false };
    }
  }, []);

  const checkAIHealth = useCallback(async () => {
    try {
      const health = await aiAssistantService.checkHealth();
      setIsAIAvailable(health.available && health.hasRequiredModel);
      return health;
    } catch (error) {
      setIsAIAvailable(false);
      return { available: false };
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setConversationHistory([]);
    setCurrentResponse(null);
    setError(null);
    setMultiTurnActive(false);
    setMultiTurnContext(null);
    aiAssistantService.startNewSession();
  }, []);

  const value = {
    isProcessing,
    currentResponse,
    conversationHistory,
    error,
    isAIAvailable,
    multiTurnActive,
    multiTurnContext,
    suggestions,
    suggestionsLoading,
    
    processInput,
    getHistory,
    clearConversation,
    submitFeedback,
    checkAIHealth,
    startNewConversation,
    cancelMultiTurn,
    fetchSuggestions
  };

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
};

export default AssistantContext;