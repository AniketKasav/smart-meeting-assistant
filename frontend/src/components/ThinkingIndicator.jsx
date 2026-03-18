import { Brain } from 'lucide-react';

const ThinkingIndicator = ({ message = "AI is thinking..." }) => {
  return (
    <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
      <Brain className="w-5 h-5 text-blue-600 animate-spin" />
      <div className="flex items-center space-x-2">
        <span className="text-sm text-blue-800 font-medium">{message}</span>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default ThinkingIndicator;