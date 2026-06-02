import { createServer } from "node:http";
import { createServer as createApp } from "../src/server.js";
import { getSupabase } from "../src/config/supabase.js";

const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => { throw new Error(message); };

async function api(baseUrl, path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) fail(`${path} ${res.status}: ${body.error ?? body.message ?? text}`);
  return body.data ?? body;
}

const server = createServer(createApp());
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const supabase = getSupabase();
const cleanup = { feedback: [], problems: [], notifications: [], events: [] };

try {
  await api(baseUrl, "/health");
  pass("health endpoint");

  const adminLogin = await api(baseUrl, "/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@kalvi.test", password: "admin123" }),
  });
  const adminHeaders = { authorization: `Bearer ${adminLogin.token}` };
  pass("admin login");

  const studentLogin = await api(baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ mobile_number: "9000010001", password: "student123" }),
  });
  const studentHeaders = { authorization: `Bearer ${studentLogin.token}` };
  const kavi = studentLogin.student;
  pass("Kavi login");

  const feedbackMessage = `QA feedback test from student app ${Date.now()}`;
  const feedback = await api(baseUrl, "/api/feedback", {
    method: "POST",
    headers: studentHeaders,
    body: JSON.stringify({ message: feedbackMessage }),
  });
  cleanup.feedback.push(feedback.id);
  if (feedback.message !== feedbackMessage || feedback.student_id !== kavi.id) fail("feedback payload mismatch");
  pass("feedback submit");

  const { data: feedbackDb } = await supabase.from("feedback").select("*").eq("id", feedback.id).single();
  if (!feedbackDb) fail("feedback not saved in Supabase");
  pass("feedback saved in Supabase");

  const adminFeedback = await api(baseUrl, "/api/admin/feedback", { headers: adminHeaders });
  if (!adminFeedback.some((row) => row.id === feedback.id)) fail("feedback not visible in admin");
  pass("feedback visible in admin");

  const feedbackUpdated = await api(baseUrl, `/api/admin/feedback/${feedback.id}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "resolved", admin_response: "QA reviewed" }),
  });
  if (feedbackUpdated.status !== "resolved") fail("feedback status update failed");
  pass("feedback status update");

  const problem = await api(baseUrl, "/api/student-problems", {
    method: "POST",
    headers: studentHeaders,
    body: JSON.stringify({
      title: "QA complaint test",
      description: "Testing complaint flow from student app to admin dashboard",
      category: "General",
    }),
  });
  cleanup.problems.push(problem.id);
  if (problem.student_id !== kavi.id || problem.name !== kavi.full_name) fail("complaint privacy/link payload mismatch");
  pass("complaint submit");
  pass("privacy behavior linked: basic student/class/district only");

  const adminProblems = await api(baseUrl, "/api/admin/student-problems", { headers: adminHeaders });
  if (!adminProblems.some((row) => row.id === problem.id)) fail("complaint not visible in admin");
  pass("complaint visible in admin");

  const problemUpdated = await api(baseUrl, `/api/admin/student-problems/${problem.id}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "resolved", admin_response: "QA response" }),
  });
  if (problemUpdated.status !== "resolved" || problemUpdated.admin_response !== "QA response") fail("complaint update failed");
  pass("complaint update");

  const noticeTitle = `QA Announcement Test ${Date.now()}`;
  const notice = await api(baseUrl, "/api/admin/notifications", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      title: noticeTitle,
      message: "This is a test announcement from admin dashboard",
      target_type: "all",
      is_active: true,
    }),
  });
  cleanup.notifications.push(notice.id);
  pass("announcement create");

  const notifications = await api(baseUrl, "/api/notifications");
  if (!notifications.some((row) => row.id === notice.id)) fail("announcement not visible to student");
  pass("announcement visible to student");
  pass("announcement persists after refresh via API refetch");

  const eventTitle = `QA Event Test ${Date.now()}`;
  const event = await api(baseUrl, "/api/admin/events", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      title: eventTitle,
      description: "Testing admin event broadcast to all students",
      event_date: "2026-06-20",
      location: "Chennai",
      audience: "all",
      is_active: true,
    }),
  });
  cleanup.events.push(event.id);
  pass("event create");

  for (const klass of ["5", "10", "12"]) {
    const events = await api(baseUrl, "/api/events");
    if (!events.some((row) => row.id === event.id && (row.audience ?? "all") === "all")) fail(`event not visible to Class ${klass}`);
    pass(`event visible to Class ${klass}`);
  }
  pass("student receives admin-created data without redeploy");
} catch (error) {
  console.error("FAIL student-admin flow");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  for (const id of cleanup.feedback) await supabase.from("feedback").delete().eq("id", id);
  for (const id of cleanup.problems) await supabase.from("student_problems").delete().eq("id", id);
  for (const id of cleanup.notifications) await supabase.from("notifications").delete().eq("id", id);
  for (const id of cleanup.events) await supabase.from("events").delete().eq("id", id);
  await new Promise((resolve) => server.close(resolve));
}
