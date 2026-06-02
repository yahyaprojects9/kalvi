import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { getSupabase } from "../src/config/supabase.js";
import { env } from "../src/config/env.js";

const BUCKET = "lms-materials";
const SOURCE = "Imported Book PDF";
const PDF_LIB_REQUIRE = createRequire("C:/Users/Welcome/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pdf-lib@1.17.1/node_modules/pdf-lib/package.json");
const DEFAULT_ZIPS = {
  "5": "C:/Users/Welcome/Downloads/5th Std-20260601T045724Z-3-001.zip",
  "10": "C:/Users/Welcome/Downloads/10th Std-20260601T045722Z-3-001.zip",
  "12": "C:/Users/Welcome/Downloads/12th Std-20260601T050346Z-3-001.zip",
};
const EXPECTED = {
  "5": ["Tamil", "English", "Maths", "Science", "Social Science"],
  "10": ["Tamil", "English", "Maths", "Science", "Social Science"],
  "12": ["Tamil", "English", "Maths", "Physics", "Chemistry", "Computer Science"],
};
const SUBJECTS = new Map([
  ["computer science", "Computer Science"],
  ["social science", "Social Science"],
  ["chemistry", "Chemistry"],
  ["english", "English"],
  ["physics", "Physics"],
  ["science", "Science"],
  ["maths", "Maths"],
  ["mathametics", "Maths"],
  ["tamil", "Tamil"],
]);

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleFromFile(fileName, subject) {
  const cleaned = fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || `${subject} Book`;
}

function metadataValue(value) {
  return Buffer.from(String(value)).toString("base64");
}

async function compressPdf(bytes) {
  try {
    const { PDFDocument } = PDF_LIB_REQUIRE("pdf-lib");
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const compressed = Buffer.from(await pdf.save({ useObjectStreams: true, objectsPerTick: 50 }));
    return compressed.length < bytes.length ? compressed : bytes;
  } catch {
    return bytes;
  }
}

async function uploadTus(storagePath, bytes) {
  const endpoint = `${env.supabaseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;
  const metadata = [
    `bucketName ${metadataValue(BUCKET)}`,
    `objectName ${metadataValue(storagePath)}`,
    `contentType ${metadataValue("application/pdf")}`,
    `cacheControl ${metadataValue("3600")}`,
  ].join(",");
  const headers = {
    authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    apikey: env.supabaseServiceRoleKey,
    "tus-resumable": "1.0.0",
    "upload-length": String(bytes.length),
    "upload-metadata": metadata,
    "x-upsert": "true",
  };
  const create = await fetch(endpoint, { method: "POST", headers });
  if (!create.ok) throw new Error(`resumable create failed: ${create.status} ${await create.text()}`);
  const uploadUrl = create.headers.get("location");
  if (!uploadUrl) throw new Error("resumable upload URL missing");
  const chunkSize = 6 * 1024 * 1024;
  let offset = 0;
  while (offset < bytes.length) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    const patch = await fetch(uploadUrl, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        apikey: env.supabaseServiceRoleKey,
        "tus-resumable": "1.0.0",
        "upload-offset": String(offset),
        "content-type": "application/offset+octet-stream",
      },
      body: chunk,
    });
    if (!patch.ok) throw new Error(`resumable patch failed: ${patch.status} ${await patch.text()}`);
    offset = Number(patch.headers.get("upload-offset") ?? offset + chunk.length);
  }
}

function inferClass(parts, fileName) {
  const text = [...parts, fileName].join("/").toLowerCase();
  if (text.includes("12th") || text.includes("class 12")) return "12";
  if (text.includes("10th") || text.includes("class 10")) return "10";
  if (text.includes("5th") || text.includes("class 5")) return "5";
  return "";
}

function inferSubject(parts, fileName) {
  const text = [...parts, fileName].join("/").toLowerCase().replace(/[_-]+/g, " ");
  for (const [needle, subject] of SUBJECTS) if (text.includes(needle)) return subject;
  return "";
}

function extractZip(zipPath, destination) {
  const result = spawnSync("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`,
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `Failed to extract ${zipPath}`);
}

async function collectPdfs(dir, root = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectPdfs(fullPath, root));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      const parts = fullPath.slice(root.length + 1).split(/[\\/]+/);
      if (parts.some((part) => part.toLowerCase() === "books")) {
        files.push({ fullPath, parts: parts.slice(0, -1), fileName: entry.name });
      }
    }
  }
  return files.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
}

