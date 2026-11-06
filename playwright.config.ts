import { defineConfig } from "@playwright/test";
try {
  process.loadEnvFile(".env");
} catch {
  /* CI supplies environment. */
}
const database = process.env.TEST_DATABASE_URL;
if (!database || !new URL(database).pathname.endsWith("_test"))
  throw new Error("Playwright requiere una base descartable terminada en _test.");
process.env.DATABASE_URL = database;
const baseURL = "http://localhost:3100";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60000,
  use: { baseURL },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: database,
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "test-only-secret-with-more-than-32-characters",
    },
  },
});
