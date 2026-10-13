"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/GoogleIcon";
import { signInWithGoogle, useSession } from "@/lib/auth-client";
import { HERO_IMAGES } from "@/lib/styles";

const PERKS = ["Unlimited room redesigns", "Every design saved to your account", "Access them from any device"];

/** Only allow same-site relative paths to avoid open redirects. */
function safeCallback(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/design";
}

export function SignIn() {
  const params = useSearchParams();
  const router = useRouter();
  const callbackURL = safeCallback(params.get("callbackURL"));
  const { data: session } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(params.get("error") ? "Google sign-in was cancelled or failed. Please try again." : null);

  useEffect(() => {
    if (session) router.replace(callbackURL);
  }, [session, callbackURL, router]);

  const onGoogle = async () => {
    setError(null);
    setPending(true);
    const { error } = await signInWithGoogle(callbackURL);
    // On success the browser navigates to Google, so we only get here on failure.
    if (error) {
      setError(error.message ?? "Could not start Google sign-in.");
      setPending(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-sm"
      >
        <h1 className="font-display text-5xl tracking-tight">
          Welcome to <em className="text-accent">Roomify</em>
        </h1>
        <p className="mt-3 text-muted">Sign in to start redesigning your rooms and keep every result in one place.</p>

        <ul className="mt-6 space-y-2.5">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-sm">
              <span className="grid size-5 place-items-center rounded-full bg-accent-soft text-accent">
                <Check className="size-3" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <motion.button
          type="button"
          onClick={onGoogle}
          disabled={pending}
          whileTap={{ scale: 0.98 }}
          className="mt-8 inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-surface font-medium shadow-sm transition-colors hover:bg-surface-2 disabled:opacity-70"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <GoogleIcon className="size-5" />}
          {pending ? "Redirecting to Google…" : "Continue with Google"}
        </motion.button>

        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          New here? Continuing with Google creates your account automatically.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative hidden aspect-4/5 overflow-hidden rounded-4xl shadow-2xl md:block"
      >
        <Image src={HERO_IMAGES.gallery[2]} alt="Scandinavian living room" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        <p className="absolute inset-x-0 bottom-0 p-8 font-display text-3xl leading-tight text-white">
          “See your room in a new style before you buy a thing.”
        </p>
      </motion.div>
    </div>
  );
}
