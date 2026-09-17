"use client";

import { useRef, type MouseEvent } from "react";
import { useMotionValue, useSpring } from "framer-motion";

export function useMagnetic(strength = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springRotX = useSpring(rotX, { stiffness: 150, damping: 20 });
  const springRotY = useSpring(rotY, { stiffness: 150, damping: 20 });

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    rotY.set(dx * 15 * strength);
    rotX.set(-dy * 15 * strength);
  };

  const handleLeave = () => {
    rotX.set(0);
    rotY.set(0);
  };

  return {
    ref,
    style: {
      rotateX: springRotX,
      rotateY: springRotY,
      transformPerspective: 800,
    },
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
  };
}
