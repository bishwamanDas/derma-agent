"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  size?: number;
  color?: string;
  blur?: number;
  x?: number;
  y?: number;
  delay?: number;
  interactive?: boolean;
}

export default function GlassOrb({
  size = 200,
  color = "rgba(6, 214, 160, 0.15)",
  blur = 60,
  x = 0,
  y = 0,
  delay = 0,
  interactive = false,
}: Props) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 30 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!interactive) return;

    const handleMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mouseX.set((e.clientX - cx) * 0.03);
      mouseY.set((e.clientY - cy) * 0.03);
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [interactive, mouseX, mouseY]);

  if (!mounted) return null;

  return (
    <div 
      className="absolute pointer-events-none animate-float will-change-transform"
      style={{ left: x, top: y, width: size, height: size, animationDelay: `${delay}s` }}
    >
      <motion.div
        className="w-full h-full rounded-full"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay, ease: "easeOut" }}
        style={{
          /* The radial gradient already fades to transparent, so a small blur
             is enough — the old blur(80px) + feTurbulence SVG filter forced an
             expensive offscreen buffer and caused visible jank on weak GPUs. */
          background: `radial-gradient(circle, ${color} 0%, ${color} 25%, transparent 72%)`,
          filter: `blur(${Math.min(blur, 24)}px)`,
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          x: interactive ? springX : 0,
          y: interactive ? springY : 0,
        }}
      />
    </div>
  );
}
