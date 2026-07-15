import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  GraduationCap,
  Brain,
  HelpCircle,
  BookOpen,
  Check,
  Plus,
  ChevronDown,
  Info,
} from 'lucide-react';
import { runAgent } from '../lib/aiAgent.js';

let msgSeq = 0;
const nextId = () => `m${Date.now()}-${msgSeq++}`;

export default function AiAssistantPanel({
  parts = [],
  rules = [],
  knowledge = [],
  existingPartIds = [],
  onAddItems,
  onOpenTeach,
  onClose,
}) {
  const [messages, setMessages] = useState(() => [
    {
      id: nextId(),
      role: 'agent',
      kind: 'welcome',
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const existingSet = useMemo(() => new Set(existingPartIds), [existingPartIds]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const enabledRuleCount = rules.filter((r) => r.enabled !== false).length;

  const submit = (raw) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setInput('');
    const userMsg = { id: nextId(), role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setThinking(true);

    // A short pause so the "deep thinking" step is visible; the engine itself is
    // synchronous and deterministic.
    setTimeout(() => {
      const result = runAgent({ prompt: text, rules, knowledge, parts });
      setMessages((m) => [...m, { id: nextId(), role: 'agent', kind: 'result', result }]);
      setThinking(false);
      inputRef.current?.focus();
    }, 550);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <aside className="fixed top-0 right-0 z-40 h-screen w-full sm:w-[400px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-700 px-4 py-4 text-white flex-shrink-0">
        <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/15 blur-3xl"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">BOM Assistant</h3>
              <p className="text-[10px] font-medium text-indigo-200">
                Rule-guided · {enabledRuleCount} active rule{enabledRuleCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenTeach}
              title="Teach the AI"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-semibold transition"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Teach
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              aria-label="Close assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-3.5 py-4 space-y-3">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            parts={parts}
            existingSet={existingSet}
            enabledRuleCount={enabledRuleCount}
            onAddItems={onAddItems}
            onOpenTeach={onOpenTeach}
            onSuggestion={submit}
          />
        ))}
        {thinking && <ThinkingBubble />}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
        {enabledRuleCount === 0 && (
          <button
            onClick={onOpenTeach}
            className="w-full mb-2 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2 text-left"
          >
            No rules taught yet — the assistant needs at least one rule. Tap to teach it.
          </button>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what to add… e.g. “add a Mitsubishi PLC”"
            className="flex-1 resize-none max-h-28 px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 scrollbar-thin"
          />
          <button
            onClick={() => submit()}
            disabled={!input.trim() || thinking}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white flex items-center justify-center shadow-glow-indigo disabled:opacity-40 transition"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 text-center">
          The assistant only follows your taught rules &amp; knowledge — it never invents parts.
        </p>
      </div>
    </aside>
  );
}

function MessageBubble({ msg, parts, existingSet, enabledRuleCount, onAddItems, onOpenTeach, onSuggestion }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-600 to-violet-700 text-white text-sm font-medium shadow-sm">
          {msg.text}
        </div>
      </div>
    );
  }

  if (msg.kind === 'welcome') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[92%] px-3.5 py-3 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm space-y-2">
          <p className="font-semibold text-slate-900 dark:text-white">Hi! I help pick BOM items.</p>
          <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            Tell me what you need. I follow the rules and knowledge you&apos;ve taught me, reference
            them as I go, and if anything is unclear I&apos;ll ask before selecting. Then you tick
            the items to add.
          </p>
          {enabledRuleCount === 0 ? (
            <button
              onClick={onOpenTeach}
              className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Teach me a rule to begin
            </button>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <SuggestionChip onClick={onSuggestion} text="add a PLC" />
              <SuggestionChip onClick={onSuggestion} text="control panel starter" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // kind === 'result'
  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] w-full space-y-2.5">
        <ReasoningBlock reasoning={msg.result.reasoning} matchedRules={msg.result.matchedRules} />
        {msg.result.citations?.length > 0 && <CitationsBlock citations={msg.result.citations} />}
        {msg.result.question && <QuestionBlock text={msg.result.question} onOpenTeach={onOpenTeach} />}
        {msg.result.notice && <NoticeBlock text={msg.result.notice} onOpenTeach={onOpenTeach} />}
        {msg.result.candidates?.length > 0 && (
          <ResultsBlock
            candidates={msg.result.candidates}
            existingSet={existingSet}
            onAddItems={onAddItems}
          />
        )}
      </div>
    </div>
  );
}

function SuggestionChip({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
    >
      {text}
    </button>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium inline-flex items-center gap-2">
        <Brain className="w-4 h-4 animate-pulse text-indigo-500" />
        Thinking deeply — checking rules &amp; official knowledge…
      </div>
    </div>
  );
}

function ReasoningBlock({ reasoning = [], matchedRules = [] }) {
  const [open, setOpen] = useState(false);
  if (!reasoning.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          <Brain className="w-3.5 h-3.5 text-indigo-500" /> Thinking
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ol className="px-3 pb-3 space-y-1.5 list-decimal list-inside">
          {reasoning.map((step, i) => (
            <li key={i} className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
              {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CitationsBlock({ citations }) {
  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-500/10 px-3 py-2.5">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400 mb-1.5">
        <BookOpen className="w-3.5 h-3.5" /> References
      </div>
      <ul className="space-y-1.5">
        {citations.map((c, i) => (
          <li key={i} className="text-[12px] leading-relaxed">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">{c.title}</span>
            <span className="text-slate-600 dark:text-slate-300"> — {c.content}</span>
            {c.source && (
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80 dark:text-emerald-400/80">
                {c.source}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionBlock({ text, onOpenTeach }) {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-500/10 px-3.5 py-3">
      <div className="flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] leading-relaxed text-amber-900 dark:text-amber-200 font-medium">
            {text}
          </p>
          <button
            onClick={onOpenTeach}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
          >
            <GraduationCap className="w-3.5 h-3.5" /> Teach a rule
          </button>
        </div>
      </div>
    </div>
  );
}

function NoticeBlock({ text, onOpenTeach }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-3">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
          <button
            onClick={onOpenTeach}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <GraduationCap className="w-3.5 h-3.5" /> Adjust rules
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsBlock({ candidates, existingSet, onAddItems }) {
  // Selectable candidates exclude parts already in the BOM.
  const selectable = candidates.filter((c) => !existingSet.has(c.partId));

  const [selected, setSelected] = useState(() => {
    const init = {};
    for (const c of selectable) init[c.partId] = true;
    return init;
  });
  const [qty, setQty] = useState(() => {
    const init = {};
    for (const c of candidates) init[c.partId] = c.qty || 1;
    return init;
  });
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const allSelected = selectable.length > 0 && selectedIds.length === selectable.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next = {};
      for (const c of selectable) next[c.partId] = true;
      setSelected(next);
    }
  };

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const add = async () => {
    const items = selectedIds.map((id) => ({ partId: id, qty: qty[id] || 1 }));
    if (!items.length) return;
    setAdding(true);
    try {
      await onAddItems(items);
      setAdded(true);
    } catch (err) {
      console.error('Failed to add items:', err);
      alert(`Failed to add items: ${err.message || err}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700/70">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {candidates.length} suggested item{candidates.length === 1 ? '' : 's'}
        </span>
        {selectable.length > 0 && !added && (
          <button
            onClick={toggleAll}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {allSelected ? 'Unselect all' : 'Select all'}
          </button>
        )}
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-72 overflow-y-auto scrollbar-thin">
        {candidates.map((c) => {
          const inBom = existingSet.has(c.partId);
          const isSel = !inBom && !!selected[c.partId];
          return (
            <li
              key={c.partId}
              onClick={() => !inBom && !added && toggle(c.partId)}
              className={`flex items-start gap-2.5 px-3 py-2.5 ${
                inBom ? 'opacity-50' : added ? '' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div
                className={`mt-0.5 rounded border flex items-center justify-center flex-shrink-0 ${
                  isSel
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                }`}
                style={{ width: 18, height: 18 }}
              >
                {isSel && <Check className="w-3 h-3" strokeWidth={3} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100 leading-snug">
                  {c.part?.description || c.partId}
                  {inBom && (
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      in BOM
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {[c.part?.partNo, c.part?.brand].filter(Boolean).join(' · ')}
                </p>
                <p className="text-[10px] text-indigo-500 dark:text-indigo-400">{c.reason}</p>
              </div>
              {!added && !inBom && (
                <input
                  type="number"
                  min="1"
                  value={qty[c.partId] || 1}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setQty((q) => ({ ...q, [c.partId]: Number.isFinite(n) && n > 0 ? n : 1 }));
                  }}
                  className="flex-shrink-0 w-12 px-1.5 py-1 text-xs text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="px-3 py-2.5 border-t border-slate-100 dark:border-slate-700/70">
        {added ? (
          <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="w-4 h-4" strokeWidth={2.5} /> Added to the BOM.
          </div>
        ) : (
          <button
            onClick={add}
            disabled={selectedIds.length === 0 || adding}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-glow-indigo hover:shadow-lg disabled:opacity-40 transition"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            {adding
              ? 'Adding…'
              : `Add ${selectedIds.length} selected item${selectedIds.length === 1 ? '' : 's'}`}
          </button>
        )}
      </div>
    </div>
  );
}
