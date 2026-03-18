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
  AlertCircle,
  Sparkles,
  Loader2,
  Video,
  UserCircle,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { meetingsAPI } from '../services/api';
import MeetingSummary from '../components/MeetingSummary';
import ExportModal from '../components/ExportModal';
import ShareModal from '../components/ShareModal';
import AudioPlayer from '../components/AudioPlayer';

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
  
  // AI Summary states
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  
  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Speaker diarization states
  const [runningDiarization, setRunningDiarization] = useState(false);
  const [showSpeakerAnalytics, setShowSpeakerAnalytics] = useState(false);
  const [speakerNames, setSpeakerNames] = useState({});
  const [editingSpeaker, setEditingSpeaker] = useState(null);

  // Fetch meeting data
  useEffect(() => {
    fetchMeetingData();
  }, [meetingId]);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);
      console.log('📥 Fetching meeting details for:', meetingId);
      
      const response = await meetingsAPI.getMeeting(meetingId);
      
      console.log('✅ Meeting data received:', response.data);
      
      setMeeting(response.data.meeting);
      setTranscripts(response.data.transcripts || []);
      setEditedTitle(response.data.meeting.title);
    } catch (err) {
      console.error('❌ Failed to fetch meeting:', err);
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

  // AI Summary Functions
  const handleGenerateSummary = async () => {
    try {
      setGeneratingSummary(true);
      setSummaryError(null);

      const response = await meetingsAPI.generateSummary(meetingId);
      
      // Update meeting with new summary
      setMeeting(prev => ({
        ...prev,
        summary: response.data.summary
      }));

    } catch (err) {
      console.error('Failed to generate summary:', err);
      setSummaryError(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleRegenerateSummary = async () => {
    const customPrompt = prompt('Enter custom instructions (optional):');
    
    try {
      setGeneratingSummary(true);
      setSummaryError(null);

      const response = await meetingsAPI.regenerateSummary(meetingId, customPrompt);
      
      setMeeting(prev => ({
        ...prev,
        summary: response.data.summary
      }));

    } catch (err) {
      console.error('Failed to regenerate summary:', err);
      setSummaryError('Failed to regenerate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleDeleteSummary = async () => {
    if (!confirm('Delete this summary? You can regenerate it later.')) return;

    try {
      await meetingsAPI.deleteSummary(meetingId);
      setMeeting(prev => ({
        ...prev,
        summary: undefined
      }));
    } catch (err) {
      alert('Failed to delete summary');
    }
  };

  // Speaker Diarization Functions
  const handleRunDiarization = async () => {
    try {
      setRunningDiarization(true);
      
      // Show helpful message
      const duration = transcripts[0]?.duration || 0;
      const estimatedTime = Math.ceil(duration / 2); // Rough estimate: 30 seconds processing per minute of audio
      console.log(`Starting speaker diarization (est. ${estimatedTime}s for ${Math.ceil(duration)}s audio)...`);
      
      // Use meeting.meetingId (the custom ID) not the MongoDB _id
      const response = await fetch(`http://localhost:4000/api/diarization/${meeting.meetingId}/run`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Diarization failed');
      }
      
      // Refresh meeting data to get updated speaker labels
      await fetchMeetingData();
      alert('✅ Speaker diarization completed! Check out the Speaker Analytics section below.');
    } catch (err) {
      console.error('Diarization error:', err);
      alert(`Failed to run speaker diarization: ${err.message}`);
    } finally {
      setRunningDiarization(false);
    }
  };

  const getSpeakerStats = () => {
    if (transcripts.length === 0) return [];
    
    const stats = {};
    
    transcripts.forEach(transcript => {
      transcript.segments?.forEach(segment => {
        const speaker = segment.speaker || 'Unknown';
        if (!stats[speaker]) {
          stats[speaker] = {
            speaker,
            segments: 0,
            duration: 0,
            displayName: speakerNames[speaker] || speaker
          };
        }
        stats[speaker].segments++;
        stats[speaker].duration += (segment.end - segment.start);
      });
    });
    
    return Object.values(stats).sort((a, b) => b.duration - a.duration);
  };

  const updateSpeakerName = (originalSpeaker, newName) => {
    setSpeakerNames(prev => ({
      ...prev,
      [originalSpeaker]: newName
    }));
    setEditingSpeaker(null);
  };

  const handleUpdateActionItem = async (itemIndex, updates) => {
    try {
      const response = await meetingsAPI.updateActionItem(meetingId, itemIndex, updates);
      
      // Update local state
      setMeeting(prev => {
        const newSummary = { ...prev.summary };
        newSummary.actionItems[itemIndex] = {
          ...newSummary.actionItems[itemIndex],
          ...updates
        };
        return { ...prev, summary: newSummary };
      });

    } catch (err) {
      console.error('Failed to update action item:', err);
      alert('Failed to update action item');
    }
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

  // ✅ Get audio path from transcripts, not participants
  const audioUrl = transcripts?.[0]?.audioPath || meeting.transcripts?.[0]?.audioPath;

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

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/meeting/${meetingId}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Join Video Call
            </button>
            
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            
            <button
              onClick={downloadTranscript}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2"
              disabled={transcripts.length === 0}
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            
            <button
              onClick={handleRunDiarization}
              disabled={runningDiarization || transcripts.length === 0}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              title={runningDiarization ? 'Analyzing audio... This may take 1-2 minutes' : 'Identify who spoke when using AI'}
            >
              {runningDiarization ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCircle className="w-4 h-4" />
              )}
              {runningDiarization ? 'Analyzing... (1-2 min)' : 'ID Speakers'}
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
          <div className="mb-6">
            <AudioPlayer 
              audioUrl={`http://localhost:4000${audioUrl}`}
              meetingTitle={meeting.title}
              duration={meeting.transcripts?.[0]?.duration || meeting.duration}
            />
          </div>
        )}

        {/* AI Summary Section */}
        {transcripts.length > 0 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            {!meeting.summary ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Generate AI Summary</h3>
                <p className="text-slate-400 mb-6">
                  Get instant insights, action items, and key points from this meeting
                </p>
                
                {summaryError && (
                  <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                    {summaryError}
                  </div>
                )}

                <button
                  onClick={handleGenerateSummary}
                  disabled={generatingSummary}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-semibold flex items-center gap-2 mx-auto transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingSummary ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Summary...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate AI Summary
                    </>
                  )}
                </button>
                
                {generatingSummary && (
                  <p className="text-sm text-slate-500 mt-4">
                    This may take 10-30 seconds...
                  </p>
                )}
              </div>
            ) : (
              <MeetingSummary
                summary={meeting.summary}
                onRegenerate={handleRegenerateSummary}
                onDelete={handleDeleteSummary}
                onUpdateActionItem={handleUpdateActionItem}
                isRegenerating={generatingSummary}
              />
            )}
          </div>
        )}

        {/* Speaker Analytics */}
        {transcripts.length > 0 && getSpeakerStats().length > 0 && getSpeakerStats()[0].speaker !== 'Unknown' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <PieChart className="w-6 h-6 text-purple-400" />
                Speaker Analytics
              </h2>
              <button
                onClick={() => setShowSpeakerAnalytics(!showSpeakerAnalytics)}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                {showSpeakerAnalytics ? 'Hide' : 'Show'} Details
              </button>
            </div>

            {showSpeakerAnalytics && (
              <div className="space-y-4">
                {getSpeakerStats().map((stat, idx) => {
                  const totalDuration = getSpeakerStats().reduce((sum, s) => sum + s.duration, 0);
                  const percentage = ((stat.duration / totalDuration) * 100).toFixed(1);
                  
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            idx === 0 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                            idx === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                            idx === 2 ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                            'bg-gradient-to-br from-orange-500 to-red-500'
                          }`}>
                            {stat.displayName.charAt(0).toUpperCase()}
                          </div>
                          
                          {editingSpeaker === stat.speaker ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                defaultValue={stat.displayName}
                                onBlur={(e) => updateSpeakerName(stat.speaker, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') updateSpeakerName(stat.speaker, e.target.value);
                                  if (e.key === 'Escape') setEditingSpeaker(null);
                                }}
                                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{stat.displayName}</span>
                              <button
                                onClick={() => setEditingSpeaker(stat.speaker)}
                                className="text-xs text-slate-500 hover:text-slate-300"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-semibold text-white">{percentage}%</div>
                          <div className="text-xs text-slate-400">
                            {formatTime(stat.duration)} • {stat.segments} segments
                          </div>
                        </div>
                      </div>
                      
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            idx === 0 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                            idx === 1 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                            idx === 2 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            'bg-gradient-to-r from-orange-500 to-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                    {transcript.segments?.map((segment, segIdx) => {
                      const speaker = segment.speaker || 'Unknown';
                      const displayName = speakerNames[speaker] || speaker;
                      const speakerIndex = getSpeakerStats().findIndex(s => s.speaker === speaker);
                      
                      return (
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
                            
                            {speaker !== 'Unknown' && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  speakerIndex === 0 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                                  speakerIndex === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                                  speakerIndex === 2 ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                                  'bg-gradient-to-br from-orange-500 to-red-500'
                                }`}>
                                  {displayName.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-semibold text-slate-400">
                                  {displayName}
                                </span>
                              </div>
                            )}
                            
                            <p className="text-sm text-slate-200 leading-relaxed flex-1">
                              {segment.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          meeting={meeting}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          meeting={meeting}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default MeetingDetail;