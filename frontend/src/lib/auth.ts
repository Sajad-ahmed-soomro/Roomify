import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";

const https = (host?: string) => (host ? `https://${host}` : undefined);

/** Public address of the app: BETTER_AUTH_URL, else Vercel's production domain. */
const baseURL = process.env.BETTER_AUTH_URL?.replace(/\/$/, "") || https(process.env.VERCEL_PROJECT_PRODUCTION_URL);

/**
 * Origins allowed to call the auth API. Besides baseURL, trust this project's own Vercel
 * addresses (set automatically by Vercel) so opening the site via its production domain
 * or a deployment URL doesn't fail with "Invalid origin". Exact hosts only — never
 * "*.vercel.app", which would trust every Vercel site.
 */
const trustedOrigins = [
  baseURL,
  https(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  https(process.env.VERCEL_BRANCH_URL),
  https(process.env.VERCEL_URL),
  "http://localhost:3000",
].filter((o): o is string => !!o);

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [nextCookies()],
});

/** Current session for route handlers and server components, or null. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
