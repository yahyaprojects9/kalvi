import dotenv from "dotenv";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const BASE_URL = "http://127.0.0.1:4000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const stamp = Date.now();
const cleanup = {
  complaints: [],
  events: [],
  feedback: [],
  materials: [],
  notifications: [],
  videos: [],
};
const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`PASS ${name}`);
}

function fail(name, detail) {
  const message = detail ? `${name}: ${detail}` : name;
  results.push({ name, ok: false, detail });
  throw new Error(message);
}

async function api(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) fail(`HTTP ${path}`, payload.error ?? payload.message ?? response.statusText);
  return payload;
}

async function columns(table) {
  const { rows } = await pool.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = $1
    `,
    [table],
  );
  return new Set(rows.map((row) => row.column_name));
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
  cleanup[table]?.push(rows[0].id);
  return rows[0];
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

async function deleteRow(table, id) {
  await pool.query(`delete from public.${table} where id = $1`, [id]);
}

function feedbackMessage(status, reply) {
  const base = status === "resolved" ? "Your feedback has been resolved." : "Your feedback has been reviewed.";
  return reply ? `${base}\n\nAdmin reply: ${reply}` : base;
}

function complaintMessage(status, reply) {
  const base = status === "resolved" ? "Your anonymous complaint issue has been resolved." : "Your anonymous complaint is being reviewed.";
  return reply ? `${base}\n\nAdmin reply: ${reply}` : base;
}

async function notifyStudent(title, message, student, extra = {}) {
  return await insertRow("notifications", {
    title,
    message,
    target_type: "student",
    target_value: student.id,
    target_class: student.class,
    district: student.district,
    is_active: true,
    ...extra,
  });
}

async function main() {
  const health = await api("/health");
  if (health.status !== "ok") fail("backend health");
  pass("backend health");

  const { rows: studentRows } = await pool.query("select * from public.students where mobile_number = $1 limit 1", ["9000010001"]);
  const student = studentRows[0];
  if (!student?.id) fail("demo student lookup", "9000010001 not found");
  pass("demo student lookup");

  const auth = await supabase.auth.signInWithPassword({ email: "kavi@kalvi.test", password: "student123" });
  if (auth.error || !auth.data.session?.access_token) fail("real student login", auth.error?.message);
  const realToken = auth.data.session.access_token;
  pass("real student login");

  const adminAuth = await supabase.auth.signInWithPassword({ email: "admin@kalvi.test", password: "admin123" });
  if (adminAuth.error || !adminAuth.data.user?.id) fail("admin login", adminAuth.error?.message);
  const { data: adminRole, error: adminRoleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", adminAuth.data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (adminRoleError || !adminRole) fail("admin role check", adminRoleError?.message ?? "role missing");
  pass("admin login and role");

  const { data: adminStudents, error: adminStudentsError } = await supabase
    .from("students")
    .select("id,full_name,mobile_number,class,district")
    .limit(1);
  if (adminStudentsError || !adminStudents?.length) fail("direct admin students list", adminStudentsError?.message ?? "no rows");
  pass("direct admin students list");

  const { data: directNotice, error: directNoticeError } = await supabase
    .from("notifications")
    .insert({ title: `Direct admin announcement ${stamp}`, message: "Direct admin announcement", target_type: "all", is_active: true })
    .select("*")
    .single();
  if (directNoticeError) fail("direct admin announcement create", directNoticeError.message);
  cleanup.notifications.push(directNotice.id);
  const { data: directNoticeEdit, error: directNoticeEditError } = await supabase
    .from("notifications")
    .update({ message: "Direct admin announcement edited", is_active: false })
    .eq("id", directNotice.id)
    .select("*")
    .single();
  if (directNoticeEditError || directNoticeEdit.is_active !== false) fail("direct admin announcement edit/delete", directNoticeEditError?.message);
  await updateRow("notifications", directNotice.id, { is_active: true });
  pass("direct admin announcement create/edit/delete");

  const { data: directEvent, error: directEventError } = await supabase
    .from("events")
    .insert({
      title: `Direct admin event ${stamp}`,
      description: "Direct admin event",
      event_date: "2026-06-20",
      location: "Direct Hall",
      venue: "Direct Hall",
      target_class: student.class ?? "5",
      audience: "class",
      category: "general",
      is_active: true,
    })
    .select("*")
    .single();
  if (directEventError) fail("direct admin event create", directEventError.message);
  cleanup.events.push(directEvent.id);
  const { data: directEventEdit, error: directEventEditError } = await supabase
    .from("events")
    .update({ title: `Direct admin event edited ${stamp}`, is_active: false })
    .eq("id", directEvent.id)
    .select("*")
    .single();
  if (directEventEditError || directEventEdit.is_active !== false) fail("direct admin event edit/delete", directEventEditError?.message);
  await updateRow("events", directEvent.id, { is_active: true });
  pass("direct admin event create/edit/delete");

  const { data: directMaterial, error: directMaterialError } = await supabase
    .from("materials")
    .insert({
      title: `Direct admin material ${stamp}`,
      class: student.class ?? "5",
      subject: "Tamil",
      material_type: "book",
      type: "book",
      file_url: "https://example.com/direct-admin.pdf",
      url: "https://example.com/direct-admin.pdf",
      is_active: true,
    })
    .select("*")
    .single();
  if (directMaterialError) fail("direct admin material create", directMaterialError.message);
  cleanup.materials.push(directMaterial.id);
  const { data: directMaterialEdit, error: directMaterialEditError } = await supabase
    .from("materials")
    .update({ title: `Direct admin material edited ${stamp}`, is_active: false })
    .eq("id", directMaterial.id)
    .select("*")
    .single();
  if (directMaterialEditError || directMaterialEdit.is_active !== false) fail("direct admin material edit/delete", directMaterialEditError?.message);
  await updateRow("materials", directMaterial.id, { is_active: true });
  pass("direct admin material create/edit/delete");

  const { data: directVideo, error: directVideoError } = await supabase
    .from("videos")
    .insert({
      title: `Direct admin video ${stamp}`,
      class: student.class ?? "5",
      subject: "Tamil",
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      is_active: true,
    })
    .select("*")
    .single();
  if (directVideoError) fail("direct admin video create", directVideoError.message);
  cleanup.videos.push(directVideo.id);
  const { data: directVideoEdit, error: directVideoEditError } = await supabase
    .from("videos")
    .update({ title: `Direct admin video edited ${stamp}`, is_active: false })
    .eq("id", directVideo.id)
    .select("*")
    .single();
  if (directVideoEditError || directVideoEdit.is_active !== false) fail("direct admin video edit/delete", directVideoEditError?.message);
  await updateRow("videos", directVideo.id, { is_active: true });
  pass("direct admin video create/edit/delete");

  for (const path of ["/api/materials", "/api/videos", "/api/events", "/api/notifications"]) {
    const payload = await api(path);
    if (!Array.isArray(payload.data)) fail(`student content ${path}`, "data is not an array");
    pass(`student content ${path}`);
  }

  const realFeedback = await api("/api/feedback", {
    method: "POST",
    headers: { Authorization: `Bearer ${realToken}` },
    body: JSON.stringify({ message: `Audit real feedback ${stamp}` }),
  });
  cleanup.feedback.push(realFeedback.data.id);
  if (!/^[0-9a-f-]{36}$/i.test(realFeedback.data.student_id)) fail("real feedback uuid");
  pass("real student feedback submit");

  const mockFeedback = await api("/api/feedback", {
    method: "POST",
    headers: { Authorization: "Bearer mock-kavi" },
    body: JSON.stringify({ message: `Audit mock feedback ${stamp}` }),
  });
  cleanup.feedback.push(mockFeedback.data.id);
  if (!/^[0-9a-f-]{36}$/i.test(mockFeedback.data.student_id)) fail("mock feedback uuid");
  pass("mock student feedback submit");

  const myFeedback = await api("/api/feedback/my", { headers: { Authorization: "Bearer mock-kavi" } });
  if (!myFeedback.data.some((row) => row.id === mockFeedback.data.id)) fail("mock feedback history");
  pass("student feedback history");

  const complaintBody = {
    student_id: "demo-kavi",
    mobile_number: "9000010001",
    complaint_type: "other",
    subject: `Audit complaint ${stamp}`,
    description: "Audit complaint description",
    district: student.district ?? "Chennai",
    school_name: student.school_name ?? "Kalvi Test School",
    class: student.class ?? "5",
  };
  const mockComplaint = await api("/api/complaints", {
    method: "POST",
    headers: { Authorization: "Bearer mock-kavi" },
    body: JSON.stringify(complaintBody),
  });
  cleanup.complaints.push(mockComplaint.data.id);
  const { rows: complaintRows } = await pool.query("select * from public.complaints where id = $1", [mockComplaint.data.id]);
  if (!/^[0-9a-f-]{36}$/i.test(complaintRows[0]?.student_id ?? "")) fail("mock complaint uuid");
  pass("mock complaint submit resolves uuid");

  const realComplaint = await api("/api/complaints", {
    method: "POST",
    headers: { Authorization: `Bearer ${realToken}` },
    body: JSON.stringify({ ...complaintBody, student_id: student.id, subject: `Audit real complaint ${stamp}` }),
  });
  cleanup.complaints.push(realComplaint.data.id);
  pass("real complaint submit");

  const feedbackReply = `Audit feedback reply ${stamp}`;
  const updatedFeedback = await updateRow("feedback", mockFeedback.data.id, { status: "resolved", admin_response: feedbackReply });
  if (updatedFeedback.status !== "resolved" || updatedFeedback.admin_response !== feedbackReply) fail("admin feedback reply save");
  const feedbackNotice = await notifyStudent("Feedback status update", feedbackMessage("resolved", feedbackReply), student);
  pass("admin can reply/save feedback");

  const complaintReply = `Audit complaint reply ${stamp}`;
  const updatedComplaint = await updateRow("complaints", mockComplaint.data.id, { status: "resolved", admin_response: complaintReply });
  if (updatedComplaint.status !== "resolved" || updatedComplaint.admin_response !== complaintReply) fail("admin complaint reply save");
  const complaintNotice = await notifyStudent("Anonymous complaint status update", complaintMessage("resolved", complaintReply), student);
  pass("admin can reply/save complaint");

  const notices = await api("/api/notifications");
  const studentNotices = notices.data.filter((row) => row.target_type === "student" && row.target_value === student.id);
  if (!studentNotices.some((row) => row.id === feedbackNotice.id && row.message.includes(feedbackReply))) fail("student feedback notification visible");
  if (!studentNotices.some((row) => row.id === complaintNotice.id && row.message.includes(complaintReply))) fail("student complaint notification visible");
  pass("student receives feedback/complaint notifications");

  const announcement = await insertRow("notifications", {
    title: `Audit announcement ${stamp}`,
    message: "Audit announcement message",
    target_type: "all",
    is_active: true,
  });
  await updateRow("notifications", announcement.id, { message: "Audit announcement edited" });
  await updateRow("notifications", announcement.id, { is_active: false });
  const activeNotices = await api("/api/notifications");
  if (activeNotices.data.some((row) => row.id === announcement.id)) fail("deleted announcement hidden from students");
  await updateRow("notifications", announcement.id, { is_active: true });
  pass("admin announcement edit/delete/restore");

  const event = await insertRow("events", {
    title: `Audit event ${stamp}`,
    description: "Audit event",
    event_date: "2026-06-15",
    event_time: "10:00",
    location: "Audit Hall",
    venue: "Audit Hall",
    target_class: student.class ?? "5",
    audience: "class",
    category: "general",
    is_active: true,
  });
  await updateRow("events", event.id, { title: `Audit event edited ${stamp}` });
  await updateRow("events", event.id, { is_active: false });
  const activeEvents = await api("/api/events");
  if (activeEvents.data.some((row) => row.id === event.id)) fail("deleted event hidden from students");
  await updateRow("events", event.id, { is_active: true });
  pass("admin event add/edit/delete/restore");

  const material = await insertRow("materials", {
    title: `Audit material ${stamp}`,
    class: student.class ?? "5",
    subject: "Tamil",
    material_type: "book",
    type: "book",
    file_url: "https://example.com/audit.pdf",
    url: "https://example.com/audit.pdf",
    is_active: true,
  });
  await updateRow("materials", material.id, {
    title: `Audit material edited ${stamp}`,
    file_url: "https://example.com/audit-edited.pdf",
    url: "https://example.com/audit-edited.pdf",
  });
  await updateRow("materials", material.id, { is_active: false });
  const activeMaterials = await api("/api/materials");
  if (activeMaterials.data.some((row) => row.id === material.id)) fail("deleted material hidden from students");
  await updateRow("materials", material.id, { is_active: true });
  pass("admin material add/edit/delete/restore");

  const video = await insertRow("videos", {
    title: `Audit video ${stamp}`,
    class: student.class ?? "5",
    subject: "Tamil",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    is_active: true,
  });
  await updateRow("videos", video.id, { title: `Audit video edited ${stamp}`, video_url: "https://youtu.be/dQw4w9WgXcQ", url: "https://youtu.be/dQw4w9WgXcQ" });
  await updateRow("videos", video.id, { is_active: false });
  const activeVideos = await api("/api/videos");
  if (activeVideos.data.some((row) => row.id === video.id)) fail("deleted video hidden from students");
  await updateRow("videos", video.id, { is_active: true });
  pass("admin video add/edit/delete/restore");

  const { rows: recycleRows } = await pool.query(
    `
      select 'notifications' as type, id from public.notifications where is_active = false
      union all select 'events', id from public.events where is_active = false
      union all select 'materials', id from public.materials where is_active = false
      union all select 'videos', id from public.videos where is_active = false
    `,
  );
  if (!Array.isArray(recycleRows)) fail("recycle query");
  pass("admin recycle query works");

  const { rows: statsRows } = await pool.query(
    `
      select
        (select count(*) from public.students) as students,
        (select count(*) from public.feedback) as feedback,
        (select count(*) from public.complaints) as complaints,
        (select count(*) from public.materials where is_active = true) as materials,
        (select count(*) from public.videos where is_active = true) as videos,
        (select count(*) from public.events where is_active = true) as events
    `,
  );
  if (Number(statsRows[0].students) < 1) fail("admin stats");
  pass("admin stats data available");
}

async function cleanupRows() {
  for (const [table, ids] of Object.entries(cleanup)) {
    for (const id of ids.reverse()) {
      try {
        await deleteRow(table, id);
      } catch (error) {
        console.warn(`cleanup ${table} ${id}: ${error.message}`);
      }
    }
  }
}

try {
  await main();
} finally {
  await cleanupRows();
  await supabase.auth.signOut();
  await pool.end();
}

const failed = results.filter((result) => !result.ok);
if (failed.length) {
  process.exitCode = 1;
} else {
  console.log(`PASS full feature audit (${results.length} checks)`);
}
