import { createServer } from "node:http";
import { createServer as createApp } from "../src/server.js";
import { getSupabase } from "../src/config/supabase.js";

const pass = (m) => console.log(`PASS ${m}`);
const fail = (m) => { throw new Error(m); };

async function request(baseUrl, path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) fail(`${path} ${res.status}: ${body.error ?? text}`);
  return body.data ?? body;
}

const server = createServer(createApp());
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

try {
  const { error } = await getSupabase().from("admin_users").select("id", { head: true, count: "exact" });
  if (error) fail(`admin_users table missing: ${error.message}`);
  pass("admin_users table exists");

  const login = await request(baseUrl, "/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@kalvi.test", password: "admin123" }),
  });
  const auth = { Authorization: `Bearer ${login.token}` };
  pass("admin login works");

  await request(baseUrl, "/api/admin/me", { headers: auth });
  pass("admin me works");

  await request(baseUrl, "/api/admin/stats", { headers: auth });
  pass("admin stats works");

  await request(baseUrl, "/api/admin/students", { headers: auth });
  pass("students endpoint works");

  const stamp = Date.now();
  const event = await request(baseUrl, "/api/admin/events", {
    method: "POST", headers: auth,
    body: JSON.stringify({ title: `Verify Event ${stamp}`, description: "Admin verify", event_date: "2026-06-15", location: "Online", audience: "all", is_active: true }),
  });
  pass("event creation works");

  const studentEvents = await request(baseUrl, "/api/events");
  if (!studentEvents.some((row) => row.id === event.id)) fail("created event not visible in student /api/events");
  pass("created event appears in student /api/events");

  const feedback = await request(baseUrl, "/api/admin/feedback", { headers: auth });
  if (feedback[0]) await request(baseUrl, `/api/admin/feedback/${feedback[0].id}`, { method: "PATCH", headers: auth, body: JSON.stringify({ status: "reviewed", admin_response: "Reviewed" }) });
  pass("feedback read/update works");

  const problems = await request(baseUrl, "/api/admin/student-problems", { headers: auth });
  if (problems[0]) await request(baseUrl, `/api/admin/student-problems/${problems[0].id}`, { method: "PATCH", headers: auth, body: JSON.stringify({ status: "in_progress", admin_response: "Checking" }) });
  pass("complaint read/update works");

  const video = await request(baseUrl, "/api/admin/videos", { method: "POST", headers: auth, body: JSON.stringify({ title: `Verify Video ${stamp}`, class: "5", subject: "Tamil", video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ", is_active: true }) });
  await request(baseUrl, `/api/admin/videos/${video.id}`, { method: "PATCH", headers: auth, body: JSON.stringify({ title: `${video.title} Updated` }) });
  await request(baseUrl, `/api/admin/videos/${video.id}`, { method: "DELETE", headers: auth });
  pass("videos CRUD works");

  const material = await request(baseUrl, "/api/admin/materials", { method: "POST", headers: auth, body: JSON.stringify({ title: `Verify Book ${stamp}`, class: "5", subject: "Tamil", material_type: "book", file_url: "https://example.com/book.pdf", is_active: true }) });
  await request(baseUrl, `/api/admin/materials/${material.id}`, { method: "PATCH", headers: auth, body: JSON.stringify({ title: `${material.title} Updated` }) });
  await request(baseUrl, `/api/admin/materials/${material.id}`, { method: "DELETE", headers: auth });
  pass("materials CRUD works");

  const note = await request(baseUrl, "/api/admin/notifications", { method: "POST", headers: auth, body: JSON.stringify({ title: `Verify Notice ${stamp}`, message: "Notice", is_active: true }) });
  await request(baseUrl, `/api/admin/notifications/${note.id}`, { method: "PATCH", headers: auth, body: JSON.stringify({ message: "Updated" }) });
  await request(baseUrl, `/api/admin/notifications/${note.id}`, { method: "DELETE", headers: auth });
  pass("notification CRUD works");

  await request(baseUrl, `/api/admin/events/${event.id}`, { method: "DELETE", headers: auth });
} catch (error) {
  console.error("FAIL verify admin");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
}
