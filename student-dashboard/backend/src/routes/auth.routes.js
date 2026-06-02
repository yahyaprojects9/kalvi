import { Router } from "express";
import {
  authenticateStudent,
  createStudent,
  endStudentSession,
  getStudentBySession,
  normalizeClass,
  normalizeMobile,
} from "../repositories/student.repository.js";

const router = Router();

export function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function getBearerToken(req) {
  const header = req.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

export async function requireStudent(req, res) {
  const session = await getStudentBySession(getBearerToken(req));
  if (!session) {
    res.status(401).json({ success: false, error: "Student login is required" });
    return null;
  }
  return session;
}

function requiredString(body, field) {
  const value = body?.[field];
  if (typeof value !== "string" || !value.trim()) return `${field} is required`;
  return "";
}

function validateSignup(body) {
  for (const field of ["full_name", "gender", "mobile_number", "password", "school_name", "class"]) {
    const error = requiredString(body, field);
    if (error) return error;
  }
  const gender = String(body.gender).trim().toLowerCase();
  if (!["male", "female", "other"].includes(gender)) return "gender must be male, female, or other";
  if (!/^\d{10}$/.test(normalizeMobile(body.mobile_number))) return "A valid 10-digit mobile number is required";
  if (String(body.password).length < 6) return "Password must be at least 6 characters";
  if (!normalizeClass(body.class)) return "Class must be LKG, UKG, or 1 to 12";
  return "";
}

router.post("/signup", asyncRoute(async (req, res) => {
  const mobileForLog = normalizeMobile(req.body?.mobile_number);
  console.log("Auth signup attempt", {
    mobile_number: mobileForLog || "missing",
    has_password: Boolean(req.body?.password),
    class: req.body?.class ? normalizeClass(req.body.class) : "missing",
  });

  const error = validateSignup(req.body);
  if (error) {
    console.warn("Auth signup rejected", { mobile_number: mobileForLog || "missing", error });
    return res.status(400).json({ success: false, error });
  }

  const student = await createStudent(req.body);
  console.log("Auth signup success", { student_id: student.id, mobile_number: student.mobile_number });
  res.status(201).json({ success: true, data: { student } });
}));

router.post("/login", asyncRoute(async (req, res) => {
  const { mobile_number, password } = req.body ?? {};
  const mobileForLog = normalizeMobile(mobile_number);
  console.log("Auth login attempt", {
    mobile_number: mobileForLog || "missing",
    has_password: Boolean(password),
  });

  if (!mobile_number || !password) {
    console.warn("Auth login rejected", { mobile_number: mobileForLog || "missing", error: "missing credentials" });
    return res.status(400).json({ success: false, error: "Mobile number and password are required" });
  }

  if (!/^\d{10}$/.test(mobileForLog)) {
    console.warn("Auth login rejected", { mobile_number: mobileForLog || "invalid", error: "invalid mobile" });
    return res.status(400).json({ success: false, error: "A valid 10-digit mobile number is required" });
  }

  const login = await authenticateStudent(
    mobile_number,
    String(password),
    req.get("user-agent") ?? "",
  );
  if (!login) {
    console.warn("Auth login rejected", { mobile_number: mobileForLog, error: "invalid credentials" });
    return res.status(401).json({ success: false, error: "Invalid mobile number or password" });
  }

  console.log("Auth login success", { student_id: login.student.id, mobile_number: login.student.mobile_number });
  res.json({ success: true, data: login });
}));

router.post("/logout", asyncRoute(async (req, res) => {
  await endStudentSession(getBearerToken(req));
  res.json({ success: true });
}));

router.get("/me", asyncRoute(async (req, res) => {
  const session = await requireStudent(req, res);
  if (!session) return;
  res.json({ success: true, data: { student: session.student } });
}));

export default router;
