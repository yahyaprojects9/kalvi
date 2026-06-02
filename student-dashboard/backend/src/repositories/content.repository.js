import { getSupabase } from "../config/supabase.js";

const PUBLIC_TABLES = new Set(["schools", "materials", "videos", "events", "notifications"]);

function applyCommonFilters(query, filters) {
  if (filters.class) query = query.eq("class", filters.class);
  if (filters.type) query = query.eq("material_type", filters.type);
  if (filters.material_type) query = query.eq("material_type", filters.material_type);
  if (filters.target_class) query = query.eq("target_class", filters.target_class);
  if (filters.subject) query = query.eq("subject", filters.subject);
  if (filters.term) query = query.eq("term", filters.term);
  if (filters.district) query = query.eq("district", filters.district);
  if (filters.target_type) query = query.eq("target_type", filters.target_type);
  if ("is_active" in filters) query = query.eq("is_active", filters.is_active);
  return query;
}

function normalizeContentRow(table, row) {
  if (!row) return row;
  if (table === "materials") {
    return {
      ...row,
      url: row.url ?? row.file_url,
      file_url: row.file_url ?? row.url,
      type: row.type ?? row.material_type ?? "material",
      material_type: row.material_type ?? row.type ?? "material",
      source: row.source ?? "Supabase",
    };
  }
  if (table === "videos") {
    return {
      ...row,
      url: row.url ?? row.video_url,
      video_url: row.video_url ?? row.url,
      source: row.source ?? "Supabase",
    };
  }
  if (table === "events") {
    return {
      ...row,
      venue: row.venue ?? row.location,
      location: row.location ?? row.venue,
    };
  }
  if (table === "notifications") {
    return {
      ...row,
      target_type: row.target_type ?? (row.target_class ? "class" : "all"),
      target_value: row.target_value ?? row.target_class,
    };
  }
  return row;
}

export async function listRows(table, filters = {}) {
  if (!PUBLIC_TABLES.has(table)) {
    throw new Error(`Unsupported table: ${table}`);
  }

  let query = getSupabase().from(table).select("*");
  const activeFilters = table === "schools" ? filters : { ...filters, is_active: filters.is_active ?? true };
  query = applyCommonFilters(query, activeFilters);

  if (table === "events") {
    query = query.order("event_date", { ascending: true });
  } else if (table === "videos") {
    query = query.order("display_order", { ascending: true }).order("created_at", { ascending: false });
  } else if (table === "materials") {
    query = query.order("display_order", { ascending: true }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizeContentRow(table, row));
}

export async function getRow(table, id) {
  if (!PUBLIC_TABLES.has(table)) {
    throw new Error(`Unsupported table: ${table}`);
  }

  const { data, error } = await getSupabase()
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return normalizeContentRow(table, data);
}

export async function createFeedback(row) {
  const { data, error } = await getSupabase().from("feedback").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

export async function listFeedbackByStudent(studentId) {
  const { data, error } = await getSupabase()
    .from("feedback")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createStudentProblem(row) {
  const { data, error } = await getSupabase()
    .from("student_problems")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listStudentProblems(filters = {}) {
  let query = getSupabase().from("student_problems").select("*").order("created_at", { ascending: false });

  if (filters.student_id) query = query.eq("student_id", filters.student_id);
  if (filters.district) query = query.eq("district", filters.district);
  if (filters.class) query = query.eq("class", filters.class);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getStudentProblem(id) {
  const { data, error } = await getSupabase()
    .from("student_problems")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateStudentProblem(id, patch) {
  const { data, error } = await getSupabase()
    .from("student_problems")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteStudentProblem(id) {
  const { data, error } = await getSupabase()
    .from("student_problems")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createComplaint(row) {
  const { data, error } = await getSupabase()
    .from("complaints")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listComplaints(filters = {}) {
  let query = getSupabase().from("complaints").select("*").order("created_at", { ascending: false });

  if (filters.district) query = query.eq("district", filters.district);
  if (filters.school_name) query = query.eq("school_name", filters.school_name);
  if (filters.class) query = query.eq("class", filters.class);
  if (filters.complaint_type) query = query.eq("complaint_type", filters.complaint_type);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getComplaint(id) {
  const { data, error } = await getSupabase()
    .from("complaints")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateComplaintStatus(id, status) {
  const { data, error } = await getSupabase()
    .from("complaints")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function databasePing() {
  const { error } = await getSupabase().from("schools").select("id", { head: true, count: "exact" });
  if (error) throw error;
  return { status: "ok" };
}
