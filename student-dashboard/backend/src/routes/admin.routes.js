import { randomUUID } from "node:crypto";
import express from "express";
import bcrypt from "bcrypt";
import { getSupabase } from "../config/supabase.js";

const router = express.Router();
const TABLES = new Set(["events", "feedback", "student_problems", "videos", "materials", "notifications"]);

function cleanAdmin(row) {
  if (!row) return null;
  const { password_hash: _hash, ...safe } = row;
  return safe;
}

async function requireAdmin(req, res, next) {
  try {
    const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ success: false, error: "Admin token required" });
    const { data, error } = await getSupabase()
      .from("admin_sessions")
      .select("id,expires_at,admin:admin_users(id,name,email,role,created_at)")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    if (!data?.admin) return res.status(401).json({ success: false, error: "Invalid admin token" });
    req.admin = cleanAdmin(data.admin);
    next();
  } catch (error) {
    next(error);
  }
}

function pick(body, keys) {
  return Object.fromEntries(keys.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

async function count(table, filters = {}) {
  let query = getSupabase().from(table).select("id", { head: true, count: "exact" });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { count: total, error } = await query;
  if (error) throw error;
  return total ?? 0;
}

async function list(table, req, order = "created_at") {
  if (!TABLES.has(table)) throw new Error(`Unsupported admin table: ${table}`);
  let query = getSupabase().from(table).select("*");
  for (const key of ["class", "gender", "district", "school_name", "status", "material_type"]) {
    if (req.query[key]) query = query.eq(key, req.query[key]);
  }
  const { data, error } = await query.order(order, { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function create(table, body, keys) {
  const { data, error } = await getSupabase().from(table).insert(pick(body, keys)).select("*").single();
  if (error) throw error;
  return data;
}

async function patch(table, id, body, keys) {
  const { data, error } = await getSupabase()
    .from(table)
    .update({ ...pick(body, keys), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function remove(table, id) {
  const { error } = await getSupabase().from(table).delete().eq("id", id);
  if (error) throw error;
}

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");
    const { data: admin, error } = await getSupabase().from("admin_users").select("*").eq("email", email).maybeSingle();
    if (error) throw error;
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ success: false, error: "Invalid admin credentials" });
    }
    const token = randomUUID();
    const { error: sessionError } = await getSupabase().from("admin_sessions").insert({ admin_id: admin.id, token });
    if (sessionError) throw sessionError;
    res.json({ success: true, data: { token, admin: cleanAdmin(admin) } });
  } catch (error) {
    next(error);
  }
});

router.use(requireAdmin);

router.get("/me", (req, res) => res.json({ success: true, data: req.admin }));

router.get("/stats", async (_req, res, next) => {
  try {
    const supabase = getSupabase();
    const { data: students, error } = await supabase.from("students").select("class,district,gender");
    if (error) throw error;
    const by = (key) => (students ?? []).reduce((acc, row) => ({ ...acc, [row[key] ?? "Unknown"]: (acc[row[key] ?? "Unknown"] ?? 0) + 1 }), {});
    res.json({ success: true, data: {
      total_students: students?.length ?? 0,
      male_students: students?.filter((s) => s.gender === "male").length ?? 0,
      female_students: students?.filter((s) => s.gender === "female").length ?? 0,
      students_by_class: by("class"),
      students_by_district: by("district"),
      total_feedback: await count("feedback"),
      total_complaints: await count("student_problems"),
      open_complaints: await count("student_problems", { status: "open" }),
      resolved_complaints: await count("student_problems", { status: "resolved" }),
      total_videos: await count("videos"),
      total_books: await count("materials", { material_type: "book" }),
      total_guides: await count("materials", { material_type: "guide" }),
      total_events: await count("events"),
    } });
  } catch (error) {
    next(error);
  }
});

router.get("/students", async (req, res, next) => {
  try {
    let query = getSupabase().from("students").select("id,full_name,mobile_number,gender,class,school_name,district,created_at").order("created_at", { ascending: false });
    for (const key of ["class", "gender", "district", "school_name"]) if (req.query[key]) query = query.eq(key, req.query[key]);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data ?? [] });
  } catch (error) {
    next(error);
  }
});

