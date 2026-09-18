"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const links = [
  { label: "About", id: "about" },
  { label: "Technology", id: "technology" },
  { label: "Services", id: "services" },
  { label: "Risk Check", id: "risk" },
  { label: "Analysis", id: "analysis" },
  { label: "Agent", id: "agent" },
  { label: "Impact", id: "impact" },
  { label: "Contact", id: "contact" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id.toLowerCase())?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled || menuOpen ? "p-3" : "p-0"}`}>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className={`pointer-events-auto w-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu border border-transparent will-change-[max-width,background-color,border-radius,padding] overflow-hidden ${
          scrolled || menuOpen
            ? `max-w-5xl bg-white/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] ${menuOpen ? "!rounded-2xl" : "!rounded-full"}`
            : "max-w-7xl bg-transparent rounded-none"
        }`}
      >
        <nav className={`mx-auto flex flex-nowrap items-center justify-between transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu ${scrolled || menuOpen ? "px-5 py-2" : "px-6 py-4"}`}>
          <a href="#" className={`font-heading font-black text-slate-900 tracking-tight whitespace-nowrap shrink-0 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled ? "text-2xl" : "text-4xl"}`}>
            Derma<span className="text-blue-500">Agent</span>
          </a>

          <ul className={`hidden lg:flex items-center flex-nowrap whitespace-nowrap transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled ? "gap-4" : "gap-7"}`}>
            {links.map((link) => (
              <li key={link.id} className="shrink-0">
                <button
                  onClick={() => scrollTo(link.id)}
                  className={`transform transition-all duration-300 font-medium hover:scale-[1.15] whitespace-nowrap ${
                    scrolled ? "text-xs" : "text-sm"
                  } ${
                    link.id === "analysis"
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <button
              onClick={() => scrollTo("analysis")}
              className={`rounded-full font-semibold whitespace-nowrap
                bg-black text-white hover:bg-slate-900 btn-bump
                transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled ? "px-4 py-1.5 text-xs" : "px-6 py-2.5 text-sm"}`}
            >
              <span>Analyze Skin</span>
            </button>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-slate-900 p-2"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-900/5 overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-4">
                {links.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    className="text-left text-slate-600 hover:text-slate-900 transition-colors py-2 font-medium"
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={() => scrollTo("contact")}
                  className="mt-2 px-5 py-2.5 rounded-full text-sm font-semibold text-center
                    bg-black text-white hover:bg-slate-900 btn-bump transition-colors"
                >
                  <span>Get Started</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </div>
  );
}
