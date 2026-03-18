// frontend/src/contexts/VoiceCommandContext.jsx - WITH TTS + PHASE 6 ENHANCED
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { intentMatcher } from '../utils/intentMatcher';
import { actionExecutor } from '../utils/actionExecutor';
import aiAssistantService from '../services/aiAssistantService';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useTextToSpeech from '../hooks/useTextToSpeech';
import { useNavigate } from 'react-router-dom';

const VoiceCommandContext = createContext();

export const useVoiceCommand = () => {
  const context = useContext(VoiceCommandContext);
  if (!context) {
    throw new Error('useVoiceCommand must be used within VoiceCommandProvider');
  }
  return context;
};

export const VoiceCommandProvider = ({ children }) => {
  const navigate = useNavigate();
  const [lastCommand, setLastCommand] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useAI, setUseAI] = useState(true);

  // Text-to-Speech
  const tts = useTextToSpeech();

  // Set navigate function in action executor
  useEffect(() => {
    actionExecutor.setNavigate(navigate);
  }, [navigate]);

  /**
   * Direct browser TTS API (no stale state)
   */
  const speakResponse = useCallback((text) => {
    if (!text || text.trim().length === 0) return;
    
    console.log('🔊 [TTS] Attempting to speak:', text.substring(0, 50));
    
    // Check browser support directly
    if (!('speechSynthesis' in window)) {
      console.error('❌ TTS not supported in browser');
      return;
    }

    // Check if enabled from localStorage directly
    const isEnabled = localStorage.getItem('tts_enabled') !== 'false';
    if (!isEnabled) {
      console.log('🔇 TTS disabled by user');
      return;
    }

    // Clean text
    const cleanText = text
      .replace(/\*/g, '')
      .replace(/[_#]/g, '')
      .replace(/https?:\/\/[^\s]+/g, 'link')
      .trim();

    console.log('✅ Creating utterance...');

    // Create utterance directly
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Wait for voices if needed
    const speak = () => {
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length === 0) {
        console.log('⏳ Waiting for voices...');
        setTimeout(speak, 100);
        return;
      }

      // Find English voice
      const voice = voices.find(v => v.lang.startsWith('en-US')) || voices[0];
      
      utterance.voice = voice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      console.log('🔊 Speaking with voice:', voice.name);
      
      utterance.onstart = () => console.log('▶️ Started speaking');
      utterance.onend = () => console.log('✅ Finished speaking');
      utterance.onerror = (e) => console.error('❌ TTS error:', e);
      
      window.speechSynthesis.speak(utterance);
    };

    speak();
  }, []);

  /**
   * Process command when speech recognition completes
   */
  const handleResult = useCallback(async (finalTranscript) => {
    if (!finalTranscript || finalTranscript.trim().length === 0) {
      return;
    }

    console.log('🎤 Processing voice command:', finalTranscript);
    await processCommand(finalTranscript);
  }, []);

  /**
   * Handle speech recognition errors
   */
  const handleError = useCallback((error) => {
    console.error('🔴 Speech recognition error:', error);
    const errorMsg = error.message || 'Speech recognition failed';
    
    setLastCommand({
      text: '',
      intent: 'ERROR',
      response: errorMsg,
      success: false
    });
    
    speakResponse(errorMsg);
    setIsProcessing(false);
  }, [speakResponse]);

  /**
   * Handle speech recognition end
   */
  const handleEnd = useCallback(() => {
    console.log('🛑 Speech recognition ended');
    setIsProcessing(false);
  }, []);

  // Initialize speech recognition
  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported,
    startListening: startSpeech,
    stopListening: stopSpeech,
    resetTranscript
  } = useSpeechRecognition({
    language: 'en-US',
    continuous: false,
    interimResults: true,
    onResult: handleResult,
    onError: handleError,
    onEnd: handleEnd
  });

  /**
   * ✨ PHASE 6 ENHANCED: Process voice command with hybrid routing
   */
  const processCommand = useCallback(async (text) => {
    try {
      setIsProcessing(true);
      const normalizedText = text.toLowerCase().trim();

      // ✨ PHASE 6: Check for AI-powered commands that need special handling
      const needsAIProcessing = [
        /^schedule\s*(a|an)?\s*meeting$/i,
        /^create\s*(a|an)?\s*meeting$/i,
        /^create\s*(a|an)?\s*task$/i,
        /^assign\s*(a|an)?\s*task$/i,
        /^summarize/i,  // ✨ NEW: Summarize commands
        /^assign\s*all/i,  // ✨ NEW: Bulk assign
        /^complete\s*all/i,  // ✨ NEW: Bulk complete
        /meetings?\s+about/i,  // ✨ NEW: Natural language search
        /meetings?\s+with.*from/i  // ✨ NEW: Natural language search
      ].some(pattern => pattern.test(normalizedText));

      // Route to AI for special commands
      if (needsAIProcessing) {
        console.log('🤖 Routing to AI for special processing');
        const aiResult = await aiAssistantService.processMessage(text);
        
        if (aiResult.success) {
          if (!aiResult.needsMoreInfo) {
            const actionResult = await actionExecutor.execute(
              aiResult.intent,
              aiResult.params
            );
            
            addToHistory({
              text,
              intent: aiResult.intent,
              method: 'ai',
              success: actionResult.success,
              timestamp: new Date().toISOString()
            });
            
            setLastCommand({
              text,
              intent: aiResult.intent,
              response: aiResult.response,
              suggestion: aiResult.suggestion,
              clarification: aiResult.clarification,
              success: true
            });
            
            speakResponse(aiResult.response);
            setIsProcessing(false);
            showToast(aiResult.response, 'success');
            
            return {
              success: true,
              method: 'ai',
              intent: aiResult.intent,
              response: aiResult.response
            };
          } else {
            setLastCommand({
              text,
              intent: aiResult.intent,
              response: aiResult.response,
              clarification: aiResult.clarification,
              needsMoreInfo: true,
              success: true
            });
            
            speakResponse(aiResult.clarification);
            setIsProcessing(false);
            showToast(aiResult.clarification, 'info');
            
            return {
              success: true,
              method: 'ai',
              needsMoreInfo: true,
              clarification: aiResult.clarification
            };
          }
        }
      }

      // Try pattern matching first for simple commands
      const patternMatch = intentMatcher.match(normalizedText);
      
      if (patternMatch && patternMatch.confidence > 0.8) {
        console.log('✅ Pattern match found:', patternMatch);
        const result = await actionExecutor.execute(
          patternMatch.intent,
          patternMatch.params
        );
        
        addToHistory({
          text,
          intent: patternMatch.intent,
          method: 'pattern',
          success: result.success,
          timestamp: new Date().toISOString()
        });
        
        const responseMsg = result.message || 'Command executed';
        
        setLastCommand({
          text,
          intent: patternMatch.intent,
          response: responseMsg,
          success: result.success
        });
        
        speakResponse(responseMsg);
        setIsProcessing(false);
        showToast(responseMsg, 'success');
        
        return {
          success: result.success,
          method: 'pattern',
          intent: patternMatch.intent,
          response: responseMsg
        };
      }

      // No pattern match - send to AI
      if (useAI) {
        console.log('🤖 No pattern match, sending to AI');
        const aiResult = await aiAssistantService.processMessage(text);
        
        if (aiResult.success) {
          if (!aiResult.needsMoreInfo) {
            const actionResult = await actionExecutor.execute(
              aiResult.intent,
              aiResult.params
            );
            
            addToHistory({
              text,
              intent: aiResult.intent,
              method: 'ai',
              success: actionResult.success,
              timestamp: new Date().toISOString()
            });
            
            setLastCommand({
              text,
              intent: aiResult.intent,
              response: aiResult.response,
              suggestion: aiResult.suggestion,
              clarification: aiResult.clarification,
              success: true
            });
            
            speakResponse(aiResult.response);
            setIsProcessing(false);
            showToast(aiResult.response, 'success');
            
            return {
              success: true,
              method: 'ai',
              intent: aiResult.intent,
              response: aiResult.response
            };
          } else {
            setLastCommand({
              text,
              intent: aiResult.intent,
              response: aiResult.response,
              clarification: aiResult.clarification,
              needsMoreInfo: true,
              success: true
            });
            
            speakResponse(aiResult.clarification);
            setIsProcessing(false);
            showToast(aiResult.clarification, 'info');
            
            return {
              success: true,
              method: 'ai',
              needsMoreInfo: true,
              clarification: aiResult.clarification
            };
          }
        }
      }

      // Both methods failed
      const errorMsg = 'I didn\'t understand that. Try "help" for commands.';
      
      setLastCommand({
        text,
        intent: 'UNKNOWN',
        response: errorMsg,
        success: false
      });

      addToHistory({
        text,
        intent: 'UNKNOWN',
        method: 'none',
        success: false,
        timestamp: new Date().toISOString()
      });

      speakResponse(errorMsg);
      setIsProcessing(false);
      showToast(errorMsg, 'error');
      
      return {
        success: false,
        error: 'Command not recognized'
      };

    } catch (error) {
      console.error('Command processing error:', error);
      const errorMsg = 'Failed to process command';
      
      speakResponse(errorMsg);
      setIsProcessing(false);
      showToast(errorMsg, 'error');
      
      return {
        success: false,
        error: error.message || errorMsg
      };
    }
  }, [useAI, speakResponse]);

  /**
   * Show toast notification
   */
  const showToast = useCallback((message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }, []);

  /**
   * Add command to history
   */
  const addToHistory = useCallback((command) => {
    setCommandHistory(prev => {
      const updated = [...prev, command];
      return updated.slice(-20);
    });
  }, []);

  /**
   * Start listening
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      const msg = 'Speech recognition not supported in this browser';
      showToast(msg, 'error');
      speakResponse(msg);
      return;
    }
    
    // Stop any ongoing speech before listening
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    resetTranscript();
    startSpeech();
    console.log('🎤 Started listening...');
  }, [isSupported, startSpeech, resetTranscript, speakResponse]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    stopSpeech();
    console.log('🛑 Stopped listening');
  }, [stopSpeech]);

  /**
   * Toggle AI enhancement
   */
  const toggleAI = useCallback(() => {
    setUseAI(prev => !prev);
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setCommandHistory([]);
  }, []);

  const value = {
    // State
    isListening,
    transcript: transcript || interimTranscript,
    lastCommand,
    commandHistory,
    isProcessing,
    useAI,
    isSupported,
    speechError,

    // TTS state
    tts,
    isSpeaking: tts.isSpeaking,
    
    // Methods
    processCommand,
    startListening,
    stopListening,
    toggleAI,
    clearHistory,
    
    // TTS methods
    speakResponse,
    cancelSpeech: () => window.speechSynthesis.cancel(),
    toggleTTS: tts.toggle
  };

  return (
    <VoiceCommandContext.Provider value={value}>
      {children}
    </VoiceCommandContext.Provider>
  );
};

export default VoiceCommandContext;
