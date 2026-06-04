import { getDatabase } from "../config/database.js";

const PUBLIC_TABLES = new Set(["schools", "materials", "videos", "events", "notifications"]);
const FILTER_COLUMNS = {
  schools: new Set(["district"]),
  materials: new Set(["class", "subject", "term", "material_type", "is_active"]),
  videos: new Set(["class", "subject", "term", "is_active"]),
  events: new Set(["class", "target_class", "district", "is_active"]),
  notifications: new Set(["target_class", "target_type", "district", "is_active"]),
  student_problems: new Set(["student_id", "district", "class", "status"]),
  complaints: new Set(["district", "school_name", "class", "complaint_type", "status"]),
};

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() !== "false";
  return Boolean(value);
}

function filterEntries(table, filters = {}) {
  const allowed = FILTER_COLUMNS[table] ?? new Set();
  const entries = [];
  for (const [rawKey, rawValue] of Object.entries(filters)) {
    if (rawValue === undefined || rawValue === null || rawValue === "") continue;
    const key = rawKey === "type" ? "material_type" : rawKey;
    if (!allowed.has(key)) continue;
    entries.push([key, key === "is_active" ? normalizeBoolean(rawValue) : rawValue]);
  }
  return entries;
}

function whereClause(table, filters = {}, startIndex = 1) {
  const values = [];
  const clauses = [];
  for (const [key, value] of filterEntries(table, filters)) {
    values.push(value);
    clauses.push(`"${key}" = $${startIndex + values.length - 1}`);
  }
  return {
    sql: clauses.length ? ` where ${clauses.join(" and ")}` : "",
    values,
  };
}

function updateClause(patch, allowedColumns, startIndex = 1) {
  const values = [];
  const assignments = [];
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (!allowedColumns.has(key)) continue;
    values.push(value);
    assignments.push(`"${key}" = $${startIndex + values.length - 1}`);
  }
  return { assignments, values };
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

  const activeFilters = table === "schools" ? filters : { ...filters, is_active: filters.is_active ?? true };
  const notificationTargetClass = table === "notifications" ? activeFilters.target_class : null;
  const queryFilters = table === "notifications" && notificationTargetClass
    ? { ...activeFilters, target_class: undefined }
    : activeFilters;
  const where = whereClause(table, queryFilters);
  const values = [...where.values];
  const clauses = where.sql ? [where.sql.slice(" where ".length)] : [];

  if (table === "notifications" && notificationTargetClass) {
    values.push(notificationTargetClass);
    clauses.push(`(target_class is null or target_class = $${values.length} or target_type = 'all' or target_type = 'student')`);
  }
  const finalWhere = clauses.length ? ` where ${clauses.join(" and ")}` : "";

  let order = " order by created_at desc";
  if (table === "events") {
    order = " order by event_date asc";
  } else if (table === "videos") {
    order = " order by display_order asc, created_at desc";
  } else if (table === "materials") {
    order = " order by display_order asc, created_at desc";
  }

  const { rows } = await getDatabase().query(`select * from public.${table}${finalWhere}${order}`, values);
  return rows.map((row) => normalizeContentRow(table, row));
}

export async function getRow(table, id) {
  if (!PUBLIC_TABLES.has(table)) {
    throw new Error(`Unsupported table: ${table}`);
  }

  const { rows } = await getDatabase().query(`select * from public.${table} where id = $1 limit 1`, [id]);
  return normalizeContentRow(table, rows[0] ?? null);
}

export async function createFeedback(row) {
  const { rows } = await getDatabase().query(
    `
      insert into public.feedback
        (student_id, student_name, mobile_number, category, subject, district, status, message)
      values
        ($1, $2, $3, $4, $5, $6, $7, $8)
      returning *
    `,
    [
      row.student_id,
      row.student_name ?? null,
      row.mobile_number ?? null,
      row.category ?? "general",
      row.subject ?? row.category ?? "General",
      row.district ?? null,
      row.status ?? "new",
      row.message,
    ],
  );
  return rows[0];
}

export async function listFeedbackByStudent(studentId) {
  const { rows } = await getDatabase().query(
    "select * from public.feedback where student_id = $1 order by created_at desc",
    [studentId],
  );
  return rows;
}

function studentNotificationWhere(student, startIndex = 1) {
  const values = [student.id];
  const clauses = [
    "n.is_active = true",
    `(
      n.target_type = 'all'
      or (n.target_type = 'student' and n.target_value = $${startIndex}::text)
    `,
  ];

  if (student.class) {
    values.push(student.class);
    clauses[1] += ` or n.target_class = $${startIndex + values.length - 1} or (n.target_type = 'class' and n.target_value = $${startIndex + values.length - 1})`;
  }
  if (student.district) {
    values.push(student.district);
    clauses[1] += ` or n.district = $${startIndex + values.length - 1} or (n.target_type = 'district' and n.target_value = $${startIndex + values.length - 1})`;
  }
  if (student.school_name) {
    values.push(student.school_name);
    clauses[1] += ` or (n.target_type = 'school' and n.target_value = $${startIndex + values.length - 1})`;
  }

  clauses[1] += ")";
  return { sql: clauses.join(" and "), values };
}

