// frontend/src/App.jsx
import React, { Suspense, lazy } from 'react';
import { NotificationManager } from './components/NotificationBanner';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { VoiceCommandProvider } from './contexts/VoiceCommandContext';
import { AssistantProvider } from './contexts/AssistantContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AssistantBubble from './components/AssistantBubble';

// ✅ Lazy-loaded auth pages — only downloaded when needed
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const SharedMeeting = lazy(() => import('./pages/SharedMeeting'));
const VoiceTest = lazy(() => import('./components/VoiceTest'));

// ✅ Lazy-loaded protected pages — downloaded only after login
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MeetingRoom = lazy(() => import('./pages/MeetingRoom'));
const Meetings = lazy(() => import('./pages/Meetings'));
const MeetingDetail = lazy(() => import('./pages/MeetingDetail'));
const Performance = lazy(() => import('./pages/Performance'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Architecture = lazy(() => import('./pages/Architecture'));
const ActionItems = lazy(() => import('./pages/ActionItems'));
const Search = lazy(() => import('./pages/Search'));
const FeedbackAnalytics = lazy(() => import('./pages/FeedbackAnalytics'));
const LiveMeeting = lazy(() => import('./pages/LiveMeeting'));

// ✅ Keep these eagerly loaded — they're always visible in the authenticated layout
import VoiceButton from './components/VoiceButton';
import VoiceSettings from './components/VoiceSettings';

// Page-level loading fallback
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[60vh]">
    <div className="relative flex items-center justify-center">
      <div
        className="w-10 h-10 rounded-full border-4 border-transparent"
        style={{
          borderTopColor: '#6366f1',
          borderRightColor: '#8b5cf6',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <AssistantProvider>
          <VoiceCommandProvider>
            <>
              <NotificationManager />
              <Routes>
                {/* Public Routes — each loads its own chunk */}
                <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
                <Route path="/register" element={<Suspense fallback={<PageLoader />}><Register /></Suspense>} />
                <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>} />
                <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
                <Route path="/shared/:token" element={<Suspense fallback={<PageLoader />}><SharedMeeting /></Suspense>} />
                <Route path="/voice-test" element={<Suspense fallback={<PageLoader />}><VoiceTest /></Suspense>} />

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
                            {/* ✅ Single Suspense boundary for all protected pages */}
                            <Suspense fallback={<PageLoader />}>
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
                            </Suspense>
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

