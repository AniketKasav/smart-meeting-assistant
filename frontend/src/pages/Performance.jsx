function Performance() {
  const people = [
    { name: "Aniket", score: 82, talkTime: "32%", tasks: 4 },
    { name: "Riya", score: 76, talkTime: "28%", tasks: 3 },
    { name: "Amit", score: 69, talkTime: "24%", tasks: 2 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Performance Overview</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs">Avg Engagement Score</p>
          <p className="text-lg font-semibold">78%</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs">Meetings Analyzed</p>
          <p className="text-lg font-semibold">12</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs">Action Items Closed</p>
          <p className="text-lg font-semibold">34</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Per Member Performance</h3>
        <table className="w-full text-sm">
          <thead className="text-slate-400 border-b border-slate-700">
            <tr>
              <th className="text-left pb-2">Name</th>
              <th className="text-left pb-2">Score</th>
              <th className="text-left pb-2">Talk Time</th>
              <th className="text-left pb-2">Tasks</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p, i) => (
              <tr key={i} className="border-b border-slate-800">
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.score}</td>
                <td className="py-2">{p.talkTime}</td>
                <td className="py-2">{p.tasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Performance;
