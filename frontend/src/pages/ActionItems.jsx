// frontend/src/pages/ActionItems.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Search,
  User,
  Calendar,
  Flag,
  Trash2,
  ExternalLink,
  Loader2,
  Lock,
  Plus,
  X,
  ChevronDown,
  FileCheck,
  Link2,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { actionItemsAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// ─── Add Action Item Modal ─────────────────────────────────────────────────
const AddActionItemModal = ({ onClose, onSave }) => {
  const [hostMeetings, setHostMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    meetingId: "",
    title: "",
    description: "",
    assignee: "",
    priority: "medium",
    dueDate: "",
  });

  // Participants of the selected meeting
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    fetchHostMeetings();
  }, []);

  const fetchHostMeetings = async () => {
    try {
      setLoadingMeetings(true);
      const res = await actionItemsAPI.getHostMeetings();
      if (res.data.success) {
        setHostMeetings(res.data.data);
      }
    } catch (e) {
      console.error("Error loading host meetings:", e);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleMeetingChange = (meetingId) => {
    setForm((f) => ({ ...f, meetingId, assignee: "" }));
    const selected = hostMeetings.find((m) => m.meetingId === meetingId);
    setParticipants(selected?.participants || []);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.meetingId) return setError("Please select a meeting.");
    if (!form.title.trim()) return setError("Title is required.");

    try {
      setSaving(true);
      const res = await actionItemsAPI.addActionItem(form.meetingId, {
        title: form.title.trim(),
        description: form.description.trim(),
        assignee: form.assignee || "Unassigned",
        priority: form.priority,
        dueDate: form.dueDate || null,
      });
      if (res.data.success) {
        onSave();
        onClose();
      } else {
        setError(res.data.error || "Failed to add action item.");
      }
    } catch (e) {
      setError(e.response?.data?.error || "Failed to add action item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-purple-900/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Add Action Item
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Meeting selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Meeting <span className="text-red-400">*</span>
            </label>
            {loadingMeetings ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading meetings…
              </div>
            ) : (
              <div className="relative">
                <select
                  value={form.meetingId}
                  onChange={(e) => handleMeetingChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="">Select a meeting…</option>
                  {hostMeetings.map((m) => (
                    <option key={m.meetingId} value={m.meetingId}>
                      {m.title} —{" "}
                      {m.startedAt
                        ? format(new Date(m.startedAt), "MMM d, yyyy")
                        : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Draft Q3 roadmap by Friday"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Optional details…"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
            />
          </div>

          {/* Assignee + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Assign To
              </label>
              <div className="relative">
                <select
                  value={form.assignee}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, assignee: e.target.value }))
                  }
                  disabled={!form.meetingId}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Unassigned</option>
                  {participants.map((p) => (
                    <option key={p.userId} value={p.name}>
                      {p.name}
                      {p.role === "host" ? " (host)" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {!form.meetingId && (
                <p className="text-xs text-slate-500 mt-1">
                  Select a meeting first
                </p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Priority
              </label>
              <div className="relative">
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              min={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {saving ? "Adding…" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Proof of Work Modal ────────────────────────────────────────────────────
const ProofOfWorkModal = ({ item, onClose, onSubmit }) => {
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(item, { note: note.trim(), link: link.trim() });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-green-900/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Complete Task</h2>
              <p className="text-xs text-slate-400 mt-0.5">{item.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-300">
            Add proof of completion. This will be sent to the meeting host via email.
          </p>

          {/* Note */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
              <MessageSquare className="w-4 h-4 text-green-400" />
              Completion Note
            </label>
            <textarea
              rows={3}
              placeholder="Describe what you did, results, or any notes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
            />
          </div>

          {/* Link */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
              <Link2 className="w-4 h-4 text-blue-400" />
              Proof Link <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://docs.google.com/... or any relevant URL"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
          <button
            onClick={() => {
              // Skip proof — mark complete without proof
              onSubmit(item, null);
            }}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip — no proof needed
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {submitting ? 'Completing…' : 'Mark Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────
const ActionItems = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [actionItems, setActionItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [assignees, setAssignees] = useState([]);
  const [isHost, setIsHost] = useState(false); // derived from API response
  const [showAddModal, setShowAddModal] = useState(false);
  const [proofModal, setProofModal] = useState(null); // holds the item being completed

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignee: "",
    overdue: false,
    search: "",
  });

  useEffect(() => {
    if (user?.userId) {
      fetchActionItems();
      fetchAssignees();
    }
  }, [
    filters.status,
    filters.priority,
    filters.assignee,
    filters.overdue,
    user?.userId,
  ]);

  const fetchActionItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assignee) params.assignee = filters.assignee;
      if (filters.overdue) params.overdue = "true";

      const response = await actionItemsAPI.getAllActionItems(params);
      const data = response.data;

      if (data.success) {
        setActionItems(data.data.actionItems);
        setStats(data.data.stats);
        // Use the reliable isHostOfAny flag from the server
        setIsHost(!!data.data.isHostOfAny);
      }
    } catch (error) {
      console.error("Error fetching action items:", error);
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
      console.error("Error fetching assignees:", error);
    }
  };

  const updateActionItem = async (meetingId, itemId, updates) => {
    try {
      const response = await actionItemsAPI.updateActionItem(
        meetingId,
        itemId,
        updates,
      );
      if (response.data.success) fetchActionItems();
    } catch (error) {
      console.error("Error updating action item:", error);
      alert("Failed to update action item");
    }
  };

  const deleteActionItem = async (meetingId, itemId) => {
    if (!isHost) return;
    if (!window.confirm("Delete this action item?")) return;
    try {
      const response = await actionItemsAPI.deleteActionItem(meetingId, itemId);
      if (response.data.success) fetchActionItems();
    } catch (error) {
      console.error("Error deleting action item:", error);
      alert("Failed to delete action item");
    }
  };

  const toggleStatus = (item) => {
    const order = ["open", "in-progress", "completed"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];

    // Show proof-of-work modal when transitioning to completed
    if (next === 'completed') {
      setProofModal(item);
      return;
    }

    updateActionItem(item.meetingId, item._id, { status: next });
  };

  const handleCompleteWithProof = async (item, proof) => {
    const updates = { status: 'completed' };
    if (proof && (proof.note || proof.link)) {
      updates.proofOfWork = proof;
    }
    await updateActionItem(item.meetingId, item._id, updates);
    setProofModal(null);
  };

  const canUpdateItem = (item) => {
    if (isHost) return true;
    return item.assignee?.toLowerCase() === user?.name?.toLowerCase();
  };

  const isOverdue = (item) => {
    if (!item.dueDate || item.status === "completed") return false;
    return new Date(item.dueDate) < new Date();
  };

  const getStatusIcon = (status) => {
    if (status === "completed")
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === "in-progress")
      return <Clock className="w-5 h-5 text-blue-500" />;
    return <Circle className="w-5 h-5 text-slate-400" />;
  };

  const getStatusColor = (status) => {
    if (status === "completed")
      return "bg-green-500/20 text-green-400 border-green-500/30";
    if (status === "in-progress")
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    return "bg-slate-700/50 text-slate-300 border-slate-600";
  };

  const getPriorityColor = (priority) => {
    if (priority === "high")
      return "bg-red-500/20 text-red-400 border-red-500/30";
    if (priority === "medium")
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-green-500/20 text-green-400 border-green-500/30";
  };

  const filteredItems = actionItems.filter((item) => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return (
      item.title?.toLowerCase().includes(s) ||
      item.description?.toLowerCase().includes(s) ||
      item.assignee?.toLowerCase().includes(s) ||
      item.meetingTitle?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-purple-400" />
              Action Items Tracker
            </h1>
            <p className="text-slate-400">
              {isHost
                ? "Manage and track all action items from your meetings"
                : "Action items assigned to you"}
            </p>
          </div>

          {/* Add button — host only */}
          {isHost && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-purple-900/40 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Action Item
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[
            {
              icon: <Flag className="w-5 h-5 text-purple-400" />,
              count: stats.total || 0,
              label: "Total Items",
              border: "border-slate-800",
            },
            {
              icon: <Circle className="w-5 h-5 text-slate-400" />,
              count: stats.open || 0,
              label: "Open",
              border: "border-slate-800",
            },
            {
              icon: <Clock className="w-5 h-5 text-blue-400" />,
              count: stats.inProgress || 0,
              label: "In Progress",
              border: "border-slate-800",
            },
            {
              icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
              count: stats.completed || 0,
              label: "Completed",
              border: "border-slate-800",
            },
            {
              icon: <AlertCircle className="w-5 h-5 text-red-400" />,
              count: stats.overdue || 0,
              label: "Overdue",
              border: "border-red-800/50",
              countColor: "text-red-400",
            },
          ].map(({ icon, count, label, border, countColor }) => (
            <div
              key={label}
              className={`bg-slate-900/70 border ${border} rounded-xl p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                {icon}
                <span
                  className={`text-2xl font-bold ${countColor || "text-white"}`}
                >
                  {count}
                </span>
              </div>
              <p className="text-slate-400 text-sm">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search action items..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters({ ...filters, priority: e.target.value })
              }
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {isHost ? (
              <select
                value={filters.assignee}
                onChange={(e) =>
                  setFilters({ ...filters, assignee: e.target.value })
                }
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Assignees</option>
                {assignees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4" />
                Assigned to me
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.overdue}
                onChange={(e) =>
                  setFilters({ ...filters, overdue: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-700 text-purple-500 focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm text-slate-300">Overdue Only</span>
            </label>

            {(filters.status ||
              filters.priority ||
              filters.assignee ||
              filters.overdue ||
              filters.search) && (
              <button
                onClick={() =>
                  setFilters({
                    status: "",
                    priority: "",
                    assignee: "",
                    overdue: false,
                    search: "",
                  })
                }
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Action Items Found
            </h3>
            <p className="text-slate-400 mb-6">
              {filters.status ||
              filters.priority ||
              filters.assignee ||
              filters.overdue ||
              filters.search
                ? "Try adjusting your filters"
                : isHost
                  ? "Add your first action item using the button above"
                  : "No action items are assigned to you yet"}
            </p>
            {isHost &&
              !filters.status &&
              !filters.priority &&
              !filters.assignee &&
              !filters.overdue &&
              !filters.search && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Action Item
                </button>
              )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const canUpdate = canUpdateItem(item);

              return (
                <div
                  key={item._id}
                  className={`bg-slate-900/70 border rounded-xl p-5 transition-all hover:border-purple-500/50 ${
                    isOverdue(item) ? "border-red-500/50" : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status toggle */}
                    <button
                      onClick={() => canUpdate && toggleStatus(item)}
                      className={`mt-1 transition-transform ${
                        canUpdate
                          ? "hover:scale-110 cursor-pointer"
                          : "opacity-40 cursor-not-allowed"
                      }`}
                      title={
                        canUpdate
                          ? "Click to change status"
                          : "You cannot update this item"
                      }
                    >
                      {getStatusIcon(item.status)}
                    </button>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3
                            className={`text-lg font-semibold mb-1 ${
                              item.status === "completed"
                                ? "text-slate-500 line-through"
                                : "text-white"
                            }`}
                          >
                            {item.title}
                          </h3>
                          <button
                            onClick={() =>
                              navigate(`/meetings/${item.meetingId}`)
                            }
                            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                          >
                            {item.meetingTitle}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Delete — host only */}
                        {isHost && (
                          <button
                            onClick={() =>
                              deleteActionItem(item.meetingId, item._id)
                            }
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                            title="Delete action item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-slate-400 text-sm mb-3">
                          {item.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(item.status)}`}
                        >
                          {item.status === "in-progress"
                            ? "In Progress"
                            : item.status.charAt(0).toUpperCase() +
                              item.status.slice(1)}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-1 ${getPriorityColor(item.priority)}`}
                        >
                          <Flag className="w-3 h-3" />
                          {item.priority.charAt(0).toUpperCase() +
                            item.priority.slice(1)}{" "}
                          Priority
                        </span>

                        {item.assignee && item.assignee !== "Unassigned" ? (
                          <span className="flex items-center gap-1 text-slate-400">
                            <User className="w-4 h-4" />
                            {item.assignee}
                            {item.assignee.toLowerCase() ===
                              user?.name?.toLowerCase() && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                                You
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-600 text-xs italic">
                            <User className="w-4 h-4" />
                            Unassigned
                          </span>
                        )}

                        {item.dueDate && (
                          <span
                            className={`flex items-center gap-1 ${isOverdue(item) ? "text-red-400 font-semibold" : "text-slate-400"}`}
                          >
                            <Calendar className="w-4 h-4" />
                            {format(new Date(item.dueDate), "MMM d, yyyy")}
                            {isOverdue(item) && (
                              <AlertCircle className="w-4 h-4" />
                            )}
                          </span>
                        )}

                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-4 h-4" />
                          {format(new Date(item.meetingDate), "MMM d, yyyy")}
                        </span>

                        {!isHost && !canUpdate && (
                          <span className="flex items-center gap-1 text-slate-600 text-xs">
                            <Lock className="w-3 h-3" />
                            View only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Action Item Modal */}
      {showAddModal && (
        <AddActionItemModal
          onClose={() => setShowAddModal(false)}
          onSave={fetchActionItems}
        />
      )}

      {/* Proof of Work Modal */}
      {proofModal && (
        <ProofOfWorkModal
          item={proofModal}
          onClose={() => setProofModal(null)}
          onSubmit={handleCompleteWithProof}
        />
      )}
    </div>
  );
};

export default ActionItems;

