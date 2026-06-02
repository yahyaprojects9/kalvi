import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { enableLocalTlsFallback, env } from "../src/config/env.js";

const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => { throw new Error(message); };

if (!env.supabaseUrl || !env.supabaseAnonKey) fail("SUPABASE_URL and SUPABASE_ANON_KEY are required");
enableLocalTlsFallback();
const admin = createClient(env.supabaseUrl, env.supabaseAnonKey);
const student = createClient(env.supabaseUrl, env.supabaseAnonKey);
const service = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
const cleanup = { feedback: [], problems: [], notifications: [], events: [], students: [], users: [] };

try {
  const adminLogin = await admin.auth.signInWithPassword({ email: "admin@kalvi.test", password: "admin123" });
  if (adminLogin.error) fail(`admin login failed: ${adminLogin.error.message}`);
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", adminLogin.data.user.id).eq("role", "admin").single();
  if (!role) fail("admin role missing");
  pass("admin direct Supabase login");

  const kaviLogin = await student.auth.signInWithPassword({ email: "kavi@kalvi.test", password: "student123" });
  if (kaviLogin.error) fail(`student login failed: ${kaviLogin.error.message}`);
  const { data: kavi, error: kaviError } = await student.from("students").select("*").eq("auth_user_id", kaviLogin.data.user.id).single();
  if (kaviError || !kavi) fail("student profile read failed");
  pass("student direct Supabase login/profile");

  const signupClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
  const signupEmail = `qastudent${Date.now()}@example.com`;
  let signup = await signupClient.auth.signUp({
    email: signupEmail,
    password: "student123",
    options: { data: { full_name: "QA Direct Signup", role: "student" } },
  });
  if (signup.error?.message?.toLowerCase().includes("rate limit")) {
    const created = await service.auth.admin.createUser({
      email: signupEmail,
      password: "student123",
      email_confirm: true,
      user_metadata: { full_name: "QA Direct Signup", role: "student" },
    });
    if (created.error) fail(`student signup fallback failed: ${created.error.message}`);
    cleanup.users.push(created.data.user.id);
    signup = await signupClient.auth.signInWithPassword({ email: signupEmail, password: "student123" });
  }
  if (signup.error || !signup.data.user) fail(`student signup failed: ${signup.error?.message ?? "missing user"}`);
  if (!cleanup.users.includes(signup.data.user.id)) cleanup.users.push(signup.data.user.id);
  const { data: signupStudent, error: signupStudentError } = await signupClient.from("students").insert({
    auth_user_id: signup.data.user.id,
    full_name: "QA Direct Signup",
    gender: "male",
    mobile_number: `99${Date.now().toString().slice(-8)}`,
    school_name: "Kalvi Test School",
    class: "5",
    district: "Chennai",
    password_hash: "supabase-auth",
    language_preference: "ta",
  }).select("*").single();
  if (signupStudentError) fail(`student signup profile insert failed: ${signupStudentError.message}`);
  cleanup.students.push(signupStudent.id);
  const { error: signupRoleError } = await signupClient.from("user_roles").insert({ user_id: signup.data.user.id, role: "student" });
  if (signupRoleError) fail(`student signup role insert failed: ${signupRoleError.message}`);
  pass("student direct Supabase signup/profile/role");

  const { data: statsStudents, error: statsError } = await admin.from("students").select("id,class,district,gender");
  if (statsError || !statsStudents?.length) fail("admin stats read failed");
  pass("admin stats load");

  const { data: event, error: eventError } = await admin.from("events").insert({
    title: `Direct QA Event ${Date.now()}`,
    description: "Direct Supabase event",
    event_date: "2026-06-21",
    location: "Chennai",
    audience: "all",
    is_active: true,
  }).select("*").single();
  if (eventError) fail(`admin create event failed: ${eventError.message}`);
  cleanup.events.push(event.id);
  pass("admin create event");

  for (const klass of ["5", "10", "12"]) {
    const { data, error } = await student.from("events").select("*").eq("id", event.id).eq("is_active", true);
    if (error || !data?.length) fail(`created event not visible for Class ${klass}`);
    pass(`created event visible for Class ${klass}`);
  }

  const { data: feedback, error: feedbackError } = await student.from("feedback").insert({
    student_id: kavi.id,
    student_name: kavi.full_name,
    mobile_number: kavi.mobile_number,
    message: `Direct QA feedback ${Date.now()}`,
    category: "general",
    district: kavi.district,
    status: "new",
  }).select("*").single();
  if (feedbackError) fail(`student feedback insert failed: ${feedbackError.message}`);
  cleanup.feedback.push(feedback.id);
  pass("student submit feedback");

  const { data: adminFeedback } = await admin.from("feedback").select("*").eq("id", feedback.id).single();
  if (!adminFeedback) fail("admin cannot see feedback");
  pass("admin see feedback");

  const { data: problem, error: problemError } = await student.from("student_problems").insert({
    student_id: kavi.id,
    name: kavi.full_name,
    class: kavi.class,
    district: kavi.district,
    title: "Direct QA complaint",
    description: "Direct Supabase complaint",
    problem_description: "Direct Supabase complaint",
    category: "General",
    status: "open",
  }).select("*").single();
  if (problemError) fail(`student complaint insert failed: ${problemError.message}`);
  cleanup.problems.push(problem.id);
  pass("student submit complaint");

  const { data: adminProblem } = await admin.from("student_problems").select("*").eq("id", problem.id).single();
  if (!adminProblem) fail("admin cannot see complaint");
  pass("admin see complaint");

  const { data: note, error: noteError } = await admin.from("notifications").insert({
    title: `Direct QA Notice ${Date.now()}`,
    message: "Direct Supabase notification",
    target_type: "all",
    is_active: true,
  }).select("*").single();
  if (noteError) fail(`admin create notification failed: ${noteError.message}`);
  cleanup.notifications.push(note.id);
  pass("admin create notification");

  const { data: studentNotes } = await student.from("notifications").select("*").eq("id", note.id).eq("is_active", true);
  if (!studentNotes?.length) fail("student cannot see notification");
  pass("student see notification");

  const frontendFiles = [
    "frontend/src/lib/api.ts",
    "admin-dashboard/tamil-kalvi-monitor-main/frontend/src/lib/admin-api.ts",
    "admin-dashboard/tamil-kalvi-monitor-main/frontend/.env",
  ];
  for (const file of frontendFiles) {
    const text = await readFile(resolve(env.backendRoot, "..", file), "utf8");
    if (/SERVICE_ROLE|DATABASE_URL|SUPABASE_DB_URL|localhost:4000|VITE_API_URL/.test(text)) fail(`frontend backend/secret reference found in ${file}`);
  }
  pass("frontends do not use localhost backend or expose service/db keys");
} catch (error) {
  console.error("FAIL direct Supabase flow");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  for (const id of cleanup.feedback) await service.from("feedback").delete().eq("id", id);
  for (const id of cleanup.problems) await service.from("student_problems").delete().eq("id", id);
  for (const id of cleanup.notifications) await service.from("notifications").delete().eq("id", id);
  for (const id of cleanup.events) await service.from("events").delete().eq("id", id);
  for (const id of cleanup.students) await service.from("students").delete().eq("id", id);
  for (const id of cleanup.users) await service.auth.admin.deleteUser(id);
}
