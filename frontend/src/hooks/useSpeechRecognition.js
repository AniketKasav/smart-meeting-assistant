// frontend/src/hooks/useSpeechRecognition.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { checkSpeechRecognitionSupport } from '../utils/browserSupport';

export const useSpeechRecognition = (options = {}) => {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
    maxAlternatives = 1,
    onResult = null,
    onError = null,
    onEnd = null
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Initialize speech recognition
  useEffect(() => {
    const support = checkSpeechRecognitionSupport();
    setIsSupported(support.isSupported);

    if (!support.isSupported) {
      setError({
        type: 'not-supported',
        message: 'Speech recognition is not supported in this browser',
        browser: support.browser
      });
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      

      // Configure recognition
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.lang = language;
      recognitionRef.current.maxAlternatives = maxAlternatives;

      // ADD THIS LINE to prevent network errors in webkit browsers
      if ('webkitSpeechRecognition' in window) {
        recognitionRef.current.continuous = true; // Force continuous for webkit
      }

      // Event: Recognition starts
      recognitionRef.current.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
        setError(null);
        setTranscript('');
        setInterimTranscript('');
      };

      // Event: Recognition results
      recognitionRef.current.onresult = (event) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalText += transcriptPart + ' ';
          } else {
            interimText += transcriptPart;
          }
        }

        if (interimText) {
          setInterimTranscript(interimText);
        }

        if (finalText) {
          const finalTranscript = finalText.trim();
          setTranscript(finalTranscript);
          console.log('✅ Final transcript:', finalTranscript);
          
          if (onResult) {
            onResult(finalTranscript);
          }
        }
      };

      // Event: Recognition error
      recognitionRef.current.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        
        const errorObj = {
          type: event.error,
          message: getErrorMessage(event.error),
          timestamp: new Date()
        };
        
        setError(errorObj);
        setIsListening(false);
        
        if (onError) {
          onError(errorObj);
        }
      };

      // Event: Recognition ends
      recognitionRef.current.onend = () => {
        console.log('🛑 Speech recognition ended');
        setIsListening(false);
        
        if (onEnd) {
          onEnd();
        }
      };

      isInitializedRef.current = true;
      
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setError({
        type: 'initialization-failed',
        message: 'Failed to initialize speech recognition',
        details: err.message
      });
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error('Error stopping recognition:', err);
        }
      }
    };
  }, [language, continuous, interimResults, maxAlternatives, onResult, onError, onEnd]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError({
        type: 'not-initialized',
        message: 'Speech recognition not initialized'
      });
      return;
    }

    if (isListening) {
      console.warn('⚠️ Already listening');
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Failed to start listening:', err);
      setError({
        type: 'start-failed',
        message: 'Failed to start speech recognition',
        details: err.message
      });
    }
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    if (!isListening) {
      console.warn('⚠️ Not currently listening');
      return;
    }

    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.error('Failed to stop listening:', err);
    }
  }, [isListening]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Abort recognition
  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        setIsListening(false);
      } catch (err) {
        console.error('Failed to abort listening:', err);
      }
    }
  }, []);

  return {
    // State
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    
    // Actions
    startListening,
    stopListening,
    resetTranscript,
    abortListening,
    
    // Utils
    hasRecognition: isInitializedRef.current
  };
};

// Helper function to get user-friendly error messages
const getErrorMessage = (errorType) => {
  const errorMessages = {
    'no-speech': 'No speech detected. Please try again.',
    'aborted': 'Speech recognition was aborted.',
    'audio-capture': 'No microphone was found or microphone access was denied.',
    'network': 'Network error occurred. Please check your connection.',
    'not-allowed': 'Microphone permission was denied.',
    'service-not-allowed': 'Speech recognition service is not allowed.',
    'bad-grammar': 'Grammar error in speech recognition.',
    'language-not-supported': 'The specified language is not supported.'
  };

  return errorMessages[errorType] || `Speech recognition error: ${errorType}`;
};

export default useSpeechRecognition;