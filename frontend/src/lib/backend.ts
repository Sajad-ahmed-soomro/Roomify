import "server-only";
import { getSession } from "@/lib/auth";

/**
 * Calls the Python backend (backend/) on behalf of the signed-in user. The
 * browser never talks to the backend directly: we verify the session here and
 * pass the user's identity alongside the shared internal key.
 */
const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type User = { id: string; email: string; name: string; image?: string | null };

export function json(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function backendFetch(user: User, path: string, init: RequestInit = {}) {
  const identity = Buffer.from(
    JSON.stringify({ id: user.id, email: user.email, name: user.name, image: user.image ?? null }),
  ).toString("base64url");

  const headers = new Headers(init.headers);
  // Forgive a key pasted into the dashboard with surrounding spaces or quotes.
  headers.set("X-Internal-Key", (process.env.BACKEND_API_KEY ?? "").trim().replace(/^["']|["']$/g, ""));
  headers.set("X-User", identity);

  try {
    return await fetch(`${BACKEND_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return json("The design service is offline. Please try again shortly.", 503);
  }
}

/** Runs `fn` with the signed-in user, or returns 401. */
export async function withUser(fn: (user: User) => Promise<Response>) {
  const session = await getSession();
  if (!session) return json("Please sign in.", 401);
  return fn(session.user);
}

type BackendDesign = { id: string } & Record<string, unknown>;

/** Adds same-origin image URLs to a backend design. */
export function withImageUrls(d: BackendDesign) {
  return { ...d, beforeUrl: `/api/designs/${d.id}/before`, afterUrl: `/api/designs/${d.id}/after` };
}

/** Converts a backend error ({detail}) into our {error} shape, keeping the status. */
export async function relayError(res: Response) {
  const body = await res.json().catch(() => ({}));
  const detail = typeof body.detail === "string" ? body.detail : body.error;
  return json(detail || "The design service returned an error.", res.status);
}
