import { Router } from "express";
import {
  createComplaint,
  createFeedback,
  createStudentProblem,
  deleteStudentProblem,
  getComplaint,
  getRow,
  getStudentProblem,
  countUnreadNotifications,
  listFeedbackByStudent,
  listComplaints,
  listNotificationsForStudent,
  listRows,
  listStudentProblems,
  markNotificationRead,
  updateComplaintStatus,
  updateStudentProblem,
} from "../repositories/content.repository.js";
import { getSupabase } from "../config/supabase.js";
import { getDatabase } from "../config/database.js";
import { requireStudent } from "./auth.routes.js";

const router = Router();

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_STATUSES = new Set(["open", "in_progress", "resolved", "closed"]);
const ALLOWED_FEEDBACK_STATUSES = new Set(["new", "reviewed", "resolved", "closed"]);
const ALLOWED_COMPLAINT_TYPES = new Set([
  "ragging",
  "harassment",
  "staff_misbehavior",
  "discrimination",
  "infrastructure_issue",
  "other",
]);
const ALLOWED_COMPLAINT_STATUSES = new Set(["pending", "in_progress", "resolved", "closed"]);

function requiredString(body, field, maxLength) {
  const value = body?.[field];
  if (typeof value !== "string" || !value.trim()) {
    return { error: `${field} is required` };
  }
  const trimmed = value.trim();
  if (maxLength && trimmed.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer` };
  }
  return { value: trimmed };
}

function validateStudentProblem(body) {
  const titleValue = body?.title ?? body?.name;
  const descriptionValue = body?.description ?? body?.problem_description;
  const title = typeof titleValue === "string" ? titleValue.trim() : "";
  const description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  if (!title) return { error: "title is required" };
  if (!description) return { error: "description is required" };
  if (title.length > 255) return { error: "title must be 255 characters or fewer" };
  if (description.length > 5000) return { error: "description must be 5000 characters or fewer" };

  const status = typeof body?.status === "string" && body.status.trim() ? body.status.trim() : "open";
  if (!ALLOWED_STATUSES.has(status)) {
    return { error: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(", ")}` };
  }

  return {
    value: {
      title,
      description,
      category: typeof body?.category === "string" && body.category.trim() ? body.category.trim() : null,
      status,
    },
  };
}

