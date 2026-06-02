import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createApp } from "../src/server.js";
import { getSupabase } from "../src/config/supabase.js";

const BUCKET = "lms-materials";
const EXPECTED = {
  "5": ["Tamil", "English", "Maths", "Science", "Social Science"],
  "10": ["Tamil", "English", "Maths", "Science", "Social Science"],
  "12": ["Tamil", "English", "Maths", "Physics", "Chemistry", "Computer Science"],
};
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => { throw new Error(message); };

async function apiRows(path) {
  const server = createServer(createApp());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    if (!response.ok) fail(`${path} returned ${response.status}`);
    return (await response.json()).data ?? [];
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

try {
  const supabase = getSupabase();
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) fail(bucketError.message);
  if (!buckets?.some((bucket) => bucket.name === BUCKET)) fail(`${BUCKET} bucket missing`);
  pass("lms-materials bucket exists");

  const { data, error } = await supabase
    .from("materials")
    .select("id,title,class,subject,material_type,file_url,storage_path")
    .eq("material_type", "book");
  if (error) fail(error.message);
  const rows = data ?? [];

  for (const [klass, subjects] of Object.entries(EXPECTED)) {
    const classRows = rows.filter((row) => row.class === klass);
    let found = 0;
    for (const subject of subjects) {
      const row = classRows.find((item) => item.subject === subject);
      if (!row) {
        console.log(`INFO missing Class ${klass} ${subject} book`);
        continue;
      }
      if (!row.storage_path?.startsWith(`books/class-${klass}/`)) fail(`bad storage path for Class ${klass} ${subject}`);
      const head = await fetch(row.file_url, { method: "HEAD" });
      if (!head.ok) fail(`PDF URL failed for Class ${klass} ${subject}: ${head.status}`);
      found += 1;
    }
    if (found === 0) fail(`no Class ${klass} books imported`);
    pass(`Class ${klass} imported books valid: ${found}/${subjects.length}`);
  }

  const apiClass10 = (await apiRows("/api/materials?class=10")).filter((row) => row.material_type === "book");
  if (apiClass10.length === 0 || apiClass10.some((row) => row.class !== "10")) fail("student class filtering failed for Class 10 books");
  pass("student class filtering works");

  const guideRows = (await apiRows("/api/materials?class=10")).filter((row) => row.material_type === "guide");
  if (guideRows.some((row) => row.material_type === "book")) fail("books appear under guides");
  pass("books do not appear under guides");

  const build = spawnSync("npm", ["--prefix", "../frontend", "run", "build"], { stdio: "inherit", shell: process.platform === "win32" });
  if (build.status !== 0) process.exit(build.status ?? 1);
  pass("frontend build passes");
} catch (error) {
  console.error("FAIL verify books");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
