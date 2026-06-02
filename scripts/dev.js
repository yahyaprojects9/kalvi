import { spawn } from "node:child_process";

const commands = [
  { name: "frontend", args: ["--prefix", "student-dashboard/frontend", "run", "dev"] },
];

const children = commands.map(({ name, args }) => {
  const child = spawn("npm", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    if (code) {
      console.error(`${name} exited with code ${code}`);
      process.exitCode = code;
    }
  });
  return child;
});

function shutdown() {
  for (const child of children) child.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
