import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { getSupabase } from "../config/supabase.js";

const STUDENT_FIELDS = "id, full_name, gender, mobile_number, school_name, class, district, created_at, updated_at";

export function normalizeClass(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "LKG" || normalized === "UKG") return normalized;
  if (/^\d+$/.test(normalized)) {
    const numeric = Number(normalized);
    if (numeric >= 1 && numeric <= 12) return String(numeric);
  }
  return "";
}

export function normalizeMobile(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

export function sanitizeStudent(student) {
  if (!student) return null;
  const { password_hash: _passwordHash, ...safe } = student;
  return {
    ...safe,
    emis_number: null,
    section: null,
    language_preference: "ta",
  };
}

export async function createStudent(input) {
  const mobileNumber = normalizeMobile(input.mobile_number);
  const klass = normalizeClass(input.class);
  if (!klass) {
    const error = new Error("Class must be LKG, UKG, or 1 to 12");
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const row = {
    full_name: String(input.full_name ?? "").trim(),
    gender: String(input.gender ?? "").trim().toLowerCase(),
    mobile_number: mobileNumber,
    password_hash: passwordHash,
    school_name: String(input.school_name ?? "").trim() || null,
    class: klass,
    district: String(input.district ?? "").trim() || null,
  };

  const { data, error } = await getSupabase().from("students").insert(row).select(STUDENT_FIELDS).single();
  if (error) {
    if (error.code === "23505") {
      const duplicate = new Error("Mobile number is already registered");
      duplicate.status = 409;
      throw duplicate;
    }
    throw error;
  }
  return sanitizeStudent(data);
}

export async function authenticateStudent(mobileNumber, password, deviceInfo) {
  const normalizedMobile = normalizeMobile(mobileNumber);
  const { data: student, error } = await getSupabase()
    .from("students")
    .select("*")
    .eq("mobile_number", normalizedMobile)
    .maybeSingle();
  if (error) throw error;
  if (!student) return null;

  const valid = await bcrypt.compare(password, student.password_hash);
  if (!valid) return null;

  const sessionId = randomUUID();
  const { error: sessionError } = await getSupabase().from("student_sessions").insert({
    id: sessionId,
    student_id: student.id,
    device_info: deviceInfo || null,
  });
  if (sessionError) throw sessionError;

  return {
    token: sessionId,
    student: sanitizeStudent(student),
  };
}

export async function getStudentBySession(token) {
  if (!token) return null;
  const { data, error } = await getSupabase()
    .from("student_sessions")
    .select("id, logout_time, students(*)")
    .eq("id", token)
    .is("logout_time", null)
    .maybeSingle();
  if (error) throw error;
  if (!data?.students) return null;
  return {
    sessionId: data.id,
    student: sanitizeStudent(data.students),
  };
}

export async function endStudentSession(token) {
  if (!token) return;
  const { error } = await getSupabase()
    .from("student_sessions")
    .update({ logout_time: new Date().toISOString() })
    .eq("id", token)
    .is("logout_time", null);
  if (error) throw error;
}

export async function updateStudent(studentId, patch) {
  const allowed = {};
  for (const field of ["full_name", "gender", "school_name", "district"]) {
    if (field in patch) allowed[field] = String(patch[field] ?? "").trim() || null;
  }
  if ("class" in patch) {
    const klass = normalizeClass(patch.class);
    if (!klass) {
      const error = new Error("Class must be LKG, UKG, or 1 to 12");
      error.status = 400;
      throw error;
    }
    allowed.class = klass;
  }
  if (Object.keys(allowed).length === 0) return null;

  const { data, error } = await getSupabase()
    .from("students")
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq("id", studentId)
    .select(STUDENT_FIELDS)
    .single();
  if (error) throw error;
  return sanitizeStudent(data);
}
