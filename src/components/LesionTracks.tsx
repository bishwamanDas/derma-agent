import React, { useState, useEffect } from "react";

export default function LesionTracks({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [offsets, setOffsets] = useState<Record<string, number>>({});

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const seed = (s: number) => () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
  const random = seed(98765);

  const numTracks = 12;
  const tracks = Array.from({ length: numTracks }).map((_, i) => {
    return {
      id: i,
      y: 5 + i * (90 / numTracks),
      reads: Array.from({ length: Math.floor(random() * 5 + 5) }).map((_, j) => {
        const type = Math.floor(random() * 4);
        const colors = ["#10b981", "#f43f5e", "#3b82f6", "#f59e0b"];
        const letters = ["A", "T", "C", "G"];
        return {
          id: `${i}-${j}`,
          x: random() * 100,
          w: random() * 6 + 5,
          color: colors[type],
          letter: letters[type],
          delay: random() * 4,
          dur: random() * 2 + 2,
        };
      }),
    };
  });

  if (!mounted) return null;

  const handleReadClick = (id: string) => {
    setOffsets((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 15,
    }));
  };

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full opacity-40"
      >
        <defs>
          <linearGradient id="scan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {tracks.map((track) => (
          <g key={track.id}>
            <line
              x1="0"
              y1={track.y.toFixed(3)}
              x2="100"
              y2={track.y.toFixed(3)}
              stroke="var(--seq-stroke)"
              strokeWidth="0.1"
              opacity="0.5"
            />
            {track.reads.map((read) => {
              const shift = offsets[read.id] || 0;
              return (
              <g
                key={read.id}
                className="animate-pulse cursor-pointer pointer-events-auto hover:brightness-150"
                onClick={() => handleReadClick(read.id)}
                style={{
                  animationDelay: `${read.delay}s`,
                  animationDuration: `${read.dur}s`,
                  transform: `translateX(${shift}px)`,
                  transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <rect
                  x={read.x.toFixed(3)}
                  y={(track.y - 1).toFixed(3)}
                  width={read.w.toFixed(3)}
                  height="2"
                  fill={read.color}
                  opacity="0.4"
                  rx="0.5"
                />
                <rect
                  x={read.x.toFixed(3)}
                  y={(track.y - 1).toFixed(3)}
                  width={read.w.toFixed(3)}
                  height="2"
                  fill="none"
                  stroke={read.color}
                  strokeWidth="0.2"
                  opacity="0.8"
                  rx="0.5"
                />
                <text
                  x={(read.x + read.w / 2).toFixed(3)}
                  y={(track.y + 0.6).toFixed(3)}
                  fontSize="1.4"
                  fill="var(--seq-fill)"
                  textAnchor="middle"
                  fontFamily="monospace"
                  opacity="0.8"
                >
                  {read.letter}
                </text>
              </g>
            )})}
          </g>
        ))}

      </svg>
    </div>
  );
}
