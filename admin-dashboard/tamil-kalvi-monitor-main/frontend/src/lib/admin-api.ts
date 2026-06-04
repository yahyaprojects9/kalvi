import { supabase } from "@/integrations/supabase/client";

const KEY = "kalvi_admin_auth";
export type AdminAuth = { token: string; admin: { id: string; name?: string; email: string; role: string } };

export function getAdminAuth(): AdminAuth | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
export function setAdminAuth(auth: AdminAuth) { localStorage.setItem(KEY, JSON.stringify(auth)); }
export function clearAdminAuth() { localStorage.removeItem(KEY); supabase.auth.signOut(); }

async function isAdmin(userId?: string) {
  if (!userId) return false;
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function requireAdmin() {
  const { data } = await supabase.auth.getUser();
  if (!data.user || !(await isAdmin(data.user.id))) throw new Error("Admin access is required");
  return data.user;
}

function complaintStatusMessage(status: string, reply?: string) {
  const normalized = String(status ?? "").toLowerCase();
  const base =
    normalized === "resolved"
      ? "Your anonymous complaint issue has been resolved."
      : normalized === "closed"
        ? "Your anonymous complaint has been closed."
        : normalized === "in_progress"
          ? "Your anonymous complaint is being reviewed."
          : "Your anonymous complaint status has been updated.";
  return reply?.trim() ? `${base}\n\nAdmin reply: ${reply.trim()}` : base;
}

function feedbackStatusMessage(status: string, reply?: string) {
  const normalized = String(status ?? "").toLowerCase();
  const base =
    normalized === "resolved"
      ? "Your feedback has been resolved."
      : normalized === "reviewed"
        ? "Your feedback has been reviewed."
        : "Your feedback status has been updated.";
  return reply?.trim() ? `${base}\n\nAdmin reply: ${reply.trim()}` : base;
}

async function getStudentNotificationTarget(studentId?: string | null) {
  if (!studentId) return null;
  const { data, error } = await supabase
    .from("students")
    .select("id,class,district,school_name")
    .eq("id", studentId)
    .maybeSingle();
  if (error) {
    console.warn("Unable to load student notification target", error.message);
    return { id: studentId };
  }
  return data ?? { id: studentId };
}

async function insertNotification(payload: Record<string, any>) {
  const { error } = await supabase.from("notifications").insert(payload);
  if (error) throw new Error(error.message);
}

async function notifyComplaintStatus(complaint: any) {
  const status = String(complaint?.status ?? "").trim();
  if (!status) return;
  const studentId = complaint?.student_id ? String(complaint.student_id) : complaint?.submitted_by ? String(complaint.submitted_by) : null;
  const student = await getStudentNotificationTarget(studentId);
  const targetClass = complaint?.class ? String(complaint.class) : student?.class ? String(student.class) : null;
  const district = complaint?.district ? String(complaint.district) : student?.district ? String(student.district) : null;
  const school = complaint?.school_name ? String(complaint.school_name) : student?.school_name ? String(student.school_name) : null;
  const targetValue = studentId ?? targetClass ?? district ?? school ?? null;
  const targetType = studentId ? "student" : targetClass ? "class" : district ? "district" : school ? "school" : "all";
  await insertNotification({
    title: "Anonymous complaint status update",
    message: complaintStatusMessage(status, complaint?.admin_response),
    target_type: targetType,
    target_value: targetValue,
    target_class: targetClass,
    district,
    is_active: true,
  });
}

async function notifyFeedbackStatus(feedback: any) {
  const status = String(feedback?.status ?? "").trim();
  const reply = String(feedback?.admin_response ?? "").trim();
  if (!status && !reply) return;
  const studentId = feedback?.student_id ? String(feedback.student_id) : null;
  const student = await getStudentNotificationTarget(studentId);
  const targetClass = student?.class ? String(student.class) : null;
  const district = feedback?.district ? String(feedback.district) : student?.district ? String(student.district) : null;
  await insertNotification({
    title: reply ? "Admin replied to your feedback" : "Feedback status update",
    message: feedbackStatusMessage(status || "new", feedback?.admin_response),
    target_type: studentId ? "student" : "all",
    target_value: studentId,
    target_class: targetClass,
    district,
    is_active: true,
  });
}

function notifyInBackground(task: Promise<void>) {
  task.catch((error) => {
    console.warn("Student notification was not sent", error);
  });
}

const RECYCLE_TABLES = ["notifications", "events", "materials", "videos"];

function canRecycle(table: string) {
  return RECYCLE_TABLES.includes(table);
}

async function list(table: string, order = "created_at", includeDeleted = false) {
  await requireAdmin();
  let query = supabase.from(table).select("*").order(order, { ascending: false });
  if (canRecycle(table) && !includeDeleted) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function recycleList() {
  await requireAdmin();
  const rows = await Promise.all(
    RECYCLE_TABLES.map(async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("is_active", false)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((item: any) => ({ ...item, recycle_type: table }));
    }),
  );
  return rows.flat().sort((a: any, b: any) => {
    const left = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const right = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
    return right - left;
  });
}

async function stats() {
  await requireAdmin();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayDate = today.toISOString().slice(0, 10);
  const [students, feedback, problems, complaints, videos, materials, events, activity] = await Promise.all([
    supabase.from("students").select("id,class,district,gender,school_name,created_at"),
    supabase.from("feedback").select("id,status,created_at"),
    supabase.from("student_problems").select("id,status,category,created_at"),
    supabase.from("complaints").select("id,status,complaint_type,created_at"),
    supabase.from("videos").select("id").eq("is_active", true),
    supabase.from("materials").select("id,material_type").eq("is_active", true),
    supabase.from("events").select("id,title,event_date,target_class,created_at").eq("is_active", true).order("event_date", { ascending: true }),
    supabase.from("activity_logs").select("id,event_type,user_name,created_at").gte("created_at", todayStart).order("created_at", { ascending: false }).limit(8),
  ]);
  for (const result of [students, feedback, problems, complaints, videos, materials, events]) if (result.error) throw new Error(result.error.message);
  const by = (key: string) => (students.data ?? []).reduce((acc: Record<string, number>, row: any) => {
    const value = row[key] || "Unknown"; acc[value] = (acc[value] ?? 0) + 1; return acc;
  }, {});
  const rowsBy = (rows: any[], key: string) => (rows ?? []).reduce((acc: Record<string, number>, row: any) => {
    const value = row[key] || "Unknown"; acc[value] = (acc[value] ?? 0) + 1; return acc;
  }, {});
  const byDay = (rows: any[]) => (rows ?? []).reduce((acc: Record<string, number>, row: any) => {
    const value = String(row.created_at ?? "").slice(0, 10) || "Unknown"; acc[value] = (acc[value] ?? 0) + 1; return acc;
  }, {});
  const allIssues = [...(problems.data ?? []), ...(complaints.data ?? [])];
  const upcomingEvents = (events.data ?? []).filter((event: any) => String(event.event_date ?? "") >= todayDate).slice(0, 5);
  return {
    total_students: students.data?.length ?? 0,
    active_students_today: activity.error ? 0 : (activity.data?.length ?? 0),
    male_students: students.data?.filter((s: any) => String(s.gender).toLowerCase() === "male").length ?? 0,
    female_students: students.data?.filter((s: any) => String(s.gender).toLowerCase() === "female").length ?? 0,
    students_by_class: by("class"),
    students_by_district: by("district"),
    students_by_gender: by("gender"),
    students_by_school: by("school_name"),
    total_feedback: feedback.data?.length ?? 0,
    total_complaints: allIssues.length,
    anonymous_complaints: complaints.data?.length ?? 0,
    pending_complaints: allIssues.filter((p: any) => ["open", "pending", "in_progress"].includes(String(p.status ?? "").toLowerCase())).length,
    open_complaints: problems.data?.filter((p: any) => p.status === "open").length ?? 0,
    resolved_complaints: allIssues.filter((p: any) => ["resolved", "closed"].includes(String(p.status ?? "").toLowerCase())).length,
    complaints_by_category: rowsBy(allIssues, "category"),
    complaints_by_type: rowsBy(complaints.data ?? [], "complaint_type"),
    complaint_trends: byDay(allIssues),
    total_videos: videos.data?.length ?? 0,
    total_books: materials.data?.filter((m: any) => m.material_type === "book").length ?? 0,
    total_guides: materials.data?.filter((m: any) => m.material_type === "guide").length ?? 0,
    total_events: events.data?.length ?? 0,
    upcoming_events: upcomingEvents,
    events_by_class: rowsBy(events.data ?? [], "target_class"),
    recent_activity: activity.error ? [] : (activity.data ?? []),
  };
}

function tableFromPath(path: string) {
  if (path.includes("/student-problems")) return "student_problems";
  if (path.includes("/notifications")) return "notifications";
  if (path.includes("/complaints")) return "complaints";
  for (const table of ["students", "events", "feedback", "videos", "materials"]) if (path.includes(`/${table}`)) return table;
  return "";
}

function idFromPath(path: string) {
  return path.split("/").filter(Boolean).pop() ?? "";
}

export async function adminApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? "GET";
  const body = options.body ? JSON.parse(String(options.body)) : {};

  if (path === "/api/admin/login" && method === "POST") {
    const { data, error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password });
    if (error) throw new Error("Invalid admin credentials");
    if (!(await isAdmin(data.user?.id))) throw new Error("Admin access is required");
    return { token: data.session?.access_token ?? "", admin: { id: data.user!.id, email: data.user!.email!, role: "admin" } } as T;
  }

  if (path === "/api/admin/me") {
    const user = await requireAdmin();
    return { id: user.id, email: user.email, role: "admin" } as T;
  }
  if (path === "/api/admin/stats") return await stats() as T;

  if (path === "/api/admin/recycle" && method === "GET") return await recycleList() as T;
  if (path.startsWith("/api/admin/recycle/")) {
    await requireAdmin();
    const [, , , , table, id] = path.split("/");
    if (!canRecycle(table) || !id) throw new Error("Unsupported recycle path");
    if (method === "PATCH") {
      const { data, error } = await supabase
        .from(table)
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as T;
    }
    if (method === "DELETE") {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true } as T;
    }
  }

  const table = tableFromPath(path);
  if (!table) throw new Error(`Unsupported direct Supabase admin path: ${path}`);
  if (method === "GET") {
    await requireAdmin();
    if (table === "students") {
      const params = new URLSearchParams(path.split("?")[1] ?? "");
      let query = supabase.from("students").select("id,full_name,mobile_number,gender,class,school_name,district,created_at");
      for (const key of ["class", "gender", "district", "school_name"]) {
        const value = params.get(key);
        if (value) query = query.eq(key, value);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as T;
    }
    return await list(table, table === "events" ? "event_date" : "created_at") as T;
  }

  await requireAdmin();
  if (method === "POST") {
    const payload = table === "materials" ? { ...body, type: body.material_type ?? body.type } : body;
    const { data, error } = await supabase.from(table).insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return data as T;
  }
  if (method === "PATCH") {
    const payload =
      table === "materials"
        ? { ...body, type: body.material_type ?? body.type, updated_at: new Date().toISOString() }
        : table === "complaints"
          ? { ...body, updated_at: new Date().toISOString() }
          : { ...body, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from(table).update(payload).eq("id", idFromPath(path)).select("*").single();
    if (error) throw new Error(error.message);
    if (table === "complaints" && ("status" in body || "admin_response" in body)) {
      notifyInBackground(notifyComplaintStatus(data));
    }
    if (table === "feedback" && ("status" in body || "admin_response" in body)) {
      notifyInBackground(notifyFeedbackStatus(data));
    }
    return data as T;
  }
  if (method === "DELETE") {
    if (canRecycle(table)) {
      const { error } = await supabase
        .from(table)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", idFromPath(path));
      if (error) throw new Error(error.message);
      return { success: true } as T;
    }
    const { error } = await supabase.from(table).delete().eq("id", idFromPath(path));
    if (error) throw new Error(error.message);
    return { success: true } as T;
  }
  throw new Error(`Unsupported method: ${method}`);
}
