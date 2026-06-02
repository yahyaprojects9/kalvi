import bcrypt from "bcrypt";
import { getSupabase } from "../src/config/supabase.js";

const STUDENTS = [
  {
    full_name: "Kavi",
    gender: "female",
    class: "5",
    mobile_number: "9000010001",
    email: "kavi@kalvi.test",
    school_name: "Kalvi Demo School",
    district: "Chennai",
  },
  {
    full_name: "Arun",
    gender: "male",
    class: "10",
    mobile_number: "9000010002",
    email: "arun@kalvi.test",
    school_name: "Kalvi Demo School",
    district: "Chennai",
  },
  {
    full_name: "Arul",
    gender: "male",
    class: "12",
    mobile_number: "9000010003",
    email: "arul@kalvi.test",
    school_name: "Kalvi Demo School",
    district: "Chennai",
  },
];

try {
  const passwordHash = await bcrypt.hash("student123", 12);
  const supabase = getSupabase();

  for (const student of STUDENTS) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: student.email,
      password: "student123",
      email_confirm: true,
      user_metadata: { full_name: student.full_name, role: "student" },
    });
    const authUser = createError?.message?.includes("already been registered")
      ? (await supabase.auth.admin.listUsers()).data.users.find((user) => user.email === student.email)
      : created?.user;
    if (createError && !authUser) throw createError;

    const { email, ...studentRow } = student;
    const { error } = await supabase.from("students").upsert(
      { ...studentRow, auth_user_id: authUser?.id, password_hash: passwordHash, updated_at: new Date().toISOString() },
      { onConflict: "mobile_number" },
    );
    if (error) throw error;

    if (authUser?.id) {
      const { error: roleError } = await supabase.from("user_roles").upsert(
        { user_id: authUser.id, role: "student" },
        { onConflict: "user_id,role" },
      );
      if (roleError) throw roleError;
    }
    console.log(`PASS seeded ${student.full_name}: ${student.mobile_number}`);
  }

  console.log("PASS mock student seed complete");
} catch (error) {
  console.error("FAIL mock student seed failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
