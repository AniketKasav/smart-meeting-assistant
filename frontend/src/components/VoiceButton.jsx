// frontend/src/components/VoiceButton.jsx
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoiceCommand } from '../contexts/VoiceCommandContext';

const VoiceButton = () => {
  const { 
    isListening, 
    isProcessing, 
    transcript, 
    startListening, 
    stopListening 
  } = useVoiceCommand();

  const [ripple, setRipple] = useState(false);

  useEffect(() => {
    if (isListening) {
      setRipple(true);
      const timer = setTimeout(() => setRipple(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isListening]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <>
      {/* Voice Button */}
      <div className="z-50">
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className={`
            relative w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-300 shadow-2xl
            ${isListening 
              ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${ripple ? 'scale-110' : 'scale-100'}
            hover:scale-105 active:scale-95
          `}
        >
          {/* Pulsing ring for listening state */}
          {isListening && (
            <div className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-75"></div>
          )}

          {/* Icon */}
          <div className="relative z-10">
            {isProcessing ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : isListening ? (
              <Mic className="w-7 h-7 text-white animate-pulse" />
            ) : (
              <MicOff className="w-7 h-7 text-white" />
            )}
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-slate-900 text-white text-xs py-2 px-3 rounded-lg whitespace-nowrap shadow-xl border border-slate-700">
              {isProcessing 
                ? 'Processing...' 
                : isListening 
                  ? 'Click to stop' 
                  : 'Click to speak'
              }
            </div>
          </div>
        </button>

        {/* Live Transcript Display */}
        {(isListening || isProcessing) && transcript && (
          <div className="absolute bottom-20 right-0 w-80 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 ${
                  isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                }`}
              ></div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-400 mb-1">
                  {isProcessing ? 'Processing...' : 'Listening...'}
                </p>
                <p className="text-sm text-white leading-relaxed">
                  {transcript}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcut Hint (UNCHANGED) */}
      <div className="fixed bottom-8 left-8 z-50 opacity-50 hover:opacity-100 transition-opacity">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400">
          Press <kbd className="px-2 py-1 bg-slate-800 rounded text-white font-mono">Space</kbd> to speak
        </div>
      </div>
    </>
  );
};

export default VoiceButton;
