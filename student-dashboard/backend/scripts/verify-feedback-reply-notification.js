/**
 * Verifies: mock student submits feedback → admin reply saved →
 * student-targeted notification created → student API returns it for that student id.
 */
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const stamp = Date.now();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BASE_URL = String(process.env.API_BASE_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const cleanup = { feedback: [], notifications: [] };

function fail(msg, detail) {
  console.error(`FAIL ${msg}${detail ? `: ${detail}` : ""}`);
  process.exit(1);
}

function pass(msg) {
  console.log(`PASS ${msg}`);
}

function feedbackMessage(status, reply) {
  const normalized = String(status ?? "").toLowerCase();
  const base =
    normalized === "resolved"
      ? "Your feedback has been resolved."
      : normalized === "reviewed"
        ? "Your feedback has been reviewed."
        : "Your feedback status has been updated.";
  return reply?.trim() ? `${base}\n\nAdmin reply: ${reply.trim()}` : base;
}

async function api(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) fail(`${options.method ?? "GET"} ${path}`, payload.error ?? response.statusText);
  return payload;
}

async function columns(table) {
  const { rows } = await pool.query(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return new Set(rows.map((row) => row.column_name));
}

async function updateRow(table, id, payload) {
  const allowed = await columns(table);
  const entries = Object.entries({ ...payload, updated_at: new Date().toISOString() }).filter(([key]) => allowed.has(key));
  const assignments = entries.map(([key], index) => `"${key}" = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  const { rows } = await pool.query(
    `update public.${table} set ${assignments.join(", ")} where id = $${values.length + 1} returning *`,
    [...values, id],
  );
  return rows[0];
}

async function insertRow(table, payload) {
  const allowed = await columns(table);
  const entries = Object.entries(payload).filter(([key]) => allowed.has(key));
  const names = entries.map(([key]) => `"${key}"`);
  const params = entries.map((_, index) => `$${index + 1}`);
  const values = entries.map(([, value]) => value);
  const { rows } = await pool.query(
    `insert into public.${table} (${names.join(", ")}) values (${params.join(", ")}) returning *`,
    values,
  );
  return rows[0];
}

async function main() {
  const health = await api("/health");
  if (health.status !== "ok") fail("backend health");

  const { rows: students } = await pool.query(
    "select id, class, district, mobile_number from public.students where mobile_number = $1 limit 1",
    ["9000010001"],
  );
  const student = students[0];
  if (!student?.id) fail("demo student missing", "9000010001");

  const feedbackRes = await api("/api/feedback", {
    method: "POST",
    headers: { Authorization: "Bearer mock-kavi" },
    body: { message: `Reply notification test ${stamp}` },
  });
  const feedback = feedbackRes.data ?? feedbackRes;
  cleanup.feedback.push(feedback.id);
  if (feedback.student_id !== student.id) {
    fail("feedback student_id mismatch", `${feedback.student_id} vs ${student.id}`);
  }
  pass("mock student submitted feedback");

  const reply = `Admin test reply ${stamp}`;
  const updated = await updateRow("feedback", feedback.id, { status: "reviewed", admin_response: reply });
  if (updated?.admin_response !== reply) fail("admin feedback reply save");
  pass("admin saved feedback reply");

  const notice = await insertRow("notifications", {
    title: "Admin replied to your feedback",
    message: feedbackMessage(updated.status, updated.admin_response),
    target_type: "student",
    target_value: String(updated.student_id),
    target_class: student.class,
    district: updated.district ?? student.district,
    is_active: true,
  });
  cleanup.notifications.push(notice.id);
  pass("student-targeted notification created");

  const me = await api("/api/students/me", { headers: { Authorization: "Bearer mock-kavi" } });
  const profileId = me.data?.id ?? me.data?.student?.id;
  if (profileId !== student.id) fail("mock /api/students/me id", `${profileId} vs ${student.id}`);
  pass("mock student profile uses database uuid");

  const noticesRes = await api(`/api/notifications?target_class=${encodeURIComponent(student.class ?? "5")}`);
  const notices = noticesRes.data ?? noticesRes;
  const visible = notices.filter(
    (row) =>
      row.target_type === "student" &&
      String(row.target_value).toLowerCase() === String(profileId).toLowerCase() &&
      String(row.message ?? "").includes(reply),
  );
  if (!visible.some((row) => row.id === notice.id)) fail("student notifications API missing admin reply");
  pass("student notifications API shows feedback reply");

  console.log("All feedback reply notification checks passed.");
}

main()
  .catch((error) => fail("unexpected error", error.message))
  .finally(async () => {
    for (const id of cleanup.notifications) await pool.query("delete from public.notifications where id = $1", [id]);
    for (const id of cleanup.feedback) await pool.query("delete from public.feedback where id = $1", [id]);
    await pool.end();
  });
