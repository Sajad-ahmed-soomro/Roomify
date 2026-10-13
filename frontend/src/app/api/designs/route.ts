import { backendFetch, relayError, withImageUrls, withUser } from "@/lib/backend";

// Render's free tier can take ~1 min to wake, then Claude + rendering. Vercel Hobby allows 300s.
export const maxDuration = 300;

export async function GET() {
  return withUser(async (user) => {
    const res = await backendFetch(user, "/v1/designs");
    if (!res.ok) return relayError(res);
    return Response.json((await res.json()).map(withImageUrls));
  });
}

/** Generates a design (Claude plans it, Stable Diffusion renders it) and saves it. */
export async function POST(request: Request) {
  return withUser(async (user) => {
    const form = await request.formData();
    const res = await backendFetch(user, "/v1/designs", { method: "POST", body: form, signal: request.signal });
    if (!res.ok) return relayError(res);
    return Response.json(withImageUrls(await res.json()), { status: 201 });
  });
}
