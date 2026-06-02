export const YOUTUBE_VIDEOS = [
  { class: "5", term: "Term 1", subject: "Tamil", url: "https://youtu.be/F3HhcN2H91k?si=_0QveoC54CzD9haP" },
  { class: "5", term: "Term 1", subject: "English", url: "https://youtu.be/uXwNyfrZRds?si=DyHvSNQppxoyl2T8" },
  { class: "5", term: "Term 1", subject: "Maths", url: "https://youtu.be/cwWjM74o_pE?si=yACfWhwvGXn3nVg8" },
  { class: "5", term: "Term 1", subject: "Science", url: "https://youtu.be/2CH_bPNzIqE?si=fRtGL0Bj-7rtmgmd" },
  { class: "5", term: "Term 1", subject: "Social Science", url: "https://youtu.be/ntUGVfE2eeI?si=jHeeKCJrvYRSyDbm" },
  { class: "5", term: "Term 2", subject: "Tamil", url: "https://youtu.be/c45mek8TAGw?si=9DqMDkudWaFc3Oyx" },
  { class: "5", term: "Term 2", subject: "English", url: "https://youtu.be/cb6BcSTGc-A?si=a2xFVzJjzwOTywnw" },
  { class: "5", term: "Term 2", subject: "Maths", url: "https://youtu.be/Bc7FQTVP9so?si=8g8MPharkukIVnpY" },
  { class: "5", term: "Term 2", subject: "Science", url: "https://youtu.be/chmA8V1rRbs?si=KBivbhY828BkYph9" },
  { class: "5", term: "Term 2", subject: "Social Science", url: "https://youtu.be/GCl2rpp_-Wo?si=1yNDSLvD78F16_xT" },
  { class: "5", term: "Term 3", subject: "Tamil", url: "https://youtu.be/SQOYAQmCAg8?si=F_YzLd7wVMug1CC7" },
  { class: "5", term: "Term 3", subject: "English", url: "https://youtu.be/TqeRJf9bDBo?si=EPASp_35P-sGg8ML" },
  { class: "5", term: "Term 3", subject: "Maths", url: "https://youtu.be/0Ee9-FO-p8s?si=w8VGofXniTLbRhSr" },
  { class: "5", term: "Term 3", subject: "Science", url: "https://youtu.be/v4aIeu3Duec?si=35XZLK5HAWoNu6WB" },
  { class: "5", term: "Term 3", subject: "Social Science", url: "https://youtu.be/Xgnshp89CfQ?si=9T4wIYcbdvi11e21" },
  { class: "10", term: null, subject: "Tamil", url: "https://youtu.be/dpMzEzdqzsk?si=7iIB_LEpWYxzL0Uy" },
  { class: "10", term: null, subject: "English", url: "https://youtu.be/uBwmmBFjQ2A?si=xQ7djC8q6eDKspjP" },
  { class: "10", term: null, subject: "Maths", url: "https://youtu.be/JbhnZlABfG8?si=eNaS4wV3rEX9Qcid" },
  { class: "10", term: null, subject: "Science", url: "https://youtu.be/tXWQhhthrJE?si=WvDKHZUE0JXnFLwk" },
  { class: "10", term: null, subject: "Social Science", url: "https://youtu.be/-RR7L0Viiow?si=tpBsu3ggWxrp4Ahl" },
  { class: "12", term: null, subject: "Tamil", url: "https://youtu.be/vfxgPkEBLdE?si=lYuIbwelQ2-9E86D" },
  { class: "12", term: null, subject: "English", url: "https://youtu.be/g4J0xSzL2TE?si=INdXTVn6bJLYRvvt" },
  { class: "12", term: null, subject: "Computer Science", url: "https://youtu.be/qCOYYDjJlsE?si=YCEEbyWxMzC8i3vF" },
  { class: "12", term: null, subject: "Maths", url: "https://youtu.be/QyYVNgPpOd8?si=KSBUU4eYyVpqyrjK" },
  { class: "12", term: null, subject: "Physics", url: "https://youtu.be/AR6w4u-Qe7M?si=_M2FEO23Uww3GmNa" },
  { class: "12", term: null, subject: "Chemistry", url: "https://youtu.be/gA45Yf-q9PI?si=le_Sw2UJIG5gPpj9" },
].map((video, index) => ({ ...video, display_order: index + 1 }));

export function extractYouTubeVideoId(rawUrl) {
  const url = new URL(rawUrl);
  if (url.hostname === "youtu.be") return url.pathname.slice(1);
  if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2];
  if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2];
  return url.searchParams.get("v");
}

export function youtubeEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function youtubeThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function fallbackVideoTitle(video) {
  return `Class ${video.class} ${video.subject}${video.term ? ` ${video.term}` : ""} Video`;
}
