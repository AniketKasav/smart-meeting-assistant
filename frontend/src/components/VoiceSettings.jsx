// frontend/src/components/VoiceSettings.jsx — FRIDAY Voice Settings
import { useState, useEffect } from 'react';
import {
  Settings, X, Volume2, VolumeX, Mic, MicOff,
  Zap, ChevronRight, RotateCcw, Radio
} from 'lucide-react';
import { useVoiceCommand } from '../contexts/VoiceCommandContext';

const SETTINGS_CSS = `
  @keyframes fs-in  { from{opacity:0;transform:scale(.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes fs-dot { 0%,100%{opacity:.4} 50%{opacity:1} }
  .fs-panel   { animation: fs-in .22s cubic-bezier(.16,1,.3,1); }
  .fs-pulsedot{ animation: fs-dot 1.6s ease-in-out infinite; }
  .fs-toggle:hover  { opacity:.9; }
  .fs-slider        { -webkit-appearance:none; appearance:none; height:4px; border-radius:4px; outline:none; cursor:pointer; }
  .fs-slider::-webkit-slider-thumb {
    -webkit-appearance:none; width:14px; height:14px; border-radius:50%;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);
    cursor:pointer; border:2px solid #0b0f1a;
    box-shadow:0 0 6px rgba(99,102,241,.6);
  }
  .fs-select {
    background:#0f172a; border:1px solid rgba(99,102,241,.2); border-radius:8px;
    color:#c7d2fe; font-size:12px; padding:7px 10px; width:100%; outline:none; cursor:pointer;
  }
  .fs-select:focus { border-color:rgba(99,102,241,.5); }
  .fs-btn { transition: all .18s; }
  .fs-btn:hover { background:rgba(99,102,241,.2) !important; color:#c7d2fe !important; }
`;

/* ── Small toggle switch ─────────────────────────────────────────────────── */
function Toggle({ enabled, onToggle, color = '#6366f1' }) {
  return (
    <button
      onClick={onToggle}
      className="fs-toggle"
      style={{
        width: 42, height: 24, borderRadius: 12,
        background: enabled ? color : '#1e293b',
        border: `1px solid ${enabled ? color : 'rgba(99,102,241,.15)'}`,
        cursor: 'pointer', position: 'relative',
        transition: 'background .25s, border .25s', flexShrink: 0,
        boxShadow: enabled ? `0 0 10px ${color}66` : 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: enabled ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: 'white',
        transition: 'left .2s',
        boxShadow: '0 1px 4px rgba(0,0,0,.4)',
      }} />
    </button>
  );
}

/* ── Section label ───────────────────────────────────────────────────────── */
function SectionLabel({ children, icon: Icon }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, marginTop:4 }}>
      {Icon && <Icon size={11} color="#6366f1" />}
      <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', color:'#3d4a6b', textTransform:'uppercase' }}>
        {children}
      </span>
    </div>
  );
}