const eventKeys = ["title", "description", "event_date", "event_time", "location", "venue", "district", "school_name", "target_class", "audience", "category", "is_active"];
router.get("/events", async (req, res, next) => { try { res.json({ success: true, data: await list("events", req, "event_date") }); } catch (e) { next(e); } });
router.post("/events", async (req, res, next) => { try { res.json({ success: true, data: await create("events", { audience: "all", is_active: true, ...req.body }, eventKeys) }); } catch (e) { next(e); } });
router.patch("/events/:id", async (req, res, next) => { try { res.json({ success: true, data: await patch("events", req.params.id, req.body, eventKeys) }); } catch (e) { next(e); } });
router.delete("/events/:id", async (req, res, next) => { try { await remove("events", req.params.id); res.json({ success: true }); } catch (e) { next(e); } });

router.get("/feedback", async (req, res, next) => { try { res.json({ success: true, data: await list("feedback", req) }); } catch (e) { next(e); } });
router.patch("/feedback/:id", async (req, res, next) => { try { res.json({ success: true, data: await patch("feedback", req.params.id, req.body, ["status", "admin_response"]) }); } catch (e) { next(e); } });

router.get("/student-problems", async (req, res, next) => { try { res.json({ success: true, data: await list("student_problems", req) }); } catch (e) { next(e); } });
router.patch("/student-problems/:id", async (req, res, next) => { try { res.json({ success: true, data: await patch("student_problems", req.params.id, req.body, ["status", "admin_response"]) }); } catch (e) { next(e); } });

const videoKeys = ["title", "description", "class", "subject", "video_url", "url", "youtube_video_id", "thumbnail_url", "is_active"];
router.get("/videos", async (req, res, next) => { try { res.json({ success: true, data: await list("videos", req) }); } catch (e) { next(e); } });
router.post("/videos", async (req, res, next) => { try { res.json({ success: true, data: await create("videos", { is_active: true, ...req.body }, videoKeys) }); } catch (e) { next(e); } });
router.patch("/videos/:id", async (req, res, next) => { try { res.json({ success: true, data: await patch("videos", req.params.id, req.body, videoKeys) }); } catch (e) { next(e); } });
router.delete("/videos/:id", async (req, res, next) => { try { await remove("videos", req.params.id); res.json({ success: true }); } catch (e) { next(e); } });

const materialKeys = ["title", "description", "class", "subject", "material_type", "type", "file_url", "url", "storage_path", "is_active"];
router.get("/materials", async (req, res, next) => { try { res.json({ success: true, data: await list("materials", req) }); } catch (e) { next(e); } });
router.post("/materials", async (req, res, next) => { try { const b = { is_active: true, type: req.body.material_type, ...req.body }; res.json({ success: true, data: await create("materials", b, materialKeys) }); } catch (e) { next(e); } });
router.patch("/materials/:id", async (req, res, next) => { try { const b = { ...req.body, type: req.body.material_type ?? req.body.type }; res.json({ success: true, data: await patch("materials", req.params.id, b, materialKeys) }); } catch (e) { next(e); } });
router.delete("/materials/:id", async (req, res, next) => { try { await remove("materials", req.params.id); res.json({ success: true }); } catch (e) { next(e); } });

const notificationKeys = ["title", "message", "target_class", "district", "target_type", "target_value", "is_active"];
router.get("/notifications", async (req, res, next) => { try { res.json({ success: true, data: await list("notifications", req) }); } catch (e) { next(e); } });
router.post("/notifications", async (req, res, next) => { try { res.json({ success: true, data: await create("notifications", { target_type: "all", is_active: true, ...req.body }, notificationKeys) }); } catch (e) { next(e); } });
router.patch("/notifications/:id", async (req, res, next) => { try { res.json({ success: true, data: await patch("notifications", req.params.id, req.body, notificationKeys) }); } catch (e) { next(e); } });
router.delete("/notifications/:id", async (req, res, next) => { try { await remove("notifications", req.params.id); res.json({ success: true }); } catch (e) { next(e); } });

export default router;
