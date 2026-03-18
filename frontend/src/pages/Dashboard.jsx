// frontend/src/pages/Dashboard.jsx - FIXED
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw,
  Video,
  Clock,
  Users,
  FileText,
  TrendingUp
} from 'lucide-react';
import { meetingsAPI } from '../services/api';
import MeetingCard from '../components/MeetingCard';
import CreateMeetingModal from '../components/CreateMeetingModal';
import VoiceButton from '../components/VoiceButton';
import AIResponseDisplay from '../components/AIResponseDisplay';
import { useAssistant } from '../contexts/AssistantContext';
import SuggestionPanel from '../components/SuggestionPanel';
import { NotificationManager, showNotification } from '../components/NotificationBanner';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // ✅ FIX: Get userId from localStorage
  const userId = localStorage.getItem('userId');
  
  // State
  const [showBriefingPanel, setShowBriefingPanel] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    totalDuration: 0,
  });

  // AI Assistant
  const { messages, isProcessing } = useAssistant();

  // ✅ FIX: Moved showBriefing function here (not outside component)
  const handleShowBriefing = () => {
    showNotification({
      type: 'info',
      title: 'Morning Briefing',
      message: 'Good morning! Check the briefing panel for your daily overview.',
      duration: 5000
    });
    setShowBriefingPanel(true);
  };

  // Fetch meetings
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await meetingsAPI.getAllMeetings(params);
      const fetchedMeetings = response.data.meetings || [];
      
      setMeetings(fetchedMeetings);

      // Calculate stats
      const statsData = {
        total: fetchedMeetings.length,
        inProgress: fetchedMeetings.filter(m => m.status === 'in-progress').length,
        completed: fetchedMeetings.filter(m => m.status === 'completed').length,
        totalDuration: fetchedMeetings.reduce((sum, m) => sum + (m.duration || 0), 0),
      };
      setStats(statsData);

    } catch (err) {
      console.error('Failed to fetch meetings:', err);
      setError('Failed to load meetings. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [statusFilter]);

  // Handle delete meeting
  const handleDeleteMeeting = async (meetingId) => {
    try {
      await meetingsAPI.deleteMeeting(meetingId);
      fetchMeetings(); // Refresh list
    } catch (err) {
      console.error('Failed to delete meeting:', err);
      alert('Failed to delete meeting');
    }
  };

  // Handle create new meeting
  const handleCreateMeeting = async () => {
    try {
      // Generate unique meeting ID
      const newMeetingId = `meeting_${Date.now()}`;
      
      // Create meeting in database
      const response = await fetch('http://localhost:4000/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: newMeetingId,
          title: `Meeting ${new Date().toLocaleDateString()}`,
          status: 'in-progress'
        })
      });

      if (response.ok) {
        // Navigate directly to the meeting room
        navigate(`/meeting/${newMeetingId}`);
      } else {
        alert('Failed to create meeting');
      }
    } catch (err) {
      console.error('Error creating meeting:', err);
      alert('Failed to create meeting');
    }
  };

  // Filter meetings by search query
  const filteredMeetings = meetings.filter(meeting => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      meeting.title?.toLowerCase().includes(query) ||
      meeting.meetingId?.toLowerCase().includes(query) ||
      meeting.owner?.name?.toLowerCase().includes(query) ||
      meeting.description?.toLowerCase().includes(query)
    );
  });

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6 p-6 relative">
      {/* ✅ Notification Manager */}
      <NotificationManager />

      {/* ✅ Suggestion Panel - Fixed position */}
      {showBriefingPanel && userId && (
        <div className="fixed top-20 right-6 z-50">
          <SuggestionPanel 
            userId={userId} 
            onClose={() => setShowBriefingPanel(false)}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage your meetings and view insights</p>
        </div>

        <div className="flex gap-3">
          {/* ✅ Briefing Button */}
          <button
            onClick={handleShowBriefing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 border border-purple-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Daily Briefing
          </button>

          <button
            onClick={fetchMeetings}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Meeting
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
          <p className="font-medium">⚠️ {error}</p>
          <p className="text-sm mt-1">Check if MongoDB is connected and backend server is running.</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Video className="w-5 h-5 text-blue-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-slate-400">Total Meetings</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{stats.inProgress}</div>
          <div className="text-sm text-slate-400">In Progress</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{stats.completed}</div>
          <div className="text-sm text-slate-400">Completed</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Users className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{formatDuration(stats.totalDuration)}</div>
          <div className="text-sm text-slate-400">Total Duration</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search meetings by title, ID, or host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-slate-900/70 border border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[180px]"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Meetings Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading meetings...</p>
          </div>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="text-center py-20">
          <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">
            {searchQuery ? 'No meetings found' : 'No meetings yet'}
          </h3>
          <p className="text-slate-500 mb-6">
            {searchQuery 
              ? 'Try adjusting your search query or filters'
              : 'Create your first meeting to get started'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/meeting-room')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Meeting
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">
              Showing {filteredMeetings.length} of {meetings.length} meetings
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMeetings.map((meeting) => (
              <MeetingCard
                key={meeting._id || meeting.meetingId}
                meeting={meeting}
                onDelete={handleDeleteMeeting}
                onRefresh={fetchMeetings}
              />
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <CreateMeetingModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />


      {/* ✅ FIXED: Floating Voice + AI Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        {(messages?.length > 0 || isProcessing) && (
          <div className="w-96 max-h-96">
            <AIResponseDisplay />
          </div>
        )}
        <VoiceButton />
      </div>
    </div>
  );
};

export default Dashboard;