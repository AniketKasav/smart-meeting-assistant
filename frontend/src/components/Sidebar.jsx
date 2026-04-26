// frontend/src/components/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  Calendar, 
  TrendingUp, 
  FileText, 
  Settings,
  Mic,
  CheckCircle2,
  Search
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', type: 'link' },
    { path: '/live-meeting', icon: Mic, label: 'Live Meeting', type: 'link' },
    // { path: '/meetings', icon: Calendar, label: 'All Meetings', type: 'link' },
    { path: '/performance', icon: TrendingUp, label: 'Performance', type: 'link' },
    { path: '/reports', icon: FileText, label: 'Reports', type: 'link' },
    { path: '/action-items', icon: CheckCircle2, label: 'Action Items', type: 'link' },
    { path: '/search', icon: Search, label: 'Search', type: 'link' },
    { path: '/settings', icon: Settings, label: 'Settings', type: 'link' },
  ];

  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Smart Meeting</h1>
            <p className="text-xs text-slate-400">Assistant & Tracker</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item, index) => (
          item.type === 'button' ? (
            <button
              key={index}
              onClick={item.action}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          )
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">Storage Used</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-1/3"></div>
            </div>
            <span className="text-xs text-slate-400">33%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;