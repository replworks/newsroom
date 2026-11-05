import { defineConfig } from "@playwright/test";

// E2E against the published newsroom site.
export default defineConfig({
  testDir: "tests/live",
  reporter: "list",
  retries: 1,
  use: { baseURL: process.env.NEWSROOM_LIVE_URL ?? "https://news.repl.net" },
});
