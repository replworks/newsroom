// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://news.repl.net",
  base: "/",
  trailingSlash: "always",
  outDir: process.env.NEWSROOM_OUT_DIR ?? "./dist",
});
