import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database, Server, Globe, Cpu, Zap, Brain, BarChart3, FileText, Check } from 'lucide-react';

const ArchitectureDiagram = () => {
  const [expandedSections, setExpandedSections] = useState({
    current: true,
    nextPhase: true,
    dataFlow: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Smart Meeting Assistant</h1>
        <p className="text-slate-600">Software Architecture & Development Roadmap</p>
        <div className="mt-4 flex gap-4">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Core: ✓ Complete</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Phase 2: AI Enhancement</span>
        </div>
      </div>

      {/* Current Architecture */}
      <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => toggleSection('current')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-150 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.current ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            <h2 className="text-xl font-bold text-slate-800">Current Architecture (Working)</h2>
          </div>
          <Check className="w-5 h-5 text-green-600" />
        </button>
        
        {expandedSections.current && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Frontend Layer */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-6 h-6 text-blue-600" />
                  <h3 className="font-bold text-lg text-slate-800">Frontend Layer</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-white p-3 rounded shadow-sm">
                    <p className="font-semibold text-blue-900">React (Vite)</p>
                    <p className="text-slate-600 text-xs mt-1">Port 5173</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="font-medium text-slate-700">Pages:</p>
                    <ul className="text-slate-600 text-xs mt-1 space-y-1">
                      <li>• Dashboard</li>
                      <li>• MeetingRoom (Recording)</li>
                      <li>• MeetingDetail</li>
                    </ul>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="font-medium text-slate-700">Tech:</p>
                    <ul className="text-slate-600 text-xs mt-1">
                      <li>• Socket.IO Client</li>
                      <li>• React Router</li>
                      <li>• Axios</li>
                      <li>• Web Audio API</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Backend Layer */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-lg border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <Server className="w-6 h-6 text-purple-600" />
                  <h3 className="font-bold text-lg text-slate-800">Backend Layer</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-white p-3 rounded shadow-sm">
                    <p className="font-semibold text-purple-900">Node.js + Express</p>
                    <p className="text-slate-600 text-xs mt-1">Port 4000</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="font-medium text-slate-700">Services:</p>
                    <ul className="text-slate-600 text-xs mt-1 space-y-1">
                      <li>• Real-time (Socket.IO)</li>
                      <li>• Audio Processing</li>
                      <li>• FFmpeg Concat</li>
                      <li>• REST API</li>
                    </ul>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="font-medium text-slate-700">Models:</p>
                    <ul className="text-slate-600 text-xs mt-1">
                      <li>• Meeting</li>
                      <li>• Transcript</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Data & AI Layer */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-lg border-2 border-amber-200">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-6 h-6 text-amber-600" />
                  <h3 className="font-bold text-lg text-slate-800">Data & AI Layer</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-white p-3 rounded shadow-sm">
                    <p className="font-semibold text-amber-900">MongoDB Local</p>
                    <p className="text-slate-600 text-xs mt-1">Port 27017</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="font-medium text-slate-700">Python AI:</p>
                    <ul className="text-slate-600 text-xs mt-1 space-y-1">
                      <li>• Whisper (faster-whisper)</li>
                      <li>• Model: "small"</li>
                      <li>• Output: JSON segments</li>
                    </ul>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="font-medium text-slate-700">Storage:</p>
                    <ul className="text-slate-600 text-xs mt-1">
                      <li>• /uploads (WAV files)</li>
                      <li>• Transcript JSON</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Flow */}
      <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => toggleSection('dataFlow')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-150 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.dataFlow ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            <h2 className="text-xl font-bold text-slate-800">Data Flow Pipeline</h2>
          </div>
          <Zap className="w-5 h-5 text-cyan-600" />
        </button>
        
        {expandedSections.dataFlow && (
          <div className="p-6">
            <div className="flex flex-col gap-4">
              {[
                { step: 1, title: 'Audio Capture', desc: 'Web Audio API → 2sec WAV chunks', color: 'blue' },
                { step: 2, title: 'Real-time Upload', desc: 'Socket.IO → /uploads/{meetingId}/', color: 'purple' },
                { step: 3, title: 'Concatenation', desc: 'FFmpeg merges chunks → combined.wav', color: 'indigo' },
                { step: 4, title: 'Transcription', desc: 'Python Whisper → transcript.json', color: 'violet' },
                { step: 5, title: 'Database Storage', desc: 'MongoDB saves Meeting + Transcript', color: 'fuchsia' },
                { step: 6, title: 'Display', desc: 'React fetches & displays with audio player', color: 'pink' }
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-${item.color}-500 text-white flex items-center justify-center font-bold`}>
                    {item.step}
                  </div>
                  <div className={`flex-1 bg-${item.color}-50 border-2 border-${item.color}-200 rounded-lg p-4`}>
                    <p className="font-semibold text-slate-800">{item.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next Phase */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => toggleSection('nextPhase')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-150 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.nextPhase ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            <h2 className="text-xl font-bold text-slate-800">Phase 2: AI Enhancement Architecture</h2>
          </div>
          <Brain className="w-5 h-5 text-indigo-600" />
        </button>
        
        {expandedSections.nextPhase && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AI Services */}
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-5 rounded-lg border-2 border-rose-200">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-6 h-6 text-rose-600" />
                  <h3 className="font-bold text-lg text-slate-800">AI Services Layer</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-white p-3 rounded shadow-sm">
                    <p className="font-semibold text-rose-900">summaryService.js</p>
                    <ul className="text-slate-600 text-xs mt-2 space-y-1">
                      <li>• Claude/GPT-4 integration</li>
                      <li>• Executive summaries</li>
                      <li>• Action item extraction</li>
                      <li>• Topic tagging</li>
                      <li>• Sentiment analysis</li>
                    </ul>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <p className="font-semibold text-rose-900">analyticsService.js</p>
                    <ul className="text-slate-600 text-xs mt-2 space-y-1">
                      <li>• Speaking time calculation</li>
                      <li>• Word count & WPM</li>
                      <li>• Filler word detection</li>
                      <li>• Engagement scoring</li>
                      <li>• Turn-taking analysis</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* New Features */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-lg border-2 border-emerald-200">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  <h3 className="font-bold text-lg text-slate-800">New Features</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-white p-3 rounded shadow-sm">
                    <p className="font-semibold text-emerald-900">Enhanced UI Components</p>
                    <ul className="text-slate-600 text-xs mt-2 space-y-1">
                      <li>• MeetingSummary.jsx</li>
                      <li>• ActionItemsCard.jsx</li>
                      <li>• Performance.jsx (charts)</li>
                      <li>• AdvancedSearch.jsx</li>
                    </ul>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <p className="font-semibold text-emerald-900">Export Service</p>
                    <ul className="text-slate-600 text-xs mt-2 space-y-1">
                      <li>• PDF exports (pdfkit)</li>
                      <li>• DOCX exports (docx.js)</li>
                      <li>• SRT subtitles</li>
                      <li>• Email integration</li>
                    </ul>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <p className="font-semibold text-emerald-900">Database Updates</p>
                    <ul className="text-slate-600 text-xs mt-2 space-y-1">
                      <li>• Meeting.summary schema</li>
                      <li>• Meeting.analytics schema</li>
                      <li>• Full-text search indexes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Implementation Priority */}
            <div className="mt-6 bg-gradient-to-r from-slate-50 to-slate-100 p-5 rounded-lg border-2 border-slate-200">
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Implementation Priority
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { num: 1, title: 'AI Summary', status: 'High Priority', color: 'red' },
                  { num: 2, title: 'Analytics', status: 'High Priority', color: 'orange' },
                  { num: 3, title: 'Search', status: 'Medium Priority', color: 'yellow' },
                  { num: 4, title: 'Export', status: 'Medium Priority', color: 'green' }
                ].map((item) => (
                  <div key={item.num} className={`bg-${item.color}-50 border-2 border-${item.color}-200 p-4 rounded-lg text-center`}>
                    <div className={`text-2xl font-bold text-${item.color}-600 mb-1`}>#{item.num}</div>
                    <div className="font-semibold text-slate-800">{item.title}</div>
                    <div className={`text-xs text-${item.color}-700 mt-1`}>{item.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tech Stack Summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 text-center">
          <Cpu className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Frontend</p>
          <p className="text-xs text-slate-600 mt-1">React + Vite</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200 text-center">
          <Server className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Backend</p>
          <p className="text-xs text-slate-600 mt-1">Node.js + Express</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200 text-center">
          <Database className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Database</p>
          <p className="text-xs text-slate-600 mt-1">MongoDB</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-lg border-2 border-rose-200 text-center">
          <Brain className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="font-bold text-slate-800">AI/ML</p>
          <p className="text-xs text-slate-600 mt-1">Whisper + Claude</p>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureDiagram;