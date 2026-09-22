import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  MessageSquare, 
  BookOpen, 
  FileText, 
  Sparkles,
  Bot,
  Plus,
  Trash2,
  Clock,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw
} from 'lucide-react';
import { apiFetch } from '../services/api';

const STORAGE_KEY = 'aegis_chat_sessions';
const ACTIVE_KEY  = 'aegis_active_session';

function genId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function newSession(id = genId()) {
  return {
    id,
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    messages: []
  };
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function loadActiveId() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

function saveActiveId(id) {
  localStorage.setItem(ACTIVE_KEY, id);
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function AIChat() {
  const [sessions, setSessions] = useState(() => {
    const stored = loadSessions();
    if (stored.length === 0) {
      const first = newSession();
      saveSessions([first]);
      return [first];
    }
    return stored;
  });

  const [activeId, setActiveId] = useState(() => {
    const stored = loadActiveId();
    const storedSessions = loadSessions();
    if (stored && storedSessions.find(s => s.id === stored)) return stored;
    return storedSessions[0]?.id || null;
  });

  const [query, setQuery]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [activeSources, setActiveSources] = useState([]);
  const [historyOpen, setHistoryOpen]   = useState(true);
  const messagesEndRef                  = useRef(null);

  const activeSession = sessions.find(s => s.id === activeId) || sessions[0];
  const messages = activeSession?.messages || [];

  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { if (activeId) saveActiveId(activeId); }, [activeId]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const last = [...messages].reverse().find(m => m.role === 'assistant' && m.sources?.length > 0);
    setActiveSources(last?.sources || []);
  }, [activeId]);

  const updateSession = useCallback((id, updater) => {
    setSessions(prev => prev.map(s => s.id === id ? updater(s) : s));
  }, []);

  const addNewSession = () => {
    const s = newSession();
    setSessions(prev => [s, ...prev]);
    setActiveId(s.id);
    setActiveSources([]);
    setQuery('');
  };

  const deleteSession = (id, e) => {
    e.stopPropagation();
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length === 0) {
        const fresh = newSession();
        saveActiveId(fresh.id);
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) {
        setActiveId(next[0].id);
        saveActiveId(next[0].id);
      }
      return next;
    });
  };

  const clearCurrentSession = () => {
    updateSession(activeId, s => ({ ...s, messages: [], title: 'New Chat' }));
    setActiveSources([]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage = { role: 'user', content: query.trim(), ts: new Date().toISOString() };
    const currentMsgs = [...messages, userMessage];

    updateSession(activeId, s => {
      const title = s.title === 'New Chat' && s.messages.length === 0
        ? query.trim().slice(0, 42) + (query.length > 42 ? '…' : '')
        : s.title;
      return { ...s, messages: [...s.messages, userMessage], title, updatedAt: new Date().toISOString() };
    });
    setQuery('');
    setLoading(true);

    try {
      const historyPayload = currentMsgs.map(m => ({ role: m.role, content: m.content }));
      const response = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage.content, history: historyPayload })
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.reply,
        sources: response.sources || [],
        ts: new Date().toISOString()
      };

      updateSession(activeId, s => ({
        ...s,
        messages: [...s.messages, assistantMessage],
        updatedAt: new Date().toISOString()
      }));

      if (response.sources?.length > 0) setActiveSources(response.sources);
    } catch (err) {
      console.error('Chat Error:', err);
      updateSession(activeId, s => ({
        ...s,
        messages: [...s.messages, {
          role: 'assistant',
          content: err?.message || 'Could not process request at this moment.',
          sources: [],
          ts: new Date().toISOString()
        }]
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-white" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* Sessions Sidebar */}
      <div className={`border-r border-slate-100 bg-slate-50 flex flex-col shrink-0 transition-all duration-300 ${
        historyOpen ? 'w-56' : 'w-10'
      }`}>
        {/* Sidebar Header */}
        <div className="p-2 border-b border-slate-200 flex items-center justify-between shrink-0 min-h-[44px]">
          {historyOpen && (
            <div className="flex items-center gap-2 ml-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">History</span>
            </div>
          )}
          <div className={`flex items-center gap-1 ${historyOpen ? '' : 'w-full justify-center'}`}>
            {historyOpen && (
              <button
                onClick={addNewSession}
                title="New Chat"
                className="w-6 h-6 rounded-lg bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition shadow-sm shadow-orange-500/30 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setHistoryOpen(o => !o)}
              title={historyOpen ? 'Hide history' : 'Show history'}
              className="w-6 h-6 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
            >
              {historyOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto py-2 space-y-0.5 px-2 ${historyOpen ? '' : 'hidden'}`}>
          {sessions.map(sess => (
            <button
              key={sess.id}
              onClick={() => { setActiveId(sess.id); setActiveSources([]); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group flex items-start gap-2 cursor-pointer ${
                sess.id === activeId
                  ? 'bg-white border border-slate-200 shadow-sm'
                  : 'hover:bg-white/70 border border-transparent'
              }`}
            >
              <ChevronRight className={`w-3 h-3 mt-0.5 shrink-0 transition-transform ${sess.id === activeId ? 'text-orange-500 rotate-90' : 'text-slate-300'}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-bold truncate leading-tight ${sess.id === activeId ? 'text-slate-900' : 'text-slate-600'}`}>
                  {sess.title}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5 text-slate-300" />
                  <span className="text-[9px] text-slate-400 font-medium">
                    {formatTime(sess.updatedAt || sess.createdAt)}
                  </span>
                  <span className="text-[9px] text-slate-300 ml-1">
                    {sess.messages.length > 0 ? `${Math.ceil(sess.messages.length / 2)} msg` : 'Empty'}
                  </span>
                </div>
              </div>
              {sessions.length > 1 && (
                <span
                  onClick={(e) => deleteSession(sess.id, e)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
        </div>

        {historyOpen && (
          <div className="p-2 border-t border-slate-200">
            <button
              onClick={clearCurrentSession}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Clear Chat
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col justify-between border-r border-slate-200 bg-white min-w-0">

        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <Bot className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 tracking-wide">Aegis Compliance AI Copilot</h3>
              <p className="text-[10px] font-semibold text-slate-500">Powered by Gemini & Vector RAG Store</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online & Ready
          </span>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-16 opacity-70">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                <Bot className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">Ask me anything about compliance</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">SEBI · RBI · AML/KYC · Audit Controls · Risk</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm mt-2">
                {[
                  'What are SEBI net worth rules for AMCs?',
                  'Summarize RBI KYC re-verification norms',
                  'What are AML reporting obligations?'
                ].map(hint => (
                  <button
                    key={hint}
                    onClick={() => setQuery(hint)}
                    className="text-left px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-xs font-semibold text-slate-700 hover:text-orange-700 transition cursor-pointer"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div key={index} className={`flex gap-3.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-2xl shrink-0 flex items-center justify-center font-black text-xs shadow-sm ${
                  isUser ? 'bg-orange-500 text-white' : 'bg-slate-900 text-amber-400'
                }`}>
                  {isUser ? 'ME' : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-2 min-w-0">
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed border shadow-sm font-medium ${
                    isUser
                      ? 'bg-orange-50 border-orange-200 text-slate-900 rounded-tr-none'
                      : 'bg-slate-50 border-slate-200/90 text-slate-800 rounded-tl-none'
                  }`}>
                    {msg.content.split('\n\n').map((para, pIdx) => (
                      <p key={pIdx} className={pIdx > 0 ? 'mt-2.5' : ''}>{para}</p>
                    ))}
                  </div>

                  {!isUser && msg.sources?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.sources.map((src, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => setActiveSources(msg.sources)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-[10px] text-amber-900 font-bold transition-all cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 text-amber-600" />
                          <span className="max-w-36 truncate">{src.title}</span>
                          <span className="text-[9px] text-amber-700 font-black">({(src.score * 100).toFixed(0)}%)</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.ts && (
                    <p className="text-[9px] text-slate-300 font-medium px-1">{formatTime(msg.ts)}</p>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3.5 max-w-[80%]">
              <div className="w-8 h-8 rounded-2xl shrink-0 flex items-center justify-center bg-slate-900 text-amber-400 animate-pulse shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span className="text-xs font-bold text-slate-700">Aegis analyzing regulatory frameworks…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-slate-50/50 flex gap-3">
          <input
            type="text"
            required
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask a compliance query (e.g., 'What are SEBI net worth rules for AMCs?')"
            className="flex-1 px-4 py-3 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-white font-bold text-xs tracking-wide transition duration-200 cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-md shadow-orange-500/20"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* RAG Evidence Panel */}
      <div className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 shrink-0 bg-slate-50/50">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Vector Evidence</h3>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {activeSources.map((src, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-900 truncate">{src.title}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black text-emerald-700 bg-emerald-50 border border-emerald-200 shrink-0">
                  {(src.score * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-medium p-3 bg-slate-50 rounded-xl border border-slate-100 italic">
                "{src.text}"
              </p>
            </div>
          ))}

          {activeSources.length === 0 && (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs font-semibold text-slate-600">No citations pulled yet.</p>
              <p className="text-[11px] text-slate-400">Ask a question to retrieve RAG context.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
