"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FadeIn from "./FadeIn";
import { ArrowRight, RotateCcw, ShieldAlert } from "lucide-react";

type Question = {
  q: string;
  hint?: string;
  options: { label: string; points: number; note: string }[];
};

const QUESTIONS: Question[] = [
  {
    q: "How old are you?",
    hint: "Cumulative UV damage makes risk rise with age.",
    options: [
      { label: "Under 20", points: 0, note: "Age adds no extra risk" },
      { label: "20 – 39", points: 1, note: "Slightly raised by age" },
      { label: "40 – 59", points: 2, note: "Moderately raised by age" },
      { label: "60 or older", points: 3, note: "Higher age-related risk" },
    ],
  },
  {
    q: "How does your skin react to strong sun?",
    hint: "This is the Fitzpatrick phototype question dermatologists ask first.",
    options: [
      { label: "Always burns, never tans", points: 3, note: "Very fair phototype (I)" },
      { label: "Burns easily, tans minimally", points: 2, note: "Fair phototype (II)" },
      { label: "Burns sometimes, tans gradually", points: 1, note: "Medium phototype (III–IV)" },
      { label: "Rarely or never burns", points: 0, note: "Darker phototype (V–VI)" },
    ],
  },
  {
    q: "What are your hair and eye colours?",
    hint: "Light pigmentation tracks with lower natural UV protection.",
    options: [
      { label: "Red or blond hair, light eyes", points: 2, note: "Low melanin protection" },
      { label: "Light brown hair or eyes", points: 1, note: "Moderate melanin protection" },
      { label: "Dark brown or black hair, dark eyes", points: 0, note: "High melanin protection" },
    ],
  },
  {
    q: "How much sun exposure do you get?",
    hint: "Think about a typical year, holidays included.",
    options: [
      { label: "Work or play outdoors most days", points: 3, note: "High cumulative UV exposure" },
      { label: "Mixed indoor / outdoor lifestyle", points: 2, note: "Moderate UV exposure" },
      { label: "Mostly indoors, but intense holiday sun", points: 1, note: "Intermittent intense UV exposure" },
      { label: "Consistently low exposure", points: 0, note: "Low UV exposure" },
    ],
  },
  {
    q: "Have you had severe sunburns?",
    hint: "Blistering burns, especially in childhood, matter most.",
    options: [
      { label: "Three or more blistering burns", points: 3, note: "Multiple severe burns" },
      { label: "One or two blistering burns", points: 2, note: "History of severe burn" },
      { label: "Redness, but never blistered", points: 1, note: "Mild burn history" },
      { label: "Never had a real sunburn", points: 0, note: "No severe burn history" },
    ],
  },
  {
    q: "Have you used tanning beds or sunlamps?",
    hint: "Solarium UV is classed as carcinogenic to humans.",
    options: [
      { label: "Yes, regularly", points: 3, note: "Regular solarium use" },
      { label: "Yes, a handful of times", points: 2, note: "Occasional solarium use" },
      { label: "Never", points: 0, note: "No solarium exposure" },
    ],
  },
  {
    q: "Moles and family history?",
    hint: "Mole burden and genetics are independent risk factors.",
    options: [
      { label: "50+ moles, or skin cancer in the family", points: 3, note: "High mole burden / family history" },
      { label: "Some unusual or changing moles", points: 2, note: "Atypical moles present" },
      { label: "Few moles, no family history", points: 0, note: "Low mole-related risk" },
    ],
  },
];

const MAX_SCORE = QUESTIONS.reduce((m, q) => m + Math.max(...q.options.map((o) => o.points)), 0);

type Level = { name: string; color: string; ring: string; advice: string };

function levelFor(score: number): Level {
  const pct = score / MAX_SCORE;
  if (pct < 0.25)
    return {
      name: "Low",
      color: "text-emerald-500",
      ring: "bg-emerald-500",
      advice:
        "Your answers suggest below-average risk. Keep it that way with SPF 30+ on exposed skin, shade at midday, and a yearly self-check using the ABCDE rule.",
    };
  if (pct < 0.5)
    return {
      name: "Moderate",
      color: "text-amber-500",
      ring: "bg-amber-500",
      advice:
        "You have a few meaningful risk factors. Daily sunscreen, covering up in strong sun and a monthly mole check are the highest-value habits you can add.",
    };
  if (pct < 0.75)
    return {
      name: "Elevated",
      color: "text-orange-500",
      ring: "bg-orange-500",
      advice:
        "Several of your answers raise risk above average. Take sun protection seriously, and consider booking a full-skin check with a dermatologist once a year.",
    };
  return {
    name: "High",
    color: "text-rose-500",
    ring: "bg-rose-500",
    advice:
      "Your profile carries several strong risk factors. A professional full-skin examination is strongly recommended — and use the scan below for any lesion that looks new or changing.",
  };
}

