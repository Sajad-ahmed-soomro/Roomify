import { Check, ShoppingBag, Sparkles } from "lucide-react";
import type { SavedDesign } from "@/lib/designs";

/** Claude's plan for a design: summary, palette, key changes and shopping list. */
export function DesignNotes({ design, className = "" }: { design: SavedDesign; className?: string }) {
  const a = design.analysis;
  if (!a) return null;

  return (
    <section className={`rounded-3xl border border-border bg-surface p-5 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
        <Sparkles className="size-3.5" /> Designer notes
      </div>
      {design.title && <h2 className="mt-2 font-display text-2xl tracking-tight">{design.title}</h2>}
      <p className="mt-2 text-sm leading-relaxed text-muted">{a.summary}</p>

      {a.palette.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Palette</h3>
          <ul className="mt-2 flex flex-wrap gap-3">
            {a.palette.map((c) => (
              <li key={c.hex + c.name} className="flex items-center gap-2 text-xs">
                <span className="size-7 rounded-full border border-border shadow-inner" style={{ background: c.hex }} />
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="block font-mono text-[10px] uppercase text-muted">{c.hex}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {a.keyChanges.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">What changed</h3>
            <ul className="mt-2 space-y-2">
              {a.keyChanges.map((c) => (
                <li key={c} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {a.shoppingList.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">Get the look</h3>
            <ul className="mt-2 space-y-2">
              {a.shoppingList.map((s) => (
                <li key={s.item} className="flex gap-2 text-sm">
                  <ShoppingBag className="mt-0.5 size-4 shrink-0 text-muted" />
                  <span>
                    <span className="font-medium">{s.item}</span>
                    <span className="text-muted"> — {s.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
