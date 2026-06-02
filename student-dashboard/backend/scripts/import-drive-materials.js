import { getSupabase } from "../src/config/supabase.js";
import { discoverDriveMaterials, normalizeMaterial, readFallbackManifest } from "./drive-materials.js";

async function findExistingMaterial(supabase, row) {
  let query = supabase.from("materials").select("id").eq("class", row.class).eq("title", row.title).limit(1);
  if (row.drive_file_id) query = query.eq("drive_file_id", row.drive_file_id);
  else query = query.eq("file_url", row.file_url);
  const { data, error } = await query;
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
  const discovery = await discoverDriveMaterials();
  const manifest = discovery.materials.length > 0 ? discovery : await readFallbackManifest();
  const supabase = getSupabase();
  let inserted = 0;
  let updated = 0;

  console.log(`INFO Drive discovery status: ${discovery.discoveryStatus}`);
  console.log(`INFO Drive folders discovered: ${discovery.folders.length}`);
  console.log(`INFO Drive PDFs discovered: ${discovery.materials.length}`);

  for (const inaccessible of discovery.inaccessible ?? []) {
    console.log(`INFO inaccessible: ${inaccessible.folderId} - ${inaccessible.reason}`);
  }

  if ((manifest.materials ?? []).length === 0) {
    console.log("PASS fallback import structure loaded");
    console.log("INFO no PDFs imported because Drive did not expose file metadata and no fallback material entries were provided");
    console.log("PASS inserted: 0");
    console.log("PASS updated: 0");
    return;
  }

  for (const [index, material] of manifest.materials.entries()) {
    const row = normalizeMaterial(material, index + 1);
    if (!row.title || !row.class || !row.file_url) {
      console.log(`FAIL invalid material skipped at index ${index}`);
      continue;
    }
    const action = await upsertMaterial(supabase, row);
    if (action === "inserted") inserted += 1;
    if (action === "updated") updated += 1;
    console.log(`PASS ${action}: Class ${row.class} ${row.subject ?? "General"} ${row.term ?? ""} - ${row.title}`);
  }

  console.log(`PASS materials processed: ${manifest.materials.length}`);
  console.log(`PASS inserted: ${inserted}`);
  console.log(`PASS updated: ${updated}`);
}

main().catch((error) => {
  console.error("FAIL import Drive materials");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
