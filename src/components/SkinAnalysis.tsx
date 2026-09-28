"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  Camera,
  X,
  Loader2,
  ScanLine,
  ShieldAlert,
  Info,
  Trash2,
  Sparkles,
  Activity,
  BrainCircuit,
  Eye,
  X as XIcon,
  Stethoscope,
  FileDown,
} from "lucide-react";
import FadeIn from "./FadeIn";
import NeuralNetwork from "./NeuralNetwork";

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

type Prediction = { code: string; name: string; probability: number };
type TopPrediction = Prediction & {
  severity: "low" | "moderate" | "high";
  severity_label: string;
  severity_color: string;
  severity_advice: string;
  description: string;
  tips: string[];
};
type PredictResponse = {
  predictions: Prediction[];
  top: TopPrediction;
  inference_ms: number;
  model: { architecture: string; input_size: number; test_accuracy: number | null };
};
type ModelInfo = {
  loaded: boolean;
  architecture: string;
  input_size: number;
  classes: { code: string; name: string; severity: string }[];
  metrics: {
    test_accuracy: number | null;
    test_balanced_accuracy: number | null;
    per_class_recall: Record<string, number> | null;
  };
  dataset: { name: string; train_images: number; test_images: number };
};
type HistoryItem = {
  id: string;
  date: string;
  thumb: string;
  name: string;
  probability: number;
  severity_color: string;
};

const HISTORY_KEY = "helix-derm-history";
const MAX_HISTORY = 6;
const API = "/api/ai";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function fileToThumb(file: File, size = 96): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      const side = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* camera modal                                                        */
/* ------------------------------------------------------------------ */

