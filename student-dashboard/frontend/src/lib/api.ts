import { supabase } from "@/integrations/supabase/client";
import { findMockStudent } from "@/lib/mock-data";

export const STUDENT_AUTH_KEY = "kalvi_student_auth";

type ApiOptions = { method?: string; body?: any };
export type ApiListResponse<T> = { success?: boolean; data: T[] };
export type ApiRowResponse<T> = { success?: boolean; data: T };

const DEMO_EMAILS: Record<string, string> = {
  "9000010001": "kavi@kalvi.test",
  "9000010002": "arun@kalvi.test",
  "9000010003": "arul@kalvi.test",
};

function normalizeMobile(value: string) {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

function studentEmail(mobile: string) {
  const normalized = normalizeMobile(mobile);
  return DEMO_EMAILS[normalized] ?? `student${normalized}@example.com`;
}

function mobileFromStudentEmail(email: string | null | undefined) {
  const normalized = String(email ?? "").trim().toLowerCase();
  const demoMobile = Object.entries(DEMO_EMAILS).find(([, demoEmail]) => demoEmail === normalized)?.[0];
  if (demoMobile) return demoMobile;
  return normalized.match(/^student(\d{10})@example\.com$/)?.[1] ?? "";
}

function ok<T>(data: T) {
  return { success: true, data };
}

async function requireStudent() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Student login is required");
  const { data, error } = await supabase.from("students").select("*").eq("auth_user_id", auth.user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;

  const mobile = mobileFromStudentEmail(auth.user.email);
  if (mobile) {
    const { data: mobileStudent, error: mobileError } = await supabase.from("students").select("*").eq("mobile_number", mobile).maybeSingle();
    if (mobileError) throw new Error(mobileError.message);
    if (mobileStudent) return mobileStudent;
    const fallback = findMockStudent(mobile);
    if (fallback) return fallback.profile;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,full_name,emis_number,mobile_number,district,school_name,class,section,language_preference,location_label,location_latitude,location_longitude,location_place_id")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (profileError && !/schema cache|relation .* does not exist/i.test(profileError.message)) throw new Error(profileError.message);
  if (profile) return profile;

  const { data: signup, error: signupError } = await supabase
    .from("student_signups")
    .select("id,full_name,mobile_number,district,school_name,class,section,location_label,location_latitude,location_longitude,location_place_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (signupError && !/schema cache|relation .* does not exist/i.test(signupError.message)) throw new Error(signupError.message);
  if (signup) {
    return {
      ...signup,
      emis_number: null,
      language_preference: "ta",
    };
  }

  throw new Error("Student profile not found");
}

export function getStudentAuthToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return JSON.parse(localStorage.getItem(STUDENT_AUTH_KEY) ?? "null")?.token ?? "";
  } catch {
    return "";
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const body = options.body ?? {};
  const [rawPath, rawQuery = ""] = path.split("?");
  const params = new URLSearchParams(rawQuery);

  if (rawPath === "/api/auth/login" && method === "POST") {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: studentEmail(body.mobile_number),
      password: String(body.password ?? ""),
    });
    if (error) throw new Error("Invalid mobile number or password");
    const student = await requireStudent();
    return ok({ token: data.session?.access_token ?? "", student }) as T;
  }

  if (rawPath === "/api/auth/signup" && method === "POST") {
    const mobile = normalizeMobile(body.mobile_number);
    const { data, error } = await supabase.auth.signUp({
      email: studentEmail(mobile),
      password: String(body.password ?? ""),
      options: { data: { full_name: body.full_name, role: "student" } },
    });
    if (error) throw new Error(error.message);
    const row = {
      auth_user_id: data.user?.id,
      full_name: body.full_name,
      gender: String(body.gender ?? "").toLowerCase(),
      mobile_number: mobile,
      school_name: body.school_name,
      class: String(body.class ?? ""),
      district: body.district ?? null,
      password_hash: "supabase-auth",
      language_preference: "ta",
    };
    const { data: student, error: insertError } = await supabase.from("students").insert(row).select("*").single();
    if (insertError) throw new Error(insertError.message);
    if (data.user?.id) {
      const { error: roleError } = await supabase.from("user_roles").insert({ user_id: data.user.id, role: "student" });
      if (roleError) throw new Error(roleError.message);
    }
    return ok({ student }) as T;
  }

  if ((rawPath === "/api/auth/logout" || rawPath === "/api/students/logout") && method === "POST") {
    await supabase.auth.signOut();
    return { success: true } as T;
  }

  if (rawPath === "/api/students/me" || rawPath === "/api/auth/me") {
    return ok(await requireStudent()) as T;
  }

  if (rawPath === "/api/materials") {
    let query = supabase.from("materials").select("*").eq("is_active", true);
    if (params.get("class")) query = query.eq("class", params.get("class"));
    if (params.get("subject")) query = query.eq("subject", params.get("subject"));
    if (params.get("type")) query = query.eq("material_type", params.get("type"));
    const { data, error } = await query.order("display_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ok(data ?? []) as T;
  }

  if (rawPath === "/api/videos") {
    let query = supabase.from("videos").select("*").eq("is_active", true);
    if (params.get("class")) query = query.eq("class", params.get("class"));
    if (params.get("subject")) query = query.eq("subject", params.get("subject"));
    const { data, error } = await query.order("display_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ok(data ?? []) as T;
  }

  if (rawPath === "/api/events") {
    const { data, error } = await supabase.from("events").select("*").eq("is_active", true).order("event_date", { ascending: true });
    if (error) throw new Error(error.message);
    return ok(data ?? []) as T;
  }

  if (rawPath === "/api/notifications") {
    let query = supabase.from("notifications").select("*").eq("is_active", true);
    const targetClass = params.get("target_class");
    if (targetClass) query = query.or(`target_class.is.null,target_class.eq.${targetClass},target_type.eq.all`);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ok(data ?? []) as T;
  }

  if (rawPath === "/api/feedback" && method === "POST") {
    const student = await requireStudent();
    const { data, error } = await supabase.from("feedback").insert({
      student_id: student.id,
      student_name: student.full_name,
      mobile_number: student.mobile_number,
      category: "general",
      district: student.district,
      status: "new",
      message: String(body.message ?? "").trim(),
    }).select("*").single();
    if (error) throw new Error(error.message);
    return ok(data) as T;
  }

  if (rawPath === "/api/feedback/my") {
    const student = await requireStudent();
    const { data, error } = await supabase.from("feedback").select("*").eq("student_id", student.id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ok(data ?? []) as T;
  }

  if (rawPath === "/api/student-problems" && method === "POST") {
    const student = await requireStudent();
    const { data, error } = await supabase.from("student_problems").insert({
      student_id: student.id,
      name: student.full_name,
      class: student.class,
      district: student.district,
      title: body.title,
      description: body.description ?? body.problem_description,
      problem_description: body.description ?? body.problem_description,
      category: body.category ?? null,
      status: "open",
    }).select("*").single();
    if (error) throw new Error(error.message);
    return ok(data) as T;
  }

  if (rawPath === "/api/student-problems/my") {
    const student = await requireStudent();
    const { data, error } = await supabase.from("student_problems").select("*").eq("student_id", student.id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ok(data ?? []) as T;
  }

  if (rawPath === "/api/complaints" && method === "POST") {
    const { data, error } = await supabase.from("complaints").insert({
      complaint_type: body.complaint_type,
      subject: body.subject,
      description: body.description,
      district: body.district,
      school_name: body.school_name,
      class: String(body.class ?? ""),
      status: "pending",
    }).select("*").single();
    if (error) throw new Error(error.message);
    return ok(data) as T;
  }

  throw new Error(`Unsupported direct Supabase path: ${path}`);
}
