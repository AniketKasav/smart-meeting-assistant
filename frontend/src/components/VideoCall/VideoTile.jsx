// frontend/src/components/VideoCall/VideoTile.jsx
import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, User } from 'lucide-react';

const VideoTile = ({ 
  stream, 
  userName, 
  isLocal = false, 
  isAudioEnabled = true, 
  isVideoEnabled = true,
  isSpeaking = false
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get random gradient for avatar
  const getAvatarGradient = (name) => {
    const gradients = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-blue-600',
      'from-purple-500 to-pink-600',
      'from-orange-500 to-red-600',
      'from-cyan-500 to-blue-600',
      'from-yellow-500 to-orange-600'
    ];
    
    const index = (name?.charCodeAt(0) || 0) % gradients.length;
    return gradients[index];
  };

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl group">
      {/* Video or Avatar */}
      {isVideoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className={`w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br ${getAvatarGradient(userName)} flex items-center justify-center shadow-xl`}>
            <span className="text-white text-2xl md:text-4xl font-bold">
              {getInitials(userName)}
            </span>
          </div>
        </div>
      )}

      {/* Speaking Indicator */}
      {isSpeaking && isAudioEnabled && (
        <div className="absolute top-0 left-0 right-0 bottom-0 border-4 border-green-500 rounded-xl pointer-events-none animate-pulse"></div>
      )}

      {/* User Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 md:p-4">
        <div className="flex items-center justify-between">
          {/* Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-white font-medium text-xs md:text-sm drop-shadow-lg truncate">
              {userName}
              {isLocal && ' (You)'}
            </span>
          </div>

          {/* Audio/Video Status */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Audio Indicator */}
            {isAudioEnabled ? (
              <div className="bg-green-500/20 backdrop-blur-sm p-1.5 rounded-full">
                <Mic className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-400" />
              </div>
            ) : (
              <div className="bg-red-500/20 backdrop-blur-sm p-1.5 rounded-full">
                <MicOff className="w-3 h-3 md:w-3.5 md:h-3.5 text-red-400" />
              </div>
            )}

            {/* Video Indicator */}
            {!isVideoEnabled && (
              <div className="bg-red-500/20 backdrop-blur-sm p-1.5 rounded-full">
                <VideoOff className="w-3 h-3 md:w-3.5 md:h-3.5 text-red-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Speaking Animation (Bars) */}
      {isSpeaking && isAudioEnabled && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1">
            <div className="w-1 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '75ms' }}></div>
            <div className="w-1 h-5 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          </div>
        </div>
      )}

      {/* You Badge */}
      {isLocal && (
        <div className="absolute top-3 left-3">
          <div className="bg-blue-600/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white">
            You
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoTile;