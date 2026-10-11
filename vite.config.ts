import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // relative paths, so the build works under https://<user>.github.io/<repo>/
  base: "./",
  plugins: [react()],
  // pdf-lib with fontkit is one large chunk, loaded only after a file is opened
  build: { outDir: "dist", chunkSizeWarningLimit: 1500 },
  test: { include: ["src/**/*.test.ts"] },
});
