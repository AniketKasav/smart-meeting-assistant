function Reports() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Reports & Export</h2>

      <p className="text-sm text-slate-400">
        Generate reports for meetings and performance analytics. Backend export will be connected later.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-lg font-semibold">Meeting Report</h3>
          <p>Includes summary, transcript, and action items for a meeting.</p>
          <button className="px-4 py-2 rounded bg-slate-700 text-white opacity-60 cursor-not-allowed">
            Export PDF (coming soon)
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-lg font-semibold">Task Export</h3>
          <p>Export assigned tasks to CSV/Excel for tracking.</p>
          <button className="px-4 py-2 rounded bg-slate-700 text-white opacity-60 cursor-not-allowed">
            Export CSV (coming soon)
          </button>
        </div>

      </div>
    </div>
  );
}

export default Reports;
