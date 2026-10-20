import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/server/ai/gemini.live.test.ts"],
    testTimeout: 45_000,
    hookTimeout: 10_000,
  },
});