function CameraModal({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError(
          "Camera unavailable. Please allow camera access, or upload a photo instead.",
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const side = Math.min(v.videoWidth, v.videoHeight);
    const c = document.createElement("canvas");
    c.width = side;
    c.height = side;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      v,
      (v.videoWidth - side) / 2,
      (v.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      side,
      side,
    );
    c.toBlob((blob) => {
      if (blob) {
        onCapture(new File([blob], "camera-capture.jpg", { type: "image/jpeg" }));
      }
      onClose();
    }, "image/jpeg", 0.92);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(0,0,0,0.72)] backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl overflow-hidden glass-frost !bg-bg"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--hairline)]">
          <span className="text-sm font-semibold">Capture a close-up</span>
          <button onClick={onClose} aria-label="Close camera" className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <XIcon size={18} />
          </button>
        </div>
        <div className="relative aspect-square bg-black">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-8 border-2 border-[rgba(255,255,255,0.6)] rounded-full pointer-events-none" />
        </div>
        {error && <p className="px-5 py-3 text-xs text-rose-500">{error}</p>}
        <div className="p-4 flex justify-center">
          <button
            onClick={capture}
            disabled={!!error}
            className="w-16 h-16 rounded-full bg-[#ffffff] border-4 border-[#cbd5e1] hover:scale-110 active:scale-95 transition-transform disabled:opacity-40"
            aria-label="Capture photo"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* main section                                                        */
/* ------------------------------------------------------------------ */

export default function SkinAnalysis() {
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
    fetch(`${API}/model-info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setModelInfo(d))
      .catch(() => {});
  }, []);

  const acceptFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WEBP).");
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setError("Image is larger than 12 MB — please pick a smaller one.");
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const clearSelection = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const downloadReport = () => {
    if (!result) return;
    const lines = [
      "HELIX DERM — SKIN LESION ANALYSIS REPORT",
      "=======================================",
      "",
      `Generated: ${new Date().toLocaleString()}`,
      `Model: ${result.model.architecture} (${result.model.input_size}px input)`,
      `Inference time: ${result.inference_ms} ms`,
      "",
      "TOP MATCH",
      "---------",
      `${result.top.name} (${result.top.code}) — ${(result.top.probability * 100).toFixed(1)}%`,
      `Concern level: ${result.top.severity_label}`,
      "",
      result.top.description ?? "",
      "",
      "RECOMMENDED ACTIONS",
      "-------------------",
      ...result.top.tips.map((t, i) => `${i + 1}. ${t}`),
      "",
      "ALL PREDICTIONS",
      "---------------",
      ...result.predictions.map(
        (p, i) =>
          `${i + 1}. ${p.name} (${p.code}): ${(p.probability * 100).toFixed(1)}%`
      ),
      "",
      "DISCLAIMER",
      "----------",
      "This report is produced by an educational screening model and is not a",
      "medical diagnosis. Always have any new, changing or suspicious lesion",
      "examined by a qualified dermatologist.",
      "",
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dermaagent-report-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const analyze = async () => {
    if (!file || analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/predict`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Analysis failed (HTTP ${res.status}).`);
      }
      const data = (await res.json()) as PredictResponse;
      setResult(data);
      // history
      try {
        const thumb = await fileToThumb(file);
        const item: HistoryItem = {
          id: `${Date.now()}`,
          date: new Date().toLocaleString(),
          thumb,
          name: data.top.name,
          probability: data.top.probability,
          severity_color: data.top.severity_color,
        };
        const next = [item, ...loadHistory()].slice(0, MAX_HISTORY);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        setHistory(next);
      } catch {
        /* history is best-effort */
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reach the analysis service. Is the backend running?",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  return (
    <section id="analysis" className="section-pad relative overflow-hidden">
      <NeuralNetwork className="opacity-40" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* ---------------- header ---------------- */}
        <FadeIn className="text-center mb-14">
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
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            AI Diagnostics
          </motion.div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mt-4 mb-6">
            Smart Dermatolog<span className="text-blue-500">y</span>
          </h2>
          <p className="text-muted max-w-2xl mx-auto text-lg leading-relaxed">
            Upload a photo of a skin lesion and our convolutional neural network
            classifies it across eight lesion types — trained on the ISIC 2019
            dermoscopy dataset, with care guidance in seconds.
          </p>
        </FadeIn>

        {/* ---------------- main grid ---------------- */}
        <div className="grid lg:grid-cols-2 gap-6 items-stretch">
          {/* -------- upload card -------- */}
          <FadeIn direction="left" className="h-full">
            <div className="glass-frost p-6 sm:p-8 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <ScanLine size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-heading font-bold">1 · Provide a photo</h3>
                  <p className="text-muted text-xs">
                    A clear, close-up, well-lit image works best.
                  </p>
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) acceptFile(f);
                }}
                className={`relative flex-1 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
                  ${dragging
                    ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                    : "border-[var(--hairline)] hover:border-blue-500/60 hover:bg-blue-500/5"
                  }
                  flex items-center justify-center`}
              >
                {preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Selected skin lesion"
                      className="w-full h-full object-cover"
                    />
                    {analyzing && (
                      <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)]">
                        <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-scan" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSelection();
                      }}
                      className="absolute top-3 right-3 p-2 rounded-full bg-[rgba(0,0,0,0.6)] text-[#fff] hover:bg-[rgba(0,0,0,0.8)] transition-colors"
                      aria-label="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-8 text-center">
                    <UploadCloud size={40} className="text-blue-500" />
                    <p className="text-sm font-medium">
                      Drag &amp; drop an image here, or click to browse
                    </p>
                    <p className="text-xs text-muted">JPG · PNG · WEBP — up to 12 MB</p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) acceptFile(f);
                  }}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-6">
                <button
                  onClick={() => setCameraOpen(true)}
                  className="flex-1 px-5 py-3 rounded-full text-sm font-semibold border border-[var(--hairline)]
                    hover:bg-blue-500/10 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Camera size={16} className="text-blue-500" /> Use camera
                </button>
                <button
                  onClick={analyze}
                  disabled={!file || analyzing}
                  className="flex-1 px-5 py-3 rounded-full text-sm font-semibold bg-black text-white
                    hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-300 inline-flex items-center justify-center gap-2 btn-bump"
                >
                  {analyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Analyzing…
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Sparkles size={16} /> Analyze lesion
                    </span>
                  )}
                </button>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-xs text-rose-500 flex items-center gap-1.5"
                >
                  <ShieldAlert size={14} /> {error}
                </motion.p>
              )}
            </div>
          </FadeIn>

          {/* -------- results card -------- */}
          <FadeIn direction="right" className="h-full">
            <div className="glass-frost p-6 sm:p-8 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <Activity size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-heading font-bold">2 · Read the result</h3>
                  <p className="text-muted text-xs">
                    Top-3 predictions with confidence and care guidance.
                  </p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!result && !analyzing && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-10"
                  >
                    <Eye size={36} className="text-muted/50" />
                    <p className="text-sm text-muted max-w-xs">
                      Your diagnosis will appear here — with confidence scores,
                      care tips and urgency guidance.
                    </p>
                  </motion.div>
                )}

                {analyzing && !result && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center gap-4"
                  >
                    <Loader2 size={36} className="text-blue-500 animate-spin" />
                    <p className="text-sm text-muted">
                      Running the lesion through the network…
                    </p>
                  </motion.div>
                )}

                {result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* headline */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-muted mb-1">
                          Most likely
                        </div>
                        <div className="font-heading text-2xl sm:text-3xl font-bold">
                          {result.top.name}
                        </div>
                        <p className="text-sm text-muted mt-1 max-w-md">
                          {result.top.description}
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                        style={{ backgroundColor: result.top.severity_color }}
                      >
                        {result.top.severity_label}
                      </span>
                    </div>

                    {/* confidence bars */}
                    <div className="space-y-3 mb-5">
                      {result.predictions.map((p, i) => (
                        <div key={p.code}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={i === 0 ? "font-semibold" : "text-muted"}>
                              {p.name}
                            </span>
                            <span className="font-mono">
                              {(p.probability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(p.probability * 100, 1.5)}%` }}
                              transition={{ duration: 0.8, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                              className={`h-full rounded-full ${
                                i === 0
                                  ? "bg-gradient-to-r from-blue-400 to-blue-600"
                                  : "bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500"
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* advice */}
                    <div className="rounded-xl p-4 mb-5 bg-[var(--c-surface)] border border-[var(--hairline)]">
                      <p className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Stethoscope size={15} className="text-blue-500" />
                        {result.top.severity_advice}
                      </p>
                      <ul className="space-y-1.5">
                        {result.top.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-muted flex gap-2">
                            <span className="text-blue-500 font-bold">{i + 1})</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <BrainCircuit size={13} className="text-blue-500 shrink-0" />
                        <span className="truncate">
                          {result.model.architecture} · {result.model.input_size}px input
                        </span>
                      </span>
                      <span className="shrink-0">inference {result.inference_ms} ms</span>
                    </div>

                    <button
                      onClick={downloadReport}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5
                        rounded-xl border border-[var(--hairline)] text-xs font-semibold
                        hover:border-blue-500/60 hover:text-blue-500 transition-colors duration-200"
                    >
                      <FileDown size={14} /> Download report (.txt)
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* history */}
              {history.length > 0 && !analyzing && (
                <div className="mt-6 pt-5 border-t border-[var(--hairline)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                      Recent scans
                    </span>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-muted hover:text-rose-500 inline-flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="shrink-0 w-24 text-center group cursor-default"
                        title={`${h.name} — ${h.date}`}
                      >
                        <div className="relative w-20 h-20 mx-auto rounded-xl overflow-hidden border border-[var(--hairline)] group-hover:scale-105 transition-transform">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={h.thumb} alt={h.name} className="w-full h-full object-cover" />
                          <span
                            className="absolute bottom-0 left-0 right-0 text-[9px] text-white py-0.5"
                            style={{ backgroundColor: h.severity_color }}
                          >
                            {(h.probability * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-muted mt-1 truncate">{h.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        </div>

        {/* ---------------- bottom cards ---------------- */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {/* model transparency */}
          <FadeIn delay={0.05} className="h-full">
            <motion.div
              whileHover={{
                y: -8,
                transition: { duration: 0.3 },
              }}
              className="group relative glass-frost hover:!bg-white hover:!shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all duration-500 rounded-2xl p-6 h-full overflow-hidden cursor-default"
              style={{ transformPerspective: 800 }}
            >
              {/* --- Top Accent Line --- */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-400 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

              {/* --- Shimmer Overlay --- */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer pointer-events-none" />

              <h4 className="font-heading font-bold flex items-center gap-2 mb-3">
                <BrainCircuit size={16} className="text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                Model transparency
              </h4>
              {modelInfo ? (
                <dl className="text-sm space-y-2">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Architecture</dt>
                    <dd className="font-medium text-right">MobileNetV3-Large</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Dataset</dt>
                    <dd className="font-medium text-right">ISIC 2019</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Training images</dt>
                    <dd className="font-medium">
                      {(modelInfo.dataset.train_images + modelInfo.dataset.test_images).toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Lesion classes</dt>
                    <dd className="font-medium">{modelInfo.classes.length}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Test accuracy</dt>
                    <dd className="font-semibold text-blue-500">
                      {modelInfo.metrics.test_accuracy != null
                        ? `${(modelInfo.metrics.test_accuracy * 100).toFixed(1)}%`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Balanced accuracy</dt>
                    <dd className="font-semibold text-blue-500">
                      {modelInfo.metrics.test_balanced_accuracy != null
                        ? `${(modelInfo.metrics.test_balanced_accuracy * 100).toFixed(1)}%`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted">
                  Connecting to the inference service…
                </p>
              )}
            </motion.div>
          </FadeIn>

          {/* how it works */}
          <FadeIn delay={0.15} className="h-full">
            <motion.div
              whileHover={{
                y: -8,
                transition: { duration: 0.3 },
              }}
              className="group relative glass-frost hover:!bg-white hover:!shadow-[0_0_40px_rgba(96,165,250,0.5)] transition-all duration-500 rounded-2xl p-6 h-full overflow-hidden cursor-default"
              style={{ transformPerspective: 800 }}
            >
              {/* --- Top Accent Line --- */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-400 to-blue-200 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

              {/* --- Shimmer Overlay --- */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer pointer-events-none" />

              <h4 className="font-heading font-bold flex items-center gap-2 mb-3">
                <ScanLine size={16} className="text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                How it works
              </h4>
              <ol className="text-sm space-y-3">
                {[
                  "Your photo is resized to 128×128 and normalized — nothing is stored on our servers.",
                  "A MobileNetV3-Large network, fine-tuned on 20K+ dermatologist-labelled dermoscopy images, scores all 8 lesion classes.",
                  "You get the top-3 matches with confidence, severity guidance and care tips.",
                ].map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/15 text-blue-500 text-xs font-bold flex items-center justify-center mt-0.5 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                      {i + 1}
                    </span>
                    <span className="text-muted leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          </FadeIn>

          {/* ABCDE */}
          <FadeIn delay={0.25} className="h-full">
            <motion.div
              whileHover={{
                y: -8,
                transition: { duration: 0.3 },
              }}
              className="group relative glass-frost hover:!bg-white hover:!shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-all duration-500 rounded-2xl p-6 h-full overflow-hidden cursor-default"
              style={{ transformPerspective: 800 }}
            >
              {/* --- Top Accent Line --- */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-400 to-yellow-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

              {/* --- Shimmer Overlay --- */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer pointer-events-none" />

              <h4 className="font-heading font-bold flex items-center gap-2 mb-3">
                <ShieldAlert size={16} className="text-amber-500 group-hover:scale-110 transition-transform duration-300" />
                ABCDE self-check
              </h4>
              <ul className="text-sm space-y-2">
                {[
                  ["A", "Asymmetry — one half differs from the other."],
                  ["B", "Border — irregular, scalloped or blurred edges."],
                  ["C", "Color — multiple shades of brown, black, red or blue."],
                  ["D", "Diameter — larger than 6 mm (pencil eraser)."],
                  ["E", "Evolving — any change in size, shape or color."],
                ].map(([l, t]) => (
                  <li key={l} className="flex gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-md bg-blue-500 text-white text-xs font-bold flex items-center justify-center group-hover:bg-amber-500 transition-colors duration-300">
                      {l}
                    </span>
                    <span className="text-muted leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </FadeIn>
        </div>

        {/* ---------------- disclaimer ---------------- */}
        <FadeIn delay={0.3}>
          <div className="mt-8 rounded-2xl border border-[var(--hairline)] bg-[var(--c-surface)] px-6 py-4 flex gap-3 items-start">
            <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted leading-relaxed">
              <strong className="text-text">Not a medical diagnosis.</strong>{" "}
              Smart Dermatology is an educational screening aid built on public
              research data. It cannot replace examination by a qualified
              dermatologist — always confirm any concerning lesion with a
              medical professional.
            </p>
          </div>
        </FadeIn>
      </div>

      <AnimatePresence>
        {cameraOpen && (
          <CameraModal
            onCapture={acceptFile}
            onClose={() => setCameraOpen(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
