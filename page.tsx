"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function Page() {
  type BotStructured = {
    possibilities: { title: string; description: string; risk: 'low'|'medium'|'high' }[];
    nextSteps: string[];
    clarifyingQuestions: string[];
    severity: number;
    chips: string[];
  };

  const [messages, setMessages] = useState<{ role: string; content?: string; structured?: BotStructured }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [playSound, setPlaySound] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [printHtml, setPrintHtml] = useState<string>("");
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const tips = useMemo(() => [
    "Stay hydrated to reduce headaches.",
    "Wash hands often to prevent infections.",
    "Sleep 7–9 hours to support immunity.",
    "Seek urgent care for chest pain or severe shortness of breath.",
  ], []);
  const [tipIndex, setTipIndex] = useState(0);

  const handleNewChat = () => {
    try { localStorage.removeItem("symptom_chat_v1"); } catch {}
    setMessages([]);
    setInput("");
    setTags([]);
    setPrintHtml("");
    setShowPrintConfirm(false);
  };

  // Load and persist messages to localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("symptom_chat_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((m: any) => {
            // If already in new format with structured, trust it
            if (m && m.structured && typeof m.role === 'string') {
              return { role: m.role, structured: m.structured };
            }
            // If content looks like serialized structured JSON, try to parse it
            if (m && typeof m.content === 'string' && typeof m.role === 'string') {
              try {
                const maybe = JSON.parse(m.content);
                if (
                  maybe &&
                  Array.isArray(maybe.possibilities) &&
                  Array.isArray(maybe.nextSteps) &&
                  Array.isArray(maybe.clarifyingQuestions) &&
                  typeof maybe.severity === 'number'
                ) {
                  return { role: m.role, structured: maybe };
                }
              } catch {}
              // Otherwise, treat as plain HTML content (assistant) or text (user)
              return { role: m.role, content: m.content };
            }
            return m;
          });
          setMessages(normalized);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      // Store role + structured (object) when present, otherwise role + content
      const compact = messages.map((m) =>
        m.structured
          ? { role: m.role, structured: m.structured }
          : { role: m.role, content: m.content }
      );
      localStorage.setItem("symptom_chat_v1", JSON.stringify(compact));
    } catch {}
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Prepare a subtle chime
  useEffect(() => {
    audioRef.current = new Audio("data:audio/mp3;base64,//uQxAA...AAA");
  }, []);

  // Rotate tips
  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 6000);
    return () => clearInterval(id);
  }, [tips.length]);

  // Show confirmation after the print dialog closes
  useEffect(() => {
    const onAfterPrint = () => {
      // Only prompt if we actually prepared content
      if (printHtml) setShowPrintConfirm(true);
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [printHtml]);

  // Build printable HTML from the latest assistant message
  function buildReportHtml(msg: { content?: string; structured?: BotStructured } | undefined): string {
    if (!msg) return `<h1>Symptom Checker Report</h1><p>No assistant response available.</p>`;
    if (msg.structured) {
      const s = msg.structured;
      const poss = (s.possibilities || [])
        .map((p) => `<li><strong>${p.title}</strong> (${p.risk}) — ${p.description}</li>`)
        .join("");
      const steps = (s.nextSteps || []).map((x) => `<li>${x}</li>`).join("");
      const qs = (s.clarifyingQuestions || []).map((q) => `<li>${q}</li>`).join("");
      const sev = Math.min(100, Math.max(0, s.severity || 0));
      return `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#111">
          <h1 style="margin:0 0 8px">🩺 Symptom Checker Report</h1>
          <div style="margin: 8px 0 16px; font-size:12px; color:#555">Generated summary based on your described symptoms.</div>
          <div style="height:10px; width:100%; background:#eee; border-radius:8px; overflow:hidden; margin: 12px 0 20px">
            <div style="height:100%; width:${sev}%; background:linear-gradient(90deg,#16a34a,#facc15,#ef4444)"></div>
          </div>
          <h2 style="margin:16px 0 6px">Diagnosis possibilities</h2>
          <ul>${poss}</ul>
          <h2 style="margin:16px 0 6px">Next steps</h2>
          <ol>${steps}</ol>
          ${qs ? `<h2 style=\"margin:16px 0 6px\">Clarifying questions</h2><ul>${qs}</ul>` : ''}
          <hr style="margin:20px 0; border:none; border-top:1px solid #ddd" />
          <div style="font-size:11px; color:#666">Not a diagnosis. Educational only. Please consult a clinician.</div>
        </div>`;
    }
    return `<div style="font-family: Georgia, 'Times New Roman', serif; color:#111">${msg.content || ""}</div>`;
  }

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    // naive symptom tag extraction (split by non-words, filter common words)
    const nextTags = Array.from(new Set(
      input
        .toLowerCase()
        .split(/[^a-zA-Z]+/)
        .filter((w) => w.length > 2 && !["and","but","the","for","with","have","had","been","very","mild","severe","pain","feel","feels","felt","since","that","this","there","also","little","some"].includes(w))
        .slice(0, 6)
    ));
    setTags(nextTags);
    setInput("");
    setLoading(true);

    try {
      // Build a trimmed history to provide conversation context
      const recent = messages
        .slice(-8) // keep last 8 turns
        .map((m) => m.structured ? { role: m.role, content: JSON.stringify(m.structured) } : { role: m.role, content: m.content || "" });

      const res = await fetch("/api/symptom-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: recent }),
      });
      const data = await res.json();
      const botMessage = data.structured
        ? { role: "assistant", structured: data.structured as BotStructured }
        : { role: "assistant", content: data.reply as string };
      setMessages((prev) => [...prev, botMessage]);
      if (playSound) {
        try { await audioRef.current?.play(); } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-bg-soft py-10">
      <div className="w-full max-w-5xl mx-auto glass chat-surface rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 shadow-xl">
        {/* Sidebar */}
        <aside className="w-full md:w-56 shrink-0">
          <div className="rounded-2xl bg-white/85 ring-1 ring-emerald-100 shadow-sm p-4 mb-4">
            <div className="text-xs font-semibold text-emerald-700 mb-2">Common Symptoms</div>
            <div className="flex flex-wrap gap-2">
              {["Chest pain","Fever","Headache","Fatigue","Cough","Shortness of breath"].map((s) => (
                <button key={s} className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white/90 ring-1 ring-[var(--tone-brown)]/20 shadow-sm p-4">
            <div className="text-xs font-semibold text-[var(--tone-brown)] mb-2">Emergency Guide</div>
            <ul className="text-xs space-y-1 text-gray-700">
              <li>Heart attack: call emergency, chew aspirin</li>
              <li>Stroke: FAST (Face-Arm-Speech-Time)</li>
              <li>Trouble breathing: seek urgent care</li>
            </ul>
          </div>
          <div className="mt-3">
            <button
              onClick={handleNewChat}
              className="w-full text-xs px-3 py-2 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              title="Start a new chat"
            >New chat</button>
          </div>
        </aside>
        {/* Main chat */}
        <div className="flex-1">
        <h1 className="text-2xl font-semibold text-center mb-1">🩺 Symptom Checker</h1>
        <p className="text-center text-xs text-gray-500">Private, on-device assistant. Educational only.</p>
        {tags.length > 0 && (
          <div className="mt-3 mb-2 flex flex-wrap gap-2 justify-center">
            {tags.map((t) => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{t}</span>
            ))}
          </div>
        )}

        <div ref={scrollRef} className="relative flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          <div className="chat-watermark" />
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} slide-up`}>
              {msg.role !== "user" && (
                <div className={`w-8 h-8 rounded-full bg-white shadow flex items-center justify-center mr-2 ${loading && i === messages.length-1 ? 'heartbeat' : ''}`}>🏥</div>
              )}
              {msg.structured ? (
                <div className="max-w-[80%] space-y-3">
                  {/* Severity bar */}
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, msg.structured.severity))}%`,
                        background: 'linear-gradient(90deg, #16a34a, #facc15, #ef4444)'
                      }}
                    />
                  </div>
                  {/* Possibilities */}
                  <div className="grid gap-2">
                    {msg.structured.possibilities?.map((p, idx) => (
                      <div key={idx} className={`rounded-2xl px-4 py-3 shadow bg-white ${p.risk==='high' ? 'ring-1 ring-rose-200' : p.risk==='medium' ? 'ring-1 ring-amber-200' : 'ring-1 ring-emerald-200'}`}>
                        <div className="flex items-center gap-2 font-semibold text-gray-800">
                          <span className={`inline-block w-4 h-4 rounded-full border ${p.risk==='high' ? 'border-rose-600' : p.risk==='medium' ? 'border-amber-600' : 'border-emerald-700'}`}></span>
                          {p.title}
                        </div>
                        <div className="text-sm text-gray-700 mt-1">{p.description}</div>
                      </div>
                    ))}
                  </div>
                  {/* Next steps */}
                  <div className="rounded-2xl px-4 py-3 shadow bg-white ring-1 ring-[var(--tone-brown)]/15">
                    <div className="font-semibold mb-1">Next steps</div>
                    <ul className="list-none space-y-1 text-sm text-gray-700">
                      {msg.structured.nextSteps?.map((s, idx) => (
                        <li key={idx}>✔️ {s}</li>
                      ))}
                    </ul>
                  </div>
                  {/* Clarifying questions + chips */}
                  {msg.structured.clarifyingQuestions?.length > 0 && (
                    <div className="rounded-2xl px-4 py-3 shadow bg-white ring-1 ring-gray-100">
                      <details>
                        <summary className="font-semibold mb-2 cursor-pointer select-none">Clarifying questions</summary>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 mt-2">
                          {msg.structured.clarifyingQuestions.map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.structured.chips?.map((c, idx) => (
                            <button
                              key={idx}
                              onClick={() => setInput((prev) => (prev ? prev + ' ' + c : c))}
                              className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm"
                            >{c}</button>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">🩺 Not a doctor • AI assistant</div>
                </div>
              ) : (
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow ${
                    msg.role === "user"
                      ? "bubble-user text-white font-user"
                      : "bubble-ai text-gray-800 font-ai"
                  } ${loading && i === messages.length-1 && msg.role !== 'user' ? 'shimmer' : ''}`}
                  dangerouslySetInnerHTML={{ __html: msg.content || '' }}
                />
              )}
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-[var(--tone-teal)] text-white shadow flex items-center justify-center ml-2">You</div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center animate-spin">🩺</span>
              <span className="typing"><span className="typing-dot"></span><span className="typing-dot"></span><span className="typing-dot"></span></span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            className="flex-1 glass rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--tone-teal)]"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms..."
          />
          <button
            onClick={sendMessage}
            className={`bg-[var(--tone-teal)] text-white px-5 py-3 rounded-full shadow transition focus:ring-2 focus:ring-[var(--tone-teal)] active:scale-[0.98] ${input.trim() ? 'hover:opacity-90' : 'opacity-60 cursor-not-allowed'}`}
            disabled={!input.trim()}
          >
            Send
          </button>
          <button
            type="button"
            aria-label="voice input"
            title="Voice (coming soon)"
            className="glass w-11 h-11 rounded-full flex items-center justify-center text-gray-600"
          >
            🎤
          </button>
          <label className="ml-auto text-xs text-gray-500 flex items-center gap-2">
            <input type="checkbox" checked={playSound} onChange={(e) => setPlaySound(e.target.checked)} />
            Sound
          </label>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          ⚠️ Not a medical diagnosis. Always consult a doctor.
        </div>

        <div className="mt-2 flex justify-end">
          <button
            onClick={() => {
              const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
              const html = buildReportHtml(lastAssistant);
              setPrintHtml(html);
              // Let #print-area render this tick before printing
              setTimeout(() => window.print(), 0);
            }}
            className="text-xs glass px-3 py-2 rounded-full hover:bg-white/70 border border-[var(--tone-brown)]/20"
          >
            Download Doctor Report
          </button>
        </div>
        {/* Tips rotator as flashcard at bottom */}
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40">
          <div className="glass rounded-2xl px-4 py-3 shadow-lg ring-1 ring-emerald-100 text-[13px] sm:text-sm">
            <span className="text-emerald-700 font-semibold mr-2">Did you know?</span>
            <span className="text-gray-700">{tips[tipIndex]}</span>
          </div>
        </div>
        <audio ref={audioRef} hidden />
        {/* Hidden print container (only visible during print via CSS) */}
        <div id="print-area" dangerouslySetInnerHTML={{ __html: printHtml }} />

        {/* Post-print confirmation modal */}
        {showPrintConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-5 w-[90%] max-w-md">
              <div className="text-sm font-medium mb-2">Did your report download/print successfully?</div>
              <div className="text-xs text-gray-500 mb-4">Choose Yes to celebrate, or No to dismiss.</div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm" onClick={() => { setShowPrintConfirm(false); setPrintHtml(""); }}>No</button>
                <button className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm" onClick={() => {
                  // Fire confetti only after user confirms
                  const container = document.createElement('div');
                  container.className = 'confetti';
                  document.body.appendChild(container);
                  const colors = ['#91C8E4','#97B067','#FCECDD','#FFFFF0','#60a5fa','#34d399','#fbbf24','#f87171'];
                  const pieces = 80;
                  for (let i=0;i<pieces;i++){
                    const el = document.createElement('div');
                    el.className = 'confetti-piece';
                    el.style.left = Math.random()*100 + 'vw';
                    el.style.top = '-10vh';
                    el.style.background = colors[Math.floor(Math.random()*colors.length)];
                    el.style.transform = `translateY(0) rotate(${Math.random()*360}deg)`;
                    el.style.animationDuration = (0.9 + Math.random()*1.6) + 's';
                    container.appendChild(el);
                  }
                  setTimeout(() => container.remove(), 2500);
                  setShowPrintConfirm(false);
                  setPrintHtml("");
                }}>Yes</button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