export async function listNotificationsForStudent(student, filters = {}) {
  const where = studentNotificationWhere(student);
  const values = [...where.values];
  const extra = [];
  if (filters.target_class) {
    values.push(filters.target_class);
    extra.push(`(n.target_class is null or n.target_class = $${values.length} or n.target_type in ('all', 'student'))`);
  }

  const { rows } = await getDatabase().query(
    `
      select
        n.*,
        case
          when n.target_type = 'student' then coalesce(n.is_read, false)
          else exists (
            select 1 from public.announcement_reads ar
            where ar.announcement_id = n.id and ar.student_id = $1
          )
        end as is_read
      from public.notifications n
      where ${where.sql}${extra.length ? ` and ${extra.join(" and ")}` : ""}
      order by n.created_at desc
    `,
    values,
  );
  return rows.map((row) => normalizeContentRow("notifications", row));
}

export async function countUnreadNotifications(student, filters = {}) {
  const rows = await listNotificationsForStudent(student, filters);
  return rows.filter((row) => !row.is_read).length;
}

export async function markNotificationRead(student, notificationId) {
  const notifications = await listNotificationsForStudent(student);
  const notification = notifications.find((row) => row.id === notificationId);
  if (!notification) return null;

  if (notification.target_type === "student") {
    const { rows } = await getDatabase().query(
      "update public.notifications set is_read = true, updated_at = now() where id = $1 returning *",
      [notificationId],
    );
    return normalizeContentRow("notifications", { ...rows[0], is_read: true });
  }

  await getDatabase().query(
    `
      insert into public.announcement_reads (announcement_id, student_id, read_at)
      values ($1, $2, now())
      on conflict (announcement_id, student_id) do update set read_at = excluded.read_at
    `,
    [notificationId, student.id],
  );
  return { ...notification, is_read: true };
}

export async function createStudentProblem(row) {
  const { rows } = await getDatabase().query(
    `
      insert into public.student_problems
        (student_id, name, class, district, title, description, problem_description, category, status)
      values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning *
    `,
    [
      row.student_id,
      row.name ?? null,
      row.class ?? null,
      row.district ?? null,
      row.title,
      row.description,
      row.problem_description ?? row.description,
      row.category ?? null,
      row.status ?? "open",
    ],
  );
  return rows[0];
}

export async function listStudentProblems(filters = {}) {
  const where = whereClause("student_problems", filters);
  const { rows } = await getDatabase().query(
    `select * from public.student_problems${where.sql} order by created_at desc`,
    where.values,
  );
  return rows;
}

export async function getStudentProblem(id) {
  const { rows } = await getDatabase().query("select * from public.student_problems where id = $1 limit 1", [id]);
  return rows[0] ?? null;
}

export async function updateStudentProblem(id, patch) {
  const allowed = new Set(["title", "description", "category", "status", "problem_description"]);
  const update = updateClause({ ...patch, updated_at: new Date().toISOString() }, new Set([...allowed, "updated_at"]));
  if (!update.assignments.length) return await getStudentProblem(id);
  const { rows } = await getDatabase().query(
    `update public.student_problems set ${update.assignments.join(", ")} where id = $${update.values.length + 1} returning *`,
    [...update.values, id],
  );
  return rows[0] ?? null;
}

export async function deleteStudentProblem(id) {
  const { rows } = await getDatabase().query("delete from public.student_problems where id = $1 returning id", [id]);
  return rows[0] ?? null;
}

export async function createComplaint(row) {
  const { rows } = await getDatabase().query(
    `
      insert into public.complaints
        (student_id, complaint_type, subject, description, district, school_name, class, status)
      values
        ($1, $2, $3, $4, $5, $6, $7, coalesce($8, 'pending'))
      returning *
    `,
    [
      row.student_id ?? null,
      row.complaint_type,
      row.subject,
      row.description,
      row.district,
      row.school_name,
      row.class,
      row.status ?? "pending",
    ],
  );
  return rows[0];
}

export async function listComplaints(filters = {}) {
  const where = whereClause("complaints", filters);
  const { rows } = await getDatabase().query(
    `select * from public.complaints${where.sql} order by created_at desc`,
    where.values,
  );
  return rows;
}

export async function getComplaint(id) {
  const { rows } = await getDatabase().query("select * from public.complaints where id = $1 limit 1", [id]);
  return rows[0] ?? null;
}

export async function updateComplaintStatus(id, patch) {
  const { rows } = await getDatabase().query(
    "update public.complaints set status = $1, admin_response = $2, updated_at = $3 where id = $4 returning id, complaint_type, subject, description, district, school_name, class, status, admin_response, created_at, updated_at",
    [patch.status, patch.admin_response ?? null, new Date().toISOString(), id],
  );
  return rows[0] ?? null;
}

export async function databasePing() {
  await getDatabase().query("select 1");
  return { status: "ok" };
}
