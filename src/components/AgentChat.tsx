"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  X,
  Loader2,
  Bot,
  User,
  BrainCircuit,
  Wrench,
  Eye,
  ClipboardCheck,
  RefreshCcw,
  Sparkles,
  TriangleAlert,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Printer,
  Download,
  ShieldCheck,
  FileText,
  Stethoscope,
  Layers,
} from "lucide-react";
import FadeIn from "./FadeIn";
import FormattedMessage from "./FormattedMessage";

const API = "/api/ai";

/* ------------------------------------------------------------------ */
/* Types — mirror the SSE events emitted by backend/agent/core.py      */
/* ------------------------------------------------------------------ */

type TraceEvent =
  | { type: "session"; session_id: string }
  | { type: "thought"; agent?: string; planner?: string; text: string }
  | { type: "tool"; agent?: string; tool: string; args: Record<string, unknown> }
  | { type: "observation"; tool: string; ok?: boolean; ms?: number; [k: string]: unknown }
  | { type: "message"; agent?: string; text: string; suggestions?: string[] }
  | { type: "report"; [k: string]: unknown }
  | { type: "error"; message: string }
  | { type: "done"; finished: boolean; backend?: string };

type ChatItem =
  | { kind: "user"; text: string; image?: string }
  | { kind: "agent"; text: string; suggestions?: string[] }
  | { kind: "trace"; events: TraceEvent[] }
  | { kind: "report"; report: Record<string, unknown> };

const URGENCY_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  routine: { label: "Routine Monitoring", color: "#10b981", bg: "rgba(16, 185, 129, 0.08)" },
  soon: { label: "Book Dermatologist Soon", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)" },
  urgent: { label: "Urgent Clinical Review", color: "#ef4444", bg: "rgba(239, 68, 68, 0.08)" },
};

/* ------------------------------------------------------------------ */
/* Observation view helper                                            */
/* ------------------------------------------------------------------ */

function observationSummary(ev: Record<string, unknown>): string {
  const tool = String(ev.tool || "");
  const ok = ev.ok !== false;
  if (!ok) return `Tool error: ${String(ev.error || "unknown error")}`;
  if (typeof ev.summary === "string") return ev.summary;
  switch (tool) {
    case "analyze_image":
      return ev.top_name
        ? `Neural network match: ${ev.top_name} (${Math.round(Number(ev.top_probability) * 100)}% certainty).`
        : "Photo classified.";
    case "extract_abcde_features":
      return `ABCDE analysis computed: Score ${ev.composite_score}/10 (${ev.overall_band}).`;
    case "analyze_symptoms":
      return `Symptoms extracted: ${ev.summary || "checked for red flags."}`;
    case "assess_risk":
      return `Risk profile scored: ${ev.score}/${ev.max_score} (${ev.band} band).`;
    case "lookup_condition":
      return ev.name ? `Retrieved clinical profile for ${ev.name}.` : "Condition knowledge retrieved.";
    case "compare_history":
      return typeof ev.note === "string" ? ev.note : "Checked longitudinal scan history.";
    case "check_urgency":
      return ev.urgency ? `Triage urgency evaluated: ${ev.urgency.toString().toUpperCase()}.` : "Urgency evaluated.";
    case "search_clinical_knowledge":
      return "Searched dermatology clinical guidelines & references.";
    case "generate_doctor_questions":
      return `Generated tailored consultation question checklist.`;
    default:
      return "Tool executed successfully.";
  }
}

