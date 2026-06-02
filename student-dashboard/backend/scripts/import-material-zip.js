import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { getSupabase } from "../src/config/supabase.js";

const BUCKET = "lms-materials";
const SOURCE = "Imported PDF";
const OLD_SOURCE = "Supabase Storage ZIP";
const DEFAULT_ZIPS = [
  "C:/Users/Welcome/Downloads/Term 1-20260601T044200Z-3-001.zip",
  "C:/Users/Welcome/Downloads/class 10-20260601T044513Z-3-001.zip",
  "C:/Users/Welcome/Downloads/class 12-20260601T044515Z-3-001.zip",
];

const EXPECTED = {
  "5": ["Tamil", "English", "Maths", "Science", "Social Science"],
  "10": ["Tamil", "English", "Maths", "Science", "Social Science"],
  "12": ["Tamil", "English", "Maths", "Physics", "Chemistry", "Computer Science"],
};

const SUBJECT_NORMALIZATION = new Map([
  ["social science", "Social Science"],
  ["social sciences", "Social Science"],
  ["computer science", "Computer Science"],
  ["chemistry", "Chemistry"],
  ["english", "English"],
  ["maths", "Maths"],
  ["physics", "Physics"],
  ["science", "Science"],
  ["tamil", "Tamil"],
]);

function zipPaths() {
  const configured = process.env.MATERIALS_ZIP_PATHS?.trim();
  if (!configured) return DEFAULT_ZIPS;
  return configured.split(";").map((path) => path.trim()).filter(Boolean);
}

function inferClass(parts, fileName) {
  const source = [...parts, fileName].join("/").toLowerCase();
  if (source.includes("class 12") || source.includes("class-12") || source.includes("12th")) return "12";
  if (source.includes("class 10") || source.includes("class-10") || source.includes("10th")) return "10";
  if (source.includes("class 5") || source.includes("class-5") || source.includes("5th") || source.includes("term 1")) return "5";
  return "";
}

function inferSubject(parts, fileName) {
  const candidates = [...parts.slice().reverse(), fileName.replace(extname(fileName), "")];
  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase().replace(/[_-]+/g, " ");
    for (const [needle, subject] of SUBJECT_NORMALIZATION) {
      if (normalized.includes(needle)) return subject;
    }
  }
  return "";
}

function storagePath(klass, subject) {
  return `class-${klass}/${subject.toLowerCase().replace(/\s+/g, "-")}.pdf`;
}

function titleFor(subject, materialType) {
  return materialType === "material" ? `${subject} Material` : `${subject} Guide`;
}

function materialTypeFromName(fileName) {
  const normalized = fileName.toLowerCase();
  if (normalized.includes("notes")) return "material";
  return "guide";
}

function extractZip(zipPath, destination) {
  const command = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`,
  ];
  const result = spawnSync("powershell", command, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Failed to extract ${zipPath}: ${result.stderr || result.stdout}`);
}

async function collectPdfs(dir, root = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectPdfs(fullPath, root));
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      const relativeParts = fullPath.slice(root.length + 1).split(/[\\/]+/);
      files.push({ fullPath, parts: relativeParts.slice(0, -1), fileName: entry.name });
    }
  }
  return files;
}

async function ensureBucket(supabase) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;
  const existing = buckets?.find((bucket) => bucket.name === BUCKET);
  const options = { public: true, allowedMimeTypes: ["application/pdf"] };
  const { error } = existing
    ? await supabase.storage.updateBucket(BUCKET, options)
    : await supabase.storage.createBucket(BUCKET, options);
  if (error) throw error;
  if (!existing) console.log(`PASS created storage bucket: ${BUCKET}`);
}

async function normalizeExistingRows(supabase) {
  const { data: rows, error } = await supabase
    .from("materials")
    .select("id,title,subject,type,material_type,source")
    .in("source", [SOURCE, OLD_SOURCE]);
  if (error) throw error;

  let updated = 0;
  for (const row of rows ?? []) {
    const currentType = row.material_type ?? row.type;
    const materialType = currentType === "subject_notes" || currentType === "material" ? "material" : "guide";
    const title = row.subject ? titleFor(row.subject, materialType) : String(row.title ?? "").replace(/\bBook\b/g, "Guide");
    const { error: updateError } = await supabase
      .from("materials")
      .update({
        title,
        type: materialType,
        material_type: materialType,
        source: SOURCE,
        term: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (updateError) throw updateError;
    updated += 1;
  }
  return updated;
}

async function findExistingMaterial(supabase, row) {
  const { data, error } = await supabase
    .from("materials")
    .select("id")
    .eq("class", row.class)
    .eq("subject", row.subject)
    .in("source", [SOURCE, OLD_SOURCE])
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function upsertMaterial(supabase, row) {
  const existing = await findExistingMaterial(supabase, row);
  if (existing?.id) {
    const { error } = await supabase
      .from("materials")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return "updated";
  }

  const { error } = await supabase.from("materials").insert(row);
  if (error) throw error;
  return "inserted";
}

async function main() {
  const supabase = getSupabase();
  await ensureBucket(supabase);
  const normalized = await normalizeExistingRows(supabase);

  const tempRoot = await mkdtemp(join(tmpdir(), "kalvi-materials-"));
  const skipped = [];
  const importedSubjects = new Set();
  let uploaded = 0;
  let inserted = 0;
  let updated = 0;
  let totalBytes = 0;

  try {
    for (const zipPath of zipPaths()) {
      const extractDir = join(tempRoot, basename(zipPath, ".zip"));
      extractZip(resolve(zipPath), extractDir);
      const pdfs = await collectPdfs(extractDir);

      for (const pdf of pdfs) {
        const klass = inferClass(pdf.parts, pdf.fileName);
        const subject = inferSubject(pdf.parts, pdf.fileName);
        if (!klass || !subject || !EXPECTED[klass]?.includes(subject)) {
          skipped.push(`${pdf.parts.join("/")}/${pdf.fileName}`);
          continue;
        }

        const materialType = materialTypeFromName(pdf.fileName);
        const bytes = await readFile(pdf.fullPath);
        const path = storagePath(klass, subject);
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType: "application/pdf", upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const row = {
          title: titleFor(subject, materialType),
          description: `Class ${klass} ${subject} PDF ${materialType}`,
          class: klass,
          subject,
          term: null,
          type: materialType,
          material_type: materialType,
          file_url: publicUrl.publicUrl,
          url: publicUrl.publicUrl,
          source: SOURCE,
          display_order: EXPECTED[klass].indexOf(subject) + 1,
          is_active: true,
        };

        const action = await upsertMaterial(supabase, row);
        if (action === "inserted") inserted += 1;
        if (action === "updated") updated += 1;
        uploaded += 1;
        totalBytes += bytes.length;
        importedSubjects.add(`Class ${klass} / ${subject}`);
        console.log(`PASS uploaded: Class ${klass} / ${pdf.fileName}`);
      }
    }

    console.log(`PASS existing records normalized: ${normalized}`);
    console.log(`PASS PDFs uploaded: ${uploaded}`);
    console.log(`PASS metadata inserted: ${inserted}`);
    console.log(`PASS metadata updated: ${updated}`);
    console.log(`PASS storage bytes uploaded: ${totalBytes}`);
    console.log(`PASS subjects imported: ${Array.from(importedSubjects).sort().join("; ")}`);
    if (skipped.length > 0) for (const file of skipped) console.log(`INFO skipped: ${file}`);
    else console.log("PASS files skipped: 0");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("FAIL import materials ZIP");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
