// frontend/src/components/MeetingCard.jsx - FIXED VERSION
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Video, FileText, Trash2 } from 'lucide-react';

const MeetingCard = ({ meeting, onDelete, onRefresh }) => {
  const navigate = useNavigate();

  const formatDate = (date) => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = () => {
    switch (meeting.status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Navigate to MEETING DETAILS page (not video room)
  const handleViewDetails = () => {
    console.log('🔍 View Details clicked');
    console.log('  Meeting:', meeting);
    console.log('  Meeting._id:', meeting._id);
    console.log('  Meeting.meetingId:', meeting.meetingId);
    console.log('  Navigating to:', `/meetings/${meeting._id}`);
    
    navigate(`/meetings/${meeting._id}`);
  };

  // Navigate to VIDEO ROOM
  const handleJoinMeeting = (e) => {
    e.stopPropagation();
    console.log('Joining video call:', meeting._id);
    navigate(`/meeting/${meeting._id}`);
  };

  // Delete meeting
  const handleDelete = async (e) => {
    e.stopPropagation();
    
    if (!window.confirm(`Delete "${meeting.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      console.log('Deleting meeting:', meeting._id);
      
      const response = await fetch(`http://localhost:4000/api/meetings/${meeting._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Meeting deleted successfully');
        // Call the onDelete callback if provided
        if (onDelete) {
          onDelete(meeting._id);
        }
        // Refresh the meeting list
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Delete failed:', errorData);
        alert('Failed to delete meeting: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('❌ Delete error:', err);
      alert('Failed to delete meeting: ' + err.message);
    }
  };

  return (
    <div 
      onClick={handleViewDetails}
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 cursor-pointer hover:bg-slate-800 hover:border-slate-600 transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-2 truncate group-hover:text-blue-400 transition-colors">
            {meeting.title}
          </h3>
          {meeting.description && (
            <p className="text-sm text-slate-400 line-clamp-2 mb-2">
              {meeting.description}
            </p>
          )}
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {meeting.status}
          </span>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="ml-3 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          title="Delete meeting"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Meeting info */}
      <div className="space-y-2 mb-4">
        {/* Date */}
        {(meeting.startedAt || meeting.createdAt) && (
          <div className="flex items-center text-sm text-slate-400">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{formatDate(meeting.startedAt || meeting.createdAt)}</span>
          </div>
        )}

        {/* Duration */}
        {meeting.duration && (
          <div className="flex items-center text-sm text-slate-400">
            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{formatDuration(meeting.duration)}</span>
          </div>
        )}

        {/* Participants */}
        {meeting.participants && meeting.participants.length > 0 && (
          <div className="flex items-center text-sm text-slate-400">
            <Users className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{meeting.participants.length} participant(s)</span>
          </div>
        )}

        {/* Transcript available */}
        {meeting.participants?.some(p => p.transcriptPath) && (
          <div className="flex items-center text-sm text-green-400">
            <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Transcript available</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-3 border-t border-slate-700">
        {/* Join Meeting button */}
        <button
          onClick={handleJoinMeeting}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          <Video className="w-4 h-4" />
          Join Meeting
        </button>

        {/* View Details button */}
        <button
          onClick={handleViewDetails}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          <FileText className="w-4 h-4" />
          View Details
        </button>
      </div>
    </div>
  );
};

export default MeetingCard;