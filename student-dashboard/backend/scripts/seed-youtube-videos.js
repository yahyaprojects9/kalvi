import { getSupabase } from "../src/config/supabase.js";
import {
  YOUTUBE_VIDEOS,
  extractYouTubeVideoId,
  fallbackVideoTitle,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from "./youtube-videos-data.js";

async function fetchYouTubeTitle(url) {
  const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`oEmbed ${response.status}`);
  const metadata = await response.json();
  if (!metadata.title || typeof metadata.title !== "string") throw new Error("oEmbed title missing");
  return metadata.title.trim();
}

async function findExistingVideo(supabase, row) {
  let query = supabase
    .from("videos")
    .select("id")
    .eq("class", row.class)
    .eq("subject", row.subject)
    .eq("youtube_video_id", row.youtube_video_id)
    .limit(1);

  query = row.term ? query.eq("term", row.term) : query.is("term", null);
  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] ?? null;
}

async function upsertVideo(supabase, row) {
  const existing = await findExistingVideo(supabase, row);
  if (existing?.id) {
    const { error } = await supabase
      .from("videos")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return "updated";
  }

  const { error } = await supabase.from("videos").insert(row);
  if (error) throw error;
  return "inserted";
}

async function main() {
  const supabase = getSupabase();
  const metadataFailures = [];
  let inserted = 0;
  let updated = 0;

  for (const video of YOUTUBE_VIDEOS) {
    const videoId = extractYouTubeVideoId(video.url);
    if (!videoId) throw new Error(`Could not extract YouTube video id from ${video.url}`);

    let title;
    try {
      title = await fetchYouTubeTitle(video.url);
    } catch (error) {
      metadataFailures.push(`${video.class} ${video.subject}${video.term ? ` ${video.term}` : ""}: ${error.message}`);
      title = fallbackVideoTitle(video);
    }

    const row = {
      title,
      description: `Class ${video.class} ${video.subject}${video.term ? ` ${video.term}` : ""} learning video`,
      class: video.class,
      subject: video.subject,
      term: video.term,
      url: youtubeEmbedUrl(videoId),
      video_url: youtubeEmbedUrl(videoId),
      youtube_video_id: videoId,
      thumbnail_url: youtubeThumbnailUrl(videoId),
      source: "YouTube",
      display_order: video.display_order,
      is_active: true,
    };

    const action = await upsertVideo(supabase, row);
    if (action === "inserted") inserted += 1;
    if (action === "updated") updated += 1;
    console.log(`PASS ${action}: Class ${row.class} ${row.subject}${row.term ? ` ${row.term}` : ""} (${row.youtube_video_id})`);
  }

  console.log(`PASS videos processed: ${YOUTUBE_VIDEOS.length}`);
  console.log(`PASS inserted: ${inserted}`);
  console.log(`PASS updated: ${updated}`);
  if (metadataFailures.length > 0) {
    console.log(`PASS metadata fallback used: ${metadataFailures.length}`);
    for (const failure of metadataFailures) console.log(`INFO ${failure}`);
  } else {
    console.log("PASS metadata fetched for all videos");
  }
}

main().catch((error) => {
  console.error("FAIL seed YouTube videos");
  console.error(error.message);
  process.exit(1);
});
