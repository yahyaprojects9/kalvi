import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { assertRealDatabaseUrl, env } from "../src/config/env.js";

const { Client } = pg;
const migrations = [
  "20260601000000_student_app_supabase.sql",
  "20260604000000_anonymous_complaint_reply_notifications.sql",
  "20260605000000_feedback_tracking_read_state.sql",
].map((file) => resolve(env.backendRoot, "supabase/migrations", file));

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
  for (const migration of migrations) {
    const sql = await readFile(migration, "utf8");
    await client.query(sql);
    console.log(`PASS migration applied: ${migration.split(/[\\/]/).pop()}`);
  }
  await client.query("notify pgrst, 'reload schema'");
} catch (error) {
  console.error("FAIL migration failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
