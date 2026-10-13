import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Palette, Wand2 } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { DESIGN_STYLES, HERO_IMAGES } from "@/lib/styles";

const STEPS = [
  {
    icon: Camera,
    title: "Snap your room",
    text: "Take a photo with your phone or upload one. Any room, any light.",
  },
  {
    icon: Palette,
    title: "Pick a style",
    text: "Scandinavian, boho, mid-century… or describe exactly what you want.",
  },
  {
    icon: Wand2,
    title: "Get your redesign",
    text: "AI keeps your layout and reimagines everything else in seconds.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-130 w-225 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pb-24 md:pt-20">
          <div>
            <FadeIn>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
                <span className="size-1.5 rounded-full bg-accent" />
                AI interior design studio
              </span>
            </FadeIn>
            <FadeIn delay={0.05}>
              <h1 className="mt-5 font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Your room,
                <br />
                <em className="text-accent">reimagined</em> in seconds.
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mt-5 max-w-md text-lg text-muted">
                Take a picture of any room and see it redesigned in the style you love — before you
                move a single piece of furniture.
              </p>
            </FadeIn>
            <FadeIn delay={0.15} className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/design"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 font-medium text-background transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Redesign my room
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#styles"
                className="inline-flex h-12 items-center rounded-full border border-border bg-surface px-6 font-medium transition-colors hover:bg-surface-2"
              >
                Browse styles
              </a>
            </FadeIn>
            <FadeIn delay={0.2} className="mt-10 flex items-center gap-6 text-sm text-muted">
              <div>
                <div className="text-2xl font-semibold text-foreground">8</div>
                design styles
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-2xl font-semibold text-foreground">~10s</div>
                per redesign
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-2xl font-semibold text-foreground">6</div>
                room types
              </div>
            </FadeIn>
          </div>

          {/* Collage */}
          <FadeIn delay={0.1} y={30} className="relative mx-auto aspect-4/5 w-full max-w-md">
            <div className="absolute left-0 top-6 h-[62%] w-[62%] -rotate-6 overflow-hidden rounded-3xl border-4 border-surface shadow-2xl">
              <Image src={HERO_IMAGES.gallery[1]} alt="Mid-century living room" fill sizes="300px" className="object-cover" />
            </div>
            <div className="absolute bottom-4 right-0 h-[58%] w-[60%] rotate-[5deg] overflow-hidden rounded-3xl border-4 border-surface shadow-2xl">
              <Image src={HERO_IMAGES.gallery[2]} alt="Scandinavian living room" fill sizes="300px" className="object-cover" />
            </div>
            <div className="absolute left-1/2 top-1/2 h-[60%] w-[66%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border-4 border-surface shadow-2xl">
              <Image src={HERO_IMAGES.gallery[0]} alt="Farmhouse living room" fill priority sizes="340px" className="object-cover" />
            </div>
            <div className="absolute -left-2 bottom-16 flex items-center gap-2 rounded-2xl border border-border bg-surface/90 px-3 py-2 text-sm shadow-lg backdrop-blur sm:-left-6">
              <Wand2 className="size-4 text-accent" />
              <span className="font-medium">Farmhouse</span>
              <span className="text-muted">applied</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <FadeIn>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">How it works</h2>
          <p className="mt-3 max-w-lg text-muted">Three steps from a quick snapshot to a room you can&apos;t wait to live in.</p>
        </FadeIn>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.08}>
              <div className="h-full rounded-3xl border border-border bg-surface p-6 transition-shadow hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                    <s.icon className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-muted">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-muted">{s.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Styles */}
      <section id="styles" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24">
        <FadeIn className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl tracking-tight sm:text-5xl">Find your style</h2>
            <p className="mt-3 max-w-lg text-muted">Start from a curated look, then fine-tune it with your own words.</p>
          </div>
          <Link href="/design" className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
            Open the studio <ArrowRight className="size-4" />
          </Link>
        </FadeIn>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {DESIGN_STYLES.map((s, i) => (
            <FadeIn key={s.id} delay={(i % 4) * 0.06}>
              <Link
                href={`/design?style=${s.id}`}
                className="group relative block aspect-3/4 overflow-hidden rounded-3xl bg-surface-2"
              >
                <Image
                  src={s.image}
                  alt={`${s.label} interior`}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div className="font-display text-2xl">{s.label}</div>
                  <div className="text-sm text-white/75">{s.description}</div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <FadeIn>
          <div className="relative overflow-hidden rounded-4xl bg-foreground px-6 py-14 text-center text-background sm:px-12">
            <div className="pointer-events-none absolute -bottom-32 left-1/2 h-72 w-150 -translate-x-1/2 rounded-full bg-accent/40 blur-3xl" />
            <h2 className="relative font-display text-4xl tracking-tight sm:text-5xl">Ready for a fresh look?</h2>
            <p className="relative mx-auto mt-3 max-w-md text-background/70">
              Grab your phone, snap the room you&apos;re in right now and see what it could become.
            </p>
            <Link
              href="/design"
              className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-background px-6 font-medium text-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Camera className="size-4" /> Start designing
            </Link>
          </div>
        </FadeIn>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        © 2026 Roomify · Designed with AI
      </footer>
    </>
  );
}
