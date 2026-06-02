import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { assertRealDatabaseUrl, env } from "../src/config/env.js";

const { Client } = pg;
const migration = resolve(env.backendRoot, "supabase/migrations/20260601000000_student_app_supabase.sql");

try {
  assertRealDatabaseUrl();
} catch (error) {
  console.error(`FAIL ${error instanceof Error ? error.message : "DATABASE_URL is invalid"}`);
  process.exit(1);
}

const client = new Client({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
});

try {
  await client.connect();
  const sql = await readFile(migration, "utf8");
  await client.query(sql);
  await client.query("notify pgrst, 'reload schema'");
  console.log("PASS migration applied: 20260601000000_student_app_supabase.sql");
} catch (error) {
  console.error("FAIL migration failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
