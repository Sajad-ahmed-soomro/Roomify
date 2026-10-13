import { backendFetch, relayError, withUser } from "@/lib/backend";

/** Streams a design's before/after image from the backend (owner only). */
export async function GET(_request: Request, ctx: RouteContext<"/api/designs/[id]/[kind]">) {
  const { id, kind } = await ctx.params;
  if (kind !== "before" && kind !== "after") return Response.json({ error: "Not found." }, { status: 404 });

  return withUser(async (user) => {
    const res = await backendFetch(user, `/v1/designs/${encodeURIComponent(id)}/${kind}`);
    if (!res.ok) return relayError(res);
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  });
}
