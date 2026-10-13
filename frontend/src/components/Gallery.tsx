"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Download, Images, Trash2, X } from "lucide-react";
import { CompareSlider } from "@/components/CompareSlider";
import { DesignNotes } from "@/components/DesignNotes";
import { useDesigns, type SavedDesign } from "@/lib/designs";
import { getRoomType, getStyle } from "@/lib/styles";

export function Gallery() {
  const { designs, error, remove } = useDesigns();
  const [open, setOpen] = useState<SavedDesign | null>(null);

  if (error && !designs) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
        <AlertCircle className="size-4" /> {error}
      </div>
    );
  }

  if (!designs) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="relative aspect-4/3 overflow-hidden bg-surface-2">
              <div className="absolute inset-y-0 w-1/2 animate-shimmer bg-linear-to-r from-transparent via-background/60 to-transparent" />
            </div>
            <div className="space-y-2 p-4">
              <div className="h-4 w-1/2 rounded-full bg-surface-2" />
              <div className="h-3 w-1/3 rounded-full bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface px-6 py-20 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Images className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">No designs yet</h2>
        <p className="mt-1 max-w-xs text-sm text-muted">Every redesign you generate is saved to your account automatically.</p>
        <Link
          href="/design"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background"
        >
          Create your first design
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {designs.map((d, i) => (
            <motion.div
              key={d.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group overflow-hidden rounded-3xl border border-border bg-surface"
            >
              <button type="button" onClick={() => setOpen(d)} className="relative block aspect-4/3 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.afterUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.beforeUrl}
                  loading="lazy"
                  alt=""
                  className="absolute bottom-3 left-3 h-14 w-18 rounded-lg border-2 border-white object-cover shadow-md"
                />
              </button>
              <div className="flex items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {d.title ?? `${getStyle(d.style).label} ${getRoomType(d.roomType).label.toLowerCase()}`}
                  </div>
                  <div className="text-xs text-muted">
                    {getStyle(d.style).label} · {new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="flex gap-1">
                  <a
                    href={d.afterUrl}
                    download={`roomify-${d.style}-${d.seed}.jpg`}
                    aria-label="Download"
                    title="Download"
                    className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    <Download className="size-4" />
                  </a>
                  <IconButton label="Delete" onClick={() => remove(d.id)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative mx-auto my-4 w-full max-w-4xl"
            >
              <CompareSlider before={open.beforeUrl} after={open.afterUrl} className="aspect-4/3 w-full rounded-3xl shadow-2xl" />
              {open.userPrompt && <p className="mt-3 text-center text-sm text-white/80">“{open.userPrompt}”</p>}
              <DesignNotes design={open} className="mt-4" />
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="absolute -top-3 -right-3 grid size-9 place-items-center rounded-full bg-white text-black shadow-lg"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}
