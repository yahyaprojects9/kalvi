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

  try {
    const { rows } = await getDatabase().query(
      `
        insert into public.students
          (full_name, gender, mobile_number, password_hash, school_name, class, district)
        values
          ($1, $2, $3, $4, $5, $6, $7)
        returning ${STUDENT_FIELDS}
      `,
      [row.full_name, row.gender, row.mobile_number, row.password_hash, row.school_name, row.class, row.district],
    );
    return sanitizeStudent(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      const duplicate = new Error("Mobile number is already registered");
      duplicate.status = 409;
      throw duplicate;
    }
    throw error;
  }
}

export async function authenticateStudent(mobileNumber, password, deviceInfo) {
  const normalizedMobile = normalizeMobile(mobileNumber);
  const { rows } = await getDatabase().query(
    "select * from public.students where mobile_number = $1 limit 1",
    [normalizedMobile],
  );
  const student = rows[0];
  if (!student) return null;

  const valid = await bcrypt.compare(password, student.password_hash);
  if (!valid) return null;

  const sessionId = randomUUID();
  await getDatabase().query(
    "insert into public.student_sessions (id, student_id, device_info) values ($1, $2, $3)",
    [sessionId, student.id, deviceInfo || null],
  );

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
  const { rows } = await getDatabase().query(
    `
      select ss.id as session_id, s.*
      from public.student_sessions ss
      join public.students s on s.id = ss.student_id
      where ss.id = $1 and ss.logout_time is null
      limit 1
    `,
    [token],
  );
  const student = rows[0];
  if (student) {
    return {
      sessionId: student.session_id,
      student: sanitizeStudent(student),
    };
  }
  if (!UUID_PATTERN.test(token)) {
    return getSupabaseStudentSession(token);
  }
  return null;
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
  await getDatabase().query(
    "update public.student_sessions set logout_time = now() where id = $1 and logout_time is null",
    [token],
  );
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