function ObservationView({ ev }: { ev: Record<string, unknown> }) {
  const [showRaw, setShowRaw] = useState(false);
  const raw = JSON.stringify(
    Object.fromEntries(
      Object.entries(ev).filter(([k]) => !["type", "tool", "ms", "ok"].includes(k))
    ),
    null,
    1
  );
  return (
    <div className="flex gap-2.5">
      <Eye size={14} className="mt-0.5 shrink-0 text-emerald-500" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">
          Observation · {String(ev.tool)}
          {typeof ev.ms === "number" ? ` · ${ev.ms}ms` : ""}
        </div>
        <p className="text-xs leading-relaxed">{observationSummary(ev)}</p>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="mt-1 text-[10px] text-muted/70 hover:text-blue-500 transition-colors"
        >
          {showRaw ? "hide raw clinical payload" : "view raw clinical payload"}
        </button>
        <AnimatePresence initial={false}>
          {showRaw && (
            <motion.pre
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all text-muted max-h-40 overflow-auto mt-1 rounded-lg bg-black/5 dark:bg-white/5 p-2"
            >
              {raw}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TraceView({ events }: { events: TraceEvent[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-3 rounded-xl border border-[var(--hairline)] bg-[var(--c-surface)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold
          uppercase tracking-widest text-muted hover:text-blue-500 transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <BrainCircuit size={14} className="text-blue-500" />
          Multi-Agent Reasoning Trace ({events.length} steps)
        </span>
        <span className="text-blue-500 font-mono text-[11px]">{open ? "Collapse ▾" : "Inspect ▸"}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-[var(--hairline)]"
          >
            {events.map((ev, i) => (
              <li key={i} className="px-4 py-2.5 border-b border-[var(--hairline)] last:border-b-0">
                {ev.type === "thought" && (
                  <div className="flex gap-2.5">
                    <BrainCircuit size={14} className="mt-0.5 shrink-0 text-purple-500" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">
                        Clinical Thought · {ev.agent || "triage"}
                        {ev.planner ? ` · ${ev.planner}` : ""}
                      </div>
                      <p className="text-xs leading-relaxed">{ev.text}</p>
                    </div>
                  </div>
                )}

                {ev.type === "tool" && (
                  <div className="flex gap-2.5">
                    <Wrench size={14} className="mt-0.5 shrink-0 text-amber-500" />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">
                        Domain Action Invoked
                      </div>
                      <code className="text-xs font-mono text-blue-500 break-all">
                        {ev.tool}
                        {Object.keys(ev.args || {}).length > 0
                          ? `(${JSON.stringify(ev.args)})`
                          : "()"}
                      </code>
                    </div>
                  </div>
                )}

                {ev.type === "observation" && (
                  <ObservationView ev={ev as unknown as Record<string, unknown>} />
                )}

                {ev.type === "error" && (
                  <div className="flex gap-2.5 text-rose-500">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                    <p className="text-xs">{ev.message}</p>
                  </div>
                )}
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ABCDE Morphological Scorecard Component                            */
/* ------------------------------------------------------------------ */

interface ABCDECriterion {
  name: string;
  score: number;
  label: string;
  description: string;
  detected_shades?: string[];
  coverage_pct?: number;
}

function ABCDEScorecard({ abcde }: { abcde: Record<string, unknown> }) {
  const criteria = (abcde.criteria || {}) as Record<string, ABCDECriterion>;
  const composite = Number(abcde.composite_score || 0);
  const band = String(abcde.overall_band || "Moderate Concern");
  const color = String(abcde.band_color || "#f59e0b");

  return (
    <div className="rounded-xl bg-[var(--c-surface)] border border-[var(--hairline)] p-4 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-[var(--hairline)]">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-wider">ABCDE Morphological Scorecard</span>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {composite.toFixed(1)} / 10 · {band}
        </span>
      </div>

      <div className="space-y-3">
        {Object.entries(criteria).map(([letter, crit]) => (
          <div key={letter} className="text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[10px]">
                  {letter}
                </span>
                {crit.name}
              </span>
              <span className="text-[11px] text-muted">
                <span className="font-medium text-text mr-1.5">{crit.label}</span>
                ({crit.score}/10)
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  crit.score >= 6.5
                    ? "bg-rose-500"
                    : crit.score >= 4.0
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(crit.score * 10, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted mt-1">{crit.description}</p>
            {crit.detected_shades && crit.detected_shades.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {crit.detected_shades.map((shade) => (
                  <span
                    key={shade}
                    className="text-[9px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20"
                  >
                    {shade}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Report Card with Consultation Export                               */
/* ------------------------------------------------------------------ */

function ReportCard({ report }: { report: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const [checkedQs, setCheckedQs] = useState<Record<number, boolean>>({});
  const urgency = String(report.urgency || "routine");
  const style = URGENCY_STYLE[urgency] || URGENCY_STYLE.routine;
  const plan = (report.care_plan || {}) as {
    text?: string;
    narrative?: string;
    tips?: string[];
    reasons?: string[];
    doctor_questions?: string[];
    biopsy_recommendation?: string;
    clinical_pearl?: string;
    dermoscopy_hallmarks?: string[];
  };
  const analysis = (report.evidence as Record<string, Record<string, unknown>> | undefined)
    ?.analysis as
    | { top_name?: string; top_probability?: number; alternatives?: { name: string; probability: number }[] }
    | undefined;
  const abcde = (report.abcde || (report.evidence as Record<string, unknown>)?.abcde) as Record<string, unknown> | undefined;

  const copyQuestions = () => {
    if (!plan.doctor_questions) return;
    const text = plan.doctor_questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printSummary = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = `
      <html>
        <head>
          <title>Helix Derm — Clinical Triage Summary</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            h1 { color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: ${style.color}; color: white; font-weight: bold; font-size: 13px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }
            ul, ol { line-height: 1.6; }
            .disclaimer { font-size: 11px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <h1>Helix Derm · Clinical Consultation Summary</h1>
          <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
          <p><span class="badge">${style.label}</span></p>
          
          <div class="card">
            <h3>Diagnostic Finding (ISIC 2019 Neural Model)</h3>
            <p><strong>Top Match:</strong> ${analysis?.top_name || "Assessed"} (${((analysis?.top_probability || 0) * 100).toFixed(1)}% model certainty)</p>
            <p>${plan.narrative || plan.text || ""}</p>
          </div>

          ${
            plan.doctor_questions && plan.doctor_questions.length > 0
              ? `<div class="card">
                  <h3>Recommended Questions for Dermatologist</h3>
                  <ol>${plan.doctor_questions.map((q) => `<li>${q}</li>`).join("")}</ol>
                </div>`
              : ""
          }

          ${
            plan.tips && plan.tips.length > 0
              ? `<div class="card">
                  <h3>Recommended Patient Actions</h3>
                  <ul>${plan.tips.map((t) => `<li>${t}</li>`).join("")}</ul>
                </div>`
              : ""
          }

          <div class="disclaimer">
            ${report.disclaimer || "Educational screening summary. Not a formal diagnosis. Always confirm with a qualified physician."}
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 rounded-2xl border p-5 sm:p-6"
      style={{ borderColor: style.color, backgroundColor: style.bg }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1 flex items-center gap-1.5">
            <Stethoscope size={13} className="text-blue-500" />
            Clinical Triage Synthesis
          </div>
          <h4 className="font-heading text-xl font-bold">{report.headline as string}</h4>
        </div>
        <div className="flex items-center gap-2 self-start">
          <span
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: style.color }}
          >
            {style.label}
          </span>
          <button
            onClick={printSummary}
            className="p-1.5 rounded-lg border border-[var(--hairline)] bg-[var(--c-surface)] text-muted hover:text-blue-500 hover:scale-105 transition-all"
            title="Print or Export Clinical Sheet"
          >
            <Printer size={15} />
          </button>
        </div>
      </div>

      {analysis?.top_name && (
        <div className="mb-4 rounded-xl bg-[var(--c-surface)] border border-[var(--hairline)] p-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-text">Model Match: {analysis.top_name}</span>
            <span className="font-mono text-blue-500 font-bold">
              {((analysis.top_probability || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((analysis.top_probability || 0) * 100, 2)}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
            />
          </div>
          {analysis.alternatives?.map((a) => (
            <div key={a.name} className="flex justify-between text-[11px] text-muted">
              <span>{a.name}</span>
              <span className="font-mono">{(a.probability * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ABCDE Scorecard */}
      {abcde && <ABCDEScorecard abcde={abcde} />}

      {/* Clinical Narrative */}
      {(plan.narrative || plan.text) && (
        <div className="text-sm leading-relaxed mb-4 text-text/90 rounded-xl bg-[var(--c-surface)] border border-[var(--hairline)] p-4">
          <FormattedMessage text={plan.narrative || plan.text || ""} />
        </div>
      )}

      {/* Why this urgency */}
      {plan.reasons && plan.reasons.length > 0 && (
        <div className="mb-4 rounded-xl bg-[var(--c-surface)] border border-[var(--hairline)] p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-2 font-bold">
            Clinical Decision Matrix &amp; Urgency Factors
          </div>
          <ul className="space-y-1.5">
            {plan.reasons.map((r, i) => (
              <li key={i} className="text-xs text-muted flex gap-2">
                <span className="text-blue-500 font-bold">✓</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Doctor Checklist */}
      {plan.doctor_questions && plan.doctor_questions.length > 0 && (
        <div className="mb-4 rounded-xl bg-[var(--c-surface)] border border-[var(--hairline)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-muted font-bold flex items-center gap-1.5">
              <ClipboardCheck size={13} className="text-blue-500" />
              Checklist for Your Dermatologist Visit
            </span>
            <button
              onClick={copyQuestions}
              className="text-[11px] text-blue-500 hover:underline inline-flex items-center gap-1 font-medium"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-500" /> Copied!
                </>
              ) : (
                <>
                  <Copy size={12} /> Copy all
                </>
              )}
            </button>
          </div>
          <ul className="space-y-2 mt-2">
            {plan.doctor_questions.map((q, i) => (
              <li
                key={i}
                onClick={() => setCheckedQs((prev) => ({ ...prev, [i]: !prev[i] }))}
                className="text-xs flex items-start gap-2.5 cursor-pointer select-none group"
              >
                <input
                  type="checkbox"
                  checked={!!checkedQs[i]}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-blue-500 focus:ring-0 cursor-pointer"
                />
                <span className={checkedQs[i] ? "line-through text-muted/60" : "text-text group-hover:text-blue-500"}>
                  {q}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended actions */}
      {plan.tips && plan.tips.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-2 font-bold">
            Patient Next Steps
          </div>
          <ol className="space-y-1.5">
            {plan.tips.map((t, i) => (
              <li key={i} className="text-xs flex gap-2">
                <span className="text-blue-500 font-bold">{i + 1})</span>
                {t}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-[11px] text-muted mt-5 pt-4 border-t border-[var(--hairline)]">
        {String(report.disclaimer || "")}
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Agent Chat Section                                            */
/* ------------------------------------------------------------------ */

export default function AgentChat() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [backend, setBackend] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/agent/info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setBackend(d.planner_backend || "");
        setTools((d.tools || []).map((t: { function: { name: string } }) => t.function.name));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items]);



  const toggleSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#]/g, "");
      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = 1.0;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
      setIsSpeaking(true);
    }
  };

  /* Send message/photo to DermaAgent */
  const send = useCallback(
    async (overrideText?: string, overrideImage?: { file: File; preview: string }) => {
      const text = (overrideText !== undefined ? overrideText : input).trim();
      const currentImage = overrideImage !== undefined ? overrideImage : image;
      if ((!text && !currentImage) || busy) return;

      const userItem: ChatItem = {
        kind: "user",
        text: text || "(attached a photo)",
        image: currentImage?.preview,
      };
      const traceIdx = items.length + 1;
      setItems((prev) => [...prev, userItem, { kind: "trace", events: [] }]);
      setInput("");
      setBusy(true);

      const form = new FormData();
      form.append("message", text);
      form.append("session_id", sessionId);
      if (currentImage) form.append("image", currentImage.file);

      try {
        const res = await fetch(`${API}/agent/chat`, { method: "POST", body: form });
        if (!res.ok || !res.body) throw new Error(`Agent request failed (HTTP ${res.status})`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            let ev: TraceEvent;
            try {
              ev = JSON.parse(line.slice(6)) as TraceEvent;
            } catch {
              continue;
            }

            if (ev.type === "session") {
              setSessionId(ev.session_id);
              continue;
            }
            if (ev.type === "done") {
              if (ev.backend) setBackend(ev.backend);
              continue;
            }

            setItems((prev) => {
              const next = [...prev];
              if (ev.type === "message") {
                next.push({ kind: "agent", text: ev.text, suggestions: ev.suggestions });
              } else if (ev.type === "report") {
                next.push({ kind: "report", report: ev as unknown as Record<string, unknown> });
              } else {
                const cur = next[traceIdx];
                if (cur && cur.kind === "trace") {
                  next[traceIdx] = { kind: "trace", events: [...cur.events, ev] };
                }
              }
              return next;
            });
          }
        }
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        // "Failed to fetch" = browser lost connection (timeout / CORS / backend down)
        const friendly = raw.includes("fetch")
          ? "The backend took too long to respond — please try again in a moment."
          : raw.startsWith("Agent request failed")
            ? "Something went wrong on the server side. Try sending your message again."
            : raw || "Could not reach the agent. Is the backend running?";
        setItems((prev) => [
          ...prev,
          {
            kind: "agent",
            text: friendly,
            suggestions: ["Try again", "Scan another photo"],
          },
        ]);
      } finally {
        setBusy(false);
        if (currentImage && !overrideImage) URL.revokeObjectURL(currentImage.preview);
        if (!overrideImage) setImage(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [input, image, busy, items.length, sessionId]
  );

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    if (image) URL.revokeObjectURL(image.preview);
    setImage({ file: f, preview: URL.createObjectURL(f) });
  };

  /* Quick load sample lesion */
  const loadSample = async (filename: string, label: string) => {
    try {
      const res = await fetch(`/samples/${filename}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/jpeg" });
      const preview = URL.createObjectURL(file);
      const sampleImg = { file, preview };
      setImage(sampleImg);
      send(`Please analyze this lesion photo (${label}) and provide an ABCDE score.`, sampleImg);
    } catch {
      alert("Could not load sample lesion image.");
    }
  };

  const reset = () => {
    setItems([]);
    setSessionId("");
    if (image) URL.revokeObjectURL(image.preview);
    setImage(null);
    if (isSpeaking && typeof window !== "undefined") {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <section id="agent" className="section-pad relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_10%,rgba(59,130,246,0.06),transparent)] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <FadeIn className="text-center mb-10">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.96 }}
            onMouseEnter={() => {
              if (isBadgeHovered) return;
              setIsBadgeHovered(true);
              setTimeout(() => setIsBadgeHovered(false), 500);
            }}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-4 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isBadgeHovered 
                ? "bg-white text-slate-900 shadow-[0_0_24px_rgba(59,130,246,0.5)]" 
                : "bg-black text-white shadow-md hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            }`}
          >
            <Sparkles size={13} className="text-blue-400" />
            DermaAgent · Your Personal AI Lesion Screening Agent
          </motion.div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mt-4 mb-4">
            An Agent That <span className="gradient-text">Reasons Clinically</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Multi-agent architecture coordinating neural image classification, computer vision{" "}
            <strong>ABCDE morphometrics</strong>, symptom parsing, and clinical knowledge retrieval
            with complete reasoning transparency.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="glass-frost rounded-2xl overflow-hidden border border-[var(--hairline)]">
            {/* Header bar */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[var(--hairline)] bg-[var(--c-surface)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={17} className="text-white" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-2">
                    DermaAgent
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                      Active
                    </span>
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    Planner: {backend || "connecting…"} · {tools.length || 9} tools registered
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={reset}
                    className="shrink-0 text-xs text-muted hover:text-rose-500 inline-flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <RefreshCcw size={12} /> New session
                  </button>
                )}
              </div>
            </div>

            {/* Transcript scroll box */}
            <div ref={scrollRef} className="h-[480px] overflow-y-auto px-5 py-4 space-y-4">
              {items.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                    <ClipboardCheck size={26} />
                  </div>
                  <h3 className="font-heading font-bold text-base mb-1">How can I assist your skin health today?</h3>
                  <p className="text-xs text-muted max-w-md leading-relaxed mb-6">
                    Attach a lesion photo to trigger neural classification and ABCDE morphometrics,
                    describe your symptoms, or explore dermatology questions with clinical guidelines.
                  </p>

                  {/* Quick Starter Prompts */}
                  <div className="w-full max-w-lg space-y-2">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted mb-1 text-left">
                      Instant 1-Click Clinical Test Samples:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => loadSample("sample-melanoma.jpg", "Atypical Lesion")}
                        className="p-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--c-surface)] text-left hover:border-rose-500/50 hover:bg-rose-500/5 transition-all text-xs group"
                      >
                        <span className="font-semibold block text-text group-hover:text-rose-500">
                          🔬 Sample: Melanoma
                        </span>
                        <span className="text-[10px] text-muted">Atypical &amp; asymmetric</span>
                      </button>
                      <button
                        onClick={() => loadSample("sample-nevus.jpg", "Common Mole")}
                        className="p-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--c-surface)] text-left hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-xs group"
                      >
                        <span className="font-semibold block text-text group-hover:text-emerald-500">
                          🛡️ Sample: Nevus
                        </span>
                        <span className="text-[10px] text-muted">Benign common mole</span>
                      </button>
                      <button
                        onClick={() => loadSample("sample-bcc.jpg", "Basal Cell")}
                        className="p-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--c-surface)] text-left hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-xs group"
                      >
                        <span className="font-semibold block text-text group-hover:text-amber-500">
                          🩺 Sample: Basal Cell
                        </span>
                        <span className="text-[10px] text-muted">Pearly with telangiectasia</span>
                      </button>
                    </div>

                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted pt-2 text-left">
                      Or Ask a Clinical Question:
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                      {[
                        "What is the ABCDE rule in skin cancer?",
                        "What is the difference between BCC and Melanoma?",
                        "What are the urgent red-flag symptoms?",
                        "What broad-spectrum sunscreen SPF should I use?",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => send(prompt)}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-[var(--hairline)] bg-[var(--c-surface)] text-muted hover:text-blue-500 hover:border-blue-500/40 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Items */}
              {items.map((item, i) => {
                if (item.kind === "user")
                  return (
                    <div key={i} className="flex justify-end gap-2.5">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt="attached lesion"
                          className="w-16 h-16 rounded-xl object-cover border border-[var(--hairline)] shadow-sm"
                        />
                      )}
                      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-blue-500 text-white px-4 py-2.5 text-sm shadow-sm leading-relaxed">
                        {item.text}
                      </div>
                      <User size={16} className="mt-2 shrink-0 text-muted" />
                    </div>
                  );

                if (item.kind === "agent")
                  return (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="flex gap-2.5">
                        <Bot size={16} className="mt-2 shrink-0 text-blue-500" />
                        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[var(--c-surface)] border border-[var(--hairline)] px-4 py-3 text-sm leading-relaxed relative group">
                          <FormattedMessage text={item.text} />
                          <button
                            onClick={() => toggleSpeech(item.text)}
                            className="absolute bottom-2 right-2 p-1 rounded-md text-muted/60 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Listen to response"
                          >
                            <Volume2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Interactive suggestion chips */}
                      {item.suggestions && item.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 ml-7 mt-1">
                          {item.suggestions.map((sug) => (
                            <button
                              key={sug}
                              onClick={() => send(sug)}
                              className="text-xs px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-blue-500 hover:bg-blue-500 hover:text-white transition-all font-medium"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );

                if (item.kind === "trace")
                  return item.events.length > 0 ? (
                    <TraceView key={i} events={item.events} />
                  ) : null;

                return <ReportCard key={i} report={item.report} />;
              })}

              {/* Busy Reasoning Indicator */}
              {busy && (
                <div className="flex gap-2.5 items-center text-muted text-xs p-2 rounded-xl bg-blue-500/5 border border-blue-500/10 w-fit">
                  <Loader2 size={14} className="animate-spin text-blue-500" />
                  <span className="font-medium text-text">DermaAgent is synthesizing clinical evidence…</span>
                </div>
              )}
            </div>

            {/* Composer Footer */}
            <div className="border-t border-[var(--hairline)] p-3 bg-[var(--c-surface)]">
              {image && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.preview}
                    alt="selected"
                    className="w-12 h-12 rounded-lg object-cover border border-[var(--hairline)]"
                  />
                  <span className="text-xs text-muted truncate flex-1">{image.file.name}</span>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(image.preview);
                      setImage(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="text-muted hover:text-rose-500 transition-colors p-1"
                    aria-label="Remove image"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />

                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="w-10 h-10 shrink-0 rounded-xl border border-[var(--hairline)] flex items-center justify-center
                    text-muted hover:text-blue-500 hover:border-blue-500/60 transition-colors disabled:opacity-40 bg-[var(--c-bg)]"
                  title="Attach a lesion photo"
                >
                  <Paperclip size={17} />
                </button>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Describe your lesion, ask a dermatology question, or attach a photo…"
                  className="flex-1 resize-none rounded-xl border border-[var(--hairline)] bg-[var(--c-bg)]
                    px-3.5 py-2.5 text-sm outline-none focus:border-blue-500/60 transition-colors max-h-28"
                />

                <button
                  onClick={() => send()}
                  disabled={busy || (!input.trim() && !image)}
                  className="w-10 h-10 shrink-0 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center
                    hover:scale-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm"
                  aria-label="Send"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </FadeIn>

        <p className="text-[11px] text-muted text-center mt-5 max-w-2xl mx-auto flex items-center justify-center gap-1.5">
          <ShieldCheck size={13} className="text-blue-500" />
          Educational clinical triage screening aid. Integrates deep CNN inference with computer vision ABCDE
          morphometrics and clinical guideline synthesis. Does not replace histological biopsy.
        </p>
      </div>
    </section>
  );
}
