// frontend/src/hooks/useTextToSpeech.js - FIXED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for Text-to-Speech functionality
 * Uses Web Speech Synthesis API
 */
const useTextToSpeech = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  
  const utteranceRef = useRef(null);
  const queueRef = useRef([]);

  /**
   * Load voices - FIXED: Better initialization
   */
  const loadVoices = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      console.error('❌ Speech Synthesis not supported');
      return;
    }

    const availableVoices = window.speechSynthesis.getVoices();
    console.log('🔊 Available voices:', availableVoices.length);
    
    if (availableVoices.length > 0) {
      setVoices(availableVoices);
      
      // Find best English voice
      const englishVoice = availableVoices.find(
        voice => voice.lang.startsWith('en') && voice.name.includes('Google')
      ) || availableVoices.find(
        voice => voice.lang.startsWith('en')
      ) || availableVoices[0];
      
      setSelectedVoice(englishVoice);
      console.log('🎤 Selected voice:', englishVoice?.name);
    }
  }, []);

  /**
   * Initialize on mount - FIXED
   */
  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      
      // Load voices immediately
      loadVoices();
      
      // Chrome needs this event listener
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      // Load from localStorage
      const savedEnabled = localStorage.getItem('tts_enabled');
      if (savedEnabled !== null) {
        setIsEnabled(savedEnabled === 'true');
      }
      
      const savedRate = localStorage.getItem('tts_rate');
      if (savedRate) setRate(parseFloat(savedRate));
      
      const savedPitch = localStorage.getItem('tts_pitch');
      if (savedPitch) setPitch(parseFloat(savedPitch));
      
      const savedVolume = localStorage.getItem('tts_volume');
      if (savedVolume) setVolume(parseFloat(savedVolume));
      
      console.log('✅ TTS initialized');
    } else {
      console.error('❌ Speech Synthesis not supported');
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [loadVoices]);

  /**
   * Speak text - FIXED: Better error handling
   */
  const speak = useCallback((text) => {
    if (!isSupported) {
      console.error('❌ TTS not supported');
      return;
    }

    if (!isEnabled) {
      console.log('🔇 TTS is disabled');
      return;
    }

    if (!text || text.trim().length === 0) {
      console.warn('⚠️ Empty text provided to TTS');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean text for better speech
    const cleanText = text
      .replace(/\*/g, '')
      .replace(/[_#]/g, '')
      .replace(/https?:\/\/[^\s]+/g, 'link')
      .replace(/\n+/g, '. ')
      .trim();

    console.log('🔊 Speaking:', cleanText.substring(0, 50) + '...');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    // Set voice and parameters
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = 'en-US';

    // Event handlers
    utterance.onstart = () => {
      console.log('🔊 Started speaking');
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      console.log('✅ Finished speaking');
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error('❌ TTS error:', event.error);
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onpause = () => {
      console.log('⏸️ Paused speaking');
      setIsPaused(true);
    };

    utterance.onresume = () => {
      console.log('▶️ Resumed speaking');
      setIsPaused(false);
    };

    // Speak
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('❌ Failed to speak:', error);
      setIsSpeaking(false);
    }
  }, [isSupported, isEnabled, selectedVoice, rate, pitch, volume]);

  /**
   * Pause speech
   */
  const pause = useCallback(() => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSpeaking, isPaused]);

  /**
   * Resume speech
   */
  const resume = useCallback(() => {
    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSpeaking, isPaused]);

  /**
   * Cancel/Stop speech
   */
  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  }, []);

  /**
   * Toggle enabled state
   */
  const toggle = useCallback(() => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('tts_enabled', newState.toString());
    
    if (!newState) {
      cancel();
    }
  }, [isEnabled, cancel]);

  /**
   * Change voice
   */
  const changeVoice = useCallback((voiceName) => {
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      setSelectedVoice(voice);
      console.log('🎤 Voice changed to:', voice.name);
    }
  }, [voices]);

  /**
   * Change rate
   */
  const changeRate = useCallback((newRate) => {
    setRate(newRate);
    localStorage.setItem('tts_rate', newRate.toString());
  }, []);

  /**
   * Change pitch
   */
  const changePitch = useCallback((newPitch) => {
    setPitch(newPitch);
    localStorage.setItem('tts_pitch', newPitch.toString());
  }, []);

  /**
   * Change volume
   */
  const changeVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    localStorage.setItem('tts_volume', newVolume.toString());
  }, []);

  return {
    // State
    isSupported,
    isSpeaking,
    isPaused,
    isEnabled,
    voices,
    selectedVoice,
    rate,
    pitch,
    volume,
    
    // Methods
    speak,
    pause,
    resume,
    cancel,
    toggle,
    changeVoice,
    changeRate,
    changePitch,
    changeVolume
  };
};

export default useTextToSpeech;