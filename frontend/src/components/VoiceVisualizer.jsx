import { Mic, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const VoiceVisualizer = ({ isListening = false, isSpeaking = false, variant = "mic" }) => {
  const [bars, setBars] = useState([40, 60, 45, 70, 55, 65, 50]);

  useEffect(() => {
    if (!isListening && !isSpeaking) {
      setBars([40, 60, 45, 70, 55, 65, 50]);
      return;
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 60 + 40));
    }, 150);

    return () => clearInterval(interval);
  }, [isListening, isSpeaking]);

  const Icon = variant === "mic" ? Mic : Volume2;
  const isActive = isListening || isSpeaking;
  const bgColor = isListening ? 'bg-red-100' : isSpeaking ? 'bg-blue-100' : 'bg-gray-100';
  const iconColor = isListening ? 'text-red-600' : isSpeaking ? 'text-blue-600' : 'text-gray-400';
  const barColor = isListening ? 'bg-red-500' : isSpeaking ? 'bg-blue-500' : 'bg-gray-300';

  return (
    <div className={`flex items-center space-x-3 p-4 rounded-lg ${bgColor} transition-all duration-300`}>
      <Icon className={`w-6 h-6 ${iconColor} ${isActive ? 'animate-pulse' : ''}`} />
      
      <div className="flex items-center space-x-1 h-12">
        {bars.map((height, i) => (
          <div
            key={i}
            className={`w-1.5 ${barColor} rounded-full transition-all duration-150 ${!isActive ? 'opacity-30' : ''}`}
            style={{
              height: isActive ? `${height}%` : '40%',
              transitionDelay: `${i * 50}ms`
            }}
          />
        ))}
      </div>
      
      <div className="text-sm font-medium">
        {isListening && <span className="text-red-700">Listening...</span>}
        {isSpeaking && <span className="text-blue-700">Speaking...</span>}
        {!isActive && <span className="text-gray-500">Idle</span>}
      </div>
    </div>
  );
};

export default VoiceVisualizer;