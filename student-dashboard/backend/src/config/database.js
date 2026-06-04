import pg from "pg";
import { assertRealDatabaseUrl, enableLocalTlsFallback, env } from "./env.js";

let pool;

export function getDatabase() {
  assertRealDatabaseUrl();
  if (!pool) {
    enableLocalTlsFallback();
    pool = new pg.Pool({
      connectionString: env.databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}
