"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import NeuralNetwork from "./NeuralNetwork";
import { Brain, Scale, Zap } from "lucide-react";

const cards = [
  {
    icon: Brain,
    title: "Transfer Learning",
    desc: "A MobileNetV3-Large vision network pretrained on ImageNet, then fine-tuned on 20,262 dermoscopy images from the ISIC 2019 benchmark to recognize eight lesion classes.",
    accent: "from-blue-400 to-blue-500",
    hoverShadow: "hover:!shadow-[0_0_40px_rgba(59,130,246,0.5)]", // blue-500
  },
  {
    icon: Scale,
    title: "Balanced Training",
    desc: "Dermoscopy datasets are heavily skewed toward common moles. Class-balanced sampling, label smoothing and frozen batch statistics keep rare classes like SCC and VASC from being drowned out.",
    accent: "from-blue-400 to-blue-200",
    hoverShadow: "hover:!shadow-[0_0_40px_rgba(96,165,250,0.5)]", // blue-400
  },
  {
    icon: Zap,
    title: "Real-time Inference",
    desc: "The model is exported to TorchScript and served by a FastAPI backend — top-three predictions with confidence scores in well under a second, even on CPU, with no image ever stored server-side.",
    accent: "from-amber-400 to-yellow-400",
    hoverShadow: "hover:!shadow-[0_0_40px_rgba(245,158,11,0.4)]", // amber-500
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 60, rotateX: -10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.7,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  }),
};

export default function Tech() {
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
        gsap.fromTo(".tech-char", 
          { color: "#64748b" },
          {
            color: "#3b82f6", // Tailwind blue-500
            stagger: 0.1,
            scrollTrigger: {
              trigger: ".tech-text-container",
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
    <section id="technology" ref={sectionRef} className="section-pad relative overflow-hidden">
      {/* --- Neural Background --- */}
      <NeuralNetwork />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* --- Section Header --- */}
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
            Our Technology
          </motion.div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mt-4 mb-6">
            Bu<span className="text-blue-500">i</span>lt on <span className="gradient-text">Benchmarked Sc<span className="text-blue-500">i</span>ence</span>
          </h2>
          <p className="tech-text-container text-lg max-w-2xl mx-auto leading-relaxed text-muted">
            {"Three techniques carry a photograph from your camera to a ranked clinical match.".split(" ").map((word, i) => (
              <span key={i} className="inline-block mr-1 whitespace-nowrap">
                {word.split("").map((char, j) => (
                  <span key={j} className="tech-char">
                    {char}
                  </span>
                ))}
              </span>
            ))}
          </p>

          {/* --- Animated Divider --- */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            className="h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent max-w-xs mx-auto"
          />
        </FadeIn>

        {/* --- Tech Cards Grid --- */}
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={cardVariants}
              whileHover={{
                y: -8,
                transition: { duration: 0.3 },
              }}
              className={`group relative glass-frost hover:!bg-white ${card.hoverShadow} transition-colors transition-shadow duration-500 rounded-lg p-8 overflow-hidden cursor-default`}
              style={{ transformPerspective: 800 }}
            >
              {/* --- Top Accent Line --- */}
              <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${card.accent} 
                scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />

              {/* --- Shimmer Overlay --- */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700
                bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer pointer-events-none" />

              {/* --- Card Icon --- */}
              <div className={`w-12 h-12 rounded-md bg-gradient-to-br ${card.accent} 
                flex items-center justify-center mb-6 
                group-hover:shadow-lg group-hover:shadow-blue-400/20 transition-shadow duration-300`}>
                <card.icon size={22} className="text-white" />
              </div>

              <h3 className="font-heading text-xl font-bold mb-3">{card.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
