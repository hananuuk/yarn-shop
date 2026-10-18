// Runs on the hosting platform before each build: create/upgrade tables, add sample products if empty.
// Skipped when no DATABASE_URL is set (so a deploy without a database still builds).
import { execSync } from "node:child_process";
import { databaseUrl } from "../src/db/url";

const url = databaseUrl();
if (!url) {
  console.log("[deploy] No database URL found: skipping migrations and seed.");
} else {
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx tsx scripts/migrate.ts", { stdio: "inherit", env });
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit", env });
}
