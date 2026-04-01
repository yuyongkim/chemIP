'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageSquare,
  Pill,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';

import { fetchJsonSafe } from '@/lib/http';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  loading?: boolean;
}

interface AIAssistantPanelProps {
  chemId?: string;
  chemicalName?: string;
}

type PresetAction = {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

let _msgId = 0;
function nextId() {
  return `msg-${++_msgId}-${Date.now()}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AIAssistantPanel({ chemId, chemicalName }: AIAssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [llmReady, setLlmReady] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check LLM status on mount
  useEffect(() => {
    fetchJsonSafe<{ ready: boolean }>('/api/ai/llm-status').then((r) => {
      setLlmReady(r.ok && r.data?.ready === true);
    });
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addAssistantMsg = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text }]);
  }, []);

  const replaceLoadingMsg = useCallback((id: string, text: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text, loading: false } : m)),
    );
  }, []);

  /* ---- Preset actions ---- */

  const presets: PresetAction[] = [
    {
      id: 'recommend',
      icon: <Search className="w-4 h-4" />,
      label: 'Search Suggestions',
      description: 'Recommend related chemicals/keywords',
      color: 'blue',
    },
    {
      id: 'summarize',
      icon: <ShieldAlert className="w-4 h-4" />,
      label: 'MSDS Summary',
      description: 'MSDS hazard analysis summary',
      color: 'amber',
    },
    {
      id: 'drug-analysis',
      icon: <Pill className="w-4 h-4" />,
      label: 'Drug Analysis',
      description: 'Chemical-drug relationship analysis',
      color: 'emerald',
    },
    {
      id: 'ask',
      icon: <MessageSquare className="w-4 h-4" />,
      label: 'Free Question',
      description: 'Chemical/drug Q&A',
      color: 'purple',
    },
  ];

  const handlePreset = async (presetId: string) => {
    if (busy) return;
    setBusy(true);

    const loadingId = nextId();

    if (presetId === 'recommend') {
      const query = chemicalName || chemId || '';
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', text: `Recommend search terms related to "${query}"` },
        { id: loadingId, role: 'assistant', text: '', loading: true },
      ]);
      const r = await fetchJsonSafe<{ recommendations: string[]; db_matches: string[]; llm_used: boolean }>(
        '/api/ai/recommend',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) },
      );
      if (r.ok && r.data) {
        const recs = r.data.recommendations || [];
        const dbMatches = r.data.db_matches || [];
        let text = '### Recommended Search Terms\n\n';
        if (recs.length > 0) {
          text += recs.map((t) => `- ${t}`).join('\n');
        }
        if (dbMatches.length > 0) {
          text += '\n\n**DB Match Results:**\n' + dbMatches.map((n) => `- ${n}`).join('\n');
        }
        if (!recs.length && !dbMatches.length) {
          text = 'No recommendations found.';
        }
        replaceLoadingMsg(loadingId, text);
      } else {
        replaceLoadingMsg(loadingId, 'API call failed.');
      }
    } else if (presetId === 'summarize') {
      if (!chemId) {
        addAssistantMsg('Please use this on a chemical detail page.');
        setBusy(false);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', text: `${chemicalName || chemId} MSDS hazard summary analysis` },
        { id: loadingId, role: 'assistant', text: '', loading: true },
      ]);
      const r = await fetchJsonSafe<{ summary: string; llm_used: boolean }>(
        '/api/ai/summarize',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chemId }) },
      );
      if (r.ok && r.data) {
        replaceLoadingMsg(loadingId, r.data.summary);
      } else {
        replaceLoadingMsg(loadingId, 'Failed to generate MSDS summary.');
      }
    } else if (presetId === 'drug-analysis') {
      if (!chemId) {
        addAssistantMsg('Please use this on a chemical detail page.');
        setBusy(false);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', text: `${chemicalName || chemId} drug-chemical relationship analysis` },
        { id: loadingId, role: 'assistant', text: '', loading: true },
      ]);
      const r = await fetchJsonSafe<{ analysis: string; llm_used: boolean; drug_counts?: Record<string, number> }>(
        '/api/ai/drug-analysis',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chemId }) },
      );
      if (r.ok && r.data) {
        replaceLoadingMsg(loadingId, r.data.analysis);
      } else {
        replaceLoadingMsg(loadingId, 'Drug analysis failed.');
      }
    } else if (presetId === 'ask') {
      // Focus the input
      setBusy(false);
      setInput('');
      document.getElementById('ai-assistant-input')?.focus();
      return;
    }

    setBusy(false);
  };

  /* ---- Free-form Q&A ---- */

  const handleSend = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);

    const loadingId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: q },
      { id: loadingId, role: 'assistant', text: '', loading: true },
    ]);

    const r = await fetchJsonSafe<{ answer: string; llm_used: boolean }>(
      '/api/ai/ask',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, chemId: chemId || '' }),
      },
    );

    if (r.ok && r.data) {
      replaceLoadingMsg(loadingId, r.data.answer);
    } else {
      replaceLoadingMsg(loadingId, 'Failed to generate a response. Please check Ollama status.');
    }
    setBusy(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  /* ---- Render ---- */

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-purple-300/40 hover:scale-105 transition-all"
        >
          <Bot className="w-5 h-5" />
          <span className="text-sm font-semibold">AI Assistant</span>
          {llmReady === false && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[680px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-bold text-sm">AI Assistant</span>
              {llmReady === true && <span className="w-2 h-2 rounded-full bg-green-400" title="LLM Online" />}
              {llmReady === false && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="LLM Offline" />}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button onClick={() => { setOpen(false); setMessages([]); }} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chemical context badge */}
          {chemicalName && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 flex-shrink-0">
              Context: <span className="font-semibold text-gray-700">{chemicalName}</span>
              {chemId && <span className="ml-1 text-gray-400">({chemId})</span>}
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Sparkles className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-4">Select an AI feature or enter a question</p>

                {/* Preset buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => void handlePreset(p.id)}
                      disabled={busy}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left border text-sm transition-all ${colorMap[p.color]} disabled:opacity-50`}
                    >
                      {p.icon}
                      <div>
                        <div className="font-semibold text-xs">{p.label}</div>
                        <div className="text-[10px] opacity-70">{p.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  {msg.loading ? (
                    <div className="flex items-center gap-2 py-1">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      <span className="text-xs text-gray-500">Analyzing...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed break-words">{msg.text}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Preset quick actions (when conversation is active) */}
          {messages.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 flex gap-1.5 overflow-x-auto flex-shrink-0">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void handlePreset(p.id)}
                  disabled={busy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 whitespace-nowrap disabled:opacity-50 transition-colors"
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                id="ai-assistant-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your question..."
                disabled={busy}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 disabled:opacity-50 disabled:bg-gray-50"
              />
              <button
                onClick={() => void handleSend()}
                disabled={busy || !input.trim()}
                className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:bg-gray-300 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
