import { useAuth } from '../hooks/useAuth';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold">
          Smart Meeting Assistant
        </h1>
        <p className="text-xs text-slate-400">
          Live & recorded meeting intelligence
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-300">Welcome, {user?.name}</span>
        <button onClick={logout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm">
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
