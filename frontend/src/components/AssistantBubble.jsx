import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

function AssistantBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text:
        "Hi 👋 I'm your meeting assistant.\n\n" +
        "You can ask things like:\n" +
        "• What were my tasks in the last meeting?\n" +
        "• What did Riya say about backend?\n" +
        "• Give me a summary of the last meeting.",
    },
  ]);

  const messagesEndRef = useRef(null);

  // Fake demo data (later this will come from backend / database)
  const lastMeetingSummary =
    "Last meeting was about sprint planning and backend integration. " +
    "Tasks were assigned for API work, analytics UI, and documentation.";

  const fakeTasks = [
    "You: Integrate backend API with meeting dashboard.",
    "Riya: Prepare final project report draft.",
    "Amit: Design analytics and charts UI.",
  ];

  const riyaNotes =
    "Riya mentioned that the backend should be completed by Friday and the report draft should be ready before the demo.";

  const amitNotes =
    "Amit said he will handle the analytics charts and improve the performance dashboard UI.";

  // Decide reply based on question text
  const generateBotReply = (question) => {
    const q = question.toLowerCase();

    if (q.includes("summary") || q.includes("summarize")) {
      return (
        "📝 Meeting Summary (Demo):\n\n" +
        lastMeetingSummary +
        "\n\nLater I’ll generate this automatically from your real transcripts."
      );
    }

    if (q.includes("task") || q.includes("todo") || q.includes("action item")) {
      return (
        "✅ Here are your demo tasks from the last meeting:\n\n" +
        fakeTasks.map((t) => "• " + t).join("\n") +
        "\n\nLater I’ll read real tasks from your stored action-item list."
      );
    }

    if (q.includes("riya")) {
      return (
        "🧑‍💻 Riya (Demo info):\n\n" +
        riyaNotes +
        "\n\nIn the real system, I’ll search actual transcripts where Riya spoke."
      );
    }

    if (q.includes("amit")) {
      return (
        "🎨 Amit (Demo info):\n\n" +
        amitNotes +
        "\n\nLater I’ll show Amit’s tasks, talk time, and performance trends."
      );
    }

    if (q.includes("who said") || q.includes("who told")) {
      return (
        "🔍 In the future, I’ll scan transcripts to answer ‘who said what’. " +
        "For now this is a demo — once backend is connected, I’ll search by speaker and keywords."
      );
    }

    if (q.includes("performance") || q.includes("score")) {
      return (
        "📊 Performance (Demo):\n\n" +
        "I’ll combine talk-time, sentiment and task completion to give each participant a performance score.\n" +
        "Right now, this is a UI-only preview."
      );
    }

    if (q.includes("help")) {
      return (
        "Here’s what you can ask me (demo):\n\n" +
        "• \"What were my tasks in the last meeting?\"\n" +
        "• \"Give me a summary of the last meeting.\"\n" +
        "• \"What did Riya say about backend?\"\n" +
        "• \"Show performance details\""
      );
    }

    return (
      "I’ve noted your question:\n\n" +
      `"${question}"\n\n` +
      "Right now I’m using demo data only. Once your backend is ready, " +
      "I’ll answer using real meeting transcripts, tasks, and performance analytics."
    );
  };

  /* Auto-scroll when new message arrives */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  /* Close on ESC */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || typing) return;

    // Add user message
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    toast.success("Message sent");

    // Show typing indicator
    setTyping(true);

    // Fake AI delay, then smart-ish demo reply
    setTimeout(() => {
      const reply = generateBotReply(trimmed);
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
      setTyping(false);
    }, 900);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleAssistant = () => {
    setIsOpen((prev) => {
      const newState = !prev;
      toast(newState ? "Assistant opened" : "Assistant closed");
      return newState;
    });
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleAssistant}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 flex items-center justify-center text-sm font-semibold border border-emerald-300/50 transition-transform duration-150 hover:scale-105"
        title="Smart Assistant"
      >
        <span className="relative">
          SMA
          <span className="absolute -top-1 -right-2 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
        </span>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 w-80 bg-slate-900/60 border border-slate-600/40 rounded-2xl shadow-2xl shadow-emerald-900/40 flex flex-col text-sm backdrop-blur-xl ring-1 ring-white/10">

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Meeting Assistant</h3>
                <span className="flex items-center gap-1 text-xs text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Demo mode – real AI will connect to your backend later
              </p>
            </div>
            <button
              className="text-xs text-slate-400 hover:text-white"
              onClick={toggleAssistant}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 px-3 py-2 space-y-2 overflow-y-auto max-h-64 bg-gradient-to-b from-slate-900/60 to-slate-950">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.from === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-3 py-1.5 rounded-xl max-w-[80%] text-xs leading-relaxed whitespace-pre-line ${
                    msg.from === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 animate-pulse">
                  Assistant is typing...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-800 px-3 py-2 bg-slate-950">
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs px-2 py-1.5 resize-none outline-none focus:border-emerald-500"
              rows={2}
              placeholder='Try: "What were my tasks in last meeting?"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={typing}
            />
            <button
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!input.trim() || typing}
              onClick={handleSend}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AssistantBubble;
