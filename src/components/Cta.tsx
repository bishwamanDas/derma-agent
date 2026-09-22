"use client";

import FadeIn from "./FadeIn";
import GlassOrb from "./GlassOrb";

export default function Cta() {
  return (
    <section id="contact" className="relative py-32 overflow-hidden">

      <div className="absolute inset-0 cta-gradient animate-gradient opacity-80" />

      <div className="absolute inset-0 cta-overlay" />

      <GlassOrb size={250} color="rgba(255,255,255,0.06)" blur={40} x={-80} y={-40} delay={0} />
      <GlassOrb size={180} color="rgba(255,255,255,0.04)" blur={30} x={800} y={200} delay={0.5} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <FadeIn>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            That Spot You Keep
            <br />
            <span className="gradient-text">Not<span className="text-blue-500">i</span>c<span className="text-blue-500">i</span>ng?</span>
          </h2>
        </FadeIn>

        <FadeIn delay={0.15}>
          <p className="text-muted text-lg mb-10 max-w-xl mx-auto">
            Photograph it, get a ranked match across eight lesion classes, and see whether it
            is worth booking a dermatologist. It takes about a minute, and nothing is uploaded
            to a server.
          </p>
        </FadeIn>

        <FadeIn delay={0.3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#analysis" className="px-8 py-4 rounded-full font-semibold text-lg
            bg-black text-white hover:bg-slate-900 shadow-xl hover:shadow-2xl btn-bump
            transition-all duration-300">
            <span>Scan a Lesion</span>
          </a>
          <a href="#risk" className="px-8 py-4 rounded-full font-semibold text-lg
            bg-white text-slate-900 border border-slate-200 hover:border-slate-800 btn-bump transition-all duration-300">
            <span>Take the Risk Check</span>
          </a>
        </FadeIn>
      </div>
    </section>
  );
}