export default function RiskCheck() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ctx: ReturnType<typeof import("gsap")["gsap"]["context"]> | null = null;
    
    const init = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      if (!sectionRef.current) return;

      ctx = gsap.context(() => {
        gsap.fromTo(".risk-char", 
          { color: "#64748b" },
          {
            color: "#3b82f6",
            stagger: 0.04,
            scrollTrigger: {
              trigger: ".risk-text-container",
              start: "top 70%",
              end: "bottom 20%",
              scrub: 1,
            },
          }
        );
      });
    };
    init();
    return () => ctx?.revert();
  }, []);

  const score = QUESTIONS.reduce(
    (sum, q, i) => sum + (answers[i] !== undefined ? q.options[answers[i]].points : 0),
    0
  );
  const level = levelFor(score);
  const progress = (step / QUESTIONS.length) * 100;

  const pick = (optionIdx: number) => {
    const next = [...answers];
    next[step] = optionIdx;
    setAnswers(next);
    if (step + 1 >= QUESTIONS.length) {
      setDone(true);
    } else {
      setStep(step + 1);
    }
  };

  const restart = () => {
    setStep(0);
    setAnswers([]);
    setDone(false);
  };

  return (
    <section id="risk" ref={sectionRef} className="section-pad relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_20%,rgba(168,85,247,0.05),transparent)] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <FadeIn className="text-center mb-12">
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
            Know Your Risk
          </motion.div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mt-4 mb-4">
            Your Personal <span className="gradient-text">Risk Prof<span className="text-blue-500">i</span>le</span>
          </h2>
          <p className="risk-text-container text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            {"Seven questions dermatologists ask first — phototype, UV history, mole burden and family history. Answered locally in your browser; nothing is uploaded."
              .split(" ")
              .map((word, i) => (
                <span key={i} className="inline-block mr-1 whitespace-nowrap">
                  {word.split("").map((char, j) => (
                    <span key={j} className="risk-char">
                      {char}
                    </span>
                  ))}
                </span>
              ))}
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="glass-frost rounded-2xl p-8 sm:p-10 min-h-[420px] relative">
            <div className="h-1 w-full rounded-full bg-slate-900/10 dark:bg-white/10 mb-8 overflow-hidden">
              <motion.div
                className={`h-full ${done ? level.ring : "bg-blue-500"}`}
                initial={{ width: 0 }}
                animate={{ width: `${done ? 100 : progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            <AnimatePresence mode="wait">
              {!done ? (
                <motion.div
                  key={`q-${step}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-2">
                    Question {step + 1} of {QUESTIONS.length}
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-2">{QUESTIONS[step].q}</h3>
                  {QUESTIONS[step].hint && (
                    <p className="text-muted text-sm mb-8">{QUESTIONS[step].hint}</p>
                  )}
                  <div className="grid gap-3">
                    {QUESTIONS[step].options.map((opt, i) => (
                      <button
                        key={opt.label}
                        onClick={() => pick(i)}
                        className="text-left px-5 py-4 rounded-xl border border-slate-900/10 dark:border-white/10
                          bg-white/50 dark:bg-white/5 hover:border-blue-500/60 hover:bg-blue-500/5
                          transition-all duration-200 group"
                      >
                        <span className="font-medium group-hover:text-blue-500 transition-colors">
                          {opt.label}
                        </span>
                        <span className="block text-xs text-muted mt-0.5">
                          adds {opt.points} pt{opt.points === 1 ? "" : "s"} — {opt.note}
                        </span>
                      </button>
                    ))}
                  </div>
                  {step > 0 && (
                    <button
                      onClick={() => setStep(step - 1)}
                      className="mt-6 text-sm text-muted hover:text-blue-500 transition-colors"
                    >
                      ← Previous question
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center"
                >
                  <div className={`font-heading font-extrabold text-6xl ${level.color}`}>
                    {score}
                    <span className="text-2xl text-muted font-semibold"> / {MAX_SCORE}</span>
                  </div>
                  <div className={`text-sm font-bold uppercase tracking-[0.3em] ${level.color} mt-2 mb-6`}>
                    {level.name} risk
                  </div>

                  <div className="h-2 w-2/3 max-w-sm mx-auto rounded-full bg-slate-900/10 dark:bg-white/10 mb-8 overflow-hidden">
                    <motion.div
                      className={`h-full ${level.ring}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(score / MAX_SCORE) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>

                  <p className="text-muted max-w-xl mx-auto mb-8 leading-relaxed">
                    {level.advice}
                  </p>

                  <div className="flex flex-wrap justify-center gap-3">
                    <a
                      href="#analysis"
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-sm
                        bg-black text-white hover:bg-slate-900 shadow-xl btn-bump transition-all duration-300"
                    >
                      Scan a lesion <ArrowRight size={16} />
                    </a>
                    <button
                      onClick={restart}
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-sm
                        border border-slate-900/20 dark:border-white/20 hover:border-blue-500/60 transition-all duration-300"
                    >
                      <RotateCcw size={16} /> Retake
                    </button>
                  </div>

                  <p className="text-xs text-muted mt-8 flex items-center justify-center gap-1.5">
                    <ShieldAlert size={13} />
                    Illustrative self-check based on published risk factors — not a clinical
                    assessment or medical advice.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
