import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Settings = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Profile form
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/auth/profile`,
        profileData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessage('✓ Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/forgot-password`,
        { email: user.email }
      );

      setMessage('✓ Password reset link sent to your email');
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError('Failed to send reset link');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!window.confirm('This will log you out from all devices. Continue?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/logout-all`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      logout();
    } catch (err) {
      setError('Failed to logout from all devices');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete your account and all associated data. This action cannot be undone.'
    );
    if (!confirmed) return;

    const doubleConfirm = window.prompt('Type "DELETE" in capital letters to confirm account deletion:');
    if (doubleConfirm !== 'DELETE') {
      setError('Account deletion cancelled');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/auth/account`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      logout();
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Account Settings
              </h1>
              <p className="text-gray-600">Manage your profile and account preferences</p>
            </div>
            <Link 
              to="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-green-800 animate-fade-in shadow-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl text-red-800 animate-fade-in shadow-sm">
            ✗ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="flex flex-wrap border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">👤</span>
              Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'security'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">🔒</span>
              Security
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'sessions'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">📱</span>
              Sessions
            </button>
            <button
              onClick={() => setActiveTab('danger')}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'danger'
                  ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-sm'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">⚠️</span>
              Danger Zone
            </button>
          </div>

          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {user?.role?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          Member since {new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 shadow-sm"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 shadow-sm"
                      placeholder="your.email@example.com"
                      required
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      We'll send a verification email if you change your email address
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving Changes...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🔐</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Management</h3>
                      <p className="text-sm text-gray-700 mb-4">
                        For security reasons, password changes must be done through email verification. 
                        We'll send a secure reset link to your registered email address.
                      </p>
                      <button
                        onClick={handlePasswordResetRequest}
                        disabled={loading}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">✓</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Status</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Email Verified</span>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                            Verified
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Account Status</span>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Last Login</span>
                          <span className="text-gray-600">
                            {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-lg">
                        💻
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Current Device</h3>
                        <p className="text-sm text-gray-600">Browser • Active now</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full animate-pulse">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 bg-white/50 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-semibold">IP Address:</span> {window.location.hostname}
                      </div>
                      <div>
                        <span className="font-semibold">Last Activity:</span> Just now
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Session Management</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    This will invalidate all active sessions across all devices and log you out everywhere. 
                    You'll need to log in again on this device.
                  </p>
                  <button
                    onClick={handleLogoutAllDevices}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-xl transform hover:scale-[1.02] transition-all"
                  >
                    Logout from All Devices
                  </button>
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-xl p-8">
                  <div className="flex items-start space-x-4 mb-6">
                    <span className="text-4xl">⚠️</span>
                    <div>
                      <h3 className="text-2xl font-bold text-red-900 mb-2">
                        Delete Account Permanently
                      </h3>
                      <p className="text-sm text-red-700 leading-relaxed">
                        This action is <strong>irreversible</strong>. All your data including meetings, 
                        transcripts, and personal information will be permanently deleted from our servers. 
                        This cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 mb-6 border border-red-200">
                    <h4 className="font-semibold text-gray-900 mb-3">What will be deleted:</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center">
                        <span className="mr-2 text-red-500">✗</span>
                        All meeting recordings and transcripts
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2 text-red-500">✗</span>
                        Personal profile and preferences
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2 text-red-500">✗</span>
                        Account access and login credentials
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2 text-red-500">✗</span>
                        All analytics and reports
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={handleDeleteAccount}
                    className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white px-6 py-4 rounded-xl font-bold hover:shadow-2xl transform hover:scale-[1.02] transition-all text-lg"
                  >
                    I Understand, Delete My Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;