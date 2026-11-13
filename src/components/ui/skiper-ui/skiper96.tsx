import React from "react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

export interface Skiper96Props {
  isRecording?: boolean;
  seconds?: number;
  className?: string;
}

/**
 * Skiper 96 — Interactive Audio Waveform & Voice Pulse Visualizer
 */
export const Skiper96: React.FC<Skiper96Props> = ({
  isRecording = false,
  seconds = 0,
  className,
}) => {
  const bars = [
    0.35, 0.65, 0.45, 0.9, 0.55, 1.0, 0.7, 0.85, 0.4, 0.95, 0.6, 0.75, 0.5,
    0.88, 0.42, 0.68,
  ];

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-950/5 border border-amber-900/15",
        className,
      )}
    >
      {bars.map((baseHeight, idx) => {
        const activeHeight = isRecording
          ? Math.max(24, Math.round(((baseHeight * 100 + seconds * 23 + idx * 13) % 85) + 15))
          : Math.round(baseHeight * 38);

        return (
          <motion.span
            key={idx}
            initial={false}
            animate={{
              height: `${activeHeight}%`,
              opacity: isRecording ? 1 : 0.45,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 18,
            }}
            className={cn(
              "w-1.5 rounded-full transition-colors",
              isRecording ? "bg-red-600" : "bg-amber-800",
            )}
          />
        );
      })}
    </div>
  );
};
