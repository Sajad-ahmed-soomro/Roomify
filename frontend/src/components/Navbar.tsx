"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/design", label: "Studio" },
  { href: "/gallery", label: "My designs" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-foreground text-background">
            <Sparkles className="size-4" />
          </span>
          <span className="hidden text-lg sm:inline">Roomify</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface/70 p-1 text-sm">
            {LINKS.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative rounded-full px-3 py-1.5 transition-colors sm:px-4 ${
                    active ? "text-background" : "text-muted hover:text-foreground"
                  } ${l.href === "/" ? "hidden sm:block" : ""}`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-foreground"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </div>
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}
