"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { DESIGN_STYLES, ROOM_TYPES } from "@/lib/styles";

type Props = {
  roomType: string;
  onRoomType: (id: string) => void;
  style: string;
  onStyle: (id: string) => void;
  prompt: string;
  onPrompt: (v: string) => void;
  strength: number;
  onStrength: (v: number) => void;
  disabled?: boolean;
};

const PROMPT_IDEAS = ["Add indoor plants", "Warm evening lighting", "Green velvet sofa", "Built-in bookshelves"];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function ControlPanel(p: Props) {
  return (
    <fieldset disabled={p.disabled} className="flex flex-col gap-7 transition-opacity disabled:opacity-60">
      <Section title="Room type">
        <div className="flex flex-wrap gap-2">
          {ROOM_TYPES.map((r) => {
            const active = p.roomType === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => p.onRoomType(r.id)}
                className={`relative inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors ${
                  active ? "text-background" : "border border-border bg-surface hover:bg-surface-2"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="room-pill"
                    className="absolute inset-0 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 450, damping: 34 }}
                  />
                )}
                <span className="relative">{r.emoji}</span>
                <span className="relative">{r.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Style" hint={DESIGN_STYLES.find((s) => s.id === p.style)?.description}>
        <div className="grid grid-cols-4 gap-2">
          {DESIGN_STYLES.map((s) => {
            const active = p.style === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => p.onStyle(s.id)}
                className="group flex flex-col items-center gap-1.5"
                aria-pressed={active}
              >
                <span
                  className={`relative block aspect-square w-full overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-background transition-all ${
                    active ? "ring-accent" : "ring-transparent group-hover:ring-border"
                  }`}
                >
                  <Image
                    src={s.image.replace("w=800", "w=200")}
                    alt=""
                    fill
                    sizes="90px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-accent text-accent-ink"
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </motion.span>
                  )}
                </span>
                <span className={`text-xs ${active ? "font-semibold" : "text-muted"}`}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Your wishes" hint="Optional">
        <textarea
          value={p.prompt}
          onChange={(e) => p.onPrompt(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="e.g. a cosy reading corner by the window, terracotta accents…"
          className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-(--ring)"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROMPT_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => p.onPrompt(p.prompt ? `${p.prompt.replace(/[,\s]+$/, "")}, ${idea.toLowerCase()}` : idea)}
              className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
            >
              + {idea}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Transformation" hint={p.strength < 0.4 ? "Subtle" : p.strength < 0.7 ? "Balanced" : "Bold"}>
        <input
          type="range"
          min={0.2}
          max={0.9}
          step={0.05}
          value={p.strength}
          onChange={(e) => p.onStrength(Number(e.target.value))}
          className="w-full accent-(--accent)"
          aria-label="Transformation strength"
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>Keep my room</span>
          <span>Total makeover</span>
        </div>
      </Section>
    </fieldset>
  );
}
