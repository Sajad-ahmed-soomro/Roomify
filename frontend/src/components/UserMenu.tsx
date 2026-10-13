"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Images, LogOut } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (isPending) return <div className="size-9 animate-pulse rounded-full bg-surface-2" />;

  if (!session) {
    return (
      <Link
        href="/signin"
        className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-transform active:scale-[0.97]"
      >
        Sign in
      </Link>
    );
  }

  const { user } = session;
  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="grid size-9 place-items-center overflow-hidden rounded-full bg-accent-soft font-semibold text-accent ring-2 ring-transparent transition-shadow hover:ring-border"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Google avatar
          <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          initial
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-64 origin-top-right overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-xl"
          >
            <div className="px-3 py-2.5">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-muted">{user.email}</div>
            </div>
            <div className="my-1 h-px bg-border" />
            <Link
              href="/gallery"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-surface-2"
            >
              <Images className="size-4 text-muted" /> My designs
            </Link>
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await signOut();
                router.push("/");
                router.refresh();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2"
            >
              <LogOut className="size-4 text-muted" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
