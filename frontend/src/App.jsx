// frontend/src/App.jsx - FIXED VERSION
import React from 'react';
import { NotificationManager } from './components/NotificationBanner';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { VoiceCommandProvider } from './contexts/VoiceCommandContext';
import { AssistantProvider } from './contexts/AssistantContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AssistantBubble from './components/AssistantBubble';
import FeedbackAnalytics from './pages/FeedbackAnalytics';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Protected Pages
import Dashboard from './pages/Dashboard';
import MeetingRoom from './pages/MeetingRoom';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import Performance from './pages/Performance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Architecture from './pages/Architecture';
import ActionItems from './pages/ActionItems';
import Search from './pages/Search';
import SharedMeeting from './pages/SharedMeeting';
import LiveMeeting from './pages/LiveMeeting';
import VoiceTest from './components/VoiceTest';
import VoiceButton from './components/VoiceButton';
import VoiceSettings from './components/VoiceSettings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <AssistantProvider>
          <VoiceCommandProvider>
            <>
              <NotificationManager />
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/shared/:token" element={<SharedMeeting />} />
                <Route path="/voice-test" element={<VoiceTest />} />

                {/* Protected Routes with Layout */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <div className="flex h-screen bg-slate-950 text-white">
                        <Sidebar />
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <Navbar />
                          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                            <Routes>
                              <Route path="/" element={<Navigate to="/dashboard" replace />} />
                              <Route path="/dashboard" element={<Dashboard />} />
                              <Route path="/meeting/:meetingId" element={<MeetingRoom />} />
                              <Route path="/live-meeting" element={<LiveMeeting />} />
                              <Route path="/meetings" element={<Meetings />} />
                              <Route path="/meetings/:meetingId" element={<MeetingDetail />} />
                              <Route path="/performance" element={<Performance />} />
                              <Route path="/reports" element={<Reports />} />
                              <Route path="/action-items" element={<ActionItems />} />
                              <Route path="/search" element={<Search />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/architecture" element={<Architecture />} />
                                <Route path="/analytics/feedback" element={<FeedbackAnalytics />} />
                              <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                          </main>
                          <AssistantBubble />
                          <VoiceButton />
                          <VoiceSettings />
                        </div>
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </>
          </VoiceCommandProvider>
        </AssistantProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;