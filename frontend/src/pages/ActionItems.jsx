// frontend/src/pages/ActionItems.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  User,
  Calendar,
  Flag,
  Edit2,
  Trash2,
  ChevronDown,
  ExternalLink,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { actionItemsAPI } from '../services/api';

const ActionItems = () => {
  const navigate = useNavigate();
  const [actionItems, setActionItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [assignees, setAssignees] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignee: '',
    overdue: false,
    search: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchActionItems();
    fetchAssignees();
  }, [filters.status, filters.priority, filters.assignee, filters.overdue]);

  const fetchActionItems = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assignee) params.assignee = filters.assignee;
      if (filters.overdue) params.overdue = 'true';

      const response = await actionItemsAPI.getAllActionItems(params);
      const data = response.data;

      if (data.success) {
        setActionItems(data.data.actionItems);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching action items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignees = async () => {
    try {
      const response = await actionItemsAPI.getAssignees();
      const data = response.data;
      if (data.success) {
        setAssignees(data.data);
      }
    } catch (error) {
      console.error('Error fetching assignees:', error);
    }
  };

  const updateActionItem = async (meetingId, itemId, updates) => {
    try {
      const response = await actionItemsAPI.updateActionItem(meetingId, itemId, updates);
      const data = response.data;
      if (data.success) {
        fetchActionItems(); // Refresh list
      }
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  };

  const deleteActionItem = async (meetingId, itemId) => {
    if (!window.confirm('Are you sure you want to delete this action item?')) {
      return;
    }

    try {
      const response = await actionItemsAPI.deleteActionItem(meetingId, itemId);
      const data = response.data;
      if (data.success) {
        fetchActionItems(); // Refresh list
      }
    } catch (error) {
      console.error('Error deleting action item:', error);
    }
  };

  const toggleStatus = (item) => {
    const statusOrder = ['open', 'in-progress', 'completed'];
    const currentIndex = statusOrder.indexOf(item.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    
    updateActionItem(item.meetingId, item._id, { status: nextStatus });
  };

  const isOverdue = (item) => {
    if (!item.dueDate || item.status === 'completed') return false;
    return new Date(item.dueDate) < new Date();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Circle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in-progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const filteredItems = actionItems.filter(item => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      item.title?.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search) ||
      item.assignee?.toLowerCase().includes(search) ||
      item.meetingTitle?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-purple-400" />
            Action Items Tracker
          </h1>
          <p className="text-slate-400">Manage and track all action items from your meetings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Flag className="w-5 h-5 text-purple-400" />
              <span className="text-2xl font-bold text-white">{stats.total || 0}</span>
            </div>
            <p className="text-slate-400 text-sm">Total Items</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Circle className="w-5 h-5 text-slate-400" />
              <span className="text-2xl font-bold text-white">{stats.open || 0}</span>
            </div>
            <p className="text-slate-400 text-sm">Open</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-2xl font-bold text-white">{stats.inProgress || 0}</span>
            </div>
            <p className="text-slate-400 text-sm">In Progress</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">{stats.completed || 0}</span>
            </div>
            <p className="text-slate-400 text-sm">Completed</p>
          </div>

          <div className="bg-slate-900/70 border border-red-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{stats.overdue || 0}</span>
            </div>
            <p className="text-slate-400 text-sm">Overdue</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search action items..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Assignee Filter */}
            <select
              value={filters.assignee}
              onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Assignees</option>
              {assignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>

            {/* Overdue Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.overdue}
                onChange={(e) => setFilters({ ...filters, overdue: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 text-purple-500 focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm text-slate-300">Overdue Only</span>
            </label>

            {/* Reset Filters */}
            {(filters.status || filters.priority || filters.assignee || filters.overdue || filters.search) && (
              <button
                onClick={() => setFilters({ status: '', priority: '', assignee: '', overdue: false, search: '' })}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Action Items List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Action Items Found</h3>
            <p className="text-slate-400">
              {filters.status || filters.priority || filters.assignee || filters.overdue || filters.search
                ? 'Try adjusting your filters'
                : 'Action items from your meetings will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className={`bg-slate-900/70 border rounded-xl p-5 transition-all hover:border-purple-500/50 ${
                  isOverdue(item) ? 'border-red-500/50' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <button
                    onClick={() => toggleStatus(item)}
                    className="mt-1 hover:scale-110 transition-transform"
                  >
                    {getStatusIcon(item.status)}
                  </button>

                  {/* Content */}
                  <div className="flex-1">
                    {/* Title & Meeting */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className={`text-lg font-semibold mb-1 ${
                          item.status === 'completed' ? 'text-slate-500 line-through' : 'text-white'
                        }`}>
                          {item.title}
                        </h3>
                        <button
                          onClick={() => navigate(`/meetings/${item.meetingId}`)}
                          className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          {item.meetingTitle}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteActionItem(item.meetingId, item._id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p className="text-slate-400 text-sm mb-3">{item.description}</p>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {/* Status Badge */}
                      <span className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status === 'in-progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>

                      {/* Priority Badge */}
                      <span className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-1 ${getPriorityColor(item.priority)}`}>
                        <Flag className="w-3 h-3" />
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} Priority
                      </span>

                      {/* Assignee */}
                      {item.assignee && item.assignee !== 'Unassigned' && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <User className="w-4 h-4" />
                          {item.assignee}
                        </span>
                      )}

                      {/* Due Date */}
                      {item.dueDate && (
                        <span className={`flex items-center gap-1 ${
                          isOverdue(item) ? 'text-red-400 font-semibold' : 'text-slate-400'
                        }`}>
                          <Calendar className="w-4 h-4" />
                          {format(new Date(item.dueDate), 'MMM d, yyyy')}
                          {isOverdue(item) && <AlertCircle className="w-4 h-4" />}
                        </span>
                      )}

                      {/* Meeting Date */}
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-4 h-4" />
                        {format(new Date(item.meetingDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionItems;