// frontend/src/components/VoiceToast.jsx
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const VoiceToast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    info: <AlertCircle className="w-5 h-5 text-blue-400" />
  };

  const bgColors = {
    success: 'bg-green-900/90 border-green-600',
    error: 'bg-red-900/90 border-red-600',
    info: 'bg-blue-900/90 border-blue-600'
  };

  return (
    <div className={`fixed top-24 right-8 z-50 ${bgColors[type]} border-2 rounded-lg shadow-2xl p-4 min-w-[300px] animate-slide-in`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <p className="text-white text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

export default VoiceToast;