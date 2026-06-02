import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { env, enableLocalTlsFallback } from "../src/config/env.js";

export const DRIVE_ROOT_FOLDER_ID = "1UvAbbvesA3uPZ1B1hlHjT75_lfCcoUO-";
export const DRIVE_ROOT_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_ROOT_FOLDER_ID}?usp=drive_link`;
export const FALLBACK_MANIFEST = resolve(env.backendRoot, "data/drive-materials-fallback.json");
export const DISCOVERED_MANIFEST = resolve(env.backendRoot, "data/drive-materials-discovered.json");

const PDF_MIME_TYPE = "application/pdf";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export function extractDriveFileId(url) {
  if (!url || typeof url !== "string") return "";
  const patterns = [
    /\/file\/d\/([^/]+)/,
    /[?&]id=([^&]+)/,
    /\/open\?id=([^&]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return "";
}

export function drivePreviewUrl(fileIdOrUrl) {
  const fileId = extractDriveFileId(fileIdOrUrl) || fileIdOrUrl;
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : "";
}

export function driveDownloadUrl(fileIdOrUrl) {
  const fileId = extractDriveFileId(fileIdOrUrl) || fileIdOrUrl;
  return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : "";
}

function parseFolderContext(pathParts) {
  const classPart = pathParts.find((part) => /^Class\s+\d+$/i.test(part));
  const termPart = pathParts.find((part) => /^Term\s+\d+$/i.test(part));
  const classValue = classPart?.match(/\d+/)?.[0] ?? null;
  const term = classValue === "5" ? termPart ?? null : null;
  const subject = pathParts[pathParts.length - 1] && !/^Term\s+\d+$/i.test(pathParts[pathParts.length - 1])
    ? pathParts[pathParts.length - 1]
    : null;
  return { class: classValue, term, subject };
}

async function listDriveChildren(folderId) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,webViewLink),nextPageToken",
    pageSize: "1000",
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Drive API ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  return body.files ?? [];
}

async function walkDrive(folderId, pathParts = [], output = { folders: [], materials: [], inaccessible: [] }) {
  const children = await listDriveChildren(folderId);
  for (const child of children) {
    const childPath = [...pathParts, child.name];
    if (child.mimeType === FOLDER_MIME_TYPE) {
      const context = parseFolderContext(childPath);
      output.folders.push({ path: childPath.join("/"), ...context });
      await walkDrive(child.id, childPath, output);
    } else if (child.mimeType === PDF_MIME_TYPE || child.name.toLowerCase().endsWith(".pdf")) {
      const context = parseFolderContext(pathParts);
      output.materials.push({
        title: child.name.replace(/\.pdf$/i, "").trim(),
        class: context.class,
        term: context.term,
        subject: context.subject,
        drive_file_id: child.id,
        file_url: child.webViewLink ?? `https://drive.google.com/file/d/${child.id}/view`,
      });
    }
  }
  return output;
}

export async function discoverDriveMaterials() {
  enableLocalTlsFallback();
  const result = {
    rootFolderId: DRIVE_ROOT_FOLDER_ID,
    rootFolderUrl: DRIVE_ROOT_FOLDER_URL,
    discoveryStatus: "unknown",
    folders: [],
    materials: [],
    inaccessible: [],
  };

  try {
    const discovered = await walkDrive(DRIVE_ROOT_FOLDER_ID, ["Guides"], result);
    discovered.discoveryStatus = "discovered";
    await writeFile(DISCOVERED_MANIFEST, `${JSON.stringify(discovered, null, 2)}\n`);
    return discovered;
  } catch (error) {
    result.discoveryStatus = "blocked";
    result.inaccessible.push({
      folderId: DRIVE_ROOT_FOLDER_ID,
      reason: error instanceof Error ? error.message : "Unknown Drive discovery error",
    });
    return result;
  }
}

export async function readFallbackManifest() {
  return JSON.parse(await readFile(FALLBACK_MANIFEST, "utf8"));
}

export function normalizeMaterial(raw, displayOrder) {
  const driveFileId = raw.drive_file_id || extractDriveFileId(raw.file_url || raw.url);
  const previewUrl = drivePreviewUrl(driveFileId || raw.file_url || raw.url);
  return {
    title: raw.title,
    description: raw.description ?? null,
    class: String(raw.class ?? ""),
    term: raw.term ?? null,
    subject: raw.subject ?? null,
    type: raw.material_type ?? raw.type ?? "guide",
    material_type: raw.material_type ?? raw.type ?? "guide",
    file_url: raw.file_url ?? raw.url,
    url: previewUrl || raw.url || raw.file_url,
    drive_file_id: driveFileId || null,
    source: "Google Drive",
    display_order: raw.display_order ?? displayOrder,
    is_active: true,
  };
}
