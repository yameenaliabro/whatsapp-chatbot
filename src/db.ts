import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cachedSql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (cachedSql) {
    return cachedSql;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Add your Neon connection string to .env.");
  }

  cachedSql = neon(databaseUrl);
  return cachedSql;
}
