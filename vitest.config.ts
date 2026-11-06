import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
try {
  process.loadEnvFile(".env");
} catch {
  /* CI uses injected variables. */
}
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error(
    "TEST_DATABASE_URL debe apuntar a una base descartable cuyo nombre termine en _test.",
  );
process.env.DATABASE_URL = url;
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
