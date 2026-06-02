import bcrypt from "bcrypt";
import pg from "pg";
import { getSupabase } from "../src/config/supabase.js";
import { assertRealDatabaseUrl, assertRealSupabaseCredentials, env } from "../src/config/env.js";

const { Client } = pg;

const requiredTables = [
  "students",
  "student_sessions",
  "materials",
  "videos",
  "events",
  "feedback",
  "student_problems",
  "notifications",
];

const mockMobiles = ["9000010001", "9000010002", "9000010003"];

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyDirectDatabaseTables() {
  const client = new Client({
    connectionString: env.databaseUrl,
    ssl: env.databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    pass("direct database connection");

    const { rows } = await client.query(
      `
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name = any($1::text[])
      `,
      [requiredTables],
    );
    const found = new Set(rows.map((row) => row.table_name));
    for (const table of requiredTables) {
      if (!found.has(table)) throw new Error(`Direct DB missing table: ${table}`);
      pass(`direct DB table exists: ${table}`);
    }

    await client.query("notify pgrst, 'reload schema'");
    pass("requested PostgREST schema reload");
  } finally {
    await client.end().catch(() => {});
  }
}

async function verifyApiTables(supabase) {
  await wait(1500);
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
    if (error) {
      throw new Error(`API schema cache cannot see ${table}: ${error.code ?? ""} ${error.message}`);
    }
    pass(`Supabase API table visible: ${table}`);
  }
}

try {
  assertRealSupabaseCredentials();
  assertRealDatabaseUrl();
  pass("required env variables loaded");

  await verifyDirectDatabaseTables();

  const supabase = getSupabase();
  await verifyApiTables(supabase);

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, full_name, mobile_number, password_hash")
    .in("mobile_number", mockMobiles);
  if (studentsError) throw studentsError;
  if ((students ?? []).length !== 3) throw new Error("Expected all three mock students");
  pass("three mock students exist");

  const kavi = students.find((student) => student.mobile_number === "9000010001");
  if (!kavi || !(await bcrypt.compare("student123", kavi.password_hash))) {
    throw new Error("Mock password comparison failed for Kavi");
  }
  pass("bcrypt login comparison for Kavi");

  const { data: feedback, error: insertError } = await supabase
    .from("feedback")
    .insert({
      student_id: kavi.id,
      student_name: kavi.full_name,
      mobile_number: kavi.mobile_number,
      message: "Verification feedback",
    })
    .select("*")
    .single();
  if (insertError) throw insertError;
  pass("insert test feedback");

  const { data: readBack, error: readError } = await supabase
    .from("feedback")
    .select("*")
    .eq("id", feedback.id)
    .single();
  if (readError || !readBack) throw readError ?? new Error("Feedback read-back failed");
  pass("read test feedback");

  const { error: deleteError } = await supabase.from("feedback").delete().eq("id", feedback.id);
  if (deleteError) throw deleteError;
  pass("delete test feedback");

  console.log("PASS Supabase verification complete");
} catch (error) {
  fail("Supabase verification failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
