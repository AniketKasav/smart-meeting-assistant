// frontend/src/components/LiveSubtitles.jsx
// Live subtitle overlay — shows recent final lines + current partial text
// Previous lines fade out after a delay so users can read them
// Non-English lines show an English translation below in blue

import React, { useState, useEffect, useRef } from 'react';

const MAX_VISIBLE_LINES = 3; // How many recent final lines to keep visible
const FADE_OUT_DELAY = 6000; // How long each final line stays visible (ms)

const LiveSubtitles = ({ partialText, liveTranscript = [], liveTranslations = {}, isEnabled }) => {
  const [visibleLines, setVisibleLines] = useState([]);
  const prevLengthRef = useRef(0);

  // When a new final transcript line is added, push it into visibleLines
  useEffect(() => {
    if (liveTranscript.length > prevLengthRef.current) {
      const newEntries = liveTranscript.slice(prevLengthRef.current);
      setVisibleLines((prev) => {
        const updated = [
          ...prev,
          ...newEntries.map((entry) => ({
            id: entry.id,
            text: entry.text,
            addedAt: Date.now(),
          })),
        ];
        return updated.slice(-MAX_VISIBLE_LINES);
      });
    }
    prevLengthRef.current = liveTranscript.length;
  }, [liveTranscript]);

  // Timer to fade out old lines
  useEffect(() => {
    if (visibleLines.length === 0) return;
    const interval = setInterval(() => {
      setVisibleLines((prev) =>
        prev.filter((line) => Date.now() - line.addedAt < FADE_OUT_DELAY)
      );
    }, 500);
    return () => clearInterval(interval);
  }, [visibleLines.length]);

  if (!isEnabled) return null;

  const hasContent = visibleLines.length > 0 || (partialText && partialText.trim());
  if (!hasContent) return null;

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div
        className="subtitle-container"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          padding: '14px 28px',
          borderRadius: '12px',
          maxWidth: '85vw',
          minWidth: '300px',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Recent final lines */}
        {visibleLines.map((line) => {
          const age = Date.now() - line.addedAt;
          const fadeProgress = Math.max(0, 1 - age / FADE_OUT_DELAY);
          const opacity = age > FADE_OUT_DELAY * 0.7
            ? Math.max(0.15, fadeProgress * 3)
            : 1;
          const translation = liveTranslations[line.text];

          return (
            <div
              key={line.id}
              style={{
                marginBottom: '6px',
                opacity: Math.max(0.15, opacity),
                transition: 'opacity 0.4s ease',
              }}
            >
              {/* Original text */}
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontSize: '22px',
                  fontWeight: '500',
                  textAlign: 'center',
                  lineHeight: '1.5',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '0.2px',
                }}
              >
                {line.text}
              </div>

              {/* English translation (shows for non-English speech) */}
              {translation && translation !== line.text && (
                <div
                  style={{
                    color: 'rgba(147, 197, 253, 0.9)',  // blue-300
                    fontSize: '15px',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    lineHeight: '1.4',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    marginTop: '2px',
                    animation: 'subtitleFadeIn 0.4s ease-out',
                  }}
                >
                  🌐 {translation}
                </div>
              )}
            </div>
          );
        })}

        {/* Current partial (what's being spoken right now) */}
        {partialText && partialText.trim() && (
          <div
            className="subtitle-partial"
            style={{
              color: 'rgba(147, 197, 253, 0.95)', // blue-300
              fontSize: '22px',
              fontWeight: '500',
              fontStyle: 'italic',
              textAlign: 'center',
              lineHeight: '1.5',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '0.2px',
              marginTop: visibleLines.length > 0 ? '4px' : '0',
            }}
          >
            {partialText}
            <span className="subtitle-cursor">▌</span>
          </div>
        )}
      </div>

      <style>{`
        .subtitle-container {
          animation: subtitleFadeIn 0.2s ease-out;
        }

        @keyframes subtitleFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .subtitle-cursor {
          display: inline-block;
          margin-left: 2px;
          animation: cursorBlink 1s steps(2) infinite;
          font-style: normal;
          font-size: 18px;
          vertical-align: baseline;
          color: rgba(147, 197, 253, 0.6);
        }

        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiveSubtitles;
