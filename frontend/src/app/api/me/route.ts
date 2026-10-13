import { backendFetch, relayError, withUser } from "@/lib/backend";

/** The signed-in user's profile and remaining design allowance. */
export async function GET() {
  return withUser(async (user) => {
    const res = await backendFetch(user, "/v1/me");
    return res.ok ? Response.json(await res.json()) : relayError(res);
  });
}
