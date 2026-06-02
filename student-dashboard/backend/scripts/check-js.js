import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { env } from "../src/config/env.js";

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectJsFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(path);
  }
  return files;
}

const files = [
  join(env.backendRoot, "server.js"),
  ...await collectJsFiles(join(env.backendRoot, "src")),
  ...await collectJsFiles(join(env.backendRoot, "scripts")),
].filter((file) => !file.endsWith("check-js.js"));

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`Syntax check failed: ${relative(env.backendRoot, file)}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`PASS syntax checked ${files.length} backend files`);
