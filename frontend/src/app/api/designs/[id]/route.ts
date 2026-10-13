import { backendFetch, relayError, withUser } from "@/lib/backend";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/designs/[id]">) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const res = await backendFetch(user, `/v1/designs/${encodeURIComponent(id)}`, { method: "DELETE" });
    return res.ok ? new Response(null, { status: 204 }) : relayError(res);
  });
}
