"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCounter } from "@/hooks/useCounter";
import LesionTracks from "./LesionTracks";

/* Fallbacks mirror backend/models/model_card.json until the API responds. */
const FALLBACK_ACCURACY = 75.6;
const FALLBACK_BALANCED = 74.5;

function useStats() {
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [balanced, setBalanced] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/ai/model-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const acc = d?.metrics?.test_accuracy;
        const bal = d?.metrics?.test_balanced_accuracy;
        if (typeof acc === "number") setAccuracy(acc * 100);
        if (typeof bal === "number") setBalanced(bal * 100);
      })
      .catch(() => {});
  }, []);
  return [
    { target: 8, suffix: "", label: "Clinical Lesion Classes" },
    { target: 20.3, suffix: "K+", label: "Dermoscopy Images Trained" },
    {
      target: accuracy ?? FALLBACK_ACCURACY,
      suffix: "%",
      label: "Test Accuracy (ISIC 2019)",
    },
    {
      target: balanced ?? FALLBACK_BALANCED,
      suffix: "%",
      label: "Balanced Accuracy",
    },
  ];
}

function StatBlock({ target, suffix, label, idx }: {
  target: number;
  suffix: string;
  label: string;
  idx: number;
}) {
  const { val, ref, restart } = useCounter(target, 2000, suffix);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: idx * 0.1 }}
      className="text-center group cursor-default"
      onMouseEnter={restart}
    >
      <span
        ref={ref}
        className="block text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading gradient-text transition-transform duration-300 group-hover:scale-110"
      >
        {val}
      </span>

      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: idx * 0.1 + 0.3 }}
        className="h-px w-12 mx-auto my-4 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 group-hover:w-24 group-hover:from-blue-500 group-hover:to-cyan-400"
      />
      <span className="text-muted text-sm font-medium transition-colors duration-300 group-hover:text-blue-500">{label}</span>
    </motion.div>
  );
}

export default function Stats() {
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);
  const stats = useStats();

  return (
    <section id="impact" className="section-pad relative overflow-hidden">
      <LesionTracks />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(6,214,160,0.06),transparent)] animate-pulse-glow pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 pointer-events-none">
        <div className="text-center mb-16 pointer-events-auto">
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
            Our Impact
          </motion.div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mt-4">
            Numbers That <span className="gradient-text">Matter</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 pointer-events-auto">
          {stats.map((s, i) => (
            <StatBlock key={s.label} {...s} idx={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
