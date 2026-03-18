// frontend/src/pages/LiveMeeting.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Clock, Users, Sparkles } from 'lucide-react';

const LiveMeeting = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: new Date().toTimeString().slice(0, 5)
  });

  const handleQuickStart = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('http://localhost:4000/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Quick Meeting - ${new Date().toLocaleString()}`,
          scheduledDate: new Date().toISOString().split('T')[0],
          scheduledTime: new Date().toTimeString().slice(0, 5),
          status: 'scheduled'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        navigate(`/meeting/${data.meeting.meetingId}`);
      } else {
        alert('Failed to create meeting');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('Failed to start meeting');
      setIsCreating(false);
    }
  };

  const handleScheduledStart = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      const response = await fetch('http://localhost:4000/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'scheduled'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        navigate(`/meeting/${data.meeting.meetingId}`);
      } else {
        alert('Failed to create meeting');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('Failed to start meeting');
      setIsCreating(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Start a Meeting</h1>
          <p className="text-slate-400">Create a new meeting or schedule one for later</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Start Card */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
              <Video className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">Quick Start</h2>
            <p className="text-slate-400 mb-6">
              Start an instant meeting right now. Perfect for impromptu discussions and quick catch-ups.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-slate-300">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                Instant meeting creation
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                Automatic recording & transcription
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                AI-powered insights
              </li>
            </ul>

            <button
              onClick={handleQuickStart}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Starting...
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  Start Instant Meeting
                </>
              )}
            </button>
          </div>

          {/* Schedule Meeting Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">Schedule Meeting</h2>
            <p className="text-slate-400 mb-6">
              Create a meeting with custom details. You can start it immediately or save it for later.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Team Sync, Project Review, etc."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Add meeting agenda or notes..."
                  rows={3}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    name="scheduledDate"
                    value={formData.scheduledDate}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Time
                  </label>
                  <input
                    type="time"
                    name="scheduledTime"
                    value={formData.scheduledTime}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleScheduledStart}
                disabled={isCreating}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Create & Start Meeting
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            What You Get With Every Meeting
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Video className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">HD Video & Audio</h4>
                <p className="text-sm text-slate-400">Crystal clear video calls with automatic recording</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">AI Transcription</h4>
                <p className="text-sm text-slate-400">Real-time transcription with speaker identification</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Team Insights</h4>
                <p className="text-sm text-slate-400">Analytics on participation and engagement</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMeeting;