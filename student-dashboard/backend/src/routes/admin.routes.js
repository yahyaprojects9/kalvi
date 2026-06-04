import { randomUUID } from "node:crypto";
import express from "express";
import bcrypt from "bcrypt";
import { getDatabase } from "../config/database.js";

const router = express.Router();
const TABLES = new Set(["events", "feedback", "student_problems", "complaints", "videos", "materials", "notifications"]);

function cleanAdmin(row) {
  if (!row) return null;
  const { password_hash: _hash, ...safe } = row;
  return safe;
}

async function requireAdmin(req, res, next) {
  try {
    const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ success: false, error: "Admin token required" });
    const { rows } = await getDatabase().query(
      `
        select au.id, au.name, au.email, au.role, au.created_at
        from public.admin_sessions s
        join public.admin_users au on au.id = s.admin_id
        where s.token = $1 and s.expires_at > now()
        limit 1
      `,
      [token],
    );
    if (!rows[0]) return res.status(401).json({ success: false, error: "Invalid admin token" });
    req.admin = cleanAdmin(rows[0]);
    next();
  } catch (error) {
    next(error);
  }
}

function pick(body, keys) {
  return Object.fromEntries(keys.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

async function count(table, filters = {}) {
  const values = [];
  const clauses = [];
  for (const [key, value] of Object.entries(filters)) {
    values.push(value);
    clauses.push(`"${key}" = $${values.length}`);
  }
  const where = clauses.length ? ` where ${clauses.join(" and ")}` : "";
  const { rows } = await getDatabase().query(`select count(*)::int as total from public.${table}${where}`, values);
  return rows[0]?.total ?? 0;
}

async function list(table, req, order = "created_at") {
  if (!TABLES.has(table)) throw new Error(`Unsupported admin table: ${table}`);
  const values = [];
  const clauses = [];
  for (const key of ["class", "gender", "district", "school_name", "status", "material_type"]) {
    if (!req.query[key]) continue;
    values.push(req.query[key]);
    clauses.push(`"${key}" = $${values.length}`);
  }
  if (table === "notifications") clauses.push("coalesce(is_active, true) = true");
  const where = clauses.length ? ` where ${clauses.join(" and ")}` : "";
  const select =
    table === "complaints"
      ? "id, complaint_type, subject, description, district, school_name, class, status, admin_response, created_at, updated_at"
      : "*";
  const { rows } = await getDatabase().query(`select ${select} from public.${table}${where} order by "${order}" desc`, values);
  return rows;
}

async function create(table, body, keys) {
  const row = pick(body, keys);
  const columns = Object.keys(row);
  if (!columns.length) throw new Error("No fields to create");
  const values = Object.values(row);
  const placeholders = values.map((_, index) => `$${index + 1}`);
  const { rows } = await getDatabase().query(
    `insert into public.${table} (${columns.map((key) => `"${key}"`).join(", ")}) values (${placeholders.join(", ")}) returning *`,
    values,
  );
  return rows[0];
}

async function patch(table, id, body, keys) {
  const row = { ...pick(body, keys), updated_at: new Date().toISOString() };
  const columns = Object.keys(row);
  const values = Object.values(row);
  if (!columns.length) throw new Error("No fields to update");
  const assignments = columns.map((key, index) => `"${key}" = $${index + 1}`);
  values.push(id);
  const returning =
    table === "complaints"
      ? "id, complaint_type, subject, description, district, school_name, class, status, admin_response, created_at, updated_at"
      : "*";
  const { rows } = await getDatabase().query(
    `update public.${table} set ${assignments.join(", ")} where id = $${values.length} returning ${returning}`,
    values,
  );
  return rows[0] ?? null;
}

async function remove(table, id) {
  await getDatabase().query(`delete from public.${table} where id = $1`, [id]);
}

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");
    const { rows } = await getDatabase().query("select * from public.admin_users where email = $1 limit 1", [email]);
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ success: false, error: "Invalid admin credentials" });
    }
    const token = randomUUID();
    await getDatabase().query("insert into public.admin_sessions (admin_id, token) values ($1, $2)", [admin.id, token]);
    res.json({ success: true, data: { token, admin: cleanAdmin(admin) } });
  } catch (error) {
    next(error);
  }
});

router.use(requireAdmin);

router.get("/me", (req, res) => res.json({ success: true, data: req.admin }));

router.get("/stats", async (_req, res, next) => {
  try {
    const { rows: students } = await getDatabase().query("select class, district, gender from public.students");
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
    const values = [];
    const clauses = [];
    for (const key of ["class", "gender", "district", "school_name"]) {
      if (!req.query[key]) continue;
      values.push(req.query[key]);
      clauses.push(`"${key}" = $${values.length}`);
    }
    const where = clauses.length ? ` where ${clauses.join(" and ")}` : "";
    const { rows } = await getDatabase().query(
      `select id,full_name,mobile_number,gender,class,school_name,district,created_at from public.students${where} order by created_at desc`,
      values,
    );
    res.json({ success: true, data: rows });
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

router.get("/complaints", async (req, res, next) => { try { res.json({ success: true, data: await list("complaints", req) }); } catch (e) { next(e); } });
router.patch("/complaints/:id", async (req, res, next) => { try { res.json({ success: true, data: await patch("complaints", req.params.id, req.body, ["status", "admin_response"]) }); } catch (e) { next(e); } });

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
