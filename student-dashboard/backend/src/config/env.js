import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: resolve(backendRoot, ".env") });
dotenv.config();

function readEnv(name) {
  return String(process.env[name] ?? "").trim();
}

function normalizeDatabaseUrl(value) {
  return value.trim().replace(/\s+@/g, "@");
}

function isPlaceholder(value) {
  return !value || /your-|replace-with|example/i.test(value);
}

export const env = {
  backendRoot,
  port: Number(readEnv("PORT") || 4000),
  host: readEnv("HOST") || "0.0.0.0",
  supabaseUrl: readEnv("SUPABASE_URL"),
  supabaseAnonKey: readEnv("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  databaseUrl: normalizeDatabaseUrl(readEnv("DATABASE_URL") || readEnv("SUPABASE_DB_URL")),
  strictTls: readEnv("KALVI_STRICT_TLS") === "true" || process.env.NODE_ENV === "production",
};

export function logEnvStatus() {
  console.log(`Supabase URL loaded: ${!isPlaceholder(env.supabaseUrl) ? "yes" : "no"}`);
  console.log(`Service role loaded: ${!isPlaceholder(env.supabaseServiceRoleKey) ? "yes" : "no"}`);
  console.log(`Database URL loaded: ${!isPlaceholder(env.databaseUrl) ? "yes" : "no"}`);
}

export function enableLocalTlsFallback() {
  if (!env.strictTls && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.warn("Local TLS fallback enabled for development. Set KALVI_STRICT_TLS=true to disable it.");
  }
}

export function assertRealDatabaseUrl() {
  if (isPlaceholder(env.databaseUrl)) {
    throw new Error("A real DATABASE_URL or SUPABASE_DB_URL is required in backend/.env. Replace placeholders and remove any space before @.");
  }
}

export function assertRealSupabaseCredentials() {
  if (isPlaceholder(env.supabaseUrl)) throw new Error("A real SUPABASE_URL is required in backend/.env.");
  if (isPlaceholder(env.supabaseServiceRoleKey)) {
    throw new Error("A real SUPABASE_SERVICE_ROLE_KEY is required in backend/.env.");
  }
}
