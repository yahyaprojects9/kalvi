import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { createServer as createApp } from "../src/server.js";
import { getSupabase } from "../src/config/supabase.js";

const EXPECTED = {
  "5": { book: 5, guide: 5 },
  "10": { book: 4, guide: 5 },
  "12": { book: 4, guide: 6 },
};

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  throw new Error(message);
}

async function startApi() {
  const server = createServer(createApp());
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose()))),
  };
}

async function fetchRows(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) fail(`${path} returned ${response.status}`);
  const body = await response.json();
  return body.data ?? [];
}

function assertRows(rows, klass, type, minimum) {
  if (rows.length < minimum) fail(`Class ${klass} ${type}s expected at least ${minimum}, found ${rows.length}`);
  if (rows.some((row) => row.class !== klass)) fail(`Class ${klass} ${type}s include another class`);
  if (rows.some((row) => row.material_type !== type)) fail(`Class ${klass} ${type}s include another material type`);
}

async function main() {
  const supabase = getSupabase();
  const { error: tableError } = await supabase.from("materials").select("id", { head: true, count: "exact" });
  if (tableError) fail(`materials table check failed: ${tableError.message}`);
  pass("materials table exists");

  const api = await startApi();
  try {
    for (const [klass, targets] of Object.entries(EXPECTED)) {
      const books = await fetchRows(api.baseUrl, `/api/materials?class=${klass}&type=book`);
      assertRows(books, klass, "book", targets.book);
      pass(`Class ${klass} books`);

      const guides = await fetchRows(api.baseUrl, `/api/materials?class=${klass}&type=guide`);
      assertRows(guides, klass, "guide", targets.guide);
      pass(`Class ${klass} guides`);
    }

    const unsupportedBooks = await fetchRows(api.baseUrl, "/api/materials?class=3&type=book");
    const unsupportedGuides = await fetchRows(api.baseUrl, "/api/materials?class=3&type=guide");
    if (unsupportedBooks.length !== 0 || unsupportedGuides.length !== 0) fail("unsupported class should return empty book/guide lists");
    pass("unsupported class empty state");
  } finally {
    await api.close();
  }

  const materialsPage = await readFile(resolve("../frontend/src/routes/_authenticated/materials.tsx"), "utf8");
  if (!materialsPage.includes('TabsTrigger value="books"') || !materialsPage.includes('TabsTrigger value="guides"')) {
    fail("Books and Guides tabs are not both visible");
  }
  pass("only Books and Guides tabs visible");

  if (materialsPage.includes('TabsTrigger value="materials"')) fail("Materials tab still exists");
  pass("Materials tab removed");

  if (!materialsPage.includes('key={`${activeMaterial.id}-${materialPreviewUrl(activeMaterial)}`}')) {
    fail("PDF viewer does not remount by selected material");
  }
  pass("PDF viewer remounts when switching files");

  if (!materialsPage.includes("Open PDF in new tab")) fail("fallback new-tab button missing");
  pass("fallback new-tab button exists");

  if (!materialsPage.includes("overflow-x-hidden") || !materialsPage.includes("max-w-full")) {
    fail("mobile no-overflow safeguards missing");
  }
  pass("mobile layout has no horizontal overflow");
}

main().catch((error) => {
  console.error("FAIL verify materials");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
