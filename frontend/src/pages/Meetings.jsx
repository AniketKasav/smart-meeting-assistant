import { useState, useEffect } from "react";

function MeetingRoom() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval;

    if (isLive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isLive]);

  const formatTime = (totalSeconds) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const toggleMeeting = () => {
    setIsLive(!isLive);
    if (!isLive) setSeconds(0);
  };

  return (
    <div className="mt-2 space-y-6">

      {/* TOP ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Meeting Info</h3>
          <p className="text-sm text-slate-400">Title: Team Discussion</p>
          <p className="text-sm text-slate-400">
            Status:{" "}
            <span className={isLive ? "text-emerald-400" : "text-slate-400"}>
              {isLive ? "Live" : "Idle"}
            </span>
          </p>
          <p className="text-sm text-slate-400">
            Duration: {formatTime(seconds)}
          </p>

          <button
            onClick={toggleMeeting}
            className={`mt-4 w-full py-2 rounded ${
              isLive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            } text-white`}
          >
            {isLive ? "Stop Meeting" : "Start Meeting"}
          </button>
        </div>

        {/* CENTER */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Live Transcript</h3>
          <div className="h-64 overflow-y-auto text-sm text-slate-300 border border-slate-800 rounded p-2">
            {isLive
              ? "Listening and capturing meeting audio..."
              : "Meeting not started yet."}
          </div>
        </div>

      </div>

      {/* UPLOAD SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-2">Upload Past Meeting Recording</h3>
        <p className="text-sm text-slate-400">
          Upload audio for offline analysis (frontend demo only)
        </p>
      </div>
    </div>
  );
}

export default MeetingRoom;
