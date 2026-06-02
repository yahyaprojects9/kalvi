import { createServer } from "node:http";
import { createServer as createApp } from "../src/server.js";
import { getSupabase } from "../src/config/supabase.js";
import {
  YOUTUBE_VIDEOS,
  extractYouTubeVideoId,
  youtubeThumbnailUrl,
} from "./youtube-videos-data.js";

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] ?? "none";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

async function startApi() {
  const server = createServer(createApp());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

async function fetchApi(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) fail(`API ${path} returned ${response.status}`);
  const body = await response.json();
  return body.data ?? [];
}

function expectedIdsFor(filter) {
  return YOUTUBE_VIDEOS.filter((video) =>
    Object.entries(filter).every(([key, value]) => video[key] === value),
  ).map((video) => extractYouTubeVideoId(video.url));
}

function assertApiIncludes(rows, ids, label) {
  const returnedIds = new Set(rows.map((row) => row.youtube_video_id));
  const missing = ids.filter((id) => !returnedIds.has(id));
  if (missing.length > 0) fail(`${label} missing seeded ids: ${missing.join(", ")}`);
  pass(`${label} includes expected seeded videos`);
}

async function main() {
  const supabase = getSupabase();
  const expectedIds = YOUTUBE_VIDEOS.map((video) => extractYouTubeVideoId(video.url));

  const { error: tableError } = await supabase.from("videos").select("id", { head: true, count: "exact" });
  if (tableError) fail(`videos table check failed: ${tableError.message}`);
  pass("videos table exists");

  const { data: rows, error } = await supabase
    .from("videos")
    .select("id,title,class,subject,term,video_url,youtube_video_id,thumbnail_url,display_order")
    .in("youtube_video_id", expectedIds);
  if (error) fail(`seeded video read failed: ${error.message}`);

  if ((rows ?? []).length !== 26) fail(`expected 26 seeded videos, found ${(rows ?? []).length}`);
  pass("all 26 seeded videos found");

  const byClass = countBy(rows, "class");
  if (byClass["5"] !== 15 || byClass["10"] !== 5 || byClass["12"] !== 6) {
    fail(`unexpected class counts: ${JSON.stringify(byClass)}`);
  }
  pass(`class counts ${JSON.stringify(byClass)}`);

  for (const row of rows) {
    if (!row.youtube_video_id) fail(`missing youtube_video_id for ${row.title}`);
    if (row.thumbnail_url !== youtubeThumbnailUrl(row.youtube_video_id)) {
      fail(`bad thumbnail for ${row.youtube_video_id}`);
    }
    if (row.video_url !== `https://www.youtube.com/embed/${row.youtube_video_id}`) {
      fail(`unsafe/non-embed URL for ${row.youtube_video_id}`);
    }
  }
  pass("video ids, thumbnails, and embed URLs are valid");
  pass(`subject counts ${JSON.stringify(countBy(rows, "subject"))}`);

  const api = await startApi();
  try {
    assertApiIncludes(await fetchApi(api.baseUrl, "/api/videos?class=5"), expectedIdsFor({ class: "5" }), "API class filter");
    assertApiIncludes(
      await fetchApi(api.baseUrl, "/api/videos?class=12&subject=Physics"),
      expectedIdsFor({ class: "12", subject: "Physics" }),
      "API subject filter",
    );
    assertApiIncludes(
      await fetchApi(api.baseUrl, "/api/videos?class=5&term=Term%201"),
      expectedIdsFor({ class: "5", term: "Term 1" }),
      "API term filter",
    );
  } finally {
    await api.close();
  }

  pass("YouTube video verification complete");
}

main().catch((error) => {
  console.error("FAIL verify YouTube videos");
  console.error(error.message);
  process.exit(1);
});
