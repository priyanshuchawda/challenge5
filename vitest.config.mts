import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/server/ai/gemini.live.test.ts"],
    setupFiles: ["./tests/vitest.setup.ts"],
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "src/app/layout.tsx", "src/app/page.tsx", "src/proxy.ts"],
      reporter: ["text", "html"],
      thresholds: { statements: 75, branches: 60, functions: 75, lines: 75 },
    },
  },
});
