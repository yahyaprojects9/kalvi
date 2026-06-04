import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getDatabase } from "../config/database.js";
import { enableLocalTlsFallback, env } from "../config/env.js";
import { getSupabase } from "../config/supabase.js";

const STUDENT_FIELDS = "id, full_name, gender, mobile_number, school_name, class, district, created_at, updated_at";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const DEMO_EMAILS = {
  "kavi@kalvi.test": "9000010001",
  "arun@kalvi.test": "9000010002",
  "arul@kalvi.test": "9000010003",
};
const MOCK_STUDENTS = {
  kavi: {
    full_name: "Kavi",
    gender: "female",
    mobile_number: "9000010001",
    school_name: "Chennai Primary School, Saidapet",
    class: "5",
    district: "Chennai",
  },
  arun: {
    full_name: "Arun",
    gender: "male",
    mobile_number: "9000010002",
    school_name: "Government Higher Secondary School, Madurai",
    class: "10",
    district: "Madurai",
  },
  arul: {
    full_name: "Arul",
    gender: "male",
    mobile_number: "9000010003",
    school_name: "Government Girls HSS, Coimbatore",
    class: "12",
    district: "Coimbatore",
  },
  mockid: {
    full_name: "Kavi Arul",
    gender: "female",
    mobile_number: "9876543210",
    school_name: "Government Higher Secondary School, Madurai",
    class: "10",
    district: "Madurai",
  },
  mock5: {
    full_name: "Yaazhini",
    gender: "female",
    mobile_number: "9876500005",
    school_name: "Chennai Primary School, Saidapet",
    class: "5",
    district: "Chennai",
  },
  mock12: {
    full_name: "Nila Kumar",
    gender: "female",
    mobile_number: "9876500012",
    school_name: "Government Girls HSS, Coimbatore",
    class: "12",
    district: "Coimbatore",
  },
};

let authClient;

function getAuthClient() {
  if (!authClient) {
    enableLocalTlsFallback();
    authClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return authClient;
}

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
  if (token.startsWith("mock-")) {
    return getMockStudentSession(token);
  }
  if (!UUID_PATTERN.test(token)) {
    return getSupabaseStudentSession(token);
  }
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

async function getSupabaseStudentSession(token) {
  const { data: userData, error: userError } = await getAuthClient().auth.getUser(token);
  if (userError || !userData.user) return null;

  const db = getDatabase();
  const authStudent = await db.query(
    `select ${STUDENT_FIELDS} from public.students where auth_user_id = $1 limit 1`,
    [userData.user.id],
  );
  if (authStudent.rows[0]) return { sessionId: token, student: sanitizeStudent(authStudent.rows[0]) };

  const mobileNumber = DEMO_EMAILS[String(userData.user.email ?? "").toLowerCase()];
  if (!mobileNumber) return null;

  const mobileStudent = await db.query(
    `select ${STUDENT_FIELDS} from public.students where mobile_number = $1 limit 1`,
    [mobileNumber],
  );
  if (!mobileStudent.rows[0]) return null;

  return { sessionId: token, student: sanitizeStudent(mobileStudent.rows[0]) };
}

async function getMockStudentSession(token) {
  const key = token.slice("mock-".length).toLowerCase();
  const mockStudent = MOCK_STUDENTS[key];
  if (!mockStudent) return null;

  const db = getDatabase();
  const existing = await db.query(
    `select ${STUDENT_FIELDS} from public.students where mobile_number = $1 limit 1`,
    [mockStudent.mobile_number],
  );
  if (existing.rows[0]) return { sessionId: token, student: sanitizeStudent(existing.rows[0]) };

  const inserted = await db.query(
    `
      insert into public.students
        (full_name, gender, mobile_number, school_name, class, district, password_hash)
      values
        ($1, $2, $3, $4, $5, $6, 'mock-account')
      returning ${STUDENT_FIELDS}
    `,
    [
      mockStudent.full_name,
      mockStudent.gender,
      mockStudent.mobile_number,
      mockStudent.school_name,
      mockStudent.class,
      mockStudent.district,
    ],
  );

  return { sessionId: token, student: sanitizeStudent(inserted.rows[0]) };
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
