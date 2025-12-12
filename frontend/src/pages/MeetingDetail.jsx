// frontend/src/pages/MeetingDetail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  Download,
  Clock,
  Users,
  Calendar,
  FileText,
  Share2,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { meetingsAPI } from '../services/api';

const MeetingDetail = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);

  const [meeting, setMeeting] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Fetch meeting data
  useEffect(() => {
    fetchMeetingData();
  }, [meetingId]);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);
      const response = await meetingsAPI.getMeeting(meetingId);
      setMeeting(response.data.meeting);
      setTranscripts(response.data.transcripts || []);
      setEditedTitle(response.data.meeting.title);
    } catch (err) {
      console.error('Failed to fetch meeting:', err);
      setError('Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  // Audio player controls
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Update active segment based on current time
  useEffect(() => {
    if (transcripts.length === 0) return;

    const allSegments = transcripts.flatMap(t => 
      t.segments.map(s => ({ ...s, userName: t.userName }))
    );

    const current = allSegments.find(
      seg => currentTime >= seg.start && currentTime <= seg.end
    );
    
    setActiveSegment(current);
  }, [currentTime, transcripts]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleUpdateTitle = async () => {
    try {
      await meetingsAPI.updateMeeting(meetingId, { title: editedTitle });
      setMeeting({ ...meeting, title: editedTitle });
      setIsEditing(false);
    } catch (err) {
      alert('Failed to update title');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this meeting? This cannot be undone.')) return;

    try {
      await meetingsAPI.deleteMeeting(meetingId);
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to delete meeting');
    }
  };

  const downloadTranscript = () => {
    if (transcripts.length === 0) return;

    const text = transcripts.map(t => {
      const header = `=== ${t.userName} ===\n\n`;
      const segments = t.segments
        .map(s => `[${formatTime(s.start)} - ${formatTime(s.end)}]\n${s.text}\n`)
        .join('\n');
      return header + segments;
    }).join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${meetingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Meeting Not Found</h2>
          <p className="text-slate-400 mb-6">{error || 'This meeting does not exist'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const audioUrl = meeting.participants?.[0]?.audioPath;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={downloadTranscript}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2"
              disabled={transcripts.length === 0}
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Meeting Info Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            {isEditing ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg"
                  autoFocus
                />
                <button
                  onClick={handleUpdateTitle}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTitle(meeting.title);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{meeting.title}</h1>
                <p className="text-slate-400 text-sm font-mono">ID: {meeting.meetingId}</p>
              </div>
            )}
            
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-slate-800 rounded-lg"
              >
                <Edit className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Started</p>
                <p className="text-sm font-medium">
                  {meeting.startedAt ? format(new Date(meeting.startedAt), 'MMM dd, HH:mm') : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Duration</p>
                <p className="text-sm font-medium">{formatTime(meeting.duration || 0)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Participants</p>
                <p className="text-sm font-medium">{meeting.participants?.length || 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <p className="text-sm font-medium capitalize">{meeting.status?.replace('-', ' ')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={togglePlay}
                className="w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>

              <div className="flex-1">
                <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #334155 ${(currentTime / duration) * 100}%, #334155 100%)`
                  }}
                />
              </div>

              <Volume2 className="w-5 h-5 text-slate-400" />
            </div>

            <audio ref={audioRef} src={`http://localhost:4000${audioUrl}`} preload="metadata" />
          </div>
        )}

        {/* Transcript */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Transcript
          </h2>

          {transcripts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No transcript available yet</p>
              <p className="text-sm text-slate-500 mt-2">
                {meeting.status === 'in-progress' 
                  ? 'Stop the recording to generate transcript'
                  : 'Transcript will appear here after processing'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {transcripts.map((transcript, idx) => (
                <div key={idx}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {transcript.userName?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold">{transcript.userName}</span>
                    <span className="text-xs text-slate-500">
                      ({transcript.segments?.length || 0} segments)
                    </span>
                  </div>

                  <div className="space-y-2 pl-10">
                    {transcript.segments?.map((segment, segIdx) => (
                      <div
                        key={segIdx}
                        onClick={() => seekTo(segment.start)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          activeSegment?.start === segment.start && activeSegment?.end === segment.end
                            ? 'bg-blue-500/20 border border-blue-500/50'
                            : 'bg-slate-800/50 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-slate-500 font-mono mt-1 min-w-[100px]">
                            {formatTime(segment.start)} - {formatTime(segment.end)}
                          </span>
                          <p className="text-sm text-slate-200 leading-relaxed flex-1">
                            {segment.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingDetail;