"use client";

import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import FloatingCells from "./FloatingCells";

export default function Quote() {
  return (
    <section className="section-pad relative overflow-hidden">

      <FloatingCells className="opacity-80" />

      <div className="absolute inset-0 opacity-[0.02] z-0"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <FadeIn>
          <div className="bg-white border border-slate-200 rounded-2xl p-10 sm:p-16 text-center relative shadow-2xl">

            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 0.1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="absolute top-6 left-8 text-8xl font-serif text-slate-100 pointer-events-none select-none"
            >
              &ldquo;
            </motion.span>

            <blockquote className="text-xl sm:text-2xl lg:text-3xl font-heading font-medium leading-relaxed mb-8 relative z-10 text-slate-900">
              <motion.span
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ staggerChildren: 0.08, delayChildren: 0.3 }}
              >
                {[
                  <>Most melanomas are found by pat<span className="text-blue-500">i</span>ents themselves — </>,
                  <>a spot that changed, <span className="text-blue-500">i</span>tched, or bled. </>,
                  <>G<span className="text-blue-500">i</span>v<span className="text-blue-500">i</span>ng people a cred<span className="text-blue-500">i</span>ble f<span className="text-blue-500">i</span>rst screen, </>,
                  <>w<span className="text-blue-500">i</span>th the r<span className="text-blue-500">i</span>ght nudges to see a cl<span className="text-blue-500">i</span>n<span className="text-blue-500">i</span>c<span className="text-blue-500">i</span>an, </>,
                  <>is what early detect<span className="text-blue-500">i</span>on actually looks l<span className="text-blue-500">i</span>ke.</>,
                ].map((line, i) => (
                  <motion.span
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    className="inline"
                  >
                    {line}
                  </motion.span>
                ))}
              </motion.span>
            </blockquote>

            <div className="flex flex-col items-center justify-center gap-1 relative z-10 mt-6">
              <div className="font-semibold text-sm text-slate-900">On early detection</div>
              <div className="text-slate-500 text-xs">Illustrative quote · consultant dermatologist perspective</div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
