import bcrypt from "bcrypt";
import { getSupabase } from "../src/config/supabase.js";

const email = "admin@kalvi.test";
const password = "admin123";

try {
  const password_hash = await bcrypt.hash(password, 12);
  const supabase = getSupabase();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Kalvi Admin", role: "admin" },
  });
  const authUser = createError?.message?.includes("already been registered")
    ? (await supabase.auth.admin.listUsers()).data.users.find((user) => user.email === email)
    : created?.user;
  if (createError && !authUser) throw createError;

  const { error } = await supabase.from("admin_users").upsert(
    { name: "Kalvi Admin", email, password_hash, role: "admin" },
    { onConflict: "email" },
  );
  if (error) throw error;
  if (authUser?.id) {
    const { error: roleError } = await supabase.from("user_roles").upsert(
      { user_id: authUser.id, role: "admin" },
      { onConflict: "user_id,role" },
    );
    if (roleError) throw roleError;
  }
  console.log(`PASS admin user seeded: ${email}`);
} catch (error) {
  console.error("FAIL seed admin");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
