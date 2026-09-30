import React, { useState, useEffect, useRef, useMemo } from "react";

export default function NeuralNetwork({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svgRef.current.getScreenCTM();
      if (ctm) {
        const svgP = pt.matrixTransform(ctm.inverse());
        setMousePos({ x: svgP.x, y: svgP.y });
      }
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const { nodes, connections } = useMemo(() => {
    const seed = (s: number) => () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
    const random = seed(42);

    const numNodes = 60;
    const computedNodes = Array.from({ length: numNodes }).map((_, i) => ({
      id: i,
      x: random() * 100,
      y: random() * 100,
      r: random() * 0.8 + 0.3,
    }));

    const computedConnections = [];
    for (let i = 0; i < numNodes; i++) {
      for (let j = i + 1; j < numNodes; j++) {
        const dx = computedNodes[i].x - computedNodes[j].x;
        const dy = computedNodes[i].y - computedNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) {
          computedConnections.push({
            id: `${i}-${j}`,
            x1: computedNodes[i].x,
            y1: computedNodes[i].y,
            x2: computedNodes[j].x,
            y2: computedNodes[j].y,
            opacity: (1 - dist / 20).toFixed(3),
          });
        }
      }
    }
    
    return { nodes: computedNodes, connections: computedConnections };
  }, []);

  if (!mounted) {
    return null; // Prevent hydration error by rendering only on client
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full opacity-40"
      >
        <defs>
          <linearGradient id="neuron-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {connections.map((c, i) => (
          <line
            key={c.id}
            x1={c.x1.toFixed(3)}
            y1={c.y1.toFixed(3)}
            x2={c.x2.toFixed(3)}
            y2={c.y2.toFixed(3)}
            stroke="url(#neuron-glow)"
            strokeWidth="0.15"
            opacity={c.opacity}
            className={i % 4 === 0 ? "animate-pulse" : ""}
            style={{
              animationDelay: `${(i % 5) * 0.7}s`,
              animationDuration: "4s",
            }}
          />
        ))}

        {nodes.map((n) => {
          const dx = n.x - mousePos.x;
          const dy = n.y - mousePos.y;
          const isHovered = (dx * dx + dy * dy) < 30; // Radius of interaction

          return (
            <circle
              key={n.id}
              cx={n.x.toFixed(3)}
              cy={n.y.toFixed(3)}
              r={isHovered ? (n.r * 2.5).toFixed(3) : n.r.toFixed(3)}
              fill={isHovered ? "#22d3ee" : "#3b82f6"}
              opacity={isHovered ? "1" : "0.6"}
              className={`transition-all duration-700 ease-out ${n.id % 3 === 0 && !isHovered ? "animate-pulse" : ""} ${isHovered ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]" : ""}`}
              style={{
                animationDelay: `${(n.id % 4) * 0.5}s`,
                animationDuration: "3s",
              }}
            />
          );
        })}

        {connections.filter((_, i) => i % 10 === 0).map((c, i) => (
          <circle
            key={`signal-${c.id}`}
            r="0.4"
            fill="#06b6d4"
            className="animate-pulse"
            style={{
              animationDuration: "2s",
              animationDelay: `${i * 0.3}s`,
            }}
          >
            <animateMotion
              dur={`${2 + (i % 3)}s`}
              repeatCount="indefinite"
              path={`M ${c.x1.toFixed(3)} ${c.y1.toFixed(3)} L ${c.x2.toFixed(3)} ${c.y2.toFixed(3)}`}
            />
          </circle>
        ))}
      </svg>
    </div>
  );
}
