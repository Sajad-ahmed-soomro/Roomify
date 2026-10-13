import "server-only";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

/**
 * Postgres everywhere: Neon (DATABASE_URL) when deployed, and PGlite — an
 * embedded Postgres stored in ./data/pglite — for local development.
 */
function createDb() {
  if (process.env.DATABASE_URL) {
    return drizzlePg(process.env.DATABASE_URL, { schema });
  }
  return drizzlePglite("./data/pglite", { schema }) as unknown as ReturnType<typeof drizzlePg<typeof schema>>;
}

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };
export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;
