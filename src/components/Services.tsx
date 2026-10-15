"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FadeIn from "./FadeIn";
import NeuralNetwork from "./NeuralNetwork";
import {
  Microscope,
  Ruler,
  Lock,
  ClipboardList,
  ScanFace,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const services = [
  {
    icon: ScanFace,
    title: "AI Lesion Screening",
    desc: "Classify a skin lesion across eight clinical classes from a single photograph.",
    iconColor: "text-cyan-500",
    glowColor: "rgba(6,182,212,0.5)",
    details: {
      longDesc:
        "Upload a photo or use your camera. A MobileNetV3-Large network fine-tuned on the ISIC 2019 dermoscopy benchmark returns the three most likely matches with confidence scores, so you can see the runner-up candidates rather than a single guess.",
      features: [
        "Eight-class lesion classification",
        "Top-three predictions with confidence",
        "Drag-and-drop upload or live camera capture",
        "Results in under a second on CPU",
      ],
      stat: "75.6%",
      statLabel: "Test accuracy (ISIC 2019)",
    },
  },
  {
    icon: ShieldAlert,
    title: "Severity Triage",
    desc: "Every prediction carries a concern level and the care steps that follow.",
    iconColor: "text-rose-500",
    glowColor: "rgba(244,63,94,0.5)",
    details: {
      longDesc:
        "A confidence score on its own is not actionable. Each result maps to a low, moderate or high concern level drawn from the clinical character of the predicted condition, paired with practical guidance on when to book a dermatologist and what to watch for in the meantime.",
      features: [
        "Low, moderate and high concern levels",
        "Per-condition care guidance",
        "Explicit red-flag symptoms to watch",
        "Clear not-a-diagnosis framing",
      ],
      stat: "3",
      statLabel: "Triage levels",
    },
  },
  {
    icon: ClipboardList,
    title: "Risk Assessment",
    desc: "A structured questionnaire that scores your personal skin-cancer risk factors.",
    iconColor: "text-purple-500",
    glowColor: "rgba(168,85,247,0.5)",
    details: {
      longDesc:
        "Phototype, sun exposure, tanning history, mole count and family history are the factors dermatologists weigh first. The risk assessment walks through them one at a time and returns a score with the reasoning behind it, so the result explains itself instead of appearing out of nowhere.",
      features: [
        "Seven established risk factors",
        "Scored breakdown of each answer",
        "Tailored prevention advice",
        "Saved locally, never uploaded",
      ],
      stat: "7",
      statLabel: "Risk factors assessed",
    },
  },
  {
    icon: Ruler,
    title: "ABCDE Self-Check",
    desc: "The dermatologist's visual rule for spotting suspicious moles, built in.",
    iconColor: "text-amber-500",
    glowColor: "rgba(245,158,11,0.5)",
    details: {
      longDesc:
        "Asymmetry, Border, Colour, Diameter and Evolving describe what makes a lesion worth examining. The self-check reference sits alongside the analysis panel so you can compare a prediction against the signs clinicians actually look for.",
      features: [
        "All five ABCDE criteria explained",
        "Shown next to every scan result",
        "Guidance on monitoring change over time",
        "Written for non-clinical readers",
      ],
      stat: "5",
      statLabel: "ABCDE criteria",
    },
  },
  {
    icon: Lock,
    title: "On-Device Privacy",
    desc: "Your photos are analysed and discarded — nothing is stored on a server.",
    iconColor: "text-emerald-500",
    glowColor: "rgba(16,185,129,0.5)",
    details: {
      longDesc:
        "Skin photos are sensitive medical data. The image is sent to the inference service, scored in memory and dropped on the spot, with no database behind it. Scan history lives in your browser's local storage and can be cleared at any time.",
      features: [
        "No server-side image storage",
        "No account or sign-up required",
        "History kept in local storage only",
        "One-click history clearing",
      ],
      stat: "0",
      statLabel: "Images retained",
    },
  },
  {
    icon: Microscope,
    title: "Open Method",
    desc: "Training code, model card and measured metrics are all inspectable.",
    iconColor: "text-blue-500",
    glowColor: "rgba(59,130,246,0.5)",
    details: {
      longDesc:
        "The full pipeline is in the repository: dataset conversion, feature extraction, two-phase fine-tuning and TorchScript export. The model card records accuracy, balanced accuracy and per-class recall on the official ISIC 2019 test split, and the site reads those numbers live from the API.",
      features: [
        "Reproducible training pipeline",
        "Per-class recall published",
        "Balanced accuracy reported alongside raw",
        "Live metrics served from the model card",
      ],
      stat: "5,069",
      statLabel: "Held-out test images",
    },
  },
];

function ExpandedContent({ svc, isPreview = false }: { svc: typeof services[0]; isPreview?: boolean }) {
  return (
    <div className={`flex flex-col h-full w-full ${isPreview ? 'opacity-90' : 'opacity-100'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5 mb-6">
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl bg-gradient-to-br from-white to-gray-50 flex items-center justify-center shadow-sm`}
        >
          <svc.icon size={36} className={svc.iconColor} />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-xl sm:text-2xl font-bold mb-1">
            {svc.title}
          </h3>
          <p className="text-muted text-sm">{svc.desc}</p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <div className={`text-2xl sm:text-3xl font-bold ${svc.iconColor}`}>
            {svc.details.stat}
          </div>
          <div className="text-muted text-xs mt-1">
            {svc.details.statLabel}
          </div>
        </div>
      </div>

      <p className="text-slate-600 text-sm leading-relaxed mb-6">
        {svc.details.longDesc}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {svc.details.features.map((feat, fi) => (
          <motion.div
            key={feat}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + fi * 0.05 }}
            className="flex items-center gap-2 text-sm"
          >
            <CheckCircle2 size={16} className={svc.iconColor} />
            <span className="text-slate-700">{feat}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-2 text-sm font-medium group/link cursor-pointer w-max">
        <span className={svc.iconColor}>Learn more</span>
        <ArrowRight
          size={14}
          className={`${svc.iconColor} transition-transform duration-300 group-hover/link:translate-x-1`}
        />
      </div>
    </div>
  );
}

export default function Services() {
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (lockedIdx !== null && sectionRef.current && !sectionRef.current.contains(e.target as Node)) {
        setLockedIdx(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [lockedIdx]);

  useEffect(() => {
    let ctx: ReturnType<typeof import("gsap")["gsap"]["context"]> | null = null;

    const init = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      if (!sectionRef.current) return;

      ctx = gsap.context(() => {
        gsap.fromTo(".svc-char", 
          { color: "#64748b" },
          {
            color: "#3b82f6",
            stagger: 0.1,
            scrollTrigger: {
              trigger: ".svc-text-container",
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

  return (
    <section id="services" ref={sectionRef} className="section-pad relative overflow-hidden">
      <NeuralNetwork />
      <div className="max-w-7xl mx-auto relative z-10">
        <FadeIn className="text-center mb-16">
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
            Capabilities
          </motion.div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mt-4 mb-6">
            What We <span className="gradient-text">Do Best</span>
          </h2>
          <p className="svc-text-container text-muted max-w-2xl mx-auto text-lg leading-relaxed">
            {"Everything between noticing a spot and knowing what to do about it."
              .split(" ")
              .map((word, i) => (
                <span key={i} className="inline-block mr-1 whitespace-nowrap">
                  {word.split("").map((char, j) => (
                    <span key={j} className="svc-char">
                      {char}
                    </span>
                  ))}
                </span>
              ))}
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {services.map((svc, i) => {
            const isLocked = lockedIdx === i;
            const isHovered = hoveredIdx === i;

            const getOverlayPositionClasses = (index: number) => {
              switch (index) {
                case 0:
                  return "top-0 left-0";
                case 1:
                  return "top-0 left-0 md:left-auto md:right-0 lg:right-auto lg:left-1/2 lg:-translate-x-1/2";
                case 2:
                  return "top-0 left-0 lg:left-auto lg:right-0";
                case 3:
                  return "bottom-0 left-0 md:left-auto md:right-0 lg:right-auto lg:left-0";
                case 4:
                  return "bottom-0 left-0 lg:left-1/2 lg:-translate-x-1/2";
                case 5:
                  return "bottom-0 left-0 md:left-auto md:right-0 lg:right-0";
                default:
                  return "top-0 left-0";
              }
            };

            return (
              <div
                key={svc.title}
                className={`relative transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
                  ${isLocked ? "md:col-span-2 md:row-span-2" : ""}
                `}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <motion.div
                  layout
                  onClick={() => setLockedIdx(isLocked ? null : i)}
                  className={`group relative w-full h-full rounded-lg overflow-hidden cursor-pointer
                    transition-all duration-500 glass-frost
                    ${isLocked ? "!bg-white" : "hover:bg-white/40"}
                  `}
                  style={{
                    boxShadow: isLocked
                      ? `0 0 50px ${svc.glowColor}`
                      : "0 8px 32px rgba(0,0,0,0.12)",
                  }}
                >
                  <AnimatePresence mode="wait">
                    {!isLocked ? (
                      <motion.div
                        key="compact"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.3 }}
                        className="p-8 h-full flex flex-col"
                      >
                        <div className="mb-5">
                          <svc.icon
                            size={32}
                            className={`${svc.iconColor} transition-transform duration-300 group-hover:scale-110`}
                          />
                        </div>
                        <h3 className="font-heading text-lg font-bold mb-2">
                          {svc.title}
                        </h3>
                        <p className="text-muted text-sm leading-relaxed">
                          {svc.desc}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.4 }}
                        className="p-10 h-full w-full flex"
                      >
                        <ExpandedContent svc={svc} isPreview={false} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <AnimatePresence>
                  {isHovered && !isLocked && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className={`absolute z-50 pointer-events-none rounded-lg p-10 glass-frost bg-white/80 shadow-2xl overflow-hidden
                        w-[calc(100vw-3rem)] md:w-[600px] min-h-[350px]
                        ${getOverlayPositionClasses(i)}
                      `}
                      style={{
                        boxShadow: `0 20px 60px ${svc.glowColor}`,
                      }}
                    >
                      <ExpandedContent svc={svc} isPreview={true} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
