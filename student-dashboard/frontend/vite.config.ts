import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig(({ mode }) => {
  const isCapacitor = mode === "capacitor";

  return {
  base: isCapacitor ? "./" : undefined,
  resolve: {
    alias: {
      "@": `${process.cwd()}/src`,
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    ...(
      isCapacitor
        ? []
        : [
            tanstackStart({
              srcDirectory: "src",
              server: { entry: "server" },
              importProtection: {
                behavior: "error",
                client: {
                  files: ["**/server/**"],
                  specifiers: ["server-only"],
                },
              },
            }),
          ]
    ),
    viteReact(),
  ],
  build: isCapacitor
    ? {
        outDir: "dist/client",
        emptyOutDir: true,
      }
    : undefined,
  server: {
    host: "::",
    port: 8080,
  },
  };
});
