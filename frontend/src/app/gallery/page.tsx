import type { Metadata } from "next";
import { Gallery } from "@/components/Gallery";

export const metadata: Metadata = {
  title: "My designs · Roomify",
};

export default function GalleryPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">My designs</h1>
      <p className="mb-8 mt-2 text-muted">Tap a design to compare it with the original.</p>
      <Gallery />
    </div>
  );
}
