// frontend/src/components/LiveSubtitles.jsx
// Live subtitle display for Deepgram transcription

import React from 'react';

const LiveSubtitles = ({ partialText, isEnabled }) => {
  if (!isEnabled || !partialText) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div 
        className="subtitle-container"
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '12px 24px',
          borderRadius: '8px',
          maxWidth: '90vw',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="subtitle-text"
          style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            textAlign: 'center',
            lineHeight: '1.4',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '0.3px',
            margin: '0',
          }}
        >
          <span className="partial">
            {partialText}
          </span>
        </div>
      </div>
      
      <style>{`
        .subtitle-container {
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .partial {
          color: #fff;
          font-style: italic;
          opacity: 0.9;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default LiveSubtitles;