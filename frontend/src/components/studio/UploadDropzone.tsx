"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, ImagePlus, Upload } from "lucide-react";

type Props = {
  onFile: (file: File) => void;
};

export function UploadDropzone({ onFile }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  // Allow pasting a screenshot / copied image anywhere on the page.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (file) onFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`relative flex h-full min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition-colors ${
        over ? "border-accent bg-accent-soft/60" : "border-border bg-surface"
      }`}
    >
      <motion.div
        animate={{ scale: over ? 1.08 : 1, rotate: over ? -4 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent"
      >
        <ImagePlus className="size-7" />
      </motion.div>
      <h2 className="mt-5 text-xl font-semibold">Add a photo of your room</h2>
      <p className="mt-1.5 max-w-xs text-sm text-muted">
        Shoot from a corner with good light so the whole space is visible. Drag &amp; drop or paste works too.
      </p>

      <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 font-medium text-background transition-transform hover:scale-[1.02] active:scale-[0.97]"
        >
          <Camera className="size-4" /> Take photo
        </button>
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background px-6 font-medium transition-colors hover:bg-surface-2"
        >
          <Upload className="size-4" /> Upload image
        </button>
      </div>
      <p className="mt-4 text-xs text-muted">JPG, PNG, HEIC or WebP</p>
      <p className="mt-1 max-w-xs text-[11px] text-muted/80">
        Your photo is analysed by Google Gemini to plan the design.
      </p>

      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
    </div>
  );
}
