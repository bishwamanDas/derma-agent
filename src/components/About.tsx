"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import FadeIn from "./FadeIn";
import NeuralNetwork from "./NeuralNetwork";

const AnimatedHighlight = ({ label, valNum, suffix }: { label: string, valNum: number, suffix: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const isInView = useInView(containerRef, { once: true, margin: "0px 0px -50px 0px" });

  const runAnimation = useCallback(() => {
    count.set(0);
    animate(count, valNum, { duration: 1.5, ease: "easeOut" });
  }, [count, valNum]);

  useEffect(() => {
    if (isInView) runAnimation();
  }, [isInView, runAnimation]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={runAnimation}
      className="about-highlight group relative h-24 rounded-2xl overflow-hidden cursor-default border-0 bg-black/[0.02] dark:bg-white/[0.04] backdrop-blur-sm transition-all duration-300"
    >
      {/* Always-visible content */}
      <div className="absolute inset-0 flex flex-col justify-center p-4 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-2">
        <div className="text-2xl font-bold font-heading text-slate-900 dark:!text-[#ffffff]">
          <motion.span>{rounded}</motion.span>{suffix}
        </div>
        <div className="text-xs text-slate-500 dark:!text-[#cbd5e1] mt-1 font-medium">
          {label}
        </div>
      </div>

      {/* Hover reveal — blue gradient sweep fading to transparent */}
      <div 
        className="absolute inset-0 z-10 flex flex-col justify-center p-4 rounded-l-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-transparent shadow-lg transition-all duration-300 ease-out pointer-events-none [clip-path:polygon(0_0,0_0,0_100%,0_100%)] group-hover:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%)]"
      >
        <div className="flex flex-col transform scale-100 group-hover:scale-110 transition-transform duration-300 origin-left drop-shadow-md">
          <div className="text-2xl font-bold font-heading text-white dark:!text-[#ffffff]">
            <motion.span>{rounded}</motion.span>{suffix}
          </div>
          <div className="text-xs text-white/90 dark:!text-[#f1f5f9] mt-1 font-medium">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);

  useEffect(() => {
    let ctx: ReturnType<typeof import("gsap")["gsap"]["context"]> | null = null;

    const init = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      if (!sectionRef.current) return;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
        });

        tl.fromTo(".about-anchor", { opacity: 0, scale: 0.5 }, { opacity: 0.8, scale: 1, duration: 1.2, ease: "power3.out" }, 0);
        tl.fromTo(".about-heading",
          { x: -60, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
        );

        gsap.fromTo(".about-word", 
          { color: "#64748b" },
          {
            color: "#3b82f6",
            stagger: 0.1,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top center",
              end: "bottom center",
              scrub: true,
            },
          }
        );

        tl.fromTo(".about-text",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: "power2.out" },
          "-=0.4"
        );

        tl.fromTo(".about-highlight",
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.4)" },
          "-=1.5"
        );
      }, sectionRef);
    };

    init();
    return () => { ctx?.revert(); };
  }, []);

  return (
    <section id="about" ref={sectionRef} className="section-pad relative overflow-hidden">
      <NeuralNetwork className="opacity-50" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(124,58,237,0.06),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

        <div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.96 }}
            onMouseEnter={() => {
              if (isBadgeHovered) return;
              setIsBadgeHovered(true);
              setTimeout(() => setIsBadgeHovered(false), 500);
            }}
            className={`about-text inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isBadgeHovered 
                ? "bg-white text-slate-900 shadow-[0_0_24px_rgba(59,130,246,0.5)]" 
                : "bg-black text-white shadow-md hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Our Mission
          </motion.div>
          <h2 className="about-heading font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-8">
            Early Detect<span className="text-blue-500">i</span>on,{" "}
            <span className="gradient-text">Befor<span className="text-blue-500">e</span> <span className="text-blue-500">i</span>t Spreads</span>
          </h2>

          <p className="about-text text-muted text-lg leading-relaxed mb-6">
            {"Skin cancer is the most common cancer worldwide, yet survival for melanoma caught early is above 99%. DermaAgent — Your Personal AI Lesion Screening Agent — puts trained clinical AI in every browser: photograph a lesion, and in under a second it is matched against eight clinical classes from the ISIC 2019 dermoscopy benchmark.".split(" ").map((word, i) => (
              <span key={`p1-${i}`} className="about-word inline-block mr-1">
                {word}
              </span>
            ))}
          </p>
          <p className="about-text text-muted leading-relaxed mb-8">
            {"Every prediction ships with a confidence score, a severity triage and practical next steps — and every number we quote is measured on the official ISIC test split, not on data the model trained on. This is a screening aid, not a diagnosis: anything suspicious should always be reviewed by a dermatologist.".split(" ").map((word, i) => (
              <span key={`p2-${i}`} className="about-word inline-block mr-1">
                {word}
              </span>
            ))}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Training Images", valNum: 20262, suffix: "" },
              { label: "Held-out Test Images", valNum: 5069, suffix: "" },
              { label: "Clinical Classes", valNum: 8, suffix: "" },
              { label: "Inference Time", valNum: 150, suffix: "ms" },
            ].map((item) => (
              <AnimatedHighlight 
                key={item.label} 
                label={item.label} 
                valNum={item.valNum} 
                suffix={item.suffix} 
              />
            ))}
          </div>
        </div>

        <FadeIn direction="right" delay={0.3} className="hidden lg:flex justify-center items-center relative">
          <div className="about-anchor relative w-[320px] h-[320px]">
            {/* skin-toned disc */}
            <div className="absolute inset-6 rounded-full bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 dark:from-amber-900/50 dark:via-orange-900/40 dark:to-amber-950/50 shadow-2xl" />

            {/* lesion */}
            <svg viewBox="0 0 100 100" className="absolute inset-6 opacity-90">
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
            </svg>

            {/* rotating scan ring (transform-only → GPU composited) */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/50 animate-[spin_18s_linear_infinite] will-change-transform" />
            <div className="absolute inset-14 rounded-full border border-blue-500/30" />

            {/* scan sweep */}
            <div className="absolute inset-6 overflow-hidden rounded-full">
              <div className="absolute left-0 right-0 h-14 bg-gradient-to-b from-transparent via-blue-500/25 to-transparent animate-scan" />
            </div>

            {/* ABCDE tick labels */}
            {["A", "B", "C", "D", "E"].map((l, i) => {
              const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
              const r = 175;
              return (
                <span
                  key={l}
                  className="absolute text-xs font-bold text-blue-500/70 font-heading"
                  style={{
                    left: `calc(50% + ${Math.cos(angle) * r}px - 6px)`,
                    top: `calc(50% + ${Math.sin(angle) * r}px - 8px)`,
                  }}
                >
                  {l}
                </span>
              );
            })}
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,214,160,0.08),transparent_60%)] animate-pulse-glow pointer-events-none" />
        </FadeIn>
      </div>
    </section>
  );
}