async function ensureBucket(supabase) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const options = { public: true, allowedMimeTypes: ["application/pdf"], fileSizeLimit: 120 * 1024 * 1024 };
  const exists = data?.some((bucket) => bucket.name === BUCKET);
  const { error: bucketError } = exists
    ? await supabase.storage.updateBucket(BUCKET, options)
    : await supabase.storage.createBucket(BUCKET, options);
  if (bucketError) console.log(`INFO bucket size limit unchanged: ${bucketError.message}`);
}

async function upsertBook(supabase, row) {
  const { data, error } = await supabase
    .from("materials")
    .select("id")
    .eq("class", row.class)
    .eq("subject", row.subject)
    .eq("material_type", "book")
    .limit(1);
  if (error) throw error;
  const existing = data?.[0];
  if (existing) {
    const { error: updateError } = await supabase.from("materials").update({ ...row, updated_at: new Date().toISOString() }).eq("id", existing.id);
    if (updateError) throw updateError;
    return "updated";
  }
  const { error: insertError } = await supabase.from("materials").insert(row);
  if (insertError) throw insertError;
  return "inserted";
}

async function main() {
  const klassArg = String(process.argv[2] ?? "").trim();
  const zipPath = process.argv[3] ?? DEFAULT_ZIPS[klassArg];
  if (!EXPECTED[klassArg] || !zipPath) throw new Error("Usage: node scripts/import-book-pdfs.js <5|10|12> [zip-or-folder-path]");

  const supabase = getSupabase();
  await ensureBucket(supabase);
  const temp = await mkdtemp(join(tmpdir(), "kalvi-books-"));
  const extractDir = join(temp, basename(zipPath, extname(zipPath)));
  const seen = new Set();
  let uploaded = 0;
  let inserted = 0;
  let updated = 0;
  let bytes = 0;
  const skipped = [];

  try {
    if (zipPath.toLowerCase().endsWith(".zip")) extractZip(resolve(zipPath), extractDir);
    const root = zipPath.toLowerCase().endsWith(".zip") ? extractDir : resolve(zipPath);
    for (const pdf of await collectPdfs(root)) {
      const klass = inferClass(pdf.parts, pdf.fileName) || klassArg;
      const subject = inferSubject(pdf.parts, pdf.fileName);
      if (klass !== klassArg || !EXPECTED[klass]?.includes(subject)) {
        skipped.push(`${pdf.parts.join("/")}/${pdf.fileName}`);
        continue;
      }
      const key = `${klass}:${subject}`;
      if (seen.has(key)) {
        skipped.push(`duplicate ${key}: ${pdf.fileName}`);
        continue;
      }
      let fileBytes = await readFile(pdf.fullPath);
      const storagePath = `books/class-${klass}/${slug(subject)}/${slug(pdf.fileName.replace(/\.pdf$/i, ""))}.pdf`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, fileBytes, { contentType: "application/pdf", upsert: true });
      if (uploadError) {
        fileBytes = await compressPdf(fileBytes);
        try {
          await uploadTus(storagePath, fileBytes);
          console.log(`PASS compressed/resumable upload used: ${pdf.fileName}`);
        } catch (resumableError) {
          skipped.push(`${pdf.fileName}: ${resumableError.message}`);
          continue;
        }
      }
      const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      const row = {
        title: titleFromFile(pdf.fileName, subject),
        description: `Class ${klass} ${subject} book`,
        class: klass,
        subject,
        term: null,
        type: "book",
        material_type: "book",
        file_url: publicUrl.publicUrl,
        url: publicUrl.publicUrl,
        storage_path: storagePath,
        source: SOURCE,
        display_order: EXPECTED[klass].indexOf(subject) + 1,
        is_active: true,
      };
      const action = await upsertBook(supabase, row);
      if (action === "inserted") inserted += 1;
      else updated += 1;
      seen.add(key);
      uploaded += 1;
      bytes += fileBytes.length;
      console.log(`PASS: Class ${klass} / ${subject} / ${pdf.fileName} uploaded`);
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }

  console.log(`PASS class ${klassArg} books uploaded: ${uploaded}`);
  console.log(`PASS inserted: ${inserted}`);
  console.log(`PASS updated: ${updated}`);
  console.log(`PASS storage bytes: ${bytes}`);
  if (skipped.length) for (const item of skipped) console.log(`INFO skipped: ${item}`);
  else console.log("PASS skipped: 0");
}

main().catch((error) => {
  console.error("FAIL import book PDFs");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
