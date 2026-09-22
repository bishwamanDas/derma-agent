"use client";

import { useEffect } from "react";

export default function GlobalHoverAnimation() {
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const bumpBtn = target.closest('.btn-bump');
      if (bumpBtn && !bumpBtn.classList.contains('is-animating')) {
        bumpBtn.classList.add('is-animating');
        setTimeout(() => bumpBtn.classList.remove('is-animating'), 1200);
      }

      const groupBtn = target.closest('.group');
      if (
        groupBtn && 
        (groupBtn.querySelector('.group-btn-bump-left') || groupBtn.querySelector('.group-btn-bump-right')) && 
        !groupBtn.classList.contains('is-animating')
      ) {
        groupBtn.classList.add('is-animating');
        setTimeout(() => groupBtn.classList.remove('is-animating'), 1200);
      }
    };

    document.addEventListener("mouseover", handleMouseOver);
    return () => document.removeEventListener("mouseover", handleMouseOver);
  }, []);

  return null;
}
