// frontend/src/components/VideoCall/VideoControls.jsx
import React from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff,
  PhoneOff,
  MessageSquare,
  Users,
  Settings
} from 'lucide-react';

const VideoControls = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onLeaveMeeting,
  showChat = false,
  showParticipants = false,
  participantCount = 0
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Left side - Meeting info */}
          <div className="flex items-center gap-3 text-white">
            <div className="bg-red-600 rounded-full px-3 py-1 text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Recording
            </div>
          </div>

          {/* Center - Main controls */}
          <div className="flex items-center gap-3">
            {/* Audio toggle */}
            <button
              onClick={onToggleAudio}
              className={`
                p-4 rounded-full transition-all duration-200
                ${isAudioEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
                }
              `}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </button>

            {/* Video toggle */}
            <button
              onClick={onToggleVideo}
              className={`
                p-4 rounded-full transition-all duration-200
                ${isVideoEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
                }
              `}
              title={isVideoEnabled ? 'Stop video' : 'Start video'}
            >
              {isVideoEnabled ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6" />
              )}
            </button>

            {/* Screen share toggle */}
            <button
              onClick={onToggleScreenShare}
              className={`
                p-4 rounded-full transition-all duration-200
                ${isScreenSharing 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
                }
              `}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {isScreenSharing ? (
                <MonitorOff className="w-6 h-6" />
              ) : (
                <Monitor className="w-6 h-6" />
              )}
            </button>

            {/* Leave meeting */}
            <button
              onClick={onLeaveMeeting}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 ml-2"
              title="Leave meeting"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>

          {/* Right side - Additional controls */}
          <div className="flex items-center gap-3">
            {/* Participants */}
            <button
              onClick={onToggleParticipants}
              className={`
                relative p-3 rounded-full transition-all duration-200
                ${showParticipants 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
                }
              `}
              title="Participants"
            >
              <Users className="w-5 h-5" />
              {participantCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {participantCount}
                </span>
              )}
            </button>

            {/* Chat */}
            <button
              onClick={onToggleChat}
              className={`
                p-3 rounded-full transition-all duration-200
                ${showChat 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
                }
              `}
              title="Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Settings */}
            <button
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoControls;