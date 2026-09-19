import React, { useState, useEffect, useRef, useMemo } from "react";

export default function FloatingCells({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    
    let raf = 0;
    const handleMouseMove = (e: MouseEvent) => {
      // one update per frame at most — per-event setState made scroll/pan janky
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!svgRef.current) return;
        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const ctm = svgRef.current.getScreenCTM();
        if (ctm) {
          const svgP = pt.matrixTransform(ctm.inverse());
          setMousePos((prev) => {
            const dx = svgP.x - prev.x;
            const dy = svgP.y - prev.y;
            if (dx * dx + dy * dy < 4) return prev; // ignore sub-2-unit moves
            return { x: svgP.x, y: svgP.y };
          });
        }
      });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const cells = useMemo(() => {
    const seed = (s: number) => () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
    const random = seed(1234);

    const numCells = 45;
    return Array.from({ length: numCells }).map((_, i) => ({
      id: i,
      x: random() * 100,
      y: random() * 100,
      angle: random() * 360,
      scale: random() * 0.4 + 0.6,
    }));
  }, []);

  if (!mounted) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="ab-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
          </linearGradient>
          
          <g id="cell">

            {/* skin cell: membrane + nucleus + organelles */}
            <circle cx="0" cy="0" r="3.4" stroke="url(#ab-glow)" strokeWidth="0.7" fill="none" />
            <circle cx="0" cy="0" r="1.3" fill="#3b82f6" opacity="0.7" />
            <circle cx="-1.8" cy="1.6" r="0.4" fill="#8b5cf6" opacity="0.8" />
            <circle cx="1.9" cy="-1.4" r="0.35" fill="#8b5cf6" opacity="0.6" />
          </g>
        </defs>

        {cells.map((ab) => {
          const dx = ab.x - mousePos.x;
          const dy = ab.y - mousePos.y;
          const distSq = dx * dx + dy * dy;

          const interactionRadiusSq = 100; 
          const isHovered = distSq < interactionRadiusSq;
          
          let drawX = ab.x;
          let drawY = ab.y;

          if (isHovered && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (interactionRadiusSq - distSq) / interactionRadiusSq;
            drawX += (dx / dist) * force * 3;
            drawY += (dy / dist) * force * 3;
          }

          return (
            <g
              key={ab.id}
              className="transition-all duration-700 ease-out"
              transform={`translate(${drawX.toFixed(2)}, ${drawY.toFixed(2)}) rotate(${ab.angle.toFixed(1)}) scale(${isHovered ? (ab.scale * 1.3).toFixed(2) : ab.scale.toFixed(2)})`}
              opacity={isHovered ? 0.8 : 0.25}
            >
              <use 
                href="#cell" 
                x="0" 
                y="0" 
                className={ab.id % 4 === 0 ? "animate-pulse" : ""} 
                style={{ 
                  animationDuration: `${3 + (ab.id % 3)}s`, 
                  animationDelay: `${ab.id % 4}s` 
                }} 
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
