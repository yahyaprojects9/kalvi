import bcrypt from "bcrypt";
import { createServer } from "../src/server.js";
import { getSupabase } from "../src/config/supabase.js";
import { assertRealSupabaseCredentials } from "../src/config/env.js";

const testStudent = {
  full_name: "Test Student",
  gender: "male",
  mobile_number: "9000010099",
  password: "student123",
  school_name: "Kalvi Test School",
  class: "5",
  district: "Chennai",
};

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function cleanupTestStudent(supabase) {
  const { data: existing, error } = await supabase
    .from("students")
    .select("id")
    .eq("mobile_number", testStudent.mobile_number)
    .maybeSingle();
  if (error) throw error;
  if (!existing) return;

  const { error: deleteError } = await supabase.from("students").delete().eq("id", existing.id);
  if (deleteError) throw deleteError;
  pass("removed existing test student before verification");
}

async function main() {
  assertRealSupabaseCredentials();
  const supabase = getSupabase();
  await cleanupTestStudent(supabase);

  const app = createServer();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const signup = await request(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: testStudent,
    });
    if (signup.response.status !== 201) {
      throw new Error(`Signup failed: ${signup.response.status} ${signup.payload?.error ?? ""}`);
    }
    if (signup.payload?.data?.student?.password_hash) throw new Error("Signup response exposed password_hash");
    pass("signup API created test student without exposing password_hash");

    const { data: row, error: readError } = await supabase
      .from("students")
      .select("*")
      .eq("mobile_number", testStudent.mobile_number)
      .single();
    if (readError) throw readError;
    if (!row) throw new Error("Test student was not inserted");
    if (row.password_hash === testStudent.password) throw new Error("Password was stored in plain text");
    if (!row.password_hash?.startsWith("$2")) throw new Error("Password hash does not look like bcrypt");
    if (!(await bcrypt.compare(testStudent.password, row.password_hash))) {
      throw new Error("Bcrypt password comparison failed");
    }
    pass("student row exists with bcrypt password hash");

    const duplicate = await request(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: testStudent,
    });
    if (duplicate.response.status !== 409) {
      throw new Error(`Duplicate signup did not return 409: ${duplicate.response.status}`);
    }
    if (!String(duplicate.payload?.error ?? "").toLowerCase().includes("mobile")) {
      throw new Error("Duplicate signup did not return a clear mobile-number error");
    }
    pass("duplicate mobile signup returns clear error");

    const wrongPassword = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: {
        mobile_number: testStudent.mobile_number,
        password: "wrong123",
      },
    });
    if (wrongPassword.response.status !== 401) {
      throw new Error(`Wrong password did not return 401: ${wrongPassword.response.status}`);
    }
    pass("wrong password is rejected clearly");

    const invalidMobile = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: {
        mobile_number: "12345",
        password: testStudent.password,
      },
    });
    if (invalidMobile.response.status !== 400) {
      throw new Error(`Invalid mobile did not return 400: ${invalidMobile.response.status}`);
    }
    if (!String(invalidMobile.payload?.error ?? "").toLowerCase().includes("10-digit")) {
      throw new Error("Invalid mobile did not return a clear validation error");
    }
    pass("invalid mobile number is rejected clearly");

    const login = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: {
        mobile_number: testStudent.mobile_number,
        password: testStudent.password,
      },
    });
    if (!login.response.ok) {
      throw new Error(`Login failed: ${login.response.status} ${login.payload?.error ?? ""}`);
    }
    if (!login.payload?.data?.token) throw new Error("Login did not return a session token");
    if (login.payload?.data?.student?.password_hash) throw new Error("Login response exposed password_hash");
    pass("login succeeds without exposing password_hash");

    const token = login.payload.data.token;
    const { data: session, error: sessionError } = await supabase
      .from("student_sessions")
      .select("id, student_id, login_time")
      .eq("id", token)
      .single();
    if (sessionError) throw sessionError;
    if (session.student_id !== row.id) throw new Error("Session row is not linked to test student");
    pass("login creates linked student_sessions record");

    const me = await request(baseUrl, "/api/auth/me", { token });
    if (!me.response.ok) throw new Error(`Auth me failed: ${me.response.status}`);
    if (me.payload?.data?.student?.password_hash) throw new Error("Auth me response exposed password_hash");
    if (me.payload?.data?.student?.full_name !== testStudent.full_name) {
      throw new Error("Auth me did not return the signed-up student");
    }
    pass("safe logged-in student profile returned");

    console.log("PASS auth flow verification complete");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  fail("auth flow verification failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
