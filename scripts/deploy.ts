// Runs on the hosting platform before each build: create/upgrade tables, add sample products if empty.
// Skipped when no DATABASE_URL is set (so a deploy without a database still builds).
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[deploy] DATABASE_URL not set: skipping migrations and seed.");
} else {
  execSync("npx tsx scripts/migrate.ts", { stdio: "inherit" });
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
}
