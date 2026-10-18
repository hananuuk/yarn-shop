import * as schema from "./schema";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

// One database handle for the whole app.
// - DATABASE_URL set   -> real Postgres (production, or local Postgres if you prefer)
// - DATABASE_URL empty -> PGlite: Postgres compiled to WASM, stored in ./data/pglite. Zero setup.
export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const g = globalThis as unknown as { __db?: Promise<DB> };

async function create(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url, max: 5 });
    return drizzle(pool, { schema }) as unknown as DB;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(process.env.PGLITE_DIR || "./data/pglite");
  return drizzle(client, { schema }) as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!g.__db) g.__db = create();
  return g.__db;
}

export { schema };
