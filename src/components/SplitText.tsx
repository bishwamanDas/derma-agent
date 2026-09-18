"use client";

import { motion } from "framer-motion";

interface Props {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}

export default function SplitText({
  text,
  className = "",
  delay = 0,
  stagger = 0.03,
}: Props) {
  const chars = text.split("");

  return (
    <motion.span
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
      className={`inline-block ${className}`}
      aria-label={text}
    >
      {chars.map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          variants={{
            hidden: { opacity: 0, y: 30, rotateX: -40 },
            visible: {
              opacity: 1,
              y: 0,
              rotateX: 0,
              transition: {
                type: "spring",
                damping: 20,
                stiffness: 200,
              },
            },
          }}
          className="inline-block"
          style={{ whiteSpace: ch === " " ? "pre" : undefined }}
        >
          {ch}
        </motion.span>
      ))}
    </motion.span>
  );
}
