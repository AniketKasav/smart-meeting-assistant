function NotificationsPanel({ onClose }) {
  const items = [
    {
      title: "Meeting analyzed",
      body: "Sprint Planning meeting summary and tasks generated.",
      time: "2h ago",
    },
    {
      title: "Tasks updated",
      body: "3 action items marked as completed.",
      time: "5h ago",
    },
    {
      title: "Performance snapshot ready",
      body: "New engagement metrics available on the dashboard.",
      time: "Yesterday",
    },
  ];

  return (
    <div className="fixed top-4 right-4 w-80 bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl shadow-slate-900/60 text-sm backdrop-blur-xl z-40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <p className="font-semibold text-sm">Notifications</p>
          <p className="text-xs text-slate-400">Demo activity feed</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-100"
        >
          ✕
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto p-3 space-y-3">
        {items.map((n, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2"
          >
            <p className="text-xs text-slate-400">{n.time}</p>
            <p className="text-sm font-medium">{n.title}</p>
            <p className="text-xs text-slate-300 mt-0.5">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsPanel;
