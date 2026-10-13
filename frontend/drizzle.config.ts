import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Neon when DATABASE_URL is set, otherwise the local PGlite database.
  ...(url ? { dbCredentials: { url } } : { driver: "pglite", dbCredentials: { url: "./data/pglite" } }),
  // The production database also holds the backend's tables; leave them alone.
  tablesFilter: ["user", "session", "account", "verification"],
});