/* ── Slider row ──────────────────────────────────────────────────────────── */
function SliderRow({ label, value, min, max, step, onChange, displayFn }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:12, color:'#64748b' }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:700, color:'#818cf8' }}>
          {displayFn ? displayFn(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="fs-slider"
        style={{
          width: '100%',
          background: `linear-gradient(to right, #6366f1 ${pct}%, #1e293b ${pct}%)`,
        }}
      />
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#2d3a55', marginTop:2 }}>
        <span>{min === 0 ? '0%' : `${min}x`}</span>
        <span>{max === 1 ? '100%' : `${max}x`}</span>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
const VoiceSettings = () => {
  const {
    tts, wakeWordEnabled, setWakeWordEnabled, wakeWordActive,
    wakeWordSuspended, speakResponse,
  } = useVoiceCommand();

  const [isOpen, setIsOpen]           = useState(false);
  const [activeTab, setActiveTab]     = useState('voice'); // 'voice' | 'wakeword' | 'commands'
  const [testPlaying, setTestPlaying] = useState(false);

  // Inject CSS once
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'friday-settings-css';
    if (!document.getElementById('friday-settings-css')) {
      el.textContent = SETTINGS_CSS;
      document.head.appendChild(el);
    }
    return () => { try { document.getElementById('friday-settings-css')?.remove(); } catch(_){} };
  }, []);

  if (!tts.isSupported) return null;

  const testVoice = () => {
    if (testPlaying) { window.speechSynthesis.cancel(); setTestPlaying(false); return; }
    setTestPlaying(true);
    speakResponse("Hello. I'm FRIDAY, your AI meeting assistant. All systems are operational.");
    setTimeout(() => setTestPlaying(false), 4000);
  };

  /* ── Tabs ── */
  const tabs = [
    { id: 'voice',    label: 'Voice',     icon: Volume2 },
    { id: 'wakeword', label: 'Wake Word', icon: Radio },
  ];

  return (
    <>
      {/* ── Gear toggle button ─────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(p => !p)}
        style={{
          position: 'fixed', bottom: 100, right: 24, zIndex: 49,
          width: 36, height: 36, borderRadius: '50%',
          background: isOpen ? 'rgba(99,102,241,.25)' : 'rgba(11,15,26,.85)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${isOpen ? 'rgba(99,102,241,.5)' : 'rgba(99,102,241,.2)'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isOpen ? '0 0 16px rgba(99,102,241,.3)' : '0 4px 16px rgba(0,0,0,.4)',
          transition: 'all .2s',
        }}
        title="FRIDAY Voice Settings"
      >
        <Settings size={15} color={isOpen ? '#818cf8' : '#475569'}
          style={{ transition:'transform .3s, color .2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* ── Settings panel ────────────────────────────────────────── */}
      {isOpen && (
        <div className="fs-panel" style={{
          position: 'fixed', bottom: 144, right: 24, zIndex: 50,
          width: 320,
          background: 'linear-gradient(160deg,#0b0f1a 0%,#0f1629 60%,#0b1120 100%)',
          border: '1px solid rgba(99,102,241,.2)',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(0,0,0,.8), 0 0 0 1px rgba(99,102,241,.08), inset 0 1px 0 rgba(255,255,255,.04)',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.06))',
            borderBottom: '1px solid rgba(99,102,241,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(79,70,229,.4)',
              }}>
                <Zap size={14} color="white" fill="white" />
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:'white', letterSpacing:'0.05em',
                  background:'linear-gradient(90deg,#c7d2fe,#a5b4fc)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                }}>
                  FRIDAY Settings
                </div>
                <div style={{ fontSize:10, color:'#3d4a6b', marginTop:1 }}>Voice & Assistant Configuration</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="fs-btn"
              style={{ background:'none', border:'none', cursor:'pointer', color:'#3d4a6b', padding:4, borderRadius:6, display:'flex' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(99,102,241,.1)', background:'rgba(10,14,27,.6)' }}>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{
                  flex:1, padding:'9px 0', border:'none', cursor:'pointer',
                  background:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                  borderBottom: activeTab === id ? '2px solid #6366f1' : '2px solid transparent',
                  color: activeTab === id ? '#818cf8' : '#3d4a6b',
                  fontSize:11, fontWeight:700, letterSpacing:'0.04em',
                  transition:'all .2s',
                }}>
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding:'18px 18px 14px' }}>

            {/* ── VOICE TAB ─────────────────────────────────────────── */}
            {activeTab === 'voice' && (
              <>
                <SectionLabel icon={Volume2}>Voice Output</SectionLabel>

                {/* Enable TTS */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:13, color:'#e2e8f0', fontWeight:600 }}>FRIDAY Speaks</div>
                    <div style={{ fontSize:10, color:'#3d4a6b', marginTop:1 }}>Read responses aloud</div>
                  </div>
                  <Toggle enabled={tts.isEnabled} onToggle={tts.toggle} />
                </div>

                {tts.isEnabled && (
                  <>
                    {/* Voice selector */}
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, color:'#64748b', marginBottom:6, fontWeight:600 }}>Voice</div>
                      <select
                        value={tts.selectedVoice?.name || ''}
                        onChange={e => {
                          const v = tts.voices.find(v => v.name === e.target.value);
                          if (v) tts.setSelectedVoice(v);
                        }}
                        className="fs-select"
                      >
                        {tts.voices.filter(v => v.lang.startsWith('en')).map(v => (
                          <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                        ))}
                      </select>
                    </div>

                    {/* Sliders */}
                    <SliderRow label="Speed" value={tts.rate} min={0.6} max={1.8} step={0.1}
                      onChange={tts.setRate} displayFn={v => `${v.toFixed(1)}×`} />

                    <SliderRow label="Pitch" value={tts.pitch} min={0.5} max={1.8} step={0.1}
                      onChange={tts.setPitch} displayFn={v => `${v.toFixed(1)}`} />

                    <SliderRow label="Volume" value={tts.volume} min={0} max={1} step={0.05}
                      onChange={tts.setVolume} displayFn={v => `${Math.round(v * 100)}%`} />

                    {/* Test button */}
                    <button
                      onClick={testVoice}
                      disabled={false}
                      className="fs-btn"
                      style={{
                        width: '100%', marginTop:4,
                        padding: '9px 0',
                        background: testPlaying
                          ? 'rgba(239,68,68,.15)' : 'rgba(99,102,241,.12)',
                        border: `1px solid ${testPlaying ? 'rgba(239,68,68,.3)' : 'rgba(99,102,241,.25)'}`,
                        borderRadius: 10, cursor: 'pointer',
                        display: 'flex', alignItems:'center', justifyContent:'center', gap:8,
                        color: testPlaying ? '#f87171' : '#818cf8',
                        fontSize: 12, fontWeight: 700, letterSpacing:'0.04em',
                      }}
                    >
                      {testPlaying
                        ? <><VolumeX size={13} /> Stop Test</>
                        : <><Volume2 size={13} /> Test FRIDAY's Voice</>
                      }
                    </button>
                  </>
                )}
              </>
            )}

            {/* ── WAKE WORD TAB ─────────────────────────────────────── */}
            {activeTab === 'wakeword' && (
              <>
                <SectionLabel icon={Radio}>Wake Word Detection</SectionLabel>

                {/* Enable wake word */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:13, color:'#e2e8f0', fontWeight:600 }}>Always Listening</div>
                    <div style={{ fontSize:10, color:'#3d4a6b', marginTop:1 }}>Detect wake phrases passively</div>
                  </div>
                  <Toggle enabled={wakeWordEnabled} onToggle={() => setWakeWordEnabled(p => !p)} />
                </div>

                {/* Status indicator */}
                <div style={{
                  background: 'rgba(15,23,42,.8)',
                  border: '1px solid rgba(99,102,241,.12)',
                  borderRadius: 10, padding:'12px 14px', marginBottom:16,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span className={wakeWordActive && !wakeWordSuspended ? 'fs-pulsedot' : ''} style={{
                      width:8, height:8, borderRadius:'50%', flexShrink:0,
                      background: wakeWordSuspended ? '#f59e0b' : wakeWordActive ? '#4ade80' : '#334155',
                      boxShadow: wakeWordActive && !wakeWordSuspended ? '0 0 8px rgba(74,222,128,.7)' : 'none',
                    }} />
                    <span style={{ fontSize:12, color: wakeWordActive ? '#4ade80' : '#475569', fontWeight:600 }}>
                      {wakeWordSuspended ? 'Suspended (meeting active)' : wakeWordActive ? 'Passive listener active' : 'Wake word inactive'}
                    </span>
                  </div>
                </div>

                {/* Wake phrase list */}
                <div>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:8, fontWeight:600 }}>Recognised Phrases</div>
                  {[
                    'Hey FRIDAY', 'OK FRIDAY', 'Okay FRIDAY',
                    'Hi FRIDAY', 'Hello FRIDAY', 'FRIDAY',
                    'Yo FRIDAY', 'Wake up FRIDAY',
                  ].map((phrase) => (
                    <div key={phrase} style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'6px 10px', marginBottom:4,
                      background:'rgba(15,22,41,.7)',
                      border:'1px solid rgba(99,102,241,.1)',
                      borderRadius:8,
                    }}>
                      <Zap size={9} color="#6366f1" fill="#6366f1" />
                      <span style={{ fontSize:12, color:'#94a3b8' }}>"{phrase}"</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop:12, fontSize:10, color:'#2d3a55', lineHeight:1.6 }}>
                  ℹ️ The wake word listener uses a separate microphone instance so it never conflicts with meeting transcription.
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding:'10px 18px',
            borderTop: '1px solid rgba(99,102,241,.08)',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            background:'rgba(8,12,22,.6)',
          }}>
            <span style={{ fontSize:9, color:'#2d3a55', letterSpacing:'0.06em' }}>
              FRIDAY v2.0 · AI Meeting Intelligence
            </span>
            <button
              onClick={() => {
                if(tts.setRate) tts.setRate(1.0);
                if(tts.setPitch) tts.setPitch(1.0);
                if(tts.setVolume) tts.setVolume(1.0);
              }}
              className="fs-btn"
              style={{
                background:'none', border:'1px solid rgba(99,102,241,.15)',
                borderRadius:6, padding:'3px 8px', cursor:'pointer',
                color:'#3d4a6b', fontSize:9, display:'flex', alignItems:'center', gap:4,
              }}
              title="Reset voice settings to defaults"
            >
              <RotateCcw size={9} /> Reset
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceSettings;