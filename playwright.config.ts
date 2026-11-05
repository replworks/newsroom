import { defineConfig } from "@playwright/test";

// E2E against `astro preview` of builds made from fixture announcement files
// (`pnpm build:fixtures` writes dist-fixture and dist-empty).
const server = (name: string, port: number) => ({
  command: `./node_modules/.bin/astro preview --port ${port} --ignore-lock`,
  url: `http://localhost:${port}/`,
  env: { NEWSROOM_OUT_DIR: `./dist-${name}` },
  reuseExistingServer: false,
  timeout: 120_000,
});

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "list" : "line",
  webServer: [server("fixture", 4391), server("empty", 4392)],
  projects: [
    {
      name: "populated",
      testMatch: "populated.spec.ts",
      use: { baseURL: "http://localhost:4391" },
    },
    {
      name: "empty",
      testMatch: "empty.spec.ts",
      use: { baseURL: "http://localhost:4392" },
    },
  ],
});
