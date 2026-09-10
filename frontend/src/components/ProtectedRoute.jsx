import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        {/* Animated Logo / Spinner */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Outer ring */}
          <div
            className="absolute w-16 h-16 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: '#6366f1',
              borderRightColor: '#8b5cf6',
              animation: 'spin 1s linear infinite',
            }}
          />
          {/* Inner pulse */}
          <div
            className="w-8 h-8 rounded-full bg-indigo-500 opacity-80"
            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
          />
        </div>

        <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">
          Authenticating…
        </p>
        <p className="text-slate-600 text-xs mt-1">
          This may take a moment if the server is waking up
        </p>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1.1); }
          }
        `}</style>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
