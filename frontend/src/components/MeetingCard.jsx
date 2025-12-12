// frontend/src/components/MeetingCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Clock, 
  Users, 
  FileText, 
  Trash2, 
  PlayCircle,
  CheckCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';

const MeetingCard = ({ meeting, onDelete, onRefresh }) => {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    const colors = {
      'scheduled': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'in-progress': 'bg-green-500/20 text-green-400 border-green-500/30',
      'completed': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'archived': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[status] || colors['scheduled'];
  };

  const getStatusIcon = (status) => {
    const icons = {
      'scheduled': Calendar,
      'in-progress': PlayCircle,
      'completed': CheckCircle,
      'archived': AlertCircle,
    };
    const Icon = icons[status] || Calendar;
    return <Icon className="w-4 h-4" />;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm(`Delete meeting "${meeting.title}"?`)) {
      try {
        await onDelete(meeting.meetingId);
        onRefresh?.();
      } catch (err) {
        alert('Failed to delete meeting');
      }
    }
  };

  const handleCardClick = () => {
    navigate(`/meetings/${meeting.meetingId}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900/90 transition-all cursor-pointer group relative"
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(meeting.status)}`}>
          {getStatusIcon(meeting.status)}
          <span className="capitalize">{meeting.status.replace('-', ' ')}</span>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300"
          title="Delete meeting"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Meeting Title */}
      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
        {meeting.title || `Meeting ${meeting.meetingId}`}
      </h3>

      {/* Description */}
      {meeting.description && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2">
          {meeting.description}
        </p>
      )}

      {/* Meeting ID */}
      <div className="text-xs text-slate-500 mb-3 font-mono">
        ID: {meeting.meetingId}
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Participants */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300">
            {meeting.participants?.length || 0} {meeting.participants?.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300">
            {formatDuration(meeting.duration)}
          </span>
        </div>
      </div>

      {/* Transcript Status */}
      {meeting.participants?.some(p => p.transcriptPath) && (
        <div className="flex items-center gap-2 text-sm text-emerald-400 mb-3">
          <FileText className="w-4 h-4" />
          <span>Transcript available</span>
        </div>
      )}

      {/* Date */}
      <div className="text-xs text-slate-500 border-t border-slate-800 pt-3 mt-3">
        {meeting.startedAt ? (
          <>
            <span className="font-medium text-slate-400">Started:</span>{' '}
            {format(new Date(meeting.startedAt), 'MMM dd, yyyy HH:mm')}
            {' • '}
            {formatDistanceToNow(new Date(meeting.startedAt), { addSuffix: true })}
          </>
        ) : (
          <>
            <span className="font-medium text-slate-400">Created:</span>{' '}
            {format(new Date(meeting.createdAt), 'MMM dd, yyyy HH:mm')}
          </>
        )}
      </div>

      {/* Owner */}
      {meeting.owner && (
        <div className="text-xs text-slate-500 mt-2">
          <span className="font-medium text-slate-400">Host:</span> {meeting.owner.name}
        </div>
      )}
    </div>
  );
};

export default MeetingCard;