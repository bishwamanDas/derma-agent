"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import GlassOrb from "./GlassOrb";
import { ScanLesionSVG, GradientSVG } from "./Icons";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCounter } from "@/hooks/useCounter";

gsap.registerPlugin(ScrollTrigger);

/* Real metrics from backend/models/model_card.json (ISIC 2019 test split). */
const PER_CLASS_RECALL = [65, 79, 69, 75, 72, 78, 63, 94]; // AK BCC BKL DF MEL NV SCC VASC

function AccuracyContent() {
  const { val: accuracyVal, ref: accuracyRef } = useCounter(75.6, 2000, "%");
  return (
    <>
      <div className="text-xs text-white group-hover:text-slate-900 transition-colors mb-1">Test Accuracy</div>
      <div ref={accuracyRef} className="text-2xl font-bold font-heading text-blue-500">{accuracyVal}</div>
      <div className="text-xs text-white group-hover:text-slate-900 transition-colors mt-1">
        <motion.span 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block text-blue-500"
        >
          ↑
        </motion.span> ISIC 2019 benchmark
      </div>
    </>
  );
}

function ClassesContent() {
  const { val: classesVal, ref: classesRef } = useCounter(8, 2000);
  return (
    <>
      <div className="text-xs text-white group-hover:text-slate-900 transition-colors mb-1">Lesion Classes</div>
      <div ref={classesRef} className="text-xl font-bold font-heading text-blue-500">{classesVal}</div>
      <div className="flex gap-1 mt-2 items-end h-[27px]" aria-hidden>
        {PER_CLASS_RECALL.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: h * 0.3 }}
            transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="w-2 rounded-full bg-gradient-to-t from-blue-500/30 to-blue-500"
          />
        ))}
      </div>
    </>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hoveredCard, setHoveredCard] = useState<"A" | "B" | null>(null);
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);

  useEffect(() => {

    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {

      gsap.fromTo(".hero-char", 
        { color: "#64748b" },
        {
          color: "#3b82f6", // Tailwind blue-500
          stagger: 0.04,
          scrollTrigger: {
            trigger: ".hero-text-container",
            start: "top 75%",
            end: "bottom 30%",
            scrub: 1,
          },
        }
      );

      gsap.to(".hero-anchor", {
        y: "+=40",
        duration: 3.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      });

      let iteration = 0;
      function flyScan(isFirstRun = true) {
        const baseSpeed = 20 + (iteration * 15); 

        const startX = isFirstRun ? 0 : 500; 
        const endX = window.innerWidth + 500;
        
        const distanceRatio = (endX - startX) / window.innerWidth;
        const duration = baseSpeed * distanceRatio;

        gsap.fromTo(".hero-anchor",
          { x: startX },
          { 
            x: endX, 
            duration: duration, 
            ease: "linear",
            onComplete: () => {
              if (!isFirstRun) iteration++;
              flyScan(false);
            }
          }
        );

        gsap.fromTo(".hero-svg-wrapper",
          { rotate: 0 },
          { rotate: 360, duration: duration, ease: "linear" }
        );
      }

      setTimeout(() => flyScan(true), 100);
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-screen flex items-center overflow-hidden dot-grid">
      {/* --- Background Orbs --- */}
      <GlassOrb size={400} color="rgba(6, 214, 160, 0.12)" blur={80} x={-100} y={-50} delay={0.3} interactive />
      <GlassOrb size={300} color="rgba(124, 58, 237, 0.12)" blur={70} x={700} y={100} delay={0.5} interactive />
      <GlassOrb size={200} color="rgba(0, 240, 255, 0.08)" blur={50} x={500} y={400} delay={0.7} interactive />
      <GlassOrb size={150} color="rgba(168, 85, 247, 0.1)" blur={40} x={100} y={500} delay={0.9} />

      {/* --- Endless scanner animation --- */}
      <div className="hero-anchor absolute -top-32 -left-[500px] w-[500px] h-[500px] z-10 pointer-events-none">

        <div className="hero-svg-wrapper absolute top-0 left-0 w-full h-full">
          <GradientSVG SvgComponent={ScanLesionSVG} />
        </div>

        <div className="hero-svg-wrapper absolute top-0 w-full h-full" style={{ left: "-100vw" }}>
          <GradientSVG SvgComponent={ScanLesionSVG} />
        </div>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(6,214,160,0.08),transparent)] pointer-events-none" />

      {/* --- Hero Content --- */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 pt-32 pb-20 grid lg:grid-cols-2 gap-12 items-center">

        <div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 inline-block"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.96 }}
              onMouseEnter={() => {
                if (isBadgeHovered) return;
                setIsBadgeHovered(true);
                setTimeout(() => setIsBadgeHovered(false), 500);
              }}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isBadgeHovered 
                  ? "bg-white text-slate-900 shadow-[0_0_24px_rgba(59,130,246,0.5)]" 
                  : "bg-black text-white shadow-md hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              DermaAgent · Your Personal AI Lesion Screening Agent
            </motion.div>
          </motion.div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] mb-6">
            <>Underst<span className="text-blue-500">a</span>nd<span className="text-blue-500">i</span>ng</>
            <br />
            <>Every Les<span className="text-blue-500">i</span>on,</>
            <br />
            <span className="gradient-text">Every Sk<span className="text-blue-500">i</span>n</span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="hero-text-container text-muted text-lg max-w-lg mb-10 leading-relaxed"
          >
            {"Your Personal AI Lesion Screening Agent — one photo is all it takes. Multi-agent clinical AI screens skin lesions across eight ISIC 2019 classes, computes ABCDE morphometrics, assesses personal risk, and provides interactive triage guidance."
              .split(" ")
              .map((word, i) => (
                <span key={i} className="inline-block mr-1 whitespace-nowrap">
                  {word.split("").map((char, j) => (
                    <span key={j} className="hero-char">
                      {char}
                    </span>
                  ))}
                </span>
              ))}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 sm:gap-3"
          >
            <div className="flex items-center gap-0 group cursor-pointer shrink-0">
              <a
                href="#analysis"
                className="px-5 sm:px-6 h-[46px] rounded-full font-semibold text-xs sm:text-sm
                  bg-black text-white hover:bg-slate-900 shadow-xl group-btn-bump-left
                  transition-all duration-300 flex items-center whitespace-nowrap"
              >
                <span>Try Skin Analysis</span>
              </a>
              <a
                href="#analysis"
                className="w-[46px] h-[46px] flex items-center justify-center rounded-full
                  bg-black text-white hover:bg-slate-900 shadow-xl group-btn-bump-right
                  transition-all duration-300 shrink-0"
              >
                <span><ArrowRight size={17} /></span>
              </a>
            </div>

            <a
              href="#risk"
              className="px-5 sm:px-6 h-[46px] rounded-full font-semibold text-xs sm:text-sm flex items-center whitespace-nowrap shrink-0
                border border-black text-slate-900 hover:bg-slate-50 btn-bump transition-all duration-300"
            >
              <span>Check Your Risk</span>
            </a>

            <div className="flex items-center gap-0 group cursor-pointer shrink-0">
              <a
                href="#agent"
                className="w-[46px] h-[46px] flex items-center justify-center rounded-full
                  bg-black text-white hover:bg-slate-900 shadow-xl group-btn-bump-left
                  transition-all duration-300 shrink-0"
              >
                <span><ArrowRight size={17} /></span>
              </a>
              <a
                href="#agent"
                className="px-5 sm:px-6 h-[46px] rounded-full font-semibold text-xs sm:text-sm
                  bg-black text-white hover:bg-slate-900 shadow-xl group-btn-bump-right
                  transition-all duration-300 flex items-center whitespace-nowrap"
              >
                <span>Chat with DermaAgent</span>
              </a>
            </div>
          </motion.div>
        </div>

        {/* --- Lesion Scanner Visual --- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="hidden lg:flex items-center justify-center relative"
        >
          <div className="relative w-[340px] h-[340px]">
            {/* skin-toned disc */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 dark:from-amber-900/50 dark:via-orange-900/40 dark:to-amber-950/50 shadow-2xl" />

            {/* lesion */}
            <svg viewBox="0 0 100 100" className="absolute inset-8 opacity-90">
              <path
                d="M50 28 C63 27, 74 37, 73 50 C72 63, 61 73, 49 72 C36 71, 27 61, 28 49 C29 37, 38 29, 50 28 Z"
                fill="#8a5a3b"
                opacity="0.85"
              />
              <path
                d="M48 38 C57 37, 63 44, 62 52 C61 60, 54 64, 47 63 C40 62, 36 56, 37 49 C38 42, 42 39, 48 38 Z"
                fill="#5d3a24"
                opacity="0.9"
              />
              <circle cx="53" cy="47" r="2.4" fill="#3d2415" opacity="0.8" />
            </svg>

            {/* rotating scan ring (transform-only → GPU composited) */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/50 animate-[spin_16s_linear_infinite] will-change-transform" />
            <div className="absolute inset-10 rounded-full border border-blue-500/30" />

            {/* scan sweep */}
            <div className="absolute inset-8 overflow-hidden rounded-full">
              <div className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-blue-500/25 to-transparent animate-scan" />
            </div>

            {/* crosshair ticks */}
            <div className="absolute top-1/2 -left-1 w-6 h-px bg-blue-500/60" />
            <div className="absolute top-1/2 -right-1 w-6 h-px bg-blue-500/60" />
            <div className="absolute left-1/2 -top-1 h-6 w-px bg-blue-500/60" />
            <div className="absolute left-1/2 -bottom-1 h-6 w-px bg-blue-500/60" />
          </div>

          {/* --- Floating Glass Panels --- */}
          <div 
            className="absolute top-10 right-10 w-48 h-[115px] flex flex-col justify-center bg-black/90 backdrop-blur-md rounded-2xl p-4 animate-float-slow shadow-xl cursor-pointer group hover:bg-white hover:scale-110 hover:shadow-[0_0_24px_rgba(59,130,246,0.5)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            onMouseEnter={() => setHoveredCard("A")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {hoveredCard === "A" ? <ClassesContent key="A-cls" /> : <AccuracyContent key="A-acc" />}
          </div>

          <div 
            className="absolute bottom-20 left-0 w-48 h-[115px] flex flex-col justify-center bg-black/90 backdrop-blur-md rounded-2xl p-4 animate-float shadow-xl cursor-pointer group hover:bg-white hover:scale-110 hover:shadow-[0_0_24px_rgba(59,130,246,0.5)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" 
            style={{ animationDelay: "1s" }}
            onMouseEnter={() => setHoveredCard("B")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {hoveredCard === "B" ? <AccuracyContent key="B-acc" /> : <ClassesContent key="B-cls" />}
          </div>
        </motion.div>
      </div>


    </section>
  );
}