function validateStudentProblemPatch(body) {
  const patch = {};

  for (const field of ["title", "description", "category", "status"]) {
    if (field in (body ?? {})) {
      const maxLength = field === "description" ? 5000 : 255;
      const value = requiredString(body, field, maxLength);
      if (value.error) return { error: value.error };
      patch[field] = value.value;
    }
  }

  if ("status" in (body ?? {})) {
    const status = requiredString(body, "status", 50);
    if (status.error) return { error: status.error };
    if (!ALLOWED_STATUSES.has(status.value)) {
      return { error: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(", ")}` };
    }
    patch.status = status.value;
  }

  if (Object.keys(patch).length === 0) {
    return { error: "At least one field is required to update" };
  }

  return { value: patch };
}

function validateId(req, res) {
  const { id } = req.params;
  if (!UUID_PATTERN.test(id)) {
    res.status(400).json({ success: false, error: "A valid UUID id is required" });
    return null;
  }
  return id;
}

async function resolveStudentUuid(student) {
  const id = String(student?.id ?? "").trim();
  if (UUID_PATTERN.test(id)) return id;
  const mobileNumber = String(student?.mobile_number ?? student?.mobile ?? "").replace(/\D/g, "").slice(-10);
  if (!mobileNumber) return null;
  const { rows } = await getDatabase().query(
    "select id from public.students where mobile_number = $1 limit 1",
    [mobileNumber],
  );
  return rows[0]?.id ?? null;
}

function validateComplaint(body) {
  const complaintType = requiredString(body, "complaint_type", 100);
  if (complaintType.error) return { error: complaintType.error };
  if (!ALLOWED_COMPLAINT_TYPES.has(complaintType.value)) {
    return { error: `complaint_type must be one of: ${Array.from(ALLOWED_COMPLAINT_TYPES).join(", ")}` };
  }

  const subject = requiredString(body, "subject", 255);
  if (subject.error) return { error: subject.error };

  const description = requiredString(body, "description", 5000);
  if (description.error) return { error: description.error };

  const district = requiredString(body, "district", 255);
  if (district.error) return { error: district.error };

  const schoolName = requiredString(body, "school_name", 255);
  if (schoolName.error) return { error: schoolName.error };

  const klass = requiredString(body, "class", 100);
  if (klass.error) return { error: klass.error };

  const studentId = typeof body?.student_id === "string" && UUID_PATTERN.test(body.student_id.trim())
    ? body.student_id.trim()
    : null;

  return {
    value: {
      complaint_type: complaintType.value,
      subject: subject.value,
      description: description.value,
      district: district.value,
      school_name: schoolName.value,
      class: klass.value,
      student_id: studentId,
    },
  };
}

function validateComplaintStatusPatch(body) {
  const patch = {};
  const status = requiredString(body, "status", 50);
  if (status.error) return { error: status.error };
  if (!ALLOWED_COMPLAINT_STATUSES.has(status.value)) {
    return { error: `status must be one of: ${Array.from(ALLOWED_COMPLAINT_STATUSES).join(", ")}` };
  }
  patch.status = status.value;
  if ("admin_response" in (body ?? {})) {
    patch.admin_response =
      typeof body.admin_response === "string" && body.admin_response.trim()
        ? body.admin_response.trim().slice(0, 5000)
        : null;
  }
  return { value: patch };
}

async function requireAdmin(req, res) {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) {
    res.status(401).json({ success: false, error: "Admin authorization is required" });
    return null;
  }

  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ success: false, error: "Invalid authorization token" });
    return null;
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (roleError) throw roleError;

  const role = roleRow?.role;
  if (role !== "district_admin" && role !== "super_admin") {
    res.status(403).json({ success: false, error: "Admin access is required" });
    return null;
  }

  return { user: userData.user, role };
}

router.get("/schools", asyncRoute(async (_req, res) => {
  res.json({ data: await listRows("schools") });
}));

router.get("/materials", asyncRoute(async (req, res) => {
  res.json({ data: await listRows("materials", req.query) });
}));

router.get("/materials/:id", asyncRoute(async (req, res) => {
  const id = validateId(req, res);
  if (!id) return;
  const row = await getRow("materials", id);
  if (!row) return res.status(404).json({ success: false, error: "Material not found" });
  res.json({ success: true, data: row });
}));

router.get("/videos", asyncRoute(async (req, res) => {
  res.json({ data: await listRows("videos", req.query) });
}));

router.get("/videos/:id", asyncRoute(async (req, res) => {
  const id = validateId(req, res);
  if (!id) return;
  const row = await getRow("videos", id);
  if (!row) return res.status(404).json({ success: false, error: "Video not found" });
  res.json({ success: true, data: row });
}));

router.get("/events", asyncRoute(async (req, res) => {
  res.json({ data: await listRows("events", req.query) });
}));

router.get("/events/:id", asyncRoute(async (req, res) => {
  const id = validateId(req, res);
  if (!id) return;
  const row = await getRow("events", id);
  if (!row) return res.status(404).json({ success: false, error: "Event not found" });
  res.json({ success: true, data: row });
}));

router.get("/notifications", asyncRoute(async (req, res) => {
  const header = req.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    return res.json({ data: await listRows("notifications", req.query) });
  }

  const session = await requireStudent(req, res);
  if (!session) return;
  const studentId = await resolveStudentUuid(session.student);
  if (!studentId) return res.json({ success: true, data: [] });
  res.json({
    success: true,
    data: await listNotificationsForStudent({ ...session.student, id: studentId }, req.query),
  });
}));

router.get("/notifications/unread-count", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  const studentId = await resolveStudentUuid(session.student);
  if (!studentId) return res.json({ success: true, data: { unread: 0 } });
  res.json({
    success: true,
    data: { unread: await countUnreadNotifications({ ...session.student, id: studentId }, req.query) },
  });
}));

router.patch("/notifications/:id/read", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  const id = validateId(req, res);
  if (!id) return;
  const studentId = await resolveStudentUuid(session.student);
  if (!studentId) return res.status(400).json({ success: false, error: "A real student profile is required" });
  const row = await markNotificationRead({ ...session.student, id: studentId }, id);
  if (!row) return res.status(404).json({ success: false, error: "Notification not found" });
  res.json({ success: true, data: row });
}));

router.post("/feedback", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  const { message, category, subject, status } = req.body ?? {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }
  const feedbackStatus = typeof status === "string" && status.trim() ? status.trim() : "new";
  if (!ALLOWED_FEEDBACK_STATUSES.has(feedbackStatus)) {
    return res.status(400).json({ error: `status must be one of: ${Array.from(ALLOWED_FEEDBACK_STATUSES).join(", ")}` });
  }

  const studentId = await resolveStudentUuid(session.student);
  if (!studentId) {
    return res.status(400).json({ error: "A real student profile is required before submitting feedback" });
  }

  const feedback = await createFeedback({
    student_id: studentId,
    student_name: session.student.full_name,
    mobile_number: session.student.mobile_number,
    category: typeof category === "string" && category.trim() ? category.trim().slice(0, 100) : "general",
    subject: typeof subject === "string" && subject.trim() ? subject.trim().slice(0, 255) : undefined,
    district: session.student.district,
    status: feedbackStatus,
    message: message.trim(),
  });

  res.status(201).json({ data: feedback });
}));

router.get("/feedback/my", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  const studentId = await resolveStudentUuid(session.student);
  res.json({ success: true, data: studentId ? await listFeedbackByStudent(studentId) : [] });
}));

router.post("/student-problems", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  const validation = validateStudentProblem(req.body);
  if (validation.error) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const problem = await createStudentProblem({
    ...validation.value,
    student_id: session.student.id,
    name: session.student.full_name,
    class: session.student.class,
    district: session.student.district,
    problem_description: validation.value.description,
  });
  res.status(201).json({ success: true, data: problem });
}));

router.get("/student-problems/my", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  const problems = await listStudentProblems({ student_id: session.student.id });
  res.json({ success: true, data: problems });
}));

router.get("/student-problems", asyncRoute(async (req, res) => {
  const problems = await listStudentProblems(req.query);
  res.json({ success: true, data: problems });
}));

router.get("/student-problems/:id", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  const id = validateId(req, res);
  if (!id) return;

  const problem = await getStudentProblem(id);
  if (!problem) {
    return res.status(404).json({ success: false, error: "Student problem not found" });
  }
  if (problem.student_id !== session.student.id) {
    return res.status(403).json({ success: false, error: "You can only view your own problems" });
  }

  res.json({ success: true, data: problem });
}));

router.patch("/student-problems/:id", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  const id = validateId(req, res);
  if (!id) return;
  const existing = await getStudentProblem(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: "Student problem not found" });
  }
  if (existing.student_id !== session.student.id) {
    return res.status(403).json({ success: false, error: "You can only update your own problems" });
  }

  const validation = validateStudentProblemPatch(req.body);
  if (validation.error) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const problem = await updateStudentProblem(id, validation.value);
  if (!problem) {
    return res.status(404).json({ success: false, error: "Student problem not found" });
  }

  res.json({ success: true, data: problem });
}));

router.delete("/student-problems/:id", asyncRoute(async (req, res) => {
  const id = validateId(req, res);
  if (!id) return;

  const deleted = await deleteStudentProblem(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: "Student problem not found" });
  }

  res.json({ success: true, data: deleted });
}));

router.post("/complaints", asyncRoute(async (req, res) => {
  const validation = validateComplaint(req.body);
  if (validation.error) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const studentId = validation.value.student_id ?? await resolveStudentUuid({
    id: req.body?.student_id,
    mobile_number: req.body?.mobile_number,
  });
  const complaint = await createComplaint({ ...validation.value, student_id: studentId });
  res.status(201).json({
    success: true,
    data: {
      id: complaint.id,
      complaint_type: complaint.complaint_type,
      subject: complaint.subject,
      district: complaint.district,
      school_name: complaint.school_name,
      class: complaint.class,
      status: complaint.status,
      created_at: complaint.created_at,
    },
  });
}));

router.get("/complaints", asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const complaints = await listComplaints(req.query);
  res.json({ success: true, data: complaints });
}));

router.get("/complaints/:id", asyncRoute(async (req, res) => {
  const id = validateId(req, res);
  if (!id) return;

  const complaint = await getComplaint(id);
  if (!complaint) {
    return res.status(404).json({ success: false, error: "Complaint not found" });
  }

  res.json({
    success: true,
    data: {
      id: complaint.id,
      status: complaint.status,
      created_at: complaint.created_at,
    },
  });
}));

router.patch("/complaints/:id", asyncRoute(async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = validateId(req, res);
  if (!id) return;

  const validation = validateComplaintStatusPatch(req.body);
  if (validation.error) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const complaint = await updateComplaintStatus(id, validation.value);
  if (!complaint) {
    return res.status(404).json({ success: false, error: "Complaint not found" });
  }

  res.json({ success: true, data: complaint });
}));

export default router;
