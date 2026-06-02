import { createServer } from "./src/server.js";
import { env, logEnvStatus } from "./src/config/env.js";
import { networkInterfaces } from "node:os";

const app = createServer();

logEnvStatus();

function getNetworkUrls(port) {
  const urls = [];
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        urls.push(`http://${address.address}:${port}`);
      }
    }
  }
  return urls;
}

const server = app.listen(env.port, env.host, () => {
  const networkUrls = getNetworkUrls(env.port);
  console.log(`KalviThozhan API listening on ${env.host}:${env.port}`);
  console.log(`Localhost URL: http://localhost:${env.port}`);
  console.log(`Network URL: ${networkUrls[0] ?? "No active IPv4 network interface found"}`);
  for (const url of networkUrls.slice(1)) console.log(`Network URL: ${url}`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Port ${env.port} is already in use. Stop the existing backend or set PORT in backend/.env.`);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
