"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { ChevronsLeftRight } from "lucide-react";

type Props = {
  before: string;
  after: string;
  /** CSS filter applied to the "before" layer — handy for demo showcases. */
  beforeFilter?: string;
  initial?: number;
  className?: string;
  priority?: boolean;
};

/** Draggable before/after image comparison. Works with mouse, touch and keyboard. */
export function CompareSlider({ before, after, beforeFilter, initial = 50, className = "", priority }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);

  const update = useCallback((clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const imgStyle: CSSProperties = { objectFit: "cover", width: "100%", height: "100%" };

  return (
    <div
      ref={ref}
      className={`relative select-none overflow-hidden touch-pan-y ${className}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        update(e.clientX);
      }}
      onPointerMove={(e) => dragging && update(e.clientX)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      style={{ cursor: dragging ? "grabbing" : "ew-resize" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- data URLs from the AI service */}
      <img src={after} alt="Redesigned room" draggable={false} style={imgStyle} className="absolute inset-0" fetchPriority={priority ? "high" : undefined} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="Original room" draggable={false} style={{ ...imgStyle, filter: beforeFilter }} />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-black backdrop-blur-md">
        After
      </span>

      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -translate-x-1/2 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.35)]" />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Compare before and after"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
            if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
          }}
          className={`pointer-events-auto absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-xl transition-transform ${
            dragging ? "scale-110" : ""
          }`}
        >
          <ChevronsLeftRight className="size-5" />
        </div>
      </div>
    </div>
  );
}
