"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "framer-motion";

export function useCounter(target: number, duration = 2000, suffix = "") {
  const [val, setVal] = useState(0);
  const ref = useRef<any>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const animRef = useRef<number>(0);

  const startAnimation = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const start = performance.now();
    const isFloat = target % 1 !== 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = eased * target;

      setVal(isFloat ? parseFloat(current.toFixed(1)) : Math.floor(current));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
  }, [target, duration]);

  useEffect(() => {
    if (inView) {
      startAnimation();
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [inView, startAnimation]);

  const restart = () => {
    setVal(0);
    startAnimation();
  };

  const isFloat = target % 1 !== 0;
  return { val: `${isFloat ? val : val.toLocaleString()}${suffix}`, ref, restart };
}
