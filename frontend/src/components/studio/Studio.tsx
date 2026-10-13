"use client";

import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Download, ImageUp, RefreshCw, Sparkles, X } from "lucide-react";
import { CompareSlider } from "@/components/CompareSlider";
import { DesignNotes } from "@/components/DesignNotes";
import { ControlPanel } from "./ControlPanel";
import { GeneratingView } from "./GeneratingView";
import { UploadDropzone } from "./UploadDropzone";
import { downloadImage, prepareImage } from "@/lib/image";
import { createDesign, useAllowance, type SavedDesign } from "@/lib/designs";
import { DESIGN_STYLES, getStyle } from "@/lib/styles";

const fade = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

export function Studio() {
  const params = useSearchParams();
  const initialStyle = DESIGN_STYLES.some((s) => s.id === params.get("style")) ? params.get("style")! : "modern";

  const [photo, setPhoto] = useState<string | null>(null);
  const [roomType, setRoomType] = useState("living-room");
  const [style, setStyle] = useState(initialStyle);
  const [prompt, setPrompt] = useState("");
  const [strength, setStrength] = useState(0.6);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variations, setVariations] = useState<SavedDesign[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { allowance, refresh: refreshAllowance } = useAllowance();
  const outOfDesigns = allowance?.designsRemaining === 0;

  const active = variations.find((v) => v.id === activeId) ?? null;

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    try {
      setPhoto(await prepareImage(file));
      setVariations([]);
      setActiveId(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const generate = async () => {
    if (!photo || generating || outOfDesigns) return;
    setError(null);
    setGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const design = await createDesign({ photo, roomType, style, prompt, strength }, controller.signal);
      setVariations((prev) => [design, ...prev]);
      setActiveId(design.id);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message || "Something went wrong. Please try again.");
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
      refreshAllowance();
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setPhoto(null);
    setVariations([]);
    setActiveId(null);
    setError(null);
  };

  const view = !photo ? "upload" : generating ? "generating" : active ? "result" : "preview";

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 pb-32 pt-6 sm:px-6 lg:grid-cols-[1fr_380px] lg:gap-10 lg:pb-12 lg:pt-10">
      {/* Canvas */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Design studio</h1>
            <p className="text-sm text-muted">
              {view === "upload" && "Start with a photo of your room."}
              {view === "preview" && "Looking good. Choose a style and hit generate."}
              {view === "generating" && "Our AI designer is planning your room, then rendering it. This can take a minute."}
              {view === "result" && "Drag the handle to compare before and after."}
            </p>
          </div>
          {photo && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm transition-colors hover:bg-surface-2"
            >
              <ImageUp className="size-4" /> New photo
            </button>
          )}
        </div>

        {active?.engine === "demo" && view === "result" && (
          <div className="flex items-start gap-2 rounded-2xl border border-accent/25 bg-accent-soft/60 px-4 py-2.5 text-sm">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              <strong className="font-semibold">Preview only.</strong>{" "}
              <span className="text-muted">
                The image model runs on the creator&apos;s laptop and is offline right now, so the picture is a
                colour-graded preview. The designer notes below are real.
              </span>
            </span>
          </div>
        )}

        <div
          className={`relative w-full transition-[height] ${
            view === "upload" ? "h-110 sm:h-auto sm:aspect-4/3" : "aspect-4/3"
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {view === "upload" && (
              <motion.div key="upload" {...fade} className="absolute inset-0">
                <UploadDropzone onFile={handleFile} />
              </motion.div>
            )}
            {view === "preview" && (
              <motion.div key="preview" {...fade} className="absolute inset-0 overflow-hidden rounded-3xl bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo!} alt="Your room" className="size-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                  Original
                </span>
              </motion.div>
            )}
            {view === "generating" && (
              <motion.div key="generating" {...fade} className="absolute inset-0">
                <GeneratingView image={photo!} styleLabel={getStyle(style).label} onCancel={() => abortRef.current?.abort()} />
              </motion.div>
            )}
            {view === "result" && active && (
              <motion.div key={`result-${active.id}`} {...fade} className="absolute inset-0">
                <CompareSlider before={active.beforeUrl} after={active.afterUrl} className="size-full rounded-3xl shadow-xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {active && view === "result" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadImage(active.afterUrl, `roomify-${active.style}-${active.seed}.jpg`)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-transform active:scale-[0.97]"
            >
              <Download className="size-4" /> Download
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={outOfDesigns}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-40"
            >
              <RefreshCw className="size-4" /> New variation
            </button>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
              <Check className="size-3.5 text-accent" /> Saved to My designs
            </span>
          </div>
        )}

        {variations.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Variations</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <AnimatePresence initial={false}>
                {variations.map((v) => (
                  <motion.button
                    layout
                    key={v.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setActiveId(v.id)}
                    className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-background transition-all ${
                      v.id === activeId ? "ring-accent" : "ring-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.afterUrl} alt={`${getStyle(v.style).label} variation`} className="size-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-[10px] text-white">
                      {getStyle(v.style).label}
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {active && view === "result" && <DesignNotes design={active} />}
      </div>

      {/* Controls */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-border bg-surface/60 p-5 sm:p-6">
          <ControlPanel
            roomType={roomType}
            onRoomType={setRoomType}
            style={style}
            onStyle={setStyle}
            prompt={prompt}
            onPrompt={setPrompt}
            strength={strength}
            onStrength={setStrength}
            disabled={generating}
          />
          <AllowanceNote remaining={allowance?.designsRemaining ?? null} limit={allowance?.designLimit ?? null} />
          <div className="mt-4 hidden lg:block">
            <GenerateButton
              onClick={generate}
              disabled={!photo || generating || outOfDesigns}
              generating={generating}
              hasResult={!!active}
            />
          </div>
        </div>
      </aside>

      {/* Mobile sticky action */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 p-4 backdrop-blur-xl lg:hidden">
        <GenerateButton
          onClick={generate}
          disabled={!photo || generating || outOfDesigns}
          generating={generating}
          hasResult={!!active}
        />
      </div>
    </div>
  );
}

function AllowanceNote({ remaining, limit }: { remaining: number | null; limit: number | null }) {
  if (remaining === null || limit === null) return null;
  return (
    <p className={`mt-6 text-center text-xs ${remaining === 0 ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
      {remaining === 0
        ? `You've used all ${limit} designs included with your account.`
        : `${remaining} of ${limit} designs left on your account`}
    </p>
  );
}

function GenerateButton({
  onClick,
  disabled,
  generating,
  hasResult,
}: {
  onClick: () => void;
  disabled: boolean;
  generating: boolean;
  hasResult: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      className="relative inline-flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-accent font-semibold text-accent-ink shadow-lg shadow-accent/25 transition-opacity disabled:opacity-40 disabled:shadow-none"
    >
      {generating && (
        <span className="absolute inset-0 overflow-hidden">
          <span className="absolute inset-y-0 w-1/2 animate-shimmer bg-linear-to-r from-transparent via-white/30 to-transparent" />
        </span>
      )}
      <Sparkles className="size-4" />
      {generating ? "Designing…" : hasResult ? "Generate again" : "Generate design"}
    </motion.button>
  );
}
