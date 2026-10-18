// Finds the Postgres connection string. Hosting integrations name it differently
// (Vercel + Neon may add a prefix such as STORAGE_DATABASE_URL), so accept the common variants.
export function databaseUrl(): string | undefined {
  const env = process.env;
  const direct = env.DATABASE_URL || env.POSTGRES_URL;
  if (direct) return direct;
  const key = Object.keys(env).find((k) => /_(DATABASE_URL|POSTGRES_URL)$/.test(k) && env[k]);
  return key ? env[key] : undefined;
}

// On a hosting platform there is no writable disk for the local file database.
export const onHostingPlatform = () => !!(process.env.VERCEL || process.env.NETLIFY || process.env.RENDER);
