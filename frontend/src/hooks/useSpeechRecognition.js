// frontend/src/hooks/useSpeechRecognition.js
// Language-aware Web Speech API hook for voice commands

import { useState, useEffect, useRef, useCallback } from "react";
import { checkSpeechRecognitionSupport } from "../utils/browserSupport";

export const DEEPGRAM_TO_BROWSER_LANG = {
  auto: "en-US",
  multi: "en-US",
  en: "en-US",
  hi: "hi-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-BR",
  nl: "nl-NL",
  pl: "pl-PL",
  ru: "ru-RU",
  tr: "tr-TR",
  sv: "sv-SE",
  ja: "ja-JP",
  ko: "ko-KR",
  zh: "zh-CN",
  ar: "ar-SA",
  id: "id-ID",
  vi: "vi-VN",
};

export const useSpeechRecognition = (options = {}) => {
  const {
    language = "en-US",
    continuous = false,
    interimResults = true,
    maxAlternatives = 1,
    onResult = null,
    onError = null,
    onEnd = null,
  } = options;

  const resolvedLanguage = DEEPGRAM_TO_BROWSER_LANG[language] || language;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Keep callback refs current without recreating the recognition object
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    const support = checkSpeechRecognitionSupport();
    setIsSupported(support.isSupported);

    if (!support.isSupported) {
      setError({
        type: "not-supported",
        message: "Speech recognition is not supported in this browser",
        browser: support.browser,
      });
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      // FIX: use continuous exactly as passed — do NOT override to true for webkit.
      // The old override caused the command mic to never auto-close after a result.
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.lang = resolvedLanguage;
      recognitionRef.current.maxAlternatives = maxAlternatives;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript("");
        setInterimTranscript("");
      };

      recognitionRef.current.onresult = (event) => {
        let interimText = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const part = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += part + " ";
          else interimText += part;
        }
        if (interimText) setInterimTranscript(interimText);
        if (finalText) {
          const finalTranscript = finalText.trim();
          setTranscript(finalTranscript);
          console.log(
            `✅ Final transcript [${resolvedLanguage}]:`,
            finalTranscript,
          );
          onResultRef.current?.(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        // aborted and no-speech are normal — don't log as errors
        if (event.error === "aborted" || event.error === "no-speech") {
          setIsListening(false);
          return;
        }
        console.error("❌ Speech recognition error:", event.error);
        const errorObj = {
          type: event.error,
          message: getErrorMessage(event.error),
          timestamp: new Date(),
        };
        setError(errorObj);
        setIsListening(false);
        onErrorRef.current?.(errorObj);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        onEndRef.current?.();
      };

      isInitializedRef.current = true;
    } catch (err) {
      console.error("Failed to initialize speech recognition:", err);
      setError({
        type: "initialization-failed",
        message: "Failed to initialize speech recognition",
        details: err.message,
      });
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [resolvedLanguage, continuous, interimResults, maxAlternatives]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError({
        type: "not-initialized",
        message: "Speech recognition not initialized",
      });
      return;
    }
    if (isListening) return;
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Failed to start listening:", err);
      setError({
        type: "start-failed",
        message: "Failed to start speech recognition",
        details: err.message,
      });
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.error("Failed to stop listening:", err);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        setIsListening(false);
      } catch (_) {}
    }
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    currentLanguage: resolvedLanguage,
    startListening,
    stopListening,
    resetTranscript,
    abortListening,
    hasRecognition: isInitializedRef.current,
  };
};

const getErrorMessage = (errorType) => {
  const msgs = {
    "no-speech": "No speech detected. Please try again.",
    aborted: "Speech recognition was aborted.",
    "audio-capture": "No microphone found or access denied.",
    network: "Network error. Please check your connection.",
    "not-allowed": "Microphone permission denied.",
    "service-not-allowed": "Speech recognition service not allowed.",
    "bad-grammar": "Grammar error in speech recognition.",
    "language-not-supported": "This language is not supported by your browser.",
  };
  return msgs[errorType] || `Speech recognition error: ${errorType}`;
};

export default useSpeechRecognition;

