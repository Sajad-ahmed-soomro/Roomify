"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Props = {
  image: string;
  styleLabel: string;
  onCancel: () => void;
};

export function GeneratingView({ image, styleLabel, onCancel }: Props) {
  const stages = [
    "Studying your room",
    `Planning the ${styleLabel.toLowerCase()} design`,
    "Rendering the new look",
    "Adding final details",
  ];
  const [progress, setProgress] = useState(4);

  // Eased fake progress: approaches 95% and waits for the real result.
  useEffect(() => {
    const id = setInterval(() => setProgress((p) => p + (95 - p) * 0.012), 200);
    return () => clearInterval(id);
  }, []);

  const stage = Math.min(stages.length - 1, Math.floor((progress / 95) * stages.length));

  return (
    <div className="relative h-full overflow-hidden rounded-3xl bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="absolute inset-0 size-full scale-105 object-cover opacity-70 blur-[2px]" />

      {/* Scanning beam */}
      <div className="absolute inset-x-0 h-24 -translate-y-1/2 animate-scan bg-linear-to-b from-transparent via-accent/45 to-transparent mix-blend-screen" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 w-1/2 animate-shimmer bg-linear-to-r from-transparent via-white/15 to-transparent" />
      </div>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 to-transparent p-5 pt-16 text-white sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-white/60">Designing</div>
            <div className="relative mt-1 h-7 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={stage}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="truncate text-lg font-medium"
                >
                  {stages[stage]}…
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="font-mono text-2xl tabular-nums">{Math.round(progress)}%</div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear", duration: 0.2 }}
          />
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 text-sm text-white/70 underline-offset-4 hover:text-white hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
