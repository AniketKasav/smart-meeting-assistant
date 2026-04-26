import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, X, Send, RotateCcw, GripHorizontal, Zap } from 'lucide-react';

const API_BASE_URL = 'http://localhost:4000';

const FRIDAY_STYLES = `
  @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
  @keyframes fridayIn { from{opacity:0;transform:scale(0.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes pulse-glow { 0%,100%{box-shadow:0 0 6px #6366f1}50%{box-shadow:0 0 14px #6366f1,0 0 28px rgba(99,102,241,0.4)} }
  @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)} }
  @keyframes dot-bounce { 0%,80%,100%{transform:scale(0.7);opacity:0.4}40%{transform:scale(1);opacity:1} }
  .friday-scroll::-webkit-scrollbar{width:3px}
  .friday-scroll::-webkit-scrollbar-track{background:transparent}
  .friday-scroll::-webkit-scrollbar-thumb{background:#312e81;border-radius:4px}
  .friday-msg{animation:fridayIn 0.2s ease-out}
  .friday-btn:hover{background:rgba(99,102,241,0.15)!important;color:#a5b4fc!important}
  .friday-quick:hover{border-color:#6366f1!important;background:rgba(99,102,241,0.1)!important;color:#c7d2fe!important}
`;

function FormattedMessage({ text }) {
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {lines.map((line, i) => {
        const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#c7d2fe">$1</strong>');
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          const c = line.trim().slice(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color:#c7d2fe">$1</strong>');
          return <div key={i} style={{ display:'flex', gap:8, marginTop:2 }}><span style={{ color:'#818cf8', flexShrink:0 }}>▸</span><span dangerouslySetInnerHTML={{ __html:c }} /></div>;
        }
        if (line.trim() === '') return <div key={i} style={{ height:6 }} />;
        if (line.trim().endsWith(':') && line.length < 60 && !line.includes('.'))
          return <p key={i} style={{ fontWeight:700, color:'#818cf8', margin:'8px 0 2px', fontSize:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>{line.trim()}</p>;
        return <p key={i} dangerouslySetInnerHTML={{ __html:bold }} style={{ margin:0 }} />;
      })}
    </div>
  );
}

const QUICK = [
  { label:'📋 Action Items', q:'What are my action items?' },
  { label:'📝 Last Meeting', q:'Summarize my last meeting' },
  { label:'🗓️ This Week', q:'Show meetings from this week' },
  { label:'👥 All Meetings', q:'List all my meetings' },
];

function AssistantBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState([{
    from: 'bot',
    text: "Hello! I'm **FRIDAY**, your intelligent meeting assistant.\n\nI have full access to all your meeting data. Ask me anything:\n\n* What were the key decisions in my last meeting?\n* What action items are assigned to me?\n* Summarize this week's meetings\n* Who spoke the most in [meeting name]?",
    timestamp: new Date().toISOString()
  }]);

  // Drag state
  const [pos, setPos] = useState({ x: 24, y: 24 }); // bottom-right offset
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 150); }, [isOpen]);
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Dragging logic on the fab button (moves the whole widget)
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragStart.current = {
      mx: e.clientX, my: e.clientY,
      px: pos.x, py: pos.y,
      moved: false
    };
    setDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = dragStart.current.mx - e.clientX;
      const dy = dragStart.current.my - e.clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragStart.current.moved = true;
      setPos({
        x: Math.max(8, dragStart.current.px + dx),
        y: Math.max(8, dragStart.current.py + dy),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  const sendMessage = async (text) => {
    if (!text.trim() || streaming) return;
    const userText = text.trim();
    setMessages(prev => [...prev, { from:'user', text:userText, timestamp:new Date().toISOString() }]);
    setInput('');
    setStreaming(true);
    const botId = Date.now();
    setMessages(prev => [...prev, { from:'bot', text:'', id:botId, streaming:true, timestamp:new Date().toISOString() }]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method:'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ message:userText, conversationHistory:messages.slice(-6) })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream:true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'chunk') setMessages(prev => prev.map(m => m.id===botId ? {...m, text:m.text+d.text} : m));
            else if (d.type === 'done') setMessages(prev => prev.map(m => m.id===botId ? {...m, streaming:false, sources:d.sources} : m));
            else if (d.type === 'error') setMessages(prev => prev.map(m => m.id===botId ? {...m, text:'Something went wrong. Please try again.', streaming:false} : m));
          } catch {}
        }
      }
    } catch {
      setMessages(prev => prev.map(m => m.id===botId ? {...m, text:'Connection error. Make sure the backend is running.', streaming:false} : m));
    } finally { setStreaming(false); }
  };

  const clearChat = () => setMessages([{
    from:'bot', text:"Chat cleared! I'm FRIDAY — ask me anything about your meetings.",
    timestamp:new Date().toISOString()
  }]);

  return (
    <div style={{ position:'fixed', bottom: pos.y, right: pos.x, zIndex:99999, userSelect:'none' }}>
      <style>{FRIDAY_STYLES}</style>

      {/* Chat Panel */}
      {isOpen && (
        <div ref={panelRef} style={{
          position:'absolute', bottom:68, right:0,
          width:440, maxHeight:620,
          background:'linear-gradient(160deg,#0b0f1a 0%,#0f1629 50%,#0b1120 100%)',
          border:'1px solid rgba(99,102,241,0.25)',
          borderRadius:20,
          boxShadow:'0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
          display:'flex', flexDirection:'column', overflow:'hidden',
          animation:'fridayIn 0.25s cubic-bezier(0.16,1,0.3,1)'
        }}>

          {/* Drag handle strip */}
          <div
            onMouseDown={onMouseDown}
            style={{
              height:6, background:'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)',
              cursor:'grab', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center'
            }}
          >
            <GripHorizontal size={12} style={{ color:'rgba(99,102,241,0.5)', pointerEvents:'none' }} />
          </div>

          {/* Header */}
          <div style={{
            padding:'12px 18px',
            background:'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))',
            borderBottom:'1px solid rgba(99,102,241,0.15)',
            display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {/* FRIDAY logo */}
              <div style={{
                width:40, height:40, borderRadius:12,
                background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 4px 16px rgba(79,70,229,0.5)',
                animation:'pulse-glow 2.5s ease-in-out infinite'
              }}>
                <Zap size={18} color="white" fill="white" />
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{
                    fontWeight:800, fontSize:15, color:'white',
                    letterSpacing:'0.05em',
                    background:'linear-gradient(90deg,#c7d2fe,#a5b4fc)',
                    WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'
                  }}>FRIDAY</span>
                  <span style={{
                    fontSize:9, fontWeight:700, letterSpacing:'0.1em',
                    color:'#4ade80', background:'rgba(74,222,128,0.1)',
                    border:'1px solid rgba(74,222,128,0.25)',
                    padding:'2px 8px', borderRadius:99,
                    display:'flex', alignItems:'center', gap:4
                  }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'#4ade80', display:'inline-block', boxShadow:'0 0 6px #4ade80' }} />
                    ONLINE
                  </span>
                </div>
                <p style={{ fontSize:10, color:'#4f5b7a', margin:0, marginTop:1, letterSpacing:'0.04em' }}>
                  AI Meeting Intelligence
                </p>
              </div>
            </div>
            <div style={{ display:'flex', gap:2 }}>
              <button onClick={clearChat} title="Clear chat" className="friday-btn" style={{
                background:'none', border:'none', cursor:'pointer',
                color:'#4f5b7a', padding:'6px 8px', borderRadius:8,
                display:'flex', alignItems:'center', transition:'all 0.15s'
              }}>
                <RotateCcw size={14} />
              </button>
              <button onClick={() => setIsOpen(false)} className="friday-btn" style={{
                background:'none', border:'none', cursor:'pointer',
                color:'#4f5b7a', padding:'6px 8px', borderRadius:8,
                display:'flex', alignItems:'center', transition:'all 0.15s'
              }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="friday-scroll" style={{
            flex:1, overflowY:'auto', padding:'14px 16px',
            display:'flex', flexDirection:'column', gap:12
          }}>
            {messages.map((msg, i) => (
              <div key={msg.id||i} className="friday-msg" style={{
                display:'flex', justifyContent:msg.from==='user'?'flex-end':'flex-start',
                alignItems:'flex-end', gap:8
              }}>
                {msg.from === 'bot' && (
                  <div style={{
                    width:26, height:26, borderRadius:8, flexShrink:0,
                    background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    marginBottom:2, boxShadow:'0 2px 8px rgba(79,70,229,0.4)'
                  }}>
                    <Zap size={11} color="white" fill="white" />
                  </div>
                )}

                <div style={{
                  maxWidth:'82%',
                  padding:msg.from==='user'?'9px 14px':'11px 14px',
                  borderRadius:msg.from==='user'?'16px 16px 4px 16px':'4px 16px 16px 16px',
                  background:msg.from==='user'
                    ?'linear-gradient(135deg,#4f46e5,#7c3aed)'
                    :'rgba(15,22,41,0.8)',
                  border:msg.from==='bot'?'1px solid rgba(99,102,241,0.2)':'none',
                  boxShadow:msg.from==='user'
                    ?'0 4px 16px rgba(79,70,229,0.35)'
                    :'0 2px 12px rgba(0,0,0,0.3)',
                  color:'#e2e8f0', fontSize:13, lineHeight:1.65, wordBreak:'break-word'
                }}>
                  {msg.from==='bot' ? (
                    <>
                      <FormattedMessage text={msg.text} />
                      {msg.streaming && msg.text && (
                        <span style={{
                          display:'inline-block', width:2, height:'1em',
                          background:'#818cf8', marginLeft:2, verticalAlign:'text-bottom',
                          animation:'blink 1s step-end infinite'
                        }} />
                      )}
                      {msg.streaming && !msg.text && (
                        <div style={{ display:'flex', gap:5, padding:'4px 2px', alignItems:'center' }}>
                          {[0,180,360].map(d => (
                            <span key={d} style={{
                              width:7, height:7, borderRadius:'50%',
                              background:'linear-gradient(135deg,#4f46e5,#818cf8)',
                              display:'inline-block',
                              animation:`dot-bounce 1.2s ${d}ms ease-in-out infinite`
                            }} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ margin:0 }}>{msg.text}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div style={{
              padding:'10px 16px',
              borderTop:'1px solid rgba(99,102,241,0.12)',
              background:'rgba(10,14,27,0.9)'
            }}>
              <p style={{ fontSize:10, color:'#3d4a6b', marginBottom:8, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Quick Actions</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {QUICK.map(({ label, q }) => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={streaming} className="friday-quick"
                    style={{
                      fontSize:11, background:'rgba(15,22,41,0.8)',
                      border:'1px solid rgba(99,102,241,0.2)', color:'#6b7db3',
                      padding:'8px 10px', borderRadius:9, cursor:streaming?'not-allowed':'pointer',
                      textAlign:'left', transition:'all 0.2s', fontWeight:500
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{
            borderTop:'1px solid rgba(99,102,241,0.12)',
            padding:'12px 16px',
            background:'rgba(8,12,22,0.95)', flexShrink:0
          }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <textarea
                ref={inputRef}
                rows={2}
                placeholder="Ask FRIDAY anything about your meetings..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(input);} }}
                disabled={streaming}
                style={{
                  flex:1, background:'rgba(15,22,41,0.9)',
                  border:`1px solid ${input.trim()?'rgba(99,102,241,0.5)':'rgba(99,102,241,0.12)'}`,
                  borderRadius:10, color:'#e2e8f0', fontSize:13,
                  padding:'9px 13px', resize:'none', outline:'none',
                  fontFamily:'inherit', lineHeight:1.5,
                  transition:'border-color 0.2s',
                  boxShadow:input.trim()?'0 0 0 3px rgba(99,102,241,0.08)':'none'
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()||streaming}
                style={{
                  background:input.trim()&&!streaming
                    ?'linear-gradient(135deg,#4f46e5,#7c3aed)'
                    :'rgba(15,22,41,0.8)',
                  border:`1px solid ${input.trim()&&!streaming?'rgba(99,102,241,0.6)':'rgba(99,102,241,0.12)'}`,
                  borderRadius:10, padding:'10px 14px',
                  cursor:input.trim()&&!streaming?'pointer':'not-allowed',
                  color:'white', display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, marginBottom:2, transition:'all 0.2s',
                  boxShadow:input.trim()&&!streaming?'0 4px 16px rgba(79,70,229,0.4)':'none'
                }}>
                <Send size={14} />
              </button>
            </div>
            <p style={{ fontSize:10, color:'#2d3a55', marginTop:6, letterSpacing:'0.03em' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* FAB Button — drag to move */}
      <button
        onMouseDown={(e) => {
          // Only drag if it becomes a drag (not a click)
          dragStart.current = { mx:e.clientX, my:e.clientY, px:pos.x, py:pos.y, moved:false };
          setDragging(true);
        }}
        onClick={() => { if (!dragStart.current?.moved) setIsOpen(p => !p); }}
        style={{
          width:56, height:56, borderRadius:'50%',
          background:isOpen
            ?'linear-gradient(135deg,#3730a3,#5b21b6)'
            :'linear-gradient(135deg,#4f46e5,#7c3aed)',
          border:'1px solid rgba(99,102,241,0.4)',
          cursor:dragging?'grabbing':'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 8px 32px rgba(79,70,229,0.6), 0 0 0 1px rgba(99,102,241,0.3)',
          transition:'box-shadow 0.2s, background 0.2s',
          position:'relative'
        }}
        title="FRIDAY — AI Meeting Assistant"
      >
        <Sparkles size={22} color="white" style={{ animation: isOpen?'none':'float 3s ease-in-out infinite' }} />
        {/* Live indicator */}
        <span style={{
          position:'absolute', top:2, right:2,
          width:13, height:13, borderRadius:'50%',
          background:'#4ade80',
          boxShadow:'0 0 8px rgba(74,222,128,0.9)',
          border:'2px solid #0b0f1a'
        }} />
        {/* FRIDAY label */}
        {!isOpen && (
          <span style={{
            position:'absolute', bottom:-18, left:'50%', transform:'translateX(-50%)',
            fontSize:8, fontWeight:800, color:'#6366f1', letterSpacing:'0.12em',
            whiteSpace:'nowrap'
          }}>FRIDAY</span>
        )}
      </button>
    </div>
  );
}

export default AssistantBubble;