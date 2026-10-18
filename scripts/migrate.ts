// Applies database migrations from ./drizzle. Works for both PGlite (local) and Postgres.
import { loadEnv } from "./env";
loadEnv();

async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url });
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    await pool.end();
  } else {
    const fs = await import("node:fs");
    fs.mkdirSync("./data", { recursive: true });
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = new PGlite(process.env.PGLITE_DIR || "./data/pglite");
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    await client.close();
  }
  console.log("Migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
