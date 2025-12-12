function Settings() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 text-sm">

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Use local processing</p>
            <p className="text-xs text-slate-400">
              Keep AI processing on your machine for privacy.
            </p>
          </div>
          <input type="checkbox" className="accent-emerald-500" defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Live transcript</p>
            <p className="text-xs text-slate-400">
              Show transcription while meeting is running.
            </p>
          </div>
          <input type="checkbox" className="accent-emerald-500" defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Performance scoring (experimental)</p>
            <p className="text-xs text-slate-400">
              Enable analytical scoring based on behavior.
            </p>
          </div>
          <input type="checkbox" className="accent-emerald-500" />
        </div>

      </div>
    </div>
  );
}

export default Settings;
