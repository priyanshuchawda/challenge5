import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      include: ["src/app/api/**/*.ts", "src/features/planning/*.ts", "src/server/**/*.ts"],
      exclude: ["**/*.test.ts"],
      reporter: ["text", "html"],
      thresholds: { statements: 95, branches: 88, functions: 98, lines: 95 },
    },
  },
});
