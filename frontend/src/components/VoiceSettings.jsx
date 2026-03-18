// frontend/src/components/VoiceSettings.jsx
import { useState } from 'react';
import { Volume2, VolumeX, Settings, X } from 'lucide-react';
import { useVoiceCommand } from '../contexts/VoiceCommandContext';

const VoiceSettings = () => {
  const { tts } = useVoiceCommand();
  const [isOpen, setIsOpen] = useState(false);

  if (!tts.isSupported) {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all border border-gray-200 z-40"
        title="Voice Settings"
      >
        <Settings className="w-5 h-5 text-gray-700" />
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="fixed bottom-40 right-6 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Voice Settings</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Settings */}
          <div className="p-4 space-y-4">
            {/* Enable/Disable TTS */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Voice Output
              </label>
              <button
                onClick={tts.toggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  tts.isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    tts.isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {tts.isEnabled && (
              <>
                {/* Voice Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voice
                  </label>
                  <select
                    value={tts.selectedVoice?.name || ''}
                    onChange={(e) => {
                      const voice = tts.voices.find(v => v.name === e.target.value);
                      if (voice) tts.setSelectedVoice(voice);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    {tts.voices
                      .filter(v => v.lang.startsWith('en'))
                      .map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Speed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speed: {tts.rate.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={tts.rate}
                    onChange={(e) => tts.setRate(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Slow</span>
                    <span>Normal</span>
                    <span>Fast</span>
                  </div>
                </div>

                {/* Pitch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pitch: {tts.pitch.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={tts.pitch}
                    onChange={(e) => tts.setPitch(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>Normal</span>
                    <span>High</span>
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Volume: {Math.round(tts.volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={tts.volume}
                    onChange={(e) => tts.setVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Test Button */}
                <button
                  onClick={() => tts.speak('Hello! This is a test of the voice output system.')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  disabled={tts.isSpeaking}
                >
                  <Volume2 className="w-4 h-4" />
                  Test Voice
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceSettings;