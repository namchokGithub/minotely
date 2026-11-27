/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf8"),
) as { version: string };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Shown in the app so a deploy can be identified (D54). GitHub Actions sets
  // GITHUB_SHA for every step, including the deploy step that builds.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(
      (process.env.GITHUB_SHA ?? "").slice(0, 7) || "dev",
    ),
    __APP_BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
