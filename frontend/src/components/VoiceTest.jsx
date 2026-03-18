// frontend/src/components/VoiceTest.jsx
import React from 'react';
import { useVoiceCommand } from '../contexts/VoiceCommandContext';
import { Mic, MicOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const VoiceTest = () => {
  const {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    isEnabled,
    micPermission,
    browserSupport,
    commandHistory,
    toggleListening,
    requestPermission,
    clearHistory
  } = useVoiceCommand();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          🎤 Voice Command Test Panel
        </h2>
        
        {/* Browser Support Status */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${isSupported ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {isSupported ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-semibold">Browser Support</span>
            </div>
            <p className="text-sm text-gray-600">
              {browserSupport?.browser.name} {browserSupport?.browser.version}
            </p>
          </div>

          <div className={`p-4 rounded-lg ${
            micPermission === 'granted' ? 'bg-green-50' : 
            micPermission === 'denied' ? 'bg-red-50' : 'bg-yellow-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {micPermission === 'granted' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : micPermission === 'denied' ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <span className="font-semibold">Microphone</span>
            </div>
            <p className="text-sm text-gray-600 capitalize">{micPermission}</p>
            {micPermission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded"
              >
                Request Permission
              </button>
            )}
          </div>

          <div className={`p-4 rounded-lg ${isEnabled ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {isEnabled ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-600" />
              )}
              <span className="font-semibold">Voice Commands</span>
            </div>
            <p className="text-sm text-gray-600">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>

        {/* Voice Control Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={toggleListening}
            disabled={!isSupported || !isEnabled}
            className={`
              flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg
              transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
              ${isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
              }
            `}
          >
            {isListening ? (
              <>
                <MicOff className="w-6 h-6" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                Start Listening
              </>
            )}
          </button>
        </div>

        {/* Transcript Display */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Real-time Transcript (Interim):
            </label>
            <p className="text-gray-600 italic min-h-[24px]">
              {interimTranscript || (isListening ? 'Listening...' : 'Not listening')}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Final Transcript:
            </label>
            <p className="text-gray-800 font-medium min-h-[24px]">
              {transcript || 'No command spoken yet'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <label className="block text-sm font-semibold text-red-700 mb-2">
                Error:
              </label>
              <p className="text-red-600">{error.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Command History */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Command History
          </h3>
          <button
            onClick={clearHistory}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear History
          </button>
        </div>

        <div className="space-y-2">
          {commandHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No commands yet. Start speaking!
            </p>
          ) : (
            commandHistory.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border-l-4 ${
                  item.status === 'success' ? 'bg-green-50 border-green-500' :
                  item.status === 'error' ? 'bg-red-50 border-red-500' :
                  'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium text-gray-800">"{item.command}"</p>
                  <span className="text-xs text-gray-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {item.message && (
                  <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceTest;
